// Writes a whole cheatsheet site out of one JSON data file: a page per entry,
// the master page carrying all of them, the manifest, and the menu.
//
//     node tools/cheatsheet-data.mjs <data file>
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
// What this file holds is therefore two things and no more: the contract a
// data file is written against, in {@link DATA_PROPERTIES}, and the walk from
// a file that satisfies it to the `SitePage` objects the pipeline already
// reads.
//
// ## The data file is the comment method, said in JSON
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

/** What `--help` prints. */
export const USAGE = [
  "Usage: node tools/cheatsheet-data.mjs <data file> [--out <dir>] [--dry-run]",
  "",
  "Reads one JSON data file and writes a whole cheatsheet site out of it: a page",
  `per entry, ${MASTER_NAME} carrying all of them, ${MENU_PAGE} to move`,
  "between them, and the manifest that records the folder.",
  "",
  "  <data file>   The JSON file to read. Required.",
  `  --out <dir>   Write here instead of resolving ${OUTPUT_NAME}/ beside the file.`,
  "  --dry-run     Report the folder and the pages it would write, and touch nothing.",
  "  --help        Print this.",
  "",
  "The pages are the same pages tools/cheatsheet-site.mjs writes, by the same",
  "functions: a data file says in JSON what a marked up page says in an attribute",
  "or a comment, and nothing past the read is different.",
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
  const positional = argv.filter((arg, at) => !arg.startsWith("-") && argv[at - 1] !== "--out");
  if (positional.length === 0) {
    process.stderr.write(`cheatsheet-data: name the data file to read.\n\n${USAGE}\n`);
    return 2;
  }
  const file = resolve(positional[0]);
  /** @type {string} */
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    process.stderr.write(`cheatsheet-data: ${file} could not be read.\n`);
    return 2;
  }
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    // The parser's own message, which names the offset it gave up at and is
    // more use than anything this could say instead.
    process.stderr.write(`cheatsheet-data: ${file} is not JSON. ${error.message}\n`);
    return 2;
  }

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
    for (const finding of read.findings) process.stderr.write(`cheatsheet-data: ${finding}\n`);
    process.stderr.write(`cheatsheet-data: ${read.refused}\n`);
    return 2;
  }
  const pages = read.pages;
  const findings = [...read.findings, ...nameCollisions(pages), ...namingFindings(pages)];
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
