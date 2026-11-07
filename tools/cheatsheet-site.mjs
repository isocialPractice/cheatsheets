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
// holds everything a cheatsheet needs; what it lacks is a way to say so. There
// are two ways of saying it - `data-cheatsheet` on the element wrapping the
// material, and a `<!-- {% cheatsheet: [...] %} -->` comment in front of it -
// and this is the half that reads them: the walk, the collector, the output
// folder and the write.
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
// ## The comment syntax, and what a comment says that an attribute cannot
//
// An attribute carries one value, so a page that wants to say several things
// about its material has nowhere to put them. A comment is where:
//
//     <!-- {% cheatsheet: [heading: page, group: page, name: splice] %} -->
//     <section>...</section>
//
// Four decisions are worth stating, because each had a tempting other reading:
//
// - **A cheatsheet comment stays opaque.** It is still a comment, so a
//   `data-cheatsheet` written inside one is still not a marker - that is the
//   whole of what a commented-out section means. The directive is read by a
//   scan of its own, {@link commentDirectives}, out of the comment ranges
//   {@link opaqueRanges} already found. Making the comment transparent instead
//   would have turned every marker a site owner had commented out back on.
// - **It applies to the element that follows it, with nothing but whitespace
//   in between.** A comment has no closing tag, so what it marks is the next
//   element rather than something it encloses, and the element's extent is read
//   with the same depth walk {@link closingTagOf} gives the attribute. A
//   comment with prose, another comment or a closing tag after it is reported
//   rather than carried forward to the next element it can find: the generous
//   reading would silently move a directive past the material it was written
//   for.
// - **Both methods are one collector, and a block is collected once.**
//   {@link collectMarked} gathers candidates from both and one merge decides
//   between them, which is what makes "collected once" a rule about the
//   material rather than a rule about the attribute. A comment whose element
//   also carries the attribute is one block carrying both answers, and either
//   method written inside the other's element is part of it.
// - **Where both speak, the comment wins**, and {@link headingFor} is the one
//   place that is stated. A comment is the more specific of the two - it was
//   written about this material rather than left on an element - and a page
//   that says two things about one heading is reported either way, which is the
//   same judgement **The Parent Tag Method** already makes within one method.
//
// The properties are {@link COMMENT_PROPERTIES}, recorded as data for the
// reason {@link HEADING_SOURCES} is: the finding for an unknown property reads
// the same list the parse does, so the two cannot disagree about what the
// vocabulary is. It is three properties rather than a wide surface half
// honoured - a page may set the heading source, whether it joins its folder's
// cheatsheet, and the file the cheatsheet is written as, which is every option
// the tool has to set.
//
// ## What belongs to later items, and is deliberately absent
//
// **The Scripted Tool** is finished here as of 2026.11.05, **The Parent Tag
// Method** as of 2026.11.06 and **The Comment Syntax Method** as of 2026.11.07;
// the sections below them in `TODO.md` are whole methods of their own. Reading
// those as scaffolding to leave hooks for would be the wrong shape; what is here
// is whole, and what is missing is missing on purpose:
//
// | Absent | Owned by |
// | --- | --- |
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

/**
 * How a block was marked, as data, so a finding can name the method a site used.
 *
 * Carried on the block rather than inferred from which other fields are set.
 * The two methods say the same thing in different places, so a sentence about
 * one of them written for a page that used the other is a sentence that sends a
 * site owner to look at markup they did not write.
 */
export const ATTRIBUTE_METHOD = "attribute";

/** @see {@link ATTRIBUTE_METHOD} */
export const COMMENT_METHOD = "comment";

/** The keyword a cheatsheet comment names this tool with. */
export const COMMENT_KEYWORD = "cheatsheet";

/**
 * The values the `group` property names.
 *
 * `folder` is the default and is what {@link pageFilename} does without being
 * asked: a page is a section of its folder's cheatsheet. `page` takes it back
 * out and makes it a cheatsheet of its own, which is the one thing a page in a
 * folder could not say before - a reference page that belongs beside its
 * siblings on the site and not inside their cheatsheet.
 */
export const GROUPINGS = ["folder", "page"];

/**
 * The properties a cheatsheet comment accepts, and the option each one sets.
 *
 * Data for the reason {@link HEADING_SOURCES} is data: the parse reads this to
 * decide what a property is, and the finding for a property it does not know
 * reads the same list to say what the vocabulary is. Two readings of one list
 * cannot disagree; a parse of one list and a sentence listing another can, and
 * the sentence is the half nobody tests.
 *
 * Three properties, which is every option the tool has to set rather than every
 * property a syntax could carry. A vocabulary is better short and extended when
 * an option arrives than wide and half honoured - a property that parses and
 * sets nothing is worse than one that was never accepted, because the page
 * reads as having been understood.
 *
 * `values` is the vocabulary a property takes, or `null` where the value is the
 * site's own text rather than one of a set. `sets` is what it does, in the
 * words the finding for a property written without a value uses.
 */
