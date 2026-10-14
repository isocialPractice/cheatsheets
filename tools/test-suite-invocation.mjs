// How the whole suite runs, and the invariant that keeps that one command
// correct as tests move out of this folder.
//
// ## The command
//
//     node --test
//
// From the repository root, with no path and no glob after it. That is the
// whole suite.
//
// ## What it replaced, and why both of those were wrong
//
// `node --test tools/` is what several files used to document, and it has not
// worked since directory arguments stopped being recursed: Node reads the
// positional as a file, resolves `tools` as a CommonJS module and exits with
// `Cannot find module` before a single case runs. On Node 24.1.0 it reports
// one failing test named `tools`.
//
// The glob form runs, and is worse than it looks, because the shell hands Node
// every `.mjs` in the folder and Node runs each one as a test file whether or
// not it contains a test:
//
// - `tools/measure-font-widths.mjs` drives Chromium and sets a non-zero exit
//   code when Playwright is absent. Under `--test` that is a **failing test**,
//   so the documented invocation fails on exactly the bare clone that
//   `tools/test-page-structure-browser.mjs` settled the suite had to run on.
//   The browser *tests* skip correctly; the measurement script is not a test
//   and does not.
// - `tools/measure-sheet-composition.mjs` decodes all eleven JPEGs and prints
//   its whole report into the test output, as one more passing "test".
//
// Neither is discovered by the bare command, because neither is named like a
// test. Node's own defaults are what draw that line:
//
//     **/*.test.?(c|m)js   **/*-test.?(c|m)js   **/*_test.?(c|m)js
//     **/test-*.?(c|m)js   **/test.?(c|m)js     **/test/**/*.?(c|m)js
//
// ## Why this is also the answer for tests outside `tools/`
//
// `api/` is the first source in the repository that is not under `tools/`, and
// the item this file closes was queued for the day a test wanted to sit beside
// the module it covers. A path or a glob would have to be edited on that day.
// The bare command would not: Node walks the tree from the working directory,
// so `api/cheatsheet/test-compose.mjs` is found the moment it is written, and
// the command in this header stays true.
//
// Three more things fall out of it, all of which the cases below hold:
//
// - **A bare clone still runs the suite.** No `package.json`, no dependency,
//   no shell globbing, so the same command works in cmd, PowerShell and bash.
//   A case needing a browser skips with the install command as its reason, and
//   nothing fails. Measured on a machine with Playwright hidden: 216 cases,
//   188 passed, 28 skipped, none failed.
// - **`tools/fixtures/` is not swept.** It holds committed expectations and
//   the module that builds them, none of which is a test.
// - **The ignored working folders are not swept.** `.tmp/` is skipped because
//   Node's default patterns do not match into a dot directory, which is why
//   the real `.tmp/ui-ux/*.test.mjs` files a UI review left behind are not
//   part of the suite. `mcp-todo/` and `test-results/` hold no JavaScript to
//   sweep, but nothing stops them holding some, so the walk below excludes
//   what `.gitignore` excludes.
//
// Run with: node --test tools/test-suite-invocation.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix, relative, sep } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The command this repository's suite is run with. */
const INVOCATION = "node --test";

/**
 * Node's default test file patterns, as regular expressions over a
 * repository-relative POSIX path.
 *
 * Transcribed from the test runner's documented defaults rather than inferred
 * from what it happened to pick up, so a Node release that changes them shows
 * up here as a disagreement rather than as a silently smaller suite.
 */
const DISCOVERY = [
  /(^|\/)[^/]+\.test\.[cm]?js$/,
  /(^|\/)[^/]+-test\.[cm]?js$/,
  /(^|\/)[^/]+_test\.[cm]?js$/,
  /(^|\/)test-[^/]*\.[cm]?js$/,
  /(^|\/)test\.[cm]?js$/,
  /(^|\/)test\/.*\.[cm]?js$/,
];

/** Whether bare `node --test` would run this path as a test file. */
function isDiscovered(relPath) {
  return DISCOVERY.some((pattern) => pattern.test(relPath));
}

