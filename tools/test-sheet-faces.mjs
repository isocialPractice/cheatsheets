// Checks on the faces a generated sheet is measured in, and on the ruler that
// measures them.
//
// **One thing is under test here now, where there used to be two.** The cases
// about the drawing surface's own `font.mjs` - a face optional everywhere, and
// omitting one reproducing the built-in alphabet exactly - belonged to a hand
// translation of that surface, and they went with it on 2026.10.14 when the
// surface became a pinned copy of a published release and the composition
// stopped measuring through it at all.
//
// What is left is the half this repository owns: **the committed width table is
// still the table that was measured**, and the ruler reading it is still the
// arithmetic a renderer would have used. `api/cheatsheet/faces.mjs` carries
// numbers read out of a browser once and nothing re-reads them at run time, so
// the only thing standing between a typo and a sheet laid out wrong is a check
// against figures the artwork independently supplies.
//
// Run with: node --test tools/test-sheet-faces.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CODE_FACE,
  SHEET_CONDENSATION,
  SHEET_FACE,
  SHEET_FONT_FAMILY,
  STACK_CAP_HEIGHT,
  STACK_UNITS_PER_EM,
  TYPE_ROLES,
  centredAt,
  charAdvance,
  drawnWidth,
  kerning,
  measureRun,
  roleStyle,
  sizeForCap,
} from "../api/cheatsheet/faces.mjs";

// The one run of the artwork whose text is known, from **Where the text sits**
// in DESIGN_LANGUAGE.md. Everything measurable about a candidate face is
// checked against it, because it is the only string the repository can compare
// a prediction with.
const LEAD_IN = { text: "Starting Point for Practical Use:", width: 1481, cap: 112 };

const SAMPLE = "Splicing Array Elements: items.splice(1, 2, 'demo'); // (4) ~50%";

test("the ruler is the sum of the table, scaled, and nothing else", () => {
  // The arithmetic is checked against the table rather than against the drawing
  // surface that used to do it, because the surface is a dependency and this is
  // the layer's own ruler now. Summed independently here: a width that stopped
  // being the table's sum would be a sheet laid out by something other than the
  // figures `DESIGN_LANGUAGE.md` records.
  const size = sizeForCap(LEAD_IN.cap, SHEET_FACE);
  let expected = 0;
  for (const char of LEAD_IN.text) {
    expected += (SHEET_FACE.advances[char] / SHEET_FACE.unitsPerEm) * size;
  }
  assert.equal(measureRun(LEAD_IN.text, { fontSize: size, face: SHEET_FACE }), expected);
  assert.equal(measureRun("", { fontSize: size }), 0);
});

test("the trailing letter space is a gap after the run, not part of it", () => {
  // A centred run stays centred because of this one subtraction: counted in,
  // half a letter space of nothing would shift every centred line left.
  const size = 100;
  const spacing = 7;
  const plain = measureRun(SAMPLE, { fontSize: size, face: SHEET_FACE });
  const spaced = measureRun(SAMPLE, { fontSize: size, face: SHEET_FACE, letterSpacing: spacing });
  assert.ok(Math.abs(spaced - (plain + spacing * ([...SAMPLE].length - 1))) < 1e-9);

  // Word spacing is added per space and is not taken back off, because it is
  // inside the run rather than after it.
  const worded = measureRun(SAMPLE, { fontSize: size, face: SHEET_FACE, wordSpacing: 5 });
  assert.ok(Math.abs(worded - (plain + 5 * (SAMPLE.match(/ /g) ?? []).length)) < 1e-9);
});

test("centring puts the middle of the run the engine draws on the point it is given", () => {
  // The *drawn* middle, not the measured one. "Splicing Arrays" holds ` A`,
  // which the engine kerns by 55 units per em, so a left edge worked from the
  // advances alone puts half of that - 1.35 px at the page's 900px cap - of
  // ink on the wrong side of the axis. This is the case that says which ruler
  // `centredAt` reads.
  const size = sizeForCap(141, SHEET_FACE);
  const text = "Splicing Arrays";
  const left = centredAt(text, 1800, size, SHEET_FACE);
  const drawn = drawnWidth(text, { fontSize: size, face: SHEET_FACE });
  assert.ok(Math.abs(left + drawn / 2 - 1800) < 1e-9);
  // And it really is the other ruler: centred on the advances the same run
  // would start half a kern further left.
  const measured = measureRun(text, { fontSize: size, face: SHEET_FACE });
  assert.ok(
    Math.abs(left - (1800 - measured / 2) - Math.abs(kerning(text, size, SHEET_FACE)) / 2) < 1e-9,
    "centring is still working from the advances"
  );
});

