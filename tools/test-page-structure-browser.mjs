// Browser driven checks for the layout in index.html, beside the source text
// checks in tools/test-page-structure.mjs. That file reads the stylesheet and
// confirms the rules are present; this one drives a real engine and confirms
// what they render.
//
// **The decision this file records.** A browser test belongs here, but not as
// a dependency. The repository is dependency free on purpose - there is no
// package.json, and the whole suite has to run on a clone with nothing
// installed - while a browser test needs Playwright, which on this machine
// exists only at user scope. So the two are reconciled rather than traded off:
// nothing is added to the repository, Playwright is looked for at run time in
// the places it is actually installed, and when it is not found every case
// below is skipped with the reason rather than failing. The suite therefore
// passes on a bare clone and gains these assertions wherever a browser exists.
// Install it for a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// The command that constraint is about is `node --test`, run from the
// repository root with no path after it; `tools/test-suite-invocation.mjs`
// records why it is that and not a path or a glob, and holds the naming the
// bare command depends on.
//
// The page is served over a throwaway node:http server on an ephemeral port,
// so the checks need no `php -S`, no network and no dependency of their own.
//
// What used to be deliberately absent here was the image loading states
// measured on 2026.09.08, 09.09 and 09.10 - the broken icon, the file:// page,
// the stalled request. None of them exists any more: the page composes its
// sheet from a document rather than fetching a raster, so there is no image
// request to break, to be refused, or to stall. The selection behaviour that
// replaced them is in `tools/test-example-selection.mjs`, which drives the same
// kind of server.
//
// Run with: node --test tools/test-page-structure-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  // The page imports `api/cheatsheet/` as a module and fetches its manifest,
  // and a module script served as anything but a JavaScript media type is
  // refused outright, so both belong in a map that used to need neither.
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
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

// A page with an example chosen, so the sheet is on screen and has a box to
// measure. Nothing about the layout can be read from the empty frame, which
// ships hidden.
//
// Two waits rather than one, because the page now builds itself in two stages.
// The dropdowns are appended from `cheatsheets.json`, so there is no option to
// select until that fetch has answered - `data-catalog` on the root is what the
// page sets when it has - and the graphic is composed from the chosen sheet's
// own document, so the frame holds a reserved box before it holds any ink.
//
// The category is named rather than relied on. The page preselects one only
// while the catalog holds a single category, and it has held two since the
// `html-css` category landed on 2026.10.19, so `#selectExample` ships hidden
// and a selection made straight on `#example` has no visible control to make.
async function openPage(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(site.base);
  await page.waitForSelector('html[data-catalog="ready"]');
  await page.selectOption("#category", "javascript");
  await page.selectOption("#example", { label: "Sorting Arrays" });
  await page.waitForSelector("#curCheatSheet > svg");
  return page;
}

// One read of everything a width can be judged by, so a scan costs one round
// trip per width rather than one per assertion.
function readLayout() {
  const columns = [...document.querySelectorAll("div.row > div.col")].map((column) =>
    column.getBoundingClientRect()
  );
  const sheet = document.getElementById("curCheatSheet").getBoundingClientRect();
  const body = document.body.getBoundingClientRect();
  const page = document.documentElement;
  return {
    twoColumns: Math.round(columns[0].top) === Math.round(columns[1].top),
    columnTops: columns.map((box) => Math.round(box.top)),
    panelRight: Math.round(columns[0].right),
    sheetLeft: Math.round(sheet.left),
    sheetInsideColumn:
      sheet.left >= columns[1].left - 0.5 && sheet.right <= columns[1].right + 0.5,
    // How far the sheet's right edge stops short of its column's. Inside the
    // column is only half the question: the column takes whatever width the
    // row has left while the sheet is capped and left aligned, so the two can
    // agree on containment and still leave empty ground between them.
    sheetTrailingGap: Math.round(columns[1].right - sheet.right),
    // The same two edges unreduced, because a difference of zero says the two
    // agree and not where they agreed.
    sheetRight: Math.round(sheet.right * 100) / 100,
    columnRight: Math.round(columns[1].right * 100) / 100,
    sheetWidth: Math.round(sheet.width * 100) / 100,
    bodyWidth: Math.round(body.width * 100) / 100,
    bodyLeft: Math.round(body.left * 100) / 100,
    bodyMarginRight: Math.round((page.clientWidth - body.right) * 100) / 100,
    gutter: getComputedStyle(document.body).paddingLeft,
    overflow: page.scrollWidth - page.clientWidth,
  };
}

