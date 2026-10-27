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
// - **One of the three ignored working folders is not swept, and two are.**
//   `.tmp/` is skipped because Node's default patterns do not match into a dot
//   directory, which is why the real `.tmp/ui-ux/*.test.mjs` files a UI review
//   left behind are not part of the suite. `mcp-todo/` and `test-results/`
//   have no such protection: neither name starts with a dot, and Node has read
//   no `.gitignore`, so the command walks straight into both.
//
// ## What `.gitignore` decides here, and what it does not
//
// Until 2026.10.27 the walk below excluded every folder named in `.gitignore`,
// and the bullet above claimed the suite did too. It does not, and the gap was
// the whole of the fault: a UI/UX tester writes its record into
// `test-results/ui-ux-tester.agent/`, that record is sometimes a `.test.mjs`
// asserting the pre-fix state it was sent to measure, and the day after the fix
// lands it is a permanently failing case in the suite - which both discovery
// invariants were blind to, because the walk they read had excluded the one
// folder the command sweeps.
//
// The two were made to agree in the direction of the command, because the
// command is not this repository's to change in the other direction. There is
// no file-level exclusion flag on `node --test` - `--test-skip-pattern` filters
// by test name and still loads the file - and the only mechanism that works is
// the leading dot, which is `test-results/`'s name and not ours: the tester's
// own instructions name that folder, and they live outside this repository, so
// renaming it here would last until the next tester recreated it.
//
// So the walk sweeps what the command sweeps, and `.gitignore` answers a
// different question than it used to. It no longer decides what is *in* the
// suite; it decides what the repository *owns*. A file under an ignored folder
// is a working artifact, which is what makes the three cases below sayable:
// the repository's own tests must be named so the command finds them, anything
// the command runs has to hold tests, and nothing it runs may be an artifact.
// Only the last of those three is new, and it is the one that catches the next
// tester's record on the day it is written rather than on the day it goes red.
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
 * Directory names the walk does not enter, which is exactly what the command
 * does not enter.
 *
 * `node_modules` is Node's own exclusion. A leading dot is excluded because a
 * glob does not match into a dot directory unless asked to. There is nothing
 * else: a folder this repository ignores is still a folder the command walks,
 * and listing it here is what made this walk a description of something other
 * than the suite.
 */
const UNSWEPT = new Set(["node_modules"]);

/**
 * The working folders, read from `.gitignore`.
 *
 * Not an exclusion from the walk - see the header. This answers whether a file
 * the command found is the repository's own or somebody's leftover, so a
 * working folder added to `.gitignore` is classed as one by the same edit.
 */
function workingDirectories() {
  const names = new Set();
  for (const line of readFileSync(join(root, ".gitignore"), "utf8").split(/\r?\n/)) {
    const entry = line.trim().replace(/\/+$/, "");
    if (!entry || entry.startsWith("#")) continue;
    names.add(entry);
  }
  return names;
}

const working = workingDirectories();

/** Whether a path sits under a folder this repository does not keep. */
function isWorkingArtifact(relPath) {
  return relPath.split(posix.sep).slice(0, -1).some((segment) => working.has(segment));
}

/** Every `.mjs`, `.cjs` and `.js` file bare `node --test` would walk over. */
function walk(dir = root, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || UNSWEPT.has(entry.name)) continue;
      walk(join(dir, entry.name), found);
    } else if (/\.[cm]?js$/.test(entry.name)) {
      found.push(relative(root, join(dir, entry.name)).split(sep).join(posix.sep));
    }
  }
  return found;
}

const files = walk();

/** The repository's own JavaScript, which is the suite's own source. */
const owned = files.filter((file) => !isWorkingArtifact(file));

/** A file is a test if it asks for the test runner, not if it is named like one. */
function holdsTests(relPath) {
  return /from\s+["']node:test["']/.test(readFileSync(join(root, relPath), "utf8"));
}

test("the repository has test files to find at all", () => {
  // Without this the cases below are all vacuously true, which is the one way
  // a discovery check can pass while discovering nothing.
  assert.ok(owned.length > 0, "found no JavaScript in the repository");
  assert.ok(owned.filter(holdsTests).length >= 10, "found almost no test files, so the walk is wrong");
});

test("the settled invocation finds every file that holds tests", () => {
  // The repository's own files, and not everything the walk reached. A
  // scratch script under a working folder holds cases nobody meant to run, so
  // requiring it to be named discoverably would be asking for the fault the
  // case below this one exists to refuse.
  const missed = owned.filter((f) => holdsTests(f) && !isDiscovered(f));
  assert.deepEqual(
    missed,
    [],
    "these import node:test but are not named so `" +
      INVOCATION +
      "` finds them. Rename to test-<name>.mjs or <name>.test.mjs, or the cases in them never run."
  );
});

test("and runs nothing that is not a test", () => {
  // Every file the command sweeps, artifacts included: a working script named
  // like a test is run as one and reports whatever it exits with, which is the
  // same fault here as in `tools/`.
  const swept = files.filter((f) => isDiscovered(f) && !holdsTests(f));
  assert.deepEqual(
    swept,
    [],
    "these are named like test files but hold no tests, so `" +
      INVOCATION +
      "` would run them as scripts and report whatever they exit with as a result"
  );
});

test("and nothing it runs is a working artifact rather than the repository's own", () => {
  // The case the fault of 2026.10.26 was missing. A UI/UX tester's record is
  // written to prove a walk finds the defect it was sent to measure, which is
  // the right thing to assert on the day and a permanent failure the day after
  // the fix lands - so this catches it by where it sits, before it has had a
  // chance to go red for a reason nobody can act on.
  //
  // The remedy in the message is a rename rather than a move or a delete. The
  // record belongs in the folder the tester keeps its records in, and the
  // `.cases.mjs` suffix leaves it readable, runnable by explicit path, and
  // matched by none of the patterns above. `CONTRIBUTING.md` records it where a
  // tester reads it.
  const artifacts = files.filter(isDiscovered).filter(isWorkingArtifact);
  assert.deepEqual(
    artifacts,
    [],
    "these sit under a folder `.gitignore` excludes, so they are leftovers rather than this repository's tests, and `" +
      INVOCATION +
      "` runs them anyway. Rename each to <name>.cases.mjs, which keeps the record and takes it out of the sweep."
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
  // The repository's own files again, for the reason the discovery case gives:
  // a leftover under a working folder is nobody's to hold to this repository's
  // documentation, and the case above has already asked for it to be renamed.
  const self = "tools/test-suite-invocation.mjs";
  for (const file of owned.filter((f) => f !== self && holdsTests(f))) {
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
