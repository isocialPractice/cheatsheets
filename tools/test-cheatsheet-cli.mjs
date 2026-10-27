// Checks for `tools/cheatsheet.mjs`, the command line that composes a sheet and
// renders it to a media file.
//
// **The module is imported rather than spawned.** `run(argv)` returns what to
// print instead of printing it, which is what makes that possible: the cases
// below read a result object rather than parsing a stream, and one Node process
// composes every sheet it needs. A child process per case would also pay the
// composition cost again each time, and composing the whole catalog is one of
// the things checked here.
//
// What is split, and why:
//
// - **The flag parsing, the destination rule and the catalog lookup run
//   anywhere.** They are the parts a bare clone can hold the command to, and
//   they are the parts most likely to be got wrong - a refusal that reads as
//   "unknown flag", a render written where the social recipe will draft a post
//   from it.
// - **Anything that writes goes to `.tmp/`**, through `--out`, and the folder is
//   cleaned afterwards. Nothing in this file writes beside a `sheet.json`: that
//   is the one destination the recipe watches, and a test that put a render
//   there would have the tool drafting a post for a file a test made up.
// - **The browser route is behind the same skip as every other browser file
//   here.** Playwright is looked for at run time by the raster layer itself, so
//   the cases below ask it rather than resolving a copy of their own.
//
// Run with: node --test tools/test-cheatsheet-cli.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { MIN_PUBLISH_SCALE, resolveChromium } from "../api/cheatsheet/raster.mjs";
import { destinationFor, findEntry, parseFlags, run } from "./cheatsheet.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scratch = join(root, ".tmp", "cheatsheet-cli-cases");
const manifest = JSON.parse(readFileSync(join(root, "cheatsheets.json"), "utf8"));
const source = readFileSync(join(root, "tools", "cheatsheet.mjs"), "utf8");

/** A sheet from each half of the catalog, so neither is the only one exercised. */
const RUNNABLE = "javascript/arrays/splicing-arrays";
const EMBEDDED = "html-css/html-apis/web-storage";

const { chromium, reason } = await resolveChromium();
const skip = chromium ? false : reason;

after(async () => {
  await rm(scratch, { recursive: true, force: true });
});

/** Whether a path is there at all. */
const exists = (path) =>
  stat(path).then(
    () => true,
    () => false
  );

// ## The flags
//
// No composition, no disk: these are the cases a clone with nothing installed
// runs, and they cover the two mistakes that are expensive to make.

test("a flag the specification names and the layer cannot do yet is refused by name", () => {
  // Accepted and ignored is the one outcome worse than either: a caller would
  // believe a sheet had been composed to a layout it had not. Both messages
  // say where the missing piece is queued, so the refusal is a pointer rather
  // than a wall.
  for (const flag of ["--layout", "--script"]) {
    assert.throws(
      () => parseFlags(["--generate", RUNNABLE, flag, "something"]),
      (error) => {
        assert.match(error.message, new RegExp(`${flag} is not implemented yet`));
        assert.match(error.message, /Implement Cheatsheet API/);
        return true;
      },
      `${flag} was not refused`
    );
  }
});

test("a value flag with nothing after it says which flag it was", () => {
  assert.throws(() => parseFlags(["--generate"]), /--generate needs a value/);
  assert.throws(() => parseFlags(["--format", "--json"]), /--format needs a value/);
});

test("the switches take no value, so a slug after one is the positional", () => {
  // `--check <slug>` is the shape the specification writes, and it only works
  // if `--check` does not swallow the slug as its own value.
  const flags = parseFlags(["--check", RUNNABLE, "--json"]);
  assert.equal(flags.check, true);
  assert.equal(flags.slug, RUNNABLE);
  assert.equal(flags.json, true);
});

test("and a second positional is an error rather than the last one winning", () => {
  assert.throws(() => parseFlags(["--check", RUNNABLE, EMBEDDED]), /is a second slug/);
});

test("`-` is a value and not a flag, so --out - reaches standard output", () => {
  assert.equal(parseFlags(["--out", "-"]).out, "-");
});

