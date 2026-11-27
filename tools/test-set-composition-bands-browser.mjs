// What a set composition draws in the three bands `test-set-composition-browser.mjs`
// does not read, measured off the page's own composed graphic.
//
// That file holds the heading band's display stack - the runs' order, one cap
// across a set, and no two of them sharing an inked column - the footer strip's
// left edge, and the panel's freedom. `test-sheet-accent-ink-browser.mjs` holds
// every glyph inside the code panel and the six syntax inks against the set's
// own palette. What neither asks:
//
// 1. **Does the masthead lockup fit the band it was given?** The band is the
//    one region a composition may shrink while the wordmark in it grows: the
//    fourth set draws a 168 px cap in 432 px of band, the fifth a 224 px cap -
//    above the artwork's own 220 for the first time - in 576. A cap that
//    outgrows its band is drawn over the trim or over the heading below it, and
//    nothing else in the suite would report it.
// 2. **Do the two hairlines come out at the weights the record gives them?**
//    They are the plainest difference between one composed head and another -
//    a matched pair at half a step, a matched pair at a quarter, a quarter over
//    a half - and a set that drew the recorded pair the wrong way up would read
//    as a different composition while measuring correct everywhere else.
// 3. **Does the title stay inside the measure those bars leave it?** The bars
//    sit on both trims and the title is centred between them, so a title long
//    enough to reach one is the failure the measure exists to prevent.
// 4. **Is the listing clear of the rail beside it?** The panel's left inset is
//    held against the set's own freedom, but the rail is the thing the reader
//    sees it against, and a set that narrows its spine moves the one without
//    the other.
//
// The last two cases leave the browser: the drawn footer is the route a sheet
// takes where the brand strip is not drawable, which is every composition in
// Node, and the syntax inks are read off the record rather than off a raster.
//
// Ink is read by difference rather than by threshold. The band is rastered
// without a run and again with it, and a pixel that moved is that run's ink.
// A masthead wordmark is white on a dark ground, so the "darker than #C8C8C8"
// scan the display-run cases use cannot see it at all.
//
// Served over a throwaway `node:http` server on an ephemeral port, the way
// `tools/test-set-composition-browser.mjs` serves it.
//
// Nothing is added to the repository. Playwright is looked for at run time and
// every browser case skips with the reason where it is absent. Install it for a
// machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// Run with: node --test tools/test-set-composition-bands-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compositionNamed } from "../api/cheatsheet/compositions.mjs";
import { composeSheet } from "../api/cheatsheet/compose.mjs";
import { SHEET_FACE } from "../api/cheatsheet/faces.mjs";
import { STEP } from "../api/cheatsheet/language.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Cap height as a share of the font size a run is set at, which is 0.719. */
const CAP_SHARE_OF_SIZE = SHEET_FACE.capHeight / SHEET_FACE.unitsPerEm;

/** A pixel of slack, for a figure an engine rounded on its way to the DOM. */
const SLACK = 1;

/**
 * Two pixels of slack where a figure is read off a raster rather than the DOM.
 *
 * A glyph's edge is antialiased, so the row a scan first calls inked sits a
 * pixel either side of where the outline does, and a cap read as the distance
 * between two such rows carries both.
 */
const RASTER_SLACK = 2;

/** Every sheet of the catalog that names a set composition, by the one it names. */
function setsOfTheCatalog() {
  const manifest = JSON.parse(readFileSync(join(root, "cheatsheets.json"), "utf8"));
  const sets = new Map();
  for (const category of manifest.categories) {
    for (const sheet of category.cheatsheets) {
      if (sheet.composition === undefined || sheet.composition === null) continue;
      const held = sets.get(sheet.composition) ?? [];
      held.push({ category: category.id, slug: sheet.id, title: sheet.title });
      sets.set(sheet.composition, held);
    }
  }
  return [...sets.entries()].map(([id, sheets]) => ({ id, sheets }));
}

const SETS = setsOfTheCatalog();

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

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/vnd.microsoft.icon",
};

