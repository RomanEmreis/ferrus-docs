"""
Generates static/img/ferrus-social-card.png — the OpenGraph card for ferrus.dev.

Mirrors the homepage hero (src/pages/index.tsx + IsoGrid/FerrusLogo): synthwave
sky, banded pixel-sun, perspective grid receding to the horizon, the block
FERRUS banner with the same gradient (148,36,20) -> (226,128,18), and a tagline.

Run:  python3 scripts/generate-social-card.py
"""
from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
OUT = os.path.join(os.path.dirname(__file__), "..", "static", "img", "ferrus-social-card.png")
OUT = os.path.normpath(OUT)

LINES = [
    "███████  ███████  █████   █████   ██   ██  ███████",
    "██       ██       ██  ██  ██  ██  ██   ██  ██     ",
    "█████    █████    █████   █████   ██   ██  ███████",
    "██       ██       ██  ██  ██  ██  ██   ██       ██",
    "██       ███████  ██  ██  ██  ██   █████   ███████",
]

START = (148, 36, 20)
END = (226, 128, 18)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def lerp_color(c1, c2, t):
    return tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(len(c1)))


def draw_sky(img: Image.Image) -> None:
    """Vertical gradient + warm radial glow at the horizon."""
    px = img.load()
    top = (4, 5, 7)
    mid = (7, 9, 12)
    bot = (10, 13, 18)
    cx, cy = W / 2, H * 0.62
    max_r = math.hypot(W * 0.6, H * 0.6)
    for y in range(H):
        ty = y / (H - 1)
        if ty < 0.55:
            base = lerp_color(top, mid, ty / 0.55)
        else:
            base = lerp_color(mid, bot, (ty - 0.55) / 0.45)
        for x in range(W):
            d = math.hypot(x - cx, y - cy) / max_r
            glow = max(0.0, 1.0 - d * 1.6)
            glow_warm = (255, 122, 26)
            r = min(255, base[0] + int(glow_warm[0] * 0.18 * glow))
            g = min(255, base[1] + int(glow_warm[1] * 0.16 * glow))
            b = min(255, base[2] + int(glow_warm[2] * 0.14 * glow))
            # extra deep-red haze near the bottom horizon
            dh = math.hypot((x - W / 2) / W, (y - H) / H)
            haze = max(0.0, 1.0 - dh * 1.4) * 0.35
            r = min(255, r + int(148 * haze))
            g = min(255, g + int(36 * haze))
            b = min(255, b + int(20 * haze))
            px[x, y] = (r, g, b)


def draw_sun(img: Image.Image) -> None:
    """Pixel-banded retro sun sitting behind the banner."""
    sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    # radius and center — visually peeks above the FERRUS banner
    cx, cy = W // 2, int(H * 0.46)
    R = 210
    # 1) full disc with radial gradient
    for r in range(R, 0, -1):
        t = 1.0 - r / R
        if t < 0.35:
            c = lerp_color((216, 74, 10), (255, 140, 42), t / 0.35)
        elif t < 0.7:
            c = lerp_color((255, 140, 42), (255, 209, 139), (t - 0.35) / 0.35)
        else:
            c = lerp_color((255, 209, 139), (255, 235, 200), (t - 0.7) / 0.3)
        alpha = 235
        sd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(c[0], c[1], c[2], alpha))
    # 2) horizontal scanline mask — every 12px keep, every 4px erase, only
    #    on the lower half (synthwave half-sun look)
    mask = Image.new("L", (W, H), 255)
    md = ImageDraw.Draw(mask)
    y = cy - 4
    band = 0
    while y < cy + R + 8:
        if band % 2 == 1:
            md.rectangle([0, y, W, y + 4], fill=0)
            y += 4
        else:
            y += 12
        band += 1
        # widen the gaps as we approach the bottom
        if y > cy + R * 0.55:
            md.rectangle([0, y, W, y + 5], fill=0)
            y += 5
    sun.putalpha(Image.eval(sun.split()[-1], lambda a: a).point(lambda v: v))
    # apply scanline mask to the sun's alpha
    a = sun.split()[-1]
    a = Image.eval(a, lambda v: v)
    a = Image.composite(a, Image.new("L", (W, H), 0), mask)
    sun.putalpha(a)
    # subtle bloom
    glow = sun.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(glow)
    img.alpha_composite(sun)


def draw_grid(img: Image.Image) -> None:
    """Perspective grid receding toward the horizon."""
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    horizon_y = int(H * 0.62)
    bottom_y = H + 30
    color = (255, 122, 26, 200)
    # horizontal lines, spaced via 1/(1-t) so they bunch toward horizon
    rows = 14
    for i in range(rows + 1):
        t = i / rows
        # perspective y: invert so closer rows are further apart
        ease = t * t
        y = int(horizon_y + (bottom_y - horizon_y) * ease)
        alpha = int(60 + 195 * t)
        gd.line([(0, y), (W, y)], fill=(255, 122, 26, min(255, alpha)), width=2)
    # vertical lines converging to a vanishing point at center horizon
    vx, vy = W // 2, horizon_y
    cols = 22
    for i in range(-cols, cols + 1):
        x_bottom = W // 2 + int(i * (W / cols) * 0.95)
        gd.line([(vx, vy), (x_bottom, bottom_y)], fill=color, width=2)
    # fade the top of the grid into the sky
    fade = Image.new("L", (W, H), 255)
    fd = ImageDraw.Draw(fade)
    for y in range(horizon_y - 2, horizon_y + 80):
        t = (y - (horizon_y - 2)) / 82
        fd.line([(0, y), (W, y)], fill=int(255 * min(1.0, max(0.0, t))))
    a = grid.split()[-1]
    a = Image.composite(a, Image.new("L", (W, H), 0), fade)
    grid.putalpha(a)
    img.alpha_composite(grid)