test("a flag this command does not take is refused rather than collected and ignored", () => {
  // The same fault `--layout` is refused for, reached by a shorter road. A
  // typo was taken, dropped into the flags object and never read again, so
  // `--fomat webp` rendered the default format and `--output` left the
  // destination at its default - which for a publishable render is beside the
  // cheatsheet's own `sheet.json`, the one place the social recipe drafts a
  // post from. Both report success.
  for (const typo of ["--fomat", "--output", "--maxbytes", "--renderrer"]) {
    assert.throws(
      () => parseFlags(["--generate", RUNNABLE, typo, "webp"]),
      new RegExp(`${typo} is not a flag this command takes`),
      `${typo} was accepted`
    );
  }
  // And every flag the usage block names still parses, so the new list is a
  // guard rather than a second place to keep the command's own vocabulary -
  // a flag documented and refused is the way this fix could go wrong.
  const documented = [...source.matchAll(/^ {2}(--[a-z-]+)/gm)].map((match) => match[1]);
  assert.ok(documented.length >= 12, `read ${documented.length} flags out of the usage block`);
  for (const flag of documented) {
    assert.doesNotThrow(() => parseFlags([flag, "x"]), `${flag} is documented and refused`);
  }
});

test("a format or renderer named after an Object property is not one", async () => {
  // `FORMATS` and `RENDERERS` are object literals, so an unguarded lookup
  // answers for every key on `Object.prototype` too. `--format constructor`
  // got past the guard, drew SVG because the entry it found had no `raster`,
  // and reported `publishable: yes` for bytes bound for `sheet.undefined`
  // beside a committed cheatsheet.
  for (const key of ["constructor", "__proto__"]) {
    await assert.rejects(
      run(["--generate", RUNNABLE, "--format", key, "--dry-run"]),
      /is not a format this command writes/,
      `--format ${key} was taken for a format`
    );
    await assert.rejects(
      run(["--generate", RUNNABLE, "--renderer", key, "--format", "webp", "--dry-run"]),
      /is not a renderer/,
      `--renderer ${key} was taken for a renderer`
    );
  }
});

// ## The catalog lookup

test("a slug is found by its manifest id and by its folder path", () => {
  const entries = manifest.categories.flatMap((category) => category.cheatsheets);
  assert.equal(findEntry(entries, RUNNABLE).id, RUNNABLE);
  // What a person has in their shell after a `cd`, separators and all.
  assert.equal(findEntry(entries, RUNNABLE.split("/").join(sep)).id, RUNNABLE);
  assert.equal(findEntry(entries, `${RUNNABLE}/`).id, RUNNABLE);
});

test("and a slug that names nothing suggests what it might have meant", () => {
  const entries = manifest.categories.flatMap((category) => category.cheatsheets);
  assert.throws(
    () => findEntry(entries, "splicing-arrays"),
    (error) => {
      assert.match(error.message, /no cheatsheet is named/);
      assert.match(error.message, /javascript\/arrays\/splicing-arrays/);
      return true;
    }
  );
  assert.throws(() => findEntry(entries, "nothing-like-this"), /Run `--list`/);
});

// ## Where a render is written
//
// The rule the social recipe depends on, held directly. Everything below reads
// `destinationFor`, which is exported for exactly this: the alternative is
// asserting it by writing files beside real cheatsheets, which is the one place
// a test must not write.

test("a publishable render goes beside its own sheet.json", () => {
  const entry = { id: EMBEDDED, path: EMBEDDED };
  const { path, stdout } = destinationFor({
    entry,
    format: { raster: true, ext: "webp" },
    out: undefined,
    publishable: true,
  });
  assert.equal(stdout, false);
  assert.equal(path, join(root, ...EMBEDDED.split("/"), "sheet.webp"));
});

