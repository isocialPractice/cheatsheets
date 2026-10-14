// Dependency free checks for the document head and the responsive layout in
// index.html. Run with: node --test tools/test-page-structure.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));

test("the html element declares its language", () => {
  assert.match(html, /<html\s+lang="en"\s*>/);
});

test("the head carries a viewport meta tag", () => {
  assert.match(
    html,
    /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1"\s*>/
  );
});

test("the head links the repository favicon", () => {
  const head = html.slice(0, html.indexOf("</head>"));
  assert.match(head, /<link\s+rel="icon"\s+href="favicon\.ico"/);
});

test("the tools panel is no longer pinned to the viewport", () => {
  assert.doesNotMatch(style, /position:\s*fixed/);
});

test("the sheet is no longer pushed clear of the panel by a fixed offset", () => {
  assert.doesNotMatch(style, /margin-left:\s*\d+px/);
});

test("the columns lay out with a wrapping flex row", () => {
  assert.match(style, /div\.row\s*\{[^}]*display:\s*flex/);
  assert.match(style, /div\.row\s*\{[^}]*flex-wrap:\s*wrap/);
});

test("the layout collapses to a single column below the 768px breakpoint", () => {
  const query = style.match(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*$/);
  assert.ok(query, "expected a max-width: 767px media query");
  assert.match(query[0], /flex-direction:\s*column/);
});

test("the sheet scales down rather than overflowing a narrow screen", () => {
  // `min(100%, 900px)` is one rule doing what two used to: it caps the sheet at
  // 900 where there is room and resolves to 100% at every width under it, so
  // the media query no longer needs a `max-width: 100%` of its own.
  assert.match(style, /div\.col div\.sheet\s*\{[^}]*max-width:\s*min\(100%,\s*900px\)/);
  assert.match(style, /div\.col div\.sheet\s*\{[^}]*width:\s*100%/);
  assert.match(style, /div\.col div\.sheet\s*\{[^}]*height:\s*auto/);
});

test("the page's measure is the row it holds, at the sheet's raised cap", () => {
  // 360 for the panel, a space-4 gap, 900 for the sheet and a space-2 gutter
  // each side. The cap and the measure are one figure: capping the sheet at 900
  // inside a 1024px page would cap it at 600 by the column instead.
  assert.match(style, /body\s*\{[^}]*max-width:\s*1324px/);
});

test("the control takes its panel's measure and marks a label it cannot show", () => {
  // Both halves of the cut label, which `tools/test-page-structure-browser.mjs`
  // measures rather than merely reads.
  assert.match(style, /\bselect\s*\{[^}]*width:\s*100%/);
  assert.match(style, /\bselect\s*\{[^}]*text-overflow:\s*ellipsis/);
});

test("the sheet offers a route to its own full size", () => {
  // The cap raise cannot reach a phone, where `min(100%, 900px)` is 100% at
  // every width. The link is what does.
  assert.match(html, /id="sheetFullSize"/);
  assert.match(html, /id="sheetFullSizeLink"[^>]*target="_blank"[^>]*rel="noopener"/);
  assert.match(html, /URL\.createObjectURL/);
  // A blob URL holds its bytes until it is revoked, and one composition per
  // selection accumulates for as long as the reader stays on the page.
  assert.match(html, /URL\.revokeObjectURL/);
});

test("the sheet's box is reserved before anything is composed into it", () => {
  // The frame holds no image and has no intrinsic size, so "height: auto" has
  // nothing to resolve against on its own and the frame would be a zero height
  // line until the graphic arrived. An aspect ratio is what gives it one. The
  // rule carries the catalog's own square canvas, and a selection overwrites it
  // from that entry's recorded dimensions.
  assert.match(style, /div\.col div\.sheet\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/);
});

test("the composed graphic scales off its viewBox rather than its own size", () => {
  // compositionToSvg writes width and height in sheet pixels, which is 3600
  // here, so an svg left as it arrives overflows the column at every width.
  assert.match(style, /div\.col div\.sheet\s*>\s*svg\s*\{[^}]*width:\s*100%/);
  assert.match(style, /div\.col div\.sheet\s*>\s*svg\s*\{[^}]*height:\s*auto/);
});

test("the page loads its logic as a module, which is what lets it import the API", () => {
  assert.match(html, /<script\s+type="module"\s*>/);
});

test("nothing derives a path from an option's display text any more", () => {
  // The catalog keys every option by its slug id, so the helper that stripped
  // the spaces out of a label to build a file name has no caller left. It went
  // out with the hand maintained optgroup rather than being left unreferenced.
  assert.doesNotMatch(html, /removeSpaceInVariable/);
});
