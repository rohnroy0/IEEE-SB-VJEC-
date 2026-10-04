"""Generates a shareable link and a print-ready QR code for each committee member.

Routes are hash-based (#/profile/<slug>) because /profile/<slug> is a client-side
route with no file behind it, so a static host answers 404.
"""
import csv
import json
import os
import qrcode
from qrcode.constants import ERROR_CORRECT_M

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'qr-codes')

# The canonical public domain used across the site's canonical tags and sitemap.
BASE = 'https://ieeesbvjec.in/badge-profiles/index.html#/profile/'

members = json.load(open(os.path.join(HERE, 'data', 'members.clean.json')))
os.makedirs(OUT, exist_ok=True)

rows = []
for m in members:
    url = BASE + m['slug']
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,   # survives a badge being scuffed or dirty
        box_size=16,
        border=4,                          # quiet zone the spec requires
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    path = os.path.join(OUT, f"{m['slug']}.png")
    img.save(path, 'PNG', dpi=(600, 600))   # print resolution

    rows.append({
        'Name': m['name'].title(),
        'Role': m['designation'],
        'Slug': m['slug'],
        'Link': url,
        'QR file': f"qr-codes/{m['slug']}.png",
    })
    print(f"  {m['slug']:22} {img.size[0]:5}px  {url}")

with open(os.path.join(OUT, 'committee-links.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0]))
    w.writeheader()
    w.writerows(rows)

print(f"\n{len(rows)} QR codes -> {OUT}")
