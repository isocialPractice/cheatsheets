// The one Node-only file in the graphic-design port.
//
// Ported from `src/core/graphic-design/files.ts` in napkin-sketch (MIT,
// isocialPractice), commit d43caac191b2dfd532b3311f4ca1ea6969bb002f.
//
// **This module is not exported from `index.mjs`, and that is the whole point
// of it.** Everything else under `api/` is browser-safe and imports nothing
// outside its own folder, which is what lets `index.html` load the barrel with
// a bare `import` and no build step. Writing a file needs `node:fs`, and a
// browser given `node:fs` does not warn, it fails at load - so the moment
// `writeComposition` appeared in the barrel, every page importing the barrel
// would break, whether or not it ever wrote a file.
//
// Keeping it out of the barrel is therefore a hard boundary rather than tidying
// up. A Node script reaches it by path:
//
// ```js
// import { writeComposition } from "./api/graphic-design/files.mjs";
// ```
//
// which is a line that reads as deliberate, and cannot be arrived at by
// accident from a page. Upstream separates the module for exactly this reason
// and says so in its own header; the port keeps the separation and makes it
// stricter, because upstream ships through a bundler that can drop an unused
// export and this repository has no build step to drop anything.
//
// ## What did not come across, and why
//
// Upstream's `mediaTypeOf` and `imageDataUrl` are not here. Both exist to load
// a bitmap off disk and hand it to an `image` element as a data URL, and this
// repository composes no bitmaps: the design language under **The sheets** in
// `DESIGN_LANGUAGE.md` is rectangles, text and rules, and the one raster in the
// repository is the mark, which the footer draws as a filled square rather than
// places as a file. Porting a loader for placements the composition cannot make
// would be carrying a decoder, a MIME table and a base64 path that nothing
// calls and no test can exercise against real content.
//
// That leaves `writeComposition`, which is the half a script actually reaches
// for: both formats off one document in one call.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Composition, renderPng } from "./compose.mjs";
import { compositionToSvg } from "./svg.mjs";

/**
 * Options for {@link writeComposition}.
 *
 * @typedef {import('./raster.mjs').RasterOptions & import('./svg.mjs').SvgOptions & {
 *   formats?: import('./compose.mjs').CompositionFormat[]
 * }} WriteOptions
 */

/**
 * What {@link writeComposition} wrote, keyed by format.
 *
 * @typedef {object} WrittenFiles
 * @property {string} [svg]
 * @property {string} [png]
 * @property {string[]} warnings Anything the raster pass could not draw.
 */

/**
 * Writes a composition to `<dir>/<name>.svg` and `<dir>/<name>.png`.
 *
 * Both come off one document in one call, which is the point: a caller cannot
 * accidentally export the SVG of one revision beside the PNG of another. For a
 * cheatsheet that matters more than it does upstream, because the SVG is what
 * the page shows and the raster is what gets posted, and a reader comparing the
 * two has no way to tell they came from different documents.
 *
 * `warnings` is always an array, empty on a clean render and empty as well when
 * no PNG was asked for. A caller that ignores it gets a file that may be missing
 * an element, which is why the raster pass collects rather than throws.
 *
 * @param {Composition | import('./types.mjs').CompositionDocument} source
 * @param {string} dir
 * @param {string} name
 * @param {WriteOptions} [options]
 * @returns {Promise<WrittenFiles>}
 */
export async function writeComposition(source, dir, name, options = {}) {
  const doc = source instanceof Composition ? source.toDocument() : source;
  const formats = options.formats ?? ["svg", "png"];
  await mkdir(dir, { recursive: true });

  /** @type {WrittenFiles} */
  const written = { warnings: [] };
  if (formats.includes("svg")) {
    const path = join(dir, `${name}.svg`);
    await writeFile(path, compositionToSvg(doc, options), "utf8");
    written.svg = path;
  }
  if (formats.includes("png")) {
    const path = join(dir, `${name}.png`);
    const render = renderPng(doc, options);
    await writeFile(path, render.data);
    written.png = path;
    written.warnings.push(...render.warnings);
  }
  return written;
}
