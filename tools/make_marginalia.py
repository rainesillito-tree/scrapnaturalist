#!/usr/bin/env python3
"""Makes original marginalia clippings (labels, tags, cards, stamps, notes) as transparent cut-outs.
All text and artwork is drawn here in code, set in open-licence fonts. Run: python3 tools/make_marginalia.py
Writes images/cutouts/mg-*.webp and tools/marginalia_archive_lines.txt"""
import io, os, json
from PIL import Image
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(__file__), "..", "images", "cutouts")
CSS = """
html,body{margin:0;background:transparent}
.wrap{display:inline-block;padding:40px}
.mono{font-family:'Courier 10 Pitch','TeX Gyre Cursor','Liberation Mono',monospace}
.ser{font-family:'Lora','GFS Baskerville',serif}
.sans{font-family:'Inter','Liberation Sans',sans-serif}
.paper{background:#f2e9d2;color:#2a241c;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.hole{position:absolute;width:14px;height:14px;border-radius:50%;background:transparent;box-shadow:inset 0 0 0 2px #b9a98a}
"""
def tag(n, line1, line2):
    return ('<div class="paper mono" style="position:relative;width:200px;padding:58px 20px 22px;text-align:center;'
      'clip-path:polygon(22%% 0,78%% 0,100%% 16%%,100%% 100%%,0 100%%,0 16%%);background:#e6d3a8">'
      '<div style="position:absolute;left:93px;top:18px;width:14px;height:14px;border-radius:50%%;background:#fff;box-shadow:inset 0 0 0 3px #8c7a55"></div>'
      '<div style="font-size:54px;font-weight:700;letter-spacing:-2px">%s</div><div style="border-top:2px solid #8c7a55;margin:10px 0 8px"></div>'
      '<div style="font-size:15px;letter-spacing:.14em;text-transform:uppercase">%s</div><div class="ser" style="font-size:16px;font-style:italic;margin-top:6px">%s</div></div>') % (n, line1, line2)
def label(lines, w=330, rot=-1.5):
    rows = "".join('<div style="display:flex;justify-content:space-between;border-bottom:1px solid #b8a98a;padding:5px 0"><span style="letter-spacing:.12em;font-size:12px;text-transform:uppercase;color:#6b5d44">%s</span><span class="ser" style="font-style:italic;font-size:19px">%s</span></div>' % (a, b) for a, b in lines)
    return '<div class="paper mono" style="width:%dpx;padding:18px 22px 14px;border:3px double #7c6a48;transform:rotate(%sdeg)">%s</div>' % (w, rot, rows)
def card(title, ruled=7):
    rl = "".join('<div style="height:34px;border-bottom:1.5px solid #9db3c9"></div>' for _ in range(ruled))
    return ('<div class="paper" style="width:420px;padding:0;background:#f7f1de;transform:rotate(1.2deg)">'
      '<div class="mono" style="padding:18px 24px 6px;border-bottom:2.5px solid #c46a5a;font-size:22px;letter-spacing:.06em">%s</div>%s</div>') % (title, rl)
def strip(text, n):
    return ('<div class="paper mono" style="display:flex;align-items:center;gap:18px;padding:10px 22px;background:#ede0bd;transform:rotate(-.8deg)">'
      '<span style="font-size:34px;font-weight:700">%s</span><span style="font-size:14px;letter-spacing:.2em;text-transform:uppercase">%s</span></div>') % (n, text)
def ticket(top, mid, no):
    return ('<div class="paper sans" style="position:relative;display:flex;width:390px;height:150px;background:#d9c08b;transform:rotate(-2deg);'
      'border-radius:8px">'
      '<div style="flex:1;padding:18px 22px;border-right:3px dashed #7c6a48"><div style="font-size:13px;letter-spacing:.3em;text-transform:uppercase">%s</div>'
      '<div class="ser" style="font-size:34px;font-style:italic;margin-top:10px">%s</div></div>'
      '<div class="mono" style="width:96px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;writing-mode:vertical-rl">No. %s</div></div>') % (top, mid, no)
