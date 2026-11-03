// The cheatsheet layout model: a named composition, the grid it is built on,
// and the slots a section may occupy.
//
// ## What a layout is here
//
// Three things, and the order matters because each is read off the one before
// it:
//
// 1. **A grid.** Rows down the canvas and columns across it, which are the
//    bands and divisions **Composition regions** in `DESIGN_LANGUAGE.md`
//    measured off the eleven sheets.
// 2. **Slots.** A named region of that grid, with what it is drawn as and what
//    it may hold. A slot is where the layout stops being a grid and starts
//    being a composition: it says that the band at row `code` and column
//    `panel` is a navy fill that carries the example, and that the band at row
//    `divider` is a green bar that carries nothing.
// 3. **A name.** `sheet` is the only one the record supports, because the
//    eleven sheets are one composition. A second layout is a file, not a
//    branch in here, which is what `tools/cheatsheet.mjs --layout <path>` is
//    for.
//
// ## Why this is data and not the code it replaces
//
// Every figure below was in `compose.mjs` already, as arguments to a
// `composition.rect` call written out by hand. Six of those calls drew the
// structure of the sheet and five more set its fixed runs of text, and the
// coordinates were computed inline at each one - so moving the spine meant
// finding the spine's `rect` call, and knowing that the spine starts a
// `step-4` above the band it runs beside meant reading the comment above it.
//
// As data, the same six are a list that can be read, counted, checked against
// the design language, handed to a caller and replaced by one. The mapping
// below is what turns the list back into element calls, and it is the whole of
// what draws the sheet's structure now.
//
// **Replaced by one** is the part worth being concrete about, because it is
// what makes the model more than a tidier spelling. A layout is a plain object
// with no behaviour, so a caller composes to a different structure by handing
// over a different object, with nothing installed and no code of this
// repository's edited. That is the contract `tools/cheatsheet.mjs --layout`
// was holding open.
//
// ## The three element kinds, and why one of them is unused
//
// A slot is drawn as a `rect`, a `line` or a `text`, which are three of the
// drawing surface's element builders. The recorded sheet uses two: every
// structural slot on it is a filled rectangle, and every run on it is text.
// Nothing on the eleven is a stroked line - the divider and the two flanking
// rules are measured bars, 48, 45 and 20 px tall on a 3600 px canvas, and a
// bar with a height is a rectangle.
//
// `stroke` is supported anyway, and that is a deliberate choice rather than an
// oversight. A layout is the thing a caller replaces, so the kinds it offers
// are a surface rather than an inventory of what the eleven happen to use, and
// a hairline is the obvious thing a second composition wants that this one does
// not have. `tools/test-sheet-models.mjs` composes a layout that declares one,
// so the kind is exercised by a test rather than only offered.
//
// ## Paint order is part of the layout
//
// Slots carry a `stage`, and the mapping draws one stage at a time. That is
// not decoration: the drawing surface paints in the order elements are added,
// so the grounds have to be down before any run of text is set on them, and
// the mark square has to be drawn only in the case where the footer asset is
// absent. A layout that listed its slots in one flat order could not express
// either, and a composition that drew them in list order would paint the
// masthead over its own wordmark.

import { assertValid } from "./schema.mjs";
import { SHEET_LANGUAGE } from "./language.mjs";

/** The stages a sheet is painted in, in order. */
export const STAGES = ["ground", "rule", "mark", "run"];

/**
 * The kinds of content a slot can hold, which is what a section asks for.
 *
 * `listing` joined the three on 2026.11.02, when a formal section gained
 * `lines` beside `entries`. The two are different content and ask for
 * different things - entries are a term and a signature each, a listing is a
 * worked example whose indentation means a nesting level - even where one
 * layout answers both with the same slot, which is what this sheet's own
 * `code-panel` does.
 */
export const SLOT_KINDS = ["heading", "entries", "listing", "brand"];

/**
 * The kinds a **section** may ask for, which is not every kind a slot holds.
 *
 * A slot holding `heading` or `brand` is filled from a **named field** of the
 * document - the title and the subtitle on this sheet's two heading slots, the
 * brand assets on its footer lockup - so a section asking for either kind is
 * asking to be put somewhere nothing reads a section from. That is refused by
 * name in {@link slotForSection} rather than drawn in the panel anyway, which
 * is what it was until 2026.11.03.
 *
 * The two that are left are the two {@link rowsFor} projects to: entries become
 * rows and a listing already is rows.
 */
export const SECTION_KINDS = ["entries", "listing"];

