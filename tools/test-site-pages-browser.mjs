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
// - **"The page fits a phone" is a measurement and not a rule.** A generated
//   page carries three rules about its own layout and the material it carries
//   is somebody else's, so whether the two add up to a page that does not
//   scroll sideways is a question only a layout engine answers. It was a
//   defect for as long as nothing here asked.
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
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
//
// **`site: true` serves the copy at `/` instead, with no second root**, which
// the carried-URL cases need and the entry point cases cannot use: a URL a site
// owner wrote as `/logo.svg` is theirs to resolve against their own site root,
// and a server with the repository behind `/` answers it with a 404 that says
// nothing about the tool.
function serve(generated, { site: whole = false } = {}) {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const under = whole || requested.startsWith("/generated/");
    const base = under ? generated : root;
    const from = whole ? requested : requested.slice("/generated/".length);
    const file = join(base, under ? from : requested);
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

// Material the tracked fixture does not carry, written into a **second copy**
// of it rather than into `fixtures/site/`. Both reasons matter: these are
// marked pages, so generating them beside the fixture's own would put more
// pages in the folder and more sheets on the master, which the cases above
// assert the shape of by name - and the five queued items that edit the
// fixture's five pages do not need a committed sixth landing among them.
//
// Two things are written here. First, one page carrying what the style block's
// `img` and `table` rules are for: an image wider than a phone, a table made
// wide by its own content, and a table that declared a width of its own. The
// image is a data URI so that whether it loaded is never a question the
// measurement has to ask.
const BANNER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBo" +
  "ZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDEyMDAgMzAwIj48cmVjdCB3aWR0aD0iMTIwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9" +
  "IiM0ZGFlNTEiLz48dGV4dCB4PSI0MCIgeT0iMTcwIiBmb250LXNpemU9IjEyMCIgZmlsbD0iIzAwMDEzMiI+d2lkZSBpbWFn" +
  "ZTwvdGV4dD48L3N2Zz4=";

const widePage = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Northwind Traders Handbook</title>
</head>
<body>
<main data-cheatsheet="title">
  <h2>Material wider than a phone</h2>
  <p>One image and two tables, each wider than 390 pixels for its own reason.</p>
  <img id="wide-image" alt="A banner 1200 pixels wide" src="${BANNER}">
  <table id="content-wide">
    <caption>Regions and their quarters</caption>
    <thead>
      <tr><th>Region</th><th>Q1 revenue</th><th>Q2 revenue</th><th>Q3 revenue</th><th>Q4 revenue</th><th>Account manager</th><th>Notes carried over from the prior year</th></tr>
    </thead>
    <tbody>
      <tr><td>Region West</td><td>128,400</td><td>131,900</td><td>142,250</td><td>150,000</td><td>Jane Doe</td><td>Renewed on the same terms as the year before</td></tr>
      <tr><td>Region East</td><td>98,200</td><td>101,750</td><td>99,400</td><td>112,300</td><td>John Smith</td><td>Moved to quarterly billing in the second quarter</td></tr>
    </tbody>
  </table>
  <table id="declared-wide" style="width: 800px">
    <caption>The same figures, declared at 800 pixels</caption>
    <tbody>
      <tr><td>Region West</td><td>128,400</td><td>Jane Doe</td></tr>
      <tr><td>Region East</td><td>98,200</td><td>John Smith</td></tr>
    </tbody>
  </table>
</main>
</body>
</html>
`;

// And second, a folder of pages whose marked material carries relative URLs,
// which is what the tracked fixture has none of: a marked page with an image
// beside it and a link to its sibling, the files both of those name, and the
// sibling marking material of its own with a URL that walks up a folder. The
// badge is a real file rather than a data URI here, because the question is
// what the browser **asks for** - a generated page carrying a URL relative to
// the wrong folder answers it with a 404 and nothing else.
const BADGE = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
<rect width="48" height="48" fill="#4dae51"/></svg>
`;

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="16" viewBox="0 0 64 16">
<rect width="64" height="16" fill="#000132"/></svg>
`;

const linkedPage = (title, inner) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
</head>
<body>
<main data-cheatsheet="title">
${inner}
</main>
</body>
</html>
`;

let browser;
let site;
let scratch;
/** The second site, carrying the material the fixture cannot. */
let carried;

before(async () => {
  if (skip) return;
  scratch = await mkdtemp(join(tmpdir(), "cheatsheet-site-pages-"));
  const copy = join(scratch, "site");
  await cp(fixture, copy, { recursive: true });
  assert.equal(await generate(copy), 0, "the generator did not write the fixture site");
  await writeFile(join(copy, "browser-entry.html"), entryPage(), "utf8");
  await writeFile(join(copy, "browser-entry-menu.html"), entryPage({ menu: true }), "utf8");
  site = await serve(copy);
  const second = join(scratch, "carried");
  await cp(fixture, second, { recursive: true });
  await writeFile(join(second, "wide-material.html"), widePage(), "utf8");
  await writeFile(join(second, "logo.svg"), LOGO, "utf8");
  await mkdir(join(second, "guide"), { recursive: true });
  await writeFile(join(second, "guide", "badge.svg"), BADGE, "utf8");
  await writeFile(
    join(second, "guide", "using-it.html"),
    linkedPage(
      "Using It",
      '  <h2>Using it</h2>\n' +
        '  <p>A badge beside this page, and a link to the next one.</p>\n' +
        '  <img id="badge" alt="A green badge" src="badge.svg">\n' +
        '  <a id="sibling" href="reading-it.html">Reading it</a>'
    ),
    "utf8"
  );
  await writeFile(
    join(second, "guide", "reading-it.html"),
    linkedPage(
      "Reading It",
      '  <h2>Reading it</h2>\n' +
        '  <p>A logo one folder up, and a path that was already root relative.</p>\n' +
        '  <img id="logo" alt="A wordmark" src="../logo.svg">\n' +
        '  <img id="rooted" alt="The same wordmark" src="/logo.svg">'
    ),
    "utf8"
  );
  assert.equal(await generate(second), 0, "the generator did not write the second site");
  carried = await serve(second, { site: true });
  browser = await runtime.chromium.launch();
});

after(async () => {
  await browser?.close();
  site?.server.close();
  carried?.server.close();
  if (scratch) await rm(scratch, { recursive: true, force: true });
});

// The four pages a run over the fixture writes.
const PAGES = ["index.html", "tutorial.html", "docs.html", MASTER_NAME];

async function openOn(which, path, viewport = { width: 1280, height: 900 }) {
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
  await page.goto(`${which.base}${path}`, { waitUntil: "load" });
  return { context, page, errors };
}

/** The same, on the fixture site, which is where all but one case looks. */
const open = (path, viewport) => openOn(site, path, viewport);

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

// Added 2026.11.11 with the `<style>` block that closes the found issue, and
// promoted from the UI/UX verification of 2026.11.10, which is where it was
// first measured: before the block, `tutorial.html` and
// `all-cheatsheets.html` reported a `scrollWidth` of 494 in a 390px viewport,
// pushed by one carried `<code>` at `white-space: pre` on a page with no
// stylesheet at all. It runs on all four pages rather than the two that failed,
// because the two that passed did so only because their longest carried line
// was shorter - they are the guard for anyone who later widens the fixture.
test("a generated page does not scroll sideways at 390px, and scrolls its listing instead", async (t) => {
  if (skip) return t.skip(skip);
  const scrolling = [];
  const listings = [];
  for (const name of PAGES) {
    const { context, page } = await open(generated(name), { width: 390, height: 844 });
    const fit = await page.evaluate(() => {
      const client = document.documentElement.clientWidth;
      // What is reported on a failure, rather than what is asserted: the tag,
      // the two computed properties that decide whether a wide box pushes the
      // page, and enough of its text to find it in the fixture.
      const widest = [...document.querySelectorAll("*")]
        .filter((el) => el.getBoundingClientRect().right > client + 1)
        .map((el) => {
          const style = getComputedStyle(el);
          return (
            `<${el.tagName.toLowerCase()}> reaching ` +
            `${Math.round(el.getBoundingClientRect().right)}px ` +
            `(white-space:${style.whiteSpace}, overflow-x:${style.overflowX}) ` +
            `"${(el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60)}"`
          );
        });
      return {
        scroll: document.documentElement.scrollWidth,
        client,
        widest,
        // A listing wider than the page is the case the rule is for, so the
        // rule is only proven where there is one to prove it on.
        overflowing: [...document.querySelectorAll("[data-cheatsheet-block] pre")]
          .filter((pre) => pre.scrollWidth > pre.clientWidth + 1)
          .map((pre) => getComputedStyle(pre).overflowX),
      };
    });
    await context.close();
    if (fit.scroll > fit.client + 1) {
      scrolling.push(`${name}: scrollWidth ${fit.scroll} in a ${fit.client}px page, pushed by ${fit.widest.join("; ")}`);
    }
    listings.push(...fit.overflowing);
  }
  assert.deepEqual(scrolling, [], `pages that scroll sideways at 390px:\n  ${scrolling.join("\n  ")}`);
  // The page fitting is the finding; the listing scrolling itself is how. A
  // page that fitted because the material had been wrapped instead would pass
  // the assertion above and change what the listing says.
  assert.ok(listings.length > 0, "no carried listing was wider than the page, so nothing exercised the rule");
  assert.deepEqual(
    [...new Set(listings)],
    ["auto"],
    `a listing wider than the page computed overflow-x ${[...new Set(listings)].join(", ")}`
  );
});

// The other two rules of the style block, each on the element it is for, and
// each on material the tracked fixture cannot supply: it carries no `<img>` at
// all, and both of its tables fit 390px. So `img` and `table` went in on
// reasoning on 2026.11.11 and were measured the same day, which is how the
// table one was found to compute and do nothing - *a table made wide by its
// own content still scrolls the generated page sideways*, closed here by
// `display: block; overflow-x: auto`. Promoted from
// `test-results/ui-ux-tester.agent/ui-ux-tester.2026.11.11-wide-material.cases.mjs`,
// which is where the four candidates were measured.

/** The generated wide-material page at a phone width, each wide element measured. */
async function measureWide() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${carried.base}/${OUTPUT_NAME}/wide-material.html`, { waitUntil: "load" });
  const seen = await page.evaluate(() => {
    const de = document.documentElement;
    const at = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return {
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        right: Math.round(box.right),
        fits: box.right <= de.clientWidth + 1,
        overflowX: getComputedStyle(el).overflowX,
        scrolls: el.scrollWidth > el.clientWidth + 1,
      };
    };
    const image = document.getElementById("wide-image");
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      image: at("wide-image"),
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
      imageNatural: image ? [image.naturalWidth, image.naturalHeight] : null,
      contentWide: at("content-wide"),
      declaredWide: at("declared-wide"),
    };
  });
  await context.close();
  return seen;
}

test("a carried image wider than the page is drawn inside it, ratio kept", async (t) => {
  if (skip) return t.skip(skip);
  const seen = await measureWide();
  assert.ok(seen.imageLoaded, "the banner did not load, so nothing was measured");
  assert.deepEqual(seen.imageNatural, [1200, 300], "the banner is not the size the case assumes");
  assert.ok(
    seen.image.fits,
    `the image reaches ${seen.image.right}px in a ${seen.clientWidth}px page`
  );
  // 1200x300 drawn at 374 wide is 93.5 tall. A contained image that lost its
  // ratio would pass the assertion above and look wrong.
  assert.equal(Math.round((seen.image.width / seen.image.height) * 100), 400);
});

test("a carried table that declared a width wider than the page is clamped", async (t) => {
  if (skip) return t.skip(skip);
  const seen = await measureWide();
  assert.ok(
    seen.declaredWide.fits,
    `the 800px table reaches ${seen.declaredWide.right}px in a ${seen.clientWidth}px page`
  );
});

// The one the found issue was opened for. A table's used width is never lower
// than its min-content width and `max-width` does not lower that, so the rule
// as first written left the table at 413.6 in a 374 column and the page at 422.
// Measured at this viewport on 2026.11.11:
//
//   max-width: 100%                           table 413.6  page 422  scrolls
//   display: block; overflow-x: auto          table 374    page 390  fits
//   table-layout: fixed; width: 100%          table 374    page 390  fits
//   max-width: 100%; overflow-x: auto         table 413.6  page 422  scrolls
//
// The second was taken, for the reason the listing rule was taken over
// `white-space: pre-wrap`: the element scrolls itself and no cell is re-laid
// out. The fourth is the one that looks like the fix and is not - a
// `display: table` box ignores `overflow`. `width: fit-content` was added to
// the second on 2026.11.12, after the case below it measured what the block box
// did to the tables that already fitted.
test("a carried table made wide by its own content scrolls itself, not the page", async (t) => {
  if (skip) return t.skip(skip);
  const seen = await measureWide();
  assert.ok(
    seen.contentWide.fits,
    `the content-wide table reaches ${seen.contentWide.right}px in a ${seen.clientWidth}px page`
  );
  assert.equal(
    seen.scrollWidth,
    seen.clientWidth,
    `the page measures ${seen.scrollWidth} against a client width of ${seen.clientWidth}`
  );
  // The page fitting is the finding; the table scrolling itself is how, and it
  // is the half that tells this apart from a table whose columns were reflowed
  // to fit - which would pass the two assertions above and change what the
  // carried material looks like.
  assert.equal(seen.contentWide.overflowX, "auto", "the table is not a box that scrolls");
  assert.ok(seen.contentWide.scrolls, "the table fits its own box, so nothing was contained");
});

// The cost of the table rule on the tables that already fitted, which is the
// question the measurement had to answer before the rule could be accepted: a
// `<table>` at `display: block` is no longer a table box, and a block box fills
// its container where a table box shrinks to fit. The fixture carries two
// tables, one on `docs/configuration.html` and one on
// `tutorial/reading-data.html`, so `docs.html`, `tutorial.html` and the master
// page are where they land. Neither needs containing at either width, which is
// what makes them the right thing to watch - a rule that reached a table it had
// no business reaching shows up here and nowhere else, and this is how
// `width: fit-content` came to be in the rule: without it both went from 439.1
// and 512.1 wide at 1280px to 1264.
//
// **The stretch is asserted against the table's own content and not against a
// figure.** 439.1 is a font measurement on one machine, so the case asks the
// engine instead: the drawn width is compared with the same table at
// `width: max-content`, which is what a table box would have shrunk to. Equal
// means shrink to fit; wider means the rule stretched it.
test("a carried table that already fitted is left the width its content wants", async (t) => {
  if (skip) return t.skip(skip);
  let measured = 0;
  for (const width of [390, 1280]) {
    for (const name of PAGES) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      await page.goto(`${site.base}${generated(name)}`, { waitUntil: "load" });
      const tables = await page.evaluate(() => {
        const de = document.documentElement;
        return [...document.querySelectorAll("[data-cheatsheet-block] table")].map((table) => {
          const box = table.getBoundingClientRect();
          const was = table.style.width;
          table.style.width = "max-content";
          const wanted = table.getBoundingClientRect().width;
          table.style.width = was;
          return {
            width: Math.round(box.width * 10) / 10,
            wanted: Math.round(wanted * 10) / 10,
            fits: box.right <= de.clientWidth + 1,
            scrolls: table.scrollWidth > table.clientWidth + 1,
            caption: Boolean(table.querySelector("caption")),
            rows: table.querySelectorAll("tr").length,
          };
        });
      });
      await context.close();
      measured += tables.length;
      for (const table of tables) {
        assert.ok(
          table.fits,
          `${name} at ${width}px: a fixture table is drawn ${table.width}px wide`
        );
        assert.ok(
          !table.scrolls,
          `${name} at ${width}px: a fixture table that fitted before now scrolls itself at ${table.width}px`
        );
        assert.ok(
          table.width <= table.wanted + 1,
          `${name} at ${width}px: a fixture table was stretched to ${table.width}px, ` +
            `past the ${table.wanted}px its content wants`
        );
        // Two things `display: block` could have taken away, and the two a
        // reader of the carried record would notice first.
        assert.ok(table.caption, `${name} at ${width}px: a fixture table lost its caption`);
        assert.ok(table.rows > 1, `${name} at ${width}px: a fixture table lost its rows`);
      }
    }
  }
  assert.ok(measured > 0, "the fixture carried no table to measure, so nothing was watched");
});

// The found issue of 2026.11.11, closed 2026.11.12: carried material's relative
// URLs were carried byte for byte onto a page in another folder, so an image
// beside the source page and a link to its sibling both 404'd, and only a root
// relative path survived. `tools/test-cheatsheet-site.mjs` asserts what each
// shape becomes; this asserts the thing only a browser can - that **nothing the
// generated page asks for comes back 404** - which is the case that would have
// caught the defect on its own, whichever of the three remedies had been taken.
test("nothing a generated page asks for is missing, carried URLs included", async (t) => {
  if (skip) return t.skip(skip);
  const { context, page, errors } = await openOn(carried, `/${OUTPUT_NAME}/guide.html`);
  const asked = await page.evaluate(() => {
    const at = (id) => {
      const image = document.getElementById(id);
      return image === null
        ? null
        : { src: image.getAttribute("src"), loaded: Boolean(image.complete && image.naturalWidth > 0) };
    };
    const sibling = document.getElementById("sibling");
    return {
      badge: at("badge"),
      logo: at("logo"),
      rooted: at("rooted"),
      sibling: sibling?.getAttribute("href") ?? null,
      // What the browser would actually fetch, which is the question: a URL
      // relative to the wrong folder reads fine in the markup.
      siblingResolved: sibling === null ? null : new URL(sibling.href).pathname,
    };
  });
  // Every response, which is where a carried URL pointing at nothing shows up.
  assert.deepEqual(errors, [], `the generated page asked for something missing: ${errors.join("; ")}`);
  // The three images, each a different shape of URL, each drawn.
  assert.ok(asked.badge?.loaded, `the badge beside the source page did not load from ${asked.badge?.src}`);
  assert.ok(asked.logo?.loaded, `the logo one folder up did not load from ${asked.logo?.src}`);
  assert.ok(asked.rooted?.loaded, `the root relative logo did not load from ${asked.rooted?.src}`);
  // The root relative one is the one that worked before the rewrite, so it is
  // the one that proves the rewrite left it alone.
  assert.equal(asked.rooted.src, "/logo.svg");
  // And the sibling link resolves to the page the site owner wrote it on,
  // rather than to a name beside the generated page.
  assert.equal(asked.siblingResolved, "/guide/reading-it.html");
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
