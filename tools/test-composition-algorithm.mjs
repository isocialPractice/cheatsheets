// Checks on the composition algorithm and on the seed that varies it.
//
// Three properties are under test, and they are the three the roadmap asked
// for:
//
//   1. **The language is transcribed, not paraphrased.** `language.mjs` carries
//      `DESIGN_LANGUAGE.md` in the form the algorithm reads. Two records of the
//      same thing drift, so the arithmetic the document states - the bands
//      closing on 3600, the divisions closing after the panel is dropped a
//      step, the tokens being multiples of the step - is checked here rather
//      than trusted.
//   2. **A composition draws to that language.** Every region lands where the
//      artwork puts it, and a run that cannot fit its region is made smaller
//      rather than allowed to overflow it.
//   3. **A variation is a function of its seed and nothing else.** Same seed,
//      identical bytes, in both formats; different seed, a different sheet;
//      and the only figures that move between two seeds are the three the
//      design language found free.
//
// The third is the one worth being careful about, because it fails silently.
// A composition that consulted a clock or a counter would still produce a sheet
// that looked right, and nobody would find out until a regeneration came back
// different from the render that was reviewed.
//
// Run with: node --test tools/test-composition-algorithm.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  BANDS,
  CANVAS,
  CAP_SHARE,
  CODE_FACE,
  COLORS,
  CONTRAST,
  DIVISIONS,
  FLOORS,
  PANEL_FREEDOM,
  RULES,
  RUNS,
  SHEET_CONDENSATION,
  SHEET_FACE,
  SHEET_LANGUAGE,
  STEP,
  SYNTAX,
  TOKENS,
  TYPE_ROLES,
  centredAt,
  checkPaints,
  composeSheet,
  contrastRatio,
  parseSheetColor,
  parseSheetPaint,
  readableInk,
  seedFrom,
  sizeForCap,
  splitmix32,
  Variation,
} from "../api/cheatsheet/index.mjs";

/**
 * XML escaping, as the SVG writer does it.
 *
 * Written out here rather than imported: the published drawing surface's root
 * entry exports no `escapeXml`, and a test that needed one line of a dependency
 * is a test that should carry the line. The five characters are the ones an
 * attribute or a text node cannot hold.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * A document with enough code to fill the panel, as all eleven sheets have.
 *
 * "Enough" is a row count rather than a line count, and the difference is why
 * this document is the length it is. Re-measuring the artwork puts the eleven
 * at 18 to 36 rows of panel, counting the blank rows between the statements -
 * `SlicingArrays.jpg` draws only 14 lines of code and still fills 0.966 of its
 * panel, because three of its rows are empty and an empty row takes its slot
 * like any other. A nine line example, which is what this was before the fill
 * floor landed, is sparser than any sheet in the repository, so composing the
 * suite's canonical document from one would have measured the algorithm against
 * a sheet the design language does not contain.
 */
const DOC = {
  title: "JavaScript Array Practical Use Starting Point",
  subtitle: "Splice Array",
  code: [
    { text: "var fruits = ['Banana', 'Orange', 'Apple', 'Mango'];", role: "plain" },
    { text: "console.log(fruits.splice(2, 2, 'Lemon', 'Kiwi'));", role: "plain" },
    { text: "// (2) ['Apple', 'Mango']", role: "comment" },
    { text: "", role: "plain" },
    { text: "var trees = ['Maple', 'Spruce', 'Palm'];", role: "plain" },
    { text: "trees.splice(3, 0, 'Birch');", role: "plain" },
    { text: "// (4) ['Maple', 'Spruce', 'Palm', 'Birch']", role: "comment" },
    { text: "", role: "plain" },
    { text: "var mapleTrees = ['Silver', 'Norway', 'Bigleaf'];", role: "plain" },
    { text: "console.log(mapleTrees.length);", role: "plain" },
    { text: "// 3", role: "comment" },
    { text: "", role: "plain" },
    { text: "var sliced = fruits.slice(1, 3);", role: "plain" },
    { text: "console.log(sliced.join(' and '));", role: "plain" },
    { text: "// Orange and Apple", role: "comment" },
    { text: "", role: "plain" },
    { text: "var joined = fruits.concat(trees, mapleTrees);", role: "plain" },
    { text: "console.log(joined.indexOf('Birch'));", role: "plain" },
    { text: "// 6", role: "comment" },
  ],
};

/** Reads an element out of a composition by the name it was given. */
function named(composition, name) {
  return composition.elements.find((el) => el.name === name);
}

// --- 1. The language against the document it was transcribed from -----------

test("the five bands close on the canvas, in whole steps", () => {
  const bands = Object.values(BANDS);
  assert.equal(
    bands.reduce((total, band) => total + band.height, 0),
    CANVAS
  );
  assert.equal(
    bands.reduce((total, band) => total + band.steps, 0),
    CANVAS / STEP
  );
  for (const [name, band] of Object.entries(BANDS)) {
    assert.equal(band.height, band.steps * STEP, `${name} is not a whole number of steps`);
  }
});

test("and they stack in order with no gap and no overlap", () => {
  let y = 0;
  for (const [name, band] of Object.entries(BANDS)) {
    assert.equal(band.y, y, `${name} does not start where the band above it ends`);
    y += band.height;
  }
  assert.equal(y, CANVAS);
});

test("the three divisions close too, which they only do after the panel drops a step", () => {
  // Snapping each to its nearest step gives 3648, a full step over the canvas.
  // The design language drops the panel to 64 steps so the row closes, and puts
  // no extra error on a margin. If this ever sums to anything but the canvas,
  // a generated sheet has a seam down it.
  const divisions = Object.values(DIVISIONS);
  assert.equal(
    divisions.reduce((total, division) => total + division.width, 0),
    CANVAS
  );
  let x = 0;
  for (const [name, division] of Object.entries(DIVISIONS)) {
    assert.equal(division.x, x, `${name} does not start where the division left of it ends`);
    x += division.width;
  }
  // The spine is flush left and the panel begins where it ends, so there is no
  // left margin at all. That is the shape of the artwork, not an oversight.
  assert.equal(DIVISIONS.spine.x, 0);
  assert.equal(DIVISIONS.panel.x, DIVISIONS.spine.width);
});

