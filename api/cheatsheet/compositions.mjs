// The set compositions: one design per batch of cheatsheets, named by the
// sheets that are drawn in it.
//
// ## What a set is, and why it has a composition of its own
//
// A **set** is the cheatsheets one batch makes for one subject. The eleven
// `javaScriptArrays` sheets are a set; the seventeen `html-css` sheets another;
// the nine of **General JavaScript Overview** and **JS Dates** a third. The
// repository is maintained under a standing rule that every new set is drawn in
// a design of its own - its own layout, type treatment and colour - rather than
// in the one the set before it used, so a reader meeting two sets side by side
// can tell which batch each belongs to before reading a word of either.
//
// Until this file landed there was nowhere to put that. `composeSheet` took a
// `theme` and a `layout` from its **caller**, and the two callers that matter
// pass neither: `index.html` composes whatever `sheet.json` it fetched, and
// `tools/cheatsheet.mjs --all` composes every sheet in the catalog by the same
// path. So a design could be handed to one sheet from a command line and to no
// sheet from the page, which is the opposite of what a *set* needs - a design
// every sheet of the batch carries wherever it is drawn.
//
// A sheet therefore names its composition in its own document, as
// `composition`, and this file is what that name resolves to.
//
// ## Each one is a design language record, not a theme and a layout
//
// The obvious shape would be a theme object beside a layout object. It is the
// wrong one, and `theme.mjs` and `layout.mjs` both say why in their own words:
// `SHEET_THEME` is `themeFrom(SHEET_LANGUAGE)` and `SHEET_LAYOUT` is
// `layoutFor(SHEET_LANGUAGE)`, each **derived** from the record rather than
// typed out beside it, so a figure cannot be edited in one and left in the
// other.
//
// A set composition is held the same way: the entry carries a design language
// record, and its theme and its layout are derived from that one record by the
// two functions the defaults are derived by. The consequence worth having is
// that a composition cannot be internally inconsistent. A band moved in the
// record moves the row, the slots on it and the runs placed against it
// together, because there is one statement of where that band is.
//
// ## The first two are the recorded composition, and that is history
//
// `javascript-arrays` and `html-css` both resolve to `SHEET_LANGUAGE` - the
// same theme, the same layout, the same everything. They are in the record
// anyway, and they are not padding.
//
// The rule asks each set for a design of its own; what the repository can say
// about a set is what it was *actually drawn in*, and both of those were drawn
// before there was any way to name a composition at all. Recording them as the
// recorded composition is the true answer. Leaving them out would make the
// record read as though the third set were the first ever composed, and it
// would leave nothing for `tools/test-set-compositions.mjs` to hold the third
// against - the one check that matters here is that a new set's composition is
// not one an earlier set already used, and that check needs the earlier sets.
//
// It also keeps the committed documents honest. Twenty-eight `sheet.json` files
// name no composition, and they draw exactly what they drew before this file
// existed: a document naming nothing composes through the recorded theme and
// the recorded layout, which is what {@link compositionOf} returning
// `undefined` means. Nothing was retro-fitted onto a finished sheet, because
// re-drawing seventeen published sheets in a design chosen for a different
// batch is not a correction - it is a different set.
//
// ## What a composition may move, and what it may not
//
// It may move anything a design language record holds that the theme or the
// layout reads: the palette and the six syntax inks, the type scale, the grid's
// bands and divisions, the rules that flank the title, the runs' baselines, the
// insets, the mark square, the brand slots, and the panel's freedoms.
//
// It may not move `floors`. The three floors in `language.mjs` are each derived
// from a figure measured off the artwork - a step of cap height, the cap the
// minimum measured spacing yields, the least filled panel of the eleven - and
// they bound what any seed may do to any sheet. A set that lowered them would
// be a set permitted to be unreadable, which is not a design decision. So every
// entry here carries the recorded `floors`, and a composition that wants a
// roomier panel states a roomier `panelFreedom` instead, which is the figure
// that means what it sounds like.
import { FLOORS, INSETS, MARK_SQUARE, SHEET_LANGUAGE, STEP } from "./language.mjs";
import { SHEET_THEME, themeFrom } from "./theme.mjs";
import { SHEET_LAYOUT, layoutFor } from "./layout.mjs";
import { TYPE_ROLES } from "./faces.mjs";

