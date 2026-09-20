// Bridges the brand a repository declares in its constants file to the
// `resources.md` the design language helper reads.
//
//     node tools/build-brand-resources.mjs
//     node tools/build-brand-resources.mjs --print
//     node tools/build-brand-resources.mjs --constants <file> --out <dir>
//
// `api/graphic-design/brand.mjs` can turn a `resources.md` into placeable
// assets, and the helper that generates a per-asset skill calls it at run
// time. What neither of them can do is find one, because this repository does
// not have a `resources.md` - it has a brand declared in a constants file, in
// a section written for a person to read.
//
// This is the half that closes that gap. It is a **generator**, not a parser:
// it reads the declaration, resolves it, and writes a `resources.md` that
// `parseResources` reads correctly. Nothing downstream is asked to understand
// the constants file.
//
// ## Three faults it exists to handle
//
// Each of these is a reason the obvious approach - point the helper at the
// constants file and let `parseResources` have it - does not work.
//
// **1. The heading is misspelled.** The section is headed `Brand Resouces`.
// Anything matching the correct spelling finds nothing, and a bridge that
// silently found nothing would report a brand with no assets, which is
// indistinguishable from a repository that declared none. A constants file is
// the user's and is never edited by a run, so the misspelling is matched
// rather than corrected: a heading within a couple of characters of the name
// is the section, and {@link findBrandSection} says which heading it took.
//
// **2. A key can normalize to a descriptor no composition asks for.** A footer
// image declared as `footer-img` normalizes to `footerImg`, and the helper's
// slot aliases know `footer`, `linkedMedia`, `banner` and `strip` - so the
// asset resolves to nothing and the slot is filled with a drawn mark instead.
// Declaring the **folder** fixes it generally rather than by special-casing
// that one key: a folder's file names are its descriptors, so `footer.png`
// fills `footer` whatever the constants file called the line.
//
// **3. Every other `- key: value` line in the file would be read as a brand
// slot.** A constants file is full of them - a review level, a watch pattern,
// a list of sites. One is actively harmful: `- Media: self` under an unrelated
// section normalizes to `media`, which `parseResources` treats as an **assets
// folder**, so the brand would declare a directory named `self`. Only the
// lines inside the brand section are read.
//
// ## Where it writes, and why not the default
//
// The helper looks for `references/resources.md`, walking up from the working
// directory. At a repository root that is a **tracked** folder, and the values
// here are a real domain, a real name and a real tagline. So the default
// output is `.claude/references/`, which is ignored, and the helper is pointed
// at it by the environment variable it already reads:
//
//     set NAPKIN_BRAND_RESOURCES=.claude\references\resources.md
//
// The generated file is regenerated rather than edited. It says so at the top,
// and it names the section it came from, so a reader who finds it knows which
// file to change.

import { mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { descriptorFromFilename, parseResources } from "../api/graphic-design/brand.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The constants file this repository keeps its brand in. */
export const DEFAULT_CONSTANTS = join(root, ".claude", "constants.md");

/** Where the generated file goes: inside the ignored folder, not at the root. */
export const DEFAULT_OUT = join(root, ".claude", "references");

/** The section name, as it would be spelled correctly. */
const SECTION = "brand resources";

/** How far from that a heading may be and still be the brand section. */
const SECTION_TOLERANCE = 2;

/**
 * Levenshtein distance, iterative with one row of state.
 *
 * Here to recognise a misspelled heading, and small on purpose: a section name
 * is a handful of characters and the alternative is a list of spellings
 * somebody has to keep adding to.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function editDistance(a, b) {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * The brand section of a constants file: its heading, and its body.
 *
 * The body runs to the next heading of the same level or shallower, so a
 * subsection of the brand section is part of it and the section after it is
 * not.
 *
 * @param {string} markdown
 * @returns {{ heading: string, spelling: string, body: string } | null}
 */
export function findBrandSection(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[i]);
    if (!heading) continue;
    const spelled = heading[2]
      .replace(/[`*_]+/g, "")
      .trim()
      .toLowerCase();
    if (editDistance(spelled, SECTION) > SECTION_TOLERANCE) continue;

    const level = heading[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = /^(#{1,6})\s+/.exec(lines[j]);
      if (next && next[1].length <= level) break;
      body.push(lines[j]);
    }
    return { heading: heading[2].trim(), spelling: spelled, body: body.join("\n") };
  }
  return null;
}

/**
 * What a constants file declares about the brand, resolved against the disk.
 *
 * @typedef {object} BridgedBrand
 * @property {string} heading The heading the section was found under, as written.
 * @property {boolean} misspelled Whether that heading is the correct spelling.
 * @property {Record<string, string>} text Values to draw: `brandName`, `domain`, `tagline`.
 * @property {Array<{ key: string, declared: string, path: string, exists: boolean }>} assets Declared files.
 * @property {string | null} folder The one folder the assets share, absolute, or `null`.
 * @property {string[]} notes Anything read that could not be placed.
 */

/**
 * Reads the brand out of a constants file.
 *
 * @param {string} markdown
 * @param {string} constantsPath Used to resolve declared paths, which the section states are relative to it.
 * @returns {Promise<BridgedBrand | null>}
 */
export async function readBrand(markdown, constantsPath) {
  const section = findBrandSection(markdown);
  if (!section) return null;

  // The section's own body is handed to the port's parser, so the format this
  // repository writes in and the format the helper reads are the same format
  // read by the same code. Only the scope is this file's decision.
  const parsed = parseResources(section.body);
  const base = dirname(resolve(constantsPath));

  /** @type {BridgedBrand} */
  const brand = {
    heading: section.heading,
    misspelled: section.spelling !== SECTION,
    text: { ...parsed.text },
    assets: [],
    folder: null,
    notes: [...parsed.notes],
  };

  for (const [key, declared] of Object.entries(parsed.paths)) {
    const path = isAbsolute(declared) ? declared : resolve(base, declared);
    let exists = false;
    try {
      await stat(path);
      exists = true;
    } catch {
      brand.notes.push(`\`${key}\` declares \`${declared}\`, which is not there.`);
    }
    brand.assets.push({ key, declared, path, exists });
  }

  // A folder declared outright is the answer already; otherwise the assets are
  // asked whether they share one.
  const declaredFolder = Object.values(parsed.directories)[0];
  if (declaredFolder) {
    brand.folder = isAbsolute(declaredFolder) ? declaredFolder : resolve(base, declaredFolder);
  } else {
    const folders = new Set(brand.assets.filter((a) => a.exists).map((a) => dirname(a.path)));
    if (folders.size === 1) brand.folder = [...folders][0];
    else if (folders.size > 1) {
      brand.notes.push(
        `The declared assets are spread over ${folders.size} folders, so each is declared on its own line ` +
          `and a key that normalizes to no known slot stays unresolved.`
      );
    }
  }

  return brand;
}

