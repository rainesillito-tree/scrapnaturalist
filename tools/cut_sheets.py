#!/usr/bin/env python3
"""Split a sticker/specimen sheet into individual transparent cut-outs.

  python3 tools/cut_sheets.py <sheet-key> <in.img> <outdir>     (configs below)

Items on a plain ground are separated by colour difference from the paper,
joined into one shape (closing), and split by connected components.
Photographic/painted figures on busy grounds use rembg(u2netp) on a hand-set crop.
"""
import sys, os, json
import numpy as np, cv2
from PIL import Image

def load(path):
    im = Image.open(path)
    if im.mode == "RGBA":
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg
    return im.convert("RGB")

def ellipse(k): k = max(3, int(k) | 1); return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))

def fill_small_holes(m, frac):
    inv = (m == 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 4)
    h, w = m.shape
    total = h * w
    for i in range(1, n):
        x, y, bw, bh, a = st[i]
        if x == 0 or y == 0 or x + bw >= w or y + bh >= h: continue
        if a <= frac * total: m[lab == i] = 255
    return m

def split(im, thresh=14, close=15, merge=25, fill=0.03, min_area=0.0015, drop_border=False,
          region=None, bg=None, soft=1.0, pad=6, min_side=40, erode=0):
    """returns list of RGBA images sorted row-major"""
    if region: im = im.crop(region)
    rgb = np.array(im).astype(np.int16)
    h, w = rgb.shape[:2]
    if bg is None:
        e = np.concatenate([rgb[:5].reshape(-1, 3), rgb[-5:].reshape(-1, 3), rgb[:, :5].reshape(-1, 3), rgb[:, -5:].reshape(-1, 3)])
        bg = np.median(e, axis=0)
    diff = np.abs(rgb - np.array(bg)).max(axis=2)
    m = (diff > thresh).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ellipse(close))
    m = fill_small_holes(m, fill)
    if erode: m = cv2.erode(m, ellipse(erode))
    # group by dilated components
    dil = cv2.dilate(m, ellipse(merge))
    n, lab, st, _ = cv2.connectedComponentsWithStats(dil, 8)
    out = []
    for i in range(1, n):
        x, y, bw, bh, a = st[i]
        comp = ((lab == i) & (m > 0)).astype(np.uint8) * 255
        area = int((comp > 0).sum())
        if area < min_area * w * h or min(bw, bh) < min_side: continue
        if drop_border and (x <= 2 or y <= 2 or x + bw >= w - 2 or y + bh >= h - 2): continue
        ys, xs = np.where(comp > 0)
        x0, x1, y0, y1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, w), max(ys.min() - pad, 0), min(ys.max() + pad + 1, h)
        a_ = cv2.GaussianBlur(comp[y0:y1, x0:x1], (0, 0), soft)
        # slight erode so the paper ground does not rim the edge
        piece = np.array(im)[y0:y1, x0:x1]
        rgba = np.dstack([piece, a_])
        out.append(((y0 + y1) // 2, (x0 + x1) // 2, y0, x0, Image.fromarray(rgba, "RGBA")))
    # row-major ordering: bucket rows by centre y
    out.sort(key=lambda t: t[2])
    rows, cur = [], []
    for t in out:
        if cur and t[2] - cur[0][2] > 0.55 * max(t[4].height, cur[0][4].height): rows.append(cur); cur = []
        cur.append(t)
    if cur: rows.append(cur)
    res = []
    for r in rows: res += [t[4] for t in sorted(r, key=lambda t: t[3])]
    return res

def rembg_crop(im, box, model="u2netp"):
    from rembg import remove, new_session
    c = im.crop(box)
    r = remove(c, session=new_session(model), post_process_mask=True)
    a = np.array(r.split()[-1]); ys, xs = np.where(a > 10)
    return r.crop((max(xs.min() - 4, 0), max(ys.min() - 4, 0), min(xs.max() + 5, r.width), min(ys.max() + 5, r.height)))

def save(items, outdir, prefix, maxside=900):
    os.makedirs(outdir, exist_ok=True)
    meta = []
    for i, p in enumerate(items, 1):
        if max(p.size) > maxside:
            s = maxside / max(p.size); p = p.resize((round(p.width * s), round(p.height * s)), Image.LANCZOS)
        name = "%s-%02d.webp" % (prefix, i)
        p.save(os.path.join(outdir, name), "WEBP", quality=86, method=6)
        meta.append({"file": name, "w": p.width, "h": p.height})
    return meta

def contact(items, path, cols=6, cell=240):
    rows = (len(items) + cols - 1) // cols
    sh = Image.new("RGB", (cols * cell, rows * cell), (96, 112, 122))
    from PIL import ImageDraw
    d = ImageDraw.Draw(sh)
    for i, p in enumerate(items):
        t = p.copy(); t.thumbnail((cell - 16, cell - 30))
        x, y = (i % cols) * cell, (i // cols) * cell
        sh.paste(t, (x + (cell - t.width) // 2, y + 22 + (cell - 30 - t.height) // 2), t)
        d.text((x + 6, y + 4), str(i + 1), fill=(255, 255, 80))
    sh.save(path)