test("and an unpublishable one goes to .tmp/, which the recipe cannot see into", () => {
  // The whole reason the rule exists: `**/*.{jpg,webp}` across the working tree
  // would draft a post from a built-in-alphabet render, which shows a reader a
  // typeface the page never uses.
  const { path } = destinationFor({
    entry: { id: EMBEDDED, path: EMBEDDED },
    format: { raster: true, ext: "webp" },
    out: undefined,
    publishable: false,
  });
  const where = path.slice(root.length + 1).split(sep);
  assert.equal(where[0], ".tmp");
  // Named by slug, because the folder is flat and two sheets would otherwise
  // overwrite each other's render.
  assert.match(where[1], /^html-css\.html-apis\.web-storage\./);
});

test("--out names a file by its extension and a directory by the lack of one", () => {
  const entry = { id: EMBEDDED, path: EMBEDDED };
  const format = { raster: true, ext: "webp" };
  const asFile = destinationFor({ entry, format, out: ".tmp/one.webp", publishable: true });
  assert.equal(asFile.path, join(root, ".tmp", "one.webp"));
  for (const given of [".tmp/here", ".tmp/here/"]) {
    const asDirectory = destinationFor({ entry, format, out: given, publishable: true });
    assert.equal(asDirectory.path, join(root, ".tmp", "here", "sheet.webp"), given);
  }
  assert.deepEqual(destinationFor({ entry, format, out: "-", publishable: true }), {
    path: "-",
    stdout: true,
  });
});

test("and a dot directory is a directory, not a file with a long extension", () => {
  // `.tmp` ends in `.tmp`, so the extension test matched it and `--out .tmp` -
  // the example the rule is written around, and the folder this command sends
  // every unpublishable render to - resolved to the folder itself and failed
  // the write with `EISDIR`. The leading dots come off the last segment before
  // the extension is looked for.
  const entry = { id: EMBEDDED, path: EMBEDDED };
  const format = { raster: true, ext: "webp" };
  for (const given of [".tmp", ".tmp/", ".tmp/.staging"]) {
    const { path } = destinationFor({ entry, format, out: given, publishable: false });
    assert.equal(path, join(root, given.replace(/\/$/, "").split("/").join(sep), "sheet.webp"), given);
  }
  // And a dotfile that does carry an extension is still a file.
  assert.equal(
    destinationFor({ entry, format, out: ".tmp/.hidden.webp", publishable: false }).path,
    join(root, ".tmp", ".hidden.webp")
  );
});

test("and --out is obeyed whether or not the render may be published", () => {
  // A thumbnail and a geometry target are both legitimate, so the destination
  // is the caller's to name. What is not the caller's is the default.
  const entry = { id: EMBEDDED, path: EMBEDDED };
  const format = { raster: true, ext: "png" };
  for (const publishable of [true, false]) {
    assert.equal(
      destinationFor({ entry, format, out: ".tmp/forced.png", publishable }).path,
      join(root, ".tmp", "forced.png")
    );
  }
});

// ## The preset

test("every raster default is the preset in CONTRIBUTING.md rather than a figure chosen here", () => {
  // Read off the document, so a preset changed there and not here is a failure
  // rather than a drift nobody notices. The scale is the one that matters: a
  // literal 2 is the misreading `api/cheatsheet/raster.mjs` warns about, and
  // would ask for a 7200 square image.
  const contributing = readFileSync(join(root, "CONTRIBUTING.md"), "utf8");
  const preset = contributing.slice(contributing.indexOf("### The preset a render is written at"));
  const stated = preset.slice(0, preset.indexOf("\n## "));
  assert.match(stated, /\| Quality \| 80 \|/);
  assert.match(stated, /\| Long edge \| 1400 px/);
  assert.match(stated, /\| Target weight \| 200 KB \|/);
  assert.match(stated, /\| Hard cap \| 300 KB \|/);

  assert.match(source, /quality: 80,/);
  assert.match(source, /longEdge: 1400,/);
  assert.match(source, /targetBytes: 200 \* 1024,/);
  assert.match(source, /capBytes: 300 \* 1024,/);
  // Derived from the long edge rather than written twice.
  assert.match(source, /PRESET\.longEdge \/ CANVAS_EDGE/);
  assert.doesNotMatch(source, /scale,\s*2\b/);
});

