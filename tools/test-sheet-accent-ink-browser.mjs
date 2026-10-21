// Drives a real engine over every committed sheet and asks where the ink of a
// split code line actually lands.
//
// **The sibling of `tools/test-sheet-accent-seams-browser.mjs`, and a
// different question about the same subject.** That file measures a boundary:
// the distance the composition put between two drawn runs, against the width
// the engine lays that stretch out in. It is the right measurement for a gap,
// and it is what held **Token Accents 1**. Three things it cannot see, each of
// which a reader can:
//
// - **A crossing rather than a gap.** A seam is compared with `Math.abs`
//   against a one page pixel floor, so a run placed nearly a pixel *left* of
//   where it belongs - letters touching, which reads as broken rather than as
//   loose - passes at the same figure a gap passes at.
// - **Drift along a line.** Each boundary is measured against its own
//   neighbour, so eight boundaries each a fifth of a pixel out in the same
//   direction read as eight clean boundaries and draw a line whose end is a
//   pixel and a half from where it belongs.
// - **The panel.** Nothing holds a run to the frame it is drawn inside.
//
// What answers all three is the engine's own layout of the whole line. The
// reference below is one `<text>` holding the complete line in the same face,
// anchored on the first glyph the sheet drew, which is exactly what the page
// drew before a line was ever split. `getExtentOfChar` then gives, for every
// character, where it is against where it would have been - a gap as a
// positive shift on everything after the boundary, a crossing as a negative
// one, and drift as a shift that grows along the line. One number, one floor,
// and the sign says which defect it is.
//
// **Two measurements that were tried here first and both measured the
// measurement**, recorded so they are not tried again:
//
// - Reconstructing the stretch between two drawn runs from their text alone.
//   The composer draws no element for a run of nothing but spaces, so the
//   distance between two drawn runs covers the skipped indent too, and an
//   arithmetic that forgets that reports an ordinary space as a 25 px gap.
// - Reading `getBBox` on each run and comparing one run's right edge with the
//   next run's left. The box is the glyph's own extent, so an `f` or a `/`
//   overhanging its advance reads as two runs crossing while nothing has
//   moved: it reported 102 crossings across the catalog, every one of them a
//   correctly drawn letter.
//
// Composed in Node, drawn in Chromium at the page's own cap and again at the
// sheet's own 3600px, measured in composition units and reported in page
// pixels. Nothing is added to the repository for it - Playwright is looked for
// at run time in the places it is actually installed and every case skips with
// the reason where it is absent. Install it for a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// No server, like the seams file and unlike
// `tools/test-sheet-accent-arrival-browser.mjs`: the composition is the
// subject, not the page.
//
// Run with: node --test tools/test-sheet-accent-ink-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { composeSheet, prepareAccents } from "../api/cheatsheet/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. Identical to
// `tools/test-sheet-accent-seams-browser.mjs`, so a machine that runs one runs
// both.
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

/**
 * A shift is reported at the reader's own geometry rather than in composition
 * units, for the reason the seams file gives: a fifth of a unit is not a
 * defect and a fifth of a page pixel is a different claim about the number.
 */
const SCALE = PAGE_CAP / CANVAS;

/** The six the palette carries, from `SYNTAX` in `api/cheatsheet/language.mjs`. */
const PALETTE = {
  plain: "#FFFFFF",
  comment: "#B4BEC8",
  identifier: "#ADF8B7",
  keyword: "#F8F5AE",
  string: "#FDC83A",
  number: "#8DE632",
};

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

// The reader, or no line is split and every case below would pass by having
// nothing to look at. Asserted rather than assumed, in the first case.
const reader = skip ? { ready: false, reason: skip } : await prepareAccents();

after(async () => {
  await browser?.close();
});

