// Holds every example's commented output to what the example actually logs.
//
// ## The gap this closes
//
// `tools/test-example-selection.mjs` selects all eleven examples in turn and
// fails on a page error, so the scripts run. What nothing checked was whether
// the comment beside each `console.log` is what the console receives, and the
// examples are the repository's product: someone reads them to learn the
// method, so a wrong comment teaches the wrong thing.
//
// Measured on 2026.10.19, the eleven carried eight wrong claims, a count that
// was wrong on nine more lines, one comment written for an array the file no
// longer holds, and a non-breaking space after every `(n)` prefix in six files.
// None of it was visible to a reader and none of it was visible to the suite.
//
// ## How a claim is read
//
// A trailing `//` comment on a line holding a `console.log` call is that
// call's **output claim**, and it is compared against what the call logged.
//
// A comment opening with `NOTE`, `IMPORTANT`, `WILL BE` or `WOULD BE` is a
// **remark** instead, and nothing is compared. That is the examples' own
// convention rather than one invented here: three of them already mark a
// remark that way, because some lines genuinely have nothing to claim - a
// value that is random every run, or a sort whose point is that it leaves the
// array in a state the next line reads.
//
// A line hit more than once - a `console.log` inside a loop, or in a function
// called twice - joins its outputs with `", "` before the comparison, which is
// how the one looping example already wrote its claim.
//
// ## How the output is rendered
//
// In the browser console's own notation, because that is the console these
// examples are read in and the notation the comments were already written in:
//
// - a string logged on its own is bare, and quoted inside a container
// - an array is `(n) [...]` from two elements up, and `[...]` below that
// - an array inside a container is `Array(n)`, an object inside one is `{...}`
// - an object logged on its own shows its own keys one level deep
//
// Only the first level is expanded, which is what the collapsed preview a
// reader sees shows. The notation is this file's own statement of it: Chrome's
// exact preview moves between releases, and pinning the suite to a rendering
// no test on this machine can observe would be pinning it to a guess. What is
// observable is the value, and the notation above is a faithful writing of it.
//
// ## Why a snapshot is taken at the call
//
// A logged array is a live reference. `shift-and-unshift` logs the same array
// four times and mutates it between, so reading the arguments after the script
// finished reports the final state four times over and every comment but the
// last reads as wrong. The devtools console has the same property, which is
// why those comments looked broken. Each argument is therefore rendered inside
// the `console.log` replacement, before anything can move it.
//
// ## Why the examples run as scripts with a strict prologue
//
// The page injects each payload as a module, and module scope is strict mode.
// A `vm.SourceTextModule` would need `--experimental-vm-modules`, which the
// settled bare `node --test` does not pass, so each source is compiled with a
// `"use strict";` prologue and `lineOffset: -1` to absorb it. The strictness
// is the module's, and a stack frame still names the line the file holds.
//
// Run with: node --test tools/test-example-comments.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "cheatsheets.json"), "utf8"));

/** Payload extensions this file can run. The page injects both as modules. */
const RUNNABLE = new Set([".js", ".mjs"]);

/** A trailing comment that remarks on the call rather than claiming its output. */
const REMARK = /^(?:NOTE|IMPORTANT|WILL BE|WOULD BE)\b/;

/**
 * One logged value, in the browser console's collapsed notation.
 *
 * `depth` is what decides every difference between the two levels: a string is
 * bare at the top and quoted inside a container, and a container inside a
 * container is summarised rather than expanded.
 *
 * @param {unknown} value
 * @param {number} depth
 * @returns {string}
 */
export function render(value, depth) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "string") return depth === 0 ? value : `'${value}'`;
  if (type === "number" || type === "boolean" || type === "bigint") return String(value);
  if (type === "function") return `f ${value.name || "anonymous"}()`;
  if (Array.isArray(value)) {
    if (depth > 0) return `Array(${value.length})`;
    const items = value.map((item) => render(item, depth + 1)).join(", ");
    return value.length >= 2 ? `(${value.length}) [${items}]` : `[${items}]`;
  }
  if (type === "object") {
    if (depth > 0) return "{...}";
    const entries = Object.entries(value).map(([key, item]) => `${key}: ${render(item, depth + 1)}`);
    return `{${entries.join(", ")}}`;
  }
  return String(value);
}

