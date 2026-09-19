// Checks on the two routes a composed sheet becomes pixels by.
//
// The property under test is not "does it produce an image" - both routes
// obviously do - but that **the result says what it is**. A raster drawn in the
// port's built-in single stroke alphabet and one drawn by a real engine in the
// face the design language measured are both PNGs of a cheatsheet, they are
// roughly the same size, and at a glance in a file browser they look alike. One
// of them may be posted and the other may not, and the only thing standing
// between the two is the `publishable` field the caller is handed back. So most
// of what is checked below is that field and the notes beside it.
//
// The dependency free cases run everywhere. The browser cases resolve Chromium
// at run time and skip with the install command as their reason where it is
// absent, which is the pattern `tools/test-page-structure-browser.mjs` settled
// and the reason this file is not named `-browser`: half of it needs no engine
// at all.
//
// Everything renders at a deliberately small scale. The built-in route encodes
// a full size sheet in about three seconds, and none of these cases is about
// resolution.
//
// Run with: node --test tools/test-sheet-raster.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { createComposition, decodePng, isPng } from "../api/graphic-design/index.mjs";
import { composeSheet, DISPLAY_SCALE } from "../api/cheatsheet/index.mjs";
import {
  DEFAULT_SCALE,
  MIN_PUBLISH_SCALE,
  RASTER_FORMATS,
  RASTER_ROUTES,
  rasterizeSheet,
  resolveChromium,
} from "../api/cheatsheet/raster.mjs";

/** @param {Uint8Array} bytes */
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** A sheet with enough rows to fill the panel, so nothing under test is a void. */
const { composition } = composeSheet(
  {
    title: "Splicing Array Elements",
    subtitle: "Splice Array",
    code: Array.from({ length: 20 }, (_, i) => ({
      text: `console.log(fruits.splice(${i}, 1));`,
      role: i % 4 === 3 ? "comment" : "plain",
    })),
  },
  { seed: "splicing-arrays" }
);

const runtime = await resolveChromium();
const skip = runtime.chromium ? false : runtime.reason;

// --- The route selection ----------------------------------------------------

test("the built-in route comes back marked unpublishable, whatever the scale", async () => {
  // The case the whole module exists for. The built-in rasterizer has no font
  // file and strokes its own alphabet, so its output is a regression target
  // rather than a sheet - and nothing about the bytes says so.
  const raster = await rasterizeSheet(composition, { route: "builtin", scale: 0.05 });
  assert.equal(raster.route, "builtin");
  assert.equal(raster.publishable, false);
  assert.ok(
    raster.notes.some((note) => note.includes("single stroke alphabet")),
    "the built-in route did not say why it may not be published"
  );
  assert.ok(isPng(raster.data));
  const decoded = decodePng(raster.data);
  assert.equal(decoded.width, raster.width);
  assert.equal(decoded.height, raster.height);
});

test("and it takes the scale from the call", async () => {
  const small = await rasterizeSheet(composition, { route: "builtin", scale: 0.05 });
  const larger = await rasterizeSheet(composition, { route: "builtin", scale: 0.1 });
  assert.equal(small.width, Math.round(3600 * 0.05));
  assert.equal(small.height, small.width);
  assert.equal(larger.width, small.width * 2);
  assert.equal(small.scale, 0.05);
});

test("and the background, which a full bleed sheet then hides", async () => {
  // Worth being exact about, because a sheet is the one composition the option
  // cannot change: it paints its own white ground across the whole canvas, so
  // whatever is put behind it is covered. Testing the option against a sheet
  // would therefore pass with the plumbing cut.
  //
  // So it is tested against a composition that leaves its corners bare, and the
  // sheet's own insensitivity is asserted beside it rather than left to be
  // rediscovered by someone wondering why their background did nothing.
  const bare = createComposition({ width: 40, height: 40 });
  bare.rect({ x: 10, y: 10, width: 20, height: 20, fill: "#000132" });
  const [onWhite, onGreen] = await Promise.all([
    rasterizeSheet(bare, { route: "builtin", scale: 1, background: "#ffffff" }),
    rasterizeSheet(bare, { route: "builtin", scale: 1, background: "#4dae51" }),
  ]);
  assert.notEqual(digest(onWhite.data), digest(onGreen.data), "the background was ignored");

  const [sheetWhite, sheetGreen] = await Promise.all([
    rasterizeSheet(composition, { route: "builtin", scale: 0.05, background: "#ffffff" }),
    rasterizeSheet(composition, { route: "builtin", scale: 0.05, background: "#4dae51" }),
  ]);
  assert.equal(
    digest(sheetWhite.data),
    digest(sheetGreen.data),
    "a sheet stopped painting its own ground across the whole canvas"
  );
});

test("the built-in route refuses a format it has no encoder for", async () => {
  // It carries its own PNG encoder rather than a codec library, which is what
  // makes it dependency free. Quietly returning a PNG labelled `webp` would
  // hand a caller a file that lies about itself.
  await assert.rejects(
    () => rasterizeSheet(composition, { route: "builtin", format: "webp", scale: 0.05 }),
    /encodes PNG only/
  );
});