// Serve the repository, and only the repository: a path that climbs out of it
// is refused rather than read.
function serveRepository() {
  const server = createServer((request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const file = join(root, requested === "/" ? "index.html" : requested);
    if (!file.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }
    readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}/` })
    );
  });
}

/** Every geometry these cases read off the page's composed `svg`. */
const MEASURE = () => {
  const svg = document.querySelector("#curCheatSheet svg");
  if (!svg) return { missing: true };
  const named = (name) => svg.querySelector(`[data-name="${name}"]`);
  const rectOf = (name) => {
    const el = named(name);
    if (!el) return null;
    const read = (a) => Number(el.getAttribute(a) ?? 0);
    const x = read("x");
    const y = read("y");
    const width = read("width");
    const height = read("height");
    return { x, y, width, height, right: x + width, bottom: y + height, fill: el.getAttribute("fill") };
  };
  const runOf = (name) => {
    const el = named(name);
    if (!el) return null;
    const tspan = el.querySelector("tspan");
    return {
      text: el.textContent,
      fontSize: Number(el.getAttribute("font-size")),
      fill: el.getAttribute("fill"),
      x: Number(tspan?.getAttribute("x")),
      y: Number(tspan?.getAttribute("y")),
    };
  };

  // A code line is `code-<line>`, or `code-<line>-<run>` once the accent reader
  // has split it token by token, and a blank line draws no `text` at all. Both
  // shapes fold to one row per line here, keyed by the line's own index.
  const codes = new Map();
  for (const el of svg.querySelectorAll("text[data-name]")) {
    const match = /^code-(\d+)(?:-\d+)?$/.exec(el.getAttribute("data-name"));
    if (!match) continue;
    const index = Number(match[1]);
    const tspan = el.querySelector("tspan");
    const x = Number(tspan?.getAttribute("x"));
    const held = codes.get(index) ?? { index, x };
    held.x = Math.min(held.x, x);
    codes.set(index, held);
  }

  return {
    masthead: rectOf("masthead"),
    panel: rectOf("code-panel"),
    spine: rectOf("spine"),
    ruleUpperLeft: rectOf("rule-upper-left"),
    ruleUpperRight: rectOf("rule-upper-right"),
    ruleLowerLeft: rectOf("rule-lower-left"),
    ruleLowerRight: rectOf("rule-lower-right"),
    wordmark: runOf("wordmark"),
    title: runOf("title"),
    hasMark: Boolean(svg.querySelector('[data-name="masthead-mark"]')),
    codes: [...codes.values()].sort((a, b) => a.index - b.index),
  };
};

/**
 * Where a named run's ink actually is, by difference.
 *
 * The band is rastered with every `data-name` in `base` kept, then again with
 * `run` kept as well, and a pixel that changed between the two is this run's
 * ink - whatever colour it is drawn in and whatever it is drawn over. The
 * threshold scan the display-run cases use cannot read a white wordmark on a
 * dark masthead, which is the band this one exists to measure.
 */
const INK_OF = async ({ run, base, top, height, canvas }) => {
  const markup = document.querySelector("#curCheatSheet svg").outerHTML;

  const raster = async (keep) => {
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const svg = doc.documentElement;
    for (const el of [...svg.querySelectorAll("[data-name]")]) {
      if (!keep.includes(el.getAttribute("data-name"))) el.remove();
    }
    svg.setAttribute("width", String(canvas));
    svg.setAttribute("height", String(canvas));
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(new XMLSerializer().serializeToString(svg));
    });
    const surface = document.createElement("canvas");
    surface.width = canvas;
    surface.height = height;
    const ctx = surface.getContext("2d", { willReadFrequently: true });
    // Neither paper nor any ground a composition draws, so a run painted in
    // either still reads as a pixel that moved.
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, canvas, height);
    ctx.drawImage(image, 0, -top, canvas, canvas);
    return ctx.getImageData(0, 0, canvas, height).data;
  };

  const without = await raster(base);
  const withRun = await raster([...base, run]);

  const highest = new Int32Array(canvas).fill(-1);
  const lowest = new Int32Array(canvas).fill(-1);
  let pixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < canvas; x += 1) {
      const i = (y * canvas + x) * 4;
      const moved =
        Math.abs(without[i] - withRun[i]) +
        Math.abs(without[i + 1] - withRun[i + 1]) +
        Math.abs(without[i + 2] - withRun[i + 2]) +
        Math.abs(without[i + 3] - withRun[i + 3]);
      if (moved > 24) {
        if (highest[x] === -1) highest[x] = y + top;
        lowest[x] = y + top;
        pixels += 1;
      }
    }
  }
  let inkTop = Infinity;
  let inkBottom = -Infinity;
  let inkLeft = Infinity;
  let inkRight = -Infinity;
  for (let x = 0; x < canvas; x += 1) {
    if (highest[x] === -1) continue;
    inkTop = Math.min(inkTop, highest[x]);
    inkBottom = Math.max(inkBottom, lowest[x]);
    inkLeft = Math.min(inkLeft, x);
    inkRight = Math.max(inkRight, x);
  }
  const finite = (v) => (Number.isFinite(v) ? v : null);
  return {
    pixels,
    inkTop: finite(inkTop),
    inkBottom: finite(inkBottom),
    inkLeft: finite(inkLeft),
    inkRight: finite(inkRight),
  };
};

const runtime = await loadChromium();
const skip = runtime.chromium ? false : runtime.reason;
let browser;
let site;
if (!skip) {
  site = await serveRepository();
  browser = await runtime.chromium.launch();
}

after(async () => {
  await browser?.close();
  site?.server.close();
});

/** A page with the catalog arrived, and every page error collected. */
async function openPage() {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${site.base}index.html`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.catalog !== undefined, null, {
    timeout: 30000,
  });
  return { context, page, errors };
}

