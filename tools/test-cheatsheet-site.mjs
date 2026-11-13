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
// Twelve questions are asked, one per item the file closes.
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
//   6. **Is a name read as prose?** The shapes a real file name has rather than
//      the one the item names: a case change, an acronym run, a digit boundary,
//      a separator the name already carried - and a `<title>`, which is left
//      exactly as the site wrote it.
//   7. **Does a folder become one cheatsheet?** What it is named and headed,
//      what happens to each page's own heading, which names can still collide
//      once folders are what claim them, and the order the sections read in -
//      which is the order the site reads, held to `crawlSite` rather than to a
//      sort of its own.
//   8. **Is a page carrying nothing skipped?** It was already, by the collector
//      finding nothing on it, and grouping is where that could have stopped
//      being true: an unmarked page beside a marked one in the same folder is
//      the case that would have emitted an empty section.
//   9. **Does a comment say what an attribute cannot?** The five questions the
//      comment syntax raises, which is one per item: what a comment applies to
//      and where that reach stops, which properties it accepts and what each
//      one sets, the shapes a hand written list of them has, what is reported
//      with the page and the line when it says something unreadable, and which
//      of the two methods wins where both speak about one page.
//  10. **Is a menu written into the site's own page, and is it right?** The
//      only marking this tool writes rather than reads, so the cases are about
//      what is written and what is left alone: both modes filled, a link
//      relative to the page it lands in rather than to the folder this tool
//      resolved, the page's own newline and indentation, two menus on one page
//      spliced without moving each other, and a run that changes nothing the
//      second time. With them, the master page they point at - every cheatsheet
//      through the function that writes one, named ahead of the cheatsheets so
//      it cannot be written over. And what is never written over: an element
//      holding anything this tool did not write itself is refused, which is a
//      question about ownership rather than about emptiness, since a filled
//      element is not empty on the second run either.
//  11. **Is a generated page a render of a composition?** The item that stopped
//      the page being string concatenation, so the cases are about the document
//      the page and a media file share: what a cheatsheet reads as, what the
//      markup contributes and what it does not, and the proof that the figure on
//      the page is the same composition a `renderSheet` of the same document
//      makes. With the two things embedding a composition in somebody's page
//      raised: a page holding several needs several ids, and a cheatsheet with
//      nothing a sheet can set gets no figure rather than an empty one.
//  12. **Does a relative URL in carried material still point at what it
//      pointed at?** The material is collected out of a page in one folder and
//      written onto a page in another, so every relative `src`, `href`,
//      `srcset` and `poster` in it means something different where it lands.
//      The cases are the shapes a site actually writes: a sibling file, a
//      sibling page, a walk upwards, a root relative path that was already
//      right, an absolute URL, a bare fragment, a query carried with a path, a
//      folder with its trailing separator - and the three places a rewrite must
//      not reach, which are a comment, a script's body, and an attribute whose
//      value merely contains the text of one.
//
// Run with: node --test tools/test-cheatsheet-site.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { renderSVG, withoutLinks } from "../api/cheatsheet/index.mjs";

