// The command line that composes a cheatsheet and renders it to a media file.
//
// This is the automation surface: one call produces the file a social post
// needs, naming the format, the design language, the seed and - the part that
// matters most - which of the two renderers answered.
//
//     node tools/cheatsheet.mjs --generate <slug> [options]
//     node tools/cheatsheet.mjs --list            [--json]
//     node tools/cheatsheet.mjs --check [<slug>]  [--json]
//     node tools/cheatsheet.mjs --help
//
// There is no `package.json` here and so no installable `bin`, which is why it
// is invoked by path. Nothing is installed for it either: the composition is
// this repository's own code, and the one optional dependency - a browser - is
// resolved at run time and reported rather than required.
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
// ## Two flags are recognised and refused
//
// `--layout` and `--script` are in the specification this was written from and
// have nothing behind them yet: `composeSheet` takes no named layout, and a
// demo payload is not an input to a composition - the `code` array is the
// content. Both belong to the document, theme and layout models under
// **Implement Cheatsheet API** in `TODO.md`. They are refused by name with that
// said, rather than accepted and ignored, which is the one outcome that would
// leave a caller believing a sheet had been composed to a layout it had not.
//
// Run with: node tools/cheatsheet.mjs --help
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { composeSheet, prepareAccents, SHEET_LANGUAGE } from "../api/cheatsheet/index.mjs";
import { MIN_PUBLISH_SCALE, rasterizeSheet } from "../api/cheatsheet/raster.mjs";
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

/** The formats this command writes, and what each is. */
const FORMATS = {
  svg: { raster: false, ext: "svg", mime: "image/svg+xml" },
  png: { raster: true, ext: "png", mime: "image/png", route: "png" },
  webp: { raster: true, ext: "webp", mime: "image/webp", route: "webp" },
  // `jpg` on the way in and `jpeg` on the way to the raster layer, which names
  // the codec rather than the extension. A file called `sheet.jpeg` would not
  // match the social recipe's `**/*.{jpg,webp}`.
  jpg: { raster: true, ext: "jpg", mime: "image/jpeg", route: "jpeg" },
};

/** The renderers, as the command line names them. */
const RENDERERS = { auto: "auto", browser: "browser", builtin: "builtin" };

/** Flags that take no value. */
// `--check` is here rather than among the value flags because its slug is
// optional: bare, it checks the whole catalog, and a slug after it is read as
// the positional below.
const SWITCHES = new Set(["--check", "--data-only", "--dry-run", "--json", "--list", "--help", "-h"]);

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
  "--format",
  "--renderer",
  "--theme",
  "--seed",
  "--scale",
  "--quality",
  "--background",
  "--max-bytes",
  "--out",
]);

/** Flags recognised so they can be refused with a reason rather than as unknown. */
const NOT_YET = {
  "--layout":
    "a named layout is the layout model's, and `composeSheet` takes no layout: a sheet composes " +
    "to the one algorithm the design language records. Queued under `## Implement Cheatsheet API`",
  "--script":
    "a demo payload is not an input to a composition - the document's `code` array is the content, " +
    "and the payload is what the page runs or frames beside the graphic. Queued under " +
    "`## Implement Cheatsheet API`",
};

const USAGE = `
node tools/cheatsheet.mjs --generate <slug> [options]
node tools/cheatsheet.mjs --list            [--json]
node tools/cheatsheet.mjs --check [<slug>]  [--json]

  --generate <slug>      The cheatsheet to compose, by manifest slug or folder path
  --format <fmt>         svg (default), png, webp or jpg. The preset's raster format is ${PRESET.format}
  --renderer <r>         auto (default), browser, or builtin
  --theme <name|path>    default (the recorded design language), or a path to a JSON one
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
it is not. See the header of this file for why that is a rule.
`.trimStart();

/**
 * Reads the command line into an options object.
 *
 * Hand rolled rather than `node:util`'s `parseArgs`, for one reason: an unknown
 * flag has to be able to say more than "unknown". `--layout` is a flag somebody
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
 * The design language to compose against.
 *
 * One name today, `default`, and a path for anything else. The catalog has one
 * recorded language - `SHEET_LANGUAGE`, measured off the eleven images - and a
 * second would be a file rather than a name in here, so a name that is not
 * `default` is an error that says what the options are rather than silently
 * falling back to the only one.
 *
 * @param {string | undefined} named
 */
async function readTheme(named) {
  if (named === undefined || named === "default") return undefined;
  if (!/[\\/.]/.test(named)) {
    throw new Error(
      `cheatsheet: ${JSON.stringify(named)} is not a design language this repository records. ` +
        "There is one, `default`; anything else is a path to a JSON language object."
    );
  }
  const path = resolve(root, named);
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`cheatsheet: the theme at ${named} could not be read. (${error.message})`);
  }
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
 * Composes one entry's document.
 *
 * The accent reader and the brand assets are both loaded, because the point of
 * this command is a file somebody looks at: without the reader the code panel
 * is one colour per line rather than one per token, and without the brand the
 * masthead sets a lone wordmark. Neither is required - each falls back to what
 * the sheet drew before it existed - and what happened to each is reported.
 *
 * @param {object} entry
 * @param {{ seed?: string, language?: object }} options
 */
async function compose(entry, options) {
  const folder = join(root, ...entry.path.split("/"));
  const doc = JSON.parse(await readFile(join(folder, "sheet.json"), "utf8"));
  const [reader, brand] = await Promise.all([prepareAccents(), readBrandAssets(root)]);
  const { composition, variation } = composeSheet(doc, {
    seed: options.seed ?? doc.seed ?? entry.seed,
    brand,
    ...(options.language ? { language: options.language } : {}),
  });
  return { folder, doc, composition, variation, reader };
}

