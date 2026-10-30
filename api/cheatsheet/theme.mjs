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
// | The curve and shape tokens | What a seed may move |
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
//
// Resolving is half of it, and the other half is a refusal: {@link
// assertReadable} measures every pairing of ink and ground this theme and a
// layout imply, after the one substitution the design language nominates, and
// throws rather than composing a sheet whose type cannot be read. A palette
// that is legible as colour and illegible as type used to compose, note itself
// and hand back a finished picture nobody could read.
//
// ## A theme may arrive partial
//
// {@link readTheme} refuses a theme missing a role, which is right for a whole
// theme and is exactly what a partial one is not. {@link themeOver} is the
// other door: a partial laid over a base and **then** validated, so a caller
// moves one colour without restating the palette, and a caller who misspells a
// field still gets it named back to them by path. Omission is filled; error is
// not.

import { checkPairings, parseSheetColor, readableInk } from "./contrast.mjs";
import { SHEET_CONDENSATION, SHEET_FACE, TYPE_ROLES } from "./faces.mjs";
import { SHEET_LANGUAGE } from "./language.mjs";
import { paintOf } from "./layout.mjs";
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
 * The forms a shape token may take, which are the two the drawing surface has.
 *
 * `rectangle` and `line` rather than a longer list, because a form a caller
 * can name and the surface cannot draw is a token that fails at render time
 * instead of at validation time. The two map onto the layout's `fill` and
 * `stroke`, which is the division a slot already makes.
 */
export const SHAPE_FORMS = ["rectangle", "line"];

/**
 * The curve tokens a theme has to name, because the layer resolves them.
 *
 * `square` is the corner every structural region of the eleven is drawn with
 * and is what a slot naming no shape falls back to; `display` is the record's
 * one radius, and {@link languageFor} writes it back into the design language
 * as `radius`. A theme may name as many more as it likes - the table is a record -
 * but a theme missing one of these two is a theme with a hole where a renderer
 * looks.
 */
export const CURVE_TOKENS = ["square", "display"];

/**
 * The shape tokens a theme has to name, for the same reason.
 *
 * Two, one per way a slot can be drawn: `block` is the square cornered
 * rectangle a `fill` takes and `bar` is the line a `stroke` takes. Each is the
 * fallback for a slot of its kind that declares no shape, which is every slot
 * of a layout written before shape tokens existed, so a theme missing either
 * leaves such a layout unable to draw.
 */
export const SHAPE_TOKENS = ["block", "bar"];

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
 * @property {Record<string, number>} curves The named curve tokens, in sheet pixels.
 * @property {Record<string, ThemeShape>} shapes The named shape tokens.
 * @property {ThemeStrokes} strokes
 */

/**
 * A shape token: a form, and the curve its corners are drawn at.
 *
 * This is the half of **Take design element choices as named tokens** that was
 * still open. The spacing step, the stroke weights and the type sizes were
 * already numbers in sheet pixels and already named - a slot says
 * `size: "title"` and gets a cap and a weight - but a corner was a figure the
 * theme carried and nothing read, and a form was implied by the `draw` a slot
 * declared. Named together, a layout says `shape: "block"` and a caller
 * re-draws every structural region of the sheet by moving one token.
 *
 * **Why the curve is a token name and not a number.** A number in a slot is
 * raw CSS by another spelling: it renders the same only as long as every
 * backend agrees what unit it is in, and it cannot be re-pointed without
 * editing the layout. A token is resolved against the theme, so the same
 * document drawn through two themes takes each theme's own answer.
 *
 * @typedef {object} ThemeShape
 * @property {'rectangle' | 'line'} form
 * @property {string} curve A key of the theme's `curves`.
 */

/**
 * The type stack, as the numbers a width is computed from.
 *
 * The family is a stack rather than a face name on purpose - **The page's
 * face** in `DESIGN_LANGUAGE.md` gives the reason, and **The faces are not
 * named** is why the artwork's own face is not claimed here.
 *
 * @typedef {object} ThemeStack
 * @property {string[]} family The font families a rendered sheet asks for, most preferred first.
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
 * A font stack as the list of families it names, most preferred first.
 *
 * The stack is a **list** on a theme and a comma separated string in CSS, and
 * the two directions are {@link familyList} and {@link familyCss}. Which one a
 * field holds is not arbitrary: a list is what a caller can add a fallback to
 * or read the first entry off, and a string is what the renderer has to write.
 * Keeping the list as the model's form is what lets a rendered sheet report
 * which family it asked for rather than reporting the whole stack and leaving
 * the reader to parse it back apart.
 *
 * Quotes are stripped, because a family in a CSS stack is quoted when its name
 * has a space in it and that quoting is the string form's business rather than
 * part of the name.
 *
 * @param {string | string[]} value
 * @returns {string[]}
 */
