// The command line that composes a cheatsheet and renders it to a media file.
//
// This is the automation surface: one call produces the file a social post
// needs, naming the format, the design language, the seed and - the part that
// matters most - which of the two renderers answered.
//
//     node tools/cheatsheet.mjs --generate <slug> [options]
//     node tools/cheatsheet.mjs --document <path> [options]
//     node tools/cheatsheet.mjs --list            [--json]
//     node tools/cheatsheet.mjs --check [<slug>]  [--json]
//     node tools/cheatsheet.mjs --help
//
// There is no `package.json` here and so no installable `bin`, which is why it
// is invoked by path. Nothing is installed for it either: the composition is
// this repository's own code, and the one optional dependency - a browser - is
// resolved at run time and reported rather than required.
//
// ## The two inputs, and why a document off disk is not a catalog sheet
//
// `--generate <slug>` names a cheatsheet in `cheatsheets.json`. `--document
// <path>` reads a JSON document from anywhere, through `readDocumentFile` in
// `api/cheatsheet/files.mjs`, which holds it to whichever of the two shapes it
// is written in. The two are alternatives and naming both is an error: they
// answer the same question, and a call that gave both would have to pick one
// silently.
//
// `--document` is what makes this command an entry point for a document rather
// than for this repository's catalog. Until 2026.11.01 every route in was a
// slug, so a sheet that was not in `cheatsheets.json` could not be rendered at
// all - which made the command a catalog tool with a renderer behind it rather
// than the other way round.
//
// **A document off disk has no folder of its own, so it is never written beside
// itself.** The destination rule below sends a publishable render to the
// cheatsheet's own folder, and that folder is a catalog fact: it is where
// `sheet.json` lives and where the social recipe looks. A document named by
// path has no entry, no slug and no folder the recipe knows about, so it goes
// to `.tmp/` under a name slugged from its title unless `--out` says otherwise.
// Writing it beside the file it was read from would drop a publishable image
// into whatever folder a caller happened to point at.
//
// ## What this command does, now that the layer has an output surface
//
// Since 2026.10.31 it composes and renders through `api/cheatsheet/`: one call
// to `renderOf` per format, and one to `writeRender` for the bytes. It used to
// branch on the format itself, call `composition.toSVG()` on one side and
// import `rasterizeSheet` by path on the other, and work `publishable` out a
// second time from the route and the scale. It no longer imports
// `api/cheatsheet/raster.mjs` at all; a raster is reached through the surface,
// which is where the alphabet and the publish floor are known.
//
// What is left here is the half that is policy rather than rendering, and all
// three parts of it are this command's own rather than a library's: the catalog
// lookup, the preset below, and the rule about where a render may land.
//
// ## Where a render is written, and why that is a rule rather than a default
//
//     publishable  ->  <the cheatsheet's own folder>/sheet.<ext>
//     not          ->  .tmp/<slug>.sheet.<ext>
//
// One rule, and the social recipe in `.claude/constants.md` is the reason for
// it. That recipe watches `**/*.{jpg,webp}` across the working tree and drafts
// a post for every new match, so whatever lands beside a `sheet.json` is a
// thing somebody may publish. A built-in-alphabet render is not that thing: it
// draws a single stroke alphabet rather than the face the design language
// measured, so a post made from one shows a reader a typeface the page never
// uses. Nor is a render under the publish floor, or one over the weight cap.
//
// So an unpublishable render is still produced - a thumbnail and a geometry
// target are both legitimate things to want - and it is produced somewhere the
// recipe does not look. `--out` overrides the destination and is always obeyed;
// the report says what it wrote and whether it may be posted.
//
// Three things follow that are worth stating, because each is a trap:
//
// - **Nothing writes a PNG beside a cheatsheet by default.** The recipe's watch
//   cannot be widened to `png` without sweeping in the favicon working set,
//   measured at 46 files. The browser route encodes WebP directly, so the
//   PNG-then-convert pipeline the item was written around is not needed and
//   there is no ImageMagick dependency here; `--format png --out <folder>` is
//   how a caller asks for one anyway, deliberately.
// - **A render is untracked and is not in `.gitignore`.** It shows in
//   `git status` and `node tools/build-manifest.mjs --check` passes it by name,
//   because `sheet.webp`, `sheet.png`, `sheet.jpg` and `sheet.svg` are reserved
//   in a cheatsheet folder. That is what makes the recipe's working-tree glob
//   find it: a rule that asked git what was committed would pass on the
//   machine that rendered and fail on every other.
// - **Seed the social ledger before a first bulk render.** The ledger is keyed
//   by path, so rendering the whole catalog at once reads as 28 new images and
//   drafts 28 posts. `cross-os-social seed --workspace mcp-todo` first.
//
// ## The preset, and the scale that is not 2
//
// Every raster figure here is the preset recorded under **The preset a render
// is written at** in `CONTRIBUTING.md`, rather than one chosen here: quality
// 80, a 1400 px long edge, a 200 KB target and a 300 KB cap. A flag overrides
// each.
//
// The preset's format is WebP and that one is *not* a default this command
// applies: `--format` defaults to `svg`, because an SVG is the composition
// itself in the face the page draws and so is the answer that needs no
// renderer and no encoder behind it. WebP is what `--format webp` asks for,
// and the preset is the settings it is written at once asked.
//
// `--scale` is the one to read carefully. It is device pixels per
// **composition** pixel, the unit the drawing surface counts in, so scale 1 is
// the full 3600 square and the preset's 1400 px long edge is a scale of
// `1400 / 3600`, or 0.3889. A scale of 2 - which is what "a scale of 2 or 3"
// off the roadmap means in *display* pixels - would be a 7200 square image
// nobody asked for. The floor under which the code face's stems grey out is
// `MIN_PUBLISH_SCALE` in `api/cheatsheet/raster.mjs`, near a third, and the
// preset clears it by 200 px of long edge.
//
// ## `--layout`, and the one flag still refused
//
// `--layout` and `--script` were both in the specification this was written
// from and both had nothing behind them. `--layout` does now: the layout model
// landed on 2026.10.29, so the flag takes `sheet` - the one composition the
// design language records - or a path to a JSON layout of its own, which is
// read, validated against `LAYOUT_SCHEMA` and composed to. It is the same
// shape `--theme` has, for the same reason: there is one recorded answer, and
// a second is a file rather than a name in here.
//
// `--theme` reads a **theme** rather than a design language, as of 2026.10.30.
// It used to parse its file straight into `composeSheet`'s `options.language`,
// which is to say a caller who wanted six colours changed had to hand over
// every coordinate on the sheet; that option no longer exists, and a theme file
// may be partial, so the flag now takes the smallest file that says what was
// wanted.
//
// `--script` is still refused by name. A demo payload is not an input to a
// composition - the document's `code` array, or a formal document's sections,
// is the content, and the payload is what the page runs or frames beside the
// graphic. It is refused with that said rather than accepted and ignored,
// which is the one outcome that would leave a caller believing a sheet had
// been composed from a payload it had not.
//
// Run with: node tools/cheatsheet.mjs --help
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeSheet,
  isFormalDocument,
  prepareAccents,
  readLayout,
  renderOf,
  slugFor,
  SHEET_LANGUAGE,
  SHEET_LAYOUT,
} from "../api/cheatsheet/index.mjs";
import { namesDirectory, readDocumentFile, writeRender } from "../api/cheatsheet/files.mjs";
import { readBrandAssets } from "./build-manifest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CANVAS_EDGE = 3600;

