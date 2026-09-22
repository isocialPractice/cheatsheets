// Composes a temporary SVG out of the recorded design language, so a category
// with no artwork still has an asset to measure a design language from.
//
//     node tools/compose-language-asset.mjs
//     node tools/compose-language-asset.mjs --category html-css
//     node tools/compose-language-asset.mjs --out .tmp/language-asset/sheets.svg --report
//     node tools/compose-language-asset.mjs --report --scale 0.25
//
// The design language helper under `ai-helper/graphic-designer/` measures one
// asset and refuses to invent a value that asset did not give it, which is the
// property worth keeping. A category that has not been drawn yet has no asset,
// so there is nothing to point it at - and the way out is not to relax the
// refusal but to compose the asset the record already describes and measure
// that. The per-category language is then a **derivation of the global record**
// rather than a second opinion about it.
//
// ## What is composed, and from what
//
// Every figure comes from `api/cheatsheet/language.mjs`, which is
// `DESIGN_LANGUAGE.md` in the form code reads. Nothing here is chosen. A
// caller composing a themed category passes that language's modified copy as
// `options.language` and the same holds of it, the census included - it is
// restated against whatever palette came in rather than read off the module,
// so a themed asset is drawn in the theme down to the two colors of panel ink.
//
// - **The regions**, exactly as recorded: five bands down the canvas, three
//   divisions across it, both flanking rules, the spine and its `step-4` rise
//   above the panel, the divider, and the footer mark square.
// - **The type**, as `text` elements with **no fill**. They carry the family
//   and the size a run is set at and draw nothing, which is the only way one
//   file can carry both halves of the record: an element is either a letterform
//   or an area, and the census below is an area measurement. Without them the
//   analyzer reports no sizes at all and the generator invents a type scale,
//   which is the exact failure this asset exists to prevent.
// - **The ink**, as blocks sized from the census the language was restated
//   into, which for the sheets is {@link CENSUS}. Those blocks are the reason
//   this file is not just the regions.
//
// ## Why the ink has to be there
//
// A vector palette is weighted by how often a color is **referenced** and a
// raster palette by how much page it **covers**, and a role - ground, paper,
// accent - is decided from area. So an asset carrying the right colors in the
// wrong proportions produces the right swatches and the wrong roles, and
// nothing downstream can tell: the palette looks measured because it was.
//
// The regions alone put navy at 63.2% and white at 30.9% of the canvas. The
// census puts them at 60.97% and 28.96%, and the difference is the type drawn
// on top. Three of the census colors are ink and nothing else -
// `#414143`, the comment grey and the identifier green - so each is drawn at
// exactly the area the census gives it, in the region the census assigns it.
//
// ## What is deliberately not composed
//
// Three runs are missing their ink, and the same sentence explains all three:
// the census gives their color no share of its own.
//
// - The **wordmark** is "in white and green" on navy, and the census does not
//   say how much of each.
// - **Plain code** is white on navy, folded into the same 28.96% as the heading
//   and footer grounds.
// - The **follow line** is navy on white, folded into the same 60.97% as the
//   masthead and the panel.
//
// Splitting any of them would mean inventing a figure, so they are carried as
// type records and no ink. The cost is stated rather than hidden. Rasterized at
// full size and counted, the asset puts navy at 62.24% against the recorded
// 60.97%, white at 29.07% against 28.96% and green at 5.86% against 6.00%; the
// three ink colors land within 0.03 points of the record, which is the
// antialiasing of their own edges. No role moves - navy is still the ground by
// thirty points and green is still the only color with saturation and a
// percent of the page - and the roles are what the asset is measured for.
//
// `--report` prints that same comparison, and prints it **at full size**,
// because those are the figures above and a report that cannot be checked
// against them is worth less than no report. `--scale` moves it and the report
// names the scale it was run at, which is the part that matters: the drift a
// smaller raster adds is the antialiasing of a downsample and not the asset
// moving, so at a quarter the three ink colors read three times further out
// than the paragraph above says. Two figures measured at two scales are not
// two readings of one thing, and neither record is safe to quote without its
// scale beside it.
//
// The same sentence decides the brand slots. The footer mark square is named
// `logo`, because the record gives it a box and a color; the wordmark is not
// named, because a slot is found from the extent of what was drawn and nothing
// is drawn there. Declaring one anyway would be a slot that can never resolve.
//
// The subtitle is a fourth case and a smaller one. It is the one heading run
// the record gives no width, so it carries a type record and no ink block, and
// its share of `#414143` is drawn into the two runs that do have widths.
//
// ## Where it goes
//
// `.tmp/`, which is ignored. This is an **input to a measurement**, not an
// artifact: it is composed, measured, and then of no further interest, and a
// committed copy would be a second record of figures `DESIGN_LANGUAGE.md`
// already holds.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createComposition, rasterizeComposition } from "../api/graphic-design/index.mjs";
import { CAP_SHARE } from "../api/cheatsheet/compose.mjs";
import { SHEET_FACE, sizeForCap } from "../api/cheatsheet/faces.mjs";
import { CENSUS, censusFor, SHEET_LANGUAGE } from "../api/cheatsheet/language.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the asset goes when `--out` does not say: ignored, and temporary. */
export const DEFAULT_OUT_DIR = join(root, ".tmp", "language-asset");

