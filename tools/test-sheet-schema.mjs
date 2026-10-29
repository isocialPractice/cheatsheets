// The schema validator, under test on the one thing it exists for: the path.
//
// Every other property of a validator is a convenience. A validator that said
// only "the document is invalid" would still be a validator, and it would be
// useless for the shape the models actually have - a term three levels down at
// a numbered position, inside a section at another numbered position. So what
// is checked here is that the path arrives, in the notation a caller would use
// to reach the field, from every kind of node that can hold one.
//
// The cases are written against the vocabulary rather than against the models,
// because the models are checked in `tools/test-sheet-models.mjs` and would
// drag their own schemas through every case here. Three small schemas are
// declared below and nothing in them describes a cheatsheet.
//
// Run with: node --test tools/test-sheet-schema.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { assertValid, describeErrors, validate } from "../api/cheatsheet/schema.mjs";

/** @type {import('../api/cheatsheet/schema.mjs').Schema} */
const NESTED = {
  name: "catalog",
  type: "object",
  fields: {
    title: { type: "string", notEmpty: true },
    groups: {
      type: "array",
      notEmpty: true,
      values: {
        type: "object",
        label: "group",
        fields: {
          name: { type: "string", notEmpty: true },
          items: {
            type: "array",
            values: {
              type: "object",
              label: "item",
              fields: {
                term: { type: "string", notEmpty: true },
                rank: { type: "integer", optional: true, min: 1, max: 9 },
              },
            },
          },
        },
      },
    },
  },
};

/** A small, well formed value for the schema above. */
const good = () => ({
  title: "Demo Tool",
  groups: [{ name: "first", items: [{ term: "alpha", rank: 2 }] }],
});

const paths = (value, schema = NESTED) => validate(value, schema).map((error) => error.path);
const messages = (value, schema = NESTED) =>
  validate(value, schema).map((error) => `${error.path}: ${error.message}`);

// ## The path

test("a well formed value produces no errors at all", () => {
  assert.deepEqual(validate(good(), NESTED), []);
});

test("a field deep inside an array is named by the path a caller would reach it by", () => {
  const value = good();
  value.groups[0].items[0].term = "";
  assert.deepEqual(paths(value), ["catalog.groups[0].items[0].term"]);
});

test("and the index is the position, not the array", () => {
  // The whole reason an index is in the path. A sheet with nine entries and
  // one bad one is a file somebody has to find the bad one in.
  const value = good();
  value.groups[0].items = [{ term: "a" }, { term: "b" }, { term: 7 }, { term: "d" }];
  assert.deepEqual(paths(value), ["catalog.groups[0].items[2].term"]);
});

test("the root carries the schema's own name, so a path reads as an expression", () => {
  assert.deepEqual(paths(null), ["catalog"]);
  assert.deepEqual(paths({ ...good(), title: 4 }), ["catalog.title"]);
});

test("every mistake is reported in one pass rather than the first one found", () => {
  // A validator that stopped at the first error would be run nine times by a
  // person fixing nine fields, and each run costs them the same turnaround.
  const value = { title: "", groups: [{ name: "", items: [{ term: "" }, { term: "", rank: 40 }] }] };
  assert.deepEqual(paths(value), [
    "catalog.title",
    "catalog.groups[0].name",
    "catalog.groups[0].items[0].term",
    "catalog.groups[0].items[1].term",
    "catalog.groups[0].items[1].rank",
  ]);
});

// ## What a message says

test("a message names what was wanted and what was found", () => {
  assert.deepEqual(messages({ ...good(), title: 4 }), [
    "catalog.title: must be a string, and is 4",
  ]);
  assert.deepEqual(messages({ title: "Demo Tool" }), [
    "catalog.groups: must be an array, and is absent",
  ]);
});

