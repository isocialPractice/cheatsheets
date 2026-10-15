// Browser driven checks on the footer lockup, beside the composition level
// checks in tools/test-sheet-brand.mjs. That file reads the plate back out of a
// composition through the vendored surface's own rasterizer; this one hands the
// same sheet to a real engine over HTTP and confirms the plate lands where that
// rasterizer says it does - at the page's own 900px render, through the full
// size route, and against the artwork the figures were measured from.
//
// **Why the pair is worth having rather than one of the two.** The two routes
// draw an `<image>` by different code: the built-in rasterizer composites the
// decoded PNG itself, and Chromium resolves `preserveAspectRatio` against the
// slot and resamples. A fit that is right in one is not thereby right in the
// other, and the page is the half a reader sees. The 900px render is also the
// only place the sheet meets the page's own frame, which is where the defect
// this pins was visible: until 2026.10.15 the asset was a tight crop beginning
// at the mark, so the green bar was the leftmost ink on the sheet and sat on
// the trim against the frame's border.
//
// **What the pixels say about the asset, which the figures alone do not.** The
// asset's navy is a 94 column block of its 799, opaque through all 81 rows, and
// the 705 columns past it are transparent so the follow line sits on the band's
// own white ground. What runs down the trim above the plate is the green spine,
// not paper - in the composed sheet and in the artwork alike - so the single
// blended row where the two meet is navy against green. A row of white there
// would be the defect, which is why the checks below look for paper at the trim
// rather than for a hard edge.
//
// Playwright is resolved at run time the way the repository's other browser
// tests resolve it, and every case skips with the install command as its reason
// where no browser exists, so the suite still passes on a bare clone:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// The page is served over a throwaway node:http server on an ephemeral port,
// so the checks need no `php -S`, no network and no dependency of their own.
//
// Run with: node --test tools/test-sheet-footer-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

import { BRAND_SLOTS, CANVAS, COLORS } from "../api/cheatsheet/language.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. `@playwright/test` keeps
// `playwright` in its own node_modules rather than beside itself, which is why
// resolution is based at its entry file instead of at the global root.
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

/**
 * The pixels out of a screenshot.
 *
 * Only what Chromium emits - 8 bit, non-interlaced, RGB or RGBA - because the
 * only PNGs handed to it are its own. `node:zlib` does the half that would
 * otherwise need a dependency, which is what keeps this file inside the
 * repository's no-dependency rule.
 */
