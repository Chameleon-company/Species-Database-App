from flask import Flask, request, jsonify

from werkzeug.utils import secure_filename
from datetime import datetime

import tempfile
import asyncio
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from flask_cors import CORS
from uploader import process_file
from audit import read_file_to_df, audit_dataframe

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

import bcrypt
from auth_authz import register_auth_routes, require_role, get_admin_user

from flask_cors import CORS


app = Flask(__name__)
CORS(app)

CORS(app)

#register auth and authz routes
register_auth_routes(app, supabase)

def wrap_require_role(roles):
    return require_role(supabase, roles)

#register media routes
from media import register_media_routes
register_media_routes(app, supabase, wrap_require_role)

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
    admin_id, err = get_admin_user(supabase)
    if err:
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
    


@app.post("/audit-species")
def audit_species_file():
    """
    Upload a file and return a data quality report (NO upload to Supabase).
    """
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

        df = read_file_to_df(temp_path)
        report = audit_dataframe(df)

        return jsonify({
            "status": "success",
            "report": report
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
