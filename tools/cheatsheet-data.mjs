// Writes a whole cheatsheet site out of one data file: a page per entry, the
// master page carrying all of them, the manifest, and the menu.
//
//     node tools/cheatsheet-data.mjs <data file>
//     node tools/cheatsheet-data.mjs <data file> --format json|xml|html
//     node tools/cheatsheet-data.mjs <data file> --out <dir>
//     node tools/cheatsheet-data.mjs <data file> --dry-run
//     node tools/cheatsheet-data.mjs --help
//
// ## What this is for, and the one site the scanner cannot serve
//
// `tools/cheatsheet-site.mjs` runs against a site that already exists. It
// crawls the tree, reads the two markings off the pages it finds, and writes a
// section into a folder of somebody else's checkout - which is the whole of
// what it does, and the reason there is a second front end here: a site that
// is not written yet has no page to put a `data-cheatsheet` on. A new site, a
// site generated from a database, a set of notes somebody wants a cheatsheet
// section out of before there is anything to publish it beside: all of them
// have the material and none of them have the markup.
//
// ## A second front end, and emphatically not a second back end
//
// Everything past {@link sitePages} is imported rather than written here.
// `renderCheatsheet` and `renderMaster` write the pages, `plannedPages` says
// what a run writes, `manifestFor` records it, `renderMenu` builds the menu,
// `writePages` and `writeManifest` put them on disk, and `resolveOutput` and
// `readManifest` settle which folder they go in. So a cheatsheet generated
// from a data file and the same cheatsheet generated from marked up pages are
// **the same bytes**, which is a property of there being one writer rather
// than a coincidence two code paths are keeping up.
//
// What this file holds is therefore three things and no more: the contract a
// data file is written against, in {@link DATA_PROPERTIES}; the three readers
// that turn one of the three formats into a record satisfying it, in
// {@link DATA_FORMATS} and {@link readData}; and the walk from such a record to
// the `SitePage` objects the pipeline already reads, in {@link sitePages}.
//
// ## Three formats, one contract - and where the line between them falls
//
// JSON, XML and HTML are read, and a format decides exactly one thing: where a
// value is written. A property is the same word in all three, means the same
// thing, takes the same values, and is reported with the same path in a
// finding. {@link readData} hands back one record whichever file it read, so
// the contract, the findings, the pages, the render, the manifest and the menu
// are reached by one path - a format that produced `SitePage` objects of its
// own would be the second back end this route was shaped to avoid, and a third
// would be the third.
//
// In the two markup formats the shape follows from what an attribute can hold
// rather than from taste, which is what makes it a decision and not a
// preference: **a property that holds a list is an element, and every other
// property is an attribute**, because a list of records has nowhere to go in an
// attribute and neither has markup. The element one item of a list is written
// as is named by the contract as well - `entries` is `[ <entry>, ... ]` - so
// `<entries>` holding `<entry>` is read off the object rather than chosen here.
//
// The one difference of substance between the two markup formats is the one the
// item asking for them named: a block of material **is** markup, so XML carries
// it escaped or in a CDATA section and HTML carries it as written. That is
// HTML's whole advantage here, and for a file somebody writes by hand it is a
// large one.
//
// ## The data file is the comment method, said as data
//
// That is the sentence the whole mapping follows from. A page has two ways of
// saying what its material is - an attribute on the element wrapping it, and a
// `<!-- {% cheatsheet: [...] %} -->` comment in front of it - and the comment
// is the one that can say several things at once. A data file entry is a
// record with several fields, so the comment is what it maps onto: `heading`,
// `group` and `name` are `COMMENT_PROPERTIES` exactly, taken from that object
// rather than listed again here, and an entry carrying one is a page carrying
// that comment.
//
// The attribute is still in the mapping, because two of the markings have no
// comment form: `data-cheatsheet` is the element the material is read off, and
// `data-cheatsheet-menu` is where a menu goes. Both are tags and attributes
// rather than properties, which is what `material` and `menu` stand for.
//
// ## What a finding names
//
// A finding about the data file itself names the property's path in it -
// `entries[2].heading` - which is what a reader has to go and edit. A finding
// the shared pipeline composes names the page and a number, because that is
// what it says about a marked up page; for a data file site **that number is
// the entry's position in `entries`**, since a JSON record has no line of its
// own worth printing. One entry is one page, so the two together still point
// at exactly one record.
//
// Run with: node --test tools/test-cheatsheet-data.mjs
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { CHEATSHEET_BLOCK, prose } from "../api/cheatsheet/index.mjs";
import {
  ATTRIBUTE_METHOD,
  COMMENT_PROPERTIES,
  GENERATOR,
  MANIFEST_NAME,
  MARKER,
  MASTER_NAME,
  MASTER_SOURCE,
  MENU_MARKER,
  MENU_MODES,
  NAME_PATTERN,
  OUTPUT_NAME,
  PAGE_EXTENSIONS,
  cheatsheetDocument,
  commentOption,
  headingFor,
  manifestFor,
  menuEntries,
  nameCollisions,
  namingFindings,
  pageFolder,
  plannedPages,
  readManifest,
  renderMenu,
  resolveOutput,
  writeManifest,
  writePages,
} from "./cheatsheet-site.mjs";

/**
 * The version of this contract a data file may declare.
 *
 * Optional, and a file that declares nothing is read as this one - which is
 * what every hand written file will be for as long as there is one version. A
 * file declaring a **higher** number is refused rather than read, which is the
 * asymmetry worth stating: a later vocabulary means properties this tool does
 * not know, and reading it anyway would drop them silently and write a site
 * that looks like the one that was asked for.
 */
export const DATA_VERSION = 1;

/** The property a data file names its version in. */
export const VERSION_PROPERTY = "dataVersion";

/** The property holding the entries, one per page of the site. */
export const ENTRIES_PROPERTY = "entries";

/**
 * The element a block of material is read off, where an entry names none.
 *
 * **The preset half of the mapping.** A marked up page has an element whether
 * or not it meant to choose one - the material is inside something - and a data
 * file has no element at all, so one is supplied. It is recorded on the
 * generated page as `data-cheatsheet-block`, the same as the scanner records
 * the real tag it found, and it is `section` because that is what an element
 * wrapping a run of related material is: a `div` says nothing, and an `article`
 * claims the material stands alone, which a section of a cheatsheet does not.
 */
export const MATERIAL_TAG = "section";

/** The property a block of material holds its markup in. */
export const MATERIAL_MARKUP = "markup";

/** The property a block of material names its element in. */
export const MATERIAL_TAG_PROPERTY = "tag";

/**
 * The preset mapping: every property a data file carries, and the markup it
 * stands for.
 *
 * **This is the contract a new site is written against**, and it is one object
 * rather than a passage of prose for the reason {@link COMMENT_PROPERTIES} is:
 * the read below decides what a property is from this, the findings for a
 * property it does not know read the same list to say what the vocabulary is,
 * `docs/generating-from-a-site.html` tabulates it, and `USAGE` prints it. Five
 * readings of one object cannot disagree; five copies of a list can, and four
 * of them are the half nobody tests.
 *
 * **Three of the nine are not defined here at all.** `heading`, `group` and
 * `name` take their vocabulary and their description from
 * {@link COMMENT_PROPERTIES}, which is what a page can already say about its
 * own material. A third vocabulary beside the comment's and the DOM route's is
 * the failure this is shaped to rule out: not a vocabulary that disagrees
 * today, but one that can be edited into disagreeing on a day nobody is
 * looking at both files.
 *
 * Per property:
 *
 * - `scope` is `file` for a property of the data file and `entry` for one of a
 *   page in it.
 * - `markup` is what the property stands for in a marked up page, which is the
 *   mapping itself.
 * - `values` is the vocabulary it takes, or `null` where the value is the
 *   site's own text rather than one of a set - the same meaning the comment's
 *   properties give the field.
 * - `shape` is how the value is written, for the three whose value is neither
 *   text nor one of a set. Absent where `<text>` is the honest answer, which
 *   keeps the common case to the two fields the comment's properties have.
 * - `sets` is what it does, in the words a finding about it uses.
 * - `required` is set only where an entry without it stands for nothing.
 */
