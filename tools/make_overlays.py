#!/usr/bin/env python3
"""Procedurally paint translucent overlays (tracing paper, washes, stains, light, dust, tape...).

Everything is generated from noise, so there is no source image and nothing to license.
  python3 tools/make_overlays.py [outdir=images/overlays]
Writes WebP with a real alpha channel and prints the archive.js lines to paste.
"""
import sys, os, json
import numpy as np, cv2
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "images", "overlays")

def rng(seed): return np.random.RandomState(seed)

def fbm(h, w, seed, base=4, octaves=5, persist=0.55):
    r = rng(seed); out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0; n = base
    for _ in range(octaves):
        g = r.rand(n + 2, max(2, int(n * w / h)) + 2).astype(np.float32)
        out += amp * cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
        tot += amp; amp *= persist; n *= 2
    out /= tot
    return (out - out.min()) / (out.max() - out.min() + 1e-6)

def sstep(x, a, b):
    t = np.clip((x - a) / (b - a + 1e-9), 0, 1); return t * t * (3 - 2 * t)

def grid(h, w):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32); return x, y

def torn_alpha(h, w, seed, sides="ltrb", margin=26, amp=16, fine=4):
    """soft alpha for a torn-paper rectangle; returns (mask, band) band = fibrous edge zone"""
    x, y = grid(h, w)
    n1 = fbm(h, w, seed, base=6, octaves=4) - 0.5
    n2 = fbm(h, w, seed + 1, base=60, octaves=2) - 0.5
    noise = n1 * amp * 2 + n2 * fine * 2
    d = np.full((h, w), 1e6, np.float32)
    for s, v in (("l", x), ("r", (w - 1) - x), ("t", y), ("b", (h - 1) - y)):
        if s in sides: d = np.minimum(d, v - margin + noise)
    m = sstep(d, -1.0, 1.6)
    band = sstep(d, -1, 2) * (1 - sstep(d, 3, 9))
    return m, band

def to_img(rgb, a):
    rgb = np.clip(rgb, 0, 255).astype(np.uint8); a = np.clip(a * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, a]), "RGBA")

def solid(h, w, c): return np.dstack([np.full((h, w), v, np.float32) for v in c])

# ---------------------------------------------------------------- papers
def tracing(seed, tone=(246, 244, 238), base=0.40, sides="ltrb", W=900, H=1200, creases=True):
    m, band = torn_alpha(H, W, seed, sides)
    fib = fbm(H, W, seed + 2, base=90, octaves=2)
    streak = cv2.GaussianBlur(rng(seed + 3).rand(H, W).astype(np.float32), (0, 0), sigmaX=22, sigmaY=1.0)
    streak = (streak - streak.min()) / (streak.max() - streak.min())
    cloud = fbm(H, W, seed + 4, base=3, octaves=4)
    a = base * (0.78 + 0.35 * fib + 0.25 * streak + 0.2 * cloud) + 0.32 * band
    if creases:
        x, y = grid(H, W)
        for k in range(3):
            r = rng(seed + 10 + k); ang = r.uniform(0, np.pi); px, py = r.uniform(.2, .8) * W, r.uniform(.2, .8) * H
            dist = np.abs((x - px) * np.sin(ang) - (y - py) * np.cos(ang))
            a += 0.16 * np.exp(-(dist / 1.4) ** 2) + 0.05 * np.exp(-(dist / 9) ** 2)
    rgb = solid(H, W, tone) * (0.97 + 0.05 * fib[..., None])
    return to_img(rgb, np.clip(a, 0, 0.95) * m)

