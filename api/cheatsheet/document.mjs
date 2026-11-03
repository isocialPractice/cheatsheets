// The cheatsheet document model: what a sheet says, with nothing about how it
// is drawn.
//
// ## What this is, and what was here before it
//
// Since the composition algorithm was written, a "document" in this layer has
// meant the minimum the six drawn regions need: a title, a subtitle and an
// array of code lines, each line optionally naming the colour role it is set
// in. That shape was never a model of a cheatsheet - it was a list of the
// arguments the drawing needed, which is why it carried no notion of a term or
// a section.
//
// Thirty-four readers of that shape exist, twenty-eight of them the
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
// | | Compact | Formal |
// | --- | --- | --- |
// | A sheet is | one listing | ordered sections |
// | An entry is | lines of text with a colour each | a term, a signature and a description |
// | Reordering it means | editing an array of strings | moving an entry |
// | A term can be | found by reading the lines | read off the field |
// | Drawn how | one line per row of the panel | however the layout says |
//
// A formal document says what the sheet is *about* and leaves every question
// of rows, columns, colours and sizes to the theme and the layout. That is the
// whole of what "independent of how any of it is drawn" buys, and it is why
// `code` and `sections` are alternatives rather than a field and its
// replacement.
//
// ## Both shapes are permanent, and neither is a draft
//
// Settled on 2026.11.02. Until then the compact shape was called
// **provisional** - here, in `compose.mjs`, and in the output of
// `tools/cheatsheet.mjs --data-only` - on the understanding that the
// twenty-eight committed `sheet.json` documents would be ported to `sections`
// and the word retired with them. They will not be, and the reason is that the
// port would lose information rather than move it: each is a worked code
// listing with a syntax role per line and indentation that means a nesting
// level, and a formal entry had no field for either.
//
// Two things follow, and the second is what makes the first honest.
//
// - **A formal section can carry a listing.** A section holds `entries` **or**
//   `lines`, and `lines` is the same line shape `code` has always carried, so
//   the formal model can now say everything the catalog says. A port is
//   available to anyone who wants one and is lossless when taken.
// - **The compact shape is therefore a shorthand rather than a draft.**
//   `{ title, code }` is exactly `{ title, sections: [{ lines: code }] }`, and
//   a sheet that is one listing is the common case, so the shorthand earns its
//   place. It is named `compact` now, in this file and in `--data-only`, and
//   nothing calls it provisional.
//
// What this is *not* is the catalog's documents moving. Not one of them was
// rewritten, because the shorthand they are written in is permanent. The
// listing kind exists so the formal model is complete, not so the catalog has
// somewhere to go.
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
 * The colour roles a code line may declare.
 *
 * The same six `SYNTAX` in `language.mjs` paints, named here so a document
 * declaring a role nobody paints is refused by the schema rather than drawn in
 * the fallback colour and left looking deliberate.
 */
export const CODE_ROLES = ["plain", "comment", "identifier", "keyword", "string", "number"];

/**
 * One line of a code listing, in either shape.
 *
 * The compact document carries an array of these as its `code`, and a formal
 * section carries one as its `lines`. They are the same line, which is what
 * makes a port between the two shapes lossless.
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
 * An ordered group of entries, or one code listing.
 *
 * **A section carries `entries` or `lines`, exactly one of the two.** Entries
 * are the model's own shape - a term, a signature and a description, each a
 * field a consumer can read. Lines are a worked listing, which is what
 * twenty-eight of this repository's sheets are, and what no arrangement of
 * entries can express: a listing's per-line syntax role and its indentation
 * both carry meaning, per **An indent is a level, and a column is not
 * addressable** in `DESIGN_LANGUAGE.md`, and an entry has nowhere to put
 * either.
 *
 * Both are content rather than drawing, which is what lets them sit side by
 * side here. A listing says *these lines, in this order, this one a comment
 * and that one nested a level*; it says nothing about which row of which panel
 * any of it lands on, and `rowsFor` in `layout.mjs` is still what decides
 * that.
 *
 * `slot` is the one field here that points outward, and it names a **kind** of
 * slot rather than a slot: a section asks for somewhere that holds entries, or
 * somewhere that holds a listing, and the layout decides which of its slots
 * that is. Naming the slot itself would tie the document to a layout, which is
 * the dependency this model is defined to avoid.
 *
 * Which is why the schema below holds it to "a non-empty string" and no more.
 * The set of kinds is the layout's, so validating against it here would be
 * this model reading a layout - the thing it exists not to do. **The kind is
 * resolved where the layout is**, by `slotForSection` in `layout.mjs`, which
 * `rowsFor` calls for every section before it projects a row. A section
 * omitting the field asks for the kind its own content already is: `listing`
 * for one carrying `lines`, `entries` otherwise.
 *
 * @typedef {object} SheetSection
 * @property {string} [title]
 * @property {string} [slot] The kind of slot this section occupies. Defaults to the kind its content is.
 * @property {SheetEntry[]} [entries] The entries this section groups. Mutually exclusive with `lines`.
 * @property {CodeLine[]} [lines] The listing this section carries. Mutually exclusive with `entries`.
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
 * @typedef {object} CompactDocument
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
 * One line of a listing, as a schema node.
 *
 * A function for the same reason {@link sharedFields} is one: the compact
 * shape's `code` and a formal section's `lines` are the same line, and handing
 * both schemas one node by reference is the sharing that stops being harmless
 * the moment one of them wants a field worded differently.
 *
 * @returns {import('./schema.mjs').Schema}
 */