export const DATA_PROPERTIES = {
  [VERSION_PROPERTY]: {
    scope: "file",
    markup: "nothing - no page declares a version of the markings",
    values: null,
    shape: "<number>",
    sets: `which version of this contract the file is written against, where it is not ${DATA_VERSION}`,
  },
  menu: {
    scope: "file",
    markup: `${MENU_MARKER}="<mode>" on the element a page wants its menu in`,
    values: Object.keys(MENU_MODES),
    sets: "the mode the generated menu page is written in",
  },
  [ENTRIES_PROPERTY]: {
    scope: "file",
    required: true,
    markup: "the pages of the site the scanner crawls",
    values: null,
    shape: "[ <entry>, ... ]",
    sets: "the pages of the site, one entry each, in the order they are read",
  },
  page: {
    scope: "entry",
    required: true,
    markup: "the page's own path in the site",
    values: null,
    sets: "the path the entry stands for, which names the generated file and groups it",
  },
  title: {
    scope: "entry",
    markup: "<title>",
    values: null,
    sets: "the page's title, which is the default heading source",
  },
  heading: {
    scope: "entry",
    markup: `heading: <source> in a cheatsheet comment, or ${MARKER}="<source>"`,
    values: COMMENT_PROPERTIES.heading.values,
    sets: COMMENT_PROPERTIES.heading.sets,
  },
  group: {
    scope: "entry",
    markup: "group: <mode> in a cheatsheet comment",
    values: COMMENT_PROPERTIES.group.values,
    sets: COMMENT_PROPERTIES.group.sets,
  },
  name: {
    scope: "entry",
    markup: "name: <file> in a cheatsheet comment",
    values: COMMENT_PROPERTIES.name.values,
    sets: COMMENT_PROPERTIES.name.sets,
  },
  material: {
    scope: "entry",
    required: true,
    markup: `the markup a ${MARKER} element wraps, one block per element`,
    values: null,
    shape: "[ <block>, ... ]",
    sets: "the material the cheatsheet is composed and written from",
  },
};

/**
 * The file a run writes its menu into, in the generated folder.
 *
 * Not `index.html`, for the reason {@link MASTER_NAME} is not: the generated
 * folder is flat and a cheatsheet is named for the page or the folder it came
 * off, so `index.html` is the name a root entry gets and the commonest name
 * there is. This one can only be wanted by an entry literally called
 * `cheatsheet-menu.html` or by a `name` that asks for it, and either is
 * reported rather than written over.
 */
export const MENU_PAGE = "cheatsheet-menu.html";

/** The properties of a data file, as a sentence. */
function propertyList(scope) {
  return Object.entries(DATA_PROPERTIES)
    .filter(([, one]) => one.scope === scope)
    .map(([name]) => name)
    .join(", ");
}

/**
 * Whether a value is a plain object, which is what an entry and a block are.
 *
 * `typeof null` is `"object"` and so is an array's, and both are shapes a hand
 * written JSON file produces by accident - an entry written `[]` because the
 * material was pasted one level too high, an entry left `null` by a generator
 * that had nothing for it.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The properties of a record that the contract does not know, reported.
 *
 * Read off {@link DATA_PROPERTIES} rather than written out, which is the whole
 * reason it is data: a finding that named a vocabulary the read does not have
 * is a finding that sends somebody to write a property nothing will act on.
 *
 * @param {object} held
 * @param {string} scope
 * @param {string} at The property's path in the data file, for the finding.
 * @returns {string[]}
 */
function unknownProperties(held, scope, at) {
  const known = Object.entries(DATA_PROPERTIES)
    .filter(([, one]) => one.scope === scope)
    .map(([name]) => name);
  return Object.keys(held)
    .filter((name) => !known.includes(name))
    .map(
      (name) =>
        `${at}${name}: this is not a property of ${scope === "file" ? "a data file" : "an entry"}, so it ` +
        `was ignored. The properties it reads are ${propertyList(scope)}.`
    );
}

/**
 * One string property of a record, checked against its vocabulary.
 *
 * `undefined` for a property that is absent, of the wrong type, or outside the
 * vocabulary it has one - which is {@link readDirective}'s behaviour in the
 * scanner said in another shape: a value the vocabulary does not know is
 * reported and left out, so what reaches the walk is a value the tool can act
 * on and the page is still written.
 *
 * @param {object} held
 * @param {string} property
 * @param {string} at The record's path in the data file, for the finding.
 * @param {string[]} findings Appended to.
 * @returns {string | undefined}
 */
function stringProperty(held, property, at, findings) {
  const value = held[property];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    findings.push(
      `${at}${property}: ${JSON.stringify(value)} is ${Array.isArray(value) ? "an array" : typeof value} ` +
        `and this property takes text, so it was ignored. It sets ${DATA_PROPERTIES[property].sets}.`
    );
    return undefined;
  }
  const accepts = DATA_PROPERTIES[property].values;
  if (accepts !== null && !accepts.includes(value)) {
    findings.push(
      `${at}${property}: ${value} is not a value this property takes, so it was ignored. ` +
        `The values it reads are ${accepts.join(" and ")}.`
    );
    return undefined;
  }
  return value;
}

/**
 * What an entry's `page` may be: a site relative path, and nothing else.
 *
 * The value becomes the `id` of a page of a site that does not exist, and
 * everything downstream treats it as one: the folder it names decides which
 * cheatsheet the entry joins, the file name behind it is a heading source, and
 * {@link carryUrls} walks a relative URL in the material from it. So a leading
 * `/`, a drive letter or a `..` in it is a path that means something the
 * pipeline has no reading for, and the entry that carries one is dropped and
 * said rather than sanitised into a path nobody wrote.
 *
 * **Every segment names a folder or the file**, which is the same sentence read
 * one segment at a time and is why an empty one and a `.` are refused beside
 * the three above. `guide//arrays.html` is what string concatenation produces
 * when the folder it joined was already empty, and `./arrays.html` is a path
 * written the way a shell reads one rather than the way a site does: both name
 * a folder that is not there, and the pipeline reads the folder to decide which
 * cheatsheet the entry joins and what heads it. A trailing `/` goes with them,
 * naming no file at all.
 */
export const PAGE_PATTERN = /^(?!.*(?:^|\/)\.{1,2}(?:\/|$))[^\\:/]+(?:\/[^\\:/]+)*$/;

/**
 * One entry read into the shape the scanner's pipeline reads, or `null`.
 *
 * **Every block of material becomes a block the collector could have found**,
 * carrying the same fields: the element it was read off, the markup inside it,
 * and the properties a comment in front of it would have set. The three the
 * contract maps onto the comment go in `properties`, which is what
 * {@link commentOption} and `headingFor` read - so the data file wins over an
 * attribute for the same reason a comment does, there being no attribute here
 * to lose to.
 *
 * `line` is the entry's 1-based position, per this file's header: the shared
 * findings print a page and a number, and for a data file the number that
 * points at one record is which record it is.
 *
 * @param {unknown} entry
 * @param {number} at Its 0-based index in `entries`.
 * @param {string} path The data file's own path, for `page.path`.
 * @returns {{ page: object | null, findings: string[] }}
 */
function entryPage(entry, at, path) {
  /** @type {string[]} */
  const findings = [];
  const where = `${ENTRIES_PROPERTY}[${at}].`;
  if (!isRecord(entry)) {
    return {
      page: null,
      findings: [
        `${ENTRIES_PROPERTY}[${at}]: an entry is a record of properties and this is ` +
          `${Array.isArray(entry) ? "an array" : entry === null ? "null" : typeof entry}, so it was ` +
          `dropped. Its properties are ${propertyList("entry")}.`,
      ],
    };
  }
  findings.push(...unknownProperties(entry, "entry", where));
  const id = stringProperty(entry, "page", where, findings);
  if (id === undefined || id.trim().length === 0) {
    findings.push(
      `${where}page: an entry names the page it stands for and this one names none, so it was dropped. ` +
        `It sets ${DATA_PROPERTIES.page.sets}.`
    );
    return { page: null, findings };
  }
  if (!PAGE_PATTERN.test(id)) {
    findings.push(
      `${where}page: ${id} is not a path inside the site, so the entry was dropped. A page is named the ` +
        `way the site reads it - a relative path with / separators, with no leading slash, nothing ` +
        `walking out of the site with "..", and every segment naming a folder or the file.`
    );
    return { page: null, findings };
  }
  const title = stringProperty(entry, "title", where, findings);
  /** @type {Record<string, string>} */
  const properties = {};
  for (const property of ["heading", "group", "name"]) {
    const value = stringProperty(entry, property, where, findings);
    if (value === undefined) continue;
    if (property === "name" && !NAME_PATTERN.test(value)) {
      findings.push(
        `${where}name: ${value} is not a file name, so it was ignored and the cheatsheet kept the name ` +
          `its page gave it. A name is letters, digits, a dot, a dash or an underscore, starting with a ` +
          `letter or a digit - it becomes a file in the generated folder and nothing else.`
      );
      continue;
    }
    properties[property] = value;
  }
  const { blocks, findings: material } = materialBlocks(entry.material, where, properties, at + 1);
  findings.push(...material);
  return {
    page: {
      path,
      id,
      title: title ?? null,
      blocks,
      menus: [],
      newline: "\n",
      findings: [],
    },
    findings,
  };
}