/**
 * Reads a drawn sheet: where each glyph of a split line is, and where the
 * engine would have put it had the line stayed one element.
 *
 * Runs over `texts` so a run can be mapped back onto its line. The mapping is
 * a cursor walked forward through the line: the runs tile it, and anything the
 * cursor skips is a space-only run the composer drew no element for. A skip
 * that is not blank means the mapping is wrong rather than the sheet, so it is
 * reported rather than measured around.
 */
const READ_SHEET = ({ selector, texts }) => {
  const SVG = "http://www.w3.org/2000/svg";
  const XML = "http://www.w3.org/XML/1998/namespace";
  const svg = document.querySelector(selector);
  if (!svg) throw new Error(`nothing matched ${selector}`);
  const panel = svg.querySelector('rect[data-name="code-panel"]');

  const lines = new Map();
  for (const part of svg.querySelectorAll('text[data-name^="code-"]')) {
    const name = part.getAttribute("data-name");
    const split = /^code-(\d+)-(\d+)$/.exec(name);
    const whole = /^code-(\d+)$/.exec(name);
    if (!split && !whole) continue;
    const index = Number((split ?? whole)[1]);
    const entry = lines.get(index) ?? { index, split: Boolean(split), runs: [] };
    entry.runs.push({ part: split ? Number(split[2]) : 0, element: part });
    lines.set(index, entry);
  }

  const reference = document.createElementNS(SVG, "text");
  // `setAttributeNS` for `xml:space`, for the reason the seams file records:
  // the plain setter makes an attribute whose name merely holds a colon, the
  // engine never sees the preserve, and every line with an indent is measured
  // on a shorter string than the one on the sheet.
  reference.setAttributeNS(XML, "xml:space", "preserve");
  reference.setAttribute("fill", "none");
  svg.appendChild(reference);

  const out = [];
  for (const line of [...lines.values()].sort((a, b) => a.index - b.index)) {
    line.runs.sort((a, b) => a.part - b.part);
    const text = texts[line.index];
    const tspanOf = (element) => element.querySelector("tspan");
    const first = line.runs[0].element;
    const row = {
      index: line.index,
      split: line.split,
      text,
      fills: line.runs.map(({ element }) => element.getAttribute("fill")),
      chars: [],
    };

    let cursor = 0;
    let bad = null;
    for (const { element } of line.runs) {
      const runText = tspanOf(element).textContent;
      const at = text.indexOf(runText, cursor);
      if (at < 0) {
        bad = `run ${JSON.stringify(runText)} is not in the line at or after ${cursor}`;
        break;
      }
      if (text.slice(cursor, at).trim().length > 0) {
        bad = `the composer skipped ${JSON.stringify(text.slice(cursor, at))}, which is not blank`;
        break;
      }
      for (let j = 0; j < runText.length; j += 1) {
        const extent = element.getExtentOfChar(j);
        row.chars.push({ at: at + j, char: runText[j], x: extent.x, width: extent.width });
      }
      cursor = at + runText.length;
    }
    if (bad || row.chars.length === 0) {
      row.unreadable = bad ?? "the line drew no characters";
      out.push(row);
      continue;
    }

    // **Anchored on the first glyph the sheet drew, not placed at it.** An
    // indented line starts with a space-only run that has no element, so the
    // first drawn run sits an indent to the right of where the line begins;
    // a reference holding the whole line placed at that `x` puts every
    // reference glyph an indent too far right and reads as the whole line
    // drawn left - measured at -76 px on the most deeply indented line in the
    // catalog before this was anchored.
    //
    // Anchoring also states the claim correctly. Where a line sits as a whole
    // is the composer's arithmetic, and the panel case below holds it; what a
    // split can break is the spacing *inside* the line, which is what a shift
    // from an anchored reference measures.
    reference.setAttribute("font-family", first.getAttribute("font-family"));
    reference.setAttribute("font-size", first.getAttribute("font-size"));
    reference.setAttribute("y", tspanOf(first).getAttribute("y") ?? "0");
    reference.setAttribute("x", "0");
    reference.textContent = text;
    const anchorAt = row.chars[0].at;
    const anchor = reference.getExtentOfChar(anchorAt).x;
    row.reference = [];
    for (let i = 0; i < text.length; i += 1) {
      const extent = reference.getExtentOfChar(i);
      row.reference.push({ x: extent.x - anchor + row.chars[0].x, width: extent.width });
    }
    out.push(row);
  }
  reference.remove();

  return {
    panel: panel
      ? { x: Number(panel.getAttribute("x")), width: Number(panel.getAttribute("width")) }
      : null,
    lines: out,
  };
};

