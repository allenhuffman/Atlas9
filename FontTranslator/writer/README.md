# Mossman Script Writer

A browser page where you type text and see it rendered in Mossman Script. It
runs entirely on your Mac; nothing is uploaded.

## Use

From this folder, start a local web server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/> and type. Use **Download SVG**, **Download PNG**,
or **Print**. Downloaded SVGs contain plain `<circle>` and `<line>` shapes, so
they stay editable in a vector editor such as Inkscape.

Characters without a glyph are shown as a red `?`. The reference chart has no
X, so the X glyph was traced from `../MossmanSample.jpg`. Only the digits 3, 4,
and 6 exist.

## How the letters are drawn

Nothing is a bitmap. [`index.html`](./index.html) reads
[`glyphs.json`](./glyphs.json) and builds SVG `<circle>` and `<line>` elements
for each letter, scaled to one height. Every ring and line is drawn at the same
thickness (`strokeWidth` near the top of the script in `index.html`), matching
the photographed sign, where all strokes look alike. Dots keep their own sizes.
The `width` values stored on rings and lines are therefore ignored when drawing.

## Editing the glyphs

`glyphs.json` is the source of truth. Edit it by hand, save, and refresh the
page; there is no build step. Each glyph has a `width`, a `height`, and a list
of parts:

- `ring`: a circle outline (`cx`, `cy`, `r`, `width`)
- `dot`: a filled circle (`cx`, `cy`, `r`)
- `line`: a straight stroke (`x1`, `y1`, `x2`, `y2`, `width`)

Coordinates are in chart pixels, with `0,0` at the top-left of each glyph. A
stroke is drawn centred on its line, so at a corner make the bar and the
vertical meet at their outer edges (see E for an example). Parts must stay
inside the glyph box, or the edge is clipped.

The sizes in the `sizes` block are only a fallback for parts that give a named
`size` instead of `r`.

## Regenerating from the chart (optional)

The first draft of the parts was extracted from `../Atlas9-Font.png` by
[`tools/extract_parts.py`](./tools/extract_parts.py), then fitted to the chart
and corrected by hand. The script still writes the older format (named sizes,
unfitted positions), and running it **overwrites** `glyphs.json`, including
every hand fix. Keep a copy first. Pass `--overlay overlay.png` to save a
comparison image (grey = chart, red = extracted parts only, black = both):

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install numpy opencv-python-headless
python tools/extract_parts.py --output glyphs.extracted.json --overlay overlay.png
```