function decodePng(buffer) {
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  for (let at = 8; at < buffer.length; ) {
    const length = buffer.readUInt32BE(at);
    const kind = buffer.toString("ascii", at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (kind === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (kind === "IDAT") {
      idat.push(body);
    } else if (kind === "IEND") {
      break;
    }
    at += 12 + length;
  }
  assert.equal(depth, 8, `unexpected PNG bit depth ${depth}`);
  assert.equal(interlace, 0, "interlaced PNG");
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  assert.ok(channels, `unexpected PNG color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prior = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = out.subarray(y * stride, (y + 1) * stride);
    line.copy(row);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? row[i - channels] : 0;
      const b = prior[i];
      const c = i >= channels ? prior[i - channels] : 0;
      if (filter === 1) row[i] = (row[i] + a) & 0xff;
      else if (filter === 2) row[i] = (row[i] + b) & 0xff;
      else if (filter === 3) row[i] = (row[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        row[i] = (row[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
    }
    prior = row;
  }
  return {
    width,
    height,
    at(x, y) {
      const i = y * stride + x * channels;
      return [out[i], out[i + 1], out[i + 2]];
    },
  };
}

const BAND = BRAND_SLOTS.footer;

/**
 * Where the artwork puts the mark's green bar, measured off
 * `javaScriptArrays/SplicingArrays.jpg` at x 192, and so where the asset has to
 * put it too. The last case below re-reads it from the artwork rather than
 * trusting this constant, so the two cannot drift apart silently.
 */
const MARK_X = 192;

const hex = (value) => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
];
const NAVY = hex(COLORS.navy);
const GREEN = hex(COLORS.green);
const WHITE = hex(COLORS.white);

// A tolerance rather than an equality, because every figure here comes back
// through a resample: the asset is 799 wide in a 3312 slot, and the 900px
// render takes that down again by four.
const near = (got, want, tol) =>
  Math.abs(got[0] - want[0]) <= tol &&
  Math.abs(got[1] - want[1]) <= tol &&
  Math.abs(got[2] - want[2]) <= tol;

const show = (pixel) => `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;

/** First column across a row whose pixel matches, in the image's own pixels. */
function firstMatch(image, row, want, tol, from = 0, to = image.width) {
  for (let x = from; x < to; x++) {
    if (near(image.at(x, row), want, tol)) return x;
  }
  return -1;
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

// A page with an example chosen, so the sheet is on screen and has pixels to
// read. Two waits rather than one, because the page builds itself in two
// stages: the dropdowns are appended from `cheatsheets.json`, and the graphic
// is composed from the chosen sheet's own document.
//
// The viewport clears the page's own 1324px measure, so the sheet reaches its
// 900px cap rather than whatever width its column had left over.
async function openSheet(width = 1400, height = 1000) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(site.base);
  await page.waitForSelector('html[data-catalog="ready"]');
  await page.selectOption("#example", { index: 1 });
  await page.waitForSelector("#curCheatSheet > svg");
  const frame = await page.evaluate(() => {
    const box = document.getElementById("curCheatSheet");
    const style = getComputedStyle(box);
    const rect = box.getBoundingClientRect();
    return { width: rect.width, border: parseFloat(style.borderLeftWidth) };
  });
  return { page, frame };
}

// The band's rows and the composition scale, within a shot of the framed sheet.
// The frame's border is inside the 900, so the graphic starts one pixel in.
function geometry(frame) {
  const inner = frame.width - 2 * frame.border;
  const scale = inner / CANVAS;
  const edge = Math.round(frame.border);
  const top = edge + Math.round(BAND.y * scale);
  const bottom = edge + Math.round((BAND.y + BAND.height) * scale) - 1;
  return { inner, scale, edge, top, bottom, middle: Math.round((top + bottom) / 2) };
}

const shotOfSheet = async (page) =>
  decodePng(await page.locator("#curCheatSheet").screenshot({ scale: "css" }));

test("at the page's 900px render the plate reaches the trim and fills the band", { skip }, async () => {
  const { page, frame } = await openSheet();
  assert.ok(
    Math.abs(frame.width - 900) <= 1,
    `the sheet rendered ${frame.width}px wide rather than at its 900px cap`
  );
  const shot = await shotOfSheet(page);
  await page.close();
  const band = geometry(frame);

  // The plate's own navy at the trim, from the band's top edge to its bottom.
  // One row at each end is the resampled boundary - the spine above, the
  // frame's border below - so the interior is what carries the claim.
  for (let y = band.top + 2; y <= band.bottom - 2; y++) {
    const pixel = shot.at(band.edge, y);
    assert.ok(
      near(pixel, NAVY, 42),
      `the footer's left trim is ${show(pixel)} at row ${y}, not the plate's navy`
    );
  }

  // And no paper anywhere down that trim, which is the hairline an asset
  // proportioned exactly to the slot did leave. The boundary rows are included:
  // a blend toward white shows here even where a blend toward green does not.
  for (let y = band.top; y <= band.bottom; y++) {
    for (let x = band.edge; x < band.edge + 6; x++) {
      const pixel = shot.at(x, y);
      assert.ok(
        !near(pixel, WHITE, 40),
        `page white at x ${x}, row ${y} - a hairline down the footer's left trim`
      );
    }
  }
});

test("at the page's 900px render the mark is held off the trim, not on it", { skip }, async () => {
  const { page, frame } = await openSheet();
  const shot = await shotOfSheet(page);
  await page.close();
  const band = geometry(frame);

  // The defect itself: before the change the green bar was the leftmost ink on
  // the sheet, and at this render it met the page frame's border.
  assert.ok(
    !near(shot.at(band.edge, band.middle), GREEN, 60),
    "the green bar is the leftmost ink in the footer band - the defect this pins"
  );

  const green = firstMatch(shot, band.middle, GREEN, 60, band.edge);
  assert.ok(green > band.edge, "no green bar was found across the footer band");
  const inComposition = Math.round((green - band.edge) / band.scale);
  assert.ok(
    Math.abs(inComposition - MARK_X) <= 8,
    `the mark's green bar starts at composition x ${inComposition} rather than the artwork's ${MARK_X}`
  );
});

test("the plate meets the spine above it with no paper between", { skip }, async () => {
  const { page, frame } = await openSheet();
  const shot = await shotOfSheet(page);
  await page.close();
  const band = geometry(frame);

  // What runs down the trim above the footer is the spine, so the plate's top
  // edge is navy against green. A row of paper between the two would read as
  // the plate floating in the band rather than filling it.
  const above = shot.at(band.edge, band.top - 3);
  assert.ok(
    near(above, GREEN, 42),
    `above the band the trim is ${show(above)}, so the spine is not what the plate meets`
  );
  for (let y = band.top - 2; y <= band.top + 2; y++) {
    const pixel = shot.at(band.edge, y);
    assert.ok(
      !near(pixel, WHITE, 40),
      `paper at the trim on row ${y}, between the spine and the plate`
    );
  }
});

test("the footer's right end stays inside the sheet", { skip }, async () => {
  const { page, frame } = await openSheet();
  const shot = await shotOfSheet(page);
  await page.close();
  const band = geometry(frame);

  // The slot stops short of the canvas, so the margin past it carries the
  // band's own white ground and nothing else. Ink there is the handle running
  // out of the slot and off the trim.
  const from = band.edge + Math.ceil((BAND.x + BAND.width) * band.scale) + 2;
  const to = band.edge + Math.floor(CANVAS * band.scale) - 1;
  let inked = 0;
  for (let y = band.top + 2; y <= band.bottom - 2; y++) {
    for (let x = from; x < to; x++) {
      if (!near(shot.at(x, y), WHITE, 30)) inked++;
    }
  }
  assert.equal(
    inked,
    0,
    `${inked} inked pixels sit in the footer's right margin - the handle is past the slot`
  );

  // And the ink that should be there, is: the strip reaches toward the margin
  // rather than stopping early, which the same zero would otherwise satisfy.
  let lastInk = -1;
  for (let x = from - 1; x > band.edge; x--) {
    if (!near(shot.at(x, band.middle), WHITE, 30)) {
      lastInk = x;
      break;
    }
  }
  assert.ok(lastInk > band.edge, "the footer band carries no ink at all");
});

test("the full size route draws the same plate at the composition's own scale", { skip }, async () => {
  const { page } = await openSheet();

  // What the reader's new tab is handed: the blob the link points at, read back
  // rather than reconstructed, so this is the same bytes the route serves.
  const svg = await page.evaluate(async () => {
    const href = document.getElementById("sheetFullSizeLink").getAttribute("href");
    if (!href || !href.startsWith("blob:")) return null;
    return await (await fetch(href)).text();
  });
  await page.close();
  assert.ok(svg, "the full size link carries no blob to open");

  const full = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  await full.setContent(
    `<!doctype html><style>html,body{margin:0}img{display:block}</style>` +
      `<img id="sheet" width="${CANVAS}" height="${CANVAS}" src="data:image/svg+xml;base64,` +
      `${Buffer.from(svg, "utf8").toString("base64")}">`,
    { waitUntil: "domcontentloaded" }
  );
  await full.waitForFunction(() => {
    const image = document.getElementById("sheet");
    return image.complete && image.naturalWidth > 0;
  });

  // Only the band's left end is needed, and clipping keeps a 3600 square from
  // being decoded whole for the sake of 200 columns.
  const shot = decodePng(
    await full.screenshot({
      fullPage: true,
      clip: { x: 0, y: BAND.y, width: 1000, height: BAND.height },
      scale: "css",
    })
  );
  await full.close();

  // At the composition's own scale there is no downsample left to blur the
  // edges, so the band's first and last rows are navy outright.
  const middle = Math.round(BAND.height / 2);
  for (const row of [2, middle, BAND.height - 3]) {
    const pixel = shot.at(0, row);
    assert.ok(
      near(pixel, NAVY, 42),
      `at full size the trim is ${show(pixel)} at band row ${row}, not navy`
    );
  }
  const green = firstMatch(shot, middle, GREEN, 60);
  assert.ok(green > 0, "no green bar at full size");
  assert.ok(
    Math.abs(green - MARK_X) <= 4,
    `at full size the green bar starts at x ${green} rather than the artwork's ${MARK_X}`
  );
});

test("the composed footer reads like the artwork's at the left end", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  // Navigated first so the image is same origin with the document that holds
  // it; `setContent` alone leaves the page on about:blank.
  await page.goto(site.base, { waitUntil: "domcontentloaded" });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0}img{display:block}</style>` +
      `<img id="art" src="${site.base}javaScriptArrays/SplicingArrays.jpg">`,
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForFunction(
    () => {
      const image = document.getElementById("art");
      return image.complete && image.naturalWidth > 0;
    },
    null,
    { timeout: 60000 }
  );
  const size = await page.evaluate(() => {
    const image = document.getElementById("art");
    return { width: image.naturalWidth, height: image.naturalHeight };
  });

  // Scanned up from the bottom rather than read off a row figure: the artwork
  // is 3601 square and its band measured 339 against the language's 336, so the
  // two disagree by more than a rounding and the artwork's own edge is what
  // this case is about.
  const sweep = 460;
  const shot = decodePng(
    await page.screenshot({
      fullPage: true,
      clip: { x: 0, y: size.height - sweep, width: 1000, height: sweep },
      scale: "css",
    })
  );
  await page.close();

  // The plate is the run of rows whose own left trim is navy.
  let plateTop = -1;
  let plateBottom = -1;
  for (let y = 0; y < shot.height; y++) {
    if (near(shot.at(0, y), NAVY, 42)) {
      if (plateTop < 0) plateTop = y;
      plateBottom = y;
    }
  }
  assert.ok(plateTop >= 0, "the artwork's own footer shows no navy at its left trim");
  const plateHeight = plateBottom - plateTop + 1;
  assert.ok(
    Math.abs(plateHeight - BAND.height) <= 24,
    `the artwork's plate is ${plateHeight}px tall against the band's ${BAND.height}`
  );

  // The artwork carries the same spine above its own plate, which is what makes
  // navy-against-green the right boundary to expect on the composed sheet.
  const above = shot.at(0, plateTop - 4);
  assert.ok(
    near(above, GREEN, 48),
    `above the artwork's plate the trim is ${show(above)} rather than the spine's green`
  );

  // The figure that has to match is where the mark sits, not how wide its
  // ground runs. The asset's mark is proportionally larger than the artwork's,
  // so the composed navy block is the wider of the two by design - 390px
  // against the artwork's, and only the 192 is held to.
  const artGreen = firstMatch(shot, Math.round((plateTop + plateBottom) / 2), GREEN, 60);
  assert.ok(artGreen > 0, "no green bar in the artwork's footer");
  assert.equal(
    artGreen,
    MARK_X,
    `the artwork's green bar starts at x ${artGreen}, so ${MARK_X} is not the figure to hold to`
  );
});
