// A real run against each committed fixture root, compared with committed
// output.
//
// ## Why this is not covered by the cases beside it
//
// `tools/test-fixture-site.mjs` runs the tool against a copy of `fixtures/site/`
// and reads the result: the folder it resolved, the names it planned, a handful
// of sentences inside the pages. `tools/test-cheatsheet-site.mjs` builds its own
// trees in the temporary folder and asserts a property per case. Both are real
// coverage, and both have the same blind spot the renderers had until
// `tools/test-render-fixture.mjs` existed: **nothing in the repository says what
// a generated page is supposed to look like.** A page that started composing its
// figure at half the size, carrying its blocks in the other order, or linking a
// menu one folder too high would pass every assertion either file makes.
//
// So the output is committed. `fixtures/expected/<root>/` holds every file a run
// creates or changes in that root, at the path it lands at, and these cases run
// the tool and compare the two byte for byte.
//
// ## What that pins, which is more than the scripted tool
//
// A generated page is the tool's page shape wrapped around **the API's
// composition**: `siteDocument` builds a sheet document out of what the
// collector found and `renderFragment` on the published surface composes it, so
// the `<svg>` in every expected page is `api/cheatsheet/` rendering material
// read off the fixture. A change to the layout, the type measurement, the theme
// or the seed moves those bytes and fails here, which is what makes this the one
// place the two halves of the site tooling are held together.
//
// What it does not reach is the browser route reading a live document - that is
// `tools/test-site-pages-browser.mjs`, which drives the fixture through an
// engine and skips where none is installed, and `tools/test-browser-entry.mjs`,
// which holds the same module against a hand written DOM with nothing installed
// at all.
//
// ## What is compared, and what a difference means
//
// | Compared | A difference means |
// | --- | --- |
// | The set of files a run created or changed | The tool wrote somewhere new, or stopped writing somewhere |
// | Every generated page, byte for byte | The page shape, the carried material or the composition moved |
// | The manifest beside them | What a run records about itself changed |
// | The pages whose menus were filled | A menu's markup, its entries or its links moved |
// | That nothing was deleted | A run removed a file of the site owner's |
//
// The last row is why the comparison is a **diff of the tree** rather than a
// read of the output folder. A run writes into pages the site owner keeps, so
// the question is not only what landed in `cheatsheets/` - it is what in their
// checkout is not what it was.
//
// ## Two roots, because they end differently
//
// | Root | A run | Ends |
// | --- | --- | --- |
// | `fixtures/site/` | Writes five pages and a manifest, and fills two menus | 0, with nothing to report |
// | `fixtures/site-taken/` | Resolves past the owner's `cheatsheets/` folder, writing into `cheatsheets/cheatsheets/` | 1, refusing one hand written menu |
//
// The second root is the ladder and the refusal, which the first cannot carry
// without giving up the property that makes it the reference: that the tool has
// nothing to say about it.
//
// ## Regenerating
//
// A deliberate change to the tool, to the composition or to the fixture will
// fail these cases, and that is the point: the failure is the review. Once the
// new output has been looked at, rewrite the expectations with
//
//   MCP_FIXTURE_UPDATE=1 node --test tools/test-fixture-expected.mjs
//
// which rewrites `fixtures/expected/` from a real run and passes. The folder is
// emptied first, so a file the tool has stopped writing goes rather than
// lingering as an expectation nothing produces. Never set it to make a red suite
// green without reading the diff - an expectation updated unread pins nothing,
// and leaves the suite reporting that output nobody has seen is correct.
//
// Run with: node --test tools/test-fixture-expected.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { main, MANIFEST_NAME, MASTER_NAME, OUTPUT_NAME } from "./cheatsheet-site.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "fixtures");
const update = process.env.MCP_FIXTURE_UPDATE === "1";

/**
 * The committed roots, and what a run against each one is for.
 *
 * `code` is the exit code the run ends on, which is part of what is pinned: a
 * root that stopped reporting its refusal, or started reporting something else,
 * is a change to the tool whichever direction it went in.
 */
