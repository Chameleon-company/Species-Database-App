from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
import tempfile
import asyncio
import re
import requests
import ipaddress
import socket
from urllib.parse import urlparse, urljoin
from uploader import process_file, translate_to_tetum
from supabase import create_client, Client
from flask_cors import CORS
from flask import render_template
import os
from pathlib import Path
from dotenv import load_dotenv
from audit import read_file_to_df, audit_dataframe
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import bcrypt
from auth_authz import register_auth_routes, require_role, get_admin_user
load_dotenv(override=True)
print("CORS_ORIGINS =", os.getenv("CORS_ORIGINS"))


app = Flask(__name__)
# "".split(",") returns [''] rather than [], which would otherwise make
# CORS match against a blank origin - filter those out.
cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
CORS(
    app,
    supports_credentials=True,
    origins=cors_origins,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)



SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# Used for the Admin Dashboard link and the /api/health reachability check.
FRONTEND_URL = cors_origins[0] if cors_origins else None

print("Supabase URL:", SUPABASE_URL)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

#### GLOBAL ERROR HANDLERS ####
# Catches ANY unhandled exception from ANY route and returns clean JSON
# instead of Flask's default HTML error/traceback page.
@app.errorhandler(Exception)
def handle_uncaught_exception(e):
    from werkzeug.exceptions import HTTPException

    # If it's a proper HTTP exception (404, 405, etc.), keep its real status code
    if isinstance(e, HTTPException):
        return jsonify({
            "error": e.description,
            "type": type(e).__name__
        }), e.code

    # Log full traceback to terminal for debugging
    app.logger.exception("Unhandled exception occurred")

    # Anything else (DB errors, bugs, etc.) -> 500 with the exception message
    return jsonify({
        "error": str(e),
        "type": type(e).__name__
    }), 500


@app.errorhandler(404)
def handle_404(e):
    return jsonify({"error": "endpoint not found"}), 404


@app.errorhandler(405)
def handle_405(e):
    return jsonify({"error": "method not allowed"}), 405


#register auth and authz routes
register_auth_routes(app, supabase)

# def wrap_require_role(roles):
#     return require_role(supabase, roles)

#register media routes
from media import register_media_routes
register_media_routes(app, supabase)


#startup screen route
@app.route("/")
def home():
       # frontend_url will be None if CORS_ORIGINS is empty - templates/index.html
       # must check for that and hide/label the Admin Dashboard link accordingly
       # rather than rendering a broken href="None".
       return render_template("index.html", frontend_url=FRONTEND_URL)


def extract_page_image(html: str):
    """
    Looks for a page's 'real' image via Open Graph / Twitter meta tags.
    Handles content= before or after property=/name= in the tag.
    """
    patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


#### SSRF PREVENTION for /api/resolve-image ####
# This endpoint fetches an arbitrary, user-supplied URL server-side. Without
# these checks, someone could point it at localhost, an internal service on
# the private network, or a cloud metadata endpoint (169.254.169.254) and
# use the backend as a proxy to reach it.

ALLOWED_URL_SCHEMES = {"http", "https"}
MAX_IMAGE_URL_REDIRECTS = 5


def _is_blocked_ip(ip_str: str) -> bool:
    """True if this address must never be contacted by the backend."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True  # unparsable - treat as unsafe
    return (
        ip.is_private       # 10/8, 172.16/12, 192.168/16, etc.
        or ip.is_loopback    # 127.0.0.1, ::1
        or ip.is_link_local  # 169.254.0.0/16 - covers the cloud metadata IP
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _hostname_resolves_safely(hostname: str) -> bool:
    """Resolves every address a hostname maps to and requires ALL of them
    to be safe (a hostname can round-robin across multiple IPs)."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    addrs = {info[4][0] for info in infos}
    return bool(addrs) and all(not _is_blocked_ip(addr) for addr in addrs)


def _is_safe_external_url(url: str) -> bool:
    """Full check for a URL that's about to be fetched server-side."""
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_URL_SCHEMES:
        return False
    hostname = parsed.hostname
    if not hostname or hostname.lower() == "localhost":
        return False
    return _hostname_resolves_safely(hostname)


