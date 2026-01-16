"""
consists of media endpoints.

manages metadata aand version signalling
"""

from flask import request, jsonify

from datetime import datetime, timezone
from changelog import log_change, get_next_version
from auth_authz import register_auth_routes, require_role, get_admin_user


def register_media_routes(app, supabase):
    """
    attach all media related routes to main flask app
    """

    @app.post("/upload-media")
    def register_media():
        """
        registers media item by saving its metadata
        -which species?
        - what type of media?
        - where in S3
        """

        #checking permissions
        # Instead of get_admin_user in POST
        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        #metadaata only not files
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "invalid / missing JSON body"}), 400
        
        #species_id required so we knwo who media belongs to
        species_name = data.get("species_name")
        media_type = data.get("media_type") #video? image?
        download_link = data.get("download_link")

        #for now just using samelink for streaming link but can be enhanced in future
        streaming_link = data.get("streaming_link", download_link)
        alt_text = data.get("alt_text", "")

        if not species_name or not media_type or not download_link:
            return jsonify({
                "error": "species_id, media_type and download_link are required"
            }), 400
        

        #speciesid from species name
        species_resp =(
            supabase.table("species_en")
            .select("species_id")
            .ilike("scientific_name", species_name)
            .limit(1)
            .execute()
        )

        if not species_resp.data:
            return jsonify({
                "error": f"species '{species_name}' not found"
            }), 400
        
        species_id = species_resp.data[0]["species_id"]

        #dont register the same media twice
        existing = (
            supabase.table("media")
            .select("media_id")
            .eq("download_link", download_link)
            .limit(1)
            .execute()
        )

        if existing.data:
            return jsonify({"status": "already registered"}), 409
        
        res = (
            supabase
            .table("media")
            .insert({
                "species_id": species_id,
                "species_name": species_name,
                "media_type": media_type,
                "download_link": download_link,
                "streaming_link": streaming_link,
                "alt_text": alt_text
            })
            .execute()
        )

        media_id = res.data[0]["media_id"]
        #for changelog
        log_change(supabase, "media", media_id, "CREATE")
        return jsonify({
            "status": "success",
            "message": "media upload successful",
        }), 201
    
    #READ ALL MEDIA
    @app.get("/upload-media")
    def list_media():
        """
        return all media entries

        used by admin dashboard for:
        - displaying media
        - allowing edits and deletions
        """

        #checking permissions
        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        result = (
            supabase.table("media")
            .select("""
                media_id,
                species_id,
                species_name,
                media_type,
                download_link,
                streaming_link,
                alt_text
            """)
            .order("media_id", desc=True)
            .execute()
        )

        return jsonify(result.data), 200

    ###### UPDATING EXISTING MEDIA ######
    @app.put("/upload-media/<int:media_id>")
    def update_media(media_id):
        """
        updates media metadata
        """
        #checking permissions
        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "missing JSON body"}), 400
        
        update_data ={}

        if "media_type" in data:
            update_data["media_type"] = data["media_type"]
        
        if "download_link" in data:
            update_data["download_link"] = data["download_link"]
            update_data["streaming_link"] = data["download_link"]

        if "alt_text" in data:
            update_data["alt_text"] = data["alt_text"]
        
        #admin provides new name
        if "species_name" in data:
            species_resp = (
                supabase.table("species_en")
                .select("species_id")
                .ilike("scientific_name", data["species_name"])
                .limit(1)
                .execute()
            )
            #if name exists, update fails
            if not species_resp.data:
                return jsonify({
                    "error": f"Species '{data['species_name']}' not found"
                }), 400
            
            update_data["species_id"] = species_resp.data[0]["species_id"]
            update_data["species_name"] = data["species_name"]
        
        if not update_data:
            return jsonify({"error": "no fields given to update"}), 400
        
        supabase.table("media").update(update_data).eq("media_id", media_id).execute()

        #logging uupdate
        log_change(supabase, "media", media_id, "UPDATE")
        return jsonify({"status": "updated"}), 200
    
    ########### DELETE MEDIA #############
    @app.delete("/upload-media/<int:media_id>")
    def delete_media(media_id):
        """
        deletes media in metadata record

        NOT ACTUAL FILE FROM STORAGE
        """

        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        #find species media belongs to
        media = (
            supabase.table("media")
            .select("species_id")
            .eq("media_id", media_id)
            .limit(1)
            .execute()
        )

        if not media.data:
            return jsonify({"error": "media not found"}), 404
        
        species_id = media.data[0]["species_id"]

        #delete record
        supabase.table("media").delete().eq("media_id", media_id).execute()

        #loggin deletion for sync
        log_change(supabase, "media", media_id, "DELETE")

        return jsonify({
            "status": "deleted",
            "message": "Media removed"
        }), 200