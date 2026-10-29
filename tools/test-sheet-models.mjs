// The three models - document, theme and layout - under test.
//
// `tools/test-sheet-schema.mjs` beside this covers the validator on its own,
// against schemas that describe nothing in particular. This file is about the
// models themselves, and it asks four questions of them:
//
//   1. **Is the default the record?** Every figure in the default theme and the
//      recorded layout has to be the one `DESIGN_LANGUAGE.md` measured, reached
//      through `language.mjs` and `faces.mjs` rather than typed in again. A
//      model carrying its own copy of a measurement is a second record that can
//      disagree with the first, and the one rule the design language states
//      about itself is that it may not hold a number the artwork did not give.
//   2. **Does a replacement actually compose?** A model is a surface a caller
//      hands over, so handing over a changed one has to change the sheet. A
//      layout nothing reads is documentation, not a model.
//   3. **Does the mapping reach the drawing surface's builders?** A slot has to
//      become a `rect`, a `line` or a `text` on a composition. The recorded
//      sheet uses two of the three, so the third is composed here from a layout
//      written for the case - which is the test that keeps the kind honest
//      rather than merely offered.
//   4. **Is the document independent of the drawing?** The projection from
//      sections to rows belongs to the layout, and nothing in `document.mjs`
//      may decide that a section title is a comment row.
//
// Run with: node --test tools/test-sheet-models.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { composeSheet } from "../api/cheatsheet/compose.mjs";
import {
  entriesOf,
  isFormalDocument,
  readDocument,
  CODE_ROLES,
  DOCUMENT_SCHEMA,
  PROVISIONAL_SCHEMA,
} from "../api/cheatsheet/document.mjs";
import { SHEET_CONDENSATION, SHEET_FACE, TYPE_ROLES } from "../api/cheatsheet/faces.mjs";
import {
  boxOf,
  layoutFor,
  paintOf,
  placeSlots,
  readLayout,
  rowsFor,
  slotNamed,
  slotsHolding,
  SHEET_LAYOUT,
  STAGES,
} from "../api/cheatsheet/layout.mjs";
import { SHEET_LANGUAGE } from "../api/cheatsheet/language.mjs";
import {
  languageFor,
  readTheme,
  resolvePalette,
  themeFrom,
  PALETTE_ROLES,
  SHEET_THEME,
  SYNTAX_ROLES,
  TYPE_SCALE_ROLES,
} from "../api/cheatsheet/theme.mjs";
import { createComposition } from "../api/napkin-sketch/api/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const designLanguage = readFileSync(join(root, "DESIGN_LANGUAGE.md"), "utf8");

/** A formal document, small enough to read and big enough to have structure. */
const FORMAL = {
  title: "Splicing Array Elements",
  subtitle: "Add and remove in one call",
  language: "javascript",
  sections: [
    {
      title: "Removing",
      entries: [
        { term: "splice", signature: "items.splice(1, 2)", description: "Removes two from index one" },
        { term: "length", signature: "items.length = 0", description: "Empties the array in place" },
      ],
    },
    {
      title: "Inserting",
      entries: [{ term: "splice", signature: "items.splice(1, 0, 'demo')" }],
    },
  ],
};

/** The provisional shape, which is what every committed `sheet.json` is in. */
const PROVISIONAL = {
  title: "Splicing Array Elements",
  subtitle: "Add and remove in one call",
  code: [
    { text: "// remove two, insert one", role: "comment" },
    { text: "const removed = items.splice(1, 2, 'demo');" },
  ],
};

/** An element of a composition, by the name the layout gave its slot. */
function named(composition, name) {
  return composition.toDocument().elements.find((element) => element.name === name);
}

// ## The document model

test("the two shapes are told apart by the field the formal model added", () => {
  assert.equal(isFormalDocument(FORMAL), true);
  assert.equal(isFormalDocument(PROVISIONAL), false);
  // A document carrying both is a document being migrated, and the formal
  // field is read first so it can be migrated one sheet at a time.
  assert.equal(isFormalDocument({ ...PROVISIONAL, sections: FORMAL.sections }), true);
  for (const value of [null, undefined, "a sheet", 7, []]) assert.equal(isFormalDocument(value), false);
});

