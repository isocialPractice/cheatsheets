// The drawing surface's rendering, pinned against committed output.
//
// Every other case in the suite checks the renderers against a property: that a
// shape appears, that a colour is refused, that two renders in one process
// match. All of them would still pass if the surface started drawing everything
// two pixels to the left, because nothing in the repository says where the
// pixels were supposed to be. This file is what says so.
//
// **Why two renders in one process is not enough.** The composition suite
// already renders a document twice and compares the bytes, and that is a real
// check - it is what catches a composition consulting a clock or a counter. But
// both renders come from the same loaded module in the same process, so it
// cannot see a change to the module itself. Edit the flattener and both renders
// change together, identically, and the case stays green. What survives a
// process is a file on disk, which is why the expected output is committed.
//
// ## What is pinned, and in what form
//
// | Fixture | Pins | Committed as |
// | --- | --- | --- |
// | `fixtures/shapes.mjs` | The surface: every element kind, a clip, a matrix | Both renders, in full |
// | The sheet below | The composition layer at a named seed | The SVG in full, the PNG by digest |
//
// The sheet's PNG is the one exception to committing bytes, and it is a size
// judgement rather than a principle. The sheet composes at 3600 square, so its
// raster is 930 KB and takes about two seconds to encode; committing that would
// put a megabyte of pixels in the tree and add two seconds to every suite run,
// for a check a 32 byte digest makes just as exactly. The digest is compared the
// same way the bytes would be, and a mismatch reports the length and dimensions
// alongside it so a failure says *what* moved rather than only that something
// did.
//
// ## Regenerating
//
// A deliberate change to the renderers or to the composition will fail these
// cases, and that is the point: the failure is the review. Once the new output
// has actually been looked at, rewrite the expectations with
//
//   MCP_FIXTURE_UPDATE=1 node --test tools/test-render-fixture.mjs
//
// which writes the files and passes. Never set it to make a red suite green
// without opening the SVG - a fixture updated unread pins nothing at all, and
// leaves the suite reporting that a render nobody has seen is correct.
//
// Run with: node --test tools/test-render-fixture.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { writeComposition } from "../api/napkin-sketch/graphic-design/files.js";
import { decodePng } from "../api/napkin-sketch/api/index.js";
import { composeSheet } from "../api/cheatsheet/index.mjs";
import { fixtureComposition } from "./fixtures/shapes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "tools", "fixtures");
const update = process.env.MCP_FIXTURE_UPDATE === "1";

/**
 * The sheet fixture: a real document at a named seed.
 *
 * Seeded by a slug rather than a number, because that is how a cheatsheet is
 * seeded in practice - the sheet regenerates from its own name with nobody
 * having to record a figure beside it - and it is the path worth pinning.
 */
