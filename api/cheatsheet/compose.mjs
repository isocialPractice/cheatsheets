// The composition algorithm: a cheatsheet document and the extracted design
// language in, a composition variation out.
//
// This is the first code in the repository that *calls* the drawing surface
// rather than describing it. It builds the six regions **The sheets**
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

import { createComposition, placeBrand } from "../napkin-sketch/graphic-design/index.js";

import { accentRoles } from "./accents.mjs";
import { checkPaints, checkPairings, readableInk } from "./contrast.mjs";
import {
  centredAt,
  drawnWidth,
  measureRun,
  CODE_FACE,
  SHEET_FACE,
  TYPE_ROLES,
  sizeForCap,
} from "./faces.mjs";
import { SHEET_LANGUAGE } from "./language.mjs";
import { Variation } from "./variation.mjs";

/**
 * One line of the example the code panel carries.
 *
 * `role` is the fallback rather than the first choice. A whole line in one
 * colour is wrong wherever the line holds more than one kind of thing, so a
 * document that names its `language` is coloured token by token instead - see
 * `accents.mjs`. The declared role is what draws when no language is named, or
 * when the accent reader was never prepared, which is why all seventeen sheets
 * still carry one.
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
 * `language` is the language the *example* is in - `html`, `css`,
 * `javascript` - and it is what makes the code panel colour token by token. It
 * is not `ComposeOptions.language`, which is the design language the sheet is
 * drawn to; the two are different objects with the same ordinary English name,
 * and this one belongs to the document because only the document knows what
 * its example is written in.
 *
 * @typedef {object} SheetDocument
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [leadIn]
 * @property {string} [wordmark]
 * @property {string} [followLine]
 * @property {string} [language] A highlight.js language id or alias, `auto`, or `none`.
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
 * @param {import('./faces.mjs').Face} face
 * @param {number} floor
 * @returns {{ cap: number, fits: boolean }}
 */
function capThatFits(text, cap, maxWidth, face, floor) {
  if (maxWidth <= 0) return { cap, fits: true };
  const width = (at) => measureRun(text, { fontSize: sizeForCap(at, face), face });
  let fitted = Math.round(cap);
  while (fitted > floor && width(fitted) > maxWidth) fitted -= 1;
  return { cap: fitted, fits: width(fitted) <= maxWidth };
}

/**
 * The widest of a set of lines, measured at a given cap height.
 *
 * @param {CodeLine[]} lines
 * @param {number} cap
 * @param {import('./faces.mjs').Face} face
 * @returns {number}
 */
