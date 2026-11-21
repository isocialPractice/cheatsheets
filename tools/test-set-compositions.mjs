// Holds the set compositions to the record of them, and to the two rules that
// record states rather than measures.
//
// ## What this file is for
//
// `api/cheatsheet/compositions.mjs` is the second design the repository holds
// at once, and the first thing in it that is not derived from a measurement: a
// set's palette is **chosen**, because there is no artwork to measure a hue off
// when a set has none. That is the gap this file stands in. The figures cannot
// be checked against an image, so they are checked against the record of them
// under **Set compositions** in `DESIGN_LANGUAGE.md` - every colour, every
// measured ratio, every cap, every stem and both step tables - the way
// `tools/test-composition-algorithm.mjs` reads the algorithm's figures back.
//
// Two rules are held as well, and neither is a figure:
//
// - **Every composition carries the recorded floors.** The three floors bound
//   what any seed may do to any sheet, each derived from the artwork, so a set
//   that lowered one would be a set permitted to be unreadable.
// - **A composition drawn after the mechanism landed is not one an earlier set
//   already used.** That is the whole of the standing rule this repository is
//   maintained under, and the first two entries are on record as the exception
//   with the reason, because both sets were drawn before a document could name
//   a composition at all.
//
// ## Why the record is parsed rather than retyped here
//
// A table retyped into a test is a third copy, and the failure it produces is
// "the test disagrees with both" rather than "the two records disagree". The
// tables under that heading are read out of the file, which is what makes a
// figure edited in one place and not the other fail.
//
// Run with: node --test tools/test-set-compositions.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertReadable,
  composeSheet,
  compositionNamed,
  compositionOf,
  contrastRatio,
  readLayout,
  readTheme,
  readableInk,
  BANDS,
  DIVISIONS,
  FLOORS,
  PANEL_FREEDOM,
  SET_COMPOSITIONS,
  SET_COMPOSITION_IDS,
  SHEET_LANGUAGE,
  SHEET_LAYOUT,
  SHEET_THEME,
  STEP,
  SYNTAX_ROLES,
  TYPE_ROLES,
  TYPE_SCALE_ROLES,
} from "../api/cheatsheet/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const record = readFileSync(join(root, "DESIGN_LANGUAGE.md"), "utf8");
const manifest = JSON.parse(readFileSync(join(root, "cheatsheets.json"), "utf8"));

/** The composition this run's new set is drawn in. */
const THIRD = "javascript-general";

/**
 * The sets whose sheets were drawn before a document could name a composition,
 * and which therefore resolve to the recorded one.
 *
 * **A record of one decision, not a list that grows.** Every set from
 * `javascript-general` on has a composition of its own, so a fourth id added
 * here would be a set being drawn in a design another set already used - which
 * is the one thing the rule forbids. The case below fails such an id rather
 * than reading this as permission.
 */
const DREW_THE_RECORDED_COMPOSITION = ["javascript-arrays", "html-css"];

/**
 * The body of a section of the record, by its heading, to the next heading of
 * the same depth or shallower.
 *
 * @param {string} heading The heading text, without its hashes.
 * @returns {string}
 */
function sectionOf(heading) {
  const found = new RegExp(`^(#{2,6}) ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").exec(record);
  assert.ok(found, `DESIGN_LANGUAGE.md holds no heading ${JSON.stringify(heading)}`);
  const depth = found[1].length;
  const from = found.index + found[0].length;
  const rest = record.slice(from);
  const next = new RegExp(`^#{1,${depth}} `, "m").exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/**
 * The tables of a section, each as its data rows.
 *
 * A table ends where a line that is not a row begins, which is what keeps two
 * tables in one section apart. Reading the section's rows as one list instead
 * leaves the second table's **header** in the data, and the first version of
 * this file did exactly that: the ink table came back with seven rows for six
 * roles and the count was the only thing that noticed.
 *
 * @param {string} body
 * @returns {string[][][]}
 */
function tablesOf(body) {
  const tables = [];
  let open = null;
  for (const line of body.split("\n")) {
    const text = line.trim();
    if (!text.startsWith("|")) {
      open = null;
      continue;
    }
    const cells = text
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^-{3,}$/.test(cell))) continue;
    if (open === null) {
      // The header, which names the columns and is not data.
      open = [];
      tables.push(open);
      continue;
    }
    open.push(cells);
  }
  return tables;
}

/**
 * The rows of the only table in a section.
 *
 * @param {string} body
 * @returns {string[][]}
 */