test("the two columns start at the same height on a wide screen", { skip }, async () => {
  const page = await openPage(1280, 900);
  const layout = await page.evaluate(readLayout);
  await page.close();

  assert.equal(layout.columnTops[0], layout.columnTops[1]);
  assert.ok(layout.twoColumns);
  // The row's gap is the only thing between them, so the sheet starts one
  // space-4 right of where the panel column ends.
  const gap = layout.sheetLeft - layout.panelRight;
  assert.ok(
    gap >= 0 && gap <= 40,
    `the sheet starts ${gap}px past the panel column, which is not beside it`
  );
});

test(
  "the row changes shape exactly once between 1280px and 360px, at the breakpoint",
  { skip },
  async () => {
    const page = await openPage(1280, 900);
    const transitions = [];
    const escapes = [];
    const overflows = [];
    const stranded = [];
    let previous = null;

    for (let width = 1280; width >= 360; width--) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(readLayout);
      if (previous !== null && layout.twoColumns !== previous) {
        transitions.push({ from: width + 1, to: width, twoColumns: layout.twoColumns });
      }
      if (!layout.sheetInsideColumn) escapes.push(width);
      if (layout.overflow > 0) overflows.push(width);
      // Two columns only: below the breakpoint the sheet fills its column by
      // rule and there is nothing for this to catch. It was measured at 176px
      // on 2026.09.13 at every width from 1025px up, worst at exactly the
      // 1200px `body { max-width }` then carried.
      if (width >= 769 && layout.sheetTrailingGap > 32) {
        stranded.push({ width, gap: layout.sheetTrailingGap });
      }
      previous = layout.twoColumns;
    }
    await page.close();

    assert.deepEqual(transitions, [{ from: 768, to: 767, twoColumns: false }]);
    assert.deepEqual(escapes, [], "the sheet left its column at these widths");
    assert.deepEqual(overflows, [], "the page scrolled sideways at these widths");
    assert.deepEqual(
      stranded,
      [],
      "the sheet stopped more than one space-4 short of its own column at these widths"
    );
  }
);

test("the sheet ends exactly where its own column ends", { skip }, async () => {
  // The scan above allows one space-4 of slack, which is the right tolerance
  // for a sweep of 921 widths and the wrong one for the claim itself: the
  // 1324px maximum content width is the row's own measure - 360 for the panel,
  // a space-4 gap, 900 for the sheet, a space-2 gutter each side - so above
  // 1324px the two edges are not merely close, they are the same number. They
  // were as much as 176px apart until 2026.09.14.
  //
  // Both figures moved on 2026.10.14 when the cap was raised from 600 to 900,
  // and they moved together on purpose: a 900px cap inside a 1024px page is a
  // 600px sheet capped by its column, which is the cap it already had.
  const page = await openPage(1600, 900);
  const measured = [];
  for (const width of [1600, 1500, 1400, 1325, 1324]) {
    await page.setViewportSize({ width, height: 900 });
    measured.push({ width, ...(await page.evaluate(readLayout)) });
  }
  await page.close();

  for (const row of measured) {
    assert.equal(
      row.sheetRight,
      row.columnRight,
      `at ${row.width}px the sheet ends at ${row.sheetRight} and its column at ${row.columnRight}`
    );
    assert.equal(
      row.sheetWidth,
      900,
      `the sheet is ${row.sheetWidth}px at ${row.width}px rather than its 900px cap`
    );
  }
});

