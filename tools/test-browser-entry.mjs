// What `api/cheatsheet/site.mjs` promises, held against a hand written stub of
// the DOM.
//
// ## Why a stub and not a browser
//
// The repository's browser tests drive Chromium through Playwright and skip
// with the install command where it is absent, which is the right shape for a
// case about how a page *looks*. This is a case about what a module *reads*,
// and skipping it would mean the browser entry point had no coverage at all on
// the bare clone the suite is required to run on - so the DOM it needs is
// written out here instead.
//
// The stub is therefore also the statement of how small that surface is. Nine
// members, and every one of them is in every DOM a browser has shipped for
// twenty years:
//
//     querySelectorAll   getAttribute   hasAttribute   contains
//     childNodes         createElement  append         cloneNode
//     innerHTML
//
// A tenth would be worth noticing. The module is held to the list by this file
// failing to provide anything else.
//
// **The tree is built rather than parsed.** A stub that took a string of HTML
// would be a parser, and a parser written for a test is a second reading of
// markup to disagree with the one under test. Every case below assembles its
// page out of the stub's own `createElement`, which is what a page built by a
// framework does - and that is exactly the page the scripted tool cannot read.
//
// ## The questions
//
//   1. **Are the right elements found?** Outermost wins, a marking inside
//      another is part of it, and an attribute whose name merely starts the
//      same way is a different attribute.
//   2. **Does a page get the heading it asked for?** The two sources, the
//      default, and the three findings `headingFor` makes about a file.
//   3. **Is the material read as rows a sheet can be set from?** Headings keep
//      their role, inline elements do not break a line, a script contributes
//      nothing, and whitespace collapses.
//   4. **Is the section the same shape the scripted tool writes?** A heading, a
//      composed figure, and a `<main>` per block - with the material cloned
//      rather than moved, which is the one thing this must never get wrong.
//
// Run with: node --test tools/test-browser-entry.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cheatsheetSection,
  collectFromDocument,
  headingOf,
  linesOf,
  markedElements,
  prose,
  BREAKING_ELEMENTS,
  CHEATSHEET_BLOCK,
  CHEATSHEET_MARKER,
  CHEATSHEET_MENU_MARKER,
  HEADING_ELEMENTS,
  OPAQUE_ELEMENTS,
  SECTION_CLASS,
} from "../api/cheatsheet/site.mjs";

/** The two node types the walk reads, as the DOM numbers them. */
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** A text node, which is a type and a string and nothing else. */
class StubText {
  constructor(data) {
    this.nodeType = TEXT_NODE;
    this.data = String(data);
    this.parentNode = null;
  }

  cloneNode() {
    return new StubText(this.data);
  }
}

/**
 * What an `innerHTML` setter leaves behind.
 *
 * The one place the stub cannot pretend to be a DOM: setting `innerHTML` parses
 * markup, and nothing here parses anything. So the markup is kept as the one
 * child it produced, which is true of the markup the module actually sets - a
 * fragment is a single wrapping `<div>`.
 */
class StubRaw {
  constructor(markup) {
    this.nodeType = ELEMENT_NODE;
    this.tagName = "DIV";
    this.markup = markup;
    this.childNodes = [];
    this.parentNode = null;
  }

  cloneNode() {
    return new StubRaw(this.markup);
  }
}

/** An element: a name, attributes, children and a parent. */
class StubElement {
  constructor(tag, owner) {
    this.nodeType = ELEMENT_NODE;
    this.tagName = String(tag).toUpperCase();
    this.ownerDocument = owner;
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(String(name).toLowerCase(), String(value));
  }

  getAttribute(name) {
    const key = String(name).toLowerCase();
    return this.attributes.has(key) ? this.attributes.get(key) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(String(name).toLowerCase());
  }

  get className() {
    return this.getAttribute("class") ?? "";
  }

  set className(value) {
    this.setAttribute("class", value);
  }

  set textContent(value) {
    this.childNodes = [];
    this.append(new StubText(value));
  }

