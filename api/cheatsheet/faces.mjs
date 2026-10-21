// The faces a generated cheatsheet is measured in.
//
// This is not part of the drawing surface. `api/napkin-sketch/` is a vendored
// copy of the published napkin-sketch build and carries that project's notice;
// everything under `api/cheatsheet/` is this repository's own, measured from its
// own artwork and its own engine. The surface depends on nothing here, and since
// 2026.10.14 nothing here asks the surface how wide anything is: a face is a
// table this layer reads with its own ruler, and what reaches the surface is an
// `x` and a `font-family`.
//
// **The question this file answers.** The surface measures a built-in
// single-stroke alphabet, because upstream draws every glyph itself and has no
// operating system to ask for a font. Its SVG writer emits live `<text>` and
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
// Read with `tools/measure-font-widths.mjs`, which drives Chromium at 1000
// units per em - the advances over a canvas 2D context, and the kerning in SVG
// text layout, because the two engines disagree about a pair holding a space
// and SVG is where a sheet is drawn. Re-run it to check every figure here:
//
// ```bash
// node tools/measure-font-widths.mjs
// ```
//
// Four results, and each of them is why a single committed table is defensible
// rather than a machine-local accident:
//
// - **The fall-through families share one set of advances, exactly.** Measured
//   character by character across printable ASCII, `Arial`, `Helvetica` and
//   `Liberation Sans` disagree with the resolved stack by **0 units on every
//   one of the 95**. They were drawn to one set of widths, and this is that
//   claim checked rather than repeated.
// - **Summing per character equals the engine's own measurement of the lead-in,
//   to 0.000%.** The 33 characters of "Starting Point for Practical Use:" hold
//   no pair the stack kerns, so the one run of artwork whose text is known can
//   be predicted by advances alone exactly. `system-ui` is the exception at
//   -0.512%, which is why it sits late in the stack. **It is a claim about that
//   string and not about the families** - read as the second until 2026.10.21,
//   when a split code line started placing one run against another's drawn
//   width and the 96 pairs below turned up at the boundary.
// - **96 of the 9,025 pairs are kerned, and the same 96 in all three
//   families.** See {@link STACK_KERNS}, and {@link drawnWidth} for the one
//   place they are read.
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
 * The kerning the engine applies between two characters, in units per em.
 *
 * **Measured in SVG text layout, which is where the sheets are drawn, and not
 * through a canvas.** The two disagree: `measureText` reports no kerning for
 * any pair holding a space, while the same pair laid out in a `<text>` element
 * kerns. That is why the claim under **The measurement** above holds and this
 * table still has entries - the one string that claim was checked against,
 * "Starting Point for Practical Use:", holds none of these 96 pairs, so
 * summing its characters really does equal the engine's own answer for it.
 *
 * Only the 96 pairs the resolved stack kerns at all are carried; everything
 * else is zero and absent. The same corroboration the advances got holds here:
 * `Arial`, `Helvetica` and `Liberation Sans` each kern the same 96 pairs by
 * the same amounts, so this is one measurement of a shared design rather than
 * a machine-local accident.
 *
 * Regenerate with `node tools/measure-font-widths.mjs --emit`.
 *
 * @type {Record<string, number>}
 */
const STACK_KERNS = {
  " A": -55,
  " T": -18,
  " Y": -18,
  "11": -74,
  "A ": -55,
  "AT": -74,
  "AV": -74,
  "AW": -37,
  "AY": -74,
  "Av": -18,
  "Aw": -18,
  "Ay": -18,
  "F,": -111,
  "F.": -111,
  "FA": -55,
  "L ": -37,
  "LT": -74,
  "LV": -74,
  "LW": -74,
  "LY": -74,
  "Ly": -37,
  "P ": -18,
  "P,": -129,
  "P.": -129,
  "PA": -74,
  "RT": -18,
  "RV": -18,
  "RW": -18,
  "RY": -18,
  "T ": -18,
  "T,": -111,
  "T-": -55,
  "T.": -111,
  "T:": -111,
  "T;": -111,
  "TA": -74,
  "TO": -18,
  "Ta": -111,
  "Tc": -111,
  "Te": -111,
  "Ti": -37,
  "To": -111,
  "Tr": -37,
  "Ts": -111,
  "Tu": -37,
  "Tw": -55,
  "Ty": -55,
  "V,": -92,
  "V-": -55,
  "V.": -92,
  "V:": -37,
  "V;": -37,
  "VA": -74,
  "Va": -74,
  "Ve": -55,
  "Vi": -18,
  "Vo": -55,
  "Vr": -37,
  "Vu": -37,
  "Vy": -37,
  "W,": -55,
  "W-": -18,
  "W.": -55,
  "W:": -18,
  "W;": -18,
  "WA": -37,
  "Wa": -37,
  "We": -18,
  "Wo": -18,
  "Wr": -18,
  "Wu": -18,
  "Wy": -9,
  "Y ": -18,
  "Y,": -129,
  "Y-": -92,
  "Y.": -129,
  "Y:": -55,
  "Y;": -65,
  "YA": -74,
  "Ya": -74,
  "Ye": -92,
  "Yi": -37,
  "Yo": -92,
  "Yp": -74,
  "Yq": -92,
  "Yu": -55,
  "Yv": -55,
  "ff": -18,
  "r,": -55,
  "r.": -55,
  "v,": -74,
  "v.": -74,
  "w,": -55,
  "w.": -55,
  "y,": -74,
  "y.": -74,
};

