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
// Everything here is browser-safe and reaches no further than the ported
// colour parser beside it.

import { parseColor } from "../graphic-design/color.mjs";

import { COLORS, CONTRAST, SHEET_LANGUAGE } from "./language.mjs";

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
  const { r, g, b } = parseColor(color);
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
