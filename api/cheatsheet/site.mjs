// The browser entry point: a cheatsheet built from a page that is already
// loaded, out of elements found with ordinary DOM methods.
//
// ```js
// import { cheatsheetSection } from "./api/cheatsheet/index.mjs";
//
// const { element, findings } = cheatsheetSection(document);
// if (element) document.querySelector("#cheatsheet").append(element);
// for (const finding of findings) console.warn(finding);
// ```
//
// ## Why this exists beside the scripted tool
//
// `tools/cheatsheet-site.mjs` reads a site's files. It installs nothing, which
// rules out an HTML parser, so it scans - and the first limit its own header
// states is the one no scan can get past: **it reads the markup as written**,
// so a marker a script wrote at run time is invisible to it. A site built from
// a template at load time, or one whose content arrives from a fetch, has
// markings the file on disk does not carry.
//
// This is the other half, and it is the half that needs no build step at all.
// A page that can run a `<script type="module">` can mark its material, import
// this, and have its cheatsheet section on the page - with no checkout, no
// Node and nothing installed. The two routes read the **same two markings**,
// which is why the attribute names and the heading sources live here and the
// scripted tool imports them rather than declaring its own.
//
// | | Scripted tool | This |
// | --- | --- | --- |
// | Reads | Files on disk | A live document |
// | Finds an element by | Scanning for the attribute | `querySelectorAll` |
// | Sees a marker a script wrote | No | Yes |
// | Writes | A page per source page | A section into the page it ran on |
// | Needs | A checkout and Node | A `<script type="module">` |
//
// ## What it does not do
//
// **No menu, and no second page.** `data-cheatsheet-menu` is the scripted
// tool's third marking and it means "write a link to the folder of generated
// pages"; there is no generated folder here, and a menu pointing at pages
// nobody wrote is worse than no menu. {@link CHEATSHEET_MENU_MARKER} is named
// here for the same reason the scan tests the character after the marker: a
// longer attribute whose name starts the same way is a different attribute, and
// an element carrying it is reported rather than collected.
//
// **Nothing is written to a file and nothing is fetched.** This module reaches
// the document it was handed and the modules beside it, and that is all - which
// is what lets it load from a page with no stylesheet, no bundler and no
// network beyond the page itself.
//
// ## How it is held
//
// Two ways, and neither needs a browser. `tools/test-sheet-render.mjs` walks
// the static import graph of `index.mjs` and fails on a Node builtin in it, so
// this file being exported from there is what proves it loads in a page at all.
// And `tools/test-browser-entry.mjs` drives it against a hand written stub of
// the DOM - which doubles as the statement of how small the surface it needs
// is: `querySelectorAll`, `getAttribute`, `hasAttribute`, `contains`,
// `childNodes`, `createElement`, `append`, `cloneNode` and `innerHTML`.

import { renderFragment, slugFor } from "./render.mjs";

/** The attribute a site marks cheatsheet material with. */
export const CHEATSHEET_MARKER = "data-cheatsheet";

/**
 * The attribute a site marks the place its cheatsheet menu goes with.
 *
 * A longer name than {@link CHEATSHEET_MARKER} and a different attribute. An
 * attribute selector matches a whole name, so the DOM route gets that
 * distinction for free where the file scan has to test the character after the
 * name it found - but it is named here because an element carrying it is
 * reported, this route having no generated folder for a menu to point at.
 */
export const CHEATSHEET_MENU_MARKER = "data-cheatsheet-menu";

/** The attribute naming the element one collected block came off. */
export const CHEATSHEET_BLOCK = "data-cheatsheet-block";

/** The class the built section carries, where the caller names none. */
export const SECTION_CLASS = "cheatsheet-section";

/**
 * The values `data-cheatsheet` names a heading source with.
 *
 * `title` takes the heading from the page's own `<title>`, `page` from its file
 * name. Order matters only in what the findings print.
 */
export const HEADING_SOURCES = ["title", "page"];

/**
 * The elements whose text labels the material rather than being part of it.
 *
 * A heading, a caption, a term and a table's header cell are all labels for
 * what follows them, and the design language sets a label as a comment row. The
 * list is data because two readers apply it: this module walks a live document
 * and `textLines` in `tools/cheatsheet-site.mjs` builds a pattern from the same
 * names, so the two routes cannot come to disagree about what a label is.
 */
export const HEADING_ELEMENTS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "caption", "figcaption", "dt", "th", "legend", "summary",
];

/** The elements whose boundaries end a line of text. */
export const BREAKING_ELEMENTS = [
  "address", "article", "aside", "blockquote", "br", "dd", "div", "dl",
  "figure", "footer", "form", "header", "hr", "li", "main", "nav", "ol",
  "option", "p", "pre", "section", "table", "tbody", "td", "tfoot", "thead",
  "tr", "ul",
];