/**
 * The preset a render is written at, from `CONTRIBUTING.md`.
 *
 * Held as the long edge rather than as a scale, because that is the figure the
 * document states and the one a consumer's layout is sized against. The scale
 * is derived from it so the two can never drift.
 */
const PRESET = {
  format: "webp",
  quality: 80,
  longEdge: 1400,
  targetBytes: 200 * 1024,
  capBytes: 300 * 1024,
};

/**
 * The formats this command writes, and what each is.
 *
 * `format` is the name the output surface knows it by and `ext` is the name a
 * file carries, which differ in exactly one case: `jpg` on the command line and
 * on disk, `jpeg` to the surface, which names the codec rather than the
 * extension. A file called `sheet.jpeg` would not match the social recipe's
 * `**\/*.{jpg,webp}`.
 */
const FORMATS = {
  svg: { raster: false, ext: "svg", mime: "image/svg+xml", format: "svg" },
  png: { raster: true, ext: "png", mime: "image/png", format: "png" },
  webp: { raster: true, ext: "webp", mime: "image/webp", format: "webp" },
  jpg: { raster: true, ext: "jpg", mime: "image/jpeg", format: "jpeg" },
};

/** The renderers, as the command line names them. */
const RENDERERS = { auto: "auto", browser: "browser", builtin: "builtin" };

/** Flags that take no value. */
// `--check` is here rather than among the value flags because its slug is
// optional: bare, it checks the whole catalog, and a slug after it is read as
// the positional below.
const SWITCHES = new Set([
  "--all",
  "--check",
  "--data-only",
  "--dry-run",
  "--json",
  "--list",
  "--help",
  "-h",
]);

/**
 * Flags that take a value.
 *
 * Listed so an unknown flag is refused rather than collected. Taking one and
 * ignoring it is the outcome `NOT_YET` exists to avoid, and a typo reaches it
 * by a shorter road than `--layout` does: `--fomat webp` leaves the format at
 * its default, and `--output .tmp/x.webp` leaves the destination at *its*
 * default, which for a publishable render is beside the cheatsheet's own
 * `sheet.json` - the one place the social recipe drafts a post from.
 */
const VALUES = new Set([
  "--generate",
  "--document",
  "--format",
  "--renderer",
  "--theme",
  "--layout",
  "--seed",
  "--scale",
  "--quality",
  "--background",
  "--max-bytes",
  "--out",
]);

/** Flags recognised so they can be refused with a reason rather than as unknown. */
const NOT_YET = {
  "--script":
    "a demo payload is not an input to a composition - the document's `code` array is the content, " +
    "and the payload is what the page runs or frames beside the graphic. Queued under " +
    "`## Implement Cheatsheet API`",
};

