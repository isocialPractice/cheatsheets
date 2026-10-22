// Drives a real engine over a composed sheet, and checks that it draws the
// text where the committed width table said it would.
//
// **This is the acceptance check for the whole font decision.** Every other
// case about faces is a check of arithmetic against itself: `measureText` and
// the table agree because one reads the other. What none of them can answer is
// whether a browser handed the resulting SVG puts the glyphs where the table
// predicted. If it does not, a generated sheet is measured correctly and drawn
// wrong, and nothing in a dependency free suite would ever say so.
//
// Nothing is added to the repository for it. There is no package.json and
// `node --test` has to work on a clone with nothing installed, so Playwright
// is looked for at run time in the places it is actually installed and every
// case below skips with the reason where it is absent. Install it for
// a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// The measurement that produced the table lives in
// `tools/measure-font-widths.mjs`, which is a script rather than a test: it is
// run by hand when the table needs regenerating. This file is the standing
// check that the committed result still holds.
//
// **Two questions, and the second one arrived late.** How *wide* a run is
// drawn is the original subject above. Where a run is *placed* from that width
// is the other half, and it went unchecked until 2026.10.22: a title centred
// on the advances alone sat up to 3.15 page pixels off the canvas axis for a
// year and a half, because every case in the dependency-free suite compared
// the arithmetic with itself and the only browser case here measured the
// synthetic document below, whose title holds no kerned pair. The catalog
// cases at the foot of this file are what close that - they read every
// committed sheet and ask the engine where the middle of the title ended up.
//
// Run with: node --test tools/test-sheet-faces-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { measureText } from "../api/napkin-sketch/api/index.js";
import {
  composeSheet,
  drawnWidth,
  kerning,
  measureRun,
  CODE_FACE,
  SHEET_FACE,
  sizeForCap,
} from "../api/cheatsheet/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. Identical to
// `tools/test-page-structure-browser.mjs`, so a machine that runs one runs both.
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

const runtime = await loadChromium();
const skip = runtime.chromium ? false : runtime.reason;

let browser;
if (!skip) browser = await runtime.chromium.launch();

after(async () => {
  await browser?.close();
});

const DOC = {
  title: "JavaScript Array Practical Use Starting Point",
  subtitle: "Splice Array",
  code: [
    { text: "var fruits = ['Banana', 'Orange', 'Apple', 'Mango'];", role: "plain" },
    { text: "console.log(fruits.splice(2, 2, 'Lemon', 'Kiwi'));", role: "plain" },
    { text: "// (2) ['Apple', 'Mango']", role: "comment" },
    { text: "var trees = ['Maple', 'Spruce', 'Palm'];", role: "plain" },
    { text: "trees.splice(3, 0, 'Birch');", role: "plain" },
  ],
};

/**
 * Renders a composition's SVG at its own scale and reads back what each run
 * actually occupies.
 */
async function measureInBrowser(svg) {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  // At the composition's own scale, so a reported box is in composition units
  // and nothing has to be divided back out.
  await page.setContent(`<!doctype html><style>html,body{margin:0}</style>${svg}`);
  const boxes = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll("text")) {
      const box = el.getBBox();
      out[el.getAttribute("data-name")] = { x: box.x, y: box.y, width: box.width, height: box.height };
    }
    return out;
  });
  await page.close();
  return boxes;
}

/**
 * The face a run was measured in, by the family it names.
 *
 * Both faces in this design language name the same family and carry the same
 * table, so the code face and the text face measure a run identically - but the
 * lookup is written as a lookup rather than as one face so a second family
 * is a table entry here and not a bug nobody notices.
 *
 * @param {{ fontFamily?: string }} element
 */
function faceOf(element) {
  for (const face of [SHEET_FACE, CODE_FACE]) {
    if (face.fontFamily === element.fontFamily) return face;
  }
  return SHEET_FACE;
}

