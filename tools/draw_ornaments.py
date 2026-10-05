#!/usr/bin/env python3
"""Draws the Scrap Naturalist's own ornaments: esoteric symbols and botanicals.

Every shape here is drawn from scratch in code and released to the public domain (CC0).
Run:  python3 tools/draw_ornaments.py   -> writes images/cutouts/orn-*.webp and prints archive.js lines.
Needs: playwright (with chromium) and Pillow.
"""
import math, io, os, sys, json
from PIL import Image

INK = "#2b2118"; GOLD = "#c79a3b"; GOLD2 = "#e8c873"; RED = "#8c2f2b"; SAGE = "#7f9168"; SAGE2 = "#a9b58f"
CREAM = "#f3e9cd"; PLUM = "#4a3550"; BLUE = "#3c5a73"; BLUE2 = "#8fb0c4"; BARK = "#6b4a2f"; ROSE = "#b5495b"

def svg(w, h, body, defs=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{defs}</defs><g stroke-linejoin="round" stroke-linecap="round">{body}</g></svg>'

def P(d, fill="none", stroke=INK, sw=3, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'

def C(x, y, r, fill="none", stroke=INK, sw=3):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def L(x1, y1, x2, y2, stroke=INK, sw=3):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}"/>'

def pol(cx, cy, r, a):
    return cx + r * math.cos(a), cy + r * math.sin(a)

def leaf(x, y, ang, length, width, fill=SAGE, stroke=INK, sw=2.5, vein=True):
    """A pointed leaf starting at (x,y) pointing along angle ang (radians)."""
    c, s = math.cos(ang), math.sin(ang)
    def T(u, v): return x + u * c - v * s, y + u * s + v * c
    p1 = T(length * 0.45, -width); p2 = T(length * 0.45, width); tip = T(length, 0)
    d = f"M{x:.1f},{y:.1f} Q{p1[0]:.1f},{p1[1]:.1f} {tip[0]:.1f},{tip[1]:.1f} Q{p2[0]:.1f},{p2[1]:.1f} {x:.1f},{y:.1f}Z"
    out = P(d, fill, stroke, sw)
    if vein:
        m = T(length * 0.85, 0)
        out += L(x, y, m[0], m[1], stroke, 1.6)
    return out

def bez(p0, p1, p2, t):
    u = 1 - t
    x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]
    y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
    dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    return x, y, math.atan2(dy, dx)

def double(items, outline=INK, extra=8):
    """items: list of (svg-tag-template with {stroke} {sw}, width). Draws outlines then fills so shapes fuse."""
    out = ""
    for tpl, w, fill in items:
        out += tpl.format(stroke=outline, sw=w + extra, fill=outline)
    for tpl, w, fill in items:
        out += tpl.format(stroke=fill, sw=w, fill=fill)
    return out

