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
// **Fitting and placement are measured with different rulers, deliberately.**
// A width asked *whether a run fits* is `measureRun`, the per-character sum;
// a width asked *where its ink goes* is `drawnWidth`, which carries the 96
// pairs the engine kerns. So `capThatFits` and `widestLine` below are on the
// advances and over-measure, which is the safe direction because every one of
// those pairs is negative; `centredAt`, the masthead lockup and a split code
// line's runs are on the kerned width, because the engine is what draws them.
// The reasoning, the measurements and what each ruler costs are in
// **What a generated sheet is measured in** in `DESIGN_LANGUAGE.md`.
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
import { isFormalDocument, readDocument } from "./document.mjs";
import {
  boxOf,
  layoutFor,
  paintOf,
  placeSlots,
  readLayout,
  rowsFor,
  slotNamed,
  SHEET_LAYOUT,
} from "./layout.mjs";
import { assertReadable, familyCss, languageFor, themeOver, SHEET_THEME } from "./theme.mjs";
import {
  centredAt,
  drawnWidth,
  measureRun,
  CODE_FACE,
  SHEET_FACE,
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
 * when the accent reader was never prepared, which is why every committed sheet
 * still carries one.
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
 * Measured with `measureRun` and not `drawnWidth`: this asks whether a run
 * fits, which is the half of the question the advances answer safely, per
 * **Fitting and placement** above.
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
 * @property {StackReport} stack What face the sheet asked for, and what it got.
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
 * What face a composed sheet asked for, and what it actually drew in.
 *
 * The two are not the same question and only one of them has an answer here.
 * **Asked for** is the theme's stack, which this layer owns: a list of
 * families, most preferred first, and the CSS string the markup carries. **Got**
 * is the renderer's, and the renderer is not this module - an SVG is resolved
 * by whatever opens it, and the two raster routes answer differently, one
 * drawing a built-in alphabet and the other resolving the stack against the
 * machine it is on. So `resolved` is `null` here and filled in by
 * `rasterizeSheet`, which is the one place in this folder that has a renderer
 * to ask.
 *
 * Why record it at all: the SVG names a family it cannot guarantee, so a sheet
 * reviewed against the design language and a sheet rasterized on another
 * machine may be set in two different faces with nothing saying so. A render
 * that does not say which face drew it cannot be compared with one that does.
 *
 * @typedef {object} StackReport
 * @property {string[]} family The families asked for, most preferred first.
 * @property {string} css The stack as the markup carries it.
 * @property {string | null} resolved The family a renderer actually used, where one was asked.
 */

/**
 * Options a composition is varied and themed through.
 *
 * **These are the whole public input surface, with the document.** A theme and
 * a layout are models of this layer's own, defined in `theme.mjs` and
 * `layout.mjs` with a schema each; a seed and a set of brand assets are neither
 * models nor renderer internals. What is deliberately **not** here is anything
 * the renderer reads for itself:
 *
 * | Gone | Say it with |
 * | --- | --- |
 * | `language`, the whole design language record | `theme`, which is its themeable half |
 * | `face` and `codeFace`, the width tables | `theme.stack`, which is the metrics a theme owns |
 *
 * Each is refused by name rather than ignored, because a caller re-tinting a
 * sheet through `language` and silently getting the recorded palette back is
 * the one failure worse than an error.
 *
 * @typedef {object} ComposeOptions
 * @property {number | string} [seed] Selects the variation. Identical seeds compose identically.
 * @property {Partial<import('./theme.mjs').SheetTheme>} [theme] Whole or partial; a partial is laid over the recorded theme.
 * @property {import('./layout.mjs').SheetLayout} [layout]
 * @property {import('./brand.mjs').SheetBrand} [brand] Assets for the two brand slots. Each is optional.
 */

/**
 * The options this used to take and no longer does, and what replaced each.
 *
 * Read by {@link composeSheet} before anything else, so a call written against
 * the additive surface fails with a sentence rather than drawing the recorded
 * sheet and reporting success.
 */
const RETIRED_OPTIONS = {
  language:
    "hands over the whole design language record, which carries every coordinate on the " +
    "sheet as well as its paints. Pass `theme` instead - it is the themeable half on its " +
    "own, and `themeFrom(language)` derives one from a record you already have.",
  face:
    "hands over a width table, which is the renderer's own measurement. A theme carries the " +
    "metrics that are a theme's in `theme.stack`.",
  codeFace: "is the same, for the code panel. `theme.stack` is the one stack a sheet is set in.",
};

/**
 * Composes a cheatsheet document into a variation.
 *
 * @param {SheetDocument} doc
 * @param {ComposeOptions} [options]
 * @returns {{ composition: import('../napkin-sketch/graphic-design/index.js').Composition, variation: VariationReport }}
 */
export function composeSheet(doc, options = {}) {
  // An option this call no longer takes, named back with what replaced it. It
  // comes first because every other refusal below is about what was passed,
  // and this one is about what the caller believes they are passing: a
  // `language` quietly dropped would compose the recorded palette and report a
  // success, which is the one outcome a caller cannot see is wrong.
  for (const [name, why] of Object.entries(RETIRED_OPTIONS)) {
    if (options[name] === undefined) continue;
    throw new Error(`cheatsheet: \`options.${name}\` ${why}`);
  }

  // Both refusals this used to carry by hand - a document with no title, and a
  // `language` that is not a string - are now the document model's, expressed
  // in `document.mjs` as schema and applied here by reading. The reason for
  // moving them is the formal shape: a field three levels down at a numbered
  // position cannot be named by a sentence, so the refusal carries the path to
  // it instead, and a hand written check per field does not reach that far.
  readDocument(doc);

  // A theme arrives whole or partial and is laid over the recorded theme either
  // way, so a caller moves one colour without restating the palette. The
  // validation happens after the merge rather than instead of it: omission is
  // filled, and a misspelt field is still named back by path.
  const theme = options.theme === undefined ? SHEET_THEME : themeOver(options.theme);
  // The design language is the record's positions with the theme's paints and
  // metrics written into it. It is derived rather than given: a caller handing
  // over the whole record was handed every coordinate on the sheet along with
  // the six colours they came for, which is how a "theme" ends up carrying a
  // band at the wrong row.
  const language = theme === SHEET_THEME ? SHEET_LANGUAGE : languageFor(theme);
  const layout =
    options.layout === undefined
      ? // The recorded layout rather than a fresh derivation of it, so the
        // common case allocates nothing and two compositions of the default
        // share one object.
        language === SHEET_LANGUAGE
        ? SHEET_LAYOUT
        : layoutFor(language)
      : readLayout(options.layout);

  // Refused up front rather than noted after the fact. `assertReadable`
  // measures every pairing of ink and ground this theme and this layout imply,
  // after the one substitution the design language nominates, so a palette that
  // is legible as colour and illegible as type never reaches the page.
  assertReadable(theme, layout);

  // The one stack a sheet is set in, as the string the renderer writes. The
  // theme holds it as a list; `familyCss` is the join, and it reproduces the
  // recorded stack exactly.
  const fontFamily = familyCss(theme.stack.family);
  const face = SHEET_FACE;
  const codeFace = CODE_FACE;
  const variation = new Variation(options.seed);
  const {
    bands,
    divisions,
    colors,
    syntax,
    rules,
    insets,
    panelFreedom,
  } = language;
  const brand = options.brand ?? {};
  /** A slot of the layout, and the paint and ground its roles resolve to. */
  const runSlot = (name) => {
    const slot = slotNamed(layout, name);
    return {
      ...slot,
      size: theme.scale[slot.size],
      fill: paintOf(theme, slot.paint, `the ${name} slot`),
      on: paintOf(theme, slot.ground, `the ground under the ${name} slot`),
    };
  };
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

  // A formal document carries sections of entries rather than rows, and what
  // turns one into the other is the layout's - `rowsFor` in `layout.mjs`, and
  // the reason it lives there rather than in the document model is the whole
  // point of that model. The provisional shape goes through unchanged.
  const lines = isFormalDocument(doc) ? rowsFor(doc) : codeLines(doc.code);
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
  // Four rectangles, drawn from the layout's `ground` slots rather than from
  // coordinates written out here. The heading band and the footer are the page
  // white the composition is already on, so the layout gives them no fill and
  // only the inked bands are drawn.
  placeSlots(composition, { layout, theme, stage: "ground" });

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
  // into the mark. The layout says so in one word: the wordmark slot
  // `reserve`s the mark's, and this is what that reservation costs.
  const mastheadSlot = runSlot("wordmark");
  const markSlot = slotNamed(layout, mastheadSlot.reserve);
  const markPlaced = Boolean(brand.logo);
  const mastheadRoom = mastheadSlot.measure - (markPlaced ? markSlot.box.width + markSlot.gap : 0);
  const mastheadCap = displayCap("wordmark", wordmark, mastheadSlot.size.cap, mastheadRoom);
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
  //
  // **`drawnWidth`, because the mark is placed against the wordmark's end.**
  // This is the third placement in the layer that puts one thing against what
  // the engine drew of another, after a split code line's runs and `centredAt`
  // - the composition's own words for it are **place by what a run draws,
  // never by what it measures**, under **What a generated sheet is measured
  // in** in `DESIGN_LANGUAGE.md`. It moves nothing today: the default
  // wordmark holds none of the 96 kerned pairs, so the two rulers return the
  // same number for it and every committed sheet draws its lockup where it
  // did. A document naming its own wordmark is what this is here for, and
  // that is a slot the API already has.
  const wordmarkWidth = drawnWidth(wordmark, { fontSize: mastheadSize, face });
  const lockupLeft =
    (language.canvas - (wordmarkWidth + markSlot.gap + markSlot.box.width)) / 2;
  if (markPlaced) {
    const placed = placeBrand(
      composition,
      {
        ...markSlot.box,
        x: lockupLeft + wordmarkWidth + markSlot.gap,
      },
      brand.logo,
      { name: markSlot.name, alt: brand.logo.alt ?? wordmark }
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
      y: mastheadSlot.baseline,
      text: wordmark,
      align: "left",
      fontFamily,
      fontSize: mastheadSize,
      fontWeight: mastheadSlot.size.weight,
      fill: mastheadSlot.fill,
    },
    mastheadSlot.on
  );

  // --- The heading band ----------------------------------------------------
  // Both rules are drawn as a pair flush to each edge with the title between
  // them, which is how the artwork places them, and the layout's four `rule`
  // slots are where those four positions are stated.
  placeSlots(composition, { layout, theme, stage: "rule" });

  // The title is set across the canvas less both flanking rules, which is the
  // measure the artwork placed the rules against and the measure its slot
  // carries.
  const titleSlot = runSlot("title");
  const titleCap = displayCap("title", doc.title, titleSlot.size.cap, titleSlot.measure);
  const titleSize = sizeForCap(titleCap, face);
  drawText(
    {
      name: titleSlot.name,
      x: centredAt(doc.title, language.canvas / 2, titleSize, face),
      y: titleSlot.baseline,
      text: doc.title,
      align: "left",
      fontFamily,
      fontSize: titleSize,
      fontWeight: titleSlot.size.weight,
      fill: titleSlot.fill,
    },
    titleSlot.on
  );

  // The subtitle and the lead-in are the same size as each other, cap for cap
  // and stem for stem, which is why both slots name the same role of the
  // theme's scale.
  const subtitleSlot = runSlot("subtitle");
  let subtitleCap = subtitleSlot.size.cap;
  if (doc.subtitle) {
    subtitleCap = displayCap("subtitle", doc.subtitle, subtitleSlot.size.cap, subtitleSlot.measure);
    const subtitleSize = sizeForCap(subtitleCap, face);
    drawText(
      {
        name: subtitleSlot.name,
        x: centredAt(doc.subtitle, language.canvas / 2, subtitleSize, face),
        y: subtitleSlot.baseline,
        text: doc.subtitle,
        align: "left",
        fontFamily,
        fontSize: subtitleSize,
        fontWeight: subtitleSlot.size.weight,
        fill: subtitleSlot.fill,
      },
      subtitleSlot.on
    );
  }

  // The lead-in sits a `step-3` in from the spine, which is the tokenised form
  // of the 377 px the artwork measures - the token is what a generated sheet
  // draws to, and the 7 px between them is the residual the design language
  // records for `step-3`. The slot holds the sum of that rather than the
  // token, because where a run starts is the layout's answer and not an
  // arithmetic the composition repeats.
  const leadIn = doc.leadIn ?? DEFAULT_RUNS.leadIn;
  const leadInSlot = runSlot("lead-in");
  const leadInCap = displayCap("lead-in", leadIn, leadInSlot.size.cap, leadInSlot.measure);
  drawText(
    {
      name: leadInSlot.name,
      x: leadInSlot.left,
      y: leadInSlot.baseline,
      text: leadIn,
      align: "left",
      fontFamily,
      fontSize: sizeForCap(leadInCap, face),
      fontWeight: leadInSlot.size.weight,
      fill: leadInSlot.fill,
    },
    leadInSlot.on
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
      fontFamily,
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
    const footerSlot = slotNamed(layout, "footer-lockup");
    const placed = placeBrand(composition, boxOf(layout, footerSlot), footerAsset, {
      name: footerSlot.name,
      alt: footerAsset.alt ?? DEFAULT_RUNS.followLine,
    });
    brandModes.footer = placed.placed ? placed.mode : "drawn";
    for (const note of placed.notes) notes.push(`The footer lockup: ${note}`);
    if (!placed.placed) {
      notes.push("The footer lockup held nothing drawable, so the mark square and follow line are drawn.");
    }
  }

  if (brandModes.footer === "drawn") {
    // The one stage drawn conditionally, which is why the layout keeps it as a
    // stage of its own: where the asset is placed, the mark square is not
    // drawn at all, and a slot list with no painting order could not say that.
    placeSlots(composition, { layout, theme, stage: "mark" });

    const followLine = doc.followLine ?? DEFAULT_RUNS.followLine;
    const followSlot = runSlot("follow-line");
    const followCap = displayCap("follow line", followLine, followSlot.size.cap, followSlot.measure);
    drawText(
      {
        name: followSlot.name,
        x: followSlot.left,
        y: followSlot.baseline,
        text: followLine,
        align: "left",
        fontFamily,
        fontSize: sizeForCap(followCap, face),
        fontWeight: followSlot.size.weight,
        fill: followSlot.fill,
      },
      followSlot.on
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
      stack: { family: [...theme.stack.family], css: fontFamily, resolved: null },
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