export const COMMENT_PROPERTIES = {
  heading: {
    values: HEADING_SOURCES,
    sets: "which source the page's heading is read from",
  },
  group: {
    values: GROUPINGS,
    sets: "whether the page joins its folder's cheatsheet or is one of its own",
  },
  name: {
    values: null,
    sets: "the file the cheatsheet is written as",
  },
};

/**
 * What a `name` property's value may be.
 *
 * A file name, which is stricter than a file name has to be on any filesystem
 * involved. The value becomes a path under the generated folder, so a `/`, a
 * `\` or a leading dot in it is either a folder this tool does not create or a
 * way out of the one it resolved - and the site owner who wrote `name: ../..`
 * meant something, so it is refused and said rather than sanitised into
 * something else.
 */
export const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * What a cheatsheet comment can be wrong about.
 *
 * Kinds rather than sentences, for the reason a block's `status` is a kind: the
 * finding names the page the comment was written on and the comment does not
 * know it, so {@link collectSite} composes the sentence where the page and the
 * directive are both in hand.
 */
export const COMMENT_PROBLEMS = [
  "malformed",
  "unknown-property",
  "unknown-value",
  "no-value",
  "repeated",
  "bad-name",
  "nothing-follows",
  "nested",
];

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
 * The line an offset falls on, counting from 1.
 *
 * Every finding before the comment syntax named a page and none named a
 * position, which was enough while a finding was about an element a reader
 * could search the page for. A property inside a comment is not searchable that
 * way - a page may carry several comments and the words of the wrong one are
 * the same words - so the offset the scan already carries is turned into a line
 * rather than thrown away.
 *
 * Counted per directive rather than by indexing the whole document, because
 * there are a handful of these on a page and a line table would be a pass over
 * every character of every page to answer a question most pages never ask.
 *
 * @param {string} text
 * @param {number} at
 * @returns {number}
 */
export function lineAt(text, at) {
  let line = 1;
  const upto = Math.min(at, text.length);
  for (let i = 0; i < upto; i += 1) if (text[i] === "\n") line += 1;
  return line;
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
 * The comments of a document, out of the spans that do not count.
 *
 * Filtered rather than scanned for, so there is one walk of the document and
 * the two readings of it cannot disagree about where a comment ends. What a
 * span was opened by is not in {@link opaqueRanges}' answer and does not need
 * to be: a comment is the only one of the three that opens with `<!--`.
 *
 * @param {string} html
 * @param {Array<[number, number]>} ranges
 * @returns {Array<[number, number]>}
 */
function commentRanges(html, ranges) {
  return ranges.filter(([start]) => html.startsWith("<!--", start));
}

/**
 * A bracketed property list split into its pairs.
 *
 * Split on the commas that are not inside a quoted value, which is the whole of
 * why this is a scan rather than `split(",")`. The three shapes it is written
 * for are the three a hand written list has: a trailing comma, a value holding
 * a colon, and a quoted value with a space in it. An empty part is dropped, so
 * a trailing comma is a trailing comma rather than a property with no name.
 *
 * @param {string} text Between the brackets.
 * @returns {string[]} Trimmed, with the empties left out.
 */
function splitPairs(text) {
  /** @type {string[]} */
  const parts = [];
  /** The quote character of the value being scanned, or `""` outside one. */
  let quote = "";
  let from = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote !== "") {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char !== ",") continue;
    parts.push(text.slice(from, i));
    from = i + 1;
  }
  parts.push(text.slice(from));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/**
 * A value with the quotes a site wrote around it taken off.
 *
 * Both quotes or neither: a value that opens with one and does not end with it
 * is the site's own text, and stripping the opener alone would hand back half
 * of what they wrote.
 *
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  const first = value[0];
  const quoted = (first === '"' || first === "'") && value.length >= 2 && value.endsWith(first);
  return quoted ? value.slice(1, -1) : value;
}

/**
 * The cheatsheet directive a comment holds, or `null` where it holds none.
 *
 * **The directive is the whole comment**, which is the strict reading and the
 * right one: a comment that explains the syntax in prose, or leaves a note
 * beside it, is a comment about the tool rather than an instruction to it.
 *
 * A body that is not a bracketed list is reported and the comment still marks
 * what follows it, which is the judgement {@link headingFor} makes about an
 * unrecognised attribute value: the page is written, and what could not be read
 * is the site's to fix.
 *
 * @param {string} html
 * @param {number} start Offset of the `<!--`.
 * @param {number} end Offset just past the comment.
 * @returns {{ properties: Record<string, string>, problems: Array<Record<string, unknown>> } | null}
 */