/**
 * A row of the grid: a band across the full width of the canvas.
 *
 * @typedef {object} LayoutRow
 * @property {string} name
 * @property {number} y
 * @property {number} height
 */

/**
 * A column of the grid: a division down the full height of the canvas.
 *
 * @typedef {object} LayoutColumn
 * @property {string} name
 * @property {number} x
 * @property {number} width
 */

/**
 * A named region of the grid, and what becomes of it.
 *
 * `row` and `column` are how a slot is placed, and either may be absent: a
 * slot with no column spans the canvas, and a slot with no row does too. A
 * slot carrying a `box` is placed by that instead, which is what the four
 * flanking rules need - they sit inside the heading band at measured offsets
 * and on no column at all.
 *
 * @typedef {object} LayoutSlot
 * @property {string} name The element name a drawn slot carries into the composition.
 * @property {'fill' | 'stroke' | 'text' | 'asset' | 'region'} draw
 * @property {'ground' | 'rule' | 'mark' | 'run'} stage When it is painted.
 * @property {string} [row]
 * @property {string} [column]
 * @property {{ x: number, y: number, width: number, height: number }} [box] Explicit geometry, off the grid.
 * @property {{ top?: number, right?: number, bottom?: number, left?: number }} [bleed] Extends the slot past its row and column.
 * @property {string} [paint] A palette role of the theme, for a slot that is drawn.
 * @property {string} [shape] A shape token of the theme, for a slot that is drawn. Defaults to `block`.
 * @property {string} [ground] The palette role behind it, for the contrast measurement.
 * @property {number} [weight] Stroke weight, for a `stroke` slot.
 * @property {string | string[]} [holds] The kind of content a section may put here, or the kinds.
 * @property {string} [size] A role of the theme's type scale, for a `text` slot.
 * @property {number} [baseline] Where a run of text is placed from.
 * @property {number} [left] Where a left aligned run starts.
 * @property {number} [measure] How wide a run may be before it is stepped down.
 * @property {'left' | 'centre'} [align]
 * @property {string} [reserve] A slot whose width and gap come out of this one's measure.
 * @property {number} [gap] For an asset slot, the space between it and the run beside it.
 */

/**
 * A composition: a grid, and the slots on it.
 *
 * @typedef {object} SheetLayout
 * @property {string} name
 * @property {{ width: number, height: number }} canvas
 * @property {{ step: number, rows: LayoutRow[], columns: LayoutColumn[] }} grid
 * @property {LayoutSlot[]} slots
 */

/**
 * The layout a design language records.
 *
 * Derived rather than restated, for the reason `theme.mjs` gives for doing the
 * same: `language.mjs` is the transcription of `DESIGN_LANGUAGE.md`, and a
 * layout file with the coordinates typed into it would be a second
 * transcription that could disagree with the first.
 *
 * @param {typeof SHEET_LANGUAGE} language
 * @param {{ name?: string }} [options]
 * @returns {SheetLayout}
 */
