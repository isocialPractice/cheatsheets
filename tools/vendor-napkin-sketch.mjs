// Vendors the published napkin-sketch build into `api/napkin-sketch/`, pinned
// by version and integrity.
//
//     node tools/vendor-napkin-sketch.mjs --pin 1.0.0
//     node tools/vendor-napkin-sketch.mjs --check [--json]
//
// ## Why a vendored copy and not a dependency
//
// This repository has no `package.json` and nothing installed. `php -S
// localhost:8000` is the whole local workflow, `node --test` runs on a bare
// clone, and the page imports its drawing surface by relative path with no
// build step. Those are the constraints that forced a copy in the first place
// and they have not moved; what has moved is that the surface is now
// published, so the copy can be a *pinned* copy of a release rather than a
// translation somebody maintains.
//
// Three alternatives were measured against those constraints and refused:
//
// | Route | Why not |
// | --- | --- |
// | `package.json` plus `npm ci` | Makes Node mandatory to open the page, and adds an install step to the deploy |
// | A CDN `import` | Reintroduces exactly the network dependency the page shed on 2026.09.05 |
// | One chunk behind a hand written entry | A fork: the chunk's exports are mangled names that change on every build |
//
// ## What is copied, and what decides it
//
// Two entries, and whatever they reach:
//
// | Entry | What it is |
// | --- | --- |
// | `api/index.js` | The root entry, which the page loads |
// | `graphic-design/files.js` | The Node only writer, which the page never loads |
//
// **The chunks are read from the entries' own import specifiers**, not from a
// list. Their names are build hashes - `chunk-UCMI7NKK.js` at `1.0.0` - so a
// list would be a list of names that change on the next release, and moving the
// pin would silently vendor the wrong set. Walking the specifiers transitively
// gives five chunks at `1.0.0`, four reached from the root entry and one more
// from the files entry.
//
// Beside them go the three `package.json` scope markers, the `LICENSE` and the
// `THIRD-PARTY-NOTICES.md`. The markers are not optional: each is
// `{"type":"module"}`, and with no `package.json` anywhere above them a `.js`
// file is CommonJS and both entries fail to load at all. They sit **inside**
// `api/napkin-sketch/` and never at `api/package.json`, because a marker
// belongs with the copy it scopes: one at `api/` would reach every sibling
// under it - `api/cheatsheet/` today and whatever is added beside it - and
// declare the module type of this repository's own source as a side effect of
// vendoring somebody else's.
//
// **The `dist/` prefix is dropped** on the way in, so `../chunks/chunk-X.js`
// resolves exactly as it did inside the package and not one line of vendored
// code is edited. Nothing under `api/napkin-sketch/` is ever edited: a fix
// arrives by moving the pin.
//
// ## What `--pin` verifies before it reads a byte
//
// The registry document carries `dist.integrity`, which is the tarball's SHA-512
// in Subresource Integrity form. That is checked against the bytes actually
// received **before** they are gunzipped, so a tarball that is not the one the
// registry describes is never parsed. The digest, the URL and a SHA-256 per
// vendored file go into `PIN.json`, and `--check` reads that record with no
// network at all.
//
// Run with: node --test tools/test-vendor-napkin-sketch.mjs

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The package this vendors, as the registry names it. */
export const PACKAGE = "@isocialpractice/napkin-sketch";

/** Where the vendored copy lives, relative to the repository root. */
export const VENDOR_DIR = "api/napkin-sketch";

/** The record of what was vendored, inside that folder. */
export const PIN_NAME = "PIN.json";

/**
 * The two entries, as paths inside the vendored folder.
 *
 * The first is browser safe and is what the page loads. The second needs
 * `node:fs`, which is why the package keeps it behind a subpath of its own
 * rather than in the root entry: a browser handed `node:fs` fails at load
 * rather than at the call, so the page never reaches it.
 */
export const ENTRIES = {
  api: "api/index.js",
  files: "graphic-design/files.js",
};

/** Files copied for their own sake rather than because something imports them. */
export const EXTRAS = ["LICENSE", "THIRD-PARTY-NOTICES.md"];

/** The scope markers, which are what make the `.js` files load as modules. */
export const MARKERS = ["api/package.json", "chunks/package.json", "graphic-design/package.json"];

