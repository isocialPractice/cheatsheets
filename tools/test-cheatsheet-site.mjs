// What `tools/cheatsheet-site.mjs` promises, held against site trees built for
// the purpose.
//
// The tool crawls **somebody else's** site, so every case here builds its own
// tree in the system temporary folder rather than marking up anything in this
// repository. That is the rule the fixture tests settled and it has a second
// reason here: a page in this repository carrying `data-cheatsheet` would be
// collected by any later run of the tool against this folder, and this
// repository is not a site the tool is for.
//
// Five questions are asked, one per item the file closes.
//
//   1. **Does the collector read the markup a site actually writes?** Not the
//      markup a test would write to be easy - nested elements of the same name,
//      an attribute whose name merely starts the same way, a marker inside a
//      comment, markup that is never closed. There is no HTML parser here and
//      there may not be one, so what the scanner does at each of those is the
//      whole of what the collector is.
//   2. **Is the output folder resolved before anything is written?** The
//      ladder's shape, the folder a taken name sends it to, and the separation
//      that makes the ladder reachable at all: a resolution that created what
//      it tested would never see past its first candidate.
//   3. **Does the marker's value choose the heading?** `title` and `page` name
//      the two sources, and the cases that matter are the ones either side of
//      them: a value that names neither, a `title` on a page that has none, and
//      two sources named on one page.
//   4. **Does a second run land where the first one did?** The manifest is what
//      makes that true, and the case below it is the one that says what it buys
//      - with the manifest deleted, run two resolves a second folder beside the
//      first and says nothing about it.
//   5. **Is a second run over an unchanged site byte identical?** Held over
//      three runs rather than two, with the manifest included in the comparison,
//      and paired with the case that shows identical is not frozen: a page the
//      site changed is the only page that changes.
//
// Run with: node --test tools/test-cheatsheet-site.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  attributeValue,
  collectMarked,
  collectSite,
  crawlSite,
  headingFor,
  main,
  manifestFor,
  nameCollisions,
  opaqueRanges,
  outputCandidates,
  pageFilename,
  plannedPages,
  readManifest,
  renderPage,
  resolveOutput,
  titleOf,
  writeManifest,
  writePages,
  GENERATOR,
  HEADING_SOURCES,
  MANIFEST_NAME,
  MANIFEST_VERSION,
  MARKER,
  MAX_OUTPUT_TRIES,
  NOT_SITE,
  OUTPUT_NAME,
  PAGE_EXTENSIONS,
  UNCLOSED,
  USAGE,
} from "./cheatsheet-site.mjs";

/**
 * A site tree, written under the system temporary folder.
 *
 * @param {Record<string, string>} files Site relative path to contents.
 * @returns {Promise<string>} The site root.
 */
async function site(files) {
  const root = await mkdtemp(join(tmpdir(), "cheatsheet-site-"));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, ...path.split("/"));
    await mkdir(join(full, ".."), { recursive: true });
    await writeFile(full, contents, "utf8");
  }
  return root;
}

/** A page with one marked block, for the cases that are not about the markup. */
function page(title, inner) {
  return `<!DOCTYPE html>\n<html><head><title>${title}</title></head>\n<body>\n<div ${MARKER}>${inner}</div>\n</body></html>\n`;
}

/**
 * A page whose marker carries a value, and which may have no `<title>`.
 *
 * @param {string | null} title `null` writes no `<title>` element at all.
 * @param {string | null} value `null` writes the marker with no value.
 * @param {string} inner
 */
function marked(title, value, inner) {
  const head = title === null ? "<head></head>" : `<head><title>${title}</title></head>`;
  const attribute = value === null ? MARKER : `${MARKER}="${value}"`;
  return `<!DOCTYPE html>\n<html>${head}\n<body>\n<div ${attribute}>${inner}</div>\n</body></html>\n`;
}

/**
 * Every file of a folder, as bytes, keyed by name.
 *
 * Read as `latin1` rather than `utf8`, which is a lossless byte for byte round
 * trip for any sequence: the comparison this feeds is about bytes, and a `utf8`
 * read would compare what the bytes decode to instead.
 *
 * @param {string} dir
 * @returns {Promise<Record<string, string>>}
 */
async function folderBytes(dir) {
  /** @type {Record<string, string>} */
  const bytes = {};
  for (const name of (await readdir(dir)).sort()) {
    bytes[name] = readFileSync(join(dir, name), "latin1");
  }
  return bytes;
}

/**
 * Runs the command with both streams captured.
 *
 * @param {string[]} argv
 * @returns {Promise<{ code: number, out: string, err: string }>}
 */
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

// ## The collector

test("a marked element gives back what it wraps, and not the wrapper", () => {
  const found = collectMarked(`<section ${MARKER}><p>Splice</p></section>`);
  assert.equal(found.length, 1);
  assert.equal(found[0].tag, "section");
  // The inner markup. The wrapper is how the site owner said it, not part of
  // what they said.
  assert.equal(found[0].content, "<p>Splice</p>");
  assert.equal(found[0].value, null);
});

test("and it reads the attribute's value where there is one, without judging it", () => {
  // Which values mean what is **The Parent Tag Method**'s to decide. What this
  // has to do is carry over what was written, including the difference between
  // an attribute with no value and one set to the empty string.
  assert.equal(collectMarked(`<div ${MARKER}="title">x</div>`)[0].value, "title");
  assert.equal(collectMarked(`<div ${MARKER}='page'>x</div>`)[0].value, "page");
  assert.equal(collectMarked(`<div ${MARKER}=page>x</div>`)[0].value, "page");
  assert.equal(collectMarked(`<div ${MARKER}="">x</div>`)[0].value, "");
  assert.equal(collectMarked(`<div ${MARKER}>x</div>`)[0].value, null);
});

test("nesting of the same element is counted rather than stopped at the first close", () => {
  // The case a scanner gets wrong and a parser gets right for free, which is
  // why it is the first one written: a marked `<div>` holding three more ends
  // at the fourth `</div>`.
  const html = `<div ${MARKER}><div><div>deep</div></div><p>after</p></div><div>outside</div>`;
  const found = collectMarked(html);
  assert.equal(found.length, 1);
  assert.equal(found[0].content, "<div><div>deep</div></div><p>after</p>");
  assert.ok(!found[0].content.includes("outside"));
});

test("and an element whose name merely starts the same way does not raise the depth", () => {
  // `<section` inside a `<sec>` would close the outer element early if the scan
  // compared prefixes rather than whole names.
  const html = `<sec ${MARKER}><section>inner</section>tail</sec>`;
  const found = collectMarked(html);
  assert.equal(found.length, 1);
  assert.equal(found[0].content, "<section>inner</section>tail");
});

test("an attribute whose name starts with the marker is a different attribute", () => {
  // `data-cheatsheet-menu` is real and belongs to **The Menu Element**. A
  // prefix match would collect the menu's placeholder as cheatsheet material
  // on every page that had one.
  assert.deepEqual(collectMarked(`<div ${MARKER}-menu="dropdown"></div>`), []);
  assert.equal(collectMarked(`<div ${MARKER}-menu="page"></div><p ${MARKER}>real</p>`).length, 1);
});

