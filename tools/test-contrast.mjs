// WCAG contrast checks over the stylesheet in index.html. Every text and
// background pair the page puts on screen is measured against its floor -
// 4.5:1 for normal text, 3:1 for large text and for a boundary a reader has to
// see the edge of - in both the light and the dark theme.
//
// Nothing here restates a color. The tokens are read out of the stylesheet's
// own custom properties and cross checked against the tables in
// DESIGN_LANGUAGE.md, and each pair names the rule that declares it, so a
// token edited to a failing value, a rule that stops using the token it claims
// to, and a color that appears in neither document all fail rather than pass
// quietly.
//
// The last three cases hold the page's type face the same way, because it was
// declared nowhere at all until 2026.09.14 and the page fell to the browser
// default: the --font token is read out of the stylesheet, checked against the
// stack DESIGN_LANGUAGE.md records under "The page's face", and confirmed to
// be what `body` actually asks for.
//
// Run with: node --test tools/test-contrast.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const designLanguage = readFileSync(join(root, "DESIGN_LANGUAGE.md"), "utf8");

const style = html
  .slice(html.indexOf("<style>") + "<style>".length, html.indexOf("</style>"))
  .replace(/\/\*[\s\S]*?\*\//g, "");

// WCAG 2.1 relative luminance and contrast ratio, from the definitions rather
// than from a table, so any hex the stylesheet grows is measured the same way.
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

// Split the stylesheet into rules, descending into at-rules so a declaration
// inside a media query is found under the query that carries it.
function rules(css, media = null, out = []) {
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] !== "{") continue;
    const selector = css.slice(start, i).trim();
    let depth = 1;
    let j = i + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const body = css.slice(i + 1, j - 1);
    if (selector.startsWith("@")) rules(body, selector, out);
    else out.push({ media, selector, body });
    start = j;
    i = j - 1;
  }
  return out;
}

const ALL_RULES = rules(style);
const DARK_QUERY = "@media (prefers-color-scheme: dark)";

// The two themes, each as the set of custom properties in force. Dark is light
// with whatever the dark query overrides written over it, which is what the
// cascade does.
function tokensFrom(media) {
  const found = {};
  for (const rule of ALL_RULES) {
    if (rule.media !== media || rule.selector !== ":root") continue;
    for (const [, name, value] of rule.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      found[name] = value.trim();
    }
  }
  return found;
}

const LIGHT = tokensFrom(null);
const DARK = { ...LIGHT, ...tokensFrom(DARK_QUERY) };
const THEMES = { light: LIGHT, dark: DARK };

// Every pair the page renders, each naming the rule that declares it.
// "inheritedBy" marks an element that takes the color from that rule rather
// than setting one of its own.
const PAIRS = [
  {
    what: "body text",
    fg: "--text",
    bg: "--page",
    floor: 4.5,
    declaredBy: "body",
  },
  {
    what: "the page title",
    fg: "--text",
    bg: "--page",
    floor: 3,
    declaredBy: "body",
    inheritedBy: "h1",
    why: "h1 is 2rem, which is large text",
  },
  {
    what: "the instructions heading",
    fg: "--text-secondary",
    bg: "--page",
    floor: 3,
    declaredBy: "h3",
    why: "h3 is 1.25rem bold, which is large text",
  },
  {
    what: "an instruction step",
    fg: "--text",
    bg: "--page",
    floor: 4.5,
    declaredBy: "body",
    inheritedBy: "ol",
  },
  {
    what: "a dropdown label",
    fg: "--text-secondary",
    bg: "--page",
    floor: 4.5,
    declaredBy: "label",
  },
  {
    what: "the text inside a dropdown",
    fg: "--text",
    bg: "--page",
    floor: 4.5,
    declaredBy: "select",
  },
  {
    what: "the footnote",
    fg: "--text-secondary",
    bg: "--page",
    floor: 4.5,
    declaredBy: "#showFootNote",
    why: "0.875rem is normal text, so it takes the 4.5:1 floor",
  },
  {
    what: "a dropdown border",
    fg: "--border",
    bg: "--page",
    floor: 3,
    declaredBy: "select",
    why: "a control boundary takes the 3:1 non-text floor",
  },
  {
    what: "the tools panel border",
    fg: "--border",
    bg: "--page",
    floor: 3,
    declaredBy: "div.tools",
  },
  {
    what: "the frame around the cheatsheet image",
    fg: "--border",
    bg: "--page",
    floor: 3,
    declaredBy: "div.col img",
    why: "the sheet's own edges are the mark's navy and near white, so the page has to draw the boundary",
  },
  {
    what: "the focus ring",
    fg: "--accent",
    bg: "--page",
    floor: 3,
    declaredBy: "select:focus-visible",
  },
  {
    what: "the rule under the title",
    fg: "--accent",
    bg: "--page",
    floor: 3,
    declaredBy: "hr",
  },
];

