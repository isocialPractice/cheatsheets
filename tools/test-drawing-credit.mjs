// The one rule in this repository that nothing could check: a commit that
// draws credits `graphic-designer`.
//
// It was stated in three places - the collaborators constant, `CONTRIBUTING.md`
// and the conventions under **New Cheatsheets** in `TODO.md` - and satisfied in
// none, for the whole of the time it was written down. Nothing noticed, because
// a rule about commit messages has no code to fail: the suite could not see the
// trailer, the manifest gate had no opinion about it, and the three statements
// of it were prose that happened to agree.
//
// They did not keep agreeing. The wording read two ways - a co-author on a
// commit, or a collaborator on the repository - and that ambiguity is what the
// decision of 2026.11.02 closed. This file is what stops it reopening.
//
// ## What is checked, and why each is worth a case
//
// | Case | Catches |
// | --- | --- |
// | One trailer, named exactly | The form drifting from the form a committer copies |
// | The collaborator reading refused | Somebody "fixing" the vocabulary back to the dangerous reading |
// | No item lists it as a step | The line creeping back into queued work that cannot carry it out |
//
// The third is the one with a future. **New Cheatsheets** is a section of more
// than fifty items added a few at a time over months, every one of them about
// drawing something, and the line was in the section's own conventions - so
// every item inherited a step it had no way to perform. A case is what keeps
// the next item from inheriting it again.
//
// ## What is deliberately not checked
//
// **Whether any particular commit carries the trailer.** The suite reads files,
// not history, and a case that shelled out to `git log` would fail on a source
// archive, in a shallow clone and on any checkout where the drawing commits are
// older than the fetch depth - none of which is this repository being wrong.
// Reading the history is how the gap was *found*, and the command is in
// `CONTRIBUTING.md` for a person to run:
//
//     git log --grep=graphic-designer -i
//
// **The constants file.** `.claude/constants.md` is the operator's, and a run
// neither edits it nor holds it to a test. What a case here can do is keep the
// documents that *describe* it honest, which is what it does.
//
// Run with: node --test tools/test-drawing-credit.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contributing = readFileSync(join(root, "CONTRIBUTING.md"), "utf8");
const todo = readFileSync(join(root, "TODO.md"), "utf8");

/**
 * The trailer, as the decision settled it.
 *
 * Written out here rather than parsed out of the document, because this is the
 * assertion: a copy in the test and a copy in the document that have to match
 * is the whole mechanism. Deriving it from the document would make the case
 * agree with whatever the document said.
 */
const TRAILER = "Co-Authored-By: graphic-designer <noreply@anthropic.com>";

/**
 * A level 2 section of a document, from its heading to the next level 2.
 *
 * @param {string} source
 * @param {string} heading The heading text, without the `## `.
 * @returns {string}
 */
function section(source, heading) {
  const at = source.indexOf(`\n## ${heading}`);
  assert.notEqual(at, -1, `${JSON.stringify(heading)} is not a section of the document`);
  const rest = source.slice(at + 1);
  const next = rest.indexOf("\n## ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

const rule = section(contributing, "A commit that draws gets a collaborator");

/**
 * The rule's prose with its line wrapping collapsed.
 *
 * A sentence in a hard wrapped document has its words split across lines
 * wherever the column ran out, so a pattern written as a phrase matches or
 * fails on where the wrap landed - which is a property of the editor and not of
 * what the document says. Collapsing the runs of whitespace is what makes a
 * prose assertion about meaning rather than about typography.
 */
const prose = rule.replace(/\s+/g, " ");

test("CONTRIBUTING.md names the trailer exactly, and names it once", () => {
  assert.ok(
    rule.includes(TRAILER),
    `the drawing rule does not name the trailer. It has to read exactly:\n  ${TRAILER}`
  );
  // Once, in a block a reader can copy. Twice is two things to keep in step,
  // which is the failure mode this whole file is about.
  assert.equal(
    rule.split(TRAILER).length - 1,
    1,
    "the trailer is written more than once in its own section"
  );
  assert.match(rule, /```text\nCo-Authored-By: graphic-designer <noreply@anthropic\.com>\n```/);
});

test("and the trailer is a trailer git will parse, with the email that credits nobody", () => {
  // `Co-Authored-By` is the key GitHub reads, a colon and a space separate it
  // from the value, and the value is a name and an angle-bracketed address.
  const [key, value] = TRAILER.split(": ");
  assert.equal(key, "Co-Authored-By");
  assert.match(value, /^[^<>]+ <[^<>@\s]+@[^<>@\s]+>$/);
  // The address is the one this repository already credits agent work to, and
  // the reason it matters is that GitHub attributes a co-author by **email**:
  // an address resolving to the unrelated `graphic-designer` account would put
  // a stranger on the drawing commits.
  assert.ok(value.endsWith("<noreply@anthropic.com>"));
});

test("the dangerous reading is refused in writing, not merely unused", () => {
  // The decision's substance. A later reader meeting "add as a collaborator"
  // will reach for the repository's collaborator list, because that is what the
  // words mean everywhere else - so the document has to say why not, and the
  // case has to keep the saying there.
  assert.match(prose, /never means a repository collaborator/i);
  assert.match(prose, /push access to a stranger/i);
  // And it says who adds the trailer, which is the half that explains why no
  // amount of queued work ever satisfied the rule.
  assert.match(rule, /### Who adds it/);
  assert.match(prose, /does not call `git`/);
});

test("the New Cheatsheets conventions point at the rule rather than restating it", () => {
  // One statement of the trailer, in one document. The conventions used to
  // carry their own sentence about it, and two sentences about one rule in two
  // files is how they came to disagree.
  const conventions = section(todo, "New Cheatsheets");
  assert.match(conventions, /`graphic-designer` is credited on the commit, not by the item/);
  assert.match(conventions, /CONTRIBUTING\.md/);
  assert.ok(
    !conventions.includes(TRAILER),
    "the conventions restate the trailer instead of pointing at the one place it is written"
  );
});

test("no queued item asks for a step a run cannot carry out", () => {
  // The case with a future. Every item under **New Cheatsheets** is about
  // drawing, they arrive a few at a time, and the one the line was written into
  // was the section's own conventions - so the next item added inherits it
  // again unless something says no.
  //
  // Scoped to the live queue on purpose. `## Complete` is a record of what was
  // actually asked for at the time, including the steps that turned out to be
  // unperformable, and rewriting it would destroy the evidence this decision
  // was reached from.
  const live = todo.slice(0, todo.indexOf("\n## Complete"));
  assert.notEqual(live.length, 0, "TODO.md has no `## Complete` to read back from");
  // Anchored at the start of the bullet, which is what makes this a check for
  // a **step** rather than for a mention. An item may say the words - the item
  // that settled this question had them in its own title, in quotes - and what
  // is being refused is a bullet that opens by telling the work to do it, the
  // form every archived cheatsheet item carries.
  const asks = live
    .split("\n")
    .map((line, index) => ({ line, at: index + 1 }))
    .filter(({ line }) => /^\s*-\s+(?:\[[ x]\]\s+)?Add(?:ing|s)?\s+`?graphic-designer`?\s+as\s+a\s+collaborator/i.test(line));
  assert.deepEqual(
    asks.map(({ at, line }) => `TODO.md:${at}: ${line.trim()}`),
    [],
    "a queued item lists adding the collaborator among its steps. Whoever writes " +
      "the commit adds the trailer; an item cannot, because a run records a commit " +
      "mode and does not call git. See `### Who adds it` in CONTRIBUTING.md."
  );
});
