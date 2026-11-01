// Worked example 3: one render per output format, through the published
// surface and nothing else.
//
//     node examples/render-formats.mjs
//     node examples/render-formats.mjs --out .tmp/examples/formats
//     node examples/render-formats.mjs --format webp
//
// `reproduce-sheet.mjs` and `restyle-sheet.mjs` are about what a sheet *says*:
// the document, the theme and the seed. This one is about what it *becomes*.
// `renderSheet` names five formats and this composes the document once and
// renders it to all five, reporting what answered for each.
//
// **Composed once, rendered five times.** Composing is the expensive half, so
// `renderOf` takes the pair `composeSheet` already returned rather than a
// document. `renderSheet(doc, options)` is the one-call form and is what the
// README shows; this file uses the other half of the same door because it has
// five formats of one sheet.
//
// ## The five, and what each is for
//
// | Format | What it is | Behind it |
// | --- | --- | --- |
// | `svg` | The composition itself, in the face the markup names | Nothing |
// | `html` | That markup made embeddable in a page | A string transform |
// | `png` | Pixels, by either route | A browser, or the built-in alphabet |
// | `jpeg` | The same, through a codec the engine carries | A browser only |
// | `webp` | The same, and what the social recipe publishes | A browser only |
//
// `svg` is the one every other format is derived from, which is why it needs
// neither a renderer nor an encoder: the markup is what the page draws, so a
// sheet reviewed against the design language and a sheet handed to a reader are
// the same bytes.
//
// ## What runs on a bare clone, and what says why it did not
//
// Three of the five need nothing installed. `png` is the one raster the
// built-in route can encode, so it answers everywhere and reports which route
// actually drew it; `jpeg` and `webp` are browser only, and without one they
// come back with the reason rather than bringing the run down. That is the
// point of catching each format separately: an example that failed on the
// fourth row would tell a reader nothing about the first three.
//
// Nothing here imports `api/cheatsheet/raster.mjs` to ask whether a browser is
// there. The surface answers that itself, in the error, and reaching past it to
// pre-check would be the same leak this example exists to demonstrate the
// closing of.

import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { composeSheet, fragmentFor, renderOf, RENDER_FORMATS } from "../api/cheatsheet/index.mjs";
import { writeRender } from "../api/cheatsheet/files.mjs";
import { brandAssets } from "./reproduce-sheet.mjs";
import { SEED, splicingArrays } from "./splicing-arrays.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The long edge a raster is written at, under **The preset a render is written
 * at** in `CONTRIBUTING.md`.
 *
 * Held as the long edge rather than as a scale because that is the figure the
 * document states. The scale is device pixels per **composition** pixel, and
 * the composition is a 3600 square, so the preset is a scale of 0.3889 - well
 * under 1, which is the figure to read carefully. A scale of 2 would be a 7200
 * square image nobody asked for.
 */
const LONG_EDGE = 1400;
const CANVAS_EDGE = 3600;
const SCALE = LONG_EDGE / CANVAS_EDGE;

/** The encoder quality the preset writes a raster at. */
const QUALITY = 80;

/**
 * What each format is rendered with, and the one sentence that says why.
 *
 * `route: "auto"` on all three rasters deliberately. Naming `browser` would
 * make the example fail where a browser is absent, and naming `builtin` would
 * draw the single stroke alphabet on a machine that could have drawn the real
 * face. `auto` prefers the browser, falls back where it can, and the report
 * below says which one answered - which is the whole reason the route is on the
 * result.
 */
const CASES = {
  svg: { options: {}, about: "the composition itself, needing no renderer" },
  html: { options: {}, about: "that markup made embeddable in a page" },
  png: { options: { route: "auto", scale: SCALE }, about: "pixels, by whichever route answers" },
  jpeg: { options: { route: "auto", scale: SCALE, quality: QUALITY }, about: "a browser only, through its codec" },
  webp: { options: { route: "auto", scale: SCALE, quality: QUALITY }, about: "what the social recipe publishes" },
};

/**
 * Renders one format and writes it, or comes back with the reason it could not.
 *
 * Exported so `tools/test-worked-examples.mjs` checks the example itself rather
 * than a copy of it that can drift from what a reader runs.
 *
 * @param {{ composition: object, variation: object }} composed What `composeSheet` returned.
 * @param {string} format One of {@link RENDER_FORMATS}.
 * @param {string | null} out Where to write, or `null` to render without writing.
 * @returns {Promise<object>} A row for {@link report}.
 */