/**
 * A face: a width table and the vertical metrics that go with it.
 *
 * **Declared here rather than imported, and that is the point.** The drawing
 * API this layer sits on is a dependency that can be swapped, and the published
 * package it is becoming does not carry this type at all - its own measuring
 * options are a size and two spacings, with nowhere to name a face. A layer
 * whose central type lived in a dependency would lose the type the moment the
 * dependency moved, so the face is this repository's own and is handed to the
 * drawing surface only as the numbers it needs: a family name and an `x`.
 *
 * @typedef {object} Face
 * @property {string} [name]
 * @property {number} unitsPerEm
 * @property {number} capHeight
 * @property {number} xHeight
 * @property {number} descender
 * @property {Record<string, number>} advances
 * @property {Record<string, number>} [kerns] Pair adjustments, in units per em.
 * @property {number} [fallbackAdvance]
 * @property {string} [fontFamily]
 */

/**
 * The face a generated sheet is measured and drawn in.
 *
 * @type {Face}
 */
export const SHEET_FACE = {
  name: "sheet",
  unitsPerEm: STACK_UNITS_PER_EM,
  capHeight: STACK_CAP_HEIGHT,
  xHeight: STACK_X_HEIGHT,
  descender: STACK_DESCENDER,
  advances: STACK_ADVANCES,
  kerns: STACK_KERNS,
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
 * @type {Face}
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
 * Advance of one character in composition units, before letter spacing.
 *
 * Read as an own property, because {@link STACK_ADVANCES} is an object literal
 * and a lookup for `constructor` or `toString` otherwise finds a function on
 * `Object.prototype`. The division then yields `NaN`, which propagates through
 * every width on the line and raises nowhere.
 *
 * @param {string} char
 * @param {number} fontSize
 * @param {Face} [face]
 * @returns {number}
 */
export function charAdvance(char, fontSize, face = SHEET_FACE) {
  const advance = Object.prototype.hasOwnProperty.call(face.advances, char)
    ? face.advances[char]
    : (face.fallbackAdvance ?? FALLBACK_ADVANCE);
  return (advance / face.unitsPerEm) * fontSize;
}

/**
 * Width of a run of text in composition units, in the face it will be drawn in.
 *
 * **This is the layer's own ruler, and it has to be.** The drawing surface
 * measures too, but it measures the alphabet *it* draws: upstream has no
 * operating system to ask for a font, so its options are a size and two
 * spacings and there is nowhere to name a face at all. A run measured there and
 * drawn in a browser lands nowhere near where it was measured to land - 62% too
 * wide against the one run of artwork whose text is known.
 *
 * The hand port that preceded the vendored copy papered over that by taking a
 * `face`, which was a local change and the only reason the two ever agreed. It
 * is also a change a published release cannot carry. Measuring here instead
 * is what lets the drawing surface be swapped for the published package without
 * any of this moving: nothing in `api/cheatsheet/` asks the surface how wide
 * anything is, and every run reaches it as an `x` and a `font-family`.
 *
 * The arithmetic is the surface's own, character by character with the trailing
 * letter space taken back off, so a sheet measured here composes to the same
 * bytes it composed to when the surface measured it.
 *
 * @param {string} text
 * @param {object} options
 * @param {number} options.fontSize
 * @param {number} [options.letterSpacing]
 * @param {number} [options.wordSpacing]
 * @param {Face} [options.face]
 * @returns {number}
 */
export function measureRun(text, options) {
  const spacing = options.letterSpacing ?? 0;
  const wordSpacing = options.wordSpacing ?? 0;
  const face = options.face ?? SHEET_FACE;
  let width = 0;
  for (const char of text) {
    width += charAdvance(char, options.fontSize, face) + spacing;
    if (char === " ") width += wordSpacing;
  }
  // The trailing letter space is a gap after the last glyph, not part of the
  // run, so a centred line stays centred.
  return Math.max(0, width - (text.length > 0 ? spacing : 0));
}

/**
 * The kerning the engine adds to a run, in composition units.
 *
 * Summed over adjacent character pairs. A pair the table does not carry kerns
 * by nothing, which is all but 96 of them, and a face carrying no table at all
 * kerns by nothing anywhere - so a replacement face is unkerned rather than
 * broken.
 *
 * Read as own properties, the guard {@link charAdvance} carries for the same
 * reason: a pair spelling `toString` would otherwise find a function on
 * `Object.prototype` and reach the arithmetic as a width.
 *
 * @param {string} text
 * @param {number} fontSize
 * @param {Face} [face]
 * @returns {number}
 */
export function kerning(text, fontSize, face = SHEET_FACE) {
  const pairs = face.kerns;
  if (!pairs) return 0;
  const chars = Array.from(text);
  let units = 0;
  for (let at = 1; at < chars.length; at += 1) {
    const pair = chars[at - 1] + chars[at];
    if (Object.prototype.hasOwnProperty.call(pairs, pair)) units += pairs[pair];
  }
  return (units / face.unitsPerEm) * fontSize;
}

/**
 * Width of a run as the engine lays it out, kerning included.
 *
 * **Two rulers, and the second one exists because a split line needs it.**
 * {@link measureRun} is the composition's ruler: it is what every coordinate
 * in `compose.mjs` is worked from, and it stays a per-character sum on purpose
 * - the geometry recorded in `DESIGN_LANGUAGE.md` was matched against it, and
 * re-measuring the whole composition with a different ruler would move every
 * run on every sheet to fix a defect in one of them.
 *
 * What needs the engine's own answer instead is a code line drawn as several
 * `<text>` elements, one per accent run. Each element is placed at an absolute
 * `x`, so the table decides where a run starts while the engine decides how
 * wide the one before it draws, and the difference between them opens as a gap
 * at the boundary. Measured in Chromium on 2026.10.21 at the sheets' own code
 * size, `nestArrayToChange[` sums to 564.594 here and draws at 557.828 -
 * one `To` pair, 6.77 units, or 1.7 px at the page's 900px cap, landing inside
 * a token. With the kerning carried the same run sums to 564.609 against
 * 564.609 drawn.
 *
 * So the rule for a split line is: advance by what each run *draws*, never by
 * what the whole prefix *measures*. The engine kerns inside an element and
 * cannot kern across two, and this is the only function that agrees with it on
 * both halves of that.
 *
 * @param {string} text
 * @param {object} options
 * @param {number} options.fontSize
 * @param {number} [options.letterSpacing] Added after shaping, so it does not move the kerning.
 * @param {number} [options.wordSpacing]
 * @param {Face} [options.face]
 * @returns {number}
 */
export function drawnWidth(text, options) {
  return (
    measureRun(text, options) + kerning(text, options.fontSize, options.face ?? SHEET_FACE)
  );
}

/**
 * Where a run starts, given where it is to be centred.
 *
 * Centring used to be the renderer's job, through an `align` of `center` and a
 * face on the element for it to measure with. The published drawing surface
 * reads neither, so the composition works the left edge out itself and places
 * every run left aligned. The arithmetic is the one the renderer did - the
 * centre less half the measured width - so the coordinates are unchanged.
 *
 * @param {string} text
 * @param {number} centre
 * @param {number} fontSize
 * @param {Face} [face]
 * @returns {number}
 */
export function centredAt(text, centre, fontSize, face = SHEET_FACE) {
  return centre - measureRun(text, { fontSize, face }) / 2;
}

/**
 * The font size at which a face reaches a given cap height.
 *
 * The design language records cap heights rather than font sizes, because a cap
 * height is what can be measured off artwork. This is the conversion, and it is
 * face-specific: the same cap asks a different size of every family in the
 * stack, which is the residual recorded above.
 *
 * @param {number} cap Cap height in composition units.
 * @param {Face} [face]
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
 * @param {Face} [face]
 * @returns {{ face: Face, fontSize: number, fontWeight: number }}
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
