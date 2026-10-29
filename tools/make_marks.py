#!/usr/bin/env python3
"""Procedural PAPER & MARKS: torn paper scraps and hand-made marks (ink, graphite, charcoal, brush, stains).
Everything is generated here (numpy/OpenCV/Pillow); nothing is taken from elsewhere.
  python3 tools/make_marks.py  -> images/cutouts/pm-*.webp + tools/marks_archive_lines.txt"""
import os, json, math
import numpy as np, cv2
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), "..", "images", "cutouts")
S = 2  # supersample

def rng_(seed): return np.random.default_rng(seed)

def smooth_noise(h, w, scale, r):
    n = r.random((max(2, h // scale + 2), max(2, w // scale + 2))).astype(np.float32)
    return cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)

def torn_mask(w, h, r, edges="tbrl", rough=7, margin=26):
    """irregular torn rectangle: straight-ish edges where not torn."""
    m = np.zeros((h, w), np.uint8)
    pts = []
    def edge(p0, p1, torn):
        n = max(8, int(math.dist(p0, p1) / 9))
        out = []
        off = 0.0
        for i in range(n):
            t = i / n
            x = p0[0] + (p1[0] - p0[0]) * t; y = p0[1] + (p1[1] - p0[1]) * t
            if torn:
                off += r.normal(0, rough * .45); off *= .86
                nx, ny = -(p1[1] - p0[1]), (p1[0] - p0[0]); L = math.hypot(nx, ny)
                x += nx / L * off; y += ny / L * off
            out.append((x, y))
        return out
    a, b, c, d = (margin, margin), (w - margin, margin), (w - margin, h - margin), (margin, h - margin)
    pts += edge(a, b, "t" in edges) + edge(b, c, "r" in edges) + edge(c, d, "b" in edges) + edge(d, a, "l" in edges)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return m

def paper_tex(w, h, base, r, fibre=10, grain=6, lines=None, grid=None, stain=False):
    img = np.ones((h, w, 3), np.float32) * np.array(base, np.float32)
    n = smooth_noise(h, w, 90, r) - .5; img += n[..., None] * 14
    n2 = smooth_noise(h, w, 6, r) - .5; img += n2[..., None] * grain
    f = r.normal(0, 1, (h, w)).astype(np.float32); f = cv2.GaussianBlur(f, (0, 0), .8)
    k = np.zeros((9, 9), np.float32); k[4, :] = 1; k /= 9
    fl = cv2.filter2D(f, -1, k); img += fl[..., None] * fibre
    if stain:
        for _ in range(3):
            cx, cy, rad = r.integers(w // 6, w * 5 // 6), r.integers(h // 6, h * 5 // 6), r.integers(w // 8, w // 3)
            yy, xx = np.ogrid[:h, :w]; d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rad
            img -= (np.exp(-d ** 2) * 16)[..., None] * np.array([.5, .9, 1.6], np.float32)
    if lines:
        col, gap, off = lines
        for y in range(off, h, gap): cv2.line(img, (0, y), (w, y), col, max(1, S), cv2.LINE_AA)
    if grid:
        col, gap = grid
        for y in range(gap // 2, h, gap): cv2.line(img, (0, y), (w, y), col, max(1, S), cv2.LINE_AA)
        for x in range(gap // 2, w, gap): cv2.line(img, (x, 0), (x, h), col, max(1, S), cv2.LINE_AA)
    return np.clip(img, 0, 255)

def finish(img, mask, r, fringe=True):
    """add pale torn fibre edge + soft alpha"""
    a = mask.astype(np.float32) / 255
    if fringe:
        er = cv2.erode(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9 * S // 2 * 2 + 1,) * 2))
        rim = (mask.astype(np.float32) - er.astype(np.float32)) / 255
        rim = cv2.GaussianBlur(rim, (0, 0), 1.2 * S) * (smooth_noise(*mask.shape, 5, r) * .7 + .5)
        img = img * (1 - rim[..., None] * .75) + 244 * rim[..., None] * .75
    a = cv2.GaussianBlur(a, (0, 0), .9)
    return np.dstack([np.clip(img, 0, 255), a * 255]).astype(np.uint8)

def crop_save(rgba, name, maxside=760):
    im = Image.fromarray(rgba, "RGBA"); bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop((max(0, bb[0] - 3), max(0, bb[1] - 3), min(im.width, bb[2] + 3), min(im.height, bb[3] + 3)))
    s = min(1, maxside / max(im.size) , 1.0)
    f = 1 / S
    im = im.resize((max(1, round(im.width * f * 1)), max(1, round(im.height * f * 1))), Image.LANCZOS)
    im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=88, method=6)
    return im.width, im.height

# ---------------- paper scraps ----------------
def scrap(name, w, h, base, seed, edges="tbrl", lines=None, grid=None, stain=False, rot=0, rough=7, extra=None):
    r = rng_(seed); W, H = w * S, h * S
    m = torn_mask(W, H, r, edges, rough * S)
    img = paper_tex(W, H, base, r, lines=lines and (lines[0], lines[1] * S, lines[2] * S), grid=grid and (grid[0], grid[1] * S), stain=stain)
    if extra: img = extra(img, r, W, H)
    rgba = finish(img, m, r)
    if rot:
        c = (W / 2, H / 2); M = cv2.getRotationMatrix2D(c, rot, 1)
        d = int(math.hypot(W, H)); rgba = cv2.copyMakeBorder(rgba, (d - H) // 2, (d - H) // 2, (d - W) // 2, (d - W) // 2, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0))
        M = cv2.getRotationMatrix2D((rgba.shape[1] / 2, rgba.shape[0] / 2), rot, 1)
        rgba = cv2.warpAffine(rgba, M, (rgba.shape[1], rgba.shape[0]), flags=cv2.INTER_CUBIC, borderValue=(0, 0, 0, 0))
    return rgba

def hole_punch(img, r, W, H):
    for y in (H * 0.25, H * 0.75):
        cv2.circle(img, (int(W * .07), int(y)), 14 * S, (255, 255, 255), -1, cv2.LINE_AA)
    return img
def margin_rule(img, r, W, H):
    cv2.line(img, (int(W * .14), 0), (int(W * .14), H), (190, 120, 120), S, cv2.LINE_AA); return img
def fold_crease(img, r, W, H):
    y = int(H * .5); img[y - 2:y + 2] *= .93; img[y + 2:y + 6] *= 1.03; return np.clip(img, 0, 255)
def coffee(img, r, W, H):
    cx, cy, rad = int(W * .62), int(H * .45), int(min(W, H) * .22)
    ov = np.zeros((H, W), np.float32); cv2.circle(ov, (cx, cy), rad, 1, 5 * S, cv2.LINE_AA); ov = cv2.GaussianBlur(ov, (0, 0), 1.6 * S) * (smooth_noise(H, W, 14, r) * .8 + .4)
    img -= ov[..., None] * np.array([40, 70, 110], np.float32) * 1.1; return np.clip(img, 0, 255)

PAPERS = [
 ("cream-torn", 560, 400, (240, 232, 210), 11, "tbrl", None, None, False, -3, None),
 ("kraft-torn", 520, 420, (196, 160, 112), 12, "tbrl", None, None, True, 2, None),
 ("newsprint-strip", 640, 190, (222, 218, 205), 13, "lr", None, None, False, 1.5, None),
 ("graph-blue", 480, 480, (246, 247, 244), 14, "tbrl", None, ((150, 175, 205), 24), False, -4, None),
 ("graph-sage", 520, 360, (232, 236, 220), 15, "br", None, ((140, 165, 130), 20), False, 3, None),
 ("ruled-notebook", 420, 540, (248, 244, 232), 16, "tl", ((160, 185, 210), 30, 70), None, False, -2, margin_rule),
 ("ruled-punched", 400, 520, (250, 246, 236), 17, "r", ((160, 185, 210), 28, 60), None, False, 2, hole_punch),
 ("ledger-red", 560, 380, (236, 226, 196), 18, "tbl", ((190, 130, 125), 26, 40), None, True, 1, margin_rule),
 ("blush-card", 440, 300, (232, 200, 190), 19, "tbrl", None, None, False, -5, None),
 ("slate-card", 460, 320, (74, 84, 92), 20, "tbrl", None, None, False, 4, None),
 ("tea-stained", 520, 420, (232, 210, 160), 21, "tbrl", None, None, True, -2, coffee),
 ("folded-note", 420, 460, (244, 238, 220), 22, "tbrl", None, None, False, 2, fold_crease),
 ("long-ribbon", 700, 120, (240, 232, 212), 23, "lr", None, None, False, -2, None),
 ("corner-scrap", 360, 360, (230, 222, 198), 24, "tbrl", None, None, True, 6, None),
 ("tracing-sheet", 520, 380, (236, 238, 232), 25, "tbrl", None, None, False, -1, None),
 ("ochre-paper", 480, 360, (214, 170, 96), 26, "tbrl", None, None, False, 3, None),
]

# ---------------- marks ----------------
def spline(pts, n=200):
    pts = np.array(pts, np.float32)
    if len(pts) < 4: return pts
    out = []
    P = np.vstack([pts[0], pts, pts[-1]])
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, max(8, n // len(pts)), endpoint=False):
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2]); return np.array(out, np.float32)

def resample(pts, step):
    pts = np.asarray(pts, np.float32)
    seg = np.hypot(*(np.diff(pts, axis=0).T)); cum = np.concatenate([[0], np.cumsum(seg)])
    if cum[-1] < 1e-3: return pts[:1]
    t = np.arange(0, cum[-1], step)
    return np.stack([np.interp(t, cum, pts[:, 0]), np.interp(t, cum, pts[:, 1])], 1)

def stroke(A, pts, width, r, press=True, dry=0.0, jitter=0.0, taper=(.12, .18)):
    pts = resample(spline(pts) if len(pts) >= 4 else pts, max(0.8, width * .12))
    L = len(pts)
    for i, p in enumerate(pts):
        t = i / max(1, L - 1)
        wmul = 1.0
        if press:
            wmul = min(1, t / taper[0] + .25) * min(1, (1 - t) / taper[1] + .2)
            wmul *= .88 + .12 * math.sin(t * 9 + 1.3)
        rad = max(.8, width * .5 * wmul)
        jx, jy = (r.normal(0, jitter), r.normal(0, jitter)) if jitter else (0, 0)
        cv2.circle(A, (int(round(p[0] + jx)), int(round(p[1] + jy))), max(1, int(round(rad))), 1.0, -1, cv2.LINE_AA)

def mark_img(size, color, draw, seed, grain=.25, blur=.7, soften=0):
    r = rng_(seed); W, H = size[0] * S, size[1] * S
    A = np.zeros((H, W), np.float32); draw(A, r, W, H)
    if soften: A = cv2.GaussianBlur(A, (0, 0), soften * S)
    g = smooth_noise(H, W, 3, r) * .6 + smooth_noise(H, W, 11, r) * .4
    A = np.clip(A * (1 - grain + grain * 2 * g), 0, 1); A = cv2.GaussianBlur(A, (0, 0), blur * S / 2)
    img = np.zeros((H, W, 3), np.float32); img[:] = color
    return np.dstack([img, A * 255]).astype(np.uint8)

def d_circle(A, r, W, H):
    cx, cy = W / 2, H / 2; rx, ry = W * .4, H * .4; a0 = r.uniform(0, 6.28); pts = []
    for i in range(0, 118):
        t = a0 + i * 2 * math.pi * 1.12 / 117; k = 1 + 0.07 * (i / 117)
        pts.append((cx + math.cos(t) * rx * k + r.normal(0, 3), cy + math.sin(t) * ry * k + r.normal(0, 3)))
    stroke(A, pts, 9 * S, r, jitter=.6)
def d_underline(A, r, W, H):
    pts = [(W * .05 + W * .9 * i / 7, H * .5 + math.sin(i * 1.3) * H * .12 + r.normal(0, 4)) for i in range(8)]
    stroke(A, pts, 9 * S, r)
    pts2 = [(W * .12 + W * .8 * i / 6, H * .74 + r.normal(0, 4)) for i in range(7)]; stroke(A, pts2, 7 * S, r)
def d_arrow(A, r, W, H):
    pts = [(W * .08, H * .75), (W * .3, H * .4), (W * .55, H * .32), (W * .8, H * .45), (W * .9, H * .6)]
    stroke(A, pts, 8 * S, r)
    stroke(A, [(W * .78, H * .44), (W * .9, H * .6), (W * .7, H * .68)], 8 * S, r, taper=(.2, .3))
def d_x(A, r, W, H):
    stroke(A, [(W * .15, H * .15), (W * .5, H * .5), (W * .85, H * .85)], 12 * S, r)
    stroke(A, [(W * .85, H * .13), (W * .5, H * .5), (W * .14, H * .87)], 12 * S, r)
def d_tally(A, r, W, H):
    for i in range(4):
        x = W * (.2 + .12 * i) + r.normal(0, 3); stroke(A, [(x, H * .2), (x + r.normal(0, 5), H * .5), (x + r.normal(0, 6), H * .82)], 7 * S, r)
    stroke(A, [(W * .1, H * .72), (W * .45, H * .5), (W * .8, H * .25)], 7 * S, r)
def d_hatch(A, r, W, H):
    for i in range(22):
        x = W * (.08 + .84 * i / 21); stroke(A, [(x, H * .12 + r.normal(0, 6)), (x + W * .1, H * .88 + r.normal(0, 6))], 3 * S, r, press=False)
def d_crosshatch(A, r, W, H):
    d_hatch(A, r, W, H)
    for i in range(18):
        y = H * (.1 + .8 * i / 17); stroke(A, [(W * .1, y + r.normal(0, 4)), (W * .9, y + H * .08 + r.normal(0, 4))], 2.5 * S, r, press=False)
def d_scribble(A, r, W, H):
    pts = []; x, y = W * .15, H * .5
    for i in range(34):
        x = W * (.12 + .76 * (i % 2) * .9 + r.normal(0, .05)); y = H * (.15 + .7 * (i / 33) + r.normal(0, .05)); pts.append((x, y))
    stroke(A, pts, 4 * S, r, press=False)
def d_spiral(A, r, W, H):
    pts = []
    for i in range(160):
        t = i * .17; rr = 4 + i * .55 * (W / 500) * S; pts.append((W / 2 + math.cos(t) * rr * 1.05, H / 2 + math.sin(t) * rr))
    stroke(A, pts, 5 * S, r, press=False)
def d_zigzag(A, r, W, H):
    pts = [(W * (.05 + .9 * i / 11), H * (.3 if i % 2 else .7) + r.normal(0, 6)) for i in range(12)]; stroke(A, pts, 7 * S, r)
def d_bracket(A, r, W, H):
    stroke(A, [(W * .62, H * .06), (W * .32, H * .14), (W * .3, H * .5), (W * .36, H * .5)], 8 * S, r)
    stroke(A, [(W * .36, H * .5), (W * .3, H * .5), (W * .3, H * .86), (W * .62, H * .94)], 8 * S, r)
def d_asterisk(A, r, W, H):
    for a in (0, 60, 120):
        t = math.radians(a + r.normal(0, 4)); dx, dy = math.cos(t) * W * .38, math.sin(t) * H * .38
        stroke(A, [(W / 2 - dx, H / 2 - dy), (W / 2 + dx, H / 2 + dy)], 8 * S, r)
def d_brush(A, r, W, H):
    # dry-bristle brush swipe
    for k in range(34):
        yo = (k - 17) * H * .018; stroke(A, [(W * .06, H * .5 + yo + r.normal(0, 3)), (W * .35, H * .46 + yo), (W * .7, H * .52 + yo), (W * .95, H * .48 + yo + r.normal(0, 3))], 6 * S, r, taper=(.04, .3))
def d_brush2(A, r, W, H):
    for k in range(40):
        yo = (k - 20) * H * .017; xe = W * (.93 - r.random() * .25)
        stroke(A, [(W * .05, H * .55 + yo), (W * .4, H * .45 + yo), (xe, H * .5 + yo)], 5.5 * S, r, taper=(.03, .25))
def d_splatter(A, r, W, H):
    cx, cy = W / 2, H / 2
    cv2.circle(A, (int(cx), int(cy)), int(W * .11), 1, -1, cv2.LINE_AA)
    for _ in range(90):
        a = r.uniform(0, 6.28); d = abs(r.normal(0, W * .2)) + W * .07; rad = max(1, int(abs(r.normal(0, 1)) ** 1.6 * 3 * S + S))
        cv2.circle(A, (int(cx + math.cos(a) * d), int(cy + math.sin(a) * d)), rad, 1, -1, cv2.LINE_AA)
    for _ in range(6):
        a = r.uniform(0, 6.28); stroke(A, [(cx, cy), (cx + math.cos(a) * W * .3, cy + math.sin(a) * W * .3)], 5 * S, r, taper=(.01, .8))
def d_ring(A, r, W, H):
    cx, cy, rad = W / 2, H / 2, W * .36
    pts = [(cx + math.cos(t) * rad * (1 + .02 * math.sin(t * 3)), cy + math.sin(t) * rad) for t in np.linspace(0, 6.5, 70)]
    stroke(A, pts, 8 * S, r, press=False, jitter=.5)
    A *= 0.9
def d_dots(A, r, W, H):
    for i in range(14):
        cv2.circle(A, (int(W * (.06 + .88 * i / 13)), int(H * .5 + math.sin(i) * H * .1 + r.normal(0, 3))), int(5 * S + r.integers(0, 3 * S)), 1, -1, cv2.LINE_AA)
def d_heart(A, r, W, H):
    pts = []
    for t in np.linspace(0, 2 * math.pi, 60):
        x = 16 * math.sin(t) ** 3; y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((W / 2 + x * W * .026 + r.normal(0, 1.5), H * .5 + y * H * .026))
    stroke(A, pts, 7 * S, r, press=False)
def d_star5(A, r, W, H):
    pts = [(W / 2 + math.cos(-math.pi / 2 + i * 4 * math.pi / 5) * W * .4 + r.normal(0, 3), H / 2 + math.sin(-math.pi / 2 + i * 4 * math.pi / 5) * H * .4) for i in range(6)]
    stroke(A, [pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]], 7 * S, r, press=False)
def d_check(A, r, W, H):
    stroke(A, [(W * .12, H * .52), (W * .36, H * .8), (W * .88, H * .14)], 14 * S, r)
def d_wave(A, r, W, H):
    pts = [(W * (.04 + .92 * i / 40), H * .5 + math.sin(i * .9) * H * .22) for i in range(41)]; stroke(A, pts, 8 * S, r)

INK, GRA, CHAR, RED, BLUE, SEPIA, WHITE = (24, 22, 26), (74, 76, 80), (34, 32, 30), (150, 38, 34), (36, 58, 100), (92, 58, 34), (244, 240, 228)
MARKS = [
 ("circle-ink", (320, 300), INK, d_circle, 31, .2), ("circle-red", (320, 300), RED, d_circle, 32, .2),
 ("underline-ink", (480, 160), INK, d_underline, 33, .2), ("underline-red", (480, 160), RED, d_underline, 34, .2),
 ("arrow-ink", (420, 280), INK, d_arrow, 35, .2), ("arrow-blue", (420, 280), BLUE, d_arrow, 36, .2),
 ("cross-ink", (260, 260), INK, d_x, 37, .25), ("cross-red", (260, 260), RED, d_x, 38, .25),
 ("tally-graphite", (300, 220), GRA, d_tally, 39, .45), ("hatch-graphite", (360, 300), GRA, d_hatch, 40, .5),
 ("crosshatch-ink", (360, 300), INK, d_crosshatch, 41, .35), ("scribble-graphite", (340, 300), GRA, d_scribble, 42, .5),
 ("spiral-charcoal", (360, 360), CHAR, d_spiral, 43, .55), ("zigzag-ink", (460, 160), INK, d_zigzag, 44, .2),
 ("bracket-ink", (200, 360), INK, d_bracket, 45, .2), ("asterisk-ink", (260, 260), INK, d_asterisk, 46, .2),
 ("brush-black", (620, 190), INK, d_brush, 47, .55), ("brush-red", (620, 190), RED, d_brush2, 48, .55),
 ("brush-white", (620, 190), WHITE, d_brush, 49, .5), ("brush-blue", (620, 190), BLUE, d_brush2, 50, .5),
 ("splatter-ink", (380, 380), INK, d_splatter, 51, .12), ("splatter-sepia", (380, 380), SEPIA, d_splatter, 52, .2),
 ("ring-coffee", (360, 360), SEPIA, d_ring, 53, .45), ("dots-ink", (480, 120), INK, d_dots, 54, .2),
 ("heart-graphite", (300, 280), GRA, d_heart, 55, .45), ("star-red", (300, 300), RED, d_star5, 56, .25),
 ("check-ink", (260, 240), INK, d_check, 57, .25), ("wave-blue", (500, 160), BLUE, d_wave, 58, .25),
]
NICE = {"cream-torn": "Cream Paper, Torn", "kraft-torn": "Kraft Paper, Torn", "newsprint-strip": "Newsprint Strip", "graph-blue": "Graph Paper, Blue", "graph-sage": "Graph Paper, Sage",
 "ruled-notebook": "Notebook Page, Ruled", "ruled-punched": "Notebook Page, Hole-Punched", "ledger-red": "Ledger Page, Red Rules", "blush-card": "Blush Card, Torn", "slate-card": "Slate Card, Torn",
 "tea-stained": "Tea-Stained Scrap", "folded-note": "Folded Note", "long-ribbon": "Paper Ribbon", "corner-scrap": "Corner Scrap", "tracing-sheet": "Tracing Sheet", "ochre-paper": "Ochre Paper, Torn"}
MN = {"circle": "Circle, Loose", "underline": "Underline", "arrow": "Arrow, Curved", "cross": "Cross-Out", "tally": "Tally Marks", "hatch": "Hatching", "crosshatch": "Cross-Hatching",
 "scribble": "Scribble", "spiral": "Spiral", "zigzag": "Zigzag", "bracket": "Bracket", "asterisk": "Asterisk", "brush": "Brush Swipe", "splatter": "Ink Splatter", "ring": "Coffee Ring",
 "dots": "Row Of Dots", "heart": "Heart, Pencilled", "star": "Star, Five Points", "check": "Check Mark", "wave": "Wave"}
COL = {"ink": "Ink", "red": "Red", "blue": "Blue", "graphite": "Graphite", "charcoal": "Charcoal", "sepia": "Sepia", "black": "Black", "white": "White", "coffee": "Coffee"}

def main():
    lines = []
    for (n, w, h, base, seed, edges, ln, gr, st, rot, ex) in PAPERS:
        rgba = scrap(n, w, h, base, seed, edges, ln, gr, st, rot, extra=ex)
        W, H = crop_save(rgba, "pm-" + n)
        lines.append('    { id:"pm-%s-cut", category:"cutouts", group:"paper", title:%s, image:"images/cutouts/pm-%s.webp", w:%d, h:%d, alpha:true, tags:["paper", "scrap", "torn", "texture"] },' % (n, json.dumps(NICE[n]), n, W, H))
    for (n, size, col, fn, seed, grain) in MARKS:
        rgba = mark_img(size, col, fn, seed, grain)
        W, H = crop_save(rgba, "pm-" + n)
        base, c = n.split("-")
        lines.append('    { id:"pm-%s-cut", category:"cutouts", group:"paper", title:%s, image:"images/cutouts/pm-%s.webp", w:%d, h:%d, alpha:true, tags:["mark", "drawn", "%s", "%s"] },' % (n, json.dumps(MN[base] + ", " + COL[c]), n, W, H, base, c))
    open(os.path.join(os.path.dirname(__file__), "marks_archive_lines.txt"), "w").write("\n".join(lines) + "\n")
    print(len(lines))
main()
