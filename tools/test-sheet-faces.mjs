// Checks on the faces a generated sheet is measured in, and on the one local
// change made to the ported `font.mjs` to accept them.
//
// Two separable things are under test here and it is worth saying which is
// which, because they fail for different reasons:
//
//   1. **The port still behaves as it was ported.** A face is optional
//      everywhere, and omitting one has to reproduce the built-in alphabet
//      exactly. If that stops holding, a later diff against upstream stops
//      being readable and the port quietly became a fork.
//   2. **The committed width table is still the table that was measured.**
//      `api/cheatsheet/faces.mjs` carries numbers read out of a browser once.
//      Nothing re-reads them at run time, so the only thing standing between a
//      typo and a sheet laid out wrong is a check against figures the artwork
//      independently supplies.
//
// Run with: node --test tools/test-sheet-faces.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BUILTIN_FACE,
  charWidth,
  fontMetrics,
  layoutText,
  lineStrokes,
  measureText,
  wrapText,
} from "../api/graphic-design/font.mjs";
import {
  CODE_FACE,
  SHEET_CONDENSATION,
  SHEET_FACE,
  SHEET_FONT_FAMILY,
  STACK_CAP_HEIGHT,
  STACK_UNITS_PER_EM,
  TYPE_ROLES,
  roleStyle,
  sizeForCap,
} from "../api/cheatsheet/faces.mjs";

// The one run of the artwork whose text is known, from **Where the text sits**
// in DESIGN_LANGUAGE.md. Everything measurable about a candidate face is
// checked against it, because it is the only string the repository can compare
// a prediction with.
const LEAD_IN = { text: "Starting Point for Practical Use:", width: 1481, cap: 112 };

const SAMPLE = "Splicing Array Elements: items.splice(1, 2, 'demo'); // (4) ~50%";

test("naming no face measures exactly what the built-in face measures", () => {
  // The whole backward-compatibility claim in one case. Sizes chosen to include
  // a fraction, because the conversion is a division and a rounding bug would
  // hide at whole numbers.
  for (const size of [1, 8, 16, 37.5, 152.727, 1000]) {
    assert.equal(
      measureText(SAMPLE, { fontSize: size }),
      measureText(SAMPLE, { fontSize: size, face: BUILTIN_FACE }),
      `measureText disagrees with itself at ${size}`
    );
    assert.deepEqual(
      fontMetrics(size, "bold", "italic"),
      fontMetrics(size, "bold", "italic", BUILTIN_FACE),
      `fontMetrics disagrees with itself at ${size}`
    );
    for (const char of ["W", " ", "i", "@", "é"]) {
      assert.equal(charWidth(char, size), charWidth(char, size, BUILTIN_FACE));
    }
  }
});

test("and lays out and strokes identically too", () => {
  const options = { x: 10, y: 20, fontSize: 24, lineHeight: 1.4, align: "justify", baseline: "top", maxWidth: 200 };
  assert.deepEqual(layoutText(SAMPLE, options), layoutText(SAMPLE, { ...options, face: BUILTIN_FACE }));
  assert.deepEqual(
    lineStrokes("Wig", 0, 0, { fontSize: 24 }),
    lineStrokes("Wig", 0, 0, { fontSize: 24, face: BUILTIN_FACE })
  );
});

test("a character the face does not carry falls back rather than measuring zero", () => {
  // Non-ASCII is outside the committed table. Measuring it as nothing would let
  // a line of it overflow its region silently, which is worse than measuring it
  // approximately.
  assert.ok(charWidth("é", 100, SHEET_FACE) > 0);
  assert.equal(charWidth("é", 100, SHEET_FACE), charWidth("0", 100, SHEET_FACE));
  // And an inherited property is not a glyph, however much a lookup on an
  // object literal wants to answer for it. Without the own-property guard,
  // `advances["constructor"]` is a function and the arithmetic returns NaN,
  // which propagates through every width on the line rather than raising.
  for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    const width = charWidth(key, 100, SHEET_FACE);
    assert.ok(Number.isFinite(width), `charWidth("${key}") is ${width}`);
    assert.equal(width, charWidth("0", 100, SHEET_FACE), `"${key}" did not take the fallback advance`);
  }
});

test("the built-in alphabet is wrong for these sheets, which is why a face exists", () => {
  // The measurement that settled the route. If this ever came back near 1481,
  // the whole of `faces.mjs` would be unnecessary - so it is asserted rather
  // than assumed, in the direction that matters.
  const builtin = measureText(LEAD_IN.text, { fontSize: (LEAD_IN.cap * 15) / 11 });
  assert.ok(
    builtin > LEAD_IN.width * 1.5,
    `the built-in alphabet predicts ${builtin.toFixed(0)} px for a run the artwork measures at ${LEAD_IN.width}`
  );
});