test("every token is a whole multiple of the step", () => {
  for (const [name, value] of Object.entries(TOKENS)) {
    assert.equal(value % STEP, 0, `${name} is ${value}, which is not on the step`);
  }
  // The set is the one the sheets use, and the gaps in it are the point: there
  // is no step-5, step-7 or step-8 because no sheet uses one.
  assert.deepEqual(Object.keys(TOKENS), ["step", "step-2", "step-3", "step-4", "step-6", "step-9", "step-10"]);
});

test("each run's baseline is its ink top plus its cap", () => {
  for (const [name, run] of Object.entries(RUNS)) {
    assert.equal(run.baseline, run.inkTop + run.cap, `${name}'s baseline is not where its measurements put it`);
  }
});

test("the two records of the four cap heights agree", () => {
  // `TYPE_ROLES` carries a cap because a role is a size, and `RUNS` carries one
  // because a baseline is an ink top plus a cap. Both are the same four numbers
  // off the same artwork, and `compose.mjs` reads the cap from `RUNS` and the
  // weight from `TYPE_ROLES`, so a sheet would be set at one size and placed
  // for another if they ever drifted.
  for (const [role, run] of [
    ["masthead", "wordmark"],
    ["followLine", "followLine"],
    ["title", "title"],
    ["leadIn", "leadIn"],
  ]) {
    assert.equal(TYPE_ROLES[role].cap, RUNS[run].cap, `${role} and ${run} disagree about the cap height`);
  }
  // The subtitle and the lead-in are the same size as each other, cap for cap
  // and stem for stem, which is why they share one role.
  assert.equal(RUNS.subtitle.cap, RUNS.leadIn.cap);
});

test("the runs sit inside the bands that hold them", () => {
  const inside = (run, band) => run.inkTop >= band.y && run.baseline <= band.y + band.height;
  assert.ok(inside(RUNS.wordmark, BANDS.masthead), "the wordmark is outside the masthead");
  for (const name of ["title", "subtitle", "leadIn"]) {
    assert.ok(inside(RUNS[name], BANDS.heading), `the ${name} is outside the heading band`);
  }
  assert.ok(inside(RUNS.followLine, BANDS.footer), "the follow line is outside the footer");
});

// --- 2. A composition drawn to that language --------------------------------

test("a composed sheet is the canvas the design language settled on", () => {
  const { composition } = composeSheet(DOC, { seed: 1 });
  // 3600, not 3601: 3600 is 75 whole steps and the extra pixel of the artwork
  // is export rounding.
  assert.equal(composition.width, 3600);
  assert.equal(composition.height, 3600);
});

test("the regions land where the artwork puts them", () => {
  const { composition } = composeSheet(DOC, { seed: 1 });
  const masthead = named(composition, "masthead");
  assert.deepEqual(
    [masthead.x, masthead.y, masthead.width, masthead.height],
    [0, 0, CANVAS, BANDS.masthead.height]
  );
  const panel = named(composition, "code-panel");
  assert.deepEqual(
    [panel.x, panel.y, panel.width, panel.height],
    [DIVISIONS.panel.x, BANDS.code.y, DIVISIONS.panel.width, BANDS.code.height]
  );
  // The spine starts a step-4 above the panel and ends with it, so it is taller
  // than the band the panel sits in.
  const spine = named(composition, "spine");
  assert.equal(spine.y, BANDS.code.y - TOKENS["step-4"]);
  assert.equal(spine.y + spine.height, BANDS.code.y + BANDS.code.height);
});

test("both flanking rules are drawn as a pair flush to each edge", () => {
  const { composition } = composeSheet(DOC, { seed: 1 });
  for (const key of ["upper", "lower"]) {
    const left = named(composition, `rule-${key}-left`);
    const right = named(composition, `rule-${key}-right`);
    assert.equal(left.x, 0, `the ${key} rule's left run is not flush to the edge`);
    assert.equal(right.x + right.width, CANVAS, `the ${key} rule's right run is not flush to the edge`);
    assert.equal(left.width, TOKENS["step-9"]);
    assert.equal(left.height, RULES[key].height);
  }
});

test("the title is centred on the canvas axis and fits between the rules", () => {
  const { composition, variation } = composeSheet(DOC, { seed: 1 });
  const title = named(composition, "title");
  // Centred by the composition rather than by the renderer: since 2026.10.14
  // no element carries a face, so there is nothing for a renderer to centre a
  // run with and the left edge is worked out here. The arithmetic is the one
  // the renderer did - the axis less half the measured width - so the ink is
  // where it was.
  assert.equal(title.align, "left");
  assert.equal(
    title.x,
    centredAt(title.text, CANVAS / 2, title.fontSize),
    "the title is not centred on the canvas axis"
  );
  assert.equal(title.y, RUNS.title.baseline);
  // This title is long enough that it has to be stepped down, and the report
  // has to say so rather than leaving a caller to notice.
  assert.ok(variation.titleCap <= RUNS.title.cap);
  if (variation.titleCap < RUNS.title.cap) {
    assert.ok(variation.notes.some((note) => note.includes("title")));
  }
});

test("a run that cannot fit its region is made smaller, never allowed to overflow", () => {
  const { variation } = composeSheet(
    { ...DOC, title: "A Very Long Title That Could Not Possibly Fit Across The Measure Between Two Flanking Rules" },
    { seed: 1 }
  );
  assert.ok(
    variation.titleCap < RUNS.title.cap,
    "a title far too long for the measure was set at the full cap anyway"
  );
  assert.ok(variation.notes.length > 0, "it was stepped down silently");
});