/**
 * The elements whose text is not text.
 *
 * The same three spans the file scan reads as opaque, minus the comment, which
 * a DOM walk passes over by node type rather than by name. A `<script>` that
 * draws a chart is not a row of a cheatsheet, and a stylesheet set as one is
 * the outcome nobody could have meant.
 */
export const OPAQUE_ELEMENTS = ["script", "style", "template", "noscript"];

/** The node types this walk reads, named rather than numbered at each use. */
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/**
 * A file or folder name read as prose.
 *
 * `somePageName` is `Some Page Name`. A file name is written for a filesystem
 * and a heading is read by a person, and the gap between the two is the whole
 * of this: a generated page headed `somePageName` is a page that looks
 * generated.
 *
 * One function rather than one per caller, because there are three now and they
 * have to agree - a page headed from its own file name, a folder's cheatsheet
 * headed from the folder's name, and the heading this route reads off
 * `location.pathname` are one answer read off three names.
 *
 * Four breaks, and each is a shape a real name has:
 *
 * - **A separator a name is already written with**: a space, a dot, an
 *   underscore or a hyphen. `my-page_name` was already three words.
 * - **A case change**: `somePageName`. The commonest shape.
 * - **An acronym run before a capitalised word**: `parseHTMLString` is
 *   `Parse HTML String` rather than `Parse H T M L String`. The last capital of
 *   the run belongs to the word after it.
 * - **Either side of a digit run**: `base64Encode` is `Base 64 Encode`.
 *
 * Only the first letter of each word is touched. Lower casing the rest would
 * read `HTML` as `Html`, and a site that wrote an acronym meant it.
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
 * The marked elements of a document, outermost first and nested ones dropped.
 *
 * **One block per marking, and a marking inside another is part of it.** The
 * same rule `collectMarked` applies to a file: material already collected is
 * not collected a second time, so a marked `<section>` holding a marked
 * `<pre>` is one block rather than two overlapping ones. `contains` is what
 * answers it here, where the file scan counts how far the outer element
 * reached.
 *
 * `querySelectorAll` returns elements in document order, which is the order the
 * sections of the built cheatsheet read in - the same promise `crawlSite` makes
 * about a folder's pages.
 *
 * @param {ParentNode} root A document, or an element to search inside.
 * @returns {Element[]}
 */
export function markedElements(root) {
  const found = [...root.querySelectorAll(`[${CHEATSHEET_MARKER}]`)];
  return found.filter((element) => !found.some((other) => other !== element && other.contains(element)));
}

/**
 * The lines one marked element reads as, with the role each is set in.
 *
 * The DOM's own answer to what `textLines` does with a pattern, and it is the
 * better half of the pair: the walk knows which element a run of text sits in,
 * so a `<strong>` inside a sentence is part of the sentence and a `<td>` is a
 * line of its own, without a list of exceptions standing in for a tree.
 *
 * Three rules, and the third is why a buffer rather than a map over children:
 *
 * - **An opaque element contributes nothing**, per {@link OPAQUE_ELEMENTS}, and
 *   neither does a comment or a processing instruction - anything that is not
 *   an element or text is passed over by node type.
 * - **A heading element's text is a `comment` row**, per
 *   {@link HEADING_ELEMENTS}, because a label is set above the thing it labels.
 * - **Inline content joins the line being built.** Text arrives in as many
 *   nodes as the markup has inline elements, so a line is accumulated and
 *   flushed at a boundary rather than emitted per node. Collapsing the
 *   whitespace is what makes the flush honest: markup is indented and a sheet's
 *   rows are not.
 *
 * @param {Element} element
 * @returns {Array<{ text: string, role: string }>}
 */
export function linesOf(element) {
  /** @type {Array<{ text: string, role: string }>} */
  const lines = [];
  const state = { buffer: "", role: "plain" };
  const flush = () => {
    const text = state.buffer.replace(/\s+/g, " ").trim();
    state.buffer = "";
    if (text !== "") lines.push({ text, role: state.role });
  };
  /** @param {Node} node */
  const walk = (node) => {
    for (const child of [...(node.childNodes ?? [])]) {
      if (child.nodeType === TEXT_NODE) {
        state.buffer += child.data ?? "";
        continue;
      }
      if (child.nodeType !== ELEMENT_NODE) continue;
      const tag = String(child.tagName ?? "").toLowerCase();
      if (OPAQUE_ELEMENTS.includes(tag)) continue;
      if (HEADING_ELEMENTS.includes(tag)) {
        flush();
        const held = state.role;
        state.role = "comment";
        walk(child);
        flush();
        state.role = held;
        continue;
      }
      if (BREAKING_ELEMENTS.includes(tag)) {
        flush();
        walk(child);
        flush();
        continue;
      }
      walk(child);
    }
  };
  walk(element);
  flush();
  return lines;
}