const USAGE = `
node tools/cheatsheet.mjs --generate <slug> [options]
node tools/cheatsheet.mjs --all             [options]
node tools/cheatsheet.mjs --document <path> [options]
node tools/cheatsheet.mjs --list            [--json]
node tools/cheatsheet.mjs --check [<slug>]  [--json]

  --generate <slug>      The cheatsheet to compose, by manifest slug or folder path
  --all                  Every cheatsheet in the catalog, each from its own sheet.json
  --document <path>      A JSON document to compose, in place of a catalog slug
  --format <fmt>         svg (default), png, webp or jpg. The preset's raster format is ${PRESET.format}
  --renderer <r>         auto (default), browser, or builtin
  --theme <name|path>    default (the recorded theme), or a path to a JSON one, whole or partial
  --layout <name|path>   sheet (the recorded composition), or a path to a JSON one
  --seed <n>             Overrides the document's own seed. Identical seeds render identically
  --scale <n>            Device pixels per composition pixel. Default ${(PRESET.longEdge / CANVAS_EDGE).toFixed(4)}, the preset's ${PRESET.longEdge} px long edge
  --quality <n>          Encoder quality for png, webp and jpg. Default ${PRESET.quality}, from the preset
  --background <color>   A CSS color, or none for transparent. Default is the theme's
  --max-bytes <n>        The weight a publishable render stays under. Default ${PRESET.capBytes} (${(PRESET.capBytes / 1024).toFixed(0)} KB)
  --out <path>           A file, a directory, or - for standard output
  --data-only            Emit the document and what the composition chose, rendering nothing
  --dry-run              Report what would be written, touching no disk
  --json                 Machine readable result, naming which renderer answered
  --help, -h             This

A render goes beside its sheet.json when it is publishable, and into .tmp/ when
it is not. A --document render has no folder in the catalog, so it goes to .tmp/
whichever it is. See the header of this file for why that is a rule.

--all composes every catalog sheet by the same path --generate does, so the two
write the same bytes to the same place. One sheet that cannot be composed is
reported against its own id and the rest still run, the exit code saying some
failed. It takes no --out, --seed or --data-only: each of those means one sheet.
`.trimStart();

/**
 * Reads the command line into an options object.
 *
 * Hand rolled rather than `node:util`'s `parseArgs`, for one reason: an unknown
 * flag has to be able to say more than "unknown". `--script` is a flag somebody
 * will reasonably try, and telling them it is not implemented yet and where it
 * is queued is worth the twenty lines.
 *
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
export function parseFlags(argv) {
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--") && token !== "-h") {
      // The one positional: `--check <slug>` reads more naturally than
      // `--check --generate <slug>`, and the specification writes it that way.
      if (flags.slug !== undefined) throw new Error(`cheatsheet: ${JSON.stringify(token)} is a second slug`);
      flags.slug = token;
      continue;
    }
    if (token in NOT_YET) {
      throw new Error(`cheatsheet: ${token} is not implemented yet - ${NOT_YET[token]}.`);
    }
    if (SWITCHES.has(token)) {
      flags[token.replace(/^-+/, "")] = true;
      continue;
    }
    if (!VALUES.has(token)) {
      throw new Error(
        `cheatsheet: ${token} is not a flag this command takes. Run \`--help\` for the list.`
      );
    }
    const value = argv[index + 1];
    if (value === undefined || (value.startsWith("--") && value !== "-")) {
      throw new Error(`cheatsheet: ${token} needs a value`);
    }
    flags[token.replace(/^--/, "")] = value;
    index += 1;
  }
  return flags;
}

/** The catalog, as `cheatsheets.json` records it. */
async function readManifest() {
  try {
    return JSON.parse(await readFile(join(root, "cheatsheets.json"), "utf8"));
  } catch (error) {
    throw new Error(
      "cheatsheet: cheatsheets.json could not be read, so there is no catalog to look a slug up in. " +
        `Run \`node tools/build-manifest.mjs\` first. (${error.message})`
    );
  }
}

/** Every entry in the catalog, flattened, with its category beside it. */
function entriesOf(manifest) {
  return manifest.categories.flatMap((category) =>
    category.cheatsheets.map((sheet) => ({ ...sheet, category: category.id, categoryTitle: category.title }))
  );
}

/**
 * The entry a slug names.
 *
 * A manifest id and a folder path are the same string for every sheet in the
 * catalog today, and they are matched separately anyway: the id is what an
 * option on the page carries and a path is what a person has in their shell
 * after a `cd`, so both have to answer. A trailing separator is tolerated for
 * the same reason - tab completion adds one.
 *
 * @param {Array<object>} entries
 * @param {string} slug
 */
export function findEntry(entries, slug) {
  const wanted = slug.replace(/[\\/]+$/, "").split(sep).join("/");
  const found =
    entries.find((entry) => entry.id === wanted) ?? entries.find((entry) => entry.path === wanted);
  if (found) return found;
  const near = entries
    .filter((entry) => entry.id.includes(wanted) || wanted.includes(entry.id.split("/").pop()))
    .slice(0, 5)
    .map((entry) => entry.id);
  throw new Error(
    `cheatsheet: no cheatsheet is named ${JSON.stringify(slug)}.` +
      (near.length ? ` Did you mean:\n  ${near.join("\n  ")}` : " Run `--list` to see the catalog.")
  );
}

/**
 * The theme to compose through.
 *
 * One name today, `default`, and a path for anything else. The catalog has one
 * recorded theme - `SHEET_THEME`, derived from the design language measured off
 * the eleven images - and a second would be a file rather than a name in here,
 * so a name that is not `default` is an error that says what the options are
 * rather than silently falling back to the only one.
 *
 * **A file may be a whole theme or a partial one.** `composeSheet` lays what it
 * is given over the recorded theme and validates the result, so a file holding
 * nothing but a palette is a complete answer and a file holding a misspelt
 * field is refused by path. That is what makes this flag usable by hand: a
 * theme file nobody wants to write in full is a flag nobody uses.
 *
 * @param {string | undefined} named
 */
async function readThemeOption(named) {
  if (named === undefined || named === "default") return undefined;
  if (!/[\\/.]/.test(named)) {
    throw new Error(
      `cheatsheet: ${JSON.stringify(named)} is not a theme this repository records. ` +
        "There is one, `default`; anything else is a path to a JSON theme, whole or partial."
    );
  }
  const path = resolve(root, named);
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`cheatsheet: the theme at ${named} could not be read. (${error.message})`);
  }
}

