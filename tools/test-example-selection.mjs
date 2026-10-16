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

// The eleven in the order they are taught rather than in the order they sort.
// "both dropdowns are built from the manifest" below pins the page to whatever
// the manifest says; this pins what the manifest says, which is the half that
// was alphabetical until 2026.10.14 and that no fixture covers - the builder's
// own order test runs on invented trees, and the real order lives in the
// `order` field of each committed `meta.json`.
test("the eleven are offered in the order they are taught", () => {
  const taught = [
    "Shift And Unshift",
    "Changing Elements",
    "Splicing Arrays",
    "Concating Arrays",
    "Slicing Arrays",
    "Sorting Arrays",
    "Sort Numbers Array",
    "Compare Array Function",
    "Random Sort Array",
    "Max and Min Value Array",
    "Max and Min Function and Sort Object",
  ];
  const offered = manifest.categories.flatMap((category) =>
    category.cheatsheets.map((sheet) => sheet.title)
  );
  assert.deepEqual(offered, taught);
  // Alphabetical is the fault this replaced, and it is worth naming: the two
  // orders share a first letter often enough that a spot check would pass.
  assert.notDeepEqual(offered, [...taught].sort(), "the examples are back in alphabetical order");
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

test("a link's fragment is the option's own slug, with nothing derived from it", () => {
  // The same rule the option values follow, for the same reason: the slug is
  // the one name a cheatsheet has, so a fragment built out of a title or out
  // of the category and the folder would be a second scheme to keep in step.
  assert.match(script, /writeFragment\(entry\.id\)/);
  assert.doesNotMatch(script, /writeFragment\([^)]*\.title/);
});

test("the category a fragment selects is read off the entry, not off the slug", () => {
  // `javascript/arrays/splicing-arrays` opens with its category, so splitting
  // the slug would appear to work right up until a folder is renamed. The
  // category is recorded beside the entry when the dropdowns are built.
  assert.match(script, /cheatsheets\.set\(entry\.id,\s*\{\s*\.\.\.entry,\s*category:\s*category\.id\s*\}\)/);
  assert.match(script, /cheatsheets\.get\(slug\)\.category/);
});

test("the fragment replaces the history entry rather than pushing one", () => {
  // Assigning `location.hash` pushes, so a reader who looked at four
  // cheatsheets would need four presses of the back button to leave by the way
  // they came in. `tools/test-example-selection.mjs` measures the count; this
  // is the mechanism that keeps it at one.
  assert.match(script, /history\.replaceState\(/);
  assert.doesNotMatch(script, /history\.pushState\(/);
  assert.doesNotMatch(script, /location\.hash\s*=/);
});

test("the fragment is resolved after the dropdowns are built, not before", () => {
  // The resolution is a lookup in `cheatsheets`, which is filled by
  // `buildDropdowns`, so the order is the whole of why it can be a lookup.
  const build = script.indexOf("buildDropdowns(await response.json())");
  const resolve = script.indexOf("applyFragment()", build);
  assert.ok(build > 0, "expected the catalog to be built in the start up block");
  assert.ok(resolve > build, "the fragment is resolved before the catalog it resolves against");
});

test("a fragment that names nothing falls back to the arrival without one", () => {
  // `applyFragment` reports whether it selected anything, and the single
  // category preselection is what runs when it did not. Without the report a
  // stale link would leave the page empty with nothing on screen to explain it.
  assert.match(script, /if\s*\(!applyFragment\(\)\s*&&\s*categorySelect\.options\.length\s*===\s*2\)/);
});

test("the console guidance ships hidden rather than hard wired on", () => {
  // All three lines, in the markup rather than in the script: a page whose
  // instructions are correct only after the first selection would still be
  // telling every arriving reader to open a console.
  for (const id of ["consoleIntro", "consoleStep", "showFootNote"]) {
    assert.match(
      html,
      new RegExp(`id="${id}"[^>]*style="display:none"`),
      `#${id} is not hidden in the markup`
    );
  }
});

test("the console guidance is shown for a run payload and for nothing else", () => {
  assert.match(script, /showConsoleGuidance\(entry\.kind === "run"\)/);
  // `""` and not `"block"`: one of the three is an `li`, and block takes its
  // marker with it, so the step would lose the "3." that makes it a step.
  assert.match(script, /line\.style\.display = shown \? "" : "none"/);
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

// The second entry marked as a sheet that runs nothing, which the real catalog
// has no example of: all eleven are `kind: "run"`, and the builder recognizes
// `read`, `embed` and `none` besides. The folder is left as it is, so the
// document still fetches and composes; only the kind and the payload change,
// which is exactly what the console guidance reads.
const DRAWN_INDEX = 1;

function kindsMixed() {
  const sheets = manifest.categories[0].cheatsheets.map((sheet, index) =>
    index === DRAWN_INDEX ? { ...sheet, kind: "none", payload: null } : sheet
  );
  return { canvas: manifest.canvas, categories: [{ ...manifest.categories[0], cheatsheets: sheets }] };
}

// How long `/slow/` holds a cheatsheet document back. Long enough that the
// reserved frame can be measured before the graphic lands, short enough that
// the case costs the suite nothing worth noticing.
const SLOW_DOCUMENT_MS = 400;

// Serve the repository, and only the repository, with three synthetic routes.
// A request under `/two/` is answered from the same files, except for the
// manifest, which comes back holding two categories instead of one. `/drawn/`
// is the same again with one entry's `kind` changed, because the committed
// catalog is eleven runnable scripts and the page's behaviour for the other
// three kinds has nothing in it to read. A request under `/slow/` is answered
// from the same files as well, except that a cheatsheet document is held back
// for a moment: the reserved box is only observable while the document is in
// flight, and over loopback the frame and the graphic otherwise land too close
// together to measure between. Both the page and its imports resolve relative
// to the document, so any prefix carries through the whole tree without a
// second copy of anything.
function serveRepository() {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const doubled = requested.startsWith("/two/");
    const slowed = requested.startsWith("/slow/");
    const mixed = requested.startsWith("/drawn/");
    const prefix = doubled ? "/two" : slowed ? "/slow" : mixed ? "/drawn" : "";
    const path = prefix ? requested.slice(prefix.length) : requested;
    if (path === "/cheatsheets.json" && (doubled || mixed)) {
      response.writeHead(200, { "content-type": TYPES[".json"] });
      response.end(JSON.stringify(doubled ? twoCategories() : kindsMixed()));
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
  // Wide enough for the sheet's own cap to be what stops it rather than the
  // column. `openPage` opens at 1280, which is under the page's 1324px measure,
  // so there the column is 856 and the 900px cap never binds.
  await page.setViewportSize({ width: 1600, height: 900 });
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
  assert.equal(drawn.frame.width, 900, "the sheet is not at its 900px cap");
  assert.equal(drawn.frame.height, 900, "the reserved box is not square");
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

test("a selection the reader moved on from does not land on top of the one they made", { skip }, async () => {
  // Two selections, the first of them slower than the second. `showSheet`
  // awaits the document and then composes it, so nothing about the order the
  // two answer in is the order they were asked in: the reader picks Sorting
  // Arrays, picks Splicing Arrays before the first document answers, and the
  // held back one lands last and overwrites the sheet they are actually
  // looking at. The frame then holds one cheatsheet's graphic under another
  // one's name, with a third still named in the dropdown.
  //
  // Held back here rather than through `/slow/`, which delays every document
  // alike and so keeps the two in the order they were asked in.
  const { page } = await openPage();
  await page.route("**/sorting-arrays/sheet.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, SLOW_DOCUMENT_MS));
    await route.continue();
  });
  const held = page.waitForResponse((response) =>
    response.url().endsWith("/sorting-arrays/sheet.json")
  );

  await page.selectOption("#example", { label: "Sorting Arrays" });
  await page.selectOption("#example", { label: "Splicing Arrays" });
  await page.waitForSelector("#curCheatSheet > svg");
  await held;
  // The composition runs off the resolved document, so the overwrite lands a
  // tick after the response rather than with it.
  await new Promise((resolve) => setTimeout(resolve, 200));

  const shown = await page.evaluate(() => ({
    chosen: document.getElementById("example").selectedOptions[0].textContent,
    label: document.getElementById("curCheatSheet").getAttribute("aria-label"),
    drawn: document.querySelector("#curCheatSheet > svg > title")?.textContent,
  }));
  await page.close();

  assert.equal(shown.chosen, "Splicing Arrays");
  assert.equal(shown.label, "Splicing Arrays cheat sheet");
  assert.equal(
    shown.drawn,
    "Splicing Arrays",
    `the frame holds the ${shown.drawn} graphic under the ${shown.label} name`
  );
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

// ---------------------------------------------------------------------------
// Hash routing. The slug a link carries, and what the address bar says back.
// ---------------------------------------------------------------------------

/** Who is selected, and what the address bar is showing for it. */
function readSelection() {
  return {
    category: document.getElementById("category").value,
    example: document.getElementById("example").value,
    hash: location.hash,
  };
}

test("a link's fragment selects the cheatsheet it names", { skip }, async () => {
  const slug = "javascript/arrays/splicing-arrays";
  const { page } = await openPage(`#${slug}`);
  await page.waitForSelector("#curCheatSheet > svg");
  const state = await page.evaluate(readSelection);
  const label = await page.getAttribute("#curCheatSheet", "aria-label");
  await page.close();

  assert.equal(state.category, "javascript");
  assert.equal(state.example, slug);
  // The graphic as well as the dropdown: a link that set the control and drew
  // nothing would read as working from the address bar alone.
  assert.equal(label, "Splicing Arrays cheat sheet");
  assert.equal(state.hash, `#${slug}`);
});

test("a fragment resolves against the category it belongs to, not the first one", { skip }, async () => {
  // The second category under `/two/` holds the back half of the eleven, so a
  // link into it only works if the category travelled with the entry. Reading
  // the category off the front of the slug would send every one of these to
  // `javascript`, where the option does not exist.
  const slug = twoCategories().categories[1].cheatsheets[0].id;
  const { page } = await openPage(`two/#${slug}`);
  await page.waitForSelector("#curCheatSheet > svg");
  const state = await page.evaluate(readSelection);
  const shown = await page.evaluate(() =>
    [...document.getElementById("example").getElementsByTagName("optgroup")].map(
      (group) => group.style.display
    )
  );
  await page.close();

  assert.equal(state.category, "second");
  assert.equal(state.example, slug);
  assert.deepEqual(shown, ["none", "block"]);
});

test("a fragment naming nothing in the catalog arrives as if it were absent", { skip }, async () => {
  // A renamed folder, a hand typed link, a slug from an older catalog. The
  // page falls back to the single category preselection rather than sitting
  // empty behind a fragment the reader cannot see failing.
  const { page } = await openPage("#javascript/arrays/no-such-sheet");
  const state = await page.evaluate(readSelection);
  await page.close();

  assert.equal(state.category, "javascript");
  assert.equal(state.example, "");
  // And the dead slug is cleared rather than kept as evidence of the typo.
  // The fragment is a statement about what is on screen, so one naming a sheet
  // the page is not showing is the exact inconsistency the fragment exists to
  // prevent - and a reader who copied the address bar from here would pass the
  // dead link on. What went wrong is still in their history and in whatever
  // sent them; the address bar is not the place to keep it.
  assert.equal(state.hash, "");
});

test("a percent escaped fragment resolves to the same cheatsheet", { skip }, async () => {
  // A slash is legal in a fragment and the page writes one, but a client that
  // escapes it on the way out should not produce a dead link.
  const { page } = await openPage("#javascript%2Farrays%2Fsorting-arrays");
  await page.waitForSelector("#curCheatSheet > svg");
  const state = await page.evaluate(readSelection);
  await page.close();

  assert.equal(state.example, "javascript/arrays/sorting-arrays");
});

test("a malformed fragment is turned down rather than throwing", { skip }, async () => {
  // `decodeURIComponent("%zz")` throws, and the call sits in the page's top
  // level start up block, so an unguarded one would take the catalog down with
  // it and the reader would get the "could not be loaded" paragraph.
  const { page } = await openPage("#%zz");
  const state = await page.evaluate(() => ({
    category: document.getElementById("category").value,
    example: document.getElementById("example").value,
    error: getComputedStyle(document.getElementById("catalogError")).display,
  }));
  await page.close();

  assert.equal(state.error, "none");
  assert.equal(state.category, "javascript");
  assert.equal(state.example, "");
});

test("the address bar follows the selection the reader makes", { skip }, async () => {
  const { page } = await openPage();
  const hash = () => page.evaluate(() => location.hash);

  assert.equal(await hash(), "");
  await page.selectOption("#example", { label: "Concating Arrays" });
  assert.equal(await hash(), "#javascript/arrays/concating-arrays");

  await page.selectOption("#example", { label: "Slicing Arrays" });
  assert.equal(await hash(), "#javascript/arrays/slicing-arrays");

  // Nothing is selected any more, so the fragment names nothing. A link copied
  // here should be the page rather than the last sheet the reader closed.
  await page.selectOption("#example", "");
  assert.equal(await hash(), "");
  await page.close();
});

test("changing the category clears the fragment with the selection", { skip }, async () => {
  const { page } = await openPage("two/");
  await page.selectOption("#category", "javascript");
  await page.selectOption("#example", { index: 1 });
  await page.waitForSelector("#curCheatSheet > svg");

  await page.selectOption("#category", "second");
  const state = await page.evaluate(readSelection);
  await page.close();

  assert.equal(state.example, "");
  assert.equal(state.hash, "");
});

test("looking at four cheatsheets leaves the back button where it was", { skip }, async () => {
  // The reason `replaceState` is used rather than an assignment to
  // `location.hash`. With a push per selection the reader's way out of the
  // page recedes by one every time they change their mind.
  const { page } = await openPage();
  const length = () => page.evaluate(() => history.length);
  const entries = await length();

  for (const label of ["Sorting Arrays", "Slicing Arrays", "Random Sort Array", "Sorting Arrays"]) {
    await page.selectOption("#example", { label });
  }
  const after = await length();
  await page.close();

  assert.equal(after, entries, `${after - entries} history entries were pushed by four selections`);
});

// ---------------------------------------------------------------------------
// The console guidance, which is three lines about one thing.
// ---------------------------------------------------------------------------

/** Whether each line telling the reader to open the console is rendered. */
function readConsoleGuidance() {
  const shown = (id) => getComputedStyle(document.getElementById(id)).display !== "none";
  return {
    intro: shown("consoleIntro"),
    step: shown("consoleStep"),
    footnote: shown("showFootNote"),
  };
}

test("nothing asks for the console before a cheatsheet is chosen", { skip }, async () => {
  const { page } = await openPage();
  const guidance = await page.evaluate(readConsoleGuidance);
  await page.close();

  assert.deepEqual(guidance, { intro: false, step: false, footnote: false });
});

test("the console guidance follows the selected cheatsheet's kind", { skip }, async () => {
  const sheets = manifest.categories[0].cheatsheets;
  const { page } = await openPage("drawn/");
  const guidance = () => page.evaluate(readConsoleGuidance);

  // A script the page injects: all three lines are true, so all three show.
  await page.selectOption("#example", sheets[0].id);
  await page.waitForSelector("#curCheatSheet > svg");
  assert.deepEqual(await guidance(), { intro: true, step: true, footnote: true });

  // A sheet that runs nothing. The fault this closes: the heading blurb and
  // the third step were in the markup unconditionally, so the page told the
  // reader to open a console that nothing would ever write to, and the
  // footnote underneath pointed back up at an instruction that did not apply.
  await page.selectOption("#example", sheets[DRAWN_INDEX].id);
  await page.waitForSelector("#curCheatSheet > svg");
  assert.deepEqual(await guidance(), { intro: false, step: false, footnote: false });

  // And back, so the hiding is a state rather than a one way door.
  await page.selectOption("#example", sheets[0].id);
  await page.waitForSelector("#curCheatSheet > svg");
  assert.deepEqual(await guidance(), { intro: true, step: true, footnote: true });
  await page.close();
});

test("the step keeps its number when it comes back", { skip }, async () => {
  // `display: block` on an `li` takes its marker with it, so the third step
  // would return as an unnumbered line in a numbered list.
  const { page } = await openPage();
  await page.selectOption("#example", { label: "Sorting Arrays" });
  const display = await page.evaluate(
    () => getComputedStyle(document.getElementById("consoleStep")).display
  );
  await page.close();

  assert.equal(display, "list-item");
});

test("a sheet that runs nothing has no script element injected for it", { skip }, async () => {
  // The guidance above is only honest if it matches what the page does, and
  // what it does is inject for `run` alone.
  const sheets = manifest.categories[0].cheatsheets;
  const { page } = await openPage("drawn/");
  const injected = () =>
    page.evaluate(() => document.querySelectorAll("body > script[src]").length);

  await page.selectOption("#example", sheets[DRAWN_INDEX].id);
  await page.waitForSelector("#curCheatSheet > svg");
  assert.equal(await injected(), 0);

  await page.selectOption("#example", sheets[0].id);
  await page.waitForSelector("#curCheatSheet > svg");
  assert.equal(await injected(), 1);
  await page.close();
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