test("each shape is read against its own schema, and both pass", () => {
  assert.equal(readDocument(FORMAL), FORMAL);
  assert.equal(readDocument(PROVISIONAL), PROVISIONAL);
  assert.equal(DOCUMENT_SCHEMA.name, "document");
  assert.equal(PROVISIONAL_SCHEMA.name, "document");
});

test("a field deep inside a section is refused by its path", () => {
  const broken = structuredClone(FORMAL);
  broken.sections[1].entries[0].term = "";
  assert.throws(() => readDocument(broken), /document\.sections\[1\]\.entries\[0\]\.term: must not be empty/);
});

test("and a description without a term is not an entry at all", () => {
  // The one required field of the three. A sheet whose entries are a list of
  // names is a legitimate sheet; a sheet with a description and nothing it
  // describes is not a thing.
  const broken = structuredClone(FORMAL);
  broken.sections[0].entries[0] = { description: "Removes two from index one" };
  assert.throws(() => readDocument(broken), /document\.sections\[0\]\.entries\[0\]\.term: must be a string, and is absent/);
});

test("the formal shape is closed and the provisional one is open, which is deliberate", () => {
  // The formal model is new, so it catches `section` misspelt for `sections`
  // while nothing on disk is written in it. The provisional shape predates
  // every model here and is handed to `composeSheet` whole by the page, so a
  // field added to the catalog's documents must not stop the page drawing.
  assert.throws(() => readDocument({ ...FORMAL, subtitel: "typo" }), /document\.subtitel: is not a field/);
  assert.equal(readDocument({ ...PROVISIONAL, notAField: 1 }).notAField, 1);
});

test("a seed is a string or a number, and nothing else", () => {
  for (const seed of ["splice-array", 42, 0]) assert.ok(readDocument({ ...PROVISIONAL, seed }));
  for (const seed of [true, {}, ["x"]]) {
    assert.throws(
      () => readDocument({ ...PROVISIONAL, seed }),
      /document\.seed: must be a string or a number/,
      `${JSON.stringify(seed)} was taken as a seed`
    );
  }
});

test("a code line's role is a string rather than one of the six, and the six are named", () => {
  // The composition paints an unrecognised role in the plain colour on
  // purpose, and two cases in `tools/test-sheet-syntax-roles.mjs` hold that
  // fallback - including one for a role named after a property of
  // `Object.prototype`. A schema refusing the role would make a documented,
  // tested behaviour unreachable.
  assert.ok(readDocument({ ...PROVISIONAL, code: [{ text: "a", role: "invented" }] }));
  assert.deepEqual(CODE_ROLES, ["plain", "comment", "identifier", "keyword", "string", "number"]);
  assert.deepEqual(CODE_ROLES.slice().sort(), Object.keys(SHEET_LANGUAGE.syntax).sort());
});

test("a code array given as one string is read, which a schema cannot say", () => {
  assert.ok(readDocument({ title: "Raw", code: "one\ntwo" }));
  assert.throws(() => readDocument({ title: "Raw", code: 7 }), /document\.code: must be an array of code lines/);
});

test("the entries flatten in reading order, with the section each came from", () => {
  const flat = entriesOf(FORMAL);
  assert.deepEqual(flat.map((one) => one.entry.term), ["splice", "length", "splice"]);
  assert.deepEqual(flat.map((one) => one.section.title), ["Removing", "Removing", "Inserting"]);
  assert.deepEqual(flat.map((one) => one.index), [0, 1, 2]);
  // A provisional document has no sections, and flattening one is empty
  // rather than an error: the field is simply not there.
  assert.deepEqual(entriesOf(PROVISIONAL), []);
});

