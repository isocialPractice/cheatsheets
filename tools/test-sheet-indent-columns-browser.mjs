// Drives a real engine over every committed sheet and asks whether the indents
// a `sheet.json` declares are the columns a reader sees.
//
// **A third browser file reading a drawn code panel, and the only one that
// compares one line with another.**
// `tools/test-sheet-accent-seams-browser.mjs` measures a boundary between two
// runs of one line; `tools/test-sheet-accent-ink-browser.mjs` measures a whole
// line against the engine's own layout of it. Both read a line in isolation, so
// a line that is internally perfect and begins in the wrong place passes both -
// which is how **Padded Continuation 1** reached the catalog.
//
// The defect it was found by was a two-line `box-shadow` whose second value was
// padded with fourteen spaces so it would sit under the first. That is the
// right arithmetic in a monospace face and the wrong arithmetic in this one:
// the code panel is set in the sheet's own proportional stack, where fourteen
// spaces are worth 211.1 composition units and `  box-shadow: ` is worth 352.7.
// Measured in Chromium on 2026.10.23, the continuation was set **141.6 units
// left** of the value it was padded to sit under, or 35.4 px at the page's cap.
//
// ## What this file holds a sheet to
//
// Three claims. Two are read off the drawn glyphs:
//
// - **An indent is a column.** Every line declaring the same leading
//   whitespace begins within a page pixel of one x. The panel is set in one
//   face at one size, so this is arithmetic rather than a tolerance - the
//   catalog holds it to a thousandth of a unit - and the floor is a page pixel
//   because that is the figure a reader could see.
// - **A deeper indent is further right.** Where one line is indented deeper
//   than the line above it, its first glyph is set right of that line's first
//   glyph.
//
// **Neither of those two catches a padded continuation, and that was measured
// rather than assumed.** Run against the sheet before its fix, both passed:
// the padded line begins at 739.110 against the `  box-shadow:` line's
// 558.159, so it is further right than the line above it, and indent 14 had
// one line on the sheet, so its column agreed with itself. What the reader saw
// is a line out of column with a value *inside* the line above, and no
// comparison between two line starts can see that. So there is a third claim,
// and it is the one that fails on the defect:
//
// - **The indents a sheet declares form a contiguous ladder of one unit.**
//   `0, u, 2u, 3u ...` with every rung used. That is the only shape nesting
//   takes, and a padded column cannot be written without breaking it: the
//   padding is measured in characters of the line above rather than in levels,
//   so it lands on a rung that is not there. The defect's sheet declared
//   `0, 2, 4, 14`; fixed, it declares `0, 2, 4`.
//
// The ladder is read from `sheet.json` and needs no browser, which is why it
// catches the next one cheaply. It is in this file rather than beside the
// document checks because the reason it is a rule at all is the drawn sheet,
// and the two cases above are what state that.
//
// ## The first visible glyph, not the pen
//
// Both of the drawn claims are read from the first glyph of a line that draws
// ink, and the distinction matters. A run's leading spaces are folded into it on some lines
// and skipped on others - the composer draws no element for a run of nothing
// but spaces - so a line's elements do not agree about whether the indent is
// inside the first run or in front of it. Comparing the pen positions reads a
// correctly indented `"  );"` as thirty units out of its column, which is a
// clean sheet reported as broken.
//
// So the mapping below walks each run forward through the line it belongs to,
// the way the ink file's does, and takes the first character of the first run
// that is not whitespace. The indent itself is read off `sheet.json`, which is
// where an author declares it, rather than off the drawn markup, which is where
// it may have been folded away.
//
// Composed in Node, drawn in Chromium at the page's own cap, measured in
// composition units and reported in page pixels. Nothing is added to the
// repository for it - Playwright is looked for at run time in the places it is
// actually installed and every case skips with the reason where it is absent.
// Install it for a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// No server: the composition is the subject, not the page.
//
// Run with: node --test tools/test-sheet-indent-columns-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { composeSheet, prepareAccents } from "../api/cheatsheet/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. Identical to the two
// sibling files, so a machine that runs one runs all three.
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
        // Not installed at this base, the ordinary case for all but one.
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