test("a `>` inside an attribute value is not the end of the tag", () => {
  // Both ways this went wrong, measured 2026.11.02 and fixed 2026.11.03. A `>`
  // in an attribute value is legal HTML and needs no escaping, so neither page
  // below is malformed and neither failure had anything to report itself with.

  // Before the attribute: the `>` inside `title` looked like the end of the
  // tag, so the marker read as sitting outside one and the page contributed
  // nothing at all.
  const before = collectMarked(`<div title="a>b" ${MARKER}><pre>REAL</pre></div>`);
  assert.equal(before.length, 1);
  assert.equal(before[0].tag, "div");
  assert.equal(before[0].value, null);
  assert.equal(before[0].content, "<pre>REAL</pre>");

  // Inside the marker's own value: the tag was cut at that `>`, so the value
  // came back as `"a` and the rest of the start tag was carried onto the
  // generated page as content.
  const within = collectMarked(`<div ${MARKER}="a>b"><pre>REAL</pre></div>`);
  assert.equal(within.length, 1);
  assert.equal(within[0].value, "a>b");
  assert.equal(within[0].content, "<pre>REAL</pre>");

  // Single quotes are a value the same way, and an `=` with space around it is
  // still an `=`.
  assert.equal(collectMarked(`<div ${MARKER}='p>q'>R</div>`)[0].value, "p>q");
  assert.equal(collectMarked(`<div ${MARKER} = "page" >R</div>`)[0].value, "page");

  // A quote only opens a value where an `=` introduced one, which is what
  // keeps an unquoted value carrying one readable the way a browser reads it.
  assert.equal(collectMarked(`<div class=a"b ${MARKER}>Y</div>`)[0].content, "Y");

  // And the marker genuinely outside a tag is still not a marker: here the
  // `<div title=a>` really does end before it, so what follows is text.
  assert.deepEqual(collectMarked(`<div title=a>b ${MARKER}=page><p>X</p></div>`), []);
});

test("and the same boundary is read when counting to the closing tag", () => {
  // `<div title="a/>b">` is a plain open. Taking the first `>` ended the tag
  // early and left a `/` in front of it, so the depth never rose, the first
  // `</div>` closed the marked element, and `TAIL` was dropped in silence - the
  // count had reached zero, so the page looked cleanly closed.
  const found = collectMarked(`<div ${MARKER}><div title="a/>b">inner</div>TAIL</div>`);
  assert.equal(found.length, 1);
  assert.equal(found[0].status, undefined);
  assert.equal(found[0].content, `<div title="a/>b">inner</div>TAIL`);

  // A genuine XHTML style close is still not a nesting level, which is the
  // behaviour the scan has to keep rather than trade for the one above.
  const xhtml = collectMarked(`<div ${MARKER}><div/>inner</div>`);
  assert.equal(xhtml.length, 1);
  assert.equal(xhtml[0].content, "<div/>inner");
});

test("a closing tag spelled inside an attribute value is the limit the scan keeps", () => {
  // Stated as a limit in the file's header rather than fixed: closing it needs
  // the depth walk to pass over whole start tags instead of searching for one
  // name. An unescaped `<` in an attribute value is a parse error, unlike the
  // `>` above, so this is one step past the markup a site may legally write.
  // The case is here so the limit is measured and a later fix has a case to
  // flip rather than to discover.
  const found = collectMarked(`<div ${MARKER}><p title="</div>">x</p>TAIL</div>`);
  assert.equal(found.length, 1);
  assert.equal(found[0].content, `<p title="`);
});

test("a marker inside a comment, a script or a style is not a marker", () => {
  // A commented out section is exactly where a site owner leaves markup they
  // have decided against, and a string in a script is not markup at all.
  assert.deepEqual(collectMarked(`<!-- <div ${MARKER}>off</div> -->`), []);
  assert.deepEqual(collectMarked(`<script>var a = '<div ${MARKER}>x</div>';</script>`), []);
  assert.deepEqual(collectMarked(`<style>/* ${MARKER} */</style>`), []);
  // And the real one beside them is still found, which is what makes the skip
  // a skip rather than the scan giving up.
  const mixed = `<!-- <div ${MARKER}>off</div> --><p ${MARKER}>on</p>`;
  assert.deepEqual(collectMarked(mixed).map((one) => one.content), ["on"]);
});

test("an unclosed marked element is reported rather than guessed at", () => {
  const found = collectMarked(`<div ${MARKER}><p>Splice</p>`);
  assert.equal(found.length, 1);
  assert.equal(found[0].status, UNCLOSED);
  // Everything after it, which is what a browser would show and is the honest
  // reading - but recorded as a finding, so the site owner is told rather than
  // handed a page with the rest of their file in it.
  assert.equal(found[0].content, "<p>Splice</p>");
});

test("a marked element that cannot enclose anything is a finding, not a silent skip", () => {
  for (const html of [`<img ${MARKER} src="a.png">`, `<br ${MARKER}>`, `<div ${MARKER}/>`]) {
    const found = collectMarked(html);
    assert.equal(found.length, 1, html);
    assert.equal(found[0].status, "empty", html);
    assert.equal(found[0].content, "");
  }
});

test("a marked element inside a marked element is collected once, as part of the outer", () => {
  // Twice would put the same material on the generated page twice; the inner
  // alone would drop everything its parent wrapped around it.
  const html = `<section ${MARKER}><p>lead</p><div ${MARKER}>inner</div></section>`;
  const found = collectMarked(html);
  assert.equal(found.length, 1);
  assert.equal(found[0].tag, "section");
  assert.ok(found[0].content.includes("inner"));
});

test("a closing tag inside a script, a style or a comment does not close the element", () => {
  // The silent one. A marker inside those spans was already dropped, but the
  // count that finds where the element ends read them as markup too, so a
  // `</div>` in a script string ended the element at it - handing back content
  // that stopped in the wrong place, with no finding against it, because as far
  // as the count was concerned the element had closed cleanly.
  const scripted = `<div ${MARKER}>\n<script>document.write("</div>");</script>\n<pre>real</pre>\n</div>`;
  const [block] = collectMarked(scripted);
  assert.equal(block.status, undefined);
  assert.ok(block.content.includes("<pre>real</pre>"), block.content);

  const commented = `<div ${MARKER}><!-- </div> --><pre>real</pre></div>`;
  assert.equal(collectMarked(commented)[0].content, "<!-- </div> --><pre>real</pre>");

  const styled = `<section ${MARKER}><style>/* </section> */</style><pre>real</pre></section>`;
  assert.ok(collectMarked(styled)[0].content.includes("<pre>real</pre>"));

  // And an *opening* tag in one of those spans is not a nesting level either,
  // which is the same mistake from the other side: counting it would leave the
  // element looking unclosed and report a finding against markup that was fine.
  const opened = `<div ${MARKER}><script>var a = "<div>";</script><pre>real</pre></div>`;
  const [one] = collectMarked(opened);
  assert.equal(one.status, undefined);
  assert.ok(one.content.includes("<pre>real</pre>"));
});

