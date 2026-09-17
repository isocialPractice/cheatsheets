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
// ## The document model is provisional
//
// What this reads is the minimum the six regions need. The formal model - a
// title, ordered sections, entries carrying a term, a signature and a
// description, with schemas and validation - is **The Core Model** under
// **Implement Cheatsheet API** in `TODO.md`, and it is deliberately not
// invented here. When it lands, this algorithm is what it composes through.

import { createComposition } from "../graphic-design/compose.mjs";
import { measureText } from "../graphic-design/font.mjs";

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
const CAP_SHARE = 0.62;

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
 * The largest cap height at or below `cap` that sets `text` within `maxWidth`.
 *
 * Steps down by whole pixels rather than solving for the size, because the
 * advance table is integers per em and a solved size lands between two caps
 * that measure the same. A whole pixel of cap height is a sixth of a display
 * pixel at the sheet's own scale, so nothing is lost to the coarseness.
 *
 * @param {string} text
 * @param {number} cap
 * @param {number} maxWidth
 * @param {import('../graphic-design/font.mjs').Face} face
 * @returns {number}
 */
function capThatFits(text, cap, maxWidth, face) {
  if (maxWidth <= 0) return cap;
  let fitted = Math.round(cap);
  while (fitted > 1 && measureText(text, { fontSize: sizeForCap(fitted, face), face }) > maxWidth) {
    fitted -= 1;
  }
  return fitted;
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
 * @property {number} titleCap
 * @property {number} subtitleCap
 * @property {string} face
 * @property {boolean} codeFits Whether every line of the example fits the panel.
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

  const lines = codeLines(doc.code);
  /** @type {string[]} */
  const notes = [];

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
  const mastheadCap = capThatFits(
    wordmark,
    runs.wordmark.cap,
    language.canvas - insets.mastheadPadding * 2,
    face
  );
  composition.text({
    name: "wordmark",
    x: language.canvas / 2,
    y: runs.wordmark.baseline,
    text: wordmark,
    align: "center",
    face,
    fontSize: sizeForCap(mastheadCap, face),
    fontWeight: TYPE_ROLES.masthead.fontWeight,
    fill: colors.white,
  });

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
  const titleCap = capThatFits(doc.title, runs.title.cap, rules.measure, face);
  if (titleCap < runs.title.cap) {
    notes.push(
      `The title was stepped down from a ${runs.title.cap} px cap to ${titleCap} px ` +
        `to fit the ${rules.measure} px between the flanking rules.`
    );
  }
  composition.text({
    name: "title",
    x: language.canvas / 2,
    y: runs.title.baseline,
    text: doc.title,
    align: "center",
    face,
    fontSize: sizeForCap(titleCap, face),
    fontWeight: TYPE_ROLES.title.fontWeight,
    fill: colors.heading,
  });

  // The subtitle and the lead-in are the same size as each other, cap for cap
  // and stem for stem, which is why they share one role.
  let subtitleCap = runs.subtitle.cap;
  if (doc.subtitle) {
    subtitleCap = capThatFits(doc.subtitle, runs.subtitle.cap, rules.measure, face);
    composition.text({
      name: "subtitle",
      x: language.canvas / 2,
      y: runs.subtitle.baseline,
      text: doc.subtitle,
      align: "center",
      face,
      fontSize: sizeForCap(subtitleCap, face),
      fontWeight: TYPE_ROLES.leadIn.fontWeight,
      fill: colors.heading,
    });
  }

  // The lead-in sits a `step-3` in from the spine, which is the tokenised form
  // of the 377 px the artwork measures - the token is what a generated sheet
  // draws to, and the 7 px between them is the residual the design language
  // records for `step-3`.
  const leadIn = doc.leadIn ?? DEFAULT_RUNS.leadIn;
  const leadInX = divisions.spine.x + divisions.spine.width + insets.leadInFromSpine;
  const leadInCap = capThatFits(
    leadIn,
    runs.leadIn.cap,
    language.canvas - leadInX - divisions.rightMargin.width,
    face
  );
  composition.text({
    name: "lead-in",
    x: leadInX,
    y: runs.leadIn.baseline,
    text: leadIn,
    align: "left",
    face,
    fontSize: sizeForCap(leadInCap, face),
    fontWeight: TYPE_ROLES.leadIn.fontWeight,
    fill: colors.heading,
  });

  // --- The code panel, which is where the seed does its work ---------------
  // The panel is a frame around free content, so its three free figures are
  // drawn from the seed. Every draw happens whatever the content is, so a
  // document that leaves no slack does not shift the choices after it.
  const topPadding = variation.betweenOnStep(
    "topPadding",
    panelFreedom.topPadding.min,
    panelFreedom.topPadding.max,
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
  const gaps = Math.max(lines.length - 1, 1);
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
  const spacingThatFits = usableHeight / (gaps + CAP_SHARE * (1 + descenderShare));

  // The spacing the seed may choose from is the measured range narrowed to what
  // this much code leaves room for. `tracking how much code the sheet has to
  // fit` is the design language's own description of that figure, so narrowing
  // by content is the rule rather than a compromise.
  const spacingMax = Math.min(panelFreedom.lineSpacing.max, spacingThatFits);
  const lineSpacing = variation.between(
    "lineSpacing",
    Math.min(panelFreedom.lineSpacing.min, spacingMax),
    spacingMax
  );

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
  let codeCap = capFromSpacing;
  const widest = widestLine(lines, codeCap, codeFace);
  if (widest > usableWidth && usableWidth > 0) {
    codeCap = Math.max(1, Math.floor(codeCap * (usableWidth / widest)));
    // Integer flooring can leave a pixel of slack or take one too many, so the
    // result is confirmed by measuring rather than trusted from the ratio.
    while (codeCap > 1 && widestLine(lines, codeCap, codeFace) > usableWidth) codeCap -= 1;
    notes.push(
      `The example was stepped down from a ${capFromSpacing} px cap to ${codeCap} px to fit the ` +
        `${usableWidth.toFixed(0)} px the panel leaves at this inset.`
    );
  }

  // How much of the panel the example occupies, top padding to last baseline.
  // The eleven all fill it, because every one of them carries enough code to;
  // a short example leaves a void, and the void is reported rather than closed.
  // Closing it means either centring the block or letting the panel shrink, and
  // both are decisions for **Constrain every variation to the extracted
  // margins, spacing and contrast floors**, which is the item that settles what
  // a variation may not do.
  const codeHeight = lineSpacing * Math.max(lines.length - 1, 0) + codeCap;
  const panelFill = codeHeight / bands.code.height;

  const codeSize = sizeForCap(codeCap, codeFace);
  lines.forEach((line, index) => {
    if (line.text.length === 0) return;
    composition.text({
      name: `code-${index}`,
      x: divisions.panel.x + leftInset,
      y: bands.code.y + topPadding + codeCap + lineSpacing * index,
      text: line.text,
      align: "left",
      face: codeFace,
      fontSize: codeSize,
      fill: roleColor(syntax, line.role),
    });
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
  const followCap = capThatFits(
    followLine,
    runs.followLine.cap,
    language.canvas - followX - divisions.rightMargin.width,
    face
  );
  composition.text({
    name: "follow-line",
    x: followX,
    y: runs.followLine.baseline,
    text: followLine,
    align: "left",
    face,
    fontSize: sizeForCap(followCap, face),
    fontWeight: TYPE_ROLES.followLine.fontWeight,
    fill: colors.navy,
  });

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
      titleCap,
      subtitleCap,
      face: face.name,
      codeFits,
      notes,
      choices: variation.choices,
    },
  };
}