def line_t(x1, y1, x2, y2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{{stroke}}" stroke-width="{{sw}}" fill="none"/>'

def path_t(d):
    return f'<path d="{d}" stroke="{{stroke}}" stroke-width="{{sw}}" fill="{{fill}}"/>'

# ------------------------------------------------------------------ ESOTERIC
def eye_triangle():
    b = ""
    for i in range(36):
        a = i * math.tau / 36
        r2 = 195 if i % 2 == 0 else 165
        x1, y1 = pol(200, 238, 120, a); x2, y2 = pol(200, 238, r2, a)
        b += L(x1, y1, x2, y2, GOLD, 4)
    b += P("M200,48 L360,332 L40,332Z", CREAM, INK, 5)
    b += P("M200,92 L322,312 L78,312Z", "none", INK, 2)
    b += P("M118,248 Q200,176 282,248 Q200,320 118,248Z", "#fffaf0", INK, 4)
    b += C(200, 248, 29, BLUE, INK, 3) + C(200, 248, 12, INK, INK, 1) + C(209, 239, 5, "#fff", "none", 0)
    for i in range(9):
        a = math.pi + 0.35 + i * (math.pi - 0.7) / 8
        x1, y1 = pol(200, 292, 84, a); x2, y2 = pol(200, 292, 98, a)
        b += L(x1, y1 * 0.75 + 62, x2, y2 * 0.75 + 55, INK, 2.5)
    return svg(400, 460, b)

def eye_open():
    b = ""
    for i in range(17):
        t = i / 16
        x = 40 + 320 * t
        yb = 135 - 105 * math.sin(math.pi * t) * 0.92
        a = -math.pi / 2 + (t - 0.5) * 1.5
        b += L(x, yb, x + 24 * math.cos(a), yb + 28 * math.sin(a) - 4, INK, 3.5)
    b += P("M24,140 Q200,10 376,140 Q200,270 24,140Z", "#fffaf0", INK, 5)
    b += C(200, 140, 74, GOLD2, INK, 4)
    for i in range(36):
        a = i * math.tau / 36
        x1, y1 = pol(200, 140, 28, a); x2, y2 = pol(200, 140, 70, a)
        b += L(x1, y1, x2, y2, RED if i % 2 else GOLD, 1.6)
    b += C(200, 140, 74, "none", INK, 4) + C(200, 140, 28, INK, INK, 2) + C(222, 118, 11, "#fff", "none", 0) + C(186, 160, 5, "#fff", "none", 0)
    b += P("M46,98 Q200,-22 354,98", "none", INK, 3)
    b += P("M200,262 C186,282 186,300 200,306 C214,300 214,282 200,262Z", BLUE2, INK, 3)
    return svg(400, 320, b)

def moon_face():
    d = ("M268,52 C150,58 96,140 112,206 C118,230 128,246 140,254 L136,262 L146,268 L140,282 "
         "L152,292 L146,302 L156,312 C176,336 226,352 268,352 C150,360 40,290 40,200 C40,108 150,40 268,52Z")
    b = P(d, GOLD2, INK, 5)
    # shading hatch
    for i in range(10):
        b += P(f"M{58+i*5},{150+i*10} Q{70+i*5},{200} {64+i*5},{260-i*6}", "none", GOLD, 1.5)
    b += P("M92,176 Q114,164 134,176", "none", INK, 4)          # closed eyelid
    b += P("M96,176 Q112,196 130,178", "none", INK, 1.6)
    b += P("M86,156 Q112,140 140,152", "none", INK, 3)           # brow
    b += C(98, 222, 10, "#d98a6a", "none", 0)                    # cheek
    b += P("M140,290 Q150,292 154,284", "none", INK, 2.5)
    for (x, y, r) in [(310, 90, 14), (340, 210, 9), (300, 320, 11)]:
        b += star(x, y, r, 5, GOLD2)
    return svg(400, 400, b)

def star(cx, cy, r, n=5, fill=GOLD2, inner=0.45, rot=-math.pi / 2, sw=2.5):
    pts = []
    for i in range(n * 2):
        rr = r if i % 2 == 0 else r * inner
        x, y = pol(cx, cy, rr, rot + i * math.pi / n)
        pts.append(f"{x:.1f},{y:.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{INK}" stroke-width="{sw}"/>'

def sun_face():
    b = ""
    for i in range(32):
        a = i * math.tau / 32
        if i % 2 == 0:
            x1, y1 = pol(200, 200, 84, a - 0.1); x2, y2 = pol(200, 200, 84, a + 0.1); x3, y3 = pol(200, 200, 186, a)
            b += P(f"M{x1:.1f},{y1:.1f} L{x3:.1f},{y3:.1f} L{x2:.1f},{y2:.1f}Z", GOLD, INK, 2.5)
        else:
            x1, y1 = pol(200, 200, 86, a); x3, y3 = pol(200, 200, 142, a)
            xm, ym = pol(200, 200, 114, a + 0.08)
            b += P(f"M{x1:.1f},{y1:.1f} Q{xm:.1f},{ym:.1f} {x3:.1f},{y3:.1f}", "none", RED, 4)
    b += C(200, 200, 82, GOLD2, INK, 5) + C(200, 200, 68, "none", INK, 1.5)
    b += P("M150,186 Q166,176 182,186", "none", INK, 4) + P("M218,186 Q234,176 250,186", "none", INK, 4)
    b += P("M148,172 Q166,162 184,170", "none", INK, 3) + P("M216,170 Q234,162 252,172", "none", INK, 3)
    b += P("M200,190 Q192,212 202,218", "none", INK, 3.5)
    b += P("M170,236 Q200,262 232,236", "none", INK, 4)
    b += C(160, 218, 9, "#e3956f", "none", 0) + C(242, 218, 9, "#e3956f", "none", 0)
    return svg(400, 400, b)

def compass_star():
    b = C(200, 200, 70, "none", INK, 3) + C(200, 200, 150, "none", INK, 2)
    for i in range(8):
        a = -math.pi / 2 + i * math.pi / 4
        R = 185 if i % 2 == 0 else 112
        tip = pol(200, 200, R, a); l = pol(200, 200, 26, a - math.pi / 4); r = pol(200, 200, 26, a + math.pi / 4)
        c = (200, 200)
        b += P(f"M{c[0]},{c[1]} L{l[0]:.1f},{l[1]:.1f} L{tip[0]:.1f},{tip[1]:.1f}Z", INK if i % 2 == 0 else RED, INK, 2.5)
        b += P(f"M{c[0]},{c[1]} L{r[0]:.1f},{r[1]:.1f} L{tip[0]:.1f},{tip[1]:.1f}Z", CREAM, INK, 2.5)
    b += C(200, 200, 12, GOLD, INK, 3) + C(200, 200, 4, INK, INK, 1)
    for i in range(24):
        a = i * math.tau / 24
        x1, y1 = pol(200, 200, 150, a); x2, y2 = pol(200, 200, 160 if i % 3 else 168, a)
        b += L(x1, y1, x2, y2, INK, 2)
    return svg(400, 400, b)

def palm_hand():
    fingers = [(138, 232, 100, 96), (172, 220, 160, 40), (208, 218, 214, 34), (244, 228, 262, 70)]
    items = []
    for (x1, y1, x2, y2) in fingers:
        items.append((line_t(x1, y1, x2, y2), 38, CREAM))
    items.append((line_t(96, 330, 56, 262), 40, CREAM))            # thumb
    items.append((path_t("M104,232 L254,232 L262,378 L98,378 Z"), 30, CREAM))   # palm
    items.append((path_t("M118,372 L242,372 L238,470 L124,470 Z"), 18, CREAM))  # wrist
    b = double(items, INK, 10)
    b += P("M104,420 L246,420 M106,438 L244,438", "none", INK, 2.5)
    b += P("M124,470 L238,470", "none", INK, 5)
    # palm lines
    b += P("M112,262 Q150,300 112,350", "none", INK, 2.5) + P("M242,276 Q196,300 150,344", "none", INK, 2)
    # the eye in the palm
    b += P("M138,320 Q180,284 222,320 Q180,356 138,320Z", "#fffaf0", INK, 3.5) + C(180, 320, 15, BLUE, INK, 2.5) + C(180, 320, 6, INK, INK, 1)
    for i in range(7):
        a = math.pi + 0.5 + i * 0.35
        x1, y1 = pol(180, 330, 40, a); x2, y2 = pol(180, 330, 54, a)
        b += L(x1, y1 - 12, x2, y2 - 14, GOLD, 3)
    b += star(138, 300, 8, 5, GOLD2, 0.45, -math.pi / 2, 1.8) + star(228, 350, 7, 5, GOLD2, 0.45, -math.pi / 2, 1.8)
    return svg(320, 500, b)

def skeleton_key():
    bow = ""
    items = [(f'<circle cx="100" cy="60" r="34" stroke="{{stroke}}" stroke-width="{{sw}}" fill="none"/>', 16, GOLD),
             (f'<circle cx="62" cy="96" r="26" stroke="{{stroke}}" stroke-width="{{sw}}" fill="none"/>', 12, GOLD),
             (f'<circle cx="138" cy="96" r="26" stroke="{{stroke}}" stroke-width="{{sw}}" fill="none"/>', 12, GOLD),
             (line_t(100, 120, 100, 380), 18, GOLD),
             (line_t(100, 360, 148, 360), 18, GOLD), (line_t(100, 330, 138, 330), 16, GOLD),
             (line_t(100, 300, 150, 300), 14, GOLD)]
    b = double(items, INK, 8)
    b += C(100, 98, 15, "#fffaf0", INK, 3)
    b += P("M92,160 L108,160 M92,200 L108,200 M94,240 L106,240", "none", INK, 2.5)
    return svg(200, 410, b)

def crystal_ball():
    defs = (f'<radialGradient id="g" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#e3eefc"/><stop offset=".55" stop-color="{BLUE2}"/>'
            f'<stop offset="1" stop-color="{PLUM}"/></radialGradient>')
    b = P("M110,310 Q200,350 290,310 L322,372 Q200,400 78,372Z", GOLD, INK, 4)
    b += P("M78,372 Q200,408 322,372 L328,392 Q200,424 72,392Z", GOLD2, INK, 4)
    b += P("M98,330 Q200,364 302,330", "none", INK, 2.5)
    b += C(200, 180, 128, "url(#g)", INK, 5)
    b += P("M120,200 C150,150 190,230 230,180 C260,150 280,190 290,170", "none", "#ffffff", 3, 'opacity=".55"')
    b += P("M110,230 C160,200 190,270 250,230", "none", "#ffffff", 2, 'opacity=".4"')
    b += star(210, 150, 12, 4, GOLD2, 0.4, -math.pi / 2, 1.5) + star(160, 210, 8, 4, GOLD2, 0.4, -math.pi / 2, 1.5) + star(250, 215, 7, 4, GOLD2, 0.4, -math.pi / 2, 1.5)
    b += P("M118,130 Q130,96 168,82", "none", "#ffffff", 7, 'opacity=".85"')
    return svg(400, 430, b, defs)

def ouroboros():
    cx = cy = 200; R = 120
    a0, a1 = math.radians(-70), math.radians(235)   # body arc from tail to neck
    def pt(a, r=R): return pol(cx, cy, r, a)
    s, e = pt(a0), pt(a1)
    arc = f"M{s[0]:.1f},{s[1]:.1f} A{R},{R} 0 1 1 {e[0]:.1f},{e[1]:.1f}"
    b = P(arc, "none", INK, 56) + P(arc, "none", SAGE, 46)
    b += P(arc, "none", "#5d7048", 46, 'stroke-dasharray="3 13" opacity=".8"')
    b += P(arc, "none", SAGE2, 14, 'opacity=".7"')
    # belly stripe
    b += P(arc, "none", GOLD2, 3, 'stroke-dasharray="10 6"')
    # tapered tail tip
    t0 = pt(a0, R - 23); t1 = pt(a0, R + 23); tip = pol(cx, cy, R, a0 - 0.0)
    ta = a0 - 0.55
    tt = pt(ta)
    b += P(f"M{t0[0]:.1f},{t0[1]:.1f} Q{pt(a0-0.3, R-8)[0]:.1f},{pt(a0-0.3, R-8)[1]:.1f} {tt[0]:.1f},{tt[1]:.1f} Q{pt(a0-0.3, R+8)[0]:.1f},{pt(a0-0.3, R+8)[1]:.1f} {t1[0]:.1f},{t1[1]:.1f}Z", SAGE, INK, 3)
    # head
    hx, hy = pt(a1 + 0.0)
    ang = a1 + math.pi / 2     # direction of travel at the neck
    def H(u, v):
        return hx + u * math.cos(ang) - v * math.sin(ang), hy + u * math.sin(ang) + v * math.cos(ang)
    p = [H(0, -28), H(46, -26), H(84, -14), H(96, 0), H(84, 14), H(46, 26), H(0, 28)]
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in p[:1]) + " Q" + f"{p[1][0]:.1f},{p[1][1]:.1f} {p[2][0]:.1f},{p[2][1]:.1f}" + f" Q{p[3][0]:.1f},{p[3][1]:.1f} {p[4][0]:.1f},{p[4][1]:.1f}" + f" Q{p[5][0]:.1f},{p[5][1]:.1f} {p[6][0]:.1f},{p[6][1]:.1f}Z"
    b += P(d, SAGE, INK, 4)
    e1 = H(42, -10); b += C(e1[0], e1[1], 7, GOLD2, INK, 2.5) + C(e1[0], e1[1], 2.6, INK, INK, 1)
    n1 = H(86, -5); n2 = H(86, 5); b += C(n1[0], n1[1], 1.8, INK, INK, 1) + C(n2[0], n2[1], 1.8, INK, INK, 1)
    t = H(96, 0); t2 = H(122, 0); t3 = H(134, -9); t4 = H(134, 9)
    b += P(f"M{t[0]:.1f},{t[1]:.1f} L{t2[0]:.1f},{t2[1]:.1f} M{t2[0]:.1f},{t2[1]:.1f} L{t3[0]:.1f},{t3[1]:.1f} M{t2[0]:.1f},{t2[1]:.1f} L{t4[0]:.1f},{t4[1]:.1f}", "none", RED, 3)
    b += star(cx, cy, 22, 6, GOLD2, 0.5, -math.pi / 2, 2)
    return svg(400, 400, b)

def triple_moon():
    b = ""
    def crescent(cx, flip):
        s = 1 if flip else -1
        return P(f"M{cx},52 A58,58 0 1 {0 if flip else 1} {cx},168 A{44},{58} 0 1 {1 if flip else 0} {cx},52Z", GOLD2, INK, 4)
    b += crescent(70, False)
    b += C(220, 110, 62, GOLD2, INK, 4)
    for (x, y, r) in [(200, 84, 9), (240, 100, 7), (214, 132, 11), (250, 140, 6), (190, 112, 5)]:
        b += C(x, y, r, "#d9b25a", INK, 1.5)
    b += crescent(370, True)
    b += star(220, 28, 9, 4, GOLD2, 0.4) + star(220, 196, 9, 4, GOLD2, 0.4) + star(120, 30, 6, 4, GOLD2, 0.4) + star(320, 30, 6, 4, GOLD2, 0.4)
    return svg(440, 220, b)

def oval_frame():
    b = '<ellipse cx="200" cy="260" rx="170" ry="225" fill="none" stroke="#2b2118" stroke-width="22"/>'
    b += '<ellipse cx="200" cy="260" rx="170" ry="225" fill="none" stroke="#c79a3b" stroke-width="16"/>'
    b += '<ellipse cx="200" cy="260" rx="158" ry="213" fill="none" stroke="#2b2118" stroke-width="2"/>'
    b += '<ellipse cx="200" cy="260" rx="182" ry="237" fill="none" stroke="#2b2118" stroke-width="2"/>'
    for i in range(48):
        a = i * math.tau / 48
        x, y = 200 + 150 * math.cos(a), 260 + 205 * math.sin(a)
        b += C(f"{x:.1f}", f"{y:.1f}", 3.4, CREAM, INK, 1.5)
    for (x, y, a) in [(200, 28, -math.pi / 2), (200, 492, math.pi / 2)]:
        for k in (-1, 1):
            b += leaf(x, y, a + k * 1.0, 62, 15, SAGE, INK, 2.5)
        b += C(x, y, 11, RED, INK, 3)
    for (x, y) in [(30, 260), (370, 260)]:
        b += star(x, y, 15, 4, GOLD2, 0.4)
    return svg(400, 520, b)

def banner():
    b = P("M20,120 L88,120 L72,162 L88,204 L20,204 L36,162Z", RED, INK, 4)
    b += P("M380,120 L312,120 L328,162 L312,204 L380,204 L364,162Z", RED, INK, 4)
    b += P("M88,120 L88,150 L116,160Z M312,120 L312,150 L284,160Z", "#5a1d1a", INK, 3)
    b += P("M88,150 L116,160 L116,228 L88,204Z", "#5a1d1a", INK, 3)
    b += P("M312,150 L284,160 L284,228 L312,204Z", "#5a1d1a", INK, 3)
    b += P("M88,102 Q200,70 312,102 L312,186 Q200,154 88,186Z", CREAM, INK, 4)
    b += P("M96,114 Q200,86 304,114", "none", RED, 2) + P("M96,174 Q200,146 304,174", "none", RED, 2)
    b += star(200, 140, 11, 5, GOLD, 0.45, -math.pi / 2, 2) + star(150, 144, 6, 5, GOLD, 0.45, -math.pi / 2, 1.5) + star(250, 144, 6, 5, GOLD, 0.45, -math.pi / 2, 1.5)
    return svg(400, 250, b)

def flourish():
    half = ("M200,100 C176,64 126,56 100,84 C80,106 100,134 124,122 C142,112 138,90 120,92 "
            "M200,100 C160,118 100,112 44,96 C28,92 18,100 16,108")
    b = P(half, "none", INK, 4) + f'<g transform="translate(400,0) scale(-1,1)">{P(half, "none", INK, 4)}</g>'
    b += P("M200,76 L216,100 L200,124 L184,100Z", GOLD, INK, 3.5) + C(200, 100, 4, INK, INK, 1)
    for (x, y) in [(120, 92), (280, 92)]:
        b += C(x, y, 4, GOLD, INK, 2)
    return svg(400, 180, b)

def candle():
    b = P("M70,336 Q200,372 330,336 L318,362 Q200,394 82,362Z", GOLD, INK, 4)
    b += P("M110,330 Q200,350 290,330 L290,344 Q200,364 110,344Z", GOLD2, INK, 3)
    b += P("M138,150 L138,326 Q200,346 262,326 L262,150 Q200,166 138,150Z", CREAM, INK, 4)
    b += P("M150,168 Q150,224 160,226 Q170,226 170,176Z", "#fffaf0", INK, 2)
    b += P("M232,176 Q232,266 244,268 Q256,266 252,170Z", "#fffaf0", INK, 2)
    b += P("M138,150 Q200,134 262,150 Q200,166 138,150Z", "#e6dcba", INK, 3)
    b += L(200, 146, 200, 120, INK, 3)
    b += P("M200,118 C164,92 180,48 200,26 C204,52 236,70 232,92 C230,108 214,116 200,118Z", GOLD, INK, 3.5)
    b += P("M200,112 C184,96 194,76 202,66 C208,82 220,88 214,100 C210,108 206,110 200,112Z", GOLD2, INK, 2)
    for i in range(8):
        a = -math.pi / 2 + (i - 3.5) * 0.3
        x1, y1 = pol(200, 80, 52, a); x2, y2 = pol(200, 80, 66, a)
        b += L(x1, y1, x2, y2, GOLD, 2.5)
    return svg(400, 410, b)

def crown():
    b = P("M60,300 L44,120 L130,200 L200,74 L270,200 L356,120 L340,300Z", GOLD, INK, 5)
    b += P("M60,300 L340,300 L346,352 L54,352Z", GOLD2, INK, 5)
    b += P("M70,326 L330,326", "none", INK, 2)
    for (x, y) in [(44, 112), (356, 112), (200, 64)]:
        b += C(x, y, 17, CREAM, INK, 4)
    for x, col in [(110, RED), (200, BLUE), (290, RED)]:
        b += P(f"M{x},308 l16,16 l-16,16 l-16,-16Z", col, INK, 3)
    for x in [90, 150, 250, 310]:
        b += C(x, 326, 5, CREAM, INK, 2)
    b += P("M130,200 L120,296 M270,200 L280,296 M200,92 L200,296", "none", INK, 2)
    return svg(400, 380, b)

def hourglass():
    b = P("M90,40 L310,40 L310,64 L90,64Z", GOLD, INK, 5) + P("M90,436 L310,436 L310,460 L90,460Z", GOLD, INK, 5)
    for x in (104, 296):
        b += L(x, 64, x, 436, BARK, 12) + L(x, 64, x, 436, "#a37a52", 6)
    b += P("M118,64 L282,64 C282,150 226,210 214,250 C226,290 282,350 282,436 L118,436 C118,350 174,290 186,250 C174,210 118,150 118,64Z", "#dbe8ee", INK, 4, 'fill-opacity=".55"')
    b += P("M140,64 L260,64 C256,100 236,128 214,150 L186,150 C164,128 144,100 140,64Z", GOLD2, INK, 2, 'fill-opacity=".9"')
    b += L(200, 240, 200, 380, GOLD, 3)
    b += P("M150,436 C160,380 184,360 200,350 C216,360 240,380 250,436Z", GOLD2, INK, 3)
    b += P("M128,64 C130,110 150,150 178,184", "none", "#ffffff", 4, 'opacity=".7"')
    return svg(400, 500, b)

def moth():
    def wing():
        w = P("M200,200 C230,110 330,50 372,92 C392,150 330,206 250,226 Z", "#c9b48a", INK, 4)
        w += P("M200,230 C250,240 332,262 346,320 C330,376 250,330 214,260 Z", "#9c8560", INK, 4)
        w += C(318, 120, 30, CREAM, INK, 3) + C(318, 120, 19, RED, INK, 2) + C(318, 120, 8, INK, INK, 1)
        w += C(300, 306, 18, CREAM, INK, 3) + C(300, 306, 10, BLUE, INK, 2)
        return w
    b = wing() + f'<g transform="translate(400,0) scale(-1,1)">{wing()}</g>'
    b += P("M200,150 C184,180 184,260 200,330 C216,260 216,180 200,150Z", BARK, INK, 4)
    b += C(200, 146, 16, BARK, INK, 4)
    b += P("M192,134 C170,96 150,80 126,78 M208,134 C230,96 250,80 274,78", "none", INK, 3)
    for k in (-1, 1):
        for i in range(7):
            x0 = 200 + k * (18 + 10 * i) * 0.8; y0 = 108 - 4 * i + (0 if i < 3 else 6)
    return svg(400, 360, b)

def mushroom():
    b = P("M158,214 C148,300 140,350 130,388 C170,408 240,408 270,388 C258,350 252,300 244,214Z", CREAM, INK, 4)
    b += P("M120,246 Q200,290 282,246 Q250,226 200,230 Q150,226 120,246Z", "#e9ddb8", INK, 3)
    b += P("M40,206 C36,100 120,40 204,40 C290,40 372,100 366,206 C300,236 108,236 40,206Z", RED, INK, 5)
    for (x, y, r) in [(120, 100, 17), (210, 74, 19), (294, 108, 15), (170, 150, 14), (252, 156, 17), (86, 168, 11), (326, 170, 12), (206, 196, 10)]:
        b += C(x, y, r, "#fffaf0", INK, 2.5)
    for i in range(11):
        x = 60 + i * 29
        b += P(f"M{x},218 Q{x + 6},226 {x + 10},222", "none", INK, 2)
    # a small second mushroom
    b += P("M300,330 C298,360 296,380 294,398 C312,406 338,406 350,398 C344,380 342,360 340,330Z", CREAM, INK, 3)
    b += P("M270,334 C270,296 296,274 322,274 C350,274 372,296 372,334 C340,346 300,346 270,334Z", RED, INK, 4)
    for (x, y, r) in [(300, 302, 7), (334, 296, 8), (352, 322, 5)]:
        b += C(x, y, r, "#fffaf0", INK, 2)
    return svg(400, 420, b)

# ------------------------------------------------------------------ BOTANICAL
def fern():
    p0, p1, p2 = (150, 470), (90, 250), (250, 40)
    b = ""
    N = 22
    for i in range(N):
        t = 0.08 + 0.9 * i / (N - 1)
        x, y, a = bez(p0, p1, p2, t)
        size = 70 * (1 - t) ** 0.9 + 12
        for side in (-1, 1):
            b += leaf(x, y, a + side * 1.15, size, size * 0.22, SAGE if i % 2 else "#8ca076", INK, 1.8, False)
    b += P(f"M{p0[0]},{p0[1]} Q{p1[0]},{p1[1]} {p2[0]},{p2[1]}", "none", INK, 6)
    b += P(f"M{p0[0]},{p0[1]} Q{p1[0]},{p1[1]} {p2[0]},{p2[1]}", "none", "#6b5a3a", 3)
    return svg(340, 500, b)

def laurel():
    p0, p1, p2 = (60, 440), (40, 220), (230, 70)
    b = P(f"M{p0[0]},{p0[1]} Q{p1[0]},{p1[1]} {p2[0]},{p2[1]}", "none", INK, 7)
    b += P(f"M{p0[0]},{p0[1]} Q{p1[0]},{p1[1]} {p2[0]},{p2[1]}", "none", BARK, 3.5)
    for i in range(9):
        t = 0.12 + 0.82 * i / 8
        x, y, a = bez(p0, p1, p2, t)
        ln = 78 - 4 * i
        for side in (-1, 1):
            b += leaf(x, y, a + side * 0.75, ln, ln * 0.2, SAGE if side > 0 else "#8ea274", INK, 2.5)
    x, y, a = bez(p0, p1, p2, 1.0)
    b += leaf(x, y, a, 60, 13, SAGE, INK, 2.5)
    for t in (0.35, 0.5, 0.65):
        x, y, a = bez(p0, p1, p2, t)
        bx, by = x - 20 * math.sin(a), y + 20 * math.cos(a)
        b += L(x, y, bx, by, BARK, 2) + C(f"{bx:.1f}", f"{by + 6:.1f}", 8, PLUM, INK, 2)
    return svg(340, 480, b)

def daisy():
    b = P("M200,260 C196,340 204,400 198,470", "none", INK, 8) + P("M200,260 C196,340 204,400 198,470", "none", SAGE, 4)
    b += leaf(199, 400, -2.5, 90, 20, SAGE) + leaf(201, 350, -0.6, 80, 18, SAGE)
    for i in range(18):
        a = i * math.tau / 18
        x, y = pol(200, 170, 56, a)
        c, s = math.cos(a), math.sin(a)
        tip = pol(200, 170, 128, a)
        l = pol(200, 170, 80, a - 0.2); r = pol(200, 170, 80, a + 0.2)
        d = f"M{x:.1f},{y:.1f} Q{l[0]:.1f},{l[1]:.1f} {tip[0]:.1f},{tip[1]:.1f} Q{r[0]:.1f},{r[1]:.1f} {x:.1f},{y:.1f}Z"
        b += P(d, "#fffaf0", INK, 2.5) + L(x, y, *pol(200, 170, 110, a), "#d8cfb2", 1.2)
    b += C(200, 170, 50, GOLD, INK, 4)
    for i in range(70):
        a = i * 2.39996; r = 3.6 * math.sqrt(i + 1) * 0.95
        if r < 46:
            x, y = pol(200, 170, r, a); b += C(f"{x:.1f}", f"{y:.1f}", 2, "#8a6a1e", "none", 0)
    return svg(400, 490, b)

def poppy_head():
    stem = "M200,250 C190,330 224,400 196,490"
    b = P(stem, "none", INK, 9) + P(stem, "none", SAGE, 5)
    for i in range(12):
        t = 0.2 + i * 0.07
        y = 250 + (490 - 250) * t; x = 200 + (-6 if i % 2 else 6) * (1 - t)
        b += L(x, y, x + (14 if i % 2 else -14), y - 8, SAGE, 1.8)
    b += leaf(196, 420, -2.4, 110, 22, SAGE) + leaf(198, 400, -0.5, 90, 18, "#8ea274")
    b += P("M200,60 C130,60 96,120 100,170 C104,224 150,262 200,262 C250,262 296,224 300,170 C304,120 270,60 200,60Z", "#b8c08a", INK, 5)
    for k in (-2, -1, 0, 1, 2):
        b += P(f"M{200 + k * 18},84 C{200 + k * 46},140 {200 + k * 44},200 {200 + k * 14},258", "none", INK, 2)
    b += P("M104,86 Q200,34 296,86 Q250,98 200,92 Q150,98 104,86Z", "#a8b27a", INK, 4)
    for i in range(10):
        a = math.pi + 0.35 + i * (math.pi - 0.7) / 9
        x, y = pol(200, 92, 96, a)
        b += L(200, 72, x, y * 0.4 + 60, INK, 2)
    b += C(200, 66, 8, "#a8b27a", INK, 3)
    return svg(400, 500, b)

def oak():
    def oakleaf(ox, oy, ang, length):
        c, s = math.cos(ang), math.sin(ang)
        pts_r = []; pts_l = []
        n = 60
        for i in range(n + 1):
            t = i / n
            w = length * 0.2 * (math.sin(math.pi * t) ** 0.6) * (0.78 + 0.32 * math.cos(6.4 * math.pi * t - 0.8))
            u = t * length
            pts_r.append((ox + u * c - w * s, oy + u * s + w * c)); pts_l.append((ox + u * c + w * s, oy + u * s - w * c))
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts_r + pts_l[::-1]) + "Z"
        o = P(d, SAGE, INK, 3.5)
        tip = (ox + length * 0.93 * c, oy + length * 0.93 * s)
        o += L(ox, oy, tip[0], tip[1], INK, 2)
        for i in range(1, 7):
            t = i / 7.4; u = t * length
            for sg in (-1, 1):
                w = length * 0.16 * (math.sin(math.pi * t) ** 0.6)
                o += L(ox + u * c, oy + u * s, ox + (u + w * 0.7) * c - sg * w * s, oy + (u + w * 0.7) * s + sg * w * c, INK, 1.4)
        return o
    b = P("M110,420 C120,360 160,310 214,262", "none", BARK, 7)
    b += oakleaf(214, 262, -1.05, 240)
    b += oakleaf(110, 420, -1.9, 130) if False else ""
    # acorns
    for (x, y, r) in [(120, 380, 0.15), (196, 392, -0.2)]:
        b += f'<g transform="translate({x},{y}) rotate({math.degrees(r)})">'
        b += P("M0,-6 L0,-26", "none", BARK, 4)
        b += P("M-22,2 C-22,40 -10,68 0,78 C10,68 22,40 22,2Z", "#b98a45", INK, 3.5)
        b += P("M-27,6 C-27,-24 27,-24 27,6 C14,12 -14,12 -27,6Z", BARK, INK, 3.5)
        for i in range(-3, 4):
            b += L(i * 7, -12, i * 7 + 3, 7, INK, 1.2)
        b += '</g>'
    return svg(380, 520, b)

