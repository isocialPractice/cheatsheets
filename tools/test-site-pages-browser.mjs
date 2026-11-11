// Browser driven checks for the two routes that put a composed sheet in front
// of a reader: the page `tools/cheatsheet-site.mjs` writes, and the section
// `api/cheatsheet/site.mjs` builds inside a page that is already loaded.
//
// **Why a rendered check earns its place beside the two text ones.**
// `tools/test-cheatsheet-site.mjs` reads the written markup and
// `tools/test-browser-entry.mjs` drives the entry point against a hand written
// DOM stub. Both are real coverage of the logic and neither can see the two
// things that decide whether either route works for a reader:
//
// - **A sheet with its `width` and `height` dropped is a claim about layout.**
//   The attributes come off and `display:block;width:100%;height:auto` goes on
//   so a 3600 square shrinks to whatever column it lands in. Nothing about that
//   is visible in the markup - it is the engine resolving a viewBox against a
//   containing block, and until this file existed nothing measured the result.
// - **"Loads with no build step and nothing installed" is only true in a
//   browser.** A stub proves the collector reads a DOM. It cannot prove that
//   `api/cheatsheet/index.mjs` and everything under it resolve over HTTP as
//   written, with no bare specifier and no chunk the page cannot fetch. That is
//   the claim the whole browser route rests on and an engine is the only thing
//   that can make it.
//
// The Playwright arrangement is the one tools/test-page-structure-browser.mjs
// settled: `tools/` stays dependency free, there is no package.json, and a
// clone with nothing installed has to run the suite. So Playwright is looked
// for at run time where it is actually installed, and every case here skips
// with the reason when it is not found. Install it for a machine that should
// run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// The site under test is `fixtures/site/`, copied to a temporary folder and
// generated there, because a run writes a `cheatsheets/` folder and the fixture
// is tracked.
//
// Run with: node --test tools/test-site-pages-browser.mjs
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { main, OUTPUT_NAME, MASTER_NAME } from "./cheatsheet-site.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "fixtures", "site");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. `@playwright/test`
// keeps `playwright` in its own node_modules rather than beside itself, which
// is why resolution is based at its entry file instead of at the global root.
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
      // The resolved entry is CommonJS, so the named exports arrive under
      // default as well as beside it depending on how it was built.
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

// `.js` is on this list because the vendored drawing surface's entry is one,
// and a module served as anything but a JavaScript media type is refused
// outright - which looks exactly like the page having no script at all.
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/vnd.microsoft.icon",
};

