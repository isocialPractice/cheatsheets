#!/usr/bin/env node
// Measures a font stack's advance widths in a real engine, so a composition
// can be laid out in the face a viewer will actually see.
//
// **Why this exists.** The ported `api/graphic-design/font.mjs` measures its
// own built-in single-stroke alphabet, because upstream has no operating
// system to ask for a font and draws every glyph itself. The SVG writer, on
// the other hand, emits live `<text>` and names a family, so the browser draws
// something else entirely. Laying a sheet out from built-in advances and
// rendering it in a grotesque puts every run in the wrong place: measured
// against the one run of the artwork whose text is known - the lead-in,
// "Starting Point for Practical Use:", 1481 px wide at a 112 px cap per
// **Where the text sits** in `DESIGN_LANGUAGE.md` - the built-in alphabet
// predicts 2403 px, which is 62% too wide.
//
// So the widths have to come from a real engine. This script is how they are
// read, and `api/cheatsheet/faces.mjs` is where the result is committed. It is
// run once and its output pasted, rather than run at composition time: the
// page composes sheets in the browser with no Node in reach, and a generated
// sheet has to measure identically on a machine that has no browser at all.
//
// **The table is committed, not resolved per machine, and that is the point.**
// A width table read on the machine that renders would make two machines
// disagree about where a line breaks. One committed table makes every route -
// this page, a Node script, the dependency-free rasterizer - lay out the same
// sheet identically, and leaves the only difference between them the glyph
// shapes, which is what the format was always going to change anyway.
//
// Usage:
//   node tools/measure-font-widths.mjs              # the report
//   node tools/measure-font-widths.mjs --json       # the same figures as JSON
//   node tools/measure-font-widths.mjs --emit       # the committed table's body
//
// Needs Playwright. Install with:
//   npm install -g @playwright/test && npx playwright install chromium
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { measureText } from "../api/graphic-design/font.mjs";

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. This is the resolution
// `tools/test-page-structure-browser.mjs` settled, kept identical here so a
// machine that runs one runs the other.
function candidateBases() {
  const bases = [import.meta.url];
  const globals = [];
  if (process.platform === "win32" && process.env.APPDATA) {
    globals.push(join(process.env.APPDATA, "npm", "node_modules"));
  }
  globals.push("/usr/local/lib/node_modules", "/usr/lib/node_modules");
  for (const dir of globals) {
    bases.push(pathToFileURL(join(dir, "resolve-from-here.js")).href);
    bases.push(pathToFileURL(join(dir, "@playwright", "test", "index.js")).href);
  }
  return bases;
}

async function loadChromium() {
  const named = process.env.PLAYWRIGHT_MODULE;
  const specifiers = named ? [named] : [];
  for (const base of candidateBases()) {
    const require = createRequire(base);
    for (const name of ["playwright", "playwright-core"]) {
      try {
        specifiers.push(pathToFileURL(require.resolve(name)).href);
      } catch {
        // Not installed at this base, which is the ordinary case for all but
        // one of them.
      }
    }
  }
  for (const specifier of specifiers) {
    try {
      const module = await import(specifier);
      const chromium = module.chromium ?? module.default?.chromium;
      if (chromium) return { chromium };
    } catch {
      // Try the next one.
    }
  }
  return {
    reason:
      "Playwright is not installed. Run `npm install -g @playwright/test && " +
      "npx playwright install chromium`, or point PLAYWRIGHT_MODULE at a copy.",
  };
}

/** Every character the built-in glyph table carries: printable ASCII. */
const CHARSET = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");

/** Units per em the committed table is expressed in, as a font file would be. */
const UNITS_PER_EM = 1000;

/**
 * The stack a generated sheet names, and the families it is expected to fall
 * through. `Helvetica`, `Arial` and `Liberation Sans` were drawn to one set of
 * advances, which is the whole reason one committed table can serve all three.
 * Measuring them separately is what turns that from a claim into a check.
 */
const STACK = '"Helvetica Neue", Arial, system-ui, sans-serif';
const FAMILIES = [
  { name: "stack", css: STACK },
  { name: "Arial", css: "Arial" },
  { name: "Helvetica", css: "Helvetica" },
  { name: "Helvetica Neue", css: '"Helvetica Neue"' },
  { name: "Liberation Sans", css: '"Liberation Sans"' },
  { name: "system-ui", css: "system-ui" },
];

/**
 * The one run of artwork whose text is known, from **Where the text sits** in
 * `DESIGN_LANGUAGE.md`. Its width and its cap height are what a candidate face
 * is checked against.
 */
const LEAD_IN = { text: "Starting Point for Practical Use:", width: 1481, cap: 112 };

/** Runs the measurement in a page and returns everything read. */
async function measure(page) {
  return page.evaluate(
    ({ charset, unitsPerEm, families, leadIn }) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const out = {};
      for (const family of families) {
        ctx.font = `${unitsPerEm}px ${family.css}`;
        const resolved = ctx.font;
        const advances = {};
        for (const char of charset) advances[char] = ctx.measureText(char).width;
        const cap = ctx.measureText("H").actualBoundingBoxAscent;
        const xHeight = ctx.measureText("x").actualBoundingBoxAscent;
        const descender = ctx.measureText("g").actualBoundingBoxDescent;
        // Summed per character against the whole string in one call: the
        // difference is kerning, which a per-character table cannot carry.
        const summed = Array.from(leadIn.text).reduce((n, c) => n + (advances[c] ?? 0), 0);
        const whole = ctx.measureText(leadIn.text).width;
        out[family.name] = { resolved, advances, cap, xHeight, descender, summed, whole };
      }
      return out;
    },
    { charset: CHARSET, unitsPerEm: UNITS_PER_EM, families: FAMILIES, leadIn: LEAD_IN }
  );
}