/**
 * Where a render is written, and whether it may be published from there.
 *
 * @param {object} config
 * @param {object} config.entry
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
    // The extension is looked for in the last segment with its leading dots
    // taken off first, or a dot directory reads as an extension and nothing
    // else: `.tmp` ends in `.tmp`, so `--out .tmp` resolved to the folder
    // itself and the write failed with `EISDIR` on the folder this command
    // sends every unpublishable render to.
    const last = out.split(/[\\/]/).pop();
    const looksLikeDirectory =
      /[\\/]$/.test(out) || !/\.[A-Za-z0-9]+$/.test(last.replace(/^\.+/, ""));
    return {
      path: looksLikeDirectory ? join(given, `sheet.${format.ext}`) : given,
      stdout: false,
    };
  }
  if (publishable) {
    return { path: join(root, ...entry.path.split("/"), `sheet.${format.ext}`), stdout: false };
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

/** `--generate`: composes one sheet and writes it, or says what it would write. */
async function generate(flags) {
  const slug = String(flags.generate === true ? flags.slug ?? "" : flags.generate ?? flags.slug ?? "");
  if (!slug) throw new Error("cheatsheet: --generate needs a cheatsheet to compose. Run `--list` to see them.");

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

  const entries = entriesOf(await readManifest());
  const entry = findEntry(entries, slug);
  const language = await readTheme(flags.theme === undefined ? undefined : String(flags.theme));
  const { doc, composition, variation } = await compose(entry, {
    seed: flags.seed === undefined ? undefined : String(flags.seed),
    language,
  });

  if (flags["data-only"]) {
    // The document as this layer reads it, which is the provisional shape
    // rather than the formal model: that is **Implement Cheatsheet API**'s, and
    // a consumer of this output should expect it to grow fields.
    return {
      exit: 0,
      json: {
        command: "data-only",
        id: entry.id,
        path: entry.path,
        shape: "provisional",
        document: doc,
        variation,
      },
    };
  }

  const scale = asNumber("scale", flags.scale, PRESET.longEdge / CANVAS_EDGE);
  const quality = asNumber("quality", flags.quality, PRESET.quality);
  const capBytes = asNumber("max-bytes", flags["max-bytes"], PRESET.capBytes);
  const background =
    flags.background === undefined
      ? undefined
      : String(flags.background) === "none"
        ? null
        : String(flags.background);

  /** @type {string[]} */
  const notes = [...variation.notes];
  /** @type {Uint8Array} */
  let data;
  let route = "composition";
  let pixels = null;

  if (!format.raster) {
    if (flags.renderer !== undefined && renderer !== "auto") {
      // Not an error, because `--format svg --renderer browser` is a
      // reasonable thing to type and means nothing: the markup is the
      // composition's own, whoever would have drawn it.
      notes.push(`--renderer ${renderer} has no effect on SVG: the markup is the composition itself.`);
    }
    data = new TextEncoder().encode(composition.toSVG());
  } else {
    const raster = await rasterizeSheet(composition, {
      route: renderer,
      format: format.route,
      scale,
      quality,
      ...(background === undefined ? {} : { background }),
    });
    data = raster.data;
    route = raster.route;
    pixels = { width: raster.width, height: raster.height };
    notes.push(...raster.notes);
  }

  // Publishable is the raster layer's answer and the weight check together. The
  // layer knows about the alphabet and the floor; the cap is the preset's, and
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
  // publishable where a built-in raster is not.
  const publishable = !overCap && (format.raster ? route === "browser" && scale >= MIN_PUBLISH_SCALE : true);

  const out = flags.out === undefined ? undefined : String(flags.out);
  const target = destinationFor({ entry, format, out, publishable });
  const shown = target.stdout ? "-" : relative(root, target.path).split(sep).join("/");

  const result = {
    command: "generate",
    id: entry.id,
    format: format.ext,
    renderer: route,
    requestedRenderer: renderer,
    theme: flags.theme === undefined ? "default" : String(flags.theme),
    seed: variation.seed,
    scale: format.raster ? scale : null,
    quality: format.raster ? quality : null,
    pixels,
    bytes: data.byteLength,
    publishable,
    written: flags["dry-run"] ? null : shown,
    wouldWrite: flags["dry-run"] ? shown : null,
    notes,
  };

  if (!flags["dry-run"]) {
    if (target.stdout) {
      process.stdout.write(data);
    } else {
      await mkdir(dirname(target.path), { recursive: true });
      await writeFile(target.path, data);
    }
  }

  if (flags.json) return { exit: 0, json: result };
  if (target.stdout && !flags["dry-run"]) {
    // The bytes are on stdout, so the report goes to stderr or it corrupts
    // them. This is the one route where the two cannot share a stream.
    return { exit: 0, stderr: reportOf(result) };
  }
  return { exit: 0, text: reportOf(result) };
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
  if (flags.list) return listCatalog({ json: Boolean(flags.json) });
  if (flags.check !== undefined) {
    const slug = flags.check === true ? flags.slug : flags.check;
    return checkSheets({ slug: slug === undefined ? undefined : String(slug), json: Boolean(flags.json) });
  }
  if (flags.generate !== undefined || flags.slug !== undefined) return generate(flags);
  throw new Error("cheatsheet: nothing to do. Run `--help` for the three commands.");
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