def glassine(seed, W=900, H=1200):
    m, band = torn_alpha(H, W, seed, "", margin=0)
    x, y = grid(H, W)
    ridge = 1 - np.abs(fbm(H, W, seed, base=7, octaves=5) - 0.5) * 2
    ridge = sstep(ridge, 0.82, 0.98)
    ridge2 = 1 - np.abs(fbm(H, W, seed + 1, base=14, octaves=4) - 0.5) * 2
    ridge2 = sstep(ridge2, 0.88, 0.99)
    a = 0.20 + 0.34 * ridge + 0.22 * ridge2 + 0.12 * fbm(H, W, seed + 2, base=3, octaves=3)
    tone = np.array([232, 240, 244], np.float32); hi = np.array([255, 255, 255], np.float32)
    rgb = tone * (1 - ridge[..., None]) + hi * ridge[..., None]
    return to_img(rgb, np.clip(a, 0, .85))

def vellum(seed, W=900, H=1200):
    m, band = torn_alpha(H, W, seed, "ltrb", amp=10, fine=3)
    cloud = fbm(H, W, seed + 1, base=3, octaves=5)
    fib = fbm(H, W, seed + 2, base=100, octaves=2)
    age = sstep(cloud, 0.45, 0.9)
    base = np.array([244, 232, 205], np.float32); brown = np.array([190, 146, 86], np.float32)
    rgb = base * (1 - age[..., None] * 0.55) + brown * age[..., None] * 0.55
    a = 0.46 + 0.14 * fib + 0.22 * age + 0.3 * band
    return to_img(rgb, np.clip(a, 0, 0.92) * m)

def graph_sheet(seed, W=1000, H=1000):
    m, band = torn_alpha(H, W, seed, "br", margin=14, amp=14)
    x, y = grid(H, W)
    minor, major = 28, 140
    lm = ((x % minor) < 1.3) | ((y % minor) < 1.3); lM = ((x % major) < 2.2) | ((y % major) < 2.2)
    cloud = fbm(H, W, seed + 2, base=3, octaves=3)
    a = 0.20 + 0.06 * cloud + 0.32 * lm + 0.30 * lM + 0.3 * band
    ink = np.array([70, 112, 150], np.float32); paper = np.array([244, 246, 244], np.float32)
    k = np.clip(lm * 0.8 + lM, 0, 1)[..., None]
    return to_img(paper * (1 - k) + ink * k, np.clip(a, 0, .9) * m)

# ---------------------------------------------------------------- washes
def wash(seed, color, W=1000, H=1000, strength=0.55, bloom=0.5):
    x, y = grid(H, W)
    r = rng(seed); cx, cy = r.uniform(.42, .58) * W, r.uniform(.42, .58) * H
    ax, ay = r.uniform(.30, .40) * W, r.uniform(.28, .40) * H
    th = r.uniform(0, np.pi); c, s = np.cos(th), np.sin(th)
    u = (x - cx) * c + (y - cy) * s; v = -(x - cx) * s + (y - cy) * c
    d = np.sqrt((u / ax) ** 2 + (v / ay) ** 2)
    warp = (fbm(H, W, seed + 1, base=4, octaves=5) - 0.5) * 0.9 + (fbm(H, W, seed + 2, base=30, octaves=2) - 0.5) * 0.12
    f = d + warp
    body = 1 - sstep(f, 0.82, 0.95)
    rim = sstep(f, 0.55, 0.86) * (1 - sstep(f, 0.86, 0.96))     # pigment pools at the edge
    gran = fbm(H, W, seed + 3, base=120, octaves=2)
    pool = fbm(H, W, seed + 4, base=5, octaves=4)
    a = body * (strength * (0.50 + 0.5 * pool) + 0.12 * (gran - 0.5)) + rim * strength * 0.55 * bloom
    rgb = solid(H, W, color) * (0.86 + 0.28 * (1 - pool[..., None])) * (1 - 0.1 * rim[..., None])
    return to_img(rgb, np.clip(a, 0, .9))

