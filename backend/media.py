"""
consists of media endpoints.

manages metadata aand version signalling
"""

from flask import request, jsonify

from datetime import datetime, timezone
from werkzeug.utils import secure_filename

import tempfile
import os

def register_media_routes(app, supabase, require_role):
    """
    attach all media related routes to main flask app
    """

    @app.post("/upload-media")
    def upload_media():
        """
        admin only enpoint

        uploads media file o supabase storage andn 
        stores metadata in media table
        """

        #checking permissions
        ok, err = require_role(["admin"])
        if not ok:
            return jsonify({"error": err[0]}), err[1]

        #at this point we've confirmed theyre admin

        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files["file"]

        #species_id required so we knwo who media belongs to
        species_id = request.form.get("species_id", type=int)
        if not species_id:
            return jsonify({"error": "species_oid required"}), 400
        
        #cleanign filename
        filename = secure_filename(file.filename)
        if filename == "":
            return jsonify({"error": "Invalid filename"}), 400
        
        #need fiel like object for supabase storing so temp file used
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            file.save(tmp.name)
            temp_path = tmp.name
        
        try:
            #uploadign to supabase storage
            storage_path = f"{species_id}/{filename}"

            with open(temp_path, "rb") as f:
                resp = supabase.storage.from_("media").upload(
                    storage_path,
                    f,
                    file_options={
                        "content-type": file.content_type,
                        "upsert": "true"
                    }
                )

                if resp is None:
                    return jsonify({"error": "storage uploadfailed"}), 500
            
            public_url = supabase.storage.from_("media").get_public_url(storage_path)

            alt_text = request.form.get("alt_text", "")
            #saving metadata (urls and text not file itself)
            supabase.table("media").insert({
                "species_id": species_id,
                "download_link": public_url,
                "streaming_link": public_url,
                "alt_text": alt_text
            }).execute()

            #for changelog
            supabase.table("changelog").insert({
                "version": int(datetime.now(timezone.utc).timestamp()),
                "species_id": species_id,
                "operation": "media_update",
            }).execute()

            return jsonify({
                "status": "success",
                "message": "media upload successful",
                "url": public_url
            }), 200
        
        finally:
            #cleaning temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)




            