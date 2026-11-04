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
  COMPACT_SCHEMA,
} from "../api/cheatsheet/document.mjs";
import { SHEET_CONDENSATION, SHEET_FACE, TYPE_ROLES } from "../api/cheatsheet/faces.mjs";
import {
  boxOf,
  curveOf,
  kindOfSection,
  layoutFor,
  paintOf,
  placeSlots,
  readLayout,
  rowSlot,
  rowsFor,
  sectionSlots,
  shapeOf,
  slotForSection,
  slotNamed,
  slotsHolding,
  SECTION_KINDS,
  SHEET_LAYOUT,
  SLOT_KINDS,
  STAGES,
} from "../api/cheatsheet/layout.mjs";
import { SHEET_LANGUAGE } from "../api/cheatsheet/language.mjs";
import { contrastRatio } from "../api/cheatsheet/contrast.mjs";
import {
  assertReadable,
  familyCss,
  familyList,
  languageFor,
  readableRoles,
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

/**
 * A formal document whose sections carry listings rather than entries.
 *
 * The shape that settles the two: a worked listing, with a role on the lines
 * that are comments and an indent on the one that is nested, sitting inside the
 * section structure the formal model brought.
 */
const LISTING = {
  title: "Splicing Array Elements",
  language: "javascript",
  sections: [
    {
      title: "Removing",
      lines: [
        { text: "// remove two from index one", role: "comment" },
        { text: "const removed = items.splice(1, 2);" },
        { text: "  console.log(removed);" },
      ],
    },
    {
      title: "Inserting",
      lines: [{ text: "items.splice(1, 0, 'demo');" }],
    },
  ],
};

/** The compact shape, which is what every committed `sheet.json` is in. */
const COMPACT = {
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
  assert.equal(isFormalDocument(COMPACT), false);
  // A document carrying both is a document halfway between the two, and the
  // formal field is read first so that reads as a formal document with a
  // stray field rather than a compact one with a field nothing draws.
  assert.equal(isFormalDocument({ ...COMPACT, sections: FORMAL.sections }), true);
  for (const value of [null, undefined, "a sheet", 7, []]) assert.equal(isFormalDocument(value), false);
});

