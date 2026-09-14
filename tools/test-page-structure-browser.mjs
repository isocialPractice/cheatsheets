// Browser driven checks for the layout in index.html, beside the source text
// checks in tools/test-page-structure.mjs. That file reads the stylesheet and
// confirms the rules are present; this one drives a real engine and confirms
// what they render.
//
// **The decision this file records.** A browser test belongs here, but not as
// a dependency. `tools/` is dependency free on purpose - there is no
// package.json, and `node --test tools/` has to work on a clone with nothing
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
// The page is served over a throwaway node:http server on an ephemeral port,
// so the checks need no `php -S`, no network and no dependency of their own.
//
// What is deliberately not here: the image loading states measured on
// 2026.09.08, 09.09 and 09.10 - the broken icon, the file:// page, the stalled
// request. Each needs its own origin, scheme or stalling server rather than a
// viewport, and each belongs with **Replace the `XMLHttpRequest` probe** under
// **Preview Links and Example Loading**, which is the item that changes the
// code they describe.
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

// A page with an example chosen, so the image is on screen and has a box to
// measure. Nothing about the layout can be read from the placeholder, which
// ships hidden.
async function openPage(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(site.base);
  await page.selectOption("#example", { label: "Sorting Arrays" });
  await page.waitForFunction(() => {
    const image = document.getElementById("curCheatSheetImg");
    return image.complete && image.naturalWidth > 0;
  });
  return page;
}

// One read of everything a width can be judged by, so a scan costs one round
// trip per width rather than one per assertion.
function readLayout() {
  const columns = [...document.querySelectorAll("div.row > div.col")].map((column) =>
    column.getBoundingClientRect()
  );
  const image = document.getElementById("curCheatSheetImg").getBoundingClientRect();
  const body = document.body.getBoundingClientRect();
  const page = document.documentElement;
  return {
    twoColumns: Math.round(columns[0].top) === Math.round(columns[1].top),
    columnTops: columns.map((box) => Math.round(box.top)),
    panelRight: Math.round(columns[0].right),
    imageLeft: Math.round(image.left),
    imageInsideColumn:
      image.left >= columns[1].left - 0.5 && image.right <= columns[1].right + 0.5,
    // How far the sheet's right edge stops short of its column's. Inside the
    // column is only half the question: the column takes whatever width the
    // row has left while the sheet is capped and left aligned, so the two can
    // agree on containment and still leave empty ground between them.
    imageTrailingGap: Math.round(columns[1].right - image.right),
    // The same two edges unreduced, because a difference of zero says the two
    // agree and not where they agreed.
    imageRight: Math.round(image.right * 100) / 100,
    columnRight: Math.round(columns[1].right * 100) / 100,
    imageWidth: Math.round(image.width * 100) / 100,
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
  // The row's gap is the only thing between them, so the image starts one
  // space-4 right of where the panel column ends.
  const gap = layout.imageLeft - layout.panelRight;
  assert.ok(
    gap >= 0 && gap <= 40,
    `the image starts ${gap}px past the panel column, which is not beside it`
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
      if (!layout.imageInsideColumn) escapes.push(width);
      if (layout.overflow > 0) overflows.push(width);
      // Two columns only: below the breakpoint the sheet fills its column by
      // rule and there is nothing for this to catch. It was measured at 176px
      // on 2026.09.13 at every width from 1025px up, worst at exactly the
      // 1200px `body { max-width }` then carried.
      if (width >= 769 && layout.imageTrailingGap > 32) {
        stranded.push({ width, gap: layout.imageTrailingGap });
      }
      previous = layout.twoColumns;
    }
    await page.close();

    assert.deepEqual(transitions, [{ from: 768, to: 767, twoColumns: false }]);
    assert.deepEqual(escapes, [], "the image left its column at these widths");
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
  // 1024px maximum content width is the row's own measure - 360 for the panel,
  // a space-4 gap, 600 for the sheet, a space-2 gutter each side - so above
  // 1024px the two edges are not merely close, they are the same number. They
  // were as much as 176px apart until 2026.09.14.
  const page = await openPage(1280, 900);
  const measured = [];
  for (const width of [1280, 1200, 1100, 1025, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    measured.push({ width, ...(await page.evaluate(readLayout)) });
  }
  await page.close();

  for (const row of measured) {
    assert.equal(
      row.imageRight,
      row.columnRight,
      `at ${row.width}px the sheet ends at ${row.imageRight} and its column at ${row.columnRight}`
    );
    assert.equal(
      row.imageWidth,
      600,
      `the sheet is ${row.imageWidth}px at ${row.width}px rather than its 600px cap`
    );
  }
});

test("the page holds its measure and stays centred on a wide screen", { skip }, async () => {
  // Capping the page at its content is what puts the two edges above together,
  // so this is the other half of the same change: the cap has to hold, and the
  // page has to keep sitting in the middle of whatever window it is given
  // rather than against one edge of it.
  const page = await openPage(1280, 900);
  const measured = [];
  for (const width of [1024, 1025, 1100, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    measured.push({ width, ...(await page.evaluate(readLayout)) });
  }
  await page.close();

  for (const row of measured) {
    assert.equal(row.bodyWidth, 1024, `the page is ${row.bodyWidth}px wide at ${row.width}px`);
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
  const display = () =>
    page.evaluate(() => getComputedStyle(document.getElementById("showFootNote")).display);

  assert.equal(await display(), "none");
  await page.selectOption("#example", { label: "Shift And Unshift" });
  assert.equal(await display(), "block");

  // The same load answers the other question the stub cannot: the alt is read
  // off the option's label by a real <select>, not by a hand built stand-in.
  assert.equal(
    await page.evaluate(() => document.getElementById("curCheatSheetImg").alt),
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