/**
 * Turns a resolved brand into the `resources.md` the helper reads.
 *
 * @param {BridgedBrand} brand
 * @param {string} outDir Where the file will be written, so paths are relative to it.
 * @param {string} constantsPath Named in the header, so a reader knows what to edit.
 * @returns {string}
 */
export function renderResources(brand, outDir, constantsPath) {
  /** @param {string} target */
  const rel = (target) => relative(resolve(outDir), target).split(sep).join(posix.sep) || ".";

  const lines = [
    "# resources.md",
    "",
    "> Generated by `tools/build-brand-resources.mjs`. Edit the brand section of",
    `> \`${relative(root, resolve(constantsPath)).split(sep).join(posix.sep)}\` and run it again;`,
    "> edits made here are overwritten.",
    "",
  ];

  if (brand.folder) {
    lines.push(
      "The assets are declared as a folder rather than one line each, so a file's",
      "own name is the slot it fills. That is what makes `footer.png` resolve to",
      "the `footer` slot however the constants file worded the line.",
      "",
      `- assets: ${rel(brand.folder)}`
    );
  } else {
    lines.push("No asset folder was declared, so each asset is named on its own line.", "");
    for (const asset of brand.assets) lines.push(`- ${asset.key}: ${rel(asset.path)}`);
  }

  if (Object.keys(brand.text).length > 0) {
    lines.push("");
    for (const [key, value] of Object.entries(brand.text)) lines.push(`- ${key}: ${value}`);
  }

  if (brand.notes.length > 0) {
    lines.push("", "Notes carried over from the declaration:", "");
    for (const note of brand.notes) lines.push(`> ${note}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * The slots the generated file resolves to, for a report.
 *
 * Read back through `parseResources` rather than predicted, because what
 * matters is what the helper will see and the two can differ.
 *
 * @param {string} resources
 * @returns {{ directories: string[], paths: string[], text: string[] }}
 */
export function slotsOf(resources) {
  const parsed = parseResources(resources);
  return {
    directories: Object.keys(parsed.directories),
    paths: Object.keys(parsed.paths),
    text: Object.keys(parsed.text),
  };
}

/**
 * The descriptors a folder of assets yields, which is the whole reason the
 * folder is declared rather than the files.
 *
 * @param {string | null} folder
 * @returns {Promise<string[]>}
 */
export async function descriptorsIn(folder) {
  if (!folder) return [];
  try {
    const entries = await readdir(folder, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => descriptorFromFilename(entry.name));
  } catch {
    return [];
  }
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const flag = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
  const constantsPath = flag("--constants", DEFAULT_CONSTANTS);
  const outDir = flag("--out", DEFAULT_OUT);

  /** @type {string} */
  let markdown;
  try {
    markdown = await readFile(constantsPath, "utf8");
  } catch {
    console.error(
      `No constants file at ${constantsPath}. This repository keeps one at ` +
        `.claude/constants.md, which is ignored, so a fresh clone has none until ` +
        `the brand is declared.`
    );
    return 1;
  }

  const brand = await readBrand(markdown, constantsPath);
  if (!brand) {
    console.error(
      `${constantsPath} has no section within ${SECTION_TOLERANCE} characters of ` +
        `"${SECTION}", so there is no brand to bridge.`
    );
    return 1;
  }

  const resources = renderResources(brand, outDir, constantsPath);
  const slots = slotsOf(resources);

  if (argv.includes("--print")) {
    process.stdout.write(resources);
  } else {
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "resources.md"), resources, "utf8");
  }

  console.error(`section           ${brand.heading}${brand.misspelled ? " (misspelled; matched anyway)" : ""}`);
  console.error(`assets            ${brand.assets.map((a) => `${a.key}${a.exists ? "" : " (missing)"}`).join(", ") || "none"}`);
  console.error(`folder            ${brand.folder ? relative(root, brand.folder).split(sep).join(posix.sep) : "none"}`);
  console.error(`slots             ${[...slots.directories, ...slots.paths, ...slots.text].join(", ") || "none"}`);
  // The point of declaring the folder: these are the slot names the helper
  // will actually fill, taken from the file names rather than from the keys.
  const descriptors = await descriptorsIn(brand.folder);
  if (descriptors.length > 0) console.error(`from file names   ${descriptors.join(", ")}`);
  for (const note of brand.notes) console.error(`note              ${note}`);
  if (!argv.includes("--print")) {
    const written = relative(root, resolve(outDir, "resources.md")).split(sep).join(posix.sep);
    console.error(`wrote             ${written}`);
    console.error(`point the helper  NAPKIN_BRAND_RESOURCES=${written}`);
  }
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
