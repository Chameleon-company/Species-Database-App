"""
consists of media endpoints.

manages metadata aand version signalling
"""

import re
from uuid import uuid4

from flask import request, jsonify

from datetime import datetime, timezone
from changelog import log_change, get_next_version
from auth_authz import register_auth_routes, require_role, get_admin_user
from urllib.parse import urlparse
import ipaddress
import socket
import requests
from upload_validation import MAX_IMAGE_PIXELS, detect_image_format


#the validator below fetches a caller-supplied URL from the server, so the
#server can be aimed at hosts a caller could not reach themselves. only plain
#web schemes are allowed, and anything resolving to a private, loopback or
#link-local address is refused - 169.254.169.254 in particular is the cloud
#instance metadata service, which hands out credentials.
ALLOWED_URL_SCHEMES = ("http", "https")
URL_VALIDATION_TIMEOUT = 5


def _is_public_host(hostname):
    """
    resolves hostname and returns False if ANY address it maps to is not a
    public one. checking every result matters: a name can resolve to a public
    and a private address at once to slip past a single check.
    """
    if not hostname:
        return False

    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False

    for family, _type, _proto, _canon, sockaddr in results:
        try:
            ip = ipaddress.ip_address(sockaddr[0])
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False

    return True


def validate_url_target(url):
    """
    scheme and destination check only, no request is made. the video endpoints
    store share links rather than direct media files, so they need this half of
    the checking without the content-type half that validate_media_url adds.
    """
    parsed = urlparse(url)

    if not parsed.scheme or not parsed.netloc:
        return False, "Invalid URL format"

    if parsed.scheme.lower() not in ALLOWED_URL_SCHEMES:
        return False, "URL must use http or https"

    if not _is_public_host(parsed.hostname):
        return False, "URL host is not permitted"

    return True, None


MAX_UPLOAD_BYTES = {
    "image": 10 * 1024 * 1024,
    "video": 50 * 1024 * 1024,
}
MULTIPART_OVERHEAD_BYTES = 64 * 1024

STORAGE_LOCATIONS = {
    "image": ("species_images", "Photos"),
    "video": ("media", "videos"),
}

IMAGE_TYPES = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
    "GIF": ("gif", "image/gif"),
}

VIDEO_TYPES = {
    "MP4": ("mp4", "video/mp4"),
    "MOV": ("mov", "video/quicktime"),
    "WEBM": ("webm", "video/webm"),
}

MP4_BRANDS = {
    b"isom", b"iso2", b"iso4", b"iso5", b"iso6",
    b"mp41", b"mp42", b"avc1", b"M4V ", b"MSNV", b"dash",
}

UPLOAD_ERRORS = {
    "invalid_image": ("the file is not a valid image", 400),
    "image_too_large": (
        f"the image is larger than {MAX_IMAGE_PIXELS // 1_000_000} megapixels",
        413,
    ),
    "unsupported_type": (
        "only JPG, PNG, WEBP, GIF, MP4, MOV and WEBM files are supported",
        415,
    ),
}


def _detect_video_format(data: bytes) -> str | None:
    """Return "MP4", "MOV" or "WEBM" from the container header, or None.

    MP4 and MOV share the ISO media "ftyp" box, so the major brand tells them
    apart and keeps out other ISO media files such as HEIC photos and M4A audio.
    WebM is an EBML file whose DocType element reads "webm".
    """
    if data[4:8] == b"ftyp":
        brand = data[8:12]
        if brand == b"qt  ":
            return "MOV"
        if brand in MP4_BRANDS:
            return "MP4"
        return None

    if data[:4] == b"\x1a\x45\xdf\xa3" and b"\x42\x82\x84webm" in data[:64]:
        return "WEBM"

    return None


def _detect_file_type(media_type: str, data: bytes) -> tuple[str, str]:
    """Return the file extension and content type for an upload.

    The type comes from the file's content, never its name, and must match the
    media type the admin chose. Raises ValueError with a key of UPLOAD_ERRORS.
    """
    if media_type == "image":
        image_format = detect_image_format(data)
        if image_format not in IMAGE_TYPES:
            raise ValueError("unsupported_type")
        return IMAGE_TYPES[image_format]

    video_format = _detect_video_format(data)
    if video_format is None:
        raise ValueError("unsupported_type")
    return VIDEO_TYPES[video_format]


def _storage_folder(scientific_name: str) -> str:
    """Turn a scientific name into a safe folder name, such as "Tectona_grandis"."""
    return re.sub(r"[^A-Za-z0-9_-]", "", scientific_name.strip().replace(" ", "_"))


