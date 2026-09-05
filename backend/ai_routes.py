from io import BytesIO

from flask import jsonify, request
from PIL import Image, UnidentifiedImageError

from ai_service import (
    ModelConfigurationError,
    SpeciesIdentificationService,
    get_species_identification_service,
)


DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SUPPORTED_IMAGE_FORMATS = {"JPEG", "PNG"}


def _error_response(code: str, message: str, status_code: int):
    """Create a consistent API error response."""
    return jsonify({
        "status": "error",
        "error": {
            "code": code,
            "message": message,
        },
    }), status_code


def _read_and_validate_upload(
    uploaded_file,
    max_upload_bytes: int,
) -> bytes:
    """Read and validate an uploaded image without trusting its extension."""
    image_bytes = uploaded_file.read(max_upload_bytes + 1)

    if not image_bytes:
        raise ValueError("empty_image")

    if len(image_bytes) > max_upload_bytes:
        raise ValueError("image_too_large")

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            detected_format = image.format
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("invalid_image") from exc

    if detected_format not in SUPPORTED_IMAGE_FORMATS:
        raise ValueError("unsupported_image_type")

    return image_bytes


def register_ai_routes(
    app,
    service: SpeciesIdentificationService | None = None,
    max_upload_bytes: int = DEFAULT_MAX_UPLOAD_BYTES,
):
    """Register the AI species-identification endpoint."""

    active_service = service

    if active_service is None:
        try:
            active_service = get_species_identification_service()
            app.logger.info(
                "AI species-identification model loaded successfully."
            )
        except (
            FileNotFoundError,
            OSError,
            ModelConfigurationError,
        ):
            app.logger.exception(
                "AI species-identification service failed to initialise."
            )
            active_service = None

    @app.post("/api/ai/identify")
    def identify_species():
        if active_service is None:
            return _error_response(
                "model_unavailable",
                "Species identification is temporarily unavailable.",
                503,
            )

        if "image" not in request.files:
            return _error_response(
                "missing_image",
                "An image file is required.",
                400,
            )

        uploaded_file = request.files["image"]

        if not uploaded_file or not uploaded_file.filename:
            return _error_response(
                "empty_image",
                "The uploaded image is empty.",
                400,
            )

        try:
            image_bytes = _read_and_validate_upload(
                uploaded_file,
                max_upload_bytes,
            )
        except ValueError as exc:
            validation_code = str(exc)

            validation_errors = {
                "empty_image": (
                    "The uploaded image is empty.",
                    400,
                ),
                "image_too_large": (
                    "The uploaded image exceeds the maximum allowed size.",
                    413,
                ),
                "invalid_image": (
                    "The uploaded file is not a valid image.",
                    400,
                ),
                "unsupported_image_type": (
                    "The decoded image format is not supported.",
                    415,
                ),
            }

            message, status_code = validation_errors.get(
                validation_code,
                ("The uploaded image is invalid.", 400),
            )

            return _error_response(
                validation_code,
                message,
                status_code,
            )

        try:
            prediction = active_service.identify(
                BytesIO(image_bytes)
            )
        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
        ):
            app.logger.warning(
                "AI image preprocessing failed.",
                exc_info=True,
            )
            return _error_response(
                "invalid_image",
                "The uploaded file could not be processed as an image.",
                400,
            )
        except Exception:
            app.logger.exception(
                "Unexpected AI species-identification failure."
            )
            return _error_response(
                "inference_failed",
                "Species identification could not be completed.",
                500,
            )

        response_status = (
            "uncertain"
            if prediction["uncertain"]
            else "success"
        )

        response = {
            "status": response_status,
            "prediction": prediction,
            "supported_species_count": len(active_service.labels),
        }

        if prediction["uncertain"]:
            response["message"] = (
                "The image could not be identified reliably."
            )

        return jsonify(response), 200