/**
 * The scale `--report` rasterizes at, and the one the header's figures are.
 *
 * Full size. A census is an area record and a downsample adds area of its own
 * at every edge, so the cheaper raster is a different measurement rather than a
 * faster one - which is fine as long as nothing compares the two, and the only
 * way to keep that true is to make the honest reading the one a reader gets
 * without asking.
 */
export const REPORT_SCALE = 1;

/**
 * How many blocks a run of type is drawn as.
 *
 * Presentational and nothing else. A run's ink area is its recorded box times
 * the coverage factor however many blocks it is cut into, and its bounding box
 * is the recorded box because the first block is flush left and the last flush
 * right. It is four rather than one so the asset reads as type at a glance.
 */
const RUN_BLOCKS = 4;

/** The midpoint of a recorded range, which is the only neutral point in it. */
function midpoint(range) {
  return (range.min + range.max) / 2;
}

/**
 * The area a census share covers, in canvas pixels.
 *
 * @param {string} key
 * @param {typeof SHEET_LANGUAGE} [language]
 */
export function censusArea(key, language = SHEET_LANGUAGE) {
  return censusFor(language)[key].share * language.canvas * language.canvas;
}

/**
 * Cuts a run's recorded box into blocks covering `coverage` of its area.
 *
 * The blocks divide the run's width into equal cells and ink the leading
 * `coverage` of each, except the last, which is pushed flush to the run's right
 * edge. That keeps two things true at once: the blocks' union spans exactly the
 * recorded box, so anything reading a bounding box off this run reads the
 * measured one, and their total area is exactly `width * cap * coverage`, so
 * the census share lands.
 *
 * @param {{ left: number, width: number, top: number, cap: number }} box
 * @param {number} coverage 0 to 1
 * @returns {Array<{ x: number, y: number, width: number, height: number }>}
 */
export function runBlocks(box, coverage) {
  const cell = box.width / RUN_BLOCKS;
  const ink = cell * coverage;
  return Array.from({ length: RUN_BLOCKS }, (_, i) => ({
    x: i === RUN_BLOCKS - 1 ? box.left + box.width - ink : box.left + i * cell,
    y: box.top,
    width: ink,
    height: box.cap,
  }));
}

/**
 * Splits `total` rows between the named colors in proportion to their areas.
 *
 * Largest remainder, so the rows sum to `total` exactly rather than to
 * whatever rounding leaves. A color that rounds to no rows at all still gets
 * one, because a color present in the census and absent from the asset is the
 * failure this whole file is written against.
 *
 * @param {Record<string, number>} areas
 * @param {number} total
 * @returns {Record<string, number>}
 */
