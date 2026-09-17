// The design language of the eleven sheets, as data a composition can read.
//
// Every figure here is transcribed from `DESIGN_LANGUAGE.md`, which measured it
// off the artwork with `tools/measure-sheet-composition.mjs`. That document is
// the record; this file is that record in the form the algorithm consumes, and
// `tools/test-composition-algorithm.mjs` checks the two still agree.
//
// **Two things to know before reading a number here.**
//
// A generated sheet composes at **3600, not 3601**. The artwork is 3601 px
// square and that extra pixel is export rounding: 3600 is 75 whole steps of 48
// and 3601 divides by nothing. Where a value below differs from the measured
// one, it is because the measurement was snapped to that step, and **The step
// the sheets are drawn to** gives the residual for each in display pixels.
//
// The bands close on the canvas and the divisions do not. Snapping the three
// divisions to their nearest step gives 3648, a full step over, so the panel
// drops to 64 steps and the row closes. That puts a generated sheet up to 4.5
// display pixels off the eleven across the canvas against 1.7 down it, and it
// is the trade the design language took rather than one taken here.

/** The canvas a generated sheet composes at, square. */
export const CANVAS = 3600;

/**
 * The step everything is drawn to, in sheet pixels.
 *
 * The site lays out on an 8px step and a sheet is displayed 600 px wide, so one
 * site pixel is 6.0017 sheet pixels and the site's step is 48 of them. 3600 is
 * 75 of those exactly.
 */
export const STEP = 48;

/** How many sheet pixels one display pixel is, at the 600 px display width. */
export const DISPLAY_SCALE = 6.0017;

/**
 * The token set, in multiples of the step, from **The tokens**.
 *
 * There is no `step-5`, `step-7` or `step-8` because the sheets use none.
 *
 * @type {Record<string, number>}
 */
export const TOKENS = {
  step: STEP,
  "step-2": STEP * 2,
  "step-3": STEP * 3,
  "step-4": STEP * 4,
  "step-6": STEP * 6,
  "step-9": STEP * 9,
  "step-10": STEP * 10,
};

/** The 4px display radius, in sheet pixels. Small, because the mark is square. */
export const RADIUS = 24;

/**
 * A band across the canvas: where it starts, how tall it is, and what it holds.
 *
 * @typedef {object} Band
 * @property {number} y
 * @property {number} height
 * @property {number} steps
 * @property {number} measured Height measured off the artwork, before snapping.
 */

/**
 * The five bands down the canvas, snapped to the step.
 *
 * 528 + 672 + 2016 + 48 + 336 is 3600, and 11 + 14 + 42 + 1 + 7 is 75. No band
 * is more than 1.74 display pixels from the step.
 *
 * @type {Record<string, Band>}
 */
export const BANDS = {
  masthead: { y: 0, height: 528, steps: 11, measured: 527 },
  heading: { y: 528, height: 672, steps: 14, measured: 662 },
  code: { y: 1200, height: 2016, steps: 42, measured: 2027 },
  divider: { y: 3216, height: 48, steps: 1, measured: 45 },
  footer: { y: 3264, height: 336, steps: 7, measured: 339 },
};

/**
 * A division across the canvas.
 *
 * @typedef {object} Division
 * @property {number} x
 * @property {number} width
 * @property {number} steps
 * @property {number} measured
 */

/**
 * The three divisions across the canvas, snapped to the step.
 *
 * The spine is flush to the left edge and the panel begins where it ends, so
 * below the heading band the composition has no left margin at all. The right
 * margin is the only one.
 *
 * @type {Record<string, Division>}
 */
export const DIVISIONS = {
  spine: { x: 0, width: 240, steps: 5, measured: 231 },
  panel: { x: 240, width: 3072, steps: 64, measured: 3100 },
  rightMargin: { x: 3312, width: 288, steps: 6, measured: 270 },
};

/**
 * The colors the sheets are drawn in, from **The colors the sheets are drawn
 * in**. The first six cover 98.74% of all 142,639,211 pixels measured.
 */
export const COLORS = {
  /** The masthead and code panel ground, the footer mark square, the footer type. */
  navy: "#000132",
  /** The heading and footer ground, and plain code. */
  white: "#FFFFFF",
  /** The spine, both flanking rules, the divider, the footer sigil. */
  green: "#4DAE51",
  /** The title, the subtitle and the lead-in. Neutral, not the site's blue-tinted slate. */
  heading: "#414143",
  /**
   * The green that may carry text on a white ground, at 5.33:1.
   *
   * The sheets' own green reaches 2.80:1 on their white and the footer sets a
   * sigil in it anyway, which is the one place the eleven break the site's
   * contrast rule. **The one place the sheets break the site's own rule**
   * records that rather than repainting it, and settles the rule for generated
   * sheets as the site's rule unchanged: on a white ground the green is a fill,
   * and text that has to be read takes this instead.
   */
  greenOnWhite: "#2E7534",
};

/**
 * The syntax palette of the code panel. Each was measured at 100% inside the
 * panel, and the last three rank below the others in the census only because an
 * example with no string in it contains no string color.
 */
export const SYNTAX = {
  plain: COLORS.white,
  comment: "#B4BEC8",
  identifier: "#ADF8B7",
  keyword: "#F8F5AE",
  string: "#FDC83A",
  number: "#8DE632",
};

/** Contrast floors, which are the site's and which generated sheets keep. */
export const CONTRAST = { text: 4.5, boundary: 3 };