/** The widest the page draws a sheet, from the `div.sheet` rule in index.html. */
const PAGE_CAP = 900;

/** Composition units across, which is the canvas the design language records. */
const CANVAS = 3600;

/** Composition units to page pixels, so a floor is a figure a reader could see. */
const SCALE = PAGE_CAP / CANVAS;

/**
 * How far two lines sharing an indent may begin apart, in page pixels.
 *
 * One face, one size, one prefix of spaces: the right answer is zero and the
 * catalog measures within a thousandth of a unit of it. The floor is a page
 * pixel anyway, for the reason the sibling files give - the claim is about what
 * a reader can see, and a tolerance tighter than the display cannot be read off
 * a capture to check.
 */
const COLUMN_FLOOR_PX = 1;

/** Every cheatsheet the committed catalog holds, in the order it lists them. */
async function catalogPaths() {
  const manifest = JSON.parse(await readFile(join(root, "cheatsheets.json"), "utf8"));
  return manifest.categories.flatMap((category) => category.cheatsheets.map((sheet) => sheet.path));
}

const runtime = await loadChromium();
const skip = runtime.chromium ? false : runtime.reason;

let browser;
let page;
if (!skip) {
  browser = await runtime.chromium.launch();
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
}

// The reader, so a panel coloured token by token is drawn as the page draws it.
// A sheet drawn without it is one run per line, which these cases would still
// read correctly - but it would not be the sheet anybody sees, so it is
// asserted rather than assumed in the first case below.
const reader = skip ? { ready: false, reason: skip } : await prepareAccents();

after(async () => {
  await browser?.close();
});

/**
 * Reads a drawn sheet: for each code line, where its first visible glyph is set.
 *
 * Runs over `texts` so a run can be mapped back onto its line. The mapping is a
 * cursor walked forward through the line: the runs tile it, and anything the
 * cursor skips is a space-only run the composer drew no element for. A skip that
 * is not blank means the mapping is wrong rather than the sheet, so it is
 * reported rather than measured around.
 */
const READ_INK_STARTS = ({ selector, texts }) => {
  const svg = document.querySelector(selector);
  if (!svg) throw new Error(`nothing matched ${selector}`);

  const lines = new Map();
  for (const part of svg.querySelectorAll('text[data-name^="code-"]')) {
    const name = part.getAttribute("data-name");
    const split = /^code-(\d+)-(\d+)$/.exec(name);
    const whole = /^code-(\d+)$/.exec(name);
    if (!split && !whole) continue;
    const index = Number((split ?? whole)[1]);
    const entry = lines.get(index) ?? { index, runs: [] };
    entry.runs.push({ part: split ? Number(split[2]) : 0, element: part });
    lines.set(index, entry);
  }

  const out = [];
  for (const line of [...lines.values()].sort((a, b) => a.index - b.index)) {
    line.runs.sort((a, b) => a.part - b.part);
    const text = texts[line.index];
    const row = { index: line.index, text, runs: line.runs.length };

    let cursor = 0;
    let bad = null;
    let ink = null;
    for (const { element } of line.runs) {
      const tspan = element.querySelector("tspan");
      const runText = tspan ? tspan.textContent : element.textContent;
      const at = text.indexOf(runText, cursor);
      if (at < 0) {
        bad = `run ${JSON.stringify(runText)} is not in the line at or after ${cursor}`;
        break;
      }
      if (text.slice(cursor, at).trim().length > 0) {
        bad = `the composer skipped ${JSON.stringify(text.slice(cursor, at))}, which is not blank`;
        break;
      }
      if (ink === null) {
        // The first character of this run that draws something. A run may open
        // with the line's indent folded into it, and the pen is then an indent
        // left of the ink - which is the reading this whole file exists to
        // avoid taking.
        for (let j = 0; j < runText.length; j += 1) {
          if (runText[j].trim().length === 0) continue;
          ink = { at: at + j, char: runText[j], x: element.getExtentOfChar(j).x };
          break;
        }
      }
      cursor = at + runText.length;
    }

    if (bad) row.unreadable = bad;
    else if (ink) row.ink = ink;
    else if (text.trim().length > 0) row.unreadable = "the line holds ink and drew none";
    out.push(row);
  }

  return out;
};

