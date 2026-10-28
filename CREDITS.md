# Credits — The Scrap Naturalist

- Photochrom and cabinet-card scans: Library of Congress Prints & Photographs Division (public domain).
- Other plates: supplied by the project owner; add sources here as the archive grows.
- Wider field finds ("Picked up along the way") carry their own credit line, shown under the folio; the sources are Wikimedia Commons, Art Institute of Chicago, Cleveland Museum of Art and the Library of Congress.

## Cut-outs from Unsplash photographs
The neon moon, moon mural, eucalyptus hand, red car and four tarot cards were cut from photographs on Unsplash, used under the Unsplash License (free to use and modify; credit to the photographers is welcome). Individual photographers can be named here when known.

## Drawn ornaments
The `orn-*` specimens were drawn in code for this project and dedicated to the public domain (CC0).

## Background lifter (your own pieces)
Runs entirely in the visitor's browser; nothing is uploaded.
- **onnxruntime-web 1.17.3** (`vendor/`): MIT licence, Microsoft.
- **U²-Net (u2netp)** model (`models/u2netp.onnx`): Apache 2.0, Xuebin Qin et al., via the rembg project.

## Added to Loose Specimens (99 pieces)
Cut from sticker and specimen sheets supplied by the studio owner (statue/halftone sheet, pressed plants, watercolour animals and sea life, sepia ephemera, star/butterfly sheet, botanical illustrations, fashion plates, bird plates). These are the owner's own collection rather than public-domain finds; check each sheet's licence before redistributing the repo. Made with `tools/cut_sheets.py` (OpenCV/rembg-u2netp).

## Overlays (35 pieces)
Painted procedurally from noise by `tools/make_overlays.py` (numpy/OpenCV). No source images, so nothing to license.

## The Chorus and Hellebore (30 pieces)
Figures cut from the studio owner's own character sheets and photographs (The Chorus, Hellebore the Guild Master). Not public-domain finds; they are the owner's own work.

## More figures (62 pieces)
Walkers, Ailanthus, Hellebore card details, door scenes and moths, cut from the studio owner's own images (AI-assisted artwork by the owner). Not public-domain finds.

## Road & Light (14 scenes)
Whole images supplied by the studio owner (her own AI-assisted artwork). Filed under People, Terrain, Architecture. Not public-domain finds.

## Drawings by the Luminarium (5)
Original ink drawings by Rai Sillito / The Luminarium (skeleton series), backgrounds removed. © the artist; shown in their own category so they are clearly hers.

## More washi tape (14) and pencil starbursts (15)
Painted procedurally by `tools/make_overlays.py` and the starburst generator (no source images).

## Clipped words, second batch & marginalia
- `wd-*` single words (and, the, if, we, you, dream, possibility, love and more): plain text set in open-licence fonts (Lora, Inter, Liberation, GFS Baskerville, Courier, DejaVu) by `tools/make_words_more.py`.
- `mg-*` marginalia (specimen tags, field labels, index cards, catalogue strips, ticket stubs, postmarks, torn notes, number tiles): drawn in code, text written for this project, by `tools/make_marginalia.py`.
