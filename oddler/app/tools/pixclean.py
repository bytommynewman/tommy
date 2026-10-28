#!/usr/bin/env python3
"""Re-pixel the AI-drawn sprites onto a true grid so they render crisp.

Each source PNG is "pixel art" drawn at roughly 5–10 screen pixels per art
pixel, with gradient noise inside blocks and a keying fringe at the edges.
This samples every block near its centre, settles the palette, drops the
magenta fringe and lone specks, and writes the sprite back at its original
size with exact square blocks.

    python3 tools/pixclean.py <src-dir> <dst-dir>
"""
import sys, os
from PIL import Image
from collections import Counter

def block(im):
    w, h = im.size; px = im.load(); runs = Counter()
    for y in range(0, h, max(1, h // 80)):
        run = 1
        for x in range(1, w):
            a = px[x, y]; b = px[x - 1, y]
            if all(abs(a[i] - b[i]) < 18 for i in range(4)): run += 1
            else:
                if 3 <= run <= 14: runs[run] += 1
                run = 1
    cands = [r for r, _ in runs.most_common(3)]
    return max(4, min(10, max(cands) if cands else 8))

def magenta(c):
    return c[3] > 0 and c[2] > 150 and c[1] < 115 and c[2] - c[1] > 70 and c[0] > 110

src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.endswith(".png") or f in ("bg-grotto.png", "cover.png", "favicon.png", "og.png"): continue
    im = Image.open(os.path.join(src, f)).convert("RGBA"); w, h = im.size
    b = 8 if (w, h) in ((586, 478), (739, 777)) else 5 if f == "logo.png" else block(im)
    lw, lh = max(1, round(w / b)), max(1, round(h / b))
    lo = im.resize((lw, lh), Image.NEAREST, reducing_gap=None)
    a = lo.getchannel("A").point(lambda v: 255 if v >= 160 else 0)
    colours = 16 if f == "logo.png" else 20
    rgb = lo.convert("RGB").quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    rgb.putalpha(a)
    px = rgb.load(); W, H = rgb.size
    for y in range(H):
        for x in range(W):
            if not magenta(px[x, y]): continue
            best = None
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if not (dx or dy): continue
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H:
                        n = px[nx, ny]
                        if n[3] > 0 and not magenta(n):
                            lum = 0.299 * n[0] + 0.587 * n[1] + 0.114 * n[2]
                            if best is None or lum < best[0]: best = (lum, n)
            px[x, y] = best[1] if best else (0, 0, 0, 0)
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0: continue
            n = sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx or dy) and 0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] > 0)
            if n <= 1: px[x, y] = (0, 0, 0, 0)
    rgb.resize((lw * b, lh * b), Image.NEAREST).save(os.path.join(dst, f))
    print(f, (w, h), "block", b, "->", (lw, lh))
