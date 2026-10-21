// What the copy of the drawing surface in `api/napkin-sketch/` promises.
//
// **Why this replaced a test of a tool.** Until 2026.10.20 the copy was made
// by `tools/vendor-napkin-sketch.mjs`, written here because `1.0.0` shipped no
// way to make one, and most of that file's 390 line test was about the tool:
// its tar reader, its specifier scan, its refusal of a path climbing out of
// the folder. `1.1.0` ships `napkin-sketch vendor`, so the tool and its test
// went, and what is left is the part that was never about the tool - the
// claims the page and the suite rest on:
//
//   1. The copy still matches the record it was written with, offline.
//   2. The scope markers are inside the folder and nowhere above it.
//   3. Every entry this repository imports loads from the folder with nothing
//      installed, and exports what is imported from it.
//   4. The Pages gate checks the copy, with no install step.
//   5. Nothing in the tree still names the retired mechanism.
//
// Claim 1 is delegated rather than re-implemented. `napkin-sketch vendor`
// writes `VENDOR-CHECK.mjs` beside the copy, which hashes every file against
// `VENDOR.json` with plain node, no install and no network - the same program
// the Pages gate runs. Hashing the folder a second time here would be a second
// reading of the same record, and the two would drift.
//
// Run with: node --test tools/test-vendored-surface.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the copy lives, as a repository-relative POSIX path. */
const VENDOR_DIR = "api/napkin-sketch";

/** The package the copy is of, and the version this repository is pinned to. */
const PACKAGE = "@isocialpractice/napkin-sketch";
const VERSION = "1.1.0";

/**
 * The parts vendored, and what each is for.
 *
 * `graphic-design` is the composition-only entry asked for upstream as
 * [#10](https://github.com/isocialPractice/napkin-sketch/issues/10) and
 * released in `1.1.0`: it is what `api/cheatsheet/` draws through. `markdown`
 * installs highlight.js as the reader behind Clean Language Accents, and
 * `main` is where `accentRuns` and the accent themes are exported from, so the
 * two together are what colours a code line token by token. `graphic-design/
 * files` writes an SVG or a PNG to disk and is Node only - the page must never
 * reach it, which is the boundary `api/cheatsheet/raster.mjs` keeps.
 */
const PARTS = ["graphic-design", "graphic-design/files", "markdown", "main"];

/**
 * The `package.json` files that make a `.js` beside them load as a module.
 *
 * A marker belongs with the copy it scopes. `api/package.json` would reach
 * every sibling under `api/` as well - `api/cheatsheet/` today - and declare
 * this repository's own source a module as a side effect of vendoring somebody
 * else's, which is why the case below is as much about where a marker is *not*
 * as where it is.
 */
const MARKERS = ["api/package.json", "chunks/package.json", "graphic-design/package.json", "markdown/package.json"];

/** The record the copy was written with. */
const record = JSON.parse(await readFile(join(root, VENDOR_DIR, "VENDOR.json"), "utf8"));

test("the copy records the package, the version and the parts it was made of", () => {
  assert.equal(record.name, PACKAGE);
  assert.equal(record.version, VERSION);
  assert.deepEqual([...record.parts].sort(), [...PARTS].sort());
  assert.equal(record.generator, `napkin-sketch vendor ${VERSION}`);
  // `source: package` means the copy came from the registry's tarball and the
  // record carries its integrity. A copy made from a clone's build records
  // `clone` and carries neither, which is not a copy to commit.
  assert.equal(record.source, "package");
  assert.match(record.integrity, /^sha512-/);
  assert.equal(record.tarball, `https://registry.npmjs.org/${PACKAGE}/-/napkin-sketch-${VERSION}.tgz`);
});

test("and the copy still matches it, offline, through its own checker", async () => {
  // The program the Pages gate runs, run here so a byte edited under that
  // folder - and nothing there is ever edited - fails in the suite rather than
  // in the deploy.
  const { stdout } = await run(process.execPath, [join(root, VENDOR_DIR, "VENDOR-CHECK.mjs")], { cwd: root });
  assert.match(stdout, new RegExp(`${Object.keys(record.files).length} files match VENDOR\\.json`));
});

test("the scope markers are inside the vendored folder and nowhere above it", async () => {
  for (const marker of MARKERS) {
    assert.ok(record.files[marker], `${marker} is not in the record`);
    assert.equal(JSON.parse(await readFile(join(root, VENDOR_DIR, ...marker.split("/")), "utf8")).type, "module");
  }
  await assert.rejects(() => readFile(join(root, "api", "package.json")), /ENOENT/);
  await assert.rejects(() => readFile(join(root, "package.json")), /ENOENT/);
});

