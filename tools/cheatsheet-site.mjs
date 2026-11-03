// Crawls a site tree, collects the content it has marked as cheatsheet
// material, and writes a cheatsheet page per source page that carried any.
//
//     node tools/cheatsheet-site.mjs <site>
//     node tools/cheatsheet-site.mjs <site> --out <dir>
//     node tools/cheatsheet-site.mjs --help
//
// ## What this is for
//
// A site that already publishes code examples, tables and explanatory sections
// holds everything a cheatsheet needs; what it lacks is a way to say so. The
// saying is one attribute - `data-cheatsheet` on the element wrapping the
// material - and this is the half that reads it: the walk, the collector, the
// output folder and the write.
//
// It runs against **somebody else's site**, which is the constraint that shapes
// every decision below. Nothing here may assume this repository's layout, its
// catalog or its conventions, and nothing may be installed: a site owner runs
// this against a checkout of their own pages with whatever Node they have.
//
// ## Dependency free, and why that rules out a parser
//
// The obvious way to find an element carrying an attribute is to parse the
// document. There is no HTML parser in the standard library and this script may
// not install one, so {@link collectMarked} scans instead - which is a real
// limitation and is worth stating rather than discovering:
//
// - It reads the markup as written, so a marker produced by a script at run
//   time is invisible to it. That is the right half to cover: a build step
//   reads files, and **Expose a browser entry point** under **Building on the
//   API** in `TODO.md` is what covers the other.
// - A start tag is walked rather than searched, so a `>` inside an attribute
//   value is not read as the end of it - `<div title="a>b" data-cheatsheet>` is
//   one element and is collected as one. That was not true until 2026.11.03 and
//   it failed two silent ways, which is why it is stated here rather than left
//   to the scan: the marker after such a value looked like it was outside the
//   tag and the page contributed nothing at all, and a `>` inside the marker's
//   own value cut the tag in half and carried the rest of it onto the generated
//   page as content.
// - What the walk still cannot do is read a **closing** tag written inside an
//   attribute value, because the depth count looks for one name rather than
//   tokenizing every tag it passes: a `title="</div>"` on some other element
//   inside a marked `<div>` closes it there. That is one more than legal HTML
//   asks for - an unescaped `<` in an attribute value is a parse error, which
//   the `>` this fixed is not - so it is a stated limit rather than the next
//   fix. It is silent when it happens, like the early close a script string
//   used to cause: the count reaches zero, so the element looks cleanly closed
//   and the content after the cut is dropped with nothing said about it.
//   Closing it needs the depth walk to pass over whole start tags rather than
//   to search for one name, which is a tokenizer rather than a patch.
// - It counts tags of the same name to find where a marked element ends, so
//   unbalanced markup inside one reaches the end of the document rather than
//   guessing. The page is reported as a finding instead of being written
//   wrong, per {@link UNCLOSED}.
// - A marker inside a comment or inside `<script>` or `<style>` is not a
//   marker. Those ranges are found first and candidates inside them are
//   dropped, because a commented-out section is exactly where a site owner
//   leaves markup they have decided against. They do not count toward the
//   closing tag either: a `</div>` written in a script string or a stylesheet
//   comment is not a close, and counting one would end the element early and
//   hand back content that stopped in the wrong place with nothing to say it
//   had.
//
// ## What belongs to later items, and is deliberately absent
//
// This is the first of five items under **The Scripted Tool**, and the section
// below it in `TODO.md` is a whole method of its own. Reading those as
// scaffolding to leave hooks for would be the wrong shape; what is here is
// whole, and what is missing is missing on purpose:
//
// | Absent | Owned by |
// | --- | --- |
// | Reading the attribute's **value** to choose the heading source | **The Parent Tag Method** |
// | A camel case file name read as prose | **The Parent Tag Method** |
// | A folder's pages grouped into one cheatsheet page | **The Parent Tag Method** |
// | The `<!-- {% cheatsheet: ... %} -->` comment syntax | **The Comment Syntax Method** |
// | A manifest recording the resolved folder | **The Scripted Tool**, item 3 |
// | `--dry-run` | **The Scripted Tool**, item 4 |
// | A second run proving byte identical output | **The Scripted Tool**, item 5 |
// | The page composed through `api/cheatsheet/` | **Building on the API** |
//
// The last of those is why the emitted page is string concatenation and says
// so. A generated page and a generated media file should be two renders of one
// composition, and making that true is an item with the whole output surface
// behind it; writing a half-composition here would be something to undo.
//
// One behaviour reads like a later item and is not. A page carrying no marked
// element is written nowhere, because the collector found nothing on it and
// there is no such thing here as an empty page to suppress. **Skip a page
// carrying no marked element** states that as a rule of the parent tag method;
// this is the same outcome arrived at by not having the other behaviour.
//
// ## The output folder
//
// Resolved before anything is written, and never a path the site owner has to
// pass. `cheatsheets/` under the site root is the name, `cheatsheets/
// cheatsheets/` is where it goes when that is taken, and after that
// `cheatsheets/cheatsheets_0/` counting upward - see {@link outputCandidates},
// which is the ladder as data so it can be read without touching a disk.
//
// Resolving up front rather than at the first write is the point of the item:
// a tool that created the folder as it went would leave a half written
// cheatsheets folder behind when the ladder ran out, and the run that found a
// name would be the run that had already used the wrong one.
//
// The folder is flat, and a generated page is named for its source file's base
// name, so two marked pages in different folders can want one name - `index.html`
// being the obvious pair. That is reported rather than resolved, per
// {@link nameCollisions}: a name is a naming decision and naming belongs to
// **The Parent Tag Method**, so what is here refuses to overwrite and says
// which page it did not write.
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** The attribute a site marks cheatsheet material with. */
export const MARKER = "data-cheatsheet";