/**
 * A design every sheet of one batch is drawn in.
 *
 * @typedef {object} SetComposition
 * @property {string} id What a document names it by.
 * @property {string} title What a reader calls it.
 * @property {string} set The batch it was drawn for.
 * @property {string} drawn The date the set was composed, `YYYY.MM.DD`.
 * @property {typeof SHEET_LANGUAGE} language The record both halves derive from.
 * @property {import('./theme.mjs').SheetTheme} theme
 * @property {import('./layout.mjs').SheetLayout} layout
 */

/**
 * The anchor every type figure of the third composition is a multiple of.
 *
 * The recorded scale runs masthead 220, follow line 154, title 141, lead-in
 * 112, and the lead-in is the one of the four this file keeps: it is the body
 * of a sheet, it is the smallest, and re-anchoring the scale on anything else
 * would move the one size a reader reads most of.
 */
const ANCHOR_CAP = TYPE_ROLES.leadIn.cap;

/**
 * The factor each role of the third composition's scale takes the anchor at.
 *
 * **The title leads it, which is the treatment.** The recorded scale is led by
 * the masthead at 220 - the brand wordmark is the largest thing on an original
 * sheet, and the sheet's own title is third - and that is right for artwork
 * read one sheet at a time. This set is read three to a row on a profile grid,
 * per the Instagram rule the repository is maintained under, where what has to
 * carry at a thumbnail's size is which cheatsheet a tile is. So the title takes
 * the top of the scale and the masthead comes down to second.
 */
const THIRD_FACTORS = { leadIn: 1, followLine: 1.25, masthead: 1.5, title: 1.75 };

/**
 * The third composition's type scale: the anchor at the four factors above.
 *
 * Every cap is the anchor times its factor and every stem is that cap times the
 * share the recorded role already carries, so nothing here is a figure chosen
 * rather than derived. The weights are the recorded weights: a weight is a
 * property of the face, and moving one would be a claim about the stack this
 * composition has not measured.
 */
const THIRD_SCALE = Object.fromEntries(
  Object.entries(THIRD_FACTORS).map(([role, factor]) => {
    const cap = ANCHOR_CAP * factor;
    return [
      role,
      {
        cap,
        stem: Math.round(cap * TYPE_ROLES[role].stemShare),
        stemShare: TYPE_ROLES[role].stemShare,
        fontWeight: TYPE_ROLES[role].fontWeight,
      },
    ];
  })
);

/** The heading band of the third composition, which the three display runs sit in. */
const HEADING = { y: STEP * 10, height: STEP * 13 };

/**
 * The three display runs of the heading band, stacked from the band's top.
 *
 * Written as a stack rather than as five independent figures because that is
 * what it is: the title is placed a step and a half into the band, and each run
 * below it follows a step under the baseline above. Stated that way a cap that
 * changes moves everything under it, which is the behaviour a stack has and a
 * list of baselines does not.
 */
const STACK = (() => {
  const titleInkTop = HEADING.y + STEP * 1.5;
  const titleBaseline = titleInkTop + THIRD_SCALE.title.cap;
  const subtitleInkTop = titleBaseline + STEP;
  const subtitleBaseline = subtitleInkTop + ANCHOR_CAP;
  const leadInInkTop = subtitleBaseline + STEP;
  return {
    titleInkTop,
    titleBaseline,
    subtitleInkTop,
    subtitleBaseline,
    leadInInkTop,
    leadInBaseline: leadInInkTop + ANCHOR_CAP,
  };
})();

/** The rail, the panel and the right margin of the third composition. */
const COLUMNS = {
  spine: { x: 0, width: STEP * 3, steps: 3 },
  panel: { x: STEP * 3, width: STEP * 67, steps: 67 },
  rightMargin: { x: STEP * 70, width: STEP * 5, steps: 5 },
};

