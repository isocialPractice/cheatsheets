// The cheatsheet layer: this repository's own code over the ported drawing
// surface.
//
// `api/graphic-design/` is a port of the napkin-sketch graphic design API and
// carries that project's notice. It draws rectangles, text and lines and knows
// nothing about a cheatsheet. Everything here is this repository's own, and it
// is the half that knows what a sheet is: the design language measured off the
// eleven images, the faces they are set in, and the algorithm that composes one.
//
// The dependency runs one way only. This folder imports the port; the port
// imports nothing here, which is what lets it still be diffed against upstream.
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
// folder and the port beside it, so the page loads it with a bare `import` and
// no build step.

export { composeSheet } from "./compose.mjs";

export {
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
  CANVAS,
  COLORS,
  CONTRAST,
  DISPLAY_SCALE,
  DIVISIONS,
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