/**
 * The two green rules flanking the title inside the heading band.
 *
 * Each is drawn as a pair flush to the left and right edges with the title
 * between them. The widths are the `step-9` token; the heights are left as
 * measured, because neither lands on a token and rounding them to one would
 * hide that.
 */
export const RULES = {
  width: TOKENS["step-9"],
  gap: TOKENS.step,
  upper: { height: 45, y: 532 },
  lower: { height: 20, y: 623 },
  /** The gutter from a flanking rule to the title, which is the `step-2` token. */
  gutter: TOKENS["step-2"],
  /**
   * What the title is set across: the canvas less both rules and both gutters.
   *
   * 2544, against the 2595 the artwork's own title measures. The 51 px between
   * them is not an error and is worth following: the rule rounded up from 420
   * to 432 and the gutter up from 81 and 85 to 96, so four roundings all went
   * the same way and each took its width out of the title. A generated title
   * therefore has slightly less room than the hand-composed one had, which is
   * the direction to be wrong in - it fits inside the artwork's measure rather
   * than spilling past it.
   */
  measure: CANVAS - (TOKENS["step-9"] + TOKENS["step-2"]) * 2,
};

/**
 * The mark square in the footer, flush to the bottom left corner.
 *
 * Measured 292 x 339, which snaps to `step-6` across and to the footer's own
 * height down, so it fills the band it sits in.
 */
export const MARK_SQUARE = {
  x: 0,
  y: BANDS.footer.y,
  width: TOKENS["step-6"],
  height: BANDS.footer.height,
};

/**
 * The insets the sheets place text at, each on a token.
 *
 * `spineTop` is how far the green spine starts above the code panel, which is
 * the one vertical use of `step-4`.
 */
export const INSETS = {
  mastheadPadding: TOKENS["step-3"],
  leadInFromSpine: TOKENS["step-3"],
  titleMargin: TOKENS["step-10"],
  followLineFromMark: TOKENS["step-6"],
  spineTop: TOKENS["step-4"],
  /**
   * From the follow line to the foot of the canvas: 74 or 75 measured, which is
   * a step and a half and lands on no token in the set. Carried as the step and
   * a half rather than promoted to one.
   */
  footerBottom: TOKENS.step * 1.5,
};

/**
 * Where a fixed run of text sits, from **Where the text sits**.
 *
 * @typedef {object} Run
 * @property {number} inkTop Top of the run's ink, measured.
 * @property {number} cap Cap or ascent height, from **The faces**.
 * @property {number} baseline `inkTop + cap`, which is what a text element is placed by.
 * @property {number} [left] Left edge of the ink, where the run is not centred.
 * @property {number} [width] Measured width, for the four runs whose text is fixed.
 */

/**
 * The six runs of text, at the positions the ten template sheets share.
 *
 * `shiftAndUnshift.jpg` places its lead-in 84 px lower and everything below it
 * with it. That is a deviation rather than a variation - the design language is
 * explicit about the distinction - so it is recorded there and not reproduced
 * here.
 *
 * **Baselines, not ink tops, are what a composition places by**, so each is
 * given: `layoutText` positions a line by its baseline, and deriving one from a
 * band edge by adding tokens drifts. Placing the title 62 px below the heading
 * band because that is what the tokens sum to, rather than at the 730 the
 * artwork puts it at, is how a subtitle ends up printed over a descender.
 *
 * @type {Record<string, Run>}
 */
export const RUNS = {
  wordmark: { inkTop: 133, cap: 220, baseline: 353, left: 550, width: 2084 },
  title: { inkTop: 589, cap: 141, baseline: 730, width: 2595 },
  subtitle: { inkTop: 811, cap: 112, baseline: 923 },
  leadIn: { inkTop: 1021, cap: 112, baseline: 1133, left: 377, width: 1481 },
  followLine: { inkTop: 3325, cap: 154, baseline: 3479, left: 603, width: 2723 },
};

/**
 * The ranges the code panel is free within, from **How closely the eleven
 * repeat** and **The faces**.
 *
 * Every other figure in this file is fixed across all eleven sheets to within a
 * pixel. These three are not, and the design language says why: the panel is a
 * fixed frame around free content, and it is the only region of which that is
 * true. They are therefore the whole of what a seeded variation may move, and
 * `variation.mjs` moves nothing else.
 */
export const PANEL_FREEDOM = {
  /** Panel edge to the first row of code: 37 to 152 across the eleven. */
  topPadding: { min: 37, max: 152 },
  /** Left inset of the leftmost code line: 85 to 414 across the eleven. */
  leftInset: { min: 85, max: 414 },
  /** Baseline to baseline: 56 to 116, tracking how much code the sheet carries. */
  lineSpacing: { min: 56, max: 116 },
};

/**
 * The whole language as one object, so a caller can pass a modified copy rather
 * than reach for module state.
 */
export const SHEET_LANGUAGE = {
  canvas: CANVAS,
  step: STEP,
  displayScale: DISPLAY_SCALE,
  tokens: TOKENS,
  radius: RADIUS,
  bands: BANDS,
  divisions: DIVISIONS,
  colors: COLORS,
  syntax: SYNTAX,
  contrast: CONTRAST,
  rules: RULES,
  markSquare: MARK_SQUARE,
  insets: INSETS,
  runs: RUNS,
  panelFreedom: PANEL_FREEDOM,
};
