from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
import tempfile
import asyncio
from uploader import process_file, translate_to_tetum
from supabase import create_client, Client
from flask_cors import CORS
import os
from flask_cors import CORS
from pathlib import Path
from dotenv import load_dotenv
from audit import read_file_to_df, audit_dataframe
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import bcrypt
from auth_authz import register_auth_routes, require_role, get_admin_user

app = Flask(__name__)
CORS(app, supports_credentials=True)


SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")


load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

#register auth and authz routes
register_auth_routes(app, supabase)

# def wrap_require_role(roles):
#     return require_role(supabase, roles)

#register media routes
from media import register_media_routes
register_media_routes(app, supabase)

SUPABASE_URL_TETUM = os.getenv("VITE_SUPABASE_URL_TETUM")
SUPABASE_SERVICE_KEY_TETUM = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY_TETUM")

print("Supabase URL:", SUPABASE_URL)

#supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
#supabase_tetum = create_client(SUPABASE_URL_TETUM, SUPABASE_SERVICE_KEY_TETUM)

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

        en_result = asyncio.run(process_file(temp_path, translate=False))  # English
        tet_result = asyncio.run(process_file(temp_path, translate=True))   # Tetum

        rows_inserted = min(
            en_result["rows_inserted"],
            tet_result["rows_inserted"]
        )
        
        log_change(
            "species",
            None,
            f"BULK_INSERT ({rows_inserted} rows)"
        )

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




@app.route("/upload", methods=["POST"])
def upload():
    print(f"Raw request data: {request.data}")
    
    #Get variables from request
    data = request.json
    scientific_name = data['scientific_name']
    common_name = data['common_name']
    etymology = data['etymology']
    habitat = data['habitat']
    identification_character = data['identification_character']
    leaf_type = data['leaf_type']
    fruit_type = data['fruit_type']
    phenology = data['phenology']
    seed_germination = data['seed_germination']
    pest = data['pest']
    
    #Get tetum variables from request
    scientific_name_tetum = data['scientific_name_tetum']
    common_name_tetum = data['common_name_tetum']
    etymology_tetum = data['etymology_tetum']
    habitat_tetum = data['habitat_tetum']
    identification_character_tetum = data['identification_character_tetum']
    leaf_type_tetum = data['leaf_type_tetum']
    fruit_type_tetum = data['fruit_type_tetum']
    phenology_tetum = data['phenology_tetum']
    seed_germination_tetum = data['seed_germination_tetum']
    pest_tetum = data['pest_tetum']
    
    #Ensure mandatory fields are valid
    errors = []
    
    if not scientific_name or not isinstance(scientific_name, str):
        errors.append("scientific_name")
    if not common_name or not isinstance(common_name, str):
        errors.append("common_name")
    if not leaf_type or not isinstance(leaf_type, str):
        errors.append("leaf_type")
    if not fruit_type or not isinstance(fruit_type, str):
        errors.append("fruit_type")
        
    if not scientific_name_tetum or not isinstance(scientific_name_tetum, str):
        errors.append("scientific_name_tetum")
    if not common_name_tetum or not isinstance(common_name_tetum, str):
        errors.append("common_name_tetum")
    if not leaf_type_tetum or not isinstance(leaf_type_tetum, str):
        errors.append("leaf_type_tetum")
    if not fruit_type_tetum or not isinstance(fruit_type_tetum, str):
        errors.append("fruit_type_tetum")
    
    if errors:
        e = f"Invalid or missing mandatory field(s). Scientific Name, Common Name, Leaf Type and Fruit type must be a non null string: {', '.join(errors)}"
        return jsonify({"error": str(e)}), 400


    rollback_id = None

    try:
        print("Starting English Upload")
        #Insert into English database
        data1 = supabase.table('species_en').insert({
            'scientific_name': scientific_name,
            'common_name': common_name,
            'etymology': etymology,
            'habitat': habitat,
            'identification_character': identification_character,
            'leaf_type': leaf_type,
            'fruit_type': fruit_type,
            'phenology': phenology,
            'seed_germination': seed_germination,
            'pest': pest
        }).execute()
        
        
        if not data1.data:
            raise Exception('DB1 failed: No data returned')
        
        rollback_id = data1.data[0]['species_id']
        print("Upload to English database successful")
        
        # Insert into Tetum database
        print("Starting Tetum Upload")
        data2 = supabase.table('species_tet').insert({
            'scientific_name': scientific_name_tetum,
            'common_name': common_name_tetum,
            'etymology': etymology_tetum,
            'habitat': habitat_tetum,
            'identification_character': identification_character_tetum,
            'leaf_type': leaf_type_tetum,
            'fruit_type': fruit_type_tetum,
            'phenology': phenology_tetum,
            'seed_germination': seed_germination_tetum,
            'pest': pest_tetum
        }).execute()
        
        if not data2.data:
            raise Exception('DB2 failed: No data returned')
        
        rollback_id_tetum = data2.data[0]['species_id']
        print("Upload to Tetum database successful")
        
        try:
            log_change("species", rollback_id, "upload")
        except Exception as log_change_error:
            print(f"Change log error, rolling back uploads: {str(log_change_error)}")
            try:
                supabase.table('species_en').delete().eq('species_id', rollback_id).execute()
                supabase.table('species_tet').delete().eq('species_id', rollback_id_tetum).execute()
            except Exception as rollback_error:
                print(f"Rollback failed: {str(rollback_error)}")
                return jsonify({"error": f"ROLLBACK ERROR AFTER CHANGE LOG ERROR, DATABASES MAY NOT BE IN SYNC WITH EACH OTHER AND CHANGE LOG!!!! {str(rollback_error)}"}), 500
            return jsonify({"error": f"Error occured when updating change log: {str(log_change_error)}"}), 500
        
        return jsonify("Created"), 200

    except Exception as e:
        print('Database Upload Error')
        print(f'Error: {str(e)}')
        
        # Rollback if first upload succeeded but second failed
        if rollback_id:
            try:
                supabase.table('species_en').delete().eq('species_id', rollback_id).execute()
                print(f"Rolled back record with ID: {rollback_id}")
                return jsonify({"error": f"English database rolled back: {str(e)}"}), 500
            except Exception as rollback_error:
                print(f"Rollback failed: {str(rollback_error)}")
                return jsonify({"error": f"ROLLBACK ERROR, DATABASES MAY NOT BE IN SYNC {str(rollback_error)}"}), 500
        


