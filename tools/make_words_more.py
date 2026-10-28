#!/usr/bin/env python3
"""Makes the Scrap Naturalist's word clippings: magazine-style words and short lines, cut out on transparent paper.

The words are plain text set in open-licence fonts (Lora, Inter, Liberation, GFS Baskerville, Courier, DejaVu),
so the clippings are free to use. Run:  python3 tools/make_words.py
Writes images/cutouts/wd-*.webp and prints the archive.js lines (also saved to tools/words2_archive_lines.txt).
Needs: playwright (with chromium) and Pillow.
"""
import io, os, random, re, json
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(__file__), "..", "images", "cutouts")
os.makedirs(OUT, exist_ok=True)

WORDS = "and the if we you I me us of in to or but so yet not is are will be with without for from into through within beyond toward because maybe perhaps possibility possible dreams hope joy trust grace courage believe begin become belong breathe rest play create imagine curious brave open light dark sky sea river stone tree seed root wings fire rain snow sun moon star stars night day morning dusk dawn home heart soul spirit mind body hands eyes voice story song poem word words name time memory yesterday tomorrow today together alone who what where when why how yes no please welcome more less all one two three every each some any other another same different old young strange beautiful kind soft loud still slow fast deep wide high low close far near and and the the if if we we you you love Love Dream DREAMS WE YOU IF AND THE OF".split()
LINES = []

STYLES = ["news","black","red","label","type","halo","ransom","blue","kraft","sage"]

CSS = """
html,body{margin:0;background:transparent}
.wrap{display:inline-block;padding:44px}
.clip{display:inline-block;position:relative;white-space:nowrap}
.news{background:#efe6cf;color:#1d1812;font-family:'Lora','GFS Baskerville',serif;padding:.22em .5em .26em}
.black{background:#14110e;color:#f1e8d2;font-family:'Inter','Liberation Sans',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:.28em .55em}
.red{background:#9b2f2a;color:#f6ebd3;font-family:'Lora',serif;font-style:italic;font-weight:600;padding:.2em .55em .26em}
.label{background:#fbf8ef;color:#222;font-family:'Inter','Liberation Sans',sans-serif;font-weight:500;text-transform:uppercase;letter-spacing:.32em;padding:.5em .8em .5em 1.1em}
.type{background:#f4efdf;color:#2a2622;font-family:'Courier 10 Pitch','Courier','Liberation Mono',monospace;font-weight:700;padding:.3em .55em}
.halo{background:transparent;color:#1b1713;font-family:'Lora','GFS Baskerville',serif;font-weight:700;padding:.05em .12em;
  -webkit-text-stroke:.16em #f7f1e0;paint-order:stroke fill;text-shadow:0 0 0 #f7f1e0}
.blue{background:#2f4b63;color:#f1ead6;font-family:'GFS Baskerville','Lora',serif;text-transform:uppercase;letter-spacing:.14em;padding:.3em .6em}
.kraft{background:#c9a46e;color:#2a1c10;font-family:'Liberation Serif','Lora',serif;font-weight:700;font-style:italic;padding:.2em .55em .26em}
.sage{background:#aebb95;color:#1f2a1a;font-family:'Inter','Liberation Sans',sans-serif;font-weight:300;letter-spacing:.02em;padding:.25em .55em .3em}
.ransom{background:transparent;padding:0;font-size:1em}
.ransom span{display:inline-block;margin:0 .02em;padding:.1em .22em .14em;line-height:1}
"""

RANSOM_FONTS = [("Lora","700","normal"),("Inter","800","normal"),("GFS Baskerville","400","normal"),("Liberation Serif","700","italic"),
                ("Courier 10 Pitch","700","normal"),("DejaVu Serif","700","normal"),("Inter","300","normal")]
RANSOM_BG = [("#f1e8d0","#1d1812"),("#14110e","#f1e8d0"),("#9b2f2a","#f6ebd3"),("#2f4b63","#f1ead6"),("#fbf8ef","#222"),("#c9a46e","#2a1c10"),("#aebb95","#1f2a1a"),("#e6c85e","#2a2210")]

def slug(t): return re.sub(r"[^a-z0-9]+","-",t.lower()).strip("-")