test("a run holding none of the 96 pairs is centred exactly where it always was", () => {
  // The reason the ruler could move on its own: the two agree to the float for
  // every run the engine does not kern, so moving placement to the drawn width
  // left eighteen of the catalog's 34 centred runs untouched. The three runs a
  // generated sheet reuses from the artwork hold no pair either, which is what
  // keeps the four fixed-text widths `DESIGN_LANGUAGE.md` records exact; that
  // half of the claim is checked against the composed defaults in
  // `tools/test-sheet-brand.mjs` rather than against a copy of them here.
  const size = sizeForCap(141, SHEET_FACE);
  for (const text of [LEAD_IN.text, "Document Structure", "Images and Media", "Forms and Inputs"]) {
    assert.equal(kerning(text, size, SHEET_FACE), 0, `${JSON.stringify(text)} holds a kerned pair`);
    assert.equal(
      centredAt(text, 1800, size, SHEET_FACE),
      1800 - measureRun(text, { fontSize: size, face: SHEET_FACE }) / 2
    );
  }
});

test("every pair the stack kerns is negative, which is what lets fitting stay unkerned", () => {
  // The claim the split between the two rulers rests on, asserted rather than
  // observed. `capThatFits` and `widestLine` in `compose.mjs` measure with
  // `measureRun`, so they over-measure a run by whatever the engine kerns -
  // safe only while kerning can never widen a run. A face whose table carried
  // a positive pair would make the fitting optimistic instead, and a line of
  // code could be fitted to the panel and drawn past its edge.
  const pairs = SHEET_FACE.kerns;
  const positive = Object.entries(pairs).filter(([, units]) => units > 0);
  assert.deepEqual(positive, [], "a kerned pair widens its run, so fitting may no longer ignore kerning");
  assert.equal(Object.keys(pairs).length, 96, "the pair table is no longer the 96 that were measured");
  for (const text of [SAMPLE, LEAD_IN.text, "Max and Min Value Array", "nestArrayToChange["]) {
    assert.ok(
      drawnWidth(text, { fontSize: 100, face: SHEET_FACE }) <=
        measureRun(text, { fontSize: 100, face: SHEET_FACE }),
      `${JSON.stringify(text)} draws wider than it measures`
    );
  }
});

test("a character the face does not carry falls back rather than measuring zero", () => {
  // Non-ASCII is outside the committed table. Measuring it as nothing would let
  // a line of it overflow its region silently, which is worse than measuring it
  // approximately.
  assert.ok(charAdvance("é", 100, SHEET_FACE) > 0);
  assert.equal(charAdvance("é", 100, SHEET_FACE), charAdvance("0", 100, SHEET_FACE));
  // And an inherited property is not a glyph, however much a lookup on an
  // object literal wants to answer for it. Without the own-property guard,
  // `advances["constructor"]` is a function and the arithmetic returns NaN,
  // which propagates through every width on the line rather than raising.
  for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    const width = charAdvance(key, 100, SHEET_FACE);
    assert.ok(Number.isFinite(width), `charAdvance("${key}") is ${width}`);
    assert.equal(width, charAdvance("0", 100, SHEET_FACE), `"${key}" did not take the fallback advance`);
  }
});

test("the committed table reproduces what the browser measured", () => {
  // `node tools/measure-font-widths.mjs` read 2165 px for this run in Chromium.
  // The table rounds each advance to a whole unit per em, so the sum drifts by
  // a fraction of a pixel over 33 characters and no more than that.
  const width = measureRun(LEAD_IN.text, {
    fontSize: sizeForCap(LEAD_IN.cap, SHEET_FACE),
    face: SHEET_FACE,
  });
  assert.ok(
    Math.abs(width - 2165) < 2,
    `the committed table sets the lead-in at ${width.toFixed(1)} px, against the 2165 measured in a browser`
  );
});

