// The two brand slots: what a sheet composes with the assets, and what it
// composes without them.
//
// Both slots were drawn as stand-ins until 2026.10.14 - a lone wordmark centred
// on the canvas axis, and a navy rectangle where the artwork's footer lockup
// goes - while `assets/logo.svg` and `assets/footer.png` sat in the tree
// unreferenced by anything that composes. The cases here cover the two halves
// of fixing that: that each asset reaches the composition in the form its
// renderer draws, and that a sheet composed without one is byte for byte the
// sheet it was before, which is what keeps `tools/fixtures/sheet.svg` pinned.
//
// Run with: node --test tools/test-sheet-brand.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  centredAt,
  composeSheet,
  dataUrlFrom,
  measureRun,
  rasterAsset,
  sheetBrandFrom,
  vectorAsset,
  BRAND_FILES,
  BRAND_SLOTS,
  RUNS,
  SHEET_FACE,
  SHEET_LANGUAGE,
} from "../api/cheatsheet/index.mjs";
import { readBrandAssets } from "./build-manifest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A short document, so a failure reads as a brand failure and not a fitting one. */
const DOC = {
  title: "Splicing Arrays",
  subtitle: "Remove, replace and insert in one call",
  code: Array.from({ length: 20 }, (_, i) => ({ text: `console.log(${i});` })),
};

const assets = await readBrandAssets(root);

/** Every element of a composition, flattened through its groups. */
function flatten(elements) {
  const out = [];
  for (const element of elements) {
    out.push(element);
    if (Array.isArray(element.children)) out.push(...flatten(element.children));
  }
  return out;
}

function named(composition, name) {
  return flatten(composition.elements ?? composition.toJSON().elements).find(
    (element) => element.name === name
  );
}

/* --- 1. The assets resolve at all ---------------------------------------- */

test("the repository's own two assets resolve into placeable sources", () => {
  // The bridge in `tools/build-brand-resources.mjs` reads these through the
  // constants file; this reads them straight off the tree, because a
  // composition takes a brand as an argument and never looks one up.
  assert.equal(assets.logo?.kind, "vector", "assets/logo.svg did not resolve to a vector");
  assert.equal(assets.footer?.kind, "raster", "assets/footer.png did not resolve to a raster");
  assert.match(assets.logo.svg, /^<\?xml|^<svg/);
  assert.match(assets.footer.dataUrl, /^data:image\/png;base64,/);
});

