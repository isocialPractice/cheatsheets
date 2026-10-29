// The cheatsheet theme model: the palette, the type and the metrics a sheet is
// drawn with, named as a thing a caller can hand over.
//
// ## What a theme was before this file, and why that was not a model
//
// `examples/ember-theme.mjs` says it in one line: "a theme is a copy of
// `SHEET_LANGUAGE` with some of it replaced - there is no separate theme
// format to learn." That is true, it works, and it is not a model. Two things
// were wrong with it:
//
// - **It is not a surface, it is the whole record.** `SHEET_LANGUAGE` carries
//   the bands, the divisions, the runs' baselines and the panel's freedoms.
//   None of that is a theme. A caller handed the whole object to re-tint six
//   colours has been handed every coordinate on the sheet and no indication of
//   which parts are theirs to move, which is how a "theme" ends up carrying a
//   band at the wrong row.
// - **Nothing checked a theme at all.** A palette with a role missing composed
//   a sheet with `undefined` as a fill, which the drawing surface's SVG writer
//   passes straight through into markup the browser paints black.
//
// This file is the surface: the parts of the record that are a theme's, with
// nothing else in them, and a schema that refuses a theme missing a role.
//
// ## Where the figures come from
//
// Every one is read off `language.mjs` and `faces.mjs`, which are themselves
// transcriptions of `DESIGN_LANGUAGE.md` - **The colors the sheets are drawn
// in**, **The faces**, **The step the sheets are drawn to**. Nothing here is a
// second transcription: {@link themeFrom} derives the default theme from those
// modules at load, so a figure corrected in the record is corrected here with
// no edit, and the two cannot say different things about the same measurement.
//
// That matters more than it sounds. The one rule `DESIGN_LANGUAGE.md` states
// about itself is that it may not contain a number the record did not give, and
// a theme file with the palette typed into it would be exactly that: six hexes
// that look measured because everything beside them is.
//
// ## What a theme carries, and what it does not
//
// | In | Out |
// | --- | --- |
// | Palette roles, and the syntax roles | Where a band starts |
// | The type stack and the four measured sizes | Which run sits at which baseline |
// | The step, and the tokens that are multiples of it | How wide the code panel is |
// | The radius | What a seed may move |
// | The stroke weights | The floors |
//
// The line between the two columns is **a paint or a metric** against **a
// position**. A theme re-tints and re-sizes; it does not re-compose. That is
// the property `tools/test-worked-examples.mjs` already pins from the other
// side - "a theme moves every paint and not one coordinate" - and this model
// is what makes it structural instead of a thing an example happens to honour.
//
// ## Colours are resolved, not copied
//
// A role resolves to a concrete value through `parseSheetColor` in
// `contrast.mjs`, which is this repository's own parser: the drawing surface's
// root entry exports none, so a theme that checked its colours by eye and a
// renderer that parsed them would be two readings of the same string. The
// resolved form is what {@link resolvePalette} returns and what the schema's
// refusal is written against, so a theme and a rendered fill cannot disagree
// about what a colour is.

import { parseSheetColor } from "./contrast.mjs";
import { SHEET_CONDENSATION, SHEET_FACE, TYPE_ROLES } from "./faces.mjs";
import { SHEET_LANGUAGE } from "./language.mjs";
import { assertValid } from "./schema.mjs";

/**
 * The palette roles a theme names, in the order **The colors the sheets are
 * drawn in** ranks them by area.
 *
 * `greenOnWhite` is last and is not a sixth colour: it is the substitution the
 * design language nominates for the accent where the accent has to carry text
 * on a light ground. A theme omitting it leaves `readableInk` with nothing to
 * substitute, which is why it is required rather than optional.
 */
export const PALETTE_ROLES = ["navy", "white", "green", "heading", "greenOnWhite"];

/** The syntax roles the code panel paints, which are the six `SYNTAX` names. */
export const SYNTAX_ROLES = ["plain", "comment", "identifier", "keyword", "string", "number"];

/** The four type sizes the sheets are set in, from **The faces**. */
export const TYPE_SCALE_ROLES = ["masthead", "followLine", "title", "leadIn"];

/**
 * A theme: a palette, a face, a scale and the metrics that go with them.
 *
 * @typedef {object} SheetTheme
 * @property {string} name
 * @property {Record<string, string>} colors The five palette roles.
 * @property {Record<string, string>} syntax The six code panel roles.
 * @property {{ text: number, boundary: number }} contrast The floors every pairing is held to.
 * @property {ThemeStack} stack The face a run is measured and drawn in.
 * @property {Record<string, ThemeSize>} scale The four measured sizes.
 * @property {{ step: number, tokens: Record<string, number> }} spacing
 * @property {number} radius In sheet pixels.
 * @property {ThemeStrokes} strokes
 */

/**
 * The type stack, as the numbers a width is computed from.
 *
 * The family is a stack rather than a face name on purpose - **The page's
 * face** in `DESIGN_LANGUAGE.md` gives the reason, and **The faces are not
 * named** is why the artwork's own face is not claimed here.
 *
 * @typedef {object} ThemeStack
 * @property {string} family The CSS font stack a rendered sheet asks for.
 * @property {number} unitsPerEm
 * @property {number} capHeight
 * @property {number} xHeight
 * @property {number} descender
 * @property {number} condensation How much narrower the artwork's face is than this stack.
 */

