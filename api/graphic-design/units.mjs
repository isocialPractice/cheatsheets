// Measurement units for the graphic-design API.
//
// Ported from `src/core/units.ts` in napkin-sketch (MIT, isocialPractice),
// commit d43caac191b2dfd532b3311f4ca1ea6969bb002f. Reduced to the ratio table
// and its two conversions: upstream this file also drives a properties panel,
// with display precision, spinner steps and arrow-key nudges, and this
// repository has no panel to drive. Sheets compose in pixels only.
//
// It is ported at all because `types.mjs` and `raster.mjs` both read `toPx`
// from one folder above the tree that was ported, so the folder listing
// understates what the port has to carry.
//
// The canvas works entirely in CSS pixels; every other unit converts through
// the CSS reference of 96 pixels per inch, which is the same ratio the SVG
// export assumes. Conversions are exact ratios, so a value written in
// millimetres and read back in millimetres round-trips.

/**
 * A length unit a composition may be measured in.
 *
 * @typedef {'px' | 'in' | 'mm' | 'pt'} LengthUnit
 */

/** CSS reference resolution - the ratio every print unit converts through. */
export const CSS_PX_PER_INCH = 96;

/** @type {Record<LengthUnit, number>} */
const PX_PER_UNIT = {
  px: 1,
  in: CSS_PX_PER_INCH,
  mm: CSS_PX_PER_INCH / 25.4,
  pt: CSS_PX_PER_INCH / 72,
};

/** Every length unit, in the order the table declares them. */
export const LENGTH_UNITS = ["px", "in", "mm", "pt"];

/**
 * Type guard for a length unit read back from JSON or a document file.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isLengthUnit(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PX_PER_UNIT, value);
}

/**
 * Converts a value expressed in `unit` to composition pixels.
 *
 * @param {number} value
 * @param {LengthUnit} unit
 * @returns {number}
 */
export function toPx(value, unit) {
  return value * (PX_PER_UNIT[unit] ?? 1);
}

/**
 * Converts composition pixels to `unit`.
 *
 * @param {number} px
 * @param {LengthUnit} unit
 * @returns {number}
 */
export function fromPx(px, unit) {
  return px / (PX_PER_UNIT[unit] ?? 1);
}