@app.get("/api/resolve-image")
def resolve_image():
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]

    target_url = request.args.get("url")
    if not target_url:
        return jsonify({"error": "url query param required"}), 400

    if not _is_safe_external_url(target_url):
        return jsonify({"error": "url points to a disallowed destination"}), 400

    current_url = target_url
    try:
        for _ in range(MAX_IMAGE_URL_REDIRECTS):
            resp = requests.get(
                current_url,
                timeout=6,
                headers={"User-Agent": "Mozilla/5.0 (compatible; SpeciesDBBot/1.0)"},
                allow_redirects=False,
            )

            if resp.is_redirect or resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get("Location")
                if not location:
                    return jsonify({"error": "redirect with no location"}), 502
                next_url = urljoin(current_url, location)
                if not _is_safe_external_url(next_url):
                    return jsonify({"error": "redirect points to a disallowed destination"}), 400
                current_url = next_url
                continue

            break
        else:
            return jsonify({"error": "too many redirects"}), 502
    except requests.RequestException as e:
        return jsonify({"error": f"failed to fetch url: {str(e)}"}), 502

    content_type = resp.headers.get("Content-Type", "")

    # already a direct image file
    if content_type.startswith("image/"):
        return jsonify({"resolved_url": current_url}), 200

    # otherwise treat as an HTML page and look for its preview image
    page_image = extract_page_image(resp.text)
    if page_image:
        page_image = urljoin(current_url, page_image)
        if not _is_safe_external_url(page_image):
            return jsonify({"error": "extracted image url points to a disallowed destination"}), 400
        return jsonify({"resolved_url": page_image}), 200

    return jsonify({"error": "could not find an image on this page"}), 404


