// Walks the cheatsheet tree and emits `cheatsheets.json`, the catalog the page
// builds its two dropdowns from.
//
//     node tools/build-manifest.mjs
//     node tools/build-manifest.mjs --print
//     node tools/build-manifest.mjs --check [--json]
//     node tools/build-manifest.mjs --root <dir> --out <file>
//
// ## What a cheatsheet is
//
// A folder holding `sheet.json`. Nothing else marks one, and nothing else has
// to: the document is the deliverable, per the conventions under **New
// Cheatsheets** in `TODO.md`, so a folder that carries one is a cheatsheet and
// a folder that does not is a category, a group, or not part of the catalog at
// all. `meta.json` at each level supplies the human readable title and the
// order, which is why `html-css` can be titled `HTML/CSS` without a path ever
// being reverse engineered into display text.
//
// ## Why the composed box is recorded
//
// The page reserves the sheet's box before it composes into it. That is the
// job the image element's `width` and `height` used to do when a sheet was a
// file the page fetched, and dropping it is what would reintroduce layout
// shift on a page whose graphic now arrives from a script rather than from the
// network.
//
// So every document here is actually composed, through `api/cheatsheet/`, and
// the composition's own width and height are recorded. A document that cannot
// be composed stops the build rather than being written without its box: a
// manifest that silently omitted one entry's dimensions would ship exactly the
// shift the dimensions exist to prevent, and it would do it quietly.
//
// ## Why the manifest is committed, and carries no timestamp
//
// It is committed so that `php -S localhost:8000` remains the whole local
// workflow. Building it at deploy time would make Node mandatory for anyone
// opening the page, which is the same constraint the port was written under.
//
// It carries no generation timestamp for a narrower reason: `--check` compares
// the committed file against freshly generated output byte for byte, and a
// timestamp would make that comparison fail on every run, on a tree nobody had
// touched. Everything in the file is derived from the tree, so the same tree
// produces the same bytes.
//
// ## `sheet.*` is reserved
//
// `sheet.json` is the document. Every other `sheet.<ext>` in a cheatsheet
// folder is a **render**: output something outside the page asked for, written
// there by the export command line rather than committed. That one convention
// settles how the unreferenced file rule treats an untracked render, and it
// settles it without asking git what is tracked: renders are named, not
// detected, so `--check` lets `sheet.webp` through and still fails a stray
// file that happens to be a JPEG. A payload is never named `sheet.*`, so
// nothing is ambiguous.
//
// ## The two modes
//
// **Build** is the default. It walks, composes, and writes. It fails only on
// what stops a manifest being produced at all: an unparsable `sheet.json`, a
// missing title, a document the API refuses. Everything else it reports and
// carries on, because a warning should not stop the catalog regenerating.
//
// **`--check`** is the gate. It runs the build, then applies the tree rules
// listed under {@link checkCatalog}, then compares the committed manifest
// against what it just generated. It writes nothing and exits non-zero on a
// tree that would publish broken.
//
// The casing rule is the one that matters most, and it is invisible locally:
// Pages serves from a case sensitive filesystem while the work happens on
// Windows, so `Splicing-Arrays/` resolves here and 404s in production. Every
// path recorded in the manifest is taken from `readdir` rather than composed
// from what a file said it was called, and a payload a `sheet.json` names by
// hand is compared against the directory listing byte for byte.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { composeSheet } from "../api/cheatsheet/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The committed catalog, at the repository root. */
export const MANIFEST_NAME = "cheatsheets.json";

/** The document that marks a folder as a cheatsheet. */
export const SHEET_NAME = "sheet.json";

/** The title and order for a level, whether or not it is a cheatsheet. */
export const META_NAME = "meta.json";

/**
 * How deep a cheatsheet folder sits, in path segments below the root.
 *
 * The conventions allow `<category>/<cheatsheet>/` and
 * `<category>/<group>/<cheatsheet>/`, so two and three. The queued item names
 * only the upper bound because the lower one falls out of the convention: a
 * `sheet.json` at the repository root or directly inside a category has no
 * category to be listed under, so the manifest would have nowhere to put it.
 */
export const MIN_DEPTH = 2;
export const MAX_DEPTH = 3;

