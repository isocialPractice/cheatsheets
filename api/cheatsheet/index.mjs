// The cheatsheet layer: this repository's own code over the drawing surface.
//
// `api/napkin-sketch/` is a vendored copy of the published napkin-sketch build
// and carries that project's notice. It draws rectangles, text and lines and
// knows nothing about a cheatsheet. Everything here is this repository's own,
// and it is the half that knows what a sheet is: the design language measured
// off the eleven images, the faces they are set in, and the algorithm that
// composes one.
//
// The dependency runs one way only, and it runs through a narrow door. This
// folder imports the surface; the surface imports nothing here. What crosses
// the boundary is deliberately small: a composition is built, elements are
// added, and markup comes back. The measuring, the colour reading and the paint
// refusal are all this layer's own, which is what let the surface be swapped
// from a hand port to a pinned package without any of it moving.
//
// ```js
// import { composeSheet } from "./api/cheatsheet/index.mjs";
//
// const { composition, variation } = composeSheet(
//   {
//     title: "Splicing Array Elements",
//     subtitle: "Add and remove in one call",
//     code: [
//       { text: "// remove two, insert one", role: "comment" },
//       { text: "const removed = items.splice(1, 2, 'demo');", role: "plain" },
//     ],
//   },
//   { seed: "splicing-arrays" }
// );
//
// const svg = composition.toSVG();
// console.log(variation.seed, variation.lineSpacing);
// ```
//
// Everything exported here is browser-safe and reaches no further than this
// folder and the drawing surface beside it, so the page loads it with a bare `import` and
// no build step.

export { composeSheet, CAP_SHARE } from "./compose.mjs";

export {
  dataUrlFrom,
  fetchSheetBrand,
  rasterAsset,
  sheetBrandFrom,
  vectorAsset,
  BRAND_FILES,
} from "./brand.mjs";

export {
  checkPaints,
  checkPairings,
  contrastRatio,
  parseSheetColor,
  parseSheetPaint,
  readableInk,
  relativeLuminance,
} from "./contrast.mjs";

export {
  centredAt,
  charAdvance,
  measureRun,
  roleStyle,
  sizeForCap,
  CODE_FACE,
  SHEET_CONDENSATION,
  SHEET_FACE,
  SHEET_FONT_FAMILY,
  STACK_CAP_HEIGHT,
  STACK_DESCENDER,
  STACK_UNITS_PER_EM,
  STACK_X_HEIGHT,
  TYPE_ROLES,
} from "./faces.mjs";

export {
  BANDS,
  BRAND_SLOTS,
  CANVAS,
  CENSUS,
  CENSUS_SHARES,
  censusFor,
  COLORS,
  CONTRAST,
  DISPLAY_SCALE,
  DIVISIONS,
  FLOORS,
  INSETS,
  MARK_SQUARE,
  PANEL_FREEDOM,
  RADIUS,
  RULES,
  RUNS,
  SHEET_LANGUAGE,
  STEP,
  SYNTAX,
  TOKENS,
} from "./language.mjs";

export { normalizeSeed, seedFrom, splitmix32, Variation } from "./variation.mjs";