/** Composes a sheet, draws it at the page's cap, and reads its ink starts back. */
async function inkStartsOf(path) {
  const doc = JSON.parse(await readFile(join(root, ...path.split("/"), "sheet.json"), "utf8"));
  const texts = doc.code.map((line) => line.text);
  const { composition } = composeSheet(doc, { seed: doc.seed });
  await page.setContent('<!doctype html><style>html,body{margin:0}</style><div id="host"></div>');
  await page.evaluate(
    ({ markup, width }) => {
      const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
      if (parsed.documentElement.nodeName === "parsererror") throw new Error("the SVG did not parse");
      const host = document.getElementById("host");
      host.replaceChildren(document.importNode(parsed.documentElement, true));
      const svg = host.firstElementChild;
      svg.setAttribute("id", "drawn");
      svg.setAttribute("width", String(width));
      svg.removeAttribute("height");
    },
    { markup: composition.toSVG(), width: PAGE_CAP }
  );
  const rows = await page.evaluate(READ_INK_STARTS, { selector: "#drawn", texts });
  const unreadable = rows.filter((row) => row.unreadable);
  assert.deepEqual(
    unreadable.map((row) => `line ${row.index}: ${row.unreadable}`),
    [],
    `${path} drew runs that could not be mapped back onto their line`
  );
  return rows.filter((row) => row.ink).map((row) => ({ ...row, indent: indentOf(row.text) }));
}

/**
 * The indent a line declares, in characters of leading whitespace.
 *
 * Read off the document rather than off the drawing. The document is where an
 * author writes the indent and where a reviewer reads it, and the drawing is
 * where it may have been folded into a run or skipped entirely.
 *
 * @param {string} text
 * @returns {number}
 */
export function indentOf(text) {
  return text.length - text.trimStart().length;
}

/**
 * The lines sharing each declared indent, by indent, shallowest first.
 *
 * @param {Array<{ indent: number }>} rows
 * @returns {Array<[number, Array<object>]>}
 */
export function byIndent(rows) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.indent) ?? [];
    group.push(row);
    groups.set(row.indent, group);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

const paths = await catalogPaths();

test("the accent reader loads, or these cases read a sheet nobody sees", { skip }, () => {
  // A panel drawn without it is one run per line, and the folded indent this
  // file is careful about is a property of the split runs. The cases would
  // still pass; they would be measuring a simpler drawing than the page makes.
  assert.equal(reader.ready, true, reader.reason ?? "the accent reader did not load");
});

