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
import { SHEET_FACE, TYPE_ROLES } from "./faces.mjs";
import { FOOTER_LINKS } from "./brand.mjs";

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

/**
 * The face's descent as a share of the cap it is set at.
 *
 * Both figures are the committed face's own, so this is what a descender
 * actually reaches below a baseline at any cap: 0.3046 of it. It is the figure
 * {@link GAP_BELOW} steps a display run by, and it is read off the face rather
 * than written down beside it for the reason every cap in {@link THIRD_SCALE}
 * is derived from the anchor - a typed constant is a second claim about the
 * stack that can disagree with the first.
 */
const DESCENT_SHARE = SHEET_FACE.descender / SHEET_FACE.capHeight;

/**
 * The clear paper the recorded composition leaves below a display run, as a
 * share of that run's cap, at its narrowest.
 *
 * The recorded stack's own gaps less the descent each has to clear: `title` to
 * `subtitle` is 81 px under a 141 cap, of which 42.95 px is descender, so
 * 0.2699 of the cap is paper; `subtitle` to `leadIn` is 98 px under a 112 cap,
 * so 0.5704 of it is. Those are two independent measurements off hand composed
 * artwork rather than one ratio.
 *
 * **The narrower of the two governs the whole stack, and choosing it that way
 * is the point.** A generated composition needs one rule where the artwork
 * happens to hold two figures, and the smaller is the one the artwork proves is
 * enough: eleven sheets were drawn with 0.2699 of a cap of paper under their
 * titles and none of them reads as crowded. Averaging the two would set the
 * stack at a proportion neither pair was ever measured at.
 */
const CLEARANCE_SHARE = Math.min(
  ...[
    ["title", "subtitle"],
    ["subtitle", "leadIn"],
  ].map(
    ([upper, lower]) =>
      (SHEET_LANGUAGE.runs[lower].inkTop - SHEET_LANGUAGE.runs[upper].baseline) /
        SHEET_LANGUAGE.runs[upper].cap -
      DESCENT_SHARE
  )
);

/**
 * How far below a display run's baseline the next run's ink starts.
 *
 * **A step was the wrong unit, and that is the whole of the fault this fixes.**
 * Until 2026.11.22 the stack below put each run a flat `STEP` under the
 * baseline above it, which is a constant where the thing it has to clear is a
 * share of the cap above it. At this composition's 196 px title cap a descender
 * reaches 59.70 px and the step allowed 48, so whether a sheet's title collided
 * with its own subtitle was decided by whether that title happened to carry a
 * `g`, `y`, `p` or `j`: **Errors and Debugging** fused its two runs over 14
 * columns and **Comparing Values** over 4, while the seven that cleared did so
 * by 18 to 46 px where the recorded composition clears by 75 to 96.
 *
 * So the gap is the descent the run's own cap implies plus the paper
 * {@link CLEARANCE_SHARE} allows, also as a share of that cap: 112.60 px under
 * the title and 64.34 px under the subtitle. The clearance then holds whatever
 * a title says and whatever cap a later composition puts it at, and both
 * figures in it are read off the face and off the record rather than written
 * down beside them.
 *
 * @param {number} cap The cap of the run above the gap.
 * @returns {number}
 */
const GAP_BELOW = (cap) => cap * (DESCENT_SHARE + CLEARANCE_SHARE);

/**
 * The heading band of the third composition, which the three display runs sit in.
 *
 * **Fifteen steps, where the first draft of this composition had thirteen.**
 * The band has one job - to hold the stack below it, with the lowest descender
 * of its lowest run inside it - and a title leading the type scale at a 196 px
 * cap is what sets how much room that takes. Thirteen was the figure the band
 * carried while the runs were stepped a flat `STEP` apart; once each gap clears
 * its own descender the stack reaches 1135.05 px, and a band of thirteen from
 * this row ends at 1056.
 *
 * The two steps come out of the band rather than out of the type, which is the
 * decision worth naming: the alternative was stepping the title down to fit,
 * and all nine titles drawn at one cap is the treatment this set exists for.
 * One of them is the masthead's and one is the code field's, per the table on
 * {@link THIRD_LANGUAGE}, and the room each has to give was measured rather
 * than assumed - the code field cannot go below 43 steps, where five of the
 * nine set their lines under the 72 px spacing floor the eleven were measured
 * at.
 *
 * At fifteen the stack's lowest ink clears the band's foot by 16.95 px against
 * the recorded composition's 32.89, which is the one proportion of this stack
 * tighter than the artwork's.
 */
const HEADING = { y: STEP * 9, height: STEP * 15 };

/**
 * The three display runs of the heading band, stacked from the band's top.
 *
 * Written as a stack rather than as five independent figures because that is
 * what it is: the title is placed a step and a half into the band, and each run
 * below it follows its predecessor's descender by the paper {@link GAP_BELOW}
 * allows. Stated that way a cap that changes moves everything under it, which
 * is the behaviour a stack has and a list of baselines does not.
 */