test("the page holds its measure and stays centred on a wide screen", { skip }, async () => {
  // Capping the page at its content is what puts the two edges above together,
  // so this is the other half of the same change: the cap has to hold, and the
  // page has to keep sitting in the middle of whatever window it is given
  // rather than against one edge of it.
  const page = await openPage(1600, 900);
  const measured = [];
  for (const width of [1324, 1325, 1400, 1600, 1800, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    measured.push({ width, ...(await page.evaluate(readLayout)) });
  }
  await page.close();

  for (const row of measured) {
    assert.equal(row.bodyWidth, 1324, `the page is ${row.bodyWidth}px wide at ${row.width}px`);
    assert.ok(
      Math.abs(row.bodyLeft - row.bodyMarginRight) < 1,
      `the page sits ${row.bodyLeft}px from the left and ${row.bodyMarginRight}px from the ` +
        `right at ${row.width}px, so it is not centred`
    );
    // The gutter is inside the width, so it survives the cap rather than being
    // squeezed out by it.
    assert.equal(row.gutter, "16px", `the gutter is ${row.gutter} at ${row.width}px`);
    assert.equal(row.overflow, 0, `the page scrolls sideways at ${row.width}px`);
  }
});

// What a `select` has to spend before any label is drawn: its padding, its
// border, and the dropdown arrow, which is drawn by the engine and appears in
// no computed style. The arrow is measured rather than assumed, by putting a
// probe control beside the real one with a single option whose text width is
// known and letting the engine size it: a select at its intrinsic width is
// exactly that text plus everything else it spends.
function readControlRoom() {
  const select = document.getElementById("example");
  const style = getComputedStyle(select);
  const face = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const pen = document.createElement("canvas").getContext("2d");
  pen.font = face;

  const frame =
    parseFloat(style.paddingLeft) +
    parseFloat(style.paddingRight) +
    parseFloat(style.borderLeftWidth) +
    parseFloat(style.borderRightWidth);

  const probe = document.createElement("select");
  probe.style.cssText = `font: ${face}; padding: ${style.padding}; border: ${style.border}; width: auto; position: absolute; visibility: hidden`;
  const sample = document.createElement("option");
  sample.textContent = "measuring the arrow";
  probe.appendChild(sample);
  select.parentNode.appendChild(probe);
  const arrow = probe.getBoundingClientRect().width - pen.measureText(sample.textContent).width - frame;
  probe.remove();

  let widest = { label: "", width: 0 };
  for (const option of select.options) {
    const width = pen.measureText(option.textContent).width;
    if (width > widest.width) widest = { label: option.textContent, width };
  }

  // The panel's own border counts against the control as much as its padding
  // does, and leaving it out is how 310 reads as 312 and a control with no
  // slack at all reads as one with two pixels of it.
  const panel = select.closest("div.tools");
  const panelStyle = getComputedStyle(panel);
  return {
    control: select.getBoundingClientRect().width,
    panelInner:
      panel.getBoundingClientRect().width -
      parseFloat(panelStyle.paddingLeft) -
      parseFloat(panelStyle.paddingRight) -
      parseFloat(panelStyle.borderLeftWidth) -
      parseFloat(panelStyle.borderRightWidth),
    frame,
    arrow,
    textRoom: select.getBoundingClientRect().width - frame - arrow,
    widest: widest.label,
    widestWidth: widest.width,
    textOverflow: style.textOverflow,
  };
}

test("the widest example label fits the control it is offered in", { skip }, async () => {
  // Measured on 2026.09.24 and fixed on 2026.10.14. At 375px the control was
  // 293px, spent 18px on padding and border and 18.98 on its arrow, and had
  // 255px left for a label needing 273.02 - so it read "Max and Min Function
  // and Sort Obje", cut mid word with nothing marking the cut. At 1280px it was
  // 310 against the same 273.02, one pixel inside the boundary.
  //
  // Two changes answer that and this pins both: the control takes the panel's
  // whole measure rather than its own intrinsic width, and below the breakpoint
  // the panel pads at space-2 rather than space-3. The arrow is measured here
  // rather than quoted, because it is engine drawn and appears in no computed
  // style, and a figure nothing re-measures is a figure that goes stale.
  const page = await openPage(1600, 900);
  const measured = [];
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 812 });
    measured.push({ width, ...(await page.evaluate(readControlRoom)) });
  }
  await page.close();

  for (const row of measured) {
    assert.equal(
      row.control,
      row.panelInner,
      `at ${row.width}px the control is ${row.control}px inside a panel offering ${row.panelInner}px, ` +
        `so it is not taking the measure it has`
    );
    assert.ok(
      row.widestWidth <= row.textRoom,
      `at ${row.width}px "${row.widest}" sets at ${row.widestWidth.toFixed(2)}px against the ` +
        `${row.textRoom.toFixed(2)}px the control leaves once its ${row.frame}px of padding and ` +
        `border and its ${row.arrow.toFixed(2)}px arrow are taken out`
    );
    // The two widths above are the ones the measure reaches. Below about 365px
    // no padding leaves the 310px the widest label needs, and a select clips by
    // default, so the cut has to be marked where it cannot be avoided.
    assert.equal(row.textOverflow, "ellipsis", `the control clips rather than ellipsising at ${row.width}px`);
  }
});

