// Crawls a site tree, collects the content it has marked as cheatsheet
// material, and writes a cheatsheet page per source page that carried any.
//
//     node tools/cheatsheet-site.mjs <site>
//     node tools/cheatsheet-site.mjs <site> --out <dir>
//     node tools/cheatsheet-site.mjs <site> --dry-run
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
// **The Scripted Tool** is finished here as of 2026.11.05 and **The Parent Tag
// Method** as of 2026.11.06; the sections below them in `TODO.md` are whole
// methods of their own. Reading those as scaffolding to leave hooks for would be
// the wrong shape; what is here is whole, and what is missing is missing on
// purpose:
//
// | Absent | Owned by |
// | --- | --- |
// | The `<!-- {% cheatsheet: ... %} -->` comment syntax | **The Comment Syntax Method** |
// | A menu element filled from the resolved folder | **The Menu Element** |
// | The page composed through `api/cheatsheet/` | **Building on the API** |
//
// The last of those is why the emitted page is string concatenation and says
// so. A generated page and a generated media file should be two renders of one
// composition, and making that true is an item with the whole output surface
// behind it; writing a half-composition here would be something to undo.
//
// ## Naming, and a folder as a subject
//
// A folder of a site is a subject - `arrays/splice.html` and
// `arrays/concat.html` are two pages about arrays - so **a folder is a
// cheatsheet**. Every marked page in one is a section of `arrays.html`, headed
// as that page asked to be headed, in the order the site reads them. A page at
// the site root has no folder to be named for and is written under its own
// name. See {@link pageFilename} and {@link groupCheatsheets}.
//
// Two decisions inside that are worth stating, because the other reading of
// each is the tempting one:
//
// - **It does not depend on how many pages a folder holds.** Grouping only at
//   two or more would mean the day a second page arrived was the day the first
//   page's output changed its name, and the generated section is meant to be
//   committed and diffed.
// - **A folder's cheatsheet is sectioned and a root page's is not.** A folder
//   cheatsheet is headed for the folder, so each page keeps its own heading as
//   an `<h2>` inside a `<section data-cheatsheet-page>`; a root page is already
//   headed for itself, and a section around it would be the heading twice. Same
//   argument as above: the shape does not change with the count.
//
// A heading read off a **name** rather than off a `<title>` is read as prose,
// per {@link prose}: `somePageName.html` is headed `Some Page Name`, and the
// folder `someSection/` heads its cheatsheet `Some Section`. A `<title>` is
// left exactly as the site wrote it - it was written to be read.
//
// One behaviour reads like a later item and is not. A page carrying no marked
// element is written nowhere, because the collector found nothing on it: there
// is no empty page to suppress and, since {@link carryingPages} is what the
// grouping reads, no empty section either. **Skip a page carrying no marked
// element** states that as a rule of the parent tag method; this is the same
// outcome arrived at by not having the other behaviour.
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
// The folder is flat, so two cheatsheets can still want one name even with the
// grouping above. Grouping settles the case the flat folder used to have most
// of - `guide/index.html` and `reference/index.html` are `guide.html` and
// `reference.html` rather than `index.html` twice - and what it cannot settle
// is two folders of the same name under different parents, or a root page named
// for a folder beside it. Those are reported rather than resolved, per
// {@link nameCollisions}: qualifying the name instead would be a scheme
// **The Menu Element** and **Building on the API** would both have to honour, so
// what is here refuses to overwrite and says which cheatsheet it did not write.
// The same name is what the check compares, **without case**: `a/Guide/` and
// `b/guide/` are one file on Windows and macOS, and the generated folder is
// written wherever the site owner is.
//
// ## The manifest, and why the second run needs one
//
// The ladder above resolves one name per run, and that is exactly what makes a
// second run land somewhere else: run one finds `cheatsheets/` free and writes
// there, so run two finds it **taken** - by its own output - and resolves
// `cheatsheets/cheatsheets/`. Nothing is overwritten and nothing is reported,
// which is the worst shape the failure could take: a site owner who ran it
// twice has two cheatsheet sections, one of them stale, and the generated
// pages cannot be committed and diffed because the path moved under them.
//
// So the answer is written down. {@link MANIFEST_NAME} in the resolved folder
// records the folder's own site relative name and the pages this run wrote, and
// {@link readManifest} walks the same candidate ladder looking for one before
// {@link resolveOutput} is ever called. Three things follow, and each is a
// decision rather than a detail:
//
// - **It is written from the answer, never during the resolution.**
//   {@link resolveOutput} still creates nothing, which is the only reason its
//   second candidate is reachable at all - a resolution that wrote as it tested
//   would find the first name taken by the time it considered the second.
// - **Where the file is outranks what it says.** A manifest found under
//   `cheatsheets/cheatsheets_0/` names that folder whatever its `output` field
//   holds, so a site owner who renamed or copied the folder gets the folder
//   they have rather than the one it was generated as. The field is there for a
//   reader that has the file and not the ladder - the menu element being the
//   one in `TODO.md` - and this run rewrites it, so a stale one heals.
// - **It carries no timestamp.** The obvious field for a generated file is the
//   time it was generated, and that one field is the whole of what would stop a
//   second run over an unchanged site being byte identical. Every value in it
//   is read off the site.
//
// Its shape is versioned, and the version moved to `2` when a page entry's
// `source` became `sources`: a cheatsheet named for a folder is made of every
// marked page in it, and a scalar field left pointing at the first is a field
// whose meaning changed in silence. A reader refusing a shape it does not know
// is the point of the number - but {@link readManifest} reads **every** shape
// this tool has written, per {@link MANIFEST_READABLE}, because the folder is
// taken from where the file is rather than from anything in it. Refusing a
// version-1 manifest would make a site owner's existing folder invisible and
// cause exactly the second section the manifest exists to prevent; the run
// rewrites the file, so one run heals the shape.
//
// ## `--dry-run`
//
// Reports the folder it resolved and the pages it would write, and touches
// nothing - no folder created, no page written, no manifest. It is nearly free
// for the same reason the manifest is careful: resolving already creates
// nothing, so what is left is not calling {@link writePages}. The plan both
// modes report from is one function, {@link plannedPages}, so what a dry run
// says and what a real run does cannot drift.
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/** The attribute a site marks cheatsheet material with. */
export const MARKER = "data-cheatsheet";

