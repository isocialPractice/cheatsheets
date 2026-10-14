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
   * The green that may carry text on a white ground, at 5.66:1.
   *
   * The sheets' own green reaches 2.80:1 on their white and the footer sets a
   * sigil in it anyway, which is the one place the eleven break the site's
   * contrast rule. **The one place the sheets break the site's own rule**
   * records that rather than repainting it, and settles the rule for generated
   * sheets as the site's rule unchanged: on a white ground the green is a fill,
   * and text that has to be read takes this instead.
   *
   * The same color is recorded at 5.33:1 elsewhere in `DESIGN_LANGUAGE.md`, and
   * both figures are right: the site softens its page white to `#F8F8F9` and
   * the sheets use pure white. A ratio without its ground is not a fact about a
   * color, which is why `contrast.mjs` computes rather than quotes.
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

/**
 * How much of the eleven sheets each color covers, from **The colors the
 * sheets are drawn in**.
 *
 * Counted over all 142,639,211 pixels, each figure the exact color plus every
 * triple within 12 units of it, because JPEG spreads a flat fill across
 * hundreds of neighbouring triples. The six below cover 98.74%.
 *
 * This is an **area** record, which is what makes it different from everything
 * else in this file. {@link BANDS} and {@link DIVISIONS} say where a region
 * is; this says how much page a color ends up covering once the type is drawn
 * on top of those regions, and the two answer different questions. A palette
 * with the right colors in the wrong proportions produces the right swatches
 * and the wrong roles, because a role is decided from area - so an asset
 * composed to be measured has to reproduce this table and not only
 * {@link COLORS}.
 *
 * The three syntax colors below `identifier` carry no share here because the
 * census gives them none: each was measured at 100% inside the code panel and
 * they rank below the six only because an example with no string in it has no
 * string color. A share invented for them would be a number the record did not
 * give, which is the one thing a design language may not contain.
 *
 * @type {Record<string, number>}
 */
export const CENSUS_SHARES = {
  navy: 0.6097,
  white: 0.2896,
  green: 0.06,
  heading: 0.0187,
  comment: 0.007,
  identifier: 0.0024,
};

/**
 * Which half of a language's palette each census role takes its color from.
 *
 * Four of the six are page colors and two are syntax colors, and the two
 * tables are replaced separately - so the role name alone does not say where
 * to look its hex up.
 *
 * @type {Record<string, 'colors' | 'syntax'>}
 */
const CENSUS_PALETTE = {
  navy: "colors",
  white: "colors",
  green: "colors",
  heading: "colors",
  comment: "syntax",
  identifier: "syntax",
};

/**
 * The census as `{ hex, share }` pairs, with the hexes read off `language`.
 *
 * **The shares belong to the sheets and the hexes belong to the palette.**
 * Keeping the two apart is what {@link CENSUS_SHARES} is separated for: the
 * shares were counted off artwork and cannot be re-counted for a palette
 * nobody has drawn yet, while the hexes are whatever the language in hand
 * paints with. So a theme's census is the recorded proportions in the theme's
 * own colors, which is the only reading of it that invents no figure.
 *
 * It is a function rather than a field on {@link SHEET_LANGUAGE} on purpose. A
 * theme is a spread copy with `colors` and `syntax` replaced, and a `census`
 * field would survive that spread holding the sheets' hexes - a table naming
 * four colors the theme never draws, reading as measured because every other
 * figure beside it was.
 *
 * @param {{ colors: Record<string, string>, syntax: Record<string, string> }} language
 * @returns {Record<string, { hex: string, share: number }>}
 */
export function censusFor(language) {
  return Object.fromEntries(
    Object.entries(CENSUS_SHARES).map(([role, share]) => [
      role,
      { hex: language[CENSUS_PALETTE[role]][role], share },
    ])
  );
}

/**
 * The eleven sheets' own census: the recorded shares in the recorded colors.
 *
 * @type {Record<string, { hex: string, share: number }>}
 */
