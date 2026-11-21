// Holds every composed `javascript` sheet to the per-line role rule its own
// language fixes, and records the one group that is exempt and why.
//
// ## Why this is a second file rather than a wider `CATEGORY`
//
// `tools/test-sheet-syntax-roles.mjs` holds the `html-css` category to the
// three mappings `DESIGN_LANGUAGE-html-css.md` writes down, and the note at the
// top of it says the rule belongs to a **language** rather than to a category.
// The `javascript` category writes JavaScript, the `javascript` mapping exists,
// and nothing was applying it there.
//
// What stopped that file simply widening is the eleven `javaScriptArrays`
// sheets. They are transcriptions of hand composed artwork - the reference the
// whole design language was measured off - and they predate the mapping by a
// month: run against the rule they report 146 departures across 238 non-blank
// lines, almost all of them a `console.log` call declared `plain` where the
// rule gives `identifier`. Those are not defects to fix. The images are what
// the repository reproduces, their documents say what the images draw, and
// re-colouring them to satisfy a rule written afterwards would move the one
// thing held fixed.
//
// So the category is read with that group named as the exception, which is a
// decision with a reason rather than a filter: a sheet added anywhere else
// under `javascript/` is held to the rule from the day it lands.
//
// ## What the rule is, and where it is written
//
// The `javascript` table and its derivation are in
// `DESIGN_LANGUAGE-html-css.md`, written there on 2026.10.26 for the **HTML
// APIs** sheets, and the derivation itself is `MAPPINGS.javascript` in
// `tools/test-sheet-syntax-roles.mjs`. Both are imported rather than restated:
// a second copy of a mapping is a second authority, and the roles of the nine
// sheets of the third set were **derived** from this one rather than written by
// hand, so a copy here that drifted would pass a sheet the generator would not
// produce.
//
// Run with: node --test tools/test-javascript-sheet-roles.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MAPPINGS } from "./test-sheet-syntax-roles.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "cheatsheets.json"), "utf8"));

/** The category whose sheets this file holds to the rule. */
const CATEGORY = "javascript";

/**
 * The groups of the category that transcribe artwork rather than being written
 * to the rule, with the reason each is exempt.
 *
 * **A record of one decision, not a list that grows.** A new group added here
 * would be new work declaring itself a transcription, which only the eleven
 * images are. The count below is asserted so an exemption cannot be added
 * without this comment being read.
 */
const TRANSCRIBED = [
  {
    group: "arrays",
    sheets: 11,
    note:
      "the eleven javaScriptArrays images, transcribed. Their documents say what the artwork " +
      "draws and the artwork predates the javascript mapping by a month: against the rule they " +
      "report 146 departures across 238 non-blank lines, nearly all a console.log call declared " +
      "plain where the rule gives identifier. Re-colouring them would move the reference the " +
      "whole design language was measured off. See javaScriptArrays/README.md",
  },
];

/** The declared role of a line, where `plain` is written by leaving it out. */
const declaredRole = (line) => line.role ?? "plain";

/** Every sheet of the category, from the catalog, with the group it sits in. */
const sheets = manifest.categories
  .filter((category) => category.id === CATEGORY)
  .flatMap((category) => category.cheatsheets)
  .map((sheet) => ({ path: sheet.path, group: sheet.group ?? "" }));

const exempt = new Map(TRANSCRIBED.map((row) => [row.group, row]));
const held = sheets.filter((sheet) => !exempt.has(sheet.group));

test("the category has sheets to hold to the rule at all", () => {
  // Without this every case below is vacuously true, which is the one way a
  // mapping check passes while checking no mapping. Nine as of 2026.11.21, when
  // the third set brought the category its first sheets written to the rule.
  assert.ok(sheets.length >= 20, `found ${sheets.length} sheets under ${CATEGORY}/`);
  assert.ok(held.length >= 9, `${held.length} of them are held to the rule, and nine were written to it`);
});

test("and the exemption is the one group on record, at the count it was recorded at", () => {
  assert.equal(TRANSCRIBED.length, 1, "a second exemption was added; read the note above before accepting one");
  for (const row of TRANSCRIBED) {
    const found = sheets.filter((sheet) => sheet.group === row.group);
    assert.equal(
      found.length,
      row.sheets,
      `${row.group} is recorded as ${row.sheets} sheets and holds ${found.length}: update the row or hold the new ones`
    );
  }
});

let measured = 0;

for (const sheet of held) {
  test(`${sheet.path} colours every line the way the javascript rule does`, () => {
    const doc = JSON.parse(readFileSync(join(root, ...sheet.path.split("/"), "sheet.json"), "utf8"));
    assert.equal(
      doc.language,
      "javascript",
      `${sheet.path} is under ${CATEGORY}/ and declares ${JSON.stringify(doc.language)}, ` +
        "which this file holds no mapping for"
    );
    const mapping = MAPPINGS.javascript;
    const mismatches = [];
    let state = mapping.start();
    doc.code.forEach((line, index) => {
      if (line.text.trim().length === 0) {
        state = mapping.reset(state);
        assert.equal(line.role, undefined, `row ${index + 1} is blank and declares a role`);
        return;
      }
      const expected = mapping.role(line.text, state);
      const written = declaredRole(line);
      measured += 1;
      if (written !== expected) {
        mismatches.push(`row ${index + 1} declares ${written} and the rule gives it ${expected}: ${line.text}`);
      }
      state = mapping.carry(line.text, state);
    });
    assert.deepEqual(
      mismatches,
      [],
      `${sheet.path} departs from the javascript mapping in DESIGN_LANGUAGE-html-css.md:\n  ${mismatches.join("\n  ")}`
    );
  });
}

test("and the reading covered every non-blank line it was supposed to", () => {
  // 186 lines across the nine sheets of the third set on 2026.11.21. A floor
  // rather than an equality, so a tenth sheet does not fail this case for
  // existing, and a floor at all so a derivation that started skipping lines
  // cannot pass by classifying none of them.
  assert.ok(measured >= 186, `classified ${measured} lines, and the sheets held carry at least 186`);
});