test("several marked elements come back in source order", () => {
  const html = `<p ${MARKER}>one</p><p ${MARKER}>two</p><p ${MARKER}>three</p>`;
  assert.deepEqual(collectMarked(html).map((one) => one.content), ["one", "two", "three"]);
  // In source order by offset, not by where the scan happened to resume.
  const offsets = collectMarked(html).map((one) => one.at);
  assert.deepEqual([...offsets].sort((a, b) => a - b), offsets);
});

test("an unclosed comment swallows the rest of the document, as a browser would", () => {
  // The safe reading: markup after an unclosed comment was never going to be
  // published, so a marker in it is not one.
  assert.deepEqual(collectMarked(`<!-- <div ${MARKER}>x</div>`), []);
  const ranges = opaqueRanges("<!-- unterminated");
  assert.deepEqual(ranges, [[0, "<!-- unterminated".length]]);
});

test("the attribute reader and the title reader answer the plain cases", () => {
  assert.equal(attributeValue('<div class="a" data-x="b">', "data-x"), "b");
  assert.equal(attributeValue("<div data-x>", "data-x"), null);
  assert.equal(titleOf("<head><title>  Splicing\n  Arrays </title></head>"), "Splicing Arrays");
  assert.equal(titleOf("<head></head>"), null);
  assert.equal(titleOf("<title></title>"), null);
});

// ## The crawl