test("each shape is read against its own schema, and both pass", () => {
  assert.equal(readDocument(FORMAL), FORMAL);
  assert.equal(readDocument(COMPACT), COMPACT);
  assert.equal(DOCUMENT_SCHEMA.name, "document");
  assert.equal(COMPACT_SCHEMA.name, "document");
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

test("the formal shape is closed and the compact one is open, which is deliberate", () => {
  // The formal model is new, so it catches `section` misspelt for `sections`
  // while nothing on disk is written in it. The compact shape predates
  // every model here and is handed to `composeSheet` whole by the page, so a
  // field added to the catalog's documents must not stop the page drawing.
  assert.throws(() => readDocument({ ...FORMAL, subtitel: "typo" }), /document\.subtitel: is not a field/);
  assert.equal(readDocument({ ...COMPACT, notAField: 1 }).notAField, 1);
});

test("a seed is a string or a number, and nothing else", () => {
  for (const seed of ["splice-array", 42, 0]) assert.ok(readDocument({ ...COMPACT, seed }));
  for (const seed of [true, {}, ["x"]]) {
    assert.throws(
      () => readDocument({ ...COMPACT, seed }),
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
  assert.ok(readDocument({ ...COMPACT, code: [{ text: "a", role: "invented" }] }));
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
  // A compact document has no sections, and flattening one is empty
  // rather than an error: the field is simply not there.
  assert.deepEqual(entriesOf(COMPACT), []);
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
  assert.equal(SHEET_THEME.curves.display, SHEET_LANGUAGE.radius);
  assert.equal(SHEET_THEME.curves.square, 0);
  assert.deepEqual(SHEET_THEME.stack.family, familyList(SHEET_FACE.fontFamily));
  assert.equal(familyCss(SHEET_THEME.stack.family), SHEET_FACE.fontFamily);
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

test("the font stack is a list, and the list is the recorded stack", () => {
  // A list rather than a CSS string, so a caller adds a fallback by pushing on
  // to it instead of splicing a comma into the middle of a string. The join is
  // held to reproducing the recorded stack exactly, which is what let the field
  // change shape without a glyph of committed output moving.
  assert.ok(Array.isArray(SHEET_THEME.stack.family));
  assert.deepEqual(SHEET_THEME.stack.family, ["Helvetica Neue", "Arial", "system-ui", "sans-serif"]);
  // Quoted only where the name needs it, which is what the round trip rests on.
  assert.equal(familyCss(["Helvetica Neue", "Arial"]), '"Helvetica Neue", Arial');
  assert.equal(familyCss(["monospace"]), "monospace");
  // And the parse strips the quoting rather than keeping it as part of a name.
  assert.deepEqual(familyList('"Courier New", monospace'), ["Courier New", "monospace"]);
  assert.deepEqual(familyList("  Arial ,, serif "), ["Arial", "serif"]);

  // And the string form is not a theme's form. A caller handing over the CSS
  // string gets it named back rather than silently parsed, because a field that
  // accepts both shapes is a field nothing can report the shape of.
  const stringly = structuredClone(SHEET_THEME);
  stringly.stack.family = "Arial";
  assert.throws(() => readTheme(stringly), /theme\.stack\.family: must be a list of font family names/);
});

test("a rendered sheet records the stack it asked for, because an SVG cannot promise one", () => {
  // The SVG names a family it has no way to guarantee, so a sheet reviewed here
  // and a sheet rasterized on another machine may be set in two different faces
  // with nothing in either saying so. `resolved` is null in this layer on
  // purpose: the renderer is the only thing that can answer it, and
  // `rasterizeSheet` is where it is answered.
  const { variation } = composeSheet(COMPACT, { seed: 1 });
  assert.deepEqual(variation.stack.family, SHEET_THEME.stack.family);
  assert.equal(variation.stack.css, familyCss(SHEET_THEME.stack.family));
  assert.equal(variation.stack.resolved, null);

  // And the stack a theme names is the stack the markup carries, every run of
  // it. One stack per sheet is the design language's rule, not an accident of
  // the four runs happening to share a face.
  const narrow = composeSheet(COMPACT, {
    seed: 1,
    theme: { stack: { ...SHEET_THEME.stack, family: ["Courier New", "monospace"] } },
  });
  assert.equal(narrow.variation.stack.css, '"Courier New", monospace');
  const families = new Set();
  const walk = (elements) => {
    for (const element of elements) {
      if (element.fontFamily) families.add(element.fontFamily);
      if (element.type === "group") walk(element.children);
    }
  };
  walk(narrow.composition.toDocument().elements);
  assert.deepEqual([...families], ['"Courier New", monospace']);
});

test("a curve is a token a slot names, and a square corner writes no attribute", () => {
  // The record gives one curve, and the square corner every structural region
  // of the eleven is actually drawn with. Both are named, so a layout says
  // which it wants and a theme answers.
  assert.deepEqual(Object.keys(SHEET_THEME.curves).sort(), ["display", "square"]);
  for (const slot of SHEET_LAYOUT.slots) {
    if (slot.draw !== "fill" && slot.draw !== "stroke") continue;
    assert.equal(shapeOf(SHEET_THEME, slot).form, slot.draw === "fill" ? "rectangle" : "line", slot.name);
    assert.equal(curveOf(SHEET_THEME, slot), 0, `${slot.name} is drawn square on the eleven`);
  }

  // A slot naming no shape takes the token for the way it is drawn, which is
  // what lets a layout written before shape tokens existed go on drawing what
  // it drew: `block` for a fill and `bar` for a stroke.
  assert.equal(shapeOf(SHEET_THEME, { name: "bare", draw: "fill" }).form, "rectangle");
  assert.equal(shapeOf(SHEET_THEME, { name: "bare", draw: "stroke" }).form, "line");
  assert.equal(curveOf(SHEET_THEME, { name: "bare", draw: "fill" }), 0);

  // Square writes no `rx` at all, which is the evidence the token changed
  // nothing: the committed SVG fixture is byte for byte what it was.
  const square = createComposition({ width: 100, height: 100 });
  placeSlots(square, { layout: SHEET_LAYOUT, theme: SHEET_THEME, stage: "ground" });
  for (const element of square.toDocument().elements) assert.equal(element.rx, undefined);

  // And a shape pointed at the record's own curve rounds the corner.
  const rounded = structuredClone(SHEET_LAYOUT);
  rounded.slots.find((slot) => slot.name === "code-panel").shape = "display";
  const drawn = createComposition({ width: 100, height: 100 });
  placeSlots(drawn, { layout: rounded, theme: SHEET_THEME, stage: "ground" });
  const panel = drawn.toDocument().elements.find((element) => element.name === "code-panel");
  assert.equal(panel.rx, SHEET_LANGUAGE.radius);
});

test("a shape naming a curve the theme has not got is refused, and so is a slot naming no shape of it", () => {
  const orphan = structuredClone(SHEET_THEME);
  orphan.shapes.block.curve = "rounded";
  assert.throws(() => readTheme(orphan), /theme\.shapes\.block\.curve: names no curve of this theme/);

  const missing = structuredClone(SHEET_THEME);
  delete missing.curves.display;
  assert.throws(() => readTheme(missing), /theme\.curves\.display: must be a number, and is absent/);

  const noBlock = structuredClone(SHEET_THEME);
  delete noBlock.shapes.block;
  assert.throws(() => readTheme(noBlock), /theme\.shapes\.block: must be a shape token, and is absent/);

  const noBar = structuredClone(SHEET_THEME);
  delete noBar.shapes.bar;
  assert.throws(() => readTheme(noBar), /theme\.shapes\.bar: must be a shape token, and is absent/);

  assert.throws(
    () => shapeOf(SHEET_THEME, { name: "odd", draw: "fill", shape: "pill" }),
    /the odd slot is shaped "pill", which is no shape of the "default" theme/
  );

  // And a token whose form disagrees with the way the slot is drawn. It is the
  // one cross reference neither model's reader can make alone: `readLayout`
  // never sees a theme and `readTheme` never sees a layout.
  assert.throws(
    () => shapeOf(SHEET_THEME, { name: "hairline", draw: "stroke", shape: "block" }),
    /drawn as a stroke, which is a line, but it is shaped "block" and that token is a rectangle/
  );
  assert.throws(
    () => shapeOf(SHEET_THEME, { name: "ground", draw: "fill", shape: "bar" }),
    /drawn as a fill, which is a rectangle, but it is shaped "bar" and that token is a line/
  );

  // And `placeSlots` makes that check for both ways a slot is drawn, not only
  // for the one that reads a curve. Only a fill takes a corner, so a stroke's
  // token is resolved for its form alone - without which the eleven's own
  // layout would be checked and a replacement one would be checked for half
  // its slots.
  for (const draw of ["fill", "stroke"]) {
    const mismatched = structuredClone(SHEET_LAYOUT);
    mismatched.slots.push({
      name: `wrong-${draw}`,
      draw,
      stage: "ground",
      row: "divider",
      paint: "green",
      shape: draw === "fill" ? "bar" : "block",
      weight: 2,
    });
    assert.throws(
      () =>
        placeSlots(createComposition({ width: 100, height: 100 }), {
          layout: mismatched,
          theme: SHEET_THEME,
          stage: "ground",
        }),
      new RegExp(`the wrong-${draw} slot is drawn as a ${draw}`),
      `a ${draw} slot naming the other form's token composed without complaint`
    );
  }
});

test("every pairing of ink and ground the theme and the layout imply is readable", () => {
  // The up-front half of the colour work: the composition measures what it drew
  // and this measures what the theme and the layout *will* draw, before
  // anything is on the page. The recorded theme passes, which is the floor this
  // check was written against rather than one it was written to.
  const measured = assertReadable(SHEET_THEME, SHEET_LAYOUT);
  assert.ok(measured.every((pairing) => pairing.holds));
  // The five fixed runs and the panel's six syntax roles. The roles are on no
  // slot of their own - a line is painted by its role rather than its position -
  // so a walk over the slots alone would miss all six.
  const names = measured.map((pairing) => pairing.name);
  for (const run of ["wordmark", "title", "subtitle", "lead-in", "follow-line"]) {
    assert.ok(names.includes(run), `${run} was not measured`);
  }
  for (const role of SYNTAX_ROLES) {
    assert.ok(names.includes(`code-panel/${role}`), `${role} was not measured on the panel`);
  }

  // The structural fills are deliberately not in it. The green spine and the
  // four flanking bars reach 2.80:1 on the sheets' white, under the 3:1
  // boundary floor, and the design language records that as a reading rather
  // than a defect: on a white ground the green is a fill. A boundary rejection
  // would refuse the eleven sheets the floors were measured off.
  assert.ok(!names.includes("spine"));
  assert.ok(contrastRatio(SHEET_THEME.colors.green, SHEET_THEME.colors.white) < SHEET_THEME.contrast.boundary);
});

test("and the one substitution the design language nominates is applied before measuring", () => {
  // Measuring the role as declared rather than as drawn would report a failure
  // the composition does not have: the green cannot carry text on white, and
  // `readableInk` is what swaps the darker green in. A theme whose accent has
  // to be substituted on a slot therefore passes, and the measured ink is the
  // substitute rather than the declaration.
  const accented = structuredClone(SHEET_LAYOUT);
  accented.slots.find((slot) => slot.name === "title").paint = "green";
  const measured = readableRoles(SHEET_THEME, accented);
  const title = measured.find((pairing) => pairing.name === "title");
  assert.equal(title.ink, SHEET_THEME.colors.greenOnWhite);
  assert.ok(title.holds);
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
  const { composition } = composeSheet(COMPACT, { seed: 1, theme: thin });
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
  const recorded = composeSheet(COMPACT, { seed: 7 });
  const themed = composeSheet(COMPACT, { seed: 7, theme: amber });
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
  // Including the curve, which the theme now holds as a token rather than as a
  // figure of its own: `languageFor` writes `curves.display` back as `radius`.
  assert.equal(themeFrom(ember).curves.display, ember.radius);
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
  const recorded = composeSheet(COMPACT, { seed: 3 });
  const replaced = composeSheet(COMPACT, { seed: 3, layout: moved });
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
  assert.throws(() => composeSheet(COMPACT, { layout: broken }), /layout\.slots\[0\]\.draw: must be one of/);
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
  const { composition } = composeSheet(COMPACT, { seed: 1 });
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
    () => composeSheet(COMPACT, { layout: painted }),
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
  // The compact shape's own rule, inherited rather than restated: a
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

// ## A listing section, which is what settles the two shapes

test("a listing section's lines pass through as rows, role and indent intact", () => {
  // The identity projection, and the only correct one for a listing: the
  // indent means a nesting level and the role means a syntax colour, so a
  // layout that re-wrapped or re-indented would change what the document says
  // rather than how it is set.
  assert.deepEqual(rowsFor(LISTING), [
    { text: "// Removing", role: "comment" },
    { text: "// remove two from index one", role: "comment" },
    { text: "const removed = items.splice(1, 2);" },
    { text: "  console.log(removed);" },
    { text: "" },
    { text: "// Inserting", role: "comment" },
    { text: "items.splice(1, 0, 'demo');" },
  ]);
  // Copied rather than handed out by reference: the composition reaches into a
  // row to record what it drew, and the caller's document is not this
  // function's to open.
  const rows = rowsFor(LISTING);
  assert.notEqual(rows[1], LISTING.sections[0].lines[0]);
  assert.deepEqual(rows[1], LISTING.sections[0].lines[0]);
});

test("the compact shape is exactly a document of one untitled listing", () => {
  // The claim the decision of 2026.11.02 rests on - `{ title, code }` says
  // what `{ title, sections: [{ lines: code }] }` says - asserted where it
  // would break: through the whole algorithm, to the markup. An untitled
  // single section adds no comment row and no blank row, so the rows are the
  // lines, and the same rows from the same seed draw the same sheet.
  const wrapped = {
    title: COMPACT.title,
    subtitle: COMPACT.subtitle,
    sections: [{ lines: COMPACT.code }],
  };
  assert.deepEqual(rowsFor(wrapped), COMPACT.code);
  const shorthand = composeSheet(COMPACT, { seed: "splice-array" });
  const longhand = composeSheet(wrapped, { seed: "splice-array" });
  assert.equal(longhand.composition.toSVG(), shorthand.composition.toSVG());
  // Which is to say a port off the shorthand is available and loses nothing.
  // It is not taken: the twenty-eight committed documents stay as they are,
  // because the shorthand is the shape a sheet that is one listing wants.
  assert.deepEqual(longhand.variation, shorthand.variation);
});

test("a section holds entries or lines, and is refused for holding both or neither", () => {
  assert.equal(readDocument(LISTING), LISTING);
  const both = structuredClone(LISTING);
  both.sections[0].entries = FORMAL.sections[0].entries;
  assert.throws(
    () => readDocument(both),
    /document\.sections\[0\]: carries both `entries` and `lines`, and a section holds one or the other/
  );
  const neither = structuredClone(LISTING);
  delete neither.sections[0].lines;
  assert.throws(
    () => readDocument(neither),
    /document\.sections\[0\]: must carry `entries` or `lines`, and carries neither/
  );
  // And a listing is held to the same line shape `code` is, by the same node.
  const broken = structuredClone(LISTING);
  broken.sections[1].lines[0].text = 7;
  assert.throws(
    () => readDocument(broken),
    /document\.sections\[1\]\.lines\[0\]\.text: must be a string, and is 7/
  );
});

test("a listing is content, so `entriesOf` reports none rather than inventing one per line", () => {
  // The honest answer: lines are not entries. Inventing an entry per line
  // would hand a table of contents six rows that are each half a statement.
  assert.deepEqual(entriesOf(LISTING), []);
  assert.deepEqual(entriesOf({ sections: [...FORMAL.sections, ...LISTING.sections] }).length, 3);
});

test("a listing asks for a kind of slot, and this layout answers with the code panel", () => {
  assert.ok(SLOT_KINDS.includes("listing"));
  assert.deepEqual(slotsHolding(SHEET_LAYOUT, "listing").map((slot) => slot.name), ["code-panel"]);
  // Both kinds land in the same slot here because entries become rows and a
  // listing already is rows. A layout setting the descriptions in a margin
  // would name two slots, which is why a section asks for a kind.
  assert.deepEqual(slotsHolding(SHEET_LAYOUT, "entries").map((slot) => slot.name), ["code-panel"]);
});

test("a section's slot kind is resolved against the layout, and not merely validated", () => {
  // Until 2026.11.03 `slot` was held to "a non-empty string" by the document
  // schema and read by nothing on the composition path, so a section naming a
  // kind was drawn exactly as though it had named none. These are the four
  // answers it has now.

  // A kind its own content already is, where it names none. That is what keeps
  // the field optional rather than making every document say it twice.
  assert.equal(kindOfSection({ entries: [{ term: "a" }] }), "entries");
  assert.equal(kindOfSection({ lines: [{ text: "a" }] }), "listing");
  assert.equal(kindOfSection({ slot: "listing", entries: [{ term: "a" }] }), "listing");

  // Resolved, where the layout holds a slot of it.
  assert.equal(slotForSection(SHEET_LAYOUT, FORMAL.sections[0]).name, "code-panel");
  assert.equal(slotForSection(SHEET_LAYOUT, LISTING.sections[0]).name, "code-panel");

  // Refused by name, where it is no kind at all.
  assert.throws(
    () => slotForSection(SHEET_LAYOUT, { slot: "margin", entries: [{ term: "a" }] }, "document.sections[0]"),
    /document\.sections\[0\]\.slot asks for "margin", which is no kind of slot/
  );

  // Refused by name, where it is a real kind a section may not ask for. Both
  // are filled from the document's own fields - the title and subtitle, and the
  // two brand assets - so a section asking for either is asking for somewhere
  // nothing reads a section from.
  assert.deepEqual(SECTION_KINDS, ["entries", "listing"]);
  for (const kind of SLOT_KINDS.filter((one) => !SECTION_KINDS.includes(one))) {
    assert.throws(
      () => slotForSection(SHEET_LAYOUT, { slot: kind, entries: [{ term: "a" }] }, "document.sections[0]"),
      /which a layout fills from the document's own fields rather than from a section/,
      `${kind} was accepted as a kind a section may ask for`
    );
  }

  // Refused, where this layout holds no slot of a kind a section may ask for.
  const bare = structuredClone(SHEET_LAYOUT);
  delete bare.slots[1].holds;
  assert.throws(
    () => slotForSection(bare, FORMAL.sections[0], "document.sections[0]"),
    /the "sheet" layout holds no slot of that kind\. Its slots hold brand, heading/
  );

  // And a layout where no slot names a kind at all says so, rather than ending
  // the sentence on "its slots hold" with nothing after it. Every layout
  // written before `holds` existed is one of those.
  const none = structuredClone(SHEET_LAYOUT);
  for (const slot of none.slots) delete slot.holds;
  assert.throws(
    () => slotForSection(none, FORMAL.sections[0], "document.sections[0]"),
    /holds nothing: none of its slots names a kind/
  );

  // And refused where more than one slot holds it, because the composition
  // places one stream of rows and which of them a section goes in is then a
  // choice nothing in this layer can make. It cannot happen on this sheet's
  // layout, which is the reason to assert it against one that could.
  const two = structuredClone(SHEET_LAYOUT);
  two.slots.push({ ...two.slots[1], name: "code-panel-2" });
  assert.throws(
    () => slotForSection(two, FORMAL.sections[0], "document.sections[0]"),
    /holds 2 slots of that kind - code-panel, code-panel-2/
  );
});

test("and `composeSheet` is what resolves it, so a bad slot is refused rather than drawn", () => {
  // The failure this closes, measured 2026.11.02: this document validated,
  // composed, and drew its entries in the code panel with no refusal and no
  // note - the document said one thing and the drawing did another.
  const brand = { title: "Brand", sections: [{ slot: "brand", entries: [{ term: "alpha", signature: "a()" }] }] };
  assert.throws(() => composeSheet(brand), /document\.sections\[0\]\.slot asks for "brand"/);

  // The path is the section's own, so the one that is wrong is named rather
  // than the document.
  const second = {
    title: "Second",
    sections: [FORMAL.sections[0], { slot: "heading", entries: [{ term: "beta" }] }],
  };
  assert.throws(() => composeSheet(second), /document\.sections\[1\]\.slot asks for "heading"/);

  // A section naming the kind this layout does hold composes exactly as one
  // naming nothing does, which is what makes the field free to use.
  const named = composeSheet({ ...FORMAL, sections: FORMAL.sections.map((one) => ({ ...one, slot: "entries" })) }, { seed: "splice-array" });
  const plain = composeSheet(FORMAL, { seed: "splice-array" });
  assert.deepEqual(named.composition.elements, plain.composition.elements);
});

test("the projection resolves slots only when it is given a layout to resolve against", () => {
  // The parameter is second and optional because the callers with no layout -
  // a search index, a table of contents, the cases above - have nothing to
  // resolve against and are not asking for a refusal.
  const bad = { title: "Brand", sections: [{ slot: "brand", entries: [{ term: "alpha" }] }] };
  assert.deepEqual(rowsFor(bad), [{ text: "// alpha", role: "comment" }]);
  assert.throws(() => rowsFor(bad, SHEET_LAYOUT), /asks for "brand"/);
  // And handed one, a good document projects what it always projected.
  assert.deepEqual(rowsFor(FORMAL, SHEET_LAYOUT), rowsFor(FORMAL));
});

test("a slot's `holds` names kinds the layout knows, one or several", () => {
  const one = structuredClone(SHEET_LAYOUT);
  one.slots[1].holds = "listing";
  assert.ok(readLayout(one));
  for (const holds of ["lines", ["entries", "lines"], [], 7, [7]]) {
    const broken = structuredClone(SHEET_LAYOUT);
    broken.slots[1].holds = holds;
    assert.throws(
      () => readLayout(broken),
      /layout\.slots\[1\]\.holds: must name/,
      `${JSON.stringify(holds)} was taken as a kind`
    );
  }
});

// ## Where the kinds a layout holds are counted

test("`sectionSlots` is the subset of the holding slots a section can reach", () => {
  // Four slots of the recorded layout carry a `holds`, and only one of them
  // holds a kind a section may ask for. The other three are filled from named
  // fields of the document, so counting every slot carrying the field would
  // count the title, the subtitle and the footer lockup as places a section
  // could go.
  assert.deepEqual(
    SHEET_LAYOUT.slots.filter((slot) => slot.holds !== undefined).map((slot) => slot.name),
    ["code-panel", "footer-lockup", "title", "subtitle"]
  );
  assert.deepEqual(sectionSlots(SHEET_LAYOUT).map((slot) => slot.name), ["code-panel"]);
  assert.deepEqual(rowSlot(SHEET_LAYOUT), slotNamed(SHEET_LAYOUT, "code-panel"));

  // In layout order, and once each. A slot holding both kinds would come back
  // twice if the slots were collected per kind, and two slots would come back
  // in the order the kinds are listed rather than the order the layout is in.
  assert.deepEqual(SHEET_LAYOUT.slots[1].holds, ["entries", "listing"]);
  assert.deepEqual(sectionSlots(SHEET_LAYOUT).length, 1);
});

test("a layout keeping nowhere for a section is refused by its own path, not the document's", () => {
  // The defect this closes, measured 2026.11.03: `holds` is optional on a slot
  // and `readLayout` therefore accepted a layout that omitted it everywhere -
  // which every layout written before the field existed does. That layout then
  // composed a compact document and refused a formal one with
  // `document.sections[0].slot asks for "entries"`, blaming the section for a
  // field missing from the layout. The schema said optional, the composition
  // said required, and the message named the wrong file.
  const none = structuredClone(SHEET_LAYOUT);
  for (const slot of none.slots) delete slot.holds;
  assert.throws(
    () => readLayout(structuredClone(none)),
    /layout\.slots: keep nowhere for the content of a section/,
    "a layout no section can be set in validated"
  );
  // Named back with what to write rather than with what not to.
  assert.throws(() => readLayout(structuredClone(none)), /One slot has to hold "entries" or "listing"/);

  // And one answer for both document shapes, which is the inconsistency
  // itself: the layout is wrong whatever is composed against it, so the
  // compact document is refused by the same path the formal one is.
  for (const doc of [COMPACT, FORMAL]) {
    assert.throws(
      () => composeSheet(doc, { seed: 1, layout: structuredClone(none) }),
      /layout\.slots: keep nowhere for the content of a section/,
      `${isFormalDocument(doc) ? "a formal" : "a compact"} document got a different answer`
    );
  }
});

test("and a layout keeping two such slots is refused, because a composition sets one stream", () => {
  // The other half of the same count, and the failure `Slot Kind Resolution`
  // was reopened on: measured 2026.11.03, a layout narrowing `code-panel` to
  // entries and adding a second slot for the listing validated, composed, and
  // drew **both** streams in the code panel while the slot the listing section
  // had resolved to was never filled.
  const split = structuredClone(SHEET_LAYOUT);
  const panel = split.slots.find((slot) => slot.name === "code-panel");
  panel.holds = "entries";
  split.slots.splice(split.slots.indexOf(panel) + 1, 0, {
    name: "listing-panel",
    draw: "fill",
    stage: "ground",
    row: "code",
    column: "spine",
    paint: "navy",
    shape: "block",
    holds: "listing",
  });
  assert.throws(
    () => readLayout(structuredClone(split)),
    /layout\.slots: keep the content of a section in 2 places - code-panel, listing-panel/
  );
  // Refused on the way into the composition, so the document that measured the
  // flattening cannot be composed against it at all.
  const mixed = { title: "Mixed", sections: [FORMAL.sections[0], LISTING.sections[0]] };
  assert.throws(
    () => composeSheet(mixed, { seed: 1, layout: structuredClone(split) }),
    /A composition sets one stream of rows, so one slot holds every kind a section may ask for/
  );
});

test("`rowSlot` refuses the same two counts, for a layout nothing read", () => {
  // `readLayout` is the gate, and `rowsFor` takes a layout without passing one
  // - so a hand built layout reaches the placement directly, and a placement
  // from `undefined` draws every row at `NaN` rather than refusing.
  const none = structuredClone(SHEET_LAYOUT);
  for (const slot of none.slots) delete slot.holds;
  assert.throws(() => rowSlot(none), /the "sheet" layout keeps no slot for the content of a section/);

  const two = structuredClone(SHEET_LAYOUT);
  two.slots.push({ ...two.slots[1], name: "code-panel-2" });
  assert.throws(
    () => rowSlot(two),
    /the "sheet" layout keeps 2 slots for the content of a section - code-panel, code-panel-2/
  );
});

test("the rows are set from the resolved slot's box, which is what makes resolution a placement", () => {
  // Until 2026.11.04 the resolution was a gate and never a placement:
  // `slotForSection` was called for its refusal and its answer thrown away,
  // and every row was placed from the design language's `bands.code` and
  // `divisions.panel` instead. On the recorded layout those are the same box,
  // which is why nothing looked wrong.
  assert.deepEqual(boxOf(SHEET_LAYOUT, rowSlot(SHEET_LAYOUT)), {
    x: SHEET_LANGUAGE.divisions.panel.x,
    y: SHEET_LANGUAGE.bands.code.y,
    width: SHEET_LANGUAGE.divisions.panel.width,
    height: SHEET_LANGUAGE.bands.code.height,
  });

  // Moved, and the rows move with it. Nothing else about the layout changes,
  // so the inset is drawn from the same seed and lands on the same figure -
  // which is what makes the difference in `x` the box's alone.
  const moved = structuredClone(SHEET_LAYOUT);
  moved.slots.find((slot) => slot.name === "code-panel").column = "spine";
  assert.notEqual(
    boxOf(moved, rowSlot(moved)).x,
    SHEET_LANGUAGE.divisions.panel.x,
    "the slot did not move, so this case measures nothing"
  );
  const recorded = composeSheet(FORMAL, { seed: "splice-array" });
  const replaced = composeSheet(FORMAL, { seed: "splice-array", layout: moved });
  assert.equal(recorded.variation.leftInset, replaced.variation.leftInset);
  const xs = (report) => [
    ...new Set(
      report.composition
        .toDocument()
        .elements.filter((element) => /^code-\d+$/.test(element.name ?? ""))
        .map((element) => element.x)
    ),
  ];
  assert.deepEqual(xs(recorded), [SHEET_LANGUAGE.divisions.panel.x + recorded.variation.leftInset]);
  assert.deepEqual(xs(replaced), [SHEET_LANGUAGE.divisions.spine.x + replaced.variation.leftInset]);
});

test("a formal document composes through the same algorithm the compact one does", () => {
  const formal = composeSheet(FORMAL, { seed: "splice-array" });
  const compact = composeSheet(COMPACT, { seed: "splice-array" });
  // The same seed, hashed the same way, and the same choices made from it.
  // Not the same geometry: `topPadding` is drawn from the seed and then held
  // to the room the content leaves, so two documents of different lengths
  // land in different places from one seed. That is the panel being a fixed
  // frame around free content, which is the one region of which the design
  // language says it.
  assert.equal(formal.variation.seed, compact.variation.seed);
  assert.deepEqual(
    formal.variation.choices.map((choice) => choice.name),
    compact.variation.choices.map((choice) => choice.name)
  );
  assert.equal(formal.variation.leftInset, compact.variation.leftInset);
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
