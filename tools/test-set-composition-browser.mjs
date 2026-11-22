// What an engine does with a set composition, as against what the record says.
//
// `tools/test-set-compositions.mjs` holds `api/cheatsheet/compositions.mjs` and
// `DESIGN_LANGUAGE.md` against each other: every colour, every ratio, every cap,
// every stem and both step tables. It passed 47 of 47 on the third composition
// the day that composition shipped with two faults in it, and it was right to -
// both faults were in what an engine *does* with a correct record, which is a
// question no reading of the record can ask.
//
// 1. **A glyph collision.** The title and the subtitle were stepped a flat
//    `STEP` apart from the title's baseline, and at this set's 196 px title cap
//    a descender reaches 59.70 px. Whether a sheet collided was decided by
//    whether its title happened to carry a `g`, `y`, `p` or `j`: two of the nine
//    fused their two runs into one mass. **Neither `getBBox` nor
//    `getExtentOfChar` can see it** - both report the face's full ascent and
//    descent, so both said the title and the subtitle overlapped by the same
//    40.4 px on all nine sheets whatever words were set. That constancy is the
//    tell, and it is why the case below rasterises each run alone and compares
//    them column by column instead.
// 2. **A letterboxed raster.** `placeBrand` draws every brand asset
//    `xMidYMid meet`, so a footer slot whose aspect is wider than the strip's
//    centres the strip and leaves bare paper down the trim. The slot was 3360 x
//    336 against the strip's 9.8642, which stood the brand mark 22.81 px off an
//    edge the divider directly above it and the rail above that both sit on.
//
// Both are differences between a figure and what is drawn from it, so both are
// read here off the composed `svg` in the page's own DOM and off a raster of it,
// rather than off a composition in Node.
//
// ## Every sheet naming a composition, not one set
//
// The cases below take their subjects from `cheatsheets.json`: every sheet
// carrying a `composition`, grouped by the composition it names. Nine sheets
// name one today and twenty-eight name none - a document naming none composes
// through the recorded theme and layout, which is what it has always done - so
// a new set reaches these cases by existing rather than by being added to a
// list here. The per-set claims are made per group for the same reason.
//
// Served over a throwaway `node:http` server on an ephemeral port, the way
// `tools/test-sheet-accent-arrival-browser.mjs` serves it, because what is
// measured is the page's own composed graphic.
//
// Nothing is added to the repository. Playwright is looked for at run time and
// every case skips with the reason where it is absent. Install it for a machine
// that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// Run with: node --test tools/test-set-composition-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compositionNamed } from "../api/cheatsheet/compositions.mjs";
import { FOOTER_LINKS } from "../api/cheatsheet/brand.mjs";
import { SHEET_FACE } from "../api/cheatsheet/faces.mjs";
import { STEP } from "../api/cheatsheet/language.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. Identical to
// `tools/test-sheet-accent-arrival-browser.mjs`, so a machine that runs one
// runs both.
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

/**
 * Every sheet of the catalog that names a set composition, by the composition
 * it names.
 *
 * The sheets that name none are not an absence to report: twenty-eight
 * documents were written before a document could name one, and they compose
 * through the recorded theme and layout. {@link compositionNamed} is what turns
 * a named id into the record these cases measure against, and it throws on an
 * id nothing records, which `tools/test-set-compositions.mjs` already covers.
 */
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

/** The face's descent as a share of the cap it is set at, which is 0.3046. */
const DESCENT_SHARE = SHEET_FACE.descender / SHEET_FACE.capHeight;

/** Cap height as a share of the font size a run is set at, which is 0.719. */
const CAP_SHARE_OF_SIZE = SHEET_FACE.capHeight / SHEET_FACE.unitsPerEm;

/**
 * The three display runs, top to bottom, and how the page names each.
 *
 * `lead-in` rather than `leadIn`: the record's key and the `data-name` the
 * composition writes are not the same string, and reading the DOM by the
 * record's key is a lookup that silently returns nothing.
 */
