// The worked examples in `examples/`, under test.
//
// An example is documentation that runs, which makes it the one kind of
// documentation that can be checked rather than reviewed. What is checked here
// is not that the scripts execute - that would pass on an example producing
// nonsense - but the three claims `examples/README.md` makes about them:
//
//   1. **The reproduction is a reproduction.** Every fixed figure in the
//      composed sheet is the artwork's own, and the report the example prints
//      is the report the README shows.
//   2. **The two axes are independent.** A theme moves paint and no geometry;
//      a seed moves geometry and no paint. That is the property the pair
//      exists to demonstrate, and demonstrating it is worth nothing if it is
//      not true.
//   3. **The theme is safe to read.** Every pairing the themed sheet draws
//      clears the text floor, measured rather than asserted.
//
// The example modules are imported and their own functions called, rather than
// the checks being written out again here. A test that reimplemented the
// example would drift from it, and the drift would be invisible: both would
// pass while the file a reader runs did something else.
//
// Run with: node --test tools/test-worked-examples.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  BANDS,
  CANVAS,
  DIVISIONS,
  MARK_SQUARE,
  RULES,
  RUNS,
  SHEET_LANGUAGE,
  contrastRatio,
} from "../api/cheatsheet/index.mjs";
import { composeSheet } from "../api/cheatsheet/compose.mjs";
import { EMBER, emberTheme } from "../examples/ember-theme.mjs";
import { SEED, splicingArrays } from "../examples/splicing-arrays.mjs";
import { report, reproduce } from "../examples/reproduce-sheet.mjs";
import { contrastTable, geometryOf, paintsOf, restyle } from "../examples/restyle-sheet.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "examples", "README.md"), "utf8");

/**
 * An element from a composition, by the name the algorithm gave it.
 *
 * @param {import('../api/graphic-design/compose.mjs').Composition} composition
 * @param {string} name
 */
function named(composition, name) {
  const found = composition.toDocument().elements.find((el) => el.name === name);
  assert.ok(found, `the composition has no element named "${name}"`);
  return found;
}

test("the document is a cheatsheet the design language recognises", () => {
  // The blank rows are the part an author drops. They occupy their slot like
  // an inked one, and the eleven are measured at 18 to 36 rows counting them,
  // so a document stripped of them composes a sparser sheet than the record
  // contains and the panel fill floor is what would catch it - later, and
  // less clearly than here.
  assert.ok(splicingArrays.code.length >= 18, "the example document is shorter than any of the eleven");
  assert.ok(
    splicingArrays.code.some((line) => line.text === ""),
    "the example document has no blank rows, so it is not the shape the sheets are"
  );
  assert.equal(typeof SEED, "string", "the seed is a slug, which is what makes it recoverable");
});

test("the reproduction draws every fixed figure at the artwork's own value", () => {
  const { composition } = reproduce();
  const doc = composition.toDocument();
  assert.equal(doc.width, CANVAS);
  assert.equal(doc.height, CANVAS);

  // One element from each region the artwork fixes, so a change to any of
  // them fails here rather than only in the fixture's bytes.
  assert.equal(named(composition, "masthead").height, BANDS.masthead.height);
  assert.equal(named(composition, "code-panel").height, BANDS.code.height);
  assert.equal(named(composition, "code-panel").x, DIVISIONS.panel.x);
  assert.equal(named(composition, "code-panel").width, DIVISIONS.panel.width);
  assert.equal(named(composition, "rule-upper-left").width, RULES.width);
  assert.equal(named(composition, "rule-upper-right").x, CANVAS - RULES.width);
  assert.equal(named(composition, "mark-square").width, MARK_SQUARE.width);
  assert.equal(named(composition, "wordmark").y, RUNS.wordmark.baseline);
});

test("and it composes clean: the code fits, the panel fills, the contrast holds", () => {
  const { variation } = reproduce();
  assert.equal(variation.codeFits, true);
  assert.equal(variation.runsFit, true);
  assert.equal(variation.fillsPanel, true);
  assert.equal(variation.contrastHolds, true);
  assert.ok(
    variation.panelFill >= SHEET_LANGUAGE.floors.panelFill,
    `the example fills ${variation.panelFill} of the panel, under the ${SHEET_LANGUAGE.floors.panelFill} floor`
  );
});