for (const path of paths) {
  test(`${path} begins every line sharing an indent in one column`, { skip }, async () => {
    const rows = await inkStartsOf(path);
    assert.ok(rows.length > 0, `${path} drew no code line with ink in it`);

    const groups = byIndent(rows);
    const offences = [];
    let widest = { indent: null, spread: 0 };
    for (const [indent, group] of groups) {
      const xs = group.map((row) => row.ink.x);
      const spread = Math.max(...xs) - Math.min(...xs);
      if (spread > widest.spread) widest = { indent, spread };
      if (spread * SCALE < COLUMN_FLOOR_PX) continue;
      const left = group.reduce((a, b) => (a.ink.x <= b.ink.x ? a : b));
      const right = group.reduce((a, b) => (a.ink.x >= b.ink.x ? a : b));
      offences.push(
        `indent ${indent} is drawn across ${(spread * SCALE).toFixed(3)} px: line ${left.index} begins at ` +
          `${left.ink.x.toFixed(3)} and line ${right.index} at ${right.ink.x.toFixed(3)} ` +
          `(${JSON.stringify(right.text)})`
      );
    }

    console.log(
      `  ${path}: ${rows.length} lines in ${groups.length} columns ` +
        `(${groups.map(([indent, group]) => `${indent}:${group.length}`).join(" ")}), ` +
        `widest column ${(widest.spread * SCALE).toFixed(4)} px at indent ${widest.indent}`
    );
    assert.deepEqual(
      offences,
      [],
      `${path} draws lines that declare the same indent in different columns:\n  ${offences.join("\n  ")}`
    );
  });

  test(`${path} begins a deeper indented line right of the line above it`, { skip }, async () => {
    const rows = await inkStartsOf(path);
    const offences = [];
    for (let i = 1; i < rows.length; i += 1) {
      const above = rows[i - 1];
      const here = rows[i];
      if (here.indent <= above.indent) continue;
      if (here.ink.x > above.ink.x) continue;
      const by = (above.ink.x - here.ink.x) * SCALE;
      offences.push(
        `line ${here.index} declares indent ${here.indent} against line ${above.index}'s ${above.indent} ` +
          `and begins ${by.toFixed(3)} px left of it: ${JSON.stringify(here.text)} under ` +
          `${JSON.stringify(above.text)}`
      );
    }
    assert.deepEqual(
      offences,
      [],
      `${path} indents a line deeper than the one above it and draws it further left, which is what a ` +
        `padded column does in a proportional face:\n  ${offences.join("\n  ")}`
    );
  });
}

/**
 * The indent unit a set of declared indents implies, and whether the set is a
 * contiguous ladder built from it.
 *
 * The unit is the shallowest indent above zero, because that is the first step
 * nesting takes, and every deeper indent has to be a whole number of those
 * steps with none of them skipped. A sheet that indents nothing has no ladder
 * to check and passes.
 *
 * @param {number[]} indents Every declared indent, blank lines left out.
 * @returns {{ unit: number | null, rungs: number[], ladder: boolean }}
 */
export function ladderOf(indents) {
  const rungs = [...new Set(indents)].sort((a, b) => a - b);
  const steps = rungs.filter((n) => n > 0);
  if (steps.length === 0) return { unit: null, rungs, ladder: true };
  const unit = steps[0];
  const want = [];
  for (let n = 0; n <= steps[steps.length - 1]; n += unit) want.push(n);
  return { unit, rungs, ladder: rungs.length === want.length && rungs.every((n, i) => n === want[i]) };
}

/**
 * The sheets whose indents are not a ladder, and why each one still is not.
 *
 * **This began as a record of debt and is now a record of one decision.** Five
 * of the six rows it opened with on 2026.10.24 were padded continuations - the
 * same defect **Padded Continuation 1** was filed for, measured the same way
 * and in the same units - and the found issue queued against the list fixed
 * all five on 2026.10.25. What is left is the one sheet that never drew that
 * defect at all, kept deliberately, with its reasons below and in
 * `javaScriptArrays/README.md`.
 *
 * So the list is not a queue any more, and a row added to it is a decision
 * somebody has to argue for rather than a line of debt somebody will clear.
 * The case below still fails on a sheet that is not here, which is what stops
 * a new padded continuation landing quietly - the whole reason this file
 * exists.
 *
 * `indents` is the set the sheet declares today. A sheet that is fixed, or
 * that changes its indents at all, no longer matches its entry and is reported
 * as a stale row rather than passing on one.
 */
export const NOT_A_LADDER = [
  {
    path: "javascript/arrays/max-and-min-function-and-sort-object",
    indents: [0, 1, 3, 4],
    note:
      "no padded column: measured on 2026.10.24, not one of its lines aims at a position inside the " +
      "line above, so the defect the ladder stands proxy for is absent. It declares four indents " +
      "because the artwork it transcribes draws four - the `cars` rows one space in, the sort body " +
      "three and the closing `return` four - so the set is two units rather than one. Re-indenting " +
      "it would move three of its rows off the image it reproduces, which is what the eleven " +
      "originals are kept for. Kept as transcribed, per `javaScriptArrays/README.md`",
  },
];