async def translateMultipleTexts(texts):
    tasks = [translate_to_tetum(text) for text in texts]
    
    results = await asyncio.gather(*tasks)
    
    return results


@app.route("/translate", methods=["POST"])
def translate():
    print(f"Raw request data: {request.data}")
    data = request.json
    texts = data.get('text', [])
    
    if not texts:
        return {"error": "No text provided"}, 400
    
    
    print(f"Received text: '{texts}'")
    array = asyncio.run(translateMultipleTexts(texts))

    print(f"Translated Text = '{array}")
    
    return jsonify(array)

# Analytics Endpoints
@app.route("/analytics/overview", methods=["GET"])
def analytics_overview():
    try:
        users_res = supabase.table("users").select(
            "user_id, is_active", count="exact"
        ).execute()

        analytics_res = supabase.table("analytics").select(
            "duration", count="exact"
        ).execute()

        species_res = supabase.table("species_en").select(
            "species_id", count="exact"
        ).execute()

        media_res = supabase.table("media").select(
            "species_id"
        ).execute()

        total_users = users_res.count or 0
        active_users = sum(1 for u in users_res.data if u["is_active"])

        total_logins = analytics_res.count or 0

        durations = [a["duration"] for a in analytics_res.data]
        avg_duration = round(
            sum(durations) / len(durations), 2
        ) if durations else 0

        total_species = species_res.count or 0
        species_with_media = len(set(m["species_id"] for m in media_res.data))

        return jsonify({
            "total_users": total_users,
            "active_users": active_users,
            "total_logins": total_logins,
            "average_session_duration": avg_duration,
            "total_species": total_species,
            "species_with_media": species_with_media
        }), 200

    except Exception as e:
        app.logger.exception("Analytics overview failed")
        return jsonify({"error": str(e)}), 500
    
