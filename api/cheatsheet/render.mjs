// The output surface: what a composed sheet becomes, and what the result says
// about itself.
//
// This is the mirror of the three models. On the way in a caller hands over a
// document, a theme and a layout and names nothing a renderer owns; on the way
// out, until this module, a caller reached past the layer for every format
// there is - `composeSheet(doc, options).composition.toSVG()` names the drawing
// surface's own method, and a raster meant importing `raster.mjs` by path
// because `index.mjs` exported nothing from it. Both are the same leak pointing
// the other way, and this module is the door they go through instead.
//
//     import { renderSheet } from "./api/cheatsheet/index.mjs";
//
//     const render = await renderSheet(doc, { format: "webp", route: "browser" });
//     render.data        // the encoded bytes, always
//     render.route       // which renderer actually answered
//     render.publishable // whether it draws the face the design language measured
//
// ## One canonical output, and four things derived from it
//
// | Format | What it is | Behind it |
// | --- | --- | --- |
// | `svg` | The composition itself, in the face the markup names | Nothing. `toSVG()` is the whole of it |
// | `html` | That markup made embeddable in a page | A string transform, no second renderer |
// | `png` | Pixels, by either route | `raster.mjs` |
// | `jpeg`, `webp` | The same, through a codec the engine carries | `raster.mjs`, browser route only |
//
// `svg` is the one every other format is derived from, which is why it is the
// default and why it needs neither a renderer nor an encoder: the markup is
// what the page draws, so a sheet reviewed against the design language and a
// sheet handed to a reader are the same bytes. The three rasters are a
// photograph of that markup, and `html` is that markup with the four things a
// page has to do to it done already.
//
// ## Every render comes back as data, and nothing here touches disk
//
// `data` is a `Uint8Array` on every format, and `text` is the string form where
// there is one. A caller embedding a sheet in a response, a data URL or a test
// never names a path, which is the split the drawing surface already makes:
// `toSVG`, `toPNG` and `rasterize` return data, and only its
// `graphic-design/files` entry reads `node:fs`. `files.mjs` beside this module
// is this folder's equivalent, and it is the only file in it that writes
// anything.
//
// That is not a preference. The page loads this folder with a bare `import` and
// no build step, so a module in the static graph of `index.mjs` that reads
// `node:fs` fails in a browser at load rather than at the call.
//
// ## Why the raster route is reached by a dynamic import
//
// `raster.mjs` goes looking for a headless browser. Nothing in it is needed to
// draw a sheet and nothing in it runs in a page, so a page that imported
// `index.mjs` and got the Playwright resolution along with it would be paying
// for a route it cannot take. The import below happens when a raster is
// actually asked for, which keeps that module out of the page's graph and off
// the page's network without keeping the route out of the published surface.
//
// ## What `publishable` means here, and what it does not
//
// It means the render draws the face the design language measured, so a reader
// looking at it is looking at the sheet. The built-in raster route draws a
// single stroke alphabet and is never publishable; a raster under the publish
// floor greys out the code face's stems and is not either; `svg` and `html`
// always are, because they *are* the composition.
//
// What it does not mean is "may be posted". A weight cap, a destination and a
// watch pattern are policy, and they belong to whoever is publishing: the
// preset under **The preset a render is written at** in `CONTRIBUTING.md` is
// `tools/cheatsheet.mjs`'s, and the formats a post is drafted from are the
// social recipe's in `.claude/constants.md`. This module reports what it drew
// and leaves that decision upstream.
import { composeSheet } from "./compose.mjs";

/** The formats this surface renders. `svg` is the default and the canonical one. */
export const RENDER_FORMATS = ["svg", "html", "png", "jpeg", "webp"];

/** The formats that need a renderer behind them rather than the markup alone. */
export const RASTER_RENDERS = ["png", "jpeg", "webp"];

/** The media type each render carries. */
export const RENDER_MEDIA_TYPES = Object.freeze({
  svg: "image/svg+xml",
  html: "text/html",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
});