export function layoutFor(language, options = {}) {
  const { bands, divisions, canvas, rules, runs, insets, markSquare } = language;
  const slots = language.brandSlots ?? SHEET_LANGUAGE.brandSlots;

  // The two measures a run is fitted to that are not a region's own width.
  // Both are the canvas less what sits either side of the run, and both are
  // computed here rather than in the composition so a replaced layout can
  // state them instead of having them derived around it.
  const leadInLeft = divisions.spine.x + divisions.spine.width + insets.leadInFromSpine;
  const followLeft = markSquare.x + markSquare.width + insets.followLineFromMark;
  const toRightMargin = (left) => canvas - left - divisions.rightMargin.width;

  /** One of the four bars flanking the title, which sit on no column. */
  const flank = (key, side) => ({
    name: `rule-${key}-${side}`,
    draw: "fill",
    stage: "rule",
    row: "heading",
    paint: "green",
    shape: "block",
    box: {
      x: side === "left" ? 0 : canvas - rules.width,
      y: rules[key].y,
      width: rules.width,
      height: rules[key].height,
    },
  });

  return {
    name: options.name ?? "sheet",
    canvas: { width: canvas, height: canvas },
    grid: {
      step: language.step,
      rows: Object.entries(bands).map(([name, band]) => ({ name, y: band.y, height: band.height })),
      columns: Object.entries(divisions).map(([name, division]) => ({
        name,
        x: division.x,
        width: division.width,
      })),
    },
    slots: [
      // --- The grounds, which go down before anything is set on them -------
      { name: "masthead", draw: "fill", stage: "ground", row: "masthead", paint: "navy", shape: "block" },
      {
        name: "code-panel",
        draw: "fill",
        stage: "ground",
        row: "code",
        column: "panel",
        paint: "navy",
        shape: "block",
        // Both, because on this sheet they land in the same place: a listing
        // is already rows, and entries become rows through `rowsFor`. A layout
        // that set the descriptions in a margin would name two slots here
        // instead, which is the whole reason a section asks for a kind rather
        // than for a slot.
        holds: ["entries", "listing"],
      },
      // The spine starts a `step-4` above the panel it runs beside and ends
      // with it, which is the one vertical use of that token on the sheet.
      {
        name: "spine",
        draw: "fill",
        stage: "ground",
        row: "code",
        column: "spine",
        paint: "green",
        shape: "block",
        bleed: { top: insets.spineTop },
      },
      { name: "divider", draw: "fill", stage: "ground", row: "divider", paint: "green", shape: "block" },

      // --- The four bars flanking the title --------------------------------
      flank("upper", "left"),
      flank("upper", "right"),
      flank("lower", "left"),
      flank("lower", "right"),

      // --- The mark square, drawn only where the footer asset is absent ----
      { name: "mark-square", draw: "fill", stage: "mark", row: "footer", paint: "navy", shape: "block", box: { ...markSquare } },

      // --- The two places an asset is placed rather than shapes drawn ------
      {
        name: "masthead-mark",
        draw: "asset",
        stage: "run",
        row: "masthead",
        box: { x: 0, y: slots.logo.top, width: slots.logo.width, height: slots.logo.height },
        gap: slots.logo.gap,
      },
      { name: "footer-lockup", draw: "asset", stage: "run", row: "footer", box: { ...slots.footer }, holds: "brand" },

      // --- The five fixed runs ---------------------------------------------
      {
        name: "wordmark",
        draw: "text",
        stage: "run",
        row: "masthead",
        size: "masthead",
        paint: "white",
        ground: "navy",
        baseline: runs.wordmark.baseline,
        measure: canvas - insets.mastheadPadding * 2,
        align: "centre",
        reserve: "masthead-mark",
      },
      {
        name: "title",
        draw: "text",
        stage: "run",
        row: "heading",
        size: "title",
        paint: "heading",
        ground: "white",
        baseline: runs.title.baseline,
        measure: rules.measure,
        align: "centre",
        holds: "heading",
      },
      {
        name: "subtitle",
        draw: "text",
        stage: "run",
        row: "heading",
        // The subtitle and the lead-in are the same size as each other, cap
        // for cap and stem for stem, which is why they share one role.
        size: "leadIn",
        paint: "heading",
        ground: "white",
        baseline: runs.subtitle.baseline,
        measure: rules.measure,
        align: "centre",
        holds: "heading",
      },
      {
        name: "lead-in",
        draw: "text",
        stage: "run",
        row: "heading",
        size: "leadIn",
        paint: "heading",
        ground: "white",
        baseline: runs.leadIn.baseline,
        left: leadInLeft,
        measure: toRightMargin(leadInLeft),
        align: "left",
      },
      {
        name: "follow-line",
        draw: "text",
        stage: "mark",
        row: "footer",
        size: "followLine",
        paint: "navy",
        ground: "white",
        baseline: runs.followLine.baseline,
        left: followLeft,
        measure: toRightMargin(followLeft),
        align: "left",
      },
    ],
  };
}

/**
 * The layout the eleven sheets are composed to.
 *
 * @type {SheetLayout}
 */
export const SHEET_LAYOUT = layoutFor(SHEET_LANGUAGE);

/**
 * Whether a slot's `holds` names a kind of content, or a set of them.
 *
 * A string or an array of strings, which is the shape the vocabulary has no
 * keyword for - so it goes through `any` and a `check`, the way a document's
 * `seed` does. An empty array is refused rather than read as "holds nothing",
 * because a slot that holds nothing says so by omitting the field, and an
 * empty list is far more likely to be a filter that matched none of what its
 * author meant.
 *
 * @param {any} value
 * @returns {string | undefined}
 */
function holdsKinds(value) {
  const kinds = Array.isArray(value) ? value : [value];
  if (kinds.length === 0) return "must name at least one kind, or be absent";
  const named = kinds.map((kind) => JSON.stringify(kind)).join(", ");
  if (!kinds.every((kind) => typeof kind === "string" && SLOT_KINDS.includes(kind))) {
    return `must name kinds out of ${SLOT_KINDS.map((kind) => JSON.stringify(kind)).join(", ")}, and names ${named}`;
  }
  return undefined;
}