function readDirective(html, start, end) {
  // An unclosed comment reaches the end of the document and has no `-->` to
  // leave off, per {@link opaqueRanges}.
  const closed = html.slice(end - 3, end) === "-->";
  const inner = html.slice(start + 4, closed ? end - 3 : end);
  const opened = new RegExp(`^\\s*\\{%\\s*${COMMENT_KEYWORD}\\b\\s*:?([\\s\\S]*?)%\\}\\s*$`, "i").exec(inner);
  if (opened === null) return null;
  /** @type {Record<string, string>} */
  const properties = {};
  /** @type {Array<Record<string, unknown>>} */
  const problems = [];
  const body = opened[1].trim();
  // A comment naming the tool and nothing else marks what follows it with the
  // defaults, which is the comment form of a valueless attribute.
  if (body.length === 0) return { properties, problems };
  const bracketed = /^\[([\s\S]*)\]$/.exec(body);
  if (bracketed === null) {
    problems.push({ kind: "malformed", text: body });
    return { properties, problems };
  }
  for (const pair of splitPairs(bracketed[1])) {
    // The **first** colon, so a value is allowed to hold one. A property name
    // never does, and `name: a:b` is a name with a colon in it rather than two
    // properties badly written.
    const at = pair.indexOf(":");
    const property = (at === -1 ? pair : pair.slice(0, at)).trim().toLowerCase();
    const written = at === -1 ? null : unquote(pair.slice(at + 1).trim());
    if (!Object.hasOwn(COMMENT_PROPERTIES, property)) {
      problems.push({ kind: "unknown-property", property });
      continue;
    }
    const accepts = COMMENT_PROPERTIES[property];
    if (written === null || written.length === 0) {
      problems.push({ kind: "no-value", property });
      continue;
    }
    // A property naming one of a set is read the way the attribute's value is,
    // trimmed and without case, because both are written by hand. A value that
    // is the site's own text keeps the case they wrote it in - it names a file.
    const value = accepts.values === null ? written : written.toLowerCase();
    if (accepts.values !== null && !accepts.values.includes(value)) {
      problems.push({ kind: "unknown-value", property, value });
      continue;
    }
    if (property === "name" && !NAME_PATTERN.test(value)) {
      problems.push({ kind: "bad-name", property, value });
      continue;
    }
    if (Object.hasOwn(properties, property)) {
      // The same value twice is a repeat and says nothing; two values is a
      // comment asking for two things, and the first in the list wins. Same
      // rule, and the same silence about an exact repeat, as a page naming one
      // heading source twice.
      if (properties[property] !== value) problems.push({ kind: "repeated", property, value });
      continue;
    }
    properties[property] = value;
  }
  return { properties, problems };
}

/**
 * Every cheatsheet comment of a document, with what it says and where it is.
 *
 * The directives on their own, before anything has been decided about what each
 * applies to. Exported because the parse is worth holding to without a site
 * around it: what a property list means is a question about a string.
 *
 * @param {string} html
 * @returns {Array<{ at: number, end: number, line: number, properties: Record<string, string>, problems: Array<Record<string, unknown>> }>}
 */
export function commentDirectives(html) {
  const found = [];
  for (const [start, end] of commentRanges(html, opaqueRanges(html))) {
    const directive = readDirective(html, start, end);
    if (directive === null) continue;
    found.push({ at: start, end, line: lineAt(html, start), ...directive });
  }
  return found;
}

/**
 * The element a cheatsheet comment applies to.
 *
 * The next start tag, with nothing but whitespace between it and the comment.
 * A comment has no closing tag, so what it marks is what follows rather than
 * what it encloses - and "what follows" has to be bounded or the directive
 * walks. Prose, a second comment or a closing tag in between all answer `null`:
 * the generous reading would carry a directive past the material it was written
 * for and apply it to the next thing it could find, silently.
 *
 * @param {string} html
 * @param {number} from Offset just past the comment.
 * @returns {{ tag: string, end: number, text: string } | null}
 */
function elementAfter(html, from) {
  let at = from;
  while (at < html.length && /\s/.test(html[at])) at += 1;
  if (html[at] !== "<") return null;
  const tag = tagNameAt(html, at);
  if (tag === "") return null;
  const scanned = startTagAt(html, at);
  if (scanned === null) return null;
  return { tag, end: scanned.end, text: scanned.text };
}

/**
 * What a candidate block is, before the merge has decided whether to keep it.
 *
 * @typedef {object} Candidate
 * @property {number} at Where the marking is, which is what source order is read off.
 * @property {number} reach Where the material it marks ends, so what is inside it is not a second block.
 * @property {object} block What {@link collectMarked} hands back for it.
 */

/**
 * Every element the attribute method marked, as candidates.
 *
 * Nested markers included, unlike the loop this replaced, which jumped past a
 * collected element and so never produced one. The merge is what drops them
 * now - and it has to be the merge, because a marker nested inside a
 * **comment's** element is nested in material the attribute scan knows nothing
 * about.
 *
 * @param {string} html
 * @param {Array<[number, number]>} ranges
 * @returns {Candidate[]}
 */