/** Rounds to a whole em unit, which is the precision a font file carries. */
const unit = (n) => Math.round(n);

function report(read) {
  const base = read.stack;
  const lines = [];
  lines.push(`Reference size: ${UNITS_PER_EM} units per em. ${CHARSET.length} characters measured.`);
  lines.push("");
  lines.push(`The stack a sheet names: ${STACK}`);
  lines.push(`Chromium resolved it as: ${base.resolved}`);
  lines.push("");
  lines.push("## Do the fall-through families share one set of advances");
  lines.push("");
  lines.push("| Family | Resolved | Cap | x-height | Widest disagreement with the stack |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const family of FAMILIES) {
    const m = read[family.name];
    if (!m) continue;
    let worst = 0;
    let worstChar = "";
    for (const char of CHARSET) {
      const delta = Math.abs(m.advances[char] - base.advances[char]);
      if (delta > worst) {
        worst = delta;
        worstChar = char;
      }
    }
    const share = ((worst / UNITS_PER_EM) * 100).toFixed(2);
    lines.push(
      `| ${family.name} | ${m.resolved} | ${unit(m.cap)} | ${unit(m.xHeight)} | ` +
        `${unit(worst)} units (${share}% of the em) on "${worstChar === " " ? "space" : worstChar}" |`
    );
  }
  lines.push("");
  lines.push("## What a per-character table costs against the engine's own run");
  lines.push("");
  lines.push("| Family | Summed per character | Measured whole | Difference |");
  lines.push("| --- | --- | --- | --- |");
  for (const family of FAMILIES) {
    const m = read[family.name];
    if (!m) continue;
    const delta = m.whole - m.summed;
    const share = ((delta / m.whole) * 100).toFixed(3);
    lines.push(
      `| ${family.name} | ${unit(m.summed)} | ${unit(m.whole)} | ${delta >= 0 ? "+" : ""}${unit(delta)} units (${share}%) |`
    );
  }
  lines.push("");
  lines.push("## Against the one run of artwork whose text is known");
  lines.push("");
  lines.push(`Lead-in: "${LEAD_IN.text}", ${LEAD_IN.width} px wide at a ${LEAD_IN.cap} px cap.`);
  lines.push("");
  lines.push("| Face | Width at that cap | Against the artwork |");
  lines.push("| --- | --- | --- |");
  const builtinSize = (LEAD_IN.cap * 15) / 11;
  const builtinWidth = measureText(LEAD_IN.text, { fontSize: builtinSize });
  lines.push(
    `| built-in alphabet | ${builtinWidth.toFixed(0)} px | ` +
      `${((builtinWidth / LEAD_IN.width - 1) * 100).toFixed(1)}% |`
  );
  for (const family of FAMILIES) {
    const m = read[family.name];
    if (!m) continue;
    // Scale the measured em so the face's own cap lands on the artwork's cap.
    const size = (LEAD_IN.cap / m.cap) * UNITS_PER_EM;
    const width = (m.summed / UNITS_PER_EM) * size;
    lines.push(
      `| ${family.name} | ${width.toFixed(0)} px | ${((width / LEAD_IN.width - 1) * 100).toFixed(1)}% |`
    );
  }
  const size = (LEAD_IN.cap / base.cap) * UNITS_PER_EM;
  const stackWidth = (base.summed / UNITS_PER_EM) * size;
  lines.push("");
  lines.push(
    `Condensation of the artwork's face against the stack: ${(LEAD_IN.width / stackWidth).toFixed(4)}`
  );
  return lines.join("\n");
}

/** The committed table's body, ready to paste into `api/cheatsheet/faces.mjs`. */
function emit(read) {
  const base = read.stack;
  const entries = Array.from(CHARSET)
    .map((char) => `  ${JSON.stringify(char)}: ${unit(base.advances[char])},`)
    .join("\n");
  const size = (LEAD_IN.cap / base.cap) * UNITS_PER_EM;
  const stackWidth = (base.summed / UNITS_PER_EM) * size;
  return [
    `// Measured with tools/measure-font-widths.mjs against ${base.resolved}.`,
    `export const STACK_UNITS_PER_EM = ${UNITS_PER_EM};`,
    `export const STACK_CAP_HEIGHT = ${unit(base.cap)};`,
    `export const STACK_X_HEIGHT = ${unit(base.xHeight)};`,
    `export const STACK_DESCENDER = ${unit(base.descender)};`,
    `export const SHEET_CONDENSATION = ${(LEAD_IN.width / stackWidth).toFixed(4)};`,
    `const STACK_ADVANCES = {`,
    entries,
    `};`,
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const loaded = await loadChromium();
  if (!loaded.chromium) {
    console.error(loaded.reason);
    process.exitCode = 1;
    return;
  }
  const browser = await loaded.chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><title>font widths</title>");
    const read = await measure(page);
    if (args.includes("--json")) console.log(JSON.stringify(read, null, 2));
    else if (args.includes("--emit")) console.log(emit(read));
    else console.log(report(read));
  } finally {
    await browser.close();
  }
}

await main();
