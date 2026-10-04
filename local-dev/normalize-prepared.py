"""Normalise already-cut portraits onto the same 900x1200 canvas.

The three newer photos arrive as transparent PNGs with the white outline already
baked in, so there is no background to remove and re-running rembg would only
risk damaging them. Each is cropped to a portrait aspect first - centred on the
face where one is detectable, otherwise the middle - and only then scaled, so a
square-ish source fills the canvas instead of being capped by its width and
rendering small.
"""
import json
import os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = os.path.join(ROOT, 'public-site', 'public', 'cutouts')
MASTERS = os.path.join(ROOT, 'cutouts')
CASCADE = os.path.join(ROOT, 'local-dev', 'cascades',
                       'haarcascade_frontalface_default.xml')

CANVAS_W, CANVAS_H = 900, 1200
TARGET_H = 1090          # the height most of the generated set lands on
BOTTOM_MARGIN = 24
PORTRAIT_AR = CANVAS_W / CANVAS_H   # 0.75

MAP = json.load(open(os.path.join(ROOT, 'local-dev', 'portrait-map.json')))
DET = cv2.CascadeClassifier(CASCADE)

sources = {
    'vaishnavi-sasi': 'vaishnavi.png',
    'rohn-roy': 'rohan.png',
    'abhinav-r': 'abhinav.png',
}


def crop_to_portrait(subject):
    """Trim the sides down to a 3:4 frame, keeping the face horizontally centred."""
    w, h = subject.size
    if w / h <= PORTRAIT_AR:
        return subject, 'already portrait'
    keep = int(round(h * PORTRAIT_AR))
    grey = cv2.cvtColor(np.array(subject.convert('RGB')), cv2.COLOR_RGB2GRAY)
    faces = DET.detectMultiScale(grey, scaleFactor=1.05, minNeighbors=5, minSize=(40, 40))
    if len(faces):
        fx = max(faces, key=lambda b: b[2] * b[3])
        centre, how = fx[0] + fx[2] / 2, 'face'
    else:
        centre, how = w / 2, 'centre'
    left = max(0, min(int(round(centre - keep / 2)), w - keep))
    return subject.crop((left, 0, left + keep, h)), how


for slug, filename in sources.items():
    im = Image.open(os.path.join(MASTERS, filename)).convert('RGBA')
    subject = im.crop(im.getchannel('A').getbbox())

    subject, how = crop_to_portrait(subject)
    w, h = subject.size

    scale = min(TARGET_H / h, (CANVAS_W - 24) / w)
    scaled = subject.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

    canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    x = (CANVAS_W - scaled.width) // 2
    y = max(0, CANVAS_H - BOTTOM_MARGIN - scaled.height)
    canvas.paste(scaled, (x, y), scaled)

    out = MAP[slug]
    canvas.save(os.path.join(PNG, f'{out}.webp'), 'WEBP', quality=88, method=4)
    canvas.save(os.path.join(MASTERS, f'{out}.png'), 'PNG', optimize=True)

    bb = canvas.getchannel('A').getbbox()
    print(f'  {slug:18} crop={how:15} content {bb[2]-bb[0]}x{bb[3]-bb[1]}  top={bb[1]}')
