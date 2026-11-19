// What `tools/cheatsheet-data.mjs` promises: the contract a data file is
// written against, and that a site generated from one is the site the scanner
// would have written from the same material.
//
// ## The two halves, and which of them is the point
//
// The read is the ordinary half - a property this knows, a property it does
// not, a value outside its vocabulary, an entry that names no page - and the
// cases for it are the cases any reader of a hand written file wants.
//
// The half worth having is **the drift guard** and **the byte comparison**.
//
// `DATA_PROPERTIES` maps three of its properties onto `COMMENT_PROPERTIES` and
// takes their vocabulary and their description from it rather than listing
// either again, which is the whole of what `Define the preset mapping from data
// file properties to tags and attributes` asked for: not a third vocabulary
// that agrees today, but one that cannot be edited into disagreeing. The cases
// under *The contract* read both objects and hold them to each other, so a
// value added to one and not the other fails here rather than in somebody's
// generated site.
//
// And *one back end* runs the same material through both front ends - a marked
// up page through `collectSite`, a data file through `sitePages` - and compares
// the rendered cheatsheet byte for byte. That is the claim the data route's
// header makes, and the only kind of case that can hold it: every other case
// here would still pass on the day the two routes started writing different
// pages.
//
// Run with: node --test tools/test-cheatsheet-data.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CHEATSHEET_BLOCK, CHEATSHEET_MARKER, HEADING_SOURCES } from "../api/cheatsheet/index.mjs";
import {
  COMMENT_PROPERTIES,
  GROUPINGS,
  MANIFEST_NAME,
  MASTER_NAME,
  MENU_MODES,
  cheatsheets,
  collectSite,
  plannedPages,
  renderCheatsheet,
} from "./cheatsheet-site.mjs";
import {
  DATA_PROPERTIES,
  DATA_VERSION,
  ENTRIES_PROPERTY,
  MATERIAL_MARKUP,
  MATERIAL_TAG,
  MATERIAL_TAG_PROPERTY,
  MENU_PAGE,
  PAGE_PATTERN,
  VERSION_PROPERTY,
  main,
  renderMenuPage,
  sitePages,
} from "./cheatsheet-data.mjs";

/** A folder holding the files named, cleaned up by the caller. */
async function folder(files) {
  const root = await mkdtemp(join(tmpdir(), "cheatsheet-data-"));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, ...path.split("/"));
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, contents, "utf8");
  }
  return root;
}

/** `main` with its two streams captured, the way the scanner's own cases run it. */
async function run(argv) {
  const write = process.stdout.write;
  const error = process.stderr.write;
  const out = [];
  const err = [];
  process.stdout.write = (chunk) => (out.push(String(chunk)), true);
  process.stderr.write = (chunk) => (err.push(String(chunk)), true);
  try {
    const code = await main(argv);
    return { code, out: out.join(""), err: err.join("") };
  } finally {
    process.stdout.write = write;
    process.stderr.write = error;
  }
}