/**
 * The layout's schema.
 *
 * @type {import('./schema.mjs').Schema}
 */
export const LAYOUT_SCHEMA = {
  name: "layout",
  label: "cheatsheet layout",
  type: "object",
  fields: {
    name: { type: "string", notEmpty: true },
    canvas: {
      type: "object",
      label: "canvas",
      fields: { width: { type: "number", min: 1 }, height: { type: "number", min: 1 } },
    },
    grid: {
      type: "object",
      label: "grid",
      fields: {
        step: { type: "number", min: 1 },
        rows: {
          type: "array",
          notEmpty: true,
          values: {
            type: "object",
            label: "row",
            fields: {
              name: { type: "string", notEmpty: true },
              y: { type: "number", min: 0 },
              height: { type: "number", min: 0 },
            },
          },
        },
        columns: {
          type: "array",
          notEmpty: true,
          values: {
            type: "object",
            label: "column",
            fields: {
              name: { type: "string", notEmpty: true },
              x: { type: "number", min: 0 },
              width: { type: "number", min: 0 },
            },
          },
        },
      },
    },
    slots: {
      type: "array",
      notEmpty: true,
      values: {
        type: "object",
        label: "slot",
        fields: {
          name: { type: "string", notEmpty: true },
          draw: { type: "string", oneOf: ["fill", "stroke", "text", "asset", "region"] },
          stage: { type: "string", oneOf: STAGES },
          row: { type: "string", optional: true, notEmpty: true },
          column: { type: "string", optional: true, notEmpty: true },
          box: {
            type: "object",
            optional: true,
            label: "box",
            fields: {
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number", min: 0 },
              height: { type: "number", min: 0 },
            },
          },
          bleed: {
            type: "object",
            optional: true,
            label: "bleed",
            fields: {
              top: { type: "number", optional: true, min: 0 },
              right: { type: "number", optional: true, min: 0 },
              bottom: { type: "number", optional: true, min: 0 },
              left: { type: "number", optional: true, min: 0 },
            },
          },
          paint: { type: "string", optional: true, notEmpty: true },
          shape: { type: "string", optional: true, notEmpty: true },
          ground: { type: "string", optional: true, notEmpty: true },
          weight: { type: "number", optional: true, min: 0 },
          holds: { type: "any", optional: true, check: holdsKinds },
          size: { type: "string", optional: true, notEmpty: true },
          baseline: { type: "number", optional: true },
          left: { type: "number", optional: true },
          measure: { type: "number", optional: true, min: 0 },
          align: { type: "string", optional: true, oneOf: ["left", "centre"] },
          reserve: { type: "string", optional: true, notEmpty: true },
          gap: { type: "number", optional: true, min: 0 },
        },
      },
    },
  },
};

/**
 * Validates a layout and hands it back.
 *
 * The cross references are checked after the schema rather than inside it,
 * because a schema node sees its own value and not the document around it: a
 * slot naming a row the grid does not have is a well formed slot and a broken
 * layout, and only the whole object can tell.
 *
 * @param {SheetLayout} layout
 * @returns {SheetLayout}
 */
export function readLayout(layout) {
  assertValid(layout, LAYOUT_SCHEMA, "layout");
  const rows = new Set(layout.grid.rows.map((row) => row.name));
  const columns = new Set(layout.grid.columns.map((column) => column.name));
  const names = new Set(layout.slots.map((slot) => slot.name));
  /** @type {import('./schema.mjs').SchemaError[]} */
  const errors = [];
  layout.slots.forEach((slot, index) => {
    const at = `layout.slots[${index}]`;
    if (slot.row !== undefined && !rows.has(slot.row)) {
      errors.push({ path: `${at}.row`, message: `names no row of the grid. It has ${[...rows].join(", ")}` });
    }
    if (slot.column !== undefined && !columns.has(slot.column)) {
      errors.push({
        path: `${at}.column`,
        message: `names no column of the grid. It has ${[...columns].join(", ")}`,
      });
    }
    if (slot.reserve !== undefined && !names.has(slot.reserve)) {
      errors.push({ path: `${at}.reserve`, message: `names no slot of this layout` });
    }
    if (slot.draw === "stroke" && slot.weight === undefined) {
      errors.push({ path: `${at}.weight`, message: "is required for a slot drawn as a stroke" });
    }
    if ((slot.draw === "fill" || slot.draw === "stroke") && slot.paint === undefined) {
      errors.push({ path: `${at}.paint`, message: `is required for a slot drawn as a ${slot.draw}` });
    }
  });
  if (errors.length > 0) {
    const error = new Error(
      `cheatsheet: there ${errors.length === 1 ? "is one problem" : `are ${errors.length} problems`} with the ` +
        `layout.\n${errors.map((one) => `  ${one.path}: ${one.message}`).join("\n")}`
    );
    error.errors = errors;
    throw error;
  }
  return layout;
}