def rose():
    b = P("M200,260 C196,340 210,420 196,500", "none", INK, 9) + P("M200,260 C196,340 210,420 196,500", "none", SAGE, 4.5)
    for (x, y) in [(205, 330), (203, 400), (200, 440)]:
        b += L(x, y, x + 12, y - 6, INK, 3)
    b += leaf(200, 420, -2.6, 120, 28, SAGE) + leaf(204, 360, -0.4, 110, 26, "#8ea274")
    b += leaf(200, 250, -2.0, 70, 20, SAGE) + leaf(200, 250, -1.1, 70, 20, SAGE)
    # layered petals, outside in
    petals = [(200, 168, 100, ROSE), (200, 160, 86, "#c4586a"), (196, 152, 70, "#d06f7e"), (204, 150, 54, "#c4586a"), (198, 146, 38, "#d98592"), (202, 142, 22, "#b5495b")]
    for (cx, cy, r, col) in petals:
        b += P(f"M{cx - r},{cy} C{cx - r},{cy - r * 1.05} {cx + r},{cy - r * 1.05} {cx + r},{cy} C{cx + r},{cy + r * .95} {cx - r},{cy + r * .95} {cx - r},{cy}Z", col, INK, 3)
    for (cx, cy, r) in [(200, 160, 86), (196, 152, 70), (204, 150, 54), (198, 146, 38)]:
        b += P(f"M{cx - r * .8},{cy + r * .15} Q{cx},{cy - r * .75} {cx + r * .8},{cy + r * .1}", "none", INK, 2)
    b += P("M190,138 Q204,128 214,142 Q210,154 198,150", "none", INK, 2.5)
    for dx in (-60, -22, 24, 62):
        b += leaf(200 + dx * .3, 262, math.pi / 2 + dx * 0.012, 54, 10, SAGE, INK, 2, False)
    return svg(400, 520, b)

