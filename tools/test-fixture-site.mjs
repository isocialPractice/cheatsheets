// What `fixtures/site/` is, and that it is still it.
//
// ## Why the fixture has tests of its own
//
// Every other case about `tools/cheatsheet-site.mjs` builds its own site tree
// in the system temporary folder, for two good reasons: the tool crawls
// somebody else's checkout, and a page in this repository carrying
// `data-cheatsheet` would be collected by a run against this folder.
//
// The fixture is the deliberate exception, and these are the cases that make
// the exception safe. A tree in a temporary folder is written by the case that
// reads it, so it can only ever carry the shape that case was thinking about -
// which is exactly what a fixture is for the opposite of: it is committed, so a
// reader can look at it, and it is read by both the file route and the browser
// route rather than by one assertion.
//
// What this file holds is therefore the fixture rather than the tool:
//
//   1. **Is every page shape still there?** Prose sections, code examples, a
//      table and a chart, which is the list the item names. A fixture that lost
//      one would still pass every case about the tool and would stop being a
//      test of anything.
//   2. **Is it all placeholder content?** A fixture is read as an example of
//      how to mark a site up, so a real name or a real address written into one
//      is published twice over. Held against the approved list rather than
//      against a reader's judgement.
//   3. **Does the tooling read it, from a copy, with nothing to say?** Run
//      against a copy in the temporary folder, so a suite run writes nothing
//      into the repository - comparing generated pages against committed
//      expected output is its own item and waits for the composition to settle.
//   4. **Is what is deliberately absent still absent?** The fixture's README
//      lists five things that belong to later items. A fixture that quietly
//      grew one of them would make the item that adds it read as already done.
//
// Run with: node --test tools/test-fixture-site.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectSite,
  main,
  plannedPages,
  textLines,
  MARKER,
  MASTER_NAME,
  MENU_MARKER,
  OUTPUT_NAME,
} from "./cheatsheet-site.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "fixtures", "site");

/** The pages the fixture carries, site relative, in the order it reads them. */
const PAGES = [
  "docs/commands.html",
  "docs/configuration.html",
  "index.html",
  "tutorial/getting-started.html",
  "tutorial/reading-data.html",
];

