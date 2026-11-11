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
// icons, two of them over a gradient, and this drawing surface has no gradients
// at all. So the strip is a raster or it is nothing, and a sheet with no footer
// lockup is the thing being fixed.
//
// ## Where the footer links are, and why they are kept here
//
// The strip's mark and its three icons link out, and where they sit is a fact
// about the strip's pixels, not about the slot it is placed in - the same
// reason the mark's inset lives in the asset rather than in `language.mjs`. So
// {@link FOOTER_LINKS} records them in the strip's own 799 x 81 pixels, and
// {@link footerLinkAreas} carries them through the placement into sheet
// pixels. A raster that is not that size gets no areas at all, because areas
// measured on one image land on the wrong parts of another.
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
 * A raster also carries its own `width` and `height` in pixels when its bytes
 * are a PNG, read from the header rather than decoded, so a caller can tell
 * which image it is holding without a decoder.
 *
 * @typedef {{ kind: 'vector', svg: string, alt?: string }
 *   | { kind: 'raster', dataUrl: string, alt?: string, width?: number, height?: number }} BrandAsset
 */

/**
 * One place on a sheet that links out, in sheet pixels.
 *
 * `label` is the link's accessible name. Two areas may share an `href` - the
 * drawn footer links its mark square and its follow line to the same site -
 * and a writer that wants one link per destination merges them by `href`.
 *
 * @typedef {object} LinkArea
 * @property {string} name What the area covers, stable across sheets.
 * @property {string} href Where it goes.
 * @property {string} label Its accessible name.
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
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
  /** @type {BrandAsset} */
  const asset = alt ? { kind: "raster", dataUrl, alt } : { kind: "raster", dataUrl };
  const size = pngSize(view);
  if (size) Object.assign(asset, size);
  return asset;
}

/** The eight bytes every PNG opens with. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * A PNG's width and height, read from its header without decoding it.
 *
 * The first chunk of a PNG is always `IHDR`, so the two numbers sit at fixed
 * offsets: the 8 byte signature, a 4 byte length, the 4 byte type, then width
 * and height as big-endian 32 bit integers at 16 and 20.
 *
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number } | null} Null for anything that is not a PNG.
 */
export function pngSize(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 24) return null;
  if (!PNG_SIGNATURE.every((byte, at) => bytes[at] === byte)) return null;
  const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (type !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Where the footer's practicing.xyz mark, and the drawn footer, link to. */
export const PRACTICING_HREF = "https://practicing.xyz";

/**
 * The footer strip's link areas, in the strip's own pixels.
 *
 * Measured on `assets/footer.png` on 2026.11.10, after the strip took the
 * Mastodon and X marks. Each area is wider than its ink so a finger can land
 * on it: the icons split at their commas and stay clear of the parentheses,
 * and the mark takes the whole navy block it sits in.
 *
 * | Area | Ink | Area |
 * | --- | --- | --- |
 * | mark | x 0 to 93, every row | x 0 to 93, every row |
 * | Mastodon | x 351 to 372, y 28 to 50 | x 340 to 376, y 16 to 63 |
 * | Instagram | x 389 to 413, y 27 to 51 | x 382 to 417, y 16 to 63 |
 * | X | x 430 to 452, y 29 to 49 | x 424 to 460, y 16 to 63 |
 *
 * Remeasure and edit these together with the strip. Any other strip size gets
 * no areas, per {@link footerLinkAreas}.
 */
export const FOOTER_LINKS = Object.freeze({
  width: 799,
  height: 81,
  areas: Object.freeze([
    Object.freeze({ name: "practicing", href: PRACTICING_HREF, label: "practicing.xyz", x: 0, y: 0, width: 94, height: 81 }),
    Object.freeze({
      name: "mastodon",
      href: "https://mastodon.social/@isocialPractice",
      label: "isocialPractice on Mastodon",
      x: 340,
      y: 16,
      width: 37,
      height: 48,
    }),
    Object.freeze({
      name: "instagram",
      href: "https://www.instagram.com/isocialpractice/",
      label: "isocialpractice on Instagram",
      x: 382,
      y: 16,
      width: 36,
      height: 48,
    }),
    Object.freeze({
      name: "x",
      href: "https://x.com/isocialpractice",
      label: "isocialpractice on X",
      x: 424,
      y: 16,
      width: 37,
      height: 48,
    }),
  ]),
});

/**
 * The footer strip's link areas, carried into the box the strip was placed in.
 *
 * The strip is placed the way every brand raster is, `xMidYMid meet`: scaled
 * by the smaller of the two ratios and centred on the other axis. The same
 * arithmetic here puts each area on the pixels it was measured on.
 *
 * @param {BrandAsset | null | undefined} asset The footer asset that was placed.
 * @param {{ x: number, y: number, width: number, height: number }} box The slot it was placed in.
 * @returns {LinkArea[] | null} Null when the asset is not the strip the areas were measured on.
 */
export function footerLinkAreas(asset, box) {
  if (!asset || asset.kind !== "raster") return null;
  if (asset.width !== FOOTER_LINKS.width || asset.height !== FOOTER_LINKS.height) return null;
  const scale = Math.min(box.width / FOOTER_LINKS.width, box.height / FOOTER_LINKS.height);
  const left = box.x + (box.width - FOOTER_LINKS.width * scale) / 2;
  const top = box.y + (box.height - FOOTER_LINKS.height * scale) / 2;
  return FOOTER_LINKS.areas.map(({ name, href, label, x, y, width, height }) => ({
    name,
    href,
    label,
    x: left + x * scale,
    y: top + y * scale,
    width: width * scale,
    height: height * scale,
  }));
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
