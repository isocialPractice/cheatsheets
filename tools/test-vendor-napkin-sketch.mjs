// What `tools/vendor-napkin-sketch.mjs` promises about the copy in
// `api/napkin-sketch/`.
//
// Three separable things, and they fail for different reasons:
//
//   1. **The reader is a reader.** The tar walk, the specifier scan and the
//      path arithmetic are checked against archives built here, so a fault in
//      them is a failing case rather than a wrong set of files vendored
//      silently on the next release.
//   2. **The committed copy is the pin.** Every file is hashed against
//      `PIN.json`, which is what the Pages gate runs. Nothing under that folder
//      is ever edited - a fix arrives by moving the pin - so a file that
//      differs is a fault whatever made it.
//   3. **It loads with nothing installed.** Both entries are imported from the
//      folder by relative path. That is the whole claim the vendoring exists to
//      support: no package.json at the root, no node_modules, and the page
//      reaching the same tree a browser would.
//
// Nothing here touches the network. `--pin` is the one path that does, and it
// is driven against a tarball built in memory instead.
//
// Run with: node --test tools/test-vendor-napkin-sketch.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import {
  check,
  pin,
  readTar,
  reachableFrom,
  resolveFrom,
  specifiersIn,
  vendoredName,
  ENTRIES,
  MARKERS,
  PACKAGE,
  PIN_NAME,
  VENDOR_DIR,
} from "./vendor-napkin-sketch.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vendored = join(root, ...VENDOR_DIR.split("/"));

/* --- 1. The reader ---------------------------------------------------------- */

/**
 * Builds a ustar archive, so the reader is driven against bytes rather than
 * against a mock of itself.
 *
 * @param {Record<string, string>} files
 * @returns {Buffer}
 */
function buildTar(files) {
  const blocks = [];
  for (const [name, text] of Object.entries(files)) {
    const body = Buffer.from(text, "utf8");
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "utf8");
    header.write("000644 \0", 100, 8, "utf8");
    header.write(`${body.length.toString(8).padStart(11, "0")} `, 124, 12, "utf8");
    header.write("        ", 148, 8, "utf8"); // checksum field, blank while summing
    header.write("0", 156, 1, "utf8");
    header.write("ustar\0", 257, 6, "utf8");
    header.write("00", 263, 2, "utf8");
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, 8, "utf8");
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

test("the tar reader reads names, sizes and bodies back out", () => {
  const files = readTar(buildTar({ "package/a.js": "one", "package/deep/b.js": "two\n" }));
  assert.deepEqual([...files.keys()], ["package/a.js", "package/deep/b.js"]);
  assert.equal(files.get("package/a.js").toString("utf8"), "one");
  assert.equal(files.get("package/deep/b.js").toString("utf8"), "two\n");
});

test("the specifier scan reads module syntax and not the word in a string", () => {
  // The fault this is for, in the bytes it was found in: the bundled chunks
  // carry a syntax highlighting keyword table, so `"from"` is a string in the
  // file and a loose pattern read the token after it as a module specifier.
  assert.deepEqual(
    specifiersIn('import{a}from"../chunks/x.js";import"./side.js";export{b}from"./re.js";'),
    ["../chunks/x.js", "./side.js", "./re.js"]
  );
  assert.deepEqual(specifiersIn('var kw={keyword:"from",type:"#953800"};'), []);
  assert.deepEqual(specifiersIn('import{a}from"node:fs";'), [], "a bare specifier is not a file to copy");
});

test("a specifier resolves against the folder holding the module, not the root", () => {
  assert.equal(resolveFrom("package/dist/api/index.js", "../chunks/x.js"), "package/dist/chunks/x.js");
  assert.equal(resolveFrom("package/dist/api/index.js", "./side.js"), "package/dist/api/side.js");
});

test("the dist prefix is dropped so the vendored imports resolve unchanged", () => {
  // This is what lets not one line of vendored code be edited: `../chunks/x.js`
  // means the same thing inside the package and inside `api/napkin-sketch/`.
  assert.equal(vendoredName("package/dist/api/index.js"), "api/index.js");
  assert.equal(vendoredName("package/dist/chunks/chunk-X.js"), "chunks/chunk-X.js");
  assert.equal(vendoredName("package/LICENSE"), "LICENSE");
});

test("a path that climbs out of the folder is refused rather than written", () => {
  // The ordinary tar extraction fault, and both halves of a path are the
  // tarball's to choose: it names its own entries, and the modules in it name
  // their own imports. The walk follows a relative specifier through
  // `posix.normalize`, so `../../../../../x.js` resolves above `package/`, and
  // an archive carrying an entry at that name hands the copy a file to write
  // there. The integrity digest proves the bytes are the ones the registry
  // published and says nothing about where their paths point.
  assert.throws(() => vendoredName("../x.js"), /would be written outside/);
  assert.throws(() => vendoredName("package/dist/../../../x.js"), /would be written outside/);
  assert.throws(() => vendoredName("package/dist/api/../../../../x.js"), /would be written outside/);
  // An absolute name is not the fault: the writer splits on `/` and rejoins
  // against the folder, so it lands inside it.
  assert.equal(vendoredName("package/dist/etc/passwd"), "etc/passwd");
});