function ruleBody(selector, media = null) {
  const rule = ALL_RULES.find((r) => r.selector === selector && r.media === media);
  assert.ok(rule, `the stylesheet no longer carries a "${selector}" rule`);
  return rule.body;
}

for (const [theme, tokens] of Object.entries(THEMES)) {
  for (const pair of PAIRS) {
    const label = pair.why ? `${pair.what} (${pair.why})` : pair.what;
    test(`${theme}: ${label} clears ${pair.floor}:1`, () => {
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

test("every pair names a rule that really declares it", () => {
  for (const pair of PAIRS) {
    const body = ruleBody(pair.declaredBy);
    assert.match(
      body,
      new RegExp(`var\\(${pair.fg}\\)`),
      `"${pair.declaredBy}" no longer uses ${pair.fg}, which ${pair.what} is measured from`
    );
  }
});

test("the background every pair is measured against is the one body sets", () => {
  assert.match(ruleBody("body"), /background:\s*var\(--page\)/);
  for (const pair of PAIRS) assert.equal(pair.bg, "--page");
});

test("an element said to inherit its color does not set one of its own", () => {
  for (const pair of PAIRS.filter((p) => p.inheritedBy)) {
    const rule = ALL_RULES.find((r) => r.selector === pair.inheritedBy && r.media === null);
    if (!rule) continue;
    assert.doesNotMatch(
      rule.body,
      /(^|[^-\w])color\s*:/,
      `"${pair.inheritedBy}" sets a color of its own, so ${pair.what} is no ` +
        `longer measured from "${pair.declaredBy}"`
    );
  }
});

test("the dark theme overrides every token whose light value will not serve on navy", () => {
  // --border is deliberately not overridden: 4.57:1 on the off white ground and
  // 4.05:1 on the navy, so it clears the 3:1 boundary floor in both themes and
  // one value serves for both.
  for (const name of ["--page", "--text", "--text-secondary", "--accent"]) {
    assert.notEqual(
      DARK[name],
      LIGHT[name],
      `${name} is the same in both themes, so one of the two is unmeasured`
    );
  }
  assert.equal(DARK["--border"], LIGHT["--border"]);
});

test("every color in the stylesheet is one the design language records", () => {
  const declared = new Set(
    [...style.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(([hex]) => hex.toUpperCase())
  );
  assert.ok(declared.size > 0, "the stylesheet declares no colors at all");

  const recorded = new Set(
    [...designLanguage.matchAll(/`(#[0-9a-fA-F]{6})`/g)].map(([, hex]) => hex.toUpperCase())
  );
  for (const hex of declared) {
    assert.ok(
      recorded.has(hex),
      `${hex} is in the stylesheet but in no table in DESIGN_LANGUAGE.md`
    );
  }
});

test("the mark's own green carries nothing on the light theme", () => {
  // The one substitution: #4CAE50 reaches 2.65:1 on the off white ground, so on
  // light it is left to fills and #2E7534 takes every role with an edge or a
  // glyph in it. The mark green is the dark theme's accent and nothing else.
  const green = "#4CAE50";
  assert.ok(ratio(green, LIGHT["--page"]) < 3);
  for (const [name, value] of Object.entries(LIGHT)) {
    assert.notEqual(
      value.toUpperCase(),
      green,
      `the light theme's ${name} is the mark green, which clears no floor on the page`
    );
  }
  assert.equal(DARK["--accent"].toUpperCase(), green);
});

// The stack as the stylesheet declares it, normalised so that spacing and
// quote style are not what a comparison turns on.
function normalizeStack(stack) {
  return stack
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

test("body takes its face from a token rather than from the browser", () => {
  // The omission this replaces was invisible in the source: the rule set a
  // size and a line height and simply said nothing about a family, so there
  // was no wrong value to spot. Both halves are asserted - the token exists,
  // and the rule that is supposed to use it does.
  assert.ok(LIGHT["--font"], "the stylesheet declares no --font token");
  assert.match(
    ruleBody("body"),
    /font-family:\s*var\(--font\)/,
    "body no longer takes font-family from --font, so the page falls to the browser default"
  );
});

test("the face is a stack that needs nothing installed to resolve", () => {
  const families = normalizeStack(LIGHT["--font"]);
  assert.ok(families.length > 1, `--font is "${LIGHT["--font"]}", which is a single family`);
  assert.ok(
    families.includes("system-ui"),
    "the stack names no system-ui, so a machine without the named families falls past the platform's own face"
  );
  assert.ok(
    ["sans-serif", "serif", "monospace", "system-ui"].includes(families.at(-1)),
    `the stack ends in "${families.at(-1)}", which is a family rather than a generic`
  );
});

test("the page's stack is the one the design language records", () => {
  // The same cross check the colors get: the document and the stylesheet have
  // to agree, so neither can be edited into a claim the other does not carry.
  const opens = designLanguage.indexOf("### The page's face");
  assert.notEqual(opens, -1, "DESIGN_LANGUAGE.md has no \"The page's face\" section");
  const recorded = /`([^`]*(?:sans-serif|serif|system-ui)[^`]*)`/.exec(
    designLanguage.slice(opens)
  );
  assert.ok(recorded, "\"The page's face\" records no stack in a code span");
  assert.deepEqual(
    normalizeStack(recorded[1]),
    normalizeStack(LIGHT["--font"]),
    "the stack in DESIGN_LANGUAGE.md is not the stack index.html declares"
  );

  // The page's face is a decision about the page. "The faces are not named"
  // records that the sheets' display face cannot be identified from the
  // artwork, and none of the near misses it names may be borrowed here, or the
  // page's stack reads as an answer to a question the record leaves open.
  const unnamed = designLanguage.indexOf("#### The faces are not named");
  const after = designLanguage.indexOf("### Where the text sits");
  assert.ok(
    unnamed !== -1 && after > unnamed,
    "DESIGN_LANGUAGE.md no longer carries \"The faces are not named\" ahead of \"Where the text sits\""
  );
  const disclaimed = designLanguage.slice(unnamed, after);
  for (const family of normalizeStack(LIGHT["--font"])) {
    assert.ok(
      !disclaimed.includes(family),
      `the page's stack names ${family}, which "The faces are not named" discusses as a candidate for the sheets' face`
    );
  }
});

test("the spacing tokens are whole multiples of the 8px step", () => {
  const step = 8;
  const spacing = Object.entries(LIGHT).filter(([name]) => name.startsWith("--space-"));
  assert.equal(spacing.length, 4, "expected four spacing tokens");
  for (const [name, value] of spacing) {
    const px = Number(/^(\d+)px$/.exec(value)?.[1]);
    assert.ok(Number.isFinite(px), `${name} is "${value}", which is not a pixel length`);
    assert.equal(px % step, 0, `${name} is ${px}px, which is not on the ${step}px step`);
    assert.equal(px / step, Number(name.slice("--space-".length)));
  }
});