test("code takes its color from its role, and an unknown role takes plain", () => {
  const { composition } = composeSheet(
    { title: "Roles", code: [{ text: "a", role: "keyword" }, { text: "b", role: "nosuchrole" }] },
    { seed: 1 }
  );
  assert.equal(named(composition, "code-0").fill, SYNTAX.keyword);
  assert.equal(named(composition, "code-1").fill, SYNTAX.plain);
});

test("and a role naming an inherited property takes plain rather than a function", () => {
  // The palette is an object literal, so `syntax["toString"]` answers from
  // `Object.prototype` and a fallback written as `?? plain` never fires. The
  // paint then reaches the renderer as a function: the SVG writer's paint
  // validation raises `unsupported color "function toString() { [native code] }"`
  // rather than the line being set in plain, which is a confusing failure for a
  // `sheet.json` that merely carries an odd role name. The same own-property
  // guard `glyph` and `roleStyle` carry.
  const { composition } = composeSheet(
    {
      title: "Inherited",
      code: [
        { text: "a", role: "constructor" },
        { text: "b", role: "toString" },
        { text: "c", role: "hasOwnProperty" },
      ],
    },
    { seed: 1 }
  );
  for (const index of [0, 1, 2]) {
    assert.equal(named(composition, `code-${index}`).fill, SYNTAX.plain);
  }
  // And the composition it produced is one both renderers accept, which is the
  // property the fill being a string actually buys.
  assert.doesNotThrow(() => composition.toSVG());
});

/* --- The paint refusal ----------------------------------------------------- */

test("a theme carrying a paint nothing can read is refused, by name", () => {
  // The acceptance case for moving the refusal into this layer. The drawing
  // surface this sits on writes an unreadable colour straight into the markup
  // and objects only when it rasterizes - and the page composes inline SVG and
  // never rasterizes, so the fault reaches a reader as a black region with no
  // error attached to it anywhere.
  //
  // `ofwhite` rather than `nosuchcolour`: a misspelling of a colour this
  // repository actually declares is the fault this is for, and a word nobody
  // would type tests a narrower thing.
  const unreadable = {
    ...SHEET_LANGUAGE,
    colors: { ...SHEET_LANGUAGE.colors, white: "ofwhite" },
  };
  assert.throws(
    () => composeSheet(DOC, { seed: 1, language: unreadable }),
    /unsupported color "ofwhite"/
  );

  // A paint on the background is read as well as a paint on an element: the
  // page's own ground is the composition's background and nothing else looks
  // at it.
  assert.throws(
    () => composeSheet(DOC, { seed: 1, language: { ...SHEET_LANGUAGE, colors: { ...SHEET_LANGUAGE.colors, navy: "mavy" } } }),
    /unsupported color "mavy"/
  );
});