def draw_stars(img: Image.Image) -> None:
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    # deterministic positions, same vibe as the TSX component
    for i in range(70):
        x = (i * 73) % W
        y = (i * 137) % int(H * 0.55)
        size = 1 + (i % 3 == 0)
        a = 140 + (i * 17) % 110
        sd.rectangle([x, y, x + size, y + size], fill=(255, 217, 168, a))
    img.alpha_composite(stars)


def draw_logo(img: Image.Image) -> None:
    """Block-character FERRUS banner with vertical gradient, like FerrusLogo."""
    cols = max(len(l) for l in LINES)
    rows = len(LINES)
    cell = 16
    banner_w = cols * cell
    banner_h = rows * cell
    x0 = (W - banner_w) // 2
    y0 = int(H * 0.30) - banner_h // 2
    d = ImageDraw.Draw(img)
    # soft drop shadow behind the banner
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for r, line in enumerate(LINES):
        for c, ch in enumerate(line):
            if ch == "█":
                x = x0 + c * cell
                y = y0 + r * cell
                sd.rectangle([x + 4, y + 6, x + cell + 4, y + cell + 6], fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    img.alpha_composite(shadow)
    for r, line in enumerate(LINES):
        color = mix(START, END, r / (rows - 1))
        for c, ch in enumerate(line):
            if ch == "█":
                x = x0 + c * cell
                y = y0 + r * cell
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=color + (255,))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if bold:
        candidates += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
        ]
    candidates += [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def text_centered(d: ImageDraw.ImageDraw, y: int, text: str, font, fill) -> None:
    bbox = d.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    d.text(((W - w) // 2, y), text, font=font, fill=fill)


def draw_text(img: Image.Image) -> None:
    d = ImageDraw.Draw(img)
    tagline_font = load_font(30, bold=True)
    sub_font = load_font(22)
    url_font = load_font(20, bold=True)

    # tagline
    text_centered(
        d,
        int(H * 0.62),
        "Deterministic orchestration of AI agents for real software work.",
        tagline_font,
        (255, 232, 200, 255),
    )
    # sub-tagline (the index.tsx "// A Supervisor → Executor → Reviewer..." line)
    sub = "// Supervisor → Executor → Reviewer state machine for coding agents"
    bbox = d.textbbox((0, 0), sub, font=sub_font)
    sw = bbox[2] - bbox[0]
    sx = (W - sw) // 2
    sy = int(H * 0.62) + 46
    # dim slashes, brighter body
    d.text((sx, sy), "// ", font=sub_font, fill=(255, 122, 26, 180))
    slash_w = d.textbbox((0, 0), "// ", font=sub_font)[2]
    d.text((sx + slash_w, sy), sub[3:], font=sub_font, fill=(214, 220, 230, 230))

    # bottom badge row + url
    badges = ["alpha · v0.2.7", "Apache-2.0", "Rust 1.95+"]
    badge_font = load_font(18, bold=True)
    pad_x, pad_y = 14, 8
    gap = 14
    widths = []
    for b in badges:
        bb = d.textbbox((0, 0), b, font=badge_font)
        widths.append(bb[2] - bb[0])
    total = sum(w + 2 * pad_x for w in widths) + gap * (len(badges) - 1)
    bx = (W - total) // 2
    by = H - 90
    for w, b in zip(widths, badges):
        d.rectangle(
            [bx, by, bx + w + 2 * pad_x, by + 18 + 2 * pad_y],
            outline=(255, 122, 26, 220),
            width=2,
        )
        d.text((bx + pad_x, by + pad_y - 2), b, font=badge_font, fill=(255, 209, 139, 255))
        bx += w + 2 * pad_x + gap

    # ferrus.dev tag, bottom-right
    url = "ferrus.dev"
    bb = d.textbbox((0, 0), url, font=url_font)
    uw = bb[2] - bb[0]
    d.text((W - uw - 36, H - 40), url, font=url_font, fill=(255, 209, 139, 230))

    # left-side prompt accent
    d.text((36, H - 40), "$ ferrus", font=url_font, fill=(122, 226, 132, 230))


def draw_scanlines(img: Image.Image) -> None:
    sl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sl)
    for y in range(0, H, 3):
        sd.line([(0, y), (W, y)], fill=(0, 0, 0, 56), width=1)
    img.alpha_composite(sl)


def draw_vignette(img: Image.Image) -> None:
    v = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(v)
    cx, cy = W / 2, H * 0.55
    max_r = math.hypot(W * 0.55, H * 0.55)
    px = v.load()
    for y in range(H):
        for x in range(W):
            d = math.hypot(x - cx, y - cy) / max_r
            if d < 0.55:
                continue
            t = min(1.0, (d - 0.55) / 0.45)
            a = int(180 * t * t)
            px[x, y] = (0, 0, 0, a)
    img.alpha_composite(v)


def draw_border(img: Image.Image) -> None:
    d = ImageDraw.Draw(img)
    # subtle inner frame, terminal vibe
    d.rectangle([10, 10, W - 11, H - 11], outline=(255, 122, 26, 90), width=2)


def main() -> None:
    base = Image.new("RGBA", (W, H), (4, 5, 7, 255))
    draw_sky(base)
    draw_stars(base)
    draw_sun(base)
    draw_grid(base)
    draw_logo(base)
    draw_text(base)
    draw_scanlines(base)
    draw_vignette(base)
    draw_border(base)
    base.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}  ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
