// Worked example 2: the same document, restyled through a second theme.
//
//     node examples/restyle-sheet.mjs
//     node examples/restyle-sheet.mjs --raster --out .tmp/examples
//
// `reproduce-sheet.mjs` beside this file draws
// `javaScriptArrays/SplicingArrays.jpg` from a document. This takes that same
// document, at that same seed, and composes it through `ember-theme.mjs`.
//
// **The property the pair exists to show is that the two axes are
// independent.** The theme moves every colour and nothing else; the seed moves
// the three free figures and nothing else. So the two sheets are identical in
// geometry to the pixel and share not one paint, and neither of those is a
// coincidence - it is what makes a sheet reconfigurable rather than
// redrawable. This script asserts it rather than asserting it in prose: it
// composes both and compares.
//
// It also measures the new palette. A theme is a set of colours the design
// language never saw, so the contrast check is the only thing standing between
// a nice looking palette and a sheet nobody can read, and it runs on the
// composed sheet rather than on the table.
//
// Two checks rather than one, since 2026.10.30. `composeSheet` refuses a theme
// whose roles cannot be read on the grounds the layout pairs them with, so a
// palette that fails is an exception rather than a table of failures - and the
// table below then reports what the sheet **drew**, which is a different set: it
// includes every ink `readableInk` substituted and, where the accent reader is
// loaded, every token it coloured. The refusal is about the input; the table is
// about the output.

import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { composeSheet } from "../api/cheatsheet/compose.mjs";
import { writeRender } from "../api/cheatsheet/files.mjs";
import { renderOf } from "../api/cheatsheet/render.mjs";
import { EMBER, emberTheme } from "./ember-theme.mjs";
import { SEED, splicingArrays } from "./splicing-arrays.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Composes the same document through the second theme.
 *
 * @returns {ReturnType<typeof composeSheet>}
 */
export function restyle() {
  return composeSheet(splicingArrays, { seed: SEED, theme: emberTheme });
}

/**
 * The figures a seed chooses, as a comparable record.
 *
 * @param {import('../api/cheatsheet/compose.mjs').VariationReport} variation
 * @returns {Record<string, number>}
 */
export function geometryOf(variation) {
  return {
    topPadding: variation.topPadding,
    leftInset: variation.leftInset,
    lineSpacing: variation.lineSpacing,
    codeCap: variation.codeCap,
    titleCap: variation.titleCap,
    subtitleCap: variation.subtitleCap,
  };
}

/**
 * Every paint the composition actually put on the page, in drawing order.
 *
 * Read off the rendered document rather than off the theme, because the theme
 * is what was asked for and this is what was drawn - and the two differ
 * wherever `readableInk` substituted an ink for its ground.
 *
 * @param {import('../api/napkin-sketch/api/index.js').Composition} composition
 * @returns {string[]}
 */
export function paintsOf(composition) {
  /** @type {string[]} */
  const paints = [];
  /** @param {import('../api/napkin-sketch/api/index.js').Element[]} elements */
  const walk = (elements) => {
    for (const el of elements) {
      if (el.fill) paints.push(el.fill);
      if (el.type === "group") walk(el.children);
    }
  };
  walk(composition.toDocument().elements);
  return paints;
}

/**
 * The contrast table, one row per pairing the sheet drew.
 *
 * @param {import('../api/cheatsheet/contrast.mjs').MeasuredPairing[]} contrast
 * @returns {string[]}
 */
export function contrastTable(contrast) {
  const width = Math.max(...contrast.map((pairing) => pairing.name.length));
  return contrast.map((pairing) => {
    const ratio = `${pairing.ratio.toFixed(2)}:1`.padStart(8);
    const verdict = pairing.holds ? "ok" : `UNDER ${pairing.floor}:1`;
    return `  ${pairing.name.padEnd(width)}  ${pairing.ink} on ${pairing.ground} ${ratio}  ${verdict}`;
  });
}

/**
 * @param {string[]} argv
 * @returns {Promise<void>}
 */
async function main(argv) {
  const out = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : ".tmp/examples";
  const formats = argv.includes("--raster") ? ["svg", "png"] : ["svg"];

  const recorded = composeSheet(splicingArrays, { seed: SEED });
  const themed = restyle();

  const sameGeometry =
    JSON.stringify(geometryOf(recorded.variation)) === JSON.stringify(geometryOf(themed.variation));
  const recordedPaints = new Set(paintsOf(recorded.composition));
  const themedPaints = new Set(paintsOf(themed.composition));
  const shared = [...themedPaints].filter((paint) => recordedPaints.has(paint));

  console.log(`theme             ${EMBER}`);
  console.log(`seed              ${themed.variation.givenSeed} -> ${themed.variation.seed}`);
  console.log("");
  console.log("the two axes, measured against the recorded language");
  console.log(`  geometry        ${sameGeometry ? "identical" : "DIFFERENT"}`);
  console.log(`  paints          ${themedPaints.size} in the theme, ${shared.length} shared with the record`);
  console.log("");
  console.log("contrast, measured on what was drawn");
  console.log(contrastTable(themed.variation.contrast).join("\n"));
  console.log("");
  console.log(`contrast holds    ${themed.variation.contrastHolds}`);
  // Through `api/cheatsheet/` rather than the drawing surface's own writer, for
  // the reason `reproduce-sheet.mjs` records: the published route is `renderOf`
  // and `writeRender`, and an example reaching past it demonstrates a door this
  // layer closed.
  for (const format of formats) {
    const render = await renderOf(themed, format === "png" ? { format, route: "builtin" } : { format });
    const written = await writeRender(render, out, { name: `splicing-arrays.${EMBER}` });
    const aside = format === "png" ? " (built-in alphabet, not the sheet's face)" : "";
    // Repository relative, as in the other two examples: an absolute path is
    // the one thing in this report nobody can compare against anything.
    const shown = relative(root, written.path).split(sep).join("/");
    console.log(`${format.padEnd(18)}${shown}${aside}`);
  }
  for (const note of themed.variation.notes) console.log(`note              ${note}`);
}

export { main };

// Run only when this file is the entry point, so the test can import it and
// call the same functions a reader runs.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main(process.argv.slice(2));
}