@app.get("/api/health")
def health_check():
    """
    Checks each core table by running a lightweight query against it, plus
    whether the React frontend dev server is actually reachable.
    Used by the index.html status dashboard to show what's working / broken.
    """
    tables_to_check = [
        "users",
        "species_en",
        "species_tet",
        "media",
        "analytics",
        "changelog",
        "admin_sessions",
    ]

    checks = {}

    for table in tables_to_check:
        try:
            supabase.table(table).select("*").limit(1).execute()
            checks[table] = {"status": "ok"}
        except Exception as e:
            checks[table] = {"status": "error", "message": str(e)}

    # Frontend check: done server-side (rather than via browser fetch) so
    # this isn't blocked by CORS - the backend simply tries to reach the
    # Vite dev server directly over the network.
    if not FRONTEND_URL:
        checks["frontend"] = {
            "status": "error",
            "message": "No frontend origin available - CORS_ORIGINS is empty",
        }
    else:
        try:
            resp = requests.get(FRONTEND_URL, timeout=2)
            if resp.status_code < 500:
                checks["frontend"] = {"status": "ok"}
            else:
                checks["frontend"] = {
                    "status": "error",
                    "message": f"Frontend responded with status {resp.status_code}",
                }
        except requests.RequestException:
            checks["frontend"] = {
                "status": "error",
                "message": f"Could not reach frontend at {FRONTEND_URL}",
            }

    overall = "ok" if all(c["status"] == "ok" for c in checks.values()) else "degraded"

    return jsonify({
        "overall": overall,
        "checks": checks
    }), 200

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
                return jsonify({
            "error": "sync failed",
            "reason":"Fail to fetch the data from the species_en",
            "details":en_resp.error.message if en_resp.error else None
            }), 500

    #get tetum species
    tet_resp = supabase.table("species_tet").select("*").execute()
    if tet_resp.data is None:
                return jsonify({
            "error": "sync failed",
            "reason":"Fail to fetch the data from the species_tet",
            "details":tet_resp.error.message if tet_resp.error else None
            }), 500

    #get media entries
    media_resp = supabase.table("media").select("*").execute()
    if media_resp.data is None:
       return jsonify({
            "error": "sync failed",
            "reason":"Fail to fetch the data from the media",
            "details":media_resp.error.message if media_resp.error else None
            }), 500

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

    #getting all changelog entris related tospecies
    #occured after clients last known version
    changes = (
        supabase.table("changelog")
        .select("entity_id, version, operation, entity_type")
        .in_("entity_type", ["species", "media"])
        .gt("version", since_version)
        .execute()
    )

    # if the changes is none then there is failure in the database query
    if changes.data is None:
        return jsonify({
        "error": "sync_failed",
        "stage": "changelog_fetch",
        "message": " changelog data fail to fetch it",
        "details": str(changes.error.message) if changes.error else None,
        "since_version": since_version
    }), 500

    #if nothing changes, client must be up to date
    if not changes.data:
        return jsonify({
            "up_to_date": True,
            "latest_version": since_version,
            "row_count":0
        })
    
    #finding latest version # on server
    latest_version = max(row["version"] for row in changes.data)

    has_media_changed =any(
        row["entity_type"] == "media"
        for row in changes.data
    )
    if has_media_changed:
        return jsonify({
            "up_to_date": False,
            "force_bundle": True,
            "latest_version": latest_version,
            "reason": "media_changed"
        })
    
    changed_species_ids = {
        row["entity_id"]
        for row in changes.data
        if row["entity_id"] is not None
    }

    row_count = len(changed_species_ids)

    #threshold: if too many changes, no point having incremental syncing
    #will just pull the bundle
    THRESHOLD = 20

    if row_count > THRESHOLD:
        return jsonify({
            "up_to_date": False,
            "force_bundle": True,
            "latest_version": latest_version,
            "change_count": row_count
        })
    
    return jsonify({
        "up_to_date": False,
        "force_bundle": False,
        "latest_version": latest_version,
        "change_count": row_count
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
        .select("entity_id, version")
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
    species_ids = list({row["entity_id"] for row in changes.data if row["entity_id"] is not None})
    
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
        return jsonify({
            "error": "sync failed",
            "stage":"species_fetch",
            "message":"failed to get the species from the database",
            "since_version":since_version
        }), 500
        
    deleted_ids = [
        row["entity_id"]
        for row in changes.data
        if row["operation"] == "DELETE"
    ]
    return jsonify({
        "latest_version": latest_version,
        "species_en": species_en.data,
        "species_tet": species_tet.data,
        "deleted_species_ids": deleted_ids
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
    # admin_id, err = get_admin_user(supabase)
    # if err:
    #     return jsonify({"error": err[0]}), err[1]

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
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as cleanup_err:
                print(f"Temp file cleanup failed: {cleanup_err}")  


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




@app.route("/species", methods=["POST"])
def create_species():
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

# adding duplicate check
    excisting=supabase.table('species_en')\
        .select("species_id")\
        .eq("scientific_name",scientific_name )\
        .execute()
    
    if excisting.data:
        return jsonify({"error":f"Error the scientific name'{scientific_name}' is already there"}),409

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
        
        # Insert into Tetum database with same species id as english
        print("Starting Tetum Upload")
        data2 = supabase.table('species_tet').insert({
            'species_id': rollback_id,
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
            log_change("species", rollback_id, "CREATE")
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
        
@app.get("/api/species/<int:species_id>")
def get_species_by_id(species_id):
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]
    
    row = (
        supabase.table("species_en")
        .select("*")
        .eq("species_id", species_id)
        .single()
        .execute()
    )
    return jsonify(row.data)

async def translateMultipleTexts(texts):
    tasks = [translate_to_tetum(text) for text in texts]
    
    results = await asyncio.gather(*tasks)
    
    return results

@app.put("/api/species/<int:species_id>")
def update_species(species_id):
    """
    UPDATE SPECIES

    - english source of truth
    - tet generated in admin panel
    """
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "missing Json body"}), 400

    ############# ENGLISH UPDATE PAYLOAD ##############
    en_update = {}
    EN_FIELDS = [
        "scientific_name",
        "common_name",
        "etymology",
        "habitat",
        "identification_character",
        "leaf_type",
        "fruit_type",
        "phenology",
        "seed_germination",
        "pest"
    ]

    for field in EN_FIELDS:
        if field in data:
            en_update[field] = data[field]
    if not en_update:
        return jsonify({"error": "no english fields provided"}), 400
    
    # update english row
    supabase.table("species_en")\
        .update(en_update)\
        .eq("species_id", species_id)\
        .execute()
    
    ############# TETUM UPDATE PAYLOAD ##############
    tet_update = {}
    TET_FIELDS = [
        "scientific_name",
        "common_name",
        "etymology",
        "habitat",
        "identification_character",
        "leaf_type",
        "fruit_type",
        "phenology",
        "seed_germination",
        "pest"
    ]

    for field in TET_FIELDS:
        tetum_field_name = f"{field}_tetum"
        if tetum_field_name in data:
            tet_update[field] = data[tetum_field_name]
    if not tet_update:
        return jsonify({"error": "no tetum fields provided"}), 400
    
    # update tetum row
    supabase.table("species_tet")\
        .update(tet_update)\
        .eq("species_id", species_id)\
        .execute()
    
    #row based change logged
    log_change("species", species_id, "UPDATE")

    return jsonify({
        "status": "updated",
        "species_id": species_id
    }), 200

@app.delete("/api/species/<int:species_id>")
def delete_species(species_id):
    """
    DELETE SPECIES

    -delete species from both language tables
    -logs one row deletion for incremental sync
    """

    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]
    supabase.table("species_en").delete().eq("species_id", species_id).execute()
    supabase.table("species_tet").delete().eq("species_id", species_id).execute()

    log_change("species", species_id, "DELETE")

    return jsonify({"status": "deleted"}), 200


@app.put("/api/species/<int:species_id>/english")
def update_species_english(species_id):
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]
    
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "missing JSON body"}), 400
    
    english_update = {}

    ENGLISH_FIELDS = [
        "scientific_name",
        "common_name",
        "etymology",
        "habitat",
        "identification_character",
        "leaf_type",
        "fruit_type",
        "phenology",
        "seed_germination",
        "pest"        
    ]

    for field in ENGLISH_FIELDS:
        if field in data:
            english_update[field] = data[field]

    if not english_update:
        return jsonify({"error": "no tetum fields provided"}), 400
    
    # update english row
    supabase.table("species_en")\
        .update(english_update)\
        .eq("species_id", species_id)\
        .execute()
    
    log_change("species", species_id, "UPDATE")

    return jsonify({"status": "english updated"}), 200