test("a format with no consumer here is an error rather than a substitution", async () => {
  for (const format of ["gif", "tiff", "bmp"]) {
    await assert.rejects(
      () => rasterizeSheet(composition, { format, scale: 0.05 }),
      /unsupported raster format/,
      `${format} was accepted`
    );
  }
  assert.deepEqual(RASTER_FORMATS, ["png", "jpeg", "webp"]);
});

test("an unknown route is an error rather than a silent default", async () => {
  await assert.rejects(() => rasterizeSheet(composition, { route: "magick" }), /unknown raster route/);
  assert.deepEqual(RASTER_ROUTES, ["auto", "browser", "builtin"]);
});

test("a scale that is not a positive number is refused", async () => {
  for (const scale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      () => rasterizeSheet(composition, { route: "builtin", scale }),
      /positive number/,
      `a scale of ${scale} was accepted`
    );
  }
});

// --- The scale floor --------------------------------------------------------

test("the publish floor is two device pixels per display pixel, not per composition pixel", () => {
  // The trap this pins. "A scale of 2 or 3" in the roadmap is relative to the
  // 600 px a sheet is displayed at, and `scale` here counts composition pixels,
  // of which there are six per display pixel. Reading the roadmap figure
  // straight would make the floor 2 and every published sheet a 7200 square.
  assert.equal(MIN_PUBLISH_SCALE, 2 / DISPLAY_SCALE);
  assert.ok(MIN_PUBLISH_SCALE > 0.33 && MIN_PUBLISH_SCALE < 0.34);
  assert.ok(DEFAULT_SCALE > MIN_PUBLISH_SCALE, "the default is under the floor it defines");
  assert.equal(DEFAULT_SCALE, 1);
});

test("a raster under the floor is produced and marked, not refused", async () => {
  // A thumbnail is a legitimate thing to want. What is not legitimate is
  // posting one, so it comes back with the reason rather than an exception.
  const raster = await rasterizeSheet(composition, { route: "builtin", scale: 0.05 });
  assert.equal(raster.publishable, false);
  assert.ok(raster.notes.some((note) => note.includes("anti-alias to grey")));
});

// --- The browser route ------------------------------------------------------

test("the browser route draws in the face the design language measured", { skip }, async () => {
  const raster = await rasterizeSheet(composition, { route: "browser", scale: 0.1 });
  assert.equal(raster.route, "browser");
  assert.equal(raster.publishable, false, "a scale under the floor was reported as publishable");
  assert.ok(isPng(raster.data));
  assert.equal(decodePng(raster.data).width, 360);
});

test("and at or above the floor it is the one route that may publish", { skip }, async () => {
  const raster = await rasterizeSheet(composition, { route: "browser", scale: MIN_PUBLISH_SCALE });
  assert.equal(raster.publishable, true);
  assert.deepEqual(raster.notes, []);
});

test("it encodes the two formats the social recipe publishes", { skip }, async () => {
  for (const format of ["jpeg", "webp"]) {
    const raster = await rasterizeSheet(composition, { route: "browser", scale: 0.1, format });
    assert.equal(raster.format, format);
    assert.ok(raster.data.length > 0);
    // Not a PNG wearing a different name.
    assert.equal(isPng(raster.data), false, `${format} came back as PNG bytes`);
  }
});

test("the two routes disagree about the pixels, which is the point of having both", { skip }, async () => {
  // If these ever matched, one of two things would have happened: the built-in
  // route grew a font, or the browser route stopped using one. Both are worth
  // finding out about, and neither would fail any other case here.
  const [builtin, browser] = await Promise.all([
    rasterizeSheet(composition, { route: "builtin", scale: 0.1 }),
    rasterizeSheet(composition, { route: "browser", scale: 0.1 }),
  ]);
  assert.equal(builtin.width, browser.width);
  assert.notEqual(digest(builtin.data), digest(browser.data));
});

test("auto takes the browser where there is one", { skip }, async () => {
  const raster = await rasterizeSheet(composition, { scale: 0.1 });
  assert.equal(raster.route, "browser");
});

test("and falls back with the reason recorded where there is not", async () => {
  // Forced rather than waited for: a machine with Chromium installed would
  // never reach the fallback, so the resolution is pointed at a specifier that
  // cannot resolve. That is also what the failure looks like in practice - a
  // stale `PLAYWRIGHT_MODULE` rather than nothing installed at all.
  const previous = process.env.PLAYWRIGHT_MODULE;
  process.env.PLAYWRIGHT_MODULE = "playwright-that-is-not-installed";
  try {
    const { reason, chromium } = await resolveChromium();
    if (chromium) return; // A local install resolved ahead of the override.
    assert.match(reason, /npx playwright install chromium/);

    const raster = await rasterizeSheet(composition, { route: "auto", scale: 0.05 });
    assert.equal(raster.route, "builtin");
    assert.equal(raster.publishable, false);
    assert.ok(raster.notes.some((note) => note.includes("Fell back to the built-in route")));

    // And asking for the browser by name is an error rather than a quiet
    // downgrade, because a caller who named it wanted the publishable one.
    await assert.rejects(
      () => rasterizeSheet(composition, { route: "browser", scale: 0.05 }),
      /needs a browser/
    );
  } finally {
    if (previous === undefined) delete process.env.PLAYWRIGHT_MODULE;
    else process.env.PLAYWRIGHT_MODULE = previous;
  }
});