test("the second ruler is the first one plus the pairs the engine kerns", () => {
  // `measureRun` is the composition's ruler and sums advances only.
  // `drawnWidth` is the engine's and adds the pair table on top, which is the
  // whole difference between where a split line's runs are placed and where
  // its glyphs are drawn.
  const size = 100;
  for (const text of ["", "A", "x", "no pairs here at all"]) {
    assert.equal(
      drawnWidth(text, { fontSize: size, face: CODE_FACE }),
      measureRun(text, { fontSize: size, face: CODE_FACE }),
      `${JSON.stringify(text)} was adjusted by a pair it does not hold`
    );
  }
  // Four pairs in `nestArrayToChange[`, and only `To` is in the table.
  const run = "nestArrayToChange[";
  assert.equal(kerning(run, size, CODE_FACE), (-111 / CODE_FACE.unitsPerEm) * size);
  assert.equal(
    drawnWidth(run, { fontSize: size, face: CODE_FACE }),
    measureRun(run, { fontSize: size, face: CODE_FACE }) + kerning(run, size, CODE_FACE)
  );
  // Summed over adjacent pairs, so three kerned pairs count three times.
  assert.equal(kerning("To To To", size, CODE_FACE), ((-111 * 3 - 18 * 2) / CODE_FACE.unitsPerEm) * size);
});

test("a pair holding a space is kerned, which is why a canvas could not measure this", () => {
  // The eight space pairs are the ones `measureText` reports as unkerned, so a
  // table read from a canvas would have been silently short by exactly these.
  // ` A = [` is the worst boundary the browser found on 2026.10.20, and both of
  // its kerned pairs hold a space.
  const size = 61.196;
  assert.equal(kerning(" A", size, CODE_FACE), (-55 / CODE_FACE.unitsPerEm) * size);
  assert.equal(kerning("A ", size, CODE_FACE), (-55 / CODE_FACE.unitsPerEm) * size);
  const drawn = drawnWidth(" A = [", { fontSize: size, face: CODE_FACE });
  // Chromium drew this run 137.813 units wide; the unkerned sum is 144.606.
  assert.ok(
    Math.abs(drawn - 137.813) < 0.1,
    `the kerned ruler sets " A = [" at ${drawn.toFixed(3)}, against the 137.813 drawn`
  );
});

test("a face with no pair table kerns nothing, rather than failing to measure", () => {
  // A replacement face is unkerned, not broken: `kerns` is optional on a Face
  // and a language may hand in one measured somewhere this table does not
  // describe.
  const bare = { ...CODE_FACE, kerns: undefined };
  assert.equal(kerning("To To", 100, bare), 0);
  assert.equal(
    drawnWidth("To To", { fontSize: 100, face: bare }),
    measureRun("To To", { fontSize: 100, face: bare })
  );
  // And a pair spelling an inherited property is not a pair, for the reason
  // `charAdvance` carries the same guard: without it the lookup finds a
  // function and the arithmetic returns NaN over the whole line.
  for (const pair of ["constructor", "toString", "__proto__"]) {
    const units = kerning(pair, 100, CODE_FACE);
    assert.ok(Number.isFinite(units), `kerning("${pair}") is ${units}`);
  }
  assert.equal(kerning("to", 100, CODE_FACE), 0, "a lower case to is not the To pair");
});

test("and the condensation it records is the one the artwork implies", () => {
  const width = measureRun(LEAD_IN.text, {
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
  const widths = ["i", "W", "m", "l", "."].map((c) => charAdvance(c, 100, CODE_FACE));
  assert.ok(new Set(widths).size > 1, "the code face advances every character equally, so it is a grid");
});

test("a face names the family it was measured from, so the two cannot diverge", () => {
  assert.equal(SHEET_FACE.fontFamily, SHEET_FONT_FAMILY);
  assert.equal(CODE_FACE.fontFamily, SHEET_FONT_FAMILY);
});

test("an unknown type role is refused by name rather than returning a default", () => {
  assert.throws(() => roleStyle("headline"), /no type role named "headline"/);
  // Including one that Object.prototype would otherwise answer for.
  assert.throws(() => roleStyle("constructor"), /no type role named "constructor"/);
});
