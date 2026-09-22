// The temporary asset a category with no artwork is measured from:
// `tools/compose-language-asset.mjs`.
//
// The thing worth checking is not that the file is drawn. It is that the file
// is drawn to the **areas** the census records, because that is the half a
// reader cannot check by looking. A composition with the recorded colors in the
// wrong proportions produces a palette that looks measured - it was measured -
// and roles taken from the wrong evidence, and nothing downstream distinguishes
// the two. So the asset is rasterized and counted here, the same way the
// analyzer's `areaPalette` counts it, rather than having its rectangles added
// up.
//
// Run with: node --test tools/test-language-asset.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  censusArea,
  composeLanguageAsset,
  interleave,
  measureShares,
  reportShares,
  runBlocks,
  shareRows,
  REPORT_SCALE,
} from "./compose-language-asset.mjs";
import {
  BANDS,
  CANVAS,
  CENSUS,
  censusFor,
  COLORS,
  DIVISIONS,
  INSETS,
  MARK_SQUARE,
  RUNS,
  SHEET_LANGUAGE,
} from "../api/cheatsheet/language.mjs";
import { emberTheme } from "../examples/ember-theme.mjs";
import { SHEET_FONT_FAMILY, sizeForCap } from "../api/cheatsheet/faces.mjs";
import { analyzeSvg, analyzeMedia } from "../ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { composition } = composeLanguageAsset({});
const svg = composition.toSVG();

/** Every `rect` in the output, as numbers. */
function rects(markup) {
  return [...markup.matchAll(/<rect\b[^>]*>/g)].map((tag) => {
    const attr = (name) => {
      const found = new RegExp(`${name}="([-\\d.]+)"`).exec(tag[0]);
      return found ? Number(found[1]) : 0;
    };
    const fill = /fill="([^"]+)"/.exec(tag[0]);
    return { x: attr("x"), y: attr("y"), width: attr("width"), height: attr("height"), fill: fill?.[1] };
  });
}

const drawn = rects(svg);

/**
 * What each census colour covers, counted at full size.
 *
 * Once, and shared: 3,600 square is thirteen million pixels, and the two cases
 * that read it would otherwise pay for the same count twice. Full size rather
 * than a quarter of it because the tolerances below are tighter than the
 * antialiasing a downsample adds.
 */
const { shares } = measureShares(composition, 1);

/** Whether a rectangle with these exact numbers was drawn. */
function has(box, fill) {
  return drawn.some(
    (r) =>
      Math.abs(r.x - box.x) < 0.01 &&
      Math.abs(r.y - box.y) < 0.01 &&
      Math.abs(r.width - box.width) < 0.01 &&
      Math.abs(r.height - box.height) < 0.01 &&
      r.fill === fill
  );
}

/* --- 1. The regions, exactly as recorded ---------------------------------- */

test("the five bands are drawn at the rows and heights the record puts them at", () => {
  assert.ok(has({ x: 0, y: BANDS.masthead.y, width: CANVAS, height: BANDS.masthead.height }, COLORS.navy));
  assert.ok(has({ x: 0, y: BANDS.heading.y, width: CANVAS, height: BANDS.heading.height }, COLORS.white));
  assert.ok(has({ x: 0, y: BANDS.divider.y, width: CANVAS, height: BANDS.divider.height }, COLORS.green));
  assert.ok(has({ x: 0, y: BANDS.footer.y, width: CANVAS, height: BANDS.footer.height }, COLORS.white));
});

test("and the three divisions across the code band, the spine with its recorded rise", () => {
  assert.ok(
    has(
      { x: DIVISIONS.panel.x, y: BANDS.code.y, width: DIVISIONS.panel.width, height: BANDS.code.height },
      COLORS.navy
    )
  );
  assert.ok(
    has(
      {
        x: DIVISIONS.rightMargin.x,
        y: BANDS.code.y,
        width: DIVISIONS.rightMargin.width,
        height: BANDS.code.height,
      },
      COLORS.white
    )
  );
  // The spine is the one region that crosses into another band, by `step-4`.
  assert.ok(
    has(
      {
        x: DIVISIONS.spine.x,
        y: BANDS.code.y - INSETS.spineTop,
        width: DIVISIONS.spine.width,
        height: BANDS.code.height + INSETS.spineTop,
      },
      COLORS.green
    )
  );
});

