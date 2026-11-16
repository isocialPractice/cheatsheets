// What the two fixture roots are, and that they are still it.
//
// ## Why the fixtures have tests of their own
//
// Every other case about `tools/cheatsheet-site.mjs` builds its own site tree
// in the system temporary folder, for two good reasons: the tool crawls
// somebody else's checkout, and a page in this repository carrying
// `data-cheatsheet` would be collected by a run against this folder.
//
// The fixtures are the deliberate exception, and these are the cases that make
// the exception safe. A tree in a temporary folder is written by the case that
// reads it, so it can only ever carry the shape that case was thinking about -
// which is exactly what a fixture is for the opposite of: it is committed, so a
// reader can look at it, and it is read by both the file route and the browser
// route rather than by one assertion.
//
// What this file holds is therefore the fixtures rather than the tool:
//
//   1. **Is every page shape still there?** Prose sections, code examples, a
//      table and a chart, which is the list the item names. A fixture that lost
//      one would still pass every case about the tool and would stop being a
//      test of anything.
//   2. **Is every marking still there?** The attribute, the comment and the two
//      menu modes, each where the README says it is. The markings are what a
//      fixture is for - a run against a site that marked nothing reads clean
//      for the wrong reason.
//   3. **Is it all placeholder content?** A fixture is read as an example of
//      how to mark a site up, so a real name or a real address written into one
//      is published twice over. Held against the approved list rather than
//      against a reader's judgement.
//   4. **Does the tooling read it, from a copy, with nothing to say?** Run
//      against a copy in the temporary folder, so a suite run writes nothing
//      into the repository. What a run *writes* is compared with committed
//      output by `tools/test-fixture-expected.mjs`, which is the other half of
//      this file and the reason these cases read the report rather than the
//      pages.
//
// ## Two roots, and the one property that decides which case goes where
//
// `fixtures/site/` reads clean: six pages, every marking the tool has, and
// nothing for the tool to report. That is what makes it the reference, and it
// is also what it cannot carry - a refusal is a finding, and a root with an
// expected finding cannot be asserted to have none.
//
// So `fixtures/site-taken/` is the second root, and everything in it is already
// the site owner's: a `cheatsheets/` folder, which the output ladder resolves
// past, and a menu element holding a hand written menu, which a run refuses
// rather than writing over. A case about what either root *carries* is here; a
// case about what a run against either one *writes* is in
// `tools/test-fixture-expected.mjs`.
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
  commentDirectives,
  headingFor,
  main,
  menuElements,
  pageFolder,
  plannedPages,
  textLines,
  ATTRIBUTE_METHOD,
  COMMENT_METHOD,
  MARKER,
  MASTER_NAME,
  MENU_MARKER,
  MENU_MODES,
  OUTPUT_NAME,
} from "./cheatsheet-site.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = join(root, "fixtures", "site");
const variant = join(root, "fixtures", "site-taken");

/** The pages the fixture carries, site relative, in the order it reads them. */
const PAGES = [
  "docs/configuration.html",
  "docs/reference/commands.html",
  "docs/reference/exit-codes.html",
  "index.html",
  "tutorial/getting-started.html",
  "tutorial/reading-data.html",
];

/** The cheatsheets those pages group into, as the plan names them. */
const PLANNED = [MASTER_NAME, "docs.html", "reference.html", "index.html", "tutorial.html"];

/** Every file of a fixture root, with its contents. */
async function files(where) {
  /** @type {Map<string, string>} */
  const held = new Map();
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      held.set(relative(where, path).split(sep).join("/"), await readFile(path, "utf8"));
    }
  };
  await walk(where);
  return held;
}