/**
 * The filename extension each render is written under.
 *
 * `jpeg` is written `.jpg`, because that is the extension the social recipe
 * watches and the eleven original sheets carry. The format keeps its own name,
 * since that is what the encoder and the media type are called.
 */
export const RENDER_EXTENSIONS = Object.freeze({
  svg: "svg",
  html: "html",
  png: "png",
  jpeg: "jpg",
  webp: "webp",
});

/** The class the default fragment wrapper carries. */
export const FRAGMENT_CLASS = "cheatsheet";

/**
 * The two rules a sheet needs to scale off its viewBox rather than its
 * attributes, carried inline so a fragment works in a page with no stylesheet
 * of its own.
 *
 * They are `div.col div.sheet > svg` in `index.html`, which is where this
 * behaviour was written out by hand before it was published here.
 */
const FRAGMENT_SCALING = "display:block;width:100%;height:auto";

const encoder = new TextEncoder();

/** The options this surface owns. Anything else is `composeSheet`'s. */
const RENDER_OPTIONS = new Set([
  "format",
  "route",
  "scale",
  "quality",
  "background",
  "wrap",
  "className",
  "label",
]);

/** The options `composeSheet` owns, named here so a mistake can be reported. */
const COMPOSE_OPTIONS = new Set(["seed", "theme", "layout", "brand"]);

/**
 * The options a fragment is parameterised by.
 *
 * The rest of {@link RENDER_OPTIONS} needs pixels to apply itself to, so a
 * fragment refuses them the way {@link renderSVG} does rather than accepting
 * them and dropping them.
 */
const FRAGMENT_OPTIONS = new Set(["wrap", "className", "label"]);

/**
 * What a render produced, and what it may be used for.
 *
 * @typedef {object} SheetRender
 * @property {'svg' | 'html' | 'png' | 'jpeg' | 'webp'} format
 * @property {string} mediaType
 * @property {string} extension The extension this format is written under.
 * @property {string} title The sheet's own title, as the composition carries it.
 * @property {Uint8Array} data The encoded bytes. Present on every format.
 * @property {string | null} text The string form, where the format has one.
 * @property {number} bytes
 * @property {'composition' | 'browser' | 'builtin'} route The route that actually answered.
 * @property {string | null} requestedRoute What the call asked for, where it asked.
 * @property {{ width: number, height: number }} size Composition pixels: the unit the markup is written in.
 * @property {{ width: number, height: number } | null} pixels Device pixels, on a raster only.
 * @property {number | null} scale Device pixels per composition pixel, on a raster only.
 * @property {boolean} publishable Whether this draws the face the design language measured.
 * @property {FamilyReport} family Which face was asked for, and which one drew.
 * @property {import('./compose.mjs').VariationReport} variation
 * @property {import('../napkin-sketch/graphic-design/index.js').Composition} composition
 * @property {string[]} notes Anything the composition or the route gave way on.
 */

/**
 * The stack a render asked for, and the family it got.
 *
 * `resolved` is `null` for `svg` and `html`, and that is an answer rather than a
 * gap: markup names a stack and is resolved by whoever opens it, so the family
 * that draws a fragment is a property of the reader's machine and not of the
 * file. A raster has a renderer to ask, and `raster.mjs` asks it.
 *
 * @typedef {object} FamilyReport
 * @property {string[]} requested The families the sheet names, most preferred first.
 * @property {string | null} resolved The one that drew, where a renderer could be asked.
 * @property {string} how Where `resolved` came from, so a reader can weigh it.
 */

/**
 * Options a render is parameterised by.
 *
 * The compose options - `seed`, `theme`, `layout` and `brand` - are passed
 * straight through to {@link composeSheet} and are documented there. The rest
 * are this module's:
 *
 * @typedef {object} RenderOptions
 * @property {'svg' | 'html' | 'png' | 'jpeg' | 'webp'} [format] Default `svg`.
 * @property {'auto' | 'browser' | 'builtin'} [route] Raster only. Default `auto`.
 * @property {number} [scale] Raster only. Device pixels per composition pixel.
 * @property {number} [quality] Raster only, for `jpeg` and `webp`. 0 to 100.
 * @property {string | null} [background] Raster only. Painted under the composition.
 * @property {boolean} [wrap] `html` only. Whether to wrap the markup. Default `true`.
 * @property {string} [className] `html` only. The wrapper's class.
 * @property {string} [label] `html` only. The wrapper's accessible name.
 */