test("the reader takes the hex forms and the absences, and nothing else", () => {
  // Narrower than the drawing surface's reader on purpose: all 22 paints the
  // design language and the worked example's theme declare are hex, so a named
  // keyword here would be code nothing reaches - and a reader that accepts a
  // form this repository never writes is one that will accept a typo for one.
  assert.deepEqual(parseSheetColor("#4DAE51"), { r: 77, g: 174, b: 81, a: 1 });
  assert.deepEqual(parseSheetColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.equal(parseSheetColor("#00000080").a, 128 / 255);

  // The absences a composition may legitimately carry.
  for (const absent of [undefined, null, "", "none", "transparent", "#00000000"]) {
    assert.equal(parseSheetPaint(absent), null, `${String(absent)} was not read as an absent paint`);
  }

  // And everything else, including the keywords the surface's own reader takes.
  for (const refused of ["rebeccapurple", "white", "rgb(0 0 0)", "#ff", "#1234567"]) {
    assert.throws(() => parseSheetPaint(refused), /unsupported color/, `"${refused}" was accepted`);
  }
});

test("a paint on a group is read, because SVG inherits it into the children", () => {
  // The masthead mark is inlined as a group, so a wrapper is a real shape here
  // rather than a hypothetical one.
  assert.throws(
    () => checkPaints({ elements: [{ type: "group", fill: "ofwhite", children: [] }] }),
    /unsupported color "ofwhite"/
  );
  assert.throws(
    () => checkPaints({ elements: [{ type: "group", children: [{ type: "rect", stroke: "ofwhite" }] }] }),
    /unsupported color "ofwhite"/
  );
});

test("every code line is set in the code face, proportionally", () => {
  const { composition } = composeSheet(DOC, { seed: 1 });
  const first = named(composition, "code-0");
  // The face is the layer's own and never reaches the drawing surface, so what
  // the element carries is the family that face names and the surface can use.
  assert.equal(first.face, undefined, "a face is still being handed to the drawing surface");
  assert.equal(first.fontFamily, CODE_FACE.fontFamily);
  assert.equal(first.align, "left");
});

test("a blank line in the example takes its place without drawing an element", () => {
  const { composition } = composeSheet(
    { title: "Gaps", code: [{ text: "first" }, { text: "" }, { text: "third" }] },
    { seed: 1 }
  );
  assert.ok(named(composition, "code-0"));
  assert.equal(named(composition, "code-1"), undefined, "an empty line drew an empty text element");
  const third = named(composition, "code-2");
  assert.ok(third, "the line after a blank one was renumbered, so a gap closed up");
});

test("a document with no title is refused rather than composed blank", () => {
  assert.throws(() => composeSheet({ code: [] }), /needs a title/);
  assert.throws(() => composeSheet({ title: "", code: [] }), /needs a title/);
  assert.throws(() => composeSheet(null), /needs a title/);
});

test("code given as a string is split into lines", () => {
  const { composition } = composeSheet({ title: "Raw", code: "one\r\ntwo\nthree" }, { seed: 1 });
  assert.equal(named(composition, "code-0").text, "one");
  assert.equal(named(composition, "code-2").text, "three");
});

// --- 3. The seed, and only the seed -----------------------------------------

test("the same seed composes byte-for-byte identical SVG", () => {
  const a = composeSheet(DOC, { seed: 42 }).composition.toSVG();
  const b = composeSheet(DOC, { seed: 42 }).composition.toSVG();
  assert.equal(a, b);
});

test("and byte-for-byte identical PNG", () => {
  // Rendered small, because the property is determinism rather than resolution
  // and a 3600 px raster is slow enough to make the suite unpleasant to run.
  const a = composeSheet(DOC, { seed: 42 }).composition.toPNG({ scale: 0.05 });
  const b = composeSheet(DOC, { seed: 42 }).composition.toPNG({ scale: 0.05 });
  assert.deepEqual([...a], [...b]);
});

test("a different seed composes a different sheet", () => {
  const a = composeSheet(DOC, { seed: 42 }).composition.toSVG();
  const b = composeSheet(DOC, { seed: 43 }).composition.toSVG();
  assert.notEqual(a, b);
});

test("a string seed reproduces as reliably as a number, and records both", () => {
  const a = composeSheet(DOC, { seed: "splice-array" });
  const b = composeSheet(DOC, { seed: "splice-array" });
  assert.equal(a.composition.toSVG(), b.composition.toSVG());
  assert.equal(a.variation.givenSeed, "splice-array");
  assert.equal(a.variation.seed, seedFrom("splice-array"));
  // The number it hashed to composes the same sheet, which is what makes the
  // reported seed usable on its own.
  const byNumber = composeSheet(DOC, { seed: seedFrom("splice-array") });
  assert.equal(byNumber.composition.toSVG(), a.composition.toSVG());
});

test("naming no seed is still reproducible rather than unseeded", () => {
  const a = composeSheet(DOC).composition.toSVG();
  const b = composeSheet(DOC).composition.toSVG();
  assert.equal(a, b);
  assert.equal(composeSheet(DOC).variation.seed, 0);
});

test("only the three free figures move between seeds", () => {
  // The property that makes two seeds two variations of one design rather than
  // two designs. Everything the artwork holds to within a pixel is fixed.
  const seen = { top: new Set(), left: new Set(), spacing: new Set() };
  const fixed = new Set();
  for (let seed = 0; seed < 40; seed += 1) {
    const { composition, variation } = composeSheet(DOC, { seed });
    seen.top.add(variation.topPadding);
    seen.left.add(variation.leftInset);
    seen.spacing.add(variation.lineSpacing.toFixed(4));
    const title = named(composition, "title");
    const panel = named(composition, "code-panel");
    fixed.add(
      JSON.stringify([title.x, title.y, title.fontSize, panel.x, panel.y, panel.width, panel.height])
    );
  }
  assert.equal(fixed.size, 1, "something outside the panel's three free figures moved with the seed");
  assert.ok(seen.top.size > 1, "the top padding never varied");
  assert.ok(seen.left.size > 1, "the left inset never varied");
  assert.ok(seen.spacing.size > 1, "the line spacing never varied");
});

test("and each stays inside the range the eleven were measured at", () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const { variation } = composeSheet(DOC, { seed });
    const { topPadding, leftInset, lineSpacing } = variation;
    assert.ok(
      topPadding >= PANEL_FREEDOM.topPadding.min && topPadding <= PANEL_FREEDOM.topPadding.max,
      `seed ${seed} put the top padding at ${topPadding}`
    );
    assert.ok(
      leftInset >= PANEL_FREEDOM.leftInset.min && leftInset <= PANEL_FREEDOM.leftInset.max,
      `seed ${seed} put the left inset at ${leftInset}`
    );
    assert.ok(
      lineSpacing >= PANEL_FREEDOM.lineSpacing.min && lineSpacing <= PANEL_FREEDOM.lineSpacing.max,
      `seed ${seed} put the line spacing at ${lineSpacing}`
    );
  }
});

test("a document that leaves no slack does not shift the choices after it", () => {
  // Every draw happens whatever the content is. If a full panel skipped the
  // spacing draw, two sheets with one seed would differ because one of them
  // happened to be long, which is the subtlest way determinism breaks.
  const short = composeSheet({ title: "Short", code: [{ text: "a" }] }, { seed: 9 });
  const long = composeSheet(
    { title: "Short", code: Array.from({ length: 120 }, (_, i) => ({ text: `line ${i}` })) },
    { seed: 9 }
  );
  assert.equal(short.variation.choices.length, long.variation.choices.length);
  assert.deepEqual(
    short.variation.choices.map((choice) => choice.name),
    long.variation.choices.map((choice) => choice.name)
  );
  assert.equal(short.variation.topPadding, long.variation.topPadding);
  assert.equal(short.variation.leftInset, long.variation.leftInset);
});

test("more code than the panel holds is reported rather than run off the edge", () => {
  const { variation } = composeSheet(
    { title: "Long", code: Array.from({ length: 120 }, (_, i) => ({ text: `line ${i}` })) },
    { seed: 1 }
  );
  assert.equal(variation.codeFits, false);
  assert.ok(variation.notes.some((note) => note.includes("do not fit")));
});