/**
 * A relative import or export specifier in an ES module.
 *
 * **The lookbehind is the whole of why this is not a loose match.** The bundled
 * chunks carry a syntax highlighting keyword table, and `from` is a JavaScript
 * keyword, so `{...,"from",type:"keyword",...}` appears in the bytes. A pattern
 * that merely looked for `from` followed by a string read `,type:` as a module
 * specifier. Requiring the token not to be preceded by a quote rejects that,
 * and following only specifiers that begin with a dot rejects whatever is left.
 */
const SPECIFIER = /(?<!["'`])\b(?:from|import)\s*(["'])(\.[^"'`]*)\1/g;

/**
 * A file read out of a tarball.
 *
 * @typedef {{ name: string, body: Buffer }} TarEntry
 */

/**
 * Reads a ustar archive into its files.
 *
 * Minimal on purpose: npm tarballs are ustar with no extensions this needs, so
 * a reader is a header walk and a size, and the alternative is a dependency in
 * a repository that has none. Directories and anything that is not a plain file
 * are skipped; a `prefix` field is honoured because a long path uses it.
 *
 * @param {Buffer} tar
 * @returns {Map<string, Buffer>}
 */
export function readTar(tar) {
  /** @type {Map<string, Buffer>} */
  const files = new Map();
  let at = 0;
  while (at + 512 <= tar.length) {
    const header = tar.subarray(at, at + 512);
    // Two zero blocks end the archive; one is enough to stop on.
    if (header.every((byte) => byte === 0)) break;
    const field = (from, to) => header.subarray(from, to).toString("utf8").replace(/\0.*$/s, "");
    const name = field(0, 100);
    const size = parseInt(field(124, 136).trim() || "0", 8);
    const type = String.fromCharCode(header[156]);
    const prefix = field(345, 500);
    const path = prefix ? `${prefix}/${name}` : name;
    // "0" and NUL are both a plain file; everything else is a directory, a
    // link, or metadata this does not need.
    if (type === "0" || header[156] === 0) {
      files.set(path, Buffer.from(tar.subarray(at + 512, at + 512 + size)));
    }
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

/**
 * Every relative specifier a module imports or re-exports.
 *
 * @param {string} source
 * @returns {string[]}
 */
export function specifiersIn(source) {
  return [...source.matchAll(SPECIFIER)].map((match) => match[2]);
}

/**
 * Resolves a relative specifier against the folder holding the module.
 *
 * @param {string} from A posix path inside the archive.
 * @param {string} specifier
 * @returns {string}
 */
export function resolveFrom(from, specifier) {
  return posix.normalize(posix.join(posix.dirname(from), specifier));
}

/**
 * Walks one entry and returns every archive path it reaches, itself included.
 *
 * @param {Map<string, Buffer>} files Archive contents, keyed by `package/...`.
 * @param {string} entry A path under `dist/`.
 * @returns {string[]}
 * @throws if a relative specifier names a file the archive does not carry.
 */
export function reachableFromEntry(files, entry) {
  /** @type {Set<string>} */
  const seen = new Set();
  const walk = (path) => {
    if (seen.has(path)) return;
    const body = files.get(path);
    if (!body) throw new Error(`vendor: ${path} is imported but is not in the tarball`);
    seen.add(path);
    for (const specifier of specifiersIn(body.toString("utf8"))) {
      walk(resolveFrom(path, specifier));
    }
  };
  walk(`package/dist/${entry}`);
  return [...seen].sort();
}

/**
 * Every archive path the copy needs, from both entries.
 *
 * @param {Map<string, Buffer>} files
 * @returns {{ paths: string[], chunks: string[] }}
 */
export function reachableFrom(files) {
  const paths = [
    ...new Set(Object.values(ENTRIES).flatMap((entry) => reachableFromEntry(files, entry))),
  ].sort();
  return { paths, chunks: paths.filter((path) => path.includes("/chunks/")) };
}

/**
 * Where an archive path lands inside the vendored folder.
 *
 * **The containment check is the one thing this does besides strip a prefix,
 * and it is not hypothetical.** An archive names its own entries and a module
 * names its own imports, so both sources of a path are the tarball's to choose:
 * a chunk importing `"../../../../../x.js"` normalizes to a path above
 * `package/`, and an archive carrying an entry at that name hands the walk a
 * file to copy there. The `..` segments survive both prefix strips and
 * `join(dir, "..", "..", ...)` writes outside the folder - the ordinary tar
 * extraction fault, in a reader minimal enough that nothing else would catch
 * it. The integrity digest does not: it proves the bytes are the ones the
 * registry published, which says nothing about where their paths point.
 *
 * An absolute name needs no guard, because the caller splits on `/` and rejoins
 * against the folder, so `/etc/passwd` lands at `<dir>/etc/passwd`. It is the
 * `..` segment alone that escapes.
 *
 * @param {string} path
 * @returns {string}
 * @throws if the path would land outside the vendored folder.
 */
export function vendoredName(path) {
  const inside = path.replace(/^package\//, "");
  const name = inside.replace(/^dist\//, "");
  if (name.split(/[\\/]/).includes("..")) {
    throw new Error(`vendor: ${path} would be written outside ${VENDOR_DIR}`);
  }
  return name;
}

/** SHA-256, hex, of a buffer. */
const sha256 = (body) => createHash("sha256").update(body).digest("hex");

/**
 * Every file currently in the vendored folder, as posix paths.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listVendored(dir) {
  /** @type {string[]} */
  const found = [];
  const walk = async (at) => {
    let entries;
    try {
      entries = await readdir(at, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(at, entry.name);
      if (entry.isDirectory()) await walk(path);
      else found.push(relative(dir, path).split(sep).join(posix.sep));
    }
  };
  await walk(dir);
  return found.sort();
}

/**
 * Fetches a version's tarball and verifies it against the registry's digest.
 *
 * @param {string} version
 * @param {typeof globalThis.fetch} [fetchImpl]
 * @returns {Promise<{ tarball: string, integrity: string, bytes: Buffer }>}
 */
export async function fetchTarball(version, fetchImpl = globalThis.fetch) {
  const url = `https://registry.npmjs.org/${PACKAGE.replace("/", "%2F")}`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`vendor: the registry answered ${response.status} for ${PACKAGE}`);
  const document = await response.json();
  const release = document.versions?.[version];
  if (!release) {
    const known = Object.keys(document.versions ?? {}).join(", ");
    throw new Error(`vendor: ${PACKAGE} has no version ${version}. It publishes ${known || "nothing"}.`);
  }
  const { tarball, integrity } = release.dist;
  const tar = await fetchImpl(tarball);
  if (!tar.ok) throw new Error(`vendor: the tarball answered ${tar.status}`);
  const bytes = Buffer.from(await tar.arrayBuffer());

  // Before a byte is gunzipped, let alone parsed.
  const [algorithm, expected] = integrity.split("-");
  const actual = createHash(algorithm).update(bytes).digest("base64");
  if (actual !== expected) {
    throw new Error(
      `vendor: the tarball does not match the integrity the registry published.\n` +
        `  expected ${integrity}\n  received ${algorithm}-${actual}`
    );
  }
  return { tarball, integrity, bytes };
}

/**
 * The record `--check` reads back.
 *
 * @typedef {object} Pin
 * @property {string} name
 * @property {string} version
 * @property {string} tarball
 * @property {string} integrity
 * @property {Record<string, string>} entries
 * @property {Record<string, string>} files SHA-256 per vendored file, keyed by its path in the folder.
 */

/**
 * Vendors one version into the folder, replacing whatever was there.
 *
 * @param {string} version
 * @param {object} [options]
 * @param {string} [options.dir] Absolute path of the vendored folder.
 * @param {typeof globalThis.fetch} [options.fetch]
 * @returns {Promise<{ pin: Pin, removed: string[], weight: { files: number, bytes: number, gzipped: number } }>}
 */
export async function pin(version, options = {}) {
  const dir = options.dir ?? join(root, ...VENDOR_DIR.split("/"));
  const { tarball, integrity, bytes } = await fetchTarball(version, options.fetch);
  const files = readTar(gunzipSync(bytes));

  const { paths } = reachableFrom(files);
  const wanted = [
    ...paths,
    ...MARKERS.map((marker) => `package/dist/${marker}`),
    ...EXTRAS.map((extra) => `package/${extra}`),
  ];

  /** @type {Pin} */
  const record = {
    name: PACKAGE,
    version,
    tarball,
    integrity,
    entries: { ...ENTRIES },
    files: {},
  };

  const written = new Set();
  for (const path of wanted) {
    const body = files.get(path);
    if (!body) throw new Error(`vendor: ${path} is not in the tarball`);
    const name = vendoredName(path);
    const target = join(dir, ...name.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    record.files[name] = sha256(body);
    written.add(name);
  }

  // The folder holds the pin and nothing else. Anything left from an earlier
  // version - a chunk whose build hash has changed, above all - would otherwise
  // sit there unreferenced and unrecorded.
  const removed = [];
  for (const name of await listVendored(dir)) {
    if (written.has(name) || name === PIN_NAME) continue;
    await rm(join(dir, ...name.split("/")));
    removed.push(name);
  }

  const sorted = Object.fromEntries(Object.entries(record.files).sort(([a], [b]) => a.localeCompare(b)));
  record.files = sorted;
  await writeFile(join(dir, PIN_NAME), `${JSON.stringify(record, null, 2)}\n`);

  // The weight the **page** pays, re-measured on every pin rather than quoted.
  // Not every vendored file: the Node only entry and the chunk only it reaches
  // are never fetched by a browser, so counting them would overstate what a
  // reader downloads. Gzipped at level 6, which is what a server sends at.
  const loaded = reachableFromEntry(files, ENTRIES.api);
  let total = 0;
  let gzipped = 0;
  for (const path of loaded) {
    const body = files.get(path);
    total += body.length;
    gzipped += gzipSync(body, { level: 6 }).length;
  }
  return {
    pin: record,
    removed,
    weight: { files: loaded.length, bytes: total, gzipped, vendored: Object.keys(record.files).length },
  };
}

/**
 * A finding `--check` reports.
 *
 * @typedef {{ rule: 'missing' | 'differs' | 'unrecorded' | 'pin', path: string, message: string }} Finding
 */

/**
 * Hashes the folder against its record, with no network.
 *
 * @param {object} [options]
 * @param {string} [options.dir]
 * @returns {Promise<{ pin: Pin | null, findings: Finding[] }>}
 */
export async function check(options = {}) {
  const dir = options.dir ?? join(root, ...VENDOR_DIR.split("/"));
  /** @type {Finding[]} */
  const findings = [];

  /** @type {Pin | null} */
  let record = null;
  try {
    record = JSON.parse(await readFile(join(dir, PIN_NAME), "utf8"));
  } catch (error) {
    findings.push({
      rule: "pin",
      path: `${VENDOR_DIR}/${PIN_NAME}`,
      message: `no readable pin record: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { pin: null, findings };
  }

  const present = new Set(await listVendored(dir));
  for (const [name, digest] of Object.entries(record.files)) {
    if (!present.has(name)) {
      findings.push({ rule: "missing", path: name, message: "the pin records this file and it is not there" });
      continue;
    }
    const body = await readFile(join(dir, ...name.split("/")));
    if (sha256(body) !== digest) {
      findings.push({
        rule: "differs",
        path: name,
        message: "the file differs from the pin. Nothing here is edited; move the pin instead",
      });
    }
  }
  for (const name of present) {
    if (name === PIN_NAME || record.files[name] !== undefined) continue;
    findings.push({ rule: "unrecorded", path: name, message: "this file is in the folder and not in the pin" });
  }
  return { pin: record, findings };
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const asJson = argv.includes("--json");

  if (argv.includes("--pin")) {
    const version = flag("--pin");
    if (!version) {
      console.error("vendor: --pin needs a version, as in --pin 1.0.0");
      return 2;
    }
    const { pin: record, removed, weight } = await pin(version);
    if (asJson) {
      console.log(JSON.stringify({ pin: record, removed, weight }, null, 2));
      return 0;
    }
    console.error(`pinned            ${record.name}@${record.version}`);
    console.error(`integrity         ${record.integrity}`);
    console.error(`vendored          ${weight.vendored} files`);
    console.error(`page weight       ${weight.files} files, ${weight.bytes} bytes, ${weight.gzipped} gzipped`);
    for (const name of removed) console.error(`removed           ${name}`);
    return 0;
  }

  const { pin: record, findings } = await check();
  if (asJson) {
    console.log(JSON.stringify({ pin: record, findings }, null, 2));
  } else if (findings.length === 0) {
    console.error(`checked           ${record.name}@${record.version}, ${Object.keys(record.files).length} files`);
    console.error("result            ok");
  } else {
    for (const finding of findings) console.error(`${finding.rule.padEnd(17)} ${finding.path}: ${finding.message}`);
    console.error(`result            ${findings.length} problem${findings.length === 1 ? "" : "s"}`);
  }
  return findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
