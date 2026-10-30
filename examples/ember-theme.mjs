// A second theme, so the same document can be drawn twice and compared.
//
// **What a theme is here.** A theme is the model in
// `api/cheatsheet/theme.mjs`: the themeable half of the design language on its
// own - the palette roles, the syntax roles, the type stack and scale, the
// spacing, the curve and shape tokens, the stroke weights - with none of the
// record's coordinates in it. `composeSheet` takes one as `options.theme`, and
// since 2026.10.30 that is the only way to re-tint a sheet: the whole design
// language record used to be accepted as `options.language` and is now refused
// by name, because a caller who wanted six colours changed was being handed
// every band, division and baseline on the sheet along with them.
//
// **It is written as a partial, which is the point.** The object below names a
// title and two palettes and nothing else. `themeOver` lays it over the
// recorded theme and validates the result, so everything this file does not
// mention - the stack, the four measured sizes, the step, the curves, the
// stroke weights - stays exactly where the design language put it. Restating
// those to change a colour is how a theme file ends up carrying a figure
// nobody meant to move.
//
// **What a theme is not.** It is not an inversion. The colour roles are named
// after the artwork's own colours and each carries two jobs: `navy` is the
// dark ground *and* the dark ink, `white` is the light ground *and* plain
// code. Swapping the two would put the footer's dark type on a dark ground and
// the masthead's light type on a light one. So a theme re-tints within the
// role structure the eleven sheets established, and a genuinely inverted sheet
// would be a change to the design language rather than a theme over it.
//
// **The accent is chosen to sit where the recorded green sits.** The sheets'
// green reaches 2.80:1 on their white, which is under the 4.5:1 text floor, so
// the design language records it as a fill and nominates a darker green for
// text that has to be read on a light ground. This amber is at 2.71:1 and
// carries a nominated substitute for the same reason, which is what keeps
// `readableInk` meaningful under the theme instead of silently inert.
//
// It is also what keeps the theme compositional at all. `composeSheet` refuses
// a theme whose type cannot be read on the grounds the layout pairs it with,
// before anything is drawn, so an amber nominated for nothing would be an
// error here rather than a sheet with an illegible footer.

import { languageFor, themeOver } from "../api/cheatsheet/theme.mjs";

/** The name the examples print and file their output under. */
export const EMBER = "ember";

/**
 * Deep plum and amber: the recorded structure, a different palette.
 *
 * A **partial** theme - two palettes and a name. Every ink here clears the
 * 4.5:1 text floor against the ground it is drawn on, and `restyle-sheet.mjs`
 * measures that rather than taking this comment for it.
 *
 * @type {Partial<import('../api/cheatsheet/theme.mjs').SheetTheme>}
 */
export const emberTheme = {
  name: EMBER,
  colors: {
    /** The masthead and code panel ground, the footer mark square and type. */
    navy: "#241B2F",
    /** The heading and footer ground, and plain code. */
    white: "#FFFFFF",
    /** The spine, both flanking rules, the divider. A fill at 2.71:1 on white. */
    green: "#E8833A",
    /** The title, the subtitle and the lead-in. */
    heading: "#3A3A40",
    /** The amber that may carry text on a white ground, at 6.25:1. */
    greenOnWhite: "#9A4A10",
  },
  syntax: {
    plain: "#FFFFFF",
    comment: "#B9AEC4",
    identifier: "#FFC38B",
    keyword: "#FFE9A8",
    string: "#F4A9A0",
    number: "#B7E48C",
  },
};

/**
 * The same theme as a design language, for the tools that draw one.
 *
 * `tools/compose-language-asset.mjs` composes a picture **of** a design
 * language - the palette with its measured area shares, the type scale, the
 * census - so it takes a whole record and not a theme, and that is right: the
 * record is its subject rather than its styling. Derived here rather than
 * written out, so the two cannot drift: there is one palette in this file and
 * everything else is a conversion of it.
 *
 * @type {typeof import('../api/cheatsheet/language.mjs').SHEET_LANGUAGE}
 */
export const emberLanguage = languageFor(themeOver(emberTheme));
