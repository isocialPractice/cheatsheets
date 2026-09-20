# `api/graphic-design` - the ported drawing surface

Simple elements in, a finished graphic out. Build a composition from
rectangles, circles, ellipses, triangles, polygons, lines, paths, text, placed
media and clipping masks, then render it to SVG or to PNG. Two back ends read
the same document, so the two outputs differ in their export format and in
nothing else.

This directory is a hand port of `src/core/graphic-design/` from
[`napkin-sketch`](https://github.com/isocialPractice/napkin-sketch), taken at
commit `d43caac191b2dfd532b3311f4ca1ea6969bb002f`, and it is the one directory
of this repository that is **MIT rather than CC0**. [NOTICE](../../NOTICE)
carries the copyright line and the permission text in full, and every module
here names the upstream file it came from so the two can still be diffed.

This file is the reference for a caller: what is exported, and every limit
that export carries. `api/cheatsheet/` is this repository's own layer over it
and is documented in [DESIGN_LANGUAGE.md](../../DESIGN_LANGUAGE.md); nothing
here knows what a cheatsheet is.

## Getting one drawn

```js
import { createComposition } from "./api/graphic-design/index.mjs";

const page = createComposition({ width: 480, height: 240, background: "#FFFFFF" });

page.rect({ x: 0, y: 0, width: 480, height: 64, fill: "#000132" });
page.text({
  x: 24,
  y: 42,
  text: "Sample heading for the demo sheet",
  fill: "#FFFFFF",
  fontSize: 22,
});

const svg = page.toSVG();          // a string
const png = page.toPNG();          // Uint8Array of PNG file bytes
```

Everything the barrel exports is browser-safe and imports nothing outside this
folder, so a page loads it with a bare `import` and no build step. There is no
`package.json`, no bundler and no dependency.

## The limits, first

These are load bearing. Each is a deliberate reduction of upstream, not a gap
waiting to be filled, and the composition algorithm in `api/cheatsheet/` was
written inside them.

| Limit | What happens if you cross it |
| --- | --- |
| **No gradients, filters or patterns.** Solid paint, per-element and per-paint opacity, and clipping masks are the whole painting model | A gradient is not a color this API reads, so it is refused by the paint check below |
| **An elliptical arc `A` in path data is refused**, rather than quietly losing a corner | `parsePathData` raises `unsupported path command "A"` |
| **The paint check refuses what it cannot read**, in *both* back ends | `compositionToSvg` raises `unsupported color "..."` where upstream passed it through to the browser |
| **The Node-only half is not in the barrel** | `writeComposition` is imported from `files.mjs` by path; a page that imports the barrel never touches `node:fs` |
| **`canvas.ts` did not come across** | There is no GUI canvas back end. `rasterize()` gives you RGBA pixels and `toPNG()` gives you a file |
| **Placed bitmaps decode as PNG data URLs only** | Any other image is skipped with a warning, unless you pass your own `decodeImage` |
| **The built-in face is a stroked alphabet, not a font file** | A PNG rendered here is a shape-level regression target, never a publishable sheet. See **Text** below |

### The arc, and why nothing here has needed one

Path data supports `M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T` and `Z`, in absolute
and relative forms. `A` raises rather than being approximated, because an
approximation of a corner radius is a corner that is subtly wrong in every
export and says so nowhere:

```text
graphic-design: unsupported path command "A"
```

**That refusal is a local correction, and until it landed the limit was
documented but not carried.** Upstream's path tokenizer does not list the arc
among its command letters, so an `A` matched nothing and was skipped by the
scan, leaving its seven parameters to be read as coordinates of the command
before it. `M 0 0 A 5 5 0 0 1 10 10 A 5 5 0 0 1 20 0` parsed cleanly into an
eight point polyline of nonsense - fourteen leftover numbers divide evenly
into pairs - and a path whose leftovers were odd raised `malformed path data`
instead, naming the string rather than the command. Whether an unsupported arc
was reported at all came down to arithmetic. `PATH_TOKEN` in `geometry.mjs`
now matches the letter, which is what makes the `default:` branch that raises
this reachable.

The sheets' 4px radius is a rounded rectangle, which `rect` draws with `rx`, so
nothing the design language has asked for so far needs an arc. `ellipseContour`
covers a true ellipse, and `rectContour` covers a rounded one, both without
going through path data at all.

### The paint check is the port's other refusal

Upstream lets the SVG writer pass a color straight through to the markup, on
the reasoning that a browser is the better parser, and catches a misspelling in
the rasterizer instead.

That reasoning does not hold here. The page composes its sheet as **inline
SVG**, so the rasterizer never runs in the one place a reader sees, and a
misspelled paint would be a black region with no error anywhere. Both back ends
therefore refuse a paint they cannot read, raising the same message:

```text
graphic-design: unsupported color "ofwhite"
```

The two refusals are the same decision taken twice: this port would rather
raise at the call than hand a renderer something it will draw wrongly with no
error attached.

Two escape hatches, both explicit:

- `compositionToSvg(doc, { validate: false })` restores the upstream
  pass-through.
- `validatePaints(doc)` runs the check on its own, without rendering.

What a composition may legitimately leave unpainted is not an error:
`undefined`, `null`, `""`, `none` and `transparent` all mean "do not paint" and
pass.

Colors that parse: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`
and `hsl()`/`hsla()` in both the comma and the space-with-slash forms, and the
basic CSS keyword set.

### The Node-only half

`files.mjs` sits beside the barrel and is deliberately not re-exported from it.
A browser handed `node:fs` fails at **load** rather than at the call, so
exporting `writeComposition` would break every page importing the barrel
whether or not it ever wrote a file. A Node script reaches it by path, which
reads as deliberate and cannot be arrived at from a page by accident:

```js
import { writeComposition } from "./api/graphic-design/files.mjs";

await writeComposition(page, "./out", "sheet", { formats: ["svg", "png"] });
```

It imports `node:fs/promises` and `node:path` and nothing else.
`tools/test-graphic-design-port.mjs` holds that boundary from both sides: the
barrel does not reach it, and no browser-safe module reaches it transitively.

Upstream's `imageDataUrl` and `mediaTypeOf` did not come across at all. They
serve placed bitmaps, and the design language allows none.

## The surface

### Composing

From `compose.mjs`.

| Export | What it is |
| --- | --- |
| `createComposition(options?)` | A new `Composition`. Defaults to a 360 by 360 px transparent page |
| `Composition` | A page: size, units, background, id, title, clips, and every `ElementList` method |
| `ElementList` | The element-adding half, shared by a composition and a group |
| `renderComposition(source, options?)` | RGBA pixels from a composition or a plain document |
| `renderPng(doc, options?)` | PNG file bytes plus the warnings the raster pass collected |

`PageOptions`: `width`, `height`, `units` (`px`, `in`, `mm`, `pt`), `background`
(`null` for transparent), `id`, `title`.

**Element builders**, each taking the element's own props and returning the
element it appended:

`rect` `circle` `ellipse` `triangle` `polygon` `polyline` `line` `path` `text`
`image` `group(props?, build)` `add(element)` `addAll(elements)`

**Common props**, accepted by every element: `id`, `name`, `fill`,
`fillOpacity`, `fillRule`, `stroke`, `strokeWidth`, `strokeOpacity`, `lineCap`,
`lineJoin`, `dash`, `dashOffset`, `opacity`, `rotate`, `scale`, `translate`,
`origin`, `clip`, `visible`.

**Rendering**, from the composition:

| Call | Returns |
| --- | --- |
| `toDocument()` | The plain `CompositionDocument` both renderers read |
| `toSVG(options?)` | An SVG document as a string |
| `toPNG(options?)` | PNG file bytes, as `Uint8Array` |
| `rasterize(options?)` | `{ width, height, data, warnings }` - straight RGBA, row-major |

**Clipping**: `defineClip(id, shapes, fillRule?)` names a mask so several
elements can share it; an element references it with `clip: 'badge'`, or
carries a one-off shape inline.

### Writing SVG

From `svg.mjs`: `compositionToSvg(doc, options?)`, `validatePaints(doc)`,
`escapeXml(value)`.

`SvgOptions`: `pretty` (on by default), `precision` (decimal places, default 3),
`validate` (on by default; see the paint check above).

The root carries a `viewBox` in composition units and a width and height in the
composition's own unit, so a page described in millimetres prints at the size it
says while every coordinate inside stays the number that was written.

**Text reaches the SVG as text.** Runs are written as `text` elements with the
words recoverable from the markup, never outlined to paths, and a title full of
characters XML cannot carry is escaped rather than converted.
`tools/test-composition-algorithm.mjs` holds that as an acceptance check.

### Rasterizing

From `raster.mjs`: `rasterizeComposition(doc, options?)`,
`rasterizeContours(contours, width, height, rule?)`.

`RasterOptions`: `scale` (device pixels per composition pixel, default 1),
`background`, `decodeImage` (a decoder for `image` elements that are not PNG
data URLs).

From `png.mjs`: `encodePng(data, width, height)`, `decodePng(bytes)`,
`isPng(bytes)`. Interlaced PNGs, and colour types and bit depths outside the
common set, are refused with a message rather than misread.

From `deflate.mjs`: `deflateRaw`, `inflateRaw`, `zlibDeflate`, `zlibInflate`,
`adler32`. This is why the PNG encoder needs nothing installed.

### Text

From `font.mjs`: `measureText`, `charWidth`, `wrapText`, `layoutText`,
`transformText`, `fontMetrics`, `glyph`, `lineStrokes`, `lineContours`,
`BUILTIN_FACE`, and the built-in alphabet's `FONT_UNITS_PER_EM`,
`FONT_CAP_HEIGHT`, `FONT_X_HEIGHT`, `FONT_DESCENDER`.

**Measuring and drawing are two different faces, and that is the one local
change to a ported module.** Every measuring call takes an optional `Face` -
`{ name, unitsPerEm, capHeight, xHeight, descender, advances, fallbackAdvance,
fontFamily? }` - and measures in it. The built-in alphabet is the default, so
omitting one reproduces the port exactly.

That matters because the two back ends draw text differently:

| Back end | Draws text with |
| --- | --- |
| SVG | The `fontFamily` the run names, resolved by whatever renders the SVG |
| PNG | The built-in single-stroke alphabet, because there is no font file here |

So a PNG from this API is legible and is **not** the artwork. When a face names
a `fontFamily`, that is also what the SVG asks for, which is what stops a run
being measured in one face and drawn in another. The width table this
repository measures its sheets in is in `api/cheatsheet/faces.mjs`, and
**What a generated sheet is measured in** in `DESIGN_LANGUAGE.md` records how
it was read.

### Geometry

From `geometry.mjs`. Matrices are `[a, b, c, d, e, f]`, the same six numbers
SVG writes.

`IDENTITY` `multiply` `apply` `invert` `translation` `scaling` `rotation`
`meanScale` `elementMatrix` `transformContours` `contourBounds`
`ellipseContour` `rectContour` `triangleContour` `parsePathData` `shapeCentre`
`flattenShape` `dashContour` `strokeContour`

### Color

From `color.mjs`: `parseColor(input)`, `parsePaint(input)`,
`formatColor({ r, g, b, a })`, `TRANSPARENT`.

`parseColor` raises on anything it cannot read; `parsePaint` additionally
accepts the "do not paint" values listed under the paint check.

### Units

From `units.mjs`: `toPx(value, unit)`, `fromPx(px, unit)`, `isLengthUnit(value)`,
`LENGTH_UNITS`, `CSS_PX_PER_INCH`.

### Brand resources

From `brand.mjs`. A captured design language says *where* a logo goes; it
cannot say *what* the logo is. This is the half that closes that gap.

| Export | What it is |
| --- | --- |
| `parseResources(markdown)` | Reads a `resources.md` - a plain markdown list of `- key: value` pairs - into paths, directories and text |
| `normalizeResourceKey(key)` | `GLOBAL_ASSETS`, `Global Assets` and `global-assets` are one slot |
| `descriptorFromFilename(name)` | The rule behind a folder of assets: `logo.png` fills the `logo` slot |
| `inlineSvg(text)` | A vector asset taken apart into elements, so a placed logo draws in the PNG as well as the SVG |
| `placeBrand(list, box, source, options?)` | Puts a resolved asset into a slot |
| `brandMark(list, box, options?)` | Draws something in the design language when there is no asset to put there |
| `fitInto(source, target, fit?)` | `contain`, `cover`, `fill`, `none` |
| `brandRegion(box, page)` | Which ninth of the page a box sits in |
| `detectBrandSlots(svgText)`, `scanBrandBands(image, options?)`, `findBrandSlots(media, options?)` | Finding the slots in an existing asset |

Everything here takes strings and element lists and never a file system, which
is what keeps it in the same bundle as the rest of the API. Reading a
`resources.md` off disk is the caller's half;
`tools/build-brand-resources.mjs` is this repository's.

### Types and defaults

From `types.mjs`: `isGroup(el)`, `DEFAULT_COMPOSITION_SIZE` (360),
`DEFAULT_UNITS` (`px`), `DEFAULT_TEXT_FONT`, `DEFAULT_FONT_SIZE` (16),
`DEFAULT_LINE_HEIGHT` (1.2).

## What holds this record honest

`tools/test-graphic-design-port.mjs` checks that every name the barrel exports
appears in this file and that every export named here is really exported, so a
new export with no entry fails rather than going unrecorded. The limits above
are checked as behaviour in the same file and in
`tools/test-render-fixture.mjs`, which pins both renders against committed
output.