/** Selects a cheatsheet and waits for its composed `svg` to settle. */
async function choose(page, category, slug) {
  await page.selectOption("#category", category);
  await page.selectOption("#example", slug);
  await page.waitForFunction(
    () => Boolean(document.querySelector('#curCheatSheet svg [data-name="title"]')),
    null,
    { timeout: 30000 }
  );
  const signature = () =>
    page.evaluate(() => {
      const svg = document.querySelector("#curCheatSheet svg");
      return `${svg.querySelectorAll("text").length}:${svg.querySelectorAll("image").length}:${
        svg.querySelector('[data-name="title"]')?.getAttribute("font-size")
      }`;
    });
  let last = await signature();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.waitForTimeout(100);
    const now = await signature();
    if (now === last) return;
    last = now;
  }
  throw new Error(`${slug}: the composed svg never settled`);
}

// --- the colour distance the syntax case reads -----------------------------

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

/** sRGB to CIE Lab, through XYZ on the D65 white point. */
function toLab(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 distance, the plain Euclidean one in Lab. */
function deltaE(a, b) {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

// ---------------------------------------------------------------------------

for (const set of SETS) {
  const record = compositionNamed(set.id);
  const { bands, canvas, rules, divisions, brandSlots, panelFreedom, runs } = record.language;

  test(`${set.id}: the masthead lockup is drawn inside its band, on the top the record gives it`, { skip }, async () => {
    const { context, page, errors } = await openPage();
    const band = { top: 0, height: bands.masthead.height, canvas };
    const rows = [];
    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const m = await page.evaluate(MEASURE);
      assert.equal(m.masthead.height, bands.masthead.height, `${sheet.slug}: masthead band height`);
      const wordmark = await page.evaluate(INK_OF, {
        run: "wordmark",
        base: ["background", "masthead"],
        ...band,
      });
      assert.ok(wordmark.pixels > 0, `${sheet.slug}: the wordmark drew no ink in the masthead band`);
      const mark = m.hasMark
        ? await page.evaluate(INK_OF, { run: "masthead-mark", base: ["background", "masthead"], ...band })
        : null;

      const top = mark ? Math.min(wordmark.inkTop, mark.inkTop) : wordmark.inkTop;
      const bottom = mark ? Math.max(wordmark.inkBottom, mark.inkBottom) : wordmark.inkBottom;
      rows.push({ slug: sheet.slug, wordmark, mark, top, bottom, below: bands.masthead.height - bottom });

      // Nothing drawn over the trim, and nothing reaching the band below it.
      assert.ok(top > 0, `${sheet.slug}: the lockup's ink starts at row ${top}, on the canvas trim`);
      assert.ok(
        bottom < bands.masthead.height,
        `${sheet.slug}: the lockup's ink reaches ${bottom}, past the masthead band's ${bands.masthead.height}`
      );

      // The cap has to fit the band from wherever the wordmark was set. Where
      // that is, is each composition's own: the fifth set shares the mark's top
      // and the fourth sets its wordmark below the mark, so only the fit is
      // held here and the placement is held per set by the figures above.
      const cap = Math.round(m.wordmark.fontSize * CAP_SHARE_OF_SIZE);
      assert.ok(
        wordmark.inkTop + cap <= bands.masthead.height,
        `${sheet.slug}: a ${cap} px cap from ${wordmark.inkTop} does not fit the ${bands.masthead.height} px band`
      );

      if (mark) {
        // One lockup rather than two marks: a shared top, and no collision.
        assert.ok(
          Math.abs(mark.inkTop - brandSlots.logo.top) <= RASTER_SLACK,
          `${sheet.slug}: the mark's ink tops at ${mark.inkTop}, not the recorded ${brandSlots.logo.top}`
        );
        assert.ok(
          Math.abs(mark.inkBottom - (brandSlots.logo.top + brandSlots.logo.height)) <= RASTER_SLACK,
          `${sheet.slug}: the mark's ink foots at ${mark.inkBottom}, not the recorded ` +
            `${brandSlots.logo.top + brandSlots.logo.height}`
        );
        assert.ok(
          wordmark.inkRight < mark.inkLeft || mark.inkRight < wordmark.inkLeft,
          `${sheet.slug}: the wordmark and the mark overlap horizontally`
        );
      }
    }
    for (const r of rows) {
      console.log(
        `  ${r.slug}: lockup ink ${r.top}..${r.bottom} in a ${bands.masthead.height} px band, ${r.top} px above and ` +
          `${r.below} below; wordmark x ${r.wordmark.inkLeft}..${r.wordmark.inkRight}` +
          (r.mark ? `, mark x ${r.mark.inkLeft}..${r.mark.inkRight}` : ", no mark placed")
      );
    }
    // A masthead stepped down on some sheets of a set and not others is not a set.
    assert.equal(new Set(rows.map((r) => r.top)).size, 1, `${set.id}: the set's lockup tops at more than one row`);
    assert.equal(new Set(rows.map((r) => r.bottom)).size, 1, `${set.id}: the set's lockup foots at more than one row`);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test(`${set.id}: both hairlines are drawn at the weight and height the record gives them`, { skip }, async () => {
    const { context, page, errors } = await openPage();
    const seen = new Set();
    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const m = await page.evaluate(MEASURE);
      for (const name of ["ruleUpperLeft", "ruleUpperRight", "ruleLowerLeft", "ruleLowerRight"]) {
        assert.ok(m[name], `${sheet.slug}: drew no ${name}`);
      }
      const upper = m.ruleUpperLeft;
      const lower = m.ruleLowerLeft;
      // The recorded pair, the way up the record has it. Three compositions
      // draw three different pairs, so this is read off the record rather than
      // held to one shape.
      assert.equal(upper.height, rules.upper.height, `${sheet.slug}: the upper hairline's weight`);
      assert.equal(lower.height, rules.lower.height, `${sheet.slug}: the lower hairline's weight`);
      assert.equal(upper.y, rules.upper.y, `${sheet.slug}: the upper hairline's height on the sheet`);
      assert.equal(lower.y, rules.lower.y, `${sheet.slug}: the lower hairline's height on the sheet`);
      assert.equal(upper.width, rules.width, `${sheet.slug}: the hairline's length`);
      // A bar on each trim, the same bar at both.
      assert.equal(m.ruleUpperLeft.x, 0, `${sheet.slug}: the left upper hairline is off the trim`);
      assert.equal(m.ruleUpperRight.right, canvas, `${sheet.slug}: the right upper hairline is off the trim`);
      assert.equal(m.ruleUpperLeft.height, m.ruleUpperRight.height, `${sheet.slug}: the upper pair differ in weight`);
      assert.equal(m.ruleLowerLeft.height, m.ruleLowerRight.height, `${sheet.slug}: the lower pair differ in weight`);
      assert.equal(m.ruleUpperLeft.y, m.ruleUpperRight.y, `${sheet.slug}: the upper pair sit at different heights`);
      assert.equal(m.ruleLowerLeft.y, m.ruleLowerRight.y, `${sheet.slug}: the lower pair sit at different heights`);
      seen.add(`upper ${upper.y}+${upper.height}, lower ${lower.y}+${lower.height}, ${upper.width} long`);
    }
    console.log(`  ${set.id}: ${[...seen].join(" | ")}`);
    assert.equal(seen.size, 1, `${set.id}: the set does not draw one pair of hairlines`);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test(`${set.id}: no title's ink reaches a hairline, and none is set past its measure`, { skip }, async () => {
    const { context, page, errors } = await openPage();
    const band = { top: Math.max(0, bands.heading.y - STEP), canvas };
    band.height = Math.min(canvas, bands.heading.y + bands.heading.height + STEP) - band.top;
    const rows = [];
    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const m = await page.evaluate(MEASURE);
      const ink = await page.evaluate(INK_OF, { run: "title", base: ["background"], ...band });
      assert.ok(ink.pixels > 0, `${sheet.slug}: the title drew no ink`);
      const gapLeft = ink.inkLeft - m.ruleUpperLeft.right;
      const gapRight = m.ruleUpperRight.x - ink.inkRight;
      rows.push({ slug: sheet.slug, title: m.title.text, ink, gapLeft, gapRight });

      // The bars are the title's measure, so reaching one is the failure.
      assert.ok(gapLeft > 0, `${sheet.slug}: the title's ink reaches the left hairline (${gapLeft} px)`);
      assert.ok(gapRight > 0, `${sheet.slug}: the title's ink reaches the right hairline (${gapRight} px)`);
      assert.ok(
        ink.inkRight - ink.inkLeft <= rules.measure + SLACK,
        `${sheet.slug}: the title is ${ink.inkRight - ink.inkLeft} px wide, past its ${rules.measure} px measure`
      );
      // Where the two bars sit against the title is each composition's own -
      // the fifth brackets it half a step above the ink and half below the
      // baseline, where the third's lower bar sits above the baseline
      // altogether - so that is held per set by `rules` in the case above
      // rather than asserted as one shape here.
      //
      // The title is set at the cap the record gives it, read off the glyphs.
      //
      // A round capital is drawn slightly over the cap line so that it reads as
      // the same height as a flat one, so a title opening with O, C, G or S
      // tops above the recorded figure by a share of its own cap rather than by
      // a fixed amount. The allowance scales with the cap for that reason: at
      // the third set's 196 px it is three pixels, at the fifth's 154 px two.
      const overshoot = RASTER_SLACK + runs.title.cap * 0.02;
      assert.ok(
        Math.abs(ink.inkTop - runs.title.inkTop) <= overshoot,
        `${sheet.slug}: the title's ink tops at ${ink.inkTop}, not the recorded ${runs.title.inkTop} ` +
          `(allowing ${overshoot.toFixed(2)} px of overshoot)`
      );
    }
    const tightest = rows.reduce((a, b) =>
      Math.min(b.gapLeft, b.gapRight) < Math.min(a.gapLeft, a.gapRight) ? b : a
    );
    console.log(
      `  ${set.id}: tightest gutter ${Math.min(tightest.gapLeft, tightest.gapRight)} px beside ` +
        `"${tightest.title}" on ${tightest.slug}, in a ${rules.measure} px measure`
    );
    assert.deepEqual(errors, []);
    await context.close();
  });

  test(`${set.id}: the listing is clear of the rail, and every sheet of the set is one length`, { skip }, async () => {
    const { context, page, errors } = await openPage();
    const rows = [];
    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const m = await page.evaluate(MEASURE);
      const leftmost = Math.min(...m.codes.map((c) => c.x));
      const fromRail = leftmost - m.spine.right;
      const fromPanel = leftmost - m.panel.x;
      // A blank row draws no `text`, so the rows the page drew are the inked
      // ones and the length is the document's.
      const doc = JSON.parse(readFileSync(join(root, ...sheet.slug.split("/"), "sheet.json"), "utf8"));
      const span = Math.max(...m.codes.map((c) => c.index)) + 1;
      rows.push({ slug: sheet.slug, rows: doc.code.length, inked: m.codes.length, leftmost, fromRail, fromPanel });

      assert.equal(m.spine.width, divisions.spine.width, `${sheet.slug}: the rail's width`);
      assert.equal(span, doc.code.length, `${sheet.slug}: the page drew rows 0..${span - 1} of ${doc.code.length}`);
      assert.ok(
        fromRail > 0,
        `${sheet.slug}: the listing starts at ${leftmost}, on or left of the rail's edge ${m.spine.right}`
      );
      assert.ok(
        fromPanel >= panelFreedom.leftInset.min - SLACK && fromPanel <= panelFreedom.leftInset.max + SLACK,
        `${sheet.slug}: the leftmost line's inset is ${fromPanel}, outside the set's ` +
          `${panelFreedom.leftInset.min} to ${panelFreedom.leftInset.max}`
      );
    }
    const lengths = new Set(rows.map((r) => r.rows));
    console.log(
      `  ${set.id}: ${rows.length} sheets of ${[...lengths].join(", ")} rows, leftmost ink ` +
        `${Math.min(...rows.map((r) => r.fromRail))} to ${Math.max(...rows.map((r) => r.fromRail))} px clear of a ` +
        `${divisions.spine.width} px rail`
    );
    assert.deepEqual(errors, []);
    await context.close();
  });

  test(`${set.id}: the drawn footer fits its follow line clear of the mark square`, () => {
    // The page places the brand strip over both, so this is the route a sheet
    // takes where the strip is not drawable - which is every composition in
    // Node, and the one the record's follow line cap describes.
    const rows = [];
    for (const sheet of set.sheets) {
      const doc = JSON.parse(readFileSync(join(root, ...sheet.slug.split("/"), "sheet.json"), "utf8"));
      const { composition, variation } = composeSheet(doc, { seed: doc.seed });
      const byName = new Map();
      for (const el of composition.elements ?? []) if (el.name) byName.set(el.name, el);
      const follow = byName.get("follow-line");
      const mark = byName.get("mark-square");
      assert.ok(follow, `${sheet.slug}: composed no follow line`);
      assert.ok(mark, `${sheet.slug}: composed no mark square`);
      assert.deepEqual(variation.notes, [], `${sheet.slug}: composed with a note, so a run was stepped down`);

      const gap = follow.x - (mark.x + mark.width);
      const cap = follow.fontSize * CAP_SHARE_OF_SIZE;
      rows.push({ slug: sheet.slug, text: follow.text, cap, gap });
      assert.ok(gap > 0, `${sheet.slug}: the follow line starts ${gap} px from the mark square, so the two overlap`);
      assert.ok(
        Math.abs(cap - runs.followLine.cap) <= SLACK,
        `${sheet.slug}: the follow line is set at a ${cap.toFixed(2)} px cap, not the recorded ${runs.followLine.cap}`
      );
      assert.equal(follow.x, runs.followLine.left, `${sheet.slug}: the follow line's left`);
    }
    const caps = new Set(rows.map((r) => r.cap.toFixed(2)));
    const texts = new Set(rows.map((r) => r.text));
    console.log(
      `  ${set.id}: "${[...texts][0]}" at a ${[...caps].join(", ")} px cap, ${rows[0].gap} px clear of the mark square`
    );
    assert.equal(caps.size, 1, `${set.id}: the set draws the follow line at ${caps.size} caps`);
    assert.equal(texts.size, 1, `${set.id}: the set draws ${texts.size} different follow lines`);
  });
}

test("every set's six syntax inks are as separable as the sets already drawn", () => {
  // `contrast.mjs` measures every ink against its ground, which is legibility.
  // Nothing measures one ink against another, which is the question a reader
  // asks when a keyword and an identifier sit on the same line.
  //
  // There is no recorded floor for it, so none is invented: the sets are held
  // against each other. A composition whose closest pair is closer than every
  // other composition's closest pair is the one to look at.
  const measured = SETS.map(({ id }) => {
    const syntax = compositionNamed(id).language.syntax;
    const roles = Object.keys(syntax);
    const pairs = [];
    for (let i = 0; i < roles.length; i += 1) {
      for (let j = i + 1; j < roles.length; j += 1) {
        pairs.push({ pair: `${roles[i]}/${roles[j]}`, de: deltaE(syntax[roles[i]], syntax[roles[j]]) });
      }
    }
    pairs.sort((a, b) => a.de - b.de);
    return { id, roles, syntax, closest: pairs[0] };
  });

  for (const m of measured) {
    assert.equal(m.roles.length, 6, `${m.id} carries ${m.roles.length} syntax inks`);
    assert.equal(
      new Set(Object.values(m.syntax).map((h) => h.toUpperCase())).size,
      6,
      `${m.id} draws one ink for two of its six roles`
    );
    console.log(`  ${m.id}: closest pair ${m.closest.pair} at dE ${m.closest.de.toFixed(1)}`);
  }

  // A fifth of the Lab space's useful range, and comfortably under every set
  // drawn so far - so this reports a composition that collapsed two roles into
  // one colour rather than one that merely drew a close pair.
  const FLOOR = 15;
  const tight = measured.filter((m) => m.closest.de < FLOOR);
  assert.deepEqual(
    tight.map((m) => `${m.id} ${m.closest.pair} at dE ${m.closest.de.toFixed(1)}`),
    [],
    `a set's two syntax inks sit under dE ${FLOOR} of each other`
  );
});

test("the catalog holds a set composition for these cases to read", { skip: false }, () => {
  assert.ok(SETS.length > 0, "no sheet of the catalog names a set composition");
  for (const set of SETS) {
    assert.ok(set.sheets.length > 0, `${set.id} is named by no sheet`);
    compositionNamed(set.id);
  }
  console.log(`  ${SETS.map((s) => `${s.id} (${s.sheets.length})`).join(", ")}`);
});