  get textContent() {
    return this.childNodes
      .map((child) => (child.nodeType === TEXT_NODE ? child.data : (child.textContent ?? "")))
      .join("");
  }

  set innerHTML(markup) {
    this.childNodes = [];
    this.append(new StubRaw(markup));
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }

  contains(other) {
    for (let at = other; at !== null && at !== undefined; at = at.parentNode) {
      if (at === this) return true;
    }
    return false;
  }

  cloneNode(deep) {
    const copy = new StubElement(this.tagName, this.ownerDocument);
    for (const [name, value] of this.attributes) copy.setAttribute(name, value);
    if (deep) copy.append(...this.childNodes.map((child) => child.cloneNode(true)));
    return copy;
  }

  querySelectorAll(selector) {
    // `[attribute]` and nothing else, which is the only form the module writes.
    const attribute = /^\[([a-z-]+)\]$/.exec(selector)?.[1];
    assert.ok(attribute !== undefined, `the stub was handed a selector it does not implement: ${selector}`);
    const found = [];
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType !== ELEMENT_NODE) continue;
        if (child.hasAttribute?.(attribute)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

/** A document: a title, a location, a root and a factory. */
class StubDocument extends StubElement {
  constructor({ title = "", path = "" } = {}) {
    super("#document", null);
    this.ownerDocument = null;
    this.title = title;
    this.location = { pathname: path };
  }

  createElement(tag) {
    return new StubElement(tag, this);
  }
}

/**
 * A page built out of the stub's own API.
 *
 * `build` is handed the document and a helper that makes an element in one
 * call, so a case reads as the tree it is rather than as twenty appends.
 *
 * @param {{ title?: string, path?: string }} about
 * @param {(tools: { doc: StubDocument, el: Function, text: Function }) => void} build
 * @returns {StubDocument}
 */
function pageOf(about, build) {
  const doc = new StubDocument(about);
  /** @param {string} tag @param {Record<string, string>} attributes @param {Array} children */
  const el = (tag, attributes = {}, children = []) => {
    const element = doc.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    element.append(...children.map((child) => (typeof child === "string" ? new StubText(child) : child)));
    return element;
  };
  const text = (value) => new StubText(value);
  build({ doc, el, text });
  return doc;
}

// ## 1. What is found

test("the outermost marked element wins, and a marking inside it is part of it", () => {
  // The same rule `collectMarked` applies to a file: material already collected
  // is not collected a second time. `contains` is what answers it here.
  let outer = null;
  let inner = null;
  let beside = null;
  const doc = pageOf({ title: "Acme" }, ({ doc: root, el }) => {
    inner = el("pre", { [CHEATSHEET_MARKER]: "" }, ["nested"]);
    outer = el("section", { [CHEATSHEET_MARKER]: "title" }, [el("p", {}, ["prose"]), inner]);
    beside = el("div", { [CHEATSHEET_MARKER]: "" }, ["beside"]);
    root.append(el("body", {}, [outer, beside]));
  });
  assert.deepEqual(markedElements(doc), [outer, beside]);
  assert.ok(!markedElements(doc).includes(inner), "a marking inside collected material was collected twice");
});

test("the menu attribute is not the marker, and is reported rather than collected", () => {
  // An attribute selector matches a whole name, so the DOM gets for free what
  // the file scan has to test the next character for. What the module adds is
  // the sentence: this route writes no folder, so there is nothing for a menu
  // to list.
  const doc = pageOf({ title: "Acme" }, ({ doc: root, el }) => {
    root.append(
      el("body", {}, [
        el("nav", { [CHEATSHEET_MENU_MARKER]: "dropdown" }, ["handwritten"]),
        el("div", { [CHEATSHEET_MARKER]: "" }, ["material"]),
      ])
    );
  });
  assert.equal(markedElements(doc).length, 1);
  const { findings } = collectFromDocument(doc);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /carries data-cheatsheet-menu, which this route cannot fill/);
  assert.match(findings[0], /Run tools\/cheatsheet-site\.mjs for that/);
});

// ## 2. The heading

test("the marker's value chooses the heading, and the default is the page's title", () => {
  const titled = (value) => {
    const doc = pageOf({ title: "Acme Reference", path: "/docs/someGuidePage.html" }, ({ doc: root, el }) => {
      root.append(el("body", {}, [el("div", { [CHEATSHEET_MARKER]: value }, ["material"])]));
    });
    return collectFromDocument(doc);
  };
  // `title` reads the page's own title, left exactly as it was written.
  assert.equal(titled("title").heading, "Acme Reference");
  // `page` reads its file name, as prose - one conversion, the same one a
  // generated file name gets.
  assert.equal(titled("page").heading, "Some Guide Page");
  assert.equal(titled("page").source, "page");
  // No value at all, and the empty string a template with an empty variable
  // emits, both name no source and take the default with no finding.
  for (const value of ["", "   "]) {
    assert.equal(titled(value).heading, "Acme Reference");
    assert.deepEqual(titled(value).findings, []);
  }
  // Trimmed and lower cased before matching, because an attribute is typed.
  assert.equal(titled(" Page ").source, "page");
});

test("what a page gets wrong about its heading is a finding, not a guess", () => {
  const read = (values, about = { title: "Acme", path: "/base64Utils.html" }) => {
    const doc = pageOf(about, ({ doc: root, el }) => {
      root.append(el("body", {}, values.map((value) => el("div", { [CHEATSHEET_MARKER]: value }, ["x"]))));
    });
    return collectFromDocument(doc);
  };
  // A value naming no source: ignored, said, and the default used anyway so the
  // section is still built.
  const unknown = read(["heading"]);
  assert.equal(unknown.heading, "Acme");
  assert.match(unknown.findings[0], /data-cheatsheet="heading" names no heading source/);
  assert.match(unknown.findings[0], /The values it reads are title and page/);
  // Two sources named on one page: the first in document order wins.
  const both = read(["page", "title"]);
  assert.equal(both.source, "page");
  assert.match(both.findings[0], /ask for two different headings on one page/);
  // `title` asked for on a page that has none: the file name answers, and that
  // is worth saying because nobody wrote it down.
  const untitled = read(["title"], { title: "", path: "/base64Utils.html" });
  assert.equal(untitled.heading, "Base 64 Utils");
  assert.match(untitled.findings[0], /asks for this page's title and the page has none/);
  // And the same page with no ask at all gets the same heading and no finding:
  // the default has a documented fallback and the ask does not.
  assert.deepEqual(read([""], { title: "", path: "/base64Utils.html" }).findings, []);
});

// ## 3. The rows

test("the material reads as rows, with a label kept as a label", () => {
  const doc = pageOf({ title: "Acme" }, ({ doc: root, el }) => {
    root.append(
      el("body", {}, [
        el("section", { [CHEATSHEET_MARKER]: "title" }, [
          el("h2", {}, ["Splicing"]),
          el("p", {}, ["Remove and insert in ", el("strong", {}, ["one"]), " call."]),
          el("table", {}, [
            el("caption", {}, ["Arguments"]),
            el("tr", {}, [el("th", {}, ["start"]), el("td", {}, ["where it begins"])]),
          ]),
        ]),
      ])
    );
  });
  const [block] = markedElements(doc);
  assert.deepEqual(linesOf(block), [
    // A heading, a caption and a header cell are labels for what follows them,
    // and the design language sets a label as a comment row.
    { text: "Splicing", role: "comment" },
    // An inline element is not a line break: the sentence stays a sentence, and
    // the text either side of the `<strong>` joins it rather than making rows.
    { text: "Remove and insert in one call.", role: "plain" },
    { text: "Arguments", role: "comment" },
    { text: "start", role: "comment" },
    { text: "where it begins", role: "plain" },
  ]);
});

test("an opaque element contributes nothing, and whitespace collapses", () => {
  // The chart case: a chart brings a script with it, and what the script says is
  // not a row of anything.
  const doc = pageOf({ title: "Acme" }, ({ doc: root, el }) => {
    root.append(
      el("body", {}, [
        el("figure", { [CHEATSHEET_MARKER]: "" }, [
          el("figcaption", {}, ["  Monthly   totals  "]),
          el("canvas", { id: "chart" }, []),
          el("script", {}, ["const row = '<div>12</div>'; draw(row);"]),
          el("style", {}, [".chart { color: red; }"]),
          el("template", {}, ["inert markup"]),
        ]),
      ])
    );
  });
  const [block] = markedElements(doc);
  assert.deepEqual(linesOf(block), [{ text: "Monthly totals", role: "comment" }]);
  // Which is the same answer the scripted tool gives the same markup, by the
  // same three lists - this is the half that walks a tree rather than a pattern.
  for (const name of ["script", "style"]) assert.ok(OPAQUE_ELEMENTS.includes(name));
  assert.ok(HEADING_ELEMENTS.includes("figcaption") && BREAKING_ELEMENTS.includes("td"));
});

test("material a sheet cannot be set from gets no document, and says so", () => {
  const doc = pageOf({ title: "Pictures" }, ({ doc: root, el }) => {
    root.append(el("body", {}, [el("div", { [CHEATSHEET_MARKER]: "" }, [el("img", { src: "chart.png" }, [])])]));
  });
  const collected = collectFromDocument(doc);
  assert.equal(collected.document, null);
  assert.match(collected.findings[0], /holds no text, so it sets no row of the sheet/);
  // The markup is still carried onto the section, which is what the finding
  // says and is the half that makes it a note rather than a refusal.
  const { element } = cheatsheetSection(doc);
  assert.equal(element.childNodes.filter((node) => node.tagName === "MAIN").length, 1);
});

// ## 4. The section

test("the section is the shape the scripted tool writes, and the material is cloned", () => {
  let marked = null;
  const doc = pageOf({ title: "Acme Reference", path: "/guide.html" }, ({ doc: root, el }) => {
    marked = el("section", { [CHEATSHEET_MARKER]: "title" }, [el("h3", {}, ["Splice"]), el("p", {}, ["Remove."])]);
    root.append(el("body", {}, [marked]));
  });
  const { element, heading, findings } = cheatsheetSection(doc);
  assert.deepEqual(findings, []);
  assert.equal(heading, "Acme Reference");
  assert.equal(element.tagName, "SECTION");
  assert.equal(element.className, SECTION_CLASS);
  const [title, figure, main] = element.childNodes;
  // A heading at level 2 by default, because the page already has an `<h1>` of
  // its own and a section appended into it is part of that page's outline.
  assert.equal(title.tagName, "H2");
  assert.equal(title.textContent, "Acme Reference");
  // The composed figure, which is the published surface's own fragment: the
  // page and a media file of this sheet are two renders of one composition.
  assert.match(figure.markup, /^<div class="cheatsheet" role="img" aria-label="Acme Reference cheat sheet">/);
  assert.match(figure.markup, /<svg id="cheatsheet-section-guide"[^>]*viewBox="0 0 3600 3600"/);
  // Named by the surface's own slug, because the seed it reads is a file name or
  // a `<title>` and a title is prose. An `id` may hold no ASCII whitespace, so
  // `cheatsheet-section-Getting Started` would be invalid markup and the
  // selector that reaches it would not parse.
  const titled = pageOf({ title: "Getting Started" }, ({ doc: root, el }) => {
    root.append(el("body", {}, [el("div", { [CHEATSHEET_MARKER]: "" }, ["Install the thing."])]));
  });
  const named = /<svg id="([^"]+)"/.exec(cheatsheetSection(titled).element.childNodes[1].markup)[1];
  assert.equal(named, "cheatsheet-section-getting-started");
  assert.doesNotMatch(named, /\s/, `${named} is an id holding whitespace`);
  // And a `<main>` per block, naming the element it came off.
  assert.equal(main.tagName, "MAIN");
  assert.equal(main.getAttribute(CHEATSHEET_BLOCK), "section");
  assert.equal(main.textContent, "SpliceRemove.");
  // Cloned, never moved. Moving the nodes would take the material out of the
  // page it was published on, which is the one thing this must not do - and it
  // is the failure that looks like working, since the section would be right.
  assert.equal(marked.childNodes.length, 2);
  assert.equal(marked.childNodes[0].textContent, "Splice");
  assert.ok(!main.childNodes.includes(marked.childNodes[0]), "the material was moved rather than cloned");
});