/** The folder name a generated cheatsheet section is written into. */
export const OUTPUT_NAME = "cheatsheets";

/** The file extensions the walk reads as pages. */
export const PAGE_EXTENSIONS = [".html", ".htm"];

/**
 * Folder names the walk never descends into.
 *
 * A dot folder is skipped by its leading dot rather than by name, so this list
 * is only for the ones that do not have one. Every entry is a folder a site
 * has for reasons unrelated to what it publishes, and a site owner would be
 * surprised to find cheatsheets collected out of any of them.
 */
export const NOT_SITE = ["node_modules", "vendor", "dist", "build", "coverage", OUTPUT_NAME];

/**
 * The most names the output ladder will try before giving up.
 *
 * A bound rather than a `while (true)`, because the loop's exit depends on the
 * filesystem: a site whose tree somehow answers "exists" to every name would
 * otherwise spin forever on a machine nobody is watching. A hundred is far past
 * any real tree and still finite.
 */
export const MAX_OUTPUT_TRIES = 100;

/** What {@link collectMarked} reports for markup it could not find the end of. */
export const UNCLOSED = "unclosed";

/**
 * Elements that have no closing tag, so a marker on one encloses nothing.
 *
 * A site that marks an `<img>` has said something that cannot mean what the
 * attribute means, and the honest answer is a finding rather than content
 * scraped from whatever followed it.
 */
const VOID_ELEMENTS = [
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
];

/** Ranges of a document that look like markup and are not. */
const OPAQUE = [
  { open: "<!--", close: "-->" },
  { open: "<script", close: "</script>" },
  { open: "<style", close: "</style>" },
];

/**
 * The spans of a document a marker inside does not count.
 *
 * Found by scanning for each opener in turn rather than with one pattern,
 * because the three do not nest in a predictable order and a regex that tried
 * to express that would be the thing in this file nobody could read.
 *
 * @param {string} html
 * @returns {Array<[number, number]>} Start and end offsets, in order.
 */
export function opaqueRanges(html) {
  /** @type {Array<[number, number]>} */
  const ranges = [];
  // Lower cased once. Inside the loop it would be a fresh copy of the whole
  // document per opener per iteration, which turns a scan into something
  // quadratic on exactly the large page a site has most of.
  const lower = html.toLowerCase();
  let at = 0;
  while (at < html.length) {
    /** @type {{ start: number, end: number } | null} */
    let next = null;
    for (const { open, close } of OPAQUE) {
      const start = lower.indexOf(open, at);
      if (start === -1) continue;
      if (next !== null && start >= next.start) continue;
      const closed = lower.indexOf(close, start + open.length);
      // An unclosed opener swallows the rest of the document, which is what a
      // browser does with an unclosed comment and is the safe reading: content
      // after it was never going to be published as markup.
      next = { start, end: closed === -1 ? html.length : closed + close.length };
    }
    if (next === null) break;
    ranges.push([next.start, next.end]);
    at = next.end;
  }
  return ranges;
}