/**
 * The layout to compose to.
 *
 * The same shape as {@link readThemeOption} above, and for the same reason: one name
 * the record supports and a path for anything else, so a name that is not
 * `sheet` says what the options are rather than quietly falling back to the
 * only one. The difference is that a layout read off disk is **validated**
 * here before it reaches the composition - a layout naming a row its own grid
 * does not have is well formed JSON, and the error worth reading is the one
 * naming the slot rather than whatever the drawing surface makes of an
 * undefined coordinate.
 *
 * @param {string | undefined} named
 */
async function readLayoutOption(named) {
  if (named === undefined || named === "sheet" || named === "default") return undefined;
  if (!/[\\/.]/.test(named)) {
    throw new Error(
      `cheatsheet: ${JSON.stringify(named)} is not a layout this repository records. ` +
        "There is one, `sheet`; anything else is a path to a JSON layout object."
    );
  }
  const path = resolve(root, named);
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`cheatsheet: the layout at ${named} could not be read. (${error.message})`);
  }
  return readLayout(parsed);
}

/** A flag's value as a finite number, or an error naming the flag. */
function asNumber(name, value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`cheatsheet: --${name} takes a number, not ${JSON.stringify(String(value))}`);
  }
  return parsed;
}

/**
 * Composes a document that has already been read.
 *
 * The accent reader and the brand assets are both loaded, because the point of
 * this command is a file somebody looks at: without the reader the code panel
 * is one colour per line rather than one per token, and without the brand the
 * masthead sets a lone wordmark. Neither is required - each falls back to what
 * the sheet drew before it existed - and what happened to each is reported.
 *
 * Split from {@link compose} on 2026.11.01 so the two input routes share it: a
 * catalog slug reads its `sheet.json` and a `--document` path reads a file, and
 * everything after that point is one document being composed.
 *
 * @param {object} doc
 * @param {{ seed?: string, theme?: object, layout?: object }} options
 */
async function composeDocument(doc, options) {
  const [reader, brand] = await Promise.all([prepareAccents(), readBrandAssets(root)]);
  const { composition, variation } = composeSheet(doc, {
    seed: options.seed ?? doc.seed,
    brand,
    ...(options.theme ? { theme: options.theme } : {}),
    ...(options.layout ? { layout: options.layout } : {}),
  });
  return { doc, composition, variation, reader };
}

/**
 * Composes one catalog entry's document.
 *
 * @param {object} entry
 * @param {{ seed?: string, theme?: object, layout?: object }} options
 */
async function compose(entry, options) {
  const folder = join(root, ...entry.path.split("/"));
  const doc = JSON.parse(await readFile(join(folder, "sheet.json"), "utf8"));
  const composed = await composeDocument(doc, { ...options, seed: options.seed ?? doc.seed ?? entry.seed });
  return { folder, ...composed };
}

/**
 * The sheet a call is about, from whichever of the two input flags named it.
 *
 * `id` and `path` are on both so a report has the same fields either way - a
 * consumer parsing `--json` should not have to branch on which flag was typed -
 * and `source` is what says which they mean. For a catalog entry `path` is the
 * cheatsheet's folder; for a document it is the file, and `id` is the title
 * slugged, which is the same derivation {@link filenameFor} uses for a name.
 *
 * @param {Record<string, string | boolean>} flags
 * @param {{ seed?: string, theme?: object, layout?: object }} options
 */
async function subjectOf(flags, options) {
  const named = flags.document === undefined ? undefined : String(flags.document);
  if (named !== undefined) {
    const { document, path } = await readDocumentFile(named, { root });
    const composed = await composeDocument(document, options);
    return {
      source: "document",
      id: slugFor(document.title),
      path: relative(root, path).split(sep).join("/"),
      folder: null,
      ...composed,
    };
  }
  const slug = String(flags.generate === true ? flags.slug ?? "" : flags.generate ?? flags.slug ?? "");
  if (!slug) {
    throw new Error(
      "cheatsheet: --generate needs a cheatsheet to compose, or --document a JSON file. " +
        "Run `--list` to see the catalog."
    );
  }
  const entry = findEntry(entriesOf(await readManifest()), slug);
  const { folder, ...composed } = await compose(entry, options);
  return { source: "catalog", id: entry.id, path: entry.path, folder, ...composed };
}

/**
 * Where a render is written, and whether it may be published from there.
 *
 * A subject whose `folder` is `null` is a document read by path rather than a
 * cheatsheet in the catalog, and it has nowhere of its own to be published
 * from: the folder in the rule above is where a `sheet.json` lives and where
 * the social recipe looks, and a document named by path is in neither. So it
 * takes the `.tmp/` route whether it is publishable or not, and `--out` is the
 * way to put one anywhere else. An absent `folder` is the catalog's own case
 * and is derived from `entry.path`, which is what every caller before
 * 2026.11.01 passed.
 *
 * @param {object} config
 * @param {{ id: string, path?: string, folder?: string | null }} config.entry
 * @param {{ raster: boolean, ext: string }} config.format
 * @param {string | undefined} config.out
 * @param {boolean} config.publishable
 * @returns {{ path: string, stdout: boolean }}
 */
