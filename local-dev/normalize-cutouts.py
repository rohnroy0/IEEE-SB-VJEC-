"""Normalise every cutout to identical framing.

The hero scales each portrait into the same box, but because the source photos
were cropped to their own tight bounding box, a head-and-shoulders shot renders a
huge face while a full-length shot renders a tiny one — and they sit at different
heights. So each person is re-framed using their detected face: same canvas, same
face size, same face position for everyone. Only then does the CSS sizing behave
predictably across desktop and mobile.

Also re-applies the white outline, sized against the fixed canvas this time, so
the rendered thickness no longer varies with crop.
"""
import json
import math
import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PNG = os.path.join(ROOT, 'cutouts')
WEBP = os.path.join(ROOT, 'public-site', 'public', 'cutouts')
CASCADE = os.path.join(HERE, 'cascades', 'haarcascade_frontalface_default.xml')

# One canvas for everyone (3:4). The portrait is placed so the face always lands
# at the same spot and the same size.
CANVAS_W, CANVAS_H = 900, 1200
FACE_H_FRACTION = 0.20   # face height as a share of canvas height
FACE_TOP_FRACTION = 0.13 # distance from canvas top to the top of the face
OUTLINE_PX = 13          # fixed canvas, so a fixed px is a fixed thickness

# Used when the detector finds nothing. The head is at the very top of the
# subject, so take the width of the topmost band — but robustly, using a high
# percentile of row widths rather than the maximum, so a shoulder that creeps
# into the band does not inflate the estimate.
def head_box_from_alpha(alpha):
    ys, xs = np.where(alpha > 128)
    if len(xs) == 0:
        return None
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bh = y1 - y0
    band = alpha[y0:y0 + max(4, int(bh * 0.10)), :]
    widths = []
    for row in band:
        cols = np.where(row > 128)[0]
        if len(cols):
            widths.append(cols.max() - cols.min())
    if not widths:
        return None
    head_w = float(np.percentile(widths, 75))
    head_x = (x0 + x1) / 2.0 - head_w / 2.0
    face_h = head_w * 1.10          # head band is a little taller than the face
    return head_x, y0, head_w, face_h


def detect_face(rgba):
    """Return (x, y, w, h) of the face, or None.

    The cascade happily reports sunglasses, logos and shirt patterns as faces, so
    every candidate is checked against where the head actually is: the top of the
    subject's alpha bounding box is the top of the hair, so a real face sits near
    the top of that box and roughly centred on it.
    """
    rgb = np.array(rgba.convert('RGB'))
    alpha = np.array(rgba.getchannel('A'))
    grey_bg = np.full(rgb.shape[:2], 128, np.uint8)
    mask = (alpha > 128).astype(bool)
    comp = np.where(mask[..., None], rgb, grey_bg[..., None]).astype(np.uint8)

    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = bx1 - bx0, by1 - by0
    # Region a real face can occupy: upper half of the subject, inboard of the edges.
    fx0, fx1 = bx0 + bw * 0.15, bx1 - bw * 0.15
    fy0, fy1 = by0, by0 + bh * 0.50

    det = cv2.CascadeClassifier(CASCADE)
    # (strict, loose) detection passes — the loose one rescues portraits the
    # cascade misses, e.g. sunglasses or a side-on face.
    passes = ((1.06, 5), (1.03, 3))

    def scan(min_neighbors):
        best = None
        best_area = 0
        for scale in (1.0, 0.6, 0.4):
            img = comp if scale == 1.0 else cv2.resize(comp, None, fx=scale, fy=scale,
                                                        interpolation=cv2.INTER_AREA)
            found = det.detectMultiScale(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY),
                                         scaleFactor=1.06, minNeighbors=min_neighbors,
                                         minSize=(int(50 * scale), int(50 * scale)))
            for (x, y, w, h) in found:
                cx, cy = (x + w / 2) / scale, (y + h / 2) / scale
                ww, hh = w / scale, h / scale
                if not (fx0 <= cx <= fx1 and fy0 <= cy <= fy1):
                    continue                               # not in the head region
                if hh < bh * 0.05 or hh > bh * 0.55:
                    continue                               # implausibly sized
                area = ww * hh
                if area > best_area:
                    best_area = area
                    best = (x / scale, y / scale, ww, hh)
        return best

    for _, min_neighbors in passes:
        found = scan(min_neighbors)
        if found:
            return found
    return None