// Two roots, because the generated pages are written outside the repository
// and the browser route imports `api/cheatsheet/` from inside it. `/generated/`
// is the temporary site; everything else is the repository.
function serve(generated) {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const under = requested.startsWith("/generated/");
    const base = under ? generated : root;
    const file = join(base, under ? requested.slice("/generated/".length) : requested);
    if (!file.startsWith(base)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` })
    );
  });
}

// A page that marks its own material and calls the entry point, which is the
// shape the documentation tells a site owner to write. `menu` adds the one
// marker this route cannot honour.
function entryPage({ menu = false } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Browser Entry Check</title></head>
<body>
<h1>Browser Entry Check</h1>
<div id="here"></div>
${menu ? '<nav data-cheatsheet-menu="dropdown"></nav>' : ""}
<section data-cheatsheet="title">
  <h2>Splice</h2>
  <p>Remove and insert in one call.</p>
  <pre><code>items.splice(1, 2, "demo");</code></pre>
  <table><caption>Arguments</caption><tr><th>start</th><td>where</td></tr></table>
</section>
<script type="module">
  import { cheatsheetSection } from "/api/cheatsheet/index.mjs";

  const { element, heading, findings } = cheatsheetSection(document);
  if (element) document.querySelector("#here").append(element);
  window.__entry = { heading, findings, appended: Boolean(element) };
  document.documentElement.setAttribute("data-entry-ran", "yes");
</script>
</body>
</html>
`;
}

/** `main` with its two streams swallowed, the way the tool's own cases run it. */
async function generate(site) {
  const write = process.stdout.write;
  const fail = process.stderr.write;
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  try {
    return await main([site]);
  } finally {
    process.stdout.write = write;
    process.stderr.write = fail;
  }
}

const runtime = await loadChromium();
const skip = runtime.chromium ? false : runtime.reason;

let browser;
let site;
let scratch;

before(async () => {
  if (skip) return;
  scratch = await mkdtemp(join(tmpdir(), "cheatsheet-site-pages-"));
  const copy = join(scratch, "site");
  await cp(fixture, copy, { recursive: true });
  assert.equal(await generate(copy), 0, "the generator did not write the fixture site");
  await writeFile(join(copy, "browser-entry.html"), entryPage(), "utf8");
  await writeFile(join(copy, "browser-entry-menu.html"), entryPage({ menu: true }), "utf8");
  site = await serve(copy);
  browser = await runtime.chromium.launch();
});

after(async () => {
  await browser?.close();
  site?.server.close();
  if (scratch) await rm(scratch, { recursive: true, force: true });
});

// The four pages a run over the fixture writes.
const PAGES = ["index.html", "tutorial.html", "docs.html", MASTER_NAME];

async function open(path, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.url()} -> ${response.status()}`);
  });
  await page.goto(`${site.base}${path}`, { waitUntil: "load" });
  return { context, page, errors };
}

const generated = (name) => `/generated/${OUTPUT_NAME}/${name}`;

// ## 1. The page a run writes

test("a generated page heads itself and carries the sheet as inline markup", async (t) => {
  if (skip) return t.skip(skip);
  for (const name of PAGES) {
    const { context, page } = await open(generated(name));
    const shape = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const svg = document.querySelector("div.cheatsheet svg");
      return {
        h1: h1?.textContent?.trim() ?? null,
        svgFound: Boolean(svg),
        viewBox: svg?.getAttribute("viewBox") ?? null,
        width: svg?.getAttribute("width"),
        height: svg?.getAttribute("height"),
        style: svg?.getAttribute("style") ?? "",
        wordmark: [...(svg?.querySelectorAll("text") ?? [])].some((text) =>
          /practicing\.xyz/i.test(text.textContent)
        ),
      };
    });
    assert.ok(shape.h1, `${name}: no <h1> naming the cheatsheet`);
    assert.ok(shape.svgFound, `${name}: no inline <svg> inside a figure`);
    assert.equal(shape.viewBox, "0 0 3600 3600", `${name}: the sheet is not the 3600 square`);
    // The three that make it scale, and the two that would stop it.
    assert.equal(shape.width, null, `${name}: the sheet kept its width attribute`);
    assert.equal(shape.height, null, `${name}: the sheet kept its height attribute`);
    assert.match(shape.style, /display:\s*block/, `${name}: the sheet is not display:block`);
    assert.match(shape.style, /width:\s*100%/, `${name}: the sheet is not set to the page width`);
    assert.match(shape.style, /height:\s*auto/, `${name}: the sheet's height is not auto`);
    assert.ok(shape.wordmark, `${name}: the sheet carries no practicing.xyz wordmark`);
    await context.close();
  }
});

test("a generated sheet shrinks with the column it is in and stays square", async (t) => {
  if (skip) return t.skip(skip);
  for (const width of [390, 1280]) {
    for (const name of PAGES) {
      const { context, page } = await open(generated(name), { width, height: 844 });
      const drawn = await page.evaluate(() => ({
        boxes: [...document.querySelectorAll("div.cheatsheet svg")].map((svg) => {
          const box = svg.getBoundingClientRect();
          return { w: Math.round(box.width), h: Math.round(box.height) };
        }),
        client: document.documentElement.clientWidth,
      }));
      assert.ok(drawn.boxes.length > 0, `${name} at ${width}px: no sheet to measure`);
      for (const box of drawn.boxes) {
        assert.ok(
          box.w <= drawn.client + 1,
          `${name} at ${width}px: the sheet is drawn ${box.w}px wide in a ${drawn.client}px page`
        );
        assert.ok(
          box.w >= drawn.client * 0.5,
          `${name} at ${width}px: the sheet collapsed to ${box.w}px in a ${drawn.client}px page`
        );
        assert.ok(
          Math.abs(box.w - box.h) <= 2,
          `${name} at ${width}px: the sheet is ${box.w}x${box.h}, no longer square`
        );
      }
      await context.close();
    }
  }
});

test("the master page carries one sheet per cheatsheet, each with its own id", async (t) => {
  if (skip) return t.skip(skip);
  const { context, page } = await open(generated(MASTER_NAME));
  const found = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll("div.cheatsheet svg")];
    return {
      ids: svgs.map((svg) => svg.id),
      headed: svgs.map((svg) => {
        let node = svg.closest("div.cheatsheet") ?? svg;
        while (node?.previousElementSibling) {
          node = node.previousElementSibling;
          if (/^h[1-6]$/i.test(node.tagName)) return node.tagName.toLowerCase();
        }
        return null;
      }),
    };
  });
  assert.deepEqual(
    [...found.ids].sort(),
    ["cheatsheet-site-docs", "cheatsheet-site-index", "cheatsheet-site-tutorial"],
    `the master page's sheet ids were ${found.ids.join(", ")}`
  );
  // The reason the `id` option exists: three sheets on one page is three ids.
  assert.equal(new Set(found.ids).size, found.ids.length, "two sheets on one page share an id");
  assert.deepEqual(found.headed, ["h2", "h2", "h2"], "a sheet is not under a heading of its own");
  await context.close();
});