test("the figure is refused, the level is clamped, and a page with no marking builds nothing", () => {
  const doc = pageOf({ title: "Acme", path: "/guide.html" }, ({ doc: root, el }) => {
    root.append(el("body", {}, [el("div", { [CHEATSHEET_MARKER]: "" }, ["material"])]));
  });
  // `compose: false` is for a caller that wants the material arranged and will
  // render the sheet itself, or not at all.
  const plain = cheatsheetSection(doc, { compose: false });
  assert.deepEqual(
    plain.element.childNodes.map((node) => node.tagName),
    ["H2", "MAIN"]
  );
  // The level is a number a caller passes, so it is held to the six that exist
  // rather than writing an `<h0>` nothing can outline.
  assert.equal(cheatsheetSection(doc, { compose: false, level: 9 }).element.childNodes[0].tagName, "H6");
  assert.equal(cheatsheetSection(doc, { compose: false, level: 0 }).element.childNodes[0].tagName, "H1");
  // The two a clamp alone does not reach, because `Math.max(NaN, 1)` is `NaN`
  // and 2.5 is between the ends: both would name an element rather than being
  // held to six, which is the failure this guard is for rather than a nicety.
  for (const level of ["h3", 2.5, {}, NaN]) {
    const named = cheatsheetSection(doc, { compose: false, level }).element.childNodes[0].tagName;
    assert.match(named, /^H[1-6]$/, `level ${JSON.stringify(level)} asked for an <${named.toLowerCase()}>`);
  }
  // A page that marked nothing gets no section, the same way the scripted tool
  // writes no page for one: there is nothing to suppress, because there was
  // never anything to build.
  const bare = pageOf({ title: "Acme" }, ({ doc: root, el }) => root.append(el("body", {}, ["nothing"])));
  const empty = cheatsheetSection(bare);
  assert.equal(empty.element, null);
  assert.deepEqual(empty.findings, []);
});