test("an example the composition says fits is one that is wholly inside the panel", () => {
  // The vertical counterpart of the title case above, and the one the seed can
  // break on its own. A line is placed by its baseline, so the block reaches a
  // cap height above the first baseline and a descender below the last, and
  // neither of those is a gap between lines. Sizing the spacing against the gap
  // count alone puts the last line of a long example below the panel - on the
  // green divider - while `codeFits` still reports true and `notes` is empty,
  // which is the worst shape a defect can take here: nothing says it happened.
  //
  // Swept rather than pinned to one seed, because the overflow only appears
  // where the content wants near the maximum spacing: an 18 line example at
  // seed 2073 overran by 21 px at the baseline and 43 px at the ink.
  const panelTop = BANDS.code.y;
  const panelFoot = panelTop + BANDS.code.height;
  const descenderShare = CODE_FACE.descender / CODE_FACE.capHeight;
  for (let count = 1; count <= 40; count += 1) {
    const code = Array.from({ length: count }, (_, i) => ({ text: `example.line(${i});` }));
    for (let seed = 0; seed < 120; seed += 1) {
      const { composition, variation } = composeSheet({ title: "Fit", code }, { seed });
      if (!variation.codeFits) continue;
      const drawn = composition.elements.filter((el) => /^code-\d+$/.test(el.name ?? ""));
      const first = drawn[0];
      const last = drawn[drawn.length - 1];
      assert.ok(
        first.y - variation.codeCap >= panelTop,
        `${count} lines at seed ${seed}: the first line's cap starts at ` +
          `${(first.y - variation.codeCap).toFixed(1)}, above the panel at ${panelTop}`
      );
      const ink = last.y + variation.codeCap * descenderShare;
      assert.ok(
        ink <= panelFoot,
        `${count} lines at seed ${seed}: the last line's ink reaches ${ink.toFixed(1)}, ` +
          `past the foot of the panel at ${panelFoot}, and the composition reported it as fitting`
      );
    }
  }
});

test("the panel's fill is reported, so a short example's void is visible", () => {
  const full = composeSheet(DOC, { seed: 1 }).variation;
  const sparse = composeSheet({ title: "Sparse", code: [{ text: "one" }] }, { seed: 1 }).variation;
  assert.ok(full.panelFill > sparse.panelFill);
  assert.ok(sparse.panelFill < 0.2, "a one-line example was reported as filling the panel");
  assert.equal(sparse.fillsPanel, false);
  assert.equal(full.fillsPanel, true);
});

// --- 2b. The floors ---------------------------------------------------------
// These are the cases the floors exist for, and all but the last of them sweep
// rather than pin: a floor that holds for one seed and breaks for another has
// not been tested, it has been sampled.

test("the floors are derived from the language rather than chosen beside it", () => {
  // `codeCap` is the cap the minimum measured spacing yields, so the most
  // crowded of the eleven sits exactly on the floor rather than under a figure
  // invented below it. Two files hold the two halves of that arithmetic, and
  // this is what stops them drifting.
  assert.equal(FLOORS.codeCap, Math.floor(PANEL_FREEDOM.lineSpacing.min * CAP_SHARE));
  assert.equal(FLOORS.displayCap, TOKENS.step);
  // The fill floor is the least filled panel of the eleven, measured at 0.852.
  assert.ok(FLOORS.panelFill <= 0.852 && FLOORS.panelFill > 0.8);
});

test("no seed can put a document that fits under a floor", () => {
  // The guarantee the item is named for. A document long enough to fill the
  // panel is composed at every seed in a wide sweep, and none of them may
  // produce a sheet that fails any of the four checks the report carries.
  for (let seed = 0; seed < 300; seed += 1) {
    const { variation } = composeSheet(DOC, { seed });
    assert.ok(
      variation.fillsPanel && variation.codeFits && variation.runsFit && variation.contrastHolds,
      `seed ${seed} composed a sheet under a floor: ${variation.notes.join(" ")}`
    );
    assert.ok(variation.codeCap >= FLOORS.codeCap, `seed ${seed} set code at ${variation.codeCap} px`);
    assert.ok(variation.titleCap >= FLOORS.displayCap);
  }
});

test("and a crowded document is spaced to what the panel holds, not to the floor", () => {
  // The case the sweep above cannot reach, because `DOC` is 19 rows and the
  // trap only opens past 31. The eleven run **18 to 36 rows**, so the crowded
  // half of the record needs its own document.
  //
  // Two floors meet here and both can be read backwards. Past about 31 rows the
  // spacing the panel has room for drops below the measured minimum, so a floor
  // taken as "at least the minimum" puts the bottom of the seed's range above
  // its top; `Variation.between` answers an inverted range with its `min`, which
  // is then the one spacing that certainly does not fit, and the last lines are
  // drawn past the foot of the panel onto the divider. The cap floor inverts the
  // same way one step later: the cap such a spacing yields is already under
  // `FLOORS.codeCap`, so holding the width fitting to that floor steps the cap
  // *up*, past its own line spacing, and every line overlaps the one above it.
  //
  // A floor stops a descent. It never starts an ascent, and it never outranks
  // the room actually available.
  const descenderShare = CODE_FACE.descender / CODE_FACE.capHeight;
  for (const rows of [32, 36, 48, 70]) {
    for (const width of [12, 90, 400]) {
      const code = Array.from({ length: rows }, (_, i) =>
        i === 0 ? { text: `${"x".repeat(width)} = 1;` } : { text: `line${i}();` }
      );
      for (let seed = 0; seed < 25; seed += 1) {
        const { variation } = composeSheet({ title: "Crowded", code }, { seed });
        const where = `${rows} rows, a ${width} character line, seed ${seed}`;

        const [low, high] = variation.choices.find((c) => c.name === "lineSpacing").range;
        assert.ok(low <= high, `${where}: the seed was offered the inverted range ${low} to ${high}`);

        assert.ok(
          variation.codeCap <= Math.floor(variation.lineSpacing * CAP_SHARE),
          `${where}: a ${variation.codeCap} px cap on ${variation.lineSpacing.toFixed(1)} px of spacing`
        );

        // The whole block, last descender included, inside the padded panel.
        const bottom =
          variation.topPadding +
          variation.codeCap * (1 + descenderShare) +
          variation.lineSpacing * (rows - 1);
        assert.ok(
          bottom <= BANDS.code.height - variation.topPadding + 0.5,
          `${where}: the block ends ${bottom.toFixed(0)} px into a ${BANDS.code.height} px panel`
        );
      }
    }
  }
});

