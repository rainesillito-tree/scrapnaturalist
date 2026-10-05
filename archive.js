/* ============================================================
   THE SCRAP NATURALIST — archive.js
   The collection. Everything the app browses lives here.

   TO ADD YOUR OWN IMAGES
   Scroll to the bottom, find MY_IMAGES, and add entries:

     { id:"moon-07", category:"celestial", title:"Moon, Cropped",
       image:"images/moon-07.jpg", tags:["moon","night"] }

   `image` can be a relative path, a URL, or a data: URI.
   w / h (pixel size) are optional; the app reads them from the file.
   Categories: landscapes, architecture, people, botanical,
               celestial, objects, ephemera, print

   The demo pages below are drawn in code (no photos, no AI).
   They exist so the tool works the moment you open it. Delete
   them (set USE_DEMO = false at the bottom) once your own
   library is in.
   ============================================================ */
(function () {
  "use strict";

  var CATEGORIES = [
    { id: "cutouts",      label: "LOOSE SPECIMENS", subs: "already cut free · figures · statues · arches · beasts · telephones · mirrors", groups: [["figures", "CREATURES, HUMAN"], ["things", "THINGS & RUINS"]] },
    { id: "landscapes",   label: "TERRAIN",         subs: "deserts · glaciers · lakes · forests · coasts · uncertain horizons · weather" },
    { id: "architecture", label: "RUINS & THRESHOLDS", subs: "arches · doors · windows · churches · towers · columns · harbours" },
    { id: "people",       label: "THE HUMAN ANIMAL", subs: "portraits · hats · hands · groups · poses · silhouettes" },
    { id: "botanical",    label: "THE HERBARIUM",   subs: "flowers · leaves · branches · mushrooms · seed pods · strange plants · vines" },
    { id: "celestial",    label: "NIGHT WATCH",     subs: "moons · suns · stars · planets · eclipses · constellations · night skies" },
    { id: "objects",      label: "CURIOS",          subs: "clocks · keys · chairs · books · vessels · eyes · mirrors · tools" },
    { id: "ephemera",     label: "MARGINALIA", subs: "notes · diagrams · stamps · maps · labels · numbers · type · newsprint" },
    { id: "print",        label: "PLATES & ENGRAVINGS", subs: "cyanotype · sepia · red & black · photocopy · engraving · woodcut" },
    { id: "found",       label: "PICKED UP ALONG THE WAY", subs: "borrowed from the wider field" }
  ];

  var CONSTRAINTS = [
    "a moon, a building, and one person who is not sure why they are there",
    "only blue, cream and black, the colours of a good evening",
    "something living, something mechanical, something that is mostly sky",
    "three specimens, no more. be strict. be tender.",
    "nothing taller than a door",
    "one eye, somewhere it has no business being",
    "a doorway that opens onto weather",
    "only circles and arches",
    "something very small beside something very large; let them regard each other",
    "a garden with no ground",
    "a hand holding something it should not be able to hold",
    "two moons, one of them wrong",
    "only rust, ochre and charcoal, the colours of a field book",
    "a figure with its back turned, listening"
  ];

  /* ---------- tiny helpers ---------- */
  var _n = 0;
  function uid(p) { return p + (++_n); }
  function f(n) { return Math.round(n * 10) / 10; }
  function rng(seed) { var s = (seed | 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function roman(n) {
    var m = [[40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], s = "";
    m.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
    return s;
  }
  function grad(c1, c2) {
    var id = uid("g");
    return ['<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>', "url(#" + id + ")"];
  }
  function rgrad(c1, c2, stops) {
    var id = uid("r");
    return ['<radialGradient id="' + id + '"><stop offset="' + (stops || 0) + '" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></radialGradient>', "url(#" + id + ")"];
  }
  function hatch(id, col, sp, ang, op, sw) {
    return '<pattern id="' + id + '" width="' + sp + '" height="' + sp + '" patternUnits="userSpaceOnUse" patternTransform="rotate(' + ang + ')"><line x1="0" y1="0" x2="0" y2="' + sp + '" stroke="' + col + '" stroke-width="' + (sw || 1) + '" opacity="' + op + '"/></pattern>';
  }
  function ridge(w, y0, amp, ph, fill, h) {
    var d = "M0," + h;
    for (var i = 0; i <= 48; i++) {
      var x = w * i / 48, t = x / w;
      var y = y0 + amp * (Math.sin(t * 3 + ph) * 0.5 + Math.sin(t * 7 + ph * 2) * 0.3 + Math.sin(t * 15 + ph * 3) * 0.2);
      d += " L" + f(x) + "," + f(y);
    }
    return '<path d="' + d + " L" + w + "," + h + 'Z" fill="' + fill + '"/>';
  }
  function jag(R, w, y0, amp, fill, h, n) {
    var d = "M0," + h + " L0," + f(y0), seg = w / n;
    for (var i = 0; i < n; i++) {
      d += " L" + f((i + 0.3 + 0.4 * R()) * seg) + "," + f(y0 - amp * (0.4 + 0.6 * R()));
      d += " L" + f((i + 1) * seg) + "," + f(y0 + amp * 0.2 * R());
    }
    return '<path d="' + d + " L" + w + "," + h + 'Z" fill="' + fill + '"/>';
  }
  function archPath(cx, by, w, h) {
    var r = w / 2;
    return "M" + f(cx - r) + "," + f(by) + " L" + f(cx - r) + "," + f(by - h + r) + " A" + f(r) + "," + f(r) + " 0 0 1 " + f(cx + r) + "," + f(by - h + r) + " L" + f(cx + r) + "," + f(by) + "Z";
  }
  function star4(cx, cy, r, fill, op) {
    var k = r * 0.18;
    return '<path d="M' + f(cx) + "," + f(cy - r) + " Q" + f(cx + k) + "," + f(cy - k) + " " + f(cx + r) + "," + f(cy) + " Q" + f(cx + k) + "," + f(cy + k) + " " + f(cx) + "," + f(cy + r) + " Q" + f(cx - k) + "," + f(cy + k) + " " + f(cx - r) + "," + f(cy) + " Q" + f(cx - k) + "," + f(cy - k) + " " + f(cx) + "," + f(cy - r) + 'Z" fill="' + fill + '" opacity="' + (op == null ? 1 : op) + '"/>';
  }
  function cloud(cx, cy, s, fill, op) {
    return '<g fill="' + fill + '" opacity="' + (op == null ? 1 : op) + '"><ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(s) + '" ry="' + f(s * 0.28) + '"/><ellipse cx="' + f(cx - s * 0.4) + '" cy="' + f(cy - s * 0.12) + '" rx="' + f(s * 0.45) + '" ry="' + f(s * 0.26) + '"/><ellipse cx="' + f(cx + s * 0.25) + '" cy="' + f(cy - s * 0.2) + '" rx="' + f(s * 0.5) + '" ry="' + f(s * 0.3) + '"/></g>';
  }
  var SERIF = "Georgia,'Times New Roman',serif";

  /* ---------- colour schemes (duotone / print) ---------- */
  var SCHEMES = {
    warm:    { paper: "#eadfc4", bg: "#d8c7a0", ink: "#2a2926", a: "#a45838", b: "#c29a43", c: "#6c8594", d: "#788a68" },
    cool:    { paper: "#e9e3cf", bg: "#d9d2b8", ink: "#2a2926", a: "#6c8594", b: "#788a68", c: "#c29a43", d: "#a5453d" },
    cyan:    { paper: "#e4e0cf", bg: "#1f4a73", ink: "#10263d", a: "#4b7fae", b: "#2d5f8f", c: "#9dbad0", d: "#e4e0cf" },
    sepia:   { paper: "#e6d6b2", bg: "#d6bd8f", ink: "#3f2b1a", a: "#8a5e36", b: "#b68a55", c: "#6b4a2b", d: "#c9a46f" },
    redblack:{ paper: "#e8dcc2", bg: "#dccfb0", ink: "#1f1d1b", a: "#a5322d", b: "#1f1d1b", c: "#a5322d", d: "#1f1d1b" },
    bw:      { paper: "#ebe5d3", bg: "#d4cebb", ink: "#1e1d1b", a: "#55524c", b: "#8a867c", c: "#aaa597", d: "#33312d" },
    blue:    { paper: "#e9e3cf", bg: "#dcd6bd", ink: "#2c4660", a: "#4f7390", b: "#8fa9b8", c: "#2c4660", d: "#6c8594" }
  };

  var SIZES = { p: [600, 800], l: [800, 600], s: [700, 700] };

  /* ---------- scenes: (w, h, palette, rng) -> svg markup ---------- */
  var S = {};

  S.desert = function (w, h, P, R) {
    var hy = h * 0.55, g = grad(P.a, P.bg);
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' +
      '<circle cx="' + w * 0.68 + '" cy="' + (hy - h * 0.14) + '" r="' + w * 0.09 + '" fill="' + P.b + '"/>' +
      jag(R, w, hy - h * 0.02, h * 0.12, P.c, h, 9) + ridge(w, hy, h * 0.05, 3, P.b, h) +
      ridge(w, hy + h * 0.12, h * 0.07, 7, P.a, h) + ridge(w, hy + h * 0.26, h * 0.08, 11, P.ink, h) +
      '<path d="M' + w * 0.2 + "," + h * 0.9 + " l8,-26 l4,0 l3,26z" + '" fill="' + P.paper + '"/>';
  };

  S.mountains = function (w, h, P, R) {
    var g = grad(P.bg, P.b), hp = uid("h");
    return "<defs>" + g[0] + hatch(hp, P.ink, 4, 60, 0.5) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' +
      '<circle cx="' + w * 0.25 + '" cy="' + h * 0.2 + '" r="' + w * 0.07 + '" fill="' + P.paper + '"/>' +
      jag(R, w, h * 0.55, h * 0.3, P.c, h, 6) + jag(R, w, h * 0.68, h * 0.28, P.a, h, 5) +
      '<rect y="' + h * 0.6 + '" width="' + w + '" height="' + h * 0.4 + '" fill="url(#' + hp + ')"/>' +
      jag(R, w, h * 0.86, h * 0.22, P.ink, h, 4);
  };

  S.forest = function (w, h, P, R) {
    var g = grad(P.bg, P.paper), t = "";
    for (var row = 0; row < 6; row++) {
      var y = h * (0.42 + row * 0.11), sz = h * (0.09 + row * 0.04), n = 7 + row, col = row < 2 ? P.c : row < 4 ? P.d : P.ink;
      for (var i = 0; i < n; i++) {
        var x = (i + R() * 0.8) * w / n;
        for (var k = 0; k < 3; k++) {
          var yy = y - k * sz * 0.38, ww = sz * (0.62 - k * 0.14);
          t += '<path d="M' + f(x) + "," + f(yy - sz * 0.55) + " L" + f(x + ww) + "," + f(yy) + " L" + f(x - ww) + "," + f(yy) + 'Z" fill="' + col + '"/>';
        }
        t += '<rect x="' + f(x - sz * 0.04) + '" y="' + f(y) + '" width="' + f(sz * 0.08) + '" height="' + f(sz * 0.2) + '" fill="' + P.ink + '"/>';
      }
      t += '<rect x="0" y="' + f(y + sz * 0.1) + '" width="' + w + '" height="' + f(h * 0.05) + '" fill="' + P.paper + '" opacity=".3"/>';
    }
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/><circle cx="' + w * 0.7 + '" cy="' + h * 0.2 + '" r="' + w * 0.08 + '" fill="' + P.a + '"/>' + t;
  };

  S.ocean = function (w, h, P, R) {
    var g = grad(P.a, P.bg), l = "";
    for (var i = 0; i < 34; i++) {
      var y = h * 0.55 + i * h * 0.0135 * (1 + i * 0.06), amp = 2 + i * 0.35, len = 30 + i * 6, d = "M0," + f(y);
      for (var x = 0; x <= w + len; x += len) d += " q" + f(len / 4) + "," + f(-amp) + " " + f(len / 2) + ",0 t" + f(len / 2) + ",0";
      l += '<path d="' + d + '" fill="none" stroke="' + (i % 3 ? P.ink : P.paper) + '" stroke-width="' + f(1 + i * 0.05) + '" opacity="' + f(0.25 + i * 0.015) + '"/>';
    }
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/><circle cx="' + w * 0.5 + '" cy="' + h * 0.3 + '" r="' + w * 0.12 + '" fill="' + P.paper + '"/>' +
      '<rect y="' + h * 0.55 + '" width="' + w + '" height="' + h * 0.45 + '" fill="' + P.c + '" opacity=".85"/>' +
      '<rect x="' + (w * 0.5 - w * 0.03) + '" y="' + h * 0.56 + '" width="' + w * 0.06 + '" height="' + h * 0.22 + '" fill="' + P.paper + '" opacity=".55"/>' + l;
  };

  S.horizon = function (w, h, P, R) {
    var out = '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' +
      '<rect y="' + h * 0.52 + '" width="' + w + '" height="' + h * 0.48 + '" fill="' + P.a + '"/>' +
      '<rect y="' + h * 0.18 + '" width="' + w + '" height="' + h * 0.12 + '" fill="' + P.c + '"/>' +
      '<circle cx="' + w * 0.5 + '" cy="' + h * 0.52 + '" r="' + w * 0.2 + '" fill="' + P.paper + '"/>' +
      '<rect x="' + (w * 0.5 - 1) + '" y="0" width="2" height="' + h + '" fill="' + P.ink + '"/>' +
      '<path d="' + archPath(w * 0.5, h * 0.9, w * 0.07, h * 0.16) + '" fill="' + P.ink + '"/>' +
      '<path d="M' + w * 0.2 + "," + h * 0.12 + " l24,-44 l24,44z" + '" fill="' + P.ink + '"/>';
    for (var i = 0; i < 9; i++) out += star4(R() * w, R() * h * 0.16, 4 + R() * 6, P.paper);
    return out;
  };

  S.ruins = function (w, h, P, R) {
    var g = grad(P.a, P.bg), t = "", hp = uid("h");
    [[0.16, 0.5], [0.34, 0.34], [0.62, 0.46], [0.82, 0.28]].forEach(function (c) {
      var x = w * c[0], top = h * (0.74 - c[1]), cw = w * 0.07;
      t += '<path d="M' + f(x - cw) + "," + h * 0.78 + " L" + f(x - cw) + "," + f(top + 10) + " L" + f(x - cw * 0.4) + "," + f(top - 8) + " L" + f(x + cw * 0.1) + "," + f(top + 12) + " L" + f(x + cw) + "," + f(top - 4) + " L" + f(x + cw) + "," + h * 0.78 + 'Z" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="1.5"/>';
      t += '<rect x="' + f(x - cw) + '" y="' + f(top) + '" width="' + f(cw * 2) + '" height="' + f(h * 0.78 - top) + '" fill="url(#' + hp + ')"/>';
    });
    return "<defs>" + g[0] + hatch(hp, P.ink, 7, 90, 0.4) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' +
      '<circle cx="' + w * 0.5 + '" cy="' + h * 0.25 + '" r="' + w * 0.1 + '" fill="' + P.b + '"/>' + ridge(w, h * 0.74, h * 0.03, 2, P.d, h) +
      '<rect y="' + h * 0.78 + '" width="' + w + '" height="' + h * 0.22 + '" fill="' + P.ink + '"/>' + t +
      '<ellipse cx="' + w * 0.5 + '" cy="' + h * 0.85 + '" rx="' + w * 0.12 + '" ry="' + h * 0.025 + '" fill="' + P.paper + '"/>' +
      '<path d="' + archPath(w * 0.5, h * 0.78, w * 0.16, h * 0.3) + '" fill="none" stroke="' + P.paper + '" stroke-width="5" opacity=".8"/>';
  };

  S.field = function (w, h, P, R) {
    var hy = h * 0.42, g = grad(P.c, P.bg), t = "";
    for (var k = 0; k < 11; k++) {
      var y1 = hy + (h - hy) * Math.pow(k / 11, 1.8), y2 = hy + (h - hy) * Math.pow((k + 1) / 11, 1.8);
      t += '<rect y="' + f(y1) + '" width="' + w + '" height="' + f(y2 - y1 + 1) + '" fill="' + (k % 2 ? P.d : P.b) + '"/>';
    }
    for (var i = -14; i <= 14; i++) t += '<line x1="' + w / 2 + '" y1="' + hy + '" x2="' + f(w / 2 + i * w * 0.14) + '" y2="' + h + '" stroke="' + P.ink + '" stroke-width="1.5" opacity=".5"/>';
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' +
      '<circle cx="' + w * 0.3 + '" cy="' + hy * 0.5 + '" r="' + w * 0.07 + '" fill="' + P.paper + '"/>' + cloud(w * 0.7, hy * 0.45, w * 0.14, P.paper, 0.8) + t;
  };

  S.skies = function (w, h, P, R) {
    var g = grad(P.c, P.bg), t = "";
    for (var i = 0; i < 9; i++) t += cloud(R() * w, h * (0.1 + i * 0.1), w * (0.15 + R() * 0.22), i % 2 ? P.paper : P.a, 0.85);
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' + t;
  };

  S.archPortal = function (w, h, P, R) {
    var g = grad(P.c, P.bg), cx = w / 2, by = h * 0.86, out = "";
    out += '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>';
    [[0.74, P.a], [0.64, P.b], [0.54, P.paper], [0.44, P.ink]].forEach(function (c, i) {
      out += '<path d="' + archPath(cx, by, w * c[0], h * (0.82 - i * 0.07)) + '" fill="' + c[1] + '"/>';
    });
    out += '<path d="' + archPath(cx, by, w * 0.36, h * 0.54) + '" fill="' + g[1] + '"/>';
    out += '<circle cx="' + cx + '" cy="' + h * 0.42 + '" r="' + w * 0.07 + '" fill="' + P.paper + '"/>';
    out += '<path d="M' + (cx - 5) + "," + by + " l5,-34 l5,34z" + '" fill="' + P.ink + '"/><circle cx="' + cx + '" cy="' + (by - 38) + '" r="4" fill="' + P.ink + '"/>';
    for (var i = 0; i < 6; i++) out += '<rect x="' + f(w * (0.1 + i * 0.015)) + '" y="' + f(by + i * h * 0.02) + '" width="' + f(w * (0.8 - i * 0.03)) + '" height="' + f(h * 0.016) + '" fill="' + (i % 2 ? P.paper : P.ink) + '"/>';
    return "<defs>" + g[0] + "</defs>" + out;
  };

  S.door = function (w, h, P, R) {
    var bp = uid("b"), cx = w / 2, by = h * 0.82;
    return '<defs><pattern id="' + bp + '" width="46" height="22" patternUnits="userSpaceOnUse"><rect width="46" height="22" fill="' + P.b + '"/><path d="M0,0H46M0,11H46M23,0V11M0,11V22M46,11V22" stroke="' + P.ink + '" stroke-width="1.2" opacity=".5" fill="none"/></pattern></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + bp + ')"/>' +
      '<path d="' + archPath(cx, by, w * 0.46, h * 0.62) + '" fill="' + P.paper + '"/>' +
      '<path d="' + archPath(cx, by, w * 0.4, h * 0.58) + '" fill="' + P.a + '"/>' +
      '<rect x="' + (cx - 2) + '" y="' + h * 0.22 + '" width="4" height="' + (by - h * 0.22) + '" fill="' + P.ink + '" opacity=".7"/>' +
      '<circle cx="' + (cx + w * 0.06) + '" cy="' + h * 0.55 + '" r="7" fill="' + P.b + '" stroke="' + P.ink + '"/>' +
      '<path d="M' + (cx - w * 0.2) + "," + by + " L" + (cx + w * 0.2) + "," + by + " L" + (cx + w * 0.34) + "," + h + " L" + (cx - w * 0.34) + "," + h + 'Z" fill="' + P.ochreLight + '" opacity=".0"/>' +
      '<rect y="' + by + '" width="' + w + '" height="' + (h - by) + '" fill="' + P.ink + '"/>' +
      '<path d="M' + (cx - w * 0.2) + "," + by + " L" + (cx + w * 0.2) + "," + by + " L" + (cx + w * 0.3) + "," + h + " L" + (cx - w * 0.3) + "," + h + 'Z" fill="' + P.paper + '" opacity=".65"/>';
  };

  S.windows = function (w, h, P, R) {
    var out = '<rect width="' + w + '" height="' + h + '" fill="' + P.a + '"/>', cols = 4, rows = 6;
    var cw = w / cols, rh = (h - h * 0.12) / rows;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = c * cw + cw * 0.22, y = h * 0.1 + r * rh + rh * 0.15, ww = cw * 0.56, hh = rh * 0.7, lit = R() > 0.65;
      out += '<path d="' + archPath(x + ww / 2, y + hh, ww, hh) + '" fill="' + (lit ? P.b : P.ink) + '"/>';
      out += '<path d="M' + f(x + ww / 2) + "," + f(y) + " V" + f(y + hh) + " M" + f(x) + "," + f(y + hh * 0.6) + " H" + f(x + ww) + '" stroke="' + P.paper + '" stroke-width="2"/>';
    }
    return out + '<rect width="' + w + '" height="' + h * 0.07 + '" fill="' + P.ink + '"/>';
  };

  S.tower = function (w, h, P, R) {
    var g = grad(P.c, P.paper), hp = uid("h"), cx = w / 2, t = "";
    for (var i = 0; i < 6; i++) t += '<rect x="' + (cx - w * 0.03) + '" y="' + f(h * (0.35 + i * 0.09)) + '" width="' + w * 0.06 + '" height="' + h * 0.04 + '" fill="' + P.ink + '"/>';
    var out = "<defs>" + g[0] + hatch(hp, P.ink, 5, 90, 0.35) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' + cloud(w * 0.2, h * 0.3, w * 0.15, P.paper, 0.8) + cloud(w * 0.82, h * 0.55, w * 0.18, P.paper, 0.7);
    out += '<rect x="' + (cx - w * 0.14) + '" y="' + h * 0.25 + '" width="' + w * 0.28 + '" height="' + h * 0.75 + '" fill="' + P.b + '"/>';
    out += '<rect x="' + (cx - w * 0.14) + '" y="' + h * 0.25 + '" width="' + w * 0.28 + '" height="' + h * 0.75 + '" fill="url(#' + hp + ')"/>';
    out += '<path d="M' + (cx - w * 0.18) + "," + h * 0.25 + " L" + cx + "," + h * 0.04 + " L" + (cx + w * 0.18) + "," + h * 0.25 + 'Z" fill="' + P.a + '"/>' + t;
    out += '<path d="' + archPath(cx, h * 0.46, w * 0.1, h * 0.12) + '" fill="' + P.ink + '"/>';
    for (var k = 0; k < 4; k++) { var bx = w * (0.15 + R() * 0.2), by = h * (0.1 + R() * 0.2); out += '<path d="M' + f(bx) + "," + f(by) + " q8,-9 16,0 q8,-9 16,0" + '" fill="none" stroke="' + P.ink + '" stroke-width="2"/>'; }
    return out;
  };

  S.stairs = function (w, h, P, R) {
    var out = '<rect width="' + w + '" height="' + h + '" fill="' + P.ink + '"/>';
    out += '<path d="' + archPath(w / 2, h * 0.36, w * 0.22, h * 0.3) + '" fill="' + P.paper + '"/>';
    for (var i = 0; i < 11; i++) {
      var t = i / 11, ww = w * (1 - 0.82 * t), y = h * 0.97 - h * 0.62 * (1 - Math.pow(1 - t, 1.6)), rh = h * 0.055 * (1 - t * 0.6);
      out += '<rect x="' + f(w / 2 - ww / 2) + '" y="' + f(y) + '" width="' + f(ww) + '" height="' + f(rh) + '" fill="' + P.b + '"/>';
      out += '<rect x="' + f(w / 2 - ww / 2) + '" y="' + f(y - rh * 0.5) + '" width="' + f(ww) + '" height="' + f(rh * 0.5 + 1) + '" fill="' + P.paper + '" opacity="' + f(0.95 - t * 0.5) + '"/>';
    }
    return out;
  };

  S.columns = function (w, h, P, R) {
    var g = grad(P.c, P.bg), hp = uid("h"), out = "";
    out += '<path d="M' + w * 0.06 + "," + h * 0.3 + " L" + w * 0.5 + "," + h * 0.12 + " L" + w * 0.94 + "," + h * 0.3 + 'Z" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/>';
    out += '<rect x="' + w * 0.06 + '" y="' + h * 0.3 + '" width="' + w * 0.88 + '" height="' + h * 0.06 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="2"/>';
    for (var i = 0; i < 6; i++) {
      var x = w * (0.09 + i * 0.155);
      out += '<rect x="' + f(x) + '" y="' + h * 0.36 + '" width="' + w * 0.09 + '" height="' + h * 0.5 + '" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="1.5"/>';
      out += '<rect x="' + f(x) + '" y="' + h * 0.36 + '" width="' + w * 0.09 + '" height="' + h * 0.5 + '" fill="url(#' + hp + ')"/>';
      out += '<rect x="' + f(x - 5) + '" y="' + h * 0.34 + '" width="' + (w * 0.09 + 10) + '" height="' + h * 0.03 + '" fill="' + P.paper + '" stroke="' + P.ink + '"/>';
    }
    for (var s = 0; s < 4; s++) out += '<rect x="' + f(w * (0.03 - s * 0.01)) + '" y="' + f(h * (0.86 + s * 0.035)) + '" width="' + f(w * (0.94 + s * 0.02)) + '" height="' + h * 0.035 + '" fill="' + (s % 2 ? P.b : P.paper) + '" stroke="' + P.ink + '"/>';
    return "<defs>" + g[0] + hatch(hp, P.ink, 6, 90, 0.4) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/><circle cx="' + w * 0.5 + '" cy="' + h * 0.07 + '" r="' + w * 0.05 + '" fill="' + P.a + '"/>' + out;
  };

  S.church = function (w, h, P, R) {
    var g = grad(P.c, P.bg), cx = w / 2, out = "";
    out += '<rect x="' + w * 0.2 + '" y="' + h * 0.3 + '" width="' + w * 0.6 + '" height="' + h * 0.68 + '" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/>';
    [[0.12, 0.2], [0.8, 0.2]].forEach(function (t) {
      out += '<rect x="' + w * t[0] + '" y="' + h * 0.26 + '" width="' + w * 0.1 + '" height="' + h * 0.72 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="2"/>';
      out += '<path d="M' + w * (t[0] - 0.02) + "," + h * 0.26 + " L" + w * (t[0] + 0.05) + "," + h * 0.04 + " L" + w * (t[0] + 0.12) + "," + h * 0.26 + 'Z" fill="' + P.a + '"/>';
    });
    out += '<path d="M' + w * 0.2 + "," + h * 0.3 + " L" + cx + "," + h * 0.16 + " L" + w * 0.8 + "," + h * 0.3 + 'Z" fill="' + P.a + '"/>';
    out += '<circle cx="' + cx + '" cy="' + h * 0.42 + '" r="' + w * 0.1 + '" fill="' + P.ink + '"/><circle cx="' + cx + '" cy="' + h * 0.42 + '" r="' + w * 0.07 + '" fill="' + P.b + '"/>';
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; out += '<line x1="' + cx + '" y1="' + h * 0.42 + '" x2="' + f(cx + Math.cos(a) * w * 0.1) + '" y2="' + f(h * 0.42 + Math.sin(a) * w * 0.1) + '" stroke="' + P.ink + '" stroke-width="2"/>'; }
    out += '<path d="M' + (cx - w * 0.09) + "," + h * 0.98 + " V" + h * 0.72 + " Q" + (cx - w * 0.09) + "," + h * 0.6 + " " + cx + "," + h * 0.56 + " Q" + (cx + w * 0.09) + "," + h * 0.6 + " " + (cx + w * 0.09) + "," + h * 0.72 + " V" + h * 0.98 + 'Z" fill="' + P.ink + '"/>';
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' + out;
  };

  S.interior = function (w, h, P, R) {
    var out = '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>';
    out += '<polygon points="0,0 ' + w * 0.22 + "," + h * 0.22 + " " + w * 0.22 + "," + h * 0.72 + " 0," + h + '" fill="' + P.b + '"/>';
    out += '<polygon points="' + w + ",0 " + w * 0.78 + "," + h * 0.22 + " " + w * 0.78 + "," + h * 0.72 + " " + w + "," + h + '" fill="' + P.a + '"/>';
    out += '<rect x="' + w * 0.22 + '" y="' + h * 0.22 + '" width="' + w * 0.56 + '" height="' + h * 0.5 + '" fill="' + P.paper + '"/>';
    out += '<polygon points="0,' + h + " " + w * 0.22 + "," + h * 0.72 + " " + w * 0.78 + "," + h * 0.72 + " " + w + "," + h + '" fill="' + P.ink + '" opacity=".85"/>';
    for (var i = 1; i < 7; i++) out += '<line x1="' + f(w * 0.22 + (w * 0.56) * i / 7) + '" y1="' + h * 0.72 + '" x2="' + f(w * i / 7) + '" y2="' + h + '" stroke="' + P.paper + '" stroke-width="1" opacity=".5"/>';
    out += '<path d="' + archPath(w * 0.5, h * 0.72, w * 0.2, h * 0.38) + '" fill="' + P.c + '"/>';
    out += '<polygon points="' + w * 0.4 + "," + h * 0.72 + " " + w * 0.6 + "," + h * 0.72 + " " + w * 0.78 + "," + h + " " + w * 0.22 + "," + h + '" fill="' + P.paper + '" opacity=".35"/>';
    return out;
  };

  S.woman = function (w, h, P, R) {
    var cx = w / 2, hp = uid("h"), g = grad(P.c, P.bg);
    return "<defs>" + g[0] + hatch(hp, P.ink, 4, 35, 0.5) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' +
      '<path d="' + archPath(cx, h, w * 0.8, h * 0.9) + '" fill="' + P.paper + '" opacity=".5"/>' +
      '<path d="M' + (cx - w * 0.07) + "," + h * 0.4 + " C" + (cx - w * 0.08) + "," + h * 0.5 + " " + (cx - w * 0.3) + "," + h * 0.78 + " " + (cx - w * 0.3) + "," + h * 0.97 + " L" + (cx + w * 0.3) + "," + h * 0.97 + " C" + (cx + w * 0.3) + "," + h * 0.78 + " " + (cx + w * 0.08) + "," + h * 0.5 + " " + (cx + w * 0.07) + "," + h * 0.4 + 'Z" fill="' + P.a + '"/>' +
      '<path d="M' + (cx - w * 0.07) + "," + h * 0.4 + " C" + (cx - w * 0.08) + "," + h * 0.5 + " " + (cx - w * 0.3) + "," + h * 0.78 + " " + (cx - w * 0.3) + "," + h * 0.97 + " L" + (cx + w * 0.3) + "," + h * 0.97 + " C" + (cx + w * 0.3) + "," + h * 0.78 + " " + (cx + w * 0.08) + "," + h * 0.5 + " " + (cx + w * 0.07) + "," + h * 0.4 + 'Z" fill="url(#' + hp + ')"/>' +
      '<path d="M' + (cx - w * 0.11) + "," + h * 0.3 + " Q" + cx + "," + h * 0.27 + " " + (cx + w * 0.11) + "," + h * 0.3 + " L" + (cx + w * 0.07) + "," + h * 0.42 + " L" + (cx - w * 0.07) + "," + h * 0.42 + 'Z" fill="' + P.paper + '"/>' +
      '<rect x="' + (cx - w * 0.15) + '" y="' + h * 0.4 + '" width="' + w * 0.3 + '" height="' + h * 0.025 + '" fill="' + P.ink + '"/>' +
      '<path d="M' + (cx - w * 0.11) + "," + h * 0.32 + " Q" + (cx - w * 0.19) + "," + h * 0.5 + " " + (cx - w * 0.17) + "," + h * 0.62 + '" stroke="' + P.paper + '" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (cx + w * 0.11) + "," + h * 0.32 + " Q" + (cx + w * 0.19) + "," + h * 0.5 + " " + (cx + w * 0.16) + "," + h * 0.62 + '" stroke="' + P.paper + '" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<rect x="' + (cx - w * 0.02) + '" y="' + h * 0.22 + '" width="' + w * 0.04 + '" height="' + h * 0.07 + '" fill="' + P.paper + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + h * 0.2 + '" rx="' + w * 0.06 + '" ry="' + h * 0.045 + '" fill="' + P.paper + '"/>' +
      '<path d="M' + (cx - w * 0.065) + "," + h * 0.19 + " Q" + cx + "," + (h * 0.12) + " " + (cx + w * 0.065) + "," + h * 0.19 + " Q" + cx + "," + h * 0.16 + " " + (cx - w * 0.065) + "," + h * 0.19 + 'Z" fill="' + P.ink + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + h * 0.165 + '" rx="' + w * 0.2 + '" ry="' + h * 0.018 + '" fill="' + P.ink + '"/>' +
      '<path d="M' + (cx - w * 0.07) + "," + h * 0.165 + " Q" + cx + "," + h * 0.07 + " " + (cx + w * 0.07) + "," + h * 0.165 + 'Z" fill="' + P.ink + '"/>' +
      '<rect x="' + (cx - w * 0.07) + '" y="' + h * 0.15 + '" width="' + w * 0.14 + '" height="' + h * 0.012 + '" fill="' + P.b + '"/>';
  };

  S.dancer = function (w, h, P, R) {
    var cx = w / 2, g = grad(P.bg, P.paper), sk = "";
    for (var i = 0; i < 5; i++) {
      var y = h * (0.58 + i * 0.045), r = w * (0.12 + i * 0.07);
      sk += '<path d="M' + f(cx - r) + "," + f(y) + " Q" + f(cx - r * 0.5) + "," + f(y + h * 0.05) + " " + f(cx) + "," + f(y) + " Q" + f(cx + r * 0.6) + "," + f(y - h * 0.04) + " " + f(cx + r) + "," + f(y + h * 0.02) + " L" + f(cx + r * 0.2) + "," + f(h * 0.5) + " L" + f(cx - r * 0.2) + "," + f(h * 0.5) + 'Z" fill="' + (i % 2 ? P.a : P.ink) + '" opacity="' + f(0.95 - i * 0.07) + '"/>';
    }
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/><circle cx="' + cx + '" cy="' + h * 0.4 + '" r="' + w * 0.36 + '" fill="' + P.a + '" opacity=".35"/>' + sk +
      '<g stroke="' + P.ink + '" fill="none" stroke-linecap="round" stroke-width="13"><path d="M' + cx + "," + h * 0.36 + " Q" + (cx + 6) + "," + h * 0.44 + " " + cx + "," + h * 0.52 + '"/><path d="M' + cx + "," + h * 0.38 + " Q" + (cx - w * 0.14) + "," + h * 0.3 + " " + (cx - w * 0.2) + "," + h * 0.16 + '" stroke-width="9"/><path d="M' + cx + "," + h * 0.38 + " Q" + (cx + w * 0.16) + "," + h * 0.28 + " " + (cx + w * 0.12) + "," + h * 0.12 + '" stroke-width="9"/></g>' +
      '<circle cx="' + (cx + 4) + '" cy="' + h * 0.3 + '" r="' + w * 0.045 + '" fill="' + P.ink + '"/>' +
      '<path d="M' + (cx - 6) + "," + h * 0.52 + " Q" + (cx - w * 0.06) + "," + h * 0.7 + " " + (cx - w * 0.12) + "," + h * 0.9 + '" stroke="' + P.ink + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (cx + 6) + "," + h * 0.52 + " Q" + (cx + w * 0.1) + "," + h * 0.66 + " " + (cx + w * 0.2) + "," + h * 0.74 + '" stroke="' + P.ink + '" stroke-width="9" fill="none" stroke-linecap="round"/>';
  };

  function hand(P, hp) {
    var fs = [[-30, 60], [-10, 74], [10, 66], [29, 52]], o = "";
    o += '<rect x="-27" y="0" width="54" height="70" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/><rect x="-32" y="42" width="64" height="26" fill="' + P.ink + '"/>';
    o += '<rect x="-36" y="-70" width="72" height="76" rx="18" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/>';
    fs.forEach(function (p) { o += '<rect x="' + (p[0] - 9) + '" y="' + (-62 - p[1]) + '" width="18" height="' + (p[1] + 14) + '" rx="9" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/>'; });
    o += '<g transform="rotate(-52 -34 -22)"><rect x="-60" y="-52" width="20" height="56" rx="10" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/></g>';
    o += '<rect x="-36" y="-70" width="72" height="140" fill="url(#' + hp + ')"/>';
    return o;
  }
  S.hands = function (w, h, P, R) {
    var hp = uid("h"), g = grad(P.c, P.bg);
    return "<defs>" + g[0] + hatch(hp, P.ink, 5, 70, 0.28) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' + star4(w * 0.5, h * 0.5, w * 0.16, P.b) +
      '<g transform="translate(' + w * 0.3 + "," + h * 0.78 + ") rotate(14) scale(" + f(w / 300) + ')">' + hand(P, hp) + "</g>" +
      '<g transform="translate(' + w * 0.7 + "," + h * 0.22 + ") rotate(194) scale(" + f(w / 300) + ')">' + hand(P, hp) + "</g>";
  };

  S.profile = function (w, h, P, R) {
    var hp = uid("h"), s = h / 150, g = rgrad(P.paper, P.bg, 0);
    return "<defs>" + g[0] + hatch(hp, P.ink, 3, 45, 0.5) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' +
      '<g transform="translate(' + f(w / 2 - 50 * s) + ',' + f(h * 0.04) + ') scale(' + f(s) + ')">' +
      '<path d="M30,5 C55,0 75,15 74,40 C73,50 80,56 84,62 C80,66 78,68 80,72 C79,76 76,78 78,82 C76,88 70,90 66,92 C66,100 68,108 72,116 L90,140 L0,140 C6,110 20,100 22,90 C14,70 10,40 30,5Z" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="1.4"/>' +
      '<path d="M30,5 C55,0 75,15 74,40 C73,50 80,56 84,62 C80,66 78,68 80,72 C79,76 76,78 78,82 C76,88 70,90 66,92 C66,100 68,108 72,116 L90,140 L0,140 C6,110 20,100 22,90 C14,70 10,40 30,5Z" fill="url(#' + hp + ')"/>' +
      '<path d="M28,4 C60,-6 80,20 70,44 C66,24 52,16 36,22 C26,36 28,60 30,78 C16,66 8,34 28,4Z" fill="' + P.ink + '"/>' +
      '<ellipse cx="62" cy="48" rx="4.5" ry="2.4" fill="' + P.ink + '"/><path d="M70,40 Q62,36 54,41" stroke="' + P.ink + '" stroke-width="1.6" fill="none"/>' +
      '<path d="M0,140 L40,112 L90,140Z" fill="' + P.a + '"/></g>';
  };

  S.group = function (w, h, P, R) {
    var g = grad(P.bg, P.paper), t = "", base = h * 0.82, xs = [0.18, 0.36, 0.55, 0.75], hs = [0.5, 0.58, 0.46, 0.54], cols = [P.a, P.ink, P.c, P.d];
    xs.forEach(function (x, i) {
      var cx = w * x, ht = h * hs[i], hr = ht * 0.075, bw = ht * 0.2;
      t += '<path d="M' + f(cx) + "," + base + " l" + f(ht * 0.9) + "," + f(h * 0.06) + " l" + f(-ht * 0.9 - 8) + ",0Z" + '" fill="' + P.ink + '" opacity=".18"/>';
      t += '<path d="M' + f(cx - bw) + "," + base + " L" + f(cx - bw * 0.8) + "," + f(base - ht * 0.62) + " Q" + f(cx) + "," + f(base - ht * 0.72) + " " + f(cx + bw * 0.8) + "," + f(base - ht * 0.62) + " L" + f(cx + bw) + "," + base + 'Z" fill="' + cols[i] + '"/>';
      t += '<circle cx="' + f(cx) + '" cy="' + f(base - ht * 0.82) + '" r="' + f(hr) + '" fill="' + P.ink + '"/>';
    });
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/><circle cx="' + w * 0.5 + '" cy="' + h * 0.28 + '" r="' + w * 0.12 + '" fill="' + P.b + '"/><rect y="' + base + '" width="' + w + '" height="' + (h - base) + '" fill="' + P.b + '"/>' + t;
  };

  S.portrait = function (w, h, P, R) {
    var cx = w / 2, cy = h * 0.5, hp = uid("h");
    return "<defs>" + hatch(hp, P.ink, 3, 50, 0.35) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + w * 0.4 + '" ry="' + h * 0.46 + '" fill="' + P.c + '" stroke="' + P.ink + '" stroke-width="6"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + w * 0.4 + '" ry="' + h * 0.46 + '" fill="url(#' + hp + ')"/>' +
      '<path d="M' + (cx - w * 0.36) + "," + (h * 0.95) + " Q" + (cx - w * 0.3) + "," + h * 0.7 + " " + cx + "," + h * 0.68 + " Q" + (cx + w * 0.3) + "," + h * 0.7 + " " + (cx + w * 0.36) + "," + (h * 0.95) + 'Z" fill="' + P.ink + '"/>' +
      '<rect x="' + (cx - w * 0.04) + '" y="' + h * 0.55 + '" width="' + w * 0.08 + '" height="' + h * 0.12 + '" fill="' + P.paper + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + h * 0.42 + '" rx="' + w * 0.12 + '" ry="' + h * 0.15 + '" fill="' + P.paper + '"/>' +
      '<path d="M' + (cx - w * 0.13) + "," + h * 0.4 + " Q" + cx + "," + h * 0.2 + " " + (cx + w * 0.13) + "," + h * 0.4 + " Q" + (cx + w * 0.1) + "," + h * 0.3 + " " + cx + "," + h * 0.3 + " Q" + (cx - w * 0.1) + "," + h * 0.3 + " " + (cx - w * 0.13) + "," + h * 0.4 + 'Z" fill="' + P.ink + '"/>' +
      '<circle cx="' + (cx - w * 0.045) + '" cy="' + h * 0.42 + '" r="3" fill="' + P.ink + '"/><circle cx="' + (cx + w * 0.045) + '" cy="' + h * 0.42 + '" r="3" fill="' + P.ink + '"/>' +
      '<path d="M' + (cx - 10) + "," + h * 0.5 + " Q" + cx + "," + (h * 0.51) + " " + (cx + 10) + "," + h * 0.5 + '" stroke="' + P.a + '" stroke-width="3" fill="none"/>';
  };

  S.silhouette = function (w, h, P, R) {
    var cx = w / 2, g = grad(P.paper, P.bg);
    return "<defs>" + g[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/><circle cx="' + cx + '" cy="' + h * 0.5 + '" r="' + w * 0.34 + '" fill="' + P.a + '"/>' +
      '<circle cx="' + cx + '" cy="' + h * 0.5 + '" r="' + w * 0.26 + '" fill="' + P.b + '" opacity=".85"/>' +
      '<rect y="' + h * 0.84 + '" width="' + w + '" height="' + h * 0.16 + '" fill="' + P.ink + '"/>' +
      '<path d="M' + (cx - 20) + "," + h * 0.84 + " L" + (cx - 14) + "," + h * 0.56 + " Q" + cx + "," + h * 0.5 + " " + (cx + 14) + "," + h * 0.56 + " L" + (cx + 20) + "," + h * 0.84 + 'Z" fill="' + P.ink + '"/><circle cx="' + cx + '" cy="' + h * 0.51 + '" r="12" fill="' + P.ink + '"/>';
  };

  S.flower = function (w, h, P, R) {
    var cx = w / 2, cy = h * 0.34, r = w * 0.15, o = "", hp = uid("h");
    o += '<path d="M' + cx + "," + cy + " C" + (cx - 30) + "," + h * 0.55 + " " + (cx + 40) + "," + h * 0.7 + " " + cx + "," + h + '" stroke="' + P.d + '" stroke-width="7" fill="none"/>';
    o += '<g transform="rotate(-40 ' + (cx - 14) + " " + h * 0.62 + ')"><ellipse cx="' + (cx - 14) + '" cy="' + h * 0.62 + '" rx="' + w * 0.14 + '" ry="' + h * 0.04 + '" fill="' + P.d + '" stroke="' + P.ink + '"/></g>';
    o += '<g transform="rotate(35 ' + (cx + 22) + " " + h * 0.78 + ')"><ellipse cx="' + (cx + 22) + '" cy="' + h * 0.78 + '" rx="' + w * 0.15 + '" ry="' + h * 0.04 + '" fill="' + P.d + '" stroke="' + P.ink + '"/></g>';
    for (var i = 0; i < 14; i++) o += '<ellipse transform="rotate(' + (i * 360 / 14) + " " + cx + " " + cy + ')" cx="' + cx + '" cy="' + (cy - r * 1.25) + '" rx="' + f(r * 0.4) + '" ry="' + f(r * 1.05) + '" fill="' + (i % 2 ? P.a : P.b) + '" stroke="' + P.ink + '" stroke-width="1.2"/>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.65 + '" fill="' + P.ink + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.65 + '" fill="url(#' + hp + ')"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.25 + '" fill="' + P.b + '"/>';
    return "<defs>" + hatch(hp, P.paper, 4, 45, 0.5) + '</defs><rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' + o;
  };

  S.leaves = function (w, h, P, R) {
    var o = '<path d="M' + w * 0.5 + "," + h + " C" + w * 0.4 + "," + h * 0.6 + " " + w * 0.6 + "," + h * 0.4 + " " + w * 0.45 + "," + h * 0.04 + '" stroke="' + P.ink + '" stroke-width="5" fill="none"/>';
    for (var i = 0; i < 9; i++) {
      var t = i / 9, y = h * (0.9 - t * 0.82), x = w * (0.5 + Math.sin(t * 3.4) * 0.07 - t * 0.05), side = i % 2 ? 1 : -1, len = w * (0.3 - t * 0.12);
      o += '<g transform="translate(' + f(x) + "," + f(y) + ") rotate(" + (side * (55 - t * 20)) + ')"><path d="M0,0 Q' + f(len * 0.5) * side + "," + f(-len * 0.35) + " " + f(len) * side + ",0 Q" + f(len * 0.5) * side + "," + f(len * 0.3) + ' 0,0Z" fill="' + (i % 2 ? P.d : P.b) + '" stroke="' + P.ink + '" stroke-width="1.3"/><path d="M0,0 L' + f(len * 0.9) * side + ',0" stroke="' + P.ink + '" stroke-width="1" opacity=".6"/></g>';
    }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' + o;
  };

  S.mushrooms = function (w, h, P, R) {
    var o = "";
    [[0.28, 0.82, 0.2, P.a], [0.58, 0.9, 0.28, P.b], [0.8, 0.78, 0.14, P.c]].forEach(function (m) {
      var x = w * m[0], y = h * m[1], s = w * m[2];
      o += '<path d="M' + f(x - s * 0.18) + "," + f(y) + " Q" + f(x - s * 0.1) + "," + f(y - s * 1.1) + " " + f(x - s * 0.12) + "," + f(y - s * 1.3) + " L" + f(x + s * 0.12) + "," + f(y - s * 1.3) + " Q" + f(x + s * 0.1) + "," + f(y - s * 1.1) + " " + f(x + s * 0.18) + "," + f(y) + 'Z" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="1.6"/>';
      o += '<path d="M' + f(x - s) + "," + f(y - s * 1.3) + " Q" + f(x) + "," + f(y - s * 2.5) + " " + f(x + s) + "," + f(y - s * 1.3) + " Q" + f(x) + "," + f(y - s * 1.1) + " " + f(x - s) + "," + f(y - s * 1.3) + 'Z" fill="' + m[3] + '" stroke="' + P.ink + '" stroke-width="1.6"/>';
      for (var k = -4; k <= 4; k++) o += '<line x1="' + f(x + k * s * 0.05) + '" y1="' + f(y - s * 1.28) + '" x2="' + f(x + k * s * 0.2) + '" y2="' + f(y - s * 1.14) + '" stroke="' + P.ink + '" stroke-width="1"/>';
      for (var d = 0; d < 6; d++) o += '<circle cx="' + f(x + (R() - 0.5) * s * 1.2) + '" cy="' + f(y - s * (1.5 + R() * 0.6)) + '" r="' + f(2 + R() * 3) + '" fill="' + P.paper + '" opacity=".8"/>';
    });
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/><path d="M0,' + h * 0.9 + " Q" + w * 0.5 + "," + h * 0.84 + " " + w + "," + h * 0.9 + " V" + h + " H0Z" + '" fill="' + P.d + '" opacity=".6"/>' + o;
  };

  S.pods = function (w, h, P, R) {
    var o = '<path d="M0,' + h * 0.12 + " Q" + w * 0.5 + "," + h * 0.02 + " " + w + "," + h * 0.16 + '" stroke="' + P.ink + '" stroke-width="5" fill="none"/>';
    for (var i = 0; i < 5; i++) {
      var x = w * (0.14 + i * 0.18), y = h * (0.1 + Math.sin(i * 0.9) * 0.02 + 0.03), len = h * (0.4 + R() * 0.2), pw = w * 0.07;
      o += '<line x1="' + f(x) + '" y1="' + f(y) + '" x2="' + f(x) + '" y2="' + f(y + h * 0.1) + '" stroke="' + P.ink + '" stroke-width="2"/>';
      o += '<path d="M' + f(x) + "," + f(y + h * 0.1) + " C" + f(x - pw * 2) + "," + f(y + len * 0.5) + " " + f(x - pw) + "," + f(y + len) + " " + f(x) + "," + f(y + len) + " C" + f(x + pw) + "," + f(y + len) + " " + f(x + pw * 2) + "," + f(y + len * 0.5) + " " + f(x) + "," + f(y + h * 0.1) + 'Z" fill="' + (i % 2 ? P.a : P.b) + '" stroke="' + P.ink + '" stroke-width="1.5"/>';
      for (var s = 0; s < 4; s++) o += '<circle cx="' + f(x + (s % 2 ? 6 : -6)) + '" cy="' + f(y + len * (0.45 + s * 0.12)) + '" r="4" fill="' + P.ink + '"/>';
    }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' + o;
  };

  S.vine = function (w, h, P, R) {
    var cx = w / 2, cy = h * 0.5, d = "M" + cx + "," + cy, o = "";
    for (var i = 1; i < 90; i++) { var a = i * 0.28, r = i * 3.2; d += " L" + f(cx + Math.cos(a) * r) + "," + f(cy + Math.sin(a) * r * 1.15); }
    o += '<path d="' + d + '" stroke="' + P.d + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
    for (var k = 6; k < 90; k += 4) {
      var a2 = k * 0.28, r2 = k * 3.2, x = cx + Math.cos(a2) * r2, y = cy + Math.sin(a2) * r2 * 1.15;
      o += '<ellipse transform="rotate(' + f(a2 * 57.3 + 90) + " " + f(x) + " " + f(y) + ')" cx="' + f(x) + '" cy="' + f(y - 10) + '" rx="' + f(4 + k * 0.12) + '" ry="' + f(8 + k * 0.2) + '" fill="' + (k % 8 ? P.d : P.b) + '" stroke="' + P.ink + '" stroke-width="1"/>';
    }
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="' + P.a + '" stroke="' + P.ink + '" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + P.ink + '"/>';
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' + o;
  };

  S.fern = function (w, h, P, R) {
    var d = "M" + w * 0.5 + "," + h + " Q" + w * 0.35 + "," + h * 0.5 + " " + w * 0.6 + "," + h * 0.05, o = '<path d="' + d + '" stroke="' + P.ink + '" stroke-width="4" fill="none"/>';
    for (var i = 0; i < 24; i++) {
      var t = i / 24, y = h * (0.95 - t * 0.88), x = w * (0.5 - Math.sin(t * Math.PI) * 0.08 + t * 0.1), len = w * (0.34 - t * 0.28);
      [-1, 1].forEach(function (s) {
        o += '<path d="M' + f(x) + "," + f(y) + " Q" + f(x + s * len * 0.5) + "," + f(y - len * 0.5) + " " + f(x + s * len) + "," + f(y - len * 0.35) + " Q" + f(x + s * len * 0.5) + "," + f(y - len * 0.1) + " " + f(x) + "," + f(y) + 'Z" fill="' + P.paper + '" opacity=".92" stroke="' + P.ink + '" stroke-width="1"/>';
      });
    }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' + o;
  };

  S.dandelion = function (w, h, P, R) {
    var cx = w / 2, cy = h * 0.4, o = '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx - 20) + '" y2="' + h + '" stroke="' + P.ink + '" stroke-width="4"/>';
    for (var i = 0; i < 70; i++) {
      var a = i * 0.0897, r = w * 0.27, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(x) + '" y2="' + f(y) + '" stroke="' + P.ink + '" stroke-width="1"/>';
      for (var k = 0; k < 6; k++) o += '<line x1="' + f(x) + '" y1="' + f(y) + '" x2="' + f(x + Math.cos(a + (k - 2.5) * 0.35) * 16) + '" y2="' + f(y + Math.sin(a + (k - 2.5) * 0.35) * 16) + '" stroke="' + P.ink + '" stroke-width=".8"/>';
      o += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="2.4" fill="' + P.ink + '"/>';
    }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + w * 0.36 + '" fill="' + P.paper + '" opacity=".6"/>' + o + '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + P.a + '"/>';
  };

  S.moon = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.32, hg = rgrad(P.c, P.ink, 0.2), o = "";
    for (var i = 0; i < 40; i++) o += '<circle cx="' + f(R() * w) + '" cy="' + f(R() * h) + '" r="' + f(0.6 + R() * 1.6) + '" fill="' + P.paper + '" opacity="' + f(0.4 + R() * 0.5) + '"/>';
    var cr = [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.24], [-0.1, 0.35, 0.14], [0.3, -0.35, 0.1], [-0.35, 0.15, 0.08]].map(function (c) { return '<circle cx="' + f(cx + c[0] * r) + '" cy="' + f(cy + c[1] * r) + '" r="' + f(c[2] * r) + '" fill="' + P.b + '" opacity=".45"/>'; }).join("");
    return "<defs>" + hg[0] + '<clipPath id="mc"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath></defs><rect width="' + w + '" height="' + h + '" fill="' + P.ink + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 2 + '" fill="' + hg[1] + '" opacity=".7"/>' + o +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + P.paper + '"/><g clip-path="url(#mc)">' + cr + '<circle cx="' + (cx + r * 0.55) + '" cy="' + (cy - r * 0.1) + '" r="' + r * 1.05 + '" fill="' + P.ink + '" opacity=".28"/></g>';
  };

  S.sun = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, o = "";
    for (var i = 0; i < 28; i++) {
      var a = i * Math.PI * 2 / 28, a2 = a + Math.PI / 28, r1 = Math.min(w, h) * (i % 2 ? 0.38 : 0.46);
      o += '<path d="M' + f(cx + Math.cos(a - 0.05) * w * 0.2) + "," + f(cy + Math.sin(a - 0.05) * w * 0.2) + " L" + f(cx + Math.cos(a2) * r1) + "," + f(cy + Math.sin(a2) * r1) + " L" + f(cx + Math.cos(a + 0.05) * w * 0.2) + "," + f(cy + Math.sin(a + 0.05) * w * 0.2) + 'Z" fill="' + (i % 2 ? P.b : P.a) + '"/>';
    }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' + o + '<circle cx="' + cx + '" cy="' + cy + '" r="' + w * 0.2 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="3"/><circle cx="' + cx + '" cy="' + cy + '" r="' + w * 0.14 + '" fill="none" stroke="' + P.ink + '" stroke-width="1.5"/><circle cx="' + cx + '" cy="' + cy + '" r="' + w * 0.07 + '" fill="' + P.paper + '"/>';
  };

  S.stars = function (w, h, P, R) {
    var o = "";
    for (var i = 0; i < 90; i++) o += '<circle cx="' + f(R() * w) + '" cy="' + f(R() * h) + '" r="' + f(0.6 + R() * 1.4) + '" fill="' + P.paper + '" opacity="' + f(0.3 + R() * 0.6) + '"/>';
    for (var k = 0; k < 14; k++) o += star4(R() * w, R() * h, 6 + R() * 18, P.paper, 0.9);
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.ink + '"/>' + o + star4(w * 0.5, h * 0.45, w * 0.22, P.b) + '<circle cx="' + w * 0.5 + '" cy="' + h * 0.45 + '" r="' + w * 0.012 + '" fill="' + P.paper + '"/>';
  };

  S.planet = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.22, o = "";
    for (var i = 0; i < 40; i++) o += '<circle cx="' + f(R() * w) + '" cy="' + f(R() * h) + '" r="' + f(0.6 + R() * 1.3) + '" fill="' + P.paper + '" opacity=".7"/>';
    var bands = "";
    for (var b = 0; b < 6; b++) bands += '<rect x="' + (cx - r) + '" y="' + f(cy - r + b * r * 0.36) + '" width="' + r * 2 + '" height="' + f(r * 0.17) + '" fill="' + (b % 2 ? P.b : P.ink) + '" opacity=".55"/>';
    return '<defs><clipPath id="pc"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath></defs><rect width="' + w + '" height="' + h + '" fill="' + P.ink + '"/>' + o +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r * 2 + '" ry="' + r * 0.5 + '" fill="none" stroke="' + P.b + '" stroke-width="' + r * 0.18 + '" transform="rotate(-18 ' + cx + " " + cy + ')"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + P.a + '"/><g clip-path="url(#pc)">' + bands + '</g>' +
      '<path d="M' + (cx - r * 2) + "," + cy + " A" + r * 2 + "," + r * 0.5 + " 0 0 0 " + (cx + r * 2) + "," + cy + '" fill="none" stroke="' + P.b + '" stroke-width="' + r * 0.18 + '" transform="rotate(-18 ' + cx + " " + cy + ')"/>' +
      '<circle cx="' + w * 0.82 + '" cy="' + h * 0.2 + '" r="' + r * 0.2 + '" fill="' + P.paper + '"/>';
  };

  S.eclipse = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.2, o = "", cg = rgrad(P.paper, P.ink, 0.45);
    for (var i = 0; i < 48; i++) { var a = i * Math.PI / 24, l = r * (1.5 + R() * 1.2); o += '<line x1="' + f(cx + Math.cos(a) * r) + '" y1="' + f(cy + Math.sin(a) * r) + '" x2="' + f(cx + Math.cos(a) * l) + '" y2="' + f(cy + Math.sin(a) * l) + '" stroke="' + P.paper + '" stroke-width="' + f(1 + R() * 2) + '" opacity=".6"/>'; }
    return "<defs>" + cg[0] + '</defs><rect width="' + w + '" height="' + h + '" fill="' + P.ink + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 2.4 + '" fill="' + cg[1] + '"/>' + o + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + P.ink + '" stroke="' + P.paper + '" stroke-width="3"/><circle cx="' + (cx + r * 0.78) + '" cy="' + (cy - r * 0.62) + '" r="6" fill="' + P.paper + '"/>';
  };

  S.constellation = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.42, o = "", pts = [], gk = "αβγδεζηθ";
    for (var t = 0; t < 72; t++) { var a = t * Math.PI / 36; o += '<line x1="' + f(cx + Math.cos(a) * r) + '" y1="' + f(cy + Math.sin(a) * r) + '" x2="' + f(cx + Math.cos(a) * r * (t % 6 ? 1.03 : 1.07)) + '" y2="' + f(cy + Math.sin(a) * r * (t % 6 ? 1.03 : 1.07)) + '" stroke="' + P.ink + '" stroke-width="1"/>'; }
    for (var i = 0; i < 8; i++) { var a2 = R() * 6.28, rr = r * (0.2 + R() * 0.7); pts.push([cx + Math.cos(a2) * rr, cy + Math.sin(a2) * rr]); }
    o += '<polyline points="' + pts.map(function (p) { return f(p[0]) + "," + f(p[1]); }).join(" ") + '" fill="none" stroke="' + P.ink + '" stroke-width="1" stroke-dasharray="4 4"/>';
    pts.forEach(function (p, i) { o += star4(p[0], p[1], 10 + R() * 10, P.a) + '<text x="' + f(p[0] + 14) + '" y="' + f(p[1] - 10) + '" font-family="' + SERIF + '" font-size="15" font-style="italic" fill="' + P.ink + '">' + gk[i] + "</text>"; });
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + P.c + '" opacity=".25" stroke="' + P.ink + '" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.66 + '" fill="none" stroke="' + P.ink + '" stroke-width=".8"/>' + o;
  };

  S.night = function (w, h, P, R) {
    var g = grad(P.ink, P.c), o = "", cx = w * 0.7, cy = h * 0.22;
    for (var i = 0; i < 50; i++) o += '<circle cx="' + f(R() * w) + '" cy="' + f(R() * h * 0.6) + '" r="' + f(0.6 + R() * 1.3) + '" fill="' + P.paper + '" opacity=".8"/>';
    return "<defs>" + g[0] + '<mask id="cm"><rect width="' + w + '" height="' + h + '" fill="#fff"/><circle cx="' + (cx + w * 0.04) + '" cy="' + (cy - w * 0.02) + '" r="' + w * 0.12 + '" fill="#000"/></mask></defs><rect width="' + w + '" height="' + h + '" fill="' + g[1] + '"/>' + o +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + w * 0.12 + '" fill="' + P.paper + '" mask="url(#cm)"/>' + ridge(w, h * 0.7, h * 0.05, 1, P.d, h) + ridge(w, h * 0.8, h * 0.05, 5, P.ink, h) +
      '<rect x="' + w * 0.2 + '" y="' + h * 0.78 + '" width="' + w * 0.1 + '" height="' + h * 0.07 + '" fill="' + P.ink + '"/><path d="M' + w * 0.19 + "," + h * 0.78 + " L" + w * 0.25 + "," + h * 0.73 + " L" + w * 0.31 + "," + h * 0.78 + 'Z" fill="' + P.ink + '"/><rect x="' + w * 0.235 + '" y="' + h * 0.8 + '" width="' + w * 0.025 + '" height="' + h * 0.025 + '" fill="' + P.b + '"/>';
  };

  S.phases = function (w, h, P, R) {
    var o = "", n = 7, r = Math.min(w / n * 0.4, h * 0.3), cy = h * 0.5;
    for (var i = 0; i < n; i++) {
      var cx = w * (0.5 / n + i / n), p = i / (n - 1), rx = Math.abs(r * (1 - 2 * p)), sw = p < 0.5 ? 0 : 1;
      o += '<circle cx="' + f(cx) + '" cy="' + cy + '" r="' + r + '" fill="' + P.ink + '"/>';
      o += '<path d="M' + f(cx) + "," + f(cy - r) + " A" + f(r) + "," + f(r) + " 0 0 1 " + f(cx) + "," + f(cy + r) + " A" + f(rx) + "," + f(r) + " 0 0 " + sw + " " + f(cx) + "," + f(cy - r) + 'Z" fill="' + P.paper + '"/>';
      o += '<circle cx="' + f(cx) + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + P.ink + '" stroke-width="2"/>';
      o += '<text x="' + f(cx) + '" y="' + f(cy + r + 40) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="15" fill="' + P.ink + '">' + roman(i + 1) + "</text>";
    }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' + o + '<line x1="' + w * 0.05 + '" y1="' + h * 0.25 + '" x2="' + w * 0.95 + '" y2="' + h * 0.25 + '" stroke="' + P.ink + '" stroke-width="1"/>';
  };

  S.clock = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38, o = "", rm = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6 - Math.PI / 2;
      o += '<text x="' + f(cx + Math.cos(a) * r * 0.78) + '" y="' + f(cy + Math.sin(a) * r * 0.78 + 8) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="' + f(r * 0.17) + '" fill="' + P.ink + '">' + rm[i] + "</text>";
    }
    for (var t = 0; t < 60; t++) { var a2 = t * Math.PI / 30; o += '<line x1="' + f(cx + Math.cos(a2) * r * 0.93) + '" y1="' + f(cy + Math.sin(a2) * r * 0.93) + '" x2="' + f(cx + Math.cos(a2) * r * (t % 5 ? 0.97 : 1)) + '" y2="' + f(cy + Math.sin(a2) * r * (t % 5 ? 0.97 : 1)) + '" stroke="' + P.ink + '" stroke-width="1.2"/>'; }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.c + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 1.1 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="4"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/>' + o +
      '<path d="M' + cx + "," + cy + " L" + f(cx + r * 0.3) + "," + f(cy - r * 0.4) + '" stroke="' + P.ink + '" stroke-width="7" stroke-linecap="round"/><path d="M' + cx + "," + cy + " L" + f(cx - r * 0.1) + "," + f(cy - r * 0.7) + '" stroke="' + P.a + '" stroke-width="4" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + P.ink + '"/>';
  };

  S.key = function (w, h, P, R) {
    var cx = w / 2;
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/><g transform="rotate(14 ' + cx + " " + h / 2 + ')">' +
      '<circle cx="' + cx + '" cy="' + h * 0.2 + '" r="' + w * 0.2 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="3"/><circle cx="' + cx + '" cy="' + h * 0.2 + '" r="' + w * 0.1 + '" fill="' + P.bg + '" stroke="' + P.ink + '" stroke-width="3"/>' +
      [[-1, 0], [1, 0], [0, -1]].map(function (p) { return '<circle cx="' + f(cx + p[0] * w * 0.2) + '" cy="' + f(h * 0.2 + p[1] * w * 0.2) + '" r="' + w * 0.05 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="2"/>'; }).join("") +
      '<rect x="' + (cx - w * 0.03) + '" y="' + h * 0.38 + '" width="' + w * 0.06 + '" height="' + h * 0.5 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="3"/>' +
      '<rect x="' + (cx - w * 0.06) + '" y="' + h * 0.48 + '" width="' + w * 0.12 + '" height="' + h * 0.025 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="2"/>' +
      '<path d="M' + (cx + w * 0.03) + "," + h * 0.88 + " h" + w * 0.12 + " v-" + h * 0.06 + " h-" + w * 0.05 + " v" + h * 0.03 + " h-" + w * 0.03 + " v-" + h * 0.07 + " h" + w * 0.06 + " v-" + h * 0.05 + " h-" + w * 0.09 + 'Z" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="3"/></g>';
  };

  S.chair = function (w, h, P, R) {
    var sw = 14;
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/><rect y="' + h * 0.82 + '" width="' + w + '" height="' + h * 0.18 + '" fill="' + P.c + '"/><ellipse cx="' + w * 0.5 + '" cy="' + h * 0.86 + '" rx="' + w * 0.3 + '" ry="' + h * 0.025 + '" fill="' + P.ink + '" opacity=".3"/>' +
      '<g stroke="' + P.ink + '" stroke-width="' + sw + '" stroke-linecap="round" fill="none"><path d="M' + w * 0.28 + "," + h * 0.12 + " L" + w * 0.3 + "," + h * 0.84 + '"/><path d="M' + w * 0.7 + "," + h * 0.12 + " L" + w * 0.72 + "," + h * 0.84 + '"/><path d="M' + w * 0.34 + "," + h * 0.56 + " L" + w * 0.34 + "," + h * 0.82 + '"/><path d="M' + w * 0.66 + "," + h * 0.56 + " L" + w * 0.66 + "," + h * 0.82 + '"/><path d="M' + w * 0.28 + "," + h * 0.14 + " H" + w * 0.7 + '"/><path d="M' + w * 0.3 + "," + h * 0.26 + " H" + w * 0.7 + " M" + w * 0.3 + "," + h * 0.38 + " H" + w * 0.7 + '" stroke-width="8"/></g>' +
      '<path d="M' + w * 0.24 + "," + h * 0.56 + " L" + w * 0.76 + "," + h * 0.56 + " L" + w * 0.74 + "," + h * 0.62 + " L" + w * 0.26 + "," + h * 0.62 + 'Z" fill="' + P.a + '" stroke="' + P.ink + '" stroke-width="3"/>';
  };

  S.book = function (w, h, P, R) {
    var cx = w / 2, cy = h * 0.52, o = "";
    for (var i = 0; i < 12; i++) { var y = cy - h * 0.2 + i * h * 0.033; o += '<line x1="' + f(cx - w * 0.38) + '" y1="' + f(y + i * 0.4) + '" x2="' + f(cx - w * 0.05) + '" y2="' + f(y) + '" stroke="' + P.ink + '" stroke-width="1.4" opacity=".6"/><line x1="' + f(cx + w * 0.05) + '" y1="' + f(y) + '" x2="' + f(cx + w * 0.38) + '" y2="' + f(y + i * 0.4) + '" stroke="' + P.ink + '" stroke-width="1.4" opacity=".6"/>'; }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.c + '"/><path d="M' + w * 0.06 + "," + h * 0.78 + " L" + cx + "," + h * 0.84 + " L" + w * 0.94 + "," + h * 0.78 + " L" + w * 0.94 + "," + h * 0.82 + " L" + cx + "," + h * 0.88 + " L" + w * 0.06 + "," + h * 0.82 + 'Z" fill="' + P.a + '"/>' +
      '<path d="M' + w * 0.08 + "," + h * 0.3 + " Q" + w * 0.3 + "," + h * 0.26 + " " + cx + "," + h * 0.34 + " L" + cx + "," + h * 0.82 + " Q" + w * 0.3 + "," + h * 0.74 + " " + w * 0.08 + "," + h * 0.78 + 'Z" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/>' +
      '<path d="M' + w * 0.92 + "," + h * 0.3 + " Q" + w * 0.7 + "," + h * 0.26 + " " + cx + "," + h * 0.34 + " L" + cx + "," + h * 0.82 + " Q" + w * 0.7 + "," + h * 0.74 + " " + w * 0.92 + "," + h * 0.78 + 'Z" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="2"/>' + o +
      star4(w * 0.5, h * 0.17, w * 0.06, P.b);
  };

  S.vessel = function (w, h, P, R) {
    var cx = w / 2, o = "", d = "M" + (cx - w * 0.1) + "," + h * 0.12 + " C" + (cx - w * 0.1) + "," + h * 0.22 + " " + (cx - w * 0.06) + "," + h * 0.26 + " " + (cx - w * 0.08) + "," + h * 0.32 + " C" + (cx - w * 0.34) + "," + h * 0.42 + " " + (cx - w * 0.3) + "," + h * 0.7 + " " + (cx - w * 0.12) + "," + h * 0.86 + " L" + (cx - w * 0.14) + "," + h * 0.92 + " L" + (cx + w * 0.14) + "," + h * 0.92 + " L" + (cx + w * 0.12) + "," + h * 0.86 + " C" + (cx + w * 0.3) + "," + h * 0.7 + " " + (cx + w * 0.34) + "," + h * 0.42 + " " + (cx + w * 0.08) + "," + h * 0.32 + " C" + (cx + w * 0.06) + "," + h * 0.26 + " " + (cx + w * 0.1) + "," + h * 0.22 + " " + (cx + w * 0.1) + "," + h * 0.12 + "Z";
    for (var i = 0; i < 14; i++) o += '<path d="M' + f(cx - w * 0.3 + i * w * 0.043) + "," + h * 0.52 + " l" + w * 0.02 + ",-" + h * 0.03 + " l" + w * 0.02 + "," + h * 0.03 + '" fill="none" stroke="' + P.paper + '" stroke-width="2"/>';
    return '<defs><clipPath id="vc"><path d="' + d + '"/></clipPath></defs><rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' +
      '<path d="M' + (cx - w * 0.08) + "," + h * 0.2 + " C" + (cx - w * 0.4) + "," + h * 0.16 + " " + (cx - w * 0.42) + "," + h * 0.44 + " " + (cx - w * 0.2) + "," + h * 0.4 + '" stroke="' + P.ink + '" stroke-width="9" fill="none"/><path d="M' + (cx + w * 0.08) + "," + h * 0.2 + " C" + (cx + w * 0.4) + "," + h * 0.16 + " " + (cx + w * 0.42) + "," + h * 0.44 + " " + (cx + w * 0.2) + "," + h * 0.4 + '" stroke="' + P.ink + '" stroke-width="9" fill="none"/>' +
      '<path d="' + d + '" fill="' + P.a + '" stroke="' + P.ink + '" stroke-width="3"/><g clip-path="url(#vc)"><rect x="0" y="' + h * 0.44 + '" width="' + w + '" height="' + h * 0.05 + '" fill="' + P.ink + '"/><rect x="0" y="' + h * 0.6 + '" width="' + w + '" height="' + h * 0.05 + '" fill="' + P.ink + '"/>' + o + "</g>";
  };

  S.eye = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, o = "", ew = w * 0.42;
    for (var i = 0; i < 36; i++) { var a = i * Math.PI / 18; o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.cos(a) * w) + '" y2="' + f(cy + Math.sin(a) * w) + '" stroke="' + P.a + '" stroke-width="' + (i % 2 ? 2 : 6) + '" opacity=".45"/>'; }
    var lash = "";
    for (var l = -6; l <= 6; l++) lash += '<line x1="' + f(cx + l * ew * 0.13) + '" y1="' + f(cy - ew * 0.34 * (1 - Math.pow(l / 7, 2))) + '" x2="' + f(cx + l * ew * 0.17) + '" y2="' + f(cy - ew * (0.5 + 0.1 * (1 - Math.abs(l) / 7))) + '" stroke="' + P.ink + '" stroke-width="3" stroke-linecap="round"/>';
    return '<defs><clipPath id="ec"><path d="M' + (cx - ew) + "," + cy + " Q" + cx + "," + (cy - ew * 0.9) + " " + (cx + ew) + "," + cy + " Q" + cx + "," + (cy + ew * 0.9) + " " + (cx - ew) + "," + cy + 'Z"/></clipPath></defs><rect width="' + w + '" height="' + h + '" fill="' + P.bg + '"/>' + o +
      '<path d="M' + (cx - ew) + "," + cy + " Q" + cx + "," + (cy - ew * 0.9) + " " + (cx + ew) + "," + cy + " Q" + cx + "," + (cy + ew * 0.9) + " " + (cx - ew) + "," + cy + 'Z" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="5"/>' +
      '<g clip-path="url(#ec)"><circle cx="' + cx + '" cy="' + cy + '" r="' + ew * 0.46 + '" fill="' + P.a + '" stroke="' + P.ink + '" stroke-width="3"/><circle cx="' + cx + '" cy="' + cy + '" r="' + ew * 0.28 + '" fill="' + P.ink + '"/><circle cx="' + (cx - ew * 0.12) + '" cy="' + (cy - ew * 0.12) + '" r="' + ew * 0.07 + '" fill="' + P.paper + '"/></g>' + lash;
  };

  S.mirror = function (w, h, P, R) {
    var cx = w / 2, cy = h * 0.36, rx = w * 0.3, ry = h * 0.26, mg = grad(P.c, P.bg), o = "";
    for (var i = 0; i < 12; i++) o += '<circle cx="' + f(cx + Math.cos(i * 0.52) * rx * 1.02) + '" cy="' + f(cy + Math.sin(i * 0.52) * ry * 1.02) + '" r="7" fill="' + P.b + '" stroke="' + P.ink + '"/>';
    return "<defs>" + mg[0] + '<clipPath id="mi"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx * 0.88 + '" ry="' + ry * 0.88 + '"/></clipPath></defs><rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' +
      '<g transform="rotate(-8 ' + cx + " " + h * 0.6 + ')"><rect x="' + (cx - 14) + '" y="' + (cy + ry) + '" width="28" height="' + h * 0.4 + '" rx="12" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="3"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="4"/>' + o +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx * 0.88 + '" ry="' + ry * 0.88 + '" fill="' + mg[1] + '" stroke="' + P.ink + '" stroke-width="2"/><g clip-path="url(#mi)"><circle cx="' + (cx + rx * 0.2) + '" cy="' + (cy - ry * 0.2) + '" r="' + rx * 0.22 + '" fill="' + P.paper + '"/><path d="M' + (cx - rx) + "," + (cy + ry * 0.5) + " Q" + cx + "," + (cy + ry * 0.2) + " " + (cx + rx) + "," + (cy + ry * 0.5) + " V" + (cy + ry) + " H" + (cx - rx) + 'Z" fill="' + P.d + '"/></g></g>';
  };

  S.compass = function (w, h, P, R) {
    var cx = w / 2, top = h * 0.1;
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/><path d="M' + w * 0.2 + "," + h * 0.7 + " A" + w * 0.3 + "," + w * 0.3 + " 0 0 1 " + w * 0.8 + "," + h * 0.7 + '" fill="none" stroke="' + P.a + '" stroke-width="2" stroke-dasharray="6 5"/>' +
      '<g stroke="' + P.ink + '" stroke-linecap="round" fill="none"><path d="M' + cx + "," + top + " L" + w * 0.2 + "," + h * 0.9 + '" stroke-width="12"/><path d="M' + cx + "," + top + " L" + w * 0.8 + "," + h * 0.9 + '" stroke-width="12"/><path d="M' + f(w * 0.2 - 2) + "," + f(h * 0.9) + " l-3,26" + '" stroke-width="3"/><path d="M' + f(w * 0.8 + 2) + "," + f(h * 0.9) + " l3,26" + '" stroke-width="3"/><path d="M' + w * 0.33 + "," + h * 0.55 + " Q" + cx + "," + h * 0.5 + " " + w * 0.67 + "," + h * 0.55 + '" stroke-width="4"/></g>' +
      '<circle cx="' + cx + '" cy="' + top + '" r="' + w * 0.05 + '" fill="' + P.b + '" stroke="' + P.ink + '" stroke-width="4"/><rect x="' + (cx - 6) + '" y="' + (top - h * 0.07) + '" width="12" height="' + h * 0.07 + '" fill="' + P.ink + '"/>';
  };

  S.note = function (w, h, P, R) {
    var o = "", lines = ["things I meant to say", "come back when the", "light changes ——", "the door was never", "locked, only heavy."];
    for (var i = 0; i < 18; i++) o += '<line x1="30" y1="' + f(60 + i * h * 0.045) + '" x2="' + (w - 24) + '" y2="' + f(60 + i * h * 0.045) + '" stroke="' + P.c + '" stroke-width="1.2" opacity=".55"/>';
    lines.forEach(function (t, i) { o += '<text x="' + f(46 + R() * 10) + '" y="' + f(56 + i * h * 0.09) + '" font-family="\'Brush Script MT\',\'Segoe Script\',\'Snell Roundhand\',cursive" font-size="' + f(h * 0.05) + '" fill="' + P.ink + '" transform="rotate(' + f(-1 + R() * 1.4) + ')">' + esc(t) + "</text>"; });
    for (var k = 0; k < 4; k++) { var y = h * (0.6 + k * 0.07), d = "M46," + f(y); for (var x = 60; x < w - 60 - R() * 120; x += 12) d += " l6," + f(-6 + R() * 12) + " l6," + f(-6 + R() * 12); o += '<path d="' + d + '" stroke="' + P.ink + '" fill="none" stroke-width="1.6"/>'; }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/><line x1="22" y1="0" x2="22" y2="' + h + '" stroke="' + P.a + '" stroke-width="2" opacity=".7"/>' + o + '<circle cx="' + w * 0.82 + '" cy="' + h * 0.88 + '" r="26" fill="none" stroke="' + P.a + '" stroke-width="3"/>';
  };

  S.diagram = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.34, a = [-90, 30, 150].map(function (d) { return [cx + Math.cos(d * Math.PI / 180) * r, cy + Math.sin(d * Math.PI / 180) * r]; });
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + P.ink + '" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.5 + '" fill="none" stroke="' + P.ink + '" stroke-width="1" stroke-dasharray="3 5"/>' +
      '<polygon points="' + a.map(function (p) { return f(p[0]) + "," + f(p[1]); }).join(" ") + '" fill="' + P.b + '" opacity=".5" stroke="' + P.ink + '" stroke-width="2"/>' +
      '<line x1="' + w * 0.1 + '" y1="' + cy + '" x2="' + w * 0.9 + '" y2="' + cy + '" stroke="' + P.a + '" stroke-width="1.4"/><line x1="' + cx + '" y1="' + h * 0.08 + '" x2="' + cx + '" y2="' + h * 0.92 + '" stroke="' + P.a + '" stroke-width="1.4"/>' +
      a.map(function (p, i) { return '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="7" fill="' + P.ink + '"/><text x="' + f(p[0] + 14) + '" y="' + f(p[1] - 8) + '" font-family="' + SERIF + '" font-style="italic" font-size="20" fill="' + P.ink + '">' + "ABC"[i] + "</text>"; }).join("") +
      '<text x="' + w * 0.08 + '" y="' + h * 0.95 + '" font-family="' + SERIF + '" font-size="14" font-style="italic" fill="' + P.ink + '">fig. 3 — nothing yet</text>';
  };

  S.stamp = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.32, o = "";
    for (var i = 0; i < 6; i++) o += '<path d="M' + f(w * 0.62) + "," + f(h * (0.34 + i * 0.045)) + " q" + w * 0.06 + ",-14 " + w * 0.12 + ",0 t" + w * 0.12 + ",0 t" + w * 0.12 + ',0" fill="none" stroke="' + P.ink + '" stroke-width="3"/>';
    return '<defs><path id="sp" d="M' + (cx - r * 0.78) + "," + cy + " a" + r * 0.78 + "," + r * 0.78 + " 0 1 1 " + r * 1.56 + ',0"/></defs><rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' +
      '<g transform="rotate(-12 ' + cx + " " + cy + ')" opacity=".9"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + P.a + '" stroke-width="6"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.9 + '" fill="none" stroke="' + P.a + '" stroke-width="2"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.52 + '" fill="none" stroke="' + P.a + '" stroke-width="2"/>' +
      '<text font-family="' + SERIF + '" font-size="' + f(r * 0.17) + '" fill="' + P.a + '" letter-spacing="5"><textPath href="#sp" startOffset="50%" text-anchor="middle">ARCHIVE • POSTE • 1927 •</textPath></text>' +
      '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="' + f(r * 0.2) + '" fill="' + P.a + '">14 · IX</text><text x="' + cx + '" y="' + (cy + r * 0.22) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="' + f(r * 0.16) + '" fill="' + P.a + '" letter-spacing="3">RECEIVED</text></g>' + o;
  };

  S.map = function (w, h, P, R) {
    var cx = w * 0.45, cy = h * 0.5, o = "", cp = uid("c");
    for (var k = 9; k >= 1; k--) {
      var d = "", ph = R() * 6;
      for (var i = 0; i <= 40; i++) { var a = i / 40 * Math.PI * 2, rr = k * Math.min(w, h) * 0.05 * (1 + 0.22 * Math.sin(a * 3 + ph) + 0.12 * Math.sin(a * 5 + k)); d += (i ? " L" : "M") + f(cx + Math.cos(a) * rr * 1.3) + "," + f(cy + Math.sin(a) * rr); }
      o += '<path d="' + d + 'Z" fill="' + (k === 9 ? P.c : "none") + '" fill-opacity=".25" stroke="' + P.ink + '" stroke-width="' + (k % 3 ? 1 : 2) + '" opacity="' + f(0.9 - k * 0.04) + '"/>';
    }
    for (var g = 1; g < 10; g++) o += '<line x1="' + f(w * g / 10) + '" y1="0" x2="' + f(w * g / 10) + '" y2="' + h + '" stroke="' + P.ink + '" stroke-width=".5" opacity=".35"/><line x1="0" y1="' + f(h * g / 10) + '" x2="' + w + '" y2="' + f(h * g / 10) + '" stroke="' + P.ink + '" stroke-width=".5" opacity=".35"/>';
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' + o + star4(w * 0.86, h * 0.18, w * 0.07, P.a) + '<text x="' + w * 0.86 + '" y="' + h * 0.08 + '" text-anchor="middle" font-family="' + SERIF + '" font-size="18" fill="' + P.ink + '">N</text><path d="M' + w * 0.1 + "," + h * 0.92 + " L" + w * 0.34 + "," + h * 0.92 + '" stroke="' + P.ink + '" stroke-width="3"/>';
  };

  S.label = function (w, h, P, R) {
    var o = "";
    for (var i = 0; i < 40; i++) o += '<rect x="' + f(w * 0.14 + i * w * 0.0165) + '" y="' + h * 0.66 + '" width="' + (1 + (i * 7) % 4) + '" height="' + h * 0.13 + '" fill="' + P.ink + '"/>';
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.b + '"/><rect x="' + w * 0.08 + '" y="' + h * 0.12 + '" width="' + w * 0.84 + '" height="' + h * 0.76 + '" fill="' + P.paper + '" stroke="' + P.ink + '" stroke-width="3"/><rect x="' + w * 0.1 + '" y="' + h * 0.15 + '" width="' + w * 0.8 + '" height="' + h * 0.7 + '" fill="none" stroke="' + P.ink + '" stroke-width="1"/>' +
      '<text x="' + w * 0.5 + '" y="' + h * 0.34 + '" text-anchor="middle" font-family="' + SERIF + '" font-size="' + f(h * 0.12) + '" fill="' + P.ink + '" letter-spacing="6">SPECIMEN</text><text x="' + w * 0.5 + '" y="' + h * 0.5 + '" text-anchor="middle" font-family="' + SERIF + '" font-size="' + f(h * 0.09) + '" fill="' + P.a + '" font-style="italic">No. 47 — keep dry</text><line x1="' + w * 0.14 + '" y1="' + h * 0.56 + '" x2="' + w * 0.86 + '" y2="' + h * 0.56 + '" stroke="' + P.ink + '" stroke-width="2"/>' + o;
  };

  S.numbers = function (w, h, P, R) {
    var o = "", cols = 4, rows = 6;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var n = Math.floor(R() * 10), x = w * (c + 0.5) / cols, y = h * (r + 0.78) / rows;
      o += '<text x="' + f(x) + '" y="' + f(y) + '" text-anchor="middle" font-family="' + SERIF + '" font-size="' + f(h / rows * 0.95) + '" fill="' + ((r + c) % 5 === 0 ? P.a : P.ink) + '" opacity="' + f(0.55 + R() * 0.45) + '">' + n + "</text>";
    }
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' + o + '<circle cx="' + w * 0.62 + '" cy="' + h * 0.4 + '" r="' + w * 0.15 + '" fill="none" stroke="' + P.a + '" stroke-width="4"/>';
  };

  S.newspaper = function (w, h, P, R) {
    var o = "", cols = 3, cw = (w - 40) / cols;
    for (var c = 0; c < cols; c++) for (var i = 0; i < 34; i++) o += '<rect x="' + f(20 + c * cw + 4) + '" y="' + f(h * 0.32 + i * 8.5) + '" width="' + f(cw * (0.55 + R() * 0.38) - 8) + '" height="3" fill="' + P.ink + '" opacity=".65"/>';
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/><text x="' + w / 2 + '" y="' + h * 0.09 + '" text-anchor="middle" font-family="' + SERIF + '" font-weight="bold" font-size="' + f(w * 0.1) + '" fill="' + P.ink + '">The Evening Edition</text><line x1="20" y1="' + h * 0.12 + '" x2="' + (w - 20) + '" y2="' + h * 0.12 + '" stroke="' + P.ink + '" stroke-width="3"/><line x1="20" y1="' + h * 0.125 + '" x2="' + (w - 20) + '" y2="' + h * 0.125 + '" stroke="' + P.ink + '" stroke-width="1"/>' +
      '<text x="20" y="' + h * 0.2 + '" font-family="' + SERIF + '" font-weight="bold" font-size="' + f(w * 0.05) + '" fill="' + P.ink + '">STRANGE LIGHTS OVER THE VALLEY</text><text x="20" y="' + h * 0.25 + '" font-family="' + SERIF + '" font-style="italic" font-size="' + f(w * 0.032) + '" fill="' + P.ink + '">Residents report a second moon, brief and unconvincing</text>' + o +
      '<rect x="' + (20 + cw * 2 + 4) + '" y="' + h * 0.6 + '" width="' + (cw - 8) + '" height="' + h * 0.26 + '" fill="' + P.a + '" opacity=".5"/><circle cx="' + (20 + cw * 2.5) + '" cy="' + h * 0.72 + '" r="' + cw * 0.28 + '" fill="' + P.paper + '"/>';
  };

  S.geometry = function (w, h, P, R) {
    var cx = w / 2, cy = h / 2;
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/><circle cx="' + w * 0.36 + '" cy="' + h * 0.4 + '" r="' + w * 0.26 + '" fill="' + P.a + '"/><rect x="' + w * 0.42 + '" y="' + h * 0.28 + '" width="' + w * 0.38 + '" height="' + w * 0.38 + '" fill="' + P.c + '" opacity=".85"/><path d="M' + w * 0.2 + "," + h * 0.86 + " L" + w * 0.5 + "," + h * 0.46 + " L" + w * 0.8 + "," + h * 0.86 + 'Z" fill="' + P.b + '" opacity=".9"/><path d="' + archPath(w * 0.74, h * 0.84, w * 0.2, h * 0.34) + '" fill="' + P.ink + '"/><circle cx="' + w * 0.2 + '" cy="' + h * 0.82 + '" r="' + w * 0.06 + '" fill="none" stroke="' + P.ink + '" stroke-width="3"/><line x1="' + w * 0.08 + '" y1="' + h * 0.9 + '" x2="' + w * 0.92 + '" y2="' + h * 0.9 + '" stroke="' + P.ink + '" stroke-width="3"/>';
  };

  S.typo = function (w, h, P, R) {
    var o = "", words = ["WHAT", "THE", "ARCHIVE", "KEEPS"], y = h * 0.28;
    words.forEach(function (t, i) { var sz = Math.min(w * 0.3, (w * 0.84) / (t.length * 0.74)); o += '<text x="' + w * 0.06 + '" y="' + f(y) + '" font-family="' + SERIF + '" font-weight="bold" font-size="' + f(sz) + '" fill="' + (i === 2 ? P.a : P.ink) + '">' + t + "</text>"; y += sz * 0.95; });
    return '<rect width="' + w + '" height="' + h + '" fill="' + P.paper + '"/>' + o;
  };

  /* ---------- the demo pages ---------- */
  var ITEMS = [
    // id, category, title, scene, scheme, kind, size, tags
    ["desert-01", "landscapes", "Desert Horizon", "desert", "warm", "photo", "l", ["desert", "mountains", "sun", "dunes"]],
    ["mountains-01", "landscapes", "The Far Range", "mountains", "cool", "full", "l", ["mountains", "ridge", "moon"]],
    ["forest-01", "landscapes", "Pines", "forest", "warm", "plate", "p", ["forest", "trees", "mist"]],
    ["ocean-01", "landscapes", "Moon Over Water", "ocean", "blue", "photo", "p", ["ocean", "moon", "waves"]],
    ["horizon-01", "landscapes", "Two Horizons", "horizon", "warm", "full", "s", ["strange", "horizon", "door", "sphere"]],
    ["ruins-01", "landscapes", "Ruins at Dusk", "ruins", "sepia", "photo", "l", ["ruins", "columns", "arch"]],
    ["field-01", "landscapes", "Furrows", "field", "cool", "plate", "l", ["field", "sky", "rows"]],
    ["sky-01", "landscapes", "Cloud Study", "skies", "cyan", "full", "p", ["sky", "clouds"]],

    ["arch-01", "architecture", "The Portal", "archPortal", "warm", "full", "p", ["arch", "portal", "moon", "steps"]],
    ["door-01", "architecture", "Door No. 7", "door", "cool", "photo", "p", ["door", "wall", "light"]],
    ["windows-01", "architecture", "Facade, Lit", "windows", "redblack", "ad", "p", ["windows", "facade", "night"]],
    ["tower-01", "architecture", "The Tower", "tower", "sepia", "plate", "p", ["tower", "birds", "sky"]],
    ["stairs-01", "architecture", "Stair into Light", "stairs", "bw", "photo", "p", ["stairs", "arch", "light"]],
    ["columns-01", "architecture", "Colonnade", "columns", "cool", "plate", "l", ["columns", "temple", "statue"]],
    ["church-01", "architecture", "Cathedral Front", "church", "cyan", "plate", "p", ["church", "rose window", "spire"]],
    ["interior-01", "architecture", "A Room, Late Light", "interior", "warm", "photo", "l", ["interior", "window", "floor"]],

    ["woman-01", "people", "Woman in Hat", "woman", "warm", "photo", "p", ["woman", "hat", "dress"]],
    ["dancer-01", "people", "Dancer, Study II", "dancer", "redblack", "full", "p", ["dancer", "figure", "skirt"]],
    ["hands-01", "people", "Two Hands", "hands", "cool", "plate", "p", ["hands", "star"]],
    ["profile-01", "people", "Profile", "profile", "sepia", "photo", "p", ["face", "profile"]],
    ["group-01", "people", "Four Standing", "group", "warm", "photo", "l", ["group", "silhouette", "figures"]],
    ["portrait-01", "people", "Portrait, Oval", "portrait", "cool", "plate", "p", ["portrait", "oval", "historical"]],
    ["silhouette-01", "people", "Figure at the Sun", "silhouette", "redblack", "full", "s", ["silhouette", "sun", "figure"]],

    ["flower-01", "botanical", "Flos Maximus", "flower", "warm", "plate", "p", ["flower", "petals", "leaves"]],
    ["leaves-01", "botanical", "Branch with Leaves", "leaves", "cool", "plate", "p", ["branch", "leaves"]],
    ["mushrooms-01", "botanical", "Fungi, Three", "mushrooms", "warm", "plate", "p", ["mushroom", "fungi"]],
    ["pods-01", "botanical", "Seed Pods", "pods", "sepia", "plate", "p", ["seed pods", "stems"]],
    ["vine-01", "botanical", "Spiral Vine", "vine", "cool", "full", "p", ["vine", "spiral", "strange plant"]],
    ["fern-01", "botanical", "Fern Frond", "fern", "cyan", "plate", "p", ["fern", "frond"]],
    ["dandelion-01", "botanical", "Seed Clock", "dandelion", "bw", "photo", "s", ["dandelion", "seeds"]],

    ["moon-01", "celestial", "Full Moon", "moon", "cool", "full", "s", ["moon", "stars", "craters"]],
    ["sun-01", "celestial", "Sun Disc", "sun", "warm", "plate", "s", ["sun", "rays"]],
    ["stars-01", "celestial", "Star Field", "stars", "cyan", "full", "p", ["stars", "night"]],
    ["planet-01", "celestial", "Ringed Planet", "planet", "warm", "photo", "s", ["planet", "rings"]],
    ["eclipse-01", "celestial", "Eclipse", "eclipse", "bw", "full", "s", ["eclipse", "corona"]],
    ["constellation-01", "celestial", "Constellation Chart", "constellation", "cyan", "plate", "s", ["constellation", "chart", "stars"]],
    ["night-01", "celestial", "Night, Small Hills", "night", "cool", "photo", "p", ["night", "crescent", "hills", "house"]],
    ["phases-01", "celestial", "Phases", "phases", "blue", "plate", "l", ["moon", "phases"]],

    ["clock-01", "objects", "Clock Face", "clock", "warm", "photo", "s", ["clock", "time"]],
    ["key-01", "objects", "Key", "key", "cool", "plate", "p", ["key"]],
    ["chair-01", "objects", "Chair", "chair", "sepia", "photo", "p", ["chair"]],
    ["book-01", "objects", "Open Book", "book", "warm", "photo", "l", ["book", "pages"]],
    ["vessel-01", "objects", "Vessel", "vessel", "warm", "plate", "p", ["vessel", "amphora"]],
    ["eye-01", "objects", "Eye", "eye", "redblack", "full", "l", ["eye", "rays"]],
    ["mirror-01", "objects", "Hand Mirror", "mirror", "cool", "plate", "p", ["mirror", "moon"]],
    ["dividers-01", "objects", "Dividers", "compass", "sepia", "plate", "p", ["tool", "compass", "dividers"]],

    ["note-01", "ephemera", "Note, Unsent", "note", "warm", "full", "p", ["handwriting", "note"]],
    ["diagram-01", "ephemera", "Diagram of Nothing Yet", "diagram", "blue", "plate", "s", ["diagram", "geometry"]],
    ["stamp-01", "ephemera", "Postmark", "stamp", "redblack", "full", "s", ["stamp", "postmark"]],
    ["map-01", "ephemera", "Survey Map", "map", "sepia", "plate", "l", ["map", "contour"]],
    ["label-01", "ephemera", "Specimen Label", "label", "warm", "full", "l", ["label", "typography"]],
    ["numbers-01", "ephemera", "Numbers", "numbers", "cool", "full", "p", ["numbers", "typography"]],
    ["newspaper-01", "ephemera", "Evening Edition", "newspaper", "bw", "full", "p", ["newspaper", "typography"]],
    ["geometry-01", "ephemera", "Geometric Forms", "geometry", "warm", "full", "s", ["geometric", "arch", "circle"]],
    ["type-01", "ephemera", "What the Archive Keeps", "typo", "redblack", "ad", "p", ["typography", "type"]],

    ["print-cyan-moon", "print", "Cyanotype Moon", "moon", "cyan", "plate", "s", ["cyanotype", "moon"]],
    ["print-sepia-woman", "print", "Sepia Studio", "woman", "sepia", "plate", "p", ["sepia", "woman"]],
    ["print-woodcut-sun", "print", "Woodcut Sun", "sun", "redblack", "full", "s", ["woodcut", "sun", "red and black"]],
    ["print-photocopy-door", "print", "Photocopy, Door", "door", "bw", "full", "p", ["photocopy", "door"]],
    ["print-blue-flower", "print", "Blue Flower", "flower", "blue", "full", "p", ["blue and cream", "flower"]],
    ["print-red-portal", "print", "Red Portal", "archPortal", "redblack", "plate", "p", ["red and black", "arch"]],
    ["print-cyan-night", "print", "Cyanotype Hills", "night", "cyan", "photo", "p", ["cyanotype", "night", "hills"]]
  ];

  function build(it) {
    var dim = SIZES[it.size], W = dim[0], H = dim[1], P = SCHEMES[it.scheme], seed = hash(it.id), R = rng(seed);
    var ax, ay, aw, ah, deco = "";
    var num = 1 + (seed % 180);
    function T(x, y, t, sz, extra) { return '<text x="' + f(x) + '" y="' + f(y) + '" font-family="' + SERIF + '" font-size="' + sz + '" fill="' + P.ink + '" ' + (extra || "") + ">" + esc(t) + "</text>"; }
    if (it.kind === "full") { ax = ay = 8; aw = W - 16; ah = H - 16; }
    else if (it.kind === "photo") {
      ax = ay = 30; aw = W - 60; ah = H - 92;
      deco = T(30, H - 34, "Fig. " + num + ".  " + it.title, 15, 'font-style="italic"') + T(W - 30, H - 34, "demo plate", 10, 'text-anchor="end" opacity=".55" letter-spacing="2"') +
        '<rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + ah + '" fill="none" stroke="' + P.ink + '" stroke-width=".8" opacity=".6"/>';
    } else if (it.kind === "plate") {
      ax = 46; ay = 74; aw = W - 92; ah = H - 150;
      deco = '<rect x="14" y="14" width="' + (W - 28) + '" height="' + (H - 28) + '" fill="none" stroke="' + P.ink + '" stroke-width="1.3"/><rect x="20" y="20" width="' + (W - 40) + '" height="' + (H - 40) + '" fill="none" stroke="' + P.ink + '" stroke-width=".5"/>' +
        T(W / 2, 54, "PLATE " + roman(1 + num % 39), 16, 'text-anchor="middle" letter-spacing="5"') + T(W / 2, H - 46, it.title, 20, 'text-anchor="middle" font-style="italic"') + T(W / 2, H - 28, "demo plate", 9, 'text-anchor="middle" opacity=".5" letter-spacing="3"') +
        '<rect x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + ah + '" fill="none" stroke="' + P.ink + '" stroke-width=".8"/>';
    } else {
      ax = 34; ay = Math.round(H * 0.4); aw = W - 68; ah = H - ay - 40;
      var title = it.title.toUpperCase(), sz = Math.min(54, (W - 68) / (title.length * 0.6));
      if (title.length > 14) { var parts = title.split(" "), half = Math.ceil(parts.length / 2), l1 = parts.slice(0, half).join(" "), l2 = parts.slice(half).join(" "); sz = Math.min(54, (W - 68) / (Math.max(l1.length, l2.length) * 0.62)); deco = T(34, 80, l1, f(sz), 'font-weight="bold"') + T(34, 80 + sz * 1.05, l2, f(sz), 'font-weight="bold"'); }
      else deco = T(34, 84, title, f(sz), 'font-weight="bold"');
      deco += T(34, ay - 16, "Now showing, for a limited time only", 14, 'font-style="italic"') + T(W - 34, H - 16, "demo plate", 10, 'text-anchor="end" opacity=".55" letter-spacing="2"') + '<rect x="34" y="' + (ay - 6) + '" width="' + (W - 68) + '" height="2" fill="' + P.ink + '"/>';
    }
    var sceneMarkup = S[it.scene](aw, ah, P, R);
    var stains = "";
    for (var k = 0; k < 3; k++) stains += '<ellipse cx="' + f(R() * W) + '" cy="' + f(R() * H) + '" rx="' + f(40 + R() * 120) + '" ry="' + f(30 + R() * 90) + '" fill="#b08a4a" opacity="' + f(0.05 + R() * 0.07) + '"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">' +
      '<defs><filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="' + (seed % 90) + '" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="' + (seed % 50) + '"/><feColorMatrix type="matrix" values="0 0 0 0 .16  0 0 0 0 .11  0 0 0 0 .06  1.15 0 0 0 -.4"/></filter>' +
      '<radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#6a4a22" stop-opacity="0"/><stop offset="1" stop-color="#6a4a22" stop-opacity=".32"/></radialGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="' + P.paper + '"/>' + stains +
      '<g filter="url(#rough)"><svg x="' + ax + '" y="' + ay + '" width="' + aw + '" height="' + ah + '" viewBox="0 0 ' + aw + " " + ah + '" overflow="hidden">' + sceneMarkup + "</svg></g>" +
      deco + '<rect width="' + W + '" height="' + H + '" fill="' + P.paper + '" opacity=".1"/><rect width="' + W + '" height="' + H + '" filter="url(#grain)" opacity=".6"/><rect width="' + W + '" height="' + H + '" fill="url(#vg)"/></svg>';
  }

  // fix door scene referencing a colour that isn't in the palette
  SCHEMES.warm.ochreLight = SCHEMES.cool.ochreLight = SCHEMES.sepia.ochreLight = SCHEMES.bw.ochreLight = SCHEMES.redblack.ochreLight = SCHEMES.cyan.ochreLight = SCHEMES.blue.ochreLight = "#e8c878";

  function toURI(svg) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }

  var USE_DEMO = true;
  var archive = [];

  if (USE_DEMO) {
    ITEMS.forEach(function (r) {
      var it = { id: r[0], category: r[1], title: r[2], scene: r[3], scheme: r[4], kind: r[5], size: r[6], tags: r[7], demo: true };
      it.w = SIZES[it.size][0]; it.h = SIZES[it.size][1];
      Object.defineProperty(it, "image", { enumerable: true, get: function () { return it._img || (it._img = toURI(build(it))); } });
      archive.push(it);
    });
  }

  /* ============================================================
     MY_IMAGES — add your own library here.
     ============================================================ */
  var MY_IMAGES = [
    // { id:"moon-07", category:"celestial", title:"Moon, Cropped", image:"images/moon-07.jpg", w:900, h:1200, tags:["moon","night"] },
    { id:"valley-tinted", category:"landscapes", title:"Valley, Hand-Tinted", image:"images/valley-tinted.jpg", w:768, h:1152, tags:["mountain", "lake", "meadow", "path"] },
    { id:"snow-peak", category:"landscapes", title:"Snow Peak, Small Lake", image:"images/snow-peak.jpg", w:768, h:1152, tags:["mountain", "lake", "pines", "clouds"] },
    { id:"green-cloud", category:"landscapes", title:"Green Cloud Over the Ice", image:"images/green-cloud.jpg", w:768, h:1152, tags:["mountain", "cloud", "glacier", "lake"] },
    { id:"smoke-meadow", category:"landscapes", title:"Smoke Over the Meadow", image:"images/smoke-meadow.jpg", w:768, h:1152, tags:["sky", "meadow", "pines", "mountain"] },
    { id:"coast-wildflowers", category:"landscapes", title:"Coast, Wildflowers", image:"images/coast-wildflowers.jpg", w:768, h:1152, tags:["sea", "cliff", "flowers", "fog"] },
    { id:"cactus-storm", category:"landscapes", title:"Cactus, Storm Coming", image:"images/cactus-storm.jpg", w:768, h:1152, tags:["desert", "cactus", "clouds", "ruin"] },
    { id:"cactus-valley", category:"landscapes", title:"Valley of Cactus", image:"images/cactus-valley.jpg", w:768, h:1152, tags:["desert", "cactus", "hills", "sky"] },
    { id:"round-door", category:"landscapes", title:"Figure at the Round Door", image:"images/round-door.jpg", w:1400, h:933, tags:["portal", "figure", "circle", "cliff"] },
    { id:"arch-cypress", category:"architecture", title:"Arch With Light Through It", image:"images/arch-cypress.jpg", w:768, h:1152, tags:["arch", "ruin", "cypress", "light"] },
    { id:"man-vaults", category:"architecture", title:"Man in the Vaults", image:"images/man-vaults.jpg", w:768, h:1152, tags:["arch", "ruin", "figure", "bw"] },
    { id:"gate-no-wall", category:"architecture", title:"Gate With No Wall", image:"images/gate-no-wall.jpg", w:768, h:1152, tags:["arch", "gate", "cypress", "cyanotype"] },
    { id:"arch-cyanotype", category:"architecture", title:"Arch, Cyanotype Weather", image:"images/arch-cyanotype.jpg", w:768, h:1152, tags:["arch", "ruin", "blue"] },
    { id:"arch-sun", category:"architecture", title:"The Arch Holding the Sun", image:"images/arch-sun.jpg", w:768, h:1152, tags:["arch", "sun", "ruin", "cypress"] },
    { id:"arch-round-plate", category:"architecture", title:"Arch, Round Plate", image:"images/arch-round-plate.jpg", w:768, h:1152, tags:["arch", "tintype", "vignette"] },
    { id:"church-below", category:"architecture", title:"Church, Seen From Below", image:"images/church-below.jpg", w:933, h:1400, tags:["church", "gothic", "windows", "sky"] },
    { id:"angel-palm", category:"people", title:"Angel With Palm", image:"images/angel-palm.jpg", w:518, h:799, tags:["statue", "wings", "angel", "stone"] },
    { id:"young-man", category:"people", title:"Young Man, Water-Damaged", image:"images/young-man.jpg", w:768, h:1036, tags:["portrait", "face", "damage"] },
    { id:"bride-cracked", category:"people", title:"Bride, Cracked and Mossed", image:"images/bride-cracked.jpg", w:933, h:1400, tags:["bride", "face", "moss", "hands"] },
    { id:"bride-close", category:"people", title:"Bride, Close", image:"images/bride-close.jpg", w:933, h:1400, tags:["bride", "face", "moss", "veil"] },
    { id:"specimen-page", category:"botanical", title:"Specimen Page, Pasted", image:"images/specimen-page.jpg", w:768, h:1152, tags:["heron", "snake", "butterfly", "fish", "leaf"] },
    { id:"rails-moon", category:"celestial", title:"Rails to a Second Moon", image:"images/rails-moon.jpg", w:933, h:1400, tags:["moon", "railway", "desert", "clouds"] },
    { id:"two-astronauts", category:"celestial", title:"Two Astronauts, Resting", image:"images/two-astronauts.jpg", w:933, h:1400, tags:["astronaut", "dunes", "brown"] },
    { id:"whale-door", category:"celestial", title:"Whale Through a Door of Light", image:"images/whale-door.jpg", w:1027, h:1400, tags:["whale", "portal", "night", "dunes", "neon"] },
    { id:"in-memory", category:"print", title:"In Memory Of", image:"images/in-memory.jpg", w:1014, h:1400, tags:["lithograph", "monument", "willow", "men"] },
    { id:"yellow-polaroid", category:"print", title:"Yellow Polaroid, Car", image:"images/yellow-polaroid.jpg", w:1162, h:1400, tags:["polaroid", "car", "yellow", "interior"] },
    { id:"burnt-page", category:"ephemera", title:"Blank Page, Burnt", image:"images/burnt-page.jpg", w:768, h:1152, tags:["paper", "stain", "leaves", "handwriting"] },

    { id:"cape-umbrella", category:"people", title:"Cape and Umbrella", image:"images/cape-umbrella.jpg", w:947, h:1400, tags:["portrait", "umbrella", "hat", "studio"] },
    { id:"phone-mirror", category:"objects", title:"Green Telephone, Gilt Mirror", image:"images/phone-mirror.jpg", w:909, h:1400, tags:["telephone", "mirror", "marble", "palm"] },
    { id:"pitcher", category:"people", title:"The Pitcher, Philadelphia", image:"images/pitcher.jpg", w:435, h:640, tags:["baseball", "cabinet card", "pose"] },
    { id:"svartisen", category:"landscapes", title:"Glacier Above the Fjord", image:"images/svartisen.jpg", w:640, h:470, tags:["glacier", "fjord", "photochrom", "hut"] },
    { id:"gudvangen", category:"landscapes", title:"Three Falls, Turf Roof", image:"images/gudvangen.jpg", w:481, h:640, tags:["waterfall", "valley", "photochrom", "cart"] },
    { id:"daisies-twice", category:"botanical", title:"Daisies, Twice", image:"images/daisies-twice.jpg", w:950, h:1400, tags:["daisies", "stereo", "grass", "glass plate"] },
    { id:"petersburg-column", category:"architecture", title:"Column in the Square", image:"images/petersburg-column.jpg", w:916, h:662, tags:["column", "square", "carriage", "photochrom"] },
    { id:"steamer-whale", category:"landscapes", title:"Steamer With a Whale", image:"images/steamer-whale.jpg", w:640, h:463, tags:["ship", "whale", "fjord", "photochrom"] },
    { id:"riga-harbour", category:"architecture", title:"Harbour With Spires", image:"images/riga-harbour.jpg", w:984, h:724, tags:["harbour", "ships", "spire", "photochrom"] },

    // ---- CUT-OUTS: transparent WebP, isolated with tools/cutout.py. group = figures | things | ink
    { id:"angel-palm-cut", category:"cutouts", group:"figures", title:"Angel With Palm", image:"images/cutouts/angel-palm-cut.webp", w:417, h:701, alpha:true, tags:["statue", "wings", "stone"] },
    { id:"bride-cut", category:"cutouts", group:"figures", title:"Bride, Mossed", image:"images/cutouts/bride-cut.webp", w:808, h:1200, alpha:true, tags:["bride", "face", "moss", "veil"] },
    { id:"young-man-cut", category:"cutouts", group:"figures", title:"Young Man, Cut Close", image:"images/cutouts/young-man-cut.webp", w:507, h:974, alpha:true, tags:["portrait", "face", "man"] },
    { id:"astronauts-cut", category:"cutouts", group:"figures", title:"Two Astronauts", image:"images/cutouts/astronauts-cut.webp", w:304, h:492, alpha:true, tags:["astronaut", "suit", "resting"] },
    { id:"gate-cut", category:"cutouts", group:"things", title:"Gate With No Wall", image:"images/cutouts/gate-cut.webp", w:568, h:689, alpha:true, tags:["arch", "gate", "stone", "ruin"] },
    { id:"arch-round-cut", category:"cutouts", group:"things", title:"Arch, Broken", image:"images/cutouts/arch-round-cut.webp", w:730, h:514, alpha:true, tags:["arch", "ruin", "stone"] },
    { id:"arch-bend-cut", category:"cutouts", group:"things", title:"Arch, Leaning Over", image:"images/cutouts/arch-bend-cut.webp", w:514, h:656, alpha:true, tags:["arch", "stone", "curve"] },
    { id:"specimen-heron", category:"cutouts", group:"things", title:"Heron, Plate", image:"images/cutouts/specimen-heron.webp", w:298, h:418, alpha:true, tags:["bird", "heron", "engraving"] },
    { id:"specimen-snake", category:"cutouts", group:"things", title:"Snake, Plate", image:"images/cutouts/specimen-snake.webp", w:332, h:366, alpha:true, tags:["snake", "engraving"] },
    { id:"specimen-crab", category:"cutouts", group:"things", title:"Crab, Plate", image:"images/cutouts/specimen-crab.webp", w:320, h:306, alpha:true, tags:["crab", "engraving"] },
    { id:"specimen-tangle", category:"cutouts", group:"things", title:"Tangle, Plate", image:"images/cutouts/specimen-tangle.webp", w:262, h:286, alpha:true, tags:["rope", "tangle", "engraving"] },
    { id:"specimen-butterfly", category:"cutouts", group:"things", title:"Butterfly, Pinned", image:"images/cutouts/specimen-butterfly.webp", w:231, h:121, alpha:true, tags:["butterfly", "insect", "engraving"] },
    { id:"specimen-fish", category:"cutouts", group:"things", title:"Fish, Engraved", image:"images/cutouts/specimen-fish.webp", w:371, h:124, alpha:true, tags:["fish", "engraving"] },
    { id:"specimen-sprig", category:"cutouts", group:"things", title:"Sprig, Torn", image:"images/cutouts/specimen-sprig.webp", w:160, h:149, alpha:true, tags:["leaf", "sprig", "engraving"] },
    { id:"specimen-leaves", category:"cutouts", group:"things", title:"Leaves, Three Sizes", image:"images/cutouts/specimen-leaves.webp", w:239, h:298, alpha:true, tags:["leaf", "engraving", "plant"] },
    { id:"church-cut", category:"cutouts", group:"things", title:"Church, From Below", image:"images/cutouts/church-cut.webp", w:1030, h:1158, alpha:true, tags:["church","gothic","stone"] },

    { id:"umbrella-cut", category:"cutouts", group:"figures", title:"Cape and Umbrella", image:"images/cutouts/umbrella-cut.webp", w:511, h:1200, alpha:true, tags:["umbrella", "cape", "hat"] },
    { id:"pitcher-cut", category:"cutouts", group:"figures", title:"The Pitcher", image:"images/cutouts/pitcher-cut.webp", w:275, h:410, alpha:true, tags:["baseball", "throw", "man"] },
    { id:"mirror-cut", category:"cutouts", group:"things", title:"Gilt Mirror", image:"images/cutouts/mirror-cut.webp", w:598, h:1184, alpha:true, tags:["mirror", "frame", "ornate"] },
    { id:"telephone-cut", category:"cutouts", group:"things", title:"Green Telephone", image:"images/cutouts/telephone-cut.webp", w:650, h:445, alpha:true, tags:["telephone", "rotary", "green"] },
    { id:"aviatrix-cut", category:"cutouts", group:"figures", title:"Woman Beside the Propeller", image:"images/cutouts/aviatrix-cut.webp", w:126, h:407, alpha:true, tags:["woman", "aircraft", "pose"] },
    { id:"airplane-cut", category:"cutouts", group:"things", title:"Small Aeroplane", image:"images/cutouts/airplane-cut.webp", w:355, h:385, alpha:true, tags:["aircraft", "propeller", "wing"] },
    { id:"seated-woman-cut", category:"cutouts", group:"figures", title:"Woman Powdering Her Nose", image:"images/cutouts/seated-woman-cut.webp", w:457, h:652, alpha:true, tags:["woman", "floral dress", "seated"] },
    { id:"four-women-cut", category:"cutouts", group:"figures", title:"Four Women, Hands Joined", image:"images/cutouts/four-women-cut.webp", w:447, h:387, alpha:true, tags:["costume", "bonnets", "vase", "group"] },
    { id:"photographer-cut", category:"cutouts", group:"figures", title:"The Photographer, Kneeling", image:"images/cutouts/photographer-cut.webp", w:177, h:267, alpha:true, tags:["camera", "coat", "kneeling"] },
    { id:"swan-cut", category:"cutouts", group:"things", title:"Swan, Turning", image:"images/cutouts/swan-cut.webp", w:123, h:206, alpha:true, tags:["swan", "bird", "water"] },
    { id:"walkers-cut", category:"cutouts", group:"figures", title:"Two Women Walking Away", image:"images/cutouts/walkers-cut.webp", w:301, h:365, alpha:true, tags:["women", "walking", "backs turned"] },
    { id:"boys-fishing-cut", category:"cutouts", group:"figures", title:"Boys at the Water's Edge", image:"images/cutouts/boys-fishing-cut.webp", w:459, h:430, alpha:true, tags:["boys", "fishing", "kneeling"] },
    { id:"shelf-phone-cut", category:"cutouts", group:"things", title:"Marble Shelf With Telephone", image:"images/cutouts/shelf-phone-cut.webp", w:1061, h:836, alpha:true, tags:["shelf", "marble", "telephone", "iron"] },
    { id:"daisies-cut", category:"cutouts", group:"things", title:"Daisies", image:"images/cutouts/daisies-cut.webp", w:358, h:336, alpha:true, tags:["daisies", "flowers", "grass"] },
    { id:"orn-eye-triangle-cut", category:"cutouts", group:"things", title:"The Eye in the Triangle", image:"images/cutouts/orn-eye-triangle.webp", w:800, h:796, alpha:true, tags:["eye", "triangle", "rays", "esoteric"] },
    { id:"orn-eye-open-cut", category:"cutouts", group:"things", title:"A Wide Open Eye", image:"images/cutouts/orn-eye-open.webp", w:734, h:625, alpha:true, tags:["eye", "lashes", "iris", "esoteric"] },
    { id:"orn-moon-face-cut", category:"cutouts", group:"things", title:"A Crescent Moon With a Sleeping Face", image:"images/cutouts/orn-moon-face.webp", w:645, h:635, alpha:true, tags:["moon", "face", "crescent", "stars"] },
    { id:"orn-sun-face-cut", category:"cutouts", group:"things", title:"A Sun With Its Eyes Shut", image:"images/cutouts/orn-sun-face.webp", w:770, h:770, alpha:true, tags:["sun", "face", "rays", "esoteric"] },
    { id:"orn-compass-star-cut", category:"cutouts", group:"things", title:"A Compass Star", image:"images/cutouts/orn-compass-star.webp", w:766, h:766, alpha:true, tags:["star", "compass", "rose", "navigation"] },
    { id:"orn-palm-hand-cut", category:"cutouts", group:"things", title:"An Open Hand With an Eye in the Palm", image:"images/cutouts/orn-palm-hand.webp", w:493, h:900, alpha:true, tags:["hand", "eye", "palm", "esoteric"] },
    { id:"orn-skeleton-key-cut", category:"cutouts", group:"things", title:"A Skeleton Key", image:"images/cutouts/orn-skeleton-key.webp", w:316, h:778, alpha:true, tags:["key", "skeleton key", "brass"] },
    { id:"orn-crystal-ball-cut", category:"cutouts", group:"things", title:"A Crystal Ball on Its Stand", image:"images/cutouts/orn-crystal-ball.webp", w:542, h:741, alpha:true, tags:["crystal ball", "scrying", "stars", "esoteric"] },
    { id:"orn-ouroboros-cut", category:"cutouts", group:"things", title:"The Snake Who Eats Its Tail", image:"images/cutouts/orn-ouroboros.webp", w:613, h:684, alpha:true, tags:["ouroboros", "snake", "circle", "esoteric"] },
    { id:"orn-triple-moon-cut", category:"cutouts", group:"things", title:"Three Moons in a Row", image:"images/cutouts/orn-triple-moon.webp", w:628, h:398, alpha:true, tags:["moon", "phases", "crescent", "esoteric"] },
    { id:"orn-oval-frame-cut", category:"cutouts", group:"things", title:"A Gilt Oval Frame With Leaves", image:"images/cutouts/orn-oval-frame.webp", w:663, h:900, alpha:true, tags:["frame", "oval", "gilt", "ornament"] },
    { id:"orn-banner-cut", category:"cutouts", group:"things", title:"A Blank Red Banner", image:"images/cutouts/orn-banner.webp", w:750, h:311, alpha:true, tags:["banner", "ribbon", "scroll", "label"] },
    { id:"orn-flourish-cut", category:"cutouts", group:"things", title:"A Small Flourish", image:"images/cutouts/orn-flourish.webp", w:765, h:144, alpha:true, tags:["flourish", "divider", "ornament", "scroll"] },
    { id:"orn-candle-cut", category:"cutouts", group:"things", title:"A Candle in a Brass Dish", image:"images/cutouts/orn-candle.webp", w:549, h:753, alpha:true, tags:["candle", "flame", "brass", "light"] },
    { id:"orn-crown-cut", category:"cutouts", group:"things", title:"A Small Gold Crown", image:"images/cutouts/orn-crown.webp", w:720, h:639, alpha:true, tags:["crown", "gold", "jewels", "royal"] },
    { id:"orn-hourglass-cut", category:"cutouts", group:"things", title:"An Hourglass", image:"images/cutouts/orn-hourglass.webp", w:470, h:870, alpha:true, tags:["hourglass", "time", "sand", "glass"] },
    { id:"orn-moth-cut", category:"cutouts", group:"things", title:"A Moth With Eyes on Its Wings", image:"images/cutouts/orn-moth.webp", w:732, h:562, alpha:true, tags:["moth", "wings", "insect", "eyespots"] },
    { id:"orn-mushroom-cut", category:"cutouts", group:"things", title:"Two Red Mushrooms With White Spots", image:"images/cutouts/orn-mushroom.webp", w:694, h:756, alpha:true, tags:["mushroom", "fly agaric", "toadstool", "fungus"] },
    { id:"orn-fern-cut", category:"cutouts", group:"things", title:"A Fern Frond", image:"images/cutouts/orn-fern.webp", w:406, h:896, alpha:true, tags:["fern", "frond", "botanical", "leaf"] },
    { id:"orn-laurel-cut", category:"cutouts", group:"things", title:"A Sprig of Laurel With Berries", image:"images/cutouts/orn-laurel.webp", w:567, h:844, alpha:true, tags:["laurel", "sprig", "berries", "botanical"] },
    { id:"orn-daisy-cut", category:"cutouts", group:"things", title:"A Daisy on Its Stem", image:"images/cutouts/orn-daisy.webp", w:538, h:883, alpha:true, tags:["daisy", "flower", "botanical", "petals"] },
    { id:"orn-poppy-head-cut", category:"cutouts", group:"things", title:"A Poppy Seed Head", image:"images/cutouts/orn-poppy-head.webp", w:432, h:896, alpha:true, tags:["poppy", "seed head", "botanical", "stem"] },
    { id:"orn-oak-acorns-cut", category:"cutouts", group:"things", title:"An Oak Leaf and Two Acorns", image:"images/cutouts/orn-oak-acorns.webp", w:528, h:859, alpha:true, tags:["oak", "acorn", "leaf", "botanical"] },
    { id:"orn-rose-cut", category:"cutouts", group:"things", title:"A Rose With Its Leaves", image:"images/cutouts/orn-rose.webp", w:443, h:854, alpha:true, tags:["rose", "flower", "botanical", "thorns"] },
    { id:"orn-wheat-cut", category:"cutouts", group:"things", title:"A Stalk of Wheat", image:"images/cutouts/orn-wheat.webp", w:381, h:900, alpha:true, tags:["wheat", "grain", "botanical", "harvest"] },
    { id:"hand-eucalyptus-cut", category:"cutouts", group:"figures", title:"A Hand Holding Eucalyptus", image:"images/cutouts/hand-eucalyptus-cut.webp", w:705, h:1200, alpha:true, tags:["hand", "eucalyptus", "leaves", "arm", "branch"] },
    { id:"moon-neon-cut", category:"cutouts", group:"things", title:"Neon Moon With a Sideways Look", image:"images/cutouts/moon-neon-cut.webp", w:445, h:601, alpha:true, tags:["moon", "neon", "crescent", "face", "sign"] },
    { id:"moon-mural-cut", category:"cutouts", group:"things", title:"The Moon With a Rocket in Its Eye", image:"images/cutouts/moon-mural-cut.webp", w:1200, h:1131, alpha:true, tags:["moon", "face", "mural", "rocket", "telescope"] },
    { id:"car-red-cut", category:"cutouts", group:"things", title:"Red Car With Its Bonnet Up", image:"images/cutouts/car-red-cut.webp", w:1194, h:1195, alpha:true, tags:["car", "automobile", "red", "engine", "chrome"] },
    { id:"card-lovers-cut", category:"cutouts", group:"things", title:"The Lovers (Tarot)", image:"images/cutouts/card-lovers-cut.webp", w:557, h:925, alpha:true, tags:["tarot", "card", "lovers", "angel", "esoteric"] },
    { id:"card-wheel-cut", category:"cutouts", group:"things", title:"Wheel of Fortune (Tarot)", image:"images/cutouts/card-wheel-cut.webp", w:538, h:931, alpha:true, tags:["tarot", "card", "wheel", "fortune", "esoteric"] },
    { id:"card-strength-cut", category:"cutouts", group:"things", title:"Strength (Tarot)", image:"images/cutouts/card-strength-cut.webp", w:640, h:922, alpha:true, tags:["tarot", "card", "lion", "strength", "esoteric"] },
    { id:"card-sun-cut", category:"cutouts", group:"things", title:"The Sun (Tarot)", image:"images/cutouts/card-sun-cut.webp", w:498, h:657, alpha:true, tags:["tarot", "card", "sun", "esoteric"] },

    { id:"plate-sheet", category:"ephemera", title:"Sheet of Thirty-Two Plates", image:"images/plate-sheet.jpg", w:1536, h:1024, tags:["contact sheet", "plates", "mixed"] },
    { id:"fog-pines-table", category:"landscapes", title:"A Table Set in the Fog", image:"images/fog-pines-table.jpg", w:1067, h:1600, tags:["fog", "pines", "table", "linen", "forest"] },
    { id:"flare-signpost", category:"landscapes", title:"Signpost in a Red Light Leak", image:"images/flare-signpost.jpg", w:1600, h:1070, tags:["signpost", "marsh", "light leak", "film", "coast"] },
    { id:"flare-orchard", category:"landscapes", title:"Orchard Through a Rainbow Leak", image:"images/flare-orchard.jpg", w:1060, h:1600, tags:["orchard", "trees", "film", "light leak", "branches"] },
    { id:"hill-of-trees", category:"landscapes", title:"The Hill With a Row of Bare Trees", image:"images/hill-of-trees.jpg", w:1600, h:1061, tags:["hill", "silhouette", "sky", "power pole", "dusk"] },
    { id:"geese-field", category:"landscapes", title:"Two Geese in a Ploughed Field", image:"images/geese-field.jpg", w:1060, h:1600, tags:["geese", "field", "clouds", "film", "light leak"] },
    { id:"peak-through-trees", category:"landscapes", title:"A Peak Seen Between Trees", image:"images/peak-through-trees.jpg", w:1102, h:1600, tags:["mountain", "trees", "slide", "window", "conifer"] },
    { id:"stately-gums", category:"print", title:"Stately Gums", image:"images/stately-gums.jpg", w:1283, h:1600, tags:["gum trees", "sepia", "vintage print", "fence", "hills"] },
    { id:"star-burst", category:"celestial", title:"A Star Coming Apart", image:"images/star-burst.jpg", w:1068, h:1600, tags:["star", "light trails", "night", "long exposure", "sky"] },
    { id:"eclipse-four", category:"celestial", title:"Four Moons Going Red", image:"images/eclipse-four.jpg", w:900, h:1600, tags:["moon", "eclipse", "blood moon", "phases", "night"] },
    { id:"crescent-reeds", category:"celestial", title:"Crescent Behind the Reeds", image:"images/crescent-reeds.jpg", w:1166, h:1600, tags:["moon", "crescent", "reeds", "woodblock", "grass"] },
    { id:"moon-tree-inverted", category:"celestial", title:"The Moon With a Tree for Lungs", image:"images/moon-tree-inverted.jpg", w:1600, h:1199, tags:["moon", "tree", "silhouette", "branches", "night"] },
    { id:"moon-cactus", category:"celestial", title:"The Moon Setting Behind a Cactus", image:"images/moon-cactus.jpg", w:1600, h:1287, tags:["moon", "cactus", "ridge", "night", "desert"] },
    { id:"falcon-night", category:"objects", title:"White Falcon, Parked at Night", image:"images/falcon-night.jpg", w:1248, h:1600, tags:["car", "automobile", "night", "street", "building"] },
    { id:"shiloh-church-wall", category:"architecture", title:"A Small Church, a Pew, a Tree", image:"images/shiloh-church-wall.jpg", w:1600, h:1600, tags:["church", "wall", "bench", "tree", "sign"] },
    { id:"cabinet-china", category:"objects", title:"The Cupboard of Good Dishes", image:"images/cabinet-china.jpg", w:1600, h:1067, tags:["cupboard", "china", "cups", "shelves", "kitchen"] },
    { id:"dales-road", category:"landscapes", title:"A Road Going Down Into the Dales", image:"images/dales-road.jpg", w:1600, h:1068, tags:["road", "stone wall", "valley", "slide", "haze"] },
    { id:"hill-and-shed", category:"landscapes", title:"The Hill With a House on Top", image:"images/hill-and-shed.jpg", w:1600, h:1067, tags:["hill", "field", "shed", "cypress", "storm"] },
    { id:"pond-and-ducks", category:"landscapes", title:"A Pond, Reeds and Small Ducks", image:"images/pond-and-ducks.jpg", w:1067, h:1600, tags:["pond", "reeds", "ducks", "reflection", "winter"] },
    { id:"river-rapids", category:"landscapes", title:"The River Hurrying Through Rock", image:"images/river-rapids.jpg", w:1246, h:1600, tags:["river", "rapids", "rocks", "pines", "black and white"] },
    { id:"mesa-painting", category:"landscapes", title:"Red Cliffs at Sundown, Painted", image:"images/mesa-painting.jpg", w:1600, h:1280, tags:["mesa", "painting", "desert", "cliffs", "sunset"] },
  ];
  MY_IMAGES.forEach(function (it) { archive.push(it); });
  // real images lead each section; the drawn plates follow
  archive.sort(function (a, b) { return (a.demo ? 1 : 0) - (b.demo ? 1 : 0); });

  window.CATEGORIES = CATEGORIES;
  window.CONSTRAINTS = CONSTRAINTS;
  window.ARCHIVE = archive;
})();