test("a generated page carries the site's markup, including a script that draws", async (t) => {
  if (skip) return t.skip(skip);
  const { context, page, errors } = await open(generated("tutorial.html"));
  const carried = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll("[data-cheatsheet-block]")];
    const count = (selector) =>
      blocks.reduce((total, block) => total + block.querySelectorAll(selector).length, 0);
    const chart = document.getElementById("failures");
    return {
      blocks: blocks.length,
      headings: count("h2, h3"),
      paragraphs: count("p"),
      listings: count("pre"),
      captions: count("table caption"),
      headerCells: count("table th"),
      chartInBlock: Boolean(chart?.closest("[data-cheatsheet-block]")),
      // The marked up chart ships one background rect; the script adds the bars.
      bars: chart
        ? [...chart.querySelectorAll("rect")].filter(
            (rect) => (rect.getAttribute("fill") ?? "").toLowerCase() === "#4dae51"
          ).length
        : 0,
    };
  });
  assert.ok(carried.blocks > 0, "no <main data-cheatsheet-block> carried the markup");
  assert.ok(carried.headings > 0, "the headings did not carry through");
  assert.ok(carried.paragraphs > 0, "the paragraphs did not carry through");
  assert.ok(carried.listings > 0, "the <pre> listings did not carry through");
  assert.ok(carried.captions > 0, "the table carried through without its caption");
  assert.ok(carried.headerCells > 0, "the table carried through without its header row");
  assert.ok(carried.chartInBlock, "the chart did not carry through");
  // The script came with the markup and ran on the generated page, which is the
  // half a scan of the written output cannot see.
  assert.equal(carried.bars, 7, `the carried script drew ${carried.bars} bars, not 7`);
  assert.deepEqual(errors, [], `the generated page logged ${JSON.stringify(errors)}`);
  await context.close();
});

// ## 2. The section a loaded page builds

test("the browser entry loads with no build step and builds a section", async (t) => {
  if (skip) return t.skip(skip);
  const { context, page, errors } = await open("/generated/browser-entry.html");
  // Nothing installed, nothing built, no bare specifier: if the module graph
  // did not resolve over HTTP, the attribute below is absent.
  assert.equal(
    await page.getAttribute("html", "data-entry-ran"),
    "yes",
    `the module never ran. The page logged ${JSON.stringify(errors)}`
  );
  assert.deepEqual(errors, [], `the page logged ${JSON.stringify(errors)}`);

  const built = await page.evaluate(() => {
    const section = document.querySelector("#here section.cheatsheet-section");
    const mains = [...(section?.querySelectorAll("main[data-cheatsheet-block]") ?? [])];
    const originals = [...document.querySelectorAll("body > section[data-cheatsheet]")];
    const original = originals[0] ?? null;
    return {
      entry: window.__entry,
      heading: section?.querySelector("h2")?.textContent?.trim() ?? null,
      viewBox: section?.querySelector("svg")?.getAttribute("viewBox") ?? null,
      mains: mains.length,
      copiedListing: mains.some((main) => Boolean(main.querySelector("pre"))),
      copiedTable: mains.some((main) => Boolean(main.querySelector("table"))),
      originals: originals.length,
      originalListing: Boolean(original?.querySelector("pre")),
      originalTable: Boolean(original?.querySelector("table")),
      originalBelow:
        section && original
          ? Boolean(section.compareDocumentPosition(original) & Node.DOCUMENT_POSITION_FOLLOWING)
          : null,
    };
  });

  assert.equal(built.heading, "Browser Entry Check", `the section was headed "${built.heading}"`);
  assert.equal(built.viewBox, "0 0 3600 3600", "the section carries no composed sheet");
  assert.equal(built.mains, 1, `the section carries ${built.mains} blocks, expected 1`);
  assert.ok(built.copiedListing, "the carried copy lost the <pre>");
  assert.ok(built.copiedTable, "the carried copy lost the <table>");

  // **Cloned, never moved.** A page that lost its own content while gaining a
  // summary of it is the one failure here a reload cannot undo, so both copies
  // are checked rather than just the new one.
  assert.equal(built.originals, 1, "the page's own marked section is gone");
  assert.ok(built.originalListing, "the original lost its <pre> - it was moved, not cloned");
  assert.ok(built.originalTable, "the original lost its <table> - it was moved, not cloned");
  assert.equal(built.originalBelow, true, "the original is no longer below the new section");

  assert.equal(built.entry.heading, "Browser Entry Check");
  assert.deepEqual(built.entry.findings, [], `findings carried ${JSON.stringify(built.entry.findings)}`);
  await context.close();
});