test("the mark square is drawn and named, so the slot is read rather than guessed", async () => {
  assert.ok(has(MARK_SQUARE, COLORS.navy));
  const report = await analyzeMedia(await write(svg), { colors: 8 });
  const logo = report.brand.slots.find((slot) => slot.key === "logo");
  assert.ok(logo, "no logo slot was found");
  assert.equal(logo.found, "named", "the logo was scanned for rather than read off a layer name");
  assert.equal(logo.box.x, MARK_SQUARE.x);
  assert.equal(logo.box.width, MARK_SQUARE.width);
});

/* --- 2. The areas, which are the point ------------------------------------ */

test("the three ink colors land on the census, to within their own antialiasing", () => {
  // `#414143`, the comment grey and the identifier green are ink and nothing
  // else, so the census gives each an area of its own and the asset can hit it
  // exactly. The tolerance is the edge of the blocks themselves, at 0.03 points
  // measured full size.
  for (const key of ["heading", "comment", "identifier"]) {
    const drift = Math.abs(shares[key] - CENSUS[key].share) * 100;
    assert.ok(
      drift < 0.05,
      `${key} covers ${(shares[key] * 100).toFixed(2)}% against the recorded ${(CENSUS[key].share * 100).toFixed(2)}%`
    );
  }
});

test("and the three grounds land within the drift the runs they are missing account for", () => {
  // Navy, white and green are each a ground *and* an ink, and the census does
  // not split the two - so the wordmark, the plain code and the follow line
  // cannot be drawn without inventing a figure, and they are not drawn. What
  // that costs is bounded rather than hidden.
  for (const [key, limit] of [
    ["navy", 1.5],
    ["white", 0.3],
    ["green", 0.3],
  ]) {
    const drift = Math.abs(shares[key] - CENSUS[key].share) * 100;
    assert.ok(
      drift < limit,
      `${key} is ${drift.toFixed(2)} points off the record, past the ${limit} the missing runs account for`
    );
  }
});

test("no role moves, which is what the proportions were reproduced for", async () => {
  // A role is decided from area. The whole reason the ink is drawn at all is
  // that the regions alone put navy at 63.2% and white at 30.9%, and a palette
  // right about its colors and wrong about its proportions is right about its
  // swatches and wrong about which one is the ground.
  const report = await analyzeMedia(await write(svg), { colors: 12 });
  assert.equal(report.roleBasis, "area", "the roles were taken from the usage palette");
  assert.equal(report.roles.paper.toLowerCase(), COLORS.white.toLowerCase());
  assert.equal(report.roles.ink.toLowerCase(), COLORS.navy.toLowerCase());
  // And the ground is navy by a margin nothing rounds away.
  const byArea = Object.fromEntries(report.areaPalette.map((c) => [c.hex.toLowerCase(), c.share]));
  assert.ok(byArea[COLORS.navy.toLowerCase()] > byArea[COLORS.white.toLowerCase()] + 0.25);
  // The accent a generator takes is the most saturated colour carrying a
  // percent of the page, which is the green the sheets use and not the
  // identifier green a fifth of a percent of the panel is set in.
  const accent = report.areaPalette
    .filter((c) => c.share >= 0.01 && !["#ffffff", "#000132"].includes(c.hex.toLowerCase()))
    .sort((a, b) => b.share - a.share)[0];
  assert.equal(accent.hex.toLowerCase(), COLORS.green.toLowerCase());
});

test("the asset declares the census colors and no others", () => {
  // A colour in the asset that is not in the census is a value a category
  // language would carry away with nothing behind it.
  const recorded = new Set(Object.values(CENSUS).map((entry) => entry.hex.toLowerCase()));
  const fills = new Set(drawn.map((r) => r.fill?.toLowerCase()).filter(Boolean));
  for (const fill of fills) assert.ok(recorded.has(fill), `${fill} is drawn and is not in the census`);
  assert.equal(fills.size, recorded.size, "a census colour is not drawn at all");
});

