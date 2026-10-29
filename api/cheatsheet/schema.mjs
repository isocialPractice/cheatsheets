// Schema validation for the cheatsheet models, which exists to report *where*
// a document is wrong rather than that it is.
//
// ## Why a path, and why it is worth a module
//
// Until this file landed, the layer's refusals were two hand written `throw`s
// in `compose.mjs`: one for a missing title and one for a `language` that is
// not a string. Both name their field, and both were written because the error
// that came back otherwise named neither - a truthy non-string `language` left
// as `t.trim is not a function`, thrown from inside a minified bundle.
//
// That approach does not scale past two fields. The formal document carries
// ordered sections of entries, so the field that is wrong is three levels down
// and at a numbered position, and "a sheet document needs a title" is no help
// at all when what is actually missing is the term of the second entry of the
// third section. So the refusal carries a path:
//
//     document.sections[2].entries[1].term: must be a string, and is absent
//
// The path is the whole point. It is written in the notation a caller would use
// to reach the field in JavaScript, so it can be pasted into a debugger or read
// straight off against the JSON, and it names the position of an array element
// rather than only the array.
//
// ## What a schema is here
//
// A plain object, not a class and not JSON Schema. Three reasons, in the order
// they mattered:
//
// - **Nothing may be installed.** This folder is loaded by the page with a bare
//   `import` and no build step, so a validator is this repository's own or it
//   is nothing. `api/cheatsheet/index.mjs` states that rule for the whole
//   folder.
// - **The messages are the feature.** A general validator reports which
//   keyword failed; what is wanted here is a sentence a person can act on, so
//   the vocabulary is small enough that each keyword can carry its own wording.
// - **The models are the schemas' only caller.** Three of them, written in this
//   repository, so a keyword nobody needs is a keyword nobody writes.
//
// The vocabulary is therefore seven types and nine modifiers, and that is all.
// A model needing something outside it reaches for `check`, which takes a
// function and returns a message, rather than growing a keyword here.
//
// ## Two things it deliberately does not do
//
// It does not coerce, and it does not fill in defaults. A validator that
// repaired its input would give the models two jobs and leave a caller unable
// to tell a document it wrote from a document that was rewritten for it.
// Defaults are the models' own, applied after validation passes.

/**
 * A node of a schema.
 *
 * @typedef {object} Schema
 * @property {'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'record' | 'any'} type
 * @property {string} [name] The root path, on the outermost node only.
 * @property {string} [label] What this node is called in a message, where "object" is too vague.
 * @property {string} [message] Replaces the generated message for a failure at this node, where the field has a better sentence of its own. Failures below it keep theirs.
 * @property {boolean} [optional] Absent is allowed. Only read for a field of an `object`.
 * @property {boolean} [nullable] `null` is allowed, and ends the checks for this node.
 * @property {boolean} [notEmpty] A `string` with no characters, or an `array` with no elements, is refused.
 * @property {Record<string, Schema>} [fields] The named fields of an `object`.
 * @property {boolean} [open] An `object` tolerates fields it does not name. Closed by default.
 * @property {Schema} [values] The element schema of an `array`, or the value schema of a `record`.
 * @property {string[]} [oneOf] The whole set of values a `string` may take.
 * @property {number} [min] Least value of a `number` or `integer`, inclusive.
 * @property {number} [max] Greatest value of a `number` or `integer`, inclusive.
 * @property {RegExp} [pattern] A `string` has to match.
 * @property {(value: any) => string | undefined} [check] The last check, returning a message when it fails.
 */

/**
 * One thing that is wrong, and where.
 *
 * @typedef {object} SchemaError
 * @property {string} path The field, in the notation a caller would reach it by.
 * @property {string} message What is wrong with it, as a sentence fragment.
 */

/** The default root of a path, for a schema that names none. */
const ROOT = "value";

/**
 * A field path extended by one step.
 *
 * An array index is written in brackets and a field in dot notation, so the
 * result is the expression a caller would use to reach the field. The parent
 * is never empty - the root is always named - so there is no leading-dot case
 * to special-case.
 *
 * @param {string} parent
 * @param {string | number} step
 * @returns {string}
 */
