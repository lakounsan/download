#!/usr/bin/env python3
"""Generate launcher icons for the BasicLearning Android app.

Writes ic_launcher.png into app/res/mipmap-*/ of this repository.
Requires Pillow:  pip install pillow
"""
from PIL import Image, ImageDraw, ImageFont
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "app", "res"))
SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

TOP = (79, 142, 247)     # #4F8EF7 bright blue
BOT = (139, 92, 246)     # #8B5CF6 purple

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]


def load_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_icon(size):
    s = 4  # supersample
    n = size * s
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # full-bleed rounded square with vertical gradient
    radius = int(n * 0.16)
    grad = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(n):
        gd.line([(0, y), (n, y)], fill=lerp(TOP, BOT, y / n))
    mask = Image.new("L", (n, n), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, n - 1, n - 1], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # white circle backdrop (subtle)
    cx, cy = n * 0.5, n * 0.5
    r = n * 0.30
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 38))

    # yellow star top-right
    star_c = n * 0.79, n * 0.21
    sr = n * 0.115
    pts = []
    for i in range(10):
        ang = -90 + i * 36
        rad = sr if i % 2 == 0 else sr * 0.45
        pts.append((star_c[0] + rad * math.cos(math.radians(ang)),
                    star_c[1] + rad * math.sin(math.radians(ang))))
    d.polygon(pts, fill=(255, 209, 84, 255), outline=(255, 255, 255, 255), width=max(1, n // 192))

    # "ABC" text centered
    fsize = int(n * 0.34)
    font = load_font(fsize)
    text = "ABC"
    bb = d.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx, ty = (n - tw) / 2 - bb[0], (n - th) / 2 - bb[1] + n * 0.01
    d.text((tx + n * 0.012, ty + n * 0.014), text, font=font, fill=(30, 30, 90, 120))
    d.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))

    # yellow underline bar
    bw, bh = n * 0.40, n * 0.055
    bx = (n - bw) / 2
    by = n * 0.70
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=bh / 2, fill=(255, 209, 84, 255))

    return img.resize((size, size), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
for dpi, size in SIZES.items():
    folder = os.path.join(OUT, f"mipmap-{dpi}")
    os.makedirs(folder, exist_ok=True)
    draw_icon(size).save(os.path.join(folder, "ic_launcher.png"))
    print(f"ic_launcher.png -> mipmap-{dpi} ({size}x{size})")
print("Icons done.")