/** The folder name a generated cheatsheet section is written into. */
export const OUTPUT_NAME = "cheatsheets";

/** What this tool calls itself, in the manifest and in a generated page. */
export const GENERATOR = "cheatsheet-site";

/** The file a generated folder records its own location and contents in. */
export const MANIFEST_NAME = "cheatsheet-site.json";

/**
 * The manifest shape, so a reader can refuse one it does not understand.
 *
 * Raised when a field changes meaning, not when one is added: a reader that
 * ignores what it does not know keeps working across an addition, and this
 * number is what tells it when it cannot.
 *
 * `2` because a page entry's `source` became `sources`. Grouping a folder's
 * pages into one cheatsheet means an entry has several of them, and a scalar
 * `source` left pointing at the first is the field whose meaning changed
 * without saying so - a reader that had one page per entry would carry on
 * believing it.
 */
export const MANIFEST_VERSION = 2;

/**
 * The manifest versions {@link readManifest} will read a folder's location out
 * of.
 *
 * Every shape this tool has written, not only the current one, and the reason
 * is the failure the manifest exists to prevent. The location is taken from
 * **where the file is** rather than from anything inside it, so an older
 * manifest answers that question as well as a current one - while refusing it
 * would make a site owner's existing `cheatsheets/` folder invisible and send
 * the next run to write a second section beside it. The run rewrites the file
 * at {@link MANIFEST_VERSION}, so one run heals the shape.
 *
 * A version this does not list is still passed over, which is what keeps a
 * manifest from a later version of the tool from being read with this one's
 * meaning.
 */
export const MANIFEST_READABLE = [1, 2];

/**
 * The values `data-cheatsheet` names a heading source with.
 *
 * `title` takes the heading from the page's own `<title>`, `page` from its file
 * name. Order matters only in what the findings print; which one a page gets is
 * what it asked for.
 */
export const HEADING_SOURCES = ["title", "page"];

/**
 * The heading source of a cheatsheet named for the folder its pages sit in.
 *
 * Deliberately not in {@link HEADING_SOURCES}: that list is the values a site
 * writes, and no site writes this one. A folder's cheatsheet is headed for the
 * folder because that is what it is, and the pages inside it keep the headings
 * they asked for as their own sections.
 */
export const FOLDER_SOURCE = "folder";

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
 * A page's file name with its extension taken off.
 *
 * The stem {@link pageFilename} names the output file after and
 * {@link headingFor} reads as the `page` heading source, in one place because
 * they have to agree: a generated `splice.html` headed `Splice` is one answer
 * written twice.
 *
 * @param {SitePage} page
 * @returns {string}
 */