/**
 * The format a call named, checked.
 *
 * `Object.hasOwn` rather than a truth test, for the reason
 * `tools/cheatsheet.mjs` records: `RENDER_MEDIA_TYPES` is an object, so
 * `format: "constructor"` is truthy on a lookup, and a format nobody checked
 * writes bytes to a file named after it and reports success.
 *
 * @param {unknown} named
 * @returns {string}
 */
function formatNamed(named) {
  const name = String(named).toLowerCase();
  if (!Object.hasOwn(RENDER_MEDIA_TYPES, name)) {
    throw new Error(
      `cheatsheet: ${JSON.stringify(String(named))} is not a format this surface renders. ` +
        `It renders ${RENDER_FORMATS.join(", ")}; GIF and TIFF were dropped because nothing here reads them.`
    );
  }
  return name;
}

/**
 * Splits an options bag into the render half and the compose half, refusing
 * anything in neither.
 *
 * Refused rather than ignored, for the reason `composeSheet` names its retired
 * options back: a caller who wrote `scal: 0.4` and silently got the full 3600
 * square has a render that is wrong in a way nothing reports.
 *
 * @param {Record<string, unknown>} options
 * @param {{ composing: boolean }} where
 * @returns {{ render: Record<string, unknown>, compose: Record<string, unknown> }}
 */
function splitOptions(options, { composing }) {
  /** @type {Record<string, unknown>} */
  const render = {};
  /** @type {Record<string, unknown>} */
  const compose = {};
  for (const [name, value] of Object.entries(options ?? {})) {
    if (RENDER_OPTIONS.has(name)) {
      render[name] = value;
      continue;
    }
    if (COMPOSE_OPTIONS.has(name)) {
      if (!composing) {
        throw new Error(
          `cheatsheet: \`options.${name}\` is composed with rather than rendered with, and this ` +
            `call was handed a composition that had already been made. Pass it to composeSheet, ` +
            `or call renderSheet with the document instead.`
        );
      }
      compose[name] = value;
      continue;
    }
    const taken = composing ? [...RENDER_OPTIONS, ...COMPOSE_OPTIONS] : [...RENDER_OPTIONS];
    throw new Error(
      `cheatsheet: \`options.${name}\` is not an option a render takes. It takes ${taken.sort().join(", ")}.`
    );
  }
  return { render, compose };
}

/**
 * The compose result a render is made from, checked.
 *
 * Only the pair {@link composeSheet} returns, rather than a bare composition. A
 * composition on its own cannot say what stack it asked for, what the variation
 * gave way on, or whether the contrast held, so a render made from one would
 * report an empty `family` and no `notes` and look like a render that had
 * nothing to say.
 *
 * @param {unknown} composed
 * @returns {{ composition: any, variation: any }}
 */
function composedFrom(composed) {
  const pair = /** @type {{ composition?: any, variation?: any }} */ (composed ?? {});
  if (!pair.composition || typeof pair.composition.toSVG !== "function") {
    throw new Error(
      "cheatsheet: a render is made from what composeSheet returns - `{ composition, variation }` - " +
        "and this was handed something else. A bare composition has `toSVG()` of its own."
    );
  }
  if (!pair.variation) {
    throw new Error(
      "cheatsheet: the compose result has no variation, so this render could not say what face the " +
        "sheet asked for or what the composition gave way on. Pass the whole of what composeSheet returned."
    );
  }
  return { composition: pair.composition, variation: pair.variation };
}