/**
 * One size of the scale, measured off the artwork.
 *
 * @typedef {object} ThemeSize
 * @property {number} cap Cap height in sheet pixels.
 * @property {number} weight The CSS weight the stem share resolves to.
 */

/**
 * The stroke weights, which are two different kinds of stroke.
 *
 * @typedef {object} ThemeStrokes
 * @property {Record<string, number>} type The modal stem of each type size, in sheet pixels.
 * @property {Record<string, number>} rules The two flanking bars in the heading band.
 */

/**
 * The theme a design language carries.
 *
 * Derives rather than restates, which is the whole reason this is a function.
 * `SHEET_LANGUAGE` is the transcription of `DESIGN_LANGUAGE.md`; this reads
 * the themeable half back out of it, so the default theme below is the record
 * and not a copy of it.
 *
 * @param {typeof SHEET_LANGUAGE} language
 * @param {{ name?: string, face?: import('./faces.mjs').Face, scale?: Record<string, import('./faces.mjs').TypeRole> }} [options]
 * @returns {SheetTheme}
 */
export function themeFrom(language, options = {}) {
  const face = options.face ?? SHEET_FACE;
  const roles = options.scale ?? TYPE_ROLES;
  return {
    name: options.name ?? "default",
    colors: { ...language.colors },
    syntax: { ...language.syntax },
    // The same fallback `compose.mjs` applies to the floors, for the same
    // reason: a caller's modified copy of the record may omit a table without
    // meaning "no table", and a theme carrying no contrast floor is a theme
    // nothing can be measured against.
    contrast: { ...(language.contrast ?? SHEET_LANGUAGE.contrast) },
    stack: {
      family: face.fontFamily,
      unitsPerEm: face.unitsPerEm,
      capHeight: face.capHeight,
      xHeight: face.xHeight,
      descender: face.descender,
      // Not a property of the stack but of the gap between it and the artwork,
      // and it belongs to a theme because it is what decides how much a run
      // has to be stepped down by. `compose.mjs` explains the consequence:
      // what gives is the size, never the letterform.
      condensation: SHEET_CONDENSATION,
    },
    scale: Object.fromEntries(
      TYPE_SCALE_ROLES.map((role) => [role, { cap: roles[role].cap, weight: roles[role].fontWeight }])
    ),
    spacing: { step: language.step, tokens: { ...language.tokens } },
    radius: language.radius,
    strokes: {
      type: Object.fromEntries(TYPE_SCALE_ROLES.map((role) => [role, roles[role].stem])),
      rules: { upper: language.rules.upper.height, lower: language.rules.lower.height },
    },
  };
}

/**
 * The theme the eleven sheets are drawn in.
 *
 * @type {SheetTheme}
 */
export const SHEET_THEME = themeFrom(SHEET_LANGUAGE);

/**
 * A colour that `parseSheetColor` can read, or a message saying it cannot.
 *
 * This is the refusal that makes the model worth validating. An unreadable
 * fill reaches the SVG writer, which passes it through into markup rather than
 * objecting, and the page then draws a black region with nothing logged
 * anywhere. Only the rasterizer objects, and the page never rasterizes.
 *
 * @param {any} value
 * @returns {string | undefined}
 */
function isColor(value) {
  if (typeof value !== "string") return undefined;
  try {
    parseSheetColor(value);
    return undefined;
  } catch {
    return `must be a colour this layer can read, and ${JSON.stringify(value)} is not one`;
  }
}

/** A role of a palette: a string the colour parser accepts. */
const COLOR = { type: "string", notEmpty: true, check: isColor };

/**
 * A record whose keys are exactly the roles named, each a colour.
 *
 * Written as named fields rather than as a `record`, because the point is that
 * a role may not be **missing**: a record validates whatever keys it is given
 * and would pass a palette of one colour.
 *
 * @param {string[]} roles
 * @param {string} label
 * @returns {import('./schema.mjs').Schema}
 */
function palette(roles, label) {
  return {
    type: "object",
    label,
    fields: Object.fromEntries(roles.map((role) => [role, COLOR])),
  };
}

/**
 * The theme's schema.
 *
 * @type {import('./schema.mjs').Schema}
 */