test("the browser draws each run at the width the committed table predicted", { skip }, async () => {
  const { composition } = composeSheet(DOC, { seed: "splice-array" });
  const drawn = await measureInBrowser(composition.toSVG());

  // `getBBox` returns the ink box, tight to the glyphs, while the table sums
  // advances and so includes the last glyph's right side bearing. The browser
  // therefore reads a little narrow, and how much depends on what the run ends
  // in: six of the ten runs here agree to within 0.01%, and the widest gap is
  // the subtitle at 1.02%, which ends in a "y". 2% is the band that tolerates
  // the bearing without tolerating a wrong face - the case below measures what
  // a wrong one costs, and it is an order of magnitude more than this.
  let worst = { name: "", share: 0 };
  for (const element of composition.elements) {
    if (element.type !== "text") continue;
    const box = drawn[element.name];
    assert.ok(box, `${element.name} was not drawn at all`);
    // The element carries no face since 2026.10.14 - it carries the family its
    // face names - so the ruler is handed the layer's face by name here, which
    // is the one the composition measured with.
    const predicted = measureRun(element.text, {
      fontSize: element.fontSize,
      face: faceOf(element),
    });
    const share = Math.abs(box.width - predicted) / predicted;
    if (share > worst.share) worst = { name: element.name, share };
    assert.ok(
      share < 0.02,
      `${element.name}: the table predicted ${predicted.toFixed(1)} px and the browser drew ` +
        `${box.width.toFixed(1)} px, a difference of ${(share * 100).toFixed(2)}%`
    );
  }
  assert.ok(worst.name, "no text was measured, so this case proved nothing");
});

test("and the built-in alphabet would have missed every one of them", { skip }, async () => {
  // The counter-check, without which a table that happened to be right for the
  // wrong reason would pass the case above and nothing would show that taking a
  // face mattered at all.
  //
  // Two different comparisons are easy to run together here, so: against the
  // *artwork* the built-in alphabet is 62% too wide, which is the figure
  // `DESIGN_LANGUAGE.md` records and `tools/test-sheet-faces.mjs` asserts.
  // Against what a *browser* draws it is 9% to 21%, measured across these runs.
  // This is the second of those, because the browser is what is on screen here.
  // 21% of a 900 px run is 190 sheet pixels, or 32 at display size.
  const { composition } = composeSheet(DOC, { seed: "splice-array" });
  const drawn = await measureInBrowser(composition.toSVG());

  for (const element of composition.elements) {
    if (element.type !== "text") continue;
    const face = faceOf(element);
    // The built-in alphabet at the size whose cap matches this run's. The
    // drawing surface is still asked for this one figure, because the claim is
    // about *its* alphabet: this is the only case here that is about the thing
    // on the other side of the boundary rather than about the table.
    const cap = (element.fontSize * face.capHeight) / face.unitsPerEm;
    const builtin = measureText(element.text, { fontSize: (cap * 15) / 11 });
    const share = Math.abs(drawn[element.name].width - builtin) / drawn[element.name].width;
    assert.ok(
      share > 0.05,
      `${element.name}: the built-in alphabet predicted ${builtin.toFixed(1)} px against the ` +
        `${drawn[element.name].width.toFixed(1)} px drawn, which is only ${(share * 100).toFixed(1)}% out`
    );
  }
});

test("no run overflows the region the composition fitted it to", { skip }, async () => {
  // Fitting is measured in the table; this is whether the fit survives contact
  // with the engine that draws it.
  const { composition } = composeSheet(
    {
      ...DOC,
      title: "A Considerably Longer Title Than Any Of The Eleven Sheets Were Given",
    },
    { seed: 3 }
  );
  const drawn = await measureInBrowser(composition.toSVG());
  const title = drawn.title;
  // Between the two flanking rules, which is what the title is set across.
  assert.ok(title.x >= 432 - 1, `the title starts at ${title.x.toFixed(1)}, inside the left rule`);
  assert.ok(
    title.x + title.width <= 3600 - 432 + 1,
    `the title ends at ${(title.x + title.width).toFixed(1)}, inside the right rule`
  );
});