/**
 * The heading a page asked for, which source answered, and what to say about
 * the asking.
 *
 * The same three readings `headingFor` makes of a file, in the same order and
 * with the same refusals, because a page should get the heading it asked for
 * whichever route read it:
 *
 * - **An attribute with no value, and one set to the empty string, both name no
 *   source.** `data-cheatsheet=""` is what a template with an empty variable
 *   emits, and refusing it would make this fail on the commonest accident
 *   rather than on a real mistake. The default is the `<title>`, with the file
 *   name behind it.
 * - **An unrecognised value is a finding and not a guess.** Somebody who wrote
 *   `data-cheatsheet="heading"` meant something, and silently handing back the
 *   default is how they come to believe it was read.
 * - **Two different sources named on one page is a finding**, and the first in
 *   document order wins rather than the last one quietly deciding.
 *
 * @param {Element[]} elements What {@link markedElements} found.
 * @param {{ title?: string, page?: string }} where The page's own title and name.
 * @returns {{ heading: string, source: string, findings: string[] }}
 */
export function headingOf(elements, where) {
  /** @type {string[]} */
  const findings = [];
  /** @type {string[]} */
  const named = [];
  /** @type {string[]} */
  const unknown = [];
  for (const element of elements) {
    const value = String(element.getAttribute(CHEATSHEET_MARKER) ?? "").trim().toLowerCase();
    if (value === "") continue;
    const into = HEADING_SOURCES.includes(value) ? named : unknown;
    if (!into.includes(value)) into.push(value);
  }
  const title = typeof where.title === "string" ? where.title.trim() : "";
  const fromName = prose(where.page ?? "");
  const source = named[0] ?? "title";
  const chosen = named.length > 0;
  const answered = source === "title" && title === "" ? "its file name, because the page has no title" : source;
  for (const value of unknown) {
    findings.push(
      `${CHEATSHEET_MARKER}="${value}" names no heading source, so it was ignored and the heading came ` +
        `from ${chosen || answered !== source ? answered : `${source}, the default`}. ` +
        `The values it reads are ${HEADING_SOURCES.join(" and ")}.`
    );
  }
  if (named.length > 1) {
    findings.push(
      `${named.map((one) => `${CHEATSHEET_MARKER}="${one}"`).join(" and ")} ask for two different ` +
        `headings on one page, so the first in document order won. Mark one source per page.`
    );
  }
  if (chosen && source === "title" && title === "") {
    findings.push(
      `${CHEATSHEET_MARKER}="title" asks for this page's title and the page has none, so the heading ` +
        `came from its file name.`
    );
  }
  const heading = source === "page" ? fromName || title : title || fromName;
  return { heading, source, findings };
}

/**
 * Everything one loaded page has to say about its cheatsheet, as data.
 *
 * The half of this module that touches no DOM beyond reading it, which is what
 * makes it the half worth calling directly: a caller that wants the document
 * and not the markup - to render a raster, to post it somewhere, to compare two
 * pages - has it here without a section being built.
 *
 * `document` is the cheatsheet API's own document, so the figure
 * {@link cheatsheetSection} embeds and a `renderSheet` of any format are two
 * renders of one composition. It is `null` where no marked element read as a
 * single line of text - a page whose material is an `<img>` or a `<canvas>` -
 * because a sheet document carries a section and a section carries something,
 * and a sheet with an invented row on it is worse than no sheet.
 *
 * @param {ParentNode} root A document, or an element to search inside.
 * @param {{ title?: string, page?: string }} [options]
 * @returns {{ heading: string, source: string, blocks: Array<{ element: Element, tag: string, lines: Array<{ text: string, role: string }> }>, document: object | null, findings: string[] }}
 */
export function collectFromDocument(root, options = {}) {
  const owner = root.ownerDocument ?? root;
  const where = {
    title: options.title ?? owner?.title ?? "",
    page: options.page ?? pageName(owner),
  };
  const elements = markedElements(root);
  const { heading, source, findings } = headingOf(elements, where);
  const blocks = elements.map((element) => ({
    element,
    tag: String(element.tagName ?? "").toLowerCase(),
    lines: linesOf(element),
  }));
  for (const block of blocks) {
    if (block.lines.length > 0) continue;
    findings.push(
      `a <${block.tag}> marked with ${CHEATSHEET_MARKER} holds no text, so it sets no row of the sheet. ` +
        `Its markup is still carried onto the section.`
    );
  }
  for (const element of root.querySelectorAll(`[${CHEATSHEET_MENU_MARKER}]`)) {
    findings.push(
      `a <${String(element.tagName ?? "").toLowerCase()}> carries ${CHEATSHEET_MENU_MARKER}, which this ` +
        `route cannot fill: a menu lists the pages a run wrote into a folder, and nothing here writes a ` +
        `folder. Run tools/cheatsheet-site.mjs for that, or drop the attribute.`
    );
  }
  const sections = blocks.filter((block) => block.lines.length > 0).map((block) => ({ lines: block.lines }));
  const sheet = sections.length === 0 ? null : { title: heading, seed: where.page || heading, sections };
  return { heading, source, blocks, document: sheet, findings };
}

