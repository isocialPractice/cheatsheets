// A second theme, so the same document can be drawn twice and compared.
//
// **What a theme is here.** `SHEET_LANGUAGE` is exported from
// `api/cheatsheet/language.mjs` as one object precisely so a caller can pass a
// modified copy rather than reach for module state, and `composeSheet` takes
// it as `options.language`. A theme is therefore a copy of that object with
// some of it replaced - there is no separate theme format to learn, and
// anything the design language records is themeable by the same move.
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

import { SHEET_LANGUAGE } from "../api/cheatsheet/language.mjs";

/**
 * Deep plum and amber: the recorded structure, a different palette.
 *
 * Every ink here clears the 4.5:1 text floor against the ground it is drawn
 * on, and `restyle-sheet.mjs` measures that rather than taking this comment
 * for it.
 *
 * @type {typeof SHEET_LANGUAGE}
 */
export const emberTheme = {
  ...SHEET_LANGUAGE,
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

/** The name the examples print and file their output under. */
export const EMBER = "ember";
