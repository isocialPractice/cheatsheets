// Holds every `html-css` sheet to the per-line mapping its own design language
// fixes.
//
// `DESIGN_LANGUAGE-html-css.md`, under **What this category adds on top of the
// global record**, settles what colour a line of an example takes. Nothing in
// `tools/` pinned that: `tools/test-language-asset.mjs` checks the role
// *colours* and never which line takes which role, so a line given the wrong
// role was a thing a reader saw and no case failed on.
//
// It was one line, found by applying the markup table by hand to all 130
// non-blank lines of the first six sheets on 2026.10.19 - 129 agreed and
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
// ## Two languages, two tables, and why they are not one table
//
// The category carries markup and CSS, and the design language gives each its
// own table because the orders differ. Markup tests configuration before
// structure: a line carrying an attribute is `identifier` even though it is
// also a tag. CSS has to test structure first, because a selector may carry a
// colon - `a:hover`, `p::first-line` and an `@media` width query all do - and
// a declaration test applied first would read every one of them as a property.
//
// So the dispatch below is on the sheet's declared `language`, and a sheet
// declaring one this file has no table for fails rather than being skipped.
// Skipping is how a third language would arrive in the category with nothing
// holding it to anything, which is the state this file exists to end.
//
// Four things the derivations have to get right, all learned by getting them
// wrong:
//
// - **The open-tag state is carried across lines, not read off the line
//   before.** In `images-and-media` the `<img src=.. alt=..` / `srcset=..` /
//   `sizes=..>` construction wraps over three rows and the middle row holds no
//   `<` at all, so a one-line lookback calls the third row a fresh tag.
// - **A blank line resets the markup state.** A `""` entry ends any open tag
//   for the purpose of the rule, and is skipped rather than classified.
// - **The CSS derivation resets nothing on a blank line**, and the difference
//   is not an oversight. Markup's open-tag state is a heuristic standing in
//   for a parser; CSS's brace depth is the real structure of the document, and
//   a blank line between two declarations ends neither the block nor the rule.
//   Resetting there would read the next declaration as a selector.
// - **A CSS comment is taken out of the line before anything measures it.** A
//   colon inside one would otherwise open a declaration that never existed,
//   and the first sheet of the CSS group opens on a comment carrying a colon,
//   so the rule under it would have read as a wrapped value.
//
// Run with: node --test tools/test-sheet-syntax-roles.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The category whose mappings this file holds. */
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
 * The role the markup rule gives a line, tested in the rule's own order.
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

/**
 * A CSS line with its block comments removed, and whether one is still open.
 *
 * The removal is what lets every later test read punctuation as punctuation.
 * It is also what carries a comment across rows: an unterminated one leaves
 * `comment` true, and the row below it is a comment whatever it holds.
 *
 * @param {string} text
 * @param {boolean} open Whether a comment opened above it is still open.
 * @returns {{ code: string, comment: boolean }}
 */
export function stripCssComments(text, open) {
  let code = "";
  let state = open;
  let at = 0;
  while (at < text.length) {
    if (state) {
      const end = text.indexOf("*" + "/", at);
      if (end === -1) break;
      state = false;
      at = end + 2;
    } else {
      const start = text.indexOf("/" + "*", at);
      if (start === -1) {
        code += text.slice(at);
        break;
      }
      code += text.slice(at, start);
      state = true;
      at = start + 2;
    }
  }
  return { code, comment: state };
}

/**
 * Everything the CSS rule carries from one line to the next.
 *
 * `blocks` is what makes the mapping decidable rather than guessed at. A
 * property and a pseudo-selector are the same shape - a name, a colon, then
 * something after it - and what tells them apart is whether a rule's block is
 * open around them. An at-rule opens a block that holds selectors rather than
 * declarations, so the kind of each open block is recorded and not just how
 * many there are.
 *
 * @typedef {object} CssState
 * @property {boolean} comment A comment opened above and nothing has closed it.
 * @property {boolean} value A declaration's colon was read and no `;` ended it.
 * @property {number} parens How deep inside `(` the line above ended.
 * @property {Array<'rule' | 'at'>} blocks The open blocks, outermost first.
 * @property {string} prelude Text read since the last structural character.
 */

/** The state a CSS document starts in. */
export function startCss() {
  return { comment: false, value: false, parens: 0, blocks: [], prelude: "" };
}

/**
 * The state at the end of a CSS line, given the state it started in.
 *
 * A colon opens a value and a semicolon closes it, both only outside
 * parentheses: `rgb(0 1 51 / 24%)` and an `@media` width query each carry
 * punctuation that means something else inside the brackets.
 *
 * @param {string} text
 * @param {CssState} state
 * @returns {CssState}
 */