const STACK = (() => {
  const titleInkTop = HEADING.y + STEP * 1.5;
  const titleBaseline = titleInkTop + THIRD_SCALE.title.cap;
  const subtitleInkTop = titleBaseline + GAP_BELOW(THIRD_SCALE.title.cap);
  const subtitleBaseline = subtitleInkTop + ANCHOR_CAP;
  const leadInInkTop = subtitleBaseline + GAP_BELOW(ANCHOR_CAP);
  return {
    titleInkTop,
    titleBaseline,
    subtitleInkTop,
    subtitleBaseline,
    leadInInkTop,
    leadInBaseline: leadInInkTop + ANCHOR_CAP,
  };
})();

/**
 * Where the masthead lockup's ink starts, which both halves of it share.
 *
 * **Half a step higher than the first draft of this composition had it, and the
 * band is why.** The masthead gave the heading band a step and the code field
 * another, so it holds the same 242 px lockup in 432 px rather than 480. Left at
 * three steps the lockup would have sat 46 px off the band's foot with 144
 * above it; at two and a half it keeps very nearly the proportion it had - 120
 * above and 70 below, against 144 and 94 - so the band reads as the same
 * masthead at a different height rather than as a crowded one.
 */
const LOCKUP_TOP = STEP * 2.5;

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
 * The slot the brand's footer strip is placed in.
 *
 * **Its width is the strip's own aspect at the band's height, and not a column
 * of the grid.** `placeBrand` draws every brand raster `xMidYMid meet`, so a
 * slot whose aspect is wider than the strip's letterboxes it and centres what
 * is left: the recorded composition's slot is the canvas less a six step right
 * margin, 3312 x 336, which is a shade narrower than the strip's 799 x 81 and
 * therefore fills to the width with the mark flush to the trim. Deriving the
 * width the same way here, from a right margin this composition narrowed to
 * five steps, widened the slot to 3360 and stood the mark 22.81 px off the
 * trim - a notch of bare paper down the left of the footer band, under a
 * divider that runs 0 to 3600 and a rail that starts at 0.
 *
 * The right margin is a column of the grid; this slot is a frame for a raster
 * of a fixed aspect, and nothing said so until the two disagreed. Stated from
 * the strip it stays correct for any later composition whose bands move.
 *
 * **Rounded down to the step, and the direction is the point.** The aspect at
 * this band's height is 3314.37 px, and a slot rounded *up* to 3360 is the
 * fault again: the mark sits on the trim only while the slot is no wider than
 * the strip, so the rounding has to be the one that cannot widen it.
 * `footerLinkAreas` reads the same letterbox off the same slot, so the four
 * links follow the strip wherever this puts it.
 */
