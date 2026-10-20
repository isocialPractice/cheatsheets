// What colouring a code line token by token promises.
//
// The reading itself belongs to highlight.js and the runs to the drawing
// surface, so nothing here re-asserts either. What is this repository's own is
// the step between them and the sheet: which of the six roles a scope draws
// in, how a line is cut out of a block read as one piece, and what happens
// when there is nothing to read with. Those are what the cases below hold.
//
// A raster or markup pin would be the wrong shape for this. highlight.js reads
// 193 grammars on its own release schedule, so a committed SVG of an accented
// panel would fail the day a grammar improved, naming this repository as the
// thing that changed. The assertions are over roles instead.
//
// Run with: node --test tools/test-sheet-accents.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  accentRoles,
  accentsReady,
  composeSheet,
  prepareAccents,
  roleForScope,
  ACCENT_ROLE_ROLES,
  SCOPE_ROLES,
  SYNTAX,
} from "../api/cheatsheet/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The line this was all reported on, and the two it has to read like. */
const FORMS = "html-css/general-html-overview/forms-and-inputs";

test("nothing is coloured token by token before the reader is prepared", () => {
  // Ordered first on purpose: this is the only case that can see the
  // un-prepared state, because preparing is process-wide and permanent.
  // `forgetAccents` would hand it back, and it is not called here - a case that
  // depends on being run before its siblings is worse than one that says so.
  assert.equal(accentsReady(), false, "something prepared the reader before this case ran");
  assert.equal(accentRoles(["<p>x</p>"], "html"), null, "a reading came back with no reader installed");
});

test("the reader loads from the vendored copy with nothing installed", async () => {
  const { ready, reason } = await prepareAccents();
  assert.equal(reason, null);
  assert.equal(ready, true);
  assert.equal(accentsReady(), true);
});

test("and preparing again is the same answer, not a second load", async () => {
  assert.deepEqual(await prepareAccents(), { ready: true, reason: null });
});

test("every role a scope maps to is a colour the syntax palette has", () => {
  // The tables are this repository's own, and a role named in one that the
  // palette does not carry would reach `roleColor` and fall silently back to
  // plain - a token drawn in the wrong colour with nothing saying so.
  for (const [role, name] of Object.entries(ACCENT_ROLE_ROLES)) {
    assert.ok(Object.prototype.hasOwnProperty.call(SYNTAX, name), `${role} maps to ${name}, which is not a role`);
  }
  for (const [scope, name] of Object.entries(SCOPE_ROLES)) {
    assert.ok(Object.prototype.hasOwnProperty.call(SYNTAX, name), `${scope} maps to ${name}, which is not a role`);
  }
});

test("a scope nothing has a colour for draws plain rather than a function", () => {
  // The guard `roleColor` carries, for the same reason: `constructor` finds a
  // function on `Object.prototype` and reaches the renderer as a paint.
  assert.equal(roleForScope("constructor", {}), "plain");
  assert.equal(roleForScope("toString", {}), "plain");
  assert.equal(roleForScope("hasOwnProperty", {}), "plain");
  assert.equal(roleForScope("nothing-reads-this", {}), "plain");
  // And a scope a table really does name is still read, so the guard is a
  // guard and not a refusal.
  assert.equal(roleForScope("toString", { toString: "keyword" }), "keyword");
});

test("markup reads as structure, configuration and content, which is the rule", async () => {
  // `DESIGN_LANGUAGE-html-css.md` fixes what markup looks like: structure
  // yellow, configuration green, content white, strings amber. These are the
  // same four over tokens rather than over lines.
  const line = `<label><input type="radio" name="plan" value="free" checked> Free</label>`;
  const read = accentRoles([line], "html");
  assert.equal(read.missing, null);
  assert.equal(read.language, "xml", "html resolves to highlight.js's own id for it");

  const roleOf = (needle) => {
    const at = line.indexOf(needle);
    assert.notEqual(at, -1, `${needle} is not in the line`);
    const run = read.lines[0].find((r) => r.start <= at && r.end >= at + needle.length);
    assert.ok(run, `${needle} is not inside one run`);
    return run.role;
  };

  assert.equal(roleOf("<label>"), "keyword", "a tag is structure");
  assert.equal(roleOf("checked"), "identifier", "an attribute is configuration");
  assert.equal(roleOf("type"), "identifier");
  assert.equal(roleOf('"radio"'), "string");
  assert.equal(roleOf(" Free"), "plain", "prose between tags is content");
  assert.equal(roleOf("</label>"), "keyword");
});

test("a doctype is structure and not a value", () => {
  // The surface scopes it `meta`, which it groups with numbers; on a sheet that
  // is the bright green of a numeric literal, and a doctype is not one.
  const read = accentRoles(["<!DOCTYPE html>"], "html");
  assert.deepEqual([...new Set(read.lines[0].map((run) => run.role))], ["keyword"]);
});

test("a CSS declaration is configuration and its selector is structure", () => {
  const read = accentRoles([".card { color: #4DAE51; }"], "css");
  const roles = new Map();
  for (const run of read.lines[0]) roles.set(".card { color: #4DAE51; }".slice(run.start, run.end).trim(), run.role);
  assert.equal(roles.get(".card"), "keyword", "a selector is structure");
  assert.equal(roles.get("color"), "identifier", "a declaration is configuration");
});

test("JavaScript reads as the eleven sheets already declare themselves", () => {
  const read = accentRoles(["var A = [\"A\", \"B\"]; // two of them"], "javascript");
  const text = "var A = [\"A\", \"B\"]; // two of them";
  const roleAt = (needle) => {
    const at = text.indexOf(needle);
    return read.lines[0].find((r) => r.start <= at && r.end >= at + needle.length)?.role;
  };
  assert.equal(roleAt("var"), "keyword");
  assert.equal(roleAt('"A"'), "string");
  assert.equal(roleAt("// two of them"), "comment");
});