export function destinationFor({ entry, format, out, publishable }) {
  if (out === "-") return { path: "-", stdout: true };
  if (out !== undefined) {
    const given = resolve(root, out);
    // A directory is named either by ending in a separator or by having no
    // extension of its own. `--out .tmp` is a folder; `--out .tmp/a.webp` is a
    // file. Guessing from the extension is what lets both be written without a
    // second flag to say which was meant.
    //
    // The test itself is `namesDirectory` in `api/cheatsheet/files.mjs`, which
    // is where this command's own dot directory trap is now recorded: `.tmp`
    // ends in `.tmp`, so an extension test that did not strip the leading dots
    // read `--out .tmp` as a file, resolved it to the folder itself, and failed
    // the write with `EISDIR` on the folder every unpublishable render goes to.
    return {
      path: namesDirectory(out) ? join(given, `sheet.${format.ext}`) : given,
      stdout: false,
    };
  }
  const folder =
    entry.folder === undefined ? join(root, ...String(entry.path).split("/")) : entry.folder;
  if (publishable && folder !== null) {
    return { path: join(folder, `sheet.${format.ext}`), stdout: false };
  }
  // `.tmp/` is gitignored and the social recipe ignores it twice over, so an
  // unpublishable render cannot be drafted from here. The slug is in the name
  // because the folder is flat and two sheets would otherwise overwrite each
  // other's `sheet.webp`.
  return { path: join(root, ".tmp", `${entry.id.split("/").join(".")}.sheet.${format.ext}`), stdout: false };
}

/** A byte count in the units the preset is stated in. */
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** `--list`: what the catalog holds. */
async function listCatalog({ json }) {
  const entries = entriesOf(await readManifest());
  if (json) {
    return {
      exit: 0,
      json: {
        command: "list",
        count: entries.length,
        cheatsheets: entries.map((entry) => ({
          id: entry.id,
          path: entry.path,
          title: entry.title,
          kind: entry.kind,
          category: entry.category,
          group: entry.group ?? null,
          seed: entry.seed ?? null,
        })),
      },
    };
  }
  const lines = [`${entries.length} cheatsheets`];
  let category = null;
  for (const entry of entries) {
    if (entry.category !== category) {
      category = entry.category;
      lines.push(`\n${entry.categoryTitle}`);
    }
    lines.push(`  ${entry.kind.padEnd(5)} ${entry.id}`);
  }
  return { exit: 0, text: lines.join("\n") };
}

/**
 * `--check`: composes without rendering and reports what the composition said
 * about itself.
 *
 * Every sheet when no slug is given, which is the form worth having: the
 * question "does anything in the catalog no longer compose clean" is the one a
 * person asks, and asking it per sheet is 28 invocations.
 */
async function checkSheets({ slug, json }) {
  const entries = entriesOf(await readManifest());
  const wanted = slug === undefined ? entries : [findEntry(entries, slug)];
  const results = [];
  for (const entry of wanted) {
    const { variation } = await compose(entry, {});
    results.push({
      id: entry.id,
      codeFits: variation.codeFits,
      runsFit: variation.runsFit,
      contrastHolds: variation.contrastHolds,
      fillsPanel: variation.fillsPanel,
      accents: variation.accents,
      brand: variation.brand,
      seed: variation.seed,
      notes: variation.notes,
    });
  }
  const bad = results.filter(
    (result) => !result.codeFits || !result.runsFit || !result.contrastHolds
  );
  if (json) {
    return { exit: bad.length ? 1 : 0, json: { command: "check", checked: results.length, clean: bad.length === 0, cheatsheets: results } };
  }
  const lines = [];
  for (const result of results) {
    const faults = [
      result.codeFits ? null : "the code does not fit its panel",
      result.runsFit ? null : "a run overflows its box",
      result.contrastHolds ? null : "an ink is under the contrast floor",
    ].filter(Boolean);
    lines.push(`${faults.length ? "FAIL" : "ok  "} ${result.id}${faults.length ? ` - ${faults.join("; ")}` : ""}`);
    for (const note of result.notes) lines.push(`       ${note}`);
  }
  lines.push(
    `\n${results.length} checked, ${results.length - bad.length} clean` +
      (bad.length ? `, ${bad.length} to look at` : "")
  );
  return { exit: bad.length ? 1 : 0, text: lines.join("\n") };
}

/**
 * The format and the renderer a call named, both held to their own tables.
 *
 * @param {Record<string, string | boolean>} flags
 * @returns {{ format: { raster: boolean, ext: string, format: string }, renderer: string }}
 */
function routeOf(flags) {
  const name = String(flags.format ?? "svg").toLowerCase();
  // `Object.hasOwn` rather than a truth test on the lookup. `FORMATS` is an
  // object literal, so `FORMATS.constructor` and `FORMATS.__proto__` are both
  // truthy and neither is a format: `--format constructor` got past this
  // guard, drew SVG because `raster` was undefined, and wrote the bytes to
  // `sheet.undefined` beside the cheatsheet with `publishable: yes` on it.
  const format = Object.hasOwn(FORMATS, name) ? FORMATS[name] : undefined;
  if (!format) {
    throw new Error(
      `cheatsheet: ${JSON.stringify(name)} is not a format this command writes. ` +
        `It writes ${Object.keys(FORMATS).join(", ")}; GIF and TIFF were dropped because nothing here reads them.`
    );
  }
  const asked = String(flags.renderer ?? "auto").toLowerCase();
  // The same guard as the format above, for the same reason: unchecked,
  // `--renderer constructor` reached the raster layer as a function and came
  // back as that layer's error about a route it had never heard of.
  const renderer = Object.hasOwn(RENDERERS, asked) ? RENDERERS[asked] : undefined;
  if (!renderer) {
    throw new Error(
      `cheatsheet: ${JSON.stringify(String(flags.renderer))} is not a renderer. ` +
        `Use ${Object.keys(RENDERERS).join(", ")}.`
    );
  }
  return { format, renderer };
}

