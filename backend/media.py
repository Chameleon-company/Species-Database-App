"""
consists of media endpoints.

manages metadata aand version signalling
"""

from flask import request, jsonify

from datetime import datetime, timezone

def register_media_routes(app, supabase, require_role):
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
        ok, err = require_role(["admin"])
        if not ok:
            return jsonify({"error": err[0]}), err[1]

        #metadaata only not files
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "invalid / missing JSON body"}), 400
        
        #species_id required so we knwo who media belongs to
        species_id = data.get("species_id")
        media_type = data.get("media_type") #video? image?
        download_link = data.get("download_link")

        #for now just using samelink for streaming link but can be enhanced in future
        streaming_link = data.get("streaming_link", download_link)
        alt_text = data.get("alt_text", "")

        if not species_id or not media_type or not download_link:
            return jsonify({
                "error": "species_id, media_type and download_link are required"
            }), 400
        

        #dont register the same media twice
        existing = (
            supabase.table("media")
            .select("media_id")
            .eq("download_link", download_link)
            .limit(1)
            .execute()
        )

        if existing.data:
            return jsonify({"status": "already registered"}), 200
        

        #saving metadata (urls and text not file itself)
        supabase.table("media").insert({
            "species_id": species_id,
            "media_type": media_type,
            "download_link": download_link,
            "streaming_link": streaming_link,
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
        }), 201
    

        