test("the walk follows the entries transitively and stops at what they reach", () => {
  const files = readTar(
    buildTar({
      "package/dist/api/index.js": 'import{a}from"../chunks/one.js";',
      "package/dist/chunks/one.js": 'import{b}from"./two.js";',
      "package/dist/chunks/two.js": "export const b=1;",
      "package/dist/graphic-design/files.js": 'import{c}from"../chunks/three.js";',
      "package/dist/chunks/three.js": "export const c=1;",
      // Reached by nothing, so vendored by nothing.
      "package/dist/chunks/orphan.js": "export const d=1;",
    })
  );
  const { paths, chunks } = reachableFrom(files);
  assert.deepEqual(paths, [
    "package/dist/api/index.js",
    "package/dist/chunks/one.js",
    "package/dist/chunks/three.js",
    "package/dist/chunks/two.js",
    "package/dist/graphic-design/files.js",
  ]);
  assert.equal(chunks.length, 3);
});

test("a specifier naming a file the tarball does not carry stops the pin", () => {
  const files = readTar(
    buildTar({
      "package/dist/api/index.js": 'import{a}from"../chunks/gone.js";',
      "package/dist/graphic-design/files.js": "export const c=1;",
    })
  );
  assert.throws(() => reachableFrom(files), /chunks\/gone\.js is imported but is not in the tarball/);
});

/* --- 2. A pin end to end, with the registry stood in for -------------------- */

/**
 * A registry and a tarball, served from memory.
 *
 * @param {Record<string, string>} files
 */
function standInRegistry(files) {
  const bytes = gzipSync(buildTar(files));
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  const tarball = "https://registry.example.com/napkin-sketch-9.9.9.tgz";
  const document = {
    versions: { "9.9.9": { dist: { tarball, integrity } } },
  };
  return {
    bytes,
    integrity,
    /** @type {typeof globalThis.fetch} */
    fetch: async (url) =>
      url === tarball
        ? { ok: true, arrayBuffer: async () => bytes }
        : { ok: true, json: async () => document },
  };
}

/** The shape of a real package, small enough to assert about in full. */
const PACKAGE_FILES = {
  "package/dist/api/index.js": 'import{a}from"../chunks/one.js";export{a};',
  "package/dist/chunks/one.js": "export const a=1;",
  "package/dist/graphic-design/files.js": 'import{a}from"../chunks/one.js";export{a as writeComposition};',
  "package/dist/api/package.json": '{\n  "type": "module"\n}\n',
  "package/dist/chunks/package.json": '{\n  "type": "module"\n}\n',
  "package/dist/graphic-design/package.json": '{\n  "type": "module"\n}\n',
  "package/LICENSE": "MIT\n",
  "package/THIRD-PARTY-NOTICES.md": "# Notices\n",
};