const ROOTS = [
  {
    name: "site",
    code: 0,
    // The generated pages, in the order the manifest records them.
    generated: [MASTER_NAME, "docs.html", "reference.html", "index.html", "tutorial.html"],
    // The site's own pages a run rewrites, because they marked a menu.
    filled: ["index.html", "docs/reference/commands.html"],
    output: OUTPUT_NAME,
  },
  {
    name: "site-taken",
    code: 1,
    generated: [MASTER_NAME, "index.html"],
    filled: [],
    output: `${OUTPUT_NAME}/${OUTPUT_NAME}`,
  },
];

/**
 * Every file under a folder, as text, keyed relative with `/` separators.
 *
 * Read as UTF-8 because every file either root holds, and every file either
 * root's run writes, is markup or JSON. A fixture that grew a binary would want
 * a digest, and would want saying so here first.
 *
 * @param {string} where
 * @returns {Promise<Map<string, string>>}
 */
async function filesUnder(where) {
  /** @type {Map<string, string>} */
  const held = new Map();
  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // A folder that is not there holds no files, which is the answer before
      // an expectation has been recorded for a root.
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      if (!entry.isFile()) continue;
      held.set(relative(where, path).split(sep).join("/"), await readFile(path, "utf8"));
    }
  };
  await walk(where);
  return held;
}

/** A copy of a fixture root somewhere a run may write, cleaned up after. */
async function copied(name, use) {
  const into = await mkdtemp(join(tmpdir(), "cheatsheet-expected-"));
  try {
    const site = join(into, name);
    await cp(join(fixtures, name), site, { recursive: true });
    return await use(site);
  } finally {
    await rm(into, { recursive: true, force: true });
  }
}

/** `main` with its two streams captured, the way the tool's own cases run it. */
async function run(argv) {
  const out = [];
  const err = [];
  const write = process.stdout.write;
  const fail = process.stderr.write;
  process.stdout.write = (text) => (out.push(text), true);
  process.stderr.write = (text) => (err.push(text), true);
  try {
    const code = await main(argv);
    return { code, out: out.join(""), err: err.join("") };
  } finally {
    process.stdout.write = write;
    process.stderr.write = fail;
  }
}

/**
 * What one run left behind: the files it created or changed, and any it removed.
 *
 * The difference of two walks rather than a read of the output folder, because
 * a run writes into pages the site owner keeps as well - and a file it deleted
 * would be invisible to anything that only looked at what is there afterwards.
 *
 * @param {Map<string, string>} before
 * @param {Map<string, string>} after
 * @returns {{ written: Map<string, string>, removed: string[] }}
 */
function difference(before, after) {
  /** @type {Map<string, string>} */
  const written = new Map();
  for (const [name, text] of after) {
    if (before.get(name) !== text) written.set(name, text);
  }
  return { written, removed: [...before.keys()].filter((name) => !after.has(name)) };
}

/** The committed expectation for a root, or an empty map before there is one. */
function committedFor(name) {
  return filesUnder(join(fixtures, "expected", name));
}

/**
 * Writes an expectation tree, having emptied whatever was there.
 *
 * Emptying first is what retires a file the tool has stopped writing. Only ever
 * under `fixtures/expected/<root>/`, and only under the environment variable
 * this file's header names.
 *
 * @param {string} name
 * @param {Map<string, string>} written
 */
async function record(name, written) {
  const into = join(fixtures, "expected", name);
  await rm(into, { recursive: true, force: true });
  for (const [page, text] of written) {
    const path = join(into, ...page.split("/"));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, text, "utf8");
  }
}

