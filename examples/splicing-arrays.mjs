// The document behind `javaScriptArrays/SplicingArrays.jpg`, written out.
//
// One of the eleven hand composed sheets, expressed as the input the
// composition algorithm takes. It is shared by both worked examples beside it,
// which is the whole point of the pair: the *same* document produces the
// original sheet through the recorded design language and a different looking
// sheet through a second theme, so what changed is visibly the theme and not
// the content.
//
// The code lines are the first eight statements of the example script, which
// is what the artwork shows, with the blank rows kept. That script moved into
// the catalog on 2026.09.24 and is now
// `javascript/arrays/splicing-arrays/splicing-arrays.js`; the catalog's own
// document for that folder is a separate transcription of the same payload, so
// this file stays what it has always been - the artwork written out, with the
// artwork's own title and the fixed figures the reproduction is pinned to.
// A blank row is not decoration: it occupies its slot
// exactly like an inked one, and the eleven are measured at 18 to 36 rows
// counting them, so dropping the blanks would compose a sparser sheet than the
// design language contains.

/** @typedef {import('../api/cheatsheet/compose.mjs').SheetDocument} SheetDocument */

/**
 * The sheet, as a document.
 *
 * `wordmark`, `leadIn` and `followLine` are left off deliberately. They are
 * the same text on all eleven sheets, so the algorithm fills them from the
 * brand's own defaults, and a document that repeated them would be one more
 * place for them to be wrong.
 *
 * @type {SheetDocument}
 */
export const splicingArrays = {
  title: "Splicing Array Elements",
  subtitle: "Remove, replace and insert in one call",
  code: [
    { text: "// splice(start, deleteCount, ...items)", role: "comment" },
    { text: "// returns what it removed, and edits in place", role: "comment" },
    { text: "" },
    { text: "var fruits = [\"Banana\", \"Orange\", \"Apple\", \"Mango\"];", role: "identifier" },
    { text: "console.log(fruits.splice(2, 2, \"Lemon\", \"Kiwi\"));", role: "plain" },
    { text: "// (2) ['Apple', 'Mango']", role: "comment" },
    { text: "" },
    { text: "console.log(fruits);", role: "plain" },
    { text: "// (4) ['Banana', 'Orange', 'Lemon', 'Kiwi']", role: "comment" },
    { text: "" },
    { text: "var trees = [\"Maple\", \"Spruce\", \"Palm\"];", role: "identifier" },
    { text: "trees.splice(3, 0, \"Birch\");", role: "plain" },
    { text: "// insert with deleteCount 0, removing nothing", role: "comment" },
    { text: "" },
    { text: "console.log(trees);", role: "plain" },
    { text: "// (4) ['Maple', 'Spruce', 'Palm', 'Birch']", role: "comment" },
    { text: "" },
    { text: "var mapleTrees = [\"Silver\", \"Norway\", \"Bigleaf\"];", role: "identifier" },
    { text: "console.log(trees.splice(0, 1, mapleTrees));", role: "plain" },
  ],
};

/**
 * The seed the examples compose it at.
 *
 * A string rather than a number, and the sheet's own slug rather than anything
 * chosen: a sheet seeded by its slug regenerates identically without anyone
 * having to record a figure beside it.
 */
export const SEED = "splicing-arrays";