/**
 * The blocks one entry's `material` reads as.
 *
 * Two shapes, because a block carrying nothing but markup is the common one and
 * a record for it is noise: a string is the markup with {@link MATERIAL_TAG}
 * behind it, and a record names the element itself.
 *
 * The properties the comment maps onto go on **every** block of the entry
 * rather than the first, which is the reading that makes {@link commentOption}
 * answer whichever block it happens to look at. A page says one thing about its
 * own heading however many elements it marked, and an entry is one page.
 *
 * @param {unknown} material
 * @param {string} where The entry's path in the data file, for the findings.
 * @param {Record<string, string>} properties
 * @param {number} line The entry's 1-based position.
 * @returns {{ blocks: object[], findings: string[] }}
 */
function materialBlocks(material, where, properties, line) {
  /** @type {string[]} */
  const findings = [];
  if (material === undefined) {
    return {
      blocks: [],
      findings: [
        `${where}material: the entry carries no material, so there was nothing to write a cheatsheet from ` +
          `and no page was written for it. It sets ${DATA_PROPERTIES.material.sets}.`,
      ],
    };
  }
  if (!Array.isArray(material)) {
    return {
      blocks: [],
      findings: [
        `${where}material: material is a list of blocks and this is ` +
          `${isRecord(material) ? "one record" : typeof material}, so no page was written for the entry. ` +
          `Write it as a list, with one block per element the markup would have been wrapped in.`,
      ],
    };
  }
  /** @type {object[]} */
  const blocks = [];
  for (const [at, block] of material.entries()) {
    const spot = `${where}material[${at}]`;
    if (typeof block === "string") {
      blocks.push(blockOf(MATERIAL_TAG, block, properties, line, blocks.length));
      continue;
    }
    if (!isRecord(block)) {
      findings.push(
        `${spot}: a block is markup or a record naming the element it came off, and this is ` +
          `${Array.isArray(block) ? "an array" : block === null ? "null" : typeof block}, so it was dropped.`
      );
      continue;
    }
    const named = Object.keys(block).filter(
      (one) => one !== MATERIAL_MARKUP && one !== MATERIAL_TAG_PROPERTY
    );
    for (const one of named) {
      findings.push(
        `${spot}.${one}: this is not a property of a block, so it was ignored. A block carries ` +
          `${MATERIAL_MARKUP}, and ${MATERIAL_TAG_PROPERTY} where the element it came off is worth ` +
          `recording.`
      );
    }
    const markup = block[MATERIAL_MARKUP];
    if (typeof markup !== "string") {
      findings.push(
        `${spot}.${MATERIAL_MARKUP}: a block holds its markup here and this is ` +
          `${markup === undefined ? "not set" : typeof markup}, so the block was dropped.`
      );
      continue;
    }
    const tag = block[MATERIAL_TAG_PROPERTY];
    if (tag !== undefined && (typeof tag !== "string" || !/^[A-Za-z][A-Za-z0-9-]*$/.test(tag))) {
      findings.push(
        `${spot}.${MATERIAL_TAG_PROPERTY}: ${JSON.stringify(tag)} is not an element name, so the block ` +
          `was recorded as <${MATERIAL_TAG}>. The name is written onto the generated page as ` +
          `${CHEATSHEET_BLOCK} and is read by nothing else.`
      );
    }
    const element =
      typeof tag === "string" && /^[A-Za-z][A-Za-z0-9-]*$/.test(tag) ? tag.toLowerCase() : MATERIAL_TAG;
    blocks.push(blockOf(element, markup, properties, line, blocks.length));
  }
  if (blocks.length === 0 && material.length > 0) {
    findings.push(
      `${where}material: every block of the entry was dropped, so no page was written for it.`
    );
  }
  return { blocks, findings };
}

/**
 * One block, in the shape {@link collectMarked} hands over.
 *
 * `method` is the attribute's, not the comment's, and that is deliberate rather
 * than a contradiction of this file's header. The method a block carries is
 * what a *finding* names - "the comment in front of it" against "the element
 * marked with" - and a data file has neither, so the sentence about an element
 * is the one that is nearly true: there is an element on the generated page
 * carrying the tag. The properties are still the comment's, because that is
 * where the pipeline reads what a page asked for.
 *
 * @param {string} tag
 * @param {string} content
 * @param {Record<string, string>} properties
 * @param {number} line
 * @param {number} at
 * @returns {object}
 */
function blockOf(tag, content, properties, line, at) {
  return {
    tag,
    value: "",
    content,
    line,
    method: ATTRIBUTE_METHOD,
    properties,
    at,
    reach: at,
  };
}

// ---------------------------------------------------------------------------
// ## The three formats, and the one contract under all of them
// ---------------------------------------------------------------------------

/**
 * The formats a data file may be written in.
 *
 * **One contract, three spellings of it.** {@link DATA_PROPERTIES} does not
 * fork per format: a property is the same word in all three, means the same
 * thing, takes the same values, and is reported with the same path in a
 * finding. A format decides only *where a value is written*, which is what
 * `holds` says - and if it decided anything more there would be three
 * contracts, which is the failure this route was shaped to rule out on the day
 * it had one.
 *
 * `markup` is the one field whose difference is substance rather than syntax,
 * and it is why a second and a third format were worth having at all: a block
 * of material **is** markup, and markup inside markup has to be escaped in JSON
 * and in XML and does not have to be escaped in HTML. That is HTML's whole
 * advantage here, and it is a large one for a file somebody writes by hand.
 *
 * `extensions` is what a file is read as when `--format` does not say. HTML's
 * are {@link PAGE_EXTENSIONS}, the scanner's own, rather than a second list
 * that agrees with it.
 */
export const DATA_FORMATS = {
  json: {
    extensions: [".json"],
    holds: "a property is a key, and a list property is an array",
    markup: "a string, with the < and the \" of it escaped",
  },
  xml: {
    extensions: [".xml"],
    holds: "a property is an attribute, and a list property is an element",
    markup: "the element's own text, escaped or in a CDATA section",
  },
  html: {
    extensions: PAGE_EXTENSIONS,
    holds: "a property is an attribute, and a list property is an element",
    markup: "the element's own markup, carried exactly as it was written",
  },
};

/**
 * The elements a document wraps its content in, which an HTML data file is read
 * through rather than against.
 *
 * A data file is read and never served, so the file element below is the one a
 * writer chose - but somebody writing HTML by hand reaches for a document, and
 * refusing one would be refusing the format's own habit. So these three are
 * stepped over on the way in, and a file written as a fragment and the same
 * file written as a page read identically.
 */
export const WRAPPER_ELEMENTS = ["html", "head", "body"];

/**
 * The wrapper that is stepped past rather than into.
 *
 * `<head>` is the half of a document that carries no content, and it is the one
 * wrapper whose children must not be looked at: a page's `<title>` is not a
 * wrapper, so the search below would take it as the file element and read a
 * data file out of the document's title.
 */
const DOCUMENT_HEAD = "head";

/** The entities XML defines, which is all five of them. */
const XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Spans that look like markup and are not, in either markup format. */
const DATA_OPAQUE = [
  { open: "<!--", close: "-->" },
  { open: "<![CDATA[", close: "]]>" },
];

/**
 * The format a path is read as, or `null` where its extension names none.
 *
 * @param {string} path
 * @returns {string | null}
 */
export function formatOf(path) {
  const lower = path.toLowerCase();
  for (const [name, one] of Object.entries(DATA_FORMATS)) {
    if (one.extensions.some((ext) => lower.endsWith(ext))) return name;
  }
  return null;
}