test("and the preset's long edge clears the floor under which the code face greys out", () => {
  assert.ok(
    1400 / 3600 > MIN_PUBLISH_SCALE,
    `the preset's scale of ${(1400 / 3600).toFixed(4)} is under the ${MIN_PUBLISH_SCALE.toFixed(4)} floor`
  );
});

// ## What the three commands report

test("--list names every cheatsheet in the catalog, with its kind", async () => {
  const { exit, json } = await run(["--list", "--json"]);
  assert.equal(exit, 0);
  const expected = manifest.categories.flatMap((category) => category.cheatsheets);
  assert.equal(json.count, expected.length);
  assert.deepEqual(
    json.cheatsheets.map((entry) => entry.id),
    expected.map((entry) => entry.id)
  );
  for (const entry of json.cheatsheets) {
    assert.ok(["run", "read", "embed", "none"].includes(entry.kind), `${entry.id} has kind ${entry.kind}`);
  }
});

test("--check composes the whole catalog and reports it clean", async () => {
  // The one invocation worth having: "does anything no longer compose clean" is
  // the question a person asks, and asking it per sheet is 28 calls. It is also
  // the only case here that exercises the composition of every committed
  // document.
  const { exit, json } = await run(["--check", "--json"]);
  assert.equal(json.checked, manifest.categories.flatMap((category) => category.cheatsheets).length);
  const faults = json.cheatsheets.filter(
    (sheet) => !sheet.codeFits || !sheet.runsFit || !sheet.contrastHolds
  );
  assert.deepEqual(faults.map((sheet) => sheet.id), [], "these sheets no longer compose clean");
  assert.equal(json.clean, true);
  assert.equal(exit, 0);
});

test("and a named slug checks that sheet alone", async () => {
  const { json } = await run(["--check", EMBEDDED, "--json"]);
  assert.equal(json.checked, 1);
  assert.equal(json.cheatsheets[0].id, EMBEDDED);
});

test("--data-only emits the document and what the composition chose, and writes nothing", async () => {
  const before = await exists(join(root, ...RUNNABLE.split("/"), "sheet.svg"));
  const { json } = await run(["--generate", RUNNABLE, "--data-only"]);
  assert.equal(json.command, "data-only");
  assert.equal(json.id, RUNNABLE);
  // Said in the output rather than only in the header: this is the provisional
  // shape, and the formal document model is still **Implement Cheatsheet API**'s.
  assert.equal(json.shape, "provisional");
  assert.equal(typeof json.document.title, "string");
  assert.ok(Array.isArray(json.document.code));
  assert.equal(typeof json.variation.seed, "number");
  assert.equal(await exists(join(root, ...RUNNABLE.split("/"), "sheet.svg")), before);
});

test("--dry-run names the file it would write and leaves the disk alone", async () => {
  const out = join(scratch, "dry");
  const { json } = await run(["--generate", RUNNABLE, "--out", out, "--dry-run", "--json"]);
  assert.equal(json.written, null);
  assert.match(json.wouldWrite, /dry\/sheet\.svg$/);
  assert.equal(await exists(join(out, "sheet.svg")), false);
});

// ## The SVG route, which needs no renderer

test("the SVG route writes the composition's own markup", async () => {
  const out = join(scratch, "vector", "sheet.svg");
  const { json } = await run(["--generate", RUNNABLE, "--out", out, "--json"]);
  assert.equal(json.format, "svg");
  assert.equal(json.renderer, "composition");
  assert.equal(json.scale, null, "an SVG has no device pixels to scale");
  assert.equal(json.publishable, true, "the vector is the face the page draws, so it may be published");
  const markup = await readFile(out, "utf8");
  assert.match(markup, /^<\?xml /);
  assert.match(markup, /<svg /);
});