export function shareRows(areas, total) {
  const names = Object.keys(areas);
  const sum = names.reduce((n, key) => n + areas[key], 0);
  const exact = names.map((key) => ({ key, want: (areas[key] / sum) * total }));
  const rows = {};
  for (const { key, want } of exact) rows[key] = Math.max(1, Math.floor(want));
  let left = total - names.reduce((n, key) => n + rows[key], 0);
  const byRemainder = [...exact].sort((a, b) => (b.want % 1) - (a.want % 1));
  for (let i = 0; left > 0; i++, left--) rows[byRemainder[i % names.length].key]++;
  return rows;
}

/**
 * Spreads the counted colors down a list of rows rather than blocking them.
 *
 * Largest remainder again, run as a sweep: each row goes to whichever color is
 * furthest behind the rows it is owed. Purely presentational - it makes the
 * panel read as a listing instead of two solid blocks, and it moves no area.
 *
 * @param {Record<string, number>} counts
 * @param {number} total
 * @returns {string[]}
 */
export function interleave(counts, total) {
  const names = Object.keys(counts);
  const placed = Object.fromEntries(names.map((key) => [key, 0]));
  const plan = [];
  for (let i = 1; i <= total; i++) {
    const key = names
      .filter((name) => placed[name] < counts[name])
      .sort((a, b) => (counts[b] * i) / total - placed[b] - ((counts[a] * i) / total - placed[a]))[0];
    if (!key) break;
    placed[key]++;
    plan.push(key);
  }
  return plan;
}

/**
 * The runs of type, each with the box the record places it in.
 *
 * `left` is recorded for three of the five; the title and the subtitle are
 * centred, so theirs is derived from the canvas axis and the recorded width.
 * The subtitle has no recorded width at all, which is why it is the one run
 * with `inked: false`.
 *
 * @param {typeof SHEET_LANGUAGE} language
 */
function typeRuns(language) {
  const { canvas, rules, runs } = language;
  const centred = (width) => (canvas - width) / 2;
  return [
    {
      name: "wordmark",
      box: { left: runs.wordmark.left, width: runs.wordmark.width, top: runs.wordmark.inkTop, cap: runs.wordmark.cap },
      baseline: runs.wordmark.baseline,
      inked: false,
    },
    {
      name: "title",
      box: { left: centred(runs.title.width), width: runs.title.width, top: runs.title.inkTop, cap: runs.title.cap },
      baseline: runs.title.baseline,
      inked: true,
    },
    {
      name: "subtitle",
      box: { left: centred(rules.measure), width: rules.measure, top: runs.subtitle.inkTop, cap: runs.subtitle.cap },
      baseline: runs.subtitle.baseline,
      inked: false,
    },
    {
      name: "lead-in",
      box: { left: runs.leadIn.left, width: runs.leadIn.width, top: runs.leadIn.inkTop, cap: runs.leadIn.cap },
      baseline: runs.leadIn.baseline,
      inked: true,
    },
    {
      name: "follow line",
      box: {
        left: runs.followLine.left,
        width: runs.followLine.width,
        top: runs.followLine.inkTop,
        cap: runs.followLine.cap,
      },
      baseline: runs.followLine.baseline,
      inked: false,
    },
  ];
}

/**
 * The rows of code the panel is drawn with, at the middle of every free range.
 *
 * The panel is the one region the design language leaves free, within three
 * recorded ranges. An asset composed to be measured has no document to fit, so
 * it takes the midpoint of each: it is the only point in a range that is not a
 * preference, and it keeps the asset reproducible, which a seeded choice would
 * not.
 *
 * @param {typeof SHEET_LANGUAGE} language
 */
function codeRows(language) {
  const { bands, panelFreedom } = language;
  const spacing = midpoint(panelFreedom.lineSpacing);
  const topPadding = midpoint(panelFreedom.topPadding);
  const leftInset = midpoint(panelFreedom.leftInset);
  const cap = spacing * CAP_SHARE;
  const count = Math.floor((bands.code.height - topPadding - cap) / spacing) + 1;
  return { spacing, topPadding, leftInset, cap, count };
}

