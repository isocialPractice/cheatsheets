// Acceptance checks for the ported graphic-design API under `api/graphic-design/`.
//
// The port is a hand translation of `src/core/graphic-design/` from
// napkin-sketch (MIT, isocialPractice), and the properties that matter here are
// not "does it draw" - upstream settled that - but the three this repository
// took on by porting it at all:
//
//   1. **It imports nothing outside its own folder.** The page loads it at run
//      time with a bare `import`, so a stray `node:fs` or a package specifier
//      would break the published site rather than a script.
//   2. **There is no build step and no `package.json`.** The local workflow is
//      `php -S localhost:8000`, which has no Node in it, so anything that has
//      to be compiled first is not usable by the page.
//   3. **`canvas` is not here.** It paints into a GUI canvas this repository
//      does not have, and it is the one upstream module the port drops.
//
// What is deliberately not here: the fixture document rendered twice and
// compared byte for byte. That is **Cover the port with a test that renders a
// fixture document twice and compares byte for byte** under **Port the
// napkin-sketch Graphic Design API** in `TODO.md`, which commits an expected
// render rather than checking a property of one, and it belongs to the run that
// does it.
//
// Run with: node --test tools/test-graphic-design-port.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import * as api from "../api/graphic-design/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const portDir = join(root, "api", "graphic-design");

// The eleven modules the port was asked for, and nothing else. `canvas` is
// dropped; `files` is the Node-only half and is its own queued item.
const PORTED = [
  "brand.mjs",
  "color.mjs",
  "compose.mjs",
  "deflate.mjs",
  "font.mjs",
  "geometry.mjs",
  "index.mjs",
  "png.mjs",
  "raster.mjs",
  "svg.mjs",
  "types.mjs",
  "units.mjs",
];

const files = readdirSync(portDir).sort();
const sources = new Map(PORTED.map((name) => [name, readFileSync(join(portDir, name), "utf8")]));

/** Every module specifier a file imports or re-exports from. */
function specifiersOf(source) {
  const found = [];
  for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) found.push(match[1]);
  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) found.push(match[1]);
  return found;
}

test("the port carries the eleven modules and the barrel over them", () => {
  assert.deepEqual(files, PORTED, `api/graphic-design/ holds ${files.join(", ")}`);
});

test("canvas is not ported, because there is no GUI canvas to paint into", () => {
  assert.equal(existsSync(join(portDir, "canvas.mjs")), false);
  assert.equal(existsSync(join(portDir, "canvas.js")), false);
});

test("nothing in the port imports outside its own folder", () => {
  for (const [name, source] of sources) {
    for (const specifier of specifiersOf(source)) {
      assert.ok(
        specifier.startsWith("./"),
        `${name} imports "${specifier}", which the page cannot resolve. ` +
          "Every import in the port has to be a sibling file."
      );
      assert.ok(
        specifier.endsWith(".mjs"),
        `${name} imports "${specifier}" without a file extension, which a browser will not resolve`
      );
    }
  }
});