test("a pin writes the two entries, their chunks, the markers and the notices", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-"));
  try {
    const registry = standInRegistry(PACKAGE_FILES);
    const { pin: record } = await pin("9.9.9", { dir, fetch: registry.fetch });

    assert.deepEqual(Object.keys(record.files).sort(), [
      "LICENSE",
      "THIRD-PARTY-NOTICES.md",
      "api/index.js",
      "api/package.json",
      "chunks/one.js",
      "chunks/package.json",
      "graphic-design/files.js",
      "graphic-design/package.json",
    ]);
    assert.equal(record.name, PACKAGE);
    assert.equal(record.version, "9.9.9");
    assert.equal(record.integrity, registry.integrity);
    assert.deepEqual(record.entries, ENTRIES);

    // The bytes landed, with the dist prefix dropped.
    assert.equal(
      await readFile(join(dir, "api", "index.js"), "utf8"),
      PACKAGE_FILES["package/dist/api/index.js"]
    );
    const { findings } = await check({ dir });
    assert.deepEqual(findings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a tarball that is not the one the registry described is never parsed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-"));
  try {
    const registry = standInRegistry(PACKAGE_FILES);
    const tampered = {
      ...registry,
      fetch: async (url) =>
        url.startsWith("https://registry.npmjs.org/")
          ? { ok: true, json: async () => ({ versions: { "9.9.9": { dist: { tarball: "x", integrity: registry.integrity } } } }) }
          : { ok: true, arrayBuffer: async () => gzipSync(buildTar({ ...PACKAGE_FILES, "package/LICENSE": "not MIT\n" })) },
    };
    await assert.rejects(
      () => pin("9.9.9", { dir, fetch: tampered.fetch }),
      /does not match the integrity the registry published/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("and one whose paths climb out of the folder is never written at all", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-"));
  try {
    // The escaping entry is reached the way a real one would be - imported by
    // the root entry - rather than listed, because the walk is what resolves it
    // above `package/` in the first place.
    const registry = standInRegistry({
      ...PACKAGE_FILES,
      "package/dist/api/index.js": 'import{a}from"../../../../escaped.js";export{a};',
      "../escaped.js": "export const a=1;",
    });
    await assert.rejects(
      () => pin("9.9.9", { dir, fetch: registry.fetch }),
      /would be written outside/
    );
    // Refused before the first write, so a pin that stops here leaves nothing
    // half applied either inside the folder or above it.
    const { findings } = await check({ dir });
    assert.deepEqual(findings.map((finding) => finding.rule), ["pin"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a version the registry does not publish is named rather than guessed at", async () => {
  const registry = standInRegistry(PACKAGE_FILES);
  await assert.rejects(() => pin("0.0.1", { dir: tmpdir(), fetch: registry.fetch }), /has no version 0\.0\.1/);
});

test("a pin deletes whatever the last one left, because a chunk name is a build hash", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-"));
  try {
    const registry = standInRegistry(PACKAGE_FILES);
    await pin("9.9.9", { dir, fetch: registry.fetch });
    // What a previous release's chunk looks like after its name changed.
    await writeFile(join(dir, "chunks", "chunk-OLDHASH.js"), "export const stale=1;");
    const { removed } = await pin("9.9.9", { dir, fetch: registry.fetch });
    assert.deepEqual(removed, ["chunks/chunk-OLDHASH.js"]);
    const { findings } = await check({ dir });
    assert.deepEqual(findings, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("--check reports a file that differs, one that is gone, and one nobody recorded", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-"));
  try {
    const registry = standInRegistry(PACKAGE_FILES);
    await pin("9.9.9", { dir, fetch: registry.fetch });

    await writeFile(join(dir, "chunks", "one.js"), "export const a=2;");
    await rm(join(dir, "LICENSE"));
    await writeFile(join(dir, "stray.js"), "");

    const { findings } = await check({ dir });
    assert.deepEqual(
      findings.map((finding) => [finding.rule, finding.path]).sort(),
      [
        ["differs", "chunks/one.js"],
        ["missing", "LICENSE"],
        ["unrecorded", "stray.js"],
      ].sort()
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a folder with no pin record is a finding rather than a pass", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-"));
  try {
    const { pin: record, findings } = await check({ dir });
    assert.equal(record, null);
    assert.deepEqual(findings.map((finding) => finding.rule), ["pin"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/* --- 3. The copy this repository committed ---------------------------------- */

test("the committed copy matches its own pin", async () => {
  const { pin: record, findings } = await check();
  assert.ok(record, `${VENDOR_DIR}/${PIN_NAME} is not readable`);
  assert.deepEqual(findings, [], "the vendored folder no longer matches its pin");
  assert.equal(record.name, PACKAGE);
});

test("the scope markers are inside the vendored folder and nowhere above it", async () => {
  // `api/package.json` would put the port beside this copy into module scope
  // too, which `tools/test-graphic-design-port.mjs` refuses while the port is
  // there. Each marker is what makes a `.js` file next to it load as a module
  // in a repository that has no package.json at all.
  const { pin: record } = await check();
  for (const marker of MARKERS) {
    assert.ok(record.files[marker], `${marker} is not in the pin`);
    assert.equal(JSON.parse(await readFile(join(vendored, ...marker.split("/")), "utf8")).type, "module");
  }
  await assert.rejects(() => readFile(join(root, "api", "package.json")), /ENOENT/);
  await assert.rejects(() => readFile(join(root, "package.json")), /ENOENT/);
});

test("both entries load from the folder with nothing installed", async () => {
  // The claim the whole route rests on. A failure here is the one that matters
  // most, because the page imports this same tree by relative path.
  const api = await import(`../${VENDOR_DIR}/${ENTRIES.api}`);
  assert.equal(typeof api.createComposition, "function");
  assert.equal(typeof api.rasterizeComposition, "function");
  assert.equal(typeof api.layoutText, "function");
  assert.equal(typeof api.placeBrand, "function");

  const files = await import(`../${VENDOR_DIR}/${ENTRIES.files}`);
  assert.equal(typeof files.writeComposition, "function");
});

test("three names the root entry does not export are the ones replaced rather than reached for", async () => {
  // Measured rather than assumed, because the replacements are code this
  // repository now carries: the colour reader in `api/cheatsheet/contrast.mjs`,
  // and an escape and a PNG sniff written out in the tests that used them. If a
  // release starts exporting them this case is what says so.
  const api = await import(`../${VENDOR_DIR}/${ENTRIES.api}`);
  for (const name of ["parseColor", "escapeXml", "isPng"]) {
    assert.equal(api[name], undefined, `the root entry now exports ${name}`);
  }
});

test("the Pages gate checks the pin, offline, beside the manifest", async () => {
  const workflow = await readFile(join(root, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(workflow, /run: node tools\/vendor-napkin-sketch\.mjs --check/);
  // The package declares Node 22.12 or later and the manifest job composes
  // every sheet through it, so the runner's own Node is no longer whatever it
  // happens to be.
  assert.match(workflow, /uses: actions\/setup-node@v4/);
  assert.match(workflow, /node-version: 22/);
  assert.doesNotMatch(workflow, /npm (ci|install)/, "the gate grew an install step");
});