test("a run too long for its region stops at the floor rather than shrinking past it", () => {
  // Before the floor, this stepped down to a one pixel cap - a sixth of a
  // display pixel - and reported that it fitted, because it had.
  const { composition, variation } = composeSheet(
    { title: "A".repeat(400), code: DOC.code },
    { seed: 1 }
  );
  assert.equal(variation.titleCap, FLOORS.displayCap);
  assert.equal(variation.runsFit, false);
  assert.ok(variation.notes.some((note) => note.includes("cap floor")));
  // And the floor is a floor rather than a clamp: the run is left at it, not
  // pushed back up to the size it could not fit at.
  const title = named(composition, "title");
  assert.ok(title.fontSize < sizeForCap(RUNS.title.cap, SHEET_FACE));
});

test("a fill floor that cannot be met leaves the seed its whole measured range", () => {
  // The trap this rules out: narrowing the spacing range towards a floor no
  // spacing can reach collapses it onto its own maximum, so every seed composes
  // the same sheet and the panel is still empty. A floor that cannot be met is
  // reported instead.
  const short = { title: "Short", code: Array.from({ length: 4 }, (_, i) => ({ text: `a(${i});` })) };
  const spacings = new Set();
  for (let seed = 0; seed < 60; seed += 1) {
    const { variation } = composeSheet(short, { seed });
    assert.equal(variation.fillsPanel, false);
    assert.ok(
      variation.lineSpacing >= PANEL_FREEDOM.lineSpacing.min &&
        variation.lineSpacing <= PANEL_FREEDOM.lineSpacing.max
    );
    spacings.add(variation.lineSpacing.toFixed(4));
  }
  assert.ok(spacings.size > 40, `the range collapsed to ${spacings.size} spacings over 60 seeds`);
});

test("the margin is constrained by the fill floor, not only the spacing", () => {
  // The padding is drawn before the spacing, so a seed could otherwise choose
  // one no spacing could rescue: at the measured maximum of 152 px the block
  // can occupy at most (2016 - 304) / 2016, which is 0.849 and already under
  // the floor before a line is placed.
  const worst = (BANDS.code.height * (1 - FLOORS.panelFill)) / 2;
  assert.ok(PANEL_FREEDOM.topPadding.max > worst, "the measured maximum was already safe");
  for (let seed = 0; seed < 300; seed += 1) {
    const { variation } = composeSheet(DOC, { seed });
    assert.ok(
      variation.topPadding <= worst,
      `seed ${seed} padded to ${variation.topPadding}, past the ${worst.toFixed(1)} px the floor allows`
    );
    assert.ok(variation.topPadding >= PANEL_FREEDOM.topPadding.min);
  }
});

// --- 2c. Contrast -----------------------------------------------------------

test("the contrast of every pairing is measured, not assumed", () => {
  const { variation } = composeSheet(DOC, { seed: 1 });
  // Reported whether it passes or fails: a report that lists nothing on a pass
  // reads exactly like a report from a run where the check never executed.
  const names = variation.contrast.map((pairing) => pairing.name);
  assert.ok(names.includes("title"));
  assert.ok(names.includes("wordmark"));
  assert.ok(names.includes("lead-in"));
  assert.ok(names.includes("follow-line"));
  assert.ok(names.some((name) => /^code-\d+$/.test(name)));
  for (const pairing of variation.contrast) {
    assert.equal(pairing.floor, CONTRAST.text);
    assert.equal(pairing.holds, pairing.ratio >= pairing.floor);
  }
});

test("and the ratios agree with the table the design language recorded", () => {
  // The document's own figures, to two places. Reproducing them from the WCAG
  // definitions rather than from the table is what makes a colour the table
  // never listed measurable at all.
  assert.equal(contrastRatio(COLORS.white, COLORS.navy).toFixed(2), "19.99");
  assert.equal(contrastRatio(COLORS.heading, COLORS.white).toFixed(2), "10.18");
  assert.equal(contrastRatio(COLORS.green, COLORS.white).toFixed(2), "2.80");
  // 5.66 on the sheets' pure white, against the 5.33 the light theme table
  // records for the same color on the site's off white `#F8F8F9`. Both are in
  // the document and neither is wrong; a ratio belongs to a pair, not a color.
  assert.equal(contrastRatio(COLORS.greenOnWhite, COLORS.white).toFixed(2), "5.66");
  assert.equal(contrastRatio(COLORS.greenOnWhite, "#F8F8F9").toFixed(2), "5.33");
  assert.equal(contrastRatio(SYNTAX.comment, COLORS.navy).toFixed(2), "10.61");
  // Symmetric, and 1:1 against itself.
  assert.equal(contrastRatio(COLORS.navy, COLORS.white), contrastRatio(COLORS.white, COLORS.navy));
  assert.equal(contrastRatio(COLORS.navy, COLORS.navy), 1);
});

test("green text on a light ground is repainted, and on a dark ground is left alone", () => {
  // The one substitution the design language nominates. It is applied rather
  // than recorded, which is the whole difference between a rule in a document
  // and a rule in a pipeline.
  assert.equal(readableInk(COLORS.green, COLORS.white), COLORS.greenOnWhite);
  assert.equal(readableInk(COLORS.green, COLORS.navy), COLORS.green);
  // And nothing else is repainted. There is no second colour on record to swap
  // an arbitrary failing ink for, so it is reported rather than invented over.
  assert.equal(readableInk(SYNTAX.comment, COLORS.white), SYNTAX.comment);
});

test("a language that paints a run under the floor is reported rather than composed quietly", () => {
  const language = {
    ...SHEET_LANGUAGE,
    colors: { ...SHEET_LANGUAGE.colors, heading: "#D8D8D8" },
  };
  const { variation } = composeSheet(DOC, { seed: 1, language });
  assert.equal(variation.contrastHolds, false);
  const title = variation.contrast.find((pairing) => pairing.name === "title");
  assert.equal(title.holds, false);
  assert.ok(variation.notes.some((note) => note.includes("text floor")));
});