/**
 * What one item of a list property is called, read out of the property's shape.
 *
 * The singular is already in the contract: `entries` is written
 * `[ <entry>, ... ]` and `material` is written `[ <block>, ... ]`, so the
 * element a markup format nests inside the list is named by the object rather
 * than by a second list beside it. `<entries>` holding `<entry>` is the shape a
 * reader of the JSON would have guessed, and it is that shape because the JSON
 * says so.
 *
 * @param {string | undefined} shape
 * @returns {string | null}
 */
function itemName(shape) {
  const match = /<([A-Za-z]+)>/.exec(shape ?? "");
  return match === null ? null : match[1];
}

/**
 * The list properties of one scope, each with the element one item of it is.
 *
 * A list property is one whose shape opens a bracket, which is the contract
 * saying it holds items rather than a value - and holding items is the whole
 * of why a markup format writes it as an element. An attribute carries one
 * string: a list of records has nowhere to go in one, and neither has markup.
 *
 * @param {string} scope
 * @returns {Array<{ name: string, item: string | null }>}
 */
function listProperties(scope) {
  return Object.entries(DATA_PROPERTIES)
    .filter(([, one]) => one.scope === scope && typeof one.shape === "string" && one.shape.startsWith("["))
    .map(([name, one]) => ({ name, item: itemName(one.shape) }));
}

/**
 * Whether an element holds one of the file scope's list elements, which is what
 * tells the file element apart from anything written beside it.
 *
 * Read off {@link DATA_PROPERTIES} like every other question about shape, so a
 * list property added to the contract is one more thing that identifies a file
 * without this being edited.
 *
 * The findings the probe produces are thrown away deliberately. This asks what
 * an element *is*, and an element that turns out not to be the file is not a
 * fault in the file - a heading above the data is a heading, and reporting the
 * contract at it would be reporting the wrong element.
 *
 * @param {string} text
 * @param {{ from: number, to: number }} element
 * @param {string} format
 * @returns {boolean}
 */
function holdsFileList(text, element, format) {
  const lists = listProperties("file");
  return elementsIn(text, element.from, element.to, format, "", []).some((child) =>
    lists.some((list) => list.name === child.name)
  );
}

/**
 * Where an opaque span opening at `at` ends, or `null` where none opens there.
 *
 * An unclosed opener swallows the rest of the file, which is what a browser
 * does with an unclosed comment and is the reading that cannot invent content:
 * whatever followed was never going to be read as markup.
 *
 * @param {string} text
 * @param {number} at
 * @returns {number | null}
 */
function opaqueAt(text, at) {
  for (const { open, close } of DATA_OPAQUE) {
    if (!text.startsWith(open, at)) continue;
    const end = text.indexOf(close, at + open.length);
    return end === -1 ? text.length : end + close.length;
  }
  return null;
}

/**
 * The start tag opening at `at`, scanned rather than searched for.
 *
 * `startTagAt` in the scanner, for the reason that one exists: a `>` inside a
 * quoted attribute value is a character of the value and not the end of the
 * tag, and `indexOf(">")` reads `<entry title="a>b" page="x.html">` as two
 * elements and loses the page.
 *
 * @param {string} text
 * @param {number} at Offset of the `<`.
 * @returns {{ start: number, end: number } | null} `null` where the tag never ends.
 */
function scanTag(text, at) {
  if (text[at] !== "<") return null;
  /** The quote character of the value being scanned, or `""` outside one. */
  let quote = "";
  /** An `=` has been read and the value it introduces has not started yet. */
  let awaiting = false;
  for (let i = at + 1; i < text.length; i += 1) {
    const char = text[i];
    if (quote !== "") {
      if (char === quote) quote = "";
      continue;
    }
    if (char === ">") return { start: at, end: i };
    if (char === "=") {
      awaiting = true;
      continue;
    }
    if (awaiting && (char === '"' || char === "'")) {
      quote = char;
      awaiting = false;
      continue;
    }
    if (!/\s/.test(char)) awaiting = false;
  }
  return null;
}

/**
 * The element name of the tag at `at`, lower cased, or `""` where there is none.
 *
 * @param {string} text
 * @param {number} at
 * @returns {string}
 */
function nameAt(text, at) {
  const match = /^<\/?([A-Za-z][A-Za-z0-9:._-]*)/.exec(text.slice(at, at + 80));
  return match === null ? "" : match[1].toLowerCase();
}

/**
 * The tag that closes an element named `name`, counting nesting.
 *
 * Opaque spans are skipped on both sides of the count, which is the half that
 * matters for this route rather than a precaution: a block of material in XML
 * is written `<![CDATA[...]]>` precisely so it can hold the markup a data file
 * is about, and that markup may hold the word this is counting. A commented out
 * entry is the same case from the other end.
 *
 * @param {string} text
 * @param {string} name Lower cased.
 * @param {number} from
 * @param {number} to
 * @returns {{ start: number, end: number } | null}
 */
function closeOf(text, name, from, to) {
  let depth = 1;
  let at = from;
  while (at < to) {
    const open = text.indexOf("<", at);
    if (open === -1 || open >= to) return null;
    const opaque = opaqueAt(text, open);
    if (opaque !== null) {
      at = opaque;
      continue;
    }
    if (text.startsWith("</", open)) {
      const closing = /^<\/([A-Za-z][A-Za-z0-9:._-]*)\s*>/.exec(text.slice(open, open + 80));
      if (closing !== null && closing[1].toLowerCase() === name) {
        depth -= 1;
        if (depth === 0) return { start: open, end: open + closing[0].length };
      }
      at = open + (closing === null ? 2 : closing[0].length);
      continue;
    }
    // A doctype, a processing instruction, or anything else opening `<!` or
    // `<?`: not an element, and never a nesting level.
    if (text.startsWith("<!", open) || text.startsWith("<?", open)) {
      const end = text.indexOf(">", open);
      at = end === -1 ? to : end + 1;
      continue;
    }
    const tag = scanTag(text, open);
    if (tag === null) return null;
    // `<entry/>` opens and closes in one tag, so it is not a level either.
    if (nameAt(text, open) === name && text[tag.end - 1] !== "/") depth += 1;
    at = tag.end + 1;
  }
  return null;
}

/**
 * The element children of a span, in the order they are written.
 *
 * Direct children only: a nested element belongs to whichever child holds it,
 * and the walk steps over that child's whole span rather than into it. Which is
 * what keeps a block of material out of the structure entirely - the content of
 * a `<block>` is markup and is never scanned for elements, so an `<entry>` in a
 * code sample is a code sample.
 *
 * @param {string} text
 * @param {number} from
 * @param {number} to
 * @param {string} format
 * @param {string} where The path of the holder, for a finding.
 * @param {string[]} findings Appended to.
 * @returns {Array<{ name: string, tag: { start: number, end: number }, from: number, to: number }>}
 */
function elementsIn(text, from, to, format, where, findings) {
  /** @type {Array<{ name: string, tag: { start: number, end: number }, from: number, to: number }>} */
  const found = [];
  let at = from;
  while (at < to) {
    const open = text.indexOf("<", at);
    if (open === -1 || open >= to) break;
    const opaque = opaqueAt(text, open);
    if (opaque !== null) {
      at = opaque;
      continue;
    }
    // A closing tag *inside* the span, which is always a stray one: the holder's
    // own sits at `to`, and the check above has already ended the walk on it.
    // Reported rather than broken on quietly, because everything after it goes
    // unread - a second `<entry>` below a mismatched `</wrong>` would be a page
    // missing from the generated site with nothing said about it, which is the
    // one failure this reader is not allowed to have. It is the same loss an
    // element that is never closed causes, and that one has always said so.
    if (text.startsWith("</", open)) {
      const name = nameAt(text, open);
      findings.push(
        `${where}${name === "" ? "a closing tag" : `</${name}>`}: the tag at line ${lineOf(text, open)} ` +
          `closes an element that was not opened here, so everything from it was left unread. A data ` +
          `file written in ${format} opens every element it closes - there is no recovery here, because ` +
          `the structure is the contract.`
      );
      break;
    }
    if (text.startsWith("<!", open) || text.startsWith("<?", open)) {
      const end = text.indexOf(">", open);
      at = end === -1 ? to : end + 1;
      continue;
    }
    const tag = scanTag(text, open);
    const name = nameAt(text, open);
    if (tag === null || name === "") {
      findings.push(
        `${where}a tag opens at line ${lineOf(text, open)} and is never ended, so everything from it ` +
          `was left unread.`
      );
      break;
    }
    if (text[tag.end - 1] === "/") {
      found.push({ name, tag, from: tag.end + 1, to: tag.end + 1 });
      at = tag.end + 1;
      continue;
    }
    const close = closeOf(text, name, tag.end + 1, to);
    if (close === null) {
      findings.push(
        `${where}<${name}>: the element opened at line ${lineOf(text, open)} is never closed, so ` +
          `everything from it was left unread. A data file written in ${format} closes every element it ` +
          `opens - there is no recovery here, because the structure is the contract.`
      );
      break;
    }
    found.push({ name, tag, from: tag.end + 1, to: close.start });
    at = close.end;
  }
  return found;
}

