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

test("the image is no longer pushed clear of the panel by a fixed offset", () => {
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

test("the image scales down rather than overflowing a narrow screen", () => {
  assert.match(style, /div\.col img\s*\{[^}]*max-width:\s*600px/);
  assert.match(style, /div\.col img\s*\{[^}]*width:\s*100%/);
  assert.match(style, /div\.col img\s*\{[^}]*height:\s*auto/);
});
