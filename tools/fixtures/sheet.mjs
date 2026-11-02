// The one document every committed render in this folder is a render of.
//
// `shapes.mjs` beside this is the drawing surface's fixture: a composition built
// by hand that draws every element kind. This is the **cheatsheet layer's** -
// a document, which is what the layer takes, with a seed beside it because a
// sheet composes from one.
//
// ## Why it is a module of its own rather than a const in a test
//
// Two files pin it, at two layers, and neither is the other's.
//
// | File | Pins |
// | --- | --- |
// | `tools/test-render-fixture.mjs` | The composition: where the ink landed, and what the variation reported |
// | `tools/test-render-formats.mjs` | The output surface: what each of the five formats made of it |
//
// Held as a const in the first of those, the second had to copy it - and a
// copied fixture drifts silently, because the two files pin different artifacts
// and nothing compares them. The day the copy diverged, one file would be
// pinning a sheet the other had never rendered, and both would pass.
//
// `tools/fixtures/` is not swept by `node --test`: the command's default
// patterns match `test-*.mjs` and this is not one, which is the same reason
// `shapes.mjs` can live here. See `tools/test-suite-invocation.mjs`.
//
// ## What it is, and what it is not
//
// A real sheet in the **compact** shape - a title, a subtitle and nineteen
// lines of worked JavaScript - because that is the shape the twenty-eight
// committed `sheet.json` documents are written in and therefore the one worth
// pinning.
// It names no `language`, which pins the per-line colouring path every
// `sheet.json` still falls back to rather than the token path highlight.js
// owns; a raster pinned over a reading on somebody else's release schedule
// would fail on their changes rather than on this repository's.
//
// It is not a demonstration. `examples/splicing-arrays.mjs` is the document a
// reader is shown, and it is free to be rewritten for clarity whenever the
// examples are. This one is frozen by what is committed beside it: changing a
// line here changes the SVG, the raster digest and the variation report, so it
// changes only when the change is the point.

/** The seed the committed renders were taken at. */
export const FIXTURE_SEED = "splicing-arrays";

/**
 * The fixture document.
 *
 * Returned fresh from a function rather than exported as a const, so a test
 * that spreads it, adds a field or hands it to something that holds a reference
 * cannot reach the copy the next test reads.
 *
 * @returns {import('../../api/cheatsheet/document.mjs').CompactDocument}
 */
export function fixtureDocument() {
  return {
    title: "Splicing Array Elements",
    subtitle: "Splice Array",
    code: [
      { text: "var fruits = ['Banana', 'Orange', 'Apple', 'Mango'];", role: "plain" },
      { text: "console.log(fruits.splice(2, 2, 'Lemon', 'Kiwi'));", role: "plain" },
      { text: "// (2) ['Apple', 'Mango']", role: "comment" },
      { text: "", role: "plain" },
      { text: "var trees = ['Maple', 'Spruce', 'Palm'];", role: "plain" },
      { text: "trees.splice(3, 0, 'Birch');", role: "plain" },
      { text: "// (4) ['Maple', 'Spruce', 'Palm', 'Birch']", role: "comment" },
      { text: "", role: "plain" },
      { text: "var mapleTrees = ['Silver', 'Norway', 'Bigleaf'];", role: "plain" },
      { text: "console.log(mapleTrees.length);", role: "plain" },
      { text: "// 3", role: "comment" },
      { text: "", role: "plain" },
      { text: "var sliced = fruits.slice(1, 3);", role: "plain" },
      { text: "console.log(sliced.join(' and '));", role: "plain" },
      { text: "// Orange and Apple", role: "comment" },
      { text: "", role: "plain" },
      { text: "var joined = fruits.concat(trees, mapleTrees);", role: "plain" },
      { text: "console.log(joined.indexOf('Birch'));", role: "plain" },
      { text: "// 6", role: "comment" },
    ],
  };
}