/* --- 3. The type, carried without being inked ----------------------------- */

test("every recorded run carries its family and the size its cap asks for", () => {
  const measured = analyzeSvg(svg, 8);
  assert.deepEqual(measured.type.families, [SHEET_FONT_FAMILY.replace(/["']/g, "").split(",")[0].trim()]);
  const wanted = [...new Set(Object.values(RUNS).map((run) => Number(sizeForCap(run.cap).toFixed(2))))].sort(
    (a, b) => a - b
  );
  assert.deepEqual(measured.type.sizes, wanted);
});

test("and draws nothing, because an element is a letterform or an area and not both", () => {
  // The type records are `fill="none"`. If they inked, their glyphs would be
  // the rasterizer's single-stroke alphabet rather than the face the record
  // names, and every area above would move by an unmeasured amount.
  for (const tag of svg.matchAll(/<text\b[^>]*>/g)) {
    assert.match(tag[0], /fill="none"/, "a type record is inked");
  }
  assert.equal([...svg.matchAll(/<text\b/g)].length, Object.keys(RUNS).length);
});

/* --- 4. The arithmetic the blocks are built with -------------------------- */

test("a run's blocks span its recorded box and cover exactly the area asked for", () => {
  const box = { left: 100, width: 800, top: 50, cap: 40 };
  const blocks = runBlocks(box, 0.3);
  const area = blocks.reduce((n, b) => n + b.width * b.height, 0);
  assert.ok(Math.abs(area - box.width * box.cap * 0.3) < 1e-6, "the blocks do not cover the coverage");
  assert.equal(Math.min(...blocks.map((b) => b.x)), box.left, "the blocks start inside the box");
  assert.equal(Math.max(...blocks.map((b) => b.x + b.width)), box.left + box.width, "the blocks stop short");
});

test("rows are split so they sum to the total, and no census colour is left with none", () => {
  const rows = shareRows({ comment: censusArea("comment"), identifier: censusArea("identifier") }, 22);
  assert.equal(rows.comment + rows.identifier, 22);
  assert.ok(rows.identifier >= 1, "a colour in the census got no row");
  // A colour with a hundredth of the area still gets its row rather than being
  // rounded out of the asset entirely.
  const lopsided = shareRows({ a: 1000, b: 1 }, 5);
  assert.equal(lopsided.a + lopsided.b, 5);
  assert.ok(lopsided.b >= 1);
});

test("and interleaving moves rows around without changing how many each colour has", () => {
  const plan = interleave({ comment: 16, identifier: 6 }, 22);
  assert.equal(plan.length, 22);
  assert.equal(plan.filter((key) => key === "comment").length, 16);
  assert.equal(plan.filter((key) => key === "identifier").length, 6);
});

/* --- 5. Two records of one census ----------------------------------------- */

test("the census in the code is the census in the document", () => {
  // `language.mjs` is `DESIGN_LANGUAGE.md` in the form code reads, and two
  // copies of a table drift. The document is parsed rather than read once.
  const document = readFileSync(join(root, "DESIGN_LANGUAGE.md"), "utf8");
  const heading = "### The colors the sheets are drawn in";
  const from = document.indexOf(`${heading}\n`);
  assert.notEqual(from, -1, "the document has no colour census");
  const body = document.slice(from, document.indexOf("\n#### ", from));
  for (const entry of Object.values(CENSUS)) {
    const row = new RegExp(
      String.raw`\| \`${entry.hex}\` \| [\d,]+ \| ${(entry.share * 100).toFixed(2)}% \|`,
      "i"
    );
    assert.match(body, row, `the document does not record ${entry.hex} at ${(entry.share * 100).toFixed(2)}%`);
  }
  // And it names no seventh colour with a share, which would be one the asset
  // does not draw.
  const rows = body.split("\n").filter((line) => /^\| `#[0-9A-Fa-f]{6}` \| [\d,]+ \|/.test(line));
  assert.equal(rows.length, Object.keys(CENSUS).length);
});

test("the same asset composes byte for byte, so a measurement of it is repeatable", () => {
  assert.equal(composeLanguageAsset({}).composition.toSVG(), svg);
});

/* --- 6. The report, and the scale it is only readable beside -------------- */

test("the report runs at the scale the recorded figures were read at", () => {
  // The header of `compose-language-asset.mjs` puts the three ink colours
  // within 0.03 points of the census, and that is the full size reading. A
  // report defaulting to a cheaper raster would print the same three colours
  // three times further out, and a reader with only the flag to run would find
  // the file contradicting itself.
  assert.equal(REPORT_SCALE, 1, "the report defaults to a scale the header's figures are not");
  for (const key of ["heading", "comment", "identifier"]) {
    // Rounded the way the report prints it, so what is checked is the figure a
    // reader compares against the prose rather than a tolerance around it.
    const drift = Number((Math.abs(shares[key] - CENSUS[key].share) * 100).toFixed(2));
    assert.ok(drift <= 0.03, `${key} is ${drift} points off the record at full size`);
  }
});

test("and names that scale, because a smaller raster is a different measurement", () => {
  // Not a cheaper version of the same reading: the drift a downsample adds is
  // the antialiasing of its own edges. The heading grey is the clearest case,
  // and it is three times further out at a quarter than the header records.
  const quarter = measureShares(composition, 0.25);
  const drift = Math.abs(quarter.shares.heading - CENSUS.heading.share) * 100;
  assert.ok(drift > 0.05, `a quarter-size raster read the heading grey ${drift.toFixed(2)} points out`);
  assert.match(reportShares(composition, 0.25), /measured at 900x900, scale 0\.25:/);
});

/* --- 7. Whose census it is ------------------------------------------------ */

test("the language object carries no census, because a spread copy would carry the wrong one", () => {
  // A theme is `{ ...SHEET_LANGUAGE, colors, syntax }`, so a `census` field
  // would survive that spread naming four colours the theme never draws - and
  // read as measured, because every other figure beside it was.
  assert.ok(!("census" in SHEET_LANGUAGE), "a theme spread from this would inherit the sheets' hexes");
  assert.deepEqual(censusFor(SHEET_LANGUAGE), CENSUS);
});

test("a theme's census is the recorded shares in the theme's own colors", () => {
  const themed = censusFor(emberTheme);
  // The shares stay the sheets'. They were counted off artwork and the ember
  // theme has none to count, so re-measuring them is not on offer; inventing
  // them is the one thing a design language may not do.
  for (const key of Object.keys(CENSUS)) assert.equal(themed[key].share, CENSUS[key].share);
  // The hexes come from the theme, from whichever of its two palettes the role
  // is named in.
  assert.equal(themed.navy.hex, emberTheme.colors.navy);
  assert.equal(themed.comment.hex, emberTheme.syntax.comment);
  const sheetInk = new Set(Object.values(CENSUS).map((entry) => entry.hex.toLowerCase()));
  for (const key of ["navy", "green", "heading", "comment", "identifier"]) {
    assert.ok(!sheetInk.has(themed[key].hex.toLowerCase()), `${key} came back as the sheets' colour`);
  }
});

test("and an asset composed for a theme is drawn in it, ink as well as regions", () => {
  // The half-fix is the one to rule out: the regions take the theme because
  // they read `colors`, and the two panel rows keep the sheets' syntax greys
  // because they read the module. The asset then measures as the theme with
  // two foreign colours in it, and the palette looks measured, because it was.
  const themed = composeLanguageAsset({ language: emberTheme });
  const fills = [...new Set(rects(themed.composition.toSVG()).map((r) => r.fill?.toLowerCase()).filter(Boolean))];
  const wanted = Object.values(themed.census).map((entry) => entry.hex.toLowerCase());
  assert.deepEqual(fills.sort(), wanted.sort());
});

/* --- Writing the asset out, which the analyzer needs a path for ----------- */

let written = null;

/** Writes the asset once into `.tmp/`, which is where it belongs anyway. */
async function write(markup) {
  if (written) return written;
  const { mkdir, writeFile } = await import("node:fs/promises");
  const out = join(root, ".tmp", "language-asset", "suite.svg");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, markup, "utf8");
  written = out;
  return out;
}