export async function renderOne(composed, format, out) {
  const { options, about } = CASES[format];
  try {
    const render = await renderOf(composed, { format, ...options });
    // `null` writes nothing and hands the bytes back, which is the in-memory
    // case: a caller embedding a sheet in a response wants exactly this and
    // should not have to go through a file to get it.
    const written = await writeRender(render, out);
    return {
      format,
      about,
      extension: render.extension,
      mediaType: render.mediaType,
      route: render.route,
      bytes: render.bytes,
      pixels: render.pixels,
      publishable: render.publishable,
      family: render.family.resolved,
      // Repository relative, because an absolute Windows path is the one thing
      // in this report nobody can compare against anything.
      path: written.path === null ? null : relative(root, written.path).split(sep).join("/"),
      notes: render.notes,
    };
  } catch (error) {
    // A format a machine cannot produce is a row with a reason in it, not the
    // end of the run. The surface's own message says what was missing.
    return { format, about, failed: error.message };
  }
}

/**
 * The one composition every format below is a render of.
 *
 * The same document and the same seed `reproduce-sheet.mjs` composes, with the
 * brand assets read the same way, so the five files this writes are five forms
 * of the sheet that example reproduces rather than a sixth sheet.
 *
 * @returns {Promise<ReturnType<typeof composeSheet>>}
 */
export async function composeExample() {
  return composeSheet(splicingArrays, { seed: SEED, brand: await brandAssets() });
}

/**
 * Renders every format this surface writes, in order.
 *
 * @param {{ out?: string | null, formats?: string[], composed?: object }} [options]
 * @returns {Promise<object[]>}
 */
export async function renderEvery(options = {}) {
  const formats = options.formats ?? RENDER_FORMATS;
  const out = options.out === undefined ? null : options.out;
  // One composition for all of them, which is what `renderOf` is for.
  const composed = options.composed ?? (await composeExample());
  const rows = [];
  for (const format of formats) rows.push(await renderOne(composed, format, out));
  return rows;
}

/**
 * The lines this example prints, as an array so a test can read them.
 *
 * @param {object[]} rows
 * @returns {string[]}
 */
export function report(rows) {
  // Counted rather than written out, because `--format <one>` renders a
  // single row and a header that said five would be describing the file
  // rather than the run.
  const lines = [`${rows.length} format${rows.length === 1 ? "" : "s"}, one composition`, ""];
  for (const row of rows) {
    lines.push(`${row.format}`);
    lines.push(`  what it is      ${row.about}`);
    if (row.failed) {
      lines.push(`  not rendered    ${row.failed}`);
      lines.push("");
      continue;
    }
    lines.push(`  media type      ${row.mediaType}`);
    lines.push(`  drawn by        ${row.route}`);
    if (row.pixels) lines.push(`  pixels          ${row.pixels.width}x${row.pixels.height}`);
    lines.push(`  bytes           ${(row.bytes / 1024).toFixed(1)} KB`);
    // Which family drew is `null` for markup, and that is an answer rather than
    // a gap: an SVG names a stack and whoever opens it resolves the name.
    lines.push(`  family          ${row.family ?? "resolved by whoever opens it"}`);
    lines.push(`  publishable     ${row.publishable ? "yes" : "no"}`);
    if (row.path) lines.push(`  written         ${row.path}`);
    for (const note of row.notes) lines.push(`  - ${note}`);
    lines.push("");
  }
  return lines;
}

/**
 * @param {string[]} argv
 * @returns {Promise<void>}
 */
async function main(argv) {
  const out = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : ".tmp/examples/formats";
  const named = argv.includes("--format") ? argv[argv.indexOf("--format") + 1] : undefined;
  if (named !== undefined && !RENDER_FORMATS.includes(named)) {
    throw new Error(`render-formats: ${JSON.stringify(named)} is not one of ${RENDER_FORMATS.join(", ")}`);
  }

  const composed = await composeExample();
  const rows = await renderEvery({ out, composed, formats: named === undefined ? undefined : [named] });
  console.log(report(rows).join("\n").trimEnd());

  // The `html` format has a second entry point, because a page wants the markup
  // rather than the bytes. `fragmentFor` is that transform over markup already
  // in hand, `renderFragment(doc, options)` is the form that composes first,
  // and `format: "html"` above is the same markup encoded - three doors, one
  // transform. This takes the markup off the composition every other row was
  // rendered from, so the figure below is comparable with the `html` row.
  const fragment = fragmentFor(composed.composition.toSVG(), { label: "Splicing array elements" });
  console.log("");
  console.log("the fragment, as a page takes it");
  console.log(`  ${fragment.slice(0, fragment.indexOf(">") + 1)}`);
  console.log(`  ${fragment.length} characters, no XML declaration and no width or height`);
}

export { main, CASES, SCALE };

// Run only when this file is the entry point, so the test can import it and
// call the same functions a reader runs. `pathToFileURL` rather than a string
// built by hand: on Windows the argument is `D:\...`, which is not a URL.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main(process.argv.slice(2));
}