test("prose is the one conversion, and it is the surface's", () => {
  // Re-exported by `tools/cheatsheet-site.mjs` rather than written twice, so a
  // name read as a heading by either route is one answer. The four breaks a
  // real name has, which is what that file's own cases hold in full.
  assert.equal(prose("somePageName"), "Some Page Name");
  assert.equal(prose("parseHTMLString"), "Parse HTML String");
  assert.equal(prose("base64Encode"), "Base 64 Encode");
  assert.equal(prose("my-page_name"), "My Page Name");
  assert.equal(prose("---"), "");
});

test("the heading reader takes the page's own words for its title and name", () => {
  // Called directly, because a caller that has the elements already should not
  // have to hand over a document to ask what the heading is - which is also
  // what makes the module testable without a location at all.
  const doc = pageOf({}, () => {});
  const marker = (value) => {
    const element = doc.createElement("div");
    element.setAttribute(CHEATSHEET_MARKER, value);
    return element;
  };
  assert.deepEqual(headingOf([marker("page")], { title: "Ignored", page: "splicingArrays" }), {
    heading: "Splicing Arrays",
    source: "page",
    findings: [],
  });
  // Neither a title nor a name is an empty heading rather than a guess: there
  // is nothing on the page to read one off.
  assert.equal(headingOf([marker("")], {}).heading, "");
});
