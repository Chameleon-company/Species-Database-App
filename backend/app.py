from flask import Flask, request, jsonify
import tempfile
import asyncio
from uploader import process_file
import bcrypt
from supabase import create_client
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

"""
This endpoint accepts an Excel or CSV file upload 
and processes it to populate the species_en and species_tet tables in the database.
There is a species.xlsx sample file within the backend folder for testing.
Or you can also run > curl -X POST http://127.0.0.1:5000/upload-species -F "file=@species.xlsx"
"""
@app.route("/upload-species", methods=["POST"])
def upload_species_file():
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