/**
 * Whether an offset falls inside one of the spans that do not count.
 *
 * @param {number} at
 * @param {Array<[number, number]>} ranges
 * @returns {boolean}
 */
function inside(at, ranges) {
  return ranges.some(([start, end]) => at >= start && at < end);
}

/**
 * The name of the element whose start tag begins at `at`.
 *
 * @param {string} html
 * @param {number} at Offset of the `<`.
 * @returns {string} Lower cased, or an empty string where there is no name.
 */
function tagNameAt(html, at) {
  const match = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(html.slice(at, at + 64));
  return match === null ? "" : match[1].toLowerCase();
}

/**
 * The start tag opening at `at`, scanned rather than searched for.
 *
 * **A `>` inside an attribute value is not the end of a tag**, and it needs no
 * escaping to be there: `<div title="a>b" data-cheatsheet>` is legal HTML that
 * a browser reads as one element. Finding the end with `indexOf(">")` read it
 * as two, and both ways of being wrong were silent - a marker after the value
 * looked like it was outside the tag and the page contributed nothing, while a
 * `>` inside the marker's **own** value cut the tag in half and carried the
 * remainder of it onto the generated page as content.
 *
 * So the end is found by walking the tag and tracking what the cursor is
 * inside. A quote opens a value only where an `=` has introduced one, which is
 * what keeps `<div class=a"b>` reading the way a browser reads it: the `"` is a
 * character of an unquoted value, not the start of a quoted one.
 *
 * @param {string} html
 * @param {number} at Offset of the `<`.
 * @returns {{ start: number, end: number, text: string } | null} `null` where the tag is never ended.
 */
function startTagAt(html, at) {
  if (html[at] !== "<") return null;
  /** The quote character of the value being scanned, or `""` outside one. */
  let quote = "";
  /** An `=` has been read and the value it introduces has not started yet. */
  let awaiting = false;
  for (let i = at + 1; i < html.length; i += 1) {
    const char = html[i];
    if (quote !== "") {
      if (char === quote) quote = "";
      continue;
    }
    if (char === ">") return { start: at, end: i, text: html.slice(at, i + 1) };
    if (char === "=") {
      awaiting = true;
      continue;
    }
    if (awaiting && (char === '"' || char === "'")) {
      quote = char;
      awaiting = false;
      continue;
    }
    // Whitespace between the `=` and its value is allowed and keeps the wait
    // open; anything else is the first character of an unquoted value.
    if (!/\s/.test(char)) awaiting = false;
  }
  return null;
}

/**
 * The start tag that contains `at`, or `null` where `at` is not inside one.
 *
 * The nearest `<` before the attribute, scanned through {@link startTagAt}. A
 * tag that ends before `at` does not contain it: the attribute is text, or it
 * belongs to the tag after this one.
 *
 * @param {string} html
 * @param {number} at An offset inside a start tag.
 * @returns {{ start: number, end: number, text: string } | null}
 */
function startTagAround(html, at) {
  const open = html.lastIndexOf("<", at);
  if (open === -1) return null;
  const tag = startTagAt(html, open);
  if (tag === null) return null;
  return tag.end < at ? null : tag;
}

/**
 * Every block of content a page has marked, in source order.
 *
 * The collector. Each block is the **inner** markup of an element carrying
 * {@link MARKER}, so what a site owner wrapped is what comes back, with the
 * wrapper itself left out: the wrapper is how they said it, not part of what
 * they said.
 *
 * A marked element inside another marked element is reported once, as part of
 * the outer one. Reporting it twice would put the same material on a generated
 * page twice, and reporting only the inner would drop everything its parent
 * added around it.
 *
 * @param {string} html
 * @returns {Array<{ tag: string, value: string | null, content: string, at: number, status?: string }>}
 */