export function carryCssState(text, state) {
  const { code, comment } = stripCssComments(text, state.comment);
  let { value, parens, prelude } = state;
  const blocks = state.blocks.slice();
  for (const char of code) {
    if (char === "(") {
      parens += 1;
      prelude += char;
    } else if (char === ")") {
      parens = Math.max(0, parens - 1);
      prelude += char;
    } else if (parens > 0) {
      prelude += char;
    } else if (char === ":") {
      // Only inside a rule's own block. Outside one a colon belongs to a
      // selector - `*::before,` and `a[href^="https"]:hover` both carry one -
      // and reading it as a declaration's colon made the row under a split
      // selector list a wrapped value. That is what `*::after {` reported on
      // 2026.10.23.
      if (blocks[blocks.length - 1] === "rule") value = true;
      prelude += char;
    } else if (char === ";") {
      value = false;
      prelude = "";
    } else if (char === "{") {
      // The prelude is the selector or the at-rule that opened this block, and
      // it is carried across rows so a selector list split over two of them is
      // still read off its first row.
      blocks.push(prelude.trimStart().startsWith("@") ? "at" : "rule");
      value = false;
      prelude = "";
    } else if (char === "}") {
      blocks.pop();
      value = false;
      prelude = "";
    } else {
      prelude += char;
    }
  }
  return { comment, value, parens, blocks, prelude };
}

/**
 * The role the CSS rule gives a line, tested in the rule's own order.
 *
 * @param {string} text The line, exactly as the document carries it.
 * @param {CssState} state
 * @returns {'comment' | 'string' | 'identifier' | 'keyword' | 'plain'}
 */
export function roleForCssLine(text, state) {
  if (state.comment || text.trimStart().startsWith("/" + "*")) return "comment";
  if (state.value) return "string";
  const { code } = stripCssComments(text, false);
  // Structure first, and this is the order that differs from markup's. A line
  // that opens a block is the selector or the at-rule, whatever punctuation it
  // shares with a declaration, and a line that is nothing but a brace closes
  // one.
  if (code.includes("{") || code.trim() === "}") return "keyword";
  const inRule = state.blocks[state.blocks.length - 1] === "rule";
  if (inRule && /^\s*[-a-zA-Z][-a-zA-Z0-9]*\s*:/.test(code)) return "identifier";
  // Outside a rule's own block there is nothing else a line can be: a selector
  // the list continues with a comma, or an at-rule carrying no block.
  if (!inRule) return "keyword";
  return "plain";
}

/**
 * The two mappings, by the `language` a sheet declares.
 *
 * `reset` is what a blank line does. Markup clears its open-tag state there;
 * CSS clears nothing, per the note at the top of this file.
 */
export const MAPPINGS = {
  html: {
    start: () => false,
    role: (text, state) => roleForLine(text, state),
    carry: (text, state) => carryOpenTag(text, state),
    reset: () => false,
  },
  css: {
    start: startCss,
    role: roleForCssLine,
    carry: carryCssState,
    reset: (state) => state,
  },
};

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

test("the category has sheets to hold to its rules at all", () => {
  // Without this every case below is vacuously true, which is the one way a
  // mapping check passes while checking no mapping. Twelve as of 2026.10.23,
  // when **General CSS Overview** brought the category its second language.
  assert.ok(sheets.length >= 12, `found ${sheets.length} cheatsheets under ${CATEGORY}/`);
});

let measured = 0;
/** Non-blank lines classified, per language, for the case at the bottom. */
const perLanguage = {};

for (const folder of sheets) {
  const name = folder.slice(root.length + 1).split(/[\\/]/).join("/");
  test(`${name} colours every line the way its rule does`, () => {
    const doc = JSON.parse(readFileSync(join(folder, "sheet.json"), "utf8"));
    const declared = typeof doc.language === "string" ? doc.language : "";
    const mapping = Object.prototype.hasOwnProperty.call(MAPPINGS, declared)
      ? MAPPINGS[declared]
      : undefined;
    assert.ok(
      mapping,
      `${name} declares language ${JSON.stringify(doc.language)}, which this file holds no mapping for. ` +
        `Add its table to DESIGN_LANGUAGE-${CATEGORY}.md and its derivation here`
    );

    const mismatches = [];
    let state = mapping.start();
    doc.code.forEach((line, index) => {
      if (line.text.trim().length === 0) {
        // A blank line carries no colour, so a role on one would be a colour
        // on nothing and is a fault of its own.
        state = mapping.reset(state);
        assert.equal(line.role, undefined, `row ${index + 1} is blank and declares a role`);
        return;
      }
      const expected = mapping.role(line.text, state);
      const written = declaredRole(line);
      measured += 1;
      perLanguage[declared] = (perLanguage[declared] ?? 0) + 1;
      if (written !== expected) {
        mismatches.push(`row ${index + 1} declares ${written} and the rule gives it ${expected}: ${line.text}`);
      }
      state = mapping.carry(line.text, state);
    });
    assert.deepEqual(
      mismatches,
      [],
      `${name} departs from the ${declared} mapping in DESIGN_LANGUAGE-${CATEGORY}.md:\n  ${mismatches.join("\n  ")}`
    );
  });
}

test("and the reading covered every non-blank line in the category", () => {
  // 130 markup lines on 2026.10.19, when that mapping was applied by hand, and
  // 149 CSS lines on 2026.10.23. Each figure is asserted as a floor rather
  // than an equality so a thirteenth sheet does not fail this case for
  // existing, and as a floor at all so a derivation that started skipping
  // lines cannot pass by classifying none of them.
  assert.ok(perLanguage.html >= 130, `classified ${perLanguage.html} markup lines, and the six sheets hold at least 130`);
  assert.ok(perLanguage.css >= 149, `classified ${perLanguage.css} CSS lines, and the six sheets hold at least 149`);
  assert.ok(measured >= 279, `classified ${measured} lines in all, and the category holds at least 279`);
});