/**
 * The line an offset falls on, counting from 1.
 *
 * `lineAt` in the scanner, which this does not import for the one reason worth
 * a copy: the scanner's is about a page the generated site links back to, and
 * this is about a file the reader is being sent to edit. They answer the same
 * question and are owed to different readers.
 *
 * @param {string} text
 * @param {number} at
 * @returns {number}
 */
function lineOf(text, at) {
  let line = 1;
  for (let i = 0; i < Math.min(at, text.length); i += 1) if (text[i] === "\n") line += 1;
  return line;
}

/**
 * XML's five entities and its numeric references, decoded.
 *
 * Five rather than HTML's whole table, because five is what XML defines and a
 * data file is not a page: a `&nbsp;` in an attribute of a data file is a file
 * written against a vocabulary that does not exist, and leaving it as written
 * is what lets the reader see that. The markup **inside** a block is never
 * touched by this at all.
 *
 * @param {string} text
 * @returns {string}
 */
function decodeXml(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body) => {
    const numeric = body.startsWith("#x") || body.startsWith("#X") ? 16 : body.startsWith("#") ? 10 : 0;
    if (numeric !== 0) {
      const code = Number.parseInt(body.slice(numeric === 16 ? 2 : 1), numeric);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    // `Object.hasOwn`, because `XML_ENTITIES` is an object literal and
    // `&constructor;` would otherwise reach a function and be interpolated into
    // the file's content as its source.
    const named = body.toLowerCase();
    return Object.hasOwn(XML_ENTITIES, named) ? XML_ENTITIES[named] : whole;
  });
}

/**
 * The text content of an XML element, as the markup it stands for.
 *
 * CDATA is taken literally and everything outside it is decoded, which is the
 * difference between the two ways XML lets a writer carry markup through text.
 * An unclosed CDATA section takes the rest of the content, for the reason
 * {@link opaqueAt} gives.
 *
 * @param {string} raw
 * @returns {string}
 */
function decodeXmlContent(raw) {
  let out = "";
  let at = 0;
  while (at < raw.length) {
    const open = raw.indexOf("<![CDATA[", at);
    if (open === -1) {
      out += decodeXml(raw.slice(at));
      break;
    }
    out += decodeXml(raw.slice(at, open));
    const close = raw.indexOf("]]>", open + 9);
    if (close === -1) {
      out += raw.slice(open + 9);
      break;
    }
    out += raw.slice(open + 9, close);
    at = close + 3;
  }
  return out;
}

/**
 * One block's markup, out of the element that holds it.
 *
 * **Trimmed at its ends and nowhere else.** A block of material is markup and
 * whitespace inside markup is sometimes the content - a `<pre>` listing is the
 * case this route exists to carry - so nothing is re-indented and nothing
 * inside is collapsed. The ends are trimmed because an element written over
 * several lines holds the newline after its start tag, and a writer who put a
 * block on its own line did not mean to add one.
 *
 * @param {string} text
 * @param {{ from: number, to: number }} element
 * @param {string} format
 * @returns {string}
 */
function markupOf(text, element, format) {
  const raw = text.slice(element.from, element.to).trim();
  return format === "html" ? raw : decodeXmlContent(raw);
}

/**
 * One element's attributes, in the order they are written.
 *
 * **The case is kept**, unlike a browser's reading of an HTML attribute, for
 * one reason: `dataVersion` has some. The contract names a property one way and
 * a file that spells it another way is a file written against a vocabulary that
 * is not this one, which is a finding rather than something to guess at.
 *
 * An attribute written with no value at all is `""`, which is also what
 * `page=""` is - and both reach the same finding, since an entry that names no
 * page names none either way.
 *
 * @param {string} tag The whole start tag, angle brackets included.
 * @returns {Array<[string, string]>}
 */
function attributesOf(tag) {
  /** @type {Array<[string, string]>} */
  const found = [];
  let at = 1;
  // The element name, which is not an attribute and ends at the first thing
  // that could start one.
  while (at < tag.length && !/[\s/>]/.test(tag[at])) at += 1;
  while (at < tag.length) {
    // A `/` between attributes is legal and is not part of a name, which keeps
    // `<entry page="x.html" />` reading as one attribute rather than two.
    while (at < tag.length && /[\s/]/.test(tag[at])) at += 1;
    if (at >= tag.length || tag[at] === ">") break;
    const nameFrom = at;
    while (at < tag.length && !/[\s=/>]/.test(tag[at])) at += 1;
    const name = tag.slice(nameFrom, at);
    if (name === "") {
      at += 1;
      continue;
    }
    let after = at;
    while (after < tag.length && /\s/.test(tag[after])) after += 1;
    if (tag[after] !== "=") {
      found.push([name, ""]);
      continue;
    }
    at = after + 1;
    while (at < tag.length && /\s/.test(tag[at])) at += 1;
    const quote = tag[at] === '"' || tag[at] === "'" ? tag[at] : "";
    const from = quote === "" ? at : at + 1;
    at = from;
    if (quote === "") while (at < tag.length && !/[\s>]/.test(tag[at])) at += 1;
    else while (at < tag.length && tag[at] !== quote) at += 1;
    found.push([name, decodeXml(tag.slice(from, at))]);
    if (quote !== "") at += 1;
  }
  return found;
}

/**
 * An element written where the contract wants an attribute, or an element the
 * contract has no property for at all, reported.
 *
 * Both sentences are read off {@link DATA_PROPERTIES}, as every other finding
 * about a property is: a message that named a shape the reader does not accept
 * is a message that sends somebody to write a file this will report again.
 *
 * @param {string} where
 * @param {string} name Lower cased, as the element was read.
 * @param {string} scope
 * @param {Array<{ name: string, item: string | null }>} lists
 * @param {string} format
 * @returns {string}
 */
function shapeFinding(where, name, scope, lists, format) {
  const one = Object.hasOwn(DATA_PROPERTIES, name) ? DATA_PROPERTIES[name] : undefined;
  if (one !== undefined && one.scope === scope) {
    return (
      `${where}${name}: this property carries a value rather than a list, so in ${format} it is the ` +
      `attribute ${name}="..." and the element was ignored. It sets ${one.sets}.`
    );
  }
  const held = lists.map((list) => `<${list.name}>`).join(" and ");
  const valued = Object.entries(DATA_PROPERTIES)
    .filter(([one, held]) => held.scope === scope && !lists.some((list) => list.name === one))
    .map(([one]) => one)
    .join(", ");
  return (
    `${where}<${name}>: ${scope === "file" ? "a data file" : "an entry"} holds ` +
    `${held.length === 0 ? "no elements" : held} and nothing else as an element, so this was ignored. ` +
    `The properties written as attributes are ${valued}.`
  );
}

/**
 * One element read as a record of the properties the contract gives its scope.
 *
 * The record is built on a null prototype, which is the one place a markup
 * format needs care that JSON does not: `JSON.parse` makes a `__proto__` key an
 * ordinary own property, and assigning the same name onto an object literal
 * sets that object's prototype instead - so the property would vanish from
 * `Object.keys`, go unreported as one the contract does not know, and leave the
 * reader with a record it could not see the fault in.
 *
 * @param {string} text
 * @param {{ tag: { start: number, end: number }, from: number, to: number }} element
 * @param {string} scope
 * @param {string} where The record's path in the data file, for the findings.
 * @param {string} format
 * @param {string[]} findings Appended to.
 * @returns {object}
 */
