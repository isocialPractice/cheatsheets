// Turning a composed sheet into pixels, by one of two routes.
//
// **This module is Node-only and is not exported from `index.mjs`**, for the
// same reason the drawing surface keeps its file writer behind a subpath of its
// own: it reaches a headless browser, and a page handed that import fails at
// load rather than at the call. A script reaches it by path:
//
// ```js
// import { rasterizeSheet } from "./api/cheatsheet/raster.mjs";
// ```
//
// Nothing here is needed in a browser anyway. A page that wants pixels from a
// composition already has `composition.toPNG()`, and a page that wants the good
// pixels already *is* the engine this module goes looking for.
//
// ## The two routes are not two implementations of one thing
//
// | Route | Draws text with | Good for |
// | --- | --- | --- |
// | `builtin` | The drawing surface's built-in single stroke alphabet | A shape level regression target |
// | `browser` | The real face the design language measured | Anything a person or a timeline sees |
//
// The surface's own `toPNG()` is dependency free, which is what makes it valuable: it
// runs on a clone with nothing installed and produces the same bytes every
// time, so it pins the geometry. What it cannot do is draw the sheet's type,
// because it has no font file - it strokes a built-in alphabet instead, and the
// result is legible but is not the sheet. Publishing one would put a different
// typeface in front of a reader than the page shows.
//
// So the route is a decision about *what the raster is for*, and the caller
// makes it. `auto` prefers the browser and falls back, recording that it did;
// `publishable` on the result is the single field that says whether what came
// back may be posted, and it is never true for the built-in route.
//
// ## Scale, and why the floor is a fraction
//
// `scale` is device pixels per **composition** pixel, the same unit the drawing
// surface's own `RasterOptions` uses, so scale 1 is the 3600 square the sheet composes
// at. That is already six times the 600 px the page displays a sheet at, which
// is what makes the interesting floor a fraction rather than a multiple, and
// is the trap in reading "a scale of 2 or 3" off the roadmap: that figure is
// device pixels per *display* pixel, and scale 2 here would be a 7200 square
// image nobody asked for.
//
// The thing that actually breaks is a type stem. The code face sets at a cap
// of roughly 54 composition pixels, so its stems are around 6 composition
// pixels wide; a sheet rasterised at display size renders those stems just
// about one device pixel across, and a stroke that lands between two pixel
// centres anti-aliases to grey rather than drawing. Two device pixels per
// display pixel is where that stops, so {@link MIN_PUBLISH_SCALE} is
// `2 / DISPLAY_SCALE` and works out near a third.
//
// The default is 1 rather than the floor: the full composition size is the
// answer a caller who has not thought about it wants, and it is comfortably
// clear of the floor. Nothing forbids going under - a thumbnail is a
// legitimate thing to want - but it comes back marked unpublishable with the
// reason attached.
//
// ## Formats
//
// PNG, JPEG and WebP, and no others. GIF and TIFF have no consumer here: the
// social recipe in `.claude/constants.md` publishes `jpg` and `webp`, the page
// shows SVG, and a format nobody reads is a decoder nobody tests. Asking for
// one is an error rather than a silent substitution, because a caller who
// writes `sheet.gif` and receives a PNG has a file that lies about itself.

import { COLORS, DISPLAY_SCALE } from "./language.mjs";

/** The routes a raster can be produced by. `auto` prefers `browser`. */
export const RASTER_ROUTES = ["auto", "browser", "builtin"];

/** The formats a raster can be produced in. */
export const RASTER_FORMATS = ["png", "jpeg", "webp"];

/**
 * The smallest scale a published raster is drawn at.
 *
 * Two device pixels per *display* pixel, converted into the composition pixels
 * `scale` is counted in. Below it the stems of the code face fall under one
 * device pixel and grey out instead of drawing.
 */
export const MIN_PUBLISH_SCALE = 2 / DISPLAY_SCALE;

/** The scale a caller who names none gets: the full composition size. */
export const DEFAULT_SCALE = 1;

/** How the install command is phrased everywhere it is reported. */
const INSTALL_PLAYWRIGHT =
  "Playwright is not installed. Run `npm install -g @playwright/test && " +
  "npx playwright install chromium`, or point PLAYWRIGHT_MODULE at a copy.";

/**
 * Where Playwright is looked for, in order: a local install, then whatever
 * `PLAYWRIGHT_MODULE` names, then the user scope global.
 *
 * The same order `tools/test-sheet-faces-browser.mjs` settled, deliberately: a
 * machine that runs the browser cases runs this, and one that skips them gets
 * the built-in route here rather than a second, differently worded failure.
 *
 * @returns {Promise<string[]>}
 */
