// What the page does while the accent reader is still arriving.
//
// The reader is the heaviest thing this repository can load - the `markdown`
// part of the vendored surface, 328 KB gzipped against 50 KB for the
// composition entry the page draws through - so when it arrives relative to
// everything else is a design decision rather than an accident. Three things
// are held here, and each of them was wrong at least once:
//
// 1. **The catalog does not wait on it.** It was in the same `Promise.all` as
//    the manifest fetch, and `Promise.all` settles on its slowest member, so
//    the first interactive control on the page was gated behind the largest
//    download the page makes. Both the code and the comment above it said
//    nothing waited on it. On loopback the ordering is identical and the cost
//    is invisible, which is why it survived being written down twice.
// 2. **A sheet drawn before it lands still draws**, in the per-line roles
//    every `sheet.json` carries.
// 3. **And is redrawn when it lands**, rather than keeping the fallback
//    colours for as long as the reader stays on that sheet.
//
// Served over a throwaway `node:http` server on an ephemeral port, the way
// `tools/test-page-structure-browser.mjs` serves it: these need the page
// itself, not just a composition, because what they measure is when the
// page's own controls and graphic arrive. `tools/test-sheet-accent-seams-browser.mjs`
// is the one that needs no server, because its subject is the composition.
//
// Nothing is added to the repository. Playwright is looked for at run time and
// every case skips with the reason where it is absent. Install it for a
// machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// Run with: node --test tools/test-sheet-accent-arrival-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  ".svg": "image/svg+xml",
  ".ico": "image/vnd.microsoft.icon",
};

