#!/usr/bin/env python3
"""Full sheets of procedural paper to cut from (images/sheet-*.jpg) + tools/sheets_archive_lines.txt"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np, cv2
import make_marks as M
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), "..", "images")
W, H = 900, 1200
sheets = [
 ("sheet-cream", "Cream Laid Sheet", (238, 228, 205), dict(fibre=9), ["paper","cream","blank"]),
 ("sheet-kraft", "Kraft Sheet", (178, 140, 98), dict(fibre=14, grain=9), ["paper","kraft","brown"]),
 ("sheet-tea", "Tea-Stained Sheet", (226, 205, 165), dict(fibre=10, stain=True), ["paper","stained","tea"]),
 ("sheet-ledger", "Green Ledger Sheet", (222, 226, 205), dict(grid=((150,170,140),40)), ["paper","ledger","grid"]),
 ("sheet-ruled", "Ruled Notebook Sheet", (240, 236, 222), dict(lines=((190,170,150),34,60)), ["paper","ruled","notebook"]),
 ("sheet-blue", "Blue Sugar Paper", (110, 138, 168), dict(fibre=12, grain=8), ["paper","blue","sugar"]),
 ("sheet-rose", "Dusty Rose Sheet", (214, 170, 165), dict(fibre=9), ["paper","pink","rose"]),
 ("sheet-news", "Grey Newsprint Blank", (200, 198, 188), dict(fibre=12, grain=8, stain=True), ["paper","newsprint","grey"]),
 ("sheet-sage", "Sage Tissue Sheet", (178, 190, 160), dict(fibre=7), ["paper","green","sage"]),
 ("sheet-black", "Black Card Sheet", (36, 34, 33), dict(fibre=6, grain=5), ["paper","black","card"]),
]
lines = []
for i, (n, t, base, kw, tags) in enumerate(sheets):
    r = M.rng_(500 + i)
    kw = dict(kw)
    for k in ("lines", "grid"):
        if k in kw: col, g, *o = (kw[k][0], kw[k][1], *(kw[k][2:])); kw[k] = (col, g * M.S, *[x * M.S for x in o]) if k == "lines" else (col, g * M.S)
    img = M.paper_tex(W * M.S, H * M.S, base, r, **kw)
    img = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
    Image.fromarray(img.astype(np.uint8)).save(os.path.join(OUT, n + ".jpg"), quality=85)
    lines.append('    { id:"%s", category:"ephemera", title:"%s", image:"images/%s.jpg", w:%d, h:%d, tags:%s },' % (n, t, n, W, H, str(tags).replace("'", '"')))
open(os.path.join(os.path.dirname(__file__), "sheets_archive_lines.txt"), "w").write("\n".join(lines) + "\n")