function attributeCandidates(html, ranges) {
  /** @type {Candidate[]} */
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

    const block = {
      tag,
      value: attributeValue(startTag, MARKER),
      content: "",
      at: start,
      line: lineAt(html, start),
      method: ATTRIBUTE_METHOD,
      properties: {},
      problems: [],
    };
    if (VOID_ELEMENTS.includes(tag) || /\/>$/.test(startTag.trim())) {
      // Marked, and enclosing nothing. Recorded rather than dropped: a site
      // owner who marked an `<img>` meant something, and a silent skip is how
      // they would come to believe the tool had read their page.
      found.push({ at: start, reach: tagEnd + 1, block: { ...block, status: "empty" } });
      continue;
    }

    const end = closingTagOf(html, tag, tagEnd + 1, ranges);
    if (end === null) {
      found.push({
        at: start,
        reach: html.length,
        block: { ...block, content: html.slice(tagEnd + 1), status: UNCLOSED },
      });
      continue;
    }
    found.push({ at: start, reach: end.end, block: { ...block, content: html.slice(tagEnd + 1, end.start) } });
  }
  return found;
}

/**
 * Every element the comment method marked, as candidates.
 *
 * A directive's `at` is the comment's own offset rather than its element's,
 * which is what puts the block where the site owner wrote the marking and what
 * makes a comment inside collected material read as nested. Its `reach` is the
 * end of the element it applies to, so the material belongs to it.
 *
 * **A comment with nothing after it sets nothing**, and is reported saying so.
 * The properties belong to the material the comment marked, so a comment that
 * marked none has nothing to set them on - the same answer a nested comment
 * gets from {@link collectMarked}, and for the same reason.
 *
 * The element's own `data-cheatsheet`, where it has one, is carried over rather
 * than dropped. The two methods on one element are not a conflict to resolve
 * here: a comment that sets no heading and an attribute that names one is a
 * page that said one thing twice, and {@link headingFor} is where either is
 * read.
 *
 * @param {string} html
 * @param {Array<[number, number]>} ranges
 * @returns {Candidate[]}
 */
function commentCandidates(html, ranges) {
  /** @type {Candidate[]} */
  const found = [];
  for (const [start, end] of commentRanges(html, ranges)) {
    const directive = readDirective(html, start, end);
    if (directive === null) continue;
    const block = {
      tag: "",
      value: null,
      content: "",
      at: start,
      line: lineAt(html, start),
      method: COMMENT_METHOD,
      properties: directive.properties,
      problems: directive.problems,
    };
    const target = elementAfter(html, end);
    if (target === null) {
      // The properties are dropped with the marking, the way a nested comment's
      // are. A comment that marked nothing setting the page's name, grouping and
      // heading anyway is the one reading that contradicts its own finding - and
      // because the first answer in source order wins, a stray comment would
      // beat the one that did mark the material. They move to the problem, so
      // what the page is told is what was ignored.
      found.push({
        at: start,
        reach: end,
        block: {
          ...block,
          properties: {},
          problems: [
            ...directive.problems,
            { kind: "nothing-follows", properties: Object.keys(directive.properties) },
          ],
        },
      });
      continue;
    }
    const marked = { ...block, tag: target.tag, value: attributeValue(target.text, MARKER) };
    if (VOID_ELEMENTS.includes(target.tag) || /\/>$/.test(target.text.trim())) {
      found.push({ at: start, reach: target.end + 1, block: { ...marked, status: "empty" } });
      continue;
    }
    const closing = closingTagOf(html, target.tag, target.end + 1, ranges);
    if (closing === null) {
      found.push({
        at: start,
        reach: html.length,
        block: { ...marked, content: html.slice(target.end + 1), status: UNCLOSED },
      });
      continue;
    }
    found.push({
      at: start,
      reach: closing.end,
      block: { ...marked, content: html.slice(target.end + 1, closing.start) },
    });
  }
  return found;
}

/**
 * Every block of content a page has marked, in source order.
 *
 * The collector, and the one place the two authoring methods meet. Each block
 * is the **inner** markup of an element - the one carrying {@link MARKER}, or
 * the one a cheatsheet comment stands in front of - so what a site owner
 * wrapped is what comes back, with the wrapper itself left out: the wrapper is
 * how they said it, not part of what they said.
 *
 * **Marked material is collected once**, whichever method marked it and
 * whichever is nested in which. Both methods produce candidates and one merge
 * decides, which is what makes that a rule about the material rather than a
 * rule about the attribute: collecting a nested marking twice would put the
 * same material on a generated page twice, and collecting only the inner one
 * would drop everything its parent added around it.
 *
 * The two methods are not treated alike when one is dropped, and the asymmetry
 * is the point. A nested attribute adds nothing to what its parent already
 * said, so it goes in silence as it always has. A nested comment carries
 * properties that are being ignored, which is the kind of silence this file
 * spends its findings on, so the block is kept with nothing in it and reported.
 *
 * @param {string} html
 * @returns {Array<{ tag: string, value: string | null, content: string, at: number, line: number, method: string, properties: Record<string, string>, problems: Array<Record<string, unknown>>, status?: string }>}
 */
