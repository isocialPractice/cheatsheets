// What `tools/build-manifest.mjs` promises, held against trees built for the
// purpose.
//
// The manifest pipeline is the one prerequisite for every item under **New
// Cheatsheets**, and `--check` is what the Pages deploy waits on, so the cases
// here are written as the two questions a reader actually has: does the walk
// see the catalog the way the conventions describe it, and does the gate fail
// the trees it exists to fail.
//
// Every case builds its own tree in the system temporary folder rather than in
// the repository, for the reason the fixture tests settled: a tree written
// under `.tmp/` is ignored by git and invisible to the suite, but it is still
// inside the working tree the social tool globs, and a catalog fixture holding
// a `sheet.webp` would read to that tool as a new cheatsheet image.
//
// The real repository is exercised too, in the last section. Its catalog is
// empty today - no folder holds a `sheet.json` until the eleven array examples
// are migrated - and an empty catalog is a state the pipeline has to handle
// rather than a gap in the test: it is what `--check` runs against on every
// push between now and that migration.
//
// Run with: node --test tools/test-build-manifest.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  KINDS,
  MANIFEST_NAME,
  MAX_DEPTH,
  MIN_DEPTH,
  NOT_CATALOG,
  RENDER,
  SEGMENT,
  buildManifest,
  checkCatalog,
  detectPayload,
  main,
  readCatalog,
  renderManifest,
  walkCatalog,
} from "./build-manifest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** A document that composes without complaint, for a tree that is about paths. */
const SHEET = {
  title: "Splicing Array Elements",
  subtitle: "Add and remove in one call",
  seed: "splicing-arrays",
  code: [
    { text: "// remove two, insert one", role: "comment" },
    { text: "const items = ['a', 'b', 'c', 'd'];", role: "plain" },
  ],
};

/**
 * Builds a tree from a flat map of repository relative path to contents.
 *
 * An object value is written as JSON, a string as text, and `null` makes an
 * empty directory. Flat rather than nested because every case here is about a
 * path, and a nested literal hides the one path the case is testing.
 *
 * @param {Record<string, unknown>} files
 * @returns {string} The absolute root of the tree.
 */
function tree(files) {
  const dir = mkdtempSync(join(tmpdir(), "cheatsheet-manifest-"));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(dir, ...path.split("/"));
    if (contents === null) {
      mkdirSync(full, { recursive: true });
      continue;
    }
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(
      full,
      typeof contents === "string" ? contents : `${JSON.stringify(contents, null, 2)}\n`,
      "utf8"
    );
  }
  return dir;
}

/** One category, one group, one cheatsheet, and nothing wrong with it. */
function goodTree(extra = {}) {
  return tree({
    "javascript/meta.json": { title: "JavaScript", order: 1 },
    "javascript/arrays/meta.json": { title: "Arrays", order: 1 },
    "javascript/arrays/splicing-arrays/meta.json": { order: 3 },
    "javascript/arrays/splicing-arrays/sheet.json": { ...SHEET, kind: "run" },
    "javascript/arrays/splicing-arrays/splicing-arrays.js": "console.log('demo');\n",
    ...extra,
  });
}

/**
 * Reads a tree, checks it, and returns the findings by rule.
 *
 * Writes the freshly generated manifest into the tree first, so the committed
 * file rule never fires in a case that is about something else. A case testing
 * that rule writes its own.
 *
 * @param {string} dir
 * @param {{ commit?: boolean }} [options]
 */
async function inspect(dir, options = {}) {
  const catalog = await readCatalog(dir);
  const generated = renderManifest(buildManifest(catalog.sheets, catalog.levels));
  if (options.commit !== false) writeFileSync(join(dir, MANIFEST_NAME), generated, "utf8");
  const committed = options.commit === false ? null : generated;
  const findings = checkCatalog(catalog, generated, committed);
  return {
    catalog,
    generated,
    findings,
    errors: findings.filter((f) => f.level === "error"),
    rules: findings.filter((f) => f.level === "error").map((f) => f.rule),
  };
}

/* --- The walk ------------------------------------------------------------ */