test("nothing in the document model reaches the drawing, which is what it is for", () => {
  // The independence this model is defined for, asserted structurally rather
  // than by reading the prose: the file imports the validator and nothing
  // else, so there is no drawing surface, no design language and no layout in
  // scope for it to decide anything about. Were the projection to live here,
  // the first function in the file would undo the model.
  const source = readFileSync(join(root, "api", "cheatsheet", "document.mjs"), "utf8");
  const imports = [...source.matchAll(/^import .* from "(.+)";$/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["./schema.mjs"]);
  for (const drawn of ["composition.", ".rect(", ".text(", ".line(", "role: \"comment\""]) {
    assert.ok(!source.includes(drawn), `the document model draws: it holds ${JSON.stringify(drawn)}`);
  }
});

// ## The theme model

test("the default theme is the record, read through it rather than copied", () => {
  assert.deepEqual(SHEET_THEME.colors, SHEET_LANGUAGE.colors);
  assert.deepEqual(SHEET_THEME.syntax, SHEET_LANGUAGE.syntax);
  assert.deepEqual(SHEET_THEME.contrast, SHEET_LANGUAGE.contrast);
  assert.equal(SHEET_THEME.spacing.step, SHEET_LANGUAGE.step);
  assert.deepEqual(SHEET_THEME.spacing.tokens, SHEET_LANGUAGE.tokens);
  assert.equal(SHEET_THEME.radius, SHEET_LANGUAGE.radius);
  assert.equal(SHEET_THEME.stack.family, SHEET_FACE.fontFamily);
  assert.equal(SHEET_THEME.stack.capHeight, SHEET_FACE.capHeight);
  assert.equal(SHEET_THEME.stack.condensation, SHEET_CONDENSATION);
  for (const role of TYPE_SCALE_ROLES) {
    assert.equal(SHEET_THEME.scale[role].cap, TYPE_ROLES[role].cap, `${role} cap`);
    assert.equal(SHEET_THEME.scale[role].weight, TYPE_ROLES[role].fontWeight, `${role} weight`);
    assert.equal(SHEET_THEME.strokes.type[role], TYPE_ROLES[role].stem, `${role} stem`);
  }
  assert.equal(SHEET_THEME.strokes.rules.upper, SHEET_LANGUAGE.rules.upper.height);
  assert.equal(SHEET_THEME.strokes.rules.lower, SHEET_LANGUAGE.rules.lower.height);
});

test("and every one of those figures is in DESIGN_LANGUAGE.md, which is the record", () => {
  // The design language is the document; `language.mjs` and `faces.mjs` are
  // that document in the form the algorithm reads. This is the third link in
  // that chain, and without it a theme could be derived faithfully from a
  // transcription that had drifted.
  for (const hex of Object.values(SHEET_THEME.colors)) {
    assert.ok(designLanguage.includes(hex), `${hex} is in no table of the design language`);
  }
  for (const hex of Object.values(SHEET_THEME.syntax)) {
    assert.ok(
      designLanguage.toUpperCase().includes(hex.toUpperCase()),
      `${hex} is in no table of the design language`
    );
  }
  for (const role of TYPE_SCALE_ROLES) {
    const { cap } = SHEET_THEME.scale[role];
    assert.ok(designLanguage.includes(String(cap)), `the ${cap} px ${role} cap is not recorded`);
    assert.ok(
      designLanguage.includes(String(SHEET_THEME.strokes.type[role])),
      `the ${role} stem is not recorded`
    );
  }
  assert.ok(designLanguage.includes(String(SHEET_THEME.spacing.step)));
  assert.ok(designLanguage.includes(String(SHEET_THEME.stack.condensation)));
});

test("the theme names every role, and a missing one is refused by its path", () => {
  assert.deepEqual(Object.keys(SHEET_THEME.colors), PALETTE_ROLES);
  assert.deepEqual(Object.keys(SHEET_THEME.syntax), SYNTAX_ROLES);
  const missing = structuredClone(SHEET_THEME);
  delete missing.colors.greenOnWhite;
  // Not a sixth colour: it is the substitution the design language nominates
  // for the accent where the accent has to carry text on a light ground, so a
  // theme without it leaves `readableInk` nothing to substitute.
  assert.throws(() => readTheme(missing), /theme\.colors\.greenOnWhite: must be a string, and is absent/);
});

test("a colour the renderer cannot read is refused here rather than drawn black", () => {
  // The refusal that makes this model worth validating. An unreadable fill
  // reaches the surface's SVG writer, which passes it into markup rather than
  // objecting, and the page then draws a black region with nothing logged.
  const broken = structuredClone(SHEET_THEME);
  broken.colors.green = "ofgreen";
  assert.throws(() => readTheme(broken), /theme\.colors\.green: must be a colour this layer can read/);
});

test("and the two rule weights are named, because a record would take any two keys", () => {
  // The same failure a missing palette role is, one field over: `languageFor`
  // reads `upper` and `lower` by name, so a theme naming neither passed a
  // record check and then drew both flanking bars at a height of `undefined`,
  // which the drawing surface writes out as zero. The four green bars either
  // side of the title left the sheet with nothing logged anywhere.
  const misnamed = structuredClone(SHEET_THEME);
  misnamed.strokes.rules = { top: 45, bottom: 20 };
  assert.throws(() => readTheme(misnamed), /theme\.strokes\.rules\.upper: must be a number, and is absent/);
  // And the height still reaches the bar when the theme is a whole one.
  const thin = structuredClone(SHEET_THEME);
  thin.strokes.rules.upper = 12;
  const { composition } = composeSheet(PROVISIONAL, { seed: 1, theme: thin });
  assert.equal(named(composition, "rule-upper-left").height, 12);
  assert.equal(named(composition, "rule-lower-left").height, SHEET_LANGUAGE.rules.lower.height);
});

test("every role resolves through the parser the composition measures with", () => {
  const resolved = resolvePalette(SHEET_THEME);
  // Namespaced, because `plain` and `white` are the same colour in this theme
  // and a flat map would lose one of them.
  assert.equal(Object.keys(resolved).length, PALETTE_ROLES.length + SYNTAX_ROLES.length);
  assert.deepEqual(resolved["colors.navy"].rgba, { r: 0, g: 1, b: 50, a: 1 });
  assert.equal(resolved["syntax.plain"].value, SHEET_THEME.syntax.plain);
  for (const entry of Object.values(resolved)) {
    assert.equal(typeof entry.rgba.r, "number", `${entry.role} did not resolve`);
  }
});

test("a theme composes a sheet, and moves every paint without moving a coordinate", () => {
  const amber = structuredClone(SHEET_THEME);
  amber.name = "amber";
  amber.colors = {
    navy: "#241B2F",
    white: "#FFFFFF",
    green: "#E8833A",
    heading: "#3A3A40",
    greenOnWhite: "#9A4A10",
  };
  const recorded = composeSheet(PROVISIONAL, { seed: 7 });
  const themed = composeSheet(PROVISIONAL, { seed: 7, theme: amber });
  for (const slot of ["masthead", "spine", "divider", "code-panel"]) {
    const was = named(recorded.composition, slot);
    const now = named(themed.composition, slot);
    assert.deepEqual(
      [now.x, now.y, now.width, now.height],
      [was.x, was.y, was.width, was.height],
      `the theme moved the ${slot}`
    );
  }
  assert.equal(named(themed.composition, "spine").fill, "#E8833A");
  assert.equal(named(themed.composition, "masthead").fill, "#241B2F");
  assert.equal(named(recorded.composition, "spine").fill, SHEET_LANGUAGE.colors.green);
});

test("a theme put back into a language carries the paints and leaves the positions", () => {
  const language = languageFor(SHEET_THEME);
  assert.deepEqual(language.colors, SHEET_LANGUAGE.colors);
  assert.deepEqual(language.bands, SHEET_LANGUAGE.bands);
  assert.deepEqual(language.runs, SHEET_LANGUAGE.runs);
  assert.deepEqual(language.floors, SHEET_LANGUAGE.floors);
});

test("a theme's step renames the unit and moves nothing, because a grid is the layout's", () => {
  // The one limit of `languageFor` that is invisible from its output. Every
  // position the record derives from a token is already resolved to a number,
  // so a different step is carried through and redraws nothing measured in it.
  // Stated here rather than only in a comment, because a caller who expected
  // otherwise would see a sheet that looked correct.
  const wide = structuredClone(SHEET_THEME);
  wide.spacing.step = 96;
  const language = languageFor(wide);
  assert.equal(language.step, 96);
  assert.equal(language.insets.spineTop, SHEET_LANGUAGE.insets.spineTop);
  assert.deepEqual(language.bands, SHEET_LANGUAGE.bands);
  const layout = layoutFor(language);
  assert.deepEqual(
    boxOf(layout, slotNamed(layout, "spine")),
    boxOf(SHEET_LAYOUT, slotNamed(SHEET_LAYOUT, "spine"))
  );
  // Replacing the layout is the route that does move it, which is the
  // division this is asserting rather than a shortcoming of it.
  const moved = structuredClone(SHEET_LAYOUT);
  moved.slots.find((slot) => slot.name === "spine").bleed = { top: 96 };
  assert.notDeepEqual(
    boxOf(moved, slotNamed(moved, "spine")),
    boxOf(SHEET_LAYOUT, slotNamed(SHEET_LAYOUT, "spine"))
  );
});

test("a language missing a table it may omit still gets a contrast floor", () => {
  // The rule `compose.mjs` states for the floors - a language can move one but
  // cannot remove one by omission - applied to the table a theme is measured
  // against.
  const without = { ...SHEET_LANGUAGE };
  delete without.contrast;
  assert.deepEqual(themeFrom(without).contrast, SHEET_LANGUAGE.contrast);
});

test("a theme derived from a language round trips back to it", () => {
  // The two directions are what let a caller hand over either, and a round
  // trip that lost a field would lose it silently.
  const ember = {
    ...SHEET_LANGUAGE,
    colors: { ...SHEET_LANGUAGE.colors, green: "#E8833A", greenOnWhite: "#9A4A10" },
  };
  assert.deepEqual(languageFor(themeFrom(ember, { name: "ember" }), ember), ember);
});

// ## The layout model

test("the recorded layout's grid is the bands and divisions, unchanged", () => {
  assert.equal(SHEET_LAYOUT.name, "sheet");
  assert.equal(SHEET_LAYOUT.canvas.width, SHEET_LANGUAGE.canvas);
  assert.equal(SHEET_LAYOUT.canvas.height, SHEET_LANGUAGE.canvas);
  assert.equal(SHEET_LAYOUT.grid.step, SHEET_LANGUAGE.step);
  assert.deepEqual(
    SHEET_LAYOUT.grid.rows.map((row) => [row.name, row.y, row.height]),
    Object.entries(SHEET_LANGUAGE.bands).map(([name, band]) => [name, band.y, band.height])
  );
  assert.deepEqual(
    SHEET_LAYOUT.grid.columns.map((column) => [column.name, column.x, column.width]),
    Object.entries(SHEET_LANGUAGE.divisions).map(([name, division]) => [name, division.x, division.width])
  );
  // The rows close on the canvas, which is the property the design language
  // took the snapping trade for.
  assert.equal(
    SHEET_LAYOUT.grid.rows.reduce((sum, row) => sum + row.height, 0),
    SHEET_LANGUAGE.canvas
  );
});

test("every slot resolves to the geometry the artwork was measured at", () => {
  const { bands, divisions, insets, rules, canvas, markSquare } = SHEET_LANGUAGE;
  const box = (name) => boxOf(SHEET_LAYOUT, slotNamed(SHEET_LAYOUT, name));
  assert.deepEqual(box("masthead"), { x: 0, y: 0, width: canvas, height: bands.masthead.height });
  assert.deepEqual(box("code-panel"), {
    x: divisions.panel.x,
    y: bands.code.y,
    width: divisions.panel.width,
    height: bands.code.height,
  });
  // The spine starts a `step-4` above the panel it runs beside and ends with
  // it, which is what the bleed expresses.
  assert.deepEqual(box("spine"), {
    x: 0,
    y: bands.code.y - insets.spineTop,
    width: divisions.spine.width,
    height: bands.code.height + insets.spineTop,
  });
  assert.deepEqual(box("divider"), { x: 0, y: bands.divider.y, width: canvas, height: bands.divider.height });
  assert.deepEqual(box("rule-upper-left"), { x: 0, y: rules.upper.y, width: rules.width, height: rules.upper.height });
  assert.deepEqual(box("rule-lower-right"), {
    x: canvas - rules.width,
    y: rules.lower.y,
    width: rules.width,
    height: rules.lower.height,
  });
  assert.deepEqual(box("mark-square"), { ...markSquare });
});

test("and every run's baseline, measure and size is the one the record gives", () => {
  const { runs, rules, divisions, insets, canvas, markSquare } = SHEET_LANGUAGE;
  const slot = (name) => slotNamed(SHEET_LAYOUT, name);
  for (const [name, recorded, size] of [
    ["wordmark", runs.wordmark, "masthead"],
    ["title", runs.title, "title"],
    ["subtitle", runs.subtitle, "leadIn"],
    ["lead-in", runs.leadIn, "leadIn"],
    ["follow-line", runs.followLine, "followLine"],
  ]) {
    assert.equal(slot(name).baseline, recorded.baseline, `${name} baseline`);
    assert.equal(SHEET_THEME.scale[slot(name).size].cap, recorded.cap, `${name} cap`);
    assert.equal(slot(name).size, size, `${name} size role`);
  }
  assert.equal(slot("title").measure, rules.measure);
  assert.equal(slot("subtitle").measure, rules.measure);
  assert.equal(slot("wordmark").measure, canvas - insets.mastheadPadding * 2);
  const leadInLeft = divisions.spine.x + divisions.spine.width + insets.leadInFromSpine;
  assert.equal(slot("lead-in").left, leadInLeft);
  assert.equal(slot("lead-in").measure, canvas - leadInLeft - divisions.rightMargin.width);
  const followLeft = markSquare.x + markSquare.width + insets.followLineFromMark;
  assert.equal(slot("follow-line").left, followLeft);
  assert.equal(slot("follow-line").measure, canvas - followLeft - divisions.rightMargin.width);
});

test("a slot is asked for by kind, never by name, which is what keeps a document portable", () => {
  assert.deepEqual(slotsHolding(SHEET_LAYOUT, "entries").map((slot) => slot.name), ["code-panel"]);
  assert.deepEqual(slotsHolding(SHEET_LAYOUT, "heading").map((slot) => slot.name), ["title", "subtitle"]);
  assert.deepEqual(slotsHolding(SHEET_LAYOUT, "brand").map((slot) => slot.name), ["footer-lockup"]);
  assert.deepEqual(slotsHolding(SHEET_LAYOUT, "nothing"), []);
});

test("a slot naming no row of its own grid is refused with the path to it", () => {
  // The check a schema node cannot make: a slot naming a row that is not
  // there is a well formed slot and a broken layout, and only the whole
  // object can tell.
  const broken = structuredClone(SHEET_LAYOUT);
  broken.slots[2].row = "gutter";
  assert.throws(() => readLayout(broken), /layout\.slots\[2\]\.row: names no row of the grid/);

  const unpainted = structuredClone(SHEET_LAYOUT);
  delete unpainted.slots[0].paint;
  assert.throws(() => readLayout(unpainted), /layout\.slots\[0\]\.paint: is required for a slot drawn as a fill/);

  const reserved = structuredClone(SHEET_LAYOUT);
  reserved.slots.find((slot) => slot.reserve).reserve = "no-such-slot";
  assert.throws(() => readLayout(reserved), /\.reserve: names no slot of this layout/);
});

test("the recorded layout passes its own schema, which the composition reads it through", () => {
  assert.equal(readLayout(structuredClone(SHEET_LAYOUT)).name, "sheet");
  assert.deepEqual(STAGES, ["ground", "rule", "mark", "run"]);
});

test("a replacement layout composes a different sheet, which is the whole point of it", () => {
  const moved = structuredClone(SHEET_LAYOUT);
  moved.name = "deep-spine";
  moved.slots.find((slot) => slot.name === "spine").bleed = { top: SHEET_LANGUAGE.tokens["step-9"] };
  const recorded = composeSheet(PROVISIONAL, { seed: 3 });
  const replaced = composeSheet(PROVISIONAL, { seed: 3, layout: moved });
  assert.equal(
    named(recorded.composition, "spine").height,
    SHEET_LANGUAGE.bands.code.height + SHEET_LANGUAGE.insets.spineTop
  );
  assert.equal(
    named(replaced.composition, "spine").height,
    SHEET_LANGUAGE.bands.code.height + SHEET_LANGUAGE.tokens["step-9"]
  );
  // And the layout is validated on the way in, so a broken one fails here
  // rather than inside the drawing surface.
  const broken = structuredClone(SHEET_LAYOUT);
  broken.slots[0].draw = "scribble";
  assert.throws(() => composeSheet(PROVISIONAL, { layout: broken }), /layout\.slots\[0\]\.draw: must be one of/);
});

test("a layout derived from a replaced language follows the language, not the record", () => {
  const taller = {
    ...SHEET_LANGUAGE,
    bands: { ...SHEET_LANGUAGE.bands, divider: { ...SHEET_LANGUAGE.bands.divider, height: 96 } },
  };
  const layout = layoutFor(taller);
  assert.equal(boxOf(layout, slotNamed(layout, "divider")).height, 96);
  assert.equal(boxOf(SHEET_LAYOUT, slotNamed(SHEET_LAYOUT, "divider")).height, 48);
});

// ## The mapping onto the drawing surface

test("a fill slot becomes a rect, in the order the stage lists it", () => {
  const composition = createComposition({ width: 3600, height: 3600, background: "#FFFFFF", id: "case" });
  const drawn = placeSlots(composition, { layout: SHEET_LAYOUT, theme: SHEET_THEME, stage: "ground" });
  assert.deepEqual(drawn, ["masthead", "code-panel", "spine", "divider"]);
  const elements = composition.toDocument().elements;
  assert.deepEqual(elements.map((element) => element.type), ["rect", "rect", "rect", "rect"]);
  assert.deepEqual(elements.map((element) => element.name), drawn);
  assert.equal(elements[2].fill, SHEET_THEME.colors.green);
});

test("and the stages are what keep a conditional slot off an unconditional sheet", () => {
  // The mark square is drawn only where the footer asset is absent, which a
  // flat slot list could not express. Its stage is its own, and the `only`
  // filter is the second half of the same mechanism.
  const composition = createComposition({ width: 3600, height: 3600, background: "#FFFFFF", id: "case" });
  assert.deepEqual(
    placeSlots(composition, { layout: SHEET_LAYOUT, theme: SHEET_THEME, stage: "mark" }),
    ["mark-square"]
  );
  assert.deepEqual(
    placeSlots(composition, {
      layout: SHEET_LAYOUT,
      theme: SHEET_THEME,
      stage: "rule",
      only: (slot) => slot.name.endsWith("-left"),
    }),
    ["rule-upper-left", "rule-lower-left"]
  );
});

test("a stroke slot becomes a line, which the recorded sheet has none of", () => {
  // Nothing on the eleven is a stroked line: the divider and the two flanking
  // rules are measured bars, and a bar with a height is a rectangle. The kind
  // is supported because a layout is a surface a caller replaces, and this is
  // what keeps it honest rather than merely offered.
  const hairline = structuredClone(SHEET_LAYOUT);
  hairline.slots.push({
    name: "hairline",
    draw: "stroke",
    stage: "rule",
    row: "divider",
    paint: "green",
    weight: 6,
  });
  readLayout(hairline);
  const composition = createComposition({ width: 3600, height: 3600, background: "#FFFFFF", id: "case" });
  placeSlots(composition, { layout: hairline, theme: SHEET_THEME, stage: "rule" });
  const line = named(composition, "hairline");
  assert.equal(line.type, "line");
  assert.equal(line.strokeWidth, 6);
  assert.equal(line.stroke, SHEET_THEME.colors.green);
  // Down the middle of its box, along the axis the box is longer on.
  const { y, height } = SHEET_LANGUAGE.bands.divider;
  assert.equal(line.y1, y + height / 2);
  assert.equal(line.y2, line.y1);
  assert.equal(line.x1, 0);
  assert.equal(line.x2, SHEET_LANGUAGE.canvas);
  assert.ok(composition.toSVG().includes("<line"), "the line did not reach the markup");
});

test("and a stroke with no weight is refused, because a hairline of nothing draws nothing", () => {
  const weightless = structuredClone(SHEET_LAYOUT);
  weightless.slots.push({ name: "hairline", draw: "stroke", stage: "rule", row: "divider", paint: "green" });
  assert.throws(() => readLayout(weightless), /\.weight: is required for a slot drawn as a stroke/);
});

test("a text slot becomes a text element, placed from the slot's own baseline", () => {
  const { composition } = composeSheet(PROVISIONAL, { seed: 1 });
  for (const name of ["wordmark", "title", "subtitle", "lead-in", "follow-line"]) {
    const element = named(composition, name);
    assert.ok(element, `the ${name} slot drew nothing`);
    assert.equal(element.type, "text");
    assert.equal(element.y, slotNamed(SHEET_LAYOUT, name).baseline, `${name} is off its baseline`);
  }
});

test("a paint naming no role of the theme is refused, naming the slot and the role", () => {
  const painted = structuredClone(SHEET_LAYOUT);
  painted.slots.find((slot) => slot.name === "divider").paint = "chartreuse";
  assert.throws(
    () => composeSheet(PROVISIONAL, { layout: painted }),
    /the divider slot is painted "chartreuse", which is no role of the "default" theme/
  );
  // Read as an own property, the guard this layer carries everywhere a role
  // name indexes a palette: a slot painted after a property of
  // `Object.prototype` must not reach the renderer as a function.
  assert.throws(() => paintOf(SHEET_THEME, "constructor", "a case"), /is no role of/);
  assert.throws(() => paintOf(SHEET_THEME, "toString", "a case"), /is no role of/);
  // A syntax role is a paint too, so the refusal names both halves. Listing
  // the palette alone would tell a caller who mistyped `plain` that syntax
  // roles are not paintable, which is the opposite of what this does.
  assert.equal(paintOf(SHEET_THEME, "keyword", "a case"), SHEET_THEME.syntax.keyword);
  assert.throws(() => paintOf(SHEET_THEME, "plaen", "a case"), /greenOnWhite, plain, comment/);
});

// ## The projection, which is the layout's and not the document's

test("a section becomes a comment row and an entry becomes two, in reading order", () => {
  assert.deepEqual(rowsFor(FORMAL), [
    { text: "// Removing", role: "comment" },
    { text: "// splice - Removes two from index one", role: "comment" },
    { text: "items.splice(1, 2)" },
    { text: "// length - Empties the array in place", role: "comment" },
    { text: "items.length = 0" },
    { text: "" },
    { text: "// Inserting", role: "comment" },
    // No description, so the prose row is the term alone rather than a term
    // and a dash with nothing after it.
    { text: "// splice", role: "comment" },
    { text: "items.splice(1, 0, 'demo')" },
  ]);
});

test("a signature carries no role, so a document naming a language is coloured by token", () => {
  // The provisional shape's own rule, inherited rather than restated: a
  // declared role is the fallback, and the accent reader is the first choice.
  for (const row of rowsFor(FORMAL)) {
    if (row.text.startsWith("//") || row.text === "") continue;
    assert.equal(row.role, undefined, `${JSON.stringify(row.text)} declared a role`);
  }
});

test("a blank row sits between sections and at neither end", () => {
  const rows = rowsFor(FORMAL);
  assert.notEqual(rows[0].text, "");
  assert.notEqual(rows[rows.length - 1].text, "");
  assert.equal(rows.filter((row) => row.text === "").length, FORMAL.sections.length - 1);
  assert.deepEqual(rowsFor({ ...FORMAL, sections: [FORMAL.sections[0]] }).filter((row) => row.text === ""), []);
});

test("a formal document composes through the same algorithm the provisional one does", () => {
  const formal = composeSheet(FORMAL, { seed: "splice-array" });
  const provisional = composeSheet(PROVISIONAL, { seed: "splice-array" });
  // The same seed, hashed the same way, and the same choices made from it.
  // Not the same geometry: `topPadding` is drawn from the seed and then held
  // to the room the content leaves, so two documents of different lengths
  // land in different places from one seed. That is the panel being a fixed
  // frame around free content, which is the one region of which the design
  // language says it.
  assert.equal(formal.variation.seed, provisional.variation.seed);
  assert.deepEqual(
    formal.variation.choices.map((choice) => choice.name),
    provisional.variation.choices.map((choice) => choice.name)
  );
  assert.equal(formal.variation.leftInset, provisional.variation.leftInset);
  // And the rows are the projection's, one text element each - numbered by
  // their position among all the rows rather than among the inked ones, so a
  // blank row between sections keeps its slot instead of closing the gap up.
  rowsFor(FORMAL).forEach((row, index) => {
    const element = named(formal.composition, `code-${index}`);
    if (row.text.length === 0) {
      assert.equal(element, undefined, `the blank row at ${index} drew an empty text element`);
      return;
    }
    assert.ok(element, `row ${index} drew nothing`);
    assert.equal(element.text, row.text);
  });
  assert.equal(formal.variation.contrastHolds, true);
  assert.equal(formal.variation.codeFits, true);
});

test("and a formal document is refused by path before anything is drawn", () => {
  const broken = structuredClone(FORMAL);
  broken.sections[0].entries = [];
  assert.throws(
    () => composeSheet(broken, { seed: 1 }),
    /document\.sections\[0\]\.entries: must hold at least one element/
  );
});