function recordOf(text, element, scope, where, format, findings) {
  const record = Object.create(null);
  const lists = listProperties(scope);
  for (const [name, value] of attributesOf(text.slice(element.tag.start, element.tag.end + 1))) {
    const list = lists.find((one) => one.name === name);
    if (list !== undefined) {
      findings.push(
        `${where}${name}: this property holds a list, so in ${format} it is the element <${name}> ` +
          `carrying one <${list.item}> per item, and the attribute was ignored.`
      );
      continue;
    }
    const one = Object.hasOwn(DATA_PROPERTIES, name) ? DATA_PROPERTIES[name] : undefined;
    // The one conversion a markup format needs. Every attribute is text, and
    // the contract has exactly one property whose value is a number - which
    // `sitePages` compares against `DATA_VERSION` with `!==`, so `"1"` read as
    // text would refuse a file declaring the version this tool reads.
    const numeric = one?.shape === "<number>" && value.trim() !== "" && Number.isFinite(Number(value));
    record[name] = numeric ? Number(value) : value;
  }
  for (const child of elementsIn(text, element.from, element.to, format, where, findings)) {
    const list = lists.find((one) => one.name === child.name);
    if (list === undefined) {
      findings.push(shapeFinding(where, child.name, scope, lists, format));
      continue;
    }
    record[list.name] = itemsOf(text, child, list, scope, where, format, findings);
  }
  return record;
}

/**
 * The items one list element holds, as the records the contract reads.
 *
 * Two kinds, because the contract has two list properties and they hold
 * different things: `entries` holds records of the entry scope, and `material`
 * holds blocks, which are not a scope of the contract at all but the two
 * properties {@link blockOf} needs.
 *
 * @param {string} text
 * @param {{ from: number, to: number }} holder
 * @param {{ name: string, item: string | null }} list
 * @param {string} scope The scope the list belongs to.
 * @param {string} where
 * @param {string} format
 * @param {string[]} findings Appended to.
 * @returns {object[]}
 */
function itemsOf(text, holder, list, scope, where, format, findings) {
  /** @type {object[]} */
  const items = [];
  for (const child of elementsIn(text, holder.from, holder.to, format, `${where}${list.name}: `, findings)) {
    if (list.item === null || child.name !== list.item.toLowerCase()) {
      findings.push(
        `${where}${list.name}: <${child.name}> is not one of these, so it was ignored. ` +
          `${list.name} carries one <${list.item}> per item.`
      );
      continue;
    }
    const spot = `${where}${list.name}[${items.length}]`;
    if (scope === "file") {
      items.push(recordOf(text, child, "entry", `${spot}.`, format, findings));
      continue;
    }
    const block = Object.create(null);
    for (const [name, value] of attributesOf(text.slice(child.tag.start, child.tag.end + 1))) {
      if (name === MATERIAL_MARKUP) {
        findings.push(
          `${spot}.${MATERIAL_MARKUP}: the markup of a block is what the element holds in ${format}, not ` +
            `an attribute of it, so the attribute was ignored. The markup is ` +
            `${DATA_FORMATS[format].markup}.`
        );
        continue;
      }
      block[name] = value;
    }
    block[MATERIAL_MARKUP] = markupOf(text, child, format);
    items.push(block);
  }
  return items;
}

/**
 * A data file's text read into the record {@link sitePages} reads.
 *
 * **This is the whole of what a format is.** Three readers hand back the same
 * record, and everything after it - the contract, the findings, the pages, the
 * render, the manifest, the menu - is reached by one path. A format that
 * produced `SitePage` objects of its own would be the second back end the JSON
 * route was shaped to avoid, and a third would be the third.
 *
 * `refused` is a file nothing could be read out of at all, worded to follow the
 * file's own path in a message. It is not a finding: a finding is something
 * wrong with part of a file a site was still written out of.
 *
 * @param {string} text
 * @param {string} format One of {@link DATA_FORMATS}.
 * @returns {{ data: unknown, findings: string[], refused: string | null }}
 */
export function readData(text, format) {
  /** @type {string[]} */
  const findings = [];
  if (format === "json") {
    try {
      return { data: JSON.parse(text), findings, refused: null };
    } catch (error) {
      // The parser's own message, which names the offset it gave up at and is
      // more use than anything this could say instead.
      return { data: null, findings, refused: `is not JSON. ${error.message}` };
    }
  }
  let children = elementsIn(text, 0, text.length, format, "", findings);
  /** @type {{ tag: { start: number, end: number }, from: number, to: number } | null} */
  let file = null;
  // The file element is the outermost one a writer chose, which in HTML means
  // stepping over the document's own wrappers to find it. Bounded rather than
  // recursive: `html > body > the file` is two levels and a file that needs
  // four is not a document, it is a mistake worth reporting as one.
  for (let depth = 0; depth < 3 && file === null && children.length > 0; depth += 1) {
    const candidates =
      format === "html"
        ? children.filter((one) => !WRAPPER_ELEMENTS.includes(one.name))
        : children.slice(0, 1);
    // Among them the file element is the one holding the file's own list, not
    // simply the first. A document's body holds whatever prose a writer put
    // around the data, and `<h1>The cheatsheets</h1>` above it is the ordinary
    // case rather than a stretch - taking the first non-wrapper there reads the
    // heading as the file and reports that `entries` is not set, about a file
    // that plainly sets it. The first is the fallback, so a document holding no
    // list at all still reaches that finding against the element a writer meant
    // as the file. XML has one root and so has one candidate, which this leaves
    // exactly as it was.
    const chosen = candidates.find((one) => holdsFileList(text, one, format)) ?? candidates[0];
    if (chosen !== undefined) {
      file = chosen;
      break;
    }
    children = children
      .filter((one) => one.name !== DOCUMENT_HEAD)
      .flatMap((one) => elementsIn(text, one.from, one.to, format, "", findings));
  }
  if (file === null) {
    const holding = listProperties("file")
      .map((list) => `<${list.name}>`)
      .join(" and ");
    return {
      data: null,
      findings,
      refused:
        `is not ${format}: no element was found to read a data file out of. The outermost element is the ` +
        `file itself, whatever it is named, and it holds ${holding}.`,
    };
  }
  return { data: recordOf(text, file, "file", "", format, findings), findings, refused: null };
}

/**
 * A data file read into the pages of the site it describes.
 *
 * The one function this route adds to the pipeline, and the whole of what it
 * adds: everything it hands back is what {@link collectSite} hands back, so the
 * plan, the render, the manifest and the menu are the scanner's.
 *
 * `pages` is empty for a file nothing could be read out of, which the pipeline
 * already handles - it is a site that marked nothing, and nothing is written at
 * all rather than an empty folder being left in somebody's tree.
 *
 * `refused` is set where nothing could be read at all - a file that is not a
 * record, one declaring a version this does not know, one with no `entries` -
 * and is the one outcome that is not a finding: a finding is something wrong
 * with part of a file this tool still wrote a site out of.
 *
 * @param {unknown} data What the data file parsed to.
 * @param {string} [path] The data file's own path, for `page.path`.
 * @returns {{ pages: object[], menu: string | null, findings: string[], refused: string | null }}
 */