export function collectMarked(html) {
  const ranges = opaqueRanges(html);
  const found = [];
  const lower = html.toLowerCase();
  let search = 0;
  while (search < html.length) {
    const marker = lower.indexOf(MARKER, search);
    if (marker === -1) break;
    search = marker + MARKER.length;
    if (inside(marker, ranges)) continue;
    // The character after the attribute name has to end it, or this is a
    // longer attribute that merely starts the same way - `data-cheatsheet-menu`
    // is a real one, and it belongs to **The Menu Element** rather than here.
    const after = html[marker + MARKER.length];
    if (after !== undefined && !/[\s=>/]/.test(after)) continue;
    // One scan, and the three readings below all come off it: where the tag
    // begins, where it ends, and the text the attribute is read out of. They
    // used to be three separate searches and could disagree with each other,
    // which is how a `>` inside an attribute value went two different kinds of
    // wrong on one page.
    const scanned = startTagAround(html, marker);
    if (scanned === null) continue;
    const { start, end: tagEnd, text: startTag } = scanned;
    const tag = tagNameAt(html, start);
    if (tag === "") continue;

    const value = attributeValue(startTag, MARKER);
    if (VOID_ELEMENTS.includes(tag) || /\/>$/.test(startTag.trim())) {
      // Marked, and enclosing nothing. Recorded rather than dropped: a site
      // owner who marked an `<img>` meant something, and a silent skip is how
      // they would come to believe the tool had read their page.
      found.push({ tag, value, content: "", at: start, status: "empty" });
      continue;
    }

    const end = closingTagOf(html, tag, tagEnd + 1, ranges);
    if (end === null) {
      found.push({ tag, value, content: html.slice(tagEnd + 1), at: start, status: UNCLOSED });
      break;
    }
    found.push({ tag, value, content: html.slice(tagEnd + 1, end.start), at: start });
    // Past the whole element, which is what makes a nested marker part of its
    // parent rather than a second block.
    search = end.end;
  }
  return found;
}

/**
 * Where the element opened at `from` is closed.
 *
 * Counts opens and closes of the same name, so a marked `<div>` holding four
 * more ends at the fifth `</div>` rather than the first.
 *
 * The spans that do not count are handed in rather than recomputed, and they
 * matter as much here as they do to the marker scan: a `</div>` written inside
 * a script string, a stylesheet comment or a commented out block is not a
 * close, and counting one ends the element early and hands back content that
 * stops in the wrong place. It reads as working, which is what makes it worth
 * a parameter - the markup after the cut is dropped with no finding against
 * it, because as far as the count is concerned the element closed cleanly.
 *
 * @param {string} html
 * @param {string} tag Lower cased name.
 * @param {number} from Offset just past the start tag.
 * @param {Array<[number, number]>} [ranges] Spans a tag inside does not count.
 * @returns {{ start: number, end: number } | null}
 */
function closingTagOf(html, tag, from, ranges = []) {
  // The lookahead is what makes this a whole name rather than a prefix, and it
  // is needed on **both** sides. `<section` inside a `<sec>` would raise the
  // depth, and `</section>` would lower it - the second is the one that reads
  // as working, because it closes the element early and hands back content
  // that looks plausible and stops in the wrong place.
  const pattern = new RegExp(`<(/?)${tag}(?=[\\s>/]|$)`, "gi");
  pattern.lastIndex = from;
  let depth = 1;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    // Neither side of the count: an open inside one of these spans would raise
    // the depth and leave the element looking unclosed, and a close inside one
    // would end it early.
    if (inside(match.index, ranges)) continue;
    // Scanned rather than searched, for the reason {@link startTagAt} exists:
    // `<div title="a/>b">` ends at the `>` after the closing quote, and taking
    // the first `>` instead both ended the tag early and left a `/` in front of
    // it, so the test below read a plain open as self-closing, never raised the
    // depth, and let the next `</div>` close the marked element - dropping
    // everything after it with no finding against the page.
    const scanned = startTagAt(html, match.index);
    const close = scanned === null ? -1 : scanned.end;
    if (match[1] === "/") {
      depth -= 1;
      if (depth === 0) return { start: match.index, end: close === -1 ? html.length : close + 1 };
      continue;
    }
    // An XHTML style `<div/>` opens and closes in one tag, so it is not a
    // nesting level. Real sites carry these, and counting one would leave the
    // element it is inside looking unclosed.
    if (close !== -1 && html[close - 1] === "/") continue;
    depth += 1;
  }
  return null;
}

/**
 * One attribute's value out of a start tag.
 *
 * `null` for an attribute written without one, which is a real distinction
 * here: `data-cheatsheet` on its own takes the tool's default and
 * `data-cheatsheet=""` is a site owner naming the empty string. Which values
 * mean what is **The Parent Tag Method**'s to decide; this only has to hand
 * over what was written.
 *
 * @param {string} startTag
 * @param {string} name
 * @returns {string | null}
 */
