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
// Two questions are asked, one per item the file closes.
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
  main,
  nameCollisions,
  opaqueRanges,
  outputCandidates,
  pageFilename,
  renderPage,
  resolveOutput,
  titleOf,
  writePages,
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
    // And the folder really holds them, under the name the report gave.
    assert.deepEqual((await readdir(join(root, OUTPUT_NAME))).sort(), ["index.html", "two.html"]);
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
    assert.deepEqual(await readdir(join(root, "elsewhere")), ["index.html"]);
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
    assert.deepEqual(await readdir(join(root, OUTPUT_NAME)), ["good.html"]);
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
    assert.deepEqual(await readdir(join(root, OUTPUT_NAME)), ["index.html"]);
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