test("and a long string is truncated, because a message is read to the end of", () => {
  const value = { ...good(), title: 4 };
  value.groups[0].items[0].term = ["x".repeat(80)];
  const [, item] = messages(value);
  assert.match(item, /^catalog\.groups\[0\]\.items\[0\]\.term: /);
  assert.match(item, /an array of 1$/);

  const long = { ...good(), title: "y".repeat(200) };
  long.groups[0].items[0].rank = "z".repeat(200);
  const [rank] = messages(long);
  assert.ok(rank.length < 140, `the message is ${rank.length} characters long`);
  assert.match(rank, /\.\.\."$/, "a truncated value does not say it was truncated");
});

test("an array and a null are told apart from an object, which `typeof` does not", () => {
  // The two confusions a type message exists to clear up, and the two
  // `typeof` reports as `object`.
  assert.deepEqual(messages({ ...good(), title: [] }), ["catalog.title: must be a string, and is an array of 0"]);
  assert.deepEqual(messages({ ...good(), title: null }), ["catalog.title: must be a string, and is null"]);
});

// ## The vocabulary

test("a closed object refuses a field it does not name, and says what it takes", () => {
  const [error] = messages({ ...good(), extra: 1 });
  assert.equal(error.split(":")[0], "catalog.extra");
  // Named by the schema's own `label`, or its `name` where it has none, so the
  // sentence says what kind of thing refused the field rather than "object".
  assert.match(error, /is not a field of this catalog/);
  assert.match(error, /It takes title, groups/);
});

test("and an open one tolerates it, which is what the provisional shape needs", () => {
  const open = { ...NESTED, open: true };
  assert.deepEqual(validate({ ...good(), extra: 1 }, open), []);
});

test("a label is what a nested object is called, where `object` is too vague", () => {
  const value = good();
  value.groups[0].items[0] = { term: "a", colour: "green" };
  assert.match(messages(value)[0], /is not a field of this item/);
});

test("`optional` is about absence and `nullable` is about null, and they are different", () => {
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const schema = {
    name: "node",
    type: "object",
    fields: {
      absent: { type: "string", optional: true },
      empty: { type: "string", nullable: true },
    },
  };
  assert.deepEqual(validate({ empty: null }, schema), [], "an optional field had to be present");
  assert.deepEqual(paths({ absent: "x" }, schema), ["node.empty"], "a nullable field was not required");
  assert.deepEqual(paths({ absent: null, empty: null }, schema), ["node.absent"], "null passed as absent");
});

test("`oneOf` lists the whole set rather than saying the value is wrong", () => {
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const schema = { name: "pick", type: "string", oneOf: ["left", "centre"] };
  assert.deepEqual(messages("right", schema), ['pick: must be one of "left", "centre", and is "right"']);
});

test("a number is finite, and an integer is whole", () => {
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const loose = { name: "n", type: "number" };
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const whole = { name: "n", type: "integer" };
  assert.deepEqual(validate(1.5, loose), []);
  assert.deepEqual(messages(Number.NaN, loose), ["n: must be a number, and is NaN"]);
  assert.deepEqual(messages(Number.POSITIVE_INFINITY, loose), ["n: must be a number, and is Infinity"]);
  assert.deepEqual(messages(1.5, whole), ["n: must be a whole number, and is 1.5"]);
});

test("a record validates its values without caring what they are named", () => {
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const schema = { name: "tokens", type: "record", notEmpty: true, values: { type: "number", min: 0 } };
  assert.deepEqual(validate({ step: 8, "step-2": 16 }, schema), []);
  assert.deepEqual(paths({ step: 8, "step-2": -1 }, schema), ["tokens.step-2"]);
  assert.deepEqual(messages({}, schema), ["tokens: must name at least one value"]);
});

test("`check` is the escape hatch, and its message is the message", () => {
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const schema = {
    name: "hex",
    type: "string",
    check: (value) => (/^#[0-9a-f]{6}$/i.test(value) ? undefined : "must be a six digit hex colour"),
  };
  assert.deepEqual(validate("#4dae51", schema), []);
  assert.deepEqual(messages("green", schema), ["hex: must be a six digit hex colour"]);
  // It runs after the type, never instead of it: a non-string never reaches a
  // check written to call `test` on one.
  assert.deepEqual(messages(7, schema), ["hex: must be a string, and is 7"]);
});

test("`any` is the one node with no type of its own, for a union of two", () => {
  // A seed is a string or a number, which is the shape the vocabulary has no
  // keyword for. `any` checks presence and hands the value to `check`.
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const schema = {
    name: "seed",
    type: "any",
    check: (value) =>
      typeof value === "string" || typeof value === "number" ? undefined : "must be a string or a number",
  };
  assert.deepEqual(validate("splice-array", schema), []);
  assert.deepEqual(validate(42, schema), []);
  assert.deepEqual(messages(true, schema), ["seed: must be a string or a number"]);
  assert.deepEqual(messages(undefined, schema), ["seed: must be given, and is absent"]);
});

test("`message` replaces the wording at its own node and nowhere below it", () => {
  /** @type {import('../api/cheatsheet/schema.mjs').Schema} */
  const schema = {
    name: "doc",
    type: "object",
    fields: {
      language: { type: "string", optional: true, message: "must be a language id, an alias, or absent" },
      nested: {
        type: "object",
        optional: true,
        message: "must be a nested object",
        fields: { inner: { type: "string" } },
      },
    },
  };
  assert.deepEqual(messages({ language: 123 }, schema), [
    "doc.language: must be a language id, an alias, or absent",
  ]);
  // The field inside keeps its own wording: one sentence answering for a whole
  // subtree is how a path stops being worth having.
  assert.deepEqual(messages({ nested: { inner: 4 } }, schema), [
    "doc.nested.inner: must be a string, and is 4",
  ]);
});

test("a schema type this repository never wrote is raised, not collected", () => {
  // A typo in a model is not the caller's mistake, so it must not arrive
  // looking like one in a list of their fields.
  assert.throws(() => validate("x", { name: "n", type: "strnig" }), /"strnig" is not a schema type/);
});

// ## Throwing

test("assertValid hands back what it was given, so it reads in an expression", () => {
  const value = good();
  assert.equal(assertValid(value, NESTED), value);
});

test("and it throws one error carrying every field, with the count in the sentence", () => {
  const value = { title: "", groups: [{ name: "", items: [] }] };
  assert.throws(
    () => assertValid(value, NESTED, "catalog"),
    (error) => {
      assert.match(error.message, /^cheatsheet: there are 2 problems with the catalog\.$/m);
      assert.match(error.message, /^ {2}catalog\.title: must not be empty$/m);
      assert.match(error.message, /^ {2}catalog\.groups\[0\]\.name: must not be empty$/m);
      // Carried on the error as well as in the sentence, so a caller
      // reporting the fields itself does not parse the sentence back apart.
      assert.deepEqual(
        error.errors.map((one) => one.path),
        ["catalog.title", "catalog.groups[0].name"]
      );
      return true;
    }
  );
});

test("one problem is one problem, rather than `1 problems`", () => {
  assert.match(describeErrors([{ path: "a", message: "b" }], "theme"), /there is one problem with the theme/);
  assert.match(
    describeErrors([{ path: "a", message: "b" }, { path: "c", message: "d" }], "theme"),
    /there are 2 problems with the theme/
  );
});

test("the subject defaults to the schema's name, so a call needs no second argument", () => {
  assert.throws(() => assertValid(null, NESTED), /problem with the catalog/);
});