test("the face's cap height is the one a browser actually renders", { skip }, async () => {
  // The conversion from a measured cap height to a font size is what places
  // every run vertically. It is arithmetic against the committed cap of 719
  // units per em, and this is the case that says the engine agrees.
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>cap</title>");
  const rendered = await page.evaluate((size) => {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${size}px "Helvetica Neue", Arial, system-ui, sans-serif`;
    return ctx.measureText("H").actualBoundingBoxAscent;
  }, sizeForCap(141, SHEET_FACE));
  await page.close();
  assert.ok(
    Math.abs(rendered - 141) < 1.5,
    `a size asked to reach a 141 px cap rendered one of ${rendered.toFixed(1)} px`
  );
});

// --- Where a centred run ends up, over every committed sheet ----------------

/** The widest the page draws a sheet, from the `div.sheet` rule in index.html. */
const PAGE_CAP = 900;

/** Composition units across, which is the canvas the design language records. */
const CANVAS = 3600;

/** A sheet pixel in page pixels, so an offset is reported at the reader's scale. */
const SCALE = PAGE_CAP / CANVAS;

/** Every cheatsheet the committed catalog holds, in the order it lists them. */
async function catalogPaths() {
  const manifest = JSON.parse(await readFile(join(root, "cheatsheets.json"), "utf8"));
  return manifest.categories.flatMap((category) => category.cheatsheets.map((sheet) => sheet.path));
}

/**
 * Reads a drawn run two ways: its advance box and its ink box.
 *
 * **The advance box is the one the composition models.** `getStartPositionOfChar`
 * and `getEndPositionOfChar` give where the engine began the first glyph and
 * finished advancing past the last, which is exactly what `drawnWidth` sums, so
 * its middle is comparable with the point the run was centred on to the float.
 *
 * **The ink box carries the glyphs' own side bearings**, which is why it is read
 * alongside rather than instead. A run ending in an `f` whose ink overhangs its
 * advance reads as off centre by half that overhang while sitting precisely
 * where it was placed: `compare-array-function`'s subtitle, "Sort by a rule you
 * write yourself", is centred to 0.059 units and reads 0.854 page pixels off by
 * its box, because its `S` has no left bearing and its `f` overhangs by 6.71
 * units. Other runs in the catalog read off in the other direction for the same
 * reason. It is still worth reading: it is the box a reader's eye compares, and
 * at a floor loose enough for the bearings it still catches a placement error
 * of the size this file was extended for.
 */
const READ_CENTRES = ({ names }) => {
  const out = {};
  for (const name of names) {
    const element = document.querySelector(`text[data-name="${name}"]`);
    if (!element) continue;
    const run = element.querySelector("tspan") ?? element;
    const length = run.textContent.length;
    if (length === 0) continue;
    const box = element.getBBox();
    const start = run.getStartPositionOfChar(0).x;
    const end = run.getEndPositionOfChar(length - 1).x;
    out[name] = {
      text: run.textContent,
      advance: (start + end) / 2,
      ink: box.x + box.width / 2,
      width: end - start,
    };
  }
  return out;
};

/** Composes a committed sheet, draws it at its own scale, and reads its centred runs. */
async function centresOf(path, page) {
  const doc = JSON.parse(await readFile(join(root, ...path.split("/"), "sheet.json"), "utf8"));
  const { composition } = composeSheet(doc, { seed: doc.seed });
  await page.setContent(`<!doctype html><style>html,body{margin:0}</style>${composition.toSVG()}`);
  const drawn = await page.evaluate(READ_CENTRES, { names: ["title", "subtitle"] });
  const out = [];
  for (const [name, read] of Object.entries(drawn)) {
    const element = composition.elements.find((el) => el.type === "text" && el.name === name);
    out.push({
      path,
      name,
      text: read.text,
      kern: element ? kerning(element.text, element.fontSize, SHEET_FACE) : 0,
      advanceOff: read.advance - CANVAS / 2,
      inkOff: read.ink - CANVAS / 2,
    });
  }
  return out;
}

test("every centred run in the catalog is drawn on the canvas axis", { skip }, async () => {
  // The acceptance check for `centredAt`, and the only kind of check that could
  // have caught what it was doing: nothing in the dependency-free suite can see
  // that a run is drawn narrower than it was measured, because both sides of
  // every comparison there read the same table.
  //
  // Held on the advance box at a quarter of a page pixel. Measured on
  // 2026.10.22 the worst of the 34 runs is 0.053 px, so there is four times the
  // headroom and the floor is still a twelfth of the defect it replaced.
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    const rows = [];
    for (const path of await catalogPaths()) rows.push(...(await centresOf(path, page)));
    assert.ok(rows.length > 0, "no centred run was read, so this case proved nothing");

    const worst = rows.reduce(
      (most, row) => (Math.abs(row.advanceOff) > Math.abs(most.advanceOff) ? row : most),
      rows[0]
    );
    const kerned = rows.filter((row) => row.kern !== 0);
    console.log(
      `  ${rows.length} centred runs, ${kerned.length} of them holding a kerned pair; ` +
        `worst ${(worst.advanceOff * SCALE).toFixed(3)} page px on the ${worst.name} of ${worst.path}`
    );

    const over = rows.filter((row) => Math.abs(row.advanceOff) * SCALE >= 0.25);
    assert.deepEqual(
      over.map((row) => `${row.path} ${row.name} at ${(row.advanceOff * SCALE).toFixed(3)} px`),
      [],
      `${over.length} of ${rows.length} centred runs are drawn a quarter of a page pixel or more off the axis`
    );
    // The runs that hold a pair are the ones this is about, so their presence
    // is asserted rather than left to chance: a catalog that stopped holding
    // one would pass this case by having nothing to centre wrongly.
    assert.ok(
      kerned.length >= 10,
      `only ${kerned.length} of the catalog's centred runs hold a kerned pair, so this case is no longer load bearing`
    );
  } finally {
    await page.close();
  }
});