export function sitePages(data, path = "") {
  /** @type {string[]} */
  const findings = [];
  if (!isRecord(data)) {
    return {
      pages: [],
      menu: null,
      findings,
      refused:
        `a data file is a record of properties and this is ` +
        `${Array.isArray(data) ? "an array" : data === null ? "null" : typeof data}. Its properties are ` +
        `${propertyList("file")}.`,
    };
  }
  // The version before anything else is read, because a file written for a
  // later vocabulary is a file this cannot be trusted to have understood.
  const declared = data[VERSION_PROPERTY];
  if (declared !== undefined && declared !== DATA_VERSION) {
    return {
      pages: [],
      menu: null,
      findings,
      refused:
        `${VERSION_PROPERTY} ${JSON.stringify(declared)} is not a version of this contract that ` +
        `${GENERATOR} reads, so nothing was written. This tool reads ${DATA_VERSION}.`,
    };
  }
  findings.push(...unknownProperties(data, "file", ""));
  const entries = data[ENTRIES_PROPERTY];
  if (!Array.isArray(entries)) {
    return {
      pages: [],
      menu: null,
      findings,
      refused:
        `${ENTRIES_PROPERTY} is the pages of the site and is ` +
        `${entries === undefined ? "not set" : isRecord(entries) ? "one record" : typeof entries}, so ` +
        `nothing was written. Write it as a list, with one entry per page.`,
    };
  }
  const asked = stringProperty(data, "menu", "", findings);
  /** @type {object[]} */
  const pages = [];
  /** Keyed without case, because the generated folder may be on a filesystem that ignores it. */
  /** @type {Map<string, string>} */
  const claimed = new Map();
  for (const [at, entry] of entries.entries()) {
    const read = entryPage(entry, at, path);
    findings.push(...read.findings);
    if (read.page === null) continue;
    const owner = claimed.get(read.page.id.toLowerCase());
    if (owner !== undefined) {
      findings.push(
        `${ENTRIES_PROPERTY}[${at}].page: ${read.page.id} is the page ${owner} already stands for, so this ` +
          `entry was dropped. One entry per page: two records of one page are two readings of the same ` +
          `material, and a path that differs only in case is one path on a filesystem that ignores case.`
      );
      continue;
    }
    claimed.set(read.page.id.toLowerCase(), `${ENTRIES_PROPERTY}[${at}]`);
    pages.push(read.page);
  }
  for (const page of pages) {
    // What the entry asked its heading to be read from, which is the scanner's
    // own judgement run against a page built here: an entry that asked for a
    // title it did not give is the one it has something to say about. The
    // sentences name the page rather than the entry, as every finding the
    // shared pipeline composes does.
    findings.push(...headingFor(page).findings);
    // And the one ask that needs the page rather than the property: a page
    // knows whether it has a folder and a `group` does not. `collectSite` says
    // this for the same reason and in nearly the same words.
    const grouping = commentOption(page, "group");
    if (grouping !== null && grouping.value === "folder" && pageFolder(page) === "") {
      findings.push(
        `${ENTRIES_PROPERTY}[${grouping.line - 1}].group: folder asks this page to join its folder's ` +
          `cheatsheet and the page is at the site root, so it has no folder to join and is a cheatsheet ` +
          `of its own. Name it inside a folder, or drop the property.`
      );
    }
  }
  // A `menu` the vocabulary does not know has already been reported and left
  // out, so no menu is written for it - which is what "ignored" means for the
  // one property whose absence is also an answer.
  return { pages, menu: asked ?? null, findings, refused: null };
}

/**
 * The menu page, as the markup of a whole document.
 *
 * The one page this route writes that the scanner has no equivalent of, and the
 * reason it needs one: a marked up site has pages of its own for a menu to be
 * spliced into, and a data file site is nothing but the generated folder. So
 * the menu is a page of that folder - the front door, holding the menu and its
 * heading and nothing else.
 *
 * It is {@link renderMenu} inside {@link cheatsheetDocument}, both imported, so
 * the menu a data file site carries is the same markup a marked up site is
 * filled with and the head is the same head every generated page has.
 *
 * @param {string} mode One of {@link MENU_MODES}.
 * @param {Array<{ target: string, text: string, master: boolean }>} entries
 * @param {string} where The output folder, relative to the data file's own folder.
 * @param {object[]} sources The pages the site was read from, for the head.
 * @returns {string}
 */
export function renderMenuPage(mode, entries, where, sources) {
  const heading = prose(MENU_PAGE.replace(/\.html$/, ""));
  const pageId = where === "." ? MENU_PAGE : `${where}/${MENU_PAGE}`;
  return cheatsheetDocument(heading, sources, [
    `<h1>${heading}</h1>`,
    renderMenu(mode, entries, pageId, "", "\n"),
  ]);
}

/**
 * The flags that take a value, so the one positional can be told from them.
 *
 * A list rather than a test on the next token, because the next token after
 * `--format` is a word with no dash on it and so is the data file: without
 * this, `--format xml site.xml` reads `xml` as the file and reports that it
 * could not be read.
 */
const VALUE_FLAGS = ["--out", "--format"];

/** What `--help` prints. */
export const USAGE = [
  "Usage: node tools/cheatsheet-data.mjs <data file> [--format <fmt>] [--out <dir>] [--dry-run]",
  "",
  "Reads one data file and writes a whole cheatsheet site out of it: a page",
  `per entry, ${MASTER_NAME} carrying all of them, ${MENU_PAGE} to move`,
  "between them, and the manifest that records the folder.",
  "",
  "  <data file>   The file to read. Required.",
  `  --format <f>  ${Object.keys(DATA_FORMATS).join(", ")}. Read from the extension when not given.`,
  `  --out <dir>   Write here instead of resolving ${OUTPUT_NAME}/ beside the file.`,
  "  --dry-run     Report the folder and the pages it would write, and touch nothing.",
  "  --help        Print this.",
  "",
  "The pages are the same pages tools/cheatsheet-site.mjs writes, by the same",
  "functions: a data file says in one file what a marked up page says in an",
  "attribute or a comment, and nothing past the read is different.",
  "",
  "The three formats, and where each writes a value:",
  "",
  ...formatLines(),
  "",
  "One contract under all three. A property is the same word, means the same",
  "thing, takes the same values and is reported with the same path whichever",
  "format it is written in; only where the value sits changes. In xml and html a",
  "property that holds a list is an element carrying one child per item, and",
  "every other property is an attribute - because a list of records has nowhere",
  "to go in an attribute, and neither has markup.",
  "",
  "A data file:",
  "",
  "  {",
  `    "${ENTRIES_PROPERTY}": [`,
  "      {",
  '        "page": "guide/arrays.html",',
  '        "title": "Working with arrays",',
  '        "material": ["<h2>splice</h2><p>Removes and inserts in place.</p>"]',
  "      }",
  "    ]",
  "  }",
  "",
  "The same file in xml, and in html, where the markup needs no escaping:",
  "",
  '  <cheatsheets>',
  `    <${ENTRIES_PROPERTY}>`,
  `      <${itemName(DATA_PROPERTIES[ENTRIES_PROPERTY].shape)} page="guide/arrays.html" title="Working with arrays">`,
  "        <material>",
  `          <${itemName(DATA_PROPERTIES.material.shape)}><h2>splice</h2><p>Removes and inserts in place.</p></${itemName(DATA_PROPERTIES.material.shape)}>`,
  "        </material>",
  `      </${itemName(DATA_PROPERTIES[ENTRIES_PROPERTY].shape)}>`,
  `    </${ENTRIES_PROPERTY}>`,
  "  </cheatsheets>",
  "",
  "The outermost element is the file itself and its name is yours; html steps",
  `over ${WRAPPER_ELEMENTS.map((one) => `<${one}>`).join(", ")} to reach it, so a fragment and a whole page read the same.`,
  `In html the file is the element holding ${listProperties("file")
    .map((list) => `<${list.name}>`)
    .join(" and ")}, so a heading or a paragraph written`,
  "around the data in a document's body is prose and is stepped over too.",
  "In xml a block's markup is escaped or wrapped in a CDATA section; in html it",
  "is carried exactly as written, trimmed at its ends and not re-indented.",
  "",
  "The properties of the file:",
  "",
  ...propertyLines("file"),
  "",
  "The properties of an entry:",
  "",
  ...propertyLines("entry"),
  "",
  "A block of material is markup, or a record naming the element it came off:",
  "",
  `  "material": [{ "${MATERIAL_TAG_PROPERTY}": "table", "${MATERIAL_MARKUP}": "<table>...</table>" }]`,
  "",
  `Written as markup alone it is recorded as <${MATERIAL_TAG}>, which is what the`,
  `generated page carries as ${CHEATSHEET_BLOCK}.`,
  "",
  "A folder is a cheatsheet, as it is for a crawled site: two entries named",
  "guide/one.html and guide/two.html are written as guide.html, headed for the",
  "folder, with a section each in the order the entries are listed.",
  "",
  `A property this does not know, or a value it does not take, is reported with`,
  "its path in the file and ignored. An entry that names no page, or names one",
  "twice, is reported and dropped.",
  "",
  "The folder this writes is published as a site of its own - the document root",
  "of a subdomain, say - which is the default because a data file site has no",
  `site to be a section of, and ${MENU_PAGE} is its front door.`,
  "Publishing it as a section of a site works too, on the condition that nothing",
  "in the folder points out of it: grep it for '=\"../' to see, since a flat",
  "folder of self-contained pages writes nothing else that way. The whole rule",
  'is under "Where the generated folder is published" in',
  "docs/generating-from-a-site.html.",
].join("\n");