/**
 * Turns composed markup into a fragment a page can embed.
 *
 * Four things, three of which `index.html` does by hand and one of which it
 * gets away without:
 *
 * 1. **The XML declaration goes.** `toSVG()` opens with `<?xml ... ?>`, which is
 *    correct in a standalone document and is not markup in an HTML page: a
 *    browser parsing HTML has nowhere to put a prolog. The page avoids this by
 *    parsing the string as `image/svg+xml` and importing the element, so it
 *    never sees the declaration as HTML. A fragment set as HTML does.
 * 2. **The root's `width` and `height` go.** The composition is 3600 square in
 *    sheet pixels and carries that on the element; the viewBox carries it too,
 *    so dropping the attributes is what lets the sheet scale to the column it
 *    sits in rather than overflowing it at every width.
 * 3. **The two scaling rules travel inline.** They are a stylesheet rule in the
 *    page and an attribute here, because a fragment is embedded in a document
 *    whose CSS this repository does not write.
 * 4. **The wrapper names the image.** A cheatsheet is a picture of text, so it is
 *    `role="img"` with an accessible name rather than a figure a reader is
 *    expected to read their way through. The name is the sheet's own title,
 *    which the markup carries in its `<title>`.
 *
 * @param {string} markup What `composition.toSVG()` returned.
 * @param {{ wrap?: boolean, className?: string, label?: string }} [options]
 * @returns {string}
 */
export function fragmentFor(markup, options = {}) {
  if (typeof markup !== "string" || markup.trim().length === 0) {
    throw new Error("cheatsheet: a fragment is made from composed markup, which this was not");
  }
  const body = withoutDeclaration(markup).trim();
  if (!body.startsWith("<svg")) {
    throw new Error("cheatsheet: composed markup opens with an `<svg>` element, and this did not");
  }
  const closes = body.indexOf(">");
  if (closes < 0) {
    throw new Error("cheatsheet: the `<svg>` element in this markup has no closing bracket");
  }
  const scaled = scaledTag(body.slice(0, closes + 1)) + body.slice(closes + 1);

  if (options.wrap === false) return scaled;
  const className = options.className ?? FRAGMENT_CLASS;
  // The title is read back out of the markup rather than taken from a document,
  // because this function is handed markup and nothing else.
  const label = options.label ?? `${titleOf(scaled) || "Cheatsheet"} cheat sheet`;
  return `<div class="${attribute(className)}" role="img" aria-label="${attribute(label)}">\n${scaled}\n</div>`;
}

/**
 * The same markup with its XML declaration taken off.
 *
 * @param {string} markup
 * @returns {string}
 */
function withoutDeclaration(markup) {
  return markup.replace(/^\s*<\?xml\b[^?]*\?>/, "");
}

/**
 * An `<svg>` opening tag with its size attributes dropped and the scaling rules
 * written on.
 *
 * Where the tag already carries a `style`, the two rules go in front of what is
 * there rather than over it, so a caller's own declarations are the later ones
 * and win.
 *
 * @param {string} tag
 * @returns {string}
 */
function scaledTag(tag) {
  const sized = tag.replace(/\s+width="[^"]*"/, "").replace(/\s+height="[^"]*"/, "");
  const already = /\sstyle="([^"]*)"/.exec(sized);
  if (already) {
    return sized.replace(already[0], ` style="${FRAGMENT_SCALING};${already[1]}"`);
  }
  return sized.replace(/\s*(\/?)>$/, ` style="${FRAGMENT_SCALING}"$1>`);
}

/**
 * The text of the first `<title>` in some markup, or an empty string.
 *
 * @param {string} markup
 * @returns {string}
 */
function titleOf(markup) {
  return /<title>([^<]*)<\/title>/.exec(markup)?.[1]?.trim() ?? "";
}

/**
 * Text made safe for a double quoted HTML attribute.
 *
 * A title read out of the markup arrives XML escaped already and needs none of
 * this; a label or a class a caller passed is raw text and does. An existing
 * entity is left alone rather than escaped twice, which is what the lookahead on
 * the ampersand is for: `&amp;` in a composed title would otherwise come back
 * `&amp;amp;` and read literally.
 *
 * @param {unknown} text
 * @returns {string}
 */
