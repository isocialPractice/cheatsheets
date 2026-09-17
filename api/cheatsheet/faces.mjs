// The faces a generated cheatsheet is measured in.
//
// This is not part of the port. `api/graphic-design/` is a copy of the
// napkin-sketch drawing surface and carries that project's notice; everything
// under `api/cheatsheet/` is this repository's own, measured from its own
// artwork and its own engine. The port depends on nothing here - a face is a
// plain object it accepts, not a module it imports.
//
// **The question this file answers.** `font.mjs` measures a built-in
// single-stroke alphabet, because upstream draws every glyph itself and has no
// operating system to ask for a font. The SVG writer emits live `<text>` and
// names a family, so a browser draws something else. Laid out from built-in
// advances, a run lands nowhere near where it was measured to land: against the
// lead-in, the one run of artwork whose text is known - "Starting Point for
// Practical Use:", 1481 px wide at a 112 px cap per **Where the text sits** in
// `DESIGN_LANGUAGE.md` - the built-in alphabet predicts 2403 px, which is 62%
// too wide.
//
// **Two routes were open, and this is the one taken.** The alternative was to
// set each block as a single `text` element with no `x` of its own and let the
// browser break it, which forfeits the extents. That was rejected on what the
// design language actually asks for: the title is 2595 px wide and centred
// within 2 px of the canvas axis, the flanking rules were placed against its
// measured width, and the lead-in sits 146 px in from the spine. None of that
// is expressible without knowing how wide a run is before it is drawn, and the
// rasterizer - which has no browser at all - could not follow the browser's
// breaks even in principle, so the SVG and the PNG would stop being the same
// composition.
//
// So the widths are measured once, in a real engine, and committed. What that
// buys is in **The measurement** below; what it costs is in **The residual**.
//
// ## The measurement
//
// Read with `tools/measure-font-widths.mjs`, which drives Chromium over a
// canvas 2D context at 1000 units per em. Re-run it to check every figure here:
//
// ```bash
// node tools/measure-font-widths.mjs
// ```
//
// Three results, and each of them is why a single committed table is defensible
// rather than a machine-local accident:
//
// - **The fall-through families share one set of advances, exactly.** Measured
//   character by character across printable ASCII, `Arial`, `Helvetica` and
//   `Liberation Sans` disagree with the resolved stack by **0 units on every
//   one of the 95**. They were drawn to one set of widths, and this is that
//   claim checked rather than repeated.
// - **Summing per character equals the engine's own measurement of the whole
//   string, to 0.000%.** So none of those families kerns by default, and a
//   per-character table loses nothing to one. `system-ui` is the exception at
//   -0.512%, which is why it sits late in the stack.
// - **The artwork's face is condensed to 0.684 of the stack.** At the lead-in's
//   112 px cap the stack sets that string at 2165 px against the artwork's
//   1481. That corroborates **The faces are not named**, which found the three
//   nearest candidates among 481 installed fonts were all condensed and all
//   wrong on letterform.
//
// ## The residual
//
// Two costs, both bounded and both worth naming rather than discovering later.
//
// - **Cap height is not shared, even where advances are.** `Liberation Sans`
//   matches every advance and puts its cap at 688 units against the stack's
//   719, and `Helvetica Neue` at 672. A run therefore breaks in the same place
//   and sits at the same coordinates everywhere, while the glyphs drawn into it
//   vary in height by up to 7% between fallbacks. Layout never shifts; the type
//   colour does, slightly. That is the trade a committed table makes, and it is
//   the right way round - a sheet that reflowed per machine would not be the
//   same sheet.
// - **The artwork's own face cannot be reproduced, only measured.** Nothing
//   here applies {@link SHEET_CONDENSATION} as a horizontal scale to force a
//   generated run onto the artwork's exact width. Squeezing a grotesque to 68%
//   forges a condensed face out of one that is not, and the result is wrong in
//   a way a reader sees. The composition fits a run to its region instead, so a
//   generated sheet keeps the artwork's geometry and does not pretend to its
//   letterforms.

/**
 * The stack a generated sheet names, which is also the page's own face per
 * **The page's face** in `DESIGN_LANGUAGE.md`.
 *
 * It is a stack rather than a family so nothing has to ship: a grotesque where
 * one is installed, the platform's interface face where it is not, and the
 * generic as the last resort.
 */
export const SHEET_FONT_FAMILY = '"Helvetica Neue", Arial, system-ui, sans-serif';

/** Units per em the table below is expressed in, as a font file would carry it. */
export const STACK_UNITS_PER_EM = 1000;

/** Cap height of the resolved stack, in those units. */
export const STACK_CAP_HEIGHT = 719;

/** x-height of the resolved stack, in those units. */
export const STACK_X_HEIGHT = 531;

/** Descender depth of the resolved stack, in those units. */
export const STACK_DESCENDER = 219;

/**
 * How condensed the artwork's display face is against this stack, set so both
 * reach the same cap height.
 *
 * Recorded because it is a measured property of the artwork, and deliberately
 * not applied - see **The residual** above.
 */
export const SHEET_CONDENSATION = 0.684;

/**
 * Advance used for a character the table does not carry, which is everything
 * outside printable ASCII. 556 is the digit width, so a run of unexpected text
 * measures close rather than collapsing.
 */
const FALLBACK_ADVANCE = 556;

/**
 * Advance width per character, in units per em, read from the resolved stack.
 *
 * Regenerate with `node tools/measure-font-widths.mjs --emit`.
 *
 * @type {Record<string, number>}
 */