def wash_streak(seed, color, W=1200, H=700, strength=0.5):
    """a loaded-brush band"""
    x, y = grid(H, W)
    warp = (fbm(H, W, seed, base=5, octaves=4) - 0.5) * 120
    yc = H / 2 + warp * 0.6 + (x - W / 2) * 0.06
    d = np.abs(y - yc) / (H * 0.30)
    body = 1 - sstep(d, 0.78, 1.0)
    ends = sstep(x, 40 + warp * 0.2, 160) * (1 - sstep(x, W - 200, W - 40 + warp * 0.2))
    bristle = cv2.GaussianBlur(rng(seed + 1).rand(H, W).astype(np.float32), (0, 0), sigmaX=40, sigmaY=1.2)
    bristle = (bristle - bristle.min()) / (bristle.max() - bristle.min())
    pool = fbm(H, W, seed + 2, base=4, octaves=4)
    a = body * ends * strength * (0.35 + 0.45 * bristle + 0.3 * pool)
    rgb = solid(H, W, color) * (0.85 + 0.3 * (1 - bristle[..., None]))
    return to_img(rgb, np.clip(a, 0, .85))

# ---------------------------------------------------------------- stains
def ring_stain(seed, color=(122, 80, 40), W=900, H=900, strength=0.5, drip=False):
    x, y = grid(H, W); cx, cy = W / 2 + rng(seed).uniform(-30, 30), H / 2
    R = W * 0.30
    warp = (fbm(H, W, seed, base=5, octaves=4) - 0.5) * 0.18
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / R + warp
    ring = np.exp(-((d - 1.0) / 0.035) ** 2) * 0.95 + np.exp(-((d - 0.97) / 0.09) ** 2) * 0.25
    inner = (1 - sstep(d, 0.96, 1.0)) * 0.20 * (0.5 + fbm(H, W, seed + 1, base=4, octaves=4))
    a = (ring + inner) * strength
    if drip:
        dd = np.abs(x - (cx + R * 0.7)) / 16 + warp * 3
        drop = np.exp(-dd ** 2) * sstep(y, cy, cy + R * 0.85) * (1 - sstep(y, cy + R * 1.2, cy + R * 1.5)) * 0.8
        a = np.maximum(a, drop * strength * 0.85)
    sp = rng(seed + 2)
    for _ in range(40):
        ang = sp.uniform(0, 2 * np.pi); rr = R * sp.uniform(1.05, 1.6); rad = sp.uniform(1.5, 6)
        px, py = int(cx + np.cos(ang) * rr), int(cy + np.sin(ang) * rr)
        if 0 <= px < W and 0 <= py < H: cv2.circle(a, (px, py), int(rad), float(strength * sp.uniform(.4, .9)), -1, cv2.LINE_AA)
    a = cv2.GaussianBlur(a, (0, 0), 1.0)
    rgb = solid(H, W, color) * (0.8 + 0.4 * fbm(H, W, seed + 3, base=8, octaves=3)[..., None])
    return to_img(rgb, np.clip(a, 0, .85))

def ink_bloom(seed, color=(34, 40, 66), W=900, H=900, strength=0.7):
    x, y = grid(H, W); cx, cy = W / 2, H / 2
    ang = np.arctan2(y - cy, x - cx); rr = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    n = fbm(H, W, seed, base=6, octaves=5)
    spikes = 1 + 0.55 * (fbm(H, W, seed + 1, base=12, octaves=3) - 0.5)
    f = rr / (W * 0.30 * spikes) + (n - 0.5) * 0.7
    core = 1 - sstep(f, 0.10, 0.55)
    halo = (1 - sstep(f, 0.4, 1.0))
    feather = fbm(H, W, seed + 2, base=50, octaves=3)
    a = (core * 0.85 + halo * 0.35 * (0.5 + feather * 0.6)) * strength
    sp = rng(seed + 5)
    for _ in range(60):
        a_ = sp.uniform(0, 2 * np.pi); r_ = W * sp.uniform(.28, .46); rad = sp.uniform(1, 5)
        cv2.circle(a, (int(cx + np.cos(a_) * r_), int(cy + np.sin(a_) * r_)), int(rad), float(strength * sp.uniform(.4, 1)), -1, cv2.LINE_AA)
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    return to_img(solid(H, W, color), np.clip(a, 0, .92))