/** A fixture root copied somewhere a run may write, and cleaned up after. */
async function copied(from, use) {
  const into = await mkdtemp(join(tmpdir(), "cheatsheet-fixture-"));
  try {
    const site = join(into, "site");
    await cp(from, site, { recursive: true });
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

test("the fixture is six pages, every one of them marked", async () => {
  const held = await files(fixture);
  assert.deepEqual([...held.keys()].filter((name) => name.endsWith(".html")).sort(), PAGES);
  // And a README, because a folder of marked up pages with no statement of what
  // it is for is a folder somebody edits as content.
  assert.ok(held.has("README.md"));
  for (const name of PAGES) {
    const text = held.get(name);
    assert.ok(text.includes(MARKER) || /\{%\s*cheatsheet/.test(text), `${name} carries no marking`);
  }
  // Half tutorial and half tool documentation, which is the shape the item
  // names rather than a count: two folders at the root, each a subject of its
  // own, and a landing page that belongs to neither.
  assert.deepEqual(
    [...new Set(PAGES.map((name) => (name.includes("/") ? name.split("/")[0] : "")))].sort(),
    ["", "docs", "tutorial"]
  );
});

test("every page shape the tool has to handle is still in it", async () => {
  const held = await files(fixture);
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

// ## 2. The markings

test("both authoring methods are in the fixture, one cheatsheet written out of the two", async () => {
  const pages = await collectSite(fixture);
  // One page marked with the comment syntax and the rest with the attribute,
  // which is what gives both paths a fixture rather than a case.
  assert.deepEqual(
    pages.map((page) => page.blocks[0].method),
    [ATTRIBUTE_METHOD, COMMENT_METHOD, ATTRIBUTE_METHOD, ATTRIBUTE_METHOD, ATTRIBUTE_METHOD, ATTRIBUTE_METHOD]
  );
  // The comment and the attribute are siblings in one folder, so the cheatsheet
  // named for that folder is written out of both methods at once.
  const reference = pages.filter((page) => pageFolder(page) === "docs/reference");
  assert.deepEqual(
    reference.map((page) => page.blocks[0].method),
    [COMMENT_METHOD, ATTRIBUTE_METHOD]
  );
  // What the comment says, and that it says it cleanly. One property, read off
  // the directive rather than off the block, because the parse is the thing
  // this page exists to exercise.
  const commands = pages.find((page) => page.id === "docs/reference/commands.html");
  const directives = commentDirectives(await readFile(commands.path, "utf8"));
  assert.equal(directives.length, 1);
  assert.deepEqual(directives[0].properties, { heading: "page" });
  assert.deepEqual(directives[0].problems, []);
  // And the heading it asked for is the one it got. The page's title is a
  // sentence, so a heading read off the file name is visibly the file name
  // rather than a coincidence.
  assert.equal(commands.title, "Every command demo-app answers to");
  assert.deepEqual(headingFor(commands), { source: "page", heading: "Commands", findings: [] });
  // The paragraph outside the marked element is not collected, which is what
  // makes the marking a marking.
  assert.ok(!commands.blocks[0].content.includes("so a flag on the command line"));
});

test("a folder inside a folder is what names its cheatsheet", async () => {
  const pages = await collectSite(fixture);
  // Three segments deep, which two folders at the root are not: `pageFolder`
  // reads the immediate parent, so this is the case that says which name a
  // cheatsheet takes.
  const nested = PAGES.filter((name) => name.split("/").length > 2);
  assert.deepEqual(nested, ["docs/reference/commands.html", "docs/reference/exit-codes.html"]);
  assert.deepEqual(
    pages.filter((page) => nested.includes(page.id)).map((page) => pageFolder(page)),
    ["docs/reference", "docs/reference"]
  );
  // Named and headed for the immediate parent rather than for the folder above
  // it, and `docs/` keeps a cheatsheet of its own with one section in it.
  const planned = plannedPages(pages);
  assert.deepEqual(planned.map((one) => one.name), PLANNED);
  const reference = planned.find((one) => one.name === "reference.html");
  assert.equal(reference.heading, "Reference");
  assert.deepEqual(reference.sources, nested);
  assert.deepEqual(
    planned.find((one) => one.name === "docs.html").sources,
    ["docs/configuration.html"]
  );
});

test("both menu modes are marked, and neither is marked anywhere it would be refused", async () => {
  const pages = await collectSite(fixture);
  const marked = pages.flatMap((page) =>
    page.menus.map((menu) => ({ page: page.id, mode: menu.mode, status: menu.status, holds: menu.holds }))
  );
  // One of each mode, so the page menu and the dropdown both have a fixture,
  // and the dropdown is two folders down - which is the link walk the mode
  // raised and nothing else in the tool had to answer.
  assert.deepEqual(marked, [
    { page: "docs/reference/commands.html", mode: "dropdown", status: undefined, holds: "nothing" },
    { page: "index.html", mode: "page", status: undefined, holds: "nothing" },
  ]);
  assert.deepEqual([...new Set(marked.map((one) => one.mode))].sort(), Object.keys(MENU_MODES).sort());
  // Empty, and outside the marked material on both pages. A menu element that
  // held anything would be refused, and one inside collected material would be
  // carried onto the generated cheatsheet by the next run.
  assert.deepEqual(pages.flatMap((page) => page.findings), []);
});

// ## 3. Placeholder content

test("nothing in the fixtures is real, and the placeholders are the approved ones", async () => {
  const held = new Map([...(await files(fixture)), ...(await files(variant))]);
  const all = [...held.values()].join("\n");
  // The names and the product, so a reader of the fixture meets the convention
  // rather than guessing at it. The variant is a second organisation on
  // purpose: two roots that read as one site are two roots somebody will edit
  // as one.
  for (const word of ["Acme Corp", "Northwind Traders", "demo-app", "Springfield", "123 Main Street"]) {
    assert.ok(all.includes(word), `the fixtures no longer use the placeholder ${word}`);
  }
  // Every address is at a reserved domain. Written as a check over what is
  // there rather than a list of what is not: a blocklist of real domains is a
  // list somebody has to keep, and this is the same claim from the other side.
  const addresses = [...all.matchAll(/[\w.+-]+@([\w.-]+)/g)].map((one) => one[1]);
  assert.ok(addresses.length > 0, "the fixtures have no address at all, so this is checking nothing");
  for (const domain of new Set(addresses)) {
    assert.match(domain, /^(example\.com|example\.org|example\.net)$/, `${domain} is not a reserved domain`);
  }
  // And every phone number is the reserved exchange.
  for (const number of [...all.matchAll(/\(\d{3}\)\s*\d{3}-\d{4}/g)].map((one) => one[0])) {
    assert.equal(number, "(555) 123-4567");
  }
});

test("the fixtures are small enough that reading them costs nothing", async () => {
  for (const [name, where] of [["site", fixture], ["site-taken", variant]]) {
    const held = await files(where);
    const bytes = [...held.values()].reduce((total, text) => total + Buffer.byteLength(text), 0);
    // A figure rather than a feeling. Twenty four kilobytes of markup is read in
    // less time than the process takes to start, and the number is here so that
    // the day somebody pastes a real page in is the day a case says so.
    assert.ok(bytes < 24 * 1024, `fixtures/${name}/ is ${bytes} bytes, which is more markup than a fixture needs`);
    for (const [page, text] of held) {
      assert.ok(Buffer.byteLength(text) < 6 * 1024, `${name}/${page} is longer than a fixture page should be`);
    }
  }
});

// ## 4. The tooling reads it

test("the scripted tool reads the fixture and has nothing to report", async () => {
  // From a copy, so a suite run writes nothing into the repository - and a run
  // over this fixture writes into two of its pages as well as into a folder,
  // since both menu modes are marked.
  await copied(fixture, async (site) => {
    const dry = await run([site, "--dry-run"]);
    assert.equal(dry.code, 0, dry.err);
    assert.equal(dry.err, "", "the fixture has markup the tool could not read");
    // Four cheatsheets and the master page: a folder is a subject, so the two
    // reference pages are one page, and the one documentation page left in
    // docs/ is a cheatsheet with one section.
    assert.match(dry.out, /6 pages crawled, 6 marked/);
    assert.match(dry.out, /pages to write\s+5/);
    for (const name of PLANNED) {
      assert.ok(dry.out.includes(name), `${name} was not planned`);
    }
    // Both menus, named with the page and the line they were marked on.
    assert.match(dry.out, /menus to fill\s+2/);
    assert.match(dry.out, /index\.html:\d+ -> page \(1 entry\)/);
    assert.match(dry.out, /docs\/reference\/commands\.html:\d+ -> dropdown \(5 entries\)/);
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
      "reference.html",
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
    // The menu the run filled, in the page the site owner keeps, linking from
    // two folders down rather than from the folder the tool resolved.
    const commands = await readFile(join(site, "docs", "reference", "commands.html"), "utf8");
    assert.match(commands, /<li><a href="\.\.\/\.\.\/cheatsheets\/reference\.html">Reference<\/a><\/li>/);
    const landing = await readFile(join(site, "index.html"), "utf8");
    assert.match(landing, /<a href="cheatsheets\/all-cheatsheets\.html">All Cheatsheets<\/a>/);
    // A second run over the unchanged copy writes the same bytes, menus and all.
    const first = await readFile(join(site, OUTPUT_NAME, MASTER_NAME), "utf8");
    assert.equal((await run([site])).code, 0);
    assert.equal(await readFile(join(site, OUTPUT_NAME, MASTER_NAME), "utf8"), first);
    assert.equal(await readFile(join(site, "docs", "reference", "commands.html"), "utf8"), commands);
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
    pages.map((page) => headingFor(page).source),
    ["title", "page", "page", "title", "page", "page"]
  );
  assert.deepEqual(
    plannedPages(pages).map((one) => one.name),
    PLANNED
  );
  assert.deepEqual(pages.flatMap((page) => page.findings), []);
});

// ## 5. The variant, which is everything the site owner already had

test("the variant keeps the folder and the menu that were already there", async () => {
  const held = await files(variant);
  assert.deepEqual([...held.keys()].sort(), ["README.md", "cheatsheets/index.html", "index.html"]);
  // The folder the output ladder has to resolve past. It holds a page because
  // a folder with no file in it cannot be committed, and that page says so.
  assert.match(held.get("cheatsheets/index.html"), /This folder is ours/);
  // Nothing in it is marked, and it is never crawled either - a folder of that
  // name is one the walk does not descend into.
  assert.ok(!held.get("cheatsheets/index.html").includes(MARKER));
  const pages = await collectSite(variant);
  assert.deepEqual(pages.map((page) => page.id), ["index.html"]);
  // The hand written menu, which is the refusal this root carries: a run
  // recognises only its own fill, so markup it did not write is reported
  // rather than replaced.
  const [menu] = menuElements(held.get("index.html"));
  assert.equal(menu.mode, "dropdown");
  assert.equal(menu.holds, "content");
  assert.equal(pages[0].findings.length, 1);
  assert.match(pages[0].findings[0], /already holds content, so no menu was written into it/);
});

// ## 6. Neither root is read as something it is not

test("the fixtures are not swept into the suite, and are not catalog folders", async () => {
  // Two ways these folders could be read as something they are not. Node's
  // default test patterns would run a file named like a test, and the catalog
  // walk reads a folder holding a sheet.json as a cheatsheet.
  for (const where of [fixture, variant, join(root, "fixtures", "expected")]) {
    const held = await files(where);
    for (const name of held.keys()) {
      assert.ok(!/(^|\/)(test-|test\.)/.test(name), `${name} would be swept into the suite`);
      assert.ok(!name.endsWith("sheet.json"), `${name} would be read as a catalog entry`);
    }
    // Folders of the repository rather than generated ones, so they are tracked
    // and committed - which is the whole reason they can be looked at.
    assert.ok((await stat(where)).isDirectory());
  }
});

test("the fixture README says where each marking and each shape is", async () => {
  const readme = (await files(fixture)).get("README.md");
  // The README is where somebody adding a page reads what is already covered,
  // so it names the markings and the folder cases rather than leaving them to
  // be found in this file. It named five absences until 2026.11.16, when the
  // last of the five was filled.
  for (const named of [
    MARKER,
    MENU_MARKER,
    "{% cheatsheet",
    "docs/reference/",
    "folder inside a folder",
    "fixtures/expected/site/",
    "fixtures/site-taken/",
  ]) {
    assert.ok(readme.includes(named), `the fixture README no longer names ${named}`);
  }
  for (const mode of Object.keys(MENU_MODES)) {
    assert.ok(readme.includes(`\`${mode}\``), `the fixture README no longer names the ${mode} menu`);
  }
});