test("the sheet offers a route to full size once one is on screen", { skip }, async () => {
  // The cap raise does not reach a phone - `min(100%, 900px)` is 100% at every
  // width under 900 - so the link is the whole of the phone's answer, and it
  // has to be a live blob of the composition rather than a path to a file the
  // repository does not hold.
  const page = await openPage(375, 812);
  const link = await page.evaluate(() => {
    const anchor = document.getElementById("sheetFullSizeLink");
    return {
      shown: getComputedStyle(document.getElementById("sheetFullSize")).display,
      href: anchor.getAttribute("href"),
      text: anchor.textContent,
      target: anchor.getAttribute("target"),
    };
  });

  assert.equal(link.shown, "block");
  assert.match(link.href, /^blob:/);
  assert.equal(link.text, "Open Sorting Arrays at full size");
  assert.equal(link.target, "_blank");

  // The blob really is the composition, at its own size: fetching it back is
  // the only way to say so, since a blob URL says nothing about its contents.
  const markup = await page.evaluate((url) => fetch(url).then((response) => response.text()), link.href);
  assert.match(markup, /^<\?xml[^>]*\?>\s*<svg/);
  assert.match(markup, /<svg[^>]*width="3600"/);
  assert.match(markup, /<svg[^>]*height="3600"/);

  // And it is taken back down with the sheet, rather than pointing at a
  // composition the reader has moved on from.
  await page.selectOption("#example", "");
  const cleared = await page.evaluate(() => ({
    shown: getComputedStyle(document.getElementById("sheetFullSize")).display,
    href: document.getElementById("sheetFullSizeLink").getAttribute("href"),
  }));
  assert.equal(cleared.shown, "none");
  assert.equal(cleared.href, null);
  await page.close();
});

test("nothing pushes the page sideways on a phone", { skip }, async () => {
  const page = await openPage(390, 664);
  const measured = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  await page.close();

  assert.equal(measured.scrollWidth, measured.clientWidth);
});

test("the tools panel scrolls with the page rather than staying pinned", { skip }, async () => {
  const page = await openPage(390, 664);
  const scrolled = await page.evaluate(async () => {
    const tools = document.querySelector("div.tools");
    const before = tools.getBoundingClientRect().top;
    const room = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const by = Math.min(200, room);
    window.scrollTo(0, by);
    await new Promise((frame) => requestAnimationFrame(frame));
    return { room, by, before, after: tools.getBoundingClientRect().top };
  });
  await page.close();

  assert.ok(scrolled.room > 0, "the page did not scroll at all, so nothing was measured");
  // A pinned panel would hold its distance from the top of the viewport. This
  // one travels the whole way, which is what removing position: fixed bought.
  assert.ok(
    Math.abs(scrolled.before - scrolled.after - scrolled.by) < 1,
    `the panel moved ${(scrolled.before - scrolled.after).toFixed(1)}px against ` +
      `${scrolled.by}px of scrolling`
  );
});

test("the footnote is rendered, not merely styled, on the first selection", { skip }, async () => {
  // The stub DOM reads the style property back and cannot tell a rendered
  // block from a string assignment. This reads the computed value off a page
  // that has been loaded once and clicked once, which is the case the
  // 2026.09.07 regression escaped through.
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(site.base);
  await page.waitForSelector('html[data-catalog="ready"]');
  const display = () =>
    page.evaluate(() => getComputedStyle(document.getElementById("showFootNote")).display);

  assert.equal(await display(), "none");
  // The category first: nothing is preselected once the catalog holds more
  // than one, so the example control ships hidden.
  await page.selectOption("#category", "javascript");
  await page.selectOption("#example", { label: "Shift And Unshift" });
  assert.equal(await display(), "block");

  // The same load answers the other question the stub cannot: the accessible
  // name is read off the option's label by a real <select>, not by a hand
  // built stand-in. The frame is a container the page draws into rather than
  // an image element, so the name is an aria-label where it used to be an alt.
  assert.equal(
    await page.evaluate(() =>
      document.getElementById("curCheatSheet").getAttribute("aria-label")
    ),
    "Shift And Unshift cheat sheet"
  );
  await page.close();
});

test("favicon.ico decodes square, in the mark's own colors", { skip }, async () => {
  // The byte level test parses the ICO container and so can only say what the
  // frame table claims. Decoding it is the only way to see the pixels, and the
  // derivation in DESIGN_LANGUAGE.md turns on a box filter leaving the sampled
  // colors exactly as they were counted in the artwork.
  const page = await browser.newPage();
  await page.goto(site.base);
  const icon = await page.evaluate(async () => {
    const image = new Image();
    image.src = "favicon.ico";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    const { data } = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height);
    const counts = {};
    for (let i = 0; i < data.length; i += 4) {
      const hex = `#${[data[i], data[i + 1], data[i + 2]]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`;
      counts[hex] = (counts[hex] ?? 0) + 1;
    }
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      pixels: data.length / 4,
      counts,
    };
  });
  await page.close();

  assert.equal(icon.width, icon.height, "the icon did not decode square");
  const share = (hex) => (100 * (icon.counts[hex] ?? 0)) / icon.pixels;
  for (const [role, hex] of [["navy", "#000133"], ["green", "#4cae50"]]) {
    assert.ok(
      share(hex) > 20,
      `the ${role} ${hex} covers ${share(hex).toFixed(2)}% of the decoded icon`
    );
  }
  assert.ok(share("#ffffff") > 5, "the highlight is missing from the decoded icon");
});

