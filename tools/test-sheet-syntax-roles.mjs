// Holds every `html-css` sheet to the per-line mapping its own design language
// fixes.
//
// `DESIGN_LANGUAGE-html-css.md`, under **What this category adds on top of the
// global record**, settles what colour a line of markup takes, as five tests in
// order. Nothing in `tools/` pinned that: `tools/test-language-asset.mjs`
// checks the role *colours* and never which line takes which role, so a line
// given the wrong role was a thing a reader saw and no case failed on.
//
// It was one line, found by applying the table by hand to all 130 non-blank
// lines of the six sheets on 2026.10.19 - 129 agreed and
// `forms-and-inputs` row 15 did not. This is that reading, written down, so the
// next category's sheets are held to their own mapping the same way.
//
// **The per-line role is the fallback now, not what draws.** Token colouring
// landed on 2026.10.20 and a sheet that names its `language` is coloured scope
// by scope, so this mapping is what a panel falls back to when no grammar is
// installed - and it is still the thing the design language records, still
// what every sheet declares, and still worth being consistent. What the tokens
// draw is held by `tools/test-sheet-accents.mjs` instead.
//
// Two things the derivation has to get right, both learned by getting them
// wrong:
//
// - **The open-tag state is carried across lines, not read off the line
//   before.** In `images-and-media` the `<img src=.. alt=..` / `srcset=..` /
//   `sizes=..>` construction wraps over three rows and the middle row holds no
//   `<` at all, so a one-line lookback calls the third row a fresh tag.
// - **A blank line resets the state.** A `""` entry ends any open tag for the
//   purpose of the rule, and is skipped rather than classified.
//
// Run with: node --test tools/test-sheet-syntax-roles.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The category whose mapping this file holds. */
const CATEGORY = "html-css";

/**
 * Whether a tag is still open at the end of a line, given how it started.
 *
 * Every `<` opens and every `>` closes, walked character by character, which is
 * coarse and is the right coarseness: the rule it serves is about whether a
 * line is a continuation, and a `>` inside a quoted attribute value would have
 * to be written `&gt;` in markup anybody ships.
 *
 * @param {string} text
 * @param {boolean} open
 * @returns {boolean}
 */
export function carryOpenTag(text, open) {
  let state = open;
  for (const char of text) {
    if (char === "<") state = true;
    else if (char === ">") state = false;
  }
  return state;
}

/**
 * The role the category's rule gives a line, tested in the rule's own order.
 *
 * @param {string} text The line, exactly as the document carries it.
 * @param {boolean} open Whether a tag opened above it is still open.
 * @returns {'comment' | 'string' | 'identifier' | 'keyword' | 'plain'}
 */
export function roleForLine(text, open) {
  if (text.trimStart().startsWith("<!--")) return "comment";
  if (open) return "string";
  // An attribute is a name before an `=`, or one of markup's valueless ones.
  // Both forms appear in the six sheets - `type="email"` and `required` - and
  // the rule says "carries an attribute anywhere in it" rather than naming a
  // form.
  if (/\s[a-zA-Z][a-zA-Z0-9-]*\s*=/.test(text) || /\s(?:required|checked|disabled|readonly|multiple|selected|async|defer|hidden|open|novalidate|autofocus)\b/.test(text)) {
    return "identifier";
  }
  // "Nothing but tags once the tags are removed" - including a doctype, which
  // is markup's own and is structure by every reading of the table.
  if (text.replace(/<[^>]*>/g, "").trim().length === 0) return "keyword";
  return "plain";
}

/** The declared role of a line, where `plain` is written by leaving it out. */
function declaredRole(line) {
  return line.role ?? "plain";
}

/** Every cheatsheet folder in the category, deepest level first. */
function cheatsheets(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    const names = readdirSync(path);
    if (names.includes("sheet.json")) found.push(path);
    else cheatsheets(path, found);
  }
  return found;
}

const sheets = cheatsheets(join(root, CATEGORY));

test("the category has sheets to hold to its rule at all", () => {
  // Without this every case below is vacuously true, which is the one way a
  // mapping check passes while checking no mapping.
  assert.ok(sheets.length >= 6, `found ${sheets.length} cheatsheets under ${CATEGORY}/`);
});

let measured = 0;

for (const folder of sheets) {
  const name = folder.slice(root.length + 1).split(/[\\/]/).join("/");
  test(`${name} colours every line the way the rule does`, () => {
    const doc = JSON.parse(readFileSync(join(folder, "sheet.json"), "utf8"));
    const mismatches = [];
    let open = false;
    doc.code.forEach((line, index) => {
      if (line.text.trim().length === 0) {
        // A blank line ends any open tag and is not classified. A role on one
        // would be a colour on nothing, so it is a fault of its own.
        open = false;
        assert.equal(line.role, undefined, `row ${index + 1} is blank and declares a role`);
        return;
      }
      const expected = roleForLine(line.text, open);
      const declared = declaredRole(line);
      measured += 1;
      if (declared !== expected) {
        mismatches.push(`row ${index + 1} declares ${declared} and the rule gives it ${expected}: ${line.text}`);
      }
      open = carryOpenTag(line.text, open);
    });
    assert.deepEqual(
      mismatches,
      [],
      `${name} departs from the mapping in DESIGN_LANGUAGE-${CATEGORY}.md:\n  ${mismatches.join("\n  ")}`
    );
  });
}

test("and the reading covered every non-blank line in the category", () => {
  // 130 on 2026.10.19, when the mapping was applied by hand. The figure is
  // asserted as a floor rather than an equality so a seventh sheet does not
  // fail this case for existing, and as a floor at all so a derivation that
  // started skipping lines cannot pass by classifying none of them.
  assert.ok(measured >= 130, `classified ${measured} lines, and the six sheets hold at least 130`);
});