/** The one entry a case that is not about the read needs. */
function oneEntry(extra = {}) {
  return {
    [ENTRIES_PROPERTY]: [
      {
        page: "guide/arrays.html",
        title: "Working with arrays",
        material: ["<h2>splice</h2><p>Removes and inserts in place.</p>"],
        ...extra,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// ## The contract
// ---------------------------------------------------------------------------

test("every property of the contract carries the fields the contract promises", () => {
  for (const [name, one] of Object.entries(DATA_PROPERTIES)) {
    assert.ok(["file", "entry"].includes(one.scope), `${name} is scoped ${one.scope}`);
    assert.equal(typeof one.markup, "string", `${name} does not say what it maps onto`);
    assert.ok(one.markup.length > 0, `${name} maps onto an empty string`);
    assert.ok(one.values === null || Array.isArray(one.values), `${name} has no vocabulary field`);
    assert.equal(typeof one.sets, "string", `${name} does not say what it sets`);
    assert.ok(one.sets.length > 0, `${name} sets an empty string`);
  }
});

test("the three properties the comment syntax already has are taken from it", () => {
  // The drift guard, and the item's own words for it: a third vocabulary that
  // drifts from either of the two that exist is the failure to avoid. Read off
  // both objects rather than written out, so a value added to one of them and
  // not the other fails here.
  for (const property of Object.keys(COMMENT_PROPERTIES)) {
    assert.ok(
      Object.hasOwn(DATA_PROPERTIES, property),
      `${property} is a comment property and a data file cannot say it`
    );
    assert.deepEqual(
      DATA_PROPERTIES[property].values,
      COMMENT_PROPERTIES[property].values,
      `${property} takes different values in a data file than in a comment`
    );
    assert.equal(
      DATA_PROPERTIES[property].sets,
      COMMENT_PROPERTIES[property].sets,
      `${property} is described differently in a data file than in a comment`
    );
  }
});

test("and the vocabularies they came from are the published ones", () => {
  // One step further back, because `COMMENT_PROPERTIES` could itself be edited:
  // `heading` is the published `HEADING_SOURCES` that the DOM route reads, and
  // `group` is the scanner's own `GROUPINGS`. The chain is what makes the
  // contract one reading rather than three that agree.
  assert.deepEqual(DATA_PROPERTIES.heading.values, HEADING_SOURCES);
  assert.deepEqual(DATA_PROPERTIES.group.values, GROUPINGS);
  assert.equal(DATA_PROPERTIES.name.values, null, "a name is the site's own text, not a vocabulary");
});

test("the menu property takes the menu modes and nothing else", () => {
  assert.deepEqual(DATA_PROPERTIES.menu.values, Object.keys(MENU_MODES));
});

test("every property that maps onto a marking names the marking it maps onto", () => {
  // The mapping read from the other side: a property whose markup is an
  // attribute has to name an attribute that exists, or the contract is
  // describing markup nobody writes.
  assert.match(DATA_PROPERTIES.material.markup, new RegExp(CHEATSHEET_MARKER));
  assert.match(DATA_PROPERTIES.heading.markup, new RegExp(CHEATSHEET_MARKER));
  assert.match(DATA_PROPERTIES.menu.markup, /data-cheatsheet-menu/);
  // And the one that maps onto nothing says so, rather than being left to read
  // as an omission: no page declares a version of the markings.
  assert.match(DATA_PROPERTIES[VERSION_PROPERTY].markup, /^nothing\b/);
});

test("a page is a path inside the site, and the pattern says which", () => {
  for (const good of ["index.html", "guide/arrays.html", "a/b/c/d.html", "notes/someName.html"]) {
    assert.ok(PAGE_PATTERN.test(good), `${good} is a path inside a site and was refused`);
  }
  for (const bad of ["/etc/passwd", "../out.html", "a/../../b.html", "C:/site/a.html", "a\\b.html", ".."]) {
    assert.ok(!PAGE_PATTERN.test(bad), `${bad} is not a path inside a site and was accepted`);
  }
});

test("and a segment naming neither a folder nor a file is not one either", () => {
  // Every one of these reached the shared writer before the pattern was read
  // one segment at a time, and the folder it resolved to was the empty string -
  // which is a cheatsheet with nothing to be headed for and an uncaught refusal
  // out of the document schema, taking the entries either side of it down with
  // it. A leading dot is still a name: `.foo.html` is a file.
  for (const bad of [".", "./b.html", "a/./b.html", "guide//arrays.html", "guide/"]) {
    assert.ok(!PAGE_PATTERN.test(bad), `${bad} names a folder that is not there and was accepted`);
  }
  for (const good of [".foo.html", "a/.config/b.html", "a/..b.html"]) {
    assert.ok(PAGE_PATTERN.test(good), `${good} is a path inside a site and was refused`);
  }
});

// ---------------------------------------------------------------------------
// ## The read
// ---------------------------------------------------------------------------

test("an entry becomes a page in the shape the pipeline already reads", () => {
  const { pages, findings, refused } = sitePages(oneEntry(), "/anywhere/site.json");
  assert.equal(refused, null);
  assert.deepEqual(findings, []);
  assert.equal(pages.length, 1);
  const [page] = pages;
  assert.equal(page.id, "guide/arrays.html");
  assert.equal(page.title, "Working with arrays");
  assert.equal(page.path, "/anywhere/site.json", "a page does not say which file it came out of");
  assert.deepEqual(page.menus, [], "a data file entry marks no menu of its own");
  assert.deepEqual(page.findings, []);
  assert.equal(page.blocks.length, 1);
  assert.equal(page.blocks[0].tag, MATERIAL_TAG);
  assert.match(page.blocks[0].content, /^<h2>splice<\/h2>/);
});

test("a block written as markup alone takes the preset element", () => {
  const { pages } = sitePages(oneEntry());
  assert.equal(pages[0].blocks[0].tag, MATERIAL_TAG);
});

test("and a block that names its element keeps it, lower cased", () => {
  const { pages, findings } = sitePages(
    oneEntry({
      material: [
        { [MATERIAL_TAG_PROPERTY]: "TABLE", [MATERIAL_MARKUP]: "<table><tr><td>x</td></tr></table>" },
      ],
    })
  );
  assert.deepEqual(findings, []);
  assert.equal(pages[0].blocks[0].tag, "table");
});

test("the three comment properties reach the page, so the pipeline reads them", () => {
  const { pages, findings } = sitePages(
    oneEntry({ heading: "page", group: "page", name: "splice" })
  );
  assert.deepEqual(findings, []);
  // Carried on the block, which is where `commentOption` and `headingFor` look
  // - the data file is the comment method said in JSON, per the module header.
  assert.deepEqual(pages[0].blocks[0].properties, {
    heading: "page",
    group: "page",
    name: "splice",
  });
  // And the pipeline acts on all three: the name, and the heading read as prose
  // off the file name rather than off the title the entry also gave.
  const [sheet] = cheatsheets(pages);
  assert.equal(sheet.name, "splice.html");
  assert.equal(sheet.heading, "Arrays");
  assert.equal(sheet.folder, "", "group: page left the entry in its folder's cheatsheet");
});

test("every block of an entry carries its properties, not only the first", () => {
  // A page says one thing about its own heading however many elements it
  // marked, and an entry is one page - so `commentOption` answers the same
  // whichever block it happens to look at.
  const { pages } = sitePages(oneEntry({ heading: "page", material: ["<p>a</p>", "<p>b</p>"] }));
  assert.equal(pages[0].blocks.length, 2);
  for (const block of pages[0].blocks) assert.equal(block.properties.heading, "page");
});

test("a folder of entries is one cheatsheet, in the order they are listed", () => {
  const { pages, findings } = sitePages({
    [ENTRIES_PROPERTY]: [
      { page: "guide/two.html", title: "Two", material: ["<p>two</p>"] },
      { page: "guide/one.html", title: "One", material: ["<p>one</p>"] },
    ],
  });
  assert.deepEqual(findings, []);
  const planned = plannedPages(pages);
  assert.deepEqual(
    planned.map((one) => one.name),
    [MASTER_NAME, "guide.html"]
  );
  assert.equal(planned[1].heading, "Guide");
  assert.equal(planned[1].headingSource, "folder");
  assert.deepEqual(planned[1].sources, ["guide/two.html", "guide/one.html"], "the entry order was re-sorted");
});

test("an entry with no material writes nothing, and is told so", () => {
  const { pages, findings } = sitePages({
    [ENTRIES_PROPERTY]: [{ page: "a.html", title: "A" }],
  });
  assert.equal(pages.length, 1, "the entry was dropped rather than written empty");
  assert.deepEqual(plannedPages(pages), [], "a page was planned for an entry with no material");
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[0\]\.material: the entry carries no material\b/);
});

// ---------------------------------------------------------------------------
// ## What a file can be wrong about
// ---------------------------------------------------------------------------

test("a property the contract does not know is reported with the vocabulary", () => {
  const { findings } = sitePages({ colour: "blue", [ENTRIES_PROPERTY]: [] });
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^colour: this is not a property of a data file\b/);
  // The vocabulary in the sentence is the object's own keys, which is the whole
  // reason the properties are data.
  for (const name of Object.keys(DATA_PROPERTIES).filter((one) => DATA_PROPERTIES[one].scope === "file")) {
    assert.match(findings[0], new RegExp(name));
  }
});

test("and so is one an entry does not have", () => {
  const { findings } = sitePages(oneEntry({ colour: "blue" }));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[0\]\.colour: this is not a property of an entry\b/);
});

test("a value outside a property's vocabulary is reported and the property ignored", () => {
  // A root entry rather than one in a folder, because the heading is what this
  // reads: a folder's cheatsheet is headed for the folder whatever its pages
  // asked for, so the fallback would be invisible there.
  const { pages, findings } = sitePages({
    [ENTRIES_PROPERTY]: [
      { page: "a.html", title: "Working with arrays", heading: "subtitle", material: ["<p>x</p>"] },
    ],
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[0\]\.heading: subtitle is not a value this property takes\b/);
  assert.match(findings[0], /title and page/);
  // Ignored, not fatal: the page is still written, with the heading it would
  // have had. That is `readDirective`'s behaviour in the scanner.
  assert.equal(pages[0].blocks[0].properties.heading, undefined);
  assert.equal(cheatsheets(pages)[0].heading, "Working with arrays");
});

test("a property of the wrong type is reported with the type it was given", () => {
  const { findings } = sitePages(oneEntry({ title: ["Working with arrays"] }));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[0\]\.title: \["Working with arrays"\] is an array\b/);
});

test("an entry that names no page is dropped", () => {
  const { pages, findings } = sitePages({ [ENTRIES_PROPERTY]: [{ material: ["<p>x</p>"] }] });
  assert.deepEqual(pages, []);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[0\]\.page: an entry names the page it stands for\b/);
});