/** Lower case kebab ASCII, which every catalog path segment has to be. */
export const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** What the page does with a cheatsheet's payload. */
export const KINDS = ["run", "read", "embed", "none"];

/** A render written beside the document, rather than a file to account for. */
export const RENDER = /^sheet\.(?:webp|png|jpe?g|svg)$/;

/** The folder an `embed` payload lives in, and the file the frame loads. */
export const DEMO_DIR = "demo";
export const DEMO_ENTRY = "index.html";

/** Payload extensions the page can inject as a browser script. */
export const RUNNABLE = new Set([".js", ".mjs"]);

/**
 * Payload extensions the page can render as source text.
 *
 * `.json` is deliberately absent. A cheatsheet folder holds two JSON files
 * that are structure rather than payload, so admitting the extension would
 * make `meta.json` read as the example on every sheet that carries one.
 */
export const READABLE = new Set([
  ".js", ".mjs", ".ts", ".css", ".html", ".htm", ".xml", ".svg", ".md",
  ".py", ".php", ".sh", ".bat", ".c", ".cpp", ".cs", ".java", ".rb", ".go",
  ".rs", ".sql", ".yml", ".yaml", ".toml", ".ini", ".txt",
]);

/**
 * Top level folders that hold no catalog and are not walked.
 *
 * Applied at the root only, and named rather than inferred. `api/`, `tools/`
 * and `examples/` are source; `test-results/` and `mcp-todo/` are ignored
 * working folders. Dot directories and `node_modules` are skipped at every
 * level instead, so `.git`, `.github`, `.claude` and `.tmp` never need naming.
 *
 * `javaScriptArrays/` is **not** on this list and does not need to be. It
 * holds no `sheet.json`, so the walk finds nothing in it and no rule is ever
 * applied to its name, which is the only reason a folder predating the kebab
 * convention does not fail the casing check.
 */
export const NOT_CATALOG = new Set(["api", "tools", "examples", "test-results", "mcp-todo"]);

/**
 * A problem found while walking, composing or checking.
 *
 * @typedef {object} Finding
 * @property {'error' | 'warning'} level `error` fails the run; `warning` is reported and carried.
 * @property {string} rule The rule that produced it, for a reader scanning a wall of output.
 * @property {string} path Repository relative POSIX path the finding is about.
 * @property {string} message
 */

/**
 * One entry in the catalog, before it is shaped into the manifest.
 *
 * @typedef {object} Sheet
 * @property {string} id Slug the page keys its option by. The path, unless `sheet.json` names one.
 * @property {string} path Folder holding the document, repository relative POSIX.
 * @property {string} title
 * @property {string} category
 * @property {string} [group]
 * @property {'run' | 'read' | 'embed' | 'none'} kind
 * @property {string | null} payload Repository relative POSIX path, or `null` for `none`.
 * @property {number} width Composed width, in sheet pixels.
 * @property {number} height Composed height, in sheet pixels.
 * @property {number | string} [seed] The seed the document composes at, when it names one.
 * @property {number} [order]
 */

/**
 * A folder found by the walk, with the listing that identified it.
 *
 * @typedef {object} Folder
 * @property {string[]} segments
 * @property {string} dir
 * @property {{ files: string[], dirs: string[] }} entries
 */

/**
 * What a `meta.json` said about the level it sits in.
 *
 * @typedef {object} Level
 * @property {boolean} found
 * @property {string} [error]
 * @property {string} [title]
 * @property {number} [order]
 */

/** Joins path segments the way the manifest records them. */
const slug = (segments) => segments.join(posix.sep);

/** A repository relative POSIX path, for a finding or a manifest entry. */
const rel = (from, to) => relative(from, to).split(sep).join(posix.sep) || ".";

/**
 * Reads and parses a JSON file, distinguishing absent from unparsable.
 *
 * @param {string} file
 * @returns {Promise<{ found: boolean, value?: any, error?: string }>}
 */
