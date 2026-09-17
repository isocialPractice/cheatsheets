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

import {
  BANDS,
  CANVAS,
  CODE_FACE,
  DIVISIONS,
  PANEL_FREEDOM,
  RULES,
  RUNS,
  STEP,
  SYNTAX,
  TOKENS,
  TYPE_ROLES,
  composeSheet,
  seedFrom,
  splitmix32,
  Variation,
} from "../api/cheatsheet/index.mjs";

/** A document with enough code to fill the panel, as all eleven sheets have. */
const DOC = {
  title: "JavaScript Array Practical Use Starting Point",
  subtitle: "Splice Array",
  code: [
    { text: "var fruits = ['Banana', 'Orange', 'Apple', 'Mango'];", role: "plain" },
    { text: "console.log(fruits.splice(2, 2, 'Lemon', 'Kiwi'));", role: "plain" },
    { text: "// (2) ['Apple', 'Mango']", role: "comment" },
    { text: "var trees = ['Maple', 'Spruce', 'Palm'];", role: "plain" },
    { text: "trees.splice(3, 0, 'Birch');", role: "plain" },
    { text: "// (4) ['Maple', 'Spruce', 'Palm', 'Birch']", role: "comment" },
    { text: "var mapleTrees = ['Silver', 'Norway', 'Bigleaf'];", role: "plain" },
    { text: "console.log(mapleTrees.length);", role: "plain" },
    { text: "// 3", role: "comment" },
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
  assert.equal(title.x, CANVAS / 2);
  assert.equal(title.align, "center");
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

test("every code line is set in the code face, proportionally", () => {
  const { composition } = composeSheet(DOC, { seed: 1 });
  const first = named(composition, "code-0");
  assert.equal(first.face.name, "sheet-code");
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
