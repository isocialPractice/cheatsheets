// The composition algorithm: a cheatsheet document and the extracted design
// language in, a composition variation out.
//
// This is the first code in the repository that *calls* the ported drawing
// surface rather than describing it. It builds the six regions **The sheets**
// in `DESIGN_LANGUAGE.md` measured - a masthead, a heading band, a code panel,
// a green divider and a footer down the canvas, with a green spine, the panel
// and a right margin across it - and fills them from a document.
//
// ## What a seed may move, and what it may not
//
// A "variation" here is not a free hand. Of everything the eleven sheets were
// measured for, all but three figures hold to within one pixel across every one
// of them, and one pixel is the floor: JPEG at quality 99 moves a flat edge by
// that much on its own. So the geometry is not a style this algorithm chooses,
// it is a record it reproduces.
//
// Three figures genuinely vary, and the design language says why in one line -
// the code panel is a fixed frame around free content, and it is the only
// region of which that is true:
//
// | What varies | Measured across the eleven |
// | --- | --- |
// | The panel's top padding | 37 to 152 px |
// | The leftmost code line's inset | 85 to 414 px |
// | The code line spacing | 56 to 116 px |
//
// Those three are the whole of what a seed moves. Everything else is fixed for
// every seed, which is what makes two sheets from two seeds recognisably the
// same design rather than two designs.
//
// Two of the eleven deviations are deliberately **not** offered as variations.
// `shiftAndUnshift.jpg` pushes everything below the subtitle down 84 px, and
// two sheets end the panel seven rows low. The design language calls those
// deviations rather than freedoms, and reproducing them would be generating
// the artwork's mistakes.
//
// ## Fitting, and why a run is never squeezed
//
// The artwork's display face is condensed to 0.684 of the stack a generated
// sheet can actually name, per `faces.mjs`. So a title set at the artwork's
// measured 141 px cap is about half again as wide as the artwork's title, and
// something has to give.
//
// What gives is the size, never the letterform. A run that overflows its region
// is stepped down until it fits, and the fitted cap is reported beside the
// composition. Squeezing the glyphs horizontally to reach the artwork's exact
// widths would forge a condensed face out of one that is not, and a reader sees
// that immediately.
//
// ## The floors, and what they are floors on
//
// Stepping a run down has to stop somewhere, and until the floors landed it
// stopped at a one pixel cap - a sixth of a display pixel, which is not text.
// `FLOORS` in `language.mjs` says where it stops instead, and the three figures
// there bound three different things:
//
// | Floor | Bounds |
// | --- | --- |
// | `displayCap` | How small a heading, subtitle, lead-in or follow line may be stepped to |
// | `codeCap` | How small a line of the example may be stepped to |
// | `panelFill` | How little of the code panel a seed may leave the example occupying |
//
// **A floor is not a clamp.** A run that still does not fit at the floor is
// left at the floor and reported, never pushed back up to it - pushing it up
// would put ink outside the region it was fitted to, which is the failure the
// fitting exists to prevent. What the floors guarantee is that **no seed** can
// produce an unreadable sheet: the two cap floors are unreachable by any seed,
// because the seed only moves figures the third floor has already narrowed, and
// crossing one therefore means the document asked for something the sheet
// cannot carry. `codeFits`, `fillsPanel` and `notes` on the report are what say
// which.
//
// ## Contrast is checked, not assumed
//
// `language.mjs` has carried the site's two floors and the darker green that
// may carry text on a white ground since it was written, and nothing read
// either. Every run this composes is now measured against the ground it was
// placed on, through `contrast.mjs`, and the measurements are reported beside
// the variation. The one substitution the design language nominated - the
// sheets' green becoming `#2E7534` where it has to be read on white - is
// applied rather than merely recorded.
//
// ## The document model is provisional
//
// What this reads is the minimum the six regions need. The formal model - a
// title, ordered sections, entries carrying a term, a signature and a
// description, with schemas and validation - is **The Core Model** under
// **Implement Cheatsheet API** in `TODO.md`, and it is deliberately not
// invented here. When it lands, this algorithm is what it composes through.

import { createComposition } from "../graphic-design/compose.mjs";
import { measureText } from "../graphic-design/font.mjs";