export function attributeValue(startTag, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = pattern.exec(startTag);
  if (match === null) return null;
  return match[2] ?? match[3] ?? match[4] ?? "";
}

/**
 * A page's `<title>`, trimmed, or `null` where it has none.
 *
 * @param {string} html
 * @returns {string | null}
 */
export function titleOf(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (match === null) return null;
  const text = match[1].replace(/\s+/g, " ").trim();
  return text.length === 0 ? null : text;
}

/**
 * Every page of a site tree, in a stable order.
 *
 * Sorted by path rather than returned in directory order, because `readdir`
 * answers in whatever order the filesystem holds and the pages this produces
 * are meant to be committed and diffed. A walk that reordered itself between
 * two machines would make that impossible before the item asking for it was
 * even reached.
 *
 * @param {string} root
 * @returns {Promise<string[]>} Absolute paths.
 */
export async function crawlSite(root) {
  const from = resolve(root);
  /** @type {string[]} */
  const pages = [];
  /** @param {string} dir */
  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (NOT_SITE.includes(entry.name)) continue;
        await walk(path);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!PAGE_EXTENSIONS.includes(extname(entry.name).toLowerCase())) continue;
      pages.push(path);
    }
  };
  await walk(from);
  return pages;
}

/**
 * The names the output folder is tried under, in order.
 *
 * The ladder as data, which is what lets it be read and held to without a
 * filesystem: `cheatsheets`, then `cheatsheets/cheatsheets`, then
 * `cheatsheets/cheatsheets_0` counting upward. Every name after the first is
 * **inside** the first, so a site ends up with one folder called `cheatsheets`
 * however many runs have resolved a name under it, rather than a row of
 * `cheatsheets_3` siblings beside whatever the site already had.
 *
 * @param {number} [tries] How many names to produce.
 * @returns {string[]} Site relative, with `/` separators.
 */
export function outputCandidates(tries = MAX_OUTPUT_TRIES) {
  const names = [OUTPUT_NAME, `${OUTPUT_NAME}/${OUTPUT_NAME}`];
  for (let n = 0; names.length < tries; n += 1) {
    names.push(`${OUTPUT_NAME}/${OUTPUT_NAME}_${n}`);
  }
  return names.slice(0, tries);
}

/**
 * Whether a path exists at all, as a file or a folder.
 *
 * Either is taken: a site with a `cheatsheets` **file** has that name taken as
 * surely as one with a folder, and writing into it would be the one failure
 * this resolution exists to avoid.
 *
 * @param {string} path
 * @returns {Promise<boolean>}
 */
async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * The folder this run writes into, resolved before anything is written.
 *
 * Creates nothing. The separation matters: a resolution that created the folder
 * as it tested it would make every name after the first unreachable, since the
 * first candidate would exist by the time the second was considered.
 *
 * @param {string} root
 * @param {{ tries?: number }} [options]
 * @returns {Promise<{ path: string, name: string, tried: string[] }>}
 */
export async function resolveOutput(root, options = {}) {
  const from = resolve(root);
  const candidates = outputCandidates(options.tries ?? MAX_OUTPUT_TRIES);
  /** @type {string[]} */
  const tried = [];
  for (const name of candidates) {
    const path = join(from, ...name.split("/"));
    tried.push(name);
    if (!(await exists(path))) return { path, name, tried };
  }
  throw new Error(
    `cheatsheet-site: every one of the ${candidates.length} output folder names is taken under ` +
      `${from}. Pass --out to name one, or clear the ${OUTPUT_NAME}/ folder.`
  );
}

/**
 * A page of the site, read and collected.
 *
 * @typedef {object} SitePage
 * @property {string} path Absolute path of the source page.
 * @property {string} id Site relative path, with `/` separators.
 * @property {string | null} title The page's `<title>`, where it has one.
 * @property {Array<object>} blocks What {@link collectMarked} found.
 * @property {string[]} findings What was wrong with the markup, if anything.
 */

/**
 * Reads and collects every page of a site.
 *
 * A page that carries no marked element comes back with no blocks and is not
 * written, per the note in this file's header.
 *
 * @param {string} root
 * @returns {Promise<SitePage[]>}
 */