/**
 * A slot by name, or an error naming what the layout does have.
 *
 * @param {SheetLayout} layout
 * @param {string} name
 * @returns {LayoutSlot}
 */
export function slotNamed(layout, name) {
  const found = layout.slots.find((slot) => slot.name === name);
  if (found) return found;
  throw new Error(
    `cheatsheet: the ${JSON.stringify(layout.name)} layout has no slot named ${JSON.stringify(name)}. ` +
      `It has ${layout.slots.map((slot) => slot.name).join(", ")}`
  );
}

/**
 * Every slot that may hold a given kind of content, in layout order.
 *
 * This is what a section's `slot` is resolved against: a section asks for
 * somewhere that holds entries, or a listing, and the layout answers with the
 * slot it keeps for that. A document never names a slot, which is what keeps
 * it independent of the layout it is drawn to.
 *
 * A slot may hold more than one kind, so the match is membership rather than
 * equality. On this sheet's own layout the code panel holds both `entries` and
 * `listing`, because entries become rows and a listing already is rows.
 *
 * @param {SheetLayout} layout
 * @param {string} kind
 * @returns {LayoutSlot[]}
 */
export function slotsHolding(layout, kind) {
  return layout.slots.filter((slot) =>
    Array.isArray(slot.holds) ? slot.holds.includes(kind) : slot.holds === kind
  );
}

/**
 * The kind of slot a section asks for.
 *
 * A section that names one has said what it wants. One that names none takes
 * the kind its own content already is, which is why the field is optional: a
 * document whose sections are all entries, or all listings, never has to say
 * so twice.
 *
 * @param {import('./document.mjs').SheetSection} section
 * @returns {string}
 */
export function kindOfSection(section) {
  return section.slot ?? (section.lines ? "listing" : "entries");
}

/**
 * The slot a section is placed in, or a refusal naming why there is none.
 *
 * This is where a section's `slot` stops being a validated string and starts
 * deciding something. Until 2026.11.03 the field was held to "a non-empty
 * string" by the document schema and read by nothing on the composition path,
 * so `{ slot: "brand", entries: [...] }` validated, composed, and drew its
 * entries in the code panel with no refusal and no note - the document said one
 * thing and the drawing did another, which is the one failure a model whose
 * whole purpose is to be independent of the layout cannot afford.
 *
 * Four refusals, and each is a different mistake:
 *
 * - **A kind that is no kind at all**, which is a misspelling rather than a
 *   misplacement and says so, listing {@link SLOT_KINDS}.
 * - **A real kind no section may ask for.** A `heading` or `brand` slot is
 *   filled from a named field of the document, so asking for one is asking for
 *   somewhere a section is never read from. Refused against
 *   {@link SECTION_KINDS}, not against the layout, because the answer is the
 *   same for every layout there will ever be.
 * - **A kind this layout holds no slot of.** A layout with no listing slot
 *   cannot set a listing, and the honest answer is to say which kinds it does
 *   hold rather than to draw the rows somewhere that was not asked for.
 * - **A kind held by more than one slot.** The composition places one row
 *   stream, so a second slot of the same kind is a choice nothing here is able
 *   to make. It cannot happen on this sheet's layout - `code-panel` is the only
 *   slot holding either kind - and refusing says so out loud rather than
 *   letting a layout grow a second panel that silently never fills.
 *
 * @param {SheetLayout} layout
 * @param {import('./document.mjs').SheetSection} section
 * @param {string} [at] The path of the section, for the message.
 * @returns {LayoutSlot}
 */
