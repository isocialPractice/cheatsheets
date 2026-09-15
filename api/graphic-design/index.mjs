// The graphic-design API: simple elements in, a finished graphic out.
//
// Ported from `src/core/graphic-design/index.ts` in napkin-sketch (MIT,
// isocialPractice), commit d43caac191b2dfd532b3311f4ca1ea6969bb002f.
//
// Build a composition from rectangles, circles, ellipses, triangles, polygons,
// lines, paths, text, placed media and clipping masks, then render it. Two back
// ends read the same document, so the SVG and the PNG differ in their media
// export format and in nothing else.
//
// Everything exported here is browser-safe and imports nothing outside this
// folder, so `index.html` loads it with a bare `import` and no build step. That
// is the whole reason the port exists at `api/` rather than under `tools/`:
// everything in `tools/` is a Node-only script the published site never loads,
// and this is the one tree the page itself fetches.
//
// **What was dropped on the way in, and why.** `canvas.ts` paints into a GUI
// canvas this repository does not have, so it is not here. The Node-only file
// helpers are not here either: they belong in a `files.mjs` beside this barrel
// that nothing the page imports ever reaches, which is its own item under
// **Port the napkin-sketch Graphic Design API** in `TODO.md`.
//
// **The limits are load bearing.** No gradients, filters or patterns; solid
// paint, opacity and clipping masks only; and an elliptical arc `A` in path
// data is refused rather than quietly losing a corner. The sheets' 4px radius
// is a rounded rectangle, which `rect` draws with `rx`, so nothing the design
// language has asked for so far needs an arc.

export { Composition, ElementList, createComposition, renderComposition, renderPng } from "./compose.mjs";

export { compositionToSvg, escapeXml } from "./svg.mjs";

export { rasterizeComposition, rasterizeContours } from "./raster.mjs";

export { decodePng, encodePng, isPng } from "./png.mjs";

export { formatColor, parseColor, parsePaint, TRANSPARENT } from "./color.mjs";

export {
  brandMark,
  brandRegion,
  descriptorFromFilename,
  detectBrandSlots,
  findBrandSlots,
  fitInto,
  inlineSvg,
  normalizeResourceKey,
  parseResources,
  placeBrand,
  scanBrandBands,
} from "./brand.mjs";

export {
  charWidth,
  fontMetrics,
  glyph,
  layoutText,
  lineContours,
  lineStrokes,
  measureText,
  transformText,
  wrapText,
  FONT_CAP_HEIGHT,
  FONT_DESCENDER,
  FONT_UNITS_PER_EM,
  FONT_X_HEIGHT,
} from "./font.mjs";

export {
  apply,
  contourBounds,
  dashContour,
  elementMatrix,
  ellipseContour,
  flattenShape,
  invert,
  meanScale,
  multiply,
  parsePathData,
  rectContour,
  rotation,
  scaling,
  shapeCentre,
  strokeContour,
  transformContours,
  translation,
  triangleContour,
  IDENTITY,
} from "./geometry.mjs";

export { adler32, deflateRaw, inflateRaw, zlibDeflate, zlibInflate } from "./deflate.mjs";

export { CSS_PX_PER_INCH, LENGTH_UNITS, fromPx, isLengthUnit, toPx } from "./units.mjs";

export {
  isGroup,
  DEFAULT_COMPOSITION_SIZE,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_TEXT_FONT,
  DEFAULT_UNITS,
} from "./types.mjs";
