/* THE SCRAP NATURALIST — app.js
   Browse → cut → drawer → assemble → glue → export.
   Reads window.ARCHIVE / CATEGORIES / CONSTRAINTS from archive.js. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var ARCH = window.ARCHIVE || [], CATS = window.CATEGORIES || [], CONSTRAINTS = window.CONSTRAINTS || [];
  var FOUND = []; try { FOUND = JSON.parse(localStorage.getItem("cl.found") || "[]") || []; } catch (e) { FOUND = []; }
  FOUND.forEach(function (f) { ARCH.push(f); });
  var byId = {}; ARCH.forEach(function (a) { byId[a.id] = a; });
  var catLabel = {}; CATS.forEach(function (c) { catLabel[c.id] = c.label; });

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  function pad3(n) { return ("00" + n).slice(-3); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function tiltOf(id) { var s = 0; for (var i = 0; i < id.length; i++) s += id.charCodeAt(i); return ((s % 9) - 4) * 0.9; }
  var toastTimer;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800); }

  /* ---------- cut shapes (unit square paths; stretched to w×h at cut time) ---------- */
  function rrPath(r, cr) { var ry = cr * r; return "M" + cr + ",0 H" + (1 - cr) + " A" + cr + "," + ry + " 0 0 1 1," + ry + " V" + (1 - ry) + " A" + cr + "," + ry + " 0 0 1 " + (1 - cr) + ",1 H" + cr + " A" + cr + "," + ry + " 0 0 1 0," + (1 - ry) + " V" + ry + " A" + cr + "," + ry + " 0 0 1 " + cr + ",0Z"; }
  function starPath() { var d = ""; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.5; d += (i ? "L" : "M") + (0.5 + Math.cos(a) * r).toFixed(3) + "," + (0.5 + Math.sin(a) * r).toFixed(3); } return d + "Z"; }
  var SHAPE_LIST = [
    { id: "rectangle", label: "Rectangle", r: 1.3, d: "M0,0H1V1H0Z" },
    { id: "square", label: "Square", r: 1, d: "M0,0H1V1H0Z" },
    { id: "circle", label: "Circle", r: 1, d: "M.5,0 A.5,.5 0 1 1 .5,1 A.5,.5 0 1 1 .5,0Z" },
    { id: "oval", label: "Oval", r: 0.72, d: "M.5,0 A.5,.5 0 1 1 .5,1 A.5,.5 0 1 1 .5,0Z" },
    { id: "arch", label: "Arch", r: 0.7, d: "M0,1 V.35 A.5,.35 0 0 1 1,.35 V1Z" },
    { id: "rounded", label: "Rounded rectangle", r: 1.2, d: rrPath(1.2, 0.14) },
    { id: "diamond", label: "Diamond", r: 0.85, d: "M.5,0 L1,.5 L.5,1 L0,.5Z" },
    { id: "triangle", label: "Triangle", r: 1.1, d: "M.5,0 L1,1 L0,1Z" },
    { id: "star", label: "Star", r: 1, d: starPath() },
    { id: "crescent", label: "Crescent", r: 1, d: "M.72,.02 A.5,.5 0 1 0 .72,.98 A.62,.62 0 0 1 .72,.02Z" },
    { id: "blob", label: "Organic blob", r: 1.05, d: "M.5,.02 C.78,-.02 .98,.2 .97,.48 C.96,.76 .8,.98 .52,.97 C.24,.96 .03,.8 .03,.5 C.03,.22 .22,.06 .5,.02Z" },
    { id: "capsule-v", label: "Vertical capsule", r: 0.45, d: "M0,.225 A.5,.225 0 0 1 1,.225 V.775 A.5,.225 0 0 1 0,.775Z" },
    { id: "capsule-h", label: "Horizontal capsule", r: 2.2, d: "M.227,0 H.773 A.227,.5 0 0 1 .773,1 H.227 A.227,.5 0 0 1 .227,0Z" }
  ];
  var SHAPES = {}; SHAPE_LIST.forEach(function (s) { SHAPES[s.id] = s; });

  /* ---------- scrap rendering (shared by drawer, tray, table) ---------- */
  var _u = 0;
  function imgOf(sc) { var a = byId[sc.srcId]; return a ? a.image : (sc.img || ""); }
  function scrapSVG(sc) {
    var m = sc.mask, c = sc.crop, id = "k" + (++_u), sh = SHAPES[sc.shape] || SHAPES.circle;
    var t = "translate(" + m.cx + " " + m.cy + ") rotate(" + m.rot + ") translate(" + (-m.w / 2) + " " + (-m.h / 2) + ") scale(" + m.w + " " + m.h + ")";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + c.x + " " + c.y + " " + c.w + " " + c.h + '" preserveAspectRatio="none"><defs><clipPath id="' + id + '"><path d="' + sh.d + '" transform="' + t + '"/></clipPath></defs><g clip-path="url(#' + id + ')"><image href="' + esc(imgOf(sc)) + '" x="0" y="0" width="' + sc.imgW + '" height="' + sc.imgH + '" preserveAspectRatio="none"/></g></svg>';
  }

  /* ---------- state ---------- */
  var RATIOS = { portrait: [900, 1200], square: [1000, 1000], landscape: [1200, 900], poster: [800, 1200] };
  var RATIO_LABELS = { portrait: "Upright folio", square: "Square leaf", landscape: "Wide folio", poster: "Tall broadside" };
  var PAPERS = [
    { id: "warm", label: "Field-book white" }, { id: "cream", label: "Cream" }, { id: "blue", label: "Cyanotype blue" }, { id: "black", label: "Night sheet" },
    { id: "kraft", label: "Specimen kraft" }, { id: "book", label: "Old herbarium sheet" }, { id: "news", label: "Damp newsprint" }, { id: "graph", label: "Survey grid" }
  ];
  function newTable() { return { id: null, paper: "warm", ratio: "portrait", bg: null, items: [], scraps: {} }; }
  var UP = LS.get("cl.uploads", {}) || {};
  var scraps = LS.get("cl.scraps", []);
  var T = LS.get("cl.table", null) || newTable();
  if (!T.items || !T.scraps) T = newTable();
  var SEL = null, hist = [], fut = [];
  var constraint = LS.get("cl.constraint", null);
  var view = "home";

  var saveTimer;
  function saveScraps() { LS.set("cl.scraps", scraps); }
  function autosave() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { LS.set("cl.table", T); }, 250); }

  /* ---------- views ---------- */
  function showView(v) {
    view = v; document.body.setAttribute("data-view", v);
    $$(".view").forEach(function (el) { el.classList.toggle("on", el.id === v); });
    if (v === "archive") { renderPage(0); }
    if (v === "cut") { layoutCut(); }
    if (v === "table") { syncSelects(); layoutTable(); renderTable(); }
    if (v === "home") { renderHome(); }
    renderDrawer();
    renderConstraint();
  }

  /* ---------- modal ---------- */
  function openModal(html, onClose) {
    $("#sheet").innerHTML = '<button class="x" id="mClose" aria-label="Close">×</button>' + html;
    $("#modal").hidden = false; $("#modal")._onClose = onClose || null;
    $("#mClose").onclick = closeModal;
  }
  function closeModal() { var m = $("#modal"); m.hidden = true; $("#sheet").innerHTML = ""; if (m._onClose) { var f = m._onClose; m._onClose = null; f(); } }
  function ask(msg, yes) {
    return new Promise(function (resolve) {
      openModal('<h2>' + esc(msg) + '</h2><div class="row"><button class="btn primary" id="mYes">' + esc(yes || "YES") + '</button><button class="btn" id="mNo">KEEP IT</button></div>', function () { resolve(false); });
      $("#mYes").onclick = function () { $("#modal")._onClose = null; closeModal(); resolve(true); };
      $("#mNo").onclick = closeModal;
    });
  }
  $("#modal").addEventListener("pointerdown", function (e) { if (e.target === $("#modal")) closeModal(); });

  /* ---------- the wider field: open collections searched from the page ---------- */
  function jget(url) { return fetch(url, { mode: "cors" }).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); }); }
  function strip(h) { var d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").trim().slice(0, 90); }
  function prox(u) { return "https://wsrv.nl/?url=" + encodeURIComponent(u) + "&w=1200&output=jpg"; }
  var SOURCES = {
    wellcome: { label: "Wellcome Collection (esoteric, medical, occult)", search: function (q, page) {
      var u = "https://api.wellcomecollection.org/catalogue/v2/images?query=" + encodeURIComponent(q) + "&locations.license=pdm,cc0&pageSize=40&page=" + (page + 1);
      return jget(u).then(function (d) {
        var out = [];
        (d.results || []).forEach(function (x) {
          var loc = (x.locations && x.locations[0]) || {}, src = (loc.url || "") + " " + ((x.thumbnail && x.thumbnail.url) || ""), m = /iiif\.wellcomecollection\.org\/image\/([^\/]+)\//.exec(src);
          if (!m) return;
          var base = "https://iiif.wellcomecollection.org/image/" + m[1], src2 = x.source || {};
          out.push({ id: "wel-" + x.id, title: String(src2.title || "Untitled").slice(0, 80), thumb: base + "/full/260,/0/default.jpg", image: base + "/full/900,/0/default.jpg", w: 900, h: 1100, credit: "Wellcome Collection (" + ((loc.license && loc.license.label) || "public domain") + ")", link: "https://wellcomecollection.org/works/" + (src2.id || "") });
        });
        return out;
      });
    } },
    commons: { label: "Wikimedia Commons", search: function (q, page) {
      var u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=40&gsroffset=" + (page * 40) + "&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap") + "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1200&iiextmetadatafilter=LicenseShortName|Artist";
      return jget(u).then(function (d) {
        var pg = d.query && d.query.pages ? Object.keys(d.query.pages).map(function (k) { return d.query.pages[k]; }) : [], out = [];
        pg.forEach(function (p) {
          var ii = p.imageinfo && p.imageinfo[0]; if (!ii || !ii.thumburl) return;
          var lic = (ii.extmetadata && ii.extmetadata.LicenseShortName && ii.extmetadata.LicenseShortName.value) || "";
          if (!/public domain|cc0|^pd/i.test(lic)) return;
          var who = strip(ii.extmetadata && ii.extmetadata.Artist && ii.extmetadata.Artist.value);
          out.push({ id: "commons-" + p.pageid, title: p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " ").slice(0, 80), thumb: ii.thumburl, image: ii.thumburl, w: ii.thumbwidth, h: ii.thumbheight, credit: "Wikimedia Commons" + (who ? ", " + who : "") + " (" + lic + ")", link: ii.descriptionurl });
        });
        return out;
      });
    } },
    aic: { label: "Art Institute of Chicago", search: function (q, page) {
      var u = "https://api.artic.edu/api/v1/artworks/search?q=" + encodeURIComponent(q) + "&query[term][is_public_domain]=true&limit=40&page=" + (page + 1) + "&fields=id,title,image_id,artist_title,date_display,thumbnail";
      return jget(u).then(function (d) {
        return (d.data || []).filter(function (x) { return x.image_id; }).map(function (x) {
          var r = x.thumbnail && x.thumbnail.width ? x.thumbnail.height / x.thumbnail.width : 1.3, base = "https://www.artic.edu/iiif/2/" + x.image_id;
          return { id: "aic-" + x.id, title: x.title, thumb: base + "/full/260,/0/default.jpg", image: base + "/full/843,/0/default.jpg", w: 843, h: Math.round(843 * r), credit: "Art Institute of Chicago" + (x.artist_title ? ", " + x.artist_title : "") + " (public domain)", link: "https://www.artic.edu/artworks/" + x.id };
        });
      });
    } },
    cleveland: { label: "Cleveland Museum of Art", search: function (q, page) {
      var u = "https://openaccess-api.clevelandart.org/api/artworks/?q=" + encodeURIComponent(q) + "&has_image=1&cc0=1&limit=40&skip=" + (page * 40);
      return jget(u).then(function (d) {
        return (d.data || []).filter(function (x) { return x.images && x.images.web && x.images.web.url; }).map(function (x) {
          var w = x.images.web; return { id: "cma-" + x.id, title: x.title, thumb: w.url, image: w.url, w: +w.width || 900, h: +w.height || 1200, credit: "Cleveland Museum of Art" + (x.creators && x.creators[0] ? ", " + String(x.creators[0].description || "").split("(")[0].trim() : "") + " (CC0)", link: x.url };
        });
      });
    } },
    loc: { label: "Library of Congress", search: function (q, page) {
      var u = "https://www.loc.gov/photos/?fo=json&c=40&sp=" + (page + 1) + "&q=" + encodeURIComponent(q);
      return jget(u).then(function (d) {
        var out = [];
        (d.results || []).forEach(function (x) {
          var imgs = (x.image_url || []).filter(Boolean); if (!imgs.length) return;
          var best = null, bw = 0; imgs.forEach(function (s) { var m = /w=(\d+)/.exec(s), w = m ? +m[1] : 0; if (!best || Math.abs(w - 1000) < Math.abs(bw - 1000)) { best = s; bw = w; } });
          var mh = /h=(\d+)/.exec(best); var url = best.replace(/#.*$/, "");
          out.push({ id: "loc-" + String(x.id || x.url).replace(/[^a-z0-9]+/gi, "-").slice(-40), title: String(x.title || "Untitled").slice(0, 80), thumb: imgs[0].replace(/#.*$/, ""), image: url, w: bw || 900, h: mh ? +mh[1] : 700, credit: "Library of Congress", link: x.url });
        });
        return out;
      });
    } }
  };
  var WF = { src: "commons", q: "", page: 0, results: [], busy: false };
  var CHIPS = ["photochrom", "tintype", "cabinet card", "herbarium", "engraved bird", "teapot", "automobile 1920", "chair", "ship", "map", "moth", "cathedral"];
  var CHIPS_ESO = ["eye", "anatomical eye", "alchemy", "astrology", "palmistry", "skull", "occult", "witchcraft", "demon", "sea monster", "ouroboros", "phrenology", "mushroom", "heart", "hand", "skeleton"];
  function addFound(r) {
    var probe = new Image();
    probe.onload = function () { saveFound(r); };
    probe.onerror = function () { r.image = prox(r.image); r.thumb = prox(r.thumb); saveFound(r); };
    probe.src = r.image;
  }
  function saveFound(r) {
    var it = byId[r.id];
    if (!it) {
      it = { id: r.id, category: "found", title: r.title, image: r.image, w: r.w, h: r.h, tags: [], credit: r.credit, link: r.link, web: true };
      ARCH.push(it); byId[it.id] = it; PAGES.push(it);
      FOUND.push(it); FOUND = FOUND.slice(-60); try { localStorage.setItem("cl.found", JSON.stringify(FOUND)); } catch (e) {}
    }
    closeModal(); setCat("found", 0);
    var i = A.list.indexOf(it); if (i >= 0) { A.idx = i; renderPage(0); }
    toast("PICKED UP.");
  }
  function openWider() {
    var h = '<h2>THE WIDER FIELD</h2><p class="sub">borrow from the great open collections. public-domain finds only. tap one to carry it back to camp.</p>' +
      '<div class="wf-bar"><select id="wfSrc" class="sel" aria-label="Collection">' + Object.keys(SOURCES).map(function (k) { return '<option value="' + k + '"' + (k === WF.src ? " selected" : "") + ">" + SOURCES[k].label + "</option>"; }).join("") + '</select>' +
      '<input id="wfQ" type="search" placeholder="what are you hunting for?" value="' + esc(WF.q) + '"><button class="btn primary" id="wfGo">LOOK</button></div>' +
      '<div class="wf-chips">' + CHIPS.map(function (c) { return '<button class="chip" data-q="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + '</div>' +
      '<p class="sub wf-eso">ESOTERICA · eyes, hands, hearts, alchemy and other odd old things (Wellcome Collection)</p><div class="wf-chips">' + CHIPS_ESO.map(function (c) { return '<button class="chip eso" data-q="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + '</div>' +
      '<p class="wf-msg" id="wfMsg">' + (WF.results.length ? "" : "try a word. any word. see what turns up.") + '</p><div class="bg-grid wf-grid" id="wfGrid"></div><div class="row"><button class="btn" id="wfMore" hidden>MORE</button></div>';
    openModal(h); drawResults();
    function go(more) {
      var q = $("#wfQ").value.trim(); if (!q) { $("#wfQ").focus(); return; }
      WF.src = $("#wfSrc").value; if (!more) { WF.q = q; WF.page = 0; WF.results = []; } else WF.page++;
      $("#wfMsg").textContent = "looking…"; $("#wfMore").hidden = true;
      SOURCES[WF.src].search(WF.q, WF.page).then(function (list) {
        WF.results = WF.results.concat(list); drawResults();
        $("#wfMsg").textContent = WF.results.length ? "" : "nothing turned up. try a stranger word, or another collection.";
        $("#wfMore").hidden = !list.length;
      }).catch(function (e) {
        $("#wfMsg").textContent = "this collection didn't answer (" + ((e && e.message) || "no reply") + "). try another one, or look again in a moment.";
      });
    }
    function drawResults() {
      $("#wfGrid").innerHTML = WF.results.map(function (r, i) { return '<button data-i="' + i + '"><img loading="lazy" alt="" src="' + esc(r.thumb) + '" data-p="' + esc(prox(r.thumb)) + '"><span>' + esc(r.title) + "</span></button>"; }).join("");
      $$("#wfGrid img").forEach(function (im) { im.onerror = function () { im.onerror = function () { im.parentNode.style.display = "none"; }; im.src = im.dataset.p; }; });
      $$("#wfGrid [data-i]").forEach(function (b) { b.onclick = function () { addFound(WF.results[+b.dataset.i]); }; });
    }
    $("#wfGo").onclick = function () { go(false); };
    $("#wfMore").onclick = function () { go(true); };
    $("#wfQ").onkeydown = function (e) { if (e.key === "Enter") go(false); };
    $$(".wf-chips .chip").forEach(function (c) { c.onclick = function () { $("#wfQ").value = c.dataset.q; if (c.classList.contains("eso")) $("#wfSrc").value = "wellcome"; go(false); }; });
    if (WF.results.length) $("#wfMore").hidden = false;
  }
  $("#btnWide").onclick = openWider;

  /* ---------- the guide ---------- */
  function openGuide() {
    var steps = [
      ["GO OUT", "wander the folios: terrain, ruins, curios, the human animal. nothing here is for sale. all of it is for cutting."],
      ["TAKE A SNIP", "choose a scissor shape, lay it over whatever caught your eye, and cut. or collect a loose specimen whole."],
      ["FILL THE TIN", "every find rides in the specimen tin along the bottom. it remembers you between visits."],
      ["GO TO THE BENCH", "lay your finds on a sheet of paper, or on a photograph if you want a ground to stand on."],
      ["ARRANGE, TURN, PASTE DOWN", "drag, turn, widen, flip. lift a piece up again if you change your mind. undo is always allowed."],
      ["PRESS A PLATE", "press the sheet to keep it here, or make a plate (a PNG) to carry home."]
    ];
    openModal('<h2>A SHORT GUIDE TO THE FIELD</h2><p class="sub">for anyone who has ever wanted to keep a small piece of the world.</p><ol class="guide">' +
      steps.map(function (s) { return "<li><b>" + s[0] + "</b><span>" + s[1] + "</span></li>"; }).join("") +
      '</ol><p class="sub guide-end">when stuck: wander, ask for a strange sighting, or draw a field rule. there is no right way, and there are no wrong specimens.</p><div class="row"><button class="btn primary" id="gGo">GO OUT INTO THE FIELD</button></div>');
    $("#gGo").onclick = function () { closeModal(); showView("archive"); };
  }
  $("#btnGuide").onclick = openGuide;

  /* ---------- home ---------- */
  function renderHome() {
    var art = $("#coverArt");
    if (!art.children.length) {
      var ids = ["arch-cypress", "rails-moon", "bride-cracked", "snow-peak", "arch-sun"];
      var list = ids.map(function (i) { return byId[i]; }).filter(Boolean);
      if (list.length < 5) list = shuffle(ARCH).slice(0, 5);
      art.innerHTML = list.map(function (a) { return '<img alt="" src="' + esc(a.image) + '">'; }).join("");
    }
    $("#btnContinue").hidden = !(T.items.length || scraps.length);
    $("#btnMine").hidden = !LS.get("cl.saved", []).length;
  }
  $("#btnOpen").onclick = function () { showView("archive"); };
  $("#btnContinue").onclick = function () { showView(T.items.length ? "table" : "archive"); };
  $("#btnMine").onclick = openMine;
  $("#aHome").onclick = function () { showView("home"); };

  /* ---------- archive ---------- */
  var PAGES = ARCH.filter(function (a) { return !a.alpha; });
  var A = { cat: "all", group: "", list: PAGES.slice(), idx: 0, ar: 0.75 };
  function renderCats() {
    var counts = {}; ARCH.forEach(function (a) { counts[a.category] = (counts[a.category] || 0) + 1; });
    var h = '<button class="cat' + (A.cat === "all" ? " on" : "") + '" data-c="all">ALL ' + pad3(PAGES.length) + "</button>";
    CATS.forEach(function (c) { if (counts[c.id]) h += '<button class="cat' + (A.cat === c.id ? " on" : "") + '" data-c="' + c.id + '" title="' + esc(c.subs) + '">' + c.label + " " + pad3(counts[c.id]) + "</button>"; });
    $("#cats").innerHTML = h;
  }
  $("#cats").addEventListener("click", function (e) { var b = e.target.closest(".cat"); if (b) setCat(b.dataset.c, 0); });
  function renderSubs() {
    var el = $("#subcats"), cat = CATS.filter(function (c) { return c.id === A.cat; })[0];
    if (!cat || !cat.groups) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = [["", "ALL"]].concat(cat.groups).map(function (g) { return '<button class="cat sub' + (A.group === g[0] ? " on" : "") + '" data-g="' + g[0] + '">' + g[1] + "</button>"; }).join("");
  }
  $("#subcats").addEventListener("click", function (e) { var b = e.target.closest("[data-g]"); if (b) setCat(A.cat, 0, b.dataset.g); });
  function setCat(c, idx, g) {
    if (c !== A.cat) A.group = ""; if (g !== undefined) A.group = g;
    A.cat = c; A.list = c === "all" ? PAGES.slice() : ARCH.filter(function (a) { return a.category === c && (!A.group || a.group === A.group); });
    A.idx = clamp(idx || 0, 0, Math.max(0, A.list.length - 1));
    renderCats(); renderSubs(); renderPage(0);
    var on = $(".cat.on"); if (on && on.scrollIntoView) on.scrollIntoView({ inline: "center", block: "nearest" });
  }
  function fitBox(box, stage, ar, margin) {
    var r = stage.getBoundingClientRect(), aw = Math.max(40, r.width - margin * 2), ah = Math.max(40, r.height - margin * 2);
    var w = Math.min(aw, ah * ar), h = w / ar; box.style.width = Math.round(w) + "px"; box.style.height = Math.round(h) + "px";
  }
  function renderPage(dir) {
    var it = A.list[A.idx]; if (!it) return;
    var box = $("#pageBox"), img = $("#pageImg");
    A.ar = it.w && it.h ? it.w / it.h : 0.75;
    img.onload = function () { if (!it.w && img.naturalWidth) { A.ar = img.naturalWidth / img.naturalHeight; fitBox(box, $("#aStage"), A.ar, 12); } };
    img.src = it.image; img.alt = it.title;
    fitBox(box, $("#aStage"), A.ar, 12);
    box.style.setProperty("--tilt", ((A.idx * 37) % 5 - 2) * 0.35 + "deg");
    box.classList.remove("in-next", "in-prev"); void box.offsetWidth;
    if (dir) box.classList.add(dir > 0 ? "in-next" : "in-prev");
    box.classList.toggle("alpha", !!it.alpha); $("#btnBgPage").hidden = !!it.alpha;
    $("#counter").textContent = "FOLIO " + pad3(A.idx + 1) + " / " + pad3(A.list.length);
    $("#pageTitle").textContent = it.title + (it.credit ? "  ·  " + it.credit : (it.tags && it.tags.length ? "  ·  " + it.tags.slice(0, 3).join(", ") : ""));
  }
  function flip(d) { if (!A.list.length) return; A.idx = (A.idx + d + A.list.length) % A.list.length; renderPage(d); }
  $("#prevBtn").onclick = $("#aPrev").onclick = function () { flip(-1); };
  $("#nextBtn").onclick = $("#aNext").onclick = function () { flip(1); };
  function takeWhole(it) {
    var w = it.w || 700, h = it.h || 700;
    var sc = { id: rid("s"), srcId: it.id, title: it.title, imgW: w, imgH: h, crop: { x: 0, y: 0, w: w, h: h }, mask: { cx: w / 2, cy: h / 2, w: w, h: h, rot: 0 }, shape: "rectangle", rot: 0, scale: 1, ratio: w / h, aspect: w / h, t: Date.now() };
    if (it.alpha) sc.alpha = true;
    scraps.push(sc); saveScraps(); renderDrawer(sc.id); toast("INTO THE TIN.");
  }
  $("#btnTake").onclick = function () { takeWhole(A.list[A.idx]); };
  $("#btnWhole").onclick = function () { if (C.item) takeWhole(C.item); };
  $("#btnCutPage").onclick = function () { openCut(A.list[A.idx]); };
  $("#pageBox").addEventListener("dblclick", function () { openCut(A.list[A.idx]); });
  (function swipe() {
    var st = $("#aStage"), sx = 0, sy = 0, down = false, moved = false;
    st.addEventListener("pointerdown", function (e) { if (e.target.closest("button")) return; down = true; moved = false; sx = e.clientX; sy = e.clientY; });
    st.addEventListener("pointerup", function (e) {
      if (!down) return; down = false; var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) flip(dx < 0 ? 1 : -1);
    });
    st.addEventListener("pointercancel", function () { down = false; });
  })();

  $("#btnIndex").onclick = function () {
    var h = '<h2>CONTENTS</h2><p class="sub">' + (A.cat === "all" ? "Everything in the field" : catLabel[A.cat]) + '. tap a folio to wander there.</p><div class="idx-grid">';
    A.list.forEach(function (a, i) { h += '<button class="idx-item' + (i === A.idx ? " on" : "") + '" data-i="' + i + '"><img loading="lazy" alt="" src="' + esc(a.image) + '"><span>' + pad3(i + 1) + " " + esc(a.title) + "</span></button>"; });
    openModal(h + "</div>");
    $$("#sheet .idx-item").forEach(function (b) { b.onclick = function () { A.idx = +b.dataset.i; closeModal(); renderPage(0); }; });
  };
  $("#btnSurprise").onclick = function () {
    var it = pick(ARCH); setCat(it.category, 0); A.idx = A.list.indexOf(it); renderPage(1);
  };
  function strangeSet() {
    var cats = shuffle(CATS.map(function (c) { return c.id; }).filter(function (c) { return ARCH.some(function (a) { return a.category === c; }); })).slice(0, 4);
    return cats.map(function (c) { return pick(ARCH.filter(function (a) { return a.category === c; })); });
  }
  function openStrange() {
    var set = strangeSet(), title = set.map(function (a) { return catLabel[a.category] || a.category.toUpperCase(); }).join(" + ");
    var h = '<h2>A STRANGE SIGHTING</h2><p class="sub">' + esc(title) + '. pick one to snip from.</p><div class="strange">';
    set.forEach(function (a, i) { h += '<button data-id="' + esc(a.id) + '" style="--tilt:' + [-3, 2, -1.5, 3][i] + 'deg"><img alt="" src="' + esc(a.image) + '"><span>' + esc(a.title) + "</span></button>"; });
    h += '</div><div class="row"><button class="btn primary" id="mAgain">AGAIN</button></div>';
    openModal(h);
    $$("#sheet .strange button").forEach(function (b) { b.onclick = function () { var it = byId[b.dataset.id]; closeModal(); openCut(it); }; });
    $("#mAgain").onclick = openStrange;
  }
  $("#btnStrange").onclick = openStrange;
  function newConstraint() { var c = pick(CONSTRAINTS.filter(function (x) { return x !== constraint; })); constraint = c; LS.set("cl.constraint", c); renderConstraint(); }
  function renderConstraint() {
    var n = $("#constraintNote"), t = $("#tConstraint");
    n.hidden = !constraint || view !== "archive"; $("#constraintText").textContent = constraint ? "FIELD RULE FOR TODAY: " + constraint : "";
    t.hidden = !constraint || view !== "table"; t.textContent = constraint ? constraint : "";
  }
  $("#btnConstraint").onclick = newConstraint;
  $("#constraintX").onclick = function () { constraint = null; LS.set("cl.constraint", null); renderConstraint(); };

  /* ---------- cutting studio ---------- */
  var C = { item: null, shape: "circle", size: 0.38, rot: 0, cx: 0, cy: 0, iw: 1, ih: 1 };
  function buildShapeButtons() {
    $("#shapes").innerHTML = SHAPE_LIST.map(function (s) {
      var w = s.r >= 1 ? 1 : s.r, h = s.r >= 1 ? 1 / s.r : 1;
      return '<button class="shape-btn" data-s="' + s.id + '" title="' + s.label + '" aria-label="' + s.label + '"><svg viewBox="0 0 1 1"><path d="' + s.d + '" transform="translate(' + ((1 - w) / 2).toFixed(3) + " " + ((1 - h) / 2).toFixed(3) + ") scale(" + w.toFixed(3) + " " + h.toFixed(3) + ')"/></svg></button>';
    }).join("");
    markShape();
  }
  function markShape() { $$(".shape-btn").forEach(function (b) { b.classList.toggle("on", b.dataset.s === C.shape); }); }
  $("#shapes").addEventListener("click", function (e) { var b = e.target.closest(".shape-btn"); if (!b) return; C.shape = b.dataset.s; markShape(); clampCenter(); drawOverlay(); });
  function shapeBox() {
    var sh = SHAPES[C.shape], s = C.size * Math.min(C.iw, C.ih), w, h;
    if (sh.r >= 1) { w = s; h = s / sh.r; } else { h = s; w = s * sh.r; }
    var th = C.rot * Math.PI / 180, bw = Math.abs(w * Math.cos(th)) + Math.abs(h * Math.sin(th)), bh = Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th));
    return { w: w, h: h, bw: bw, bh: bh };
  }
  function clampCenter() {
    var b = shapeBox();
    C.cx = b.bw >= C.iw ? C.iw / 2 : clamp(C.cx, b.bw / 2, C.iw - b.bw / 2);
    C.cy = b.bh >= C.ih ? C.ih / 2 : clamp(C.cy, b.bh / 2, C.ih - b.bh / 2);
  }
  function drawOverlay() {
    var svg = $("#cOverlay"), b = shapeBox(), sh = SHAPES[C.shape];
    var t = "translate(" + C.cx + " " + C.cy + ") rotate(" + C.rot + ") translate(" + (-b.w / 2) + " " + (-b.h / 2) + ") scale(" + b.w + " " + b.h + ")";
    svg.setAttribute("viewBox", "0 0 " + C.iw + " " + C.ih);
    svg.innerHTML = '<defs><mask id="cmask"><rect width="' + C.iw + '" height="' + C.ih + '" fill="#fff"/><path d="' + sh.d + '" transform="' + t + '" fill="#000"/></mask></defs>' +
      '<rect width="' + C.iw + '" height="' + C.ih + '" fill="rgba(22,19,15,.64)" mask="url(#cmask)"/>' +
      '<path d="' + sh.d + '" transform="' + t + '" fill="none" stroke="#f3ead2" stroke-width="2.5" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"/>';
    $("#cSize").value = Math.round(C.size * 100); $("#cRot").value = Math.round(C.rot);
  }
  function layoutCut() { if (!C.item) return; fitBox($("#cBox"), $("#cStage"), C.iw / C.ih, 8); drawOverlay(); }
  function openCut(item) {
    if (!item) return;
    C.item = item; C.iw = item.w || 700; C.ih = item.h || 700; C.cx = C.iw / 2; C.cy = C.ih / 2;
    var img = $("#cImg"); img.onload = function () { if (img.naturalWidth && (img.naturalWidth !== C.iw || img.naturalHeight !== C.ih)) { C.iw = img.naturalWidth; C.ih = img.naturalHeight; C.cx = C.iw / 2; C.cy = C.ih / 2; clampCenter(); } layoutCut(); };
    img.src = item.image; img.alt = item.title;
    showView("cut");
  }
  $("#cBack").onclick = function () { showView("archive"); };
  $("#cSize").oninput = function () { C.size = clamp(this.value / 100, 0.08, 0.96); clampCenter(); drawOverlay(); };
  $("#cRot").oninput = function () { C.rot = +this.value; clampCenter(); drawOverlay(); };
  (function cutPointers() {
    var st = $("#cStage"), pts = {}, drag = null, pinch = null;
    function toImg(e) { var r = $("#cOverlay").getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * C.iw, y: (e.clientY - r.top) / r.height * C.ih }; }
    function ids() { return Object.keys(pts); }
    st.addEventListener("pointerdown", function (e) {
      if (!C.item) return; st.setPointerCapture(e.pointerId); pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (ids().length === 1) {
        var p = toImg(e), b = shapeBox();
        if (Math.hypot(p.x - C.cx, p.y - C.cy) > Math.max(b.bw, b.bh) / 2) { C.cx = p.x; C.cy = p.y; drag = { dx: 0, dy: 0 }; clampCenter(); drawOverlay(); }
        else drag = { dx: C.cx - p.x, dy: C.cy - p.y };
      } else if (ids().length === 2) {
        var a = pts[ids()[0]], c = pts[ids()[1]]; drag = null;
        pinch = { d0: Math.hypot(a.x - c.x, a.y - c.y) || 1, a0: Math.atan2(c.y - a.y, c.x - a.x), s0: C.size, r0: C.rot };
      }
    });
    st.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && ids().length >= 2) {
        var a = pts[ids()[0]], c = pts[ids()[1]], d = Math.hypot(a.x - c.x, a.y - c.y), an = Math.atan2(c.y - a.y, c.x - a.x);
        C.size = clamp(pinch.s0 * d / pinch.d0, 0.08, 0.96);
        var r = pinch.r0 + (an - pinch.a0) * 180 / Math.PI; r = ((r + 540) % 360) - 180; C.rot = r;
        clampCenter(); drawOverlay();
      } else if (drag) {
        var p = toImg(e); C.cx = p.x + drag.dx; C.cy = p.y + drag.dy; clampCenter(); drawOverlay();
      }
    });
    function up(e) { delete pts[e.pointerId]; if (ids().length < 2) pinch = null; if (ids().length === 0) drag = null; else if (ids().length === 1 && !drag) { var p = toImg(pts[ids()[0]] ? { clientX: pts[ids()[0]].x, clientY: pts[ids()[0]].y } : e); drag = { dx: C.cx - p.x, dy: C.cy - p.y }; } }
    st.addEventListener("pointerup", up); st.addEventListener("pointercancel", up);
    st.addEventListener("wheel", function (e) {
      if (!C.item) return; e.preventDefault();
      if (e.shiftKey || e.altKey) { C.rot = ((C.rot + e.deltaY * 0.15 + 540) % 360) - 180; }
      else C.size = clamp(C.size * Math.exp(-e.deltaY * 0.0016), 0.08, 0.96);
      clampCenter(); drawOverlay();
    }, { passive: false });
  })();
  $("#btnCut").onclick = function () {
    if (!C.item) return; clampCenter(); var b = shapeBox();
    var it = C.item, sc = {
      id: rid("s"), srcId: it.id, title: it.title, imgW: C.iw, imgH: C.ih,
      crop: { x: C.cx - b.bw / 2, y: C.cy - b.bh / 2, w: b.bw, h: b.bh },
      mask: { cx: C.cx, cy: C.cy, w: b.w, h: b.h, rot: C.rot },
      shape: C.shape, rot: 0, scale: 1, ratio: b.bw / b.bh, aspect: C.iw / C.ih, t: Date.now()
    };
    if (it.alpha) sc.alpha = true;
    if (!byId[it.id] && it.image && it.image.length < 2000) sc.img = it.image;
    scraps.push(sc); saveScraps(); renderDrawer(sc.id); toast("INTO THE TIN.");
    var box = $("#cBox"); box.animate([{ filter: "brightness(1.6)" }, { filter: "brightness(1)" }], { duration: 260 });
  };

  /* ---------- scrap drawer ---------- */
  function scrapEl(sc, extra) {
    return '<div class="scrap' + (extra || "") + '" data-id="' + sc.id + '" style="--r:' + sc.ratio.toFixed(3) + ";--tilt:" + tiltOf(sc.id) + 'deg" title="' + esc(sc.title) + '">' + scrapSVG(sc) + '<button class="x" aria-label="Remove this scrap" data-rm="' + sc.id + '">×</button></div>';
  }
  function renderDrawer(newId) {
    $("#dCount").textContent = scraps.length;
    $("#dList").innerHTML = scraps.length ? scraps.map(function (s) { return scrapEl(s, s.id === newId ? " new" : ""); }).join("") : '<p class="d-empty">the tin is empty. go out and find something.</p>';
    $("#dAssemble").disabled = !(scraps.length || T.items.length);
    if (newId) { var l = $("#dList"); if (!$("#drawer").classList.contains("open")) l.scrollLeft = l.scrollWidth; }
    renderTray();
  }
  $("#dToggle").onclick = function () {
    var d = $("#drawer"), o = d.classList.toggle("open"); this.setAttribute("aria-expanded", o); this.firstChild.textContent = (o ? "▼" : "▲") + " YOUR SCRAPS ";
  };
  $("#dList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rm]"); if (!b) return;
    scraps = scraps.filter(function (s) { return s.id !== b.dataset.rm; }); saveScraps(); renderDrawer();
  });
  $("#dAssemble").onclick = function () { showView("table"); };

  /* ---------- paper ---------- */
  var PAPER_BASE = { warm: "#f2ede1", cream: "#eadcbb", blue: "#b3c4c9", black: "#1e1d1b", kraft: "#b99c74", book: "#d8c496", news: "#d9d4c4", graph: "#f0eadb" };
  var paperCache = {};
  function paperSVG(type, W, H) {
    var base = PAPER_BASE[type] || PAPER_BASE.warm, dark = type === "black", col = dark ? "1 .95 .85" : ".2 .14 .08";
    var c = col.split(" "), x = "";
    var defs = '<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 ' + c[0] + " 0 0 0 0 " + c[1] + " 0 0 0 0 " + c[2] + ' 1.2 0 0 0 -.42"/></filter>' +
      '<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .5" numOctaves="3" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .1 1.6 0 0 0 -.62"/></filter>' +
      '<radialGradient id="v" cx=".5" cy=".5" r=".78"><stop offset=".62" stop-color="' + (dark ? "#000" : "#5a3e1c") + '" stop-opacity="0"/><stop offset="1" stop-color="' + (dark ? "#000" : "#5a3e1c") + '" stop-opacity="' + (type === "book" ? ".34" : ".14") + '"/></radialGradient>';
    x += '<rect width="' + W + '" height="' + H + '" fill="' + base + '"/>';
    if (type === "kraft") x += '<rect width="' + W + '" height="' + H + '" filter="url(#f)" opacity=".5"/>';
    if (type === "book") { var s = 7, r = 0; for (var i = 0; i < 160; i++) { s = (s * 1664525 + 1013904223) >>> 0; var px = s / 4294967296 * W; s = (s * 1664525 + 1013904223) >>> 0; var py = s / 4294967296 * H; s = (s * 1664525 + 1013904223) >>> 0; r = 1 + s / 4294967296 * 3.5; x += '<circle cx="' + px.toFixed(0) + '" cy="' + py.toFixed(0) + '" r="' + r.toFixed(1) + '" fill="#8a5a22" opacity=".12"/>'; } }
    if (type === "news") { var cols = 5, cw = (W - 80) / cols, ss = 11; for (var k = 0; k < cols; k++) for (var j = 0; j < Math.floor((H - 160) / 14); j++) { ss = (ss * 1664525 + 1013904223) >>> 0; x += '<rect x="' + (40 + k * cw + 6).toFixed(0) + '" y="' + (120 + j * 14) + '" width="' + (cw * (0.5 + ss / 4294967296 * 0.42) - 12).toFixed(0) + '" height="4" fill="#3a352c" opacity=".17"/>'; } x += '<rect x="40" y="40" width="' + (W - 80) + '" height="56" fill="#3a352c" opacity=".12"/>'; }
    if (type === "graph") { var minor = 40; for (var g = minor; g < W; g += minor) x += '<line x1="' + g + '" y1="0" x2="' + g + '" y2="' + H + '" stroke="#4f7390" stroke-width="' + (g % (minor * 5) ? 1 : 2) + '" opacity="' + (g % (minor * 5) ? ".22" : ".4") + '"/>'; for (var g2 = minor; g2 < H; g2 += minor) x += '<line x1="0" y1="' + g2 + '" x2="' + W + '" y2="' + g2 + '" stroke="#4f7390" stroke-width="' + (g2 % (minor * 5) ? 1 : 2) + '" opacity="' + (g2 % (minor * 5) ? ".22" : ".4") + '"/>'; }
    x += '<rect width="' + W + '" height="' + H + '" filter="url(#n)" opacity=".55"/><rect width="' + W + '" height="' + H + '" fill="url(#v)"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '"><defs>' + defs + "</defs>" + x + "</svg>";
  }
  function hex3(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function bgURL() { if (!T.bg) return ""; var a = byId[T.bg.id]; return a ? a.image : (UP[T.bg.id] || ""); }
  function paperURI(type, W, H) { var k = type + W + "x" + H; return paperCache[k] || (paperCache[k] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(paperSVG(type, W, H))); }

  /* ---------- table: layout + render ---------- */
  var K = 1;
  function dims() { return RATIOS[T.ratio] || RATIOS.portrait; }
  function layoutTable() {
    var d = $("#desk"), r = d.getBoundingClientRect(), dm = dims(), p = $("#paper");
    K = Math.max(0.05, Math.min((r.width - 28) / dm[0], (r.height - 28) / dm[1]));
    p.style.width = dm[0] + "px"; p.style.height = dm[1] + "px";
    p.style.left = ((r.width - dm[0] * K) / 2) + "px"; p.style.top = ((r.height - dm[1] * K) / 2) + "px";
    p.style.transform = "scale(" + K + ")"; p.style.setProperty("--inv", 1 / K);
    var pu = 'url("' + paperURI(T.paper, dm[0], dm[1]) + '")', bu = bgURL();
    if (bu) {
      var f = (T.bg.fade || 0) / 100, c = hex3(PAPER_BASE[T.paper] || PAPER_BASE.warm), tint = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + f + ")";
      p.style.backgroundImage = "linear-gradient(" + tint + "," + tint + '), url("' + bu + '"), ' + pu;
      p.style.backgroundSize = "auto, cover, auto"; p.style.backgroundPosition = "0 0, center, 0 0"; p.style.backgroundRepeat = "no-repeat";
    } else { p.style.backgroundImage = pu; p.style.backgroundSize = ""; p.style.backgroundPosition = ""; p.style.backgroundRepeat = ""; }
  }
  function getItem(u) { for (var i = 0; i < T.items.length; i++) if (T.items[i].uid === u) return T.items[i]; return null; }
  function pieceStyle(it, sc) { var w = it.w, h = w / sc.ratio; return "width:" + w + "px;height:" + h + "px;transform:translate(" + (it.x - w / 2) + "px," + (it.y - h / 2) + "px) rotate(" + it.rot + "deg)"; }
  function pieceHTML(it) {
    var sc = T.scraps[it.scrapId]; if (!sc) return "";
    var sel = it.uid === SEL;
    return '<div class="piece' + (it.glued ? " glued" : "") + (sel ? " picked" : "") + '" data-u="' + it.uid + '" style="' + pieceStyle(it, sc) + '"><div class="flip" style="transform:scale(' + it.fx + "," + it.fy + ')">' + scrapSVG(sc) + "</div>" +
      (sel ? '<div class="sel-box"></div>' + (it.glued ? "" : '<div class="h h-rot" data-h="rot" title="Turn"></div><div class="h h-size" data-h="size" title="Resize"></div>') : "") + "</div>";
  }
  function renderTable() {
    $("#paper").innerHTML = T.items.map(pieceHTML).join("");
    $("#emptyHint").hidden = T.items.length > 0; $("#emptyHint").style.zIndex = 0;
    renderTools(); renderConstraint();
  }
  function stylePiece(it) {
    var el = $('.piece[data-u="' + it.uid + '"]'), sc = T.scraps[it.scrapId]; if (el && sc) el.setAttribute("style", pieceStyle(it, sc));
  }
  function syncSelects() { $("#paperSel").value = T.paper; $("#ratioSel").value = T.ratio; }
  $("#paperSel").innerHTML = PAPERS.map(function (p) { return '<option value="' + p.id + '">' + p.label + "</option>"; }).join("");
  $("#ratioSel").innerHTML = Object.keys(RATIOS).map(function (k) { return '<option value="' + k + '">' + RATIO_LABELS[k] + "</option>"; }).join("");
  $("#paperSel").onchange = function () { var v = this.value; act(function () { T.paper = v; }); layoutTable(); };
  /* ---------- photo background ---------- */
  function setBg(id) { var fade = T.bg ? T.bg.fade : 0; act(function () { T.bg = id ? { id: id, fade: fade || 0 } : null; }); layoutTable(); }
  function shrinkPhoto(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL("image/jpeg", 0.86));
      };
      im.onerror = function () { toast("THAT FILE WON'T OPEN."); }; im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function openBg() {
    var pool = ARCH.filter(function (a) { return !a.alpha && !a.demo; }), ups = Object.keys(UP);
    var h = '<h2>A PHOTO FOR THE GROUND</h2><p class="sub">it covers the whole sheet. everything you paste lands on top.</p><div class="bg-grid">';
    ups.forEach(function (u) { h += '<button data-bg="' + u + '" class="' + (T.bg && T.bg.id === u ? "on" : "") + '"><img alt="" src="' + esc(UP[u]) + '"><span>YOURS</span></button>'; });
    pool.forEach(function (a) { h += '<button data-bg="' + esc(a.id) + '" class="' + (T.bg && T.bg.id === a.id ? "on" : "") + '"><img loading="lazy" alt="" src="' + esc(a.image) + '"><span>' + esc(a.title) + "</span></button>"; });
    h += '</div><div class="row bg-row"><label class="btn file">YOUR OWN PHOTO…<input type="file" id="bgFile" accept="image/*" hidden></label><button class="btn" id="bgNone">BARE SHEET</button>' +
      '<label class="bg-fade">LET THE PAPER SHOW THROUGH <input type="range" id="bgFade" min="0" max="85" value="' + (T.bg ? T.bg.fade || 0 : 0) + '"' + (T.bg ? "" : " disabled") + '></label><button class="btn primary" id="bgDone">DONE</button></div>';
    openModal(h);
    $$("#sheet [data-bg]").forEach(function (b) { b.onclick = function () { setBg(b.dataset.bg); closeModal(); }; });
    $("#bgNone").onclick = function () { setBg(null); closeModal(); };
    $("#bgDone").onclick = closeModal;
    $("#bgFile").onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      shrinkPhoto(f, function (url) {
        var id = "up" + Date.now().toString(36); UP[id] = url;
        Object.keys(UP).filter(function (k) { return !(T.bg && T.bg.id === k) && k !== id; }).slice(0, -2).forEach(function (k) { delete UP[k]; });
        LS.set("cl.uploads", UP); setBg(id); closeModal();
      });
    };
    var before = null;
    $("#bgFade").oninput = function () { if (!T.bg) return; if (!before) before = snapStr(); T.bg.fade = +this.value; layoutTable(); };
    $("#bgFade").onchange = function () { if (before) { pushHist(before); before = null; renderTable(); } };
  }
  $("#btnBg").onclick = openBg;
  $("#btnBgPage").onclick = function () { var it = A.list[A.idx]; if (!it || it.alpha) return; setBg(it.id); toast("THE GROUND IS LAID."); };
  $("#ratioSel").onchange = function () { var v = this.value; act(function () { T.ratio = v; }); layoutTable(); };

  /* ---------- history ---------- */
  function snapStr() { return JSON.stringify({ paper: T.paper, ratio: T.ratio, bg: T.bg || null, items: T.items }); }
  function pushHist(before) { if (before === snapStr()) return false; hist.push(before); if (hist.length > 200) hist.shift(); fut.length = 0; renderTools(); autosave(); return true; }
  function act(fn) { var b = snapStr(); fn(); pushHist(b); renderTable(); }
  function restore(s) {
    var o = JSON.parse(s); T.paper = o.paper; T.ratio = o.ratio; T.bg = o.bg || null; T.items = o.items;
    if (SEL && !getItem(SEL)) SEL = null;
    syncSelects(); layoutTable(); renderTable(); autosave();
  }
  function undo() { if (!hist.length) return; fut.push(snapStr()); restore(hist.pop()); }
  function redo() { if (!fut.length) return; hist.push(snapStr()); restore(fut.pop()); }

  /* ---------- table: tools ---------- */
  var TOOLS = [
    ["undo", "UNDO"], ["redo", "REDO"], ["|"], ["rotate", "ROTATE"], ["flipH", "FLIP ↔"], ["flipV", "FLIP ↕"], ["dup", "DUPLICATE"], ["|"],
    ["fwd", "FORWARD"], ["back", "BACK"], ["front", "TO FRONT"], ["backmost", "TO BACK"], ["|"], ["glue", "PASTE DOWN"], ["del", "DISCARD"], ["|"], ["clear", "CLEAR BENCH"]
  ];
  $("#tools").innerHTML = TOOLS.map(function (t) { return t[0] === "|" ? '<span class="gap"></span>' : '<button class="btn" data-a="' + t[0] + '">' + t[1] + "</button>"; }).join("");
  function renderTools() {
    var it = SEL ? getItem(SEL) : null;
    $$("#tools [data-a]").forEach(function (b) {
      var a = b.dataset.a, off = false;
      if (a === "undo") off = !hist.length;
      else if (a === "redo") off = !fut.length;
      else if (a === "clear") off = !T.items.length;
      else if (!it) off = true;
      else if (it.glued && (a === "rotate" || a === "flipH" || a === "flipV")) off = true;
      b.disabled = off;
      if (a === "glue") { b.textContent = it && it.glued ? "LIFT UP" : "PASTE DOWN"; b.classList.toggle("on", !!(it && it.glued)); }
    });
    $("#dAssemble").disabled = !(scraps.length || T.items.length);
  }
  function move(arr, from, to) { var x = arr.splice(from, 1)[0]; arr.splice(to, 0, x); }
  function doTool(a) {
    var it = SEL ? getItem(SEL) : null;
    if (a === "undo") return undo(); if (a === "redo") return redo();
    if (a === "clear") { ask("clear the bench? every specimen comes off.", "CLEAR BENCH").then(function (y) { if (y) act(function () { T.items = []; SEL = null; }); }); return; }
    if (!it) return;
    var i = T.items.indexOf(it);
    act(function () {
      if (a === "rotate") it.rot = Math.round(((it.rot + 15 + 180) % 360) - 180);
      else if (a === "flipH") it.fx *= -1;
      else if (a === "flipV") it.fy *= -1;
      else if (a === "dup") { var c = copy(it); c.uid = rid("p"); c.x += 36; c.y += 36; c.glued = false; T.items.push(c); SEL = c.uid; }
      else if (a === "fwd") { if (i < T.items.length - 1) move(T.items, i, i + 1); }
      else if (a === "back") { if (i > 0) move(T.items, i, i - 1); }
      else if (a === "front") move(T.items, i, T.items.length - 1);
      else if (a === "backmost") move(T.items, i, 0);
      else if (a === "glue") { it.glued = !it.glued; }
      else if (a === "del") { T.items.splice(i, 1); SEL = null; }
    });
    if (a === "glue") toast(it.glued ? "PASTED DOWN." : "LIFTED.");
  }
  $("#tools").addEventListener("click", function (e) { var b = e.target.closest("[data-a]"); if (b && !b.disabled) doTool(b.dataset.a); });

  /* ---------- table: adding scraps ---------- */
  function addScrap(sc, x, y) {
    act(function () {
      T.scraps[sc.id] = copy(sc); var dm = dims(), L = Math.min(dm[0], dm[1]) * 0.42;
      var w = sc.ratio >= 1 ? L : L * sc.ratio;
      var it = { uid: rid("p"), scrapId: sc.id, x: x == null ? dm[0] / 2 + (Math.random() - 0.5) * dm[0] * 0.2 : x, y: y == null ? dm[1] / 2 + (Math.random() - 0.5) * dm[1] * 0.2 : y, w: Math.round(w), rot: x == null ? Math.round((Math.random() - 0.5) * 12) : 0, fx: 1, fy: 1, glued: false };
      T.items.push(it); SEL = it.uid;
    });
  }
  function renderTray() { $("#trayList").innerHTML = scraps.length ? scraps.map(function (s) { return scrapEl(s).replace(/<button class="x"[^>]*>×<\/button>/, ""); }).join("") : '<p class="d-empty">nothing in the tin yet. back out to the field.</p>'; }
  (function tray() {
    var list = $("#trayList"), suppress = false;
    list.addEventListener("click", function (e) {
      if (suppress) { suppress = false; return; }
      var el = e.target.closest(".scrap"); if (!el) return;
      var sc = scraps.filter(function (s) { return s.id === el.dataset.id; })[0]; if (sc) addScrap(sc);
    });
    list.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return; var el = e.target.closest(".scrap"); if (!el) return;
      var sc = scraps.filter(function (s) { return s.id === el.dataset.id; })[0]; if (!sc) return;
      var sx = e.clientX, sy = e.clientY, ghost = null;
      function mv(ev) {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
          ghost = document.createElement("div"); ghost.className = "ghost"; var h = 110; ghost.style.height = h + "px"; ghost.style.width = h * sc.ratio + "px"; ghost.innerHTML = scrapSVG(sc); document.body.appendChild(ghost);
        }
        if (ghost) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; }
      }
      function upf(ev) {
        window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", upf);
        if (!ghost) return; ghost.remove(); suppress = true; setTimeout(function () { suppress = false; }, 50);
        var pr = $("#paper").getBoundingClientRect(), dr = $("#desk").getBoundingClientRect();
        if (ev.clientX > dr.left && ev.clientX < dr.right && ev.clientY > dr.top && ev.clientY < dr.bottom) addScrap(sc, (ev.clientX - pr.left) / K, (ev.clientY - pr.top) / K);
      }
      window.addEventListener("pointermove", mv); window.addEventListener("pointerup", upf);
      window.addEventListener("pointercancel", function pc() { window.removeEventListener("pointercancel", pc); window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", upf); if (ghost) { ghost.remove(); ghost = null; } });
    });
    list.addEventListener("dragstart", function (e) { e.preventDefault(); });
  })();

  /* ---------- table: pointer handling ---------- */
  (function tablePointers() {
    var paper = $("#paper"), desk = $("#desk"), pts = {}, op = null;
    function logical(e) { var r = paper.getBoundingClientRect(); return { x: (e.clientX - r.left) / K, y: (e.clientY - r.top) / K }; }
    function ids() { return Object.keys(pts); }
    desk.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".empty-hint")) return;
      desk.setPointerCapture(e.pointerId); var p = logical(e); pts[e.pointerId] = p;
      var cur = SEL ? getItem(SEL) : null;
      if (ids().length === 2 && cur && !cur.glued) {
        var a = pts[ids()[0]], c = pts[ids()[1]];
        if (op && op.type === "drag" && op.moved === false) { /* fresh touch, nothing yet */ }
        op = { type: "pinch", uid: cur.uid, before: op && op.before || snapStr(), d0: Math.hypot(a.x - c.x, a.y - c.y) || 1, a0: Math.atan2(c.y - a.y, c.x - a.x), w0: cur.w, r0: cur.rot };
        return;
      }
      if (ids().length > 1) return;
      var h = e.target.closest && e.target.closest(".h"), pc = e.target.closest && e.target.closest(".piece");
      if (h && cur && !cur.glued) {
        var d0 = Math.hypot(p.x - cur.x, p.y - cur.y) || 1;
        op = { type: h.dataset.h, uid: cur.uid, before: snapStr(), d0: d0, a0: Math.atan2(p.y - cur.y, p.x - cur.x), w0: cur.w, r0: cur.rot };
      } else if (pc) {
        var u = pc.dataset.u, it = getItem(u);
        if (SEL !== u) { SEL = u; renderTable(); }
        if (it && !it.glued) op = { type: "drag", uid: u, before: snapStr(), dx: it.x - p.x, dy: it.y - p.y, moved: false };
        else op = null;
      } else if (SEL) { SEL = null; op = null; renderTable(); }
    });
    desk.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return; var p = logical(e); pts[e.pointerId] = p; if (!op) return;
      var it = getItem(op.uid); if (!it) return;
      if (op.type === "pinch") {
        if (ids().length < 2) return; var a = pts[ids()[0]], c = pts[ids()[1]];
        it.w = Math.round(clamp(op.w0 * Math.hypot(a.x - c.x, a.y - c.y) / op.d0, 30, 3000));
        it.rot = Math.round((((op.r0 + (Math.atan2(c.y - a.y, c.x - a.x) - op.a0) * 180 / Math.PI) + 540) % 360 - 180) * 10) / 10;
      } else if (op.type === "drag") { op.moved = true; it.x = Math.round(p.x + op.dx); it.y = Math.round(p.y + op.dy); }
      else if (op.type === "size") { it.w = Math.round(clamp(op.w0 * (Math.hypot(p.x - it.x, p.y - it.y) / op.d0), 30, 3000)); }
      else if (op.type === "rot") {
        var r = op.r0 + (Math.atan2(p.y - it.y, p.x - it.x) - op.a0) * 180 / Math.PI; if (e.shiftKey) r = Math.round(r / 15) * 15;
        it.rot = Math.round((((r + 540) % 360) - 180) * 10) / 10;
      }
      stylePiece(it);
    });
    function up(e) {
      delete pts[e.pointerId];
      if (op && ids().length === 0) { var b = op.before; op = null; if (pushHist(b)) renderTable(); }
      else if (op && op.type === "pinch" && ids().length === 1) { /* keep pinch history pending until last finger lifts */ }
    }
    desk.addEventListener("pointerup", up); desk.addEventListener("pointercancel", up);
    desk.addEventListener("dragstart", function (e) { e.preventDefault(); });
    var wheelBefore = null, wheelTimer;
    desk.addEventListener("wheel", function (e) {
      var it = SEL ? getItem(SEL) : null; if (!it || it.glued) return; e.preventDefault();
      if (wheelBefore == null) wheelBefore = snapStr();
      if (e.shiftKey || e.altKey) it.rot = Math.round((((it.rot + e.deltaY * 0.12) + 540) % 360 - 180) * 10) / 10;
      else it.w = Math.round(clamp(it.w * Math.exp(-e.deltaY * 0.0014), 30, 3000));
      stylePiece(it); clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { pushHist(wheelBefore); wheelBefore = null; }, 450);
    }, { passive: false });
  })();

  document.addEventListener("keydown", function (e) {
    if (!$("#modal").hidden) { if (e.key === "Escape") closeModal(); return; }
    var tag = (e.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (view === "archive") {
      if (e.key === "ArrowRight") flip(1); else if (e.key === "ArrowLeft") flip(-1); else if (e.key === "Enter" && !e.target.closest("button")) openCut(A.list[A.idx]);
      return;
    }
    if (view === "cut") { if (e.key === "Enter" && !e.target.closest("button")) $("#btnCut").click(); else if (e.key === "Escape") showView("archive"); return; }
    if (view !== "table") return;
    var k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && k === "y") { e.preventDefault(); redo(); return; }
    if (mod && k === "d") { e.preventDefault(); doTool("dup"); return; }
    var it = SEL ? getItem(SEL) : null; if (!it) return;
    if (k === "delete" || k === "backspace") { e.preventDefault(); doTool("del"); }
    else if (k === "g") doTool("glue");
    else if (k === "]") doTool(e.shiftKey || k === "}" ? "front" : "fwd");
    else if (k === "}") doTool("front");
    else if (k === "[") doTool("back");
    else if (k === "{") doTool("backmost");
    else if (k === "." || k === ",") { if (!it.glued) act(function () { it.rot += k === "." ? 5 : -5; }); }
    else if (k.indexOf("arrow") === 0 && !it.glued) {
      e.preventDefault(); var s = e.shiftKey ? 20 : 4; act(function () { if (k === "arrowleft") it.x -= s; if (k === "arrowright") it.x += s; if (k === "arrowup") it.y -= s; if (k === "arrowdown") it.y += s; });
    } else if (k === "escape") { SEL = null; renderTable(); }
  });

  /* ---------- export / save ---------- */
  var imgCache = {};
  function loadImg(url) {
    if (imgCache[url]) return imgCache[url];
    return imgCache[url] = new Promise(function (res, rej) { var i = new Image(); if (/^https?:/i.test(url) && url.indexOf(location.origin) !== 0) i.crossOrigin = "anonymous"; i.onload = function () { res(i); }; i.onerror = function () { if (i.crossOrigin && url.indexOf("wsrv.nl") < 0) { var j = new Image(); j.crossOrigin = "anonymous"; j.onload = function () { res(j); }; j.onerror = function () { rej(new Error("image")); }; j.src = prox(url); } else rej(new Error("image")); }; i.src = url; });
  }
  function renderCanvas(scale) {
    var dm = dims(), W = dm[0], H = dm[1], cv = document.createElement("canvas");
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    var ctx = cv.getContext("2d");
    return loadImg(paperURI(T.paper, W, H)).then(function (pimg) {
      ctx.drawImage(pimg, 0, 0, cv.width, cv.height);
      var bu = bgURL(), chain = bu ? loadImg(bu).then(function (bi) {
        var k = Math.max(cv.width / bi.width, cv.height / bi.height), dw = bi.width * k, dh = bi.height * k;
        ctx.drawImage(bi, (cv.width - dw) / 2, (cv.height - dh) / 2, dw, dh);
        var c = hex3(PAPER_BASE[T.paper] || PAPER_BASE.warm); ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (T.bg.fade || 0) / 100 + ")"; ctx.fillRect(0, 0, cv.width, cv.height);
      }) : Promise.resolve();
      T.items.forEach(function (it) {
        var sc = T.scraps[it.scrapId]; if (!sc) return;
        chain = chain.then(function () { return loadImg(imgOf(sc)); }).then(function (img) {
          var w = it.w, h = w / sc.ratio, m = sc.mask, k = w / sc.crop.w;
          var path = new Path2D(); path.addPath(new Path2D((SHAPES[sc.shape] || SHAPES.circle).d), new DOMMatrix().translate(m.cx, m.cy).rotate(m.rot).translate(-m.w / 2, -m.h / 2).scale(m.w, m.h));
          ctx.save(); ctx.scale(scale, scale); ctx.translate(it.x, it.y); ctx.rotate(it.rot * Math.PI / 180); ctx.scale(it.fx, it.fy); ctx.translate(-w / 2, -h / 2); ctx.scale(k, k); ctx.translate(-sc.crop.x, -sc.crop.y);
          ctx.save(); ctx.shadowColor = "rgba(0,0,0," + (it.glued ? 0.3 : 0.42) + ")"; ctx.shadowBlur = (it.glued ? 2 : 9) * scale; ctx.shadowOffsetY = (it.glued ? 1 : 3) * scale;
          if (sc.alpha) { ctx.clip(path); ctx.drawImage(img, 0, 0, sc.imgW, sc.imgH); ctx.restore(); ctx.restore(); return; }
          ctx.fillStyle = "#cfc4a8"; ctx.fill(path); ctx.restore();
          ctx.clip(path); ctx.drawImage(img, 0, 0, sc.imgW, sc.imgH); ctx.restore();
        });
      });
      return chain.then(function () { return cv; });
    });
  }
  $("#btnExport").onclick = function () {
    if (!T.items.length) { toast("THE BENCH IS EMPTY."); return; }
    var dm = dims(), s = Math.min(2, 3000 / Math.max(dm[0], dm[1]));
    toast("PRESSING THE PLATE…");
    renderCanvas(s).then(function (cv) {
      var url; try { url = cv.toDataURL("image/png"); } catch (e) { toast("THE IMAGES WON'T EXPORT FROM HERE. SERVE THE FOLDER (SEE README)."); return; }
      openModal('<h2>A PLATE FROM THE FIELD</h2><p class="sub">only the sheet and what is pasted to it. press and hold the image, or right-click it, to keep it.</p><img class="export-img" alt="Exported collage" src="' + url + '"><div class="row"><a class="btn primary" id="dlLink" download="collage-' + Date.now() + '.png" href="' + url + '" style="text-decoration:none;display:inline-flex;align-items:center">KEEP THE PLATE (PNG)</a></div>');
    }).catch(function () { toast("COULD NOT EXPORT. AN IMAGE FAILED TO LOAD."); });
  };
  $("#btnSave").onclick = function () {
    if (!T.items.length) { toast("NOTHING TO PRESS YET."); return; }
    renderCanvas(160 / Math.max.apply(null, dims())).then(function (cv) {
      var thumb = ""; try { thumb = cv.toDataURL("image/jpeg", 0.72); } catch (e) { /* tainted: no thumbnail */ }
      var list = LS.get("cl.saved", []), id = T.id || rid("c"), old = list.filter(function (c) { return c.id === id; })[0];
      var rec = { id: id, name: (old && old.name) || "Sheet " + new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), date: Date.now(), paper: T.paper, ratio: T.ratio, bg: T.bg || null, items: copy(T.items), scraps: copy(T.scraps), thumb: thumb };
      list = list.filter(function (c) { return c.id !== id; }); list.unshift(rec);
      if (LS.set("cl.saved", list)) { T.id = id; autosave(); toast("PRESSED AND KEPT."); } else toast("THE PRESS IS FULL. LET AN OLD SHEET GO.");
    });
  };
  function openMine() {
    var list = LS.get("cl.saved", []);
    var h = '<h2>PRESSED SHEETS</h2><p class="sub">' + (list.length ? "pressed and kept on this device." : "nothing pressed yet. make something strange, then press it.") + '</p><div class="mine-grid">';
    list.forEach(function (c) { h += '<div class="mine-card"><img alt="" src="' + (c.thumb || "") + '"><span class="nm">' + esc(c.name) + '</span><span class="dt">' + new Date(c.date).toLocaleDateString() + '</span><div class="acts"><button class="btn" data-open="' + c.id + '">OPEN</button><button class="btn" data-del="' + c.id + '">DELETE</button></div></div>'; });
    openModal(h + "</div>");
    $$("#sheet [data-open]").forEach(function (b) { b.onclick = function () { var c = list.filter(function (x) { return x.id === b.dataset.open; })[0]; if (!c) return; T = { id: c.id, paper: c.paper, ratio: c.ratio, bg: c.bg || null, items: copy(c.items), scraps: copy(c.scraps) }; SEL = null; hist = []; fut = []; autosave(); closeModal(); showView("table"); }; });
    $$("#sheet [data-del]").forEach(function (b) { b.onclick = function () { LS.set("cl.saved", LS.get("cl.saved", []).filter(function (x) { return x.id !== b.dataset.del; })); openMine(); renderHome(); }; });
  }
  $("#btnMine2").onclick = openMine;
  $("#btnNew").onclick = function () {
    var go = function () { T = newTable(); SEL = null; hist = []; fut = []; autosave(); syncSelects(); layoutTable(); renderTable(); toast("A CLEAN SHEET."); };
    if (T.items.length) ask("clear the bench? your pressed sheets stay safe in the press.", "CLEAR THE BENCH").then(function (y) { if (y) go(); }); else go();
  };
  $("#tBack").onclick = function () { showView("archive"); };

  /* ---------- boot ---------- */
  function relayout() { if (view === "archive") fitBox($("#pageBox"), $("#aStage"), A.ar, 12); else if (view === "cut") layoutCut(); else if (view === "table") layoutTable(); }
  window.addEventListener("resize", relayout);
  if (window.ResizeObserver) { new ResizeObserver(relayout).observe($("#views")); }
  buildShapeButtons(); renderCats(); renderHome(); renderDrawer();
  // expose for debugging
  window.__collage = { state: function () { return { scraps: scraps, T: T }; } };
})();