/**
 * The properties of one scope, as the column `--help` prints.
 *
 * Read off {@link DATA_PROPERTIES} for the reason everything else about it is:
 * the usage text is the fifth reading of that object and the one a site owner
 * meets first.
 *
 * @param {string} scope
 * @returns {string[]}
 */
function propertyLines(scope) {
  const named = Object.entries(DATA_PROPERTIES).filter(([, one]) => one.scope === scope);
  const widest = Math.max(...named.map(([name, one]) => writtenAs(name, one).length));
  return named.map(([name, one]) => `  ${writtenAs(name, one).padEnd(widest + 3)}${one.sets}`);
}

/**
 * The formats, as the column `--help` prints.
 *
 * Read off {@link DATA_FORMATS} for the reason {@link propertyLines} is read
 * off the contract: a format added to the object and not to this text is a
 * format nobody is told about.
 *
 * @returns {string[]}
 */
function formatLines() {
  const named = Object.entries(DATA_FORMATS);
  const widest = Math.max(...named.map(([name, one]) => `${name} (${one.extensions.join(", ")})`.length));
  return named.map(
    ([name, one]) => `  ${`${name} (${one.extensions.join(", ")})`.padEnd(widest + 3)}${one.holds}`
  );
}

/**
 * One property as it is written in a data file, with its vocabulary where it
 * has one.
 *
 * @param {string} name
 * @param {{ values: string[] | null, shape?: string, required?: boolean }} one
 * @returns {string}
 */
function writtenAs(name, one) {
  const value = one.shape ?? (one.values === null ? "<text>" : one.values.join(" | "));
  return `${name}: ${value}${one.required === true ? "" : "   (optional)"}`;
}

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
  const positional = argv.filter(
    (arg, at) => !arg.startsWith("-") && !VALUE_FLAGS.includes(argv[at - 1])
  );
  if (positional.length === 0) {
    process.stderr.write(`cheatsheet-data: name the data file to read.\n\n${USAGE}\n`);
    return 2;
  }
  const file = resolve(positional[0]);
  // The format before the read, because it decides what the read is. `--format`
  // wins over the extension rather than being checked against it: a file named
  // `.txt`, or named nothing recognisable, is the case the flag is for, and a
  // flag that had to agree with the name would answer nothing.
  const asked = flag("--format");
  const format = asked === undefined ? formatOf(file) : String(asked).toLowerCase();
  if (format === null) {
    process.stderr.write(
      `cheatsheet-data: ${file} has no extension this reads, so there is nothing to say which format it ` +
        `is written in. The extensions it reads are ${Object.values(DATA_FORMATS)
          .flatMap((one) => one.extensions)
          .join(", ")}; --format ${Object.keys(DATA_FORMATS).join("|")} says it outright.\n`
    );
    return 2;
  }
  if (!Object.hasOwn(DATA_FORMATS, format)) {
    process.stderr.write(
      `cheatsheet-data: ${format} is not a format this reads. It reads ` +
        `${Object.keys(DATA_FORMATS).join(", ")}.\n`
    );
    return 2;
  }
  /** @type {string} */
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    process.stderr.write(`cheatsheet-data: ${file} could not be read.\n`);
    return 2;
  }
  const parsed = readData(text, format);
  if (parsed.refused !== null) {
    for (const finding of parsed.findings) process.stderr.write(`cheatsheet-data: ${finding}\n`);
    process.stderr.write(`cheatsheet-data: ${file} ${parsed.refused}\n`);
    return 2;
  }
  const data = parsed.data;

  // The data file's own folder is the site, which is what makes the output
  // folder the same question it is for a crawled site: the ladder, the manifest
  // a previous run recorded, and `--out` ahead of both.
  const root = dirname(file);
  const named = flag("--out");
  const dry = argv.includes("--dry-run");
  const found = named === undefined ? await readManifest(root) : null;
  const out =
    named !== undefined
      ? { path: resolve(named), name: named, tried: [], recorded: false }
      : found !== null
        ? { path: found.path, name: found.name, tried: [], recorded: true }
        : { ...(await resolveOutput(root)), recorded: false };
  const where = relative(root, out.path).split(sep).join("/") || ".";

  const read = sitePages(data, file);
  if (read.refused !== null) {
    for (const finding of [...parsed.findings, ...read.findings])
      process.stderr.write(`cheatsheet-data: ${finding}\n`);
    process.stderr.write(`cheatsheet-data: ${read.refused}\n`);
    return 2;
  }
  const pages = read.pages;
  const findings = [
    ...parsed.findings,
    ...read.findings,
    ...nameCollisions(pages),
    ...namingFindings(pages),
  ];
  const planned = plannedPages(pages);
  const manifest = planned.length > 0 ? manifestFor(where, planned) : null;

  // The menu, which is a page of the generated folder here rather than a splice
  // into somebody else's. It can collide over a name like any other page, and
  // is reported rather than written over for the same reason the master page is.
  const wanted = read.menu;
  /** @type {string | null} */
  let menu = null;
  if (wanted !== null && manifest === null) {
    findings.push(
      `menu: ${wanted} asks for a menu and nothing could be read out of the entries, so there is nothing ` +
        `to put in one and no menu page was written. Give an entry some material first.`
    );
  } else if (wanted !== null) {
    const taken = planned.find((one) => one.name.toLowerCase() === MENU_PAGE.toLowerCase());
    if (taken !== undefined) {
      findings.push(
        `menu: ${wanted} asks for a menu and ${taken.sources.join(", ")} is already written as ` +
          `${MENU_PAGE}, so no menu page was written. Rename that cheatsheet, or drop the menu.`
      );
    } else {
      menu = renderMenuPage(wanted, menuEntries(manifest, where), where, pages);
    }
  }

  // Nothing before this point has touched the disk, which is what makes
  // `--dry-run` the absence of three calls rather than a mode of its own - the
  // same shape the scanner's own run has.
  const made = dry ? [] : await writePages(pages, out.path, where);
  if (!dry && manifest !== null) await writeManifest(out.path, manifest);
  if (!dry && menu !== null) await writeFile(join(out.path, MENU_PAGE), menu, "utf8");

  process.stdout.write(
    [
      // Two counts rather than one, as the scanner reports pages crawled and
      // pages marked: an entry that was read and an entry that had anything to
      // write a cheatsheet from are different numbers, and a run where they
      // differ is a run with findings under it saying why.
      `${pages.length} entr${pages.length === 1 ? "y" : "ies"} read from ` +
        `${relative(root, file).split(sep).join("/")}, ` +
        `${pages.filter((page) => page.blocks.length > 0).length} with material`,
      // Which of the three readers answered, because `--format` overrides the
      // extension and a file read as the wrong format is the one fault whose
      // findings every one of them read as the file being wrong instead.
      `read as          ${format}${asked === undefined ? "" : "  (--format)"}`,
      `output folder    ${where}`,
      ...(out.recorded ? [`                 read from ${MANIFEST_NAME}`] : []),
      ...(out.tried.length > 1 ? [`names tried      ${out.tried.join(", ")}`] : []),
      `pages ${dry ? "to write   " : "written    "}${dry ? planned.length : made.length}`,
      // Every source of a cheatsheet, because a grouped entry naming only the
      // first would read as the others having been dropped. The master page is
      // named for the pages it concatenates rather than for its own sources,
      // which are every entry of the file and are already on the lines under it.
      ...planned.map((one, at) =>
        one.headingSource === MASTER_SOURCE
          ? `  ${planned
              .slice(at + 1)
              .map((part) => part.name)
              .join(", ")} -> ${one.name} (${MASTER_SOURCE})`
          : `  ${one.sources.join(", ")} -> ${one.name} (${one.headingSource})`
      ),
      `menu ${dry ? "to write    " : "written     "}${menu === null ? "0" : `1  ${MENU_PAGE} (${wanted})`}`,
      ...(dry ? ["nothing was written, because --dry-run"] : []),
      "",
    ].join("\n")
  );
  for (const finding of findings) process.stderr.write(`cheatsheet-data: ${finding}\n`);
  // A finding is something in the data file this tool could not read, which is
  // the file owner's to fix and not a reason to report success. What it could
  // read is written either way, for the reason the scanner writes the pages it
  // could read: somebody fixing one entry should not have to wait for the whole
  // folder to regenerate.
  return findings.length === 0 ? 0 : 1;
}

// Run only when this file is the entry point, so a test can import the pieces
// above and call the same functions a reader runs.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
