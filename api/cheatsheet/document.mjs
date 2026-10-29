// The cheatsheet document model: what a sheet says, with nothing about how it
// is drawn.
//
// ## What this is, and what was here before it
//
// Since the composition algorithm was written, a "document" in this layer has
// meant the minimum the six drawn regions need: a title, a subtitle and an
// array of code lines, each line optionally naming the colour role it is set
// in. `compose.mjs` calls that shape **provisional** in its own header and in
// the output of `tools/cheatsheet.mjs --data-only`, because it was never a
// model of a cheatsheet - it was a list of the arguments the drawing needed.
//
// Thirty-three readers of that shape exist, twenty-eight of them the
// `sheet.json` documents in the catalog, so it is not going anywhere and this
// file does not replace it. What it adds is the model the shape was standing
// in for: a title, ordered **sections**, and **entries** carrying a term, a
// signature and a description.
//
// ## Why the two coexist rather than one superseding the other
//
// They answer different questions, and the difference is the reason the formal
// model is worth having:
//
// | | Provisional | Formal |
// | --- | --- | --- |
// | An example is | lines of text with a colour each | entries with a term, a signature and a description |
// | Reordering it means | editing an array of strings | moving an entry |
// | A term can be | found by reading the lines | read off the field |
// | Drawn how | one line per row of the panel | however the layout says |
//
// The provisional shape has the drawing baked into it: a line is a row,
// because a row is what it was written to fill. A formal document says what
// the sheet is *about* and leaves every question of rows, columns, colours and
// sizes to the theme and the layout. That is the whole of what "independent of
// how any of it is drawn" buys, and it is why `code` and `sections` are
// alternatives rather than a field and its replacement.
//
// ## Neither shape is coerced into the other here
//
// A formal document becomes drawable through the **layout**, in `layout.mjs`,
// which is what decides that a section title is a comment row and an entry is
// a comment row and a signature row. That decision is a drawing decision, so
// putting it here would undo the independence this file exists for in the
// first function below it.
//
// What this file owns is the shape and its refusals: the two schemas, the
// reader that applies them, and the one predicate that says which shape is in
// hand.

import { assertValid } from "./schema.mjs";

/**
 * The colour roles a provisional code line may declare.
 *
 * The same six `SYNTAX` in `language.mjs` paints, named here so a document
 * declaring a role nobody paints is refused by the schema rather than drawn in
 * the fallback colour and left looking deliberate.
 */
export const CODE_ROLES = ["plain", "comment", "identifier", "keyword", "string", "number"];

/**
 * One line of the example, in the provisional shape.
 *
 * @typedef {object} CodeLine
 * @property {string} text
 * @property {'plain' | 'comment' | 'identifier' | 'keyword' | 'string' | 'number'} [role]
 */

/**
 * One thing a cheatsheet teaches.
 *
 * The three fields are the three questions a reader has about any item on a
 * reference sheet, in the order they ask them: what is it called, how is it
 * written, and what does it do. Only the first is required, because a sheet
 * whose entries are a list of names is a legitimate sheet and a sheet with a
 * description and no term is not a thing at all.
 *
 * @typedef {object} SheetEntry
 * @property {string} term What the entry is called.
 * @property {string} [signature] How it is written, in the document's own language.
 * @property {string} [description] What it does, in prose.
 */

/**
 * An ordered group of entries.
 *
 * `slot` is the one field here that points outward, and it names a **kind** of
 * slot rather than a slot: a section asks for somewhere that holds entries,
 * and the layout decides which of its slots that is. Naming the slot itself
 * would tie the document to a layout, which is the dependency this model is
 * defined to avoid.
 *
 * @typedef {object} SheetSection
 * @property {string} [title]
 * @property {string} [slot] The kind of slot this section occupies. Defaults to the layout's own.
 * @property {SheetEntry[]} entries
 */

/**
 * A cheatsheet, as content.
 *
 * @typedef {object} CheatsheetDocument
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [kind] What sits beside the sheet in the catalog: `read`, `embed`, `run` or `copy`.
 * @property {string} [language] A highlight.js language id or alias, `auto`, or `none`.
 * @property {string | number} [seed] Selects the variation. Identical seeds compose identically.
 * @property {string} [wordmark]
 * @property {string} [leadIn]
 * @property {string} [followLine]
 * @property {SheetSection[]} sections
 */

/**
 * A cheatsheet, as the drawing has always taken it.
 *
 * @typedef {object} ProvisionalDocument
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [kind]
 * @property {string} [language]
 * @property {string | number} [seed]
 * @property {string} [wordmark]
 * @property {string} [leadIn]
 * @property {string} [followLine]
 * @property {string | CodeLine[]} code
 */

/**
 * Whether a value is something `variation.mjs` can seed from.
 *
 * A seed is hashed from a string or taken as a number, so the field is a union
 * of two primitives - the one shape the schema vocabulary has no keyword for,
 * and the reason it has an `any` node with a `check`.
 *
 * @param {any} value
 * @returns {string | undefined}
 */
function isSeed(value) {
  if (typeof value === "string") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return undefined;
  return "must be a string or a number, which is what a seed is hashed from";
}

/**
 * The fields both shapes carry, so neither schema restates them.
 *
 * Written as a function rather than an object because a schema node is handed
 * to the validator by reference and the two schemas below would otherwise
 * share one, which is harmless today and is the kind of sharing that stops
 * being harmless the moment one of them wants a field worded differently.
 *
 * @returns {Record<string, import('./schema.mjs').Schema>}
 */