/**
 * Composes the asset.
 *
 * `language` is the design language to compose, as {@link SHEET_LANGUAGE} or a
 * modified copy of it - a theme is exactly such a copy, so composing a themed
 * category is passing one here. The census is restated against it rather than
 * read off the module, because the shares are the sheets' and the colors are
 * the palette's, and only the second of those a theme replaces.
 *
 * @param {{ category?: string, language?: typeof SHEET_LANGUAGE }} [options]
 * @returns {{ composition: import('../api/graphic-design/compose.mjs').Composition, census: Record<string, { hex: string, share: number }>, areas: Record<string, number> }}
 */
export function composeLanguageAsset(options = {}) {
  const category = options.category ?? "sheets";
  const language = options.language ?? SHEET_LANGUAGE;
  const census = censusFor(language);
  const { bands, canvas, colors, divisions, insets, markSquare, rules } = language;
  const design = createComposition({
    width: canvas,
    height: canvas,
    background: null,
    id: `language-${category}`,
    title: `The recorded design language of the sheets, composed for measurement`,
  });

  // --- The regions, in paint order -----------------------------------------
  design.rect({ x: 0, y: bands.masthead.y, width: canvas, height: bands.masthead.height, fill: colors.navy });
  design.rect({ x: 0, y: bands.heading.y, width: canvas, height: bands.heading.height, fill: colors.white });

  // Both flanking rules, each a pair flush to an edge with the title between.
  for (const rule of [rules.upper, rules.lower]) {
    for (const x of [0, canvas - rules.width]) {
      design.rect({ x, y: rule.y, width: rules.width, height: rule.height, fill: colors.green });
    }
  }

  // The spine starts `step-4` above the panel, so it crosses into the heading
  // band. That rise is recorded and is the only place a region overlaps another.
  design.rect({
    x: divisions.spine.x,
    y: bands.code.y - insets.spineTop,
    width: divisions.spine.width,
    height: bands.code.height + insets.spineTop,
    fill: colors.green,
  });
  design.rect({
    x: divisions.panel.x,
    y: bands.code.y,
    width: divisions.panel.width,
    height: bands.code.height,
    fill: colors.navy,
  });
  design.rect({
    x: divisions.rightMargin.x,
    y: bands.code.y,
    width: divisions.rightMargin.width,
    height: bands.code.height,
    fill: colors.white,
  });

  design.rect({ x: 0, y: bands.divider.y, width: canvas, height: bands.divider.height, fill: colors.green });
  design.rect({ x: 0, y: bands.footer.y, width: canvas, height: bands.footer.height, fill: colors.white });

  // The mark square is named, so the analyzer reads the slot off the layer name
  // rather than scanning for a compact mark. A named slot is exact; a scanned
  // one is a guess that says so, and this one need not be a guess.
  design.group({ id: "logo" }, (g) => {
    g.rect({
      x: markSquare.x,
      y: markSquare.y,
      width: markSquare.width,
      height: markSquare.height,
      fill: colors.navy,
    });
  });

  // --- The type, carried as size and family and drawn as nothing ------------
  const runs = typeRuns(language);
  for (const run of runs) {
    design.text({
      x: run.box.left,
      y: run.baseline,
      text: run.name,
      face: SHEET_FACE,
      fontSize: sizeForCap(run.box.cap),
      fill: null,
    });
  }

  // --- The ink the census quantifies ---------------------------------------
  // One coverage factor across both inked heading runs: the census gives the
  // color one area, and the two runs share it in proportion to their boxes.
  const headingBoxes = runs.filter((run) => run.inked && run.box.top < bands.code.y);
  const headingBoxArea = headingBoxes.reduce((n, run) => n + run.box.width * run.box.cap, 0);
  const headingCoverage = censusArea("heading", language) / headingBoxArea;
  for (const run of headingBoxes) {
    for (const block of runBlocks(run.box, headingCoverage)) {
      design.rect({ ...block, fill: colors.heading });
    }
  }

  const rows = codeRows(language);
  const panelAreas = { comment: censusArea("comment", language), identifier: censusArea("identifier", language) };
  const perColor = shareRows(panelAreas, rows.count);
  // A row's width is its color's whole area divided between its own rows, so a
  // color lands on its census share whatever the row split came out as.
  const width = Object.fromEntries(
    Object.entries(panelAreas).map(([key, area]) => [key, area / (perColor[key] * rows.cap)])
  );
  // Interleaved rather than blocked, so the panel reads as a listing. The
  // arrangement changes no area and no bounding box.
  interleave(perColor, rows.count).forEach((key, i) => {
    design.rect({
      x: divisions.panel.x + rows.leftInset,
      y: bands.code.y + rows.topPadding + i * rows.spacing,
      width: width[key],
      height: rows.cap,
      fill: census[key].hex,
    });
  });

  return { composition: design, census, areas: { headingCoverage, rows: rows.count, perColor, width } };
}

