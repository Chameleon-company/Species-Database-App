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
                "alt_text": alt_text,
                "storage_version": 1
            })
            .execute()
        )

        media_id = res.data[0]["media_id"]
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
                alt_text,
                storage_version
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
        
        update_data = {}
        storage_changed = False

        if "media_type" in data:
            update_data["media_type"] = data["media_type"]

        if "download_link" in data:
            update_data["download_link"] = data["download_link"]
            update_data["streaming_link"] = data["download_link"]
            storage_changed = True

        if "alt_text" in data:
            update_data["alt_text"] = data["alt_text"]

        if "species_name" in data:
            species_resp = (
                supabase.table("species_en")
                .select("species_id")
                .ilike("scientific_name", data["species_name"])
                .limit(1)
                .execute()
            )
            if not species_resp.data:
                return jsonify({
                    "error": f"Species '{data['species_name']}' not found"
                }), 400
            update_data["species_id"] = species_resp.data[0]["species_id"]
            update_data["species_name"] = data["species_name"]

        if not update_data:
            return jsonify({"error": "no fields given to update"}), 400

        if storage_changed:
            current = (
                supabase.table("media")
                .select("storage_version")
                .eq("media_id", media_id)
                .limit(1)
                .execute()
            )
            if not current.data:
                return jsonify({"error": "media not found"}), 404
            update_data["storage_version"] = current.data[0]["storage_version"] + 1

        supabase.table("media").update(update_data).eq("media_id", media_id).execute()

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


    ##### SEED GERMINATION VIDEOS #####

    @app.post("/api/species/<int:species_id>/videos")
    def add_species_video(species_id):
        """
        registers a video url for a species seed germination section
        videos live in google drive / s3, we just store the link
        """

        #admin only
        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "missing JSON body"}), 400

        download_link = data.get("download_link")
        if not download_link:
            return jsonify({"error": "download_link is required"}), 400

        #streaming link defaults to same as download if not given
        streaming_link = data.get("streaming_link", download_link)
        alt_text = data.get("alt_text", "")

        #make sure species actually exists first
        species_resp = (
            supabase.table("species_en")
            .select("species_id, scientific_name")
            .eq("species_id", species_id)
            .limit(1)
            .execute()
        )
        if not species_resp.data:
            return jsonify({"error": f"species {species_id} not found"}), 404

        species_name = species_resp.data[0]["scientific_name"]

        #dont register same video twice for same species
        duplicate = (
            supabase.table("media")
            .select("media_id")
            .eq("species_id", species_id)
            .eq("media_type", "video")
            .eq("download_link", download_link)
            .limit(1)
            .execute()
        )
        if duplicate.data:
            return jsonify({"error": "video already registered for this species"}), 409

        res = (
            supabase.table("media")
            .insert({
                "species_id": species_id,
                "species_name": species_name,
                "media_type": "video",
                "download_link": download_link,
                "streaming_link": streaming_link,
                "alt_text": alt_text,
                "storage_version": 1
            })
            .execute()
        )

        media_id = res.data[0]["media_id"]
        log_change(supabase, "media", media_id, "CREATE")

        return jsonify({
            "status": "success",
            "message": "video registered",
            "media_id": media_id
        }), 201


    @app.get("/api/species/<int:species_id>/videos")
    def get_species_videos(species_id):
        """
        returns all videos for a species
        no auth needed - used by the user app to show seed germination videos
        returns empty list if species has no videos yet
        """

        #check species exists
        species_resp = (
            supabase.table("species_en")
            .select("species_id")
            .eq("species_id", species_id)
            .limit(1)
            .execute()
        )
        if not species_resp.data:
            return jsonify({"error": f"species {species_id} not found"}), 404

        videos = (
            supabase.table("media")
            .select("media_id, species_id, species_name, download_link, streaming_link, alt_text, storage_version")
            .eq("species_id", species_id)
            .eq("media_type", "video")
            .order("media_id", desc=False)
            .execute()
        )

        return jsonify({
            "species_id": species_id,
            "videos": videos.data
        }), 200


    @app.put("/api/media/videos/<int:media_id>")
    def update_species_video(media_id):
        """
        updates an existing video record - download link, streaming link or alt text
        """

        #admin only
        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        #make sure its actually a video record
        existing = (
            supabase.table("media")
            .select("media_id, media_type")
            .eq("media_id", media_id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            return jsonify({"error": "video not found"}), 404
        if existing.data[0]["media_type"] != "video":
            return jsonify({"error": "media record is not a video"}), 400

        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "missing JSON body"}), 400

        update_fields = {}
        storage_changed = False

        if "download_link" in data:
            update_fields["download_link"] = data["download_link"]
            update_fields["streaming_link"] = data["download_link"]
            storage_changed = True
        if "streaming_link" in data:
            update_fields["streaming_link"] = data["streaming_link"]
            storage_changed = True
        if "alt_text" in data:
            update_fields["alt_text"] = data["alt_text"]

        if not update_fields:
            return jsonify({"error": "no fields to update"}), 400

        if storage_changed:
            current = (
                supabase.table("media")
                .select("storage_version")
                .eq("media_id", media_id)
                .limit(1)
                .execute()
            )
            update_fields["storage_version"] = current.data[0]["storage_version"] + 1

        supabase.table("media").update(update_fields).eq("media_id", media_id).execute()
        log_change(supabase, "media", media_id, "UPDATE")

        return jsonify({"status": "updated"}), 200


    @app.delete("/api/media/videos/<int:media_id>")
    def delete_species_video(media_id):
        """
        deletes a video record from the db
        doesnt remove the actual file from storage, just the metadata
        """

        #admin only
        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        #make sure its a video before deleting
        existing = (
            supabase.table("media")
            .select("media_id, media_type")
            .eq("media_id", media_id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            return jsonify({"error": "video not found"}), 404
        if existing.data[0]["media_type"] != "video":
            return jsonify({"error": "media record is not a video"}), 400

        supabase.table("media").delete().eq("media_id", media_id).execute()
        log_change(supabase, "media", media_id, "DELETE")

        return jsonify({
            "status": "deleted",
            "message": "video record removed"
        }), 200