function pageStem(page) {
  return basename(page.id, extname(page.id));
}

/**
 * A file or folder name read as prose.
 *
 * `somePageName` is `Some Page Name`. A file name is written for a filesystem
 * and a heading is read by a person, and the gap between the two is the whole
 * of this: a generated page headed `somePageName` is a page that looks
 * generated.
 *
 * One function rather than one per caller, because there are two and they have
 * to agree - a page headed from its own file name and a folder's cheatsheet
 * headed from the folder's name are one answer read off two names.
 *
 * Four breaks, and each is a shape a real name has:
 *
 * - **A separator a name is already written with**: a space, a dot, an
 *   underscore or a hyphen. `my-page_name` was already three words.
 * - **A case change**: `somePageName`. The commonest shape, and the one the
 *   item is named for.
 * - **An acronym run before a capitalised word**: `parseHTMLString` is
 *   `Parse HTML String` rather than `Parse H T M L String` or `Parse HTMLString`.
 *   The last capital of the run belongs to the word after it.
 * - **Either side of a digit run**: `base64Encode` is `Base 64 Encode`.
 *
 * Only the first letter of each word is touched. Lower casing the rest would
 * read `HTML` as `Html`, and a site that wrote an acronym meant it - so a word
 * already capitalised comes back as it was written.
 *
 * @param {string} name
 * @returns {string} Prose, or `""` for a name with nothing readable in it.
 */
export function prose(name) {
  const words = String(name)
    .split(/[\s._-]+/)
    .flatMap((part) =>
      part
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .replace(/([A-Za-z])([0-9])/g, "$1 $2")
        .replace(/([0-9])([A-Za-z])/g, "$1 $2")
        .split(" ")
    )
    .filter((word) => word.length > 0);
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

/**
 * The folder a page sits in, site relative, or `""` at the site root.
 *
 * The **immediate** parent, which is what makes one folder one cheatsheet: a
 * site with `guide/arrays/splice.html` has an `arrays` cheatsheet, not a
 * `guide` one with everything below it in it.
 *
 * @param {SitePage} page
 * @returns {string} With `/` separators, as `id` carries them.
 */
export function pageFolder(page) {
  const at = page.id.lastIndexOf("/");
  return at === -1 ? "" : page.id.slice(0, at);
}

/**
 * The last segment of a site relative folder path.
 *
 * @param {string} folder
 * @returns {string}
 */
function folderName(folder) {
  return folder.slice(folder.lastIndexOf("/") + 1);
}

/**
 * Which source a page takes its heading from, and what to say about the asking.
 *
 * {@link collectMarked} carries the marker's value over without judging it.
 * This is the judging: `title` reads the page's own `<title>`, `page` reads its
 * file name, and a page that named neither keeps the behaviour it had - the
 * `<title>` with the file name behind it.
 *
 * Three readings are worth stating, because each is a case a site writes and
 * none of them is the obvious one:
 *
 * - **An attribute with no value and one set to the empty string both name no
 *   source.** {@link collectMarked} reports the difference, deliberately, and
 *   this is where it stops mattering: `data-cheatsheet=""` is what a template
 *   with an empty variable emits, and refusing it would make the tool fail on
 *   the commonest accident rather than on a real mistake.
 * - **An unrecognised value is a finding and not a guess.** A site owner who
 *   wrote `data-cheatsheet="heading"` meant something, and silently handing
 *   back the default is how they come to believe the tool read their page. The
 *   default is used anyway, so the page is still written - findings are the
 *   site's to fix, per {@link main}.
 * - **An explicit `title` on a page with no `<title>` is a finding; the default
 *   on the same page is not.** The default has a documented fallback and the
 *   ask does not: a page that was told to use a heading it has not got is a
 *   page whose generated heading is its file name for a reason nobody wrote
 *   down.
 *
 * A page has one heading, so two blocks naming two different sources is a page
 * asking for two. The first in source order wins and the disagreement is
 * reported, rather than the last write silently deciding it.
 *
 * @param {SitePage} page
 * @returns {{ source: string, heading: string, findings: string[] }}
 */
export function headingFor(page) {
  /** @type {string[]} */
  const findings = [];
  /** @type {string[]} */
  const named = [];
  /** @type {string[]} */
  const unknown = [];
  for (const block of page.blocks) {
    // Trimmed and lower cased before matching. An attribute value is written by
    // hand, so `data-cheatsheet=" Title "` is a site owner naming the title
    // source rather than a third thing to report.
    const value = (block.value ?? "").trim().toLowerCase();
    if (value.length === 0) continue;
    const into = HEADING_SOURCES.includes(value) ? named : unknown;
    // Distinct values only. The finding names the page, so a value repeated on
    // one page would print the same sentence twice.
    if (!into.includes(value)) into.push(value);
  }
  const source = named[0] ?? "title";
  // What answered, which is not always the source that was named. The `title`
  // source has a fallback and the fallback is the file name, so on a page with
  // no `<title>` at all the heading came from neither the named source nor the
  // default - and a finding that said `title` would be telling a site owner
  // their heading was read from an element their page has not got.
  const answered =
    source === "title" && page.title === null
      ? "its file name, because the page has no <title>"
      : named.length === 0
        ? `${source}, the default`
        : source;
  for (const value of unknown) {
    // The source that answered, named, rather than "the default" - a page that
    // wrote an unknown value **and** a real one did not fall back to anything,
    // and a finding saying it did disagrees with the report one line above it.
    findings.push(
      `${page.id}: ${MARKER}="${value}" names no heading source, so it was ignored and the heading came ` +
        `from ${answered}. ` +
        `The values it reads are ${HEADING_SOURCES.join(" and ")}.`
    );
  }
  if (named.length > 1) {
    findings.push(
      `${page.id}: ${named.map((one) => `${MARKER}="${one}"`).join(" and ")} ask for two different headings ` +
        `on one page, so the first in source order won. Mark one source per page.`
    );
  }
  // Read as prose wherever the file name is the answer, per {@link prose}. A
  // `<title>` is not touched: it was written to be read, so whatever casing it
  // carries is the site's own.
  const stem = prose(pageStem(page));
  if (source === "page") return { source, heading: stem, findings };
  if (page.title === null && named[0] === "title") {
    findings.push(
      `${page.id}: ${MARKER}="title" asks for the page's <title> and the page has none, so its file name ` +
        `was used instead. Give the page a <title>, or mark it ${MARKER}="page".`
    );
  }
  return { source, heading: page.title ?? stem, findings };
}

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
    const page = { path, id, title: titleOf(html), blocks, findings };
    // After the markup findings and from the finished page, because the heading
    // is read off the page's own `<title>` as much as off the marker's value -
    // what the site asked for and what it has are both part of the answer.
    findings.push(...headingFor(page).findings);
    pages.push(page);
  }
  return pages;
}

