// Dependency free checks over the documentation site in `docs/`.
//
// **Why a test and not a convention.** The documentation moved out of
// `README.md` on 2026.11.08 into thirteen hand written pages, and the menu that
// reaches them is static markup repeated on every one of them. That repetition
// is deliberate - it is what lets the whole site read with JavaScript off - and
// it is exactly the shape that drifts: a page added to the menu on twelve pages
// and forgotten on the thirteenth is invisible to whoever is reading the twelve.
//
// So the menu is held byte for byte across the pages, in both directions: every
// entry names a file that exists, and every file is named by an entry. The same
// for the links out of the prose, which are relative and therefore resolve
// locally, and for the links the README points back at the site with.
//
// The contrast cases are the ones `tools/test-contrast.mjs` performs over
// `index.html`, measured again over `docs/docs.css` because the site grew two
// grounds the app page does not have: a code surface per theme, which carries
// body ink, an accent link and a one pixel border. Nothing here restates a
// color - the tokens are read out of the stylesheet and cross checked against
// the tables in `DESIGN_LANGUAGE.md`, so a token edited to a failing value and
// a color in neither document both fail rather than pass quietly.
//
// Run with: node --test tools/test-docs-site.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docs = join(root, "docs");

const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

const PAGES = readdirSync(docs)
  .filter((name) => name.endsWith(".html"))
  .sort();
const SOURCE = new Map(PAGES.map((name) => [name, read("docs", name)]));

// The menu is one element with a known id, so it is lifted by its boundaries
// rather than parsed. `aria-current` is the one attribute a page writes into
// its own copy, so comparing copies means normalising it away first.
function menuOf(html) {
  const opens = html.indexOf('<nav id="docs-menu"');
  assert.notEqual(opens, -1, "the page carries no menu");
  const closes = html.indexOf("</nav>", opens);
  assert.notEqual(closes, -1, "the page's menu is not closed");
  return html.slice(opens, closes + "</nav>".length);
}

const normalise = (menu) => menu.replace(/ aria-current="page"/g, "");

test("there are pages to check at all", () => {
  assert.ok(PAGES.length > 1, `docs/ holds ${PAGES.length} pages`);
  assert.ok(PAGES.includes("index.html"), "docs/ has no index.html to arrive at");
});

test("every page carries the same menu, to the byte", () => {
  const first = normalise(menuOf(SOURCE.get("index.html")));
  for (const [name, html] of SOURCE) {
    assert.equal(
      normalise(menuOf(html)),
      first,
      `the menu in docs/${name} is not the one docs/index.html carries`
    );
  }
});

test("a page marks itself in the menu, and marks nothing else", () => {
  for (const [name, html] of SOURCE) {
    const marked = [...menuOf(html).matchAll(/<a aria-current="page" href="([^"]+)"/g)];
    assert.equal(marked.length, 1, `docs/${name} marks ${marked.length} menu entries as current`);
    assert.equal(
      marked[0][1],
      name,
      `docs/${name} marks "${marked[0][1]}" as the page being read`
    );
  }
});

test("every menu entry names a page that exists, and every page is in the menu", () => {
  const entries = [...menuOf(SOURCE.get("index.html")).matchAll(/href="([^"]+\.html)"/g)]
    .map(([, href]) => href)
    .filter((href) => !href.startsWith("../"));
  for (const href of entries) {
    assert.ok(existsSync(join(docs, href)), `the menu links docs/${href}, which does not exist`);
  }
  for (const name of PAGES) {
    assert.ok(entries.includes(name), `docs/${name} is not reachable from the menu`);
  }
});

test("the menu reaches the page the site documents", () => {
  const menu = menuOf(SOURCE.get("index.html"));
  assert.match(menu, /href="\.\.\/index\.html"/, "the menu does not link back to the example page");
});

test("every relative link resolves to a file in the repository", () => {
  for (const [name, html] of SOURCE) {
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|#)/.test(href)) continue;
      const [path] = href.split("#");
      if (!path) continue;
      const resolved = posix.normalize(posix.join("docs", path));
      assert.ok(
        existsSync(join(root, resolved)),
        `docs/${name} links "${href}", which resolves to ${resolved} and is not there`
      );
    }
  }
});

test("every fragment a page links to is an id that page carries", () => {
  for (const [name, html] of SOURCE) {
    for (const [, href] of html.matchAll(/href="(#[^"]+)"/g)) {
      const id = href.slice(1);
      assert.match(
        html,
        new RegExp(`id="${id}"`),
        `docs/${name} links "${href}", and carries no element with that id`
      );
    }
  }
});