/**
 * What each census color covers in the composed asset, as measured shares.
 *
 * Measured rather than derived: the composition is rasterized small and the
 * pixels are counted, which is the same evidence the analyzer's `areaPalette`
 * takes. A figure computed back out of the rectangles would agree with the
 * arithmetic above and prove nothing about what was drawn.
 *
 * @param {import('../api/graphic-design/compose.mjs').Composition} composition
 * @param {number} [scale]
 * @param {Record<string, { hex: string, share: number }>} [census] The census
 *   the composition was drawn against, which is what names the colors to count.
 *   `composeLanguageAsset` returns it; the default is the eleven sheets'.
 * @returns {{ width: number, height: number, shares: Record<string, number> }}
 */
export function measureShares(composition, scale = 0.25, census = CENSUS) {
  const image = rasterizeComposition(composition.toDocument(), { scale });
  const counts = new Map();
  let total = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] < 128) continue;
    const hex = `#${[image.data[i], image.data[i + 1], image.data[i + 2]]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
    total++;
  }
  const shares = Object.fromEntries(
    Object.entries(census).map(([key, entry]) => [
      key,
      (counts.get(entry.hex.toUpperCase()) ?? 0) / (total || 1),
    ])
  );
  return { width: image.width, height: image.height, shares };
}

/**
 * The census comparison as lines, which is what `--report` prints.
 *
 * The heading carries the scale as well as the pixel size, because the drift
 * column is only meaningful beside it - a reading at a quarter is not a cheaper
 * version of the full size one, it is a different measurement.
 *
 * @param {import('../api/graphic-design/compose.mjs').Composition} composition
 * @param {number} [scale]
 * @param {Record<string, { hex: string, share: number }>} [census]
 */
export function reportShares(composition, scale = REPORT_SCALE, census = CENSUS) {
  const { width, height, shares } = measureShares(composition, scale, census);
  const lines = [`census, measured at ${width}x${height}, scale ${scale}:`];
  for (const [key, entry] of Object.entries(census)) {
    const drift = (shares[key] - entry.share) * 100;
    lines.push(
      `  ${key.padEnd(11)} ${entry.hex}  recorded ${(entry.share * 100).toFixed(2)}%` +
        `  composed ${(shares[key] * 100).toFixed(2)}%  ${drift >= 0 ? "+" : ""}${drift.toFixed(2)} points`
    );
  }
  return lines.join("\n");
}

async function run() {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
  };

  const category = flag("category", "sheets");
  const out = resolve(flag("out", join(DEFAULT_OUT_DIR, `${category}.svg`)));
  const scale = Number(flag("scale", REPORT_SCALE));
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error(`--scale wants a positive number, not "${flag("scale", "")}"`);
  }
  const { composition, census } = composeLanguageAsset({ category });

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, composition.toSVG(), "utf-8");
  console.log(`wrote ${out}`);
  console.log("measure it with:");
  console.log(
    `  node ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs "${out}" --markdown`
  );
  if (args.includes("--report")) console.log(reportShares(composition, scale, census));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
