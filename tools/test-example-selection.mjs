// Checks for how index.html turns a selection into a running example and a
// drawn sheet.
//
// **Why this file changed shape.** It used to slice the page's `<script>` out
// of the HTML and run it in a `node:vm` sandbox against a hand built DOM, which
// let the page's own code be the code under test with no dependency at all.
// That stopped being possible when the page became a module: it opens with
// `import { composeSheet } from "./api/cheatsheet/index.mjs"` and ends with a
// top level `await` on `fetch`, neither of which a bare sandbox can host. A
// stub that could host them would be a browser, so the behavioural cases below
// use one, on the terms `tools/test-page-structure-browser.mjs` settled:
// Playwright is looked for at run time, and every case that needs it skips with
// the install command as the reason when it is absent.
//
// What that costs is covered rather than accepted. The claims that can be read
// off the source text are read off the source text, so a bare clone still holds
// the page to them; only the claims that are about what a real engine does are
// behind the skip.
//
// **The second catalog.** One assertion here cannot be made against this
// repository's own manifest: hiding the previously shown `optgroup` needs two
// categories, and the catalog has one. So the server answers `cheatsheets.json`
// under `/two/` with a manifest it holds in memory, splitting the real eleven
// across two categories. Every path in it is a real folder, so the documents
// still fetch and compose; only the grouping is synthetic.
//
// Run with: node --test tools/test-example-selection.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const manifest = JSON.parse(readFileSync(join(root, "cheatsheets.json"), "utf8"));

// The page script, for the source text cases. The opening tag carries the
// module type now, so the marker is matched rather than assumed, and a moved
// marker fails here instead of silently widening the slice to the whole file.
function pageScript() {
  const open = html.indexOf('<script type="module">');
  if (open === -1) {
    throw new Error('index.html no longer opens its script with <script type="module">');
  }
  const start = open + '<script type="module">'.length;
  const end = html.lastIndexOf("</script>");
  if (end <= start) throw new Error("index.html no longer closes its script");
  return html.slice(start, end);
}

const script = pageScript();

// ---------------------------------------------------------------------------
// Source text. No browser, so a bare clone runs every case below.
// ---------------------------------------------------------------------------