/**
 * Runs one example and returns what each of its lines logged.
 *
 * The filename handed to the compiler is a fixed one rather than the real
 * path, so the frame match below cannot be confused by a repository checked
 * out somewhere whose own path holds the example's name.
 *
 * @param {string} source
 * @returns {Map<number, string[]>} Source line to the renderings it produced.
 */
export function runExample(source) {
  /** @type {Map<number, string[]>} */
  const logged = new Map();
  const at = (stack) => {
    const frame = stack.split("\n").find((line) => line.includes("example-under-test.js:"));
    const found = frame && /example-under-test\.js:(\d+):/.exec(frame);
    return found ? Number(found[1]) : 0;
  };
  const sandbox = {
    console: {
      log(...args) {
        const line = at(new Error().stack);
        const rendered = args.map((arg) => render(arg, 0)).join(" ");
        if (!logged.has(line)) logged.set(line, []);
        logged.get(line).push(rendered);
      },
    },
  };
  createContext(sandbox);
  // `lineOffset: -1` pays back the prologue, so a frame names the line the
  // committed file holds rather than the line this function compiled.
  new Script(`"use strict";\n${source}`, {
    filename: "example-under-test.js",
    lineOffset: -1,
  }).runInContext(sandbox);
  return logged;
}

/**
 * The trailing `//` comment on a line, or `null` where it has none.
 *
 * A `//` inside a string literal would be read as a comment here. None of the
 * eleven holds one, and the case is left out rather than guessed at: a parser
 * good enough to be trusted with it is a parser, and a wrong answer would be a
 * claim silently dropped rather than a loud failure.
 *
 * @param {string} line
 * @returns {string | null}
 */
export function claimOn(line) {
  const found = /\/\/(.*)$/.exec(line);
  if (found === null) return null;
  const text = found[1].trim();
  return text.length === 0 ? null : text;
}

/** Every `kind: run` example in the catalog, with its payload path. */
const examples = manifest.categories
  .flatMap((category) => category.cheatsheets)
  .filter((sheet) => sheet.kind === "run" && sheet.payload !== null)
  .filter((sheet) => RUNNABLE.has(extname(sheet.payload).toLowerCase()))
  .map((sheet) => ({ id: sheet.id, payload: sheet.payload }));

test("the catalog offers runnable examples to check at all", () => {
  // Without this every case below passes on an empty list, which is the one
  // way a check over a manifest can report success having read nothing.
  assert.ok(examples.length >= 11, `found ${examples.length} runnable examples, so the manifest read is wrong`);
});

for (const { id, payload } of examples) {
  test(`${id} logs what its comments say it logs`, () => {
    const source = readFileSync(join(root, payload), "utf8");
    const lines = source.split(/\r?\n/);
    const logged = runExample(source);

    /** @type {string[]} */
    const wrong = [];
    for (const [line, outputs] of [...logged.entries()].sort((a, b) => a[0] - b[0])) {
      const claim = claimOn(lines[line - 1] ?? "");
      if (claim === null || REMARK.test(claim)) continue;
      const actual = outputs.join(", ");
      if (claim !== actual) {
        wrong.push(`${payload}:${line}\n    claims: ${claim}\n    logs:   ${actual}`);
      }
    }
    assert.deepEqual(wrong, [], `\n${wrong.join("\n")}\n`);
  });

  test(`${id} carries no invisible or curly punctuation`, () => {
    // A non-breaking space after `(n)` is what six of these carried, and it is
    // exactly as wrong as a miscounted element while looking exactly right.
    const source = readFileSync(join(root, payload), "utf8");
    /** @type {string[]} */
    const found = [];
    source.split(/\r?\n/).forEach((line, index) => {
      for (const character of line) {
        const code = character.codePointAt(0);
        if (code > 127) found.push(`${payload}:${index + 1} U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
      }
    });
    assert.deepEqual(found, [], `\n${found.join("\n")}\n`);
  });
}

test("every runnable example has at least one output claim to check", () => {
  // A file whose comments were all stripped would pass its own case above by
  // having nothing to compare, so the count is asserted rather than assumed.
  /** @type {string[]} */
  const silent = [];
  for (const { payload } of examples) {
    const source = readFileSync(join(root, payload), "utf8");
    const lines = source.split(/\r?\n/);
    const claims = [...runExample(source).keys()].filter((line) => {
      const claim = claimOn(lines[line - 1] ?? "");
      return claim !== null && !REMARK.test(claim);
    });
    if (claims.length === 0) silent.push(payload);
  }
  assert.deepEqual(silent, [], `these log something and claim nothing about any of it`);
});