/**
 * Directory names the walk does not enter.
 *
 * `node_modules` is Node's own exclusion. A leading dot is excluded because a
 * glob does not match into a dot directory unless asked to. The rest is read
 * from `.gitignore` rather than listed here, so a working folder added to that
 * file is excluded from this check by the same edit that excludes it from the
 * repository.
 */
function ignoredDirectories() {
  const names = new Set(["node_modules"]);
  for (const line of readFileSync(join(root, ".gitignore"), "utf8").split(/\r?\n/)) {
    const entry = line.trim().replace(/\/+$/, "");
    if (!entry || entry.startsWith("#")) continue;
    names.add(entry);
  }
  return names;
}

const skipped = ignoredDirectories();

/** Every `.mjs`, `.cjs` and `.js` file in the repository's own tree. */
function walk(dir = root, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || skipped.has(entry.name)) continue;
      walk(join(dir, entry.name), found);
    } else if (/\.[cm]?js$/.test(entry.name)) {
      found.push(relative(root, join(dir, entry.name)).split(sep).join(posix.sep));
    }
  }
  return found;
}

const files = walk();

/** A file is a test if it asks for the test runner, not if it is named like one. */
function holdsTests(relPath) {
  return /from\s+["']node:test["']/.test(readFileSync(join(root, relPath), "utf8"));
}

test("the repository has test files to find at all", () => {
  // Without this the two cases below are both vacuously true, which is the one
  // way a discovery check can pass while discovering nothing.
  assert.ok(files.length > 0, "found no JavaScript in the repository");
  assert.ok(files.filter(holdsTests).length >= 10, "found almost no test files, so the walk is wrong");
});

test("the settled invocation finds every file that holds tests", () => {
  const missed = files.filter((f) => holdsTests(f) && !isDiscovered(f));
  assert.deepEqual(
    missed,
    [],
    "these import node:test but are not named so `" +
      INVOCATION +
      "` finds them. Rename to test-<name>.mjs or <name>.test.mjs, or the cases in them never run."
  );
});

test("and runs nothing that is not a test", () => {
  const swept = files.filter((f) => isDiscovered(f) && !holdsTests(f));
  assert.deepEqual(
    swept,
    [],
    "these are named like test files but hold no tests, so `" +
      INVOCATION +
      "` would run them as scripts and report whatever they exit with as a result"
  );
});

test("the measurement scripts are not part of the suite", () => {
  // The specific fault the glob form had. Named rather than left to the
  // general case above, because the reason is not the naming: one of these two
  // launches a browser and exits non-zero without it, which is a failing suite
  // on a clone with nothing installed.
  for (const script of ["tools/measure-font-widths.mjs", "tools/measure-sheet-composition.mjs"]) {
    assert.ok(files.includes(script), script + " is missing");
    assert.equal(isDiscovered(script), false, script + " would be run as a test file");
  }
});

test("nor is anything in the fixtures folder", () => {
  const fixtures = files.filter((f) => f.startsWith("tools/fixtures/"));
  assert.ok(fixtures.length > 0, "tools/fixtures/ holds no modules, so this check proves nothing");
  for (const fixture of fixtures) {
    assert.equal(isDiscovered(fixture), false, fixture + " would be swept in");
  }
});

test("no test file documents an invocation that does not work", () => {
  /** The two forms this item retired, and what is wrong with each. */
  const retired = [
    [/node --test tools\/(?![\w*.])/, "`node --test tools/` resolves the folder as a module and exits"],
    [/node --test tools\/\*/, "the glob form runs the measurement scripts as tests"],
  ];
  /** @type {string[]} */
  const offences = [];
  // This file is exempt from its own check: the header above quotes both
  // retired forms on purpose, because a reader who finds one in an old note
  // needs to be told what was wrong with it rather than left to rediscover it.
  const self = "tools/test-suite-invocation.mjs";
  for (const file of files.filter((f) => f !== self && holdsTests(f))) {
    const source = readFileSync(join(root, file), "utf8");
    for (const [pattern, why] of retired) {
      if (pattern.test(source)) offences.push(file + ": " + why);
    }
  }
  assert.deepEqual(offences, [], offences.join("\n"));
});

test("and the README tells a reader the one that does", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(
    readme,
    new RegExp("`" + INVOCATION + "`"),
    "README.md does not record how to run the suite, so the only statement of it is in this header"
  );
});
