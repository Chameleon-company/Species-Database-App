"""Content checks for uploaded images, shared by every upload route."""

from io import BytesIO

from PIL import Image, UnidentifiedImageError


MAX_IMAGE_PIXELS = 40_000_000


def detect_image_format(data: bytes) -> str:
    """Return the format Pillow detects in the bytes, such as "JPEG" or "PNG".

    A multi-picture JPEG, which Pillow labels "MPO", returns "JPEG".

    The check reads the header and verifies the file without decoding the
    pixels, so a small file that claims huge dimensions is cheap to reject.

    Raises ValueError("invalid_image") when the bytes are not a readable image,
    and ValueError("image_too_large") when the image has more than
    MAX_IMAGE_PIXELS pixels.
    """
    try:
        with Image.open(BytesIO(data)) as image:
            detected_format = image.format
            width, height = image.size
            image.verify()
    except Image.DecompressionBombError as exc:
        raise ValueError("image_too_large") from exc
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise ValueError("invalid_image") from exc

    if width * height > MAX_IMAGE_PIXELS:
        raise ValueError("image_too_large")

    if detected_format == "MPO":
        return "JPEG"

    return detected_format