const DISPLAY_RUNS = [
  { key: "title", name: "title" },
  { key: "subtitle", name: "subtitle" },
  { key: "leadIn", name: "lead-in" },
];

/** A pixel of slack, for a figure an engine rounded on its way to the DOM. */
const SLACK = 1;

/** Every reading these cases take off a composed sheet, in composition units. */
const MEASURE = () => {
  const svg = document.querySelector("#curCheatSheet svg");
  if (!svg) return { missing: true };
  const named = (name) => svg.querySelector(`[data-name="${name}"]`);
  const rectOf = (name) => {
    const el = named(name);
    if (!el) return null;
    const read = (attribute) => Number(el.getAttribute(attribute) ?? 0);
    const x = read("x");
    const y = read("y");
    const width = read("width");
    const height = read("height");
    return { x, y, width, height, right: x + width, bottom: y + height };
  };
  const runOf = (name) => {
    const el = named(name);
    if (!el) return null;
    return { text: el.textContent, fontSize: Number(el.getAttribute("font-size")) };
  };
  const imageOf = (name) => {
    const el = svg.querySelector(`image[data-name="${name}"]`);
    if (!el) return null;
    const read = (attribute) => Number(el.getAttribute(attribute) ?? 0);
    return { x: read("x"), y: read("y"), width: read("width"), height: read("height") };
  };

  // A code line is `code-<line>`, or `code-<line>-<run>` once the accent reader
  // has split it token by token. Both shapes are folded to one row per line
  // here, keyed by the line's own index, so a reading is per line whether the
  // reader had landed or not.
  const byLine = new Map();
  for (const el of svg.querySelectorAll("text[data-name]")) {
    const match = /^code-(\d+)(?:-\d+)?$/.exec(el.getAttribute("data-name"));
    if (!match) continue;
    const index = Number(match[1]);
    const tspan = el.querySelector("tspan");
    const x = Number(tspan?.getAttribute("x"));
    const y = Number(tspan?.getAttribute("y"));
    const held = byLine.get(index) ?? { index, x, y, fontSize: Number(el.getAttribute("font-size")) };
    held.x = Math.min(held.x, x);
    byLine.set(index, held);
  }

  return {
    panel: rectOf("code-panel"),
    divider: rectOf("divider"),
    spine: rectOf("spine"),
    footer: imageOf("footer-lockup"),
    markSquare: rectOf("mark-square"),
    runs: {
      wordmark: runOf("wordmark"),
      title: runOf("title"),
      subtitle: runOf("subtitle"),
      leadIn: runOf("lead-in"),
    },
    codes: [...byLine.values()].sort((a, b) => a.index - b.index),
  };
};

/**
 * Where each display run's ink actually is, read off a raster of the sheet.
 *
 * Each run is drawn on its own over the paper and the band is scanned for the
 * topmost and bottommost inked row in every column, so **do these two runs
 * touch** is asked of the glyphs rather than of the face's ascent and descent.
 * The answer per pair is the narrowest gap in any column where both runs have
 * ink, and the count of columns where that gap has closed.
 *
 * Serialised from the `svg` already in the page rather than re-composed: the
 * brand assets it carries are data URLs, so the raster needs no network and the
 * ink measured is the ink the page drew.
 */