test("a folder holding sheet.json is a cheatsheet, and nothing else is", async () => {
  const dir = goodTree();
  try {
    const { folders } = await walkCatalog(dir);
    assert.equal(folders.length, 1);
    assert.deepEqual(folders[0].segments, ["javascript", "arrays", "splicing-arrays"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("meta.json is read at every level, including the cheatsheet's own", async () => {
  const dir = goodTree();
  try {
    const { levels } = await walkCatalog(dir);
    assert.equal(levels.get("javascript")?.title, "JavaScript");
    assert.equal(levels.get("javascript/arrays")?.title, "Arrays");
    // The cheatsheet's own level carries an order and no title, because its
    // title lives in the document.
    assert.equal(levels.get("javascript/arrays/splicing-arrays")?.order, 3);
    assert.equal(levels.get("javascript/arrays/splicing-arrays")?.title, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the walk stops at a cheatsheet folder", async () => {
  // A `sheet.json` inside a payload is a file in a demo, not a second
  // cheatsheet. Descending past one would list it as a sibling of its own
  // parent, at a depth the conventions do not allow.
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/demo/sheet.json": { title: "Not a cheatsheet" },
  });
  try {
    const { folders } = await walkCatalog(dir);
    assert.equal(folders.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a dot directory is never walked", async () => {
  const dir = goodTree({
    ".tmp/scratch/sheet.json": { title: "Scratch" },
    ".claude/notes/sheet.json": { title: "Notes" },
  });
  try {
    const { folders } = await walkCatalog(dir);
    assert.equal(folders.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the named source folders are skipped at the root and nowhere else", async () => {
  // `api/` at the root is the drawing surface. `javascript/api/` would be a perfectly
  // ordinary category folder, and skipping it by name at any depth would make
  // a cheatsheet about an API unreachable.
  const dir = tree({
    "api/napkin-sketch/sheet.json": { ...SHEET },
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/api/meta.json": { title: "The API" },
    "javascript/api/fetch/sheet.json": { ...SHEET, kind: "none" },
  });
  try {
    assert.ok(NOT_CATALOG.has("api"));
    const { folders } = await walkCatalog(dir);
    assert.deepEqual(
      folders.map((f) => f.segments.join("/")),
      ["javascript/api/fetch"]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- The manifest -------------------------------------------------------- */

test("the composed box is recorded, because the page reserves it", async () => {
  const dir = goodTree();
  try {
    const { generated } = await inspect(dir);
    const manifest = JSON.parse(generated);
    const sheet = manifest.categories[0].cheatsheets[0];
    assert.equal(sheet.width, 3600);
    assert.equal(sheet.height, 3600);
    assert.deepEqual(manifest.canvas, { width: 3600, height: 3600 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a title is never derived from a path", async () => {
  const dir = goodTree();
  try {
    const { generated } = await inspect(dir);
    const manifest = JSON.parse(generated);
    assert.equal(manifest.categories[0].title, "JavaScript");
    assert.equal(manifest.categories[0].cheatsheets[0].groupTitle, "Arrays");
    assert.equal(manifest.categories[0].cheatsheets[0].title, "Splicing Array Elements");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the payload is recorded as a path the page can fetch", async () => {
  const dir = goodTree();
  try {
    const { generated } = await inspect(dir);
    assert.equal(
      JSON.parse(generated).categories[0].cheatsheets[0].payload,
      "javascript/arrays/splicing-arrays/splicing-arrays.js"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the same tree renders the same bytes, whatever order it is read in", async () => {
  // The committed file rule compares bytes, so anything non-deterministic in
  // here - a timestamp, a Map iteration order, a filesystem listing order -
  // would fail `--check` on a tree nobody had touched.
  const dir = goodTree({
    "html-css/meta.json": { title: "HTML/CSS", order: 2 },
    "html-css/flexbox/sheet.json": { ...SHEET, title: "Flexbox", kind: "none" },
  });
  try {
    const first = renderManifest(buildManifest(...(await catalogParts(dir))));
    const second = renderManifest(buildManifest(...(await catalogParts(dir))));
    assert.equal(first, second);
    assert.doesNotMatch(first, /\d{4}-\d{2}-\d{2}T/, "the manifest carries a timestamp");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("categories and cheatsheets sort by declared order, then by id", async () => {
  const dir = tree({
    "zebra/meta.json": { title: "Zebra", order: 1 },
    "zebra/one/sheet.json": { ...SHEET, kind: "none" },
    "alpha/meta.json": { title: "Alpha", order: 2 },
    "alpha/late/meta.json": { order: 9 },
    "alpha/late/sheet.json": { ...SHEET, kind: "none" },
    "alpha/early/meta.json": { order: 1 },
    "alpha/early/sheet.json": { ...SHEET, kind: "none" },
  });
  try {
    const { generated } = await inspect(dir);
    const manifest = JSON.parse(generated);
    assert.deepEqual(manifest.categories.map((c) => c.id), ["zebra", "alpha"]);
    assert.deepEqual(
      manifest.categories[1].cheatsheets.map((s) => s.id),
      ["alpha/early", "alpha/late"]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** The two arguments `buildManifest` takes, read fresh from a tree. */
async function catalogParts(dir) {
  const catalog = await readCatalog(dir);
  return [catalog.sheets, catalog.levels];
}

/**
 * Runs the command line with its report swallowed.
 *
 * The report is the tool working, not the test failing, and a suite that
 * prints a wall of deliberate errors makes the one real failure unfindable.
 *
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function quietly(argv) {
  const report = console.error;
  console.error = () => {};
  try {
    return await main(argv);
  } finally {
    console.error = report;
  }
}

/* --- Payload detection --------------------------------------------------- */

test("detection reports what is on disk and nothing a document claims", () => {
  assert.equal(detectPayload({ files: ["sheet.json", "demo.js"], dirs: [] }).kind, "run");
  assert.equal(detectPayload({ files: ["sheet.json", "demo.css"], dirs: [] }).kind, "read");
  assert.equal(detectPayload({ files: ["sheet.json"], dirs: ["demo"] }).kind, "embed");
  assert.equal(detectPayload({ files: ["sheet.json"], dirs: [] }).kind, "none");
  assert.deepEqual(KINDS, ["run", "read", "embed", "none"]);
});

test("meta.json and a render are never mistaken for the payload", () => {
  const found = detectPayload({
    files: ["sheet.json", "meta.json", "sheet.webp", "sheet.svg", "splicing.js"],
    dirs: [],
  });
  assert.deepEqual(found.candidates, ["splicing.js"]);
  assert.equal(found.payload, "splicing.js");
});

test("a demo folder and a script are both reported, not collapsed", () => {
  // Reporting only the folder would tell a document declaring `run` that it
  // had nothing to inject, which is not what is wrong with a folder holding
  // both.
  const found = detectPayload({ files: ["sheet.json", "demo.js"], dirs: ["demo"] });
  assert.equal(found.kind, "embed");
  assert.equal(found.payload, "demo.js");
  assert.equal(found.demo, true);
});

/* --- Rule 1: the document ------------------------------------------------ */

test("an unparsable sheet.json stops the build rather than being skipped", async () => {
  const dir = goodTree({ "javascript/arrays/splicing-arrays/sheet.json": "{ not json" });
  try {
    const catalog = await readCatalog(dir);
    assert.equal(catalog.sheets.length, 0);
    assert.equal(catalog.findings[0].rule, "sheet.json");
    assert.equal(catalog.findings[0].level, "error");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a sheet.json that is not an object is invalid, not empty", async () => {
  const dir = goodTree({ "javascript/arrays/splicing-arrays/sheet.json": "[]\n" });
  try {
    const catalog = await readCatalog(dir);
    assert.equal(catalog.sheets.length, 0);
    assert.match(catalog.findings[0].message, /not an object/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing title is an error, and meta.json may supply it", async () => {
  const without = goodTree({
    "javascript/arrays/splicing-arrays/sheet.json": { code: "const a = 1;" },
  });
  try {
    const catalog = await readCatalog(without);
    assert.equal(catalog.sheets.length, 0);
    assert.equal(catalog.findings[0].rule, "title");
  } finally {
    rmSync(without, { recursive: true, force: true });
  }

  const supplied = goodTree({
    "javascript/arrays/splicing-arrays/meta.json": { title: "From the level", order: 3 },
    "javascript/arrays/splicing-arrays/sheet.json": { code: "const a = 1;", kind: "run" },
  });
  try {
    const catalog = await readCatalog(supplied);
    assert.equal(catalog.sheets.length, 1);
    assert.equal(catalog.sheets[0].title, "From the level");
  } finally {
    rmSync(supplied, { recursive: true, force: true });
  }
});

test("a document the API refuses stops the build, rather than losing its box", async () => {
  // The alternative is an entry with no width and height, which ships the
  // layout shift the dimensions exist to prevent, and ships it quietly.
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/sheet.json": { title: "", code: "const a = 1;" },
  });
  try {
    const catalog = await readCatalog(dir);
    assert.equal(catalog.sheets.length, 0);
    assert.ok(catalog.findings.some((f) => f.rule === "title" || f.rule === "compose"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- Rule 2: kind against disk ------------------------------------------- */

test("a declared kind that contradicts the folder fails", async () => {
  const cases = [
    [{ ...SHEET, kind: "embed" }, /no demo\/ folder/],
    [{ ...SHEET, kind: "none" }, /holds a payload/],
    [{ ...SHEET, kind: "sketch" }, /is not one of/],
  ];
  for (const [document, message] of cases) {
    const dir = goodTree({ "javascript/arrays/splicing-arrays/sheet.json": document });
    try {
      const { errors } = await inspect(dir);
      const kind = errors.find((f) => f.rule === "kind");
      assert.ok(kind, `no kind finding for ${JSON.stringify(document.kind)}`);
      assert.match(kind.message, message);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("kind run against a payload that is not a browser script fails", async () => {
  const dir = tree({
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/selectors/sheet.json": { ...SHEET, kind: "run" },
    "javascript/selectors/selectors.css": "a { color: red; }\n",
  });
  try {
    const { errors } = await inspect(dir);
    assert.match(errors.find((f) => f.rule === "kind").message, /not a browser script/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an embed with no demo/index.html fails, declared or detected", async () => {
  const declared = tree({
    "html-css/meta.json": { title: "HTML/CSS" },
    "html-css/flexbox/sheet.json": { ...SHEET, kind: "embed" },
    "html-css/flexbox/demo/styles.css": "body { margin: 0; }\n",
  });
  try {
    const { errors } = await inspect(declared);
    assert.match(errors.find((f) => f.rule === "kind").message, /holds no index\.html/);
  } finally {
    rmSync(declared, { recursive: true, force: true });
  }

  const detected = tree({
    "html-css/meta.json": { title: "HTML/CSS" },
    "html-css/flexbox/sheet.json": { ...SHEET },
    "html-css/flexbox/demo/styles.css": "body { margin: 0; }\n",
  });
  try {
    const { errors } = await inspect(detected);
    assert.match(errors.find((f) => f.rule === "kind").message, /holds no index\.html/);
  } finally {
    rmSync(detected, { recursive: true, force: true });
  }
});

test("two payload candidates and no declaration is ambiguous", async () => {
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/sheet.json": { ...SHEET },
    "javascript/arrays/splicing-arrays/helper.js": "export const a = 1;\n",
  });
  try {
    const { errors } = await inspect(dir);
    assert.match(errors.find((f) => f.rule === "kind").message, /has to name one/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("naming the payload settles the ambiguity", async () => {
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/sheet.json": {
      ...SHEET,
      kind: "run",
      payload: "splicing-arrays.js",
    },
    "javascript/arrays/splicing-arrays/helper.js": "export const a = 1;\n",
  });
  try {
    const { errors } = await inspect(dir);
    // The second script is still unaccounted for, which is the right answer:
    // one file is the payload and the other is a file nobody named.
    assert.deepEqual(errors.map((f) => f.rule), ["unreferenced"]);
    assert.match(errors[0].message, /"helper\.js"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- Rule 3: casing ------------------------------------------------------ */

test("a path segment that is not lower case kebab ASCII fails", async () => {
  const dir = tree({
    "javaScriptArrays/meta.json": { title: "JavaScript Arrays" },
    "javaScriptArrays/Splicing Arrays/sheet.json": { ...SHEET, kind: "none" },
  });
  try {
    const { errors } = await inspect(dir);
    const casing = errors.filter((f) => f.rule === "casing");
    assert.equal(casing.length, 2, "both segments should fail");
    assert.match(casing[0].message, /case sensitive filesystem/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the kebab rule is the one the regular expression states", () => {
  for (const good of ["javascript", "html-css", "c-plus-plus", "es2015", "a", "sort-numbers-2"]) {
    assert.ok(SEGMENT.test(good), `"${good}" should pass`);
  }
  for (const bad of ["JavaScript", "html_css", "html css", "-leading", "trailing-", "double--dash", "café"]) {
    assert.ok(!SEGMENT.test(bad), `"${bad}" should fail`);
  }
});

test("a payload named with the wrong casing is caught against the listing", async () => {
  // This is the whole point of the rule: on Windows the file opens, and the
  // published site answers 404. Comparing against `readdir` output is what
  // makes the failure visible on the machine the work happens on.
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/sheet.json": {
      ...SHEET,
      kind: "run",
      payload: "Splicing-Arrays.js",
    },
  });
  try {
    const { errors } = await inspect(dir);
    const casing = errors.find((f) => f.rule === "casing");
    assert.ok(casing, "the mismatch was not reported");
    assert.match(casing.message, /the file on disk is "splicing-arrays\.js"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a payload naming a subfolder is checked at every segment, not just the last", async () => {
  // A bare file name was the only shape the rule used to compare, so a payload
  // that named a folder on the way down skipped the check entirely and the
  // manifest recorded whichever spelling the document used.
  const dir = tree({
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/arrays/meta.json": { title: "Arrays" },
    "javascript/arrays/splicing-arrays/sheet.json": {
      ...SHEET,
      kind: "run",
      payload: "Src/splicing-arrays.js",
    },
    "javascript/arrays/splicing-arrays/src/splicing-arrays.js": "console.log('demo');\n",
  });
  try {
    const { errors } = await inspect(dir);
    const casing = errors.find((f) => f.rule === "casing");
    assert.ok(casing, "the mismatch was not reported");
    assert.match(casing.message, /the folder on disk is "src"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a payload that is not on disk fails, whatever folder it names", async () => {
  const dir = tree({
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/arrays/meta.json": { title: "Arrays" },
    "javascript/arrays/splicing-arrays/sheet.json": {
      ...SHEET,
      kind: "read",
      payload: "src/example.js",
    },
  });
  try {
    const { errors } = await inspect(dir);
    const casing = errors.find((f) => f.rule === "casing");
    assert.ok(casing, "the missing payload was not reported");
    assert.match(casing.message, /is not in the folder/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a payload that climbs out of its own folder is refused", async () => {
  // The manifest hands the page a path to fetch. A payload recorded as
  // `javascript/arrays/splicing-arrays/../../../secret.txt` is a path out of
  // the catalog, and the gate is the only thing between it and the artifact.
  const dir = tree({
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/arrays/meta.json": { title: "Arrays" },
    "javascript/arrays/splicing-arrays/sheet.json": {
      ...SHEET,
      kind: "read",
      payload: "../../../secret.txt",
    },
    "secret.txt": "not a cheatsheet\n",
  });
  try {
    const { errors } = await inspect(dir);
    const escape = errors.find((f) => f.rule === "casing");
    assert.ok(escape, "the traversal was not reported");
    assert.match(escape.message, /does not stay inside the folder/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- Rules 4 and 5: depth and ids ---------------------------------------- */

test("a cheatsheet above or below the allowed depth fails", async () => {
  assert.equal(MIN_DEPTH, 2);
  assert.equal(MAX_DEPTH, 3);
  const shallow = tree({ "javascript/sheet.json": { ...SHEET, kind: "none" } });
  try {
    const { errors } = await inspect(shallow);
    assert.ok(errors.some((f) => f.rule === "depth"));
  } finally {
    rmSync(shallow, { recursive: true, force: true });
  }
});

test("nothing four levels deep is walked at all", async () => {
  // The walk stops descending at the maximum depth, so a folder below it is
  // not a cheatsheet with a depth error, it is not a cheatsheet.
  const dir = goodTree({
    "javascript/arrays/mutating/splice/sheet.json": { ...SHEET, kind: "none" },
  });
  try {
    const { folders } = await walkCatalog(dir);
    assert.deepEqual(
      folders.map((f) => f.segments.join("/")),
      ["javascript/arrays/splicing-arrays"]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("two folders claiming one id collide", async () => {
  const dir = tree({
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/splice/sheet.json": { ...SHEET, id: "arrays", kind: "none" },
    "javascript/slice/sheet.json": { ...SHEET, id: "arrays", kind: "none" },
  });
  try {
    const { errors } = await inspect(dir);
    const clash = errors.find((f) => f.rule === "id");
    assert.ok(clash, "the duplicate was not reported");
    assert.match(clash.message, /already taken by/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- Rule 6: the margins ------------------------------------------------- */

test("a composition that will not fit its region fails", async () => {
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/sheet.json": {
      ...SHEET,
      kind: "run",
      code: [{ text: "const x = ".concat("'a very long string literal', ".repeat(40), "1;") }],
    },
  });
  try {
    const { errors } = await inspect(dir);
    const margins = errors.find((f) => f.rule === "margins");
    assert.ok(margins, "a line far wider than the panel was accepted");
    assert.match(margins.message, /does not fit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a sparse panel is a warning, because a short sheet is still inside its margins", async () => {
  const dir = goodTree();
  try {
    const { findings, errors } = await inspect(dir);
    assert.deepEqual(errors, [], "a short example was failed");
    const sparse = findings.find((f) => f.rule === "margins");
    assert.equal(sparse.level, "warning");
    assert.match(sparse.message, /of the code panel/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- Rule 7: unreferenced files, and the render allowance ---------------- */

test("a file nobody named fails", async () => {
  const dir = goodTree({ "javascript/arrays/splicing-arrays/notes.md": "scratch\n" });
  try {
    const { errors } = await inspect(dir);
    assert.ok(errors.some((f) => f.rule === "unreferenced" && /notes\.md/.test(f.message)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a render named sheet.* is expected output and passes", async () => {
  // The export command line writes one of these beside the document. It is
  // untracked, so a check that asked git what was committed would pass on the
  // machine that rendered it and fail everywhere else. Naming the render is
  // what makes the rule the same answer in both places.
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/sheet.webp": "pretend bytes",
    "javascript/arrays/splicing-arrays/sheet.png": "pretend bytes",
    "javascript/arrays/splicing-arrays/sheet.jpg": "pretend bytes",
    "javascript/arrays/splicing-arrays/sheet.svg": "<svg></svg>",
  });
  try {
    const { errors } = await inspect(dir);
    assert.deepEqual(errors, [], "a render was treated as a stray file");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a folder nobody named fails, because the walk stops before it", async () => {
  // The walk stops descending at a cheatsheet folder, so a subfolder is the
  // one place no other rule looks. A `sheet.json` inside one is not a second
  // cheatsheet, and without this it reached the artifact unaccounted for while
  // a single stray file beside it was a hard error.
  const dir = goodTree({
    "javascript/arrays/splicing-arrays/helpers/util.js": "export const x = 1;\n",
    "javascript/arrays/splicing-arrays/helpers/sheet.json": { ...SHEET },
  });
  try {
    const { errors, catalog } = await inspect(dir);
    assert.ok(errors.some((f) => f.rule === "unreferenced" && /"helpers\/"/.test(f.message)));
    assert.deepEqual(
      catalog.sheets.map((s) => s.path),
      ["javascript/arrays/splicing-arrays"],
      "the nested sheet.json was read as a second cheatsheet"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the folder a named payload sits in is referenced, and passes", async () => {
  const dir = tree({
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/arrays/meta.json": { title: "Arrays" },
    "javascript/arrays/splicing-arrays/sheet.json": {
      ...SHEET,
      kind: "run",
      payload: "src/splicing-arrays.js",
    },
    "javascript/arrays/splicing-arrays/src/splicing-arrays.js": "console.log('demo');\n",
  });
  try {
    const { errors } = await inspect(dir);
    assert.deepEqual(errors, [], "the payload's own folder was called unreferenced");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a demo folder is never a stray folder", async () => {
  const dir = tree({
    "javascript/meta.json": { title: "JavaScript" },
    "javascript/arrays/meta.json": { title: "Arrays" },
    "javascript/arrays/splicing-arrays/sheet.json": { ...SHEET, kind: "embed" },
    "javascript/arrays/splicing-arrays/demo/index.html": "<!doctype html>\n",
  });
  try {
    const { errors } = await inspect(dir);
    assert.deepEqual(errors, [], "demo/ was called unreferenced");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("but a raster that is not named sheet.* is still a stray file", () => {
  assert.ok(RENDER.test("sheet.webp"));
  assert.ok(RENDER.test("sheet.jpeg"));
  assert.ok(!RENDER.test("splicing.webp"));
  assert.ok(!RENDER.test("sheet.webp.bak"));
  assert.ok(!RENDER.test("sheet.json"));
});

/* --- Rule 8: the committed manifest -------------------------------------- */

test("a missing committed manifest fails the check", async () => {
  const dir = goodTree();
  try {
    const { errors } = await inspect(dir, { commit: false });
    assert.ok(errors.some((f) => f.rule === "committed" && /no committed/.test(f.message)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a stale committed manifest fails the check", async () => {
  const dir = goodTree();
  try {
    writeFileSync(join(dir, MANIFEST_NAME), '{\n  "categories": []\n}\n', "utf8");
    const catalog = await readCatalog(dir);
    const generated = renderManifest(buildManifest(catalog.sheets, catalog.levels));
    const findings = checkCatalog(catalog, generated, '{\n  "categories": []\n}\n');
    assert.ok(findings.some((f) => f.rule === "committed" && /differs/.test(f.message)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- Rule 9: a level with no title --------------------------------------- */

test("a category holding a cheatsheet needs a meta.json title", async () => {
  const dir = tree({
    "javascript/splice/sheet.json": { ...SHEET, kind: "none" },
  });
  try {
    const { errors } = await inspect(dir);
    const title = errors.find((f) => f.rule === "title" && f.path === "javascript");
    assert.ok(title, "a category with no meta.json was accepted");
    assert.match(title.message, /derived from its path/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a level that holds no cheatsheet is not asked for a title", async () => {
  const dir = goodTree({ "drafts/notes/readme.md": "nothing here yet\n" });
  try {
    const { errors } = await inspect(dir);
    assert.deepEqual(errors, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- The command line ---------------------------------------------------- */

test("--check exits non zero on a broken tree and zero on a sound one", async () => {
  const dir = goodTree();
  try {
    assert.equal(await quietly(["--root", dir]), 0, "the build failed");
    assert.equal(await quietly(["--root", dir, "--check"]), 0, "a sound tree failed the check");
    writeFileSync(join(dir, "javascript", "arrays", "splicing-arrays", "stray.js"), "1\n", "utf8");
    assert.equal(await quietly(["--root", dir, "--check"]), 1, "a broken tree passed the check");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--check writes nothing, even when the manifest is stale", async () => {
  const dir = goodTree();
  try {
    writeFileSync(join(dir, MANIFEST_NAME), "{}\n", "utf8");
    assert.equal(await quietly(["--root", dir, "--check"]), 1);
    const { readFileSync } = await import("node:fs");
    assert.equal(readFileSync(join(dir, MANIFEST_NAME), "utf8"), "{}\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--print writes the manifest to standard output and not to disk", async () => {
  const dir = goodTree();
  const write = process.stdout.write.bind(process.stdout);
  let printed = "";
  process.stdout.write = (chunk) => {
    printed += chunk;
    return true;
  };
  try {
    assert.equal(await quietly(["--root", dir, "--print"]), 0);
  } finally {
    process.stdout.write = write;
    rmSync(dir, { recursive: true, force: true });
  }
  assert.match(printed, /"categories"/);
});

/* --- The repository itself ----------------------------------------------- */

test("the repository's own tree passes the check", async () => {
  // No longer the empty case this was written for. The eleven array examples
  // migrated into `javascript/arrays/` on 2026.09.24 and the `html-css`
  // category landed on 2026.10.19, so the check now walks seventeen committed
  // documents across two categories and composes every one of them. That is
  // the tree the Pages workflow runs against on every push, which is why the
  // case is here rather than left to the workflow.
  assert.equal(await quietly(["--check"]), 0);
});

test("every category after the first carries its own design language", async () => {
  // The convention under **New Cheatsheets** in `TODO.md`: a category's design
  // language is generated once, by its first item, and recorded at the root as
  // `DESIGN_LANGUAGE-<category>.md`.
  //
  // `javascript` is the exception and the reason the rule reads "after the
  // first": the global `DESIGN_LANGUAGE.md` was measured off the eleven
  // `javaScriptArrays/*.jpg`, which are that category's own artwork, so its
  // language is the global record rather than a derivation of it. Every
  // category after it has no artwork and derives one.
  const { readdirSync } = await import("node:fs");
  const { folders } = await walkCatalog(root);
  const categories = [...new Set(folders.map((folder) => folder.segments[0]))].sort();
  const recorded = new Set(readdirSync(root).filter((name) => /^DESIGN_LANGUAGE-.+\.md$/.test(name)));

  const missing = categories
    .filter((id) => id !== "javascript")
    .filter((id) => !recorded.has(`DESIGN_LANGUAGE-${id}.md`));
  assert.deepEqual(
    missing,
    [],
    "these categories hold cheatsheets and no design language, so their sheets are " +
      "drawn to a language that was never written down"
  );

  // And nothing is recorded for a category the catalog does not hold, which is
  // what would be left behind by a folder renamed without its record.
  const orphaned = [...recorded].filter(
    (name) => !categories.includes(name.slice("DESIGN_LANGUAGE-".length, -".md".length))
  );
  assert.deepEqual(orphaned, [], "these name a category the catalog no longer holds");
});

test("the committed manifest matches what the repository generates", async () => {
  const catalog = await readCatalog(root);
  const generated = renderManifest(buildManifest(catalog.sheets, catalog.levels));
  const { readFileSync } = await import("node:fs");
  assert.equal(
    readFileSync(join(root, MANIFEST_NAME), "utf8"),
    generated,
    `${MANIFEST_NAME} is stale. Run node tools/build-manifest.mjs and commit the result`
  );
});

test("the eleven array examples are not swept in by the walk", async () => {
  // `javaScriptArrays/` predates the kebab convention and holds no
  // `sheet.json`, so no rule is applied to its name. That is what lets the
  // reference images stay exactly where they are while the check is strict
  // about every path it does record.
  const { folders } = await walkCatalog(root);
  assert.ok(!folders.some((f) => f.segments[0] === "javaScriptArrays"));
});

/* --- The gate in front of the deploy ------------------------------------- */

test("the Pages workflow runs --check, and the deploy waits on it", async () => {
  // Without these four facts the script is a thing a person remembers to run.
  // The one that is easiest to lose is the third: a job can be added, pass on
  // every push, and gate nothing at all, because nothing downstream needs it.
  const { readFileSync } = await import("node:fs");
  const workflow = readFileSync(join(root, ".github", "workflows", "pages.yml"), "utf8");

  assert.match(workflow, /^ {2}manifest:$/m, "the workflow names no manifest job");
  assert.match(
    workflow,
    /run: node tools\/build-manifest\.mjs --check/,
    "the manifest job does not run the check"
  );

  // Split the jobs block alone. Taking every two-space key in the file would
  // read `push:` and `workflow_dispatch:` under `on:` as jobs, which is
  // harmless here and wrong enough to mislead the next person to edit this.
  const jobs = Object.fromEntries(
    workflow
      .slice(workflow.indexOf("\njobs:\n"))
      .split(/^ {2}(?=[\w-]+:$)/m)
      .slice(1)
      .map((block) => [block.match(/^([\w-]+):/)?.[1], block])
  );
  assert.deepEqual(Object.keys(jobs), ["manifest", "build", "deploy"]);
  assert.match(jobs.build, /needs: manifest/, "the build does not wait on the manifest check");
  assert.match(jobs.deploy, /needs: build/, "the deploy does not wait on the build");
});

test("the check the workflow runs needs nothing installed", async () => {
  // No package.json and no dependency, which is what lets the workflow call
  // the script straight after checkout. A setup-node step would be harmless;
  // an npm install would mean the script had grown a dependency, and the
  // browser imports this same api/ folder at run time.
  const { readFileSync } = await import("node:fs");
  const workflow = readFileSync(join(root, ".github", "workflows", "pages.yml"), "utf8");
  assert.doesNotMatch(workflow, /npm (ci|install)/, "the gate grew an install step");

  const source = readFileSync(join(root, "tools", "build-manifest.mjs"), "utf8");
  const imports = [...source.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  for (const specifier of imports) {
    assert.ok(
      specifier.startsWith("node:") || specifier.startsWith("."),
      `${specifier} is neither a Node builtin nor a relative path`
    );
  }
});