export function slotForSection(layout, section, at = "document.section") {
  const kind = kindOfSection(section);
  const named = JSON.stringify(kind);
  const mayAsk = `A section may ask for ${SECTION_KINDS.map((one) => JSON.stringify(one)).join(" or ")}`;
  if (!SLOT_KINDS.includes(kind)) {
    // Not a kind at all, which is a different mistake from asking for a real
    // kind a section may not have, and reads as one if both share a message.
    throw new Error(
      `cheatsheet: ${at}.slot asks for ${named}, which is no kind of slot. The kinds are ` +
        `${SLOT_KINDS.join(", ")}. ${mayAsk}`
    );
  }
  if (!SECTION_KINDS.includes(kind)) {
    throw new Error(
      `cheatsheet: ${at}.slot asks for ${named}, which a layout fills from the document's own ` +
        `fields rather than from a section. ${mayAsk}`
    );
  }
  const holding = slotsHolding(layout, kind);
  if (holding.length === 0) {
    // Every kind the layout does hold, deduplicated and in layout order, so a
    // caller is told what to ask for instead of what not to.
    const held = [...new Set(layout.slots.flatMap((slot) => (slot.holds === undefined ? [] : [slot.holds].flat())))];
    throw new Error(
      `cheatsheet: ${at}.slot asks for ${named}, and the ${JSON.stringify(layout.name)} layout holds ` +
        // A layout where no slot names a kind at all is a real state - every
        // layout written before `holds` existed is one - and `Its slots hold `
        // with nothing after it reads as a bug in the message rather than as
        // the answer.
        (held.length === 0 ? "nothing: none of its slots names a kind" : `no slot of that kind. Its slots hold ${held.join(", ")}`)
    );
  }
  if (holding.length > 1) {
    throw new Error(
      `cheatsheet: ${at}.slot asks for ${named}, and the ${JSON.stringify(layout.name)} layout holds ` +
        `${holding.length} slots of that kind - ${holding.map((slot) => slot.name).join(", ")}. ` +
        `A composition places one stream of rows, so which of them a section goes in is not a ` +
        `choice this layer can make for it`
    );
  }
  return holding[0];
}

/**
 * Where a slot is, in canvas coordinates.
 *
 * A `box` wins over the grid, a named row or column narrows the canvas, and a
 * bleed extends the result. The order is what lets the spine be "the code row,
 * the spine column, and a `step-4` above both".
 *
 * @param {SheetLayout} layout
 * @param {LayoutSlot} slot
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function boxOf(layout, slot) {
  const row = slot.row === undefined ? undefined : layout.grid.rows.find((one) => one.name === slot.row);
  const column =
    slot.column === undefined ? undefined : layout.grid.columns.find((one) => one.name === slot.column);
  const base = slot.box ?? {
    x: column ? column.x : 0,
    y: row ? row.y : 0,
    width: column ? column.width : layout.canvas.width,
    height: row ? row.height : layout.canvas.height,
  };
  const bleed = slot.bleed ?? {};
  const top = bleed.top ?? 0;
  const left = bleed.left ?? 0;
  return {
    x: base.x - left,
    y: base.y - top,
    width: base.width + left + (bleed.right ?? 0),
    height: base.height + top + (bleed.bottom ?? 0),
  };
}

/**
 * The colour a slot's role resolves to in a theme.
 *
 * Read as an own property, the guard this layer carries everywhere a role name
 * indexes a palette: a slot painted `constructor` otherwise finds a function
 * on `Object.prototype` and hands it to the renderer as a fill.
 *
 * @param {import('./theme.mjs').SheetTheme} theme
 * @param {string} role
 * @param {string} where
 * @returns {string}
 */
export function paintOf(theme, role, where) {
  for (const group of ["colors", "syntax"]) {
    if (Object.hasOwn(theme[group], role)) return theme[group][role];
  }
  throw new Error(
    `cheatsheet: ${where} is painted ${JSON.stringify(role)}, which is no role of the ` +
      `${JSON.stringify(theme.name)} theme. It has ` +
      // Both halves, because both are searched above. Naming only the palette
      // would tell a caller who mistyped a syntax role that syntax roles are
      // not paintable, which is the opposite of what this function does.
      `${[...Object.keys(theme.colors), ...Object.keys(theme.syntax)].join(", ")}`
  );
}

/**
 * The form a shape token has to carry, per the way a slot is drawn.
 *
 * Two entries, because a rectangle and a line are the two things the drawing
 * surface makes and `fill` and `stroke` are how a slot asks for each. The map
 * is what makes a token's `form` load bearing rather than a label: without it
 * a slot could be drawn as a stroke while naming a token that describes a
 * rectangle, and nothing would say so.
 */
const FORM_FOR_DRAW = { fill: "rectangle", stroke: "line" };

/** The shape token a slot of each kind takes when it names none. */
const SHAPE_FOR_DRAW = { fill: "block", stroke: "bar" };