test("and says a renderer has no effect on it rather than pretending one drew it", async () => {
  // `--format svg --renderer browser` is a reasonable thing to type and means
  // nothing. Reporting the browser as the renderer would be a lie about which
  // alphabet made the file, which is the one thing `--renderer auto` exists to
  // report honestly.
  const { json } = await run([
    "--generate",
    RUNNABLE,
    "--renderer",
    "builtin",
    "--out",
    join(scratch, "ignored.svg"),
    "--json",
  ]);
  assert.equal(json.renderer, "composition");
  assert.ok(
    json.notes.some((note) => note.includes("has no effect on SVG")),
    `the notes were ${JSON.stringify(json.notes)}`
  );
});

test("the same seed renders the same bytes, which is what a seed is for", async () => {
  const first = join(scratch, "seeded-a.svg");
  const second = join(scratch, "seeded-b.svg");
  await run(["--generate", RUNNABLE, "--seed", "a-fixed-seed", "--out", first]);
  await run(["--generate", RUNNABLE, "--seed", "a-fixed-seed", "--out", second]);
  assert.equal(await readFile(first, "utf8"), await readFile(second, "utf8"));

  const other = join(scratch, "seeded-c.svg");
  await run(["--generate", RUNNABLE, "--seed", "a-different-seed", "--out", other]);
  assert.notEqual(
    await readFile(first, "utf8"),
    await readFile(other, "utf8"),
    "two seeds produced the same composition, so the seed reaches nothing"
  );
});

// ## The formats and the themes it refuses

test("a format with no consumer here is refused, not substituted", async () => {
  // A caller who writes `sheet.gif` and receives a PNG has a file that lies
  // about itself.
  await assert.rejects(
    () => run(["--generate", RUNNABLE, "--format", "gif", "--dry-run"]),
    /not a format this command writes/
  );
});

test("`jpg` on the way in is `jpeg` on the way to the encoder, and `jpg` on disk", () => {
  // The extension and the codec name differ, and the social recipe watches the
  // extension: a file called `sheet.jpeg` matches none of `**/*.{jpg,webp}`.
  assert.match(source, /jpg: \{ raster: true, ext: "jpg", mime: "image\/jpeg", route: "jpeg" \}/);
});

test("a renderer that is not one of the three is refused", async () => {
  await assert.rejects(
    () => run(["--generate", RUNNABLE, "--renderer", "imagemagick", "--dry-run"]),
    /is not a renderer/
  );
});

test("a theme name that is not recorded says what is, rather than falling back to it", async () => {
  await assert.rejects(
    () => run(["--generate", RUNNABLE, "--theme", "midnight", "--dry-run"]),
    /not a design language this repository records/
  );
  await assert.rejects(
    () => run(["--generate", RUNNABLE, "--theme", "./nowhere.json", "--dry-run"]),
    /could not be read/
  );
});

test("a scale or quality that is not a number names the flag it came from", async () => {
  await assert.rejects(
    () => run(["--generate", RUNNABLE, "--format", "png", "--scale", "big", "--dry-run"]),
    /--scale takes a number/
  );
  await assert.rejects(
    () => run(["--generate", RUNNABLE, "--format", "png", "--quality", "best", "--dry-run"]),
    /--quality takes a number/
  );
});

// ## The raster routes