@app.put("/api/species/<int:species_id>/tetum")
def update_species_tet(species_id):
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]
    
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "missing JSON body"}), 400
    
    tet_update = {}

    TET_FIELDS = [
        "scientific_name",
        "common_name",
        "etymology",
        "habitat",
        "identification_character",
        "leaf_type",
        "fruit_type",
        "phenology",
        "seed_germination",
        "pest"        
    ]

    for field in TET_FIELDS:
        if field in data:
            tet_update[field] = data[field]

    if not tet_update:
        return jsonify({"error": "no tetum fields provided"}), 400
    
    # update tet row
    supabase.table("species_tet")\
        .update(tet_update)\
        .eq("species_id", species_id)\
        .execute()
    
    log_change("species", species_id, "UPDATE")

    return jsonify({"status": "tetum updated"}), 200


@app.route("/translate", methods=["POST"])
def translate():
    print(f"Raw request data: {request.data}")
    
    data = request.json
    if not data:
        return jsonify({"error":"Invalid"}),400
    
    texts = data.get('text', [])
    if not texts:
        return {"error": "No text provided"}, 400
    
    print(f"Received text: '{texts}'")
    
    try:
        array = asyncio.run(translateMultipleTexts(texts))
    except Exception as e:
        return jsonify({"error":"Translation_failed","details":str(e)}),500

    print(f"Translated Text = '{array}'")
    
    return jsonify(array),200

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

        durations = [a.get("duration") or 0 for a in analytics_res.data]
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
            total_duration = sum(r.get("duration") or 0 for r in records)
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
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]

    # Validate JSON body
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON or missing request body"}), 400

    # Required fields
    name = data.get("name")
    role = data.get("role")
    password = data.get("password")
    auth_provider = data.get("auth_provider", "local")

    if not name or not role:
        return jsonify({"error": "Required fields: name and role"}), 400

    if not name or not role:
        return jsonify({"error": "required fields: name and role"}), 400
    
    if auth_provider not in ["local", "google"]:
        return jsonify({"error": "Invalid auth_provider"}), 400
    
    if auth_provider == "local":
        if not password:
            return jsonify({"error": "password required for local users"}),400
        
    if auth_provider == "google":
        if role != "admin":
            return jsonify({"error": "Google auth allowed for admin only"}), 403
        password = None

    password_hash = None

    if auth_provider == "local":
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")             

    user = {
        "name": name,
        "role": role,
        "is_active": data.get("is_active", True),
        "password_hash": password_hash,
        "auth_provider": auth_provider,
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
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]

    res = supabase.table("users") \
        .select("user_id, name, role, is_active, created_at") \
        .order("user_id") \
        .execute()

    return jsonify(res.data), 200

@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]

    existing = supabase.table("users").select("auth_provider").eq("user_id", user_id).limit(1).execute()
    if not existing.data:
        return jsonify({"error": "User not found"}), 404
    
    auth_provider = existing.data[0]["auth_provider"]

    data = request.json

    update_data = {
        "name": data.get("name"),
        "role": data.get("role"),
        "is_active": data.get("is_active"),
    }

    if data.get("password"):
        if auth_provider != "local":
            return jsonify({"error": "google users cannot have passwords"}),400
    
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
    admin_id, err = get_admin_user(supabase)
    if err:
        return jsonify({"error": err[0]}), err[1]

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