/**
 * The shape token a slot is drawn as, resolved against a theme.
 *
 * A slot naming none takes the token for the way it is drawn: `block` for a
 * fill, which is what every structural region of the eleven is, and `bar` for
 * a stroke. Those defaults are what let a layout written before shape tokens
 * existed go on drawing exactly what it drew, and they are the reason both are
 * tokens a theme has to name.
 *
 * A token whose `form` disagrees with the way the slot is drawn is refused. It
 * is the one cross reference between the two models that neither reader can
 * make alone: `readLayout` never sees a theme, and `readTheme` never sees a
 * layout, so the first moment both are in hand is here.
 *
 * @param {import('./theme.mjs').SheetTheme} theme
 * @param {LayoutSlot} slot
 * @returns {import('./theme.mjs').ThemeShape}
 */
export function shapeOf(theme, slot) {
  const name = slot.shape ?? SHAPE_FOR_DRAW[slot.draw] ?? "block";
  if (!Object.hasOwn(theme.shapes, name)) {
    throw new Error(
      `cheatsheet: the ${slot.name} slot is shaped ${JSON.stringify(name)}, which is no shape of ` +
        `the ${JSON.stringify(theme.name)} theme. It has ${Object.keys(theme.shapes).join(", ")}`
    );
  }
  const shape = theme.shapes[name];
  const wanted = FORM_FOR_DRAW[slot.draw];
  if (wanted !== undefined && shape.form !== wanted) {
    throw new Error(
      `cheatsheet: the ${slot.name} slot is drawn as a ${slot.draw}, which is a ${wanted}, but it ` +
        `is shaped ${JSON.stringify(name)} and that token is a ${shape.form}. A slot drawn as a ` +
        `${slot.draw} takes a shape whose form is ${JSON.stringify(wanted)}`
    );
  }
  return shape;
}

/**
 * The corner radius a slot is drawn with, in sheet pixels.
 *
 * Resolved through the shape token rather than read off the slot, which is the
 * whole of what makes a curve a **token**: the number lives in one place a
 * caller can move, and the same layout drawn through two themes takes each
 * theme's own answer.
 *
 * `readTheme` has already checked that every shape names a curve the theme
 * has, so the lookup here cannot miss on a validated theme. The guard is for
 * the recorded theme and a hand built one, neither of which goes through the
 * reader.
 *
 * @param {import('./theme.mjs').SheetTheme} theme
 * @param {LayoutSlot} slot
 * @returns {number}
 */
export function curveOf(theme, slot) {
  const { curve } = shapeOf(theme, slot);
  if (Object.hasOwn(theme.curves, curve)) return theme.curves[curve];
  throw new Error(
    `cheatsheet: the ${slot.name} slot is curved ${JSON.stringify(curve)}, which is no curve of ` +
      `the ${JSON.stringify(theme.name)} theme. It has ${Object.keys(theme.curves).join(", ")}`
  );
}

/**
 * Draws every slot of one stage onto a composition.
 *
 * This is the mapping the layout model exists for: a slot becomes a `rect` or
 * a `line` on the drawing surface, rather than a string of SVG assembled
 * somewhere. `text` and `asset` slots are not drawn here - both need something
 * the layout does not hold, the fitted size of a particular run or the asset
 * itself, so the composition draws them and reads their placement off the slot.
 *
 * @param {import('../napkin-sketch/graphic-design/index.js').Composition} composition
 * @param {object} config
 * @param {SheetLayout} config.layout
 * @param {import('./theme.mjs').SheetTheme} config.theme
 * @param {string} config.stage
 * @param {(slot: LayoutSlot) => boolean} [config.only] A last filter, for a slot drawn conditionally.
 * @returns {string[]} The names drawn, in the order they went down.
 */