const STACK_ADVANCES = {
  " ": 278,
  "!": 278,
  "\"": 355,
  "#": 556,
  "$": 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 278,
  ";": 278,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 556,
  "@": 1015,
  "A": 667,
  "B": 667,
  "C": 722,
  "D": 722,
  "E": 667,
  "F": 611,
  "G": 778,
  "H": 722,
  "I": 278,
  "J": 500,
  "K": 667,
  "L": 556,
  "M": 833,
  "N": 722,
  "O": 778,
  "P": 667,
  "Q": 778,
  "R": 722,
  "S": 667,
  "T": 611,
  "U": 722,
  "V": 667,
  "W": 944,
  "X": 667,
  "Y": 667,
  "Z": 611,
  "[": 278,
  "\\": 278,
  "]": 278,
  "^": 469,
  "_": 556,
  "`": 333,
  "a": 556,
  "b": 556,
  "c": 500,
  "d": 556,
  "e": 556,
  "f": 278,
  "g": 556,
  "h": 556,
  "i": 222,
  "j": 222,
  "k": 500,
  "l": 222,
  "m": 833,
  "n": 556,
  "o": 556,
  "p": 556,
  "q": 556,
  "r": 333,
  "s": 500,
  "t": 278,
  "u": 556,
  "v": 500,
  "w": 722,
  "x": 500,
  "y": 500,
  "z": 500,
  "{": 334,
  "|": 260,
  "}": 334,
  "~": 584,
};

/**
 * The face a generated sheet is measured and drawn in.
 *
 * @type {import('../graphic-design/font.mjs').Face}
 */
export const SHEET_FACE = {
  name: "sheet",
  unitsPerEm: STACK_UNITS_PER_EM,
  capHeight: STACK_CAP_HEIGHT,
  xHeight: STACK_X_HEIGHT,
  descender: STACK_DESCENDER,
  advances: STACK_ADVANCES,
  fallbackAdvance: FALLBACK_ADVANCE,
  fontFamily: SHEET_FONT_FAMILY,
};

/**
 * The code face, which is the same face.
 *
 * That is a finding rather than a shortcut. **The faces** in
 * `DESIGN_LANGUAGE.md` tested whether the sheets' code is monospaced by
 * splitting each code line into runs of inked columns and measuring the gaps
 * between run starts against one advance: a monospaced face puts every gap on
 * that advance or a whole multiple of it, and the sheets miss by 0.186 to 0.230
 * on all eleven, against 0.007 to 0.023 for the line spacing control. The code
 * face is proportional, so generated code is set proportionally and never to a
 * grid.
 *
 * @type {import('../graphic-design/font.mjs').Face}
 */
export const CODE_FACE = { ...SHEET_FACE, name: "sheet-code" };

/**
 * A type role: one of the four sizes the sheets are set in.
 *
 * @typedef {object} TypeRole
 * @property {number} cap Cap height in sheet pixels, measured from the artwork.
 * @property {number} stem Modal stroke width in sheet pixels.
 * @property {number} stemShare `stem / cap`, which is what the weight is read from.
 * @property {number} fontWeight The CSS weight that share resolves to.
 */

/**
 * The four type sizes, from **The faces** in `DESIGN_LANGUAGE.md`.
 *
 * They are four sizes chosen by hand and not a scale: the steps between them
 * are 1.26, 1.13 and 1.20, which is not one ratio, so they are carried as the
 * measured values rather than reconstructed from a base and a multiplier.
 *
 * The figures were read off 3601 px artwork and are used unchanged at 3600.
 * The difference is 0.03%, which is a twentieth of the one pixel that JPEG at
 * quality 99 moves a flat edge by on its own.
 *
 * **The weights are read from the stems relatively, not absolutely.** The three
 * body roles sit together between 12.3% and 12.8% of their cap and the masthead
 * at 8.6% is distinctly lighter, which is the finding the design language
 * states - the masthead is the same skeleton at a lighter weight. What is *not*
 * measured anywhere is the stem share of the stack this file commits, so no
 * claim is made that 12.5% is its regular; the mapping below only preserves the
 * ordering the artwork shows.
 *
 * @type {Record<string, TypeRole>}
 */
export const TYPE_ROLES = {
  masthead: { cap: 220, stem: 19, stemShare: 0.086, fontWeight: 300 },
  followLine: { cap: 154, stem: 19, stemShare: 0.123, fontWeight: 400 },
  title: { cap: 141, stem: 18, stemShare: 0.128, fontWeight: 400 },
  leadIn: { cap: 112, stem: 14, stemShare: 0.125, fontWeight: 400 },
};

/**
 * The font size at which a face reaches a given cap height.
 *
 * The design language records cap heights rather than font sizes, because a cap
 * height is what can be measured off artwork. This is the conversion, and it is
 * face-specific: the same cap asks a different size of every family in the
 * stack, which is the residual recorded above.
 *
 * @param {number} cap Cap height in composition units.
 * @param {import('../graphic-design/font.mjs').Face} [face]
 * @returns {number}
 */
export function sizeForCap(cap, face = SHEET_FACE) {
  return (cap * face.unitsPerEm) / face.capHeight;
}

/**
 * The text properties a named role is set with, ready to spread onto a text
 * element.
 *
 * @param {keyof TYPE_ROLES | string} name
 * @param {import('../graphic-design/font.mjs').Face} [face]
 * @returns {{ face: import('../graphic-design/font.mjs').Face, fontSize: number, fontWeight: number }}
 */
export function roleStyle(name, face = SHEET_FACE) {
  const role = Object.prototype.hasOwnProperty.call(TYPE_ROLES, name)
    ? TYPE_ROLES[name]
    : undefined;
  if (!role) {
    throw new Error(
      `cheatsheet: no type role named "${name}". The sheets carry ` +
        `${Object.keys(TYPE_ROLES).join(", ")}.`
    );
  }
  return { face, fontSize: sizeForCap(role.cap, face), fontWeight: role.fontWeight };
}