test("the catalog is fetched by relative path, so it resolves under the project base", () => {
  // An absolute path would resolve to `/cheatsheets.json` at the domain root,
  // which on Pages is a different site's file and here is a 404. The project
  // lives under `/cheatsheets/`.
  assert.match(script, /const MANIFEST = "cheatsheets\.json";/);
  assert.doesNotMatch(script, /fetch\("\//);
});

test("an option is keyed by the manifest's slug, and labelled from its title", () => {
  assert.match(script, /option\.value = category\.id;/);
  assert.match(script, /option\.textContent = category\.title;/);
  assert.match(script, /item\.value = entry\.id;/);
  assert.match(script, /item\.textContent = entry\.title;/);
});

test("no path is built out of an option's display text", () => {
  // `removeSpaceInVariable` took the label "Shift And Unshift" apart to reach
  // `shiftAndUnshift.js`. The manifest carries the payload, so the helper and
  // the two case helpers beside it went out with the hand maintained optgroup.
  for (const gone of ["removeSpaceInVariable", "changeToUpperCase", "changeToLowerCase"]) {
    assert.doesNotMatch(script, new RegExp(gone), `${gone} still has a caller`);
  }
});

test("the previous selection's script element is removed before the next is appended", () => {
  assert.match(script, /if \(injected\) \{\s*\n\s*injected\.remove\(\);/);
});

test("the injected script is a module", () => {
  assert.match(script, /script\.type = "module";/);
});

test("the injected module's URL is distinct per selection", () => {
  // A module is registered once per URL per document, so without this the
  // second visit to an example appends an element that executes nothing.
  assert.match(script, /script\.src = `\$\{entry\.payload\}\?select=\$\{selections\}`;/);
});

test("the console is no longer cleared to hide a collision", () => {
  assert.doesNotMatch(script, /console\.clear\(\)/);
});

test("the sheet's box is reserved from the manifest before the document is fetched", () => {
  const reserve = script.indexOf("sheetBox.style.aspectRatio");
  const fetchDoc = script.indexOf("await fetch(`${entry.path}/sheet.json`)");
  assert.ok(reserve !== -1, "the box is never given an aspect ratio");
  assert.ok(fetchDoc !== -1, "the document is never fetched");
  assert.ok(reserve < fetchDoc, "the document is fetched before the box is reserved");
  assert.match(script, /\$\{entry\.width\} \/ \$\{entry\.height\}/);
});

test("the markup ships a container rather than an image with a src", () => {
  const box = html.match(/<div class="sheet" id="curCheatSheet"[^>]*>/);
  assert.ok(box, "index.html no longer ships the sheet container");
  assert.doesNotMatch(box[0], /\bsrc=/);
  // Both were deleted on 2026.09.09 in cec3805 while the markup kept pointing
  // at one of them, which is what made the blank selection a live 404.
  assert.doesNotMatch(html, /javaScriptArrays\/\.jpg/);
  assert.doesNotMatch(html, /javaScriptArrays\/\.js/);
  assert.doesNotMatch(html, /curCheatSheetImg/);
});

test("the XMLHttpRequest probe is gone with the request it was probing", () => {
  // Composing the sheet in the page removes the image request, so there is no
  // status to read and nothing for the probe to rule out.
  for (const gone of ["XMLHttpRequest", "sheetRuledOut", "offerSheetToElement", "settleImage"]) {
    assert.doesNotMatch(script, new RegExp(gone), `${gone} outlived the image request`);
  }
});

// ---------------------------------------------------------------------------
// Behaviour, in a real engine.
// ---------------------------------------------------------------------------

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
  ".ico": "image/vnd.microsoft.icon",
};

/** The eleven, split across two categories, pointing at the real folders. */
function twoCategories() {
  const sheets = manifest.categories[0].cheatsheets;
  const half = Math.ceil(sheets.length / 2);
  return {
    canvas: manifest.canvas,
    categories: [
      { id: "javascript", title: "JavaScript", cheatsheets: sheets.slice(0, half) },
      { id: "second", title: "Second Category", cheatsheets: sheets.slice(half) },
    ],
  };
}

// How long `/slow/` holds a cheatsheet document back. Long enough that the
// reserved frame can be measured before the graphic lands, short enough that
// the case costs the suite nothing worth noticing.
const SLOW_DOCUMENT_MS = 400;

// Serve the repository, and only the repository, with two synthetic routes.
// A request under `/two/` is answered from the same files, except for the
// manifest, which comes back holding two categories instead of one. A request
// under `/slow/` is answered from the same files as well, except that a
// cheatsheet document is held back for a moment: the reserved box is only
// observable while the document is in flight, and over loopback the frame and
// the graphic otherwise land too close together to measure between. Both the
// page and its imports resolve relative to the document, so either prefix
// carries through the whole tree without a second copy of anything.
function serveRepository() {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const doubled = requested.startsWith("/two/");
    const slowed = requested.startsWith("/slow/");
    const prefix = doubled ? "/two" : slowed ? "/slow" : "";
    const path = prefix ? requested.slice(prefix.length) : requested;
    if (doubled && path === "/cheatsheets.json") {
      response.writeHead(200, { "content-type": TYPES[".json"] });
      response.end(JSON.stringify(twoCategories()));
      return;
    }
    if (slowed && path.endsWith("/sheet.json")) {
      await new Promise((resolve) => setTimeout(resolve, SLOW_DOCUMENT_MS));
    }
    const file = join(root, path === "/" ? "index.html" : path);
    if (!file.startsWith(root)) {
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
      resolve({ server, base: `http://127.0.0.1:${server.address().port}/` })
    );
  });
}

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

/** A loaded page whose dropdowns have been built, and the lines it logged. */
async function openPage(path = "") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const logged = [];
  page.on("console", (message) => logged.push(message.text()));
  await page.goto(new URL(path, site.base).href);
  await page.waitForSelector('html[data-catalog="ready"]');
  return { page, logged };
}

/** What the two dropdowns are offering right now. */
function readDropdowns() {
  const categories = [...document.getElementById("category").options].map((option) => ({
    value: option.value,
    label: option.textContent,
  }));
  const groups = [...document.getElementById("example").getElementsByTagName("optgroup")].map(
    (group) => ({
      category: group.dataset.category,
      label: group.label,
      display: group.style.display,
      options: [...group.children].map((option) => ({
        value: option.value,
        label: option.textContent,
      })),
    })
  );
  return { categories, groups };
}

test("both dropdowns are built from the manifest", { skip }, async () => {
  const { page } = await openPage();
  const { categories, groups } = await page.evaluate(readDropdowns);
  await page.close();

  const expected = manifest.categories;
  // The blank first option the markup ships, then one per category.
  assert.equal(categories.length, expected.length + 1);
  assert.equal(categories[0].value, "");
  assert.deepEqual(
    categories.slice(1),
    expected.map((category) => ({ value: category.id, label: category.title }))
  );

  assert.equal(groups.length, expected.length);
  for (const [index, group] of groups.entries()) {
    assert.equal(group.category, expected[index].id);
    assert.equal(group.label, expected[index].title);
    assert.deepEqual(
      group.options,
      expected[index].cheatsheets.map((sheet) => ({ value: sheet.id, label: sheet.title }))
    );
  }
});