export const CENSUS = censusFor({ colors: COLORS, syntax: SYNTAX });

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
 * The two places the sheets carry a brand asset rather than drawn shapes.
 *
 * Both were measured on `javaScriptArrays/SplicingArrays.jpg` on 2026.10.14,
 * by scanning the artwork for the mark's own green and reading the extents.
 * Until then the algorithm drew neither - it set a lone wordmark in the
 * masthead and a bare navy rectangle in the footer - because nothing resolved
 * the assets the repository had.
 *
 * **`logo` is the second masthead element**, and it is the one
 * `compose.mjs` named and could not draw. The mark's green bar runs x 2182 to
 * 2303 and y 132 to 373, and that bar is the full height of the mark's own
 * square, so the asset occupies 2182 to 2634 across and 132 to 374 down: 452
 * by 242, at the same ink top the wordmark is placed from. The wordmark's own
 * ink ends at 1877, so `gap` is the 305 px between the two.
 *
 * That also settles what {@link RUNS}`.wordmark` records. Its `left` of 550 and
 * `width` of 2084 reach 2634, which is the **lockup** - the wordmark and the
 * asset together - and not the text alone, which is 1327 px wide. The lockup
 * is 208 px left of the canvas axis, so neither half of it is centred on the
 * axis and the pair is not either. A generated lockup is centred anyway, for
 * the reason `compose.mjs` already gives for the lone wordmark: the artwork's
 * face is condensed to 0.684 of the stack a generated sheet can name, so a
 * generated wordmark is half again as wide as the artwork's and holding its
 * left edge at 550 would run the asset off the right of the canvas.
 *
 * **`footer` is the whole footer lockup** - the mark square and the follow
 * line, which in the artwork is one strip of the brand's own: a mark, "Follow
 * Me", three social icons and a handle. It takes the band less the right
 * margin, 0 to 3312, which at the asset's own 752 by 51 sets its text at a
 * 154 px cap - the cap {@link RUNS}`.followLine` measures. One of those icons
 * is drawn over a gradient, which this design language has no way to draw at
 * all, so the strip is the only form that carries it.
 *
 * A slot with no asset behind it is drawn as it always was.
 */
export const BRAND_SLOTS = {
  logo: { width: 452, height: 242, gap: 305, top: RUNS.wordmark.inkTop },
  footer: {
    x: 0,
    y: BANDS.footer.y,
    width: CANVAS - DIVISIONS.rightMargin.width,
    height: BANDS.footer.height,
  },
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
 * The floors a variation may not cross, whatever the seed or the document.
 *
 * Everything else in this file describes what a sheet **is**. These three
 * describe what a sheet may not become, which is a different kind of figure and
 * is why they are grouped rather than folded into the tables above.
 *
 * Each is derived from something already measured rather than chosen:
 *
 * - `displayCap` is one {@link STEP} of cap height, which is 8.0 display pixels
 *   at the 600 px display width. The step is the unit the whole sheet is drawn
 *   to, so a run allowed below one step of cap is a run set smaller than the
 *   grid it sits on can address. Every measured display cap - 220, 154, 141,
 *   112 - is a multiple of it or close to one.
 * - `codeCap` is the cap the **minimum** measured line spacing yields, at the
 *   share of the spacing the cap takes. The eleven sheets' most crowded panel
 *   is therefore exactly at this floor, which is the point: the floor is the
 *   tightest the artwork itself ever got, not a figure invented under it.
 *   `tools/test-composition-algorithm.mjs` ties it back to the share
 *   `compose.mjs` derives it with, so the two cannot drift apart.
 * - `panelFill` is the least filled panel of the eleven. Re-measuring them with
 *   `tools/measure-sheet-composition.mjs` puts the ink of the code block at
 *   0.852 of the panel on `CompareArrayFunction.jpg` and at 0.966 on three
 *   others. 0.85 is therefore the sparsest the artwork itself ever was, and a
 *   generated sheet under it is outside the record rather than merely airy.
 *
 *   What a document needs to reach it is **rows**, not lines: at the 116 px
 *   maximum spacing the floor wants 16 of them, and the eleven run 18 to 36,
 *   counting the blanks. `SlicingArrays.jpg` draws only 14 lines of code and
 *   still fills 0.966 of the panel, because three of its rows are empty and a
 *   blank row occupies its slot exactly like an inked one.
 *
 * **What a floor does when it is reached is not to clamp.** A run stops
 * shrinking at the floor and the composition reports that it did; it is never
 * pushed back up to the floor, which would put the ink outside the region it
 * was fitted to. The floors bound what a **seed** may do. A document carrying
 * more code than the panel holds, or less than fills it, is a fault in the
 * document, and the report is what says so.
 */
export const FLOORS = {
  /** Smallest cap height a display run may be stepped down to, in sheet pixels. */
  displayCap: TOKENS.step,
  /**
   * Smallest cap height a line of code may be stepped down to, in sheet pixels.
   *
   * `Math.floor(PANEL_FREEDOM.lineSpacing.min * CAP_SHARE)`, with `CAP_SHARE`
   * the 0.62 `compose.mjs` derives a code cap from its spacing with.
   */
  codeCap: 34,
  /** Least of the code panel's height a sheet's example may occupy, 0 to 1. */
  panelFill: 0.85,
};

/**
 * The whole language as one object, so a caller can pass a modified copy rather
 * than reach for module state.
 *
 * **The census is the one recorded table not in here**, and the reason is the
 * modified copy. Every other figure below restates cleanly under a new palette
 * - a band is at the same row whatever color fills it - but the census is an
 * area measurement of the eleven sheets, so a spread copy with `colors` and
 * `syntax` replaced would carry the sheets' hexes through under the theme's
 * name. {@link censusFor} restates it against whatever language is in hand
 * instead, and {@link CENSUS} is what it returns for this one.
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
  brandSlots: BRAND_SLOTS,
  insets: INSETS,
  runs: RUNS,
  panelFreedom: PANEL_FREEDOM,
  floors: FLOORS,
};