/** Every file of the fixture, with its contents. */
async function files() {
  /** @type {Map<string, string>} */
  const held = new Map();
  const walk = async (where) => {
    for (const entry of await readdir(where, { withFileTypes: true })) {
      const path = join(where, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      held.set(relative(fixture, path).split(sep).join("/"), await readFile(path, "utf8"));
    }
  };
  await walk(fixture);
  return held;
}

/** The fixture copied somewhere a run may write, and cleaned up after. */
async function copied(use) {
  const into = await mkdtemp(join(tmpdir(), "cheatsheet-fixture-"));
  try {
    const site = join(into, "site");
    await cp(fixture, site, { recursive: true });
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

// ## 1. The page shapes

test("the fixture is five pages, every one of them marked", async () => {
  const held = await files();
  assert.deepEqual([...held.keys()].filter((name) => name.endsWith(".html")).sort(), PAGES);
  // And a README, because a folder of marked up pages with no statement of what
  // it is for is a folder somebody edits as content.
  assert.ok(held.has("README.md"));
  for (const name of PAGES) {
    assert.ok(held.get(name).includes(MARKER), `${name} carries no ${MARKER}`);
  }
  // Half tutorial and half tool documentation, which is the shape the item
  // names rather than a count: two folders, each a subject of its own, and a
  // landing page at the root that belongs to neither.
  assert.deepEqual(
    [...new Set(PAGES.map((name) => (name.includes("/") ? name.split("/")[0] : "")))].sort(),
    ["", "docs", "tutorial"]
  );
});

test("every page shape the tool has to handle is still in it", async () => {
  const held = await files();
  const all = PAGES.map((name) => held.get(name)).join("\n");
  const shapes = {
    // Prose sections, which is what most of a real page is.
    prose: /<p>[^<]{40,}/,
    // A definition list, which is prose with a shape - and two of the heading
    // elements the row reader treats as labels.
    terms: /<dl>[\s\S]*<dt>[\s\S]*<dd>/,
    // Code examples, in the markup a page actually writes them in.
    code: /<pre><code>/,
    // A table with a caption and header cells.
    table: /<table>[\s\S]*<caption>[\s\S]*<th>/,
    // A chart, which is the shape that is not only content: it brings a script.
    chart: /<figure>[\s\S]*<svg[\s\S]*<script>/,
  };
  for (const [shape, pattern] of Object.entries(shapes)) {
    assert.match(all, pattern, `the fixture no longer carries a ${shape}`);
  }
  // The chart's script holds a closing tag in a string, which is the whole
  // reason the chart is here rather than a picture of one. Both readers treat a
  // script as opaque, so this is not a close - and a reader that counted it
  // would end the marked element early and say nothing.
  const chart = held.get("tutorial/reading-data.html");
  assert.match(chart, /const legend = '<div class="legend">failures<\/div>';/);
  // The row reader is the one that can be asked directly, so ask it: the
  // script contributes nothing, and the caption is a label.
  const figure = /<figure>[\s\S]*?<\/figure>/.exec(chart)[0];
  assert.deepEqual(textLines(figure), [
    { text: "Failures per day, last seven days", role: "comment" },
  ]);
});

// ## 2. Placeholder content

test("nothing in the fixture is real, and the placeholders are the approved ones", async () => {
  const held = await files();
  const all = [...held.values()].join("\n");
  // The names and the product, so a reader of the fixture meets the convention
  // rather than guessing at it.
  for (const word of ["Acme Corp", "demo-app", "Springfield", "123 Main Street"]) {
    assert.ok(all.includes(word), `the fixture no longer uses the placeholder ${word}`);
  }
  // Every address is at a reserved domain. Written as a check over what is
  // there rather than a list of what is not: a blocklist of real domains is a
  // list somebody has to keep, and this is the same claim from the other side.
  const addresses = [...all.matchAll(/[\w.+-]+@([\w.-]+)/g)].map((one) => one[1]);
  assert.ok(addresses.length > 0, "the fixture has no address at all, so this is checking nothing");
  for (const domain of new Set(addresses)) {
    assert.match(domain, /^(example\.com|example\.org|example\.net)$/, `${domain} is not a reserved domain`);
  }
  // And the one phone number is the reserved exchange.
  for (const number of [...all.matchAll(/\(\d{3}\)\s*\d{3}-\d{4}/g)].map((one) => one[0])) {
    assert.equal(number, "(555) 123-4567");
  }
});

test("the fixture is small enough that reading it costs nothing", async () => {
  const held = await files();
  const bytes = [...held.values()].reduce((total, text) => total + Buffer.byteLength(text), 0);
  // A figure rather than a feeling. Twelve kilobytes of markup is read in less
  // time than the process takes to start, and the number is here so that the
  // day somebody pastes a real page in is the day a case says so.
  assert.ok(bytes < 24 * 1024, `the fixture is ${bytes} bytes, which is more markup than a fixture needs`);
  for (const [name, text] of held) {
    assert.ok(Buffer.byteLength(text) < 6 * 1024, `${name} is longer than a fixture page should be`);
  }
});

// ## 3. The tooling reads it

test("the scripted tool reads the fixture and has nothing to report", async () => {
  // From a copy, so a suite run writes nothing into the repository. What a real
  // run writes into the fixture folder is a later item's to commit.
  await copied(async (site) => {
    const dry = await run([site, "--dry-run"]);
    assert.equal(dry.code, 0, dry.err);
    assert.equal(dry.err, "", "the fixture has markup the tool could not read");
    // Three cheatsheets and the master page: a folder is a subject, so the two
    // tutorial pages are one page and the two documentation pages are another.
    assert.match(dry.out, /5 pages crawled, 5 marked/);
    assert.match(dry.out, /pages to write\s+4/);
    for (const name of ["docs.html", "index.html", "tutorial.html", MASTER_NAME]) {
      assert.ok(dry.out.includes(name), `${name} was not planned`);
    }
    // Nothing was written, which is what makes the dry run safe to do first.
    assert.deepEqual(
      (await readdir(site)).filter((entry) => entry === OUTPUT_NAME),
      []
    );
    // Then the real run, whose output the dry run promised.
    const real = await run([site]);
    assert.equal(real.code, 0, real.err);
    assert.deepEqual((await readdir(join(site, OUTPUT_NAME))).sort(), [
      MASTER_NAME,
      "cheatsheet-site.json",
      "docs.html",
      "index.html",
      "tutorial.html",
    ]);
    // The marked element on the chart page reaches its real close rather than
    // the one inside the script, which is the claim the chart exists for: the
    // last paragraph of that section is on the generated page.
    const tutorial = await readFile(join(site, OUTPUT_NAME, "tutorial.html"), "utf8");
    assert.ok(tutorial.includes("Reading it without a browser"), "the marked element was cut at the script");
    assert.ok(tutorial.includes("const legend ="), "the script was dropped from the carried markup");
    // And the figure above it is a composition rather than concatenation.
    assert.match(tutorial, /<svg id="cheatsheet-site-tutorial"[^>]*viewBox="0 0 3600 3600"/);
    // A second run over the unchanged copy writes the same bytes.
    const first = await readFile(join(site, OUTPUT_NAME, MASTER_NAME), "utf8");
    assert.equal((await run([site])).code, 0);
    assert.equal(await readFile(join(site, OUTPUT_NAME, MASTER_NAME), "utf8"), first);
  });
});

test("each page contributes the section its own marking asked for", async () => {
  const pages = await collectSite(fixture);
  assert.deepEqual(
    pages.map((page) => page.id),
    PAGES
  );
  // Reading the collection rather than the output, because the heading source
  // per page is the thing a fixture is easiest to get wrong about: a page whose
  // marking said nothing would still be collected and would say nothing either.
  assert.deepEqual(
    pages.map((page) => (page.blocks[0]?.value ?? null)),
    ["title", "title", "title", "page", "page"]
  );
  // The paragraph outside the marked element on the commands page is not
  // collected, which is what makes the marking a marking.
  const commands = pages.find((page) => page.id === "docs/commands.html");
  assert.ok(!commands.blocks[0].content.includes("so a flag on the command line"));
  assert.deepEqual(
    plannedPages(pages).map((one) => one.name),
    [MASTER_NAME, "docs.html", "index.html", "tutorial.html"]
  );
  assert.deepEqual(pages.flatMap((page) => page.findings), []);
});

// ## 4. What is deliberately absent

test("what belongs to a later item is still absent, and the README still says so", async () => {
  const held = await files();
  const pages = PAGES.map((name) => held.get(name)).join("\n");
  // A menu element, which needs a generated folder to point at and a committed
  // expectation to be worth testing.
  assert.ok(!pages.includes(MENU_MARKER), `the fixture grew a ${MENU_MARKER} ahead of its item`);
  // The comment syntax, which is the second authoring method and its own item.
  assert.ok(!/\{%\s*cheatsheet/.test(pages), "the fixture grew a cheatsheet comment ahead of its item");
  // A folder inside a folder, which is what the nested folder item asks for -
  // two folders at the root are not that.
  for (const name of PAGES) {
    assert.ok(name.split("/").length <= 2, `${name} is nested deeper than the fixture claims to be`);
  }
  // No committed output, which is the item that waits for the composition.
  assert.ok(!held.has(`${OUTPUT_NAME}/${MASTER_NAME}`), "the fixture committed generated output");
  // And the README names all five, so the absences are stated where somebody
  // adding a page would read them rather than only here.
  const readme = held.get("README.md");
  for (const absent of [MENU_MARKER, "comment syntax", "nested inside a folder", OUTPUT_NAME, "CI"]) {
    assert.ok(readme.includes(absent), `the README no longer names ${absent} as absent`);
  }
});

test("the fixture is not swept into the suite, and is not a catalog folder", async () => {
  // Two ways this folder could be read as something it is not. Node's default
  // test patterns would run a file named like a test, and the catalog walk
  // reads a folder holding a sheet.json as a cheatsheet.
  const held = await files();
  for (const name of held.keys()) {
    assert.ok(!/(^|\/)(test-|test\.)/.test(name), `${name} would be swept into the suite`);
    assert.ok(!name.endsWith("sheet.json"), `${name} would be read as a catalog entry`);
  }
  // It is a folder of the repository rather than a generated one, so it is
  // tracked and committed - which is the whole reason it can be looked at.
  assert.ok((await stat(fixture)).isDirectory());
});