os.makedirs(WEBP, exist_ok=True)

# Faces the cascade cannot find (sunglasses, side-on pose) are pinned by hand.
# Coordinates are in the clean cutout's pixel space from finalize-cutouts.py.
OVERRIDES = {
    'aswin': (1120, 700, 640, 680),   # profile: temple to nose, forehead to chin
}

only = set(sys.argv[1:])
report = []

for member in json.load(open(os.path.join(HERE, 'data', 'members.clean.json'))):
    slug = member['slug']
    if only and slug not in only:
        continue
    src = os.path.join(PNG, f'{slug}.png')
    if not os.path.exists(src):
        print(f'  MISSING {slug}')
        continue

    original = Image.open(src).convert('RGBA')
    if original.size == (CANVAS_W, CANVAS_H):
        print(f'  SKIP {slug}: already normalised — re-run finalize-cutouts.py first')
        continue
    # The stored cutout is clean; detect on the subject.
    face = detect_face(original)
    method = 'face'
    if face is None:
        box = head_box_from_alpha(np.array(original.getchannel('A')))
        if box is None:
            print(f'  SKIP {slug} (no subject)')
            continue
        face = box
        method = 'head-estimate'

    if slug in OVERRIDES:
        face = OVERRIDES[slug]
        method = 'manual'
    fx, fy, fw, fh = face
    face_scale = (FACE_H_FRACTION * CANVAS_H) / fh

    # A photo that is already a tight headshot would render as a tiny figure if we
    # only matched face size, and a full-length one would render as an enormous
    # head if we only matched body height. Geometric-mean the two so everyone is
    # both present and reasonably matched.
    ys, xs = np.where(np.array(original.getchannel('A')) > 128)
    subject_h = float(ys.max() - ys.min())
    subject_w = float(xs.max() - xs.min())
    height_scale = (0.94 * CANVAS_H) / subject_h
    scale = math.sqrt(face_scale * height_scale)
    # Only clamp sideways. A little shoulder bleed at the edges reads fine, and
    # clamping vertically is what used to shave the head off tall subjects.
    scale = min(scale, (CANVAS_W * 1.15) / subject_w)

    # Anchor on the FACE, not the feet. Every face then lands at the same size and
    # the same height, and the body simply runs off the bottom of the canvas,
    # where the rising banner covers it. Anchoring on the bottom instead is what
    # cropped heads off the top whenever the figure was taller than the canvas.
    px = CANVAS_W / 2 - (fx + fw / 2) * scale
    py = FACE_TOP_FRACTION * CANVAS_H - fy * scale

    resized = original.resize((max(1, round(original.width * scale)),
                               max(1, round(original.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    canvas.paste(resized, (round(px), round(py)), resized)

    matte = canvas.getchannel('A')
    ring = Image.new('RGBA', canvas.size, (255, 255, 255, 0))
    ring.putalpha(matte.filter(ImageFilter.MaxFilter(2 * OUTLINE_PX + 1)))
    final = Image.alpha_composite(ring, canvas)

    final.save(src, 'PNG', optimize=True)
    final.save(os.path.join(WEBP, f'{slug}.webp'), 'WEBP', quality=88, method=4)

    report.append((slug, method, fw))
    print(f'  {slug:24} face via {method:12} face {fw:5.0f}px  scale x{scale:.2f}', flush=True)

print('\n=== summary ===')
by_face = [r for r in report if r[1] == 'face']
by_head = [r for r in report if r[1] != 'face']
print(f'  face-detected: {len(by_face)}   estimated:    {len(by_head)}')
if by_head:
    print('  estimated (check these visually):', ', '.join(r[0] for r in by_head))
print(f'  all canvases: {CANVAS_W}x{CANVAS_H}, outline {OUTLINE_PX}px')