import {
  attributeValue,
  carriedUrlFindings,
  carryUrls,
  cheatsheets,
  collectMarked,
  collectSite,
  commentDirectives,
  commentOption,
  crawlSite,
  headingFor,
  lineAt,
  linkFrom,
  main,
  manifestFor,
  menuElements,
  nameCollisions,
  namingFindings,
  opaqueRanges,
  outputCandidates,
  pageFilename,
  pageFolder,
  pageGrouping,
  plannedPages,
  prose,
  readManifest,
  renderCheatsheet,
  renderMaster,
  resolveOutput,
  siteDocument,
  textLines,
  titleOf,
  wrapCarriedTables,
  writeManifest,
  writePages,
  ATTRIBUTE_METHOD,
  COMMENT_KEYWORD,
  COMMENT_METHOD,
  COMMENT_PROBLEMS,
  COMMENT_PROPERTIES,
  FOLDER_SOURCE,
  GENERATOR,
  GROUPINGS,
  HEADING_SOURCES,
  MANIFEST_NAME,
  MANIFEST_READABLE,
  MANIFEST_VERSION,
  MARKER,
  MASTER_NAME,
  MASTER_SOURCE,
  MAX_OUTPUT_TRIES,
  MENU_CLOSE,
  MENU_MARKER,
  MENU_MODES,
  MENU_OPEN,
  NAME_PATTERN,
  NOT_SITE,
  OUTPUT_NAME,
  PAGE_EXTENSIONS,
  SCROLL_WRAPPER,
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
 * A page whose material is marked by a cheatsheet comment.
 *
 * @param {string | null} title `null` writes no `<title>` element at all.
 * @param {string | null} properties The property list, without its brackets, or
 *   `null` for a comment naming the tool and nothing else.
 * @param {string} inner
 */
function commented(title, properties, inner) {
  const head = title === null ? "<head></head>" : `<head><title>${title}</title></head>`;
  const list = properties === null ? "" : `: [${properties}]`;
  return [
    "<!DOCTYPE html>",
    `<html>${head}`,
    "<body>",
    `<!-- {% ${COMMENT_KEYWORD}${list} %} -->`,
    `<div>${inner}</div>`,
    "</body></html>",
    "",
  ].join("\n");
}

/**
 * A write or a plan with the master page taken out of it.
 *
 * Every run that writes anything writes the master as well, per **The Menu
 * Element**, so a case about which **cheatsheets** a site grouped into says so
 * rather than counting whatever is in the folder. The master is held to its own
 * cases, which are the ones that name it.
 *
 * @param {Array<{ name: string }>} written
 * @returns {Array<{ name: string }>}
 */
function sheetsOf(written) {
  return written.filter((one) => one.name !== MASTER_NAME);
}

/** One comment's properties, parsed out of a string rather than off a site. */
function directive(properties) {
  const list = properties === null ? "" : `: [${properties}]`;
  return collectMarked(`<!-- {% ${COMMENT_KEYWORD}${list} %} -->\n<div><p>x</p></div>`)[0];
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
 * The one cheatsheet a site's pages group into.
 *
 * Asserted rather than taken, because a case that meant to render one sheet and
 * silently rendered the first of two would pass while checking the wrong thing.
 *
 * @param {object[]} pages What `collectSite` handed back.
 */
function only(pages) {
  const sheets = cheatsheets(pages);
  assert.equal(sheets.length, 1, "the site did not group into exactly one cheatsheet");
  return sheets[0];
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
    assert.deepEqual(sheetsOf(written).flatMap((one) => one.sources), ["marked.html"]);
    assert.deepEqual(await readdir(out), [MASTER_NAME, "marked.html"]);
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

test("two folders of one name is reported, and neither is overwritten", async () => {
  // The output folder is flat and a cheatsheet is named for the folder it is
  // built from, so `a/docs/` and `b/docs/` both want `docs.html`. Writing both
  // would leave one overwritten, the report claiming two and the exit code 0.
  const root = await site({
    "a/docs/one.html": page("Guide", "<pre>guide material</pre>"),
    "b/docs/two.html": page("Reference", "<pre>reference material</pre>"),
  });
  try {
    const pages = await collectSite(root);
    const findings = nameCollisions(pages);
    assert.equal(findings.length, 1);
    // The cheatsheet that lost, named, and the one that claimed the name with
    // it - a finding naming only one of the two does not say what to rename.
    assert.match(findings[0], /^b\/docs\/: would be written as docs\.html/);
    assert.match(findings[0], /a\/docs\/ already claimed/);

    // First in page order wins, and the walk is sorted, so which one that is
    // does not depend on the filesystem.
    const out = join(root, "out");
    const written = await writePages(pages, out);
    assert.deepEqual(sheetsOf(written).flatMap((one) => one.sources), ["a/docs/one.html"]);
    assert.deepEqual(await readdir(out), [MASTER_NAME, "docs.html"]);
    assert.ok(readFileSync(join(out, "docs.html"), "utf8").includes("guide material"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a root page and a folder of its name collide too, and the trailing slash says which is which", async () => {
  // The other pair the flat folder allows, and the reason a finding writes a
  // folder with a `/`: `docs` and `docs.html` in one sentence are otherwise two
  // spellings of the same thing.
  const root = await site({
    "docs.html": page("Docs", "<p>a root page</p>"),
    "docs/one.html": page("One", "<p>in a folder</p>"),
  });
  try {
    const pages = await collectSite(root);
    const findings = nameCollisions(pages);
    assert.equal(findings.length, 1);
    // The folder wins, because the walk is sorted and `docs` sorts before
    // `docs.html` - which is a fact about the crawl rather than a preference
    // for folders, and the reason the finding has to name both.
    assert.match(findings[0], /^docs\.html: would be written as docs\.html, which docs\/ already claimed/);
    const written = await writePages(pages, join(root, "out"));
    assert.deepEqual(sheetsOf(written).flatMap((one) => one.sources), ["docs/one.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two names that differ only in case are one name, because the folder is written anywhere", async () => {
  // `Guide.html` and `guide.html` are two files on Linux and one on Windows and
  // macOS, so comparing the names as written wrote both there, left one
  // overwritten, and reported and recorded two - the exact outcome the
  // collision check exists to rule out, arrived at through the check itself.
  const root = await site({
    "a/Guide/x.html": page("Upper", "<pre>upper material</pre>"),
    "b/guide/y.html": page("Lower", "<pre>lower material</pre>"),
  });
  try {
    const pages = await collectSite(root);
    const findings = nameCollisions(pages);
    assert.equal(findings.length, 1);
    // Both spellings, because one of them printed twice would read as a plain
    // repeat rather than as the two names a case collision is made of.
    assert.match(findings[0], /^b\/guide\/: would be written as guide\.html, which a\/Guide\/ already claimed as Guide\.html/);
    assert.match(findings[0], /differ only in case/);

    const out = join(root, "out");
    const written = await writePages(pages, out);
    assert.deepEqual(sheetsOf(written).flatMap((one) => one.sources), ["a/Guide/x.html"]);
    assert.deepEqual(await readdir(out), [MASTER_NAME, "Guide.html"]);
    // The one that was kept, and all of it: the material that used to be lost
    // is the material of the cheatsheet that claimed the name first.
    assert.ok(readFileSync(join(out, "Guide.html"), "utf8").includes("upper material"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a dropped cheatsheet is said once, however many pages it holds", async () => {
  // The finding names the cheatsheet rather than the page, so a folder of four
  // pages that lost a name is one sentence. Reporting per page would print the
  // same sentence four times, which is how a report stops being read.
  const root = await site({
    "a/docs/one.html": page("One", "<p>a</p>"),
    "b/docs/one.html": page("Two", "<p>b</p>"),
    "b/docs/two.html": page("Three", "<p>c</p>"),
    "b/docs/three.html": page("Four", "<p>d</p>"),
  });
  try {
    const findings = nameCollisions(await collectSite(root));
    assert.equal(findings.length, 1);
    assert.match(findings[0], /^b\/docs\/: /);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and a site whose names are distinct has no collision to report", async () => {
  // The guard against a check that fires on everything. Two pages of one folder
  // are one cheatsheet rather than a collision, and `index.html` in two folders -
  // which is what the flat folder used to collide on most - is now the two
  // folders' names.
  const root = await site({
    "index.html": page("Home", "<p>a</p>"),
    "guide/index.html": page("Guide", "<p>b</p>"),
    "guide/splice.html": page("Splice", "<p>c</p>"),
    "reference/index.html": page("Reference", "<p>d</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(nameCollisions(pages), []);
    assert.deepEqual(
      cheatsheets(pages).map((sheet) => sheet.name),
      ["guide.html", "index.html", "reference.html"]
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a page that collected nothing cannot collide, because it is never written", async () => {
  // `nameCollisions` reads the same pages `writePages` writes, so a page with
  // no material is not a page claiming a name. Otherwise an unmarked `a/docs/`
  // would block a marked `b/docs/`.
  const root = await site({
    "a/docs/one.html": "<!DOCTYPE html><html><head><title>Guide</title></head><body><p>nothing</p></body></html>",
    "b/docs/two.html": page("Reference", "<pre>reference material</pre>"),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(nameCollisions(pages), []);
    const written = await writePages(pages, join(root, "out"));
    assert.deepEqual(sheetsOf(written).flatMap((one) => one.sources), ["b/docs/two.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the generated page carries the site's own markup and says where it came from", async () => {
  const root = await site({ "splice.html": page("Splicing Arrays", "<pre>items.splice(1, 2)</pre>") });
  try {
    const pages = await collectSite(root);
    const markup = renderCheatsheet(only(pages));
    // The heading is the page's `<title>`, which the marker's value chose.
    assert.match(markup, /<h1>Splicing Arrays<\/h1>/);
    assert.match(markup, /<meta name="cheatsheet-source" content="splice\.html">/);
    assert.match(markup, /<meta name="generator" content="cheatsheet-site">/);
    // The site's markup, carried through rather than escaped: the premise is
    // that the site already published it.
    assert.match(markup, /<pre>items\.splice\(1, 2\)<\/pre>/);
    assert.equal(pageFilename(pages[0]), "splice.html");
    // And it ends with a newline, because these are files meant to be committed.
    assert.ok(markup.endsWith("\n"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a generated page carries the one style block it needs, scoped to its own blocks", async () => {
  // The text half of the found issue closed on 2026.11.11. The behaviour is
  // pinned in `tools/test-site-pages-browser.mjs`, which opens the four
  // generated pages at 390px and measures them; what is pinned here is the rule
  // as written, because what makes it safe to put a `<style>` block in somebody
  // else's folder is its scope, and a scope is text.
  const root = await site({ "splice.html": page("Splicing Arrays", "<pre>items.splice(1, 2)</pre>") });
  try {
    const pages = await collectSite(root);
    const parts = cheatsheets(pages);
    for (const [where, markup] of [
      ["a cheatsheet page", renderCheatsheet(only(pages))],
      ["the master page", renderMaster({ heading: "All Cheatsheets", pages, parts })],
    ]) {
      // In the head, which is where a rule the body depends on belongs - and
      // the only cascade it has to lose to is something added after it, since a
      // site owner's own stylesheet is loaded by their pages and not by this one.
      const head = markup.slice(markup.indexOf("<head>"), markup.indexOf("</head>"));
      assert.ok(head.includes("<style>"), `${where}: the head carries no style block`);
      assert.ok(head.includes("</style>"), `${where}: the style block is left open`);
      const rules = head.slice(head.indexOf("<style>") + "<style>".length, head.indexOf("</style>"));
      // The rule that closes the issue, and the two for the elements that
      // arrive wider than the page for their own reasons.
      assert.match(rules, /\[data-cheatsheet-block\] pre \{ overflow-x: auto; \}/, `${where}: no rule scrolls a wide listing`);
      assert.match(rules, /\[data-cheatsheet-block\] img \{ max-width: 100%; \}/, `${where}: no rule contains a wide image`);
      // A table is contained the way the listing is and not the way the image
      // is, because `max-width` does not lower a min-content width - so the
      // rule that matters is the one on the box that scrolls. That box is the
      // wrapper `wrapCarriedTables` writes and not the `<table>`: putting
      // `display: block` on the table itself contained it and drew its rows at
      // content width whenever the owner had declared one, which is the issue
      // closed on 2026.11.13. See `BLOCK_STYLE`, and the browser measurement in
      // `tools/test-site-pages-browser.mjs`.
      assert.match(
        rules,
        /\[data-cheatsheet-block\] \[data-cheatsheet-scroll\] \{ max-width: 100%; overflow-x: auto; \}/,
        `${where}: no rule contains a table that is wide because of its own content`
      );
      assert.match(
        rules,
        /\[data-cheatsheet-block\] table \{ max-width: 100%; \}/,
        `${where}: no rule clamps a carried table to the page`
      );
      // And the table is left a table box, which is the half of the fix that is
      // an absence: either of these two back on the `<table>` is the defect
      // again, and both would pass every assertion above.
      const tableRule = /\[data-cheatsheet-block\] table \{([^}]*)\}/.exec(rules);
      assert.ok(tableRule, `${where}: the style block has no rule for a carried table`);
      assert.ok(
        !/display\s*:\s*block/.test(tableRule[1]),
        `${where}: the table rule takes the table out of the table formatting context again`
      );
      assert.ok(
        !/fit-content/.test(tableRule[1]),
        `${where}: the table rule still carries the fit-content a block box needed`
      );
      // **Every selector is scoped**, which is asserted as a count rather than
      // as the presence of the three that are known: an unscoped selector added
      // later would reach the owner's own markup on a page they keep, and that
      // is the one thing generated CSS in their folder may not do.
      const selectors = rules
        .split("}")
        .flatMap((rule) => rule.split("{")[0].split(","))
        .map((one) => one.trim())
        .filter((one) => one !== "");
      assert.ok(selectors.length > 0, `${where}: the style block holds no rules`);
      for (const selector of selectors) {
        assert.ok(
          selector.startsWith("[data-cheatsheet-block]"),
          `${where}: "${selector}" reaches outside the blocks this tool wrote`
        );
      }
      // Nothing about the figure, which carries its own inline style and
      // measures square already. Two opinions about one element is how the two
      // come to disagree.
      assert.ok(!rules.includes("svg"), `${where}: the style block has an opinion about the figure`);
      assert.ok(!rules.includes(".cheatsheet"), `${where}: the style block styles the figure's wrapper`);
      // And it says what it is for, because an unexplained style block in
      // generated output is a style block a site owner deletes.
      assert.match(
        head,
        new RegExp(`<!--[^>]*${GENERATOR}`),
        `${where}: nothing in the head says what the style block is for`
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a carried table is written inside the box that scrolls, and nothing else is", async () => {
  // The other half of the issue closed on 2026.11.13: the rule above is only
  // the containment, and the element it names has to be written for it to reach
  // anything. The shapes are the four a real page carries, and the last two are
  // the ones a wrapper written too freely gets wrong.
  const root = await site({
    "splice.html": page(
      "Splicing Arrays",
      [
        "<table><caption>Arguments</caption><tr><th>start</th><td>where</td></tr></table>",
        "<pre>items.splice(1, 2)</pre>",
        "<ul><li>a listing is not a table</li></ul>",
      ].join("\n")
    ),
  });
  try {
    const markup = renderCheatsheet(only(await collectSite(root)));
    // One wrapper, around the one table, and the table is still the table the
    // page wrote - a wrapper that rewrote the element would pass a count.
    const wrappers = [...markup.matchAll(new RegExp(`<div ${SCROLL_WRAPPER}\\b[^>]*>`, "g"))];
    assert.equal(wrappers.length, 1, `${wrappers.length} scroll wrappers on a page carrying one table`);
    assert.match(
      markup,
      new RegExp(`<div ${SCROLL_WRAPPER}[^>]*>\\s*<table>`),
      "the wrapper does not open in front of the table"
    );
    assert.match(markup, /<\/table>\s*<\/div>/, "the wrapper does not close after the table");
    assert.ok(
      markup.includes("<caption>Arguments</caption>"),
      "the carried table lost its caption on the way through the wrapper"
    );
    // And neither of the other two carried elements is given one. The listing
    // scrolls itself through `BLOCK_STYLE`, and a `<ul>` is not wide for any
    // reason this tool has an opinion about.
    assert.ok(
      !new RegExp(`<div ${SCROLL_WRAPPER}[^>]*>\\s*<pre>`).test(markup),
      "a carried listing was given a scroll wrapper"
    );
    assert.ok(
      !new RegExp(`<div ${SCROLL_WRAPPER}[^>]*>\\s*<ul>`).test(markup),
      "a carried list was given a scroll wrapper"
    );
    // The keyboard half, which is the found issue of 2026.11.12: WebKit reaches
    // no scroll box of its own, so the attribute is what makes the material
    // reachable there. Asserted as text rather than in a browser because the
    // engine the suite drives is one of the two that never needed it.
    assert.match(wrappers[0][0], /tabindex="0"/, "the wrapper is not in the tab order");
    assert.match(
      wrappers[0][0],
      /role="region"/,
      "the wrapper is a focusable box with no role"
    );
    assert.match(
      wrappers[0][0],
      /aria-label="Arguments"/,
      "the wrapper is not named from the table's own caption"
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a carried table with no caption is reachable, and is not a region with no name", async () => {
  // The case the naming decision is about. A region a screen reader announces
  // and cannot name is worse than no region at all, and a caption is the only
  // name here that is the site owner's own words - so `role` and `aria-label`
  // go together or neither goes, while `tabindex` does not depend on either.
  const root = await site({
    "splice.html": page("Splicing Arrays", "<table><tr><td>no caption</td></tr></table>"),
  });
  try {
    const markup = renderCheatsheet(only(await collectSite(root)));
    const wrapper = new RegExp(`<div ${SCROLL_WRAPPER}\\b[^>]*>`).exec(markup);
    assert.ok(wrapper, "a carried table was given no scroll wrapper");
    assert.match(wrapper[0], /tabindex="0"/, "the wrapper is not in the tab order");
    assert.ok(!/role=/.test(wrapper[0]), "the wrapper claims a role it cannot name");
    assert.ok(!/aria-label=/.test(wrapper[0]), "the wrapper carries a name the tool invented");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("wrapCarriedTables leaves alone what it cannot contain, and wraps outermost only", () => {
  // The three readings a scan of somebody else's markup has to get right, and
  // each is silent when it is wrong: a wrapper written into a script string is
  // a syntax error in their code, a wrapper closed at a guess moves their
  // markup, and a wrapper per nested table is a tab stop inside a tab stop.
  const open = new RegExp(`<div ${SCROLL_WRAPPER}`, "g");
  const count = (markup) => [...markup.matchAll(open)].length;

  const nested = wrapCarriedTables(
    "<table><tr><td><table><tr><td>inner</td></tr></table></td></tr></table>"
  );
  assert.equal(count(nested), 1, "a table inside a table was wrapped twice");

  // Two siblings are two tables, which is the half the guard above must not eat.
  assert.equal(
    count(wrapCarriedTables("<table><tr><td>a</td></tr></table>\n<table><tr><td>b</td></tr></table>")),
    2,
    "a second carried table was left uncontained"
  );

  for (const [what, markup] of [
    ["a commented out table", "<!-- <table><tr><td>x</td></tr></table> -->"],
    ["a table in a script string", '<script>el.innerHTML = "<table><tr><td>x</td></tr></table>";</script>'],
    ["an unclosed table", "<table><tr><td>x</td></tr>"],
    ["a self closing table", "<table/>"],
  ]) {
    assert.equal(wrapCarriedTables(markup), markup, `${what} was rewritten`);
  }
});

// ## 12. A relative URL in carried material
//
// The found issue of 2026.11.11, closed on 2026.11.12. A page at
// `guide/using-it.html` carrying `<img src="badge.svg">` was collected into
// `cheatsheets/guide.html` and the attribute carried byte for byte, so the
// browser asked for `cheatsheets/badge.svg` and got a 404 - and only a root
// relative `/badge.svg` survived the carry at all. The text half is here; the
// half that proves nothing on a generated page 404s is a browser case in
// `tools/test-site-pages-browser.mjs`.

test("a relative URL in carried material is walked from the generated page", () => {
  // Every shape a site writes, from one page one folder down, onto one
  // generated page one folder down - which is the ordinary layout and the one
  // the defect was measured on.
  const from = "guide/using-it.html";
  const onto = `${OUTPUT_NAME}/guide.html`;
  const carried = (markup) => carryUrls(markup, from, onto);

  // A sibling file and a sibling page: the two the defect was reported for.
  assert.equal(carried('<img src="badge.svg">'), '<img src="../guide/badge.svg">');
  assert.equal(carried('<a href="reading-it.html">x</a>'), '<a href="../guide/reading-it.html">x</a>');
  // A walk upwards resolves first and is then walked back, so a link to the
  // site root's own page comes out as one `..` and not as two.
  assert.equal(carried('<a href="../index.html">x</a>'), '<a href="../index.html">x</a>');
  // The four that are already right, or are not ours to touch.
  assert.equal(carried('<img src="/badge.svg">'), '<img src="/badge.svg">');
  assert.equal(carried('<a href="https://example.com/x">x</a>'), '<a href="https://example.com/x">x</a>');
  assert.equal(carried('<a href="//example.com/x">x</a>'), '<a href="//example.com/x">x</a>');
  assert.equal(carried('<a href="mailto:jane.doe@example.com">x</a>'), '<a href="mailto:jane.doe@example.com">x</a>');
  // A fragment points inside whichever page carries it, so it still means what
  // it meant. An empty value and a bare query mean the carrying page and are
  // the gap `relativeUrl` records rather than guessing at.
  assert.equal(carried('<a href="#top">x</a>'), '<a href="#top">x</a>');
  assert.equal(carried('<a href="">x</a>'), '<a href="">x</a>');
  // The query and the fragment belong to the site and ride along untouched.
  assert.equal(carried('<img src="badge.svg?v=2#x">'), '<img src="../guide/badge.svg?v=2#x">');
  // A path naming a folder keeps its separator, or the browser asks for a file
  // where it asked for an index.
  assert.equal(carried('<a href="sub/">x</a>'), '<a href="../guide/sub/">x</a>');
  // `poster`, and a `src` on a void element nested inside another.
  assert.equal(
    carried('<video poster="shot.jpg"><source src="clip.mp4"></video>'),
    '<video poster="../guide/shot.jpg"><source src="../guide/clip.mp4"></video>'
  );
  // Every candidate of a `srcset`, each keeping its descriptor.
  assert.equal(
    carried('<img srcset="small.png 1x, large.png 2x" src="small.png">'),
    '<img srcset="../guide/small.png 1x, ../guide/large.png 2x" src="../guide/small.png">'
  );
  // The quoting the site chose is the quoting that goes back, including none.
  assert.equal(carried("<a href=sibling.html>x</a>"), "<a href=../guide/sibling.html>x</a>");
  assert.equal(carried("<a href='sibling.html'>x</a>"), "<a href='../guide/sibling.html'>x</a>");
  // A self-closing tag, and a page two folders down.
  assert.equal(
    carryUrls('<img src="icon.svg" />', "guide/api/nav.html", onto),
    '<img src="../guide/api/icon.svg" />'
  );
});

test("a rewrite reaches a start tag and nothing that only looks like one", () => {
  const from = "guide/using-it.html";
  const onto = `${OUTPUT_NAME}/guide.html`;
  const carried = (markup) => carryUrls(markup, from, onto);

  // An attribute whose value contains the text of another is the case a pattern
  // gets wrong and a scan gets right - rewriting inside it corrupts a site
  // owner's own prose.
  assert.equal(carried('<div title="see href=x">t</div>'), '<div title="see href=x">t</div>');
  assert.equal(carried('<div data-note="src=badge.svg">t</div>'), '<div data-note="src=badge.svg">t</div>');
  // A comment's text is not markup.
  assert.equal(carried('<!-- <img src="old.svg"> -->'), '<!-- <img src="old.svg"> -->');
  // A script's own `src` is a URL and is rewritten; what the script says is
  // the script's, and a tag built in a string is text until it runs.
  assert.equal(
    carried('<script src="draw.js">var s = \'<img src="x.svg">\';</script>'),
    '<script src="../guide/draw.js">var s = \'<img src="x.svg">\';</script>'
  );
  // The two attributes deliberately left out, because rewriting either does
  // more than move a URL - see `URL_ATTRIBUTES`.
  assert.equal(carried('<form action="search"></form>'), '<form action="search"></form>');
  assert.equal(carried('<base href="/guide/">'), '<base href="/guide/">');
  // A closing tag carries no attributes and is not read as if it did.
  assert.equal(carried("<p>text</p>"), "<p>text</p>");
});

test("a URL that was already leaving the site is left exactly as it was", () => {
  // A path that walks above the site root has no site relative form, so there
  // is nothing to rewrite it into and guessing would turn a link that worked on
  // the site into one that works nowhere.
  assert.equal(
    carryUrls('<a href="../../outside.html">x</a>', "guide/using-it.html", `${OUTPUT_NAME}/guide.html`),
    '<a href="../../outside.html">x</a>'
  );
});

test("a URL already inside the generated folder is carried unchanged", () => {
  // The case that says the walk is a walk and not a prefix: a page the site
  // keeps inside the folder this tool resolved, carrying a sibling of the
  // generated page, comes out with the same relative URL it went in with.
  assert.equal(
    carryUrls('<img src="inside.svg">', `${OUTPUT_NAME}/kept.html`, `${OUTPUT_NAME}/kept.html`),
    '<img src="inside.svg">'
  );
});

test("the output folder at the site root leaves a root page's URLs alone", () => {
  // `--out .` puts the generated pages beside the site's own, so a page at the
  // root and the page carrying it are in one folder and nothing moves.
  assert.equal(carryUrls('<img src="badge.svg">', "index.html", "index.html"), '<img src="badge.svg">');
  // And a page one folder down is still one folder away.
  assert.equal(
    carryUrls('<img src="badge.svg">', "guide/using-it.html", "guide.html"),
    '<img src="guide/badge.svg">'
  );
});

test("the whole carry is a run away, so a site reads its own URLs back", async () => {
  // The two functions above, through `main`, with a server's view of it left to
  // the browser case: a page in a folder, an image beside it, a link to its
  // sibling, and the generated page naming both from where it actually sits.
  const root = await site({
    "guide/using-it.html": page("Using It", '<img src="badge.svg"><a href="reading-it.html">Next</a>'),
    "guide/reading-it.html": page("Reading It", '<p>Plain.</p><img src="../logo.svg">'),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const written = readFileSync(join(root, OUTPUT_NAME, "guide.html"), "utf8");
    assert.ok(written.includes('src="../guide/badge.svg"'), written);
    assert.ok(written.includes('href="../guide/reading-it.html"'), written);
    // `../logo.svg` off `guide/reading-it.html` is `logo.svg` at the root, and
    // from `cheatsheets/guide.html` that is one `..` and not two.
    assert.ok(written.includes('src="../logo.svg"'), written);
    // Not one copy of what was written, which is the whole of the defect.
    assert.ok(!written.includes('src="badge.svg"'), written);
    // The master page carries the same material and therefore the same answer.
    const master = readFileSync(join(root, OUTPUT_NAME, MASTER_NAME), "utf8");
    assert.ok(master.includes('src="../guide/badge.svg"'), master);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an output folder outside the site reports the URLs it could not rewrite", async () => {
  // The one route where there is no answer: `--out` somewhere with no site
  // relative form, so the material is carried as written and is broken exactly
  // as it was before the rewrite existed. Said rather than left silent, which
  // is what the menu's own outside-the-site refusal already does.
  const root = await site({
    "guide/using-it.html": page("Using It", '<img src="badge.svg"><a href="reading-it.html">Next</a>'),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(carriedUrlFindings(pages, OUTPUT_NAME), []);
    const findings = carriedUrlFindings(pages, "../beside");
    assert.equal(findings.length, 1, findings.join("\n"));
    assert.match(findings[0], /^guide\/using-it\.html: /);
    assert.match(findings[0], /not inside the site/);
    assert.match(findings[0], /2 relative URLs/);
    assert.match(findings[0], /badge\.svg/);
    // And a site whose material carries no relative URL has nothing to report,
    // whatever the folder is.
    const plain = await site({ "x.html": page("X", '<img src="/root.svg"><pre>code</pre>') });
    try {
      assert.deepEqual(carriedUrlFindings(await collectSite(plain), "../beside"), []);
    } finally {
      await rm(plain, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a heading out of a title is escaped, because a title is text and not markup", async () => {
  const root = await site({ "x.html": page("Arrays &amp; <b>Objects</b>", "<p>a</p>") });
  try {
    const markup = renderCheatsheet(only(await collectSite(root)));
    // `titleOf` hands back the characters it read, so the `<b>` in a title is
    // text that has to be escaped on the way out or it is markup on arrival.
    assert.ok(!markup.includes("<h1>Arrays &amp; <b>"));
    assert.match(markup, /&lt;b&gt;Objects&lt;\/b&gt;/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a page with no title falls back to its file name, read as prose", async () => {
  const root = await site({ "splice.html": `<html><body><div ${MARKER}><p>a</p></div></body></html>` });
  try {
    const pages = await collectSite(root);
    assert.equal(pages[0].title, null);
    assert.match(renderCheatsheet(only(pages)), /<h1>Splice<\/h1>/);
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
    // Three: the two cheatsheets and the master page carrying both, which is
    // reported for the pages it concatenates rather than for its own sources.
    assert.match(out, /pages written\s+3/);
    assert.match(out, /guide\.html, index\.html -> all-cheatsheets\.html \(master\)/);
    // Nothing marked a menu, and the line is printed anyway: a site expecting
    // one has to be able to see that the attribute was looked for.
    assert.match(out, /menus filled\s+0/);
    // And the folder really holds them, under the name the report gave, with
    // the manifest beside them: the folder records where it is so the next run
    // writes here rather than resolving a second one. `guide/two.html` is
    // `guide.html`, because a folder is a cheatsheet.
    assert.deepEqual(
      (await readdir(join(root, OUTPUT_NAME))).sort(),
      [MANIFEST_NAME, MASTER_NAME, "index.html", "guide.html"].sort()
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
    assert.deepEqual((await readdir(join(root, "elsewhere"))).sort(), [MANIFEST_NAME, MASTER_NAME, "index.html"].sort());
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
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, MASTER_NAME, "good.html"].sort());
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
    "a/docs/one.html": page("Guide", "<pre>guide material</pre>"),
    "b/docs/two.html": page("Reference", "<pre>reference material</pre>"),
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
    // The cheatsheet that claimed the name, and the master page holding it. The
    // one that was dropped is in neither: a master built out of what was
    // written is a master that cannot claim to carry what was not.
    assert.match(out.join(""), /pages written\s+2/);
    assert.match(errs.join(""), /cheatsheet-site: b\/docs\/: would be written as docs\.html/);
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, MASTER_NAME, "docs.html"].sort());
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
    const markup = renderCheatsheet(only([guide]));
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
  const root = await site({ "splice.html": marked("Splicing Arrays", "title", "<pre>x</pre>") });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(headingFor(pages[0]), { source: "title", heading: "Splicing Arrays", findings: [] });
    assert.ok(renderCheatsheet(only(pages)).includes("<h1>Splicing Arrays</h1>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('data-cheatsheet="page" takes it from the file name, title or no title', async () => {
  // The page has a `<title>` and does not use it, which is the whole of what
  // this value means: the two sources disagree and the site chose.
  const root = await site({ "splice.html": marked("Splicing Arrays", "page", "<pre>x</pre>") });
  try {
    const pages = await collectSite(root);
    // Read as prose, which is the other half of the answer: a file name is
    // written for a filesystem and a heading is read by a person.
    assert.deepEqual(headingFor(pages[0]), { source: "page", heading: "Splice", findings: [] });
    assert.ok(renderCheatsheet(only(pages)).includes("<h1>Splice</h1>"));
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
      ["Has A Title", "Has A Title", "C", "D"]
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
    assert.ok(renderCheatsheet(only([one])).includes("<h1>Guide</h1>"));
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
    assert.equal(heading, "Guide");
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
    assert.equal(heading, "Guide");
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
    assert.equal(headingFor(asked).heading, "Asked");
    assert.equal(headingFor(asked).findings.length, 1);
    assert.match(headingFor(asked).findings[0], /asks for the page's <title> and the page has none/);
    // Same missing title, no ask, no finding.
    assert.equal(headingFor(didnt).heading, "Didnt");
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
    assert.equal(heading, "Guide");
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

// ## A name read as prose
//
// The unit cases, because the shapes are the item: a case change is the one it
// is named for and the other three are what a real file name turns out to have.

test("a case change is a word boundary", () => {
  assert.equal(prose("somePageName"), "Some Page Name");
  assert.equal(prose("splice"), "Splice");
  assert.equal(prose("index"), "Index");
});

test("an acronym keeps its letters, and gives the last one back to the word after it", () => {
  // `Parse H T M L String` and `Parse HTMLString` are the two ways to get this
  // wrong, and a site that wrote an acronym meant it.
  assert.equal(prose("parseHTMLString"), "Parse HTML String");
  assert.equal(prose("XMLHttpRequest"), "XML Http Request");
  // Nothing after the run, so there is no word to give a letter back to.
  assert.equal(prose("HTML"), "HTML");
});

test("a digit run breaks on both sides of itself", () => {
  assert.equal(prose("base64Encode"), "Base 64 Encode");
  assert.equal(prose("html5"), "Html 5");
  assert.equal(prose("css3Grid"), "Css 3 Grid");
  assert.equal(prose("2fast"), "2 Fast");
});

test("a separator the name already carried is one break, and a run of them is still one", () => {
  assert.equal(prose("my-page_name"), "My Page Name");
  assert.equal(prose("my page"), "My Page");
  assert.equal(prose("my--page"), "My Page");
  assert.equal(prose("-leading-and-trailing-"), "Leading And Trailing");
});

test("a name with nothing readable in it comes back empty rather than as a heading", () => {
  assert.equal(prose(""), "");
  assert.equal(prose("---"), "");
});

test("only the first letter of a word is touched, so a word already capitalised is left alone", () => {
  // Lower casing the rest would read `ARRAYS` as `Arrays` and `HTML` as `Html`.
  assert.equal(prose("ARRAYS"), "ARRAYS");
  assert.equal(prose("Some Page"), "Some Page");
});

test("a title is not read as prose, because it was written to be read", async () => {
  // The distinction the item turns on: a file name is written for a filesystem
  // and a `<title>` is written for a person. Rewriting the second would be this
  // tool editing the site's own words.
  const root = await site({ "x.html": marked("someTitle theSite wrote", "title", "<p>a</p>") });
  try {
    const pages = await collectSite(root);
    assert.equal(headingFor(pages[0]).heading, "someTitle theSite wrote");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## A folder is a cheatsheet
//
// The grouping, and the three items that sit on it: what a folder's pages are
// written as, the order they read in, and the page that contributes nothing.

test("the folder a page sits in is its immediate parent, and the root is no folder at all", async () => {
  const root = await site({
    "index.html": page("Home", "<p>a</p>"),
    "guide/arrays/splice.html": page("Splice", "<p>b</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(pages.map(pageFolder), ["guide/arrays", ""]);
    // The immediate parent, which is what makes one folder one cheatsheet: a
    // site with `guide/arrays/` has an arrays cheatsheet, not a guide one with
    // everything below it in it.
    assert.deepEqual(pages.map(pageFilename), ["arrays.html", "index.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a folder's pages are written as one page named and headed for the folder", async () => {
  const root = await site({
    "someSection/one.html": page("First", "<pre>first</pre>"),
    "someSection/two.html": page("Second", "<pre>second</pre>"),
  });
  try {
    const pages = await collectSite(root);
    const sheet = only(pages);
    assert.equal(sheet.name, "someSection.html");
    assert.equal(sheet.folder, "someSection");
    // Read as prose, the same conversion a page heading gets off its own name.
    assert.equal(sheet.heading, "Some Section");
    assert.equal(sheet.headingSource, FOLDER_SOURCE);
    assert.deepEqual(sheet.pages.map((one) => one.id), ["someSection/one.html", "someSection/two.html"]);

    const markup = renderCheatsheet(sheet);
    assert.match(markup, /<h1>Some Section<\/h1>/);
    // Each page keeps the heading it asked for, as its own section, so the
    // grouping does not lose what every page but the first had to say.
    assert.deepEqual(
      [...markup.matchAll(/<h2>([^<]*)<\/h2>/g)].map((one) => one[1]),
      ["First", "Second"]
    );
    assert.deepEqual(
      [...markup.matchAll(/<section data-cheatsheet-page="([^"]+)">/g)].map((one) => one[1]),
      ["someSection/one.html", "someSection/two.html"]
    );
    // And every source is named in the head, not just the first.
    assert.deepEqual(
      [...markup.matchAll(/<meta name="cheatsheet-source" content="([^"]+)">/g)].map((one) => one[1]),
      ["someSection/one.html", "someSection/two.html"]
    );
    assert.ok(markup.includes("<pre>first</pre>") && markup.includes("<pre>second</pre>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("one page in a folder is still the folder's cheatsheet, and a root page is still its own", async () => {
  // The decision worth a case of its own, because the other reading is the
  // tempting one: grouping at two or more would mean the day a second page
  // arrived was the day the first page's output changed its name, and these
  // files are meant to be committed and diffed.
  const root = await site({
    "guide/only.html": page("The Only One", "<p>a</p>"),
    "alone.html": page("Alone", "<p>b</p>"),
  });
  try {
    const sheets = cheatsheets(await collectSite(root));
    assert.deepEqual(sheets.map((one) => one.name), ["alone.html", "guide.html"]);
    assert.deepEqual(sheets.map((one) => one.headingSource), ["title", FOLDER_SOURCE]);
    assert.deepEqual(sheets.map((one) => one.heading), ["Alone", "Guide"]);

    // The shape does not change with the count either. A folder of one is
    // sectioned, and a root page is not - so adding a second page to that
    // folder appends a section rather than reshaping the first.
    const [root_, folder] = sheets;
    assert.match(renderCheatsheet(folder), /<section data-cheatsheet-page="guide\/only\.html">/);
    assert.match(renderCheatsheet(folder), /<h2>The Only One<\/h2>/);
    assert.ok(!renderCheatsheet(root_).includes("<section"));
    assert.ok(!renderCheatsheet(root_).includes("<h2>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the sections read in the order the site does, which is the order the crawl hands over", async () => {
  // Held against `crawlSite` rather than against a list written here, because
  // the claim is that the two agree: a `Map` iteration or a sort of its own is
  // how the order would be lost without failing anything else.
  const root = await site({
    "section/10.html": page("Ten", "<p>10</p>"),
    "section/2.html": page("Two", "<p>2</p>"),
    "section/banana.html": page("Banana", "<p>b</p>"),
    "section/Apple.html": page("Apple", "<p>A</p>"),
  });
  try {
    const crawled = (await crawlSite(root)).map((path) => path.split(/[\\/]/).slice(-2).join("/"));
    const sheet = only(await collectSite(root));
    assert.deepEqual(sheet.pages.map((one) => one.id), crawled);
    // And the markup reads in that same order, which is the half a reader sees.
    assert.deepEqual(
      [...renderCheatsheet(sheet).matchAll(/<section data-cheatsheet-page="([^"]+)">/g)].map((one) => one[1]),
      crawled
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and the cheatsheets themselves come back in page order", async () => {
  const root = await site({
    "zebra/one.html": page("Zebra", "<p>z</p>"),
    "alpha/one.html": page("Alpha", "<p>a</p>"),
    "middle.html": page("Middle", "<p>m</p>"),
  });
  try {
    assert.deepEqual(
      cheatsheets(await collectSite(root)).map((one) => one.name),
      ["alpha.html", "middle.html", "zebra.html"]
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an unmarked page in a folder is no section of that folder's cheatsheet", async () => {
  // **Skip a page carrying no marked element** was already true before the
  // grouping, by the collector finding nothing on the page. Grouping is where
  // it could have stopped being true, because a folder's cheatsheet is built
  // from the folder rather than from one page - so an empty `<section>` with a
  // heading and nothing under it is what a grouping that read every page would
  // emit.
  const root = await site({
    "guide/marked.html": page("Marked", "<pre>material</pre>"),
    "guide/plain.html": "<!DOCTYPE html><html><head><title>Plain</title></head><body><p>nothing</p></body></html>",
    "guide/voided.html": `<html><head><title>Voided</title></head><body><img ${MARKER} src="a.png"></body></html>`,
  });
  try {
    const pages = await collectSite(root);
    assert.equal(pages.length, 3);
    const sheet = only(pages);
    // `voided.html` marked an element that cannot enclose anything, so it has a
    // block and no content - which is the case a `blocks.length` test would let
    // through and `carryingPages` does not.
    assert.deepEqual(sheet.pages.map((one) => one.id), ["guide/marked.html"]);
    const markup = renderCheatsheet(sheet);
    assert.equal([...markup.matchAll(/<section data-cheatsheet-page=/g)].length, 1);
    assert.ok(!markup.includes("Plain") && !markup.includes("Voided"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a folder whose every page is unmarked is no cheatsheet at all", async () => {
  const root = await site({
    "guide/plain.html": "<html><head><title>Plain</title></head><body><p>nothing</p></body></html>",
    "real.html": page("Real", "<p>a</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.deepEqual(cheatsheets(pages).map((one) => one.name), ["real.html"]);
    const written = await writePages(pages, join(root, "out"));
    assert.deepEqual(await readdir(join(root, "out")), [MASTER_NAME, "real.html"]);
    assert.deepEqual(sheetsOf(written).flatMap((one) => one.sources), ["real.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a grouped cheatsheet counts the blocks of every page of it", async () => {
  // The manifest's `blocks` is per cheatsheet, so a grouped one that counted
  // the first page's blocks would under-report every folder with two pages in
  // it - and nothing else in the file would disagree with it.
  const root = await site({
    "guide/one.html": `<html><head><title>One</title></head><body><div ${MARKER}><p>a</p></div><div ${MARKER}><p>b</p></div></body></html>`,
    "guide/two.html": page("Two", "<p>c</p>"),
  });
  try {
    const planned = plannedPages(await collectSite(root));
    assert.deepEqual(planned, [
      // The master page is first, and counts the blocks of every cheatsheet for
      // the same reason: it carries all of them.
      {
        name: MASTER_NAME,
        heading: "All Cheatsheets",
        headingSource: MASTER_SOURCE,
        sources: ["guide/one.html", "guide/two.html"],
        blocks: 3,
      },
      {
        name: "guide.html",
        heading: "Guide",
        headingSource: FOLDER_SOURCE,
        sources: ["guide/one.html", "guide/two.html"],
        blocks: 3,
      },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the report names every source of a grouped cheatsheet", async () => {
  // A line naming only the first would read as the others having been dropped,
  // which is the one thing a collision finding means.
  const root = await site({
    "guide/one.html": page("One", "<p>a</p>"),
    "guide/two.html": page("Two", "<p>b</p>"),
  });
  try {
    const { code, out } = await run([root]);
    assert.equal(code, 0);
    assert.match(out, /guide\/one\.html, guide\/two\.html -> guide\.html \(folder\)/);
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
      // The master page, first and named as a page of the folder rather than as
      // a cheatsheet of the site. `headingSource` is what a reader tells them
      // apart by, and the reason the manifest's version moved to 3.
      {
        sources: ["guide/two.html", "index.html"],
        page: MASTER_NAME,
        heading: "All Cheatsheets",
        headingSource: MASTER_SOURCE,
        blocks: 2,
      },
      // A folder's cheatsheet is headed for the folder, so `page` on the page
      // inside it chose that page's section heading rather than this one.
      {
        sources: ["guide/two.html"],
        page: "guide.html",
        heading: "Guide",
        headingSource: FOLDER_SOURCE,
        blocks: 1,
      },
      { sources: ["index.html"], page: "index.html", heading: "Home", headingSource: "title", blocks: 1 },
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
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, MASTER_NAME, "index.html"].sort());
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
      [OUTPUT_NAME, MASTER_NAME, "index.html"].sort()
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

test("a manifest of an earlier shape is still where the folder is, and one run heals it", async () => {
  // The decision the version number forced. A page entry's `source` became
  // `sources` when a folder's pages grouped into one cheatsheet, so the shape
  // is `2` - and refusing a `1` would make a site owner's existing folder
  // invisible and send this run to write a second section beside it, which is
  // the one failure the manifest exists to prevent. The folder is read off
  // where the file is, so an older shape answers that question as well as a
  // current one.
  const root = await site({ "index.html": page("Home", "<p>one</p>") });
  try {
    assert.equal((await run([root])).code, 0);
    const path = join(root, OUTPUT_NAME, MANIFEST_NAME);
    const current = JSON.parse(readFileSync(path, "utf8"));
    const old = {
      generator: GENERATOR,
      manifestVersion: 1,
      marker: MARKER,
      output: OUTPUT_NAME,
      pages: [{ source: "index.html", page: "index.html", heading: "Home", headingSource: "title", blocks: 1 }],
    };
    await writeFile(path, `${JSON.stringify(old, null, 2)}\n`, "utf8");
    assert.ok(MANIFEST_READABLE.includes(1) && MANIFEST_READABLE.includes(MANIFEST_VERSION));

    const found = await readManifest(root);
    assert.equal(found.name, OUTPUT_NAME);
    assert.equal(found.manifest.manifestVersion, 1);

    const second = await run([root]);
    assert.equal(second.code, 0);
    assert.match(second.out, new RegExp(`read from ${MANIFEST_NAME.replace(".", "\\.")}`));
    // One section, not two, and the file is back at the current shape.
    assert.deepEqual((await readdir(root)).sort(), [OUTPUT_NAME, "index.html"]);
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), current);
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
    assert.deepEqual((await readdir(out)).sort(), [MANIFEST_NAME, MASTER_NAME, "index.html"].sort());
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
    assert.match(out, /pages to write\s+3/);
    assert.match(out, /index\.html -> index\.html/);
    assert.match(out, /guide\/two\.html -> guide\.html/);
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
    "a/docs/one.html": page("Docs", "<p>claims docs.html</p>"),
    "b/docs/two.html": page("Docs", "<p>collides</p>"),
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
    assert.deepEqual(lines(dry.out), [
      // The master first, named for the cheatsheets it concatenates - and the
      // one that lost the collision is not among them.
      `  docs.html, guide.html, index.html -> ${MASTER_NAME} (${MASTER_SOURCE})`,
      `  a/docs/one.html -> docs.html (${FOLDER_SOURCE})`,
      `  guide/two.html -> guide.html (${FOLDER_SOURCE})`,
      "  index.html -> index.html (title)",
    ]);
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
    assert.deepEqual(Object.keys(first).sort(), [MANIFEST_NAME, MASTER_NAME, "index.html", "guide.html", "reference.html"].sort());

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
    assert.notEqual(second["guide.html"], first["guide.html"]);
    assert.ok(second["guide.html"].includes("two, revised"));
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
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, MASTER_NAME, "index.html"].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## The comment syntax
//
// The second authoring method. The cases are the questions the five items ask:
// what a comment applies to, what it may say, how more than one thing is said
// in one comment, what is reported when it says something the tool cannot read,
// and what happens where it and the attribute both speak about one page.
//
// A directive is parsed out of a string wherever the case is about the parse,
// and run against a site wherever it is about the answer or about a finding,
// because a finding names the page it was written on and a string has no page.

test("a comment applies to the element that follows it, and gives back what that element wraps", () => {
  const found = collectMarked(
    `<!-- {% ${COMMENT_KEYWORD}: [heading: page] %} -->\n<section><p>Splice</p></section>`
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].method, COMMENT_METHOD);
  assert.equal(found[0].tag, "section");
  // The inner markup, exactly as the attribute method gives it back. A comment
  // has no closing tag, so what it marks is the next element rather than
  // something it encloses - and the element's extent is read with the same
  // depth walk, which the nesting case below is what holds.
  assert.equal(found[0].content, "<p>Splice</p>");
  assert.deepEqual(found[0].properties, { heading: "page" });
});

test("the element it marks is closed by the same walk the attribute's is, so nesting is counted", () => {
  const html = `<!-- {% ${COMMENT_KEYWORD} %} -->\n<div><div>one</div><div>two</div></div>`;
  assert.equal(collectMarked(html)[0].content, "<div>one</div><div>two</div>");
});

test("a cheatsheet comment is still a comment, so a marker written inside one is still not a marker", () => {
  // The decision this case pins. Making a cheatsheet comment transparent would
  // have been the obvious way to read one, and it would have turned every
  // marker a site owner had commented out back on - which is exactly the
  // markup they had decided against.
  const html = [
    `<!-- {% ${COMMENT_KEYWORD}: [heading: page] %} -->`,
    "<section><p>on</p></section>",
    `<!-- <div ${MARKER}>off</div> -->`,
  ].join("\n");
  assert.deepEqual(
    collectMarked(html).map((one) => one.content),
    ["<p>on</p>"]
  );
});

test("a directive is the whole of its comment, so a comment about the syntax is not one", () => {
  // A comment explaining the markup, or leaving a note beside it, is a comment
  // about the tool rather than an instruction to it.
  assert.deepEqual(commentDirectives(`<!-- mark it with {% ${COMMENT_KEYWORD}: [heading: page] %} -->`), []);
  assert.deepEqual(commentDirectives(`<!-- {% ${COMMENT_KEYWORD} %} and then a note -->`), []);
  // And the keyword is a whole word, so the attribute's neighbour does not
  // become the comment's: `data-cheatsheet-menu` is **The Menu Element**'s.
  assert.deepEqual(commentDirectives(`<!-- {% ${COMMENT_KEYWORD}s %} -->`), []);
  assert.equal(commentDirectives(`<!-- {% ${COMMENT_KEYWORD} %} -->\n<div>x</div>`).length, 1);
});

test("a comment naming the tool and nothing else marks what follows with the defaults", () => {
  // The comment form of a valueless attribute.
  assert.deepEqual(directive(null).properties, {});
  assert.deepEqual(directive(null).problems, []);
  assert.deepEqual(directive("").properties, {});
  assert.deepEqual(directive("").problems, []);
});

test("both methods feed one collector, and the blocks come back in source order", () => {
  const html = [
    `<div ${MARKER}><p>one</p></div>`,
    `<!-- {% ${COMMENT_KEYWORD} %} -->`,
    "<div><p>two</p></div>",
    `<div ${MARKER}><p>three</p></div>`,
  ].join("\n");
  const found = collectMarked(html);
  assert.deepEqual(
    found.map((one) => one.content),
    ["<p>one</p>", "<p>two</p>", "<p>three</p>"]
  );
  assert.deepEqual(
    found.map((one) => one.method),
    [ATTRIBUTE_METHOD, COMMENT_METHOD, ATTRIBUTE_METHOD]
  );
});

test("a comment whose element also carries the attribute is one block, not two", () => {
  const found = collectMarked(
    `<!-- {% ${COMMENT_KEYWORD}: [group: page] %} -->\n<div ${MARKER}="title"><p>x</p></div>`
  );
  assert.equal(found.length, 1);
  // Collected once is a rule about the material, not about the attribute. Both
  // answers are on the one block: the comment is what marked it, and the
  // attribute's value is still what the page wrote.
  assert.equal(found[0].method, COMMENT_METHOD);
  assert.equal(found[0].value, "title");
  assert.deepEqual(found[0].properties, { group: "page" });
});

test("a comment inside collected material is said rather than collected twice", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `<div ${MARKER}>`,
      `<!-- {% ${COMMENT_KEYWORD}: [heading: page] %} -->`,
      "<p>inner</p>",
      "</div>",
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    // One block of material, the outer one. The two methods are not treated
    // alike when one is dropped: a nested attribute adds nothing to what its
    // parent already said and goes in silence, while a nested comment carries
    // properties that were being ignored.
    assert.deepEqual(
      guide.blocks.filter((one) => one.content.length > 0).map((one) => one.method),
      [ATTRIBUTE_METHOD]
    );
    assert.equal(headingFor(guide).source, "title");
    assert.equal(guide.findings.length, 1);
    assert.match(guide.findings[0], /^guide\.html:4: a cheatsheet comment sits inside material/);
    assert.match(guide.findings[0], /the heading it sets was ignored/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a comment with no element after it marked nothing, and each one says which line it was on", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `<div><!-- {% ${COMMENT_KEYWORD}: [heading: page] %} --></div>`,
      `<!-- {% ${COMMENT_KEYWORD} %} --> prose, which is not an element`,
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    // A closing tag and a run of prose are the same answer: the comment was
    // written in front of nothing. Carrying the directive on to the next
    // element it could find would apply it to material nobody wrote it for.
    assert.deepEqual(guide.blocks.map((one) => one.content), ["", ""]);
    assert.equal(guide.findings.length, 2);
    assert.match(guide.findings[0], /^guide\.html:3: a cheatsheet comment has no element after it/);
    assert.match(guide.findings[1], /^guide\.html:4: a cheatsheet comment has no element after it/);
    assert.match(guide.findings[0], /with nothing but whitespace in between/);
    // And the properties go with the marking. The one at line 3 set a heading
    // and the page is told which, because a property dropped in silence is how
    // a site owner comes to believe it was read.
    assert.match(guide.findings[0], /so it marked nothing and the heading it sets was ignored\./);
    assert.match(guide.findings[1], /so it marked nothing\. A comment applies/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a comment that marked nothing sets nothing, so it cannot outrank the one that did", async () => {
  // The whole of why the properties go with the marking: the first answer in
  // source order wins, so a comment left in front of prose would name the file
  // and choose the heading over the comment that actually marked the material.
  const root = await site({
    "guide/one.html": [
      "<html><head><title>One</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD}: [name: stray, group: page, heading: page] %} --> prose, not an element`,
      `<!-- {% ${COMMENT_KEYWORD}: [name: real] %} -->`,
      "<div><p>a</p></div>",
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const pages = await collectSite(root);
    assert.equal(commentOption(pages[0], "name").value, "real");
    assert.equal(pageFilename(pages[0]), "real.html");
    // Neither of the other two properties reached the page either, so the
    // grouping and the heading are the ones the page would have had.
    assert.equal(pageGrouping(pages[0]), "folder");
    assert.equal(headingFor(pages[0]).source, "title");
    assert.deepEqual(
      sheetsOf(plannedPages(pages)).map((one) => one.name),
      ["real.html"]
    );
    // One finding, naming all three of them, rather than a silent rename.
    assert.equal(pages[0].findings.length, 1);
    assert.match(
      pages[0].findings[0],
      /^guide\/one\.html:3: .* the name and group and heading it sets were ignored\./
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a comment in front of an element that cannot enclose anything is a finding too", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD} %} -->`,
      '<img src="x.png">',
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    // Same judgement the attribute method makes about a marked `<img>`, said in
    // the words of the method the page used: a finding names the markup the
    // site owner wrote, not the markup they could have written instead.
    assert.equal(guide.findings.length, 1);
    assert.match(guide.findings[0], /^guide\.html:3: <img> cannot enclose anything/);
    assert.match(guide.findings[0], /the cheatsheet comment in front of it collected nothing/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## The property vocabulary

test("the properties are data, and the finding for one it does not know reads the same list", async () => {
  // The reason the vocabulary is a record rather than a chain of comparisons:
  // the parse reads this list to decide what a property is and the sentence
  // reads it to say what the vocabulary is, so the two cannot disagree.
  assert.deepEqual(Object.keys(COMMENT_PROPERTIES), ["heading", "group", "name"]);
  assert.deepEqual(COMMENT_PROPERTIES.heading.values, HEADING_SOURCES);
  assert.deepEqual(COMMENT_PROPERTIES.group.values, GROUPINGS);
  // A name is the site's own text rather than one of a set, which is what the
  // null says and what `NAME_PATTERN` is for instead.
  assert.equal(COMMENT_PROPERTIES.name.values, null);
  const root = await site({ "guide.html": commented("Guide", "colour: red", "<p>x</p>") });
  try {
    const [guide] = await collectSite(root);
    assert.equal(guide.findings.length, 1);
    for (const property of Object.keys(COMMENT_PROPERTIES)) {
      assert.ok(guide.findings[0].includes(property), `${property} is not in: ${guide.findings[0]}`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("heading maps onto the heading source, which is the option the attribute already set", async () => {
  const root = await site({
    "asked.html": commented("Asked Title", "heading: page", "<p>x</p>"),
    "left.html": commented("Left Title", null, "<p>x</p>"),
  });
  try {
    const [asked, left] = await collectSite(root);
    assert.equal(headingFor(asked).source, "page");
    assert.equal(headingFor(asked).heading, "Asked");
    // And a comment that says nothing about the heading leaves the behaviour
    // the tool had: the title, with the file name behind it.
    assert.equal(headingFor(left).source, "title");
    assert.equal(headingFor(left).heading, "Left Title");
    assert.deepEqual([...asked.findings, ...left.findings], []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("group maps onto the folder grouping, which is the one thing a page in a folder could not say", async () => {
  const root = await site({
    "guide/one.html": page("One", "<p>a</p>"),
    "guide/two.html": commented("Two Title", "group: page", "<p>b</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.equal(pageGrouping(pages[0]), "folder");
    assert.equal(pageGrouping(pages[1]), "page");
    const sheets = cheatsheets(pages);
    // One cheatsheet for the folder and one for the page that asked out of it,
    // and the one that asked out is headed for itself rather than the folder.
    assert.deepEqual(sheets.map((one) => one.name), ["guide.html", "two.html"]);
    assert.deepEqual(sheets.map((one) => one.headingSource), [FOLDER_SOURCE, "title"]);
    assert.deepEqual(sheets.map((one) => one.heading), ["Guide", "Two Title"]);
    assert.deepEqual(sheets.flatMap((one) => one.pages.map((two) => two.id)), [
      "guide/one.html",
      "guide/two.html",
    ]);
    assert.deepEqual(pages.flatMap((one) => one.findings), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("name maps onto the file the cheatsheet is written as, and the heading is not renamed with it", async () => {
  const root = await site({ "guide/one.html": commented("One", "name: splice", "<p>a</p>") });
  try {
    const pages = await collectSite(root);
    assert.equal(pageFilename(pages[0]), "splice.html");
    const [sheet] = cheatsheets(pages);
    assert.equal(sheet.name, "splice.html");
    // Still the folder's cheatsheet, so still headed for the folder. What a
    // file is called and what a page is headed were two answers before a
    // comment could set either, and they stay two.
    assert.equal(sheet.heading, "Guide");
    assert.equal(sheet.headingSource, FOLDER_SOURCE);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a value naming one of a set is read trimmed and without case; a name keeps the case it was written in", () => {
  // The same judgement the attribute's value gets, and for the same reason:
  // both are written by hand. A name is the exception because it names a file.
  assert.deepEqual(directive("heading:  PAGE ").properties, { heading: "page" });
  assert.deepEqual(directive("group: Folder").properties, { group: "folder" });
  assert.deepEqual(directive("name: SpliceArrays").properties, { name: "SpliceArrays" });
});

// ## More than one property in one comment

test("several properties are read, which is what the syntax carries brackets for", () => {
  const block = directive("heading: page, group: page, name: splice");
  assert.deepEqual(block.properties, { heading: "page", group: "page", name: "splice" });
  assert.deepEqual(block.problems, []);
});

test("the shapes a hand written list has: a trailing comma, a colon in a value, a quoted space", () => {
  // A trailing comma is a trailing comma, not a property with no name.
  assert.deepEqual(directive("heading: page,").properties, { heading: "page" });
  assert.deepEqual(directive("heading: page,").problems, []);
  assert.deepEqual(directive("heading: page , , group: page").properties, { heading: "page", group: "page" });
  // The first colon separates, so a value may hold one. The refusal is what
  // reads the value back, which is the point of asserting on it here: the
  // whole of `a.b:c` was taken as one value rather than split again.
  assert.equal(directive("name: a.b:c").problems[0].value, "a.b:c");
  // A quoted value is one value with a space or a comma inside it.
  assert.equal(directive(`name: "one two"`).problems[0].value, "one two");
  assert.equal(directive(`name: "one,two"`).problems[0].value, "one,two");
  // And the quotes come off a value the tool does take.
  assert.deepEqual(directive(`heading: "page", group: 'folder'`).properties, {
    heading: "page",
    group: "folder",
  });
});

test("the same property written twice with two values keeps the first, and says which it dropped", () => {
  const block = directive("heading: page, heading: title");
  assert.deepEqual(block.properties, { heading: "page" });
  assert.deepEqual(block.problems, [{ kind: "repeated", property: "heading", value: "title" }]);
  // Written twice with one value is a repeat and says nothing, which is the
  // silence a page naming one heading source twice already gets.
  assert.deepEqual(directive("heading: page, heading: page").problems, []);
});

// ## What a comment got wrong, with the page and the line

test("an unknown property is reported with the page and the line it appeared on", async () => {
  const root = await site({ "guide.html": commented("Guide", "colour: red", "<p>x</p>") });
  try {
    const [guide] = await collectSite(root);
    // The line is the item, not a detail of it. Every other finding in this
    // tool names an element a reader can search their page for; the words of
    // the wrong comment on a page of several are the same words.
    assert.equal(guide.findings.length, 1);
    assert.match(guide.findings[0], /^guide\.html:4: colour names no cheatsheet comment property/);
    // And the content after it is still collected, with the defaults, because a
    // finding is the site's to fix and not a reason to drop the page.
    assert.equal(guide.blocks[0].content, "<p>x</p>");
    assert.equal(headingFor(guide).heading, "Guide");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and the line is each comment's own, so two of them on one page are told apart", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD}: [colour: red] %} -->`,
      "<div><p>a</p></div>",
      "<p>prose</p>",
      `<!-- {% ${COMMENT_KEYWORD}: [colour: blue] %} -->`,
      "<div><p>b</p></div>",
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    assert.deepEqual(
      guide.findings.map((one) => one.slice(0, "guide.html:3".length)),
      ["guide.html:3", "guide.html:6"]
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a value the property does not take, and a property with no value, are said the same way", async () => {
  const root = await site({
    "value.html": commented("Value", "heading: banner", "<p>x</p>"),
    "none.html": commented("None", "heading:", "<p>x</p>"),
  });
  try {
    const [none, value] = await collectSite(root);
    assert.match(value.findings[0], /^value\.html:4: heading: banner names no value the heading property takes/);
    assert.match(value.findings[0], new RegExp(`It reads ${HEADING_SOURCES.join(" and ")}\\.$`));
    assert.match(none.findings[0], /^none\.html:4: heading is written with no value/);
    assert.match(none.findings[0], /It sets which source the page's heading is read from/);
    // Neither was read, so both pages keep the heading they would have had.
    assert.equal(headingFor(value).source, "title");
    assert.equal(headingFor(none).source, "title");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a body that is not a bracketed list is reported, and the content after it is still collected", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD}: heading page %} -->`,
      "<div><p>x</p></div>",
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    assert.equal(guide.findings.length, 1);
    assert.match(guide.findings[0], /^guide\.html:3: a cheatsheet comment reads "heading page"/);
    assert.match(guide.findings[0], /where a bracketed property list was expected/);
    assert.equal(guide.blocks[0].content, "<p>x</p>");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a name that is not a file name is refused rather than sanitised into one", async () => {
  // The value becomes a path under the generated folder, so a `/` in it is
  // either a folder this tool does not create or a way out of the one it
  // resolved. A site owner who wrote it meant something, and quietly turning
  // it into something else is how they come to believe it was read.
  assert.ok(NAME_PATTERN.test("splice"));
  assert.ok(NAME_PATTERN.test("base64-utils_2.0"));
  for (const bad of ["../out", "a/b", "a\\b", ".hidden", "", "one two"]) {
    assert.ok(!NAME_PATTERN.test(bad), `${bad} should not be a name`);
  }
  const root = await site({ "guide/one.html": commented("One", "name: ../out", "<p>a</p>") });
  try {
    const pages = await collectSite(root);
    assert.match(pages[0].findings[0], /^guide\/one\.html:4: name: \.\.\/out is not a file name/);
    // And the cheatsheet keeps the name it had.
    assert.equal(pageFilename(pages[0]), "guide.html");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a comment finding reaches the report and the exit code, like any other", async () => {
  const root = await site({ "guide.html": commented("Guide", "colour: red", "<p>x</p>") });
  try {
    const { code, err } = await run([root]);
    assert.equal(code, 1);
    assert.match(err, /cheatsheet-site: guide\.html:4: colour names no cheatsheet comment property/);
    // And the page it could read is there, as every other finding leaves it.
    assert.ok(readFileSync(join(root, OUTPUT_NAME, "guide.html"), "utf8").includes("<h1>Guide</h1>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("every problem a comment can have has a sentence of its own, and none falls through", async () => {
  // The composer's last arm is unreachable while this holds, and it holds by
  // being checked rather than by being believed: one page writing all eight.
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD}: heading page %} -->`,
      "<div><p>a</p></div>",
      `<!-- {% ${COMMENT_KEYWORD}: [colour: red] %} -->`,
      "<div><p>b</p></div>",
      `<!-- {% ${COMMENT_KEYWORD}: [heading: banner] %} -->`,
      "<div><p>c</p></div>",
      `<!-- {% ${COMMENT_KEYWORD}: [name:] %} -->`,
      "<div><p>d</p></div>",
      `<!-- {% ${COMMENT_KEYWORD}: [group: page, group: folder] %} -->`,
      "<div><p>e</p>",
      `<!-- {% ${COMMENT_KEYWORD}: [heading: page] %} -->`,
      "<p>f</p></div>",
      `<!-- {% ${COMMENT_KEYWORD}: [name: ../out] %} -->`,
      "<div><p>g</p></div>",
      `<!-- {% ${COMMENT_KEYWORD} %} -->`,
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    assert.equal(guide.findings.length, COMMENT_PROBLEMS.length);
    for (const finding of guide.findings) {
      assert.ok(!finding.includes("has no sentence for"), finding);
      assert.match(finding, /^guide\.html:\d+: /);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a line is counted from 1, and an offset past the end is the last line", () => {
  const text = "one\ntwo\nthree";
  assert.equal(lineAt(text, 0), 1);
  assert.equal(lineAt(text, 4), 2);
  assert.equal(lineAt(text, text.length), 3);
  assert.equal(lineAt(text, text.length + 50), 3);
});

// ## Mixing the two methods on one page

test("where a comment and the attribute both name a heading, the comment wins and the page is told", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide Title</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD}: [heading: page] %} -->`,
      `<div ${MARKER}="title"><p>x</p></div>`,
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    const { source, heading, findings } = headingFor(guide);
    // The comment is the more specific of the two: it was written about this
    // material, while an attribute sits on an element and may have been there
    // first. Stated in one place rather than wherever the two readings meet.
    assert.equal(source, "page");
    assert.equal(heading, "Guide");
    assert.equal(findings.length, 1);
    assert.match(findings[0], /a cheatsheet comment asks for heading: page and data-cheatsheet="title"/);
    assert.match(findings[0], /so the comment won/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("and the two saying one thing is not a disagreement", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide Title</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD}: [heading: title] %} -->`,
      `<div ${MARKER}="title"><p>x</p></div>`,
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    assert.equal(headingFor(guide).heading, "Guide Title");
    assert.deepEqual(headingFor(guide).findings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two comments naming two headings on one page is reported, and the first in source order wins", async () => {
  const root = await site({
    "guide.html": [
      "<html><head><title>Guide Title</title></head>",
      "<body>",
      `<!-- {% ${COMMENT_KEYWORD}: [heading: page] %} -->`,
      "<div><p>a</p></div>",
      `<!-- {% ${COMMENT_KEYWORD}: [heading: title] %} -->`,
      "<div><p>b</p></div>",
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const [guide] = await collectSite(root);
    const { source, findings } = headingFor(guide);
    assert.equal(source, "page");
    assert.equal(findings.length, 1);
    assert.match(findings[0], /heading: page and heading: title ask for two different headings on one page/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("group: folder on a page at the site root has no folder to join, and says so", async () => {
  const root = await site({ "index.html": commented("Home", "group: folder", "<p>x</p>") });
  try {
    const [home] = await collectSite(root);
    // The one ask that cannot be judged from the comment alone: a page knows
    // whether it has a folder and a directive does not. The answer is the one
    // the page would have had, so nothing moves - only the silence goes.
    assert.equal(pageGrouping(home), "page");
    assert.equal(pageFilename(home), "index.html");
    assert.equal(home.findings.length, 1);
    assert.match(home.findings[0], /^index\.html:4: group: folder asks this page to join its folder/);
    assert.match(home.findings[0], /it has no folder to join/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two pages of one folder naming it two files keeps the first, and says which it dropped", async () => {
  const root = await site({
    "guide/one.html": commented("One", "name: splice", "<p>a</p>"),
    "guide/two.html": commented("Two", "name: concat", "<p>b</p>"),
  });
  try {
    const pages = await collectSite(root);
    // A name belongs to the cheatsheet and not to the page, because a page is
    // not what gets written: a folder of two pages is one file, and either of
    // them can say what it is called. The alternative is the last page of a
    // folder quietly renaming the file the others were written into.
    const [sheet] = cheatsheets(pages);
    assert.equal(sheet.name, "splice.html");
    assert.deepEqual(sheet.pages.map((one) => one.id), ["guide/one.html", "guide/two.html"]);
    const findings = namingFindings(pages);
    assert.equal(findings.length, 1);
    assert.match(findings[0], /^guide\/two\.html:4: name: concat renames a cheatsheet guide\/one\.html has/);
    assert.match(findings[0], /so the first in source order was used/);
    // And it reaches the report and the exit code like any other finding.
    const { code, err } = await run([root]);
    assert.equal(code, 1);
    assert.match(err, /cheatsheet-site: guide\/two\.html:4: name: concat renames a cheatsheet/);
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), [MANIFEST_NAME, MASTER_NAME, "splice.html"].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("two pages of one folder naming it the same file is one name said twice, not a disagreement", async () => {
  const root = await site({
    "guide/one.html": commented("One", "name: splice", "<p>a</p>"),
    "guide/two.html": commented("Two", "name: splice", "<p>b</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.equal(cheatsheets(pages)[0].name, "splice.html");
    assert.deepEqual(namingFindings(pages), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a name two cheatsheets both ask for collides like any other name", async () => {
  const root = await site({
    "a/one.html": commented("One", "name: shared", "<p>a</p>"),
    "b/two.html": commented("Two", "name: shared", "<p>b</p>"),
  });
  try {
    const pages = await collectSite(root);
    // The output folder is still flat, so a name a comment chose collides on
    // exactly the terms a name read off a folder does - and the comment is not
    // a way around the refusal.
    const collisions = nameCollisions(pages);
    assert.equal(collisions.length, 1);
    assert.match(collisions[0], /^b\/: would be written as shared\.html, which a\/ already claimed/);
    assert.deepEqual(cheatsheets(pages).map((one) => one.name), ["shared.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("commentOption reads the first answer in source order, and null where no comment gave one", async () => {
  const root = await site({
    "guide/one.html": page("One", "<p>a</p>"),
    "guide/two.html": commented("Two", "group: page, name: splice", "<p>b</p>"),
  });
  try {
    const pages = await collectSite(root);
    assert.equal(commentOption(pages[0], "group"), null);
    assert.deepEqual(commentOption(pages[1], "group"), { value: "page", line: 4 });
    assert.deepEqual(commentOption(pages[1], "name"), { value: "splice", line: 4 });
    // A value the vocabulary does not know never reaches here: it is reported
    // with its line and left out of the properties.
    assert.equal(commentOption(pages[1], "heading"), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the usage names the comment syntax, its properties and which method wins", async () => {
  const { code, out } = await run(["--help"]);
  assert.equal(code, 0);
  assert.match(out, /\{% cheatsheet: \[heading: page, group: page, name: splice\] %\}/);
  for (const property of Object.keys(COMMENT_PROPERTIES)) assert.match(USAGE, new RegExp(`${property}:`));
  assert.match(USAGE, /the comment wins/);
});

// ## The master page

test("the master page is every cheatsheet, composed by the function that writes one", () => {
  // The item's own wording: generated from the same collected data as the
  // individual pages, so the two cannot drift apart. What holds it is the
  // heading level - a cheatsheet page writes its sheet at level 1 and the
  // master writes each at level 2, through one function - so a case comparing
  // the two documents' material is comparing one composition against itself.
  const pages = [
    {
      path: "/x/guide/one.html",
      id: "guide/one.html",
      title: "One",
      blocks: [{ tag: "div", value: null, content: "<p>guide one</p>", at: 0, line: 1, method: "attribute", properties: {}, problems: [] }],
      menus: [],
      findings: [],
    },
    {
      path: "/x/splice.html",
      id: "splice.html",
      title: "Splice",
      blocks: [{ tag: "section", value: "title", content: "<p>splice</p>", at: 0, line: 1, method: "attribute", properties: {}, problems: [] }],
      menus: [],
      findings: [],
    },
  ];
  const sheets = cheatsheets(pages);
  assert.deepEqual(sheets.map((one) => one.name), ["guide.html", "splice.html"]);
  const markup = renderMaster({ heading: "All Cheatsheets", pages, parts: sheets });

  // Its own heading, then one section per cheatsheet naming the file that
  // cheatsheet is also written as.
  assert.match(markup, /<h1>All Cheatsheets<\/h1>/);
  assert.match(markup, /<section data-cheatsheet-sheet="guide\.html">\n<h2>Guide<\/h2>/);
  assert.match(markup, /<section data-cheatsheet-sheet="splice\.html">\n<h2>Splice<\/h2>/);
  // A folder's cheatsheet is sectioned and its pages drop one level with it, so
  // the master has an outline rather than four `<h1>`s.
  assert.match(markup, /<section data-cheatsheet-page="guide\/one\.html">\n<h3>One<\/h3>/);
  assert.ok(!markup.includes("<h1>Guide</h1>"), "a cheatsheet keeps its page heading level inside the master");

  // Every page of the site in the head, and every page's material in the body -
  // the same material the individual pages carry, which is what "cannot drift
  // apart" is a claim about.
  for (const page of pages) {
    assert.ok(markup.includes(`<meta name="cheatsheet-source" content="${page.id}">`));
    assert.ok(markup.includes(page.blocks[0].content));
  }
});

test("the master page claims its name before any cheatsheet can", async () => {
  // It is one more name in a flat folder, and it is the page every menu links
  // to - so a cheatsheet written over it would leave the site pointing at the
  // wrong document. Reported through the mechanism a collision already has.
  const root = await site({ [MASTER_NAME]: page("Clash", "<p>wants the master's name</p>") });
  try {
    const pages = await collectSite(root);
    const findings = nameCollisions(pages);
    assert.equal(findings.length, 1);
    assert.match(
      findings[0],
      new RegExp(`^${MASTER_NAME.replace(".", "\\.")}: would be written as ${MASTER_NAME.replace(".", "\\.")}, which the master page already claimed`)
    );
    // Nothing is written at all: the one cheatsheet lost its name, so there is
    // nothing left for a master page to concatenate.
    assert.deepEqual(plannedPages(pages), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a site that marked nothing gets no master page either", async () => {
  const root = await site({ "plain.html": "<html><body><p>nothing</p></body></html>" });
  try {
    assert.deepEqual(await writePages(await collectSite(root), join(root, "out")), []);
    assert.deepEqual(await readdir(root), ["plain.html"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// ## The menu element

test("a page menu is filled with a link to the master page", async () => {
  const root = await site({
    "index.html": `<html><head><title>Home</title></head>\n<body>\n<nav><div ${MENU_MARKER}="page"></div></nav>\n<div ${MARKER}><p>material</p></div>\n</body></html>\n`,
  });
  try {
    const { code, out } = await run([root]);
    assert.equal(code, 0);
    const html = readFileSync(join(root, "index.html"), "utf8");
    // The signature is part of the fill, which is what lets the next run know
    // the content between these tags is its own and write over it.
    assert.ok(
      html.includes(
        `<div ${MENU_MARKER}="page">${MENU_OPEN}<a href="${OUTPUT_NAME}/${MASTER_NAME}">` +
          `All Cheatsheets</a>${MENU_CLOSE}</div>`
      ),
      html
    );
    // Reported with the line as well as the page, because a page can mark two.
    assert.match(out, /menus filled\s+1/);
    assert.match(out, /index\.html:3 -> page \(1 entry\)/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a dropdown is one entry per page of the generated folder, master first", async () => {
  // The mode that reads the generated folder as data rather than writing it.
  // The master leads, because the page carrying all of it stands ahead of the
  // parts of it, and the manifest records them in that order.
  const root = await site({
    "index.html": `<html><head><title>Home</title></head>\n<body>\n<div ${MENU_MARKER}="dropdown"></div>\n<div ${MARKER}><p>home</p></div>\n</body></html>\n`,
    "guide/one.html": page("One", "<p>one</p>"),
    "base64Utils.html": page("Base 64", "<p>utils</p>"),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const html = readFileSync(join(root, "index.html"), "utf8");
    // A working control with no script and no stylesheet, which is the whole
    // reason it is a `<details>` rather than a `<select>`.
    assert.match(html, /<details>\n\s+<summary>Cheatsheets<\/summary>/);
    const entries = [...html.matchAll(/<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g)].map((one) => [one[1], one[2]]);
    assert.deepEqual(entries, [
      [`${OUTPUT_NAME}/${MASTER_NAME}`, "All Cheatsheets"],
      // The text is the prose form of the generated file's name, so the digit
      // boundary a heading reads is the one an entry reads.
      [`${OUTPUT_NAME}/base64Utils.html`, "Base 64 Utils"],
      [`${OUTPUT_NAME}/guide.html`, "Guide"],
      [`${OUTPUT_NAME}/index.html`, "Index"],
    ]);
    // Every entry names a file that is really there.
    for (const [link] of entries) assert.ok(readFileSync(join(root, ...link.split("/")), "utf8").length > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a link is relative to the page it is written into, not to the resolved folder", async () => {
  // The question the menu raised and nothing else in this tool had to answer:
  // everything else a run writes goes into the resolved folder, and a menu goes
  // into a page of the site that may sit two folders down.
  const root = await site({
    "deep/down/nav.html": `<html><head><title>Nav</title></head>\n<body>\n<div ${MENU_MARKER}="dropdown"></div>\n</body></html>\n`,
    "index.html": page("Home", "<p>home</p>"),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const html = readFileSync(join(root, "deep", "down", "nav.html"), "utf8");
    assert.ok(html.includes(`<a href="../../${OUTPUT_NAME}/${MASTER_NAME}">`), html);
    assert.ok(html.includes(`<a href="../../${OUTPUT_NAME}/index.html">`), html);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("linkFrom walks the two paths apart, and never drops the file it points at", () => {
  // Unit cases rather than a site, because the three shapes that matter are
  // path arithmetic: a page beside the folder, a page under it, and a page in
  // the folder's own parent chain.
  assert.equal(linkFrom("nav.html", "cheatsheets/guide.html"), "cheatsheets/guide.html");
  assert.equal(linkFrom("deep/down/nav.html", "cheatsheets/guide.html"), "../../cheatsheets/guide.html");
  assert.equal(linkFrom("a/nav.html", "a/out/guide.html"), "out/guide.html");
  // The target's last segment is its file name and is never shared away, so a
  // page in the folder it is listing still gets a usable link.
  assert.equal(linkFrom("out/nav.html", "out/guide.html"), "guide.html");
  // `--out .` puts the pages at the site root, which the walk reads as no
  // folder rather than as a `.` segment to climb out of.
  assert.equal(linkFrom("deep/nav.html", "guide.html"), "../guide.html");
});

test("two menus on one page are both filled, and the rest of the page is untouched", async () => {
  // One read and one write per page, with the splices applied from the end
  // backwards: forwards, filling the first moves the offsets of the second by
  // the difference between what was there and what was written.
  const before = `<html><head><title>Home</title></head>\n<body>\n<div ${MENU_MARKER}="page"></div>\n<p>between</p>\n<div ${MENU_MARKER}="dropdown"></div>\n<div ${MARKER}><p>material</p></div>\n</body></html>\n`;
  const root = await site({ "index.html": before });
  try {
    const { code, out } = await run([root]);
    assert.equal(code, 0);
    assert.match(out, /menus filled\s+2/);
    const html = readFileSync(join(root, "index.html"), "utf8");
    assert.match(html, new RegExp(`<div ${MENU_MARKER}="page">${MENU_OPEN}<a href=`));
    assert.match(
      html,
      new RegExp(`<div ${MENU_MARKER}="dropdown">\\n\\s+${MENU_OPEN}\\n\\s+<details>`)
    );
    // Nothing outside the two marked spans moved, which is what makes this a
    // splice rather than a rewrite.
    for (const line of ["<html><head><title>Home</title></head>", "<p>between</p>", `<div ${MARKER}><p>material</p></div>`]) {
      assert.ok(html.includes(line), line);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a filled page keeps its own line endings and indentation", async () => {
  // The menu is written into a file somebody else maintains, so a run that
  // handed it back with this platform's newline would report every line of it
  // as changed. The indentation is the same argument: a generated block flush
  // left in an indented file is a diff a site owner reverts.
  const root = await site({
    "index.html": `<html>\r\n<body>\r\n    <div ${MENU_MARKER}="dropdown"></div>\r\n    <div ${MARKER}><p>material</p></div>\r\n</body>\r\n</html>\r\n`,
  });
  try {
    assert.equal((await run([root])).code, 0);
    const html = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(!/[^\r]\n/.test(html), "a line of the page is no longer CRLF");
    assert.ok(html.includes("\r\n      <details>\r\n"), html);
    assert.ok(html.includes("\r\n    </div>\r\n"), html);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a second run leaves a filled page exactly as the first one left it", async () => {
  // Filling a menu changes the site, so the byte identical promise is about
  // what happens from the second run on: the fill is composed from the
  // manifest, not from what is in the element, so it converges.
  const root = await site({
    "index.html": `<html><head><title>Home</title></head>\n<body>\n<div ${MENU_MARKER}="dropdown"></div>\n<div ${MARKER}><p>material</p></div>\n</body></html>\n`,
  });
  try {
    assert.equal((await run([root])).code, 0);
    const first = readFileSync(join(root, "index.html"), "latin1");
    const generated = await folderBytes(join(root, OUTPUT_NAME));
    assert.equal((await run([root])).code, 0);
    assert.equal(readFileSync(join(root, "index.html"), "latin1"), first);
    assert.deepEqual(await folderBytes(join(root, OUTPUT_NAME)), generated);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("--dry-run reports the menus it would fill and fills none of them", async () => {
  const before = `<html><head><title>Home</title></head>\n<body>\n<div ${MENU_MARKER}="dropdown"></div>\n<div ${MARKER}><p>material</p></div>\n</body></html>\n`;
  const root = await site({ "index.html": before });
  try {
    const dry = await run([root, "--dry-run"]);
    assert.equal(dry.code, 0);
    assert.match(dry.out, /menus to fill\s+1/);
    assert.match(dry.out, /index\.html:3 -> dropdown \(2 entries\)/);
    assert.equal(readFileSync(join(root, "index.html"), "utf8"), before);
    // What the dry run promised is what the real run writes, which is the whole
    // value of a dry run that is believed: one plan, read twice.
    const real = await run([root]);
    const menuLine = (text) => text.split("\n").filter((line) => line.includes(" -> ") && line.includes("dropdown"));
    assert.deepEqual(menuLine(dry.out), menuLine(real.out));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("what a menu element cannot say is reported with the page and the line", async () => {
  // Six sentences, because six things are wrong here and a report that said
  // "some menus were not written" sends nobody to a line.
  const root = await site({
    "bad.html": [
      "<html><head><title>Bad</title></head>",
      "<body>",
      `<section ${MARKER}="page">`,
      "  <p>material</p>",
      `  <div ${MENU_MARKER}="dropdown"></div>`,
      "</section>",
      `<div ${MARKER} ${MENU_MARKER}="page"><p>both</p></div>`,
      `<div ${MENU_MARKER}="sidebar"></div>`,
      `<div ${MENU_MARKER}></div>`,
      `<img ${MENU_MARKER}="page">`,
      `<div ${MENU_MARKER}="page">`,
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const { code, err } = await run([root]);
    assert.equal(code, 1);
    // Nested inside collected material: filling it would put the menu on the
    // generated cheatsheet the next run writes, with its links relative to the
    // page it was written into rather than to the page it ended up on.
    assert.match(err, /bad\.html:5: <div> carrying data-cheatsheet-menu sits inside material marked/);
    // Both markings on one element: the content was read out of it, so writing
    // a menu in would replace what was just collected.
    assert.match(err, /bad\.html:7: <div> carries data-cheatsheet and data-cheatsheet-menu/);
    // A value naming no menu, and no value at all. Neither is given a default,
    // unlike the marker's: the two menus are a link and a list, and guessing
    // writes markup nobody asked for into somebody else's page.
    assert.match(err, /bad\.html:8: data-cheatsheet-menu="sidebar" names no menu/);
    assert.match(err, /bad\.html:9: data-cheatsheet-menu is written with no value/);
    for (const mode of Object.keys(MENU_MODES)) assert.match(err, new RegExp(`${mode} \\(`));
    // An element that can enclose nothing, and one that is never closed.
    assert.match(err, /bad\.html:10: <img> cannot enclose anything/);
    assert.match(err, /bad\.html:11: the <div> carrying data-cheatsheet-menu is never closed/);
    // Not one of them was written, and the page is unchanged apart from that.
    assert.ok(!readFileSync(join(root, "bad.html"), "utf8").includes("<details>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a menu element holding marked material is refused, so the site keeps its copy", async () => {
  // The costlier direction of the nesting, and the one that is not recoverable:
  // the fill writes over whatever is between the tags, and the collector has
  // already read that material out of this page. Replacing it leaves the site's
  // own copy gone, and a second run finds nothing marked here to write again -
  // so the only copy left would be the one in the generated folder.
  const root = await site({
    "index.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `  <div ${MENU_MARKER}="dropdown">`,
      `    <div ${MARKER}="page">`,
      "      <pre>material</pre>",
      "    </div>",
      "  </div>",
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const { code, err } = await run([root]);
    assert.equal(code, 1);
    assert.match(err, /index\.html:3: the <div> carrying data-cheatsheet-menu holds material marked/);
    const html = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(html.includes("<pre>material</pre>"), "the material was written over");
    assert.ok(!html.includes("<details>"), "a menu was written into it anyway");
    // The cheatsheet itself was still written: the refusal is the menu's alone.
    assert.ok(readFileSync(join(root, OUTPUT_NAME, "index.html"), "utf8").includes("<pre>material</pre>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a menu element holding another one is refused, and the inner one still fills", async () => {
  // Two spans where one contains the other. The fills are applied back to front
  // so that earlier offsets survive later cuts, which holds for menus side by
  // side and cannot hold for nested ones: the inner splice has already moved
  // the outer one's end offset by the time it is used, so filling both cuts
  // through the markup that replaced the inner menu and hands back a page that
  // does not parse. The inner is the one that can be written safely.
  const root = await site({
    "index.html": [
      "<html><head><title>Guide</title></head>",
      "<body>",
      `  <div ${MARKER}="page"><pre>code</pre></div>`,
      `  <div ${MENU_MARKER}="dropdown">`,
      `    <span ${MENU_MARKER}="page"></span>`,
      "  </div>",
      "</body></html>",
      "",
    ].join("\n"),
  });
  try {
    const { code, err } = await run([root]);
    assert.equal(code, 1);
    assert.match(err, /index\.html:4: the <div> carrying data-cheatsheet-menu holds another/);
    const html = readFileSync(join(root, "index.html"), "utf8");
    // The inner menu is filled, and every tag of the page is still whole.
    assert.match(
      html,
      new RegExp(
        `<span data-cheatsheet-menu="page">${MENU_OPEN}<a href="[^"]+">All Cheatsheets</a>${MENU_CLOSE}</span>`
      )
    );
    assert.ok(!html.includes("<details>"), "the outer menu was filled as well");
    assert.equal(html.match(/<a /g).length, 1);
    // What the corruption looked like: the outer cut mid-attribute, so the tail
    // of one was left behind as text opening a line of its own.
    assert.ok(!/^\s*heatsheets\//m.test(html), "a cut attribute was left in the page");
    assert.ok(html.endsWith("  </div>\n</body></html>\n"), "the outer element lost its close");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a menu element holding a hand written menu is left exactly as it was", async () => {
  // The last of the three refusals, and the one that is about nothing but
  // ownership: the content between the tags carries no marking at all, so
  // neither scan has anything to say about it. What it is, nearly always, is a
  // menu somebody wrote by hand as a fallback - and a tool that wrote over it
  // would be taking markup nobody could get back.
  const fallback = [
    "<html><head><title>Guide</title></head>",
    "<body>",
    `  <nav ${MENU_MARKER}="dropdown">`,
    '    <ul><li><a href="/handwritten.html">Written by hand</a></li></ul>',
    "  </nav>",
    `  <div ${MARKER}="page"><pre>material</pre></div>`,
    "</body></html>",
    "",
  ].join("\n");
  const root = await site({ "index.html": fallback });
  try {
    const { code, err, out } = await run([root]);
    assert.equal(code, 1);
    assert.match(err, /index\.html:3: the <nav> carrying data-cheatsheet-menu already holds content/);
    // Both ways out of it are named, because which one a site owner wants is
    // not this tool's to guess: the element can be emptied, or the attribute
    // can come off and the markup stay.
    assert.match(err, /Empty the element to have a menu written into it, or keep the markup and drop the/);
    // Byte for byte what it was. Not "the links are still there" - the whole
    // page, because the refusal is the absence of a splice.
    assert.equal(readFileSync(join(root, "index.html"), "utf8"), fallback);
    assert.match(out, /menus filled\s+0/);
    // The cheatsheet is still written, the way every other finding leaves what
    // it could read written.
    assert.ok(readFileSync(join(root, OUTPUT_NAME, "index.html"), "utf8").includes("<pre>material</pre>"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a menu this tool wrote is written over, and the signature is what says so", async () => {
  // The question the refusal could not have been built without: a menu element
  // is not empty on the second run either, so emptiness cannot be what decides.
  // The signature is, and this is the case that holds both halves of it - the
  // fill is replaced rather than refused, and a site owner's markup beside it
  // is not.
  const root = await site({
    "index.html": `<html><head><title>Home</title></head>\n<body>\n<div ${MENU_MARKER}="dropdown"></div>\n<div ${MARKER}><p>one</p></div>\n</body></html>\n`,
  });
  try {
    assert.equal((await run([root])).code, 0);
    const filled = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(filled.includes(MENU_OPEN) && filled.includes(MENU_CLOSE), filled);
    // A page arrives in the folder, so the menu this run writes is not the menu
    // the last one wrote - and the element is written over without a word.
    await writeFile(join(root, "guide.html"), page("Guide", "<p>two</p>"), "utf8");
    const second = await run([root]);
    assert.equal(second.code, 0);
    assert.match(second.out, /menus filled\s+1/);
    const again = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(again.includes('>Guide</a>'), again);
    // One fill, not a fill inside a fill: the signature appears once.
    assert.equal(again.split(MENU_OPEN).length - 1, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("half a signature is somebody's content, and the whole span has to carry it", () => {
  // Read strictly on purpose. The one thing worse than refusing to fill is
  // filling over markup on the strength of a word, so a span that merely
  // contains the opening comment is content: what it looks like is a hand
  // written menu written after a generated one, which is the case where the
  // loose reading deletes something.
  const held = (inner) =>
    menuElements(`<html><body><nav ${MENU_MARKER}="dropdown">${inner}</nav></body></html>`)[0].holds;
  assert.equal(held(""), "nothing");
  assert.equal(held("\n   \n  "), "nothing");
  assert.equal(held(`${MENU_OPEN}<a href="a.html">A</a>${MENU_CLOSE}`), "generated");
  // Whitespace around the pair is the shape the dropdown mode actually writes.
  assert.equal(held(`\n  ${MENU_OPEN}\n  <details></details>\n  ${MENU_CLOSE}\n`), "generated");
  assert.equal(held(`${MENU_OPEN}<a href="a.html">A</a>`), "content");
  assert.equal(held(`${MENU_OPEN}<a href="a.html">A</a>${MENU_CLOSE}<ul><li>mine</li></ul>`), "content");
  assert.equal(held("<ul><li>mine</li></ul>"), "content");
  // An element with no usable span has no content to own, and says `null`
  // rather than guessing at one.
  assert.equal(menuElements(`<img ${MENU_MARKER}="page">`)[0].holds, null);
});

test("a menu with nothing to list is reported rather than filled with an empty list", async () => {
  const root = await site({ "a.html": `<html><body><div ${MENU_MARKER}="page"></div></body></html>\n` });
  try {
    const { code, err, out } = await run([root]);
    assert.equal(code, 1);
    assert.match(err, /a\.html:1: data-cheatsheet-menu="page" asks for a menu and the site marked no material/);
    assert.match(out, /menus filled\s+0/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an output folder outside the site has no link from a page, and says so", async () => {
  // `--out` takes whatever was typed, so the folder can be beside the site or
  // on another drive. An absolute path written into the site's markup is this
  // machine's answer in a file read on another.
  const root = await site({
    "index.html": `<html><head><title>Home</title></head>\n<body>\n<div ${MENU_MARKER}="page"></div>\n<div ${MARKER}><p>material</p></div>\n</body></html>\n`,
  });
  const out = await mkdtemp(join(tmpdir(), "cheatsheet-site-out-"));
  try {
    const { code, err } = await run([root, "--out", out]);
    assert.equal(code, 1);
    assert.match(err, /index\.html:3: the output folder .* is not inside the site/);
    assert.ok(!readFileSync(join(root, "index.html"), "utf8").includes("<a href="));
    // The pages themselves were still written, the way any other finding leaves
    // what it could read written.
    assert.ok((await readdir(out)).includes(MASTER_NAME));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(out, { recursive: true, force: true });
  }
});

test("the menu attribute is still not the marker, and the marker is still not it", () => {
  // The distinction the collector has turned on since before there was a menu
  // to fill, held from both sides now that both scans exist.
  assert.deepEqual(collectMarked(`<div ${MENU_MARKER}="page"></div>`), []);
  const menus = menuElements(`<div ${MARKER}><p>x</p></div>`);
  assert.deepEqual(menus, []);
  // And an attribute whose name merely starts the same way as the menu's is a
  // third attribute, belonging to neither.
  assert.deepEqual(menuElements(`<div ${MENU_MARKER}-extra="page"></div>`), []);
  // A marker inside a comment is not a marker, which holds for this one too: a
  // commented out block is where a site owner leaves markup they decided
  // against.
  assert.deepEqual(menuElements(`<!-- <div ${MENU_MARKER}="page"></div> -->`), []);
});

test("the usage names the menu element, both modes and the master page", async () => {
  const { code, out } = await run(["--help"]);
  assert.equal(code, 0);
  assert.match(out, new RegExp(MENU_MARKER));
  for (const [mode, what] of Object.entries(MENU_MODES)) {
    assert.match(USAGE, new RegExp(`${MENU_MARKER}="${mode}"`));
    assert.match(USAGE, new RegExp(what.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(USAGE, new RegExp(MASTER_NAME.replace(".", "\\.")));
});

// ## What the tool may depend on

// ## The composed page

test("textLines reads a site's markup as rows, and says which of them are labels", () => {
  // The reading the sheet is set from, and the only lossy step in this tool.
  // Four shapes, because four things in real markup decide what a row is.
  const lines = textLines(
    [
      "<h2>Splicing</h2>",
      "<p>Remove and insert in <strong>one</strong> call.</p>",
      "<table><caption>Arguments</caption>",
      "<tr><th>start</th><td>where it begins</td></tr></table>",
      "<pre><code>items.splice(1, 2, &quot;demo&quot;);</code></pre>",
    ].join("\n")
  );
  assert.deepEqual(lines, [
    // A heading is a label for what follows it, and the design language sets a
    // label as a comment row. So is a `<caption>` and so is a `<th>`.
    { text: "Splicing", role: "comment" },
    // An inline element is not a line break: the sentence stays a sentence.
    { text: "Remove and insert in one call.", role: "plain" },
    { text: "Arguments", role: "comment" },
    { text: "start", role: "comment" },
    { text: "where it begins", role: "plain" },
    // Escaped as the page wrote it, read back as the author typed it.
    { text: 'items.splice(1, 2, "demo");', role: "plain" },
  ]);
  // Indentation between tags is the markup's own layout rather than a row.
  assert.deepEqual(textLines("  <div>\n    <p>  spaced   out  </p>\n  </div>"), [
    { text: "spaced out", role: "plain" },
  ]);
});

test("an opaque span contributes nothing to the sheet, tags and all", () => {
  // The chart case, which is the one the fixture site is for: a chart brings a
  // script with it, and a `</div>` inside a script string is not a tag here for
  // the same reason it is not one to the collector.
  const lines = textLines(
    [
      "<figure><figcaption>Monthly totals</figcaption>",
      '<canvas id="chart"></canvas>',
      "<script>const row = '<div>12</div>'; draw(row);</script>",
      "<style>.chart { color: red; }</style>",
      "</figure>",
    ].join("\n")
  );
  assert.deepEqual(lines, [{ text: "Monthly totals", role: "comment" }]);
});

test("a generated page carries a render of the cheatsheet's own document", async () => {
  const root = await site({
    "index.html": page("Acme Reference", "<h2>Splice</h2><p>Remove and insert.</p>"),
  });
  try {
    const pages = await collectSite(root);
    const [sheet] = cheatsheets(pages);
    const doc = siteDocument(sheet);
    // The document is read off the cheatsheet: its title is the sheet's heading,
    // and a root page is one unsectioned listing because the sheet is already
    // headed for it.
    assert.equal(doc.title, "Acme Reference");
    assert.equal(doc.seed, "index.html");
    assert.deepEqual(doc.sections, [
      {
        lines: [
          { text: "Splice", role: "comment" },
          { text: "Remove and insert.", role: "plain" },
        ],
      },
    ]);
    const markup = renderCheatsheet(sheet);
    // The figure, wrapped as the surface wraps an embeddable sheet: the picture
    // named as an image, and its links laid beside it rather than inside it.
    assert.match(markup, /<div class="cheatsheet" style="position:relative">\n<div role="img" aria-label="Acme Reference cheat sheet">/);
    assert.match(markup, /<nav class="cheatsheet-links" aria-label="Follow practicing\.xyz"/);
    assert.match(markup, /<svg id="cheatsheet-site-index"[^>]*viewBox="0 0 3600 3600"/);
    // And the material under it, exactly as the site wrote it. The figure is the
    // reading; the markup is the record.
    assert.ok(markup.includes("<h2>Splice</h2><p>Remove and insert.</p>"), markup);
    // Nothing of the standalone SVG document leaked into the page.
    assert.ok(!markup.includes("<?xml"), "the XML declaration was written into an HTML page");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a generated page carries the links its route earns, and only those", async () => {
  // A generated page is composed with no brand, so its footer is the drawn one:
  // the mark square and the default follow line, both naming the site. That is
  // one destination over two areas, so one stop for a keyboard and a reader,
  // and the second area is there for a pointer only. Nothing links to an
  // account the site's owner did not put there.
  const root = await site({
    "index.html": page("Acme Reference", "<h2>Splice</h2><p>Remove and insert.</p>"),
  });
  try {
    const [sheet] = cheatsheets(await collectSite(root));
    const markup = renderCheatsheet(sheet);
    const nav = /<nav class="cheatsheet-links"[^>]*>([\s\S]*?)<\/nav>/.exec(markup)?.[1];
    assert.ok(nav, "the generated page has no link layer");
    const anchors = nav.match(/<a\s[^>]*><\/a>/g);
    assert.equal(anchors.length, 2);
    for (const anchor of anchors) assert.match(anchor, /href="https:\/\/practicing\.xyz"/);
    assert.match(anchors[0], /aria-label="practicing\.xyz"/);
    assert.match(anchors[1], /aria-hidden="true" tabindex="-1"/);
    assert.doesNotMatch(markup, /mastodon|instagram|x\.com|github\.com/i, "a generated page links an account");
    assert.doesNotMatch(markup, /rel="me/, "a generated page claims an identity that is not its own");
    // And none of it inside the picture.
    assert.doesNotMatch(/<div role="img"[^>]*>([\s\S]*?)<\/div>/.exec(markup)[1], /<a\s|data-name="links"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the page and a media file of the same sheet are two renders of one composition", async () => {
  // The claim the item was written for, and the only way to hold it is to make
  // the other render and compare: a page that composed its own document would
  // agree today and drift the first time either side changed.
  const root = await site({
    "guide/one.html": page("One", "<p>first</p>"),
    "guide/two.html": page("Two", "<p>second</p>"),
  });
  try {
    const [sheet] = cheatsheets(await collectSite(root));
    const doc = siteDocument(sheet);
    // A folder is one cheatsheet of two sections, each titled for the page it
    // came from - the same rule the `<section>` on the page is written by.
    assert.deepEqual(
      doc.sections.map((one) => one.title),
      ["One", "Two"]
    );
    const standalone = renderSVG(doc, { seed: doc.seed });
    const embedded = /<svg[\s\S]*?<\/svg>/.exec(renderCheatsheet(sheet))[0];
    // Everything past the root's own opening tag, which is the whole of what a
    // fragment is allowed to differ by: the id, the size attributes and the
    // inline scaling rules all live on that tag. Below it the two renders are
    // one composition, byte for byte, or they are not the same sheet.
    const under = (markup) => markup.slice(markup.indexOf(">", markup.indexOf("<svg")) + 1).trim();
    assert.ok(under(standalone).includes("<tspan"), "the standalone render set no type");
    assert.ok(under(standalone).includes(">first<") && under(standalone).includes(">second<"), under(standalone));
    // The standalone file carries its links as an SVG group; the page lifts them
    // out of the picture into a layer beside it. Under the links, one sheet.
    assert.equal(under(embedded), under(withoutLinks(standalone)));
    // And the two root tags differ in exactly the ways a fragment names.
    assert.match(embedded, /^<svg id="cheatsheet-site-guide"/);
    assert.ok(!/^<svg[^>]*\swidth="/.test(embedded), "the fragment kept the composition's size attributes");
    assert.match(embedded, /style="display:block;width:100%;height:auto"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a page holding several figures names each one, so no id is written twice", async () => {
  // The master page is the case: it concatenates every cheatsheet of a site, so
  // it carries a figure per cheatsheet - and every composition writes the same
  // id on its root, which is right for a standalone SVG and invalid markup here.
  const root = await site({
    "index.html": page("Home", "<p>home</p>"),
    "guide/one.html": page("One", "<p>one</p>"),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const master = readFileSync(join(root, OUTPUT_NAME, MASTER_NAME), "utf8");
    const ids = [...master.matchAll(/<svg id="([^"]+)"/g)].map((one) => one[1]);
    assert.deepEqual(ids, [`${GENERATOR}-guide`, `${GENERATOR}-index`]);
    assert.equal(new Set(ids).size, ids.length, "the master page wrote one id twice");
    // The name is the generated file's stem, so a sheet's figure is reachable by
    // the same word the menu entry and the manifest name it by.
    for (const id of ids) assert.ok(master.includes(`<svg id="${id}"`), id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a stem a site owner can write is still an id, which rules out the whitespace in it", async () => {
  // The stem is the site's own file or folder name, and `getting started` is an
  // ordinary one. An `id` may hold no ASCII whitespace, so writing that stem
  // through would be invalid markup, and the selector a stylesheet or a script
  // would reach it with would not parse - which is the whole use the id was
  // added for.
  const root = await site({
    "getting started/intro.html": page("Intro", "<p>Install the thing.</p>"),
  });
  try {
    assert.equal((await run([root])).code, 0);
    const written = readFileSync(join(root, OUTPUT_NAME, "getting started.html"), "utf8");
    const ids = [...written.matchAll(/<svg id="([^"]+)"/g)].map((one) => one[1]);
    assert.deepEqual(ids, [`${GENERATOR}-getting-started`]);
    for (const id of ids) assert.doesNotMatch(id, /\s/, `${id} is an id holding whitespace`);
    // The file is still named for the folder, untouched: the slug is the id's
    // and nothing above it. A site owner's folder name is theirs.
    assert.match(written, /<h1>Getting Started<\/h1>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("material a sheet cannot be set from gets no figure, and keeps its markup", async () => {
  // A document has to carry a section and a section has to carry something, so
  // a cheatsheet whose material reads as no text at all has nothing to compose.
  // The honest answer is no figure rather than a sheet with an invented row.
  const root = await site({
    "index.html": page("Pictures", '<img src="chart.png" alt="">'),
  });
  try {
    const [sheet] = cheatsheets(await collectSite(root));
    assert.equal(siteDocument(sheet), null);
    const markup = renderCheatsheet(sheet);
    assert.ok(!markup.includes("<svg"), markup);
    // The page is still written and still carries what the site marked, with
    // the one thing a carry does not leave alone: a relative URL was relative
    // to the site root and the generated page is a folder down from it.
    assert.ok(markup.includes('<img src="../chart.png" alt="">'), markup);
    assert.equal((await run([root])).code, 0);
    assert.ok(
      readFileSync(join(root, OUTPUT_NAME, "index.html"), "utf8").includes('src="../chart.png"')
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("it installs nothing, which is the constraint it runs under", () => {
  // It runs against somebody else's checkout with whatever Node they have, so
  // nothing here may be fetched. Until 2026.11.10 that was spelt "every import
  // is a Node builtin", and the day the page composed through `api/cheatsheet/`
  // was the day that spelling had to change - which is why the case was written
  // in the first place, rather than discovering the drift later.
  //
  // What replaces it is the same constraint read properly: a builtin, or a
  // relative path inside this repository. The cheatsheet API is this
  // repository's own code and is published with it, so importing it is not an
  // install; a bare specifier is, whatever it names.
  const source = readFileSync(new URL("./cheatsheet-site.mjs", import.meta.url), "utf8");
  // Both forms, because the day the surface was imported was also the day an
  // import first spanned several lines. A pattern that read only the one line
  // form would have passed this case by not finding the import at all, which is
  // the failure a check like this has to be written against.
  const imports = [...source.matchAll(/^import [\s\S]*?from "([^"]+)";$/gm)].map((match) => match[1]);
  assert.ok(imports.length > 1, "the import walk read fewer imports than this file has");
  for (const specifier of imports) {
    assert.ok(
      specifier.startsWith("node:") || specifier.startsWith("./") || specifier.startsWith("../"),
      `${specifier} is neither a Node builtin nor a path in this repository, and this script may ` +
        `not install anything`
    );
  }
  // And the one it does reach for is the published surface rather than a module
  // behind it, so the tool is held to the same entry point a page loads.
  assert.deepEqual(
    imports.filter((one) => !one.startsWith("node:")),
    ["../api/cheatsheet/index.mjs"]
  );
  // The surface is browser safe, which `tools/test-sheet-render.mjs` holds by
  // walking its import graph. That matters here because it is the reason this
  // import costs nothing: nothing in it reads a file or resolves a browser
  // until a raster is asked for, and this tool asks for markup.
  const api = readFileSync(new URL("../api/cheatsheet/index.mjs", import.meta.url), "utf8");
  assert.ok(!/from "node:/.test(api), "the surface this tool imports now reads a Node builtin");
});