async function readJson(file) {
  /** @type {string} */
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return { found: false };
  }
  try {
    return { found: true, value: JSON.parse(text) };
  } catch (error) {
    return { found: true, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The directory entries of `dir`, split into files and directories.
 *
 * Names come back exactly as the filesystem holds them, which is what makes
 * the casing comparison later mean anything.
 *
 * @param {string} dir
 * @returns {Promise<{ files: string[], dirs: string[] }>}
 */
async function listing(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return {
    files: entries.filter((e) => e.isFile()).map((e) => e.name).sort(),
    dirs: entries.filter((e) => e.isDirectory()).map((e) => e.name).sort(),
  };
}

/**
 * Reads a level's `meta.json`, whatever kind of folder it is.
 *
 * @param {string} dir
 * @returns {Promise<Level>}
 */
async function readLevel(dir) {
  const meta = await readJson(join(dir, META_NAME));
  const value = meta.value && typeof meta.value === "object" && !Array.isArray(meta.value) ? meta.value : {};
  return {
    found: meta.found,
    error: meta.error,
    title: typeof value.title === "string" && value.title.length > 0 ? value.title : undefined,
    order: typeof value.order === "number" ? value.order : undefined,
  };
}

/**
 * Detects what the page would do with a folder's contents.
 *
 * Detection is what `--check` measures a declared `kind` against, so it is
 * deliberately literal: it reports what is on disk and never what a document
 * says ought to be.
 *
 * @param {{ files: string[], dirs: string[] }} entries
 * @returns {{ kind: string, payload: string | null, candidates: string[], demo: boolean }}
 */
export function detectPayload(entries) {
  const demo = entries.dirs.includes(DEMO_DIR);
  const candidates = entries.files.filter(
    (name) =>
      name !== SHEET_NAME &&
      name !== META_NAME &&
      !RENDER.test(name) &&
      READABLE.has(extname(name).toLowerCase())
  );
  // The single candidate is reported even when a `demo/` folder is present,
  // because the two are separate facts about the folder. Collapsing them would
  // make a folder holding both report no payload at all, and a document
  // declaring `run` beside a stray `demo/` would then be told it had nothing
  // to inject, which is not what is wrong with it.
  const payload = candidates.length === 1 ? candidates[0] : null;
  const kind = demo
    ? "embed"
    : payload === null
      ? "none"
      : RUNNABLE.has(extname(payload).toLowerCase())
        ? "run"
        : "read";
  return { kind, payload, candidates, demo };
}

/**
 * Walks `from` and returns every folder holding a `sheet.json`, with the
 * `meta.json` of every level on the way down.
 *
 * Descent stops at a cheatsheet folder. A `sheet.json` below one is not a
 * second cheatsheet, it is a file inside a payload, and the unreferenced rule
 * is what has something to say about it.
 *
 * @param {string} from Absolute path of the catalog root.
 * @returns {Promise<{ folders: Folder[], levels: Map<string, Level> }>}
 */
export async function walkCatalog(from) {
  /** @type {Folder[]} */
  const folders = [];
  /** @type {Map<string, Level>} */
  const levels = new Map();

  /**
   * @param {string} dir
   * @param {string[]} segments
   */
  const descend = async (dir, segments) => {
    const entries = await listing(dir);
    if (segments.length > 0) levels.set(slug(segments), await readLevel(dir));
    if (entries.files.includes(SHEET_NAME)) {
      folders.push({ segments, dir, entries });
      return;
    }
    for (const name of entries.dirs) {
      if (name.startsWith(".") || name === "node_modules") continue;
      if (segments.length === 0 && NOT_CATALOG.has(name)) continue;
      if (segments.length >= MAX_DEPTH) continue;
      await descend(join(dir, name), [...segments, name]);
    }
  };

  await descend(from, []);
  folders.sort((a, b) => slug(a.segments).localeCompare(slug(b.segments)));
  return { folders, levels };
}

/**
 * What reading a document turned up, beside the entry it produced.
 *
 * Kept out of the manifest because none of it belongs in a committed file: the
 * page needs the box and the payload, not the seed's fitting report. `--check`
 * reads it back rather than composing every document a second time.
 *
 * @typedef {object} Context
 * @property {Folder} folder
 * @property {Record<string, any>} doc
 * @property {ReturnType<typeof detectPayload>} detected
 * @property {string | null} declared
 * @property {boolean} demoEntry Whether `demo/index.html` is there for a frame to load.
 * @property {{ ok: boolean, message?: string } | null} named What resolving a hand named payload turned up, or `null` when the document names none.
 * @property {any} variation
 */

/**
 * The catalog: every sheet, what was learned reading it, and what went wrong.
 *
 * @typedef {object} Catalog
 * @property {Sheet[]} sheets
 * @property {Finding[]} findings
 * @property {Map<string, Level>} levels
 * @property {Folder[]} folders
 * @property {Map<string, Context>} context Keyed by sheet path.
 */

/**
 * Resolves a payload a document named by hand against what is on disk.
 *
 * Every segment is compared against a directory listing rather than stat'd,
 * for the reason the casing rule exists at all: a stat answers case
 * insensitively on Windows, so it would confirm a path that 404s on Pages.
 * A payload naming a subfolder is checked the same way at every level, since
 * `Src/example.js` is the same failure as `Example.js` one folder up.
 *
 * A payload that climbs out of its own folder is refused before any of that.
 * The manifest hands the page a path to fetch, and what a cheatsheet ships is
 * inside the cheatsheet.
 *
 * @param {string} dir Absolute path of the cheatsheet folder.
 * @param {string} named The payload exactly as `sheet.json` wrote it.
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function resolveNamed(dir, named) {
  if (named.length === 0) {
    return { ok: false, message: `${SHEET_NAME} names an empty payload` };
  }
  if (named.includes("\\")) {
    return {
      ok: false,
      message:
        `${SHEET_NAME} names payload "${named}", which separates with a backslash. The ` +
        `manifest records a path the page fetches, so the separator is a forward slash`,
    };
  }
  const segments = named.split(posix.sep);
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return {
      ok: false,
      message: `${SHEET_NAME} names payload "${named}", which does not stay inside the folder`,
    };
  }

  let at = dir;
  for (const [index, segment] of segments.entries()) {
    const entries = await listing(at);
    const last = index === segments.length - 1;
    const pool = last ? entries.files : entries.dirs;
    if (pool.includes(segment)) {
      at = join(at, segment);
      continue;
    }
    const near = pool.find((entry) => entry.toLowerCase() === segment.toLowerCase());
    if (near !== undefined) {
      return {
        ok: false,
        message:
          `${SHEET_NAME} names payload "${named}" but the ${last ? "file" : "folder"} on disk ` +
          `is "${near}". Pages serves from a case sensitive filesystem, so this resolves on ` +
          `Windows and 404s in production`,
      };
    }
    const other = last ? entries.dirs : entries.files;
    if (other.includes(segment)) {
      return {
        ok: false,
        message:
          `${SHEET_NAME} names payload "${named}", but "${segment}" is a ` +
          `${last ? "folder" : "file"} rather than a ${last ? "file" : "folder"}`,
      };
    }
    return {
      ok: false,
      message: `${SHEET_NAME} names payload "${named}", which is not in the folder`,
    };
  }
  return { ok: true };
}

/**
 * Composes every document found under `from` and returns the catalog.
 *
 * @param {string} from Absolute path of the catalog root.
 * @returns {Promise<Catalog>}
 */
export async function readCatalog(from) {
  const { folders, levels } = await walkCatalog(from);
  /** @type {Sheet[]} */
  const sheets = [];
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Map<string, Context>} */
  const context = new Map();

  for (const folder of folders) {
    const path = slug(folder.segments);
    const document = await readJson(join(folder.dir, SHEET_NAME));
    if (document.error) {
      findings.push({
        level: "error",
        rule: "sheet.json",
        path,
        message: `${SHEET_NAME} is not valid JSON: ${document.error}`,
      });
      continue;
    }
    if (!document.value || typeof document.value !== "object" || Array.isArray(document.value)) {
      findings.push({
        level: "error",
        rule: "sheet.json",
        path,
        message: `${SHEET_NAME} is not an object, so it names no document to compose`,
      });
      continue;
    }

    /** @type {Record<string, any>} */
    const doc = document.value;
    const own = levels.get(path) ?? { found: false };
    const title = own.title ?? (typeof doc.title === "string" && doc.title.length > 0 ? doc.title : null);
    if (title === null) {
      findings.push({
        level: "error",
        rule: "title",
        path,
        message: `no title: ${SHEET_NAME} carries none and ${META_NAME} does not supply one`,
      });
      continue;
    }

    const detected = detectPayload(folder.entries);
    const declared = typeof doc.kind === "string" ? doc.kind : null;
    const kind = declared ?? detected.kind;
    const demoEntry = detected.demo
      ? (await listing(join(folder.dir, DEMO_DIR))).files.includes(DEMO_ENTRY)
      : false;
    const named =
      typeof doc.payload === "string" ? await resolveNamed(folder.dir, doc.payload) : null;

    /** @type {string | null} */
    let payload = null;
    if (kind === "embed") {
      payload = `${DEMO_DIR}/${DEMO_ENTRY}`;
    } else if (kind === "run" || kind === "read") {
      payload = typeof doc.payload === "string" ? doc.payload : detected.payload;
    }

    /** @type {{ composition: { width: number, height: number }, variation: any }} */
    let composed;
    try {
      composed = composeSheet({ ...doc, title }, { seed: doc.seed });
    } catch (error) {
      findings.push({
        level: "error",
        rule: "compose",
        path,
        message: `the document does not compose, so it has no box to reserve: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      continue;
    }

    /** @type {Sheet} */
    const sheet = {
      id: typeof doc.id === "string" && doc.id.length > 0 ? doc.id : path,
      path,
      title,
      category: folder.segments[0],
      kind: /** @type {any} */ (kind),
      payload: payload === null ? null : `${path}/${payload}`,
      width: composed.composition.width,
      height: composed.composition.height,
    };
    if (folder.segments.length === MAX_DEPTH) sheet.group = folder.segments[1];
    if (doc.seed !== undefined) sheet.seed = doc.seed;
    if (own.order !== undefined) sheet.order = own.order;

    sheets.push(sheet);
    context.set(path, {
      folder,
      doc,
      detected,
      declared,
      demoEntry,
      named,
      variation: composed.variation,
    });
  }

  return { sheets, findings, levels, folders, context };
}

/**
 * Orders by declared order first, then by id, so the same tree always sorts
 * the same way and the committed bytes never depend on filesystem order.
 *
 * @param {{ order?: number, id: string }} a
 * @param {{ order?: number, id: string }} b
 */
const byOrder = (a, b) => {
  const left = a.order ?? Number.POSITIVE_INFINITY;
  const right = b.order ?? Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return a.id.localeCompare(b.id);
};

/**
 * Shapes the catalog into the manifest the page fetches.
 *
 * Grouped by category, because the page builds one `optgroup` per category and
 * a flat list would make it derive the grouping itself. A sheet under a group
 * folder records the group on its own entry rather than nesting a third level:
 * the group is a path nicety, and the dropdown has two levels, not three.
 *
 * @param {Sheet[]} sheets
 * @param {Map<string, Level>} levels
 * @returns {{ canvas: { width: number, height: number } | null, categories: Array<Record<string, any>> }}
 */
export function buildManifest(sheets, levels) {
  /** @type {Map<string, Sheet[]>} */
  const byCategory = new Map();
  for (const sheet of sheets) {
    const list = byCategory.get(sheet.category);
    if (list) list.push(sheet);
    else byCategory.set(sheet.category, [sheet]);
  }

  const categories = [...byCategory.entries()]
    .map(([id, list]) => {
      const level = levels.get(id);
      /** @type {Record<string, any>} */
      const category = { id, title: level?.title ?? id };
      if (level?.order !== undefined) category.order = level.order;
      category.cheatsheets = list
        .map((sheet) => {
          /** @type {Record<string, any>} */
          const entry = { id: sheet.id, path: sheet.path, title: sheet.title, kind: sheet.kind };
          if (sheet.group !== undefined) {
            entry.group = sheet.group;
            entry.groupTitle = levels.get(`${sheet.category}/${sheet.group}`)?.title ?? sheet.group;
          }
          entry.payload = sheet.payload;
          entry.width = sheet.width;
          entry.height = sheet.height;
          if (sheet.seed !== undefined) entry.seed = sheet.seed;
          if (sheet.order !== undefined) entry.order = sheet.order;
          return entry;
        })
        .sort(byOrder);
      return category;
    })
    .sort(byOrder);

  // One box for the whole catalog while every sheet composes to the same
  // canvas, which the extracted design language fixes at 3600 square. Recorded
  // per sheet as well, because a second design language would move it and the
  // page reserves a box per sheet rather than one per catalog.
  const widths = new Set(sheets.map((s) => s.width));
  const heights = new Set(sheets.map((s) => s.height));
  const canvas =
    widths.size === 1 && heights.size === 1
      ? { width: [...widths][0], height: [...heights][0] }
      : null;

  return { canvas, categories };
}

/**
 * The manifest as the bytes that are committed.
 *
 * Two spaces and a trailing newline, so a hand edit and a regeneration differ
 * only where the catalog differs.
 *
 * @param {ReturnType<typeof buildManifest>} manifest
 * @returns {string}
 */
export function renderManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Says how a declared kind contradicts the folder, or `null` when it does not.
 *
 * @param {string} declared
 * @param {ReturnType<typeof detectPayload>} detected
 * @param {Record<string, any>} doc
 * @returns {string | null}
 */
function contradiction(declared, detected, doc, demoEntry) {
  const named = typeof doc.payload === "string" ? doc.payload : null;
  if (declared === "embed") {
    if (!detected.demo) return `kind is "embed" but there is no ${DEMO_DIR}/ folder`;
    if (!demoEntry) return `kind is "embed" but ${DEMO_DIR}/ holds no ${DEMO_ENTRY} for the frame to load`;
    return null;
  }
  if (declared === "none") {
    if (detected.demo) return `kind is "none" but a ${DEMO_DIR}/ folder is present`;
    if (detected.candidates.length > 0) {
      return `kind is "none" but the folder holds a payload (${detected.candidates.join(", ")})`;
    }
    return null;
  }
  const payload = named ?? detected.payload;
  if (payload === null) {
    return detected.candidates.length > 1
      ? `kind is "${declared}" and ${detected.candidates.length} files could be the payload ` +
        `(${detected.candidates.join(", ")}), so ${SHEET_NAME} has to name one`
      : `kind is "${declared}" but the folder holds no payload to ${declared === "run" ? "inject" : "show"}`;
  }
  if (declared === "run" && !RUNNABLE.has(extname(payload).toLowerCase())) {
    return `kind is "run" but "${payload}" is not a browser script`;
  }
  return null;
}

/**
 * The tree rules, applied after a manifest has been produced.
 *
 * Nine rules, in the order the queued item lists them:
 *
 * 1. a missing, unparsable or invalid `sheet.json`, or a missing title
 * 2. a `kind` that contradicts what is on disk
 * 3. a path segment that is not lower case kebab ASCII, or whose on disk
 *    casing differs byte for byte from what a document named
 * 4. depth outside two to three levels
 * 5. a duplicate id
 * 6. a composition that falls outside the extracted margins
 * 7. an unreferenced file in a cheatsheet folder
 * 8. a committed manifest that differs from freshly generated output
 * 9. a level that carries no title of its own
 *
 * Rule 1 is enforced by {@link readCatalog}, because it stops a manifest being
 * produced at all, so the findings it raises arrive here already made.
 *
 * Rule 6 reads "outside the margins" as ink the fitting could not place inside
 * its region, which is what `codeFits` and `runsFit` report. `fillsPanel` is
 * deliberately a warning and not a failure: a sparse panel is inside every
 * margin, it is just emptier than the eleven measured sheets were, and failing
 * it would refuse a short cheatsheet for being short.
 *
 * @param {Catalog} catalog
 * @param {string} generated The manifest bytes this run produced.
 * @param {string | null} committed The bytes on disk, or `null` when there are none.
 * @returns {Finding[]}
 */
export function checkCatalog(catalog, generated, committed) {
  /** @type {Finding[]} */
  const findings = [...catalog.findings];
  /** @type {Map<string, string>} */
  const ids = new Map();
  /** @type {Map<string, Sheet>} */
  const byPath = new Map(catalog.sheets.map((sheet) => [sheet.path, sheet]));

  for (const folder of catalog.folders) {
    const path = slug(folder.segments);
    const sheet = byPath.get(path);
    const extra = catalog.context.get(path);
    if (!sheet || !extra) continue;

    // 3. Path segments.
    for (const segment of folder.segments) {
      if (SEGMENT.test(segment)) continue;
      findings.push({
        level: "error",
        rule: "casing",
        path,
        message:
          `path segment "${segment}" is not lower case kebab ASCII. Pages serves from a ` +
          `case sensitive filesystem, so this resolves on Windows and 404s in production`,
      });
    }

    // 4. Depth.
    if (folder.segments.length < MIN_DEPTH || folder.segments.length > MAX_DEPTH) {
      findings.push({
        level: "error",
        rule: "depth",
        path,
        message:
          `a cheatsheet sits ${MIN_DEPTH} or ${MAX_DEPTH} levels below the root, ` +
          `and this one sits ${folder.segments.length}`,
      });
    }

    // 5. Duplicate ids.
    const taken = ids.get(sheet.id);
    if (taken !== undefined) {
      findings.push({
        level: "error",
        rule: "id",
        path,
        message: `id "${sheet.id}" is already taken by ${taken}`,
      });
    } else {
      ids.set(sheet.id, path);
    }

    // 2. A declared kind against what is on disk.
    const { detected, declared, doc, demoEntry, named, variation } = extra;
    if (declared !== null && !KINDS.includes(declared)) {
      findings.push({
        level: "error",
        rule: "kind",
        path,
        message: `kind "${declared}" is not one of ${KINDS.join(", ")}`,
      });
    } else if (declared !== null) {
      const clash = contradiction(declared, detected, doc, demoEntry);
      if (clash) findings.push({ level: "error", rule: "kind", path, message: clash });
    } else if (detected.kind === "embed" && !demoEntry) {
      findings.push({
        level: "error",
        rule: "kind",
        path,
        message: `a ${DEMO_DIR}/ folder makes this an embed, but it holds no ${DEMO_ENTRY}`,
      });
    } else if (detected.candidates.length > 1) {
      findings.push({
        level: "error",
        rule: "kind",
        path,
        message:
          `${detected.candidates.length} files could be the payload ` +
          `(${detected.candidates.join(", ")}), so ${SHEET_NAME} has to name one`,
      });
    }

    // 3. A payload named by hand, compared against the listing byte for byte,
    //    at every segment rather than only at a bare file name. A payload the
    //    document spells `Src/example.js` fails on Pages exactly as a
    //    `Example.js` one folder up does, and the manifest records whichever
    //    of the two the document wrote.
    if (named !== null && !named.ok) {
      findings.push({ level: "error", rule: "casing", path, message: named.message });
    }

    // 6. Margins.
    if (!variation.codeFits) {
      findings.push({
        level: "error",
        rule: "margins",
        path,
        message: "a line of the example does not fit the code panel at the floor cap",
      });
    }
    if (!variation.runsFit) {
      findings.push({
        level: "error",
        rule: "margins",
        path,
        message: "a display run does not fit its region at the floor cap",
      });
    }
    if (!variation.fillsPanel) {
      findings.push({
        level: "warning",
        rule: "margins",
        path,
        message:
          `the example fills ${Math.round(variation.panelFill * 100)}% of the code panel, ` +
          `under the ${Math.round(variation.floors.panelFill * 100)}% the eleven were measured at`,
      });
    }

    // 7. Unreferenced files, and the folders holding them. The walk stops at a
    //    cheatsheet folder, so a subfolder is the one place nothing else here
    //    looks: a `sheet.json` inside one is not a second cheatsheet and would
    //    otherwise ship into the Pages artifact with nothing accounting for
    //    it, while a single stray file beside it is a hard error.
    const payload = sheet.payload === null ? null : sheet.payload.slice(path.length + 1);
    const holder = payload === null ? null : payload.split(posix.sep)[0];
    for (const name of folder.entries.files) {
      if (name === SHEET_NAME || name === META_NAME || RENDER.test(name)) continue;
      if (payload === name) continue;
      findings.push({
        level: "error",
        rule: "unreferenced",
        path,
        message:
          `"${name}" is neither the document, a render named sheet.*, nor the payload. ` +
          `Name it in ${SHEET_NAME} or take it out of the folder`,
      });
    }
    for (const name of folder.entries.dirs) {
      if (name === DEMO_DIR || name === holder) continue;
      findings.push({
        level: "error",
        rule: "unreferenced",
        path,
        message:
          `"${name}/" is neither ${DEMO_DIR}/ nor the folder the payload sits in, and the ` +
          `walk stops here, so nothing accounts for what is inside it. Name its file in ` +
          `${SHEET_NAME} or take the folder out`,
      });
    }
  }

  // 9. A level with no title of its own.
  for (const [path, level] of catalog.levels) {
    if (byPath.has(path)) continue;
    if (!catalog.sheets.some((sheet) => sheet.path.startsWith(`${path}/`))) continue;
    if (!level.found) {
      findings.push({
        level: "error",
        rule: "title",
        path,
        message: `no ${META_NAME}, so this level's title would have to be derived from its path`,
      });
    } else if (level.error) {
      findings.push({
        level: "error",
        rule: "title",
        path,
        message: `${META_NAME} is not valid JSON: ${level.error}`,
      });
    } else if (level.title === undefined) {
      findings.push({ level: "error", rule: "title", path, message: `${META_NAME} carries no title` });
    }
  }

  // 8. The committed manifest.
  if (committed === null) {
    findings.push({
      level: "error",
      rule: "committed",
      path: MANIFEST_NAME,
      message:
        `no committed ${MANIFEST_NAME}. The page fetches it, so it is committed rather ` +
        `than built at deploy time`,
    });
  } else if (committed !== generated) {
    findings.push({
      level: "error",
      rule: "committed",
      path: MANIFEST_NAME,
      message:
        `the committed ${MANIFEST_NAME} differs from freshly generated output. Run ` +
        `node tools/build-manifest.mjs and commit the result`,
    });
  }

  return findings;
}

/**
 * Builds the catalog, and either writes it or checks it.
 *
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const flag = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
  const from = resolve(flag("--root", root));
  const out = resolve(flag("--out", join(from, MANIFEST_NAME)));
  const checking = argv.includes("--check");
  const asJson = argv.includes("--json");

  const catalog = await readCatalog(from);
  const manifest = buildManifest(catalog.sheets, catalog.levels);
  const generated = renderManifest(manifest);

  /** @type {string | null} */
  let committed = null;
  try {
    committed = await readFile(out, "utf8");
  } catch {
    committed = null;
  }

  const findings = checking ? checkCatalog(catalog, generated, committed) : catalog.findings;
  const errors = findings.filter((finding) => finding.level === "error");

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: checking ? "check" : "build",
          root: rel(root, from),
          sheets: catalog.sheets.length,
          categories: manifest.categories.length,
          findings,
          ok: errors.length === 0,
        },
        null,
        2
      )}\n`
    );
    return errors.length === 0 ? 0 : 1;
  }

  for (const finding of findings) {
    const level = finding.level === "error" ? "error  " : "warning";
    console.error(`${level}  ${finding.rule.padEnd(12)} ${finding.path}: ${finding.message}`);
  }

  if (checking) {
    console.error(
      `checked           ${catalog.sheets.length} cheatsheets in ${manifest.categories.length} categories`
    );
    console.error(
      `result            ${errors.length === 0 ? "ok" : `${errors.length} error${errors.length === 1 ? "" : "s"}`}`
    );
    return errors.length === 0 ? 0 : 1;
  }

  if (errors.length > 0) {
    console.error(
      `wrote             nothing, because ${errors.length} document${errors.length === 1 ? "" : "s"} ` +
        `could not be read or composed`
    );
    return 1;
  }

  if (argv.includes("--print")) {
    process.stdout.write(generated);
  } else {
    await writeFile(out, generated, "utf8");
    console.error(`wrote             ${rel(root, out)}`);
  }
  console.error(
    `cheatsheets       ${catalog.sheets.length} in ${manifest.categories.length} categories`
  );
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