# ---------------------------------------------------------------- light
def light_leak(seed, colors, W=1200, H=800, strength=0.7, side="l"):
    x, y = grid(H, W)
    if side == "r": x = W - 1 - x
    if side == "t": x, y = y * (W / H), x * (H / W)
    r = rng(seed); blobs = np.zeros((H, W, 3), np.float32); amask = np.zeros((H, W), np.float32)
    for i, c in enumerate(colors):
        cx, cy = -W * 0.04 + r.uniform(0, W * 0.18), H * r.uniform(.1, .9); R = W * r.uniform(.22, .42)
        e = np.exp(-(((x - cx) / R) ** 2 + ((y - cy) / (R * r.uniform(.7, 1.5))) ** 2))
        blobs += e[..., None] * np.array(c, np.float32); amask += e
    amask = np.clip(amask, 0, 1)
    streak = fbm(H, W, seed + 1, base=3, octaves=3)
    a = (amask * (0.55 + 0.45 * streak)) ** 1.1 * strength
    rgb = blobs / np.maximum(amask[..., None], 1e-3)
    return to_img(rgb, np.clip(a, 0, .85))

def sun_flare(seed, W=1000, H=1000, strength=0.8):
    x, y = grid(H, W); cx, cy = W * 0.28, H * 0.26
    rr = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    glow = np.exp(-(rr / (W * 0.22)) ** 1.4)
    core = np.exp(-(rr / (W * 0.05)) ** 2)
    ang = np.arctan2(y - cy, x - cx)
    rays = (0.5 + 0.5 * np.cos(ang * 9 + fbm(H, W, seed, base=3) * 3)) * np.exp(-(rr / (W * 0.6)) ** 1.5)
    ghost = np.zeros((H, W), np.float32)
    for t, rad, k in ((0.35, 0.05, 0.5), (0.6, 0.09, 0.35), (0.85, 0.035, 0.45), (1.15, 0.13, 0.25)):
        gx, gy = cx + (W * 0.5 - cx) * t * 1.6, cy + (H * 0.5 - cy) * t * 1.6
        ghost += k * np.exp(-(np.sqrt((x - gx) ** 2 + (y - gy) ** 2) / (W * rad)) ** 4)
    a = np.clip(glow * 0.55 + core * 0.7 + rays * 0.14 * glow + ghost * 0.4, 0, 1) * strength
    warm = np.array([255, 222, 150], np.float32); hot = np.array([255, 250, 232], np.float32)
    k = np.clip(core * 1.2 + glow * 0.3, 0, 1)[..., None]
    rgb = warm * (1 - k) + hot * k
    rgb = rgb + ghost[..., None] * np.array([-60, 10, 60], np.float32)
    return to_img(rgb, a)

