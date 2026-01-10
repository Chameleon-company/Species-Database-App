from flask import Flask, request, jsonify

import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
import tempfile
import asyncio
from uploader import process_file

import bcrypt

from flask_cors import CORS

def require_role(allowed_roles: list[str]):
    """
    authz helper

    used to checck:
     - who is makin gthe request
     - whether their role allows the action

    assuming user has already logged in earlier
    """

    #user id from request header sent from frontend
    user_id = request.headers.get("auth-user-id", type=int)

    if not user_id:
        return False, ("missing user id", 401)
    
    #getting user from supabase
    resp =(
        supabase.table("users")
        .select("role", "is_active")
        .eq("user_id",user_id)
        .limit(1)
        .execute()
    )

    #if user non existent
    if not resp.data:
        return False, ("user not found", 401)
    
    user = resp.data[0]

    #admins able to disable accounts
    # check applies when device is online
    if not user["is_active"]:
        return False, ("account disabled", 403)
    
    if user["role"] not in allowed_roles:
        return False, ("no permissions" , 403)
    
    return True, None


app = Flask(__name__)

CORS(app)

@app.route('/')
def index():
    return "Hello World!"

@app.get("/api/bundle")
def get_bundle():
    """
    this endpoint returns the full dataset the app needs on first install
    will include en_species, tet_species, media,latest version nnumber
    """
    #client sends version in use... default to 0
    ###client_version = request.args.get("version", type=int, default=0)

    #get latest version from changelog
    version_resp = (
        supabase.table("changelog")
        .select("version")
        .order("version", desc=True)
        .limit(1)
        .execute()
    )

    #if changelog is empty or something goes wrong
    if version_resp.data is None:
        return jsonify({"error": "reading version failure"}), 500

    #starting with version 1 if no entries yet
    if version_resp.data:
        latest_version = version_resp.data[0]["version"]
    else:
        latest_version = 1
    
    #getting english species
    en_resp = supabase.table("species_en").select("*").execute()
    if en_resp.data is None:
        return jsonify({"error": "couldnt load species_en"}), 500

    #get tetum species
    tet_resp = supabase.table("species_tet").select("*").execute()
    if tet_resp.data is None:
        return jsonify({"error": "couldnt load species_tet"}), 500

    #get media entries
    media_resp = supabase.table("media").select("*").execute()
    if media_resp.data is None:
        return jsonify({"error": "couldnt load media"}), 500

    #retrunign it all as one bundle
    return jsonify({
        "version": latest_version,
        "species_en": en_resp.data,
        "species_tet": tet_resp.data,
        "media":media_resp.data
    })

#       
@app.get("/api/species/changes")
def get_species_changes():
    """
    Thsi endpoint tells client if its local data is out of date

    client uses endpoint todecide whether to do nothing, incremental sync, or re-download full bundle
    """
    #app send last version it synced with
    since_version = request.args.get("since_version", type=int)
    if since_version is None:
        return jsonify({"error": "since_version required"}), 400


    #get all changelog entries with a version higher than whatclient has
    result = (
        supabase.table("changelog")
        .select("version", count="exact")
        .gt("version", since_version)
        .execute()
    )

    if result.data is None:
        return jsonify({"error": "failed toread changelog"}), 500

    change_count = result.count or 0

    #if nothing changes, client must be up to date
    if change_count == 0:
        return jsonify({
            "up_to_date": True,
            "latest_version": since_version,
            "change_count":0
        })
    
    #finding latest version # on server
    latest_version = max(row["version"] for row in result.data)

    #threshold: if too many changes, no point having incremental syncing
    #will just pull the bundle
    THRESHOLD = 20

    if change_count > THRESHOLD:
        return jsonify({
            "up_to_date": False,
            "force_bundle": True,
            "latest_version": latest_version,
            "change_count": change_count
        })
    return jsonify({
        "up_to_date": False,
        "force_bundle": False,
        "latest_version": latest_version,
        "change_count": change_count
    })