test("every page is a document a reader can get into", () => {
  for (const [name, html] of SOURCE) {
    assert.match(html, /<html\s+lang="en"\s*>/, `docs/${name} declares no language`);
    assert.match(
      html,
      /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1"\s*>/,
      `docs/${name} carries no viewport meta tag, so it does not read on a phone`
    );
    assert.match(
      html,
      /<link\s+rel="stylesheet"\s+href="docs\.css"\s*>/,
      `docs/${name} loads no stylesheet`
    );
    assert.match(html, /<title>[^<]+<\/title>/, `docs/${name} has no title`);
    assert.match(html, /<main id="content">/, `docs/${name} has no main element to skip to`);
    // Thirteen menu entries stand between the top of the document and the
    // text, so the first thing in the tab order is the way past them.
    assert.match(
      html,
      /<a class="skip" href="#content">/,
      `docs/${name} offers no way past the menu for a reader arriving by keyboard`
    );
    assert.equal((html.match(/<h1>/g) || []).length, 1, `docs/${name} has other than one h1`);
  }
});

test("nothing on the site needs a script to be read", () => {
  // The menu is fixed above the breakpoint and the top of the document below
  // it, which is what removes the need for a collapse and with it the only
  // reason the site had to load anything.
  for (const [name, html] of SOURCE) {
    assert.doesNotMatch(html, /<script/, `docs/${name} loads a script`);
    assert.doesNotMatch(html, /\son\w+="/, `docs/${name} carries an inline event handler`);
  }
});

test("the README points at pages that exist, and names the two short records", () => {
  const readme = read("README.md");
  const linked = [
    ...readme.matchAll(/https:\/\/isocialpractice\.github\.io\/cheatsheets\/docs\/([\w-]+\.html)/g),
  ].map(([, name]) => name);
  assert.ok(linked.length > 0, "README.md links no documentation page at all");
  for (const name of linked) {
    assert.ok(existsSync(join(docs, name)), `README.md links docs/${name}, which does not exist`);
  }
  assert.ok(linked.includes("index.html"), "README.md does not link the documentation's entry page");

  // The two the site carries but the README reaches as files instead, because
  // a reader on github.com gets them rendered and a reader on the site gets
  // the page.
  for (const file of ["QUICKSTART.md", "CHEATSHEET.md"]) {
    assert.ok(existsSync(join(root, file)), `${file} is not in the repository`);
    assert.ok(readme.includes(`(${file})`), `README.md does not link ${file}`);
  }
});

// The front door's own job: a section whose detail moved to a page says so in
// its heading, rather than leaving a reader to find the menu.
test("every level 2 heading in the README is a link to the site", () => {
  for (const [, heading] of read("README.md").matchAll(/^## (.+)$/gm)) {
    assert.match(
      heading,
      /^\[[^\]]+\]\(https:\/\/isocialpractice\.github\.io\/cheatsheets\/docs\/[\w-]+\.html\)$/,
      `the README heading "${heading}" does not link its page on the site`
    );
  }
});

// WCAG 2.1 relative luminance and contrast ratio, from the definitions rather
// than from a table, as `tools/test-contrast.mjs` reads them.
function channel(eightBit) {
  const c = eightBit / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`not a six digit hex color: ${hex}`);
  const n = parseInt(match[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function ratio(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const CSS = read("docs", "docs.css").replace(/\/\*[\s\S]*?\*\//g, "");
const DARK_OPENS = "@media (prefers-color-scheme: dark)";

// The custom properties in force per theme. Dark is light with the dark query
// written over it, which is what the cascade does.
function tokensFrom(source) {
  const found = {};
  for (const [, name, value] of source.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    found[name] = value.trim();
  }
  return found;
}

// The dark query holds one `:root` block and nothing else, so the query's own
// closing brace is the second one at the start of a line.
function darkRoot(source) {
  const query = source.slice(source.indexOf(DARK_OPENS));
  const root = query.slice(query.indexOf(":root"));
  return root.slice(0, root.indexOf("}"));
}

const LIGHT = tokensFrom(CSS.slice(0, CSS.indexOf(DARK_OPENS)));
const DARK = { ...LIGHT, ...tokensFrom(darkRoot(CSS)) };

const PAIRS = [
  { what: "body text", fg: "--text", bg: "--page", floor: 4.5 },
  { what: "secondary text", fg: "--text-secondary", bg: "--page", floor: 4.5 },
  { what: "a link", fg: "--accent", bg: "--page", floor: 4.5 },
  { what: "a boundary", fg: "--border", bg: "--page", floor: 3 },
  { what: "a listing", fg: "--text", bg: "--code", floor: 4.5 },
  { what: "a link inside a code span", fg: "--accent", bg: "--code", floor: 4.5 },
  { what: "a listing's border", fg: "--border", bg: "--code", floor: 3 },
];

for (const [theme, tokens] of Object.entries({ light: LIGHT, dark: DARK })) {
  for (const pair of PAIRS) {
    test(`${theme}: ${pair.what} clears ${pair.floor}:1`, () => {
      const fg = tokens[pair.fg];
      const bg = tokens[pair.bg];
      assert.ok(fg, `the ${theme} theme declares no ${pair.fg}`);
      assert.ok(bg, `the ${theme} theme declares no ${pair.bg}`);
      const measured = ratio(fg, bg);
      assert.ok(
        measured >= pair.floor,
        `${pair.what} is ${fg} on ${bg}, which is ${measured.toFixed(2)}:1 and ` +
          `under the ${pair.floor}:1 floor`
      );
    });
  }
}

test("every color in the site's stylesheet is one the design language records", () => {
  const declared = new Set(
    [...CSS.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(([hex]) => hex.toUpperCase())
  );
  assert.ok(declared.size > 0, "the stylesheet declares no colors at all");
  const recorded = new Set(
    [...read("DESIGN_LANGUAGE.md").matchAll(/`(#[0-9a-fA-F]{6})`/g)].map(([, hex]) =>
      hex.toUpperCase()
    )
  );
  for (const hex of declared) {
    assert.ok(
      recorded.has(hex),
      `${hex} is in docs/docs.css but in no table in DESIGN_LANGUAGE.md`
    );
  }
});

test("the tokens the site shares with the app page carry the app page's values", () => {
  // One record, two stylesheets. A color corrected in `index.html` and not here
  // would leave the site a theme of its own that nothing says it has.
  const page = read("index.html");
  const style = page
    .slice(page.indexOf("<style>") + "<style>".length, page.indexOf("</style>"))
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const pageLight = tokensFrom(style.slice(0, style.indexOf(DARK_OPENS)));
  const pageThemes = {
    light: pageLight,
    dark: { ...pageLight, ...tokensFrom(darkRoot(style)) },
  };
  const shared = [
    "--page",
    "--text",
    "--text-secondary",
    "--border",
    "--accent",
    "--font",
    "--space-1",
    "--space-2",
    "--space-3",
    "--space-4",
    "--radius",
  ];
  for (const [theme, tokens] of Object.entries({ light: LIGHT, dark: DARK })) {
    for (const name of shared) {
      assert.ok(tokens[name], `the site's ${theme} theme declares no ${name}`);
      assert.equal(
        tokens[name],
        pageThemes[theme][name],
        `${name} is "${tokens[name]}" on the site and "${pageThemes[theme][name]}" on the ` +
          `app page, in the ${theme} theme`
      );
    }
  }
});

test("the spacing tokens are whole multiples of the 8px step", () => {
  const spacing = Object.entries(LIGHT).filter(([name]) => name.startsWith("--space-"));
  assert.equal(spacing.length, 4, "expected four spacing tokens");
  for (const [name, value] of spacing) {
    const px = Number(/^(\d+)px$/.exec(value)?.[1]);
    assert.ok(Number.isFinite(px), `${name} is "${value}", which is not a pixel length`);
    assert.equal(px % 8, 0, `${name} is ${px}px, which is not on the 8px step`);
    assert.equal(px / 8, Number(name.slice("--space-".length)));
  }
});

test("the menu is fixed where there is room for one", () => {
  // "Always fixed in position" is the rule the site is built to. Below the
  // breakpoint the menu is the top of the document instead, and the fixed
  // anchor in the corner is what keeps it reachable from a long page.
  const wide = CSS.slice(CSS.indexOf("@media (min-width: 900px)"));
  assert.match(
    wide,
    /nav\.menu\s*\{[^}]*position:\s*fixed/,
    "the menu is not fixed on a wide screen"
  );
  assert.match(
    wide,
    /nav\.menu\s*\{[^}]*overflow-y:\s*auto/,
    "the fixed menu cannot scroll past the fold"
  );
  assert.match(
    CSS,
    /a\.contents\s*\{[^}]*position:\s*fixed/,
    "nothing fixed puts a narrow reader back at the menu"
  );
  assert.match(
    wide,
    /a\.contents\s*\{[^}]*display:\s*none/,
    "the narrow screen's anchor is still drawn beside a fixed menu"
  );
});

// The two records the instructions ask for are files in the repository and
// pages on the site, which is two copies of one text. Holding the listings
// equal is what stops one being corrected and the other not.
for (const [markdown, page] of [
  ["QUICKSTART.md", "quickstart.html"],
  ["CHEATSHEET.md", "cheatsheet.html"],
]) {
  test(`${markdown} and docs/${page} carry the same listings`, () => {
    const fenced = [...read(markdown).matchAll(/```[\w]*\n([\s\S]*?)```/g)].map(([, body]) =>
      body.replace(/\s+$/, "")
    );
    const unescape = (text) =>
      text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
    const blocks = [
      ...read("docs", page).matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g),
    ].map(([, body]) => unescape(body).replace(/\s+$/, ""));
    assert.deepEqual(
      blocks,
      fenced,
      `the listings in ${markdown} and docs/${page} have gone out of step`
    );
  });
}