function attribute(text) {
  return String(text)
    .replace(/&(?![A-Za-z][A-Za-z0-9]*;|#[0-9]+;|#x[0-9A-Fa-f]+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Composes a document and renders it to the canonical SVG.
 *
 * The one output every other format is derived from, and the one with nothing
 * behind it: the markup is the composition in the face the design language
 * measured, so it is also the only format that is the same bytes on every
 * machine. Synchronous for that reason - there is no renderer to wait for.
 *
 * @param {import('./document.mjs').SheetDocument} doc
 * @param {import('./compose.mjs').ComposeOptions} [options]
 * @returns {string}
 */
export function renderSVG(doc, options = {}) {
  const { render, compose } = splitOptions(options, { composing: true });
  for (const name of Object.keys(render)) {
    throw new Error(
      name === "format"
        ? "cheatsheet: renderSVG renders SVG. Call renderSheet to name a format."
        : `cheatsheet: \`options.${name}\` has no meaning for SVG - the markup is the composition ` +
          `itself, whoever would have drawn it. Call renderSheet for a format that has a renderer.`
    );
  }
  return composeSheet(doc, compose).composition.toSVG();
}

/**
 * Composes a document and renders it to an HTML fragment.
 *
 * A wrapper around the canonical markup rather than a second renderer, per
 * {@link fragmentFor}, which is what the four steps are and why they are
 * published rather than invented.
 *
 * @param {import('./document.mjs').SheetDocument} doc
 * @param {import('./compose.mjs').ComposeOptions & { wrap?: boolean, className?: string, label?: string }} [options]
 * @returns {string}
 */
export function renderFragment(doc, options = {}) {
  const { render, compose } = splitOptions(options, { composing: true });
  for (const name of Object.keys(render)) {
    if (FRAGMENT_OPTIONS.has(name)) continue;
    throw new Error(
      name === "format"
        ? "cheatsheet: renderFragment renders HTML. Call renderSheet to name a format."
        : `cheatsheet: \`options.${name}\` has no meaning for a fragment - a fragment is markup, ` +
          `which carries no pixels to apply it to. Call renderSheet for a format that has a renderer.`
    );
  }
  return fragmentFor(composeSheet(doc, compose).composition.toSVG(), render);
}

/**
 * Renders a composition that has already been made.
 *
 * The half of {@link renderSheet} that does not compose, for a caller holding
 * the pair already: a command line that composed to read the variation first, a
 * test that composes once and renders twice. Composing is the expensive half,
 * and doing it a second time for a second format of one sheet is what this
 * signature exists to avoid.
 *
 * @param {{ composition: any, variation: any }} composed What `composeSheet` returned.
 * @param {RenderOptions} [options]
 * @returns {Promise<SheetRender>}
 */
export async function renderOf(composed, options = {}) {
  const { composition, variation } = composedFrom(composed);
  const { render } = splitOptions(options, { composing: false });
  const format = formatNamed(render.format ?? "svg");
  const doc = composition.toDocument();
  const size = { width: doc.width, height: doc.height };
  const title = typeof doc.title === "string" ? doc.title : "";
  const requestedRoute = render.route === undefined ? null : String(render.route);
  /** @type {string[]} */
  const notes = [...(variation.notes ?? [])];

  if (format === "svg" || format === "html") {
    // Upper cased because the note is read by a person, and because
    // `tools/cheatsheet.mjs` has printed it as `SVG` since it had one.
    const named = format.toUpperCase();
    for (const name of ["scale", "quality", "background"]) {
      if (render[name] !== undefined) {
        notes.push(`${name} has no effect on ${named}: the markup carries no pixels to apply it to.`);
      }
    }
    if (requestedRoute !== null && requestedRoute !== "auto") {
      // A note rather than an error, because `format: "svg", route: "browser"`
      // is a reasonable thing to write and means nothing: the markup is the
      // composition's own, whoever would have drawn it.
      notes.push(`route ${requestedRoute} has no effect on ${named}: the markup is the composition itself.`);
    }
    const markup = composition.toSVG();
    const text = format === "svg" ? markup : fragmentFor(markup, render);
    const data = encoder.encode(text);
    return {
      format,
      mediaType: RENDER_MEDIA_TYPES[format],
      extension: RENDER_EXTENSIONS[format],
      title,
      data,
      text,
      bytes: data.byteLength,
      route: "composition",
      requestedRoute,
      size,
      pixels: null,
      scale: null,
      // The composition in the face the markup names, so a reader is looking at
      // the sheet. What resolves that name is the reader's machine, which is
      // what a null `family.resolved` records.
      publishable: true,
      family: {
        requested: variation.stack?.family ?? [],
        resolved: null,
        how: "named by the markup and resolved by whatever opens it",
      },
      variation,
      composition,
      notes,
    };
  }

  // Imported here rather than at the top, per **Why the raster route is reached
  // by a dynamic import** above: this is the one branch that needs a module the
  // page would otherwise download in order never to call it.
  const { rasterizeSheet } = await import("./raster.mjs");
  const raster = await rasterizeSheet(composition, {
    route: requestedRoute ?? "auto",
    format,
    ...(render.scale === undefined ? {} : { scale: Number(render.scale) }),
    ...(render.quality === undefined ? {} : { quality: Number(render.quality) }),
    ...(render.background === undefined ? {} : { background: render.background }),
  });
  notes.push(...raster.notes);
  return {
    format,
    mediaType: RENDER_MEDIA_TYPES[format],
    extension: RENDER_EXTENSIONS[format],
    title,
    data: raster.data,
    text: null,
    bytes: raster.data.byteLength,
    route: raster.route,
    requestedRoute,
    size,
    pixels: { width: raster.width, height: raster.height },
    scale: raster.scale,
    // The raster layer's answer rather than a second judgement of it. That layer
    // is the half that knows about the built-in alphabet and the publish floor;
    // a weight cap and a destination are policy and belong to the publisher.
    publishable: raster.publishable,
    family: raster.family,
    variation,
    composition,
    notes,
  };
}

/**
 * Composes a document and renders it, in one call.
 *
 * The whole output surface in one function: name a format and a route, get the
 * bytes and a report of what answered. Nothing is written anywhere -
 * `writeRender` in `files.mjs` is the one entry in this folder that does.
 *
 * @param {import('./document.mjs').SheetDocument} doc
 * @param {import('./compose.mjs').ComposeOptions & RenderOptions} [options]
 * @returns {Promise<SheetRender>}
 */
export async function renderSheet(doc, options = {}) {
  const { render, compose } = splitOptions(options, { composing: true });
  return renderOf(composeSheet(doc, compose), render);
}

/**
 * A filename for a render, derived from the sheet's own title.
 *
 * What a caller writing into a directory gets when they name no file. The base
 * is the title slugged, so `Splicing Array Elements` as a WebP is
 * `splicing-array-elements.webp`, and a document with no usable title gives
 * `sheet`, which is the name a cheatsheet folder reserves anyway.
 *
 * @param {SheetRender} render
 * @param {string} [base] A name to use instead of the derived one.
 * @returns {string}
 */
export function filenameFor(render, base) {
  const named = render?.format;
  // `Object.hasOwn` rather than a truth test on the lookup, for the reason
  // {@link formatNamed} gives: `RENDER_EXTENSIONS` is an object literal, so
  // `format: "constructor"` is truthy on a lookup, and a format nobody checked
  // came back as `<slug>.function Object() { [native code] }` with the error
  // below never thrown.
  if (typeof named !== "string" || !Object.hasOwn(RENDER_EXTENSIONS, named)) {
    throw new Error(
      `cheatsheet: a filename needs a render in a format this surface writes, not ` +
        `${JSON.stringify(render?.format)}`
    );
  }
  return `${slugFor(base === undefined ? render.title : base)}.${RENDER_EXTENSIONS[named]}`;
}

/**
 * Text as a filename safe slug.
 *
 * ASCII letters, digits and single hyphens, which is the narrow answer on
 * purpose: a filename derived from a title travels into a URL, a social post
 * and a shell argument, and each of those has its own opinion about everything
 * else. Text that slugs to nothing is `sheet`.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function slugFor(text) {
  const slug = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "sheet";
}
