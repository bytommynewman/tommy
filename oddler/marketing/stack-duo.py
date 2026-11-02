"""Stack the two duo phones top and bottom so the pair fills a vertical frame.

Side by side, two phone panels can only ever use the middle third of a 9:16
ad. Stacked they use nearly all of it and each panel renders wider.
"""
from PIL import Image
import glob, os, re, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(KIT, "frames-duo2")
OUT = os.path.join(KIT, "frames-duo-stacked")
os.makedirs(OUT, exist_ok=True)

W, H = 2160, 3840
BG = (0x1a, 0x0f, 0x26)
GAP = 28
TOP = 40
EACH_H = (3400 - TOP - GAP) // 2

files = [f for f in os.listdir(SRC) if f.endswith(".png")]
# One scale for every beat, taken from the tallest panel in the set: the layout
# must not jump between cuts, and nothing may be cropped — the avatars at the
# foot of each panel are the bit that shows both players.
tallest = max(Image.open(os.path.join(SRC, f)).height for f in files)
SCALE = EACH_H / tallest

def place(canvas, img, y):
    img = img.resize((round(img.width * SCALE), round(img.height * SCALE)), Image.LANCZOS)
    canvas.paste(img, ((W - img.width) // 2, y + (EACH_H - img.height) // 2))

beats = sorted({re.sub(r"-(host|guest)\.png$", "", f) for f in files})
for b in beats:
    host = os.path.join(SRC, b + "-host.png")
    guest = os.path.join(SRC, b + "-guest.png")
    if not (os.path.exists(host) and os.path.exists(guest)):
        continue
    canvas = Image.new("RGB", (W, H), BG)
    place(canvas, Image.open(host).convert("RGB"), TOP)
    place(canvas, Image.open(guest).convert("RGB"), TOP + EACH_H + GAP)
    canvas.save(os.path.join(OUT, b + ".png"))
    print("stacked", b)