test("and its ink lands there too, within the glyphs' own bearings", { skip }, async () => {
  // The reader's own ruler, at a floor loose enough for the side bearings the
  // ink box carries and tight enough to catch a placement error. The defect
  // this replaced measured 3.15 page px here; the bearings measure 0.854.
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    const rows = [];
    for (const path of await catalogPaths()) rows.push(...(await centresOf(path, page)));
    const worst = rows.reduce(
      (most, row) => (Math.abs(row.inkOff) > Math.abs(most.inkOff) ? row : most),
      rows[0]
    );
    // The bearing residual, reported as the difference between the two readings
    // rather than asserted: it is a property of the letterforms, and naming it
    // is what keeps the loose floor above from reading as a fudge.
    const bearing = rows.reduce((most, row) => Math.max(most, Math.abs(row.inkOff - row.advanceOff)), 0);
    console.log(
      `  worst ink offset ${(worst.inkOff * SCALE).toFixed(3)} page px on the ${worst.name} of ` +
        `${worst.path}; widest bearing residual ${(bearing * SCALE).toFixed(3)} px`
    );
    const over = rows.filter((row) => Math.abs(row.inkOff) * SCALE >= 1.5);
    assert.deepEqual(
      over.map((row) => `${row.path} ${row.name} at ${(row.inkOff * SCALE).toFixed(3)} px`),
      [],
      `${over.length} centred runs draw their ink a page pixel and a half or more off the axis`
    );
  } finally {
    await page.close();
  }
});

test("the drawn width the composition centres on is the width the engine lays out", { skip }, async () => {
  // Between the two cases above and the arithmetic: `drawnWidth` is asserted
  // against the advance box directly, so a failure says whether the ruler is
  // wrong or the placement is. The advance box is what the ruler sums, so this
  // is held far tighter than the 2% the ink box is allowed at the top of the
  // file.
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  try {
    const { composition } = composeSheet(
      { ...DOC, title: "Max and Min Value Array", subtitle: "Take from the front, and put back on it" },
      { seed: "kerned" }
    );
    await page.setContent(`<!doctype html><style>html,body{margin:0}</style>${composition.toSVG()}`);
    const drawn = await page.evaluate(READ_CENTRES, { names: ["title", "subtitle"] });
    for (const name of ["title", "subtitle"]) {
      const element = composition.elements.find((el) => el.type === "text" && el.name === name);
      assert.ok(kerning(element.text, element.fontSize, SHEET_FACE) < 0, `${name} holds no kerned pair`);
      const predicted = drawnWidth(element.text, { fontSize: element.fontSize, face: SHEET_FACE });
      const measured = measureRun(element.text, { fontSize: element.fontSize, face: SHEET_FACE });
      assert.ok(
        Math.abs(drawn[name].width - predicted) < 0.5,
        `${name}: the kerned ruler predicted ${predicted.toFixed(3)} and the engine drew ` +
          `${drawn[name].width.toFixed(3)}`
      );
      // And the unkerned ruler does not, which is what the second one is for.
      assert.ok(
        measured - drawn[name].width > 0.5,
        `${name}: the advances predicted ${measured.toFixed(3)} against ${drawn[name].width.toFixed(3)} ` +
          `drawn, which is close enough that this case is no longer about anything`
      );
    }
  } finally {
    await page.close();
  }
});