test("the built-in route comes back unpublishable, and so is not written beside a sheet", { skip }, async () => {
  const { json } = await run([
    "--generate",
    EMBEDDED,
    "--format",
    "png",
    "--renderer",
    "builtin",
    "--dry-run",
    "--json",
  ]);
  assert.equal(json.renderer, "builtin");
  assert.equal(json.publishable, false);
  // The destination, which is the half that matters: this file must not be
  // where the social recipe looks.
  assert.match(json.wouldWrite, /^\.tmp\//);
  assert.ok(
    json.notes.some((note) => note.includes("single stroke alphabet")),
    "the report does not say which alphabet drew it"
  );
});

test("the browser route draws in the face the design language measured", { skip }, async () => {
  const out = join(scratch, "raster", "sheet.webp");
  const { json } = await run([
    "--generate",
    EMBEDDED,
    "--format",
    "webp",
    "--renderer",
    "browser",
    "--out",
    out,
    "--json",
  ]);
  assert.equal(json.renderer, "browser");
  assert.equal(json.publishable, true);
  // The preset's long edge, applied: 1400 of the canvas's 3600.
  assert.deepEqual(json.pixels, { width: 1400, height: 1400 });
  const bytes = await readFile(out);
  // Actually a WebP, rather than a PNG wearing the extension.
  assert.equal(Buffer.from(bytes.subarray(0, 4)).toString("latin1"), "RIFF");
  assert.equal(Buffer.from(bytes.subarray(8, 12)).toString("latin1"), "WEBP");
  assert.equal(bytes.byteLength, json.bytes);
});

test("and lands inside the preset's weight target without being asked to", { skip }, async () => {
  // The figures in `CONTRIBUTING.md` were measured at this preset, so a render
  // at the defaults should need no tuning. A sheet over the 200 KB target is
  // reported and still publishable; one over the 300 KB cap is not.
  const { json } = await run(["--generate", EMBEDDED, "--format", "webp", "--dry-run", "--json"]);
  assert.ok(
    json.bytes < 200 * 1024,
    `${(json.bytes / 1024).toFixed(1)} KB is over the preset's own target at the preset's own settings`
  );
});

test("a render over the weight cap is marked unpublishable and diverted", { skip }, async () => {
  // Forced with `--max-bytes` rather than by finding a sheet heavy enough: the
  // rule is about the cap, not about any one sheet, and the catalog is meant to
  // stay inside it.
  const { json } = await run([
    "--generate",
    EMBEDDED,
    "--format",
    "webp",
    "--max-bytes",
    "1024",
    "--dry-run",
    "--json",
  ]);
  assert.equal(json.publishable, false);
  assert.match(json.wouldWrite, /^\.tmp\//);
  assert.ok(
    json.notes.some((note) => note.includes("over the 1.0 KB")),
    `the notes were ${JSON.stringify(json.notes)}`
  );
});

test("a raster under the publish floor is produced, marked and diverted", { skip }, async () => {
  const under = MIN_PUBLISH_SCALE / 2;
  const { json } = await run([
    "--generate",
    EMBEDDED,
    "--format",
    "png",
    "--scale",
    String(under),
    "--dry-run",
    "--json",
  ]);
  assert.equal(json.publishable, false, "a thumbnail came back publishable");
  assert.match(json.wouldWrite, /^\.tmp\//);
  assert.ok(
    json.notes.some((note) => note.includes("under the")),
    `the notes were ${JSON.stringify(json.notes)}`
  );
});

test("--renderer auto reports which route answered, whichever it was", async () => {
  // The first of the three rules the specification calls a constraint rather
  // than a preference: a file that does not say which alphabet made it cannot
  // be reviewed against the design language. This case runs with or without a
  // browser, because either answer satisfies it - what it refuses is `auto`
  // being echoed back as though it were a renderer.
  const { json } = await run([
    "--generate",
    EMBEDDED,
    "--format",
    "png",
    "--renderer",
    "auto",
    "--dry-run",
    "--json",
  ]);
  assert.equal(json.requestedRenderer, "auto");
  assert.ok(["browser", "builtin"].includes(json.renderer), `auto reported ${json.renderer}`);
  assert.equal(json.renderer === "browser", Boolean(chromium), "auto took a route the machine does not have");
  if (json.renderer === "builtin") {
    assert.ok(
      json.notes.some((note) => note.includes("Fell back")),
      "the fallback was not recorded"
    );
  }
});

test("--renderer browser is a requirement rather than a preference", { skip: chromium ? "a browser is installed here" : false }, async () => {
  // The other half of the same rule, and the half only a machine without a
  // browser can check: asked for the browser and given the built-in alphabet
  // silently, every published sheet would be in the wrong typeface.
  await assert.rejects(
    () => run(["--generate", EMBEDDED, "--format", "png", "--renderer", "browser", "--dry-run"]),
    /needs a browser/
  );
});