export function collectMarked(html) {
  const ranges = opaqueRanges(html);
  const candidates = [...attributeCandidates(html, ranges), ...commentCandidates(html, ranges)].sort(
    (a, b) => a.at - b.at
  );
  const found = [];
  /** How far the last block collected reached, so what is inside it is not a second. */
  let reach = 0;
  for (const candidate of candidates) {
    if (candidate.at < reach) {
      if (candidate.block.method === COMMENT_METHOD) {
        found.push({
          ...candidate.block,
          content: "",
          status: "nested",
          properties: {},
          problems: [
            ...candidate.block.problems,
            { kind: "nested", properties: Object.keys(candidate.block.properties) },
          ],
        });
      }
      continue;
    }
    found.push(candidate.block);
    // Markup that is never closed took the rest of the document as its content,
    // so there is nothing after it left to collect.
    if (candidate.block.status === UNCLOSED) break;
    reach = candidate.reach;
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
 * What a page's cheatsheet comments set a property to, and where they said it.
 *
 * The first in source order wins, which is the rule every other "said twice"
 * on a page follows. Only accepted values are here to be read:
 * {@link readDirective} leaves a value the vocabulary does not know out of the
 * properties and reports it, so a property found here is one this tool can act
 * on.
 *
 * The line comes back with the value because the findings about an ask name the
 * line it was written on, and by the time one is composed the block it came off
 * is several functions away.
 *
 * @param {SitePage} page
 * @param {string} property
 * @returns {{ value: string, line: number } | null}
 */
export function commentOption(page, property) {
  const block = (page.blocks ?? []).find((one) => one.properties?.[property] !== undefined);
  return block === undefined ? null : { value: block.properties[property], line: block.line };
}

/**
 * Whether a page joins its folder's cheatsheet or is one of its own.
 *
 * `folder` without being asked, which is what the parent tag method settled on
 * 2026.11.06 and what this leaves alone. `group: page` is the one thing a page
 * in a folder could not say before.
 *
 * A root page asked to join a folder has none to join, so it is its own
 * cheatsheet - the answer it would have had anyway. {@link collectSite} reports
 * the ask rather than this: a finding needs the page's name and this is read
 * from places that have no business composing a sentence.
 *
 * @param {SitePage} page
 * @returns {string} One of {@link GROUPINGS}.
 */
export function pageGrouping(page) {
  const asked = commentOption(page, "group");
  if (asked === null) return "folder";
  return asked.value === "folder" && pageFolder(page) === "" ? "page" : asked.value;
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
 * **Where both methods speak, the comment wins**, and this is the one place
 * that is stated rather than wherever the two readings happen to meet. A
 * comment is the more specific of the two: it was written about this material,
 * while an attribute sits on an element and may have been there first. The
 * disagreement is reported either way, which is the same judgement the two
 * attribute values above get - a page asking for two headings is reported
 * whether it asked in one voice or two.
 *
 * An unrecognised value inside a comment is **not** reported here. It is
 * reported with its line by {@link collectSite}, which is what the comment
 * syntax buys, and {@link readDirective} has already left it out of the
 * page's properties - so what reaches this is a value the vocabulary knows.
 *
 * @param {SitePage} page
 * @returns {{ source: string, heading: string, findings: string[] }}
 */
export function headingFor(page) {
  /** @type {string[]} */
  const findings = [];
  /** @type {string[]} */
  const asked = [];
  /** @type {string[]} */
  const named = [];
  /** @type {string[]} */
  const unknown = [];
  for (const block of page.blocks ?? []) {
    const property = block.properties?.heading;
    // Distinct values only, here and below. The finding names the page, so a
    // value repeated on one page would print the same sentence twice.
    if (property !== undefined && !asked.includes(property)) asked.push(property);
    // Trimmed and lower cased before matching. An attribute value is written by
    // hand, so `data-cheatsheet=" Title "` is a site owner naming the title
    // source rather than a third thing to report.
    const value = (block.value ?? "").trim().toLowerCase();
    if (value.length === 0) continue;
    const into = HEADING_SOURCES.includes(value) ? named : unknown;
    if (!into.includes(value)) into.push(value);
  }
  const source = asked[0] ?? named[0] ?? "title";
  /** Whether anything on the page named a source at all, in either method. */
  const chosen = asked.length > 0 || named.length > 0;
  // What answered, which is not always the source that was named. The `title`
  // source has a fallback and the fallback is the file name, so on a page with
  // no `<title>` at all the heading came from neither the named source nor the
  // default - and a finding that said `title` would be telling a site owner
  // their heading was read from an element their page has not got.
  const answered =
    source === "title" && page.title === null
      ? "its file name, because the page has no <title>"
      : chosen
        ? source
        : `${source}, the default`;
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
  if (asked.length > 1) {
    findings.push(
      `${page.id}: ${asked.map((one) => `heading: ${one}`).join(" and ")} ask for two different headings on ` +
        `one page, so the first in source order won. Set one heading per page.`
    );
  }
  if (asked.length > 0 && named.length > 0 && asked[0] !== named[0]) {
    findings.push(
      `${page.id}: a cheatsheet comment asks for heading: ${asked[0]} and ${MARKER}="${named[0]}" asks for ` +
        `the other on the same page, so the comment won - it was written about the material rather than ` +
        `left on an element. Say it once, in whichever of the two the page is marked up with.`
    );
  }
  // Read as prose wherever the file name is the answer, per {@link prose}. A
  // `<title>` is not touched: it was written to be read, so whatever casing it
  // carries is the site's own.
  const stem = prose(pageStem(page));
  if (source === "page") return { source, heading: stem, findings };
  if (page.title === null && chosen) {
    // Named in whichever method the page asked in, so the advice points at
    // markup the site owner actually wrote rather than at the other method.
    const wrote = asked.length > 0 ? `heading: ${source}` : `${MARKER}="${source}"`;
    const instead = asked.length > 0 ? "heading: page" : `${MARKER}="page"`;
    findings.push(
      `${page.id}: ${wrote} asks for the page's <title> and the page has none, so its file name ` +
        `was used instead. Give the page a <title>, or mark it ${instead}.`
    );
  }
  return { source, heading: page.title ?? stem, findings };
}

/**
 * The properties a comment accepts, in a sentence.
 *
 * Read off {@link COMMENT_PROPERTIES} rather than written out, so the finding
 * for a property that is not in the vocabulary cannot name a vocabulary the
 * parse does not have. That is the whole reason the properties are data.
 *
 * @returns {string}
 */
function propertyList() {
  const names = Object.keys(COMMENT_PROPERTIES);
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * What a cheatsheet comment got wrong, as a sentence naming the page and line.
 *
 * **The line is the item**, not a detail of it. Every other finding in this
 * tool names an element a reader can search their page for; a property inside a
 * comment is not searchable that way, because a page may carry several comments
 * and the words of the wrong one are the same words.
 *
 * Each sentence says what was ignored and what happened instead, which is the
 * shape every finding here has: a site owner who wrote something meant it, and
 * silence is how they come to believe the tool read their page.
 *
 * @param {string} id The page, site relative.
 * @param {object} block The block the comment marked.
 * @param {Record<string, unknown>} problem One of {@link COMMENT_PROBLEMS}.
 * @returns {string}
 */
function commentFinding(id, block, problem) {
  const where = `${id}:${block.line}`;
  switch (problem.kind) {
    case "malformed":
      return (
        `${where}: a cheatsheet comment reads "${problem.text}" where a bracketed property list was ` +
        `expected, so no property was read and the content after it was collected with the defaults. ` +
        `Write it as <!-- {% ${COMMENT_KEYWORD}: [heading: ${HEADING_SOURCES[0]}] %} -->.`
      );
    case "unknown-property":
      return (
        `${where}: ${problem.property} names no cheatsheet comment property, so it was ignored. ` +
        `The properties it reads are ${propertyList()}.`
      );
    case "unknown-value":
      return (
        `${where}: ${problem.property}: ${problem.value} names no value the ${problem.property} property ` +
        `takes, so it was ignored and the page kept the ${problem.property} it would have had. It reads ` +
        `${COMMENT_PROPERTIES[problem.property].values.join(" and ")}.`
      );
    case "no-value":
      return (
        `${where}: ${problem.property} is written with no value, so it was ignored. It sets ` +
        `${COMMENT_PROPERTIES[problem.property].sets}, and cannot say so without one.`
      );
    case "repeated":
      return (
        `${where}: ${problem.property} is written twice with two values, so the first in the list was used ` +
        `and ${problem.value} was ignored. Write one ${problem.property} per comment.`
      );
    case "bad-name":
      return (
        `${where}: name: ${problem.value} is not a file name, so it was ignored and the cheatsheet kept the ` +
        `name it had. A name is letters, digits, dots, dashes and underscores, starts with a letter or a ` +
        `digit, and carries neither an extension nor a path.`
      );
    case "nothing-follows":
      return (
        `${where}: a cheatsheet comment has no element after it, so it marked nothing${
          problem.properties.length === 0
            ? ""
            : ` and the ${problem.properties.join(" and ")} it sets ${
                problem.properties.length === 1 ? "was" : "were"
              } ignored`
        }. A comment applies to the element that follows it, with nothing but whitespace in between.`
      );
    case "nested":
      return (
        `${where}: a cheatsheet comment sits inside material that is already collected, so ` +
        `${
          problem.properties.length === 0
            ? "it marked nothing of its own"
            : `the ${problem.properties.join(" and ")} it sets ${
                problem.properties.length === 1 ? "was" : "were"
              } ignored`
        }. Put it in front of the outermost element of the material it describes.`
      );
    default:
      // Unreachable while every kind in {@link COMMENT_PROBLEMS} has a case
      // above, and said rather than dropped if one ever does not: a finding
      // nobody can read still sends somebody to look at the page.
      return `${where}: a cheatsheet comment is wrong in a way this tool has no sentence for: ${problem.kind}.`;
  }
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
      const comment = block.method === COMMENT_METHOD;
      if (block.status === UNCLOSED) {
        findings.push(
          comment
            ? `${id}:${block.line}: the <${block.tag}> a cheatsheet comment applies to is never closed, so ` +
              `everything after it was taken as its content. Close the element, or the generated page will ` +
              `carry the rest of the file.`
            : `${id}: a <${block.tag}> marked with ${MARKER} is never closed, so everything after it was ` +
              `taken as its content. Close the element, or the generated page will carry the rest of the file.`
        );
      }
      if (block.status === "empty") {
        findings.push(
          comment
            ? `${id}:${block.line}: <${block.tag}> cannot enclose anything, so the cheatsheet comment in ` +
              `front of it collected nothing. Put the comment before the element that wraps the material ` +
              `instead.`
            : `${id}: <${block.tag}> cannot enclose anything, so marking it with ${MARKER} collected nothing. ` +
              `Mark the element that wraps the material instead.`
        );
      }
      // The file and the line, which is what the comment syntax is reported
      // with and nothing else in this tool is: a page may carry several
      // comments and the words of the wrong one are the same words.
      for (const problem of block.problems ?? []) findings.push(commentFinding(id, block, problem));
    }
    const page = { path, id, title: titleOf(html), blocks, findings };
    // After the markup findings and from the finished page, because the heading
    // is read off the page's own `<title>` as much as off the marker's value -
    // what the site asked for and what it has are both part of the answer.
    findings.push(...headingFor(page).findings);
    // The one ask that cannot be judged from the comment alone: a page knows
    // whether it has a folder and a directive does not.
    const grouping = commentOption(page, "group");
    if (grouping !== null && grouping.value === "folder" && pageFolder(page) === "") {
      findings.push(
        `${id}:${grouping.line}: group: folder asks this page to join its folder's cheatsheet and the page ` +
          `is at the site root, so it has no folder to join and is a cheatsheet of its own. Move the page ` +
          `into a folder, or drop the property.`
      );
    }
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
 * **A cheatsheet comment can say otherwise, and that is the only thing that
 * can.** `name` names the file outright and `group: page` takes a page back out
 * of its folder's cheatsheet, which is the one option a page in a folder had no
 * way to ask for. Both are the comment syntax's reason for existing: an
 * attribute carries one value, and this is a second and a third thing to say
 * about the same material.
 *
 * @param {SitePage} page
 * @returns {string}
 */
export function pageFilename(page) {
  const named = commentOption(page, "name");
  if (named !== null) return `${named.value}.html`;
  const folder = pageFolder(page);
  return `${folder === "" || pageGrouping(page) === "page" ? pageStem(page) : folderName(folder)}.html`;
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
 * **It is two passes, because a name belongs to a cheatsheet and not to a
 * page.** Every page of a folder can carry `name`, so which name a cheatsheet
 * wants is not knowable until the folder's pages are all in hand - and the pass
 * that claims names runs over the groups in the order they were first seen,
 * which is page order, so the winner of a collision is the one it always was.
 *
 * @param {SitePage[]} pages
 * @returns {{ sheets: Cheatsheet[], collisions: string[], naming: string[] }}
 */
function groupCheatsheets(pages) {
  /** Keyed so a folder is one cheatsheet and each standalone page is its own. */
  /** @type {Map<string, { folder: string, pages: SitePage[] }>} */
  const groups = new Map();
  for (const page of carryingPages(pages)) {
    const folder = pageFolder(page);
    // A page at the root has no folder to be named for, and one that asked to
    // stand alone is a cheatsheet of its own wherever it sits.
    const alone = folder === "" || pageGrouping(page) === "page";
    const key = alone ? `page:${page.id}` : `folder:${folder}`;
    const group = groups.get(key);
    if (group !== undefined) {
      group.pages.push(page);
      continue;
    }
    groups.set(key, { folder: alone ? "" : folder, pages: [page] });
  }
  /** Keyed by the name lower cased, and carrying it as written for the finding. */
  /** @type {Map<string, { key: string, name: string }>} */
  const claimed = new Map();
  /** @type {Cheatsheet[]} */
  const sheets = [];
  /** @type {string[]} */
  const collisions = [];
  /** @type {string[]} */
  const naming = [];
  for (const [key, group] of groups) {
    const named = sheetName(group);
    const owner = claimed.get(named.name.toLowerCase());
    if (owner !== undefined) {
      // The name the owner claimed, where that is not the name this one wanted.
      // Two spellings of one name is the whole of what a case collision is, and
      // a finding that printed only one of them would read as a plain repeat.
      const spelled = owner.name === named.name ? "" : ` as ${owner.name}`;
      collisions.push(
        `${label(key)}: would be written as ${named.name}, which ${label(owner.key)} already ` +
          `claimed${spelled}, so it was not written. Two cheatsheets of a site cannot share a name while ` +
          `the output folder is flat, and two names that differ only in case are one name on a filesystem ` +
          `that ignores case - rename one of them, or pass --out and run them separately.`
      );
      continue;
    }
    // Only for a cheatsheet that is written. A dropped one was not named by
    // anything in the end, so a finding saying which name was used would be
    // describing a file that is not there.
    naming.push(...named.findings);
    claimed.set(named.name.toLowerCase(), { key, name: named.name });
    if (group.folder === "") {
      const { source, heading } = headingFor(group.pages[0]);
      sheets.push({ name: named.name, folder: "", heading, headingSource: source, pages: group.pages });
      continue;
    }
    sheets.push({
      name: named.name,
      folder: group.folder,
      heading: prose(folderName(group.folder)),
      headingSource: FOLDER_SOURCE,
      pages: group.pages,
    });
  }
  return { sheets, collisions, naming };
}

/**
 * The file a cheatsheet is written as, and what the pages of it asked for.
 *
 * A `name` property names **the cheatsheet the page belongs to**, not the page,
 * because a page is not what gets written: a folder of four pages is one file,
 * and any of the four can say what it is called. The first in source order wins
 * and a second, different name is reported - the alternative is the last page
 * of a folder quietly renaming the file the other three were written into.
 *
 * The heading is not renamed with it. A folder's cheatsheet is headed for the
 * folder because that is what it is, and `name` answers {@link pageFilename}:
 * what the file is called and what the page is headed were already two answers
 * before a comment could set either.
 *
 * @param {{ folder: string, pages: SitePage[] }} group
 * @returns {{ name: string, findings: string[] }}
 */
function sheetName(group) {
  /** @type {string[]} */
  const findings = [];
  /** @type {{ value: string, id: string } | null} */
  let named = null;
  for (const page of group.pages) {
    const asked = commentOption(page, "name");
    if (asked === null) continue;
    if (named === null) {
      named = { value: asked.value, id: page.id };
      continue;
    }
    if (asked.value === named.value) continue;
    findings.push(
      `${page.id}:${asked.line}: name: ${asked.value} renames a cheatsheet ${named.id} has already named ` +
        `${named.value}, so the first in source order was used. One name per cheatsheet, however many ` +
        `pages of a folder carry it.`
    );
  }
  return { name: named === null ? pageFilename(group.pages[0]) : `${named.value}.html`, findings };
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
 * Pages of one cheatsheet that asked it to be two different files.
 *
 * Separate from {@link nameCollisions} because they are opposite shapes of the
 * same subject: a collision is two cheatsheets wanting one name, and this is
 * one cheatsheet being given two. Both reach the report and the exit code, and
 * neither reads as the other.
 *
 * @param {SitePage[]} pages
 * @returns {string[]} A finding per name that lost, in page order.
 */
export function namingFindings(pages) {
  return groupCheatsheets(pages).naming;
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
  "",
  "A page with more than one thing to say marks its material with a comment",
  "instead, which applies to the element that follows it:",
  "",
  `  <!-- {% ${COMMENT_KEYWORD}: [heading: page, group: page, name: splice] %} -->`,
  "",
  `  heading: ${HEADING_SOURCES.join(" | ")}   the source the heading is read from`,
  `  group: ${GROUPINGS.join(" | ")}    join the folder's cheatsheet, or be one`,
  "  name: <file>           the file the cheatsheet is written as",
  "",
  "Where a comment and the attribute both speak, the comment wins and the",
  "disagreement is reported. A property this does not know, or a value it does",
  "not take, is reported with the page and the line it was written on.",
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
  // Markup a page could not be read from, then names two pages both wanted and
  // one cheatsheet two pages named twice. The last two are the site's own
  // layout rather than its markup, so they are collected across the pages
  // rather than on one of them.
  const findings = [
    ...pages.flatMap((page) => page.findings),
    ...nameCollisions(pages),
    ...namingFindings(pages),
  ];
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