async function candidateSpecifiers() {
  const { createRequire } = await import("node:module");
  const { join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");

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

  const named = process.env.PLAYWRIGHT_MODULE;
  const specifiers = named ? [named] : [];
  for (const base of bases) {
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
  return specifiers;
}

/**
 * Resolves a Chromium launcher, or the reason there is not one.
 *
 * Never throws for an absent browser. A missing optional dependency is a fact
 * about the machine, and the caller decides what it means - which is exactly
 * what `auto` is for.
 *
 * @returns {Promise<{ chromium?: object, reason?: string }>}
 */
export async function resolveChromium() {
  for (const specifier of await candidateSpecifiers()) {
    try {
      const module = await import(specifier);
      const chromium = module.chromium ?? module.default?.chromium;
      if (chromium) return { chromium };
    } catch {
      // Try the next one.
    }
  }
  return { reason: INSTALL_PLAYWRIGHT };
}

/**
 * What a rasterisation produced, and what it may be used for.
 *
 * @typedef {object} SheetRaster
 * @property {Uint8Array} data The encoded file bytes.
 * @property {'browser' | 'builtin'} route The route that actually ran.
 * @property {string} format
 * @property {number} scale
 * @property {number} width Device pixels.
 * @property {number} height Device pixels.
 * @property {boolean} publishable Whether this may be posted or shown to a reader.
 * @property {string[]} notes Why it is not publishable, and anything the route skipped.
 */

/**
 * Options a rasterisation is parameterised by.
 *
 * @typedef {object} RasterSheetOptions
 * @property {'auto' | 'browser' | 'builtin'} [route] Default `auto`.
 * @property {number} [scale] Device pixels per composition pixel. Default {@link DEFAULT_SCALE}.
 * @property {string | null} [background] Painted under the composition. Default the sheets' white.
 * @property {'png' | 'jpeg' | 'webp'} [format] Default `png`.
 * @property {number} [quality] 0 to 100, for `jpeg` and `webp` only.
 */

/**
 * Renders a composed sheet to a raster.
 *
 * @param {import('../napkin-sketch/api/index.js').Composition} composition
 * @param {RasterSheetOptions} [options]
 * @returns {Promise<SheetRaster>}
 */
export async function rasterizeSheet(composition, options = {}) {
  const route = options.route ?? "auto";
  const scale = options.scale ?? DEFAULT_SCALE;
  const format = options.format ?? "png";
  const background = options.background === undefined ? COLORS.white : options.background;

  if (!RASTER_ROUTES.includes(route)) {
    throw new Error(`cheatsheet: unknown raster route "${route}", expected one of ${RASTER_ROUTES.join(", ")}`);
  }
  if (!RASTER_FORMATS.includes(format)) {
    throw new Error(
      `cheatsheet: unsupported raster format "${format}". This repository publishes ` +
        `${RASTER_FORMATS.join(", ")}; GIF and TIFF were dropped because nothing here reads them.`
    );
  }
  if (!(scale > 0) || !Number.isFinite(scale)) {
    throw new Error(`cheatsheet: a raster scale must be a positive number, not ${scale}`);
  }

  /** @type {string[]} */
  const notes = [];
  if (scale < MIN_PUBLISH_SCALE) {
    notes.push(
      `Rendered at a scale of ${scale}, under the ${MIN_PUBLISH_SCALE.toFixed(3)} a published ` +
        `raster needs: at that size the stems of the code face fall under a device pixel and ` +
        `anti-alias to grey rather than drawing.`
    );
  }

  if (route !== "builtin") {
    const { chromium, reason } = await resolveChromium();
    if (chromium) {
      return browserRaster(composition, { chromium, scale, background, format, quality: options.quality, notes });
    }
    if (route === "browser") throw new Error(`cheatsheet: the browser raster route needs a browser. ${reason}`);
    notes.push(`Fell back to the built-in route: ${reason}`);
  }

  return builtinRaster(composition, { scale, background, format, notes });
}

/**
 * The dependency free route: the drawing surface's own rasterizer.
 *
 * @param {import('../napkin-sketch/api/index.js').Composition} composition
 * @param {{ scale: number, background: string | null, format: string, notes: string[] }} config
 * @returns {SheetRaster}
 */
function builtinRaster(composition, { scale, background, format, notes }) {
  if (format !== "png") {
    throw new Error(
      `cheatsheet: the built-in raster route encodes PNG only, not ${format}. ` +
        `It carries its own encoder rather than a codec library, which is what makes it dependency free.`
    );
  }
  const render = composition.rasterize({ scale, background });
  notes.push(
    "Drawn by the built-in single stroke alphabet rather than the face the design " +
      "language measured, so it is a shape level regression target and not a sheet to publish.",
    ...render.warnings
  );
  return {
    data: composition.toPNG({ scale, background }),
    route: "builtin",
    format: "png",
    scale,
    width: render.width,
    height: render.height,
    publishable: false,
    notes,
  };
}

/**
 * The publishable route: a real engine, in the face the design language
 * measured.
 *
 * The SVG is set as the page's content rather than navigated to as a data URL,
 * because a data URL is an opaque origin and the engine will not let it resolve
 * a font stack the same way. `deviceScaleFactor` does the scaling rather than a
 * CSS width, so the vector is rasterised at the target resolution instead of
 * being drawn small and enlarged.
 *
 * @param {import('../napkin-sketch/api/index.js').Composition} composition
 * @param {{ chromium: object, scale: number, background: string | null, format: string, quality?: number, notes: string[] }} config
 * @returns {Promise<SheetRaster>}
 */
async function browserRaster(composition, { chromium, scale, background, format, quality, notes }) {
  const doc = composition.toDocument();
  const svg = composition.toSVG();
  const width = Math.round(doc.width * scale);
  const height = Math.round(doc.height * scale);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: doc.width, height: doc.height },
      deviceScaleFactor: scale,
    });
    await page.setContent(
      `<!doctype html><meta charset="utf-8">` +
        `<style>html,body{margin:0;padding:0;` +
        `background:${background ?? "transparent"};}` +
        `svg{display:block;width:${doc.width}px;height:${doc.height}px;}</style>` +
        svg,
      { waitUntil: "load" }
    );
    // Web fonts are not used - the sheet names a system stack - but a paint can
    // still be pending on the first frame, and a screenshot taken before it is
    // a blank sheet that encodes perfectly well.
    await page.evaluate(() => document.fonts.ready);
    const shot = await page.screenshot({
      type: format,
      ...(format === "png" ? {} : { quality: quality ?? 92 }),
      omitBackground: background === null,
    });
    return {
      data: new Uint8Array(shot),
      route: "browser",
      format,
      scale,
      width,
      height,
      publishable: notes.length === 0,
      notes,
    };
  } finally {
    await browser.close();
  }
}