export async function collectSite(root) {
  const from = resolve(root);
  const pages = [];
  for (const path of await crawlSite(from)) {
    const html = await readFile(path, "utf8");
    const id = relative(from, path).split(sep).join("/");
    const blocks = collectMarked(html);
    /** @type {string[]} */
    const findings = [];
    for (const block of blocks) {
      if (block.status === UNCLOSED) {
        findings.push(
          `${id}: a <${block.tag}> marked with ${MARKER} is never closed, so everything after it was ` +
            `taken as its content. Close the element, or the generated page will carry the rest of the file.`
        );
      }
      if (block.status === "empty") {
        findings.push(
          `${id}: <${block.tag}> cannot enclose anything, so marking it with ${MARKER} collected nothing. ` +
            `Mark the element that wraps the material instead.`
        );
      }
    }
    pages.push({ path, id, title: titleOf(html), blocks, findings });
  }
  return pages;
}

/**
 * The name a collected page is written under.
 *
 * The source file's own base name, which is the plain answer and the one a
 * site owner can predict. Reading the marker's value to choose a heading
 * source, and grouping a folder's pages under the folder's name, are both
 * **The Parent Tag Method**'s, so neither is attempted here.
 *
 * @param {SitePage} page
 * @returns {string}
 */
export function pageFilename(page) {
  return `${basename(page.id, extname(page.id))}.html`;
}

/**
 * The markup of one generated cheatsheet page.
 *
 * **String concatenation, and temporarily so.** `Render each generated page
 * through the cheatsheet API` under **Building on the API** is the item that
 * replaces this, so that a generated page and a generated media file are two
 * renders of one composition rather than two code paths. What is here is the
 * least page that carries the collected material without pretending to be that
 * composition: no styling, no script, and a `<main>` per block in source
 * order.
 *
 * @param {SitePage} page
 * @returns {string}
 */
