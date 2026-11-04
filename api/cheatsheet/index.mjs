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
// ## The three models
//
// Since 2026.10.29 this folder also carries the formal input surface the
// drawing was standing in for: a **document** of ordered sections and entries
// in `document.mjs`, a **theme** of palette roles, type and metrics in
// `theme.mjs`, and a **layout** of a grid and the slots on it in `layout.mjs`.
// Each has a schema, and `schema.mjs` is what refuses a bad one with the path
// to the field rather than a sentence about the whole.
//
// **Since 2026.10.30 they are the whole public input surface.** `composeSheet`
// takes a document, a theme, a layout, a seed and a set of brand assets, and
// nothing else: the design language record it used to accept as
// `options.language` and the two width tables it accepted as `options.face` and
// `options.codeFace` are refused by name, each pointing at the model that
// replaced it. A caller therefore composes a sheet without naming anything the
// renderer reads for itself.
//
// Within the document model the two shapes are alternatives, and **since
// 2026.11.02 both are permanent**. `composeSheet` takes the **compact** shape
// the twenty-eight committed `sheet.json` files are written in and takes a
// **formal** one as readily, `readDocument` holds each to its own schema, and
// `tools/cheatsheet.mjs --data-only` says which shape it emitted. A formal
// section holds `entries` or `lines`, so the formal model can say everything
// the catalog says and the compact shape is the shorthand for a document of one
// listing rather than a draft awaiting a port - which is why nothing here calls
// it provisional any more. A theme arrives whole or partial and a layout is
// derived from the design language when the caller passes neither.
//
// ## The output surface
//
// **Since 2026.10.31 the way out is this folder's too.** `render.mjs` carries
// it: `renderSVG` for the canonical markup, `renderFragment` for that markup
// made embeddable, and `renderSheet` for any of the five formats with the route
// taken from the call and named on the result. Every one returns data, so a
// caller embeds a sheet without naming a path.
//
// That closes the leak the input surface closed on 2026.10.30, pointing the
// other way. Until it landed a caller reached `composition.toSVG()` on the
// drawing surface's own object and imported `raster.mjs` by path, because this
// file exported nothing from it - which is the same shape as composing through
// `options.language`, and had the same consequence: the published surface could
// not say what a render was for or what had drawn it.
//
// Two things are deliberately **not** exported here, both for one reason:
//
// | Module | Why it stays behind a path |
// | --- | --- |
// | `files.mjs` | It reads `node:fs`, so a page handed it fails at load |
// | `raster.mjs` | It resolves a headless browser the page can never take |
//
// Neither is out of reach. `renderSheet` imports `raster.mjs` at the moment a
// raster is asked for, so the route is reachable through this surface and stays
// out of the page's module graph; `files.mjs` is one import by path, the way the
// drawing surface's own `graphic-design/files` entry is.
//
// Everything exported here is browser-safe and reaches no further than this
// folder and the drawing surface beside it, so the page loads it with a bare `import` and
// no build step.

export { composeSheet, CAP_SHARE } from "./compose.mjs";

export {
  filenameFor,
  fragmentFor,
  renderFragment,
  renderOf,
  renderSVG,
  renderSheet,
  slugFor,
  FRAGMENT_CLASS,
  RASTER_RENDERS,
  RENDER_EXTENSIONS,
  RENDER_FORMATS,
  RENDER_MEDIA_TYPES,
} from "./render.mjs";

export {
  entriesOf,
  isFormalDocument,
  readDocument,
  CODE_ROLES,
  COMPACT_SCHEMA,
  DOCUMENT_SCHEMA,
} from "./document.mjs";

export {
  boxOf,
  curveOf,
  kindOfSection,
  layoutFor,
  paintOf,
  placeSlots,
  readLayout,
  rowSlot,
  rowsFor,
  sectionSlots,
  shapeOf,
  slotForSection,
  slotNamed,
  slotsHolding,
  LAYOUT_SCHEMA,
  SECTION_KINDS,
  SHEET_LAYOUT,
  SLOT_KINDS,
  STAGES,
} from "./layout.mjs";

export {
  assertValid,
  describeErrors,
  validate,
} from "./schema.mjs";

export {
  assertReadable,
  familyCss,
  familyList,
  languageFor,
  readableRoles,
  readTheme,
  resolvePalette,
  themeFrom,
  themeOver,
  themePairings,
  CURVE_TOKENS,
  PALETTE_ROLES,
  SHAPE_FORMS,
  SHAPE_TOKENS,
  SHEET_THEME,
  SYNTAX_ROLES,
  THEME_SCHEMA,
  TYPE_SCALE_ROLES,
} from "./theme.mjs";

export {
  accentRoles,
  accentsReady,
  forgetAccents,
  prepareAccents,
  roleForScope,
  ACCENT_ROLE_ROLES,
  SCOPE_ROLES,
} from "./accents.mjs";

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
  drawnWidth,
  kerning,
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