export const THEME_SCHEMA = {
  name: "theme",
  label: "cheatsheet theme",
  type: "object",
  fields: {
    name: { type: "string", notEmpty: true },
    colors: palette(PALETTE_ROLES, "palette"),
    syntax: palette(SYNTAX_ROLES, "syntax palette"),
    contrast: {
      type: "object",
      label: "contrast floors",
      fields: {
        text: { type: "number", min: 1, max: 21 },
        boundary: { type: "number", min: 1, max: 21 },
      },
    },
    stack: {
      type: "object",
      label: "type stack",
      fields: {
        family: { type: "string", notEmpty: true },
        unitsPerEm: { type: "integer", min: 1 },
        capHeight: { type: "integer", min: 1 },
        xHeight: { type: "integer", min: 1 },
        descender: { type: "integer", min: 0 },
        condensation: { type: "number", min: 0, max: 2 },
      },
    },
    scale: {
      type: "object",
      label: "type scale",
      fields: Object.fromEntries(
        TYPE_SCALE_ROLES.map((role) => [
          role,
          {
            type: "object",
            label: "type size",
            fields: {
              cap: { type: "number", min: 1 },
              weight: { type: "integer", min: 100, max: 900 },
            },
          },
        ])
      ),
    },
    spacing: {
      type: "object",
      label: "spacing",
      fields: {
        step: { type: "number", min: 1 },
        tokens: { type: "record", notEmpty: true, values: { type: "number", min: 0 } },
      },
    },
    radius: { type: "number", min: 0 },
    strokes: {
      type: "object",
      label: "stroke weights",
      fields: {
        type: { type: "record", notEmpty: true, values: { type: "number", min: 0 } },
        // Named fields rather than a record, for the reason {@link palette}
        // gives for the same choice: a record validates whatever keys it is
        // given, and these two are read by name. {@link languageFor} puts
        // `upper` and `lower` back into the record's own `rules`, so a theme
        // naming neither passes a record check and then draws both flanking
        // bars at a height of `undefined` - which the drawing surface writes
        // out as zero, so the four green bars either side of the title leave
        // the sheet with nothing logged anywhere.
        rules: {
          type: "object",
          label: "rule weights",
          fields: {
            upper: { type: "number", min: 0 },
            lower: { type: "number", min: 0 },
          },
        },
      },
    },
  },
};

/**
 * Validates a theme and hands it back.
 *
 * @param {SheetTheme} theme
 * @returns {SheetTheme}
 */
export function readTheme(theme) {
  return assertValid(theme, THEME_SCHEMA, "theme");
}

/**
 * Every role of a theme, resolved to the value the renderer will draw.
 *
 * The resolution is `contrast.mjs`'s, which is the parser the composition
 * measures with, so a role checked here and a fill drawn later are the same
 * reading of the same string. A theme that passed the schema cannot fail this.
 *
 * @param {SheetTheme} theme
 * @returns {Record<string, { role: string, value: string, rgba: import('./contrast.mjs').Rgba }>}
 */
export function resolvePalette(theme) {
  /** @type {Record<string, { role: string, value: string, rgba: any }>} */
  const resolved = {};
  for (const [group, roles] of [
    ["colors", PALETTE_ROLES],
    ["syntax", SYNTAX_ROLES],
  ]) {
    for (const role of roles) {
      const value = theme[group][role];
      // Namespaced, because `plain` and `white` are the same colour in the
      // recorded theme and a flat map would lose one of them. The group is in
      // the key for the same reason `CENSUS_PALETTE` exists in `language.mjs`:
      // a role name alone does not say which half of the palette to look it
      // up in.
      resolved[`${group}.${role}`] = { role, value, rgba: parseSheetColor(value) };
    }
  }
  return resolved;
}

/**
 * The design language a theme composes through.
 *
 * `composeSheet` takes a `language`, which is the whole record, and a theme is
 * the themeable half of one. This puts the half back into the whole, so a
 * theme reaches the algorithm without the algorithm learning a second input
 * format and without a caller having to know which fields of the record a
 * theme is allowed to move.
 *
 * It is the one direction worth having. The other - a language built from a
 * theme alone - would have to invent every coordinate the theme does not
 * carry, and inventing coordinates is what this model exists to prevent.
 *
 * **One limit, stated because it is invisible otherwise.** `spacing.step`,
 * `spacing.tokens` and `radius` are written through, and changing them moves
 * nothing. Every position the record derives from a token - the spine's
 * `step-4` lead, the `step-3` the lead-in sits in from the spine, the mark
 * square's `step-6` - is already resolved to a number in `insets`,
 * `markSquare` and `rules`, so a theme naming a different step renames the
 * unit without redrawing anything measured in it. That is the right division
 * rather than a gap to close: a grid is the **layout**'s, and a caller who
 * wants a different one replaces the layout or derives a new one with
 * `layoutFor`. What the theme's spacing is for is being the record of the
 * step a renderer is drawing to, which is what the design language asked of
 * it.
 *
 * @param {SheetTheme} theme
 * @param {typeof SHEET_LANGUAGE} [base] The record the positions come from.
 * @returns {typeof SHEET_LANGUAGE}
 */
export function languageFor(theme, base = SHEET_LANGUAGE) {
  return {
    ...base,
    colors: { ...theme.colors },
    syntax: { ...theme.syntax },
    contrast: { ...theme.contrast },
    step: theme.spacing.step,
    tokens: { ...theme.spacing.tokens },
    radius: theme.radius,
    rules: {
      ...base.rules,
      upper: { ...base.rules.upper, height: theme.strokes.rules.upper },
      lower: { ...base.rules.lower, height: theme.strokes.rules.lower },
    },
  };
}
