// Contrast, as the composition's own check rather than as a table in a
// document.
//
// `DESIGN_LANGUAGE.md` records every pairing the eleven sheets use and the
// ratio each reaches, and `language.mjs` carries the two floors those ratios
// were judged against. Until now nothing read either at composition time: the
// floors were data a reader could consult, and a sheet composed through a
// modified `language` could set its title in anything it liked and no part of
// the pipeline would notice.
//
// **Why the check belongs here and not in the test suite.** There is already a
// contrast suite, `tools/test-contrast.mjs`, and it covers the page's
// stylesheet - a fixed set of pairs written down in one file, which a test can
// enumerate. A generated sheet is not that. Its ink comes from a document, its
// ground from whichever band the run was placed in, and a caller may pass a
// whole replacement language. The pairs only exist once a particular sheet has
// been composed, so the only place that can measure them is the composition.
//
// ## The rule this enforces, and the one it deliberately does not
//
// The site's rule is 4.5:1 for text and 3:1 for a boundary a reader has to see
// the edge of. **The one place the sheets break the site's own rule** in
// `DESIGN_LANGUAGE.md` settles what a generated sheet does about the green:
// on a white ground the green is a fill, and text that has to be read takes
// `COLORS.greenOnWhite` at 5.66:1 instead of the sheets' own green at 2.80:1.
//
// So this module measures **ink against the ground it is set on**, and nothing
// else. The green spine, the green divider and the four flanking rules are
// fills at 2.80:1 on white and they stay exactly as the artwork drew them.
// Applying the boundary floor to them would fail all eleven existing sheets
// against a rule the design language explicitly decided not to apply to a
// fill, and the first thing anyone would do about that is raise the floor -
// which would take the text rule with it.
//
// ## The colour reader is this layer's own
//
// It used to be the drawing surface's `parseColor`. The published package this
// surface is becoming exports no such function from its root entry, so a
// ratio measured through it would stop being measurable the moment the surface
// moved - and the ratio is the whole of what this module does.
//
// So {@link parseSheetColor} is here instead, and it is narrower than the one
// it replaces on purpose. **It reads the hex forms and nothing else.** All 22
// paints the design language and the worked example's theme declare are hex,
// measured on 2026.10.13, so the named keywords, `rgb()` and `hsl()` would be
// code nothing in this repository reaches - and a reader that quietly accepts
// a form the design language never writes is a reader that will one day accept
// a typo for one. A replacement language that wants `rebeccapurple` is told to
// write it as hex, which is what every colour this repository records already
// is.
//
// Everything here is browser-safe and imports nothing outside this folder.

import { COLORS, CONTRAST, SHEET_LANGUAGE } from "./language.mjs";

/** The hex forms, which are the only forms this design language writes. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/;

/**
 * The values that mean "do not paint", which are not errors.
 *
 * The same set the drawing surface's own reader passes: a composition may
 * legitimately leave a fill or a stroke unset, and `""`, `none` and
 * `transparent` all say so in markup.
 */
const UNPAINTED = new Set(["", "none", "transparent"]);

/**
 * A colour as red, green, blue and alpha.
 *
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 */

/**
 * Reads one of the hex forms, and refuses everything else.
 *
 * The message is the one the drawing surface raises, quoting what was written,
 * because it is the message this repository's tests and its readers already
 * know and the fault it reports is the same fault.
 *
 * @param {string} input
 * @returns {Rgba}
 * @throws if `input` is not `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`.
 */