/** Composes a sheet, draws it at a width, and reads it back. */
async function sheetAt(path, width) {
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
    { markup: composition.toSVG(), width }
  );
  const sheet = await page.evaluate(READ_SHEET, { selector: "#drawn", texts });
  const unreadable = sheet.lines.filter((line) => line.unreadable);
  assert.deepEqual(
    unreadable.map((line) => `line ${line.index}: ${line.unreadable}`),
    [],
    `${path} drew runs that could not be mapped back onto their line`
  );
  return sheet;
}

/** Every glyph of every split line, as a shift from where the engine would lay it. */
function shiftsOf(sheet) {
  const out = [];
  for (const line of sheet.lines) {
    if (!line.split || !line.reference) continue;
    for (const char of line.chars) {
      const reference = line.reference[char.at];
      if (!reference) continue;
      out.push({
        line: line.index,
        char: char.char,
        // Positive: drawn right of its place, which is a gap. Negative: drawn
        // left of it, which is letters crossing.
        shift: char.x - reference.x,
        after: line.text.slice(Math.max(0, char.at - 16), char.at),
        text: line.text,
      });
    }
  }
  return out;
}

const worstShift = (rows) =>
  rows.reduce((most, row) => (Math.abs(row.shift) > Math.abs(most.shift) ? row : most), rows[0]);

const paths = await catalogPaths();

test("the accent reader loads, or every case below proves nothing", { skip }, () => {
  // Without it no line is split, and a file whose whole subject is where the
  // split runs land would pass by having none.
  assert.equal(reader.ready, true, reader.reason ?? "the accent reader did not load");
});

for (const path of paths) {
  test(`${path} draws every glyph where an unsplit line would draw it`, { skip }, async () => {
    const sheet = await sheetAt(path, PAGE_CAP);
    const shifts = shiftsOf(sheet);
    assert.ok(shifts.length > 0, `${path} drew no line as more than one run`);

    const worst = worstShift(shifts);
    const over = shifts.filter((row) => Math.abs(row.shift) * SCALE >= 1).length;
    const worstPx = worst.shift * SCALE;
    const crossing = shifts.filter((row) => row.shift * SCALE <= -0.5);
    console.log(
      `  ${path}: ${shifts.length} glyphs on split lines, worst ${worstPx.toFixed(3)} px ` +
        `(${worstPx < 0 ? "left, a crossing" : "right, a gap"}) on line ${worst.line} after ` +
        `${JSON.stringify(worst.after.slice(-14))}, ${over} at or over 1 px`
    );

    assert.equal(
      over,
      0,
      `${over} of ${shifts.length} glyphs are drawn a page pixel or more from where an unsplit line ` +
        `would put them; worst ${worstPx.toFixed(3)} px on line ${worst.line} after ` +
        `${JSON.stringify(worst.after)} in ${JSON.stringify(worst.text)}`
    );
    // The sign, separately and at a tighter floor. A gap is the defect
    // **Token Accents 1** closed and reads as loose; a crossing is letters
    // touching and reads as broken, so it is worth failing earlier on.
    assert.deepEqual(
      crossing.slice(0, 3).map((row) => `line ${row.line} ${JSON.stringify(row.char)} at ${(row.shift * SCALE).toFixed(3)} px`),
      [],
      `${crossing.length} glyphs are drawn half a page pixel or more left of their place, which is letters crossing`
    );
  });
}