test("the same seed reproduces it, which is what the slug is for", () => {
  assert.equal(reproduce().composition.toSVG(), reproduce().composition.toSVG());
});

test("the report the example prints is the report the README shows", () => {
  // The figures in `examples/README.md` are a transcript of a real run. A
  // transcript nobody checks becomes a transcript of a run that no longer
  // happens, and a reader who runs the example is the one who finds out.
  const { variation } = reproduce();
  const printed = report(variation);
  for (const line of [
    `  top padding     ${variation.topPadding} px`,
    `  left inset      ${variation.leftInset} px`,
    `  line spacing    ${variation.lineSpacing.toFixed(2)} px`,
    `  code cap        ${variation.codeCap} px`,
  ]) {
    assert.ok(printed.includes(line), `the example no longer prints "${line.trim()}"`);
    assert.ok(readme.includes(line), `examples/README.md does not show "${line.trim()}"`);
  }
  assert.match(readme, new RegExp(`${(variation.panelFill * 100).toFixed(1)}%`));
  assert.match(readme, new RegExp(`${variation.seed}`), "the README does not show the seed's hashed value");
});

test("a theme moves every paint and not one coordinate", () => {
  // The claim the pair exists to demonstrate, from both sides at once.
  const recorded = reproduce();
  const themed = restyle();
  assert.deepEqual(geometryOf(themed.variation), geometryOf(recorded.variation));

  const recordedPaints = new Set(paintsOf(recorded.composition));
  const themedPaints = new Set(paintsOf(themed.composition));
  assert.ok(themedPaints.size > 1, "the themed sheet draws in one colour, so nothing is being compared");
  // White is the light ground in both palettes and is expected to be shared.
  // Anything else shared would mean a role the theme failed to re-tint.
  const shared = [...themedPaints].filter((paint) => recordedPaints.has(paint));
  assert.deepEqual(shared, ["#FFFFFF"]);
});

test("and a seed moves geometry without touching a paint", () => {
  // The other half of the same claim. Without this, "the axes are
  // independent" is only half demonstrated: a theme that changed no geometry
  // proves nothing if a seed changes colour.
  const first = composeSheet(splicingArrays, { seed: SEED });
  const second = composeSheet(splicingArrays, { seed: "a-different-slug" });
  assert.notDeepEqual(geometryOf(second.variation), geometryOf(first.variation));
  assert.deepEqual(new Set(paintsOf(second.composition)), new Set(paintsOf(first.composition)));
});

test("every ink the theme draws clears the text floor on the ground it is on", () => {
  const { variation } = restyle();
  const failures = variation.contrast.filter((pairing) => !pairing.holds);
  assert.deepEqual(
    failures.map((pairing) => `${pairing.name}: ${pairing.ink} on ${pairing.ground} at ${pairing.ratio.toFixed(2)}:1`),
    [],
    "the second theme draws text nobody can read"
  );
  assert.equal(variation.contrastHolds, true);
  assert.ok(contrastTable(variation.contrast).length > 0, "the table the example prints is empty");
});

test("the theme's accent sits where the recorded green sits, so the substitution stays live", () => {
  // `readableInk` swaps exactly one colour: the language's own accent, where
  // it has to carry text on a ground it cannot be read on. A theme whose
  // accent happens to clear the floor everywhere would make that machinery
  // silently inert, and the example would demonstrate a check that never
  // fires. The recorded green is 2.80:1 on white; this is held to the same
  // side of the floor.
  const floor = emberTheme.contrast.text;
  const white = emberTheme.colors.white;
  assert.ok(
    contrastRatio(SHEET_LANGUAGE.colors.green, SHEET_LANGUAGE.colors.white) < floor,
    "the recorded green now passes as text, so this comparison has lost its subject"
  );
  assert.ok(
    contrastRatio(emberTheme.colors.green, white) < floor,
    "the theme's accent would pass as text, unlike the record's"
  );
  assert.ok(
    contrastRatio(emberTheme.colors.greenOnWhite, white) >= floor,
    "the theme nominates a substitute that is no more readable than what it replaces"
  );
});

test("both examples are wired to the same document, so the pair really is a pair", () => {
  assert.equal(restyle().variation.seed, reproduce().variation.seed);
  assert.equal(EMBER, "ember");
  assert.match(readme, /reproduce-sheet\.mjs/);
  assert.match(readme, /restyle-sheet\.mjs/);
});