const INK_GAPS = async ({ names, top, height, canvas }) => {
  const markup = document.querySelector("#curCheatSheet svg").outerHTML;

  const scan = async (keep) => {
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    const svg = doc.documentElement;
    for (const el of [...svg.querySelectorAll("[data-name]")]) {
      const name = el.getAttribute("data-name");
      if (name !== "background" && name !== keep) el.remove();
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
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas, height);
    ctx.drawImage(image, 0, -top, canvas, canvas);
    const data = ctx.getImageData(0, 0, canvas, height).data;
    const highest = new Int32Array(canvas).fill(-1);
    const lowest = new Int32Array(canvas).fill(-1);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < canvas; x += 1) {
        const i = (y * canvas + x) * 4;
        if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) {
          if (highest[x] === -1) highest[x] = y + top;
          lowest[x] = y + top;
        }
      }
    }
    let inkTop = Infinity;
    let inkBottom = -Infinity;
    for (let x = 0; x < canvas; x += 1) {
      if (highest[x] === -1) continue;
      inkTop = Math.min(inkTop, highest[x]);
      inkBottom = Math.max(inkBottom, lowest[x]);
    }
    return { highest, lowest, inkTop, inkBottom };
  };

  const scanned = [];
  for (const name of names) scanned.push({ name, ...(await scan(name)) });

  const pairs = [];
  for (let i = 0; i + 1 < scanned.length; i += 1) {
    const upper = scanned[i];
    const lower = scanned[i + 1];
    let narrowest = Infinity;
    let atColumn = null;
    let touching = 0;
    for (let x = 0; x < canvas; x += 1) {
      if (upper.lowest[x] === -1 || lower.highest[x] === -1) continue;
      const gap = lower.highest[x] - upper.lowest[x];
      if (gap < narrowest) {
        narrowest = gap;
        atColumn = x;
      }
      if (gap <= 0) touching += 1;
    }
    pairs.push({
      pair: `${upper.name}/${lower.name}`,
      narrowest: narrowest === Infinity ? null : narrowest,
      atColumn,
      touching,
    });
  }
  return {
    pairs,
    extents: scanned.map(({ name, inkTop, inkBottom }) => ({
      name,
      inkTop: Number.isFinite(inkTop) ? inkTop : null,
      inkBottom: Number.isFinite(inkBottom) ? inkBottom : null,
    })),
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

/**
 * Selects a cheatsheet and waits for its composed `svg` to settle.
 *
 * Two waits rather than one, and the second is the one that matters. A sheet
 * chosen before the accent reader lands is composed in the per-line roles its
 * document carries and **redrawn** token by token when the reader arrives, so
 * the box holds one whole `svg`, then another. The geometry is identical either
 * way, but a reading taken across the swap is taken off a DOM being replaced, so
 * the signature below is read until it stops moving.
 */
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

for (const set of SETS) {
  const record = compositionNamed(set.id);
  const { bands, panelFreedom, canvas } = record.language;
  // A step above the heading band and a step below it, so a stack that has
  // outgrown its band is measured rather than clipped by the window it is
  // measured in. Both the clearance case and the band case below read this.
  const window = {
    top: Math.max(0, bands.heading.y - STEP),
    height: Math.min(canvas, bands.heading.y + bands.heading.height + STEP) -
      Math.max(0, bands.heading.y - STEP),
    canvas,
    names: DISPLAY_RUNS.map((run) => run.name),
  };

  test(`${set.id}: no two display runs' ink shares a column`, { skip }, async () => {
    const { context, page, errors } = await openPage();
    const measured = [];
    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const ink = await page.evaluate(INK_GAPS, window);
      for (const pair of ink.pairs) {
        assert.notEqual(
          pair.narrowest,
          null,
          `${sheet.slug}: the ${pair.pair} runs share no column, so nothing was compared`
        );
        assert.ok(
          pair.narrowest > 0,
          `${sheet.slug}: the ${pair.pair} ink collides - narrowest column gap ${pair.narrowest} ` +
            `at x=${pair.atColumn}, ${pair.touching} columns touching`
        );
      }
      measured.push({ slug: sheet.slug, ink });
    }

    // Every gap clears the descent of the run above it, which is the figure the
    // record steps by. A pair that clears by a pixel is the same fault with a
    // different title, so what is held here is the rule rather than the outcome.
    for (const { slug, ink } of measured) {
      for (let i = 0; i + 1 < DISPLAY_RUNS.length; i += 1) {
        const above = record.language.runs[DISPLAY_RUNS[i].key];
        const below = record.language.runs[DISPLAY_RUNS[i + 1].key];
        const gap = below.inkTop - above.baseline;
        assert.ok(
          gap > above.cap * DESCENT_SHARE,
          `${slug}: the record steps ${DISPLAY_RUNS[i + 1].key} ${gap.toFixed(2)} px under the ` +
            `${DISPLAY_RUNS[i].key} baseline, which does not clear the ` +
            `${(above.cap * DESCENT_SHARE).toFixed(2)} px a descender reaches at its ${above.cap} px cap`
        );
      }
      const lowest = Math.max(...ink.extents.map((e) => e.inkBottom ?? -Infinity));
      const highest = Math.min(...ink.extents.map((e) => e.inkTop ?? Infinity));
      assert.ok(
        highest >= bands.heading.y,
        `${slug}: the display stack's ink starts at ${highest}, above the heading band's ${bands.heading.y}`
      );
      assert.ok(
        lowest <= bands.heading.y + bands.heading.height,
        `${slug}: the display stack's ink reaches ${lowest}, past the heading band's foot at ` +
          `${bands.heading.y + bands.heading.height}`
      );
    }
    assert.deepEqual(errors, [], `${set.id}: a page error was raised while measuring the set`);
    await context.close();
  });

  test(`${set.id}: the footer strip's left edge sits on the trim`, { skip }, async () => {
    const { context, page } = await openPage();
    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const m = await page.evaluate(MEASURE);
      assert.ok(!m.missing, `${sheet.slug}: an svg landed`);

      // The two edges the footer is read against, and both are flush by
      // construction: the divider runs the width of the canvas and the rail
      // starts at the trim.
      assert.ok(m.divider, `${sheet.slug}: the divider above the footer is drawn`);
      assert.equal(m.divider.x, 0, `${sheet.slug}: the divider runs from the left trim`);
      assert.equal(m.divider.right, canvas, `${sheet.slug}: the divider runs to the right trim`);
      assert.ok(m.spine, `${sheet.slug}: the rail is drawn`);
      assert.equal(m.spine.x, 0, `${sheet.slug}: the rail starts at the left trim`);

      // A sheet whose brand assets did not resolve draws the mark square and the
      // follow line instead, and there is then no strip to measure.
      assert.ok(
        m.footer || m.markSquare,
        `${sheet.slug}: a footer is drawn, as the brand strip or as the mark square`
      );
      if (!m.footer) continue;

      // `placeBrand` writes the strip `xMidYMid meet`: scaled by the smaller of
      // the two ratios and centred on the other axis. So the strip's own left
      // edge is where the slot's left edge is plus half of whatever width the
      // slot has over the scaled strip, and that half is the letterbox.
      const scale = Math.min(m.footer.width / FOOTER_LINKS.width, m.footer.height / FOOTER_LINKS.height);
      const left = m.footer.x + (m.footer.width - FOOTER_LINKS.width * scale) / 2;
      assert.ok(
        left <= m.divider.x + SLACK,
        `${sheet.slug}: the footer strip is letterboxed, so its mark starts at x=${left.toFixed(2)} ` +
          `while the divider above it and the rail both start at x=${m.divider.x}. The slot is ` +
          `${m.footer.width} x ${m.footer.height}, aspect ${(m.footer.width / m.footer.height).toFixed(4)}, ` +
          `against the strip's ${(FOOTER_LINKS.width / FOOTER_LINKS.height).toFixed(4)}`
      );
      assert.ok(
        m.footer.x + m.footer.width <= canvas + SLACK,
        `${sheet.slug}: the footer slot ends inside the trim (${m.footer.x + m.footer.width})`
      );
    }
    await context.close();
  });

  test(`${set.id}: the title leads the wordmark, at one cap across the set`, { skip }, async () => {
    const { context, page } = await openPage();
    const caps = [];
    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const m = await page.evaluate(MEASURE);
      assert.ok(!m.missing, `${sheet.slug}: an svg landed`);
      for (const { key, name } of DISPLAY_RUNS) {
        const run = m.runs[key];
        assert.ok(run, `${sheet.slug}: ${name} is drawn`);
        assert.ok(run.text?.trim().length, `${sheet.slug}: ${name} carries text`);
      }
      assert.ok(
        m.runs.title.fontSize > m.runs.wordmark.fontSize,
        `${sheet.slug}: the title (${m.runs.title.fontSize}) does not lead the wordmark ` +
          `(${m.runs.wordmark.fontSize})`
      );
      caps.push({ slug: sheet.slug, size: m.runs.title.fontSize });
    }

    // One cap across the set, which is the treatment rather than a coincidence:
    // a title stepped down to fit its own measure is a sheet whose display type
    // is sized by how long its title happens to be, and nine of those do not
    // read as one set.
    const sizes = new Set(caps.map((one) => one.size));
    assert.equal(
      sizes.size,
      1,
      `${set.id}: the set's titles are drawn at ${sizes.size} sizes rather than one: ` +
        JSON.stringify(caps)
    );
    await context.close();
  });

  test(`${set.id}: the panel keeps inside the set's own freedom`, { skip }, async () => {
    const { context, page } = await openPage();
    const inside = (what, value, range, where) =>
      assert.ok(
        value >= range.min - SLACK && value <= range.max + SLACK,
        `${where}: ${what} is ${value.toFixed(2)}, outside the ${range.min} to ${range.max} this set allows`
      );

    for (const sheet of set.sheets) {
      await choose(page, sheet.category, sheet.slug);
      const m = await page.evaluate(MEASURE);
      assert.ok(!m.missing, `${sheet.slug}: an svg landed`);
      assert.ok(m.panel, `${sheet.slug}: the code panel is drawn`);
      assert.ok(m.codes.length > 1, `${sheet.slug}: the panel holds more than one code line`);

      // The cap the lines are set at is not in the DOM; the size is, and the
      // face's cap height is a known share of it. The composition floors that
      // cap to a whole pixel, which is what `SLACK` covers.
      const codeCap = m.codes[0].fontSize * CAP_SHARE_OF_SIZE;
      const topPadding = m.codes[0].y - m.panel.y - codeCap;
      inside("the panel's top padding", topPadding, panelFreedom.topPadding, sheet.slug);
      inside("the leftmost line's inset", m.codes[0].x - m.panel.x, panelFreedom.leftInset, sheet.slug);

      // Only consecutive lines, because a blank row of the document takes an
      // index and draws nothing: the gap across one is two spacings, and
      // averaging it in would read as a spacing no line was set at.
      const spacings = [];
      for (let i = 0; i + 1 < m.codes.length; i += 1) {
        if (m.codes[i + 1].index - m.codes[i].index !== 1) continue;
        spacings.push(m.codes[i + 1].y - m.codes[i].y);
      }
      assert.ok(spacings.length > 0, `${sheet.slug}: no two consecutive code lines to measure`);
      for (const spacing of spacings) {
        inside("the line spacing", spacing, panelFreedom.lineSpacing, sheet.slug);
      }

      // And the lines stay in the panel they are spaced inside, which is what
      // makes the figures above a frame rather than three numbers.
      const last = m.codes[m.codes.length - 1];
      assert.ok(
        last.y <= m.panel.bottom + SLACK,
        `${sheet.slug}: the last code line's baseline is ${last.y}, past the panel's foot at ${m.panel.bottom}`
      );
      assert.ok(
        m.codes[0].x >= m.spine.right,
        `${sheet.slug}: the code clears the rail (${m.codes[0].x} against its right edge ${m.spine.right})`
      );
    }
    await context.close();
  });
}

test("the catalog holds a set composition for these cases to read", { skip: false }, () => {
  // The one thing above that a skipped engine hides: a catalog that names no
  // composition at all would leave this file with nothing to assert and
  // nothing to say about it. Held outside the engine so it fails on any
  // machine.
  assert.ok(SETS.length > 0, "no sheet in cheatsheets.json names a set composition");
  for (const set of SETS) {
    assert.ok(set.sheets.length > 0, `${set.id} is named by no sheet`);
    assert.doesNotThrow(() => compositionNamed(set.id), `${set.id} is a composition on record`);
  }
});