test("no glyph is drawn outside the code panel it belongs to", { skip }, async () => {
  // The frame the example is drawn inside is fixed, and the runs inside it are
  // free. Nothing else holds a run to it, so a placement error large enough to
  // leave the panel would otherwise be reported only as a shift.
  let tightest = null;
  const strays = [];
  for (const path of paths) {
    const sheet = await sheetAt(path, PAGE_CAP);
    assert.ok(sheet.panel, `${path} drew no code panel`);
    const left = sheet.panel.x;
    const right = sheet.panel.x + sheet.panel.width;
    for (const line of sheet.lines) {
      for (const char of line.chars) {
        const inkRight = char.x + char.width;
        if (char.x < left || inkRight > right) {
          strays.push(`${path} line ${line.index} ${JSON.stringify(char.char)}`);
        }
        const margin = Math.min(char.x - left, right - inkRight);
        if (!tightest || margin < tightest.margin) tightest = { path, line: line.index, char: char.char, margin };
      }
    }
  }
  console.log(
    `  tightest margin ${(tightest.margin * SCALE).toFixed(2)} px at ${JSON.stringify(tightest.char)} on ` +
      `line ${tightest.line} of ${tightest.path}`
  );
  assert.deepEqual(strays.slice(0, 5), [], `${strays.length} glyphs are drawn outside the code panel`);
});

test("the full size route lays the same lines out the same way at 3600px", { skip }, async () => {
  // The page scales the composition into a 900px column; the full size link
  // hands the same markup to a tab at the sheet's own 3600px. Both are laid
  // out by the engine, and a rounding that only shows at one of the two scales
  // would otherwise be measured at neither.
  //
  // A sheet pixel at 3600 is a quarter of a page pixel at the cap, so the
  // floor is converted rather than tightened: the claim is about what a reader
  // can see, and it is the same claim at both scales.
  const visible = CANVAS / PAGE_CAP;
  let worst = null;
  for (const path of paths) {
    const shifts = shiftsOf(await sheetAt(path, CANVAS));
    const here = worstShift(shifts);
    if (!worst || Math.abs(here.shift) > Math.abs(worst.shift)) worst = { ...here, path };
  }
  console.log(
    `  worst at full size: ${worst.shift.toFixed(3)} sheet px (${(worst.shift / visible).toFixed(3)} page px) ` +
      `on line ${worst.line} of ${worst.path}`
  );
  assert.ok(
    Math.abs(worst.shift) < visible,
    `${worst.path} draws a glyph ${worst.shift.toFixed(3)} sheet px from where an unsplit line would put it ` +
      `at full size, on line ${worst.line} after ${JSON.stringify(worst.after)}`
  );
});

test("the code panel is drawn in the six colours the palette carries, and in no others", { skip }, async () => {
  // The accent colours are not what **Token Accents 1** changed, which is why
  // this is here: a placement fix that moved a paint moved something it had no
  // business moving, and nothing else in the suite reads the fills off a drawn
  // sheet.
  const seen = new Set();
  const unknown = new Set();
  for (const path of paths) {
    const sheet = await sheetAt(path, PAGE_CAP);
    for (const line of sheet.lines) {
      for (const fill of line.fills) {
        const hex = String(fill ?? "").toUpperCase();
        if (Object.values(PALETTE).includes(hex)) seen.add(hex);
        else unknown.add(`${hex} in ${path}`);
      }
    }
  }
  const named = Object.fromEntries(Object.entries(PALETTE).map(([role, hex]) => [hex, role]));
  console.log(`  drawn: ${[...seen].map((hex) => `${named[hex]} ${hex}`).join(", ")}`);
  assert.deepEqual([...unknown].slice(0, 5), [], "the code panel drew an ink the syntax palette does not carry");
  assert.equal(
    seen.size,
    Object.keys(PALETTE).length,
    `only ${seen.size} of the six syntax colours are drawn across the catalog: ` +
      `${[...seen].map((hex) => named[hex]).join(", ")}`
  );
});