/**
 * The length of a bar flanking the title, and the gutter between bar and
 * measure.
 *
 * **Shorter than the recorded 432, and that follows from the type scale rather
 * than being a second opinion about it.** The bar and the title's measure come
 * out of the same 3600 - `measure` is the canvas less a bar and a gutter either
 * side, derived the way the recorded measure is - so a longer bar is a narrower
 * measure, and a narrower measure is a title stepped down to fit it. The first
 * draft of this composition had the bars at ten steps and every title but two
 * stepped down from the 196 cap it had just put at the top of the scale, one of
 * them to 145: the treatment and the geometry were arguing, and the geometry
 * was winning on every sheet.
 *
 * At five steps the measure is 2928, and every title and subtitle of the set is
 * drawn at the cap the scale names with nothing stepped down - which is what
 * makes it a set rather than nine sheets whose display type is sized by how
 * long each one's title happens to be. The bars read as a mark either side of
 * the title rather than as a rule across the head of the sheet, which is also
 * the plainest difference between this composition and the recorded one at a
 * glance.
 */
const BAR = { width: STEP * 5, gutter: STEP * 2 };

/**
 * The third composition's design language record.
 *
 * Laid out as a delta over `SHEET_LANGUAGE` rather than as a file of its own,
 * for the reason `DESIGN_LANGUAGE-html-css.md` gives for being a derivation:
 * the recorded figures were measured off artwork, this set has no artwork, and
 * a second full record would be a second set of measurements nobody took.
 * What is written out below is the part that differs, and the record says of
 * each where the number came from.
 *
 * The steps it moves are conserved, which is what keeps the grid a grid:
 *
 * | Moved | Recorded | Here | Where the steps went |
 * | --- | --- | --- | --- |
 * | Masthead band | 11 steps | 10 | to the code field |
 * | Heading band | 14 steps | 13 | to the code field |
 * | Code band | 42 steps | 44 | the two above |
 * | Spine column | 5 steps | 3 | to the panel |
 * | Right margin | 6 steps | 5 | to the panel |
 * | Panel column | 64 steps | 67 | the three above |
 *
 * Both totals hold at 75 steps, so the bands still tile the canvas top to
 * bottom and the columns still tile it left to right.
 */