test("the section's sheet scales the way a generated page's does", async (t) => {
  if (skip) return t.skip(skip);
  for (const width of [390, 1280]) {
    const { context, page } = await open("/generated/browser-entry.html", { width, height: 844 });
    const drawn = await page.evaluate(() => {
      const svg = document.querySelector("#here svg");
      const box = svg.getBoundingClientRect();
      return {
        w: Math.round(box.width),
        h: Math.round(box.height),
        width: svg.getAttribute("width"),
        client: document.documentElement.clientWidth,
      };
    });
    assert.equal(drawn.width, null, `at ${width}px: the section's sheet kept a width attribute`);
    assert.ok(
      drawn.w <= drawn.client + 1,
      `at ${width}px: the section's sheet is ${drawn.w}px in a ${drawn.client}px page`
    );
    assert.ok(
      Math.abs(drawn.w - drawn.h) <= 2,
      `at ${width}px: the section's sheet is ${drawn.w}x${drawn.h}, no longer square`
    );
    await context.close();
  }
});

test("the browser entry reports a menu marker and leaves the nav alone", async (t) => {
  if (skip) return t.skip(skip);
  const { context, page, errors } = await open("/generated/browser-entry-menu.html");
  assert.deepEqual(errors, [], `the page logged ${JSON.stringify(errors)}`);
  const found = await page.evaluate(() => {
    const nav = document.querySelector("nav[data-cheatsheet-menu]");
    return {
      findings: window.__entry.findings,
      children: nav?.childElementCount ?? null,
      text: nav?.textContent?.trim() ?? null,
      built: Boolean(document.querySelector("#here section.cheatsheet-section")),
    };
  });
  assert.equal(found.findings.length, 1, `findings carried ${JSON.stringify(found.findings)}`);
  assert.match(found.findings[0], /menu/i, "the finding does not say a menu cannot be filled");
  assert.match(
    found.findings[0],
    /tools\/cheatsheet-site\.mjs/,
    "the finding does not name the route that can fill one"
  );
  // Reported rather than half honoured: an empty nav is a nav the page still owns.
  assert.equal(found.children, 0, "the <nav> was filled");
  assert.equal(found.text, "", "the <nav> carries text");
  assert.ok(found.built, "the menu marker stopped the section being built");
  await context.close();
});

// ## The links a generated sheet carries

test("a generated sheet links its drawn footer to the site, once, and nothing else", async (t) => {
  if (skip) return t.skip(skip);
  // A generated page is composed with no brand, so its footer is the navy mark
  // square and the default follow line, both naming the site. Points in sheet
  // pixels: the middle of the mark square (x 0 to 288 of the 3264 to 3600 band),
  // a point well inside the follow line (set from x 576), and the middle of the
  // code panel, which links nowhere.
  const points = { square: [144, 3432], line: [800, 3432], panel: [1800, 1800] };
  for (const width of [390, 1280]) {
    const { context, page, errors } = await open(generated("index.html"), { width, height: 844 });
    const found = await page.evaluate((spots) => {
      const figure = document.querySelector("div.cheatsheet");
      const svg = figure.querySelector("svg");
      const hrefAt = ([x, y]) => {
        const scale = svg.getBoundingClientRect().width / 3600;
        const pageY = window.scrollY + svg.getBoundingClientRect().top + y * scale;
        window.scrollTo(0, Math.max(0, pageY - window.innerHeight / 2));
        const box = svg.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + x * scale, box.top + y * scale)?.closest("a");
        return hit && figure.contains(hit) ? hit.getAttribute("href") : null;
      };
      const anchors = [...figure.querySelectorAll("nav a")];
      return {
        square: hrefAt(spots.square),
        line: hrefAt(spots.line),
        panel: hrefAt(spots.panel),
        stops: anchors.filter((a) => a.tabIndex >= 0 && a.getAttribute("aria-hidden") !== "true").length,
        named: anchors.filter((a) => a.tabIndex >= 0).map((a) => a.getAttribute("aria-label")),
        inImage: Boolean(figure.querySelector('[role="img"] a')),
      };
    }, points);
    await context.close();
    assert.deepEqual(errors, [], `${width}px: the page logged ${JSON.stringify(errors)}`);
    assert.equal(found.square, "https://practicing.xyz", `${width}px: the mark square is not the site's link`);
    assert.equal(found.line, "https://practicing.xyz", `${width}px: the follow line is not the site's link`);
    assert.equal(found.panel, null, `${width}px: the code panel is under a link`);
    assert.equal(found.stops, 1, `${width}px: the site is ${found.stops} tab stops, not one`);
    assert.deepEqual(found.named, ["practicing.xyz"]);
    assert.ok(!found.inImage, `${width}px: a link sits inside the image`);
  }
});