test("and so is one naming a path outside the site", () => {
  const { pages, findings } = sitePages({
    [ENTRIES_PROPERTY]: [{ page: "../out.html", material: ["<p>x</p>"] }],
  });
  assert.deepEqual(pages, []);
  assert.match(findings[0], /^entries\[0\]\.page: \.\.\/out\.html is not a path inside the site\b/);
});

test("two entries for one page are one page, and the second is reported", () => {
  const { pages, findings } = sitePages({
    [ENTRIES_PROPERTY]: [
      { page: "a.html", material: ["<p>first</p>"] },
      { page: "A.html", material: ["<p>second</p>"] },
    ],
  });
  assert.equal(pages.length, 1);
  assert.equal(pages[0].blocks[0].content, "<p>first</p>", "the later entry won");
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[1\]\.page: A\.html is the page entries\[0\] already stands for\b/);
});

test("a name that is not a file name is reported and the page keeps its own", () => {
  const { pages, findings } = sitePages(oneEntry({ name: "../out" }));
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[0\]\.name: \.\.\/out is not a file name\b/);
  assert.equal(cheatsheets(pages)[0].name, "guide.html");
});

test("material written as anything but a list writes no page for the entry", () => {
  const { pages, findings } = sitePages(oneEntry({ material: "<p>x</p>" }));
  assert.deepEqual(pages[0].blocks, []);
  assert.match(findings[0], /^entries\[0\]\.material: material is a list of blocks and this is string\b/);
});

