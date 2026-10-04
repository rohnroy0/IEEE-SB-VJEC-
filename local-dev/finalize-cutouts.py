"""Final pass: rebuild every cutout with a visually uniform white outline.

The hero scales every portrait to the same display height, so an outline baked in
at a fixed pixel size looks thicker on a tightly-cropped image. Sizing the outline
against the final (cropped) height makes the on-screen thickness equal for all.
"""
import os
import sys
import json
from PIL import Image, ImageFilter
from rembg import remove, new_session

SRC = "D:/CSE/Projects/Group/ppt_faultx/images"
PNG = "D:/CSE/Projects/Group/ppt_faultx/cutouts"
WEBP = "D:/CSE/Projects/Group/ppt_faultx/public-site/public/cutouts"

WORK_EDGE = 1600
DISPLAY_H = 752      # ~94% of the hero height on a desktop viewport
TARGET_PX = 6.5      # desired on-screen outline thickness
WEBP_EDGE = 1400

FILES = {
    "abdul-basith-p-v":  ("abdul basith.jpeg", 1.0),
    "adarsh-k-biju":     ("iii - Adarsh K Biju.jpeg", 1.0),
    "ajith-mathew":      ("ajith mathew.jpeg", 1.0),
    "alan-antony":       ("edf0d4fc-5f16-49d2-b456-290b0a01ffa5 - Alan Antony.jpeg", 0.42),
    "aswin":             ("Aswin.jpg", 1.0),
    "elsitta-binu":      ("IMG_20260813_134316 - Elsitta Binu.jpg", 1.0),
    "leo-mathew-roy":    ("1000324473-03 - Leo Mathew Roy.jpeg", 1.0),
    "milan-biju":        ("ARUN2772(1) - Milan Biju.jpg", 1.0),
    "samanway-t-k":      ("1000170496-removebg-preview - samanway Tk.jpg", 1.0),
    "sandra-nambiar":    ("IMG_20260924_234535 - Sandra Nambiar.jpg", 1.0),
    "sanju-santy":       ("IMG-20260814-WA0003 - Sanju Santy.jpg", 1.0),
    "shiva-keshav-v":    ("shiva keshav.jpeg", 1.0),
    "simon-joseph":      ("IMG-20260930-WA0058 - Simon Joseph.jpg", 1.0),
    "tessa-mariya":      ("IMG-20260925-WA0002 - TESSA MARIYA.jpg", 1.0),
    "abhin-k-shibu-james": ("IMG-20260221-WA0013 - Abhin K Shibu.jpg", 1.0),
    "abhiram-m-s":       ("IMG_4749 - Abhiram M S.JPG", 1.0),
}

MODELS = {"tessa-mariya": "u2net_human_seg",
           "shiva-keshav-v": "u2net_human_seg",
           "ajith-mathew": "u2net_human_seg"}

os.makedirs(WEBP, exist_ok=True)
sessions = {}
rows = []

only = set(sys.argv[1:])

for slug, (filename, keep) in FILES.items():
    if only and slug not in only:
        continue
    path = os.path.join(SRC, filename)
    model = MODELS.get(slug, "u2net")
    if model not in sessions:
        sessions[model] = new_session(model)

    full = Image.open(path).convert("RGB")
    w, h = full.size
    s = min(1.0, WORK_EDGE / max(w, h))
    small = full.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    matte = remove(small, session=sessions[model]).getchannel("A")
    if (w, h) != matte.size:
        matte = matte.resize((w, h), Image.LANCZOS)

    rgba = full.convert("RGBA")
    rgba.putalpha(matte)                                  # matte is the alpha

    if keep < 1.0:                                        # crop before outlining
        rgba = rgba.crop((0, 0, w, int(h * keep)))
        matte = matte.crop((0, 0, w, int(h * keep)))
        box = rgba.getchannel("A").getbbox()
        if box:
            rgba, matte = rgba.crop(box), matte.crop(box)

    # No outline here. normalize-cutouts.py owns framing AND the single outline;
    # adding one in both steps produced a doubled border.
    cut = rgba
    box = cut.getchannel("A").getbbox()
    if box:
        cut = cut.crop(box)

    cut.save(os.path.join(PNG, f"{slug}.png"), "PNG", optimize=True)
    rows.append((slug, cut.size))
    print(f"  {slug:24} {cut.size[0]:5}x{cut.height:<5} clean cutout, no outline", flush=True)

print("\n=== next step ===")
print("  python3 normalize-cutouts.py   # frames every face identically, adds the single outline")