test("every line comes back fully covered, with no gap and no overlap", () => {
  const texts = [
    "/* a comment that",
    "   runs across two lines */",
    "",
    "const n = 12;",
  ];
  const read = accentRoles(texts, "javascript");
  texts.forEach((text, index) => {
    const runs = read.lines[index];
    let at = 0;
    for (const run of runs) {
      assert.equal(run.start, at, `line ${index} has a gap or an overlap at ${run.start}`);
      assert.ok(run.end > run.start, `line ${index} has an empty run`);
      at = run.end;
    }
    assert.equal(at, text.length, `line ${index} is covered to ${at} of ${text.length}`);
  });
});

test("a comment that runs across lines is a comment on both of them", () => {
  // The reason the whole block is read at once and then cut up. A line read on
  // its own is a fragment of a different program: `   runs across two lines */`
  // alone is not a comment to any grammar.
  const read = accentRoles(["/* a comment that", "   runs across two lines */"], "javascript");
  assert.deepEqual([...new Set(read.lines[0].map((r) => r.role))], ["comment"]);
  assert.deepEqual([...new Set(read.lines[1].map((r) => r.role))], ["comment"]);
});

test("adjacent stretches in one role are one run", () => {
  // `</`, `label` and `>` are three scopes and one colour, so they are one
  // element on the sheet. A stretch drawn as one element cannot develop a seam
  // in the middle of itself.
  const read = accentRoles(["</label>"], "html");
  assert.equal(read.lines[0].length, 1);
  assert.deepEqual(read.lines[0][0], { start: 0, end: 8, role: "keyword" });
});

test("a language nothing is registered under says so instead of drawing plain", () => {
  const read = accentRoles(["something"], "no-such-language");
  assert.equal(read.missing, "no-such-language");
  assert.deepEqual(read.lines, [], "a missing language came back with lines to draw");
});

test("and a sheet in one falls back to its declared roles, and reports that", () => {
  const { variation } = composeSheet(
    {
      title: "A Sheet In Nothing",
      language: "no-such-language",
      code: [{ text: "ichi", role: "keyword" }],
    },
    { seed: "fallback" }
  );
  assert.equal(variation.accents, "missing:no-such-language");
  const said = variation.notes.filter((note) => /no grammar is installed under that name/.test(note));
  assert.equal(said.length, 1, `the composition said nothing about the language:\n${variation.notes.join("\n")}`);
  assert.match(said[0], /written in no-such-language/);
});

test("a sheet that names no language composes by its per-line roles, silently", () => {
  // Silent because it is the documented default rather than a fault: the
  // fixture in `tools/test-render-fixture.mjs` pins this path, and the report
  // says `line` so a caller that meant to prepare can tell.
  const { variation } = composeSheet(
    { title: "A Sheet In Nothing", code: [{ text: "ichi", role: "keyword" }] },
    { seed: "fallback" }
  );
  assert.equal(variation.accents, "line");
  assert.deepEqual(
    variation.notes.filter((note) => /grammar|accent|language/.test(note)),
    [],
    "a sheet that names no language was told about accents it never asked for"
  );
});

test("every committed sheet composes token by token", async () => {
  // The claim the seventeen rest on. A sheet whose `language` was dropped, or
  // misspelled, draws in its per-line roles and looks finished; this is what
  // says so. `node tools/build-manifest.mjs --check` reports the same thing as
  // a warning on the Pages gate.
  const manifest = JSON.parse(await readFile(join(root, "cheatsheets.json"), "utf8"));
  const paths = [];
  const collect = (node) => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node || typeof node !== "object") return;
    if (typeof node.path === "string" && typeof node.kind === "string") paths.push(node.path);
    Object.values(node).forEach(collect);
  };
  collect(manifest);
  assert.ok(paths.length >= 17, `found ${paths.length} cheatsheets in the manifest, which is too few`);

  for (const path of paths) {
    const doc = JSON.parse(await readFile(join(root, ...path.split("/"), "sheet.json"), "utf8"));
    const { variation } = composeSheet(doc, { seed: doc.seed });
    assert.equal(variation.accents, "token", `${path} did not compose token by token`);
  }
});

test("the forms panel draws its three wrapped continuations alike", async () => {
  // The line the whole item was reported on. It carries an attribute and a
  // word of prose, so no one role was ever right for it - which is why the
  // answer is tokens rather than a different role. `checked` now reads as the
  // attribute it is, beside `required` on the two lines above it, and `Free`
  // reads as the prose it is.
  const doc = JSON.parse(await readFile(join(root, ...FORMS.split("/"), "sheet.json"), "utf8"));
  const { composition } = composeSheet(doc, { seed: doc.seed });
  const svg = composition.toSVG();

  /** The fill a word is drawn in, from the markup. */
  const fillOf = (word) => {
    const found = [...svg.matchAll(/<text[^>]*fill="([^"]*)"[^>]*>\s*<tspan[^>]*>([\s\S]*?)<\/tspan>/g)].find(
      (match) => match[2] === word
    );
    assert.ok(found, `no run of the sheet is exactly "${word}"`);
    return found[1];
  };

  assert.equal(fillOf("required"), SYNTAX.identifier);
  assert.equal(fillOf("checked"), SYNTAX.identifier, "checked is an attribute and draws like one now");
  assert.equal(fillOf(" Free"), SYNTAX.plain, "the visible label text is prose and stays white");
});