@app.get("/api/species/incremental")
def get_species_incremental():
    """
    incremental sync endpoint

    returns LATEST FULL ROWS fro species that changed since
    client last sync version

    to keep safe for offline we have:
    - rows fully replaced
    - no partial updates
    - no history replay
    """
    since_version = request.args.get("since_version", type=int)
    if since_version is None:
        return jsonify({"error": "sicne_version required"}), 400
    
    #find ewhich species ids changed
    changes = (
        supabase.table("changelog")
        .select("species_id, version")
        .gt("version", since_version)
        .execute()
    )

    if not changes.data:
        return jsonify({
            "species_en": [],
            "species_tet": [],
            "latest_version": since_version
        })
    #deduplicating
    species_ids = list({row["species_id"] for row in changes.data})
    
    latest_version =max(row["version"] for row in changes.data)

    if not species_ids:
        return jsonify({
            "species_en": [],
            "species_tet": [],
            "latest_version": latest_version
        })
    #fetch latest en species rows
    species_en = (
        supabase.table("species_en")
        .select("*")
        .in_("species_id", species_ids)
        .execute()
    )

    #fetch latest tet species rows
    species_tet = (
        supabase.table("species_tet")
        .select("*")
        .in_("species_id", species_ids)
        .execute()
    )

    if species_en.data is None or species_tet.data is None:
        return jsonify({"error": "failed to fetch incremental species"}), 500
    return jsonify({
        "latest_version": latest_version,
        "species_en": species_en.data,
        "species_tet": species_tet.data
    })
"""
This endpoint accepts an Excel or CSV file upload 
and processes it to populate the species_en and species_tet tables in the database.
There is a species.xlsx sample file within the backend folder for testing.
Or you can also run > curl -X POST http://127.0.0.1:5000/upload-species -F "file=@species.xlsx"
"""
@app.route("/upload-species", methods=["POST"])
def upload_species_file():
    """
    this is an admin only endpoint
    for uploading species data
    """
    #checking peermissions
    ok, err = require_role(["admin"])
    if not ok:
        return jsonify({"error": err[0]}), err[1]

    #at this point we've confirmed theyre admin

    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        suffix = ".xlsx" if uploaded_file.filename.endswith(".xlsx") else ".csv"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            uploaded_file.save(tmp.name)
            temp_path = tmp.name

        asyncio.run(process_file(temp_path, translate=False))  # English
        asyncio.run(process_file(temp_path, translate=True))   # Tetum

        return jsonify({
            "status": "success",
            "message": "Data uploaded to species_en & species_tet tables"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/auth/login")
def login():
    """
    online login endpoint for pwa first tiem bootstrap (before switching to local PIN)
    and admin dashboard login (online only)
    Note: no token returns.... deliberate as the app is offline first
    """

    data = request.json
    if not data:
        return jsonify({"error": "request body missing"}), 400
    name = data.get("name")
    password = data.get("password")

    if not name or not password:
        return jsonify({"error": "name and password required"}), 400
    
    #fecthing user from Supabase
    resp = (
        supabase.table("users")
        .select("user_id, password_hash, role, is_active")
        .eq("name", name)
        .limit(1)
        .execute()
    )

    #for user not found
    if not resp.data:
        return jsonify({"error": "invalid credentials"}), 401
    
    user = resp.data[0]

    #admin can disable users... applies when device is online
    if not user["is_active"]:
        return jsonify({"error": "account disabled"}), 403

    #comparing inputted password with stored hash
    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    ):
        return jsonify({"error": "credentials invalid"}), 401
    
    #succcessful login... client uses this for provisioning lcoal auth
    return jsonify({
        "user_id": user["user_id"],
        "role": user["role"],
    }), 200

@app.get("/api/auth/user-state")
def user_state():
    """
    used by the app whenever device is online. allows app to check:
        - was the user disabled?
        - was the role changed?
        - did the account version changed??
    avoids forcing periodic syncs but still allows backend to be synced whenever possible
    """

    user_id = request.args.get("user_id", type=int)
    ##client_version = request.args.get("account_version", type=int)

    if not user_id:
        return jsonify({"error": "user_id needed"})
    
    resp = (
        supabase.table("users")
        .select("role, is_active")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not resp.data:
        return jsonify({"error": "user not found"}), 404

    user = resp.data[0]

    #if changed is true, app shouldd refresh local role/status (once online)
    #changed = (user["account_version"] != client_version)

    return jsonify({
        "role": user["role"],
        "is_active": user["is_active"],
        #"account_version": user["account_version"],
        #client can decide if updating local state necessary
        #"changed": changed
    }), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)