/** `--generate` and `--document`: composes one sheet and writes it, or says what it would write. */
async function generate(flags) {
  const { format, renderer } = routeOf(flags);
  const theme = await readThemeOption(flags.theme === undefined ? undefined : String(flags.theme));
  const layout = await readLayoutOption(flags.layout === undefined ? undefined : String(flags.layout));
  const subject = await subjectOf(flags, {
    seed: flags.seed === undefined ? undefined : String(flags.seed),
    theme,
    layout,
  });
  const { doc, composition, variation } = subject;

  if (flags["data-only"]) {
    // The document as this layer reads it, in whichever of the two shapes it
    // was written in. Every committed one is compact, and both shapes are
    // permanent as of 2026.11.02 - so what the marker below reports is which
    // shape a consumer is looking at, not how long it has left.
    return {
      exit: 0,
      json: {
        command: "data-only",
        id: subject.id,
        path: subject.path,
        // Which flag named the sheet, so the two fields above can be read. They
        // are the same fields on both routes on purpose - a consumer parsing
        // this should not have to branch on which flag was typed - and they mean
        // a folder on `catalog` and a file on `document`.
        source: subject.source,
        // Read off the document rather than written out, because the marker is
        // only worth having if it can disagree with itself: a `--document`
        // route is handed whichever shape the file is in, and a consumer
        // reading `code` or `sections` out of the JSON below should not have to
        // probe for which. `isFormalDocument` is the same predicate
        // `composeSheet` branches on. See `api/cheatsheet/document.mjs`.
        shape: isFormalDocument(doc) ? "formal" : "compact",
        // Which theme and which layout answered, for the same reason: a
        // consumer reading the geometry and the stack out of the variation
        // cannot tell from the figures alone which grid they were measured on
        // or which palette they were drawn in. The theme is the flag's value
        // rather than a name out of the file, because a partial theme need not
        // carry one and the path is what a reader would look at next.
        theme: flags.theme === undefined ? "default" : String(flags.theme),
        layout: (layout ?? SHEET_LAYOUT).name,
        document: doc,
        variation,
      },
    };
  }

  return { exit: 0, ...reported(await renderSubject(subject, settingsOf(flags, format, renderer)), flags) };
}

/**
 * How a report is returned, by where the bytes went.
 *
 * @param {object} result
 * @param {Record<string, string | boolean>} flags
 */
function reported(result, flags) {
  if (flags.json) return { json: result };
  if (result.written === "-" || result.wouldWrite === "-") {
    // The bytes are on stdout, so the report goes to stderr or it corrupts
    // them. This is the one route where the two cannot share a stream.
    return flags["dry-run"] ? { text: reportOf(result) } : { stderr: reportOf(result) };
  }
  return { text: reportOf(result) };
}

/**
 * The settings every sheet in one call shares.
 *
 * Pulled out of {@link generate} when `--all` arrived, because a batch and a
 * single sheet differ in how many documents they compose and in nothing else:
 * the weight cap, the scale, the encoder and the destination rule are the
 * call's, not the sheet's. Two copies of them would be two commands that agree
 * until one is edited.
 *
 * @param {Record<string, string | boolean>} flags
 * @param {{ raster: boolean, ext: string, format: string }} format
 * @param {string} renderer
 */
function settingsOf(flags, format, renderer) {
  return {
    format,
    renderer,
    // Whether a route was named at all, which decides one note rather than the
    // render: `--renderer browser` on an SVG is reasonable to type and means
    // nothing, and the note that says so should name the flag that was typed.
    rendererNamed: flags.renderer !== undefined,
    scale: asNumber("scale", flags.scale, PRESET.longEdge / CANVAS_EDGE),
    quality: asNumber("quality", flags.quality, PRESET.quality),
    capBytes: asNumber("max-bytes", flags["max-bytes"], PRESET.capBytes),
    background:
      flags.background === undefined
        ? undefined
        : String(flags.background) === "none"
          ? null
          : String(flags.background),
    out: flags.out === undefined ? undefined : String(flags.out),
    dry: Boolean(flags["dry-run"]),
    theme: flags.theme === undefined ? "default" : String(flags.theme),
  };
}

/**
 * Renders one composed subject, writes it where the rule sends it, and reports.
 *
 * @param {object} subject What {@link subjectOf} or {@link compose} handed back.
 * @param {ReturnType<typeof settingsOf>} settings
 */