test("a data URL round trips through whichever encoder this runtime has", async () => {
  // `btoa` in a browser and `Buffer` in Node, which is the pair the vendored
  // surface's own rasterizer carries on the decode side - not `raster.mjs` in
  // this folder, which has neither. The bytes are the real PNG rather than a
  // made up block, so the magic number is there to recognise at the far end.
  const bytes = new Uint8Array(await readFile(join(root, BRAND_FILES.footer)));
  const url = dataUrlFrom(bytes, "image/png");
  const back = Uint8Array.from(globalThis.Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  assert.deepEqual([...back.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(back.length, bytes.length);
});

test("nothing and an empty string are both no asset, rather than an empty one", () => {
  // A slot filled with an empty source draws a hole; a slot with no source
  // falls back to what it drew before. They have to be different answers.
  assert.equal(vectorAsset(""), null);
  assert.equal(vectorAsset("   "), null);
  assert.equal(rasterAsset(new Uint8Array(0)), null);
  assert.deepEqual(sheetBrandFrom({}), {});
  assert.deepEqual(sheetBrandFrom({ logoSvg: "" }), {});
});

/* --- 2. The masthead lockup ---------------------------------------------- */

test("the mark is inlined beside the wordmark, and the pair is centred", () => {
  const { composition, variation } = composeSheet(DOC, { seed: "brand", brand: assets });
  assert.equal(variation.brand.logo, "vector");

  const mark = named(composition, "masthead-mark");
  assert.ok(mark, "nothing named masthead-mark was drawn");
  // A group of shapes rather than an image: both renderers draw the vendored
  // surface's inlined vector, and only one of them draws a raster without a
  // decoder.
  assert.equal(mark.type, "group");
  assert.ok(mark.children.length > 0, "the mark group holds no shapes");

  const wordmark = named(composition, "wordmark");
  assert.ok(
    wordmark.x < centredAt(wordmark.text, SHEET_LANGUAGE.canvas / 2, wordmark.fontSize),
    "the wordmark is still centred on the axis rather than on the lockup's left edge"
  );

  // The lockup is the wordmark's run, the measured gap and the mark's slot, and
  // it is centred on the canvas: so the room left of the wordmark and the room
  // right of the mark are the same number.
  const run = measureRun(wordmark.text, { fontSize: wordmark.fontSize, face: SHEET_FACE });
  const left = wordmark.x;
  const right =
    SHEET_LANGUAGE.canvas - (wordmark.x + run + BRAND_SLOTS.logo.gap + BRAND_SLOTS.logo.width);
  assert.ok(
    Math.abs(left - right) < 1,
    `the lockup sits ${left.toFixed(1)}px from the left and ${right.toFixed(1)}px from the right`
  );

  // The group's own transform is what actually puts the shapes there, so it is
  // read rather than trusted. `contain` centres inside the slot, and the asset
  // is within 0.1% of the slot's aspect, so the offset is an eighth of a pixel.
  assert.ok(
    Math.abs(mark.translate.x - (wordmark.x + run + BRAND_SLOTS.logo.gap)) < 1,
    `the mark is drawn at x ${mark.translate.x}, not at the end of the gap`
  );

  // And the mark is at the wordmark's own ink top, which is where the artwork
  // puts it: 132 measured against the 133 the run records.
  assert.ok(
    Math.abs(mark.translate.y - BRAND_SLOTS.logo.top) < 1,
    `the mark starts at y ${mark.translate.y} rather than at the run's ${BRAND_SLOTS.logo.top}`
  );
  assert.equal(BRAND_SLOTS.logo.top, RUNS.wordmark.inkTop);
});

test("the wordmark is fitted to the room the mark leaves it", () => {
  // The two have to be fitted against different measures or a long wordmark
  // runs into the mark rather than stepping down. A wordmark long enough to
  // need it is the only way to see the difference.
  const long = { ...DOC, wordmark: "practicing.xyz/cheatsheets/javascript" };
  const alone = composeSheet(long, { seed: "brand" }).variation;
  const together = composeSheet(long, { seed: "brand", brand: assets }).variation;
  assert.ok(
    together.notes.some((note) => note.includes("wordmark was stepped down")),
    "a wordmark beside the mark was not stepped down to fit"
  );
  assert.ok(alone.runsFit && together.runsFit, "the wordmark overflowed rather than stepping down");
});

/* --- 3. The footer lockup ------------------------------------------------ */

test("the footer strip replaces the mark square and the follow line", () => {
  const { composition, variation } = composeSheet(DOC, { seed: "brand", brand: assets });
  assert.equal(variation.brand.footer, "image");

  const strip = named(composition, "footer-lockup");
  assert.ok(strip, "nothing named footer-lockup was drawn");
  assert.equal(strip.type, "image");
  assert.equal(strip.x, BRAND_SLOTS.footer.x);
  assert.equal(strip.y, BRAND_SLOTS.footer.y);
  assert.equal(strip.width, BRAND_SLOTS.footer.width);
  assert.equal(strip.height, BRAND_SLOTS.footer.height);
  // `contain` is what keeps a strip of a different aspect from being stretched
  // to the band, which on a lockup this wide would be visible immediately.
  assert.equal(strip.fit, "contain");

  // The strip is the whole footer, so neither of the two things drawn in its
  // place is drawn as well. Two marks in one footer is the fault this guards.
  assert.equal(named(composition, "mark-square"), undefined);
  assert.equal(named(composition, "follow-line"), undefined);
});

test("the footer plate reaches the sheet's trim, and holds the mark off it", async () => {
  // The artwork's footer is a navy block flush to the bottom left corner,
  // filling the band, with the mark set 192 px into it. Until 2026.10.15 the
  // asset was a tight crop beginning at the mark, so what met the trim was the
  // green bar itself - the one element on a sheet whose own ink touched the
  // edge. This reads pixels back rather than a figure, because the inset lives
  // inside the PNG: `BRAND_SLOTS.footer.x` is 0 before the fix and after it,
  // so no constant here would have moved.
  const { composition } = composeSheet(DOC, { seed: "brand", brand: assets });
  const { rasterizeComposition } = await import("../api/napkin-sketch/api/index.js");
  const scale = 0.25;
  const raster = rasterizeComposition(composition.toDocument(), { scale });
  const at = (x, y) => {
    const i = (y * raster.width + x) * 4;
    return [raster.data[i], raster.data[i + 1], raster.data[i + 2]];
  };
  const near = ([r, g, b], [tr, tg, tb], tol) =>
    Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol;
  const navy = [0x00, 0x01, 0x32];
  const green = [0x4d, 0xae, 0x51];

  const top = Math.round(BRAND_SLOTS.footer.y * scale);
  const bottom = Math.round((BRAND_SLOTS.footer.y + BRAND_SLOTS.footer.height) * scale) - 1;
  const middle = Math.round((top + bottom) / 2);

  // The plate meets the trim, and fills the band rather than floating in it.
  for (const row of [top, middle, bottom]) {
    assert.ok(
      near(at(0, row), navy, 40),
      `the footer's left trim is rgb(${at(0, row)}) at row ${row}, not the plate's navy`
    );
  }

  // And the mark is held off that trim by the artwork's own inset.
  let firstGreen = -1;
  for (let x = 0; x < raster.width && firstGreen < 0; x++) {
    if (near(at(x, middle), green, 50)) firstGreen = x;
  }
  assert.ok(firstGreen > 0, "no green bar was found across the footer band");
  const inComposition = firstGreen / scale;
  assert.ok(
    Math.abs(inComposition - 192) <= 8,
    `the mark's green bar starts at x ${inComposition} rather than the artwork's 192`
  );
});

test("a document with its own follow line keeps the drawn footer", () => {
  // The strip carries fixed text, so a sheet that asks to say something else
  // cannot be given it. The drawn route is the only one that can.
  const { composition, variation } = composeSheet(
    { ...DOC, followLine: "Read more at example.com" },
    { seed: "brand", brand: assets }
  );
  assert.equal(variation.brand.footer, "drawn");
  assert.equal(named(composition, "footer-lockup"), undefined);
  assert.ok(named(composition, "mark-square"));
  assert.equal(named(composition, "follow-line").text, "Read more at example.com");
});

/* --- 4. What a sheet without a brand still is ---------------------------- */

test("a sheet composed with no brand is the sheet it was before", () => {
  // The guarantee the pinned fixtures rest on: no brand is not a degraded
  // sheet, it is the sheet this repository composed for a month, and the
  // fallback is reached by passing nothing rather than by failing at something.
  const { composition, variation } = composeSheet(DOC, { seed: "brand" });
  assert.deepEqual(variation.brand, { logo: "drawn", footer: "drawn" });
  const lone = named(composition, "wordmark");
  // Centred on the axis, which since 2026.10.14 is arithmetic here rather than
  // an `align` the renderer resolves: no element carries a face any more.
  assert.equal(lone.align, "left");
  assert.equal(
    lone.x,
    centredAt(lone.text, SHEET_LANGUAGE.canvas / 2, lone.fontSize),
    "the lone wordmark is not centred on the canvas axis"
  );
  assert.ok(named(composition, "mark-square"));
  assert.ok(named(composition, "follow-line"));
  assert.equal(named(composition, "masthead-mark"), undefined);
  assert.equal(named(composition, "footer-lockup"), undefined);
});

test("an asset holding no drawable shape falls back rather than leaving a hole", () => {
  // A vector the surface can parse and find nothing in. The wordmark has to go
  // back to the middle of the canvas, not sit at the left edge of a lockup
  // whose other half was never drawn - which is why the mark is placed before
  // the wordmark is set.
  const empty = { kind: "vector", svg: '<svg viewBox="0 0 10 10"></svg>' };
  const { composition, variation } = composeSheet(DOC, { seed: "brand", brand: { logo: empty } });
  assert.equal(variation.brand.logo, "drawn");
  const lone = named(composition, "wordmark");
  assert.equal(lone.x, centredAt(lone.text, SHEET_LANGUAGE.canvas / 2, lone.fontSize));
  assert.ok(
    variation.notes.some((note) => note.includes("masthead mark held nothing drawable")),
    `the fallback was silent: ${variation.notes.join(" | ")}`
  );
});

/* --- 5. Both renderers agree ---------------------------------------------- */

test("both renderers draw a branded sheet, and the SVG carries the strip inline", async () => {
  const { composition } = composeSheet(DOC, { seed: "brand", brand: assets });
  const svg = composition.toSVG();
  // Inline rather than linked: a composition is a document and not a page, so a
  // relative href would resolve against whatever opened it - and the page hands
  // this markup to a blob URL, where nothing relative resolves at all.
  assert.match(svg, /<image[^>]*href="data:image\/png;base64,/);
  assert.doesNotMatch(svg, /href="assets\//);
  // The mark is shapes in the markup, so it needs no decoder and no network.
  assert.match(svg, /data-name="masthead-mark"/);

  // The rasterizer has no browser and no network, so a strip it could not
  // decode would be reported rather than drawn - and `warnings` is where it
  // says so. An inline PNG is the one raster form it opens unaided.
  const { renderPng } = await import("../api/napkin-sketch/api/index.js");
  const raster = renderPng(composition.toDocument(), { scale: 0.25 });
  assert.deepEqual(raster.warnings ?? [], [], "the rasterizer could not draw something");
  assert.equal(raster.width, 900);
});