const FOOTER_SLOT = (() => {
  const height = STEP * 7;
  const aspect = FOOTER_LINKS.width / FOOTER_LINKS.height;
  return { x: 0, y: STEP * 68, width: Math.floor((aspect * height) / STEP) * STEP, height };
})();

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
 * | Masthead band | 11 steps | 9 | one each to the heading band and the code field |
 * | Heading band | 14 steps | 15 | the masthead's step |
 * | Code band | 42 steps | 43 | the masthead's other step |
 * | Spine column | 5 steps | 3 | to the panel |
 * | Right margin | 6 steps | 5 | to the panel |
 * | Panel column | 64 steps | 67 | the three above |
 *
 * Both totals hold at 75 steps, so the bands still tile the canvas top to
 * bottom and the columns still tile it left to right.
 *
 * **The masthead is what pays for the heading band, and the arithmetic is the
 * type scale's.** A title at the top of the scale needs a taller band than a
 * title third in it, and the only other band with paper to spare is the one
 * holding a lockup 242 px tall in 528. Two of its steps go, its lockup comes up
 * half a step so the paper above and below it keeps the proportion it had, and
 * the code field still ends a step wider than the artwork's.
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
  // The bands, re-proportioned per the table above: the masthead gives up two
  // steps, one to the heading band - which a 196 px title needs to hold its
  // stack - and one to the code field.
  bands: {
    masthead: { y: 0, height: STEP * 9, steps: 9 },
    heading: { y: HEADING.y, height: HEADING.height, steps: 15 },
    code: { y: STEP * 24, height: STEP * 43, steps: 43 },
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
      inkTop: LOCKUP_TOP,
      cap: THIRD_SCALE.masthead.cap,
      baseline: LOCKUP_TOP + THIRD_SCALE.masthead.cap,
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
    logo: { ...SHEET_LANGUAGE.brandSlots.logo, top: LOCKUP_TOP },
    footer: FOOTER_SLOT,
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
 * The factor each role of the fourth composition's scale takes the anchor at.
 *
 * **The masthead recedes, which is the treatment.** The order is the recorded
 * one - masthead, follow line, title, lead-in - and what changes is how far
 * apart the four sit: the recorded scale spans 112 to 220 and the third 112 to
 * 196, where this one spans 112 to 168. The brand wordmark comes down from 1.96
 * of the anchor to 1.5 and stops being the largest thing on the sheet by a
 * margin, and the three runs under it land on 112, 140 and 154 - which are the
 * artwork's own lead-in and follow line and a point off its title.
 *
 * So this is the third treatment of three rather than a second: the recorded
 * composition leads with the brand, the third leads with the title, and this
 * one leads with nothing much. The set it was drawn for is why. **JS Elements**
 * and **JS Math** are reference sheets a reader goes to for a call signature
 * rather than posters read at a glance, so what has to carry is the listing -
 * the head says which sheet this is and then gets out of the way, and the step
 * the heading band gives up goes to the code field.
 */
const FOURTH_FACTORS = { leadIn: 1, title: 1.25, followLine: 1.375, masthead: 1.5 };

/**
 * The fourth composition's type scale: the anchor at the four factors above.
 *
 * Derived exactly as {@link THIRD_SCALE} is, and for the same reason - a cap
 * written down beside a factor is a second claim that can disagree with the
 * first. The follow line comes out at the recorded 154 rather than near it:
 * 1.375 of 112 is 154, so the one run of the five this scale leaves at the
 * artwork's own cap is the one that sits on the footer.
 */
const FOURTH_SCALE = Object.fromEntries(
  Object.entries(FOURTH_FACTORS).map(([role, factor]) => {
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

/**
 * The heading band of the fourth composition, and the masthead above it.
 *
 * **Both are the artwork's, and that is what a receding masthead buys.** The
 * third composition had to take two steps off the masthead to hold a title at
 * the top of its scale; a title below the follow line needs less room than the
 * artwork's fourteen steps rather than more, so the masthead keeps its eleven,
 * the heading band gives a step to the code field, and nothing else moves.
 */
const FOURTH_HEADING = { y: STEP * 11, height: STEP * 13 };

/**
 * The three display runs of the fourth composition's heading band.
 *
 * The same stack {@link STACK} builds, with two differences, both of which
 * follow from the narrower scale. The title is placed one step into the band
 * rather than a step and a half, and the band is thirteen steps rather than
 * fifteen: the stack's lowest descender then clears the band's foot by
 * 33.12 px, against the recorded composition's 32.89 and the third's 16.95.
 */
const FOURTH_STACK = (() => {
  const titleInkTop = FOURTH_HEADING.y + STEP;
  const titleBaseline = titleInkTop + FOURTH_SCALE.title.cap;
  const subtitleInkTop = titleBaseline + GAP_BELOW(FOURTH_SCALE.title.cap);
  const subtitleBaseline = subtitleInkTop + ANCHOR_CAP;
  const leadInInkTop = subtitleBaseline + GAP_BELOW(ANCHOR_CAP);
  return {
    titleInkTop,
    titleBaseline,
    subtitleInkTop,
    subtitleBaseline,
    leadInInkTop,
    leadInBaseline: leadInInkTop + ANCHOR_CAP,
  };
})();

/** The rail, the panel and the right margin of the fourth composition. */
const FOURTH_COLUMNS = {
  spine: { x: 0, width: STEP * 7, steps: 7 },
  panel: { x: STEP * 7, width: STEP * 62, steps: 62 },
  rightMargin: { x: STEP * 69, width: STEP * 6, steps: 6 },
};

/**
 * The bars flanking the fourth composition's title: a pair of hairlines.
 *
 * **Nine steps long, which is the artwork's length, and a quarter step deep,
 * which is nobody's.** The length is not a free choice - the title's measure is
 * the canvas less a bar and a gutter either side, so a bar's length sets how
 * much room a title has - and at nine steps and a two step gutter the measure
 * comes out at the recorded 2544. A title below the follow line fits that
 * measure with nothing stepped down, so the geometry and the treatment agree
 * here without either giving way, which is what the third composition had to
 * shorten its bars to buy.
 *
 * What differs is the weight. The recorded pair is thick over thin, 45 px over
 * 20; the third's is a matched pair at half a step. These are a matched pair at
 * a quarter step, bracketing the title half a step above its ink and half a
 * step below its baseline rather than sitting at figures of their own in the
 * band - so they move with the title the way the stack below it does.
 */
const FOURTH_BAR = { width: STEP * 9, gutter: STEP * 2 };

/**
 * The fourth composition's footer slot, derived the way the third's is.
 *
 * It comes out at the recorded 3312 px rather than near it, because this
 * composition keeps the artwork's six step right margin and the recorded slot
 * is the canvas less exactly that. The derivation is kept rather than the
 * figure: what makes the mark sit flush on the trim is the slot's aspect being
 * no wider than the strip's, and that is a property of the strip rather than of
 * any one composition's margins.
 */
const FOURTH_FOOTER_SLOT = (() => {
  const height = STEP * 7;
  const aspect = FOOTER_LINKS.width / FOOTER_LINKS.height;
  return { x: 0, y: STEP * 68, width: Math.floor((aspect * height) / STEP) * STEP, height };
})();

/**
 * The fourth composition's design language record.
 *
 * A delta over `SHEET_LANGUAGE`, as {@link THIRD_LANGUAGE} is, and a smaller
 * one: this composition moves one step vertically and two horizontally, where
 * the third moved two and three.
 *
 * | Moved | Recorded | Here | Where the steps went |
 * | --- | --- | --- | --- |
 * | Heading band | 14 steps | 13 | one to the code field |
 * | Code band | 42 steps | 43 | the heading band's step |
 * | Spine column | 5 steps | 7 | two from the panel |
 * | Panel column | 64 steps | 62 | two to the rail |
 *
 * Both totals hold at 75 steps, so the bands still tile the canvas top to
 * bottom and the columns still tile it left to right.
 *
 * **The rail is the one region that gains here**, where every other difference
 * in this composition gives something to the code field or takes something off
 * the display stack. A reference sheet is read down its left edge, and a rail
 * at seven steps is the widest thing on the sheet that is not type.
 */
const FOURTH_LANGUAGE = {
  ...SHEET_LANGUAGE,
  // The palette, chosen for the same reason the third's is and under the same
  // constraint: `assertReadable` measures every pairing of ink and ground this
  // palette and this layout imply against the 4.5:1 text floor before a sheet
  // composes, and the ratios it reports are in `DESIGN_LANGUAGE.md` under the
  // record of this composition.
  //
  // The accent is a cyan, which is the decision the rest follows from: it is
  // the cool side of the wheel, where the recorded green is the warm-neutral
  // middle of it and the third's amber the warm end, so the three designs read
  // as three temperatures rather than three hues. The ground is a slate of the
  // same temperature, and the display ink on paper takes that slate's cast.
  colors: {
    navy: "#0B2026",
    white: "#FFFFFF",
    green: "#2FD4C8",
    heading: "#20333A",
    // The substitution, live here for the reason it is live in both palettes
    // before it: the accent reaches 1.85:1 on the paper, under both floors, so
    // on white it carries fills and nothing a reader has to read. This is the
    // same cyan darkened until it clears the text floor, at 6.36:1.
    greenOnWhite: "#0A6B64",
  },
  // The six inks of the code panel, each measured on the ground above. The set
  // is built outward from the accent rather than across it: an identifier is
  // the accent's own light tint, a keyword and a string are the two warm
  // complements either side of it, and the comment is the ground's own hue
  // lightened until it clears the text floor. The plain ink is a cool off-white
  // for the reason the third's is a warm one - a long listing set in `#FFFFFF`
  // on a dark ground haloes, and the panels of this set are the longest of the
  // three.
  syntax: {
    plain: "#EAF4F6",
    comment: "#8FA3A9",
    identifier: "#8AE8DE",
    keyword: "#FFC48A",
    string: "#F7A8BF",
    number: "#C9E88A",
  },
  // The bands: the masthead is the artwork's, the heading band gives its step
  // to the code field, and the divider and the footer do not move.
  bands: {
    masthead: { y: 0, height: STEP * 11, steps: 11 },
    heading: { y: FOURTH_HEADING.y, height: FOURTH_HEADING.height, steps: 13 },
    code: { y: STEP * 24, height: STEP * 43, steps: 43 },
    divider: { y: STEP * 67, height: STEP, steps: 1 },
    footer: { y: STEP * 68, height: STEP * 7, steps: 7 },
  },
  // The columns: a wider rail, a narrower panel, and the artwork's own right
  // margin.
  divisions: FOURTH_COLUMNS,
  rules: {
    width: FOURTH_BAR.width,
    gap: STEP,
    upper: { height: STEP / 4, y: FOURTH_STACK.titleInkTop - STEP / 2 },
    lower: { height: STEP / 4, y: FOURTH_STACK.titleBaseline + STEP / 2 },
    gutter: FOURTH_BAR.gutter,
    measure: SHEET_LANGUAGE.canvas - 2 * (FOURTH_BAR.width + FOURTH_BAR.gutter),
  },
  // The five fixed runs. The two outside the heading band keep the artwork's
  // baselines and take their caps from the scale, so a smaller cap starts lower
  // rather than dragging a lockup or a footer line up with it - which is how the
  // third composition places its follow line, arrived at here for both.
  runs: {
    wordmark: {
      inkTop: SHEET_LANGUAGE.runs.wordmark.baseline - FOURTH_SCALE.masthead.cap,
      cap: FOURTH_SCALE.masthead.cap,
      baseline: SHEET_LANGUAGE.runs.wordmark.baseline,
      left: SHEET_LANGUAGE.runs.wordmark.left,
      width: SHEET_LANGUAGE.runs.wordmark.width,
    },
    title: {
      inkTop: FOURTH_STACK.titleInkTop,
      cap: FOURTH_SCALE.title.cap,
      baseline: FOURTH_STACK.titleBaseline,
      width: SHEET_LANGUAGE.runs.title.width,
    },
    subtitle: {
      inkTop: FOURTH_STACK.subtitleInkTop,
      cap: ANCHOR_CAP,
      baseline: FOURTH_STACK.subtitleBaseline,
    },
    leadIn: {
      inkTop: FOURTH_STACK.leadInInkTop,
      cap: ANCHOR_CAP,
      baseline: FOURTH_STACK.leadInBaseline,
      left: FOURTH_COLUMNS.spine.x + FOURTH_COLUMNS.spine.width + INSETS.leadInFromSpine,
      width: SHEET_LANGUAGE.runs.leadIn.width,
    },
    followLine: {
      inkTop: SHEET_LANGUAGE.runs.followLine.baseline - FOURTH_SCALE.followLine.cap,
      cap: FOURTH_SCALE.followLine.cap,
      baseline: SHEET_LANGUAGE.runs.followLine.baseline,
      left: MARK_SQUARE.width + STEP * 4,
      width: SHEET_LANGUAGE.runs.followLine.width,
    },
  },
  // Unmoved, and with it the whole footer band. The third composition narrowed
  // the mark square with its rail; widening it with this one would take 48 px
  // off the measure the follow line is fitted to, and the follow line is set at
  // the artwork's own 154 px cap rather than the third's 140 - so it is the one
  // run on the sheet that has no room to give. The rail is a column of the code
  // band and the mark square is a frame in the footer, which is the same
  // distinction the footer slot turns on.
  markSquare: { ...MARK_SQUARE },
  brandSlots: {
    logo: { ...SHEET_LANGUAGE.brandSlots.logo },
    footer: FOURTH_FOOTER_SLOT,
  },
  insets: {
    ...INSETS,
    // **The one inset this composition moves, and the artwork is why.** The
    // follow line is set at the artwork's own 154 px cap, and the artwork does
    // not fit it: six steps off the mark square leaves 2736 px of measure, the
    // line measures 2797.27 at that cap, and every sheet of the first two sets
    // carries a note saying it was stepped down to 150 to get in. This
    // composition keeps the cap and buys the room instead - four steps off the
    // mark rather than six, which is 2832 px and fits.
    //
    // The alternative was to narrow the mark square, and that is the wrong one:
    // the square is the footer's own link area, so a sheet whose follow line
    // fitted would be a sheet whose brand was harder to press.
    followLineFromMark: STEP * 4,
  },
  // The panel's own freedom, narrowed as the third's is and to different
  // bounds. The code field is the same 43 steps and the panel is five steps
  // narrower, so the listing is set lower in the band and held nearer the rail:
  // the top padding is half a step more generous than the third's at both ends,
  // and the left inset reaches half a step less far, which is what keeps a
  // longer line inside a narrower panel.
  //
  // The line spacing is the third's, and that is not a choice either. The
  // recorded range is 56 to 116 px, so the only bounds that are whole half
  // steps inside it are 1.5 and 2 - every set that narrows this figure to the
  // half step narrows it to the same pair.
  panelFreedom: {
    topPadding: { min: STEP * 2.5, max: STEP * 3 },
    leftInset: { min: STEP * 2, max: STEP * 2.5 },
    lineSpacing: { min: STEP * 1.5, max: STEP * 2 },
  },
  // Not moved, and the header says why.
  floors: { ...FLOORS },
};

/**
 * The factor each role of the fifth composition's scale takes the anchor at.
 *
 * **The masthead leads and the title is second, which is the treatment.** The
 * recorded order is masthead, follow line, title, lead-in; the third promotes
 * the title to the top of it and the fourth brings the masthead down to lead a
 * compressed scale. This one keeps the brand at the top where the artwork has
 * it and promotes the title past the follow line, which is the one reordering
 * of the recorded four that neither set before it makes.
 *
 * It is also the widest of the four. The recorded scale spans 112 to 220, the
 * third 112 to 196 and the fourth 112 to 168, where this one spans 112 to 224:
 * the masthead goes to twice the anchor and the follow line comes down to 1.125
 * of it, so the two ends of the scale move apart rather than together.
 *
 * The set it was drawn for is why. **JS Statements** and **JS Objects** are the
 * two subjects the overview deliberately left out, so they are where a reader
 * who has met the overview goes next - and what has to carry on a tile is that
 * these are the same repository's sheets, which is the brand, and then which
 * subject this one is, which is the title. The follow line is the run a reader
 * reaches last, and it is the only one that gives anything up.
 */
const FIFTH_FACTORS = { leadIn: 1, followLine: 1.125, title: 1.375, masthead: 2 };

/**
 * The fifth composition's type scale: the anchor at the four factors above.
 *
 * Derived exactly as {@link THIRD_SCALE} and {@link FOURTH_SCALE} are, and for
 * the same reason - a cap written down beside a factor is a second claim that
 * can disagree with the first. The title comes out at the artwork's own follow
 * line cap of 154, which is the arithmetic rather than a figure anyone chose:
 * 1.375 of 112 is 154, and that factor is where a title sits once it is above a
 * follow line at 1.125 and below a masthead at 2.
 */
const FIFTH_SCALE = Object.fromEntries(
  Object.entries(FIFTH_FACTORS).map(([role, factor]) => {
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

/**
 * The heading band of the fifth composition, and the masthead above it.
 *
 * **The masthead takes a step rather than giving one, and the scale is why.** A
 * wordmark at twice the anchor is 224 px of cap in a band the artwork sized for
 * 220, and the third composition's own history says what happens when a band is
 * left alone under a scale that outgrew it: a run that does not fit is a run
 * stepped down, and a masthead stepped down on some sheets of a set and not
 * others is not a set.
 *
 * So this is the one composition of the three whose code field is the artwork's
 * own 42 steps. The step the masthead takes comes out of the heading band,
 * which can afford it here for the same reason the fourth composition's can - a
 * title below the top of the scale needs less room than a title at it.
 */
const FIFTH_HEADING = { y: STEP * 12, height: STEP * 13 };

/**
 * Where the fifth composition's masthead lockup starts.
 *
 * **Three and a half steps, which centres it.** The lockup is 242 px tall in a
 * band of 576, so the paper above and below it comes out at 168 and 166 - as
 * near centred as a half step allows, where the artwork's own lockup sits 133
 * above and 153 below in a band of 528 and the third composition's keeps that
 * proportion in a shorter one.
 *
 * Centring it is the decision the extra step buys. A masthead leading the widest
 * of the four scales is the first thing read on the sheet, and a lockup sitting
 * high in its band reads as a header above the sheet rather than as the top of
 * it.
 */
const FIFTH_LOCKUP_TOP = STEP * 3.5;

/**
 * The three display runs of the fifth composition's heading band.
 *
 * The same stack {@link STACK} builds, placed half a step into the band. At a
 * 154 px title cap the gaps come out at 88.47 px and 64.34 px and the stack's
 * lowest descender reaches 1164.92 px against a band foot at 1200, so it clears
 * by 35.08 px - the roomiest of the four, where the recorded composition clears
 * by 32.89, the fourth by 33.12 and the third by 16.95.
 */
const FIFTH_STACK = (() => {
  const titleInkTop = FIFTH_HEADING.y + STEP / 2;
  const titleBaseline = titleInkTop + FIFTH_SCALE.title.cap;
  const subtitleInkTop = titleBaseline + GAP_BELOW(FIFTH_SCALE.title.cap);
  const subtitleBaseline = subtitleInkTop + ANCHOR_CAP;
  const leadInInkTop = subtitleBaseline + GAP_BELOW(ANCHOR_CAP);
  return {
    titleInkTop,
    titleBaseline,
    subtitleInkTop,
    subtitleBaseline,
    leadInInkTop,
    leadInBaseline: leadInInkTop + ANCHOR_CAP,
  };
})();

/** The rail, the panel and the right margin of the fifth composition. */
const FIFTH_COLUMNS = {
  spine: { x: 0, width: STEP * 4, steps: 4 },
  panel: { x: STEP * 4, width: STEP * 65, steps: 65 },
  rightMargin: { x: STEP * 69, width: STEP * 6, steps: 6 },
};

/**
 * The bars flanking the fifth composition's title: thin over thick.
 *
 * **The recorded pair inverted, which is the plainest difference between this
 * head and the artwork's at a glance.** The recorded bars are 45 px over 20,
 * the third's a matched pair at half a step and the fourth's a matched pair at a
 * quarter; this one is a quarter step over a half, so the weight gathers under
 * the title rather than over it and the title reads as sitting on a line rather
 * than hanging from one. It is the same inversion the type scale makes, where
 * the run that gains is the one the recorded order puts lower.
 *
 * Four steps long, and that is the title's measure talking. The measure is the
 * canvas less a bar and a gutter either side, so a bar's length is how much room
 * a title has: at four steps and a two step gutter it comes out at 3024 px,
 * which is 19.6 times the 154 px cap where the artwork's 2544 is 18.0 times its
 * 141. A title promoted above the follow line needs the wider measure, and the
 * bars are what pay for it.
 */
const FIFTH_BAR = { width: STEP * 4, gutter: STEP * 2 };

/**
 * The fifth composition's footer slot, derived the way the other two are.
 *
 * It comes out at the recorded 3312 px, because this composition keeps the
 * artwork's six step right margin as the fourth does. The derivation is kept
 * rather than the figure, for the reason {@link FOOTER_SLOT} gives at length:
 * the mark sits flush on the trim only while the slot is no wider in aspect
 * than the strip, and that is a property of the strip.
 */
const FIFTH_FOOTER_SLOT = (() => {
  const height = STEP * 7;
  const aspect = FOOTER_LINKS.width / FOOTER_LINKS.height;
  return { x: 0, y: STEP * 68, width: Math.floor((aspect * height) / STEP) * STEP, height };
})();

/**
 * The fifth composition's design language record.
 *
 * A delta over `SHEET_LANGUAGE`, as the two before it are, and the smallest of
 * the three: it moves one step vertically and one horizontally.
 *
 * | Moved | Recorded | Here | Where the steps went |
 * | --- | --- | --- | --- |
 * | Masthead band | 11 steps | 12 | the heading band's step |
 * | Heading band | 14 steps | 13 | one to the masthead |
 * | Spine column | 5 steps | 4 | one to the panel |
 * | Panel column | 64 steps | 65 | the rail's step |
 *
 * Both totals hold at 75 steps, so the bands still tile the canvas top to
 * bottom and the columns still tile it left to right.
 *
 * **The code field is the one thing this composition does not touch**, where
 * both sets before it took a step for it. That is the difference the table
 * understates: this set's examples are the shortest of the three, because
 * control flow and the object model document in short complete fragments rather
 * than in long transcripts, so the field the artwork drew is the field they
 * want and the step goes to the run that needed it instead.
 */
const FIFTH_LANGUAGE = {
  ...SHEET_LANGUAGE,
  // The palette, chosen as both before it are chosen and under the same
  // constraint: `assertReadable` measures every pairing of ink and ground this
  // palette and this layout imply against the 4.5:1 text floor before a sheet
  // composes, and the ratios it reports are in `DESIGN_LANGUAGE.md` under the
  // record of this composition.
  //
  // The accent is a violet, and it is the one hue the three sets before it leave
  // open: it is where the recorded green's complement lands on the wheel, so
  // this set is not a fourth temperature beside warm, warm-neutral and cool but
  // the far side of the first. The ground is a graphite carrying that violet's
  // own cast, and the display ink on paper takes the same cast.
  colors: {
    navy: "#1E1B26",
    white: "#FFFFFF",
    green: "#B98CFF",
    heading: "#2B2733",
    // The substitution, live here as it is in all three palettes before it: the
    // accent reaches 2.54:1 on the paper, under both floors, so on white it
    // carries fills and nothing a reader has to read. This is the same violet
    // darkened until it clears the text floor, at 6.70:1.
    greenOnWhite: "#6B3FC4",
  },
  // The six inks of the code panel, each measured on the ground above. The set
  // is built across the accent rather than outward from it: an identifier is the
  // accent's own light tint, a keyword is the mint directly opposite that
  // violet, and the string and the number are the warm pair that falls between
  // the two on the way round. The plain ink and the comment are then one hue at
  // two distances - the ground's own violet lightened to near-paper, and
  // lightened to the middle - which is what keeps a panel of this set reading as
  // one surface rather than as six colours.
  //
  // Plain is not `#FFFFFF`, for the reason neither of the two sets before it is
  // either: a long listing set in pure white on a dark ground haloes.
  syntax: {
    plain: "#F4F0FA",
    comment: "#A096AF",
    identifier: "#D8BBFF",
    keyword: "#9BE8C8",
    string: "#FFC08A",
    number: "#FFE98A",
  },
  // The bands: the masthead takes the heading band's step, and the code field,
  // the divider and the footer are the artwork's own.
  bands: {
    masthead: { y: 0, height: STEP * 12, steps: 12 },
    heading: { y: FIFTH_HEADING.y, height: FIFTH_HEADING.height, steps: 13 },
    code: { y: STEP * 25, height: STEP * 42, steps: 42 },
    divider: { y: STEP * 67, height: STEP, steps: 1 },
    footer: { y: STEP * 68, height: STEP * 7, steps: 7 },
  },
  // The columns: a rail a step narrower than the artwork's, and the panel takes
  // the step. The rail is the one violet column of the sheet and still runs the
  // height of the panel.
  divisions: FIFTH_COLUMNS,
  rules: {
    width: FIFTH_BAR.width,
    gap: STEP,
    // Thin over thick, bracketing the title half a step above its ink and half a
    // step below its baseline, so both move with the title the way the stack
    // under it does. The upper hairline lands on the band's own top edge, which
    // is the arithmetic of a title placed half a step in rather than a second
    // decision.
    upper: { height: STEP / 4, y: FIFTH_STACK.titleInkTop - STEP / 2 },
    lower: { height: STEP / 2, y: FIFTH_STACK.titleBaseline + STEP / 2 },
    gutter: FIFTH_BAR.gutter,
    measure: SHEET_LANGUAGE.canvas - 2 * (FIFTH_BAR.width + FIFTH_BAR.gutter),
  },
  // The five fixed runs. The lockup is placed from its own top, as the third
  // composition's is, because this masthead is taller than the artwork's rather
  // than shorter and a baseline kept from the record would put its ink above the
  // top of the canvas. The follow line keeps the artwork's baseline and takes
  // its cap from the scale, so a smaller cap starts lower.
  runs: {
    wordmark: {
      inkTop: FIFTH_LOCKUP_TOP,
      cap: FIFTH_SCALE.masthead.cap,
      baseline: FIFTH_LOCKUP_TOP + FIFTH_SCALE.masthead.cap,
      left: SHEET_LANGUAGE.runs.wordmark.left,
      width: SHEET_LANGUAGE.runs.wordmark.width,
    },
    title: {
      inkTop: FIFTH_STACK.titleInkTop,
      cap: FIFTH_SCALE.title.cap,
      baseline: FIFTH_STACK.titleBaseline,
      width: SHEET_LANGUAGE.runs.title.width,
    },
    subtitle: {
      inkTop: FIFTH_STACK.subtitleInkTop,
      cap: ANCHOR_CAP,
      baseline: FIFTH_STACK.subtitleBaseline,
    },
    leadIn: {
      inkTop: FIFTH_STACK.leadInInkTop,
      cap: ANCHOR_CAP,
      baseline: FIFTH_STACK.leadInBaseline,
      left: FIFTH_COLUMNS.spine.x + FIFTH_COLUMNS.spine.width + INSETS.leadInFromSpine,
      width: SHEET_LANGUAGE.runs.leadIn.width,
    },
    followLine: {
      inkTop: SHEET_LANGUAGE.runs.followLine.baseline - FIFTH_SCALE.followLine.cap,
      cap: FIFTH_SCALE.followLine.cap,
      baseline: SHEET_LANGUAGE.runs.followLine.baseline,
      left: MARK_SQUARE.width + INSETS.followLineFromMark,
      width: SHEET_LANGUAGE.runs.followLine.width,
    },
  },
  // The artwork's own square, and the artwork's own inset beside it. This is the
  // one composition of the three that needs neither moved: the follow line is
  // set at 126 px rather than the artwork's 154, so `Follow along at
  // practicing.xyz` measures 2288.68 px in the 2736 the recorded footer leaves
  // it. The fourth composition bought that room by moving the inset; this one is
  // handed it by the type scale.
  markSquare: { ...MARK_SQUARE },
  brandSlots: {
    logo: { ...SHEET_LANGUAGE.brandSlots.logo, top: FIFTH_LOCKUP_TOP },
    footer: FIFTH_FOOTER_SLOT,
  },
  // Not one of them moved, which no composition before this one could say.
  insets: { ...INSETS },
  // The panel's own freedom, narrowed as both before it are and to bounds of its
  // own. The top padding is the tightest of the three at both ends, which is
  // what a code field left at the artwork's 42 steps has to do to hold a block
  // of the same length: a step and a half to two steps, against the third's two
  // to two and a half and the fourth's two and a half to three. The left inset
  // starts deeper than either of the two before it, which both begin at two
  // steps - the rail comes in a step and the listing keeps the gap it had.
  //
  // The line spacing is the other two's, and that is not a choice: the recorded
  // range is 56 to 116 px, so the only bounds that are whole half steps inside
  // it are 1.5 and 2. Every set that narrows this figure to the half step
  // narrows it to the same pair.
  panelFreedom: {
    topPadding: { min: STEP * 1.5, max: STEP * 2 },
    leftInset: { min: STEP * 2.5, max: STEP * 3 },
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
  "javascript-elements": derived({
    id: "javascript-elements",
    title: "Cyan on slate, receding masthead",
    set: "The seven JS Elements and JS Math sheets",
    drawn: "2026.11.24",
    language: FOURTH_LANGUAGE,
    scale: FOURTH_SCALE,
  }),
  "javascript-statements": derived({
    id: "javascript-statements",
    title: "Violet on graphite, the title second",
    set: "The nine JS Statements and JS Objects sheets",
    drawn: "2026.11.27",
    language: FIFTH_LANGUAGE,
    scale: FIFTH_SCALE,
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