def build(text, style, rnd):
    size = rnd.choice([54,62,70,78,88]) if len(text) < 12 else rnd.choice([40,46,52,58])
    rot = rnd.uniform(-3.2, 3.2)
    if style == "ransom":
        letters = "".join(
            '<span style="font-family:\'%s\';font-weight:%s;font-style:%s;background:%s;color:%s;font-size:%.2fem;transform:rotate(%.1fdeg) translateY(%.2fem)">%s</span>' % (
                f[0], f[1], f[2], bg[0], bg[1], rnd.choice([.8,.95,1,1.1,1.2]), rnd.uniform(-5,5), rnd.uniform(-.06,.08), ("&nbsp;" if ch == " " else ch))
            for ch in text for f, bg in [(rnd.choice(RANSOM_FONTS), rnd.choice(RANSOM_BG))])
        inner = '<div class="clip ransom" style="font-size:%dpx;transform:rotate(%.1fdeg)">%s</div>' % (size, rot, letters)
        return inner
    txt = text.upper() if style in ("blue",) else text
    return '<div class="clip %s tear" style="font-size:%dpx;transform:rotate(%.1fdeg)">%s</div>' % (style, size, rot, txt.replace("&","&amp;"))

TEAR_JS = """(seed)=>{
  let s=seed; const r=()=>{s=(s*9301+49297)%233280;return s/233280;};
  document.querySelectorAll('.tear').forEach(el=>{
    if(el.classList.contains('halo')) return;
    const w=el.offsetWidth,h=el.offsetHeight,pts=[],step=14,j=3.2;
    for(let x=0;x<=w;x+=step) pts.push([x+(r()-.5)*2, (r()*j)]);
    for(let y=0;y<=h;y+=step) pts.push([w-(r()*j), y+(r()-.5)*2]);
    for(let x=w;x>=0;x-=step) pts.push([x+(r()-.5)*2, h-(r()*j)]);
    for(let y=h;y>=0;y-=step) pts.push([(r()*j), y+(r()-.5)*2]);
    el.style.clipPath='polygon('+pts.map(p=>p[0].toFixed(1)+'px '+p[1].toFixed(1)+'px').join(',')+')';
  });}"""

def main():
    rnd = random.Random(7041)
    items, seen = [], set()
    for w in WORDS:
        key = w if (w.isupper() and len(w) > 1) or w[0].isupper() else w
        nm = "wd-%s" % slug(w) + ("-caps" if w.isupper() and len(w) > 1 else "-cap" if w[0].isupper() else "")
        if nm in seen or os.path.exists(os.path.join(OUT, slug(w) and ("wd-%s.webp" % slug(w)))) and nm == "wd-%s" % slug(w): continue
        seen.add(nm); items.append((w, "word"))
    lines_out = []
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width":1600,"height":500}, device_scale_factor=2)
        for i, (text, kind) in enumerate(items):
            style = STYLES[(i + 3) % len(STYLES)] if i % 6 else "ransom"
            if style == "ransom" and len(text) > 14: style = "news"
            if style == "halo" and text.isupper(): style = "black"
            pg.set_content("<style>%s</style><div class='wrap' id='w'>%s</div>" % (CSS, build(text, style, rnd)))
            pg.evaluate(TEAR_JS, 1000 + i * 37)
            png = pg.locator("#w").screenshot(omit_background=True)
            im = Image.open(io.BytesIO(png)).convert("RGBA"); bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
            if not bb: continue
            im = im.crop((max(0,bb[0]-6), max(0,bb[1]-6), min(im.width,bb[2]+6), min(im.height,bb[3]+6)))
            name = "wd-%s" % slug(text) + ("-caps" if text.isupper() and len(text) > 1 else "-cap" if text[0].isupper() else "")
            im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=90, method=6)
            title = text if kind == "word" else text
            tags = ["word", "magazine", "clipping"] + [t for t in re.findall(r"[a-z]+", text.lower()) if len(t) > 2][:3]
            lines_out.append('    { id:"%s-cut", category:"words", group:"%s", title:%s, image:"images/cutouts/%s.webp", w:%d, h:%d, alpha:true, tags:%s },' % (
                name, "single" if kind == "word" else "lines", json.dumps("“" + title + "”", ensure_ascii=False), name, im.width // 2, im.height // 2, json.dumps(tags)))
        b.close()
    open(os.path.join(os.path.dirname(__file__), "words2_archive_lines.txt"), "w").write("\n".join(lines_out) + "\n")
    print(len(lines_out), "clippings")

main()
