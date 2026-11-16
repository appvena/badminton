#!/usr/bin/env python3
"""Ikon PWA SRISP: kok (shuttlecock) — bola merah + kerucut bulu garis tipis."""
from PIL import Image, ImageDraw
import math, os

PAPER = (244, 240, 230, 255)
INK = (29, 26, 20, 255)
ACCENT = (214, 64, 69, 255)

def make(size, inner=0.72, framed=True):
    img = Image.new("RGBA", (size, size), PAPER)
    d = ImageDraw.Draw(img)
    u = size / 512.0            # unit skala desain (kanvas dasar 512)
    lw = max(2, int(16 * u * inner))

    # Kumpulkan bentuk pada kanvas 512 lalu skala
    base = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    b = ImageDraw.Draw(base)
    cx, ball_y = 256, 330
    r = 52
    # kerucut bulu: garis radiasi dari pusat bola ke busur atas
    for angdeg in (-52, -30, 0, 30, 52):
        a = math.radians(angdeg - 90)          # -90 = ke atas
        x1 = cx + math.cos(a) * (r + 8)
        y1 = ball_y + math.sin(a) * (r + 8)
        x2 = cx + math.cos(a) * (r + 176)
        y2 = ball_y + math.sin(a) * (r + 176)
        b.line([x1, y1, x2, y2], fill=INK, width=15)
    # pita pangkal bulu (garis lengkung tipis)
    b.arc([cx - 120, ball_y - 150, cx + 120, ball_y - 30], start=200, end=340, fill=INK, width=10)
    # bola kok
    b.ellipse([cx - r, ball_y - r, cx + r, ball_y + r], fill=ACCENT)
    # jejak lintasan: titik-titik merah mengecil
    for i in range(6):
        t = i / 5
        px = 90 + 240 * (1 - t)
        py = 118 - 60 * math.sin(t * math.pi * 0.9)
        rr = 7 + 5 * t
        b.ellipse([px - rr, py - rr, px + rr, py + rr], fill=ACCENT)
    # rotasi ringan agar terasa dinamis
    base = base.rotate(18, resample=Image.BICUBIC)
    # tempel sesuai inner
    target = int(512 * inner)
    sh = base.resize((target, target), Image.LANCZOS)
    img.alpha_composite(sh, ((size - target) // 2, (size - target) // 2))

    if framed:
        m = max(3, int(size * 0.035))
        d.rectangle([m, m, size - m, size - m], outline=INK, width=m)
    return img

os.makedirs("public/icons", exist_ok=True)
os.makedirs("tools", exist_ok=True)
for name, sz, inner, framed in [
    ("icon-192", 192, 0.78, True),
    ("icon-512", 512, 0.78, True),
    ("maskable-512", 512, 0.52, False),
    ("apple-touch", 180, 0.80, False),
]:
    make(sz, inner, framed).save(f"public/icons/{name}.png")
    print("saved", name)
make(512, 0.78, True).save("tools/logo-512.png")
print("done")