export function familyList(value) {
  const parts = Array.isArray(value) ? value : String(value).split(",");
  return parts
    .map((one) => String(one).trim().replace(/^"(.*)"$|^'(.*)'$/, "$1$2").trim())
    .filter((one) => one.length > 0);
}

/**
 * A font stack as the string a renderer writes, quoting only what needs it.
 *
 * `familyCss(familyList(x))` is `x` for every stack this repository records,
 * which is the property that let the stack become a list without a single
 * glyph of committed output moving.
 *
 * @param {string | string[]} families
 * @returns {string}
 */
export function familyCss(families) {
  return familyList(families)
    .map((one) => (/^[A-Za-z][\w-]*$/.test(one) ? one : JSON.stringify(one)))
    .join(", ");
}

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
      // A list rather than the CSS string the face carries, so a caller adds a
      // fallback by pushing onto it and a renderer asks for the whole stack by
      // joining it. `familyCss` is the join, and it reproduces the recorded
      // string exactly.
      family: familyList(face.fontFamily),
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
    // The record gives one curve - `RADIUS`, small because the mark is square -
    // so the table names that one and the square corner every structural region
    // of the eleven is actually drawn with. A second curve is a caller's to add,
    // which is the whole point of its being a table rather than a figure.
    curves: { square: 0, display: language.radius },
    shapes: {
      block: { form: "rectangle", curve: "square" },
      display: { form: "rectangle", curve: "display" },
      bar: { form: "line", curve: "square" },
    },
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
        family: {
          type: "array",
          notEmpty: true,
          values: { type: "string", notEmpty: true },
          message: "must be a list of font family names, most preferred first",
        },
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
    // Records rather than objects with named fields, which is the opposite of
    // the choice {@link palette} makes one field up, and for the opposite
    // reason: a palette is a closed set of roles the renderer looks up, while
    // these are tables a caller extends. The cost of a record is that it
    // validates whatever keys it is given and so cannot require one, which is
    // why {@link CURVE_TOKENS} and {@link SHAPE_TOKENS} are checked after the
    // schema instead - the same place a shape's curve name is checked, for the
    // same reason.
    curves: { type: "record", notEmpty: true, values: { type: "number", min: 0 } },
    shapes: {
      type: "record",
      notEmpty: true,
      values: {
        type: "object",
        label: "shape token",
        fields: {
          form: { type: "string", oneOf: SHAPE_FORMS },
          curve: { type: "string", notEmpty: true },
        },
      },
    },
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
 * The one cross reference is checked after the schema rather than inside it,
 * for the reason `readLayout` gives for doing the same: a schema node sees its
 * own value and not the theme around it, so a shape naming a curve the table
 * does not have is a well formed shape and a broken theme, and only the whole
 * object can tell.
 *
 * @param {SheetTheme} theme
 * @returns {SheetTheme}
 */
export function readTheme(theme) {
  assertValid(theme, THEME_SCHEMA, "theme");
  /** @type {import('./schema.mjs').SchemaError[]} */
  const errors = [];
  for (const token of CURVE_TOKENS) {
    if (Object.hasOwn(theme.curves, token)) continue;
    errors.push({ path: `theme.curves.${token}`, message: "must be a number, and is absent" });
  }
  for (const token of SHAPE_TOKENS) {
    if (Object.hasOwn(theme.shapes, token)) continue;
    errors.push({ path: `theme.shapes.${token}`, message: "must be a shape token, and is absent" });
  }
  for (const [name, shape] of Object.entries(theme.shapes)) {
    if (Object.hasOwn(theme.curves, shape.curve)) continue;
    errors.push({
      path: `theme.shapes.${name}.curve`,
      message: `names no curve of this theme. It has ${Object.keys(theme.curves).join(", ")}`,
    });
  }
  if (errors.length > 0) {
    const error = new Error(
      `cheatsheet: there ${errors.length === 1 ? "is one problem" : `are ${errors.length} problems`} with the ` +
        `theme.\n${errors.map((one) => `  ${one.path}: ${one.message}`).join("\n")}`
    );
    error.errors = errors;
    throw error;
  }
  return theme;
}