import { checkPairings, readableInk } from "./contrast.mjs";
import { CODE_FACE, SHEET_FACE, TYPE_ROLES, sizeForCap } from "./faces.mjs";
import { SHEET_LANGUAGE } from "./language.mjs";
import { Variation } from "./variation.mjs";

/**
 * One line of the example the code panel carries.
 *
 * @typedef {object} CodeLine
 * @property {string} text
 * @property {'plain' | 'comment' | 'identifier' | 'keyword' | 'string' | 'number'} [role]
 */

/**
 * The content a sheet is composed from.
 *
 * Only `title` and `code` are required. The three fixed runs default to the
 * brand's own, because they are the same text on all eleven sheets.
 *
 * @typedef {object} SheetDocument
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [leadIn]
 * @property {string} [wordmark]
 * @property {string} [followLine]
 * @property {string | CodeLine[]} code
 */

/** The wordmark, lead-in and follow line are fixed text on every sheet. */
const DEFAULT_RUNS = {
  wordmark: "practicing.xyz",
  leadIn: "Starting Point for Practical Use:",
  followLine: "Follow along at practicing.xyz",
};

/**
 * How much of the line spacing the code's cap height takes.
 *
 * The one type size the design language does not record, so it is derived from
 * the spacing rather than measured. Named because two figures depend on it: the
 * cap itself, and how much room the spacing may take before the block outgrows
 * the panel. Written twice, they drift, and the drift is a line of code drawn
 * past the foot of the panel.
 */
export const CAP_SHARE = 0.62;

/**
 * The color a code line's role is set in.
 *
 * Read as an own property, because `syntax` is an object literal: a role named
 * `constructor` or `toString` otherwise finds a function on `Object.prototype`,
 * the fallback to plain never fires, and the paint reaches the renderer as a
 * function. The same guard `glyph` and `roleStyle` carry, for the same reason.
 *
 * @param {Record<string, string>} syntax
 * @param {string} [role]
 * @returns {string}
 */
function roleColor(syntax, role) {
  const name = role ?? "plain";
  return Object.prototype.hasOwnProperty.call(syntax, name) ? syntax[name] : syntax.plain;
}

/**
 * Splits a raw code string into lines, or passes structured lines through.
 *
 * @param {string | CodeLine[]} code
 * @returns {CodeLine[]}
 */
function codeLines(code) {
  if (Array.isArray(code)) return code;
  if (typeof code !== "string") return [];
  return code.replace(/\r\n?/g, "\n").split("\n").map((text) => ({ text }));
}

/**
 * The largest cap height at or below `cap` that sets `text` within `maxWidth`,
 * and whether it got there.
 *
 * Steps down by whole pixels rather than solving for the size, because the
 * advance table is integers per em and a solved size lands between two caps
 * that measure the same. A whole pixel of cap height is a sixth of a display
 * pixel at the sheet's own scale, so nothing is lost to the coarseness.
 *
 * The descent stops at `floor`, and `fits` says whether it stopped because the
 * text fitted or because it ran out of room to shrink into. Those are different
 * outcomes and the caller has to be able to tell them apart: the first is the
 * fitting working, and the second is a document asking for a run the region
 * cannot carry. Before the floor existed there was no difference to report,
 * because a run stepped down until it fitted however small that made it.
 *
 * @param {string} text
 * @param {number} cap
 * @param {number} maxWidth
 * @param {import('../graphic-design/font.mjs').Face} face
 * @param {number} floor
 * @returns {{ cap: number, fits: boolean }}
 */
function capThatFits(text, cap, maxWidth, face, floor) {
  if (maxWidth <= 0) return { cap, fits: true };
  const width = (at) => measureText(text, { fontSize: sizeForCap(at, face), face });
  let fitted = Math.round(cap);
  while (fitted > floor && width(fitted) > maxWidth) fitted -= 1;
  return { cap: fitted, fits: width(fitted) <= maxWidth };
}

/**
 * The widest of a set of lines, measured at a given cap height.
 *
 * @param {CodeLine[]} lines
 * @param {number} cap
 * @param {import('../graphic-design/font.mjs').Face} face
 * @returns {number}
 */
function widestLine(lines, cap, face) {
  const fontSize = sizeForCap(cap, face);
  let widest = 0;
  for (const line of lines) {
    const width = measureText(line.text, { fontSize, face });
    if (width > widest) widest = width;
  }
  return widest;
}