# ---------------------------------------------------------------- film dust
def dust(seed, light=True, W=1200, H=1200, count=420):
    r = rng(seed); a = np.zeros((H, W), np.float32)
    for _ in range(count):
        x, y = r.randint(0, W), r.randint(0, H); rad = r.choice([1, 1, 1, 2, 2, 3, 5], p=[.3, .2, .15, .15, .1, .07, .03])
        cv2.circle(a, (x, y), int(rad), float(r.uniform(.4, .95)), -1, cv2.LINE_AA)
    for _ in range(22):   # hairs
        x, y = r.randint(0, W), r.randint(0, H); pts = [(x, y)]; ang = r.uniform(0, 6.28)
        for _k in range(r.randint(6, 16)):
            ang += r.uniform(-.6, .6); x += int(np.cos(ang) * r.randint(6, 16)); y += int(np.sin(ang) * r.randint(6, 16)); pts.append((x, y))
        cv2.polylines(a, [np.array(pts, np.int32)], False, float(r.uniform(.35, .8)), 1, cv2.LINE_AA)
    for _ in range(9):    # scratches
        x, y = r.randint(0, W), r.randint(0, H // 2); L = r.randint(H // 5, H // 2); dx = r.uniform(-.06, .06)
        cv2.line(a, (x, y), (int(x + dx * L), y + L), float(r.uniform(.25, .6)), 1, cv2.LINE_AA)
    a = cv2.GaussianBlur(a, (0, 0), 0.7)
    return to_img(solid(H, W, (250, 248, 240) if light else (28, 24, 22)), np.clip(a, 0, 1) * (0.9 if light else 0.8))

# ---------------------------------------------------------------- halftone
def halftone(seed, mode="diag", W=1000, H=1000, pitch=22, color=(24, 24, 28), strength=0.8):
    x, y = grid(H, W)
    if mode == "diag": g = (x / W * 0.7 + y / H * 0.5)
    elif mode == "radial": g = 1 - np.sqrt(((x - W / 2) / W) ** 2 + ((y - H / 2) / H) ** 2) * 2
    else: g = fbm(H, W, seed, base=3, octaves=4)
    g = np.clip(g + (fbm(H, W, seed + 1, base=5, octaves=3) - .5) * .25, 0, 1)
    ca, sa = np.cos(np.deg2rad(45)), np.sin(np.deg2rad(45))
    u = (x * ca + y * sa) / pitch; v = (-x * sa + y * ca) / pitch
    fu, fv = u - np.floor(u) - .5, v - np.floor(v) - .5
    dist = np.sqrt(fu ** 2 + fv ** 2)
    rad = 0.12 + 0.48 * np.sqrt(np.clip(g, 0, 1))
    dot = 1 - sstep(dist, rad - 0.04, rad + 0.04)
    dot *= (g > 0.05)
    return to_img(solid(H, W, color), dot * strength)

# ---------------------------------------------------------------- fog
def fog(seed, mode="drift", W=1200, H=800, strength=0.7):
    n = fbm(H, W, seed, base=3, octaves=6, persist=.6); n2 = fbm(H, W, seed + 1, base=2, octaves=4)
    x, y = grid(H, W)
    if mode == "ground": g = sstep(y / H, 0.25, 1.0) ** 1.2
    else: g = 0.5 + 0.5 * n2
    a = sstep(n, 0.28, 0.82) * g * strength
    return to_img(solid(H, W, (238, 242, 246)) * (0.95 + 0.06 * n[..., None]), np.clip(a, 0, .85))

# ---------------------------------------------------------------- washi tape
def tape(seed, kind, color, accent=None, W=900, H=190, angle=-3.0):
    pad = 40; Wc, Hc = W + pad * 2, H + pad * 2
    base = np.zeros((Hc, Wc), np.float32)
    r = rng(seed)
    # zigzag torn ends
    x, y = grid(Hc, Wc)
    ym = y - pad
    inside_y = sstep(ym, 0, 1.5) * (1 - sstep(ym, H - 1.5, H))
    zz = 10 + 8 * np.abs(np.sin(ym * 0.55 + r.uniform(0, 3))) * 0.5 + (fbm(Hc, Wc, seed, base=40, octaves=2)[:, :1] - .5) * 6
    left = sstep(x - pad, zz[:, :1] * 0 + zz - 8, zz - 4) if False else sstep(x - pad, zz - 4, zz + 1)
    right = 1 - sstep(x - pad, W - zz - 1, W - zz + 4)
    shape = inside_y * left * right
    fib = fbm(Hc, Wc, seed + 1, base=120, octaves=2)
    streak = cv2.GaussianBlur(r.rand(Hc, Wc).astype(np.float32), (0, 0), sigmaX=30, sigmaY=.8); streak = (streak - streak.min()) / (streak.max() - streak.min())
    col = solid(Hc, Wc, color) * (0.94 + 0.1 * fib[..., None])
    if kind == "stripes":
        s = ((ym // 22).astype(int) % 2 == 0).astype(np.float32)[..., None]
        col = col * (1 - s) + solid(Hc, Wc, accent) * s
    elif kind == "dots":
        step = 34; fx = ((x - pad) % step) - step / 2; fy = (ym % step) - step / 2
        d = (np.sqrt(fx ** 2 + fy ** 2) < 7).astype(np.float32)[..., None]; col = col * (1 - d) + solid(Hc, Wc, accent) * d
    elif kind == "grid":
        l = ((((x - pad) % 30) < 2.2) | ((ym % 30) < 2.2)).astype(np.float32)[..., None]; col = col * (1 - l * .8) + solid(Hc, Wc, accent) * l * .8
    elif kind == "gingham":
        a1 = (((x - pad) // 30).astype(int) % 2 == 0); a2 = ((ym // 30).astype(int) % 2 == 0)
        k = (a1 ^ a2).astype(np.float32)[..., None] * .55; col = col * (1 - k) + solid(Hc, Wc, accent) * k
    a = shape * (0.60 + 0.10 * fib + 0.08 * streak)
    im = to_img(col, np.clip(a, 0, .8))
    return im.rotate(angle, resample=Image.BICUBIC, expand=True)

# ---------------------------------------------------------------- water & shade
def droplets(seed, W=1000, H=1000, count=46):
    r = rng(seed); a = np.zeros((H, W, 4), np.float32)
    x, y = grid(H, W)
    for _ in range(count):
        cx, cy = r.uniform(30, W - 30), r.uniform(30, H - 30); R = r.choice([6, 9, 13, 18, 26, 38], p=[.28, .25, .2, .14, .09, .04])
        sx, sy = R * r.uniform(.9, 1.15), R * r.uniform(.9, 1.2)
        d = np.sqrt(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2)
        inside = 1 - sstep(d, .93, 1.0)
        if not inside.any(): continue
        rim = np.exp(-((d - .93) / .09) ** 2)
        shade_low = np.exp(-(((x - cx) / sx - 0.15) ** 2 + ((y - cy) / sy - .35) ** 2) / .25) * inside   # caustic lower bright
        dark_up = np.clip(-(((y - cy) / sy)) * inside, 0, 1)
        hl = np.exp(-(((x - cx) / sx + .38) ** 2 + ((y - cy) / sy + .4) ** 2) / .02) * inside
        white = np.clip(0.06 * inside + 0.35 * rim * (0.5 + 0.5 * (((y - cy) / sy) > 0)) + 0.35 * shade_low + 0.9 * hl, 0, 1)
        dark = np.clip(0.3 * rim * (((y - cy) / sy) < 0.2) + 0.12 * dark_up, 0, 1)
        k = white + dark
        mix = (white * 255 + dark * 40) / np.maximum(k, 1e-3)
        sl = k > a[..., 3]
        a[..., 3] = np.where(sl, k, a[..., 3]); a[..., 0] = np.where(sl, mix, a[..., 0])
    rgb = np.dstack([a[..., 0]] * 3)
    return to_img(rgb, np.clip(a[..., 3], 0, .9))

def dapple(seed, W=1100, H=1100, strength=0.5):
    n = fbm(H, W, seed, base=5, octaves=5, persist=.6); n2 = fbm(H, W, seed + 1, base=9, octaves=3)
    leaves = sstep(n * .75 + n2 * .25, 0.48, 0.56)
    soft = cv2.GaussianBlur(leaves, (0, 0), 7)
    return to_img(solid(H, W, (22, 30, 24)), soft * strength)

def window_shade(seed, W=1100, H=1100, strength=0.5):
    x, y = grid(H, W)
    sk = 0.35; xs = x + y * sk
    px, py = 380, 380
    barv = (np.abs(((xs % 520) - 260)) < 16)
    barh = (np.abs(((y % 480) - 240)) < 16)
    bars = (barv | barh).astype(np.float32)
    frame = sstep(np.maximum(np.abs(x - W / 2) / (W * .55), np.abs(y - H / 2) / (H * .55)), .93, 1.0)
    shade = np.clip(bars + frame * 0, 0, 1)
    shade = cv2.GaussianBlur(shade, (0, 0), 11)
    shade *= 0.75 + 0.25 * fbm(H, W, seed, base=3, octaves=3)
    return to_img(solid(H, W, (30, 34, 44)), shade * strength)

def crease(seed, W=1100, H=1100):
    x, y = grid(H, W); a = np.zeros((H, W, 4), np.float32)
    lines = [(0.0, W * .5), (np.pi / 2, H * .5), (np.deg2rad(32), 0.0)]
    light = np.zeros((H, W), np.float32); dark = np.zeros((H, W), np.float32)
    for i, (ang, off) in enumerate(lines):
        dist = (x - W / 2) * np.cos(ang) + (y - H / 2) * np.sin(ang) + (off - (W if ang == 0 else H) * .5 if i < 2 else off)
        wob = (fbm(H, W, seed + i, base=6, octaves=3) - .5) * 5
        dd = dist + wob
        light += np.exp(-((dd - 2) / 2.2) ** 2) * 0.85 + np.exp(-((dd - 2) / 18) ** 2) * 0.08
        dark += np.exp(-((dd + 3) / 3.2) ** 2) * 0.6 + np.exp(-((dd + 3) / 28) ** 2) * 0.10
    k = np.clip(light + dark, 0, 1); mix = (light * 255 + dark * 45) / np.maximum(light + dark, 1e-3)
    return to_img(np.dstack([mix] * 3), k * 0.8)

def fe(im, px=70):
    """feather the borders so a full-bleed texture has no hard rectangle edge"""
    a = np.array(im.split()[-1]).astype(np.float32) / 255; h, w = a.shape
    x, y = grid(h, w)
    r = sstep(np.minimum.reduce([x, w - 1 - x, y, h - 1 - y]), 0, px)
    out = im.copy(); out.putalpha(Image.fromarray((a * r * 255).astype(np.uint8))); return out

# ==================================================================== catalogue
def build():
    P = (230, 196, 120)
    spec = [
        # id, title, group, tags, image
        ("tracing-torn", "Tracing Paper, Torn All Round", "paper", "tracing paper translucent torn", lambda: tracing(11)),
        ("tracing-cool", "Tracing Paper, Cool, Torn Below", "paper", "tracing paper translucent cool", lambda: tracing(12, tone=(234, 241, 246), base=0.36, sides="b", W=1200, H=800)),
        ("tracing-creased", "Tracing Paper, Creased", "paper", "tracing paper creased fold", lambda: tracing(13, base=0.34, sides="ltrb", W=1000, H=1000)),
        ("vellum-aged", "Vellum, Gone Amber", "paper", "vellum amber aged translucent", lambda: vellum(14)),
        ("graph-tracing", "Graph Paper, Thin As Breath", "paper", "graph grid blue sheet", lambda: graph_sheet(16)),
        ("wash-prussian", "Wash, Prussian Blue", "wash", "watercolor wash blue", lambda: wash(21, (60, 100, 150))),
        ("wash-rose", "Wash, Rose Madder", "wash", "watercolor wash rose pink", lambda: wash(22, (206, 112, 128))),
        ("wash-ochre", "Wash, Yellow Ochre", "wash", "watercolor wash ochre gold", lambda: wash(23, (214, 166, 72))),
        ("wash-sage", "Wash, Sage", "wash", "watercolor wash green sage", lambda: wash(24, (126, 158, 120))),
        ("wash-violet", "Wash, Dusk Violet", "wash", "watercolor wash violet purple", lambda: wash(25, (128, 108, 168))),
        ("wash-teal", "Wash, Deep Teal", "wash", "watercolor wash teal green blue", lambda: wash(26, (40, 124, 128), strength=.6)),
        ("brush-umber", "Brushstroke, Burnt Umber", "wash", "brush stroke band umber brown", lambda: wash_streak(27, (120, 78, 44))),
        ("brush-indigo", "Brushstroke, Indigo", "wash", "brush stroke band indigo blue", lambda: wash_streak(28, (52, 66, 120), strength=.55)),
        ("tea-ring", "Tea Ring", "stain", "stain tea ring brown", lambda: ring_stain(31)),
        ("coffee-drip", "Coffee Ring, With A Drip", "stain", "stain coffee ring drip", lambda: ring_stain(32, color=(84, 52, 28), strength=.6, drip=True)),
        ("ink-bloom", "Ink Bloom", "stain", "ink bloom blot blue black", lambda: ink_bloom(33)),
        ("ink-bloom-red", "Red Ink, Spreading", "stain", "ink bloom blot red", lambda: ink_bloom(34, color=(150, 30, 40), strength=.6)),
        ("leak-amber", "Light Leak, Amber", "light", "light leak amber orange film", lambda: fe(light_leak(41, [(255, 150, 60), (255, 90, 70)]))),
        ("leak-rose", "Light Leak, Rose And Gold", "light", "light leak rose gold film", lambda: fe(light_leak(42, [(255, 120, 150), (255, 200, 110)], side="r"))),
        ("sun-flare", "Sun, Through A Lens", "light", "sun flare lens glow", lambda: fe(sun_flare(43))),
        ("dust-light", "Dust And Hairs, Pale", "light", "dust scratches film pale", lambda: fe(dust(51, True))),
        ("dust-dark", "Dust And Hairs, Dark", "light", "dust scratches film dark", lambda: fe(dust(52, False))),
        ("dots-diagonal", "Dots, Thinning Out", "print", "halftone dots gradient print", lambda: fe(halftone(61, "diag"))),
        ("dots-radial", "Dots, Around A Centre", "print", "halftone dots radial print", lambda: halftone(62, "radial", pitch=20)),
        ("dots-cloud", "Dots, Cloudy", "print", "halftone dots cloud print", lambda: fe(halftone(63, "cloud", pitch=26, color=(60, 40, 90)))),
        ("fog-drift", "Fog, Drifting", "light", "fog mist haze", lambda: fe(fog(71, "drift"))),
        ("fog-ground", "Mist, Lying Low", "light", "fog mist ground", lambda: fe(fog(72, "ground"))),
        ("tape-rose", "Washi Tape, Rose Stripes", "tape", "washi tape stripes rose", lambda: tape(81, "stripes", (240, 200, 205), (224, 140, 156))),
        ("tape-sage", "Washi Tape, Sage Dots", "tape", "washi tape dots green", lambda: tape(82, "dots", (200, 220, 196), (250, 250, 240), angle=2.0)),
        ("tape-ochre", "Washi Tape, Plain Ochre", "tape", "washi tape plain ochre", lambda: tape(83, "plain", (232, 196, 120), angle=-1.5)),
        ("tape-blue", "Washi Tape, Blue Squares", "tape", "washi tape grid blue", lambda: tape(84, "grid", (206, 222, 236), (86, 124, 168), angle=3.0)),
        ("tape-gingham", "Washi Tape, Gingham", "tape", "washi tape gingham check", lambda: tape(85, "gingham", (250, 244, 232), (210, 90, 90), angle=-2.5)),
        ("dew", "Dew, On Glass", "water", "dew droplets glass water", lambda: droplets(91)),
        ("dapple", "Leaf Shade, Dappled", "shade", "shadow leaves dapple shade", lambda: fe(dapple(92))),
        ("window-shade", "Window Shadow", "shade", "window shadow light bars", lambda: window_shade(93)),
    ]
    return spec

def main():
    os.makedirs(OUT, exist_ok=True); lines = []
    for id_, title, grp, tags, mk in build():
        im = mk()
        if max(im.size) > 1000:
            s = 1000 / max(im.size); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        fn = id_ + ".webp"; im.save(os.path.join(OUT, fn), "WEBP", quality=88, method=4, alpha_quality=100)
        lines.append('    { id:"ov-%s", category:"overlays", group:"%s", title:%s, image:"images/overlays/%s", w:%d, h:%d, alpha:true, tags:%s },' % (id_, grp, json.dumps(title), fn, im.width, im.height, json.dumps(tags.split())))
        print(fn, im.size, file=sys.stderr)
    open(os.path.join(OUT, "_archive_lines.txt"), "w").write("\n".join(lines) + "\n")

if __name__ == "__main__": main()
