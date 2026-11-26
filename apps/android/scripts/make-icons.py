"""Generate the Android launcher icons, splash images and the Play Store icon from the FINI logo.

Usage (needs Pillow): python apps/android/scripts/make-icons.py
The logo is the web app's Assets/Images/Camouflage18/image.png (368x237). For a sharper icon, point
logo_path (and the FG/background colours) at a larger logo and run it again.
"""
import os
import sys
from PIL import Image, ImageDraw

repo = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
logo_path = os.path.join(repo, "apps/field-legacy/Assets/Images/Camouflage18/image.png")
res = os.path.join(repo, "apps/android/android/app/src/main/res")
store = os.path.join(repo, "apps/android/store")

src = Image.open(logo_path).convert("RGBA")
w, h = src.size
BG = src.getpixel((0, 0))[:3]  # sampled corner colour, (226, 236, 221) = #E2ECDD
print("background", BG, "#%02X%02X%02X" % BG)

# Colour-to-alpha: treat the flat background as transparent and un-blend anti-aliased edges.
FG = (60, 103, 6)  # most common logo green
span = sum(abs(a - b) for a, b in zip(FG, BG))
px = src.load()
keyed = Image.new("RGBA", (w, h))
kp = keyed.load()
for y in range(h):
    for x in range(w):
        r, g, b, _ = px[x, y]
        d = abs(r - BG[0]) + abs(g - BG[1]) + abs(b - BG[2])
        a = 0.0 if d <= 6 else min(1.0, d / span)
        if a == 0:
            kp[x, y] = (0, 0, 0, 0)
            continue
        c = [max(0, min(255, round((v - (1 - a) * bgv) / a))) for v, bgv in zip((r, g, b), BG)]
        kp[x, y] = (c[0], c[1], c[2], round(a * 255))
logo = keyed.crop(keyed.getbbox())
lw, lh = logo.size
print("logo content", logo.size)


def logo_at(width):
    height = round(lh * width / lw)
    return logo.resize((round(width), height), Image.LANCZOS)


def place(canvas, width):
    l = logo_at(width)
    cw, ch = canvas.size
    canvas.alpha_composite(l, ((cw - l.width) // 2, (ch - l.height) // 2))
    return canvas


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)


def rounded(size, box_frac, radius_frac, circle=False):
    """Background shape at 4x then downsampled for smooth edges."""
    s = size * 4
    m = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(m)
    inset = s * (1 - box_frac) / 2
    if circle:
        d.ellipse([inset, inset, s - inset, s - inset], fill=255)
    else:
        d.rounded_rectangle([inset, inset, s - inset, s - inset], radius=s * radius_frac, fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    img = Image.new("RGBA", (size, size), BG + (255,))
    img.putalpha(m)
    return img


densities = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, f in densities.items():
    legacy = round(48 * f)
    # Legacy square icon (API 24-25): rounded square like the template's, logo at 75% of the square.
    sq = rounded(legacy, 0.84, 0.09)
    save(place(sq, legacy * 0.84 * 0.75), f"{res}/mipmap-{name}/ic_launcher.png")
    # Legacy round icon: the logo's diagonal stays well inside the circle.
    rd = rounded(legacy, 0.92, 0, circle=True)
    save(place(rd, legacy * 0.92 * 0.66), f"{res}/mipmap-{name}/ic_launcher_round.png")
    # Adaptive foreground: 108dp canvas, logo inside the central 66dp safe circle.
    fg_size = round(108 * f)
    fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    save(place(fg, fg_size * 0.48), f"{res}/mipmap-{name}/ic_launcher_foreground.png")

# Splash images at the existing sizes, logo centred on the background colour.
for dirname in sorted(os.listdir(res)):
    p = os.path.join(res, dirname, "splash.png")
    if not os.path.exists(p):
        continue
    sw, sh = Image.open(p).size
    img = Image.new("RGBA", (sw, sh), BG + (255,))
    save(place(img, min(sw, sh) * 0.35).convert("RGB"), p)
    print("splash", dirname, (sw, sh))

# Play Store listing icon: full-bleed 512x512 square (Play applies its own mask).
icon = Image.new("RGBA", (512, 512), BG + (255,))
save(place(icon, 512 * 0.62), f"{store}/icon-512.png")
print("done")