def stamp(top, mid, bot, col="#8a2f2a", mark="RS"):
    return ('<svg width="240" height="240" viewBox="0 0 240 240" style="transform:rotate(-9deg)"><g fill="none" stroke="%s" stroke-width="5" opacity=".88">'
      '<circle cx="120" cy="120" r="108"/><circle cx="120" cy="120" r="94" stroke-width="2"/><circle cx="120" cy="120" r="62" stroke-width="2"/></g>'
      '<defs><path id="a%s" d="M28,120 A92,92 0 0 1 212,120"/><path id="b%s" d="M20,120 A100,100 0 0 0 220,120"/></defs>'
      '<g fill="%s" font-family="Courier 10 Pitch,Liberation Mono,monospace" font-weight="700" opacity=".9">'
      '<text font-size="19" letter-spacing="4" text-anchor="middle"><textPath href="#a%s" startOffset="50%%">%s</textPath></text>'
      '<text font-size="19" letter-spacing="4" text-anchor="middle" dy="2"><textPath href="#b%s" startOffset="50%%">%s</textPath></text>'
      '<text x="120" y="128" font-size="30" text-anchor="middle">%s</text></g></svg>') % (col, mid, mid, col, mid, top, mid, bot, mark)
def note(text, rot=2):
    return ('<div class="ser" style="width:300px;padding:26px 28px;background:#f4ecd6;color:#2a241c;font-size:23px;line-height:1.35;font-style:italic;transform:rotate(%sdeg);'
      'box-shadow:0 1px 3px rgba(0,0,0,.25);clip-path:polygon(0 3%%,6%% 0,14%% 2%%,30%% 0,52%% 3%%,71%% 0,90%% 2%%,100%% 0,100%% 97%%,92%% 100%%,70%% 97%%,48%% 100%%,25%% 97%%,8%% 100%%,0 97%%)">%s</div>') % (rot, text)
def numbers(seq):
    return '<div class="mono" style="display:flex;gap:6px;transform:rotate(1deg)">%s</div>' % "".join('<div style="width:58px;height:78px;background:#14110e;color:#f1e8d2;font-size:46px;font-weight:700;display:flex;align-items:center;justify-content:center">%s</div>' % c for c in seq)
ITEMS = [
 ("tag-017", "Specimen Tag, No. 17", tag("17", "found, not taken", "south wall, after rain")),
 ("tag-203", "Specimen Tag, No. 203", tag("203", "unnamed", "kept anyway")),
 ("label-moss", "Field Label, Moss", label([("species", "moss, unsure"), ("place", "the north step"), ("date", "late october"), ("noted by", "R.S.")])),
 ("label-weather", "Field Label, Weather", label([("sky", "pewter, then gold"), ("wind", "from the west"), ("mood", "attentive"), ("seen by", "one crow")], 350, 1.2)),
 ("card-index", "Index Card, Ruled", card("things I noticed")),
 ("card-small", "Index Card, Short", card("kept for later", 4)),
 ("strip-cat", "Catalogue Strip, 0412", strip("uncatalogued", "0412")),
 ("strip-found", "Catalogue Strip, Found", strip("found on the path", "A.7")),
 ("ticket-admit", "Ticket Stub, Admit One", ticket("admit one", "the slow hour", "0038")),
 ("ticket-return", "Ticket Stub, Return", ticket("return, any day", "to the garden", "1121")),
 ("stamp-red", "Postmark, Red", stamp("LUMINARIUM", "r", "FIELD NOTE")),
 ("stamp-blue", "Postmark, Blue", stamp("EVENING POST", "b", "NO. 9", "#2f4b63", "9")),
 ("note-listen", "Torn Note, Listen", note("listen for the small thing under the loud thing.")),
 ("note-stay", "Torn Note, Stay", note("stay a little longer than is comfortable. that is where it is.", -2)),
 ("note-map", "Torn Note, Where", note("where I was standing when I noticed: <b>here</b>, more or less.", 1.5)),
 ("numbers-ten", "Numbers, Black Tiles", numbers("0123")),
 ("numbers-year", "Numbers, Year Tiles", numbers("1927")),
]
def main():
    lines = []
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 900, "height": 700}, device_scale_factor=2)
        for k, title, html in ITEMS:
            pg.set_content("<style>%s</style><div class='wrap' id='w'>%s</div>" % (CSS, html))
            png = pg.locator("#w").screenshot(omit_background=True)
            im = Image.open(io.BytesIO(png)).convert("RGBA"); bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
            im = im.crop((max(0, bb[0] - 6), max(0, bb[1] - 6), min(im.width, bb[2] + 6), min(im.height, bb[3] + 6)))
            name = "mg-" + k
            im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=90, method=6)
            lines.append('    { id:"%s-cut", category:"ephemera", title:%s, image:"images/cutouts/%s.webp", w:%d, h:%d, alpha:true, tags:["label", "note", "paper", "ephemera"] },' % (name, json.dumps(title), name, im.width // 2, im.height // 2))
        b.close()
    open(os.path.join(os.path.dirname(__file__), "marginalia_archive_lines.txt"), "w").write("\n".join(lines) + "\n")
    print(len(lines))
main()