test("every sheet indents in a contiguous ladder of one unit, bar the ones on record", () => {
  // No browser: the ladder is a property of the document, which is what makes
  // this the cheap half of the file and the half that runs on a bare clone.
  const recorded = new Map(NOT_A_LADDER.map((row) => [row.path, row]));
  const offences = [];
  const stale = [];
  for (const path of paths) {
    const doc = JSON.parse(readFileSync(join(root, ...path.split("/"), "sheet.json"), "utf8"));
    const indents = doc.code.filter((line) => line.text.trim().length > 0).map((line) => indentOf(line.text));
    const { unit, rungs, ladder } = ladderOf(indents);
    const row = recorded.get(path);
    if (row && JSON.stringify(row.indents) !== JSON.stringify(rungs)) {
      stale.push(
        `${path} is recorded as declaring ${JSON.stringify(row.indents)} and declares ` +
          `${JSON.stringify(rungs)}: ${ladder ? "it is a ladder now, so delete the row" : "update the row"}`
      );
      continue;
    }
    if (ladder || row) continue;
    offences.push(
      `${path} declares ${JSON.stringify(rungs)} against a unit of ${unit}, which is not a ladder. ` +
        `An indent measured in characters of the line above lands on a rung that is not there, and a ` +
        `proportional face draws it wherever those spaces reach`
    );
  }
  console.log(`  ${recorded.size} of ${paths.length} sheets do not indent in a ladder, all on record`);
  assert.deepEqual(stale, [], `the record in NOT_A_LADDER no longer matches the catalog:\n  ${stale.join("\n  ")}`);
  assert.deepEqual(offences, [], `these sheets pad an indent rather than nesting it:\n  ${offences.join("\n  ")}`);
});

test("and every row of that record names a sheet in the catalog and says why it is there", () => {
  // The case above walks the catalog and reads the record for each path, so a
  // row naming a path the catalog no longer holds is never looked at: a sheet
  // renamed or deleted leaves its row behind, passing silently, and the one
  // thing the record is for - saying which sheets were argued over and why -
  // quietly stops being true. This walks the record instead.
  const inCatalog = new Set(paths);
  const faults = [];
  const seen = new Set();
  for (const row of NOT_A_LADDER) {
    if (!inCatalog.has(row.path)) {
      faults.push(`${row.path} is on the record and not in the catalog: delete the row, or fix the path`);
      continue;
    }
    if (seen.has(row.path)) faults.push(`${row.path} is on the record twice, and only the first is read`);
    seen.add(row.path);
    if (!Array.isArray(row.indents) || row.indents.length === 0) {
      faults.push(`${row.path} records no indents, so the staleness check above cannot fire on it`);
    }
    // The note is the whole value of a row now that the list is a record of
    // decisions rather than a queue of debt. A row without one is an exemption
    // nobody has to justify, which is the shape this list was moved away from.
    if (typeof row.note !== "string" || row.note.trim().length === 0) {
      faults.push(`${row.path} is on the record with no note saying why it is kept`);
    }
  }
  console.log(`  ${NOT_A_LADDER.length} recorded exception${NOT_A_LADDER.length === 1 ? "" : "s"}, each argued in its note`);
  assert.deepEqual(faults, [], `NOT_A_LADDER holds rows that cannot be acted on:\n  ${faults.join("\n  ")}`);
});

test("and the catalog holds a sheet whose indents step more than once", { skip }, async () => {
  // Without a sheet carrying three or more columns the ordering case above is
  // close to vacuous: a document indented one level deep has one step to check
  // and would pass by holding almost nothing. Measured at four columns on the
  // deepest sheet in the catalog on 2026.10.24.
  let deepest = { path: null, columns: 0 };
  for (const path of paths) {
    const columns = byIndent(await inkStartsOf(path)).length;
    if (columns > deepest.columns) deepest = { path, columns };
  }
  console.log(`  deepest: ${deepest.columns} columns on ${deepest.path}`);
  assert.ok(
    deepest.columns >= 3,
    `the deepest sheet in the catalog holds ${deepest.columns} indent columns, so the ordering case ` +
      `above has almost no step to read`
  );
});