test("a language written before the floors existed still gets them", () => {
  // A caller passing a modified copy of the language can omit `floors` without
  // meaning "no floors". Omission falls back to the record; only a language
  // that names a floor moves one.
  const { floors } = SHEET_LANGUAGE;
  const without = { ...SHEET_LANGUAGE };
  delete without.floors;
  const { variation } = composeSheet(DOC, { seed: 1, language: without });
  assert.deepEqual(variation.floors, floors);
});

test("the seeded source is the one that was chosen, and is engine-independent", () => {
  // SplitMix32's first three values for seed 0, pinned. A change of generator
  // would still produce plausible sheets, and every previously reviewed seed
  // would silently compose something else - which is exactly the failure a
  // reproducible variation exists to rule out, so it is pinned rather than
  // described. Every operation is `Math.imul` or a shift, so these are the same
  // numbers on every engine rather than ones this machine happened to produce.
  const next = splitmix32(0);
  assert.deepEqual(
    [next(), next(), next()],
    [0.3921251413412392, 0.8505931859835982, 0.684420470148325]
  );
  // And the sequence restarts from the seed rather than carrying state between
  // generators, which two compositions in one process depend on.
  const again = splitmix32(0);
  assert.equal(again(), 0.3921251413412392);
});

test("every value it produces is in range, over a long run", () => {
  const next = splitmix32(7);
  for (let i = 0; i < 100000; i += 1) {
    const value = next();
    assert.ok(value >= 0 && value < 1, `${value} is outside [0, 1)`);
  }
});

test("the generator spreads across its range rather than clustering", () => {
  // A bare linear congruential generator of this size has visible structure in
  // its low bits, which would show up as variations that are not evenly spread.
  const next = splitmix32(12345);
  const buckets = new Array(10).fill(0);
  for (let i = 0; i < 10000; i += 1) buckets[Math.floor(next() * 10)] += 1;
  for (const [index, count] of buckets.entries()) {
    assert.ok(count > 800 && count < 1200, `bucket ${index} holds ${count} of 10000`);
  }
});

test("a variation records what it chose, in the order it chose it", () => {
  const variation = new Variation(3);
  variation.between("first", 0, 10);
  variation.betweenOnStep("second", 10, 100, 48);
  variation.pick("third", ["a", "b", "c"]);
  assert.deepEqual(
    variation.choices.map((choice) => choice.name),
    ["first", "second", "third"]
  );
  assert.equal(variation.toJSON().seed, 3);
});

test("a snapped choice never leaves the range it was given", () => {
  for (let seed = 0; seed < 500; seed += 1) {
    const variation = new Variation(seed);
    const value = variation.betweenOnStep("v", 37, 152, 24);
    assert.ok(value >= 37 && value <= 152, `seed ${seed} snapped to ${value}`);
    assert.equal(value % 24, 0, `${value} is not on the step it was snapped to`);
  }
});

test("a range with no multiple of the step inside it returns the range itself", () => {
  const variation = new Variation(1);
  // Nothing divisible by 48 lies between 50 and 90.
  const value = variation.betweenOnStep("tight", 50, 90, 48);
  assert.equal(value, 50);
  assert.equal(variation.choices.length, 1, "the draw was skipped, which would shift every later choice");
});

test("an empty or inverted range still consumes a draw", () => {
  const a = new Variation(5);
  a.between("empty", 10, 10);
  a.between("after", 0, 100);
  const b = new Variation(5);
  b.between("wide", 0, 50);
  b.between("after", 0, 100);
  assert.equal(a.choices[1].value, b.choices[1].value, "a zero-width range did not consume a value");
});

// --- 2d. Text stays text ----------------------------------------------------
// The acceptance check for **Keep reference text as real characters in the SVG
// rather than converting it to paths**. Nothing in the repository converts text
// to outlines today, so none of this is a check that something was undone - it
// is a check that stops it being done.
//
// The temptation is real and comes from a good motive. Outlining every run
// removes the last dependency a generated sheet has on the machine that renders
// it: no font stack to resolve, no fallback to go wrong, the same glyphs
// everywhere. `geometry.mjs` exports `lineContours` and `strokeContour`, and
// `font.mjs` will hand back the contours of a laid out line, so the conversion
// is a few lines away from anyone who decides the fidelity is worth it.
//
// What it costs is everything that makes a vector sheet better than the JPEG it
// replaces. A reader cannot select the example to copy it, a search engine
// cannot index the title, a translator cannot read a word of it, and a screen
// reader is handed a picture of some curves. So the constraint is asserted from
// three directions: the markup carries `text` elements, the runs are findable
// as strings, and no element in the document is a path that used to be a word.

test("every run reaches the SVG as a text element, not as an outline", () => {
  const { composition } = composeSheet(DOC, { seed: 1 });
  const svg = composition.toSVG();
  const textElements = svg.match(/<text\b/g) ?? [];
  // The five fixed runs - wordmark, title, subtitle, lead-in, follow line -
  // plus one per inked line of the example. Counted rather than merely asserted
  // non-empty, because a single surviving `<text>` beside a hundred outlined
  // paths would pass the weaker check while the sheet was unreadable to
  // everything but an eye.
  const fixed = ["wordmark", "title", "subtitle", "lead-in", "follow-line"];
  const inked = DOC.code.filter((line) => line.text.length > 0).length;
  assert.equal(textElements.length, inked + fixed.length, "a run was not written as a text element");
  for (const name of fixed) {
    assert.equal(named(composition, name)?.type, "text", `${name} is not a text element`);
  }
  assert.equal((svg.match(/<path\b/g) ?? []).length, 0, "the sheet drew a path, which it has no need of");
});