def wheat():
    stalk = "M200,500 C196,380 206,250 196,120"
    b = P(stalk, "none", INK, 8) + P(stalk, "none", "#c9a95a", 4)
    b += leaf(198, 420, -2.35, 150, 18, "#a9b27a") + leaf(200, 370, -0.75, 130, 16, "#a9b27a")
    for i in range(9):
        y = 130 + i * 24
        for side in (-1, 1):
            x = 196 + side * 14
            kern = f'<g transform="translate({x},{y}) rotate({side * 22})">'
            kern += P("M0,0 C-11,-12 -9,-34 0,-48 C9,-34 11,-12 0,0Z", "#e0bf6a", INK, 2.5) + L(0, -4, 0, -40, "#b38a2c", 1.2)
            kern += '</g>'
            b += kern
            b += L(x, y - 20, x + side * 36 + side * 18, y - 112 + i * 2, INK, 1.4)
    b += P("M196,120 C192,100 196,70 196,56 C204,70 202,100 196,120Z", "#e0bf6a", INK, 2.5)
    b += L(196, 56, 196, -4, INK, 1.4)
    return svg(400, 520, b)

# ------------------------------------------------------------------ build
PIECES = [
    ("eye-triangle", "The Eye in the Triangle", "things", ["eye", "triangle", "rays", "esoteric"], eye_triangle),
    ("eye-open", "A Wide Open Eye", "things", ["eye", "lashes", "iris", "esoteric"], eye_open),
    ("moon-face", "A Crescent Moon With a Sleeping Face", "things", ["moon", "face", "crescent", "stars"], moon_face),
    ("sun-face", "A Sun With Its Eyes Shut", "things", ["sun", "face", "rays", "esoteric"], sun_face),
    ("compass-star", "A Compass Star", "things", ["star", "compass", "rose", "navigation"], compass_star),
    ("skeleton-key", "A Skeleton Key", "things", ["key", "skeleton key", "brass"], skeleton_key),
    ("crystal-ball", "A Crystal Ball on Its Stand", "things", ["crystal ball", "scrying", "stars", "esoteric"], crystal_ball),
    ("ouroboros", "The Snake Who Eats Its Tail", "things", ["ouroboros", "snake", "circle", "esoteric"], ouroboros),
    ("triple-moon", "Three Moons in a Row", "things", ["moon", "phases", "crescent", "esoteric"], triple_moon),
    ("oval-frame", "A Gilt Oval Frame With Leaves", "things", ["frame", "oval", "gilt", "ornament"], oval_frame),
    ("banner", "A Blank Red Banner", "things", ["banner", "ribbon", "scroll", "label"], banner),
    ("flourish", "A Small Flourish", "things", ["flourish", "divider", "ornament", "scroll"], flourish),
    ("candle", "A Candle in a Brass Dish", "things", ["candle", "flame", "brass", "light"], candle),
    ("crown", "A Small Gold Crown", "things", ["crown", "gold", "jewels", "royal"], crown),
    ("hourglass", "An Hourglass", "things", ["hourglass", "time", "sand", "glass"], hourglass),
    ("moth", "A Moth With Eyes on Its Wings", "things", ["moth", "wings", "insect", "eyespots"], moth),
    ("mushroom", "Two Red Mushrooms With White Spots", "things", ["mushroom", "fly agaric", "toadstool", "fungus"], mushroom),
    ("fern", "A Fern Frond", "things", ["fern", "frond", "botanical", "leaf"], fern),
    ("laurel", "A Sprig of Laurel With Berries", "things", ["laurel", "sprig", "berries", "botanical"], laurel),
    ("daisy", "A Daisy on Its Stem", "things", ["daisy", "flower", "botanical", "petals"], daisy),
    ("poppy-head", "A Poppy Seed Head", "things", ["poppy", "seed head", "botanical", "stem"], poppy_head),
    ("oak-acorns", "An Oak Leaf and Two Acorns", "things", ["oak", "acorn", "leaf", "botanical"], oak),
    ("rose", "A Rose With Its Leaves", "things", ["rose", "flower", "botanical", "thorns"], rose),
    ("wheat", "A Stalk of Wheat", "things", ["wheat", "grain", "botanical", "harvest"], wheat),
]