// Serve the repository, and only the repository: a path that climbs out of it
// is refused rather than read.
function serveRepository() {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const file = join(root, requested === "/" ? "index.html" : requested);
    if (!file.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}/` })
    );
  });
}

/**
 * Marks when the category dropdown first holds a choice, from before the
 * page's own script runs.
 *
 * `document` rather than `documentElement`: this is installed before the root
 * element exists, and an init script that throws is a page error of its own.
 */
const WATCH = `
  window.__marks = {};
  const seen = () => {
    const control = document.getElementById("category");
    if (control && control.options.length > 1 && window.__marks.catalog === undefined) {
      window.__marks.catalog = performance.now();
    }
  };
  new MutationObserver(seen).observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", seen);
`;

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

/** The accent reader's own entry, and the only request these cases interfere with. */
const READER = "**/napkin-sketch/markdown/**";

/**
 * A page with the watch installed, and the accent reader refused or stalled.
 *
 * **The routes go on before the navigation, not after it.** Installed
 * afterwards they are installed after the request they are about: the page's
 * module graph is already in flight by `domcontentloaded`, so a stall added
 * then lets the reader land anyway and the case measures the state it meant to
 * rule out.
 *
 * `hold` stalls the reader until the returned `release` is called, which is
 * how the page is held in the one state it passes through on a slow
 * connection: a sheet on screen, drawn, with the reader still coming.
 */
async function openPage({ block = false, hold = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const warnings = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  await page.addInitScript(WATCH);
  let release = () => {};
  if (block) {
    await page.route(READER, (route) => route.abort("failed"));
  } else if (hold) {
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(READER, async (route) => {
      await held;
      await route.continue();
    });
  }
  await page.goto(site.base, { waitUntil: "domcontentloaded" });
  return { page, errors, warnings, release };
}

/** Chooses the first cheatsheet of the first category, and waits for its graphic. */
async function chooseFirstSheet(page) {
  const categories = await page.$eval("#category", (control) =>
    [...control.options].filter((option) => option.value).map((option) => option.value)
  );
  await page.selectOption("#category", categories[0]);
  const sheets = await page.$eval("#example", (control) =>
    [...control.options]
      .filter((option) => option.value && option.parentElement.style.display !== "none")
      .map((option) => option.value)
  );
  await page.selectOption("#example", sheets[0]);
  await page.waitForSelector("#curCheatSheet > svg");
}

/** How the code panel on screen is coloured, by the names the composer gives. */
const readPanel = () => {
  const panel = [...document.querySelectorAll('#curCheatSheet text[data-name^="code-"]')];
  const names = panel.map((element) => element.getAttribute("data-name"));
  return {
    whole: names.filter((name) => /^code-\d+$/.test(name)).length,
    split: names.filter((name) => /^code-\d+-\d+$/.test(name)).length,
  };
};

test("the catalog arrives with the accent reader still in flight", { skip }, async () => {
  // **Held rather than timed.** The drafted version of this case asserted that
  // the catalog became usable before the accent wave finished, which is a
  // claim about relative speed and not about the dependency: over loopback the
  // wave is a local file read and finishes first whatever the page does, so
  // the assertion failed against a page that had already been fixed. Stalling
  // the reader asks the question directly. With the call in the same
  // `Promise.all` as the manifest fetch, nothing below ever resolves.
  const { page, errors, warnings, release } = await openPage({ hold: true });
  try {
    await page.waitForSelector('html[data-catalog="ready"]', { timeout: 15000 });
    const options = await page.$eval("#category", (control) => control.options.length);
    assert.ok(options > 1, "the category dropdown arrived empty");

    // And the sheet itself, which is the other thing a reader can do while the
    // wave is still coming.
    await chooseFirstSheet(page);
    const panel = await page.evaluate(readPanel);
    console.log(`  held: the catalog and a sheet both arrived, ${panel.whole} whole-line runs`);
    assert.ok(panel.whole > 0, "no sheet drew while the reader was held");
    assert.equal(panel.split, 0, "the reader was not actually held back");
    assert.deepEqual(warnings, [], "a held reader is not a failed one, so nothing is warned about");
  } finally {
    release();
    await page.close();
  }
  assert.deepEqual(errors, [], "no script error while the reader was in flight");
});

test("and the wave is fetched rather than skipped, so there is something to wait for", { skip }, async () => {
  const { page, errors } = await openPage();
  await page.waitForFunction(() => window.__marks.catalog !== undefined);
  // Settled rather than raced: the reader is awaited here so the wave is
  // certainly over before its files are counted.
  await page.waitForFunction(
    () => performance.getEntriesByType("resource").some((entry) => entry.name.includes("/napkin-sketch/markdown/")),
    { timeout: 15000 }
  );
  const marks = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const accent = resources.filter(
      (entry) => entry.name.includes("/napkin-sketch/markdown/") || entry.name.includes("/napkin-sketch/chunks/")
    );
    return {
      catalog: window.__marks.catalog,
      files: accent.length,
      bytes: accent.reduce((total, entry) => total + (entry.transferSize || 0), 0),
      done: accent.reduce((most, entry) => Math.max(most, entry.responseEnd), 0),
    };
  });
  console.log(
    `  catalog usable at ${marks.catalog.toFixed(1)} ms; the accent wave is ${marks.files} files, ` +
      `${marks.bytes} bytes, finished at ${marks.done.toFixed(1)} ms`
  );
  assert.ok(marks.files > 0, "the accent wave was never fetched, so the case above proves nothing");
  assert.deepEqual(errors, [], "no script error on arrival");
  await page.close();
});

test("a sheet still draws when the reader cannot be loaded, and says why", { skip }, async () => {
  const { page, errors, warnings } = await openPage({ block: true });
  await page.waitForSelector('html[data-catalog="ready"]');
  await chooseFirstSheet(page);

  const panel = await page.evaluate(readPanel);
  console.log(`  blocked: ${panel.whole} whole-line runs and ${panel.split} split`);
  assert.ok(panel.whole > 0, "the sheet drew no code panel at all");
  assert.equal(panel.split, 0, "something was coloured token by token with no reader installed");
  // The reason reaches somewhere a person can see. `prepareAccents` is written
  // not to throw precisely so this is possible, and the page dropped the
  // answer for as long as the call sat in a `Promise.all` destructuring.
  assert.ok(
    warnings.some((text) => /accent reader could not be loaded/.test(text)),
    `the page fell back silently; it warned: ${JSON.stringify(warnings)}`
  );
  assert.deepEqual(errors, [], "no script error on the fallback path");
  await page.close();
});

test("and a sheet drawn before the reader lands is redrawn once it does", { skip }, async () => {
  // The one state a slow connection puts the page in: a sheet on screen in its
  // per-line roles, with the reader still coming. Without the redraw the panel
  // stays that way for as long as the reader keeps this sheet selected.
  const { page, errors, release } = await openPage({ hold: true });
  await page.waitForSelector('html[data-catalog="ready"]');
  await chooseFirstSheet(page);

  const before = await page.evaluate(readPanel);
  assert.ok(before.whole > 0, "the sheet did not draw while the reader was held");
  assert.equal(before.split, 0, "the reader was not actually held back");

  release();
  // A split run is `code-<line>-<part>`, and a whole-line one is `code-<line>`.
  // Both hold a hyphen, so the wait is a pattern rather than a selector.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('#curCheatSheet text[data-name^="code-"]')].some((element) =>
        /^code-\d+-\d+$/.test(element.getAttribute("data-name"))
      ),
    { timeout: 15000 }
  );
  const after = await page.evaluate(readPanel);
  console.log(
    `  held: ${before.whole} whole-line runs, then ${after.split} split runs once the reader landed`
  );
  assert.ok(after.split > 0, "the sheet kept its per-line colours after the reader arrived");
  assert.equal(
    await page.$eval("#curCheatSheet", (box) => box.querySelectorAll("svg").length),
    1,
    "the redraw added a second graphic instead of replacing the first"
  );
  // The full size link still points at a composition, and at the redrawn one.
  assert.match(await page.$eval("#sheetFullSizeLink", (link) => link.href), /^blob:/);
  assert.deepEqual(errors, [], "no script error through the redraw");
  await page.close();
});

test("and the redraw replaces the graphic without moving anything around it", { skip }, async () => {
  // The case above proves the panel is recoloured and that the box holds one
  // graphic afterwards. What it does not ask is whether the reader's eye has to
  // follow it: the redraw happens under a reader who did not ask for it, so a
  // reflow would move the sheet out from under them while they were reading it.
  // The box is a reserved frame with an aspect ratio set from the manifest and
  // the replacement is the same composition at the same size, so nothing should
  // move - which is a claim worth holding rather than assuming.
  const { page, errors, release } = await openPage({ hold: true });
  await page.waitForSelector('html[data-catalog="ready"]');
  await chooseFirstSheet(page);

  const geometry = () =>
    page.evaluate(() => {
      const box = document.getElementById("curCheatSheet");
      const rect = (element) => {
        if (!element) return null;
        const r = element.getBoundingClientRect();
        return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) };
      };
      return {
        box: rect(box),
        above: rect(box.previousElementSibling),
        below: rect(box.nextElementSibling),
        fullSize: rect(document.getElementById("sheetFullSize")),
        scrollHeight: document.documentElement.scrollHeight,
      };
    });

  const before = await geometry();

  // Every animation frame across the redraw, so a flash is asked about rather
  // than argued about: the failure a hide-and-reshow would produce is a frame
  // in which the box is empty or a different size, and a frame the compositor
  // drew is a frame a reader could have seen.
  await page.evaluate(() => {
    const box = document.getElementById("curCheatSheet");
    window.__frames = [];
    window.__sampling = true;
    const sample = () => {
      const rect = box.getBoundingClientRect();
      window.__frames.push({
        graphics: box.querySelectorAll("svg").length,
        display: box.style.display,
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        split: [...box.querySelectorAll('text[data-name^="code-"]')].some((element) =>
          /^code-\d+-\d+$/.test(element.getAttribute("data-name"))
        ),
      });
      if (window.__sampling) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  release();
  await page.waitForFunction(() => window.__frames.some((frame) => frame.split), { timeout: 15000 });
  // A few frames past the redraw, so the sample covers its far side rather than
  // stopping on the first frame that shows it.
  await page.waitForFunction(
    () => window.__frames.length - window.__frames.findIndex((frame) => frame.split) > 8,
    { timeout: 15000 }
  );
  const frames = await page.evaluate(() => {
    window.__sampling = false;
    return window.__frames;
  });
  const after = await geometry();

  const sizes = [...new Set(frames.map((frame) => frame.size))];
  console.log(
    `  ${frames.length} frames sampled across the redraw, split from frame ` +
      `${frames.findIndex((frame) => frame.split)}, sizes seen ${JSON.stringify(sizes)}`
  );
  assert.ok(frames.length > 8, `only ${frames.length} frames were sampled, too few to say anything`);
  assert.deepEqual(
    frames.filter((frame) => frame.graphics !== 1),
    [],
    "a frame of the redraw showed no graphic, or two"
  );
  assert.deepEqual(
    frames.filter((frame) => frame.display !== "block"),
    [],
    "a frame of the redraw had the box hidden"
  );
  assert.deepEqual(sizes, [sizes[0]], "the box was drawn at more than one size through the redraw");

  assert.deepEqual(after.box, before.box, "the sheet box moved or resized through the redraw");
  assert.deepEqual(after.above, before.above, "what sits above the sheet moved through the redraw");
  assert.deepEqual(after.below, before.below, "what sits below the sheet moved through the redraw");
  assert.deepEqual(after.fullSize, before.fullSize, "the full size line moved through the redraw");
  assert.equal(after.scrollHeight, before.scrollHeight, "the page got taller or shorter through the redraw");
  assert.deepEqual(errors, [], "no script error through the redraw");
  await page.close();
});

test("and the full size link offers the redrawn sheet rather than the one it replaced", { skip }, async () => {
  // The case above checks the href is still a blob. A redraw that recomposed
  // the panel and forgot to re-offer the markup would pass that and hand a
  // reader the per-line composition the screen no longer shows, so the blob is
  // read rather than its scheme.
  const { page, errors, release } = await openPage({ hold: true });
  await page.waitForSelector('html[data-catalog="ready"]');
  await chooseFirstSheet(page);
  assert.match(
    await page.$eval("#sheetFullSizeLink", (link) => link.href),
    /^blob:/,
    "the held page offered no composition to open"
  );

  release();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('#curCheatSheet text[data-name^="code-"]')].some((element) =>
        /^code-\d+-\d+$/.test(element.getAttribute("data-name"))
      ),
    { timeout: 15000 }
  );

  const markup = await page.evaluate(async () => {
    const link = document.getElementById("sheetFullSizeLink");
    return (await fetch(link.href)).text();
  });
  const split = (markup.match(/data-name="code-\d+-\d+"/g) ?? []).length;
  const whole = (markup.match(/data-name="code-\d+"/g) ?? []).length;
  console.log(`  the full size blob carries ${split} split run names and ${whole} whole-line names`);
  assert.ok(split > 0, "the full size link still carries the per-line composition after the redraw");
  assert.equal(whole, 0, "the full size blob carries both compositions at once");
  assert.deepEqual(errors, [], "no script error through the redraw");
  await page.close();
});

test("a document whose language is the wrong type empties the frame and says why", { skip }, async () => {
  // `composeSheet` refuses a `language` that is neither a string, `null` nor
  // absent, in this layer's own words. No document in the catalog carries one,
  // so the path a document with one would take is unreachable from the page -
  // served here instead, because what matters is not the message but that the
  // page handles it: `selectExample` catches a composition failure, and a frame
  // left showing a sheet it could not compose, or a failure that reached
  // nobody, are the two ways that goes wrong.
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  const logged = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => logged.push(message.text()));
  await page.addInitScript(WATCH);
  await page.route("**/sheet.json", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...(await response.json()), language: 123 } });
  });
  await page.goto(site.base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__marks.catalog !== undefined, { timeout: 15000 });

  const categories = await page.$eval("#category", (control) =>
    [...control.options].filter((option) => option.value).map((option) => option.value)
  );
  await page.selectOption("#category", categories[0]);
  const sheets = await page.$eval("#example", (control) =>
    [...control.options]
      .filter((option) => option.value && option.parentElement.style.display !== "none")
      .map((option) => option.value)
  );
  await page.selectOption("#example", sheets[0]);
  await page.waitForFunction(
    () => document.getElementById("curCheatSheet").style.display === "none",
    { timeout: 15000 }
  );

  const state = await page.evaluate(() => ({
    children: document.getElementById("curCheatSheet").childElementCount,
    fullSize: document.getElementById("sheetFullSize").style.display,
  }));
  const named = logged.filter((line) => line.includes("could not be composed"));
  console.log(`  the frame came down, and the console carried ${named.length} line naming it`);
  assert.equal(state.children, 0, "the frame kept a graphic it could not compose");
  assert.equal(state.fullSize, "none", "the full size link was left offering a sheet that was never composed");
  assert.equal(named.length, 1, `the reason reached the console ${named.length} times rather than once`);
  assert.ok(
    logged.some((line) => /language is a language id, an alias, or absent/.test(line)),
    `the console never named the field; it logged ${JSON.stringify(logged)}`
  );
  // Caught, not thrown: a composition failure the page handles must not also
  // surface as an uncaught page error.
  assert.deepEqual(errors, [], "a caught composition failure raised a page error as well");
  await page.close();
});