test("a block that is neither markup nor a record is dropped and the rest kept", () => {
  const { pages, findings } = sitePages(oneEntry({ material: [42, "<p>kept</p>"] }));
  assert.equal(pages[0].blocks.length, 1);
  assert.equal(pages[0].blocks[0].content, "<p>kept</p>");
  assert.match(findings[0], /^entries\[0\]\.material\[0\]: a block is markup or a record\b/);
});

test("a block with no markup is dropped, and an element name that is not one is reported", () => {
  const noMarkup = sitePages(oneEntry({ material: [{ [MATERIAL_TAG_PROPERTY]: "table" }] }));
  assert.deepEqual(noMarkup.pages[0].blocks, []);
  assert.match(noMarkup.findings[0], /material\[0\]\.markup: a block holds its markup here\b/);

  const badTag = sitePages(
    oneEntry({ material: [{ [MATERIAL_TAG_PROPERTY]: "1bad", [MATERIAL_MARKUP]: "<p>x</p>" }] })
  );
  assert.equal(badTag.pages[0].blocks[0].tag, MATERIAL_TAG, "a refused element name was used anyway");
  assert.match(badTag.findings[0], /material\[0\]\.tag: "1bad" is not an element name\b/);
  assert.match(badTag.findings[0], new RegExp(CHEATSHEET_BLOCK));
});