def build(only=None):
    from playwright.sync_api import sync_playwright
    os.makedirs("images/cutouts", exist_ok=True)
    lines = []
    with sync_playwright() as p:
        br = p.chromium.launch(); pg = br.new_page(device_scale_factor=2)
        for (id_, title, grp, tags, fn) in PIECES:
            if only and id_ not in only: continue
            s = fn()
            pg.set_content(f'<html><body style="margin:0;background:transparent">{s}</body></html>')
            el = pg.query_selector("svg")
            png = el.screenshot(omit_background=True)
            im = Image.open(io.BytesIO(png)).convert("RGBA")
            bb = im.split()[-1].point(lambda v: 255 if v > 8 else 0).getbbox()
            if bb:
                pad = 10; im = im.crop((max(bb[0] - pad, 0), max(bb[1] - pad, 0), min(bb[2] + pad, im.width), min(bb[3] + pad, im.height)))
            im.thumbnail((900, 900), Image.LANCZOS)
            name = f"orn-{id_}"
            im.save(f"images/cutouts/{name}.webp", quality=92, method=6)
            lines.append(f'    {{ id:"{name}-cut", category:"cutouts", group:"{grp}", title:"{title}", image:"images/cutouts/{name}.webp", w:{im.width}, h:{im.height}, alpha:true, tags:{json.dumps(tags)} }},')
        br.close()
    return lines

if __name__ == "__main__":
    only = set(sys.argv[1:]) or None
    print("\n".join(build(only)))