@app.route("/analytics/users", methods=["GET"])
def analytics_users():
    try:
        users_res = supabase.table("users").select(
            "user_id, name, role, is_active"
        ).execute()

        analytics_res = supabase.table("analytics").select(
            "user_id, duration, login_time"
        ).execute()

        analytics_by_user = {}

        for record in analytics_res.data:
            uid = record["user_id"]
            analytics_by_user.setdefault(uid, []).append(record)

        result = []

        for user in users_res.data:
            uid = user["user_id"]
            records = analytics_by_user.get(uid, [])

            login_count = len(records)
            total_duration = sum(r["duration"] for r in records)
            average_duration = (
                round(total_duration / login_count, 2)
                if login_count > 0 else 0
            )
            last_login = (
                max(r["login_time"] for r in records)
                if records else None
            )

            result.append({
                "user_id": uid,
                "name": user["name"],
                "role": user["role"],
                "is_active": user["is_active"],
                "login_count": login_count,
                "total_duration": total_duration,
                "average_duration": average_duration,
                "last_login": last_login
            })

        return jsonify(result), 200

    except Exception as e:
        app.logger.exception("User analytics failed")
        return jsonify({"error": str(e)}), 500

# User Management Endpoints
@app.route("/api/users", methods=["POST"])
def create_user():
    # Validate JSON body
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON or missing request body"}), 400

    # Required fields
    name = data.get("name")
    role = data.get("role")
    password = data.get("password")

    if not name or not role:
        return jsonify({"error": "Required fields: name and role"}), 400

    if not password:
        return jsonify({"error": "Password required"}), 400

    # Hash the password
    try:
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")
    except Exception as e:
        app.logger.exception("Password hashing failed")
        return jsonify({"error": "Password hashing failed", "detail": str(e)}), 500

    user = {
        "name": name,
        "role": role,
        "is_active": data.get("is_active", True),
        "password_hash": password_hash,
    }

    # Insert into database with robust error handling
    try:
        res = supabase.table("users").insert(user).execute()
    except Exception as e:
        app.logger.exception("Supabase insert threw an exception")
        return jsonify({"error": "Database insertion error", "detail": str(e)}), 500

    # Handle supabase/client-level errors
    supabase_error = getattr(res, "error", None)
    if not supabase_error and isinstance(res, dict):
        supabase_error = res.get("error")

    if supabase_error:
        app.logger.error("Supabase insert returned error: %s", supabase_error)
        err_text = str(supabase_error)
        status = 409 if ("duplicate" in err_text.lower() or "unique" in err_text.lower()) else 400
        return jsonify({"error": "Insert failed", "detail": err_text}), status

    # Ensure we got created data back
    data_list = getattr(res, "data", None) or (res.get("data") if isinstance(res, dict) else None)
    if not data_list:
        app.logger.error("Insert succeeded but no data returned: %s", res)
        return jsonify({"error": "Unexpected database response", "detail": str(res)}), 500

    created = data_list[0]

    # Log change, but don't fail the request if logging fails
    try:
        log_change("users", created.get("user_id"), "CREATE")
    except Exception:
        app.logger.exception("Failed to write changelog entry for new user")

    return jsonify(created), 201

@app.route("/api/users", methods=["GET"])
def get_users():
    res = supabase.table("users") \
        .select("user_id, name, role, is_active, created_at") \
        .order("user_id") \
        .execute()

    return jsonify(res.data), 200

@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    data = request.json

    update_data = {
        "name": data.get("name"),
        "role": data.get("role"),
        "is_active": data.get("is_active"),
    }

    if data.get("password"):
        update_data["password_hash"] = bcrypt.hashpw(
            data["password"].encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

    update_data = {k: v for k, v in update_data.items() if v is not None}

    res = supabase.table("users") \
        .update(update_data) \
        .eq("user_id", user_id) \
        .execute()

    log_change("users", user_id, "UPDATE")

    return jsonify(res.data), 200

@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    supabase.table("users") \
        .delete() \
        .eq("user_id", user_id) \
        .execute()

    log_change("users", user_id, "DELETE")

    return jsonify({"status": "deleted"}), 200

def log_change(entity_type, entity_id, operation):
    supabase.table("changelog").insert({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "operation": operation,
        "version": get_next_version()
    }).execute()

def get_next_version():
    res = supabase.table("changelog") \
        .select("version") \
        .order("version", desc=True) \
        .limit(1) \
        .execute()

    return (res.data[0]["version"] + 1) if res.data else 1

if __name__ == '__main__':
    app.run(debug=True, port=5000)