/**
 * What a composition chose, so the result can be reviewed without re-deriving
 * it from the SVG.
 *
 * @typedef {object} VariationReport
 * @property {number} seed
 * @property {number | string} givenSeed
 * @property {number} topPadding
 * @property {number} leftInset
 * @property {number} lineSpacing
 * @property {number} codeCap
 * @property {number} panelFill How much of the panel's height the example occupies, 0 to 1.
 * @property {boolean} fillsPanel Whether that reaches the `panelFill` floor.
 * @property {number} titleCap
 * @property {number} subtitleCap
 * @property {string} face
 * @property {boolean} codeFits Whether every line of the example fits the panel.
 * @property {boolean} runsFit Whether every display run fits its region above its floor.
 * @property {typeof SHEET_LANGUAGE['floors']} floors The floors this variation was held to.
 * @property {boolean} contrastHolds Whether every run clears the text contrast floor.
 * @property {import('./contrast.mjs').MeasuredPairing[]} contrast Every ink and ground pairing, measured.
 * @property {string[]} notes Anything the composition had to give way on.
 * @property {import('./variation.mjs').Choice[]} choices
 */

/**
 * Options a composition is varied and themed through.
 *
 * @typedef {object} ComposeOptions
 * @property {number | string} [seed] Selects the variation. Identical seeds compose identically.
 * @property {typeof SHEET_LANGUAGE} [language]
 * @property {import('../graphic-design/font.mjs').Face} [face]
 * @property {import('../graphic-design/font.mjs').Face} [codeFace]
 */

/**
 * Composes a cheatsheet document into a variation.
 *
 * @param {SheetDocument} doc
 * @param {ComposeOptions} [options]
 * @returns {{ composition: import('../graphic-design/compose.mjs').Composition, variation: VariationReport }}
 */