for (const site of ROOTS) {
  test(`a run against fixtures/${site.name}/ writes what is committed for it`, async () => {
    const { written, removed, result, second } = await copied(site.name, async (where) => {
      const before = await filesUnder(where);
      const result = await run([where]);
      const after = await filesUnder(where);
      // The second run over the unchanged copy, which is what the manifest
      // exists for: it has to find the folder the first run resolved rather
      // than resolving another one beside it. On the variant that is the only
      // thing proving the recorded name is read at all, since the ladder on its
      // own would answer a third folder.
      const again = await run([where]);
      return {
        ...difference(before, after),
        result,
        second: { ...again, files: await filesUnder(where) },
      };
    });

    assert.equal(result.code, site.code, result.err);
    assert.deepEqual(removed, [], "the run removed a file of the site's");
    assert.equal(second.code, site.code, second.err);
    for (const [page, text] of written) {
      assert.equal(second.files.get(page), text, `${page} is not the same on a second run`);
    }

    if (update) {
      await record(site.name, written);
      return;
    }

    const committed = await committedFor(site.name);
    assert.ok(
      committed.size > 0,
      `fixtures/expected/${site.name}/ is missing. Run ` +
        `MCP_FIXTURE_UPDATE=1 node --test tools/test-fixture-expected.mjs`
    );
    assert.deepEqual(
      [...written.keys()].sort(),
      [...committed.keys()].sort(),
      "a run writes a different set of files than fixtures/expected/ holds"
    );
    for (const [page, text] of written) {
      assert.equal(
        text,
        committed.get(page),
        `${site.name}/${page} is not what fixtures/expected/ holds. Read the difference, then regenerate ` +
          `with MCP_FIXTURE_UPDATE=1 node --test tools/test-fixture-expected.mjs`
      );
    }
  });

  test(`the committed output for fixtures/${site.name}/ is the shape it claims`, async (t) => {
    const committed = await committedFor(site.name);
    if (committed.size === 0) {
      t.skip(`fixtures/expected/${site.name}/ is not recorded yet`);
      return;
    }
    // Read off the expectation rather than off a run, so these hold even when
    // the case above is the one that failed: what is committed is what a reader
    // of the repository has, and it should be readable without running anything.
    const pages = site.generated.map((page) => `${site.output}/${page}`);
    for (const page of [...pages, `${site.output}/${MANIFEST_NAME}`, ...site.filled]) {
      assert.ok(committed.has(page), `fixtures/expected/${site.name}/${page} is not committed`);
    }
    for (const [page, text] of committed) {
      // Committed text, handed back the way the repository holds the rest of
      // its files: LF, and a closing newline.
      assert.ok(!text.includes("\r"), `${page} is committed with carriage returns in it`);
      assert.ok(text.endsWith("\n"), `${page} is committed without a closing newline`);
    }
    // Every generated page carries a composed figure, which is the API's half
    // of the output: a page that lost it would still be a page, and the only
    // thing saying it should not be is this.
    for (const page of pages) {
      assert.match(
        committed.get(page),
        /<svg id="cheatsheet-site-[a-z0-9-]+"[^>]*viewBox="0 0 3600 3600"/,
        `${page} carries no composed figure`
      );
    }
    const manifest = JSON.parse(committed.get(`${site.output}/${MANIFEST_NAME}`));
    assert.equal(manifest.output, site.output);
    assert.deepEqual(
      manifest.pages.map((one) => one.page),
      site.generated
    );
  });
}

test("the variant resolves past the folder the site owner already has", async () => {
  // The two sentences of the report that are the variant's whole reason for
  // being a second root. Read off a run rather than off the expectation,
  // because neither is a file: the ladder is in what the run says about itself,
  // and the refusal is on the other stream.
  const { result } = await copied("site-taken", async (where) => ({
    result: await run([where, "--dry-run"]),
  }));
  assert.match(result.out, new RegExp(`names tried\\s+${OUTPUT_NAME}, ${OUTPUT_NAME}/${OUTPUT_NAME}`));
  assert.match(result.out, new RegExp(`output folder\\s+${OUTPUT_NAME}/${OUTPUT_NAME}`));
  assert.equal(result.err.trim().split("\n").length, 1, "the variant reports more than its one refusal");
  assert.match(result.err, /already holds content, so no menu was written into it/);
});
