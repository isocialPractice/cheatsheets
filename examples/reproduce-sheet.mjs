// Worked example 1: reproduce one of the eleven hand composed sheets from a
// document.
//
//     node examples/reproduce-sheet.mjs
//     node examples/reproduce-sheet.mjs --raster --out .tmp/examples
//
// `javaScriptArrays/SplicingArrays.jpg` is a screenshot somebody took of a
// sheet somebody composed by hand. This composes the same sheet from
// `splicing-arrays.mjs`, through the design language measured off that
// artwork, and writes it out. It is the demonstration that the record in
// `DESIGN_LANGUAGE.md` is complete enough to draw from rather than only to
// describe with.
//
// **What "reproduce" claims and what it does not.** Every fixed figure is the
// artwork's: the canvas, the five bands, the three divisions, the flanking
// rules, the mark square, the baselines of the four runs whose text never
// changes. What is not reproduced is the artwork's typeface, which is
// condensed to 0.684 of any stack a generated sheet can name, so the title
// sets wider and is stepped down to fit. **The faces are not named** in
// `DESIGN_LANGUAGE.md` records why that is not solvable without the original
// font, and **The size gives, never the letterform** records why the answer is
// a smaller title rather than a squeezed one.
//
// **The two brand assets are part of the claim.** The artwork sets its mark
// beside the masthead wordmark and draws a footer strip with three social
// icons in it, and until the assets reached the composition this example drew
// a lone wordmark and a navy rectangle in their place - which looked like the
// design language falling short and was the assets never being read. Both are
// passed in from `assets/` here. Either one that is not on disk is left out
// and its slot draws what it drew before, so a clone missing them still runs
// this.
//
// The three free figures come from the seed, which is the sheet's own slug, so
// running this twice produces the same bytes twice. `restyle-sheet.mjs` beside
// this file takes the same document and the same seed through a second theme.
//
// Written to `.tmp/` by default, which this repository ignores: the output is
// a demonstration rather than an artifact, and the eleven kept images are
// what the repository carries as reference.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { writeComposition } from "../api/napkin-sketch/graphic-design/files.js";
import { sheetBrandFrom, BRAND_FILES } from "../api/cheatsheet/brand.mjs";
import { composeSheet } from "../api/cheatsheet/compose.mjs";
import { SEED, splicingArrays } from "./splicing-arrays.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The repository's own brand assets, or an empty brand where they are not
 * there. Read once, because an example is one composition.
 *
 * @returns {Promise<import('../api/cheatsheet/brand.mjs').SheetBrand>}
 */
export async function brandAssets() {
  const read = async (name, encoding) => {
    try {
      return await readFile(join(root, ...name.split("/")), encoding);
    } catch {
      return undefined;
    }
  };
  return sheetBrandFrom({
    logoSvg: await read(BRAND_FILES.logo, "utf8"),
    footerPng: await read(BRAND_FILES.footer),
  });
}

/**
 * Composes the sheet and reports what the composition chose.
 *
 * Exported so `tools/test-worked-examples.mjs` checks the example itself
 * rather than a copy of it that can drift from what a reader runs.
 *
 * @param {import('../api/cheatsheet/brand.mjs').SheetBrand} [brand]
 * @returns {ReturnType<typeof composeSheet>}
 */
export function reproduce(brand = {}) {
  return composeSheet(splicingArrays, { seed: SEED, brand });
}

/**
 * The lines this example prints, as an array so a test can read them.
 *
 * @param {import('../api/cheatsheet/compose.mjs').VariationReport} variation
 * @returns {string[]}
 */
export function report(variation) {
  const lines = [
    `seed              ${variation.givenSeed} -> ${variation.seed}`,
    `face              ${variation.face}`,
    "",
    "the three figures the seed moved",
    `  top padding     ${variation.topPadding} px`,
    `  left inset      ${variation.leftInset} px`,
    `  line spacing    ${variation.lineSpacing.toFixed(2)} px`,
    "",
    "what it had to fit",
    `  title cap       ${variation.titleCap} px, against the artwork's 141`,
    `  code cap        ${variation.codeCap} px`,
    `  panel fill      ${(variation.panelFill * 100).toFixed(1)}%, floor ${variation.floors.panelFill * 100}%`,
    "",
    `masthead mark     ${variation.brand.logo}`,
    `footer lockup     ${variation.brand.footer}`,
    "",
    `code fits         ${variation.codeFits}`,
    `runs fit          ${variation.runsFit}`,
    `fills panel       ${variation.fillsPanel}`,
    `contrast holds    ${variation.contrastHolds}`,
  ];
  // The notes are the composition saying what it gave way on. An example that
  // hid them would be showing a cleaner result than the algorithm produced.
  if (variation.notes.length > 0) {
    lines.push("", "notes");
    for (const note of variation.notes) lines.push(`  - ${note}`);
  }
  return lines;
}

/**
 * @param {string[]} argv
 * @returns {Promise<void>}
 */
async function main(argv) {
  const out = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : ".tmp/examples";
  // The PNG is off by default because the built-in rasterizer draws the
  // stroked alphabet rather than the sheet's face, so it is a shape level
  // check and not something to look at. `api/cheatsheet/raster.mjs` is the
  // route to a raster anyone publishes.
  const formats = argv.includes("--raster") ? ["svg", "png"] : ["svg"];

  const { composition, variation } = reproduce(await brandAssets());
  const written = await writeComposition(composition, out, "splicing-arrays", { formats });

  console.log(report(variation).join("\n"));
  console.log("");
  console.log(`svg               ${written.svg}`);
  if (written.png) console.log(`png               ${written.png} (built-in alphabet, not the sheet's face)`);
  for (const warning of written.warnings) console.log(`warning           ${warning}`);
}

export { main };

// Run only when this file is the entry point, so the test can import it and
// call the same functions a reader runs. `pathToFileURL` rather than a string
// built by hand: on Windows the argument is `D:\...`, which is not a URL.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main(process.argv.slice(2));
}