/**
 * Whether a value has named fields: something to merge into rather than over.
 *
 * @param {any} value
 * @returns {boolean}
 */
function isFields(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * One object laid over another, field by field, as deep as both go.
 *
 * An array replaces rather than merges, which is the right answer for the one
 * array a theme carries: a font stack laid over another is the caller's stack,
 * not their families followed by the default's.
 *
 * A field the base does not have is carried through unchanged, deliberately.
 * The merge is not a filter - {@link THEME_SCHEMA} is closed, so a misspelt
 * field has to survive to be refused by name. Dropping it here would make a
 * partial theme the one input whose typos pass silently.
 *
 * @param {any} base
 * @param {any} over
 * @returns {any}
 */
function layer(base, over) {
  if (!isFields(over) || !isFields(base)) return over;
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const under = Object.hasOwn(base, key) ? base[key] : undefined;
    out[key] = isFields(value) && isFields(under) ? layer(under, value) : value;
  }
  return out;
}

/**
 * A partial theme merged over a whole one, then validated.
 *
 * This is what a caller wants nine times in ten: one colour moved, the rest of
 * the palette left where the design language put it. {@link readTheme} cannot
 * do it, and should not - it is the refusal that a theme missing a role is a
 * theme nothing can draw, and a palette of one colour reaching the renderer as
 * five `undefined` fills is exactly what it exists to stop.
 *
 * So the merge happens **before** the validation rather than instead of it. A
 * partial theme is completed from the base and then held to the whole schema,
 * which means a partial that *names* a field wrongly is still refused, by path:
 * omission is filled, and error is not.
 *
 * @param {Partial<SheetTheme>} partial
 * @param {SheetTheme} [base] What the partial is laid over. Defaults to the recorded theme.
 * @returns {SheetTheme}
 */
