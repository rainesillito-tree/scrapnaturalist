# The Scrap Naturalist

*field notes toward an unlikely herbarium*

A small play-machine for people who like to cut things out. You wander through a field of old photographs, engravings and strange finds, snip out whatever catches your eye, carry the pieces home in a specimen tin, and arrange them on a sheet of paper until they become something that was never there.

No accounts. No server. It runs in a browser, keeps your tin and your sheets on your own device, and works on a phone.

## A short guide to the field

1. **Go out.** Wander the folios: terrain, ruins & thresholds, the human animal, the herbarium, night watch, curios, marginalia, plates. Nothing here is for sale. All of it is for cutting.
2. **Take a snip.** Pick a scissor shape, lay it over whatever caught your eye, and cut. Or *collect whole*: the loose specimens are already cut free.
3. **Fill the tin.** Every find rides in the specimen tin along the bottom, and it remembers you between visits.
4. **Go to the workbench.** Lay your finds on a sheet of paper, or on a photograph if you want a ground to stand on (*ground photo*, or *use as the ground* on any folio).
5. **Arrange, turn, paste down.** Drag, turn, widen, flip. Lift a piece back up if you change your mind. Undo is always allowed.
6. **Press a plate.** *Press & keep* saves the sheet on your device; *make a plate* gives you a PNG to carry home.

When stuck: **wander**, ask for **a strange sighting**, or draw **a field rule**. There is no right way, and there are no wrong specimens.

## The wider field (more images, live)

*The wider field* (in the archive footer) searches open collections from inside the page: Wikimedia Commons, the Art Institute of Chicago, the Cleveland Museum of Art and the Library of Congress. It shows public-domain / CC0 finds only. Tap a find and it joins the archive under **Picked up along the way**, with its credit shown under the folio, and stays on your device. It needs a real website (GitHub Pages works); it is blocked inside sandboxed previews. If a collection blocks browsers from exporting its pictures, you can still cut and arrange its images, but *make a plate* will say so.

## Run it

Open `index.html`. To export plates as PNG, serve the folder instead (browsers are strict about images in files opened straight from disk):

```
python3 -m http.server
```

then visit `http://localhost:8000`.

## Share it as a website

1. Make a new empty repository on github.com.
2. Upload everything in this folder.
3. Settings → Pages → Source: **GitHub Actions**. The included workflow publishes it on every push.
4. It lives at `https://<you>.github.io/<repo>/`.

## Add to the archive

Everything is data. Open `archive.js` and add a line to `MY_IMAGES`:

```js
{ id:"heron-01", category:"botanical", title:"Heron, Plate 4", image:"images/heron-01.jpg", w:900, h:1200, tags:["bird","engraving"] },
```

Categories: `cutouts` (loose specimens), `landscapes` (terrain), `architecture` (ruins & thresholds), `people` (the human animal), `botanical` (the herbarium), `celestial` (night watch), `objects` (curios), `ephemera` (marginalia), `print` (plates & engravings). Set `USE_DEMO = false` to drop the drawn filler plates.

### Loose specimens (transparent cut-outs)

Cut-outs are transparent WebP files in `images/cutouts/`, with `category:"cutouts", group:"figures" | "things", alpha:true`. To isolate a new one:

```
pip install rembg onnxruntime opencv-python pillow
python3 tools/cutout.py photo in.jpg images/cutouts/teapot.webp --model isnet-general-use
python3 tools/cutout.py ink   in.png images/cutouts/stamp.webp      # prints on plain paper
```

Add `--crop x0,y0,x1,y1` (fractions or pixels) to lift one object out of a busy picture.

## Keys and touch

- Archive: ← → turn folios, swipe on a phone, Enter to snip.
- Snip: drag to move the outline; wheel or two fingers to widen and turn.
- Workbench: drag to move, corner handles to widen and turn, Delete to discard, Ctrl/⌘-Z undo, Shift-Ctrl/⌘-Z redo.

## Credits

See `CREDITS.md`. Photochrom and cabinet-card scans are from the Library of Congress (public domain).

## The drawn ornaments
The esoteric symbols and botanicals in LOOSE SPECIMENS (eyes, moons, keys, ferns, roses and so on) were drawn from scratch by `tools/draw_ornaments.py` and are released to the public domain (CC0). Edit the script and run it to draw your own.

## Your own pieces
"Your own pieces" lets a visitor add up to two pictures of their own and lift the background off them (in the browser, using a small U²-Net model; see CREDITS.md). They are kept in that browser's localStorage only (`cl.mine`) and are never uploaded.

## Clipped words
CLIPPED WORDS holds about a hundred magazine-style word and line clippings, made by `tools/make_words.py` from plain text set in open-licence fonts (Lora, Inter, Liberation, GFS Baskerville, DejaVu), so they are free to use. Edit the word lists at the top of the script and run it to make your own.