async function renderSubject(subject, settings) {
  const { composition, variation } = subject;
  const { format, renderer, scale, quality, capBytes, background } = settings;

  // The render is the published surface's as of 2026.10.31, rather than this
  // command's: one call per format, with the bytes, the route that answered and
  // whether it draws the sheet's own face all on the result. Until then this
  // branched on `format.raster` itself, called `composition.toSVG()` on one side
  // and imported `rasterizeSheet` by path on the other, and nothing a library
  // caller reached could do either.
  //
  // What stays here is the policy half: the preset's weight cap, and where a
  // render is allowed to land. Neither is the library's, and the header above
  // says why.
  const render = await renderOf(
    { composition, variation },
    format.raster
      ? {
          format: format.format,
          route: renderer,
          scale,
          quality,
          ...(background === undefined ? {} : { background }),
        }
      : { format: format.format }
  );
  const data = render.data;
  const route = render.route;
  const pixels = render.pixels;

  /** @type {string[]} */
  const notes = [...render.notes];
  if (!format.raster && settings.rendererNamed && renderer !== "auto") {
    // Not an error, because `--format svg --renderer browser` is a reasonable
    // thing to type and means nothing: the markup is the composition's own,
    // whoever would have drawn it. Said here rather than left to the surface's
    // own note so it names the flag that was typed.
    notes.push(`--renderer ${renderer} has no effect on SVG: the markup is the composition itself.`);
  }

  // Publishable is the surface's answer and the weight check together. The
  // surface knows about the alphabet and the floor; the cap is the preset's, and
  // a file over it is one the recipe should not draft a post from.
  const overCap = data.byteLength > capBytes;
  if (overCap) {
    notes.push(
      `${kb(data.byteLength)} is over the ${kb(capBytes)} a published render stays under. ` +
        (format.raster
          ? `Lower --quality below ${quality}, or --scale below ${scale.toFixed(4)}.`
          : "An SVG this large is a document to look at rather than an encoder setting.")
    );
  } else if (format.raster && data.byteLength > PRESET.targetBytes) {
    notes.push(`${kb(data.byteLength)} is over the ${kb(PRESET.targetBytes)} target and inside the cap.`);
  }
  // An SVG is the composition itself in the face the page uses, so it is
  // publishable where a built-in raster is not. That judgement is
  // `render.publishable`, measured where the alphabet and the floor are known
  // rather than restated here from the route and the scale.
  const publishable = !overCap && render.publishable;

  const target = destinationFor({
    entry: { id: subject.id, folder: subject.folder },
    format,
    out: settings.out,
    publishable,
  });
  const shown = target.stdout ? "-" : relative(root, target.path).split(sep).join("/");

  const result = {
    command: "generate",
    id: subject.id,
    source: subject.source,
    format: format.ext,
    renderer: route,
    requestedRenderer: renderer,
    theme: settings.theme,
    seed: variation.seed,
    scale: format.raster ? scale : null,
    quality: format.raster ? quality : null,
    pixels,
    bytes: data.byteLength,
    publishable,
    written: settings.dry ? null : shown,
    wouldWrite: settings.dry ? shown : null,
    notes,
  };

  if (!settings.dry) {
    // Standard output and a named file are one call, as of 2026.10.31. The
    // destination is this command's decision and the writing is the surface's,
    // which is the same division the render above follows.
    await writeRender(render, target.stdout ? "-" : target.path);
  }
  return result;
}

/**
 * `--all`: composes every cheatsheet in the catalog from its own `sheet.json`.
 *
 * **The whole point is that it is one act.** `--generate <slug>` has composed a
 * sheet through the API since 2026.10.27 and `--check` has read all of them
 * since the same day, but there was no way to *write* all of them - so the
 * answer to "how is a new cheatsheet's image produced" was 28 invocations or a
 * screenshot taken by hand. For a catalog meant to grow from one category to
 * ten, that figure is what decides the cost of writing one sheet, which is what
 * the item asking for this said.
 *
 * It composes by exactly the path a single sheet takes - {@link compose}, then
 * {@link renderSubject}, with one {@link settingsOf} for the call - so a batch
 * and a single `--generate` of the same slug write the same bytes to the same
 * place. A loop that rendered its own way would be a second command.
 *
 * **One sheet that cannot be composed does not stop the other twenty-seven.**
 * Its error is recorded against its own id and the run carries on, exiting 1 at
 * the end: somebody fixing one `sheet.json` should not have to wait for the
 * rest of the catalog, which is the reading the data file route takes about one
 * bad entry.
 *
 * **Four flags are refused rather than ranked**, because each would have to
 * mean something different in a batch than it means for one sheet, and silently
 * picking one of the two meanings is worse than saying so.
 *
 * @param {Record<string, string | boolean>} flags
 */
async function generateAll(flags) {
  if (flags.generate !== undefined || flags.slug !== undefined) {
    throw new Error(
      "cheatsheet: --all is every cheatsheet in the catalog, and --generate names one. Pass one of them."
    );
  }
  if (flags.seed !== undefined) {
    throw new Error(
      "cheatsheet: --seed is one document's seed, and --all composes every document. One seed across the " +
        "catalog would draw every sheet from the same variation. Pass --seed with --generate <slug>."
    );
  }
  if (flags.out !== undefined) {
    throw new Error(
      "cheatsheet: --out names one destination, and --all has one per cheatsheet - a publishable render " +
        "goes beside its own sheet.json, which is the rule the social recipe reads. Pass --out with " +
        "--generate <slug>."
    );
  }
  if (flags["data-only"]) {
    throw new Error(
      "cheatsheet: --data-only emits one document, and --all composes every one. `--check --json` is the " +
        "whole catalog's compositions, which is the question this would be asked for."
    );
  }
  for (const other of ["list", "check"]) {
    if (flags[other] !== undefined) {
      throw new Error(`cheatsheet: --${other} reads the catalog and --all writes it. Run them separately.`);
    }
  }

  const result = await composeEach(entriesOf(await readManifest()), flags);
  if (flags.json) return { exit: result.failed ? 1 : 0, json: result };
  return { exit: result.failed ? 1 : 0, text: reportOfAll(result) };
}

/**
 * Composes and renders a list of catalog entries, one result each.
 *
 * The loop, separated from {@link generateAll}'s flag handling, and exported
 * because this is where the carry-on behaviour above lives and it is the only
 * way to exercise it. Every committed document composes, so a failing entry has
 * to be supplied - and supplying it by moving a committed `sheet.json` aside is
 * not available: `node --test` runs the suite's files in parallel processes, and
 * three other files read those documents while this one runs. Measured on
 * 2026.11.20, when that is exactly what a first draft of the case did and three
 * unrelated files failed with `ENOENT` on the file it had moved.
 *
 * @param {Array<object>} entries Catalog entries, each with an `id` and a `path`.
 * @param {Record<string, string | boolean>} flags
 * @returns {Promise<object>} The batch result, as `--json` reports it.
 */