function rowsOf(body) {
  const tables = tablesOf(body);
  assert.equal(tables.length, 1, `expected one table in the section and found ${tables.length}`);
  return tables[0];
}

/** A cell's backticks and bold markers removed, so a value compares as a value. */
const plain = (cell) => cell.replace(/[`*]/g, "").trim();

// ## The record of the three

test("the record lists every composition the repository holds, in the order drawn", () => {
  const listed = rowsOf(sectionOf("The three, in the order the sets were drawn")).map((cells) => plain(cells[0]));
  assert.deepEqual(listed, SET_COMPOSITION_IDS);
  // Three as of 2026.11.21. Asserted as a floor so a fourth set does not fail
  // this case for existing, and asserted at all so a record that listed none
  // could not pass every case below by having nothing to compare.
  assert.ok(listed.length >= 3, `the record lists ${listed.length} compositions`);
});

test("and says of each what set it was drawn for and when", () => {
  for (const cells of rowsOf(sectionOf("The three, in the order the sets were drawn"))) {
    const entry = compositionNamed(plain(cells[0]));
    assert.equal(plain(cells[1]).replace(/\s+/g, " "), entry.set, `${entry.id} set`);
    assert.equal(plain(cells[2]), entry.drawn, `${entry.id} drawn`);
    assert.equal(plain(cells[3]), entry.title, `${entry.id} title`);
  }
});

test("an id nothing records is refused with the whole list in the message", () => {
  assert.throws(
    () => compositionNamed("javascript-general-v2"),
    /is not a set composition this repository records\. It has javascript-arrays, html-css, javascript-general\./
  );
});

// ## What a document naming one, and naming none, composes through

/**
 * A named pairing of a variation's contrast report, as it was drawn.
 *
 * The report is what the composition says it measured, so it is the evidence
 * that a theme and a layout reached the drawing: the report carries neither
 * name to read instead, and a palette compared off the record would prove only
 * that the record says what it says.
 *
 * The pairings read are the **display** runs - `wordmark`, `title`,
 * `follow-line` - which the layout names and which are therefore stable. A code
 * line's pairing is named `code-<n>` and is one run of however many the accent
 * reader split that line into, so reading a syntax role off the report would be
 * reading whether the reader happened to be prepared.
 *
 * @param {{ contrast: Array<{ name: string, ink: string, ground: string }> }} variation
 * @param {string} name
 * @returns {{ ink: string, ground: string }}
 */
function drawn(variation, name) {
  const found = variation.contrast.find((pairing) => pairing.name === name);
  assert.ok(found, `the variation measured no pairing named ${JSON.stringify(name)}`);
  return found;
}

/** A document of one line, which is the smallest thing that composes. */
const ONE_LINE = { title: "Named", code: [{ text: "const a = 1;", role: "identifier" }] };

test("a document naming no composition composes through the recorded theme and layout", () => {
  // The twenty-eight sheets written before compositions existed. `compositionOf`
  // returning `undefined` is what sends them down the path they have always
  // taken, and the ground the wordmark is set on, with the title's cap, is what
  // says they took it.
  assert.equal(compositionOf({ title: "No composition", code: [{ text: "x" }] }), undefined);
  assert.equal(compositionOf({ title: "Null", composition: null, code: [{ text: "x" }] }), undefined);
  const { variation } = composeSheet(ONE_LINE, { seed: 1 });
  assert.equal(drawn(variation, "wordmark").ground, SHEET_THEME.colors.navy);
  assert.equal(drawn(variation, "title").ink, SHEET_THEME.colors.heading);
  assert.equal(variation.titleCap, SHEET_THEME.scale.title.cap);
  assert.equal(SHEET_LAYOUT.name, "sheet");
});

test("a document naming one composes through that composition's theme and layout", () => {
  const entry = compositionNamed(THIRD);
  const { variation } = composeSheet({ ...ONE_LINE, composition: THIRD }, { seed: 1 });
  assert.equal(drawn(variation, "wordmark").ground, entry.theme.colors.navy);
  assert.notEqual(drawn(variation, "wordmark").ground, SHEET_THEME.colors.navy);
  assert.equal(drawn(variation, "title").ink, entry.theme.colors.heading);
  assert.equal(variation.titleCap, entry.theme.scale.title.cap);
  assert.equal(entry.theme.name, THIRD);
  assert.equal(entry.layout.name, THIRD);
  // And the composition's own geometry, which the layout is what carries: the
  // rail is two steps narrower than the recorded one.
  assert.notEqual(entry.layout.grid.columns[0].width, SHEET_LAYOUT.grid.columns[0].width);
});

test("a theme option lays over the set's theme, not over the recorded one", () => {
  // The behaviour that makes an option and a composition compose rather than
  // compete. Were the recorded theme the base, a caller moving one colour over
  // a sheet of the third set would silently get the recorded palette back for
  // the other ten - which is the failure `compose.mjs` refuses `options.language`
  // to avoid, arriving by a different door.
  const entry = compositionNamed(THIRD);
  const { variation } = composeSheet(
    { ...ONE_LINE, composition: THIRD },
    { seed: 1, theme: { colors: { ...entry.theme.colors, heading: "#241E33" } } }
  );
  assert.equal(drawn(variation, "title").ink, "#241E33", "the option moved the colour it named");
  assert.equal(
    drawn(variation, "wordmark").ground,
    entry.theme.colors.navy,
    "and left the rest where the set's composition put them"
  );
  assert.notEqual(drawn(variation, "wordmark").ground, SHEET_THEME.colors.navy);
  // The type scale is the set's too, which a partial theme naming only colours
  // has to leave alone rather than reset to the recorded one.
  assert.equal(variation.titleCap, entry.theme.scale.title.cap);
});

test("every composition is readable on the grounds its own layout pairs it with", () => {
  // Up front, for every entry, rather than once for the one in hand. A set
  // whose palette is legible as colour and illegible as type would compose and
  // be unreadable, and a sheet is the wrong place to find that out.
  for (const id of SET_COMPOSITION_IDS) {
    const entry = compositionNamed(id);
    readTheme(entry.theme);
    readLayout(entry.layout);
    const measured = assertReadable(entry.theme, entry.layout);
    assert.ok(measured.length > 0, `${id} measured no pairing at all`);
    assert.ok(
      measured.every((pairing) => pairing.holds),
      `${id} sets a run under its own text floor`
    );
  }
});

// ## The two rules

test("every composition carries the recorded floors", () => {
  for (const id of SET_COMPOSITION_IDS) {
    assert.deepEqual(compositionNamed(id).language.floors, FLOORS, `${id} floors`);
  }
});

test("a composition drawn after the mechanism landed is not one an earlier set used", () => {
  const recorded = new Set(DREW_THE_RECORDED_COMPOSITION);
  for (const id of recorded) {
    const entry = compositionNamed(id);
    assert.equal(entry.language, SHEET_LANGUAGE, `${id} is on record as the recorded composition`);
    assert.equal(entry.theme, SHEET_THEME, `${id} theme`);
    assert.equal(entry.layout, SHEET_LAYOUT, `${id} layout`);
  }
  /** Each composition's own design, as the two things a reader can tell apart. */
  const seen = new Map();
  const reused = [];
  for (const id of SET_COMPOSITION_IDS) {
    const entry = compositionNamed(id);
    const design = JSON.stringify([entry.theme.colors, entry.theme.syntax, entry.theme.scale, entry.layout.grid]);
    const before = seen.get(design);
    if (before !== undefined && !(recorded.has(id) && recorded.has(before))) {
      reused.push(`${id} is drawn in the design ${before} already uses`);
    }
    if (before === undefined) seen.set(design, id);
  }
  assert.deepEqual(reused, [], "a set composition repeats a design an earlier set was drawn in");
});

// ## The third composition, figure by figure

test("the palette is the record's, and every pairing reaches the ratio recorded", () => {
  const theme = compositionNamed(THIRD).theme;
  const [palette, inks] = tablesOf(sectionOf("The palette, and the ratio each pairing is drawn at"));
  assert.equal(palette.length, 5, "the palette table holds a row per colour role");
  for (const [role, colour, ground, reaches] of palette) {
    const name = plain(role).split(",")[0];
    assert.equal(plain(colour), theme.colors[name], `${name} colour`);
    const ratio = contrastRatio(plain(colour), plain(ground));
    assert.equal(ratio.toFixed(2), plain(reaches).replace(":1", ""), `${name} ratio`);
  }
  assert.equal(inks.length, SYNTAX_ROLES.length, "the ink table holds a row per syntax role");
  for (const [role, colour, reaches] of inks) {
    const name = plain(role);
    assert.ok(SYNTAX_ROLES.includes(name), `${name} is a syntax role`);
    assert.equal(plain(colour), theme.syntax[name], `${name} ink`);
    assert.equal(contrastRatio(plain(colour), theme.colors.navy).toFixed(2), plain(reaches).replace(":1", ""));
  }
});

test("the accent is under both floors on paper, so the substitution is live", () => {
  // The claim the record makes in prose, held as the measurement it is: an
  // accent that cleared the text floor would make the substitution dead code
  // and the paragraph about it wrong.
  const { colors, contrast } = compositionNamed(THIRD).theme;
  assert.ok(contrastRatio(colors.green, colors.white) < contrast.boundary);
  assert.ok(contrastRatio(colors.greenOnWhite, colors.white) >= contrast.text);
  assert.equal(readableInk(colors.green, colors.white, { colors, contrast }), colors.greenOnWhite);
  // And on its own ground the accent is drawn as it is, as the recorded green is.
  assert.equal(readableInk(colors.green, colors.navy, { colors, contrast }), colors.green);
});

test("the type scale is the anchor at the factors recorded, and the stems derive", () => {
  const theme = compositionNamed(THIRD).theme;
  const rows = rowsOf(sectionOf("The type scale, and what leads it"));
  assert.equal(rows.length, TYPE_SCALE_ROLES.length, "the scale table holds a row per type role");
  const anchor = TYPE_ROLES.leadIn.cap;
  for (const [role, factor, cap, recordedCap, share, stem, weight] of rows) {
    const name = plain(role);
    assert.ok(TYPE_SCALE_ROLES.includes(name), `${name} is a type role`);
    assert.equal(Number(plain(cap)), anchor * Number(plain(factor)), `${name} cap is the anchor at its factor`);
    assert.equal(theme.scale[name].cap, Number(plain(cap)), `${name} cap`);
    assert.equal(TYPE_ROLES[name].cap, Number(plain(recordedCap)), `${name} recorded cap`);
    assert.equal(TYPE_ROLES[name].stemShare, Number(plain(share)), `${name} stem share`);
    assert.equal(theme.strokes.type[name], Number(plain(stem)), `${name} stem`);
    assert.equal(
      Math.round(theme.scale[name].cap * TYPE_ROLES[name].stemShare),
      theme.strokes.type[name],
      `${name} stem is its cap at the recorded share`
    );
    assert.equal(theme.scale[name].weight, Number(plain(weight)), `${name} weight`);
    assert.equal(theme.scale[name].weight, TYPE_ROLES[name].fontWeight, `${name} keeps the recorded weight`);
  }
  // The treatment itself, which is the one thing the factors are chosen for.
  assert.ok(theme.scale.title.cap > theme.scale.masthead.cap, "the title leads the scale");
  assert.equal(theme.scale.leadIn.cap, anchor, "the lead-in is the anchor and does not move");
});

test("the grid moves the steps the record says, and conserves both totals", () => {
  const language = compositionNamed(THIRD).language;
  const rows = rowsOf(sectionOf("The grid, and the steps it conserves"));
  const held = { bands: language.bands, divisions: language.divisions };
  const recorded = { bands: BANDS, divisions: DIVISIONS };
  let read = 0;
  for (const [what, before, here] of rows) {
    const found = /^(\w+) (band|column|margin)$/i.exec(plain(what).replace("Right margin", "rightMargin margin"));
    assert.ok(found, `the row ${JSON.stringify(plain(what))} does not name a band or a column`);
    const key = found[1] === "rightMargin" ? "rightMargin" : found[1].charAt(0).toLowerCase() + found[1].slice(1);
    const group = found[2].toLowerCase() === "band" ? "bands" : "divisions";
    const steps = Number(plain(here));
    assert.equal(Number(plain(before).replace(/ steps?$/, "")), recorded[group][key].steps, `${key} recorded steps`);
    assert.equal(held[group][key].steps, steps, `${key} steps`);
    const span = group === "bands" ? held[group][key].height : held[group][key].width;
    assert.equal(span, steps * STEP, `${key} span is its steps at the step`);
    read += 1;
  }
  assert.equal(read, 8, "the table holds a row per band and per column");
  const sum = (group, span) => Object.values(group).reduce((total, one) => total + one[span], 0);
  assert.equal(sum(language.bands, "height"), SHEET_LANGUAGE.canvas, "the bands tile the canvas");
  assert.equal(sum(language.divisions, "width"), SHEET_LANGUAGE.canvas, "the columns tile the canvas");
  // And the bands and columns chain rather than merely summing, which a table
  // of totals cannot say.
  let y = 0;
  for (const band of Object.values(language.bands)) {
    assert.equal(band.y, y, "a band starts where the one above it ends");
    y += band.height;
  }
  let x = 0;
  for (const column of Object.values(language.divisions)) {
    assert.equal(column.x, x, "a column starts where the one left of it ends");
    x += column.width;
  }
});

test("the panel's freedom is narrowed inside the recorded ranges, in whole half steps", () => {
  const freedom = compositionNamed(THIRD).language.panelFreedom;
  const rows = rowsOf(sectionOf("The panel's freedom, narrowed"));
  assert.equal(rows.length, 3, "the freedom table holds a row per figure");
  const byRow = {
    "The code panel's top padding": "topPadding",
    "The leftmost code line's inset": "leftInset",
    "The code line spacing": "lineSpacing",
  };
  for (const [what, before, here, steps] of rows) {
    const key = byRow[plain(what)];
    assert.ok(key, `the row ${JSON.stringify(plain(what))} names no panel freedom`);
    const [lowWas, highWas] = plain(before).replace(" px", "").split(" to ").map(Number);
    const [low, high] = plain(here).split(" to ").map(Number);
    const [lowSteps, highSteps] = plain(steps).split(" to ").map(Number);
    assert.deepEqual([PANEL_FREEDOM[key].min, PANEL_FREEDOM[key].max], [lowWas, highWas], `${key} recorded range`);
    assert.deepEqual([freedom[key].min, freedom[key].max], [low, high], `${key} range`);
    assert.deepEqual([low / STEP, high / STEP], [lowSteps, highSteps], `${key} in steps`);
    assert.ok(low >= lowWas && high <= highWas, `${key} is a narrowing of the recorded range, not a new freedom`);
    for (const bound of [low, high]) {
      assert.equal((bound / STEP) % 0.5, 0, `${key} bound ${bound} is a whole half step`);
    }
  }
});

// ## The catalog

test("every sheet of the set names the composition, and composes with nothing stepped down", () => {
  const sheets = manifest.categories
    .flatMap((category) => category.cheatsheets)
    .filter((sheet) => sheet.composition === THIRD);
  assert.equal(sheets.length, 9, `the set holds ${sheets.length} sheets and was drawn as nine`);
  const noted = [];
  const spacings = [];
  const fills = [];
  for (const sheet of sheets) {
    const doc = JSON.parse(readFileSync(join(root, ...sheet.path.split("/"), "sheet.json"), "utf8"));
    assert.equal(doc.composition, THIRD, `${sheet.path} document`);
    const { variation } = composeSheet(doc, { seed: doc.seed });
    if (variation.notes.length > 0) noted.push(`${sheet.path}: ${variation.notes.join(" ")}`);
    spacings.push(variation.lineSpacing);
    fills.push(variation.panelFill);
  }
  // The claim the record closes on, and the whole point of narrowing the panel's
  // freedom: nine sheets that compose the same way rather than nine whose
  // display type is sized by how long each one's title happens to be.
  assert.deepEqual(noted, [], "a sheet of the set did not compose clean");
  assert.ok(Math.max(...spacings) - Math.min(...spacings) <= STEP / 2, "the set's line spacing spans half a step");
  assert.ok(Math.min(...fills) >= FLOORS.panelFill, "every panel of the set is filled to the floor");
});

test("every sheet added since the mechanism landed names a composition", () => {
  // The rule in the form a new sheet meets it. A sheet of a new set that forgot
  // the field composes in the recorded design and looks finished, which is the
  // one way the standing rule gets broken quietly.
  const sheets = manifest.categories.flatMap((category) => category.cheatsheets);
  const unnamed = sheets.filter((sheet) => sheet.composition === undefined).map((sheet) => sheet.path);
  // The twenty-eight written before a document could name one, which are every
  // sheet of the two sets on record above and no others.
  assert.equal(unnamed.length, 28, `${unnamed.length} sheets name no composition, and 28 were written before any could`);
  for (const path of unnamed) {
    const category = path.split("/")[0];
    const group = path.split("/")[1];
    const set = category === "javascript" ? `javascript-${group}` : category;
    assert.ok(
      DREW_THE_RECORDED_COMPOSITION.includes(set),
      `${path} names no composition and belongs to no set that is on record as having been drawn before they existed`
    );
  }
  for (const sheet of sheets) {
    if (sheet.composition === undefined) continue;
    assert.ok(
      Object.hasOwn(SET_COMPOSITIONS, sheet.composition),
      `${sheet.path} names ${JSON.stringify(sheet.composition)}, which nothing records`
    );
  }
});