def register_media_routes(app, supabase):
    """
    attach all media related routes to main flask app
    """

    ALLOWED_MEDIA_TYPES = ["image", "video"]

    #Adding validation
    def validate_media_url(url, media_type):
        try:
            # scheme and destination, shared with the video endpoints
            is_valid, error = validate_url_target(url)
            if not is_valid:
                return False, error

            # check if the URL works. redirects are refused rather than
            # followed, since a public URL can redirect to an internal one
            # after the host check has already passed.
            response = requests.head(
                url,
                timeout=URL_VALIDATION_TIMEOUT,
                allow_redirects=False,
            )

            if response.status_code != 200:
                return False, "The URL is not reachable"

            # check the type of the content
            content_type = response.headers.get("Content-Type", "")

            if media_type == "image" and not content_type.startswith("image/"):
                return False, "URL is not an image"

            if media_type == "video" and not content_type.startswith("video/"):
                return False, "URL is not a video"

            return True, None

        except requests.RequestException:
            return False, "URL error checking"

    
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

        # Validating the media type
        if media_type not in ALLOWED_MEDIA_TYPES:
            return jsonify({"error": "The media type is invalid"}), 400

        # Validating URL
        is_valid, error = validate_media_url(download_link, media_type)
        if not is_valid:
            return jsonify({"error": error}), 400
        

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
    
    @app.post("/upload-media/file")
    def upload_media_file():
        """
        Store an uploaded image or video and register it as media for a species.

        Expects the multipart form fields file, species_name, media_type
        ("image" or "video") and an optional alt_text. Images go to the
        species_images bucket and videos to the media bucket, under a folder
        named after the species and a random file name. Returns the new
        media_id, the storage path and the public URL.
        """
        admin_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        largest_upload = max(MAX_UPLOAD_BYTES.values()) + MULTIPART_OVERHEAD_BYTES
        if request.content_length and request.content_length > largest_upload:
            return jsonify({"error": "the file is too large"}), 413

        uploaded_file = request.files.get("file")
        species_name = (request.form.get("species_name") or "").strip()
        media_type = request.form.get("media_type")
        alt_text = (request.form.get("alt_text") or "").strip()

        if (
            not uploaded_file
            or not uploaded_file.filename
            or not species_name
            or media_type not in MAX_UPLOAD_BYTES
        ):
            return jsonify({
                "error": "file, species_name and media_type (image or video) are required"
            }), 400

        max_bytes = MAX_UPLOAD_BYTES[media_type]
        data = uploaded_file.read(max_bytes + 1)
        if not data:
            return jsonify({"error": "the file is empty"}), 400
        if len(data) > max_bytes:
            return jsonify({
                "error": f"the {media_type} is larger than {max_bytes // (1024 * 1024)} MB"
            }), 413

        try:
            extension, content_type = _detect_file_type(media_type, data)
        except ValueError as exc:
            message, status_code = UPLOAD_ERRORS[str(exc)]
            return jsonify({"error": message}), status_code

        species_resp = (
            supabase.table("species_en")
            .select("species_id, scientific_name")
            .ilike("scientific_name", species_name)
            .limit(1)
            .execute()
        )
        if not species_resp.data:
            return jsonify({"error": f"species '{species_name}' not found"}), 400

        species_id = species_resp.data[0]["species_id"]
        scientific_name = species_resp.data[0]["scientific_name"]

        bucket, prefix = STORAGE_LOCATIONS[media_type]
        path = f"{prefix}/{_storage_folder(scientific_name)}/{uuid4().hex}.{extension}"
        storage = supabase.storage.from_(bucket)

        try:
            storage.upload(path, data, {"content-type": content_type})
        except Exception:
            app.logger.exception("Media upload to storage failed.")
            return jsonify({"error": "the file could not be stored"}), 502

        public_url = storage.get_public_url(path)

        try:
            res = (
                supabase.table("media")
                .insert({
                    "species_id": species_id,
                    "species_name": scientific_name,
                    "media_type": media_type,
                    "download_link": public_url,
                    "streaming_link": public_url,
                    "alt_text": alt_text,
                })
                .execute()
            )
        except Exception:
            storage.remove([path])
            raise

        media_id = res.data[0]["media_id"]
        log_change(supabase, "media", media_id, "CREATE")

        return jsonify({
            "status": "success",
            "media_id": media_id,
            "path": f"{bucket}/{path}",
            "url": public_url,
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

        #both links are admin supplied and get fetched by clients later, so they
        #go through the same destination check /upload-media uses.
        for link in (download_link, streaming_link):
            is_valid, error = validate_url_target(link)
            if not is_valid:
                return jsonify({"error": error}), 400

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

        #same destination check as the POST, on whichever links were sent
        for field in ("download_link", "streaming_link"):
            if field in data:
                is_valid, error = validate_url_target(data[field])
                if not is_valid:
                    return jsonify({"error": error}), 400

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