const SHEET_SEED = "splicing-arrays";
const SHEET = {
  title: "Splicing Array Elements",
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

/**
 * Whether a block of bytes opens with the PNG signature.
 *
 * Written out here rather than imported, for the same reason as `escapeXml` in
 * `tools/test-composition-algorithm.mjs`: the published root entry exports no
 * `isPng`, and the signature is eight bytes that have not changed since 1996.
 *
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
function isPng(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  return bytes?.length >= 8 && signature.every((byte, at) => bytes[at] === byte);
}

/** @param {Uint8Array} bytes */
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Compares against a committed file, or writes it when regenerating.
 *
 * @param {string} name
 * @param {string | Uint8Array} actual
 * @param {string} why What a mismatch means, for the failure message.
 */
function pinned(name, actual, why) {
  const path = join(fixtures, name);
  if (update) {
    writeFileSync(path, actual);
    return;
  }
  assert.ok(
    existsSync(path),
    `tools/fixtures/${name} is missing. Run MCP_FIXTURE_UPDATE=1 node --test tools/test-render-fixture.mjs`
  );
  const expected = typeof actual === "string" ? readFileSync(path, "utf8") : readFileSync(path);
  if (typeof actual === "string") {
    assert.equal(actual, expected, why);
  } else {
    assert.equal(digest(actual), digest(expected), why);
    assert.equal(actual.length, expected.length);
  }
}

// --- The drawing surface's own fixture --------------------------------------

test("the shapes fixture renders to the SVG that was committed", () => {
  pinned(
    "shapes.svg",
    fixtureComposition().toSVG(),
    "the SVG renderer produced different markup than the committed fixture. " +
      "Diff tools/fixtures/shapes.svg against the failure above, and regenerate " +
      "with MCP_FIXTURE_UPDATE=1 only once the new output has been read."
  );
});

test("and to the PNG that was committed, byte for byte", () => {
  pinned(
    "shapes.png",
    fixtureComposition().toPNG(),
    "the raster pass produced different pixels than the committed fixture"
  );
});

test("the fixture actually exercises the surface it claims to", () => {
  // A fixture that silently stopped covering half the surface would keep passing
  // forever, so what it covers is asserted rather than assumed.
  const doc = fixtureComposition().toDocument();
  const kinds = new Set();
  const walk = (elements) => {
    for (const el of elements) {
      kinds.add(el.type);
      if (el.type === "group") walk(el.children);
    }
  };
  walk(doc.elements);
  for (const kind of ["rect", "circle", "ellipse", "polygon", "polyline", "line", "path", "text", "group"]) {
    assert.ok(kinds.has(kind), `the fixture no longer draws a ${kind}`);
  }
  // `triangle` is written to the document as a polygon, which is why it is not
  // in the list above and is checked by name here instead.
  const walkNames = (elements, into = new Set()) => {
    for (const el of elements) {
      if (el.name) into.add(el.name);
      if (el.type === "group") walkNames(el.children, into);
    }
    return into;
  };
  const names = walkNames(doc.elements);
  for (const name of ["wedge", "badge", "badge-text", "dot"]) {
    assert.ok(names.has(name), `the fixture no longer draws ${name}`);
  }
  // `clips` is a list of `{ id, shapes }`, not a map keyed by id.
  assert.ok(
    doc.clips?.some((clip) => clip.id === "band"),
    "the fixture no longer defines the clip it was pinned with"
  );
});

test("rendering it twice in one process gives identical bytes, in both formats", () => {
  // The in-process half of the property, and the weaker of the two. It catches
  // a renderer that consulted a clock, a counter or an iteration order; it
  // cannot catch a renderer that changed, because both renders come from the
  // same loaded module. The committed files above are what catch that. Both are
  // kept because they fail differently and a failure in one narrows the search.
  assert.equal(fixtureComposition().toSVG(), fixtureComposition().toSVG());
  assert.equal(digest(fixtureComposition().toPNG()), digest(fixtureComposition().toPNG()));
  // And twice off one composition, so the check covers reuse as well as
  // rebuilding: rendering must not mutate the document it read.
  const once = fixtureComposition();
  assert.equal(once.toSVG(), once.toSVG());
  assert.equal(digest(once.toPNG()), digest(once.toPNG()));
});

test("nothing in the fixture render was skipped", () => {
  // A warning means an element was dropped, and a dropped element still
  // produces a stable PNG - so without this, the pinning above would happily
  // hold a fixture that had quietly stopped drawing something.
  assert.deepEqual(fixtureComposition().rasterize().warnings, []);
});

// --- The sheet fixture ------------------------------------------------------

test("a seeded sheet composes to the SVG that was committed", () => {
  const { composition } = composeSheet(SHEET, { seed: SHEET_SEED });
  pinned(
    "sheet.svg",
    composition.toSVG(),
    "the composition produced a different sheet than the committed fixture. " +
      "This is the case that fails when a floor, a token or the width table " +
      "moves, which is usually deliberate - read the diff before regenerating."
  );
});

test("and the variation it reports is the one the fixture was pinned at", () => {
  // The SVG above pins where the ink landed; this pins what the algorithm said
  // it was doing. Both can move independently: a report field renamed without
  // touching the geometry changes nothing in the markup, and a seed that
  // silently stopped being consulted changes the markup without changing the
  // shape of the report.
  const { variation } = composeSheet(SHEET, { seed: SHEET_SEED });
  pinned(
    "sheet.variation.json",
    `${JSON.stringify(variation, null, 2)}\n`,
    "the variation report changed for a seed whose render was pinned"
  );
});

test("and to a PNG whose digest was committed", () => {
  // **What this raster is, since 2026.10.14.** The composition no longer hands
  // the drawing surface a face - every run reaches it as an `x` and a family
  // name, so the layer's own ruler is what placed it - and the built-in
  // rasterizer therefore advances its single stroke alphabet by its own widths
  // rather than by the sheet's. Runs are about half again as wide here as they
  // are in a browser, and the follow line runs off the canvas.
  //
  // That is a shape level check and not a picture of a sheet, which is what it
  // always was: `api/cheatsheet/raster.mjs` is the route to a raster anyone
  // publishes, because it draws in a real engine in the face the design
  // language measured. What this pins is that the geometry, the paints and the
  // element set are stable, and that is worth pinning whatever alphabet fills
  // them.
  const { composition } = composeSheet(SHEET, { seed: SHEET_SEED });
  const png = composition.toPNG();
  assert.ok(isPng(png));
  const decoded = decodePng(png);
  const record = `${digest(png)} ${png.length} ${decoded.width}x${decoded.height}\n`;
  pinned(
    "sheet.png.sha256",
    record,
    "the sheet's raster changed. The digest is committed rather than the 930 KB " +
      "of pixels; regenerate it the same way as the rest."
  );
});

// --- Writing them out -------------------------------------------------------

test("writeComposition puts both formats of one document beside each other", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cheatsheet-fixture-"));
  try {
    const written = await writeComposition(fixtureComposition(), join(dir, "out"), "shapes");
    assert.equal(written.svg, join(dir, "out", "shapes.svg"));
    assert.equal(written.png, join(dir, "out", "shapes.png"));
    assert.deepEqual(written.warnings, []);
    // The directory is created rather than required, so a caller does not have
    // to mkdir before every export.
    assert.equal(readFileSync(written.svg, "utf8"), readFileSync(join(fixtures, "shapes.svg"), "utf8"));
    assert.equal(
      digest(readFileSync(written.png)),
      digest(readFileSync(join(fixtures, "shapes.png"))),
      "writeComposition wrote a different raster than toPNG produced"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("and writes only the formats it was asked for", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cheatsheet-fixture-"));
  try {
    const written = await writeComposition(fixtureComposition(), dir, "only", { formats: ["svg"] });
    assert.equal(typeof written.svg, "string");
    assert.equal(written.png, undefined);
    assert.equal(existsSync(join(dir, "only.png")), false);
    // Always an array, even where no raster ran. A caller spreading it must not
    // have to guard.
    assert.deepEqual(written.warnings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("it takes a document as readily as a composition", async () => {
  // The two are interchangeable everywhere else in the surface, and a helper that
  // accepted only one would be the place a caller found that out.
  const dir = mkdtempSync(join(tmpdir(), "cheatsheet-fixture-"));
  try {
    const written = await writeComposition(fixtureComposition().toDocument(), dir, "doc", {
      formats: ["svg"],
    });
    assert.equal(readFileSync(written.svg, "utf8"), readFileSync(join(fixtures, "shapes.svg"), "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