export function parseSheetColor(input) {
  const value = String(input).trim().toLowerCase();
  const hex = HEX.exec(value);
  if (!hex) throw new Error(`graphic-design: unsupported color "${input}"`);
  const h = hex[1];
  const expand = (c) => parseInt(c + c, 16);
  if (h.length <= 4) {
    return {
      r: expand(h[0]),
      g: expand(h[1]),
      b: expand(h[2]),
      a: h.length === 4 ? expand(h[3]) / 255 : 1,
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

/**
 * A paint, or `null` where there is deliberately none.
 *
 * @param {string | null | undefined} input
 * @returns {Rgba | null}
 * @throws if `input` is a value that is neither a paint nor an absence of one.
 */
export function parseSheetPaint(input) {
  if (input === null || input === undefined) return null;
  const value = String(input).trim().toLowerCase();
  if (UNPAINTED.has(value)) return null;
  const rgba = parseSheetColor(value);
  return rgba.a <= 0 ? null : rgba;
}

/**
 * Raises on the first paint in a composed document the renderers cannot read.
 *
 * **Why this is the layer's job and not the renderer's.** Upstream lets the SVG
 * writer pass a colour straight through to the markup, on the reasoning that a
 * browser is the better parser, and catches a misspelling in the rasterizer
 * instead. The hand port that preceded the vendored copy disagreed and refused
 * in both. The published package agrees with upstream: measured on 2026.10.13, `fill: "ofwhite"` is written into the
 * markup by its `toSVG()` and refused only by its `toPNG()`.
 *
 * That difference matters here and nowhere else. The page composes its sheet as
 * inline SVG and the rasterizer never runs, so an unreadable paint is a black
 * region with no error attached to it anywhere. Checking the document this
 * layer composed is what keeps the refusal whichever surface draws it.
 *
 * Every element is read, groups included: a group carries the common paint
 * props and SVG inherits them into its children, so a misspelling on a wrapper
 * reaches the artwork exactly as one on a leaf does.
 *
 * @param {{ background?: string, elements: Array<Record<string, any>> }} doc
 * @throws if any fill, stroke or page background is not a colour this reads.
 */
export function checkPaints(doc) {
  parseSheetPaint(doc.background);
  /** @param {Array<Record<string, any>>} elements */
  const walk = (elements) => {
    for (const el of elements) {
      parseSheetPaint(el.fill);
      parseSheetPaint(el.stroke);
      if (el.type === "group") walk(el.children ?? []);
    }
  };
  walk(doc.elements ?? []);
}

/**
 * One channel of a colour, linearised.
 *
 * WCAG 2.1's own definition rather than a lookup table, so any colour a
 * document or a replacement language introduces is measured the same way the
 * recorded pairings were.
 *
 * @param {number} eightBit
 * @returns {number}
 */
function channel(eightBit) {
  const c = eightBit / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * The WCAG relative luminance of a colour.
 *
 * Alpha is ignored rather than composited. Every ink and ground a sheet uses is
 * opaque, and a translucent one has no single luminance to report - it depends
 * on what is behind it, which is a question about the whole stack of elements
 * rather than about the colour. Compositing it against an assumed white would
 * return a confident number for a pairing nobody measured.
 *
 * @param {string} color
 * @returns {number}
 */
export function relativeLuminance(color) {
  const { r, g, b } = parseSheetColor(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * The WCAG contrast ratio between two colours, from 1:1 to 21:1.
 *
 * Symmetric: the order of the arguments does not change the answer.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrastRatio(a, b) {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The ink a run should actually be set in, given the ground it sits on.
 *
 * One substitution and no more: the sheets' green on a light ground becomes the
 * darker green the design language nominated for exactly this case. Anything
 * else that misses the floor is left as the caller asked for it and reported by
 * {@link checkPairings}, because there is no second colour on record to swap it
 * for and inventing one would mean a sheet quietly drawn in a palette nobody
 * chose.
 *
 * @param {string} ink
 * @param {string} ground
 * @param {typeof SHEET_LANGUAGE} [language]
 * @returns {string}
 */
export function readableInk(ink, ground, language = SHEET_LANGUAGE) {
  const colors = language.colors ?? COLORS;
  const floor = (language.contrast ?? CONTRAST).text;
  if (ink !== colors.green) return ink;
  if (contrastRatio(ink, ground) >= floor) return ink;
  return contrastRatio(colors.greenOnWhite, ground) >= floor ? colors.greenOnWhite : ink;
}

/**
 * A run of ink and the ground it was set on.
 *
 * @typedef {object} Pairing
 * @property {string} name The element's name, so a failure names what to look at.
 * @property {string} ink
 * @property {string} ground
 */

/**
 * A pairing measured against its floor.
 *
 * @typedef {object} MeasuredPairing
 * @property {string} name
 * @property {string} ink
 * @property {string} ground
 * @property {number} ratio
 * @property {number} floor
 * @property {boolean} holds
 */

/**
 * Measures every pairing against the text floor.
 *
 * Returns all of them rather than only the failures, so a variation report can
 * carry the evidence a sheet was checked at all. A report that lists nothing
 * when a sheet passes reads identically to a report from a run where the check
 * never executed.
 *
 * @param {Pairing[]} pairings
 * @param {number} [floor]
 * @returns {MeasuredPairing[]}
 */
export function checkPairings(pairings, floor = CONTRAST.text) {
  return pairings.map(({ name, ink, ground }) => {
    const ratio = contrastRatio(ink, ground);
    return { name, ink, ground, ratio, floor, holds: ratio >= floor };
  });
}