test("the committed table reproduces what the browser measured", () => {
  // `node tools/measure-font-widths.mjs` read 2165 px for this run in Chromium.
  // The table rounds each advance to a whole unit per em, so the sum drifts by
  // a fraction of a pixel over 33 characters and no more than that.
  const width = measureText(LEAD_IN.text, {
    fontSize: sizeForCap(LEAD_IN.cap, SHEET_FACE),
    face: SHEET_FACE,
  });
  assert.ok(
    Math.abs(width - 2165) < 2,
    `the committed table sets the lead-in at ${width.toFixed(1)} px, against the 2165 measured in a browser`
  );
});

test("and the condensation it records is the one the artwork implies", () => {
  const width = measureText(LEAD_IN.text, {
    fontSize: sizeForCap(LEAD_IN.cap, SHEET_FACE),
    face: SHEET_FACE,
  });
  const implied = LEAD_IN.width / width;
  assert.ok(
    Math.abs(implied - SHEET_CONDENSATION) < 0.001,
    `the table implies a condensation of ${implied.toFixed(4)} against the recorded ${SHEET_CONDENSATION}`
  );
  // And it is a condensation rather than an expansion, which is the direction
  // **The faces are not named** found among all 481 fonts surveyed.
  assert.ok(SHEET_CONDENSATION < 1);
});

test("a cap height resolves to the size that actually reaches it", () => {
  for (const cap of [220, 154, 141, 112]) {
    const size = sizeForCap(cap, SHEET_FACE);
    const reached = (size * STACK_CAP_HEIGHT) / STACK_UNITS_PER_EM;
    assert.ok(Math.abs(reached - cap) < 1e-9, `${cap} px cap resolves to a face reaching ${reached}`);
  }
});

test("the four type roles are the four cap heights the artwork was measured at", () => {
  // Four sizes chosen by hand, not a scale: the steps between them are 1.26,
  // 1.13 and 1.20. Reconstructing them from a base and a ratio is the mistake
  // this case exists to catch.
  assert.deepEqual(
    Object.values(TYPE_ROLES).map((role) => role.cap),
    [220, 154, 141, 112]
  );
  const caps = Object.values(TYPE_ROLES).map((role) => role.cap);
  const ratios = caps.slice(0, -1).map((cap, i) => cap / caps[i + 1]);
  const spread = Math.max(...ratios) - Math.min(...ratios);
  assert.ok(spread > 0.1, "the four sizes would be one scale, which the design language says they are not");
});

test("the masthead is the lighter weight, and the other three are not", () => {
  // Read relatively, which is all the artwork supports: the three body roles sit
  // between 12.3% and 12.8% of their cap and the masthead at 8.6%.
  assert.ok(TYPE_ROLES.masthead.stemShare < TYPE_ROLES.title.stemShare);
  assert.ok(TYPE_ROLES.masthead.fontWeight < TYPE_ROLES.title.fontWeight);
  for (const name of ["followLine", "title", "leadIn"]) {
    assert.equal(TYPE_ROLES[name].fontWeight, 400, `${name} is not the regular weight`);
  }
});

test("the code face is the text face, because the sheets' code is proportional", () => {
  // Tested in the artwork rather than assumed: the gaps between glyph run
  // starts miss one advance by 0.186 to 0.230 on all eleven, against 0.007 to
  // 0.023 for the line-spacing control. A monospaced code face here would be an
  // invention.
  assert.deepEqual(CODE_FACE.advances, SHEET_FACE.advances);
  const widths = ["i", "W", "m", "l", "."].map((c) => charWidth(c, 100, CODE_FACE));
  assert.ok(new Set(widths).size > 1, "the code face advances every character equally, so it is a grid");
});

test("a face names the family it was measured from, so the two cannot diverge", () => {
  assert.equal(SHEET_FACE.fontFamily, SHEET_FONT_FAMILY);
  assert.equal(CODE_FACE.fontFamily, SHEET_FONT_FAMILY);
  assert.equal(BUILTIN_FACE.fontFamily, undefined, "the built-in face draws its own glyphs and names no family");
});

test("wrapping breaks where the face says, not where the built-in alphabet does", () => {
  const text = "Add and remove array elements in a single call";
  const options = { fontSize: sizeForCap(112, SHEET_FACE) };
  const inFace = wrapText(text, 1200, { ...options, face: SHEET_FACE });
  const inBuiltin = wrapText(text, 1200, options);
  assert.notDeepEqual(inFace, inBuiltin, "the two faces break identically, so the face is not reaching wrapText");
  assert.ok(inFace.every((line) => measureText(line, { ...options, face: SHEET_FACE }) <= 1200));
});

test("an unknown type role is refused by name rather than returning a default", () => {
  assert.throws(() => roleStyle("headline"), /no type role named "headline"/);
  // Including one that Object.prototype would otherwise answer for.
  assert.throws(() => roleStyle("constructor"), /no type role named "constructor"/);
});