function extend(parent, step) {
  return typeof step === "number" ? `${parent}[${step}]` : `${parent}.${step}`;
}

/**
 * What a value is, in the words the messages use.
 *
 * `typeof` is not enough: an array and a null both report `object`, and both
 * are exactly the confusions a message has to clear up. A long string is
 * truncated because a message naming a whole code example is a message nobody
 * reads to the end of.
 *
 * @param {any} value
 * @returns {string}
 */
function describe(value) {
  if (value === undefined) return "absent";
  if (value === null) return "null";
  if (Array.isArray(value)) return `an array of ${value.length}`;
  if (typeof value === "string") {
    if (value.length === 0) return "an empty string";
    const shown = value.length > 40 ? `${value.slice(0, 37)}...` : value;
    return JSON.stringify(shown);
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return "an object";
  return `a ${typeof value}`;
}

/**
 * Whether a value is a plain object: something with named fields rather than
 * an array, a null or an instance of something.
 *
 * An array is excluded because every `object` schema here names its fields,
 * and `fields` over an array would read indices as field names. A class
 * instance is allowed through - the models never produce one, but refusing it
 * would refuse a document a caller built with a constructor of their own, for
 * no gain.
 *
 * @param {any} value
 * @returns {boolean}
 */
function isFields(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks one node, appending what is wrong to `errors`.
 *
 * Every branch appends and returns rather than throwing, so a caller sees
 * every mistake in one pass. Validating a hand written document one error at a
 * time is how a person ends up running the checker nine times.
 *
 * @param {any} value
 * @param {Schema} schema
 * @param {string} path
 * @param {SchemaError[]} errors
 */
function check(value, schema, path, errors) {
  // A node may carry a better sentence than the generated one, and where it
  // does, that sentence is the whole message. It replaces failures *at* this
  // node only: a field inside an object with a `message` still reports its own,
  // or one wording would answer for a subtree.
  const fail = (message) => errors.push({ path, message: schema.message ?? message });

  if (value === null) {
    if (!schema.nullable) fail(`must be ${article(schema)}, and is null`);
    return;
  }
  if (value === undefined) {
    // Absence is the one state a node cannot judge for itself: whether it is
    // allowed depends on how the node was reached, and only the `object` branch
    // below knows that. Anything reaching here absent was required.
    fail(`must be ${article(schema)}, and is absent`);
    return;
  }

  switch (schema.type) {
    case "string": {
      if (typeof value !== "string") return fail(`must be a string, and is ${describe(value)}`);
      if (schema.notEmpty && value.length === 0) return fail("must not be empty");
      if (schema.oneOf && !schema.oneOf.includes(value)) {
        return fail(`must be one of ${schema.oneOf.map((one) => JSON.stringify(one)).join(", ")}, and is ${describe(value)}`);
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        return fail(`must match ${String(schema.pattern)}, and is ${describe(value)}`);
      }
      break;
    }
    case "number":
    case "integer": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return fail(`must be ${article(schema)}, and is ${describe(value)}`);
      }
      if (schema.type === "integer" && !Number.isInteger(value)) {
        return fail(`must be a whole number, and is ${value}`);
      }
      if (schema.min !== undefined && value < schema.min) {
        return fail(`must be at least ${schema.min}, and is ${value}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        return fail(`must be at most ${schema.max}, and is ${value}`);
      }
      break;
    }
    case "boolean": {
      if (typeof value !== "boolean") return fail(`must be a boolean, and is ${describe(value)}`);
      break;
    }
    // A node whose rule is not a type. The vocabulary has no union, and two
    // fields in the models take a string **or** a number, so rather than grow
    // a keyword for one shape, `any` checks presence and hands the value to
    // `check`. A node carrying neither is a node that checks nothing, which is
    // a mistake worth making visible rather than one to forbid: it still
    // refuses `undefined` where the field is required.
    case "any":
      break;
    case "array": {
      if (!Array.isArray(value)) return fail(`must be an array, and is ${describe(value)}`);
      if (schema.notEmpty && value.length === 0) return fail("must hold at least one element");
      if (schema.values) {
        value.forEach((element, index) => check(element, schema.values, extend(path, index), errors));
      }
      break;
    }
    case "object": {
      if (!isFields(value)) return fail(`must be an object, and is ${describe(value)}`);
      const fields = schema.fields ?? {};
      for (const [key, field] of Object.entries(fields)) {
        // Read as an own property, the same guard the rest of this layer
        // carries: a schema naming a field `constructor` or `toString`
        // otherwise finds a function on `Object.prototype` and validates that
        // instead of reporting the field missing.
        const present = Object.hasOwn(value, key) && value[key] !== undefined;
        if (!present) {
          if (!field.optional) {
            errors.push({
              path: extend(path, key),
              message: field.message ?? `must be ${article(field)}, and is absent`,
            });
          }
          continue;
        }
        check(value[key], field, extend(path, key), errors);
      }
      if (!schema.open) {
        for (const key of Object.keys(value)) {
          if (Object.hasOwn(fields, key)) continue;
          errors.push({
            path: extend(path, key),
            message:
              `is not a field of this ${schema.label ?? schema.name ?? "object"}. It takes ` +
              `${Object.keys(fields).join(", ")}`,
          });
        }
      }
      break;
    }
    case "record": {
      if (!isFields(value)) return fail(`must be an object of named values, and is ${describe(value)}`);
      if (schema.notEmpty && Object.keys(value).length === 0) return fail("must name at least one value");
      if (schema.values) {
        for (const key of Object.keys(value)) {
          check(value[key], schema.values, extend(path, key), errors);
        }
      }
      break;
    }
    default:
      // A schema this repository wrote, so this is a typo in a model rather
      // than bad input - and it is raised rather than collected, because a
      // collected one would read as the caller's mistake.
      throw new Error(`cheatsheet: ${JSON.stringify(schema.type)} is not a schema type`);
  }

  if (schema.check) {
    const message = schema.check(value);
    if (message) fail(message);
  }
}

/**
 * How a schema names what it wants, for a message that has no value to show.
 *
 * @param {Schema} schema
 * @returns {string}
 */
function article(schema) {
  if (schema.type === "any") return "given";
  if (schema.type === "integer") return "a whole number";
  if (schema.type === "array") return "an array";
  if (schema.type === "object" || schema.type === "record") return "an object";
  return `a ${schema.type}`;
}

/**
 * Everything wrong with a value, against a schema.
 *
 * Returns an empty array for a value that passes, which is the one answer a
 * caller can check without reading a flag.
 *
 * @param {any} value
 * @param {Schema} schema
 * @returns {SchemaError[]}
 */
export function validate(value, schema) {
  /** @type {SchemaError[]} */
  const errors = [];
  check(value, schema, schema.name ?? ROOT, errors);
  return errors;
}

/**
 * The errors as one message, each on its own line behind its path.
 *
 * @param {SchemaError[]} errors
 * @param {string} subject
 * @returns {string}
 */
export function describeErrors(errors, subject) {
  const lines = errors.map((error) => `  ${error.path}: ${error.message}`);
  const count = errors.length === 1 ? "is one problem" : `are ${errors.length} problems`;
  return `cheatsheet: there ${count} with the ${subject}.\n${lines.join("\n")}`;
}

/**
 * Validates, or throws an error naming every offending field and its path.
 *
 * Every error is in the message rather than only the first, because the caller
 * is usually a person with a file open: nine refusals in one go is nine fixes,
 * and one refusal nine times is nine runs.
 *
 * @param {any} value
 * @param {Schema} schema
 * @param {string} [subject] What the value is, for the message. Defaults to the schema's name.
 * @returns {any} The value, unchanged, so this can be used in an expression.
 */
export function assertValid(value, schema, subject) {
  const errors = validate(value, schema);
  if (errors.length === 0) return value;
  const error = new Error(describeErrors(errors, subject ?? schema.name ?? ROOT));
  // Carried on the error as well as in the message, so a caller that wants to
  // report the fields itself does not have to parse the sentence back apart.
  error.errors = errors;
  throw error;
}