export function composeSheet(doc, options = {}) {
  if (!doc || typeof doc.title !== "string" || doc.title.length === 0) {
    throw new Error("cheatsheet: a sheet document needs a title");
  }

  const language = options.language ?? SHEET_LANGUAGE;
  const face = options.face ?? SHEET_FACE;
  const codeFace = options.codeFace ?? CODE_FACE;
  const variation = new Variation(options.seed);
  const { bands, divisions, colors, syntax, rules, runs, markSquare, insets, panelFreedom } =
    language;
  // A caller may pass a replacement language, and one written before the floors
  // existed carries none. Falling back to the recorded floors rather than to no
  // floors at all keeps the guarantee: a language can move a floor, but it
  // cannot remove one by omission.
  const floors = language.floors ?? SHEET_LANGUAGE.floors;
  const contrastFloor = (language.contrast ?? SHEET_LANGUAGE.contrast).text;

  const lines = codeLines(doc.code);
  /** @type {string[]} */
  const notes = [];
  /**
   * Every run of ink and the ground it was set on, collected as it is drawn.
   *
   * Collected here rather than read back off the composition afterwards,
   * because the composition records an element's fill and not what is behind
   * it. Which band a run sits in is knowledge this function has and the
   * document does not.
   *
   * @type {import('./contrast.mjs').Pairing[]}
   */
  const pairings = [];

  /**
   * Draws a run of text, substituting the ink where the ground demands it and
   * recording the pairing that was actually drawn.
   *
   * @param {Omit<import('../graphic-design/types.mjs').TextElement, 'type'> & { name: string, fill: string }} element
   * @param {string} ground
   */
  const drawText = (element, ground) => {
    const ink = readableInk(element.fill, ground, language);
    if (ink !== element.fill) {
      notes.push(
        `The ${element.name} was repainted from ${element.fill} to ${ink}, which is the ` +
          `green the design language nominates for text on a light ground.`
      );
    }
    pairings.push({ name: element.name, ink, ground });
    composition.text({ ...element, fill: ink });
  };

  const composition = createComposition({
    width: language.canvas,
    height: language.canvas,
    background: colors.white,
    title: doc.title,
    id: "cheatsheet",
  });

  // --- The bands, back to front -------------------------------------------
  // The heading band and the footer are the page white the composition is
  // already on, so only the inked bands are drawn.
  composition.rect({
    name: "masthead",
    x: 0,
    y: bands.masthead.y,
    width: language.canvas,
    height: bands.masthead.height,
    fill: colors.navy,
  });
  composition.rect({
    name: "code-panel",
    x: divisions.panel.x,
    y: bands.code.y,
    width: divisions.panel.width,
    height: bands.code.height,
    fill: colors.navy,
  });
  // The spine starts a `step-4` above the panel it runs beside and ends with
  // it, so it is taller than the band the panel sits in.
  composition.rect({
    name: "spine",
    x: divisions.spine.x,
    y: bands.code.y - insets.spineTop,
    width: divisions.spine.width,
    height: bands.code.height + insets.spineTop,
    fill: colors.green,
  });
  composition.rect({
    name: "divider",
    x: 0,
    y: bands.divider.y,
    width: language.canvas,
    height: bands.divider.height,
    fill: colors.green,
  });

  // --- The masthead --------------------------------------------------------
  // The artwork's wordmark sits 208.5 px left of the canvas axis, and that is
  // not an offset to reproduce: a second masthead element sits to its right on
  // every one of the eleven, and the pair is what is centred. A document has no
  // way to declare that element yet, so a wordmark alone is centred on its own.
  // Reproducing the measured offset without the thing that balances it would
  // put a lone run visibly off centre and call it fidelity.
  const wordmark = doc.wordmark ?? DEFAULT_RUNS.wordmark;
  // Every display run is fitted the same way and every one of them can fail the
  // same way, so the note is written once here rather than five times below.
  let runsFit = true;
  /**
   * @param {string} name
   * @param {string} text
   * @param {number} cap
   * @param {number} measure
   * @returns {number}
   */
  const displayCap = (name, text, cap, measure) => {
    const fitted = capThatFits(text, cap, measure, face, floors.displayCap);
    if (fitted.cap < cap) {
      notes.push(
        `The ${name} was stepped down from a ${cap} px cap to ${fitted.cap} px ` +
          `to fit the ${Math.round(measure)} px its region leaves.`
      );
    }
    if (!fitted.fits) {
      runsFit = false;
      notes.push(
        `The ${name} still overflows its ${Math.round(measure)} px region at the ` +
          `${floors.displayCap} px cap floor, and is not stepped below it.`
      );
    }
    return fitted.cap;
  };

  const mastheadCap = displayCap(
    "wordmark",
    wordmark,
    runs.wordmark.cap,
    language.canvas - insets.mastheadPadding * 2
  );
  drawText(
    {
      name: "wordmark",
      x: language.canvas / 2,
      y: runs.wordmark.baseline,
      text: wordmark,
      align: "center",
      face,
      fontSize: sizeForCap(mastheadCap, face),
      fontWeight: TYPE_ROLES.masthead.fontWeight,
      fill: colors.white,
    },
    colors.navy
  );

  // --- The heading band ----------------------------------------------------
  // Both rules are drawn as a pair flush to each edge with the title between
  // them, which is how the artwork places them.
  for (const [key, rule] of [
    ["upper", rules.upper],
    ["lower", rules.lower],
  ]) {
    for (const [side, x] of [
      ["left", 0],
      ["right", language.canvas - rules.width],
    ]) {
      composition.rect({
        name: `rule-${key}-${side}`,
        x,
        y: rule.y,
        width: rules.width,
        height: rule.height,
        fill: colors.green,
      });
    }
  }

  // The title is set across the canvas less both flanking rules, which is the
  // measure the artwork placed the rules against.
  const titleCap = displayCap("title", doc.title, runs.title.cap, rules.measure);
  drawText(
    {
      name: "title",
      x: language.canvas / 2,
      y: runs.title.baseline,
      text: doc.title,
      align: "center",
      face,
      fontSize: sizeForCap(titleCap, face),
      fontWeight: TYPE_ROLES.title.fontWeight,
      fill: colors.heading,
    },
    colors.white
  );

  // The subtitle and the lead-in are the same size as each other, cap for cap
  // and stem for stem, which is why they share one role.
  let subtitleCap = runs.subtitle.cap;
  if (doc.subtitle) {
    subtitleCap = displayCap("subtitle", doc.subtitle, runs.subtitle.cap, rules.measure);
    drawText(
      {
        name: "subtitle",
        x: language.canvas / 2,
        y: runs.subtitle.baseline,
        text: doc.subtitle,
        align: "center",
        face,
        fontSize: sizeForCap(subtitleCap, face),
        fontWeight: TYPE_ROLES.leadIn.fontWeight,
        fill: colors.heading,
      },
      colors.white
    );
  }

  // The lead-in sits a `step-3` in from the spine, which is the tokenised form
  // of the 377 px the artwork measures - the token is what a generated sheet
  // draws to, and the 7 px between them is the residual the design language
  // records for `step-3`.
  const leadIn = doc.leadIn ?? DEFAULT_RUNS.leadIn;
  const leadInX = divisions.spine.x + divisions.spine.width + insets.leadInFromSpine;
  const leadInCap = displayCap(
    "lead-in",
    leadIn,
    runs.leadIn.cap,
    language.canvas - leadInX - divisions.rightMargin.width
  );
  drawText(
    {
      name: "lead-in",
      x: leadInX,
      y: runs.leadIn.baseline,
      text: leadIn,
      align: "left",
      face,
      fontSize: sizeForCap(leadInCap, face),
      fontWeight: TYPE_ROLES.leadIn.fontWeight,
      fill: colors.heading,
    },
    colors.white
  );

  // --- The code panel, which is where the seed does its work ---------------
  // The panel is a frame around free content, so its three free figures are
  // drawn from the seed. Every draw happens whatever the content is, so a
  // document that leaves no slack does not shift the choices after it.

  // Two counts of the same thing, and they differ for a one line example. The
  // divisors below must never be zero, so `gaps` floors at one; the block's own
  // height genuinely has no gap in it, so `gapsDrawn` does not.
  const gapsDrawn = Math.max(lines.length - 1, 0);
  const gaps = Math.max(gapsDrawn, 1);
  // The block is not `lineSpacing * gaps` tall. A line is placed by its
  // baseline, so the block starts one cap height below the padding and ends a
  // descender below the last baseline, and neither of those is a gap. Both are
  // proportions of the spacing - the cap through {@link CAP_SHARE}, the
  // descender through the face's own ratio - so the room the gaps may take is
  // the padded height over the gaps *plus those two fractions*. Dividing by the
  // gaps alone is how an example long enough to want the measured maximum
  // spacing lands its last line past the foot of the panel, on the divider
  // below it, with nothing reporting that it did.
  const descenderShare = codeFace.descender / codeFace.capHeight;

  // **The margin is the first thing the fill floor constrains**, because the
  // padding is drawn before the spacing and the two can be chosen into a corner.
  // The block has to *fit* inside the panel less twice the padding, and it has
  // to *fill* the panel to the floor, and those are measured against different
  // heights: what it fits in shrinks with the padding, what it fills does not.
  // At the measured maximum padding of 152 px the block can occupy at most
  // `(2016 - 304) / 2016`, which is 0.849 and below the 0.85 floor before a
  // single line is placed. So a seed drawing that padding would be one no
  // spacing could rescue, and it is not offered: the padding's own ceiling is
  // whatever leaves the floor still reachable.
  //
  // `blockOverFill` is the ratio between those two heights - the fitted block
  // carries a descender the filled block does not - and it is barely above 1
  // for a long example and large for a short one, which is what makes the
  // ceiling fall away to nothing exactly when the document is too short for the
  // floor to mean anything. Below the measured minimum padding it is dropped
  // entirely rather than inverted into an empty range.
  const blockOverFill = (gaps + CAP_SHARE * (1 + descenderShare)) / (gapsDrawn + CAP_SHARE);
  const paddingCeiling = (bands.code.height * (1 - floors.panelFill * blockOverFill)) / 2;
  const paddingMax =
    paddingCeiling >= panelFreedom.topPadding.min
      ? Math.min(panelFreedom.topPadding.max, paddingCeiling)
      : panelFreedom.topPadding.max;

  const topPadding = variation.betweenOnStep(
    "topPadding",
    panelFreedom.topPadding.min,
    paddingMax,
    language.step / 2
  );
  const leftInset = variation.betweenOnStep(
    "leftInset",
    panelFreedom.leftInset.min,
    panelFreedom.leftInset.max,
    language.step
  );

  // How much room the lines have, once the padding above them and a matching
  // clearance below are taken out.
  const usableHeight = bands.code.height - topPadding * 2;
  const usableWidth = divisions.panel.width - leftInset * 2;
  const spacingThatFits = usableHeight / (gaps + CAP_SHARE * (1 + descenderShare));

  // The spacing the seed may choose from is the measured range narrowed from
  // both ends.
  //
  // **From above** by what this much code leaves room for. `tracking how much
  // code the sheet has to fit` is the design language's own description of that
  // figure, so narrowing by content is the rule rather than a compromise.
  //
  // **From below** by the fill floor, where the floor is reachable at all. The
  // block's height is very nearly proportional to the spacing - `gaps *
  // spacing` plus a cap that is itself a share of the spacing - so the spacing
  // that reaches a given fill inverts directly, and a seed is not offered
  // anything under it. The `+ 1` covers the whole pixel the cap loses to
  // `Math.floor` below, so a spacing chosen at the bottom of the narrowed range
  // lands on the floor rather than a thousandth under it.
  //
  // **Narrowing stops where the floor stops being reachable**, which is the
  // part that matters. An example too short to fill the panel at even the
  // widest spacing the eleven were measured at cannot be made to fill it, and
  // clamping the range to its own top in pursuit of that would collapse the
  // variation to a single value: every seed composing the same sheet, and the
  // panel still unfilled. So a floor that cannot be met leaves the measured
  // range intact and is reported instead. The floor bounds what a seed may do,
  // and there is nothing a seed can do about a document with too little in it.
  const spacingMax = Math.min(panelFreedom.lineSpacing.max, spacingThatFits);
  const spacingForFloor = (floors.panelFill * bands.code.height + 1) / (gapsDrawn + CAP_SHARE);
  // **Whatever the floor asks for, the bottom of the range is never above its
  // top.** `spacingMax` is what the panel physically has room for, so a minimum
  // above it does not narrow the range, it inverts it - and `Variation.between`
  // answers an inverted range with its `min`, which is the one value in play
  // that certainly does not fit. An example of 32 rows or more is already below
  // the measured minimum spacing, so raising the bottom of its range to that
  // minimum sets the block at a spacing the panel cannot hold and drops the
  // last lines past the foot of the panel onto the divider. The eleven run 18
  // to 36 rows, so that is inside the record rather than beyond it.
  const spacingFloor =
    spacingForFloor <= spacingMax
      ? Math.max(panelFreedom.lineSpacing.min, spacingForFloor)
      : panelFreedom.lineSpacing.min;
  const spacingMin = Math.min(spacingFloor, spacingMax);
  const lineSpacing = variation.between("lineSpacing", spacingMin, spacingMax);

  let codeFits = true;
  if (spacingThatFits < panelFreedom.lineSpacing.min) {
    codeFits = false;
    notes.push(
      `${lines.length} lines of example do not fit the panel at the ${panelFreedom.lineSpacing.min} px ` +
        `minimum spacing the eleven were measured at; they are set at ${spacingThatFits.toFixed(1)} px.`
    );
  }

  // The code cap is the one type size the design language does not record, so
  // it is derived rather than measured: the largest that keeps the widest line
  // inside the panel and the line's own height inside its spacing.
  const capFromSpacing = Math.floor(lineSpacing * CAP_SHARE);
  // **A floor stops a descent; it never starts an ascent.** The width fitting
  // below steps the cap *down* from the one the spacing settled, so the floor
  // it stops at can never be above where it started. An example of 40 rows or
  // more is already spaced under the measured minimum, so the cap its spacing
  // yields is already under `floors.codeCap`, and holding the width fitting to
  // that floor would step the cap *up* - drawing lines whose cap height exceeds
  // their own spacing, so every line overlaps the one above it and the block
  // runs past the foot of the panel. Which is the opposite of what a floor
  // guarding readability is for.
  const codeFloor = Math.min(floors.codeCap, capFromSpacing);
  let codeCap = capFromSpacing;
  const widest = widestLine(lines, codeCap, codeFace);
  if (widest > usableWidth && usableWidth > 0) {
    codeCap = Math.max(codeFloor, Math.floor(codeCap * (usableWidth / widest)));
    // Integer flooring can leave a pixel of slack or take one too many, so the
    // result is confirmed by measuring rather than trusted from the ratio.
    while (codeCap > codeFloor && widestLine(lines, codeCap, codeFace) > usableWidth) {
      codeCap -= 1;
    }
    notes.push(
      `The example was stepped down from a ${capFromSpacing} px cap to ${codeCap} px to fit the ` +
        `${usableWidth.toFixed(0)} px the panel leaves at this inset.`
    );
    if (widestLine(lines, codeCap, codeFace) > usableWidth) {
      codeFits = false;
      notes.push(
        `Its longest line still overruns that width at the ${codeFloor} px cap floor, ` +
          `and is not stepped below it.`
      );
    }
  }

  // How much of the panel the example occupies, top padding to last baseline.
  //
  // **The void a short example leaves is not closed, and this is the item that
  // settles that it is not.** The two ways to close it were centring the block
  // in the panel and shrinking the panel to the block, and both are outside
  // what a variation may do. The panel's own geometry is fixed for every seed,
  // so it cannot shrink; and the block's distance from the top of the panel is
  // `topPadding`, which the eleven measured at 37 to 152 px, so centring a
  // short block would set an effective padding of several hundred and put the
  // sheet outside the record it is generated from. What the fill floor does
  // instead is stop a seed *causing* the void, by refusing the spacings that
  // would leave one. A void that survives that is one the document caused by
  // carrying too little code, and `fillsPanel` is what says so.
  const codeHeight = lineSpacing * gapsDrawn + codeCap;
  const panelFill = codeHeight / bands.code.height;
  const fillsPanel = panelFill >= floors.panelFill;
  if (!fillsPanel) {
    notes.push(
      `${lines.length} lines of example fill ${(panelFill * 100).toFixed(0)}% of the code panel, ` +
        `under the ${(floors.panelFill * 100).toFixed(0)}% floor the eleven were measured at. ` +
        `The eleven run 18 to 36 rows, counting the blank ones between them.`
    );
  }

  const codeSize = sizeForCap(codeCap, codeFace);
  lines.forEach((line, index) => {
    if (line.text.length === 0) return;
    drawText(
      {
        name: `code-${index}`,
        x: divisions.panel.x + leftInset,
        y: bands.code.y + topPadding + codeCap + lineSpacing * index,
        text: line.text,
        align: "left",
        face: codeFace,
        fontSize: codeSize,
        fill: roleColor(syntax, line.role),
      },
      colors.navy
    );
  });

  // --- The footer ----------------------------------------------------------
  composition.rect({
    name: "mark-square",
    x: markSquare.x,
    y: markSquare.y,
    width: markSquare.width,
    height: markSquare.height,
    fill: colors.navy,
  });

  const followLine = doc.followLine ?? DEFAULT_RUNS.followLine;
  const followX = markSquare.x + markSquare.width + insets.followLineFromMark;
  const followCap = displayCap(
    "follow line",
    followLine,
    runs.followLine.cap,
    language.canvas - followX - divisions.rightMargin.width
  );
  drawText(
    {
      name: "follow-line",
      x: followX,
      y: runs.followLine.baseline,
      text: followLine,
      align: "left",
      face,
      fontSize: sizeForCap(followCap, face),
      fontWeight: TYPE_ROLES.followLine.fontWeight,
      fill: colors.navy,
    },
    colors.white
  );

  // --- The contrast the sheet was actually drawn at ------------------------
  // Measured after the fact rather than before, because the ink a run ends up
  // in is not always the ink it was asked for: `drawText` may have substituted
  // the green. Checking what was requested would pass a sheet on the strength
  // of a colour that is not in it.
  const contrast = checkPairings(pairings, contrastFloor);
  const contrastHolds = contrast.every((pairing) => pairing.holds);
  for (const pairing of contrast) {
    if (pairing.holds) continue;
    notes.push(
      `The ${pairing.name} is set in ${pairing.ink} on ${pairing.ground}, which reaches ` +
        `${pairing.ratio.toFixed(2)}:1 against the ${pairing.floor}:1 text floor.`
    );
  }

  return {
    composition,
    variation: {
      seed: variation.seed,
      givenSeed: variation.givenSeed,
      topPadding,
      leftInset,
      lineSpacing,
      codeCap,
      panelFill,
      fillsPanel,
      titleCap,
      subtitleCap,
      face: face.name,
      codeFits,
      runsFit,
      floors,
      contrastHolds,
      contrast,
      notes,
      choices: variation.choices,
    },
  };
}