const THIRD_LANGUAGE = {
  ...SHEET_LANGUAGE,
  // The palette. This is the one half of a composition that is chosen rather
  // than derived, because a colour is: there is no figure to measure a hue off
  // when the set has no artwork. What is not chosen is whether it may be used -
  // `assertReadable` measures every pairing of ink and ground this palette and
  // this layout imply against the 4.5:1 text floor before a sheet composes, and
  // the ratios it reports are in `DESIGN_LANGUAGE.md` under the record of this
  // composition.
  //
  // The accent moves from green to amber, which is the decision the rest
  // follows from: it is the furthest a warm accent gets from the recorded green
  // while staying an accent, and it puts this set's tiles beside the first two
  // sets' on the profile grid as a different batch at a glance. The ground is
  // then an indigo rather than the recorded near-black navy, so the amber sits
  // on a ground of its own temperature, and the display ink on paper takes the
  // ground's violet cast for the same reason.
  colors: {
    navy: "#1A1033",
    white: "#FFFFFF",
    green: "#F2A33C",
    heading: "#2E2740",
    // The substitution, and it is here for exactly the reason it is in the
    // recorded palette: the accent reaches 2.08:1 on the paper, under both
    // floors, so on white it carries fills and nothing a reader has to read.
    // This is the same amber darkened until it clears the text floor, at
    // 6.80:1, and `readableInk` swaps it in for any run of the accent set on
    // paper.
    greenOnWhite: "#8A4B06",
  },
  // The six inks of the code panel, each measured on the ground above. The set
  // is a tint of the accent and a tint of its complement either side of a
  // near-white plain: an identifier is the accent's own light tint, a keyword
  // the azure opposite it, and the three remaining roles sit between them. The
  // plain ink is a warm off-white rather than the recorded pure white, which is
  // the one thing in this palette chosen for a reason that is not hue: a long
  // listing set in `#FFFFFF` on a dark ground haloes, and the panel of this set
  // carries more lines than the recorded panel does.
  syntax: {
    plain: "#F5F1FF",
    comment: "#9B93B8",
    identifier: "#FFD08A",
    keyword: "#A8D8FF",
    string: "#FFAFC7",
    number: "#B7EFA0",
  },
  // The bands, re-proportioned per the table above: the display bands give up a
  // step each and the code field takes both.
  bands: {
    masthead: { y: 0, height: STEP * 10, steps: 10 },
    heading: { y: HEADING.y, height: HEADING.height, steps: 13 },
    code: { y: STEP * 23, height: STEP * 44, steps: 44 },
    divider: { y: STEP * 67, height: STEP, steps: 1 },
    footer: { y: STEP * 68, height: STEP * 7, steps: 7 },
  },
  // The columns, likewise: a narrower rail and a narrower right margin, and the
  // panel takes what both gave up. The rail is still the one green column of
  // the sheet and still runs the height of the panel.
  divisions: COLUMNS,
  // The four bars flanking the title, as a matched pair rather than the
  // recorded thick-over-thin: both are half a step deep, and both are short,
  // for the reason `BAR` above gives at length.
  //
  // `measure` is derived the way the recorded measure is - the canvas less a
  // bar and a gutter either side - so a bar and the title's measure meet
  // without overlapping whatever the bar's length is.
  rules: {
    width: BAR.width,
    gap: STEP,
    upper: { height: STEP / 2, y: HEADING.y + STEP / 2 },
    lower: { height: STEP / 2, y: HEADING.y + STEP * 4 },
    gutter: BAR.gutter,
    measure: SHEET_LANGUAGE.canvas - 2 * (BAR.width + BAR.gutter),
  },
  // The five fixed runs, placed against the bands above. Each `cap` is the
  // figure `THIRD_SCALE` sets that role at, so the record and the theme agree
  // about how tall a run is, and each `inkTop` is its baseline less its cap.
  runs: {
    wordmark: {
      inkTop: STEP * 3,
      cap: THIRD_SCALE.masthead.cap,
      baseline: STEP * 3 + THIRD_SCALE.masthead.cap,
      left: SHEET_LANGUAGE.runs.wordmark.left,
      width: SHEET_LANGUAGE.runs.wordmark.width,
    },
    title: {
      inkTop: STACK.titleInkTop,
      cap: THIRD_SCALE.title.cap,
      baseline: STACK.titleBaseline,
      width: SHEET_LANGUAGE.runs.title.width,
    },
    subtitle: {
      inkTop: STACK.subtitleInkTop,
      cap: ANCHOR_CAP,
      baseline: STACK.subtitleBaseline,
    },
    leadIn: {
      inkTop: STACK.leadInInkTop,
      cap: ANCHOR_CAP,
      baseline: STACK.leadInBaseline,
      left: COLUMNS.spine.x + COLUMNS.spine.width + INSETS.leadInFromSpine,
      width: SHEET_LANGUAGE.runs.leadIn.width,
    },
    followLine: {
      inkTop: SHEET_LANGUAGE.runs.followLine.baseline - THIRD_SCALE.followLine.cap,
      cap: THIRD_SCALE.followLine.cap,
      baseline: SHEET_LANGUAGE.runs.followLine.baseline,
      left: STEP * 5 + INSETS.followLineFromMark,
      width: SHEET_LANGUAGE.runs.followLine.width,
    },
  },
  // The mark square narrows with the rail, so the footer reads as the same
  // sheet as the panel above it.
  markSquare: { ...MARK_SQUARE, y: STEP * 68, width: STEP * 5 },
  brandSlots: {
    logo: { ...SHEET_LANGUAGE.brandSlots.logo, top: STEP * 3 },
    footer: {
      x: 0,
      y: STEP * 68,
      width: SHEET_LANGUAGE.canvas - COLUMNS.rightMargin.width,
      height: STEP * 7,
    },
  },
  insets: {
    ...INSETS,
    // The spine leads the panel by three steps rather than four, which is the
    // one vertical use of a token on the sheet and comes down with the rail.
    spineTop: STEP * 3,
  },
  // The panel's own freedom, and this is where the set's consistency is bought.
  // The recorded ranges are what eleven hand composed sheets happened to span -
  // a top padding anywhere from 37 to 152 - and reproducing that span is right
  // for reproducing the artwork and wrong for a batch meant to read as one set:
  // two sheets of this set differ by at most half a step of padding, a step of
  // inset and half a step of spacing, so nine of them sit beside each other
  // without one looking mis-set.
  //
  // Every bound is a multiple of the step, and every one of them is inside the
  // recorded range rather than outside it: this is a narrowing of what the
  // artwork left free, not a new freedom.
  panelFreedom: {
    topPadding: { min: STEP * 2, max: STEP * 2.5 },
    leftInset: { min: STEP * 2, max: STEP * 3 },
    lineSpacing: { min: STEP * 1.5, max: STEP * 2 },
  },
  // Not moved, and the header says why.
  floors: { ...FLOORS },
};