function sharedFields() {
  return {
    title: { type: "string", notEmpty: true },
    subtitle: { type: "string", optional: true },
    // A string, and deliberately not a list of the four values the catalog
    // uses. `kind` is the one field of a document whose authority sits outside
    // it: `detectPayload` in `tools/build-manifest.mjs` reports what is
    // actually in the folder, and a declaration that contradicts the disk is
    // refused there, against the filesystem, with a finding that names both.
    // A list in here would be a second authority that knows nothing about the
    // folder, and would refuse a sheet before the check that can explain why
    // ever ran.
    kind: { type: "string", optional: true, notEmpty: true },
    // The refusal `compose.mjs` carried by hand before this file existed, in
    // its own words. It is here rather than there because it belongs to the
    // document, and `compose.mjs` applies it by validating.
    language: {
      type: "string",
      optional: true,
      nullable: true,
      message: "must be a language id, an alias, or absent",
    },
    seed: { type: "any", optional: true, check: isSeed },
    /** What the catalog shows beside the sheet, resolved by `tools/build-manifest.mjs`. */
    payload: { type: "string", optional: true, nullable: true },
    wordmark: { type: "string", optional: true },
    leadIn: { type: "string", optional: true },
    followLine: { type: "string", optional: true },
  };
}

/**
 * The formal document's schema.
 *
 * @type {import('./schema.mjs').Schema}
 */
export const DOCUMENT_SCHEMA = {
  name: "document",
  label: "cheatsheet document",
  type: "object",
  fields: {
    ...sharedFields(),
    sections: {
      type: "array",
      notEmpty: true,
      values: {
        type: "object",
        label: "section",
        fields: {
          title: { type: "string", optional: true },
          slot: { type: "string", optional: true, notEmpty: true },
          entries: {
            type: "array",
            notEmpty: true,
            values: {
              type: "object",
              label: "entry",
              fields: {
                term: { type: "string", notEmpty: true },
                signature: { type: "string", optional: true },
                description: { type: "string", optional: true },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * The provisional shape's schema, which is what the twenty-eight committed
 * `sheet.json` documents are held to.
 *
 * **It is the one open schema here**, and the asymmetry is deliberate rather
 * than an oversight. The formal document is new, so it can refuse a field it
 * does not name from its first day and catch a `sections` misspelt as
 * `section` while there is still nothing on disk to break. The provisional
 * shape predates every model in this folder: twenty-eight documents are
 * written in it, `index.html` hands a whole parsed `sheet.json` straight to
 * `composeSheet`, and `tools/build-manifest.mjs` spreads the document and adds
 * to it. Closing it would mean a field added to the catalog's documents
 * stopping the page from drawing any sheet at all, which is a far worse
 * failure than the typo it would catch.
 *
 * @type {import('./schema.mjs').Schema}
 */
export const PROVISIONAL_SCHEMA = {
  name: "document",
  label: "cheatsheet document",
  type: "object",
  open: true,
  fields: {
    ...sharedFields(),
    code: {
      type: "array",
      message: "must be an array of code lines, or a string of them",
      values: {
        type: "object",
        label: "code line",
        fields: {
          text: { type: "string" },
          // A string, not one of {@link CODE_ROLES}. The composition paints an
          // unrecognised role in the plain colour on purpose, and that
          // fallback is held by two cases of its own - including one for a
          // role named after a property of `Object.prototype`. A schema
          // refusing the role would make a documented, tested behaviour
          // unreachable, so what the list is for is naming the six that paint
          // rather than refusing a seventh.
          role: { type: "string", optional: true },
        },
      },
    },
  },
};

/**
 * Which shape a value is in, without validating it.
 *
 * Read off `sections` rather than off `code`, because `sections` is the field
 * this model added: a document carrying both is a document being migrated, and
 * reading the formal field first is what lets it be migrated one sheet at a
 * time instead of all twenty-eight at once.
 *
 * @param {any} value
 * @returns {boolean}
 */
export function isFormalDocument(value) {
  return typeof value === "object" && value !== null && Array.isArray(value.sections);
}

/**
 * Validates a document in whichever shape it is in, and hands it back.
 *
 * Throws an error naming every offending field and the path to it, per
 * `schema.mjs`. Returns the document unchanged on success: nothing here
 * coerces, fills a default or reorders a section, so what comes back is what
 * went in and a caller can hold on to the reference.
 *
 * @param {CheatsheetDocument | ProvisionalDocument} doc
 * @returns {CheatsheetDocument | ProvisionalDocument}
 */
export function readDocument(doc) {
  // A string `code` is the one shortcut the provisional shape allows - a whole
  // example as one blob, split on newlines by the composition - and a schema
  // whose `code` is an array cannot express it. Validating the rest and
  // checking this by hand is the smaller of the two distortions; teaching the
  // validator a union for one field is the larger.
  if (!isFormalDocument(doc) && typeof doc === "object" && doc !== null && typeof doc.code === "string") {
    const { code, ...rest } = doc;
    assertValid({ ...rest, code: [] }, PROVISIONAL_SCHEMA, "sheet document");
    return doc;
  }
  const schema = isFormalDocument(doc) ? DOCUMENT_SCHEMA : PROVISIONAL_SCHEMA;
  return assertValid(doc, schema, "sheet document");
}

/**
 * Every entry of a formal document, in order, with the section it came from.
 *
 * The reading order of a sheet, flattened. Offered because every consumer of a
 * formal document wants it - the layout projecting rows, a search index, a
 * table of contents - and each would otherwise write the same two nested
 * loops, with the same chance of reading the sections in whatever order
 * `Object.keys` happened to give.
 *
 * @param {CheatsheetDocument} doc
 * @returns {Array<{ section: SheetSection, entry: SheetEntry, index: number }>}
 */
export function entriesOf(doc) {
  const out = [];
  let index = 0;
  for (const section of doc.sections ?? []) {
    for (const entry of section.entries ?? []) {
      out.push({ section, entry, index });
      index += 1;
    }
  }
  return out;
}