/**
 * The name the cheatsheet a page belongs to is written under.
 *
 * **The folder the page sits in, and the page's own base name only at the site
 * root.** A folder is a subject - `arrays/splice.html` and
 * `arrays/concat.html` are two pages about arrays - so the cheatsheet is
 * `arrays.html` and both pages are sections of it. A page at the root has no
 * folder to be named for and keeps its own name.
 *
 * **It does not depend on how many pages the folder holds**, which is the
 * decision worth stating because the other reading is tempting: grouping only
 * where there are two or more would mean adding a second page to a folder
 * renamed the first page's output, and the generated section is meant to be
 * committed and diffed. One page in a folder is a cheatsheet with one section.
 *
 * The marker's value still chooses a **heading** rather than a name, per
 * {@link headingFor}, so a page marked `data-cheatsheet="title"` is written
 * into its folder's cheatsheet like any other.
 *
 * @param {SitePage} page
 * @returns {string}
 */
export function pageFilename(page) {
  const folder = pageFolder(page);
  return `${folder === "" ? pageStem(page) : folderName(folder)}.html`;
}

/**
 * The markup of one generated cheatsheet.
 *
 * **String concatenation, and temporarily so.** `Render each generated page
 * through the cheatsheet API` under **Building on the API** is the item that
 * replaces this, so that a generated page and a generated media file are two
 * renders of one composition rather than two code paths. What is here is the
 * least page that carries the collected material without pretending to be that
 * composition: no styling, no script, and a `<main>` per block in source
 * order.
 *
 * **A folder's cheatsheet is sectioned and a root page's is not**, and that is
 * one rule rather than a count. A folder cheatsheet is headed for the folder,
 * so each page inside it keeps the heading it asked for as an `<h2>` inside a
 * `<section data-cheatsheet-page>` naming where it came from - which is what
 * stops the grouping losing what every page but the first had to say. A page at
 * the site root is the whole of its own cheatsheet and is already headed for
 * itself, so a section around it would be the heading written twice.
 *
 * Writing the section only for a folder of two or more would be the same
 * mistake {@link pageFilename} refuses: the first page's markup would change
 * shape on the day a second one arrived.
 *
 * @param {Cheatsheet} sheet
 * @returns {string}
 */
