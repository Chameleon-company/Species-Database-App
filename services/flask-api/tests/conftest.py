from io import BytesIO

from PIL import Image


COLOURS = {
    "1": 1,
    "L": 128,
    "RGBA": (20, 120, 60, 180),
}


def create_image(image_format="PNG", size=(32, 32), mode="RGB"):
    """Return the encoded bytes of a solid-colour image.

    "MPO" writes a second frame, a red RGB preview at half the size.
    """
    image = Image.new(mode, size, COLOURS.get(mode, (20, 120, 60)))
    output = BytesIO()
    if image_format == "MPO":
        preview = Image.new("RGB", (max(1, image.width // 2), max(1, image.height // 2)), (200, 10, 10))
        image.save(output, format="MPO", save_all=True, append_images=[preview])
    else:
        image.save(output, format=image_format)
    return output.getvalue()