test("an option's value is the slug, which no label could be turned into", { skip }, async () => {
  const { page } = await openPage();
  const { groups } = await page.evaluate(readDropdowns);
  await page.close();

  const shift = groups[0].options.find((option) => option.label === "Shift And Unshift");
  assert.ok(shift, "the eleven no longer include Shift And Unshift");
  assert.equal(shift.value, "javascript/arrays/shift-and-unshift");
});

test("the only category is selected on arrival, and its group is shown", { skip }, async () => {
  const { page } = await openPage();
  const state = await page.evaluate(() => ({
    category: document.getElementById("category").value,
    step: document.getElementById("selectExample").style.display,
    shown: [...document.getElementById("example").getElementsByTagName("optgroup")].map(
      (group) => group.style.display
    ),
  }));
  await page.close();

  assert.equal(state.category, "javascript");
  assert.notEqual(state.step, "none");
  assert.deepEqual(state.shown, ["block"]);
});

test("with two categories, neither is chosen for the reader", { skip }, async () => {
  const { page } = await openPage("two/");
  const state = await page.evaluate(() => ({
    category: document.getElementById("category").value,
    step: document.getElementById("selectExample").style.display,
    shown: [...document.getElementById("example").getElementsByTagName("optgroup")].map(
      (group) => group.style.display
    ),
  }));
  await page.close();

  assert.equal(state.category, "");
  assert.equal(state.step, "none");
  assert.deepEqual(state.shown, ["none", "none"]);
});

test("changing the category hides the group that was shown before", { skip }, async () => {
  const { page } = await openPage("two/");
  const shown = () =>
    page.evaluate(() =>
      [...document.getElementById("example").getElementsByTagName("optgroup")].map(
        (group) => group.style.display
      )
    );

  await page.selectOption("#category", "javascript");
  assert.deepEqual(await shown(), ["block", "none"]);

  // The fault this closes: one group was set to block and none was ever set
  // back, so the second category's examples appeared under the first's.
  await page.selectOption("#category", "second");
  assert.deepEqual(await shown(), ["none", "block"]);

  await page.selectOption("#category", "javascript");
  assert.deepEqual(await shown(), ["block", "none"]);
  await page.close();
});

test("changing the category takes the sheet of the category being left down", { skip }, async () => {
  const { page } = await openPage("two/");
  await page.selectOption("#category", "javascript");
  await page.selectOption("#example", { index: 1 });
  await page.waitForSelector("#curCheatSheet > svg");

  await page.selectOption("#category", "second");
  const state = await page.evaluate(() => ({
    example: document.getElementById("example").value,
    display: document.getElementById("curCheatSheet").style.display,
    children: document.getElementById("curCheatSheet").children.length,
    footnote: document.getElementById("showFootNote").style.display,
  }));
  await page.close();

  assert.equal(state.example, "");
  assert.equal(state.display, "none");
  assert.equal(state.children, 0);
  assert.equal(state.footnote, "none");
});

test("one script element is injected per selection, not one more each time", { skip }, async () => {
  const { page } = await openPage();
  const injected = () =>
    page.evaluate(() =>
      [...document.body.querySelectorAll("script[src]")].map((element) => ({
        type: element.type,
        src: new URL(element.src).pathname + new URL(element.src).search,
      }))
    );

  assert.deepEqual(await injected(), []);

  await page.selectOption("#example", { label: "Sorting Arrays" });
  const first = await injected();
  assert.equal(first.length, 1);
  assert.equal(first[0].type, "module");
  assert.equal(
    first[0].src,
    "/javascript/arrays/sorting-arrays/sorting-arrays.js?select=1"
  );

  // The fault this closes: every selection appended another element and none
  // was ever removed, so a reader who looked at four examples left four behind.
  await page.selectOption("#example", { label: "Slicing Arrays" });
  const second = await injected();
  assert.equal(second.length, 1);
  assert.equal(
    second[0].src,
    "/javascript/arrays/slicing-arrays/slicing-arrays.js?select=2"
  );
  await page.close();
});

/** Waits until `holds()` answers true, or gives up after a second. */
async function settles(holds) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (holds()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return holds();
}

test("the injected module runs, and its output reaches the console", { skip }, async () => {
  const { page, logged } = await openPage();
  await page.selectOption("#example", { label: "Slicing Arrays" });
  // The payload's first statements log `['B']` and `['B', 'C']`. Seeing them
  // is what says the module was fetched, parsed and executed rather than
  // merely appended, which is the half an element count cannot answer.
  const ran = await settles(() => logged.some((line) => line.includes("B")));
  await page.close();

  assert.ok(ran, `the example's own output is not in ${JSON.stringify(logged.slice(0, 4))}`);
});