test("and the words are in the markup, so a reader can select and a search can index", () => {
  const { composition } = composeSheet(DOC, { seed: 1 });
  const svg = composition.toSVG();
  for (const run of [DOC.title, DOC.subtitle, "practicing.xyz", "Starting Point for Practical Use:"]) {
    assert.ok(svg.includes(run), `"${run}" is not recoverable from the markup`);
  }
  for (const line of DOC.code) {
    if (line.text.length === 0) continue;
    // Through the XML escape, since an example is full of quotes and brackets.
    assert.ok(
      svg.includes(escapeXml(line.text)),
      `the example line "${line.text}" is not recoverable from the markup`
    );
  }
});

test("nothing in the document is a glyph outline wearing an element's name", () => {
  // The markup checks above read the rendered result; this reads the document
  // the composition built, so a future renderer that outlined on the way out
  // would fail there and a composition that outlined on the way in fails here.
  const { composition } = composeSheet(DOC, { seed: 1 });
  const walk = (elements) => {
    for (const el of elements) {
      assert.notEqual(el.type, "path", `${el.name ?? "an element"} is a path`);
      assert.notEqual(el.type, "image", `${el.name ?? "an element"} is a placed bitmap`);
      if (el.type === "group") walk(el.children);
    }
  };
  walk(composition.toDocument().elements);
});

test("a title with characters XML cannot carry is escaped, not redrawn", () => {
  // The one honest reason to reach for outlines is a string the markup cannot
  // hold. It can hold all of them, and this is what says so - an escape is the
  // answer, and the text is still a string on the other side of it.
  const tricky = 'Arrays & "Objects" <in> 5 > 3';
  const { composition } = composeSheet({ ...DOC, title: tricky }, { seed: 1 });
  const svg = composition.toSVG();
  assert.ok(svg.includes(escapeXml(tricky)));
  assert.doesNotMatch(svg, /<path\b/);
  // And it survives a round trip through a parser, which is what a search
  // engine and a screen reader both do.
  const spans = [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) => m[1]);
  assert.ok(spans.some((span) => span === escapeXml(tricky)));
});

/* --- The algorithm's own record ------------------------------------------
   **Composing a sheet** in `DESIGN_LANGUAGE.md` states what a seed moves and
   what stops it. That is a second copy of figures this file already reads out
   of `language.mjs`, and two copies drift, so the document is parsed and
   compared rather than read by a person once.                               */

const designLanguage = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "DESIGN_LANGUAGE.md"),
  "utf8"
);

/**
 * The body of one section of the document, from its heading to the next
 * heading at the same level or shallower.
 *
 * @param {string} heading
 * @returns {string}
 */
function section(heading) {
  const level = /^#+/.exec(heading)[0].length;
  const from = designLanguage.indexOf(`${heading}\n`);
  assert.notEqual(from, -1, `DESIGN_LANGUAGE.md has no "${heading}" heading`);
  const rest = designLanguage.slice(from + heading.length);
  const next = new RegExp(String.raw`\n#{1,${level}} `).exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

test("the document records the three figures a seed may move, at the ranges the code holds", () => {
  const body = section("### What a seed moves");
  for (const [what, range] of [
    ["top padding", PANEL_FREEDOM.topPadding],
    ["inset", PANEL_FREEDOM.leftInset],
    ["spacing", PANEL_FREEDOM.lineSpacing],
  ]) {
    assert.match(
      body,
      new RegExp(String.raw`${range.min} to ${range.max} px`),
      `the table does not state ${what} as ${range.min} to ${range.max} px`
    );
  }
  // And it names no fourth figure. Each row is one free figure, so a row added
  // to the document without one being added to `PANEL_FREEDOM` is a claim the
  // algorithm does not honour.
  const rows = body.split("\n").filter((line) => /^\| .* \| \d+ to \d+ px \|/.test(line));
  assert.equal(rows.length, Object.keys(PANEL_FREEDOM).length);
});

test("and the three floors, each at the value the code enforces", () => {
  const body = section("### The floors, and what each is derived from");
  assert.match(body, new RegExp(String.raw`\`displayCap\` \| ${FLOORS.displayCap} px`));
  assert.match(body, new RegExp(String.raw`\`codeCap\` \| ${FLOORS.codeCap} px`));
  assert.match(body, new RegExp(String.raw`\`panelFill\` \| ${FLOORS.panelFill} `));
  // The derivation of the code cap, not only its value: the document states
  // the arithmetic, and the arithmetic is what makes the figure defensible.
  assert.match(
    body,
    new RegExp(String.raw`floor\(${PANEL_FREEDOM.lineSpacing.min} x ${CAP_SHARE}\)`),
    "the document does not state how codeCap is derived"
  );
  assert.equal(Math.floor(PANEL_FREEDOM.lineSpacing.min * CAP_SHARE), FLOORS.codeCap);
});

test("and the padding ceiling the fill floor implies, worked at the measured maximum", () => {
  // The document quotes `(2016 - 304) / 2016` and calls the result 0.849,
  // under the floor. Both halves are checked: that the panel really is that
  // tall, and that the figure really does fall under the floor - a changed
  // band height would leave the prose quietly wrong otherwise.
  const body = section("### A floor is not a clamp");
  const padding = PANEL_FREEDOM.topPadding.max;
  assert.match(
    body,
    new RegExp(String.raw`\(${BANDS.code.height} - ${padding * 2}\) / ${BANDS.code.height}`),
    "the worked example does not use the panel height the code has"
  );
  const share = (BANDS.code.height - padding * 2) / BANDS.code.height;
  assert.equal(share.toFixed(3), "0.849");
  assert.ok(share < FLOORS.panelFill, "the worked example no longer lands under the fill floor");
});

test("and the condensation the fitting rule is stated against", () => {
  const body = section("### The size gives, never the letterform");
  assert.match(body, new RegExp(String.raw`condensed to ${SHEET_CONDENSATION} of`));
  assert.match(body, new RegExp(String.raw`${RUNS.title.cap} px cap`));
});