export function renderPage(page) {
  const heading = page.title ?? basename(page.id, extname(page.id));
  const lines = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(heading)}</title>`,
    `<meta name="generator" content="cheatsheet-site">`,
    `<meta name="cheatsheet-source" content="${escapeHtml(page.id)}">`,
    "</head>",
    "<body>",
    `<h1>${escapeHtml(heading)}</h1>`,
  ];
  for (const block of page.blocks) {
    if (block.content.trim().length === 0) continue;
    lines.push(`<main data-cheatsheet-block="${block.tag}">`);
    // The site's own markup, carried through rather than re-escaped: it is
    // markup, and the whole premise is that the site already published it.
    lines.push(block.content.trim());
    lines.push("</main>");
  }
  lines.push("</body>", "</html>", "");
  return lines.join("\n");
}

/**
 * The five characters that have to be escaped in text going into markup.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The pages a run has anything to write for.
 *
 * One predicate rather than the same `some` in three places: what counts as a
 * page worth writing is also what decides whether a folder is created at all
 * and which pages can collide over a name, and three copies of it would drift.
 *
 * @param {SitePage[]} pages
 * @returns {SitePage[]}
 */
function carryingPages(pages) {
  return pages.filter((page) => page.blocks.some((block) => block.content.trim().length > 0));
}

/**
 * Pages that want a name another page has already claimed.
 *
 * {@link pageFilename} answers with the source file's base name, and a flat
 * output folder makes that a name two pages can both ask for: a site with
 * `guide/index.html` and `reference/index.html` marked has two pages wanting
 * `index.html`, and `index.html` is the commonest file name a site has.
 *
 * Reported rather than resolved, and the distinction is the point. Writing both
 * would leave one overwritten and the report claiming two, which is the one
 * outcome worth ruling out. Qualifying the name instead - `guide-index.html` -
 * would be a naming scheme, and naming is **The Parent Tag Method**'s: it is
 * the item that reads the marker's value to choose a heading source and groups
 * a folder's pages into one page, and a scheme invented here is a scheme that
 * item would have to undo. So this says what happened, in the site's own terms,
 * and the run exits non-zero like any other finding.
 *
 * @param {SitePage[]} pages
 * @returns {string[]} A finding per collision, in page order.
 */
export function nameCollisions(pages) {
  /** @type {Map<string, string>} */
  const claimed = new Map();
  /** @type {string[]} */
  const findings = [];
  for (const page of carryingPages(pages)) {
    const name = pageFilename(page);
    const first = claimed.get(name);
    if (first === undefined) {
      claimed.set(name, page.id);
      continue;
    }
    findings.push(
      `${page.id}: would be written as ${name}, which ${first} already claimed, so it was not written. ` +
        `Two pages of a site cannot share a base name while the output folder is flat - rename one, ` +
        `or pass --out and run them separately.`
    );
  }
  return findings;
}

/**
 * Writes a page per collected page that carried material.
 *
 * A name a page already wrote is left alone rather than overwritten, which
 * pairs with {@link nameCollisions}: the finding says which page was dropped
 * and this is what makes the saying true. First in page order wins, so the
 * answer does not depend on which page the walk reached first - the walk is
 * sorted.
 *
 * @param {SitePage[]} pages
 * @param {string} out The resolved output folder.
 * @returns {Promise<Array<{ id: string, path: string, blocks: number }>>}
 */
export async function writePages(pages, out) {
  const written = [];
  const carrying = carryingPages(pages);
  if (carrying.length === 0) return written;
  await mkdir(out, { recursive: true });
  /** @type {Set<string>} */
  const taken = new Set();
  for (const page of carrying) {
    const name = pageFilename(page);
    if (taken.has(name)) continue;
    taken.add(name);
    const path = join(out, name);
    await writeFile(path, renderPage(page), "utf8");
    written.push({ id: page.id, path, blocks: page.blocks.length });
  }
  return written;
}

/** What `--help` prints. */
export const USAGE = [
  "Usage: node tools/cheatsheet-site.mjs <site> [--out <dir>]",
  "",
  `Crawls a site tree for elements carrying ${MARKER}, collects what each`,
  "wraps, and writes one cheatsheet page per source page that carried any.",
  "",
  "  <site>        The site root to crawl. Required.",
  `  --out <dir>   Write here instead of resolving ${OUTPUT_NAME}/ under the site.`,
  "  --help        Print this.",
  "",
  `Without --out the folder is ${OUTPUT_NAME}/, then ${OUTPUT_NAME}/${OUTPUT_NAME}/,`,
  `then ${OUTPUT_NAME}/${OUTPUT_NAME}_0/ and upward until a free name is found.`,
].join("\n");

/**
 * @param {string[]} argv
 * @returns {Promise<number>} The exit code.
 */
export async function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const positional = argv.filter((arg, at) => !arg.startsWith("-") && argv[at - 1] !== "--out");
  if (positional.length === 0) {
    process.stderr.write(`cheatsheet-site: name the site to crawl.\n\n${USAGE}\n`);
    return 2;
  }
  const root = resolve(positional[0]);
  if (!(await exists(root))) {
    process.stderr.write(`cheatsheet-site: ${root} is not there.\n`);
    return 2;
  }

  const named = flag("--out");
  // Resolved before a single page is read, which is the item's own wording and
  // the reason it is a step of its own: the folder is part of the report even
  // on a site that turns out to have marked nothing.
  const out = named === undefined ? await resolveOutput(root) : { path: resolve(named), name: named, tried: [] };

  const pages = await collectSite(root);
  // Markup a page could not be read from, then names two pages both wanted.
  // The second is the site's own layout rather than its markup, so it is
  // collected across the pages rather than on one of them.
  const findings = [...pages.flatMap((page) => page.findings), ...nameCollisions(pages)];
  const written = await writePages(pages, out.path);

  const marked = pages.filter((page) => page.blocks.length > 0).length;
  process.stdout.write(
    [
      `${pages.length} page${pages.length === 1 ? "" : "s"} crawled, ${marked} marked`,
      `output folder    ${relative(root, out.path).split(sep).join("/") || "."}`,
      ...(out.tried.length > 1 ? [`names tried      ${out.tried.join(", ")}`] : []),
      `pages written    ${written.length}`,
      ...written.map((one) => `  ${one.id} -> ${basename(one.path)}`),
      "",
    ].join("\n")
  );
  for (const finding of findings) process.stderr.write(`cheatsheet-site: ${finding}\n`);
  // A finding is markup this tool could not read, which is the site's to fix
  // and not a reason to report success. The pages it could read are written
  // either way: a site owner fixing one page should not have to wait for the
  // whole section to regenerate.
  return findings.length === 0 ? 0 : 1;
}

// Run only when this file is the entry point, so a test can import the pieces
// above and call the same functions a reader runs. `pathToFileURL` rather than
// a string built by hand: on Windows the argument is `D:\...`, which is not a
// URL.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