test("the crawl finds the pages of a tree and nothing else", async () => {
  const root = await site({
    "index.html": page("Home", "<p>a</p>"),
    "guide/one.htm": page("One", "<p>b</p>"),
    "guide/notes.md": "# not a page",
    "styles.css": "body{}",
    "node_modules/pkg/index.html": page("Dependency", "<p>no</p>"),
    ".hidden/secret.html": page("Hidden", "<p>no</p>"),
  });
  try {
    const pages = await crawlSite(root);
    const ids = pages.map((path) => path.slice(root.length + 1).split(/[\\/]/).join("/"));
    assert.deepEqual(ids, ["guide/one.htm", "index.html"]);
    // Both extensions, and the two folders a site has for reasons unrelated to
    // what it publishes.
    assert.deepEqual(PAGE_EXTENSIONS, [".html", ".htm"]);
    assert.ok(NOT_SITE.includes("node_modules"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and it is sorted by path, because the pages it produces are meant to be diffed", async () => {
  // `readdir` answers in whatever order the filesystem holds. A walk that
  // reordered itself between two machines would make committing the generated
  // pages impossible before the item asking for it was reached.
  const root = await site({
    "zebra.html": page("Z", "<p>z</p>"),
    "alpha.html": page("A", "<p>a</p>"),
    "mid/beta.html": page("B", "<p>b</p>"),
  });
  try {
    const once = await crawlSite(root);
    const again = await crawlSite(root);
    assert.deepEqual(once, again);
    assert.deepEqual([...once].sort(), once);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the output folder is never crawled, so a second run does not collect its own output", async () => {
  const root = await site({
    "index.html": page("Home", "<p>a</p>"),
    [`${OUTPUT_NAME}/index.html`]: page("Generated", "<p>already written</p>"),
  });
  try {
    const pages = await crawlSite(root);
    assert.equal(pages.length, 1);
    assert.ok(NOT_SITE.includes(OUTPUT_NAME));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## The output folder

test("the ladder is cheatsheets, then inside it, then numbered inside it", () => {
  const names = outputCandidates(5);
  assert.deepEqual(names, [
    "cheatsheets",
    "cheatsheets/cheatsheets",
    "cheatsheets/cheatsheets_0",
    "cheatsheets/cheatsheets_1",
    "cheatsheets/cheatsheets_2",
  ]);
  // Every name after the first is inside the first, which is what leaves a
  // site with one folder called `cheatsheets` however many names have been
  // resolved under it - rather than a row of siblings beside its own content.
  for (const name of names.slice(1)) assert.ok(name.startsWith(`${OUTPUT_NAME}/`));
  assert.equal(outputCandidates().length, MAX_OUTPUT_TRIES);
});

test("a free name is taken as it stands", async () => {
  const root = await site({ "index.html": page("Home", "<p>a</p>") });
  try {
    const out = await resolveOutput(root);
    assert.equal(out.name, OUTPUT_NAME);
    assert.deepEqual(out.tried, [OUTPUT_NAME]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and a taken one sends the output inside it", async () => {
  const root = await site({ "index.html": page("Home", "<p>a</p>"), [`${OUTPUT_NAME}/own.html`]: "<p>theirs</p>" });
  try {
    const first = await resolveOutput(root);
    assert.equal(first.name, `${OUTPUT_NAME}/${OUTPUT_NAME}`);
    // And again once that is taken too, which is where the counting starts.
    await mkdir(join(root, OUTPUT_NAME, OUTPUT_NAME), { recursive: true });
    const second = await resolveOutput(root);
    assert.equal(second.name, `${OUTPUT_NAME}/${OUTPUT_NAME}_0`);
    await mkdir(join(root, OUTPUT_NAME, `${OUTPUT_NAME}_0`), { recursive: true });
    assert.equal((await resolveOutput(root)).name, `${OUTPUT_NAME}/${OUTPUT_NAME}_1`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a file with the folder's name counts as taken, which is the failure this avoids", async () => {
  // Writing into it would be the one outcome resolving up front exists to
  // prevent, and `stat` is what makes a file and a folder the same answer.
  const root = await site({ "index.html": page("Home", "<p>a</p>"), [OUTPUT_NAME]: "not a folder" });
  try {
    assert.equal((await resolveOutput(root)).name, `${OUTPUT_NAME}/${OUTPUT_NAME}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("resolving creates nothing, which is what makes the ladder reachable", async () => {
  // The separation the item is actually about. A resolution that created the
  // folder as it tested it would find the first candidate existing by the time
  // it considered the second, so no site would ever reach a second name.
  const root = await site({ "index.html": page("Home", "<p>a</p>") });
  try {
    const once = await resolveOutput(root);
    assert.deepEqual(await readdir(root), ["index.html"]);
    const again = await resolveOutput(root);
    assert.equal(again.name, once.name);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a tree with every name taken is refused with what to do about it", async () => {
  const files = { "index.html": page("Home", "<p>a</p>") };
  for (const name of outputCandidates(4)) files[`${name}/.keep`] = "";
  const root = await site(files);
  try {
    await assert.rejects(
      () => resolveOutput(root, { tries: 4 }),
      /every one of the 4 output folder names is taken/
    );
    await assert.rejects(() => resolveOutput(root, { tries: 4 }), /Pass --out to name one/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## Collecting and writing a site

test("a page with no marked element contributes nothing and is written nowhere", async () => {
  // Not a rule applied here but the absence of one: the collector found nothing
  // on it, so there is no empty page to suppress. **Skip a page carrying no
  // marked element** states it as a rule of the parent tag method.
  const root = await site({
    "marked.html": page("Marked", "<p>material</p>"),
    "plain.html": "<!DOCTYPE html><html><head><title>Plain</title></head><body><p>nothing</p></body></html>",
  });
  try {
    const pages = await collectSite(root);
    assert.equal(pages.length, 2);
    assert.deepEqual(pages.filter((one) => one.blocks.length > 0).map((one) => one.id), ["marked.html"]);
    const out = join(root, "out");
    const written = await writePages(pages, out);
    assert.deepEqual(written.map((one) => one.id), ["marked.html"]);
    assert.deepEqual(await readdir(out), ["marked.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a site that marked nothing has no output folder created for it", async () => {
  // The folder is still resolved - that is the item's wording - but a run with
  // nothing to write leaves no empty folder behind on somebody else's site.
  const root = await site({ "plain.html": "<html><body><p>nothing</p></body></html>" });
  try {
    const written = await writePages(await collectSite(root), join(root, "out"));
    assert.deepEqual(written, []);
    assert.deepEqual(await readdir(root), ["plain.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two pages wanting one output name is reported, and neither is overwritten", async () => {
  // The output folder is flat and a page is named for its source file's base
  // name, so `guide/index.html` and `reference/index.html` both want
  // `index.html` - and `index.html` is the commonest name a site has. Writing
  // both left one overwritten, the report claiming two and the exit code 0.
  const root = await site({
    "guide/index.html": page("Guide", "<pre>guide material</pre>"),
    "reference/index.html": page("Reference", "<pre>reference material</pre>"),
  });
  try {
    const pages = await collectSite(root);
    const findings = nameCollisions(pages);
    assert.equal(findings.length, 1);
    // The page that lost, named, and the page that claimed the name with it -
    // a finding naming only one of the two does not say what to rename.
    assert.match(findings[0], /^reference\/index\.html: would be written as index\.html/);
    assert.match(findings[0], /guide\/index\.html already claimed/);

    // First in page order wins, and the walk is sorted, so which one that is
    // does not depend on the filesystem.
    const out = join(root, "out");
    const written = await writePages(pages, out);
    assert.deepEqual(written.map((one) => one.id), ["guide/index.html"]);
    assert.deepEqual(await readdir(out), ["index.html"]);
    assert.ok(readFileSync(join(out, "index.html"), "utf8").includes("guide material"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and a site whose names are distinct has no collision to report", async () => {
  // The guard against a check that fires on everything: same base name in the
  // same folder is impossible, and two different names are not a collision
  // however deep the folders they sit in.
  const root = await site({
    "index.html": page("Home", "<p>a</p>"),
    "guide/splice.html": page("Splice", "<p>b</p>"),
    "reference/concat.html": page("Concat", "<p>c</p>"),
  });
  try {
    assert.deepEqual(nameCollisions(await collectSite(root)), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a page that collected nothing cannot collide, because it is never written", async () => {
  // `nameCollisions` reads the same pages `writePages` writes, so a page with
  // no material is not a page claiming a name. Otherwise an unmarked
  // `guide/index.html` would block a marked `reference/index.html`.
  const root = await site({
    "guide/index.html": "<!DOCTYPE html><html><head><title>Guide</title></head><body><p>nothing</p></body></html>",
    "reference/index.html": page("Reference", "<pre>reference material</pre>"),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(nameCollisions(pages), []);
    const written = await writePages(pages, join(root, "out"));
    assert.deepEqual(written.map((one) => one.id), ["reference/index.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the generated page carries the site's own markup and says where it came from", async () => {
  const root = await site({ "guide/splice.html": page("Splicing Arrays", "<pre>items.splice(1, 2)</pre>") });
  try {
    const [page_] = await collectSite(root);
    const markup = renderPage(page_);
    // The heading is the page's `<title>`; reading the marker's value to choose
    // between that and the file name is **The Parent Tag Method**'s.
    assert.match(markup, /<h1>Splicing Arrays<\/h1>/);
    assert.match(markup, /<meta name="cheatsheet-source" content="guide\/splice\.html">/);
    assert.match(markup, /<meta name="generator" content="cheatsheet-site">/);
    // The site's markup, carried through rather than escaped: the premise is
    // that the site already published it.
    assert.match(markup, /<pre>items\.splice\(1, 2\)<\/pre>/);
    assert.equal(pageFilename(page_), "splice.html");
    // And it ends with a newline, because these are files meant to be committed.
    assert.ok(markup.endsWith("\n"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a heading out of a title is escaped, because a title is text and not markup", async () => {
  const root = await site({ "x.html": page("Arrays &amp; <b>Objects</b>", "<p>a</p>") });
  try {
    const [one] = await collectSite(root);
    const markup = renderPage(one);
    // `titleOf` hands back the characters it read, so the `<b>` in a title is
    // text that has to be escaped on the way out or it is markup on arrival.
    assert.ok(!markup.includes("<h1>Arrays &amp; <b>"));
    assert.match(markup, /&lt;b&gt;Objects&lt;\/b&gt;/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a page with no title falls back to its file name", async () => {
  const root = await site({ "splice.html": `<html><body><div ${MARKER}><p>a</p></div></body></html>` });
  try {
    const [one] = await collectSite(root);
    assert.equal(one.title, null);
    assert.match(renderPage(one), /<h1>splice<\/h1>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("markup the scanner could not read comes back as a finding against its page", async () => {
  const root = await site({
    "broken.html": `<html><head><title>Broken</title></head><body><div ${MARKER}><p>a</p></body></html>`,
    "void.html": `<html><body><img ${MARKER} src="a.png"></body></html>`,
  });
  try {
    const pages = await collectSite(root);
    const findings = pages.flatMap((one) => one.findings);
    assert.equal(findings.length, 2);
    assert.ok(findings.some((one) => one.startsWith("broken.html:") && /never closed/.test(one)));
    assert.ok(findings.some((one) => one.startsWith("void.html:") && /cannot enclose anything/.test(one)));
    // Each names the page, because a site owner runs this over a tree and
    // needs to know which file to open.
    for (const finding of findings) assert.match(finding, /^[\w.]+\.html: /);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## The command

test("the command crawls, resolves, writes and reports, in that order", async () => {
  const root = await site({
    "index.html": page("Home", "<p>one</p>"),
    "guide/two.html": page("Two", "<p>two</p>"),
    "plain.html": "<html><body><p>nothing</p></body></html>",
  });
  const printed = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk) => (printed.push(String(chunk)), true);
  try {
    const code = await main([root]);
    process.stdout.write = write;
    assert.equal(code, 0);
    const out = printed.join("");
    assert.match(out, /3 pages crawled, 2 marked/);
    assert.match(out, new RegExp(`output folder\\s+${OUTPUT_NAME}`));
    assert.match(out, /pages written\s+2/);
    // And the folder really holds them, under the name the report gave, with
    // the manifest beside them: the folder records where it is so the next run
    // writes here rather than resolving a second one.
    assert.deepEqual(
      (await readdir(join(root, OUTPUT_NAME))).sort(),
      [MANIFEST_NAME, "index.html", "two.html"].sort()
    );
  } finally {
    process.stdout.write = write;
    await rm(root, { recursive: true, force: true });
  }
});

test("--out writes where it says instead of resolving a name", async () => {
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  const write = process.stdout.write;
  process.stdout.write = () => true;
  try {
    const code = await main([root, "--out", join(root, "elsewhere")]);
    process.stdout.write = write;
    assert.equal(code, 0);
    assert.deepEqual((await readdir(join(root, "elsewhere"))).sort(), [MANIFEST_NAME, "index.html"].sort());
    // And nothing was resolved, so the site has no `cheatsheets/` it did not ask for.
    assert.deepEqual((await readdir(root)).sort(), ["elsewhere", "index.html"]);
  } finally {
    process.stdout.write = write;
    await rm(root, { recursive: true, force: true });
  }
});

test("a site with unreadable markup exits non-zero and still writes what it could read", async () => {
  // A finding is the site's to fix, and not a reason to leave the pages that
  // were fine unwritten: a site owner correcting one page should not have to
  // wait for the whole section to regenerate.
  const root = await site({
    "good.html": page("Good", "<p>fine</p>"),
    "bad.html": `<html><body><img ${MARKER} src="a.png"></body></html>`,
  });
  const write = process.stdout.write;
  const err = process.stderr.write;
  const printed = [];
  process.stdout.write = () => true;
  process.stderr.write = (chunk) => (printed.push(String(chunk)), true);
  try {
    const code = await main([root]);
    process.stdout.write = write;
    process.stderr.write = err;
    assert.equal(code, 1);
    assert.match(printed.join(""), /cheatsheet-site: bad\.html: /);
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, "good.html"].sort());
  } finally {
    process.stdout.write = write;
    process.stderr.write = err;
    await rm(root, { recursive: true, force: true });
  }
});

test("a collision reaches the report and the exit code, like any other finding", async () => {
  // The report has to agree with the folder. It claimed two pages written with
  // one file on disk, which is the figure a site owner would check and the one
  // that would have told them something was wrong.
  const root = await site({
    "guide/index.html": page("Guide", "<pre>guide material</pre>"),
    "reference/index.html": page("Reference", "<pre>reference material</pre>"),
  });
  const write = process.stdout.write;
  const err = process.stderr.write;
  const out = [];
  const errs = [];
  process.stdout.write = (chunk) => (out.push(String(chunk)), true);
  process.stderr.write = (chunk) => (errs.push(String(chunk)), true);
  try {
    const code = await main([root]);
    process.stdout.write = write;
    process.stderr.write = err;
    assert.equal(code, 1);
    assert.match(out.join(""), /2 pages crawled, 2 marked/);
    assert.match(out.join(""), /pages written\s+1/);
    assert.match(errs.join(""), /cheatsheet-site: reference\/index\.html: would be written as index\.html/);
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, "index.html"].sort());
  } finally {
    process.stdout.write = write;
    process.stderr.write = err;
    await rm(root, { recursive: true, force: true });
  }
});

test("naming no site, or one that is not there, is refused rather than guessed at", async () => {
  const err = process.stderr.write;
  const printed = [];
  process.stderr.write = (chunk) => (printed.push(String(chunk)), true);
  try {
    assert.equal(await main([]), 2);
    assert.equal(await main([join(tmpdir(), "cheatsheet-site-nothing-here")]), 2);
    process.stderr.write = err;
    const out = printed.join("");
    assert.match(out, /name the site to crawl/);
    assert.match(out, /is not there/);
  } finally {
    process.stderr.write = err;
  }
});

test("--help prints the usage and the ladder, and writes nothing", async () => {
  const printed = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk) => (printed.push(String(chunk)), true);
  try {
    assert.equal(await main(["--help"]), 0);
    process.stdout.write = write;
    const out = printed.join("");
    assert.match(out, /Usage: node tools\/cheatsheet-site\.mjs <site>/);
    assert.match(out, new RegExp(`${OUTPUT_NAME}_0`));
    assert.ok(USAGE.includes(MARKER), "the usage does not name the attribute a site marks with");
  } finally {
    process.stdout.write = write;
  }
});

// ## Every marked element on a page is that page's reference material
//
// The collector cases above ask the question of a markup fragment. These ask it
// of a page, through `collectSite`, because that is the form the item is
// written in: what a page carries is what the page contributes.

test("a page's blocks are every element it marked, in source order, and nothing else", async () => {
  const root = await site({
    "guide.html": [
      "<!DOCTYPE html>",
      "<html><head><title>Guide</title></head>",
      "<body>",
      `<section ${MARKER}><pre>first</pre></section>`,
      "<p>prose between, marked by nobody</p>",
      `<div ${MARKER}><table><tr><td>second</td></tr></table></div>`,
      `<aside>also unmarked</aside>`,
      `<ul ${MARKER}><li>third</li></ul>`,
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    assert.equal(guide.id, "guide.html");
    assert.deepEqual(guide.blocks.map((one) => one.tag), ["section", "div", "ul"]);
    assert.deepEqual(guide.blocks.map((one) => one.content), [
      "<pre>first</pre>",
      "<table><tr><td>second</td></tr></table>",
      "<li>third</li>",
    ]);
    // The unmarked material is not reference material, which is the half of the
    // item that would be invisible if only the marked half were asserted.
    const markup = renderPage(guide);
    assert.ok(!markup.includes("prose between"));
    assert.ok(!markup.includes("also unmarked"));
    // And all three reach the page, each in its own `<main>`, in source order.
    assert.deepEqual(
      [...markup.matchAll(/<main data-cheatsheet-block="([a-z]+)">/g)].map((one) => one[1]),
      ["section", "div", "ul"]
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## The heading source

test('data-cheatsheet="title" takes the heading from the page\'s title element', async () => {
  const root = await site({ "guide/splice.html": marked("Splicing Arrays", "title", "<pre>x</pre>") });
  try {
    const [one] = await collectSite(root);
    assert.deepEqual(headingFor(one), { source: "title", heading: "Splicing Arrays", findings: [] });
    assert.ok(renderPage(one).includes("<h1>Splicing Arrays</h1>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('data-cheatsheet="page" takes it from the file name, title or no title', async () => {
  // The page has a `<title>` and does not use it, which is the whole of what
  // this value means: the two sources disagree and the site chose.
  const root = await site({ "guide/splice.html": marked("Splicing Arrays", "page", "<pre>x</pre>") });
  try {
    const [one] = await collectSite(root);
    assert.deepEqual(headingFor(one), { source: "page", heading: "splice", findings: [] });
    assert.ok(renderPage(one).includes("<h1>splice</h1>"));
    // Verbatim, because **Convert a camel case file name to prose** is the next
    // item under the same header. `splice` rather than `Splice`.
    assert.ok(!renderPage(one).includes("<h1>Splice</h1>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a marker with no value, and one set to the empty string, keep the behaviour the tool had", async () => {
  // The default is the `<title>` with the file name behind it. `collectMarked`
  // reports the difference between no value and the empty string, deliberately,
  // and this is where it stops mattering: a template with an empty variable
  // emits the second, and refusing it would fail on an accident.
  const root = await site({
    "a.html": marked("Has A Title", null, "<p>x</p>"),
    "b.html": marked("Has A Title", "", "<p>x</p>"),
    "c.html": marked(null, null, "<p>x</p>"),
    "d.html": marked(null, "", "<p>x</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(
      pages.map((one) => headingFor(one).heading),
      ["Has A Title", "Has A Title", "c", "d"]
    );
    assert.deepEqual(pages.flatMap((one) => one.findings), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the value is read trimmed and case insensitively, because it is written by hand", async () => {
  const root = await site({
    "a.html": marked("Title Here", " Title ", "<p>x</p>"),
    "b.html": marked("Title Here", "PAGE", "<p>x</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(pages.map((one) => headingFor(one).source), ["title", "page"]);
    assert.deepEqual(pages.flatMap((one) => one.findings), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an unrecognised value is a finding, and the default heading is still used", async () => {
  // A site owner who wrote something meant something, and handing back the
  // default in silence is how they come to believe the tool read their page.
  const root = await site({ "guide.html": marked("Guide", "heading", "<p>x</p>") });
  try {
    const [one] = await collectSite(root);
    const { source, heading, findings } = headingFor(one);
    assert.equal(source, "title");
    assert.equal(heading, "Guide");
    assert.equal(findings.length, 1);
    assert.match(findings[0], /^guide\.html: data-cheatsheet="heading" names no heading source/);
    assert.match(findings[0], /the heading came from title, the default/);
    // And it says what the values are, which is the difference between a
    // finding and a complaint.
    for (const value of HEADING_SOURCES) assert.ok(findings[0].includes(value));
    // The page is written anyway. Findings are the site's to fix.
    assert.ok(renderPage(one).includes("<h1>Guide</h1>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an unrecognised value beside a real one says which source answered, not that the default did", async () => {
  // The report prints the source a page was written from one line above the
  // findings, so a finding claiming a fallback that did not happen is a report
  // disagreeing with itself.
  const html = [
    "<html><head><title>Guide</title></head><body>",
    `<div ${MARKER}="heading"><p>a</p></div>`,
    `<div ${MARKER}="page"><p>b</p></div>`,
    "</body></html>",
  ].join("\n");
  const root = await site({ "guide.html": html });
  try {
    const [one] = await collectSite(root);
    const { source, heading, findings } = headingFor(one);
    assert.equal(source, "page");
    assert.equal(heading, "guide");
    // One finding: `heading` names no source, and `page` is the only source
    // named, so there is no disagreement between two sources to report.
    assert.equal(findings.length, 1);
    assert.match(findings[0], /the heading came from page\./);
    assert.ok(!findings[0].includes("the default"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an unrecognised value on a page with no title says the file name answered, not the default", async () => {
  // The default source is `title` and `title` falls back to the file name, so
  // on a page with no `<title>` the heading came from neither the value that
  // was written nor the source the finding would otherwise name. Saying
  // `title` here tells a site owner their heading was read from an element
  // their page has not got.
  const root = await site({ "guide.html": marked(null, "heading", "<p>x</p>") });
  try {
    const [one] = await collectSite(root);
    const { source, heading, findings } = headingFor(one);
    assert.equal(source, "title");
    assert.equal(heading, "guide");
    assert.equal(findings.length, 1);
    assert.match(findings[0], /the heading came from its file name, because the page has no <title>\./);
    assert.ok(!findings[0].includes("the default"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the same unrecognised value twice on one page is said once", async () => {
  // The finding names the page, so a repeat would print the same sentence
  // twice - which is how a report stops being read.
  const html = `<html><head><title>T</title></head><body><div ${MARKER}="x"><p>a</p></div><div ${MARKER}="x"><p>b</p></div></body></html>`;
  const root = await site({ "guide.html": html });
  try {
    const [one] = await collectSite(root);
    assert.equal(one.blocks.length, 2);
    assert.equal(headingFor(one).findings.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an explicit title on a page with no title element is a finding; the default on the same page is not', async () => {
  // The distinction the item turns on. The default has a documented fallback;
  // the ask does not, so a page told to use a heading it has not got is a page
  // whose generated heading is its file name for a reason nobody wrote down.
  const root = await site({
    "asked.html": marked(null, "title", "<p>x</p>"),
    "didnt.html": marked(null, null, "<p>x</p>"),
  });
  try {
    const [asked, didnt] = await collectSite(root);
    assert.equal(headingFor(asked).heading, "asked");
    assert.equal(headingFor(asked).findings.length, 1);
    assert.match(headingFor(asked).findings[0], /asks for the page's <title> and the page has none/);
    // Same missing title, no ask, no finding.
    assert.equal(headingFor(didnt).heading, "didnt");
    assert.deepEqual(headingFor(didnt).findings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two sources named on one page is reported, and the first in source order wins", async () => {
  // A page has one heading, so two blocks naming two is a page asking for two.
  const html = [
    "<html><head><title>Guide</title></head><body>",
    `<div ${MARKER}="page"><p>a</p></div>`,
    `<div ${MARKER}="title"><p>b</p></div>`,
    "</body></html>",
  ].join("\n");
  const root = await site({ "guide.html": html });
  try {
    const [one] = await collectSite(root);
    const { source, heading, findings } = headingFor(one);
    assert.equal(source, "page");
    assert.equal(heading, "guide");
    assert.equal(findings.length, 1);
    assert.match(findings[0], /ask for two different headings on one page/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a heading finding reaches the report and the exit code, like any other", async () => {
  const root = await site({ "guide.html": marked("Guide", "heading", "<p>x</p>") });
  try {
    const { code, err } = await run([root]);
    assert.equal(code, 1);
    assert.match(err, /cheatsheet-site: guide\.html: data-cheatsheet="heading" names no heading source/);
    // And the page it could read is there, as every other finding leaves it.
    assert.ok(readFileSync(join(root, OUTPUT_NAME, "guide.html"), "utf8").includes("<h1>Guide</h1>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the report names the source each page's heading came from", async () => {
  const root = await site({
    "a.html": marked("A Title", "title", "<p>x</p>"),
    "b.html": marked("B Title", "page", "<p>x</p>"),
  });
  try {
    const { code, out } = await run([root]);
    assert.equal(code, 0);
    assert.match(out, /a\.html -> a\.html \(title\)/);
    assert.match(out, /b\.html -> b\.html \(page\)/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## The manifest

test("the manifest records the folder it is in and the pages that were written", async () => {
  const root = await site({
    "index.html": marked("Home", "title", "<p>one</p>"),
    "guide/two.html": marked("Two", "page", "<p>two</p>"),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const manifest = JSON.parse(readFileSync(join(root, OUTPUT_NAME, MANIFEST_NAME), "utf8"));
    assert.equal(manifest.generator, GENERATOR);
    assert.equal(manifest.manifestVersion, MANIFEST_VERSION);
    assert.equal(manifest.marker, MARKER);
    assert.equal(manifest.output, OUTPUT_NAME);
    assert.deepEqual(manifest.pages, [
      { source: "guide/two.html", page: "two.html", heading: "two", headingSource: "page", blocks: 1 },
      { source: "index.html", page: "index.html", heading: "Home", headingSource: "title", blocks: 1 },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("every value in it is site relative, because a committed manifest is read on another machine", async () => {
  const root = await site({ "guide/two.html": page("Two", "<p>two</p>") });
  try {
    assert.equal((await run([root])).code, 0);
    const text = readFileSync(join(root, OUTPUT_NAME, MANIFEST_NAME), "utf8");
    assert.ok(!text.includes(root), "the manifest carries this machine's absolute path");
    assert.ok(!text.includes("\\\\"), "the manifest carries a Windows separator");
    assert.ok(text.includes('"guide/two.html"'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--out is recorded site relative too, because that route writes the same committed file", async () => {
  // The route the case above does not reach, and the one that carries a path
  // from outside the site: `--out` is whatever the site owner typed, so an
  // absolute path, a path relative to their shell, and a path with Windows
  // separators all arrive here. Each would be this machine's answer written
  // into a file read on another.
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    const out = join(root, "docs", "sheets");
    assert.equal((await run([root, "--out", out])).code, 0);
    const text = readFileSync(join(out, MANIFEST_NAME), "utf8");
    assert.equal(JSON.parse(text).output, "docs/sheets");
    assert.ok(!text.includes(root), "the manifest carries this machine's absolute path");
    assert.ok(!text.includes("\\\\"), "the manifest carries a Windows separator");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the folder a run names on screen is the folder it writes into the manifest", async () => {
  // One answer rather than two. They were measured in two places and the
  // report was the one that was right.
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    const out = join(root, "docs", "sheets");
    const { code, out: report } = await run([root, "--out", out]);
    assert.equal(code, 0);
    const named = /output folder\s+(\S+)/.exec(report);
    assert.ok(named !== null, "the report did not name an output folder");
    assert.equal(JSON.parse(readFileSync(join(out, MANIFEST_NAME), "utf8")).output, named[1]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("it carries no clock, which is the one field that would break the byte identical rerun", () => {
  // The obvious field for a generated file is the time it was generated, and
  // that single field is the whole of what would stop the second run below
  // matching the first. Built twice and compared, rather than pattern matched
  // for a date: a field named anything at all fails this if it moves.
  const planned = plannedPages([
    { path: "", id: "a.html", title: "A", blocks: [{ tag: "div", value: "title", content: "<p>x</p>", at: 0 }], findings: [] },
  ]);
  assert.deepEqual(manifestFor(OUTPUT_NAME, planned), manifestFor(OUTPUT_NAME, planned));
  assert.equal(JSON.stringify(manifestFor(OUTPUT_NAME, planned)), JSON.stringify(manifestFor(OUTPUT_NAME, planned)));
});

test("a site that marked nothing gets no manifest, because it gets no folder", async () => {
  const root = await site({ "plain.html": "<html><body><p>nothing</p></body></html>" });
  try {
    assert.equal((await run([root])).code, 0);
    assert.deepEqual(await readdir(root), ["plain.html"]);
    assert.equal(await readManifest(root), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a second run reads the manifest and writes where the first one did", async () => {
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    const first = await run([root]);
    assert.match(first.out, new RegExp(`output folder\\s+${OUTPUT_NAME}`));
    const second = await run([root]);
    assert.equal(second.code, 0);
    assert.match(second.out, new RegExp(`output folder\\s+${OUTPUT_NAME}`));
    // It says so, because a folder that came from a file rather than from the
    // ladder is a different answer and the report should not hide which.
    assert.match(second.out, new RegExp(`read from ${MANIFEST_NAME.replace(".", "\\.")}`));
    // One section, not two.
    assert.deepEqual((await readdir(root)).sort(), [OUTPUT_NAME, "index.html"]);
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, "index.html"].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and without it the second run lands in a second folder, which is what it buys", async () => {
  // The failure the manifest exists for, pinned rather than described: run one
  // writes `cheatsheets/`, so run two finds that name taken - by its own output -
  // and resolves the next rung. Nothing is overwritten and nothing is reported,
  // which is the worst shape it could take.
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    assert.equal((await run([root])).code, 0);
    await rm(join(root, OUTPUT_NAME, MANIFEST_NAME));
    const second = await run([root]);
    assert.equal(second.code, 0);
    assert.match(second.out, new RegExp(`output folder\\s+${OUTPUT_NAME}/${OUTPUT_NAME}`));
    assert.ok(!second.out.includes("read from"));
    assert.deepEqual(
      (await readdir(join(root, OUTPUT_NAME))).sort(),
      [OUTPUT_NAME, "index.html"].sort()
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the folder the manifest is in outranks the folder it names", async () => {
  // A site owner who renamed or copied the generated folder has the folder they
  // have, and the field they are not reading is the one that went stale. This
  // run rewrites the field, so it heals rather than drifting.
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    assert.equal((await run([root])).code, 0);
    const inside = join(root, OUTPUT_NAME, OUTPUT_NAME);
    await mkdir(inside, { recursive: true });
    const manifest = JSON.parse(readFileSync(join(root, OUTPUT_NAME, MANIFEST_NAME), "utf8"));
    await writeFile(join(inside, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rm(join(root, OUTPUT_NAME, MANIFEST_NAME));

    const found = await readManifest(root);
    // The file says `cheatsheets` and sits in `cheatsheets/cheatsheets`.
    assert.equal(found.manifest.output, OUTPUT_NAME);
    assert.equal(found.name, `${OUTPUT_NAME}/${OUTPUT_NAME}`);
    assert.equal(found.path, inside);

    const second = await run([root]);
    assert.equal(second.code, 0);
    assert.match(second.out, new RegExp(`output folder\\s+${OUTPUT_NAME}/${OUTPUT_NAME}`));
    const healed = JSON.parse(readFileSync(join(inside, MANIFEST_NAME), "utf8"));
    assert.equal(healed.output, `${OUTPUT_NAME}/${OUTPUT_NAME}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a cheatsheet-site.json that is not this tool's is passed over rather than read into", async () => {
  // A site with a file of that name gets the ladder, not this tool's meaning
  // read into their file. Three ways of not being a manifest, and the walk
  // carries on past each.
  const root = await site({
    "index.html": page("Home", "<p>one</p>"),
    [`${OUTPUT_NAME}/${MANIFEST_NAME}`]: "not json at all {",
    [`${OUTPUT_NAME}/${OUTPUT_NAME}/${MANIFEST_NAME}`]: '{"generator":"something-else"}',
    [`${OUTPUT_NAME}/${OUTPUT_NAME}_0/${MANIFEST_NAME}`]: `{"generator":"${GENERATOR}","manifestVersion":${MANIFEST_VERSION + 1}}`,
  });
  try {
    assert.equal(await readManifest(root), null);
    const { code, out } = await run([root]);
    assert.equal(code, 0);
    // Every rung above is taken, so the ladder resolves the one after them.
    assert.match(out, new RegExp(`output folder\\s+${OUTPUT_NAME}/${OUTPUT_NAME}_1`));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("readManifest stops before it starts where the site has no cheatsheets folder at all", async () => {
  // Every rung after the first is inside `cheatsheets/`, so a site without it
  // has nothing on the ladder and the walk reads no files.
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    assert.equal(await readManifest(root), null);
    // And `--out` never looks for one: the site owner named the folder.
    const out = join(root, "elsewhere");
    assert.equal((await run([root, "--out", out])).code, 0);
    assert.deepEqual((await readdir(out)).sort(), [MANIFEST_NAME, "index.html"].sort());
    // Recorded site relative, not as the argument was typed. `--out` took an
    // absolute path here and the manifest is a committed file.
    assert.equal(JSON.parse(readFileSync(join(out, MANIFEST_NAME), "utf8")).output, "elsewhere");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("writeManifest creates the folder it writes into, and ends the file with a newline", async () => {
  const root = await site({});
  try {
    const out = join(root, "made", "up");
    const path = await writeManifest(out, manifestFor("made/up", []));
    assert.equal(path, join(out, MANIFEST_NAME));
    const text = readFileSync(path, "utf8");
    assert.ok(text.endsWith("\n"), "a JSON file somebody may commit should end with a newline");
    assert.ok(text.includes('\n  "generator"'), "it is indented for a reader rather than minified");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## --dry-run

test("--dry-run reports the folder and the pages, and leaves the tree exactly as it was", async () => {
  const root = await site({
    "index.html": page("Home", "<p>one</p>"),
    "guide/two.html": page("Two", "<p>two</p>"),
    "plain.html": "<html><body><p>nothing</p></body></html>",
  });
  try {
    const before = (await crawlSite(root)).map((one) => one);
    const { code, out } = await run([root, "--dry-run"]);
    assert.equal(code, 0);
    assert.match(out, /3 pages crawled, 2 marked/);
    assert.match(out, new RegExp(`output folder\\s+${OUTPUT_NAME}`));
    assert.match(out, /pages to write\s+2/);
    assert.match(out, /index\.html -> index\.html/);
    assert.match(out, /guide\/two\.html -> two\.html/);
    assert.match(out, /nothing was written, because --dry-run/);
    // No folder, no page, no manifest. The site's own files, unchanged.
    assert.deepEqual((await readdir(root)).sort(), ["guide", "index.html", "plain.html"]);
    assert.deepEqual(await crawlSite(root), before);
    assert.equal(await readManifest(root), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("what a dry run says it would write is what a real run writes", async () => {
  // The two read one plan, which is the whole value of a dry run that is
  // believed. Compared as the lines of the report rather than as the plan, so
  // this fails if the reports are built from different places.
  const root = await site({
    "index.html": marked("Home", "title", "<p>one</p>"),
    "guide/two.html": marked("Two", "page", "<p>two</p>"),
    "reference/index.html": page("Reference", "<p>collides</p>"),
  });
  try {
    const dry = await run([root, "--dry-run"]);
    const real = await run([root]);
    const lines = (text) => text.split("\n").filter((line) => line.includes(" -> "));
    assert.deepEqual(lines(dry.out), lines(real.out));
    // Including the collision, which the dry run reports rather than discovers
    // on the day somebody runs it for real.
    assert.equal(dry.code, 1);
    assert.equal(real.code, 1);
    assert.deepEqual(lines(dry.out), ["  guide/two.html -> two.html (page)", "  index.html -> index.html (title)"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--dry-run on a second run reads the manifest and still writes nothing", async () => {
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    assert.equal((await run([root])).code, 0);
    const before = await folderBytes(join(root, OUTPUT_NAME));
    const { code, out } = await run([root, "--dry-run"]);
    assert.equal(code, 0);
    assert.match(out, new RegExp(`read from ${MANIFEST_NAME.replace(".", "\\.")}`));
    assert.match(out, /nothing was written, because --dry-run/);
    assert.deepEqual(await folderBytes(join(root, OUTPUT_NAME)), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--dry-run and --out report where they would write without creating it", async () => {
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    const { code, out } = await run([root, "--out", join(root, "elsewhere"), "--dry-run"]);
    assert.equal(code, 0);
    assert.match(out, /output folder\s+elsewhere/);
    assert.deepEqual(await readdir(root), ["index.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## A second run over an unchanged site

test("a second run over an unchanged site produces byte identical output", async () => {
  // What makes the generated pages committable: a run that moved a byte would
  // put a diff in front of somebody every time the tool was run, and a run that
  // moved the folder would put the whole section in front of them twice.
  const root = await site({
    "index.html": marked("Home", "title", "<p>one</p>"),
    "guide/two.html": marked("Two", "page", "<pre>items.splice(1, 2)</pre>"),
    "reference/three.html": marked(null, null, "<table><tr><td>three</td></tr></table>"),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const first = await folderBytes(join(root, OUTPUT_NAME));
    assert.deepEqual(Object.keys(first).sort(), [MANIFEST_NAME, "index.html", "three.html", "two.html"].sort());

    assert.equal((await run([root])).code, 0);
    const second = await folderBytes(join(root, OUTPUT_NAME));
    // The manifest with them: it sits in the folder being committed, so a field
    // that moved between runs would be a diff like any other.
    assert.deepEqual(second, first);

    // A third, because two runs agreeing could be two runs that both resolved
    // the same name by luck on an empty tree.
    assert.equal((await run([root])).code, 0);
    assert.deepEqual(await folderBytes(join(root, OUTPUT_NAME)), first);
    assert.deepEqual((await readdir(root)).sort(), [OUTPUT_NAME, "guide", "index.html", "reference"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and a page the site changed is the only page the second run changes", async () => {
  // The other half of byte identity, and the half that makes it worth having:
  // identical is not the same as frozen.
  const root = await site({
    "index.html": page("Home", "<p>one</p>"),
    "guide/two.html": page("Two", "<p>two</p>"),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const first = await folderBytes(join(root, OUTPUT_NAME));
    await writeFile(join(root, "guide", "two.html"), page("Two", "<p>two, revised</p>"), "utf8");
    assert.equal((await run([root])).code, 0);
    const second = await folderBytes(join(root, OUTPUT_NAME));
    assert.equal(second["index.html"], first["index.html"]);
    assert.equal(second[MANIFEST_NAME], first[MANIFEST_NAME]);
    assert.notEqual(second["two.html"], first["two.html"]);
    assert.ok(second["two.html"].includes("two, revised"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the output folder is not crawled on the second run, so the pages do not compound", async () => {
  // A generated page carries the site's own markup, which includes the marker
  // the site wrote. `NOT_SITE` is what stops the second run collecting the
  // first run's output and heading a page from a page.
  const root = await site({ "index.html": page("Home", `<div ${MARKER}><p>one</p></div>`) });
  try {
    const first = await run([root]);
    assert.match(first.out, /1 page crawled, 1 marked/);
    const second = await run([root]);
    assert.match(second.out, /1 page crawled, 1 marked/);
    assert.ok(NOT_SITE.includes(OUTPUT_NAME));
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, "index.html"].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## What the tool may depend on

test("it is dependency free, which is the constraint it runs under", () => {
  // It runs against somebody else's checkout with whatever Node they have, so
  // every import is a builtin or a relative path. Nothing from
  // `api/cheatsheet/` yet either, which is **Building on the API**'s item - the
  // check is written now so that the day it imports the surface is a deliberate
  // edit to this case rather than a drift.
  const source = readFileSync(new URL("./cheatsheet-site.mjs", import.meta.url), "utf8");
  const imports = [...source.matchAll(/^import .* from "([^"]+)";$/gm)].map((match) => match[1]);
  assert.ok(imports.length > 0, "the import walk read no imports, so it is checking nothing");
  for (const specifier of imports) {
    assert.ok(
      specifier.startsWith("node:"),
      `${specifier} is not a Node builtin, and this script may not install anything`
    );
  }
});