export function renderCheatsheet(sheet) {
  const grouped = sheet.folder !== "";
  const lines = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(sheet.heading)}</title>`,
    `<meta name="generator" content="${GENERATOR}">`,
    // One per source, in source order. A reader looking for where a cheatsheet
    // came from should find every page of it rather than the first.
    ...sheet.pages.map((page) => `<meta name="cheatsheet-source" content="${escapeHtml(page.id)}">`),
    "</head>",
    "<body>",
    `<h1>${escapeHtml(sheet.heading)}</h1>`,
  ];
  for (const page of sheet.pages) {
    if (grouped) {
      lines.push(`<section data-cheatsheet-page="${escapeHtml(page.id)}">`);
      // The findings are {@link collectSite}'s to report; what is wanted here
      // is the heading the page asked for.
      lines.push(`<h2>${escapeHtml(headingFor(page).heading)}</h2>`);
    }
    for (const block of page.blocks) {
      if (block.content.trim().length === 0) continue;
      lines.push(`<main data-cheatsheet-block="${block.tag}">`);
      // The site's own markup, carried through rather than re-escaped: it is
      // markup, and the whole premise is that the site already published it.
      lines.push(block.content.trim());
      lines.push("</main>");
    }
    if (grouped) lines.push("</section>");
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
 * A cheatsheet, and the pages of the site that make it up.
 *
 * @typedef {object} Cheatsheet
 * @property {string} name The file it is written as.
 * @property {string} folder The site relative folder it is named for, or `""` at the root.
 * @property {string} heading Its own heading.
 * @property {string} headingSource What that heading was read off: a value of
 *   {@link HEADING_SOURCES} for a root page, {@link FOLDER_SOURCE} for a folder.
 * @property {SitePage[]} pages In source order.
 */

/**
 * The cheatsheets a site's pages group into, and what collided on the way.
 *
 * One function, and the whole reason it is one: the grouping decides what is
 * written, what the plan reports, what the manifest records and which names
 * collided, and four readings of it would drift. It is the same argument
 * {@link carryingPages} makes one step earlier.
 *
 * **Insertion order is the answer to the order item.** A `Map` keyed by
 * cheatsheet iterates in the order its keys were first seen, and pages are
 * pushed in the order {@link crawlSite} handed them over - which is sorted by
 * path. So a folder's sections read in the order the site reads, and the
 * cheatsheets themselves come back in page order, with no second sort to
 * disagree with the first.
 *
 * **A name two cheatsheets want is reported rather than resolved.** Grouping
 * settles the collision the flat folder used to have most of - `guide/index.html`
 * and `reference/index.html` are now `guide.html` and `reference.html` - but it
 * cannot settle two folders of the same name in different parents, or a root
 * page named for a folder beside it. Writing both would leave one overwritten
 * and the report claiming two, which is the one outcome worth ruling out, and
 * qualifying the name instead would be a naming scheme invented here that
 * **The Menu Element** and **Building on the API** would both have to honour.
 * So the whole cheatsheet is dropped, in the site's own terms, and the run exits
 * non-zero like any other finding. First in page order wins, and the walk is
 * sorted, so which one that is does not depend on the filesystem.
 *
 * **A name is claimed without case**, because the generated folder is written
 * on whatever filesystem the site owner has. `a/Guide/` and `b/guide/` want
 * `Guide.html` and `guide.html`, which are two files on Linux and one file on
 * Windows and macOS - so comparing the names as written would write both there,
 * leave one overwritten, and report and record two, which is exactly the
 * outcome the check above exists to rule out. The stricter reading is also the
 * recoverable one: a site that really wants both names is told to rename one,
 * and nothing is lost in silence.
 *
 * @param {SitePage[]} pages
 * @returns {{ sheets: Cheatsheet[], collisions: string[] }}
 */
function groupCheatsheets(pages) {
  /** Keyed so a folder is one cheatsheet and each root page is its own. */
  /** @type {Map<string, { name: string, folder: string, pages: SitePage[] }>} */
  const groups = new Map();
  /** Keyed by the name lower cased, and carrying it as written for the finding. */
  /** @type {Map<string, { key: string, name: string }>} */
  const claimed = new Map();
  /** Keys whose name was taken, so a second page of one is not reported twice. */
  const dropped = new Set();
  /** @type {string[]} */
  const collisions = [];
  for (const page of carryingPages(pages)) {
    const folder = pageFolder(page);
    const key = folder === "" ? `page:${page.id}` : `folder:${folder}`;
    if (dropped.has(key)) continue;
    const group = groups.get(key);
    if (group !== undefined) {
      group.pages.push(page);
      continue;
    }
    const name = pageFilename(page);
    const owner = claimed.get(name.toLowerCase());
    if (owner !== undefined) {
      dropped.add(key);
      // The name the owner claimed, where that is not the name this one wanted.
      // Two spellings of one name is the whole of what a case collision is, and
      // a finding that printed only one of them would read as a plain repeat.
      const spelled = owner.name === name ? "" : ` as ${owner.name}`;
      collisions.push(
        `${label(key)}: would be written as ${name}, which ${label(owner.key)} already claimed${spelled}, ` +
          `so it was not written. Two cheatsheets of a site cannot share a name while the output folder ` +
          `is flat, and two names that differ only in case are one name on a filesystem that ignores ` +
          `case - rename one of them, or pass --out and run them separately.`
      );
      continue;
    }
    claimed.set(name.toLowerCase(), { key, name });
    groups.set(key, { name, folder, pages: [page] });
  }
  const sheets = [...groups.values()].map((group) => {
    if (group.folder === "") {
      const { source, heading } = headingFor(group.pages[0]);
      return { name: group.name, folder: "", heading, headingSource: source, pages: group.pages };
    }
    return {
      name: group.name,
      folder: group.folder,
      heading: prose(folderName(group.folder)),
      headingSource: FOLDER_SOURCE,
      pages: group.pages,
    };
  });
  return { sheets, collisions };
}

/**
 * What a cheatsheet is called in a finding.
 *
 * A folder carries a trailing `/` and a root page does not, which is the whole
 * of what tells `docs/` from `docs.html` in a sentence that names both.
 *
 * @param {string} key
 * @returns {string}
 */
function label(key) {
  return key.startsWith("folder:") ? `${key.slice("folder:".length)}/` : key.slice("page:".length);
}

/**
 * The cheatsheets a site's pages group into, in page order.
 *
 * @param {SitePage[]} pages
 * @returns {Cheatsheet[]}
 */
export function cheatsheets(pages) {
  return groupCheatsheets(pages).sheets;
}

/**
 * Cheatsheets that want a name another cheatsheet has already claimed.
 *
 * @param {SitePage[]} pages
 * @returns {string[]} A finding per dropped cheatsheet, in page order.
 */
export function nameCollisions(pages) {
  return groupCheatsheets(pages).collisions;
}

/**
 * The blocks a cheatsheet carries, across every page of it.
 *
 * @param {Cheatsheet} sheet
 * @returns {number}
 */
function sheetBlocks(sheet) {
  return sheet.pages.reduce((total, page) => total + page.blocks.length, 0);
}

/**
 * What a run writes, as data, without touching a disk.
 *
 * The plan both modes read from. `--dry-run` reports it and stops, a real run
 * reports it and writes it, and the manifest is built out of it - so what the
 * dry run promises and what the write does cannot drift, which is the whole
 * value of a dry run that is believed.
 *
 * Every field is read off the site and none off the clock or the machine, which
 * is what lets {@link manifestFor} be written from this and still be byte
 * identical on a second run.
 *
 * @param {SitePage[]} pages
 * @returns {Array<{ name: string, heading: string, headingSource: string, sources: string[], blocks: number }>}
 */
export function plannedPages(pages) {
  return cheatsheets(pages).map((sheet) => ({
    name: sheet.name,
    heading: sheet.heading,
    headingSource: sheet.headingSource,
    sources: sheet.pages.map((page) => page.id),
    blocks: sheetBlocks(sheet),
  }));
}

/**
 * Writes a page per cheatsheet the site's marked pages group into.
 *
 * The folder is created only where there is something to put in it, so a run
 * over a site that marked nothing leaves no empty folder behind on somebody
 * else's tree.
 *
 * @param {SitePage[]} pages
 * @param {string} out The resolved output folder.
 * @returns {Promise<Array<{ name: string, path: string, sources: string[], blocks: number }>>}
 */
export async function writePages(pages, out) {
  const written = [];
  const sheets = cheatsheets(pages);
  if (sheets.length === 0) return written;
  await mkdir(out, { recursive: true });
  for (const sheet of sheets) {
    const path = join(out, sheet.name);
    await writeFile(path, renderCheatsheet(sheet), "utf8");
    written.push({
      name: sheet.name,
      path,
      sources: sheet.pages.map((page) => page.id),
      blocks: sheetBlocks(sheet),
    });
  }
  return written;
}

/**
 * The manifest for a run, as data.
 *
 * Read by {@link readManifest} on the next run and by anything else that wants
 * the generated section without recomputing the ladder - **The Menu Element**
 * in `TODO.md` being the one that will. Site relative throughout and with `/`
 * separators, because an absolute path is this machine's answer rather than the
 * site's, and a committed manifest is read on another.
 *
 * `sources` is an array because a cheatsheet named for a folder is made of
 * every marked page in it, which is the field change {@link MANIFEST_VERSION}
 * was raised for. It carries one entry for a root page, rather than being left
 * off there: a reader that had to branch on the field's presence is a reader
 * that would get the branch wrong.
 *
 * @param {string} name The output folder, site relative.
 * @param {Array<{ name: string, heading: string, headingSource: string, sources: string[], blocks: number }>} planned
 * @returns {object}
 */
export function manifestFor(name, planned) {
  return {
    generator: GENERATOR,
    manifestVersion: MANIFEST_VERSION,
    marker: MARKER,
    output: name,
    pages: planned.map((one) => ({
      sources: one.sources,
      page: one.name,
      heading: one.heading,
      headingSource: one.headingSource,
      blocks: one.blocks,
    })),
  };
}

/**
 * Writes the manifest into the folder it describes.
 *
 * Two spaces and a closing newline, which is what a reader expects of a JSON
 * file somebody may commit, and the same bytes every run for the same site.
 *
 * @param {string} out The resolved output folder.
 * @param {object} manifest
 * @returns {Promise<string>} The path written.
 */
export async function writeManifest(out, manifest) {
  const path = join(out, MANIFEST_NAME);
  await mkdir(out, { recursive: true });
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return path;
}

/**
 * The folder a previous run recorded, found by walking the same ladder.
 *
 * `null` where there is no manifest to find, which sends {@link main} to
 * {@link resolveOutput} as before - a first run, or a site whose generated
 * folder has been deleted.
 *
 * The folder is taken from **where the file is** rather than from its `output`
 * field, for the reason in this file's header: a renamed or copied folder is
 * the folder a site owner has, and the field they are not reading is the one
 * that went stale. A file that is not this tool's manifest, or is one of a
 * shape this does not understand, is passed over rather than read - the ladder
 * carries on to the next candidate, so a site with a `cheatsheet-site.json` of
 * its own does not have this tool's meaning read into it.
 *
 * The first rung is the one worth a short circuit. Every candidate after it is
 * **inside** `cheatsheets/`, per {@link outputCandidates}, so a site without
 * that folder has nothing on the ladder at all and the walk can stop before it
 * starts. Past that the rungs are siblings and any of them may be missing - a
 * site owner who deleted one generated section still has the next - so the walk
 * reads every name rather than stopping at the first gap.
 *
 * @param {string} root
 * @param {{ tries?: number }} [options]
 * @returns {Promise<{ path: string, name: string, manifest: object } | null>}
 */
export async function readManifest(root, options = {}) {
  const from = resolve(root);
  if (!(await exists(join(from, OUTPUT_NAME)))) return null;
  for (const name of outputCandidates(options.tries ?? MAX_OUTPUT_TRIES)) {
    const folder = join(from, ...name.split("/"));
    let manifest;
    try {
      // A missing folder and an unreadable file are one case here: neither is a
      // manifest, and the ladder's next name is the answer to both.
      manifest = JSON.parse(await readFile(join(folder, MANIFEST_NAME), "utf8"));
    } catch {
      continue;
    }
    if (manifest === null || typeof manifest !== "object") continue;
    if (manifest.generator !== GENERATOR) continue;
    // Any shape this tool has written, per {@link MANIFEST_READABLE} - the
    // folder is read off where the file is, so an older manifest answers the
    // question as well as a current one, and refusing it would send this run to
    // write a second section beside the folder it was meant to find.
    if (!MANIFEST_READABLE.includes(manifest.manifestVersion)) continue;
    return { path: folder, name, manifest };
  }
  return null;
}

/** What `--help` prints. */
export const USAGE = [
  "Usage: node tools/cheatsheet-site.mjs <site> [--out <dir>] [--dry-run]",
  "",
  `Crawls a site tree for elements carrying ${MARKER}, collects what each`,
  "wraps, and writes one cheatsheet page per folder of the site that marked any.",
  "",
  "  <site>        The site root to crawl. Required.",
  `  --out <dir>   Write here instead of resolving ${OUTPUT_NAME}/ under the site.`,
  "  --dry-run     Report the folder and the pages it would write, and touch nothing.",
  "  --help        Print this.",
  "",
  `Without --out the folder is ${OUTPUT_NAME}/, then ${OUTPUT_NAME}/${OUTPUT_NAME}/,`,
  `then ${OUTPUT_NAME}/${OUTPUT_NAME}_0/ and upward until a free name is found.`,
  `A run records the name it resolved in ${OUTPUT_NAME}/.../${MANIFEST_NAME}, and a`,
  "later run reads that rather than resolving a second folder beside the first.",
  "",
  "A folder is a cheatsheet: guide/one.html and guide/two.html are written as",
  "guide.html, headed for the folder, with a section per page in the order the",
  "site reads them. A page at the site root is written under its own name.",
  "",
  `${MARKER}="title" heads a page from its own <title> and ${MARKER}="page"`,
  "from its file name. Marked without a value, a page takes its title with its",
  "file name behind it. A heading read off a name is read as prose, so",
  "somePageName.html is headed Some Page Name.",
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
  const dry = argv.includes("--dry-run");
  // Resolved before a single page is read, which is the item's own wording and
  // the reason it is a step of its own: the folder is part of the report even
  // on a site that turns out to have marked nothing.
  //
  // Three routes to one folder, in the order a run should prefer them: the name
  // the site owner passed, the name a previous run recorded, and the ladder. The
  // middle one is what stops a second run writing a second section beside the
  // first - see {@link readManifest}.
  const found = named === undefined ? await readManifest(root) : null;
  const out =
    named !== undefined
      ? { path: resolve(named), name: named, tried: [], recorded: false }
      : found !== null
        ? { path: found.path, name: found.name, tried: [], recorded: true }
        : { ...(await resolveOutput(root)), recorded: false };

  const pages = await collectSite(root);
  // Markup a page could not be read from, then names two pages both wanted.
  // The second is the site's own layout rather than its markup, so it is
  // collected across the pages rather than on one of them.
  const findings = [...pages.flatMap((page) => page.findings), ...nameCollisions(pages)];
  const planned = plannedPages(pages);
  // Measured off the resolved path rather than taken from `out.name`, because
  // the three routes name the folder in three different ways and the manifest
  // is committed: the ladder's name is already site relative, but `--out`
  // carries the site owner's own argument - absolute, or relative to the shell
  // they ran it from, with whatever separators they typed. Recording that puts
  // one machine's answer in a file read on another, and this is the one place
  // all three routes meet. The report below reads the same value, so the folder
  // a run names on screen and the folder it writes down are one answer. A
  // `--out` on another Windows drive has no site relative form at all and comes
  // back absolute; nothing can be done about that one, and it is not silent.
  const where = relative(root, out.path).split(sep).join("/") || ".";
  // Nothing before this point has touched the disk, which is what makes
  // `--dry-run` the absence of two calls rather than a mode of its own.
  const written = dry ? [] : await writePages(pages, out.path);
  if (!dry && planned.length > 0) await writeManifest(out.path, manifestFor(where, planned));

  const marked = pages.filter((page) => page.blocks.length > 0).length;
  process.stdout.write(
    [
      `${pages.length} page${pages.length === 1 ? "" : "s"} crawled, ${marked} marked`,
      `output folder    ${where}`,
      ...(out.recorded ? [`                 read from ${MANIFEST_NAME}`] : []),
      ...(out.tried.length > 1 ? [`names tried      ${out.tried.join(", ")}`] : []),
      `pages ${dry ? "to write   " : "written    "}${dry ? planned.length : written.length}`,
      // Every source of a cheatsheet, because a grouped page naming only the
      // first would read as the others having been dropped.
      ...planned.map((one) => `  ${one.sources.join(", ")} -> ${one.name} (${one.headingSource})`),
      ...(dry ? ["nothing was written, because --dry-run"] : []),
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