/**
 * The page's own file name, read off the location it was loaded from.
 *
 * `""` where there is no location to read - a document built in a test, or one
 * loaded from a URL ending in a folder. The caller naming it is what
 * `options.page` is for, and the fallback below it is the `<title>`, so a page
 * with neither is still headed by something it wrote.
 *
 * @param {Document | null | undefined} owner
 * @returns {string}
 */
function pageName(owner) {
  const path = owner?.location?.pathname ?? owner?.defaultView?.location?.pathname ?? "";
  const last = String(path).split("/").filter((part) => part !== "").pop() ?? "";
  const dot = last.lastIndexOf(".");
  return dot > 0 ? last.slice(0, dot) : last;
}

/**
 * The cheatsheet section a loaded page builds out of its own elements.
 *
 * **Built and handed back rather than inserted**, because where it goes is the
 * page's decision and this module knows nothing about the page's layout. A
 * caller appends it where they want it, which is one line and is the line they
 * would have had to write to undo a guess.
 *
 * The shape is the one `tools/cheatsheet-site.mjs` writes, so a site can move
 * between the two routes without its stylesheet changing: a heading, the
 * composed figure, and a `<main>` per block carrying {@link CHEATSHEET_BLOCK}.
 *
 * **The material is cloned, never moved.** Moving the nodes would take the
 * marked material out of the page it was published on, which is the one thing
 * this must not do: the page is the site's, the section is an addition to it,
 * and a run that emptied half a page while adding a summary of it would be a
 * run nobody could undo with a reload.
 *
 * @param {ParentNode} root A document, or an element to search inside.
 * @param {{ title?: string, page?: string, compose?: boolean, className?: string, level?: number, document?: Document }} [options]
 * @returns {{ element: Element | null, heading: string, source: string, findings: string[] }}
 */
export function cheatsheetSection(root, options = {}) {
  const collected = collectFromDocument(root, options);
  const owner = options.document ?? root.ownerDocument ?? root;
  if (collected.blocks.length === 0) {
    return { element: null, heading: collected.heading, source: collected.source, findings: collected.findings };
  }
  const section = owner.createElement("section");
  section.className = options.className ?? SECTION_CLASS;
  // Rounded and defaulted before it is clamped, because clamping only answers
  // the two ends: `Math.max(NaN, 1)` is `NaN` and `Math.min(2.5, 6)` is `2.5`,
  // so a `level` of `"h3"` or of `2.5` would walk straight through a guard
  // written for 0 and 9 and ask for an `<hNaN>` or an `<h2.5>` - an element
  // name no outline reads, which is the thing this guard exists to refuse.
  const asked = Math.round(Number(options.level ?? 2));
  const level = Math.min(Math.max(Number.isFinite(asked) ? asked : 2, 1), 6);
  const title = owner.createElement(`h${level}`);
  title.textContent = collected.heading;
  section.append(title);
  if (options.compose !== false && collected.document !== null) {
    const figure = owner.createElement("div");
    // The surface's own fragment, set as markup because that is what it is: a
    // composed sheet is an `<svg>` element this module did not build and has no
    // business taking apart to re-create node by node.
    //
    // The name is slugged, by the surface's own derivation, because the seed it
    // is read off is a page's file name or its `<title>` - and a title is prose.
    // `cheatsheet-section-Getting Started` is an `id` holding whitespace, which
    // no `id` may, so it is invalid markup and `querySelector` refuses the
    // selector that would reach it. `slugFor` answers `sheet` for text that
    // slugs to nothing, which is why there is no fallback written here.
    figure.innerHTML = renderFragment(collected.document, {
      seed: collected.document.seed,
      id: `${SECTION_CLASS}-${slugFor(collected.document.seed)}`,
    });
    section.append(...[...(figure.childNodes ?? [])]);
  }
  for (const block of collected.blocks) {
    const main = owner.createElement("main");
    main.setAttribute(CHEATSHEET_BLOCK, block.tag);
    for (const child of [...(block.element.childNodes ?? [])]) main.append(child.cloneNode(true));
    section.append(main);
  }
  return { element: section, heading: collected.heading, source: collected.source, findings: collected.findings };
}