export async function composeEach(entries, flags) {
  const { format, renderer } = routeOf(flags);
  const theme = await readThemeOption(flags.theme === undefined ? undefined : String(flags.theme));
  const layout = await readLayoutOption(flags.layout === undefined ? undefined : String(flags.layout));
  const settings = settingsOf(flags, format, renderer);

  /** @type {object[]} */
  const results = [];
  for (const entry of entries) {
    try {
      const { folder, ...composed } = await compose(entry, { theme, layout });
      results.push(
        await renderSubject(
          { source: "catalog", id: entry.id, path: entry.path, folder, ...composed },
          settings
        )
      );
    } catch (error) {
      results.push({ command: "generate", id: entry.id, source: "catalog", error: error.message });
    }
  }

  const failed = results.filter((one) => one.error !== undefined);
  return {
    command: "generate-all",
    composed: results.length,
    written: settings.dry ? 0 : results.length - failed.length,
    format: format.ext,
    requestedRenderer: renderer,
    theme: settings.theme,
    layout: (layout ?? SHEET_LAYOUT).name,
    dryRun: settings.dry,
    failed: failed.length,
    cheatsheets: results,
  };
}

/**
 * The human readable form of a batch result.
 *
 * One line per cheatsheet and a summary, rather than {@link reportOf} twenty
 * eight times: six lines each is 168 lines of report for a run whose question
 * is "did they all compose, and where did they go". A note or an error is the
 * only thing worth a second line, and both get one.
 *
 * @param {object} result What {@link composeEach} handed back.
 * @returns {string}
 */
export function reportOfAll(result) {
  const lines = [];
  for (const one of result.cheatsheets) {
    if (one.error !== undefined) {
      lines.push(`FAIL ${one.id}`);
      lines.push(`       ${one.error}`);
      continue;
    }
    lines.push(
      `ok   ${one.id}  ${kb(one.bytes)}${one.publishable ? "" : "  not publishable"}` +
        `  -> ${one.written ?? one.wouldWrite}`
    );
    for (const note of one.notes) lines.push(`       ${note}`);
  }
  lines.push(
    `\n${result.composed} composed as ${result.format}, ` +
      (result.dryRun
        ? `${result.composed - result.failed} to write`
        : `${result.written} written`) +
      (result.failed ? `, ${result.failed} failed` : "") +
      (result.dryRun ? " - nothing was written, because --dry-run" : "")
  );
  return lines.join("\n");
}

/** The human readable form of a generate result. */
function reportOf(result) {
  const lines = [
    `${result.id}`,
    `  ${result.format}${result.pixels ? `, ${result.pixels.width}x${result.pixels.height}` : ""}, ${kb(result.bytes)}`,
    // "(asked for X)" only where a route was actually chosen and differed, so
    // the line reads as a fallback having happened rather than as one having
    // happened on every SVG, whose markup no renderer draws.
    `  drawn by: ${result.renderer}${
      result.scale !== null && result.requestedRenderer !== result.renderer
        ? ` (asked for ${result.requestedRenderer})`
        : ""
    }`,
    `  seed: ${result.seed}`,
    `  publishable: ${result.publishable ? "yes" : "no"}`,
    result.written ? `  written: ${result.written}` : `  would write: ${result.wouldWrite}`,
  ];
  for (const note of result.notes) lines.push(`  - ${note}`);
  return lines.join("\n");
}

/**
 * Runs one invocation and returns what to print, rather than printing it.
 *
 * Split this way so the cases in `tools/test-cheatsheet-cli.mjs` can call it
 * without a child process and without capturing streams - and so a caller that
 * wants the result as data has `--json` rather than a parser.
 *
 * @param {string[]} argv
 */
export async function run(argv) {
  const flags = parseFlags(argv);
  if (flags.help || flags.h || argv.length === 0) return { exit: 0, text: USAGE };
  if (flags.document !== undefined) {
    // Refused rather than ranked, because each pairing would have to drop one
    // of the two things that were asked for. A slug and a document are two
    // answers to "which sheet"; `--list` and `--check` are questions about the
    // catalog, and a document read by path is not in it.
    if (flags.generate !== undefined || flags.slug !== undefined) {
      throw new Error(
        "cheatsheet: --document and --generate name the sheet two different ways. Pass one: a slug " +
          "for a cheatsheet in the catalog, a path for a JSON document anywhere."
      );
    }
    for (const other of ["list", "check", "all"]) {
      if (flags[other] !== undefined) {
        throw new Error(
          `cheatsheet: --${other} reads the catalog, and --document is a file outside it. ` +
            "Run them separately."
        );
      }
    }
    return generate(flags);
  }
  if (flags.all) return generateAll(flags);
  if (flags.list) return listCatalog({ json: Boolean(flags.json) });
  if (flags.check !== undefined) {
    const slug = flags.check === true ? flags.slug : flags.check;
    return checkSheets({ slug: slug === undefined ? undefined : String(slug), json: Boolean(flags.json) });
  }
  if (flags.generate !== undefined || flags.slug !== undefined) return generate(flags);
  throw new Error("cheatsheet: nothing to do. Run `--help` for the five commands.");
}

// Only when invoked, not when imported by the test file beside it.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = await run(process.argv.slice(2));
    if (result.json !== undefined) console.log(JSON.stringify(result.json, null, 2));
    if (result.text !== undefined) console.log(result.text);
    if (result.stderr !== undefined) console.error(result.stderr);
    process.exitCode = result.exit;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