test("every example runs as a module without a strict mode refusal", { skip }, async () => {
  // Module scope is strict mode, and two of the eleven carried an undeclared
  // `for (i in ...)` counter while one carried the octal literal `01`. The
  // first throws at run time and the second refuses to parse at all, so a page
  // that injects modules has to be held to every payload rather than one.
  const { page } = await openPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });

  for (const sheet of manifest.categories[0].cheatsheets) {
    await page.selectOption("#example", sheet.id);
    await page.waitForSelector("#curCheatSheet > svg");
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.close();

  assert.deepEqual(failures, []);
});

test("the sheet is composed into a box reserved at the manifest's own ratio", { skip }, async () => {
  const { page } = await openPage();
  const entry = manifest.categories[0].cheatsheets.find(
    (sheet) => sheet.title === "Sorting Arrays"
  );

  await page.selectOption("#example", { label: "Sorting Arrays" });
  await page.waitForSelector("#curCheatSheet > svg");
  const drawn = await page.evaluate(() => {
    const box = document.getElementById("curCheatSheet");
    const svg = box.querySelector("svg");
    const frame = box.getBoundingClientRect();
    return {
      ratio: box.style.aspectRatio,
      label: box.getAttribute("aria-label"),
      viewBox: svg.getAttribute("viewBox"),
      width: svg.getAttribute("width"),
      height: svg.getAttribute("height"),
      frame: { width: Math.round(frame.width), height: Math.round(frame.height) },
    };
  });
  await page.close();

  assert.equal(drawn.ratio, `${entry.width} / ${entry.height}`);
  assert.equal(drawn.label, "Sorting Arrays cheat sheet");
  assert.equal(drawn.viewBox, `0 0 ${entry.width} ${entry.height}`);
  // The composition writes both in sheet pixels, which is 3600 here. Left on,
  // they overflow the column, so the page takes them off and the stylesheet
  // scales the element off the viewBox instead.
  assert.equal(drawn.width, null);
  assert.equal(drawn.height, null);
  assert.equal(drawn.frame.width, 600, "the sheet is not at its 600px cap");
  assert.equal(drawn.frame.height, 600, "the reserved box is not square");
});

test("nothing below the sheet moves while the graphic is still in flight", { skip }, async () => {
  // The fault the reservation exists to prevent, measured rather than
  // inferred. The case above asserts the box carries the manifest's ratio;
  // this one asserts what that ratio is for. The frame is shown before the
  // document is fetched, so there is a window where the box is its final size
  // and empty - and if the ratio were not already on it, everything under the
  // sheet would jump down the moment the composition landed. The `/slow/`
  // route is what opens that window wide enough to read.
  const { page } = await openPage("slow/");
  const read = () =>
    page.evaluate(() => ({
      graphic: document.querySelector("#curCheatSheet > svg") !== null,
      frame: document.getElementById("curCheatSheet").getBoundingClientRect().height,
      footnote: document.getElementById("showFootNote").getBoundingClientRect().top,
      page: document.documentElement.scrollHeight,
    }));

  await page.selectOption("#example", { label: "Random Sort Array" });
  await page.waitForFunction(
    () => getComputedStyle(document.getElementById("curCheatSheet")).display === "block"
  );
  const reserved = await read();
  await page.waitForSelector("#curCheatSheet > svg");
  const landed = await read();
  await page.close();

  // Without this the case would still pass on a page that reserved nothing,
  // by never catching it empty.
  assert.equal(reserved.graphic, false, "the document arrived too fast to measure against");
  assert.equal(landed.graphic, true);
  assert.equal(landed.footnote, reserved.footnote, "the footnote moved when the graphic landed");
  assert.equal(landed.frame, reserved.frame, "the frame resized when the graphic landed");
  assert.equal(landed.page, reserved.page, "the page grew when the graphic landed");
});

test("selecting the blank option takes the sheet back down", { skip }, async () => {
  const { page } = await openPage();
  await page.selectOption("#example", { label: "Sorting Arrays" });
  await page.waitForSelector("#curCheatSheet > svg");

  await page.selectOption("#example", "");
  const state = await page.evaluate(() => ({
    display: document.getElementById("curCheatSheet").style.display,
    children: document.getElementById("curCheatSheet").children.length,
    label: document.getElementById("curCheatSheet").getAttribute("aria-label"),
    footnote: document.getElementById("showFootNote").style.display,
  }));
  await page.close();

  assert.equal(state.display, "none");
  assert.equal(state.children, 0);
  assert.equal(state.label, "");
  assert.equal(state.footnote, "none");
});

test("a catalog that cannot be read says so rather than failing silently", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  // A route with no manifest under it. The page's own imports still resolve,
  // because they are relative to the document like everything else.
  await page.route("**/cheatsheets.json", (route) => route.fulfill({ status: 404 }));
  await page.goto(site.base);
  await page.waitForSelector('html[data-catalog="error"]');
  const shown = await page.evaluate(
    () => getComputedStyle(document.getElementById("catalogError")).display
  );
  await page.close();

  assert.equal(shown, "block");
});