test("an entry that is not a record is dropped with its properties named", () => {
  const { pages, findings } = sitePages({ [ENTRIES_PROPERTY]: ["nope"] });
  assert.deepEqual(pages, []);
  assert.match(findings[0], /^entries\[0\]: an entry is a record of properties and this is string\b/);
  assert.match(findings[0], /page, title, heading, group, name, material/);
});

test("group: folder at the site root is reported, naming the entry", () => {
  const { findings } = sitePages({
    [ENTRIES_PROPERTY]: [{ page: "a.html", group: "folder", material: ["<p>x</p>"] }],
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^entries\[0\]\.group: folder asks this page to join\b/);
});

test("an entry asking for a title it did not give is told, by the shared reader", () => {
  // `headingFor` composes this, which is the point of the case: the data route
  // runs the scanner's own judgement rather than a second one, so the sentence
  // names the page the way every other shared finding does.
  const { findings } = sitePages(
    oneEntry({ heading: "title", title: undefined, material: ["<p>x</p>"] })
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0], /^guide\/arrays\.html: heading: title asks for the page's <title> and/);
});

// ---------------------------------------------------------------------------
// ## What is refused outright
// ---------------------------------------------------------------------------

test("a file that is not a record is refused rather than read", () => {
  for (const data of [[], null, 7, "a data file"]) {
    const { refused, pages } = sitePages(data);
    assert.ok(refused !== null, `${JSON.stringify(data)} was read as a data file`);
    assert.match(refused, /^a data file is a record of properties\b/);
    assert.deepEqual(pages, []);
  }
});

test("a file with no entries is refused, and says how to write them", () => {
  const { refused } = sitePages({ menu: "dropdown" });
  assert.match(refused, /^entries is the pages of the site and is not set\b/);
  assert.match(refused, /one entry per page/);
});

test("a version this tool does not read is refused rather than read anyway", () => {
  // The asymmetry worth a case: a later vocabulary means properties this does
  // not know, and reading it anyway would drop them silently and write a site
  // that looks like the one that was asked for.
  const { refused, pages } = sitePages({ [VERSION_PROPERTY]: DATA_VERSION + 1, ...oneEntry() });
  assert.match(refused, new RegExp(`^${VERSION_PROPERTY} ${DATA_VERSION + 1} is not a version`));
  assert.deepEqual(pages, []);
});

test("and the version this tool does read is read, as is a file declaring none", () => {
  assert.equal(sitePages({ [VERSION_PROPERTY]: DATA_VERSION, ...oneEntry() }).refused, null);
  assert.equal(sitePages(oneEntry()).refused, null);
});

// ---------------------------------------------------------------------------
// ## One back end
// ---------------------------------------------------------------------------

test("a data file site and a marked up site write the same cheatsheet, byte for byte", async () => {
  // The claim this file exists to hold. The same material through both front
  // ends: an attribute on a page the scanner crawls, and an entry in a data
  // file. Everything past the read is imported rather than written, so the two
  // renders are the same bytes - and the day they stop being, this is what says
  // so.
  const material = "<h2>splice</h2><p>Removes and inserts in place.</p>";
  const root = await folder({
    "guide/arrays.html": [
      "<!DOCTYPE html>",
      "<html><head><title>Working with arrays</title></head>",
      "<body>",
      `<section ${CHEATSHEET_MARKER}>${material}</section>`,
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const crawled = cheatsheets(await collectSite(root));
    const read = cheatsheets(
      sitePages({
        [ENTRIES_PROPERTY]: [
          { page: "guide/arrays.html", title: "Working with arrays", material: [material] },
        ],
      }).pages
    );
    assert.equal(crawled.length, 1);
    assert.equal(read.length, 1);
    assert.equal(
      renderCheatsheet(read[0]),
      renderCheatsheet(crawled[0]),
      "the two front ends rendered different pages from the same material"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// ## The menu page
// ---------------------------------------------------------------------------

test("the menu page is the shared document around the shared menu", () => {
  const entries = [
    { target: `cheatsheets/${MASTER_NAME}`, text: "All Cheatsheets", master: true },
    { target: "cheatsheets/guide.html", text: "Guide", master: false },
  ];
  const markup = renderMenuPage("dropdown", entries, "cheatsheets", []);
  // The head every generated page carries, so the menu page is not a second
  // kind of document in the same folder.
  assert.match(markup, /^<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">/);
  assert.match(markup, /<meta name="generator" content="cheatsheet-site">/);
  assert.match(markup, /<title>Cheatsheet Menu<\/title>/);
  assert.match(markup, /<h1>Cheatsheet Menu<\/h1>/);
  // And the menu `renderMenu` builds, with links to its siblings rather than to
  // the folder it is already in.
  assert.match(markup, /<details>/);
  assert.match(markup, new RegExp(`<a href="${MASTER_NAME}">All Cheatsheets</a>`));
  assert.match(markup, /<a href="guide\.html">Guide<\/a>/);
  assert.doesNotMatch(markup, /href="cheatsheets\//, "a link walks into the folder it is written in");
});

test("the page mode links the one page carrying every cheatsheet", () => {
  const entries = [
    { target: `cheatsheets/${MASTER_NAME}`, text: "All Cheatsheets", master: true },
    { target: "cheatsheets/guide.html", text: "Guide", master: false },
  ];
  const markup = renderMenuPage("page", entries, "cheatsheets", []);
  assert.match(markup, new RegExp(`<a href="${MASTER_NAME}">All Cheatsheets</a>`));
  assert.doesNotMatch(markup, /<a href="guide\.html">/);
});

// ---------------------------------------------------------------------------
// ## The run
// ---------------------------------------------------------------------------

test("a run writes a page per entry, the master, the menu and the manifest", async () => {
  const root = await folder({
    "site.json": `${JSON.stringify(
      {
        menu: "dropdown",
        [ENTRIES_PROPERTY]: [
          { page: "guide/arrays.html", title: "Arrays", material: ["<p>splice</p>"] },
          { page: "guide/strings.html", title: "Strings", material: ["<p>slice</p>"] },
          { page: "index.html", title: "Notes", material: ["<p>start here</p>"] },
        ],
      },
      null,
      2
    )}\n`,
  });
  try {
    const { code, out, err } = await run([join(root, "site.json")]);
    assert.equal(code, 0, err);
    assert.match(out, /^3 entries read from site\.json, 3 with material$/m);
    assert.match(out, /^output folder {4}cheatsheets$/m);
    assert.match(out, /^pages written {4}3$/m);
    assert.match(out, new RegExp(`^menu written {5}1 {2}${MENU_PAGE} \\(dropdown\\)$`, "m"));
    assert.equal(err, "");
    assert.deepEqual((await readdir(join(root, "cheatsheets"))).sort(), [
      MASTER_NAME,
      MANIFEST_NAME,
      MENU_PAGE,
      "guide.html",
      "index.html",
    ].sort());
    // The manifest is the scanner's own, which is what the menu is filled from.
    const manifest = JSON.parse(await readFile(join(root, "cheatsheets", MANIFEST_NAME), "utf8"));
    assert.equal(manifest.output, "cheatsheets");
    assert.deepEqual(
      manifest.pages.map((one) => one.page),
      [MASTER_NAME, "guide.html", "index.html"]
    );
    // And the menu lists what the manifest records, the master page first.
    const menu = await readFile(join(root, "cheatsheets", MENU_PAGE), "utf8");
    for (const page of [MASTER_NAME, "guide.html", "index.html"]) {
      assert.match(menu, new RegExp(`<a href="${page}">`), `${page} is not in the menu`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and a second run reads the folder the first recorded", async () => {
  const root = await folder({ "site.json": JSON.stringify(oneEntry()) });
  try {
    assert.equal((await run([join(root, "site.json")])).code, 0);
    const again = await run([join(root, "site.json")]);
    assert.equal(again.code, 0, again.err);
    assert.match(again.out, new RegExp(`read from ${MANIFEST_NAME}`));
    // One folder rather than a second beside it, which is the whole point of
    // reading the manifest back.
    assert.deepEqual((await readdir(join(root, "cheatsheets"))).sort(), [
      MASTER_NAME,
      MANIFEST_NAME,
      "guide.html",
    ].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--dry-run reports the plan and touches nothing", async () => {
  const root = await folder({ "site.json": JSON.stringify({ menu: "page", ...oneEntry() }) });
  try {
    const { code, out } = await run([join(root, "site.json"), "--dry-run"]);
    assert.equal(code, 0);
    // Two: the cheatsheet and the master page carrying it, which is what the
    // scanner plans for one marked page as well.
    assert.match(out, /^pages to write {3}2$/m);
    assert.match(out, new RegExp(`^menu to write {4}1 {2}${MENU_PAGE} \\(page\\)$`, "m"));
    assert.match(out, /nothing was written, because --dry-run/);
    assert.deepEqual(await readdir(root), ["site.json"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--out writes where it is told", async () => {
  const root = await folder({ "site.json": JSON.stringify(oneEntry()) });
  const out = join(root, "elsewhere");
  try {
    const { code } = await run([join(root, "site.json"), "--out", out]);
    assert.equal(code, 0);
    assert.ok((await readdir(out)).includes("guide.html"));
    assert.ok(!(await readdir(root)).includes("cheatsheets"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a menu asked for on a file with nothing to list is reported, not written", async () => {
  const root = await folder({
    "site.json": JSON.stringify({ menu: "dropdown", [ENTRIES_PROPERTY]: [{ page: "a.html" }] }),
  });
  try {
    const { code, out, err } = await run([join(root, "site.json")]);
    assert.equal(code, 1);
    assert.match(out, /^menu written {5}0$/m);
    assert.match(err, /menu: dropdown asks for a menu and nothing could be read out of the entries/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and a cheatsheet that wants the menu's name keeps it, the menu going unwritten", async () => {
  const root = await folder({
    "site.json": JSON.stringify({
      menu: "dropdown",
      [ENTRIES_PROPERTY]: [{ page: MENU_PAGE, title: "Mine", material: ["<p>x</p>"] }],
    }),
  });
  try {
    const { code, err } = await run([join(root, "site.json")]);
    assert.equal(code, 1);
    assert.match(err, new RegExp(`is already written as ${MENU_PAGE}, so no menu page was written`));
    // The cheatsheet is there and is the site's, rather than a menu written
    // over it.
    const held = await readFile(join(root, "cheatsheets", MENU_PAGE), "utf8");
    assert.match(held, /<title>Mine<\/title>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a file that is not there, is not JSON, or is refused, exits 2 and writes nothing", async () => {
  const root = await folder({
    "broken.json": "{ not json",
    "shape.json": JSON.stringify([{ page: "a.html" }]),
  });
  try {
    const missing = await run([join(root, "nothing.json")]);
    assert.equal(missing.code, 2);
    assert.match(missing.err, /could not be read/);

    const broken = await run([join(root, "broken.json")]);
    assert.equal(broken.code, 2);
    assert.match(broken.err, /is not JSON\./);

    const shape = await run([join(root, "shape.json")]);
    assert.equal(shape.code, 2);
    assert.match(shape.err, /a data file is a record of properties/);

    assert.deepEqual((await readdir(root)).sort(), ["broken.json", "shape.json"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("naming no file at all prints the usage and exits 2", async () => {
  const { code, err } = await run([]);
  assert.equal(code, 2);
  assert.match(err, /name the data file to read/);
  assert.match(err, /Usage: node tools\/cheatsheet-data\.mjs/);
});

test("--help prints the contract, read off the contract", async () => {
  const { code, out } = await run(["--help"]);
  assert.equal(code, 0);
  // Every property, with the vocabulary it takes - which is the usage text
  // being a reading of `DATA_PROPERTIES` rather than a list beside it.
  for (const [name, one] of Object.entries(DATA_PROPERTIES)) {
    assert.match(out, new RegExp(`^ {2}${name}: `, "m"), `${name} is not in the usage`);
    assert.ok(out.includes(one.sets), `${name} does not say what it sets`);
    if (one.values === null) continue;
    assert.ok(out.includes(one.values.join(" | ")), `${name} does not print its vocabulary`);
  }
});