export function placeSlots(composition, { layout, theme, stage, only }) {
  /** @type {string[]} */
  const drawn = [];
  for (const slot of layout.slots) {
    if (slot.stage !== stage) continue;
    if (slot.draw !== "fill" && slot.draw !== "stroke") continue;
    if (only && !only(slot)) continue;
    const box = boxOf(layout, slot);
    const paint = paintOf(theme, slot.paint, `the ${slot.name} slot`);
    if (slot.draw === "fill") {
      // `rx` only where the curve is one, so a square cornered slot writes the
      // attribute it always wrote - which is none. The committed SVG fixture is
      // byte for byte what it was, and that is the evidence the token did not
      // change the drawing.
      const curve = curveOf(theme, slot);
      composition.rect({
        name: slot.name,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        fill: paint,
        ...(curve > 0 ? { rx: curve } : {}),
      });
    } else {
      // Resolved for a stroke too, and the answer discarded: a line takes no
      // corner, so the only thing a stroke's shape token decides is whether it
      // agrees with the way the slot is drawn. `curveOf` makes that check for
      // every fill as a side effect of reading the curve, and without this one
      // a stroke slot shaped `block` would draw a line against a token
      // describing a rectangle - half the slots that have a shape going
      // unchecked by the only call that has both models in hand.
      shapeOf(theme, slot);
      // A stroke is drawn down the middle of its box, along whichever axis the
      // box is longer on. A layout declaring one has said where it goes by
      // giving it a thin box, which is how a rule is thought about.
      const horizontal = box.width >= box.height;
      composition.line({
        name: slot.name,
        x1: box.x,
        y1: horizontal ? box.y + box.height / 2 : box.y,
        x2: horizontal ? box.x + box.width : box.x,
        y2: horizontal ? box.y + box.height / 2 : box.y + box.height,
        stroke: paint,
        strokeWidth: slot.weight,
      });
    }
    drawn.push(slot.name);
  }
  return drawn;
}

/**
 * A formal document's sections, as the rows of code a panel slot carries.
 *
 * **This is the drawing decision the document model refuses to make**, and it
 * lives here because it is a layout's to make: a section becomes a comment row
 * naming it, and an entry becomes a comment row for its term and description
 * and a row of its own for its signature. Another layout could set the same
 * document in two columns, or put the descriptions in a margin, and nothing in
 * the document would change.
 *
 * The roles are the compact shape's own. A signature carries none, so a
 * document naming its `language` has it coloured token by token by the accent
 * reader, exactly as a hand written `code` array is.
 *
 * ## A listing section passes straight through
 *
 * A section carrying `lines` rather than `entries` is already rows - that is
 * what makes it a listing rather than a list - so the projection for one is
 * the identity, and the only work here is copying each line so a caller cannot
 * reach the document through the result.
 *
 * It is worth being plain about why that is not a shortcut. A projection is
 * the layout's to choose, and for a worked listing the only correct choice is
 * to leave it alone: its indentation means a nesting level and its per-line
 * role means a syntax colour, so a layout that re-wrapped it, re-indented it
 * or merged two of its lines would be changing what the document says rather
 * than how it is set. The freedom a layout has over entries is freedom the
 * document gave it by not saying; a listing says.
 *
 * ## The layout is optional, and what passing it buys
 *
 * Handed a layout, every section's `slot` is resolved against it through
 * {@link slotForSection} before any row is produced, so a section asking for
 * somewhere this layout cannot put it is refused by path rather than drawn in
 * the panel regardless. `composeSheet` always passes one, which is what makes
 * the field mean something on the composition path.
 *
 * Called without one, the projection is what it always was: rows, concatenated,
 * no slot resolved. That is the right default for the callers that have no
 * layout to resolve against - a search index, a table of contents, a test
 * asserting the projection itself - and it is why the parameter is second and
 * optional rather than required.
 *
 * @param {import('./document.mjs').CheatsheetDocument} doc
 * @param {SheetLayout} [layout] Resolves each section's slot kind when given.
 * @returns {import('./document.mjs').CodeLine[]}
 */
export function rowsFor(doc, layout) {
  /** @type {import('./document.mjs').CodeLine[]} */
  const rows = [];
  // Every section resolved before the first row is built, so a document with a
  // bad `slot` on its last section is refused whole rather than half projected.
  if (layout !== undefined) {
    (doc.sections ?? []).forEach((section, index) => {
      slotForSection(layout, section, `document.sections[${index}]`);
    });
  }
  (doc.sections ?? []).forEach((section, index) => {
    // A blank row between sections, and none before the first or after the
    // last. A blank row occupies its slot exactly like an inked one, which is
    // what the panel fill floor counts, so this is spacing that the floor can
    // see rather than spacing that leaves it short.
    if (index > 0) rows.push({ text: "" });
    if (section.title) rows.push({ text: `// ${section.title}`, role: "comment" });
    if (section.lines) {
      // Spread rather than pushed by reference: the caller's document is not
      // this function's to hand out a window onto, and the composition does
      // reach into a row to record what it drew.
      for (const line of section.lines) rows.push({ ...line });
      return;
    }
    for (const entry of section.entries ?? []) {
      const prose = entry.description ? `${entry.term} - ${entry.description}` : entry.term;
      rows.push({ text: `// ${prose}`, role: "comment" });
      if (entry.signature) rows.push({ text: entry.signature });
    }
  });
  return rows;
}