function widestLine(lines, cap, face) {
  const fontSize = sizeForCap(cap, face);
  let widest = 0;
  for (const line of lines) {
    const width = measureRun(line.text, { fontSize, face });
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
 * @property {Record<string, string>} brand How each brand slot was filled: `vector`, `image` or `drawn`.
 * @property {string} accents How the code panel was coloured: `token`, `line`, or `missing:<language>`.
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
 * @property {import('./faces.mjs').Face} [face]
 * @property {import('./faces.mjs').Face} [codeFace]
 * @property {import('./brand.mjs').SheetBrand} [brand] Assets for the two brand slots. Each is optional.
 */

/**
 * Composes a cheatsheet document into a variation.
 *
 * @param {SheetDocument} doc
 * @param {ComposeOptions} [options]
 * @returns {{ composition: import('../napkin-sketch/graphic-design/index.js').Composition, variation: VariationReport }}
 */
export function composeSheet(doc, options = {}) {
  if (!doc || typeof doc.title !== "string" || doc.title.length === 0) {
    throw new Error("cheatsheet: a sheet document needs a title");
  }
  // The same rule the title follows, for the field that reaches furthest. A
  // `language` is handed to the accent reader, which trims it, so a truthy
  // non-string left the layer as `t.trim is not a function` thrown from inside
  // a minified bundle - an error naming neither the field nor this file. A
  // document this layer cannot read is this layer's error to name.
  if (doc.language !== undefined && doc.language !== null && typeof doc.language !== "string") {
    throw new Error("cheatsheet: a sheet document's language is a language id, an alias, or absent");
  }

  const language = options.language ?? SHEET_LANGUAGE;
  const face = options.face ?? SHEET_FACE;
  const codeFace = options.codeFace ?? CODE_FACE;
  const variation = new Variation(options.seed);
  const {
    bands,
    divisions,
    colors,
    syntax,
    rules,
    runs,
    markSquare,
    insets,
    panelFreedom,
  } = language;
  const slots = language.brandSlots ?? SHEET_LANGUAGE.brandSlots;
  const brand = options.brand ?? {};
  /**
   * What each slot ended up holding, for the report.
   *
   * `drawn` is not a failure and is the state every slot was in before the
   * assets resolved: the masthead sets a lone wordmark and the footer draws a
   * navy square beside a line of type.
   *
   * @type {Record<string, string>}
   */
  const brandModes = { logo: "drawn", footer: "drawn" };
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
   * @param {Omit<import('../napkin-sketch/graphic-design/index.js').TextElement, 'type'> & { name: string, fill: string }} element
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
  // The masthead is a lockup rather than a run: on every one of the eleven the
  // wordmark has the brand's mark beside it, and `RUNS.wordmark` records the
  // pair - `left` 550 and `width` 2084 reach 2634, where the mark's letters
  // end, while the text alone is 1327 px wide. The whole lockup sits 208 px
  // left of the canvas axis, so neither half of it is centred and nor is the
  // pair.
  //
  // What is drawn here is centred anyway, and the reason is the face. The
  // artwork is set in something condensed to 0.684 of the stack a generated
  // sheet can name, so a generated wordmark is half again as wide as the
  // artwork's; holding the lockup's left edge at the measured 550 would push
  // the mark off the right of the canvas. Centring the lockup is the same
  // decision this took when it had no mark to draw and centred the wordmark
  // alone - it is now taken with the measurement that settles it rather than
  // on an assumption that the pair was centred.
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

  // The mark takes its slot and the gap beside it out of the measure the
  // wordmark is fitted to, so a long wordmark steps down rather than running
  // into the mark.
  const markPlaced = Boolean(brand.logo);
  const mastheadRoom =
    language.canvas -
    insets.mastheadPadding * 2 -
    (markPlaced ? slots.logo.width + slots.logo.gap : 0);
  const mastheadCap = displayCap("wordmark", wordmark, runs.wordmark.cap, mastheadRoom);
  const mastheadSize = sizeForCap(mastheadCap, face);

  // The mark is placed before the wordmark is drawn, and that order is the
  // whole of how the fallback stays honest: an asset that holds no drawable
  // shape reports it rather than drawing, and the wordmark then goes back to
  // the middle of the canvas instead of sitting at the left edge of a lockup
  // whose other half is missing.
  //
  // Measured rather than centred by the renderer, because the lockup is two
  // elements and only one of them is text: the wordmark is set left aligned at
  // the lockup's own left edge and the mark takes the far end.
  const wordmarkWidth = measureRun(wordmark, { fontSize: mastheadSize, face });
  const lockupLeft =
    (language.canvas - (wordmarkWidth + slots.logo.gap + slots.logo.width)) / 2;
  if (markPlaced) {
    const placed = placeBrand(
      composition,
      {
        x: lockupLeft + wordmarkWidth + slots.logo.gap,
        y: slots.logo.top,
        width: slots.logo.width,
        height: slots.logo.height,
      },
      brand.logo,
      { name: "masthead-mark", alt: brand.logo.alt ?? wordmark }
    );
    brandModes.logo = placed.placed ? placed.mode : "drawn";
    for (const note of placed.notes) notes.push(`The masthead mark: ${note}`);
    if (!placed.placed) {
      notes.push("The masthead mark held nothing drawable, so the wordmark is set on its own.");
    }
  }
  const lockedUp = brandModes.logo !== "drawn";
  drawText(
    {
      name: "wordmark",
      // Left aligned either way: a lockup starts at its own left edge, and a
      // lone wordmark is centred by the arithmetic here rather than by the
      // renderer, which no longer has a face to centre it with.
      x: lockedUp
        ? lockupLeft
        : centredAt(wordmark, language.canvas / 2, mastheadSize, face),
      y: runs.wordmark.baseline,
      text: wordmark,
      align: "left",
      fontFamily: face.fontFamily,
      fontSize: mastheadSize,
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
  const titleSize = sizeForCap(titleCap, face);
  drawText(
    {
      name: "title",
      x: centredAt(doc.title, language.canvas / 2, titleSize, face),
      y: runs.title.baseline,
      text: doc.title,
      align: "left",
      fontFamily: face.fontFamily,
      fontSize: titleSize,
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
    const subtitleSize = sizeForCap(subtitleCap, face);
    drawText(
      {
        name: "subtitle",
        x: centredAt(doc.subtitle, language.canvas / 2, subtitleSize, face),
        y: runs.subtitle.baseline,
        text: doc.subtitle,
        align: "left",
        fontFamily: face.fontFamily,
        fontSize: subtitleSize,
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
      fontFamily: face.fontFamily,
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

  // How the panel was coloured, for the report.
  //
  // A fallback that says nothing is the fault this field exists to prevent: a
  // caller that never awaited `prepareAccents` draws every line in its declared
  // role, which looks composed and is a worse sheet than the one it meant to
  // draw. `token` is the intended state, `line` says the reader was not there,
  // and `missing:<name>` says it was there and had never heard of the language.
  const accents = accentRoles(
    lines.map((line) => line.text),
    doc.language
  );
  const accentMode = accents === null ? "line" : accents.missing ? `missing:${accents.missing}` : "token";
  if (accents?.missing) {
    notes.push(
      `The example is written in ${accents.missing} and no grammar is installed under that name, ` +
        `so every line is drawn in the role it declares rather than token by token.`
    );
  }

  lines.forEach((line, index) => {
    if (line.text.length === 0) return;
    const y = bands.code.y + topPadding + codeCap + lineSpacing * index;
    const x = divisions.panel.x + leftInset;
    const shared = {
      align: "left",
      fontFamily: codeFace.fontFamily,
      fontSize: codeSize,
    };

    const runs = accents?.lines[index];
    if (!runs || runs.length === 0) {
      drawText(
        { ...shared, name: `code-${index}`, x, y, text: line.text, fill: roleColor(syntax, line.role) },
        colors.navy
      );
      return;
    }

    // One element per run, each starting where the one before it stopped
    // drawing.
    //
    // **Advanced by what a run draws, never by what the prefix measures**, and
    // the difference between those two is a visible gap. A run placed at
    // `x + measureRun(prefix)` puts the table in charge of where the run
    // starts while the engine stays in charge of how wide the run before it
    // draws, so every pair the engine kerns and the table does not opens a
    // seam at that boundary - measured in Chromium on 2026.10.20 across all
    // seventeen sheets at the page's 900px cap, 32 of 1,791 boundaries at or
    // over one page pixel, worst 2.50 px, fifteen of the 32 inside a token
    // rather than widening a space. `drawnWidth` is the ruler that agrees
    // with the engine, and accumulating it agrees on the other half too: the
    // engine kerns within an element and cannot kern across two, which is
    // exactly what a sum of per-run widths leaves out. See **Width of a run as
    // the engine lays it out** in `faces.mjs` for why this is a second ruler
    // rather than a correction to the first.
    //
    // **Accumulating makes the full coverage `accentRoles` promises load
    // bearing.** Measuring each prefix from the line's start tolerated a gap
    // between two runs, because the next run's `x` was worked out from the
    // line and not from its neighbour; a running total does not, so a stretch
    // of the line belonging to no run would shift everything after it left by
    // its own width. That coverage is held by **every line comes back fully
    // covered, with no gap and no overlap** in `tools/test-sheet-accents.mjs`,
    // which is now a precondition of this loop rather than a convenience.
    //
    // **Two cheaper-looking routes are closed by the drawing surface, and will
    // stay closed while it is a pinned package.** Drawing the line as one
    // element with a `tspan` per run would remove the arithmetic entirely and
    // let the engine lay the whole line out as it did before - but
    // `composition.text` takes one string and one `fill`, and the surface's
    // SVG writer emits one `tspan` per *line* of that string, each carrying
    // its own `x` and no paint of its own. There is nowhere to put a per-run
    // colour. Turning kerning off where the sheet is drawn would make the
    // engine agree with the advances, and there is nowhere to put that either:
    // the writer passes through `id`, `data-name`, a transform, a clip, a
    // filter and the blend modes, and composes `style` itself, so neither
    // `font-kerning` nor a `<style>` element can reach the markup. A rule in
    // the page's own stylesheet would reach the inline sheet and miss the
    // standalone SVG the full-size link opens, which is the case that rules it
    // out.
    let runX = x;
    runs.forEach((run, part) => {
      const text = line.text.slice(run.start, run.end);
      const width = drawnWidth(text, { fontSize: codeSize, face: codeFace });
      // A run of nothing but spaces draws no ink, but it still takes its width:
      // the surface scopes the gaps between attributes, so leaving the element
      // in would put one on the sheet for every space in the example and a
      // pairing in the contrast report for each - both measuring a glyph that
      // is not there - while leaving the *advance* out would close the indent
      // up and draw the next token in its place.
      if (text.trim().length > 0) {
        drawText(
          {
            ...shared,
            name: `code-${index}-${part}`,
            x: runX,
            y,
            text,
            fill: roleColor(syntax, run.role),
          },
          colors.navy
        );
      }
      runX += width;
    });
  });

  // --- The footer ----------------------------------------------------------
  // The artwork's footer is one strip: a mark square, "Follow Me", three social
  // icons and a handle, drawn as a single lockup. The asset is that strip, so
  // where it is present it replaces both of the things drawn in its place - the
  // navy square and the line of type - rather than sitting beside them and
  // giving the sheet two marks.
  //
  // **A document that names its own follow line keeps the drawn footer.** The
  // asset carries fixed text, so a sheet asking to say something else cannot be
  // given it, and the text route is the only one that can. The icons are then
  // not drawn at all, which is the trade and is why the default is the asset.
  //
  // One consequence worth naming: a placed strip carries no pairing into
  // `checkPairings` below, because contrast is measured over runs of text and
  // the strip is pixels. The artwork's own footer is the one place the eleven
  // break the site's contrast rule - the handle sigil is green on white at
  // 2.80:1, recorded under **The one place the sheets break the site's own
  // rule** - so the strip carries that break in with it, unmeasured and
  // unrepainted. It is the artwork, exactly as drawn.
  const footerAsset = doc.followLine === undefined ? brand.footer : null;
  if (footerAsset) {
    const placed = placeBrand(composition, slots.footer, footerAsset, {
      name: "footer-lockup",
      alt: footerAsset.alt ?? DEFAULT_RUNS.followLine,
    });
    brandModes.footer = placed.placed ? placed.mode : "drawn";
    for (const note of placed.notes) notes.push(`The footer lockup: ${note}`);
    if (!placed.placed) {
      notes.push("The footer lockup held nothing drawable, so the mark square and follow line are drawn.");
    }
  }

  if (brandModes.footer === "drawn") {
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
        fontFamily: face.fontFamily,
        fontSize: sizeForCap(followCap, face),
        fontWeight: TYPE_ROLES.followLine.fontWeight,
        fill: colors.navy,
      },
      colors.white
    );
  }

  // --- The paints the sheet was actually drawn in --------------------------
  // Read off the finished document rather than checked as each element is
  // added, for the same reason the contrast below is: what a run was asked for
  // is not always what it was drawn in, and a check of the request would pass a
  // sheet on the strength of a colour that is not in it.
  //
  // This is the refusal the drawing surface does not reliably make. Its SVG
  // writer passes a colour it cannot read straight through to the markup, where
  // the page draws it as a black region with no error anywhere, and only its
  // rasterizer objects - and the page never rasterizes.
  checkPaints(composition.toDocument());

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
      brand: brandModes,
      accents: accentMode,
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
