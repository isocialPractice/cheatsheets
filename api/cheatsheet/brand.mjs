// The brand assets a sheet is composed with, in the form the drawing surface
// places.
//
// Two slots, both measured off the artwork and recorded as `BRAND_SLOTS` in
// `language.mjs`: the mark beside the masthead wordmark, and the footer strip.
// Until 2026.10.14 the algorithm drew neither - a lone wordmark centred on the
// axis, and a bare navy rectangle where the footer lockup goes - because
// nothing in the repository turned `assets/logo.svg` and `assets/footer.png`
// into something `placeBrand` accepts. This is that step and nothing else: it
// resolves bytes into a source, and `compose.mjs` decides where a source goes.
//
// ## Why a sheet is composed without one just as happily
//
// A brand is an argument, never a lookup. Nothing here reads a file, fetches a
// URL or knows a path, so the module stays browser-safe and the composition
// stays a pure function of its inputs: the same document and the same brand
// compose the same bytes anywhere. That is what lets `tools/fixtures/sheet.svg`
// stay pinned byte for byte - it is composed with no brand at all, which is the
// state every slot falls back to.
//
// ## The two forms, and why a raster is one of them
//
// `placeBrand` takes a vector as markup and a raster as a data URL, and both
// renderers agree on both: the SVG writer inlines a vector's shapes and emits
// an `<image>` for a raster, and the rasterizer draws the same two. A vector is
// the better form and the footer asset cannot be one - it carries three social
// icons, one of them over a gradient, and this drawing surface has no gradients
// at all. So the strip is a raster or it is nothing, and a sheet with no footer
// lockup is the thing being fixed.
//
// The PNG is carried inline rather than linked. A composition is handed to a
// renderer as a document, not as a page with a base URL, so a relative `href`
// would resolve against whatever opened it - and the page offers the composed
// markup as a blob in a tab of its own, where nothing relative resolves at all.

/**
 * An asset resolved far enough for {@link placeBrand} to draw it.
 *
 * The shape is `BrandSource` from the vendored surface, restated here so a
 * caller of this layer does not have to reach into `api/napkin-sketch/` for a
 * typedef.
 *
 * @typedef {{ kind: 'vector', svg: string, alt?: string }
 *   | { kind: 'raster', dataUrl: string, alt?: string }} BrandAsset
 */

/**
 * The assets a sheet may be composed with. Every slot is optional.
 *
 * @typedef {object} SheetBrand
 * @property {BrandAsset | null} [logo] The mark beside the masthead wordmark.
 * @property {BrandAsset | null} [footer] The footer lockup: mark, follow line and icons.
 */

/** The files this repository keeps its two assets in, relative to the root. */
export const BRAND_FILES = {
  logo: "assets/logo.svg",
  footer: "assets/footer.png",
};

/**
 * Wraps SVG markup as a placeable vector.
 *
 * @param {string} svg
 * @param {string} [alt]
 * @returns {BrandAsset | null}
 */
export function vectorAsset(svg, alt) {
  if (typeof svg !== "string" || svg.trim().length === 0) return null;
  return alt ? { kind: "vector", svg, alt } : { kind: "vector", svg };
}

/**
 * Wraps image bytes as a placeable raster.
 *
 * @param {Uint8Array | ArrayBuffer} bytes
 * @param {string} [mime]
 * @param {string} [alt]
 * @returns {BrandAsset | null}
 */
export function rasterAsset(bytes, mime = "image/png", alt) {
  const view = bytes instanceof Uint8Array ? bytes : bytes ? new Uint8Array(bytes) : null;
  if (!view || view.length === 0) return null;
  const dataUrl = dataUrlFrom(view, mime);
  return alt ? { kind: "raster", dataUrl, alt } : { kind: "raster", dataUrl };
}

/**
 * Base64 data URL for a block of bytes.
 *
 * `btoa` where there is one and `Buffer` where there is not, because this
 * module composes in a browser and in Node and only one of the two globals is
 * in both. The second arm is a fallback nothing in the supported range now
 * reaches: `btoa` has been a Node global since 16, the package declares
 * `node >=22.12` and the Pages job pins 22. It is kept because it costs a
 * line, and because the arm that is never taken is the cheap half of the pair.
 *
 * The decode side carries the same two, and it is worth saying where, because
 * it is not where this comment used to send a reader: `raster.mjs` in this
 * folder has neither global. It is the vendored surface's own rasterizer that
 * reaches for `atob` and falls back to `globalThis.Buffer`, for exactly the
 * reason above.
 *
 * The 32 KB stride is what keeps `String.fromCharCode` off the argument
 * count limit - a 10 KB logo is fine spread in one call and a 2 MB asset is a
 * `RangeError`, so the stride is there for the asset nobody has added yet.
 *
 * @param {Uint8Array} bytes
 * @param {string} mime
 * @returns {string}
 */
export function dataUrlFrom(bytes, mime) {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(at, at + 0x8000));
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : globalThis.Buffer.from(binary, "binary").toString("base64");
  return `data:${mime};base64,${base64}`;
}

/**
 * Builds a brand from raw asset contents, skipping whatever is missing.
 *
 * @param {object} sources
 * @param {string} [sources.logoSvg] The markup of `assets/logo.svg`.
 * @param {Uint8Array | ArrayBuffer} [sources.footerPng] The bytes of `assets/footer.png`.
 * @returns {SheetBrand}
 */
export function sheetBrandFrom({ logoSvg, footerPng } = {}) {
  /** @type {SheetBrand} */
  const brand = {};
  const logo = logoSvg === undefined ? null : vectorAsset(logoSvg, "practicing.xyz");
  if (logo) brand.logo = logo;
  const footer = footerPng === undefined ? null : rasterAsset(footerPng, "image/png", "Follow practicing.xyz");
  if (footer) brand.footer = footer;
  return brand;
}

/**
 * Fetches both assets relative to a base URL.
 *
 * Used by the page, where the assets are two more requests beside the manifest
 * and are fetched once for every sheet the reader looks at rather than once per
 * selection. An asset that does not answer is left out and the slot falls back
 * to what it drew before, so a sheet still composes on a server that is missing
 * one - which is the state every clone was in until the files were committed.
 *
 * @param {string} [base] Prefix for both paths. `""` resolves them against the page.
 * @param {typeof globalThis.fetch} [fetchImpl]
 * @returns {Promise<SheetBrand>}
 */
export async function fetchSheetBrand(base = "", fetchImpl = globalThis.fetch) {
  const read = async (path, as) => {
    try {
      const response = await fetchImpl(`${base}${path}`);
      if (!response.ok) return undefined;
      return as === "text" ? await response.text() : new Uint8Array(await response.arrayBuffer());
    } catch {
      return undefined;
    }
  };
  const [logoSvg, footerPng] = await Promise.all([
    read(BRAND_FILES.logo, "text"),
    read(BRAND_FILES.footer, "bytes"),
  ]);
  return sheetBrandFrom({ logoSvg, footerPng });
}