function codeLine() {
  return {
    type: "object",
    label: "code line",
    fields: {
      text: { type: "string" },
      // A string, not one of {@link CODE_ROLES}. The composition paints an
      // unrecognised role in the plain colour on purpose, and that fallback is
      // held by two cases of its own - including one for a role named after a
      // property of `Object.prototype`. A schema refusing the role would make
      // a documented, tested behaviour unreachable, so what the list is for is
      // naming the six that paint rather than refusing a seventh.
      role: { type: "string", optional: true },
    },
  };
}

/**
 * Whether a section carries one of the two things a section may hold.
 *
 * The rule the schema vocabulary cannot state: `entries` and `lines` are both
 * optional fields, and exactly one of them has to be there. A keyword for it
 * would be a keyword with one caller, which is what `check` exists to avoid
 * growing.
 *
 * Both messages name the two fields, because a section that has neither is
 * usually a section whose author did not know the second one existed.
 *
 * @param {any} section
 * @returns {string | undefined}
 */
function holdsOneThing(section) {
  const entries = Object.hasOwn(section, "entries") && section.entries !== undefined;
  const lines = Object.hasOwn(section, "lines") && section.lines !== undefined;
  if (entries && lines) {
    return "carries both `entries` and `lines`, and a section holds one or the other";
  }
  if (!entries && !lines) {
    return "must carry `entries` or `lines`, and carries neither";
  }
  return undefined;
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
        check: holdsOneThing,
        fields: {
          title: { type: "string", optional: true },
          // Held to a string and no further, on purpose: the kinds are the
          // layout's and `slotForSection` in `layout.mjs` is what resolves one
          // against the layout in hand. See the `SheetSection` typedef above.
          slot: { type: "string", optional: true, notEmpty: true },
          // Optional in the schema and required by `holdsOneThing` above, which
          // is what "one or the other" costs in a vocabulary with no union. The
          // two refusals a reader meets are still the two that matter: a bad
          // entry is named by path, and a section holding neither field is told
          // which two it may hold.
          entries: {
            type: "array",
            optional: true,
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
          lines: {
            type: "array",
            optional: true,
            notEmpty: true,
            message: "must be an array of code lines",
            values: codeLine(),
          },
        },
      },
    },
  },
};

/**
 * The compact shape's schema, which is what the twenty-eight committed
 * `sheet.json` documents are held to.
 *
 * The shape is a shorthand for a document of one listing, and a permanent one:
 * `{ title, code }` says what `{ title, sections: [{ lines: code }] }` says,
 * and a sheet that is one listing is the common case. See **Both shapes are
 * permanent, and neither is a draft** in this file's header for why that was a
 * decision rather than an observation.
 *
 * **It is the one open schema here**, and the asymmetry is deliberate rather
 * than an oversight. The formal document is new, so it can refuse a field it
 * does not name from its first day and catch a `sections` misspelt as
 * `section` while there is still nothing on disk to break. The compact shape
 * predates every model in this folder: twenty-eight documents are written in
 * it, `index.html` hands a whole parsed `sheet.json` straight to
 * `composeSheet`, and `tools/build-manifest.mjs` spreads the document and adds
 * to it. Closing it would mean a field added to the catalog's documents
 * stopping the page from drawing any sheet at all, which is a far worse
 * failure than the typo it would catch.
 *
 * @type {import('./schema.mjs').Schema}
 */
export const COMPACT_SCHEMA = {
  name: "document",
  label: "cheatsheet document",
  type: "object",
  open: true,
  fields: {
    ...sharedFields(),
    code: {
      type: "array",
      message: "must be an array of code lines, or a string of them",
      values: codeLine(),
    },
  },
};

/**
 * Which shape a value is in, without validating it.
 *
 * Read off `sections` rather than off `code`, because `sections` is the field
 * this model added: a document carrying both is a document halfway between the
 * two, and reading the formal field first is what makes that a formal document
 * with a stray field rather than a compact one with a field nothing reads.
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
 * @param {CheatsheetDocument | CompactDocument} doc
 * @returns {CheatsheetDocument | CompactDocument}
 */
export function readDocument(doc) {
  // A string `code` is the one shortcut the compact shape allows - a whole
  // example as one blob, split on newlines by the composition - and a schema
  // whose `code` is an array cannot express it. Validating the rest and
  // checking this by hand is the smaller of the two distortions; teaching the
  // validator a union for one field is the larger.
  //
  // A formal section's `lines` takes no such shortcut, on purpose: the shortcut
  // is what the compact shape is *for*, and a section is already the long form.
  if (!isFormalDocument(doc) && typeof doc === "object" && doc !== null && typeof doc.code === "string") {
    const { code, ...rest } = doc;
    assertValid({ ...rest, code: [] }, COMPACT_SCHEMA, "sheet document");
    return doc;
  }
  const schema = isFormalDocument(doc) ? DOCUMENT_SCHEMA : COMPACT_SCHEMA;
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
 * **A listing section contributes nothing**, which is the honest answer rather
 * than a gap: its lines are not entries, and the alternative - inventing an
 * entry per line with the line as its term - would hand a table of contents
 * twenty rows that are each half a statement. A consumer wanting the lines
 * reads `section.lines`, and one wanting rows calls `rowsFor` in `layout.mjs`.
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