test("and nothing in it reaches for Node", () => {
  for (const [name, source] of sources) {
    // `globalThis.Buffer` in raster.mjs is a guarded fallback for `atob`, and
    // reads the global rather than importing anything, so it stays.
    assert.doesNotMatch(source, /\bfrom\s+["']node:/, `${name} imports a Node builtin`);
    assert.doesNotMatch(source, /\brequire\s*\(/, `${name} calls require()`);
    assert.doesNotMatch(source, /\bprocess\.[a-z]/i, `${name} reads process`);
  }
});

test("every sibling import names a file that is actually there", () => {
  for (const [name, source] of sources) {
    for (const specifier of specifiersOf(source)) {
      assert.ok(
        existsSync(join(portDir, specifier.slice(2))),
        `${name} imports "${specifier}", which does not exist`
      );
    }
  }
});

test("there is no package.json and no build output beside the port", () => {
  assert.equal(existsSync(join(root, "api", "package.json")), false);
  assert.equal(existsSync(join(portDir, "package.json")), false);
  for (const name of files) {
    assert.doesNotMatch(name, /\.(ts|map|min\.js)$/, `${name} is build output rather than source`);
  }
});

test("the barrel exports the authoring surface a caller composes with", () => {
  for (const name of [
    "Composition",
    "ElementList",
    "createComposition",
    "renderComposition",
    "renderPng",
    "compositionToSvg",
    "rasterizeComposition",
    "encodePng",
    "decodePng",
    "parseColor",
    "parsePaint",
    "formatColor",
  ]) {
    assert.equal(typeof api[name], "function", `${name} is missing from the barrel`);
  }
});

test("it exports the brand resource convention the constants file is written in", () => {
  // `.claude/constants.md` declares a logo, a footer image, a brand name, a
  // domain and a tagline as `- key: value` lines, and these four are what read
  // that convention and put the result in a composition.
  for (const name of ["parseResources", "descriptorFromFilename", "placeBrand", "brandMark"]) {
    assert.equal(typeof api[name], "function", `${name} is missing from the barrel`);
  }
  assert.equal(typeof api.inlineSvg, "function", "inlineSvg is what keeps a vector asset out of being a hole in the raster");
});

test("and the units reduction kept the conversion the model reads", () => {
  assert.equal(api.toPx(1, "px"), 1);
  assert.equal(api.toPx(1, "in"), api.CSS_PX_PER_INCH);
  assert.equal(api.fromPx(api.CSS_PX_PER_INCH, "in"), 1);
  assert.deepEqual(api.LENGTH_UNITS, ["px", "in", "mm", "pt"]);
});

test("a composition renders to SVG as the shapes it was described with", () => {
  const design = api.createComposition({ width: 240, height: 120, background: "#fdfcf7", title: "Demo Tool" });
  design.rect({ x: 16, y: 16, width: 208, height: 48, rx: 4, fill: "#326478" });
  design.text({ x: 120, y: 40, text: "Acme Corp", align: "center", baseline: "middle", fill: "#ffffff" });
  const svg = design.toSVG();

  assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(svg, /viewBox="0 0 240 120"/);
  assert.match(svg, /<title>Demo Tool<\/title>/);
  assert.match(svg, /<rect [^>]*rx="4"[^>]*fill="#326478"/);
  // Live text rather than outlines, which is what keeps a sheet selectable,
  // searchable and translatable.
  assert.match(svg, /<text[^>]*><tspan[^>]*>Acme Corp<\/tspan><\/text>/);
});

test("the same composition renders to a PNG the decoder reads back", () => {
  const design = api.createComposition({ width: 32, height: 24, background: "#ffffff" });
  design.circle({ cx: 16, cy: 12, r: 8, fill: "#b4552d" });
  const bytes = design.toPNG({ scale: 2 });

  assert.equal(api.isPng(bytes), true);
  const decoded = api.decodePng(bytes);
  assert.equal(decoded.width, 64);
  assert.equal(decoded.height, 48);
  // The centre is the disc and a corner is the page, so both paints landed.
  const at = (x, y) => [...decoded.data.subarray((y * decoded.width + x) * 4, (y * decoded.width + x) * 4 + 3)];
  assert.deepEqual(at(32, 24), [180, 85, 45]);
  assert.deepEqual(at(0, 0), [255, 255, 255]);
});

test("an elliptical arc is refused rather than quietly losing a corner", () => {
  // The tokenizer does not carry `A` as a command at all, so an arc is refused
  // by the reader rather than by a branch that names it: a path beginning with
  // one has no move command, and one mid-path leaves the numbers to be read as
  // coordinates of whatever came before, which runs out. Both raise, which is
  // the property the limit is written for - the shape never silently loses its
  // corner - and the two messages are what upstream produces for each case.
  const design = api.createComposition({ width: 20, height: 20 });
  design.path({ d: "M0 0 A 5 5 0 0 1 10 10", fill: "#000000" });
  assert.throws(() => design.toPNG(), /graphic-design: malformed path data/);
  assert.throws(() => api.parsePathData("A 5 5 0 0 1 10 10"), /must start with a move command/);
});

test("an unrecognised colour fails where the swatch is written", () => {
  assert.throws(() => api.parseColor("nosuchcolour"), /unsupported color/);
});

test("the upstream licence notice travelled with the source", () => {
  // napkin-sketch is MIT and this repository is CC0 1.0, so copied source keeps
  // its notice. Each module names the file it came from and the commit it was
  // taken at, which is also what makes a later diff against upstream possible.
  for (const [name, source] of sources) {
    // Read the header with its comment markers and line breaks collapsed, so a
    // notice that wrapped differently still reads as the same sentence.
    const header = source.slice(0, 2000).replace(/^\/\/ ?/gm, "").replace(/\s+/g, " ");
    assert.match(header, /napkin-sketch \(MIT, isocialPractice\)/, `${name} does not carry the upstream notice`);
    assert.match(header, /commit d43caac191b2dfd532b3311f4ca1ea6969bb002f/, `${name} does not record the source commit`);
  }
});