// The page's own route to the brand, which is not the one `tools/test-sheet-brand.mjs`
// drives. That file hands `composeSheet` two assets it read off disk; this one
// starts a browser at the page and lets it fetch them for itself, so a renamed
// file, a path that does not resolve under a project base, or a `fetchSheetBrand`
// that quietly answered nothing is caught. Every sheet would still compose in
// that state - the slots fall back to a drawn square and a lone wordmark - and
// nothing else in the suite would go red.
test("the page fetches its brand assets, and both reach the composed sheet", { skip }, async () => {
  const page = await openPage(1280, 900);
  const slots = await page.evaluate(() => {
    const svg = document.querySelector("#curCheatSheet > svg");
    const mark = svg.querySelector('[data-name="masthead-mark"]');
    const footer = svg.querySelector('[data-name="footer-lockup"]');
    return {
      markShapes: mark ? mark.querySelectorAll("path, rect").length : 0,
      markTag: mark?.tagName.toLowerCase() ?? null,
      footerTag: footer?.tagName.toLowerCase() ?? null,
      footerHref: (footer?.getAttribute("href") ?? "").slice(0, 21),
      drawn: [...svg.querySelectorAll("[data-name]")]
        .map((node) => node.getAttribute("data-name"))
        .filter((name) => name === "mark-square" || name === "follow-line"),
    };
  });
  await page.close();

  // The logo is inlined as the vector it is rather than rasterised, and the
  // footer is embedded rather than left as a second request the saved markup
  // could not resolve.
  assert.equal(slots.markTag, "g", "the masthead mark is missing, so the logo never reached the page");
  assert.ok(slots.markShapes > 0, "the masthead mark holds no drawable shape");
  assert.equal(slots.footerTag, "image", "the footer lockup is missing, so footer.png never reached the page");
  assert.equal(slots.footerHref, "data:image/png;base64", "the footer strip is not embedded in the markup");
  // Both slots are either the asset or the fallback, never both at once.
  assert.deepEqual(slots.drawn, [], "the sheet drew its own footer beside the strip it was given");
});

test("an asset that does not answer leaves the sheet it drew before", { skip }, async () => {
  // The state every clone was in until the two files were committed, and the
  // state a Pages deploy is in if they are not published with it. The sheet is
  // expected to compose anyway: the brand is fetched beside the catalog rather
  // than in front of it, and neither slot gates the page.
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const failed = [];
  page.on("pageerror", (error) => failed.push(error.message));
  await page.route("**/assets/*", (route) => route.fulfill({ status: 404 }));
  await page.goto(site.base);
  await page.waitForSelector('html[data-catalog="ready"]');
  await page.selectOption("#category", "javascript");
  await page.selectOption("#example", { label: "Sorting Arrays" });
  await page.waitForSelector("#curCheatSheet > svg");
  const slots = await page.evaluate(() => {
    const svg = document.querySelector("#curCheatSheet > svg");
    const named = [...svg.querySelectorAll("[data-name]")].map((node) =>
      node.getAttribute("data-name")
    );
    return {
      named,
      wordmark: svg.querySelector('[data-name="wordmark"]')?.textContent ?? null,
      codeRuns: named.filter((name) => name.startsWith("code-")).length,
    };
  });
  await page.close();

  assert.deepEqual(failed, [], "a missing asset took the page down rather than falling back");
  assert.ok(!slots.named.includes("masthead-mark"), "a mark was drawn from an asset that 404ed");
  assert.ok(!slots.named.includes("footer-lockup"), "a strip was drawn from an asset that 404ed");
  assert.ok(slots.named.includes("mark-square"), "the drawn footer did not take the strip's place");
  assert.ok(slots.named.includes("follow-line"), "the drawn follow line did not take the strip's place");
  assert.equal(slots.wordmark, "practicing.xyz");
  assert.ok(slots.codeRuns > 10, "the sheet stopped composing when an asset was missing");
});