/**
 * A composition entry whose theme and layout are derived from its record.
 *
 * @param {{ id: string, title: string, set: string, drawn: string, language: typeof SHEET_LANGUAGE, scale?: Record<string, { cap: number, stem: number, fontWeight: number }> }} entry
 * @returns {SetComposition}
 */
function derived({ scale, ...entry }) {
  return {
    ...entry,
    theme: themeFrom(entry.language, { name: entry.id, ...(scale ? { scale } : {}) }),
    layout: layoutFor(entry.language, { name: entry.id }),
  };
}

/**
 * Every set composition, by the id a document names it with.
 *
 * @type {Record<string, SetComposition>}
 */
export const SET_COMPOSITIONS = {
  "javascript-arrays": {
    id: "javascript-arrays",
    title: "The recorded composition",
    set: "The eleven javaScriptArrays sheets",
    drawn: "2026.09.16",
    language: SHEET_LANGUAGE,
    theme: SHEET_THEME,
    layout: SHEET_LAYOUT,
  },
  "html-css": {
    id: "html-css",
    title: "The recorded composition",
    set: "The seventeen html-css sheets",
    drawn: "2026.10.19",
    language: SHEET_LANGUAGE,
    theme: SHEET_THEME,
    layout: SHEET_LAYOUT,
  },
  "javascript-general": derived({
    id: "javascript-general",
    title: "Amber on indigo, titled",
    set: "The nine General JavaScript Overview and JS Dates sheets",
    drawn: "2026.11.21",
    language: THIRD_LANGUAGE,
    scale: THIRD_SCALE,
  }),
};

/**
 * The ids a document may name, in the order the sets were drawn.
 *
 * @type {string[]}
 */
export const SET_COMPOSITION_IDS = Object.keys(SET_COMPOSITIONS);

/**
 * The composition an id names.
 *
 * @param {string} id
 * @returns {SetComposition}
 */
export function compositionNamed(id) {
  const found = Object.hasOwn(SET_COMPOSITIONS, id) ? SET_COMPOSITIONS[id] : undefined;
  if (found) return found;
  throw new Error(
    `cheatsheet: ${JSON.stringify(id)} is not a set composition this repository records. ` +
      `It has ${SET_COMPOSITION_IDS.join(", ")}.`
  );
}

/**
 * The composition a document names, or `undefined` where it names none.
 *
 * **Naming none is not a fault and never will be.** Twenty-eight committed
 * documents name none and compose through the recorded theme and the recorded
 * layout, which is what they have always done; a set composition is a thing a
 * document may carry rather than a thing it must.
 *
 * @param {{ composition?: string }} doc
 * @returns {SetComposition | undefined}
 */
export function compositionOf(doc) {
  if (!doc || typeof doc !== "object") return undefined;
  const named = doc.composition;
  if (named === undefined || named === null) return undefined;
  return compositionNamed(String(named));
}
