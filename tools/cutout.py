#!/usr/bin/env python3
"""Isolate an object or figure from a picture and save it as a transparent WebP.

  python3 tools/cutout.py photo  in.jpg out.webp [--crop x0,y0,x1,y1] [--model isnet-general-use]
  python3 tools/cutout.py ink    in.png out.webp [--crop ...] [--margin 6]   # drawings on white paper
  python3 tools/cutout.py rect   in.jpg out.webp [--crop ...]                  # plain crop, no removal

photo : AI segmentation (rembg). pip install rembg onnxruntime
ink   : keeps the drawing plus a thin paper margin, like a scrap cut with scissors
"""
import sys, argparse
import numpy as np
from PIL import Image, ImageFilter
import cv2

def trim(im, pad=4):
    a = np.array(im.split()[-1]); ys, xs = np.where(a > 8)
    if not len(xs): return im
    return im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, im.width), min(ys.max() + pad + 1, im.height)))

def photo(im, model="u2net"):
    from rembg import remove, new_session
    out = remove(im, session=new_session(model), alpha_matting=False, post_process_mask=True)
    return out

def ink(im, margin=6, thresh=22):
    rgb = np.array(im.convert("RGB")).astype(np.int16)
    edge = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3), rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
    bg = np.median(edge, axis=0)                      # paper colour, read from the border
    diff = np.abs(rgb - bg).max(axis=2)
    ink_mask = (diff > thresh).astype(np.uint8) * 255
    k = max(3, int(margin) * 2 + 1)
    # close gaps so a drawn outline becomes one solid shape, then add the paper margin
    close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k * 3 // 2 | 1, k * 3 // 2 | 1))
    m = cv2.morphologyEx(ink_mask, cv2.MORPH_CLOSE, close)
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    # fill pockets that are not connected to the outside and are small
    inv = 255 - m
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 8)
    h, w = m.shape
    for i in range(1, n):
        x, y, bw, bh, area = st[i]
        touches = x == 0 or y == 0 or x + bw >= w or y + bh >= h
        if not touches and area < 0.04 * w * h: m[lab == i] = 255
    # drop specks
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    for i in range(1, n):
        if st[i][4] < 0.0004 * w * h: m[lab == i] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n > 2:
        big = st[1:, 4].max()
        for i in range(1, n):
            if st[i][4] < 0.03 * big: m[lab == i] = 0
    m = cv2.GaussianBlur(m, (0, 0), 1.1)
    out = im.convert("RGBA"); out.putalpha(Image.fromarray(m))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode"); ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--crop"); ap.add_argument("--model", default="u2net")
    ap.add_argument("--margin", type=int, default=6); ap.add_argument("--thresh", type=int, default=22); ap.add_argument("--max", type=int, default=1200)
    a = ap.parse_args()
    im = Image.open(a.src).convert("RGB")
    if a.crop:
        x0, y0, x1, y1 = [float(v) for v in a.crop.split(",")]
        if x1 <= 1 and y1 <= 1: x0, x1, y0, y1 = x0 * im.width, x1 * im.width, y0 * im.height, y1 * im.height
        im = im.crop((int(x0), int(y0), int(x1), int(y1)))
    if im.width > a.max * 1.6 or im.height > a.max * 1.6:
        im.thumbnail((a.max * 2, a.max * 2), Image.LANCZOS)
    out = {"photo": lambda: photo(im, a.model), "ink": lambda: ink(im, a.margin, a.thresh), "rect": lambda: im.convert("RGBA")}[a.mode]()
    out = trim(out) if a.mode != "rect" else out
    out.thumbnail((a.max, a.max), Image.LANCZOS)
    out.save(a.dst, "WEBP", quality=90, method=5, exact=True)
    print(a.dst, out.size)

if __name__ == "__main__": main()