test("every entry loads from the folder with nothing installed", async () => {
  // The claim the whole route rests on. A failure here is the one that matters
  // most, because the page imports this same tree by relative path.
  const design = await import(`../${VENDOR_DIR}/${record.entries["graphic-design"]}`);
  for (const name of ["createComposition", "rasterizeComposition", "layoutText", "placeBrand", "measureText"]) {
    assert.equal(typeof design[name], "function", `the graphic-design entry does not export ${name}`);
  }

  const files = await import(`../${VENDOR_DIR}/${record.entries["graphic-design/files"]}`);
  assert.equal(typeof files.writeComposition, "function");

  const markdown = await import(`../${VENDOR_DIR}/${record.entries.markdown}`);
  assert.equal(typeof markdown.registerAccentLanguage, "function");

  const api = await import(`../${VENDOR_DIR}/${record.entries.main}`);
  for (const name of ["accentRuns", "accentThemeFor", "ACCENT_SCOPES", "ACCENT_THEMES"]) {
    assert.ok(api[name], `the main entry does not export ${name}`);
  }
});

test("and the composition entry is the small one, which is what it was asked for", async () => {
  // Measured with `napkin-sketch vendor --list` on 2026.10.20: six files and
  // 49.5 KB gzipped for `graphic-design` against eleven and 269.1 KB for
  // `main`. The figure is not asserted - it is a build detail - but the shape
  // is: the composition entry has to export less than the whole API, or the
  // subpath bought nothing.
  const design = await import(`../${VENDOR_DIR}/${record.entries["graphic-design"]}`);
  const api = await import(`../${VENDOR_DIR}/${record.entries.main}`);
  assert.ok(
    Object.keys(design).length * 4 < Object.keys(api).length,
    "the graphic-design entry exports nearly as much as the whole API, so it is no longer the narrow one"
  );
});

test("the three names this repository replaced are in the composition entry now", async () => {
  // `1.0.0` exported none of them from any entry it shipped, which is why
  // `api/cheatsheet/contrast.mjs` carries its own colour reader and two tests
  // wrote out an escape and a PNG sniff. `1.1.0`'s composition entry exports
  // all three. The replacements stay: the paint refusal is behaviour this
  // repository decided on and a re-export would not carry it. This case is
  // here so the next reader knows the choice is a choice.
  const design = await import(`../${VENDOR_DIR}/${record.entries["graphic-design"]}`);
  const api = await import(`../${VENDOR_DIR}/${record.entries.main}`);
  for (const name of ["parseColor", "escapeXml", "isPng"]) {
    assert.equal(typeof design[name], "function", `the composition entry no longer exports ${name}`);
    assert.equal(api[name], undefined, `the main entry now exports ${name} as well`);
  }
});

test("the Pages gate checks the copy, offline, beside the manifest", async () => {
  const workflow = await readFile(join(root, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(workflow, /run: node api\/napkin-sketch\/VENDOR-CHECK\.mjs/);
  // The package declares Node 22.12 or later and the manifest job composes
  // every sheet through it, so the runner's own Node is no longer whatever it
  // happens to be.
  assert.match(workflow, /uses: actions\/setup-node@v4/);
  assert.match(workflow, /node-version: 22/);
  assert.doesNotMatch(workflow, /npm (ci|install)/, "the gate grew an install step");
});

test("nothing in the tree still names the mechanism that was retired with 1.0.0", async () => {
  // `PIN.json` and `vendor-napkin-sketch` were this repository's own answer to
  // a package that shipped no vendor command. Both are gone, and a reference
  // left behind points a reader at a file and a workflow that no longer exist.
  // Five paths are the record of the work rather than instructions to follow,
  // and they keep the old names on purpose: the prompt files the plans were
  // written in, the changelog entry that moved the pin, the queue and its
  // archive, where the item that did this names what it removed - and this
  // file, which cannot name what it forbids without matching itself. Without
  // that last exclusion the case fails the moment it is written, reporting its
  // own source as the thing left behind.
  const { stdout } = await run(
    "git",
    [
      "grep",
      "-l",
      "-E",
      "PIN\\.json|vendor-napkin-sketch",
      "--",
      ".",
      ":!.claude/prompts",
      ":!CHANGELOG.md",
      ":!TODO.md",
      ":!TODO-archive.md",
      ":!tools/test-vendored-surface.mjs",
    ],
    { cwd: root }
  ).catch((error) => {
    // `git grep` exits 1 when nothing matches, which is the passing case.
    if (error.code === 1) return { stdout: "" };
    throw error;
  });
  assert.equal(stdout.trim(), "", `these still name the retired vendoring mechanism:\n${stdout}`);
});