export function themeOver(partial, base = SHEET_THEME) {
  // Not an object at all is the schema's to report, in its own words, rather
  // than something to merge and then describe as a missing palette.
  if (!isFields(partial)) return readTheme(partial);
  // Cloned, so nothing the caller is handed back shares a nested object with
  // the recorded theme. A merged theme is theirs to keep and to modify.
  return readTheme(layer(structuredClone(base), partial));
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
 * Every pairing of ink and ground a theme and a layout imply, before anything
 * is drawn.
 *
 * Two sets, and together they are every run of type a composed sheet can carry:
 *
 * - **The fixed runs.** Each `text` slot of the layout names the role it is
 *   painted and the role behind it, so the pairing is the layout's statement
 *   and the colours are the theme's answer to it.
 * - **The code panel's six syntax roles**, measured on the ground of whichever
 *   slot holds the entries. They are not on any slot of their own - a line of
 *   the example is painted by its role rather than by its position - so they
 *   would be missed entirely by a walk over the slots.
 *
 * What it deliberately leaves out is the `boundary` floor and the structural
 * fills it would govern, and the recorded sheet is the reason. The green spine,
 * the divider and the four flanking bars reach 2.80:1 on the sheets' white,
 * under the 3:1 boundary floor, and **The one place the sheets break the site's
 * own rule** in `DESIGN_LANGUAGE.md` records that as a deliberate reading
 * rather than a defect: on a white ground the green is a **fill**, and only
 * text that has to be read takes the darker green. A boundary rejection here
 * would therefore refuse the eleven sheets the floors were measured off.
 *
 * @param {SheetTheme} theme
 * @param {import('./layout.mjs').SheetLayout} layout
 * @returns {import('./contrast.mjs').Pairing[]}
 */
export function themePairings(theme, layout) {
  /** @type {import('./contrast.mjs').Pairing[]} */
  const pairings = [];
  for (const slot of layout.slots) {
    if (slot.draw !== "text" || slot.paint === undefined || slot.ground === undefined) continue;
    pairings.push({
      name: slot.name,
      ink: paintOf(theme, slot.paint, `the ${slot.name} slot`),
      ground: paintOf(theme, slot.ground, `the ground under the ${slot.name} slot`),
    });
  }
  for (const slot of layout.slots) {
    if (slot.holds !== "entries" || slot.paint === undefined) continue;
    const ground = paintOf(theme, slot.paint, `the ${slot.name} slot`);
    for (const role of SYNTAX_ROLES) {
      pairings.push({ name: `${slot.name}/${role}`, ink: theme.syntax[role], ground });
    }
  }
  return pairings;
}

/**
 * Every pairing {@link themePairings} names, measured as it would be drawn.
 *
 * Measured **after** the one substitution the design language nominates, which
 * is what keeps the recorded theme passing: its green reaches 2.80:1 on white,
 * and `readableInk` swaps the darker green in for any run of it that has to be
 * read. Measuring the role as declared rather than as drawn would report a
 * failure the composition does not have.
 *
 * @param {SheetTheme} theme
 * @param {import('./layout.mjs').SheetLayout} layout
 * @returns {import('./contrast.mjs').MeasuredPairing[]}
 */
export function readableRoles(theme, layout) {
  const nominated = { colors: theme.colors, contrast: theme.contrast };
  const drawn = themePairings(theme, layout).map((pairing) => ({
    ...pairing,
    ink: readableInk(pairing.ink, pairing.ground, nominated),
  }));
  return checkPairings(drawn, theme.contrast.text);
}

/**
 * Refuses a theme whose type cannot be read on the ground the layout puts it on.
 *
 * **The half of the colour work that was missing.** {@link resolvePalette}
 * resolves every role to a concrete value and the schema refuses a colour the
 * renderer cannot read, so a theme whose palette is nonsense never composed.
 * A theme whose palette is *legible as colour and illegible as type* did: the
 * composition measured what it drew, set `contrastHolds` to `false`, wrote a
 * note, and handed back a finished sheet nobody could read. That is the right
 * answer for a run the composition had to give way on and the wrong one for a
 * theme, which is an input and can simply be refused.
 *
 * So the rejection is up front and the measurement stays. They answer different
 * questions: this one asks whether the theme's roles can be read on the grounds
 * this layout pairs them with, and `variation.contrast` asks what the sheet
 * actually drew - which includes every token the accent reader coloured and
 * every ink `readableInk` substituted.
 *
 * @param {SheetTheme} theme
 * @param {import('./layout.mjs').SheetLayout} layout
 * @returns {import('./contrast.mjs').MeasuredPairing[]} Every pairing, measured, so a caller can show the evidence.
 */
export function assertReadable(theme, layout) {
  const measured = readableRoles(theme, layout);
  const under = measured.filter((pairing) => !pairing.holds);
  if (under.length === 0) return measured;
  const lines = under.map(
    (pairing) =>
      `  ${pairing.name}: ${pairing.ink} on ${pairing.ground} reaches ` +
      `${pairing.ratio.toFixed(2)}:1`
  );
  throw new Error(
    `cheatsheet: the ${JSON.stringify(theme.name)} theme sets ` +
      `${under.length === 1 ? "one run" : `${under.length} runs`} under the ` +
      `${theme.contrast.text}:1 text floor it records, on the grounds the ` +
      `${JSON.stringify(layout.name)} layout pairs them with.\n` +
      lines.join("\n") +
      `\nEach is a role pairing rather than a run the composition had to give way ` +
      `on, so the sheet would compose and be unreadable.`
  );
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
 * **One limit, stated because it is invisible otherwise.** `spacing.step` and
 * `spacing.tokens` are written through, and changing them moves nothing. Every
 * position the record derives from a token - the spine's
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
 * **The `display` curve is not in that company**, and it is worth saying so
 * because it used to be. `radius` was a figure the theme carried and nothing
 * read, so writing it back here moved nothing; the curve tokens changed that.
 * `curveOf` reads `curves.display` off the theme for any slot shaped
 * `display` and `placeSlots` writes it as that slot's `rx`, so moving the
 * curve moves the corner. No slot of the recorded layout names the `display`
 * shape, which is why the committed SVG does not move - not because nothing
 * reads the figure.
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
    radius: theme.curves.display,
    rules: {
      ...base.rules,
      upper: { ...base.rules.upper, height: theme.strokes.rules.upper },
      lower: { ...base.rules.lower, height: theme.strokes.rules.lower },
    },
  };
}
