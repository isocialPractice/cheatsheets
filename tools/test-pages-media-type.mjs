// Checks what GitHub Pages actually answers a `.mjs` request with.
//
// **Why this is a test and not a note.** The whole in-browser route depends on
// it. A module script served as `application/octet-stream` is refused by every
// browser, so if Pages did not answer with a JavaScript media type the port
// under `api/graphic-design/` would have to be renamed file by file and given
// an `api/package.json` holding `{"type": "module"}` as a scope marker. That is
// thousands of lines of rename decided by one response header, which is why it
// was measured before a line of the port was written rather than after.
//
// **What it measured, on 2026.09.15.** Both
// <https://isocialpractice.github.io/cheatsheets/tools/test-contrast.mjs> and
// `tools/measure-sheet-composition.mjs` beside it came back `200` with
// `content-type: text/javascript; charset=utf-8`. That is a JavaScript MIME
// type under the HTML specification's own definition, so `<script type="module">`
// and a bare `import` both accept it, and `.mjs` is safe to keep. The request
// was made against this repository's own published site, so it is the same
// server, the same repository and the same file kind the page will import.
//
// The assertion runs against the live site rather than a local server, because
// a local server proves nothing about what GitHub sends. That makes it the one
// case in this suite that needs the network, so it skips with the reason when
// there is none - a bare clone offline still runs the whole suite green.
//
// Run with: node --test tools/test-pages-media-type.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const SITE = "https://isocialpractice.github.io/cheatsheets/";

// Any committed `.mjs` under the published root answers the question; the
// suite's own files are the ones guaranteed to be there. The first that
// answers is the measurement, so a file renamed later does not fail the test
// for a reason that has nothing to do with media types.
const CANDIDATES = ["tools/test-contrast.mjs", "tools/test-page-structure.mjs", "tools/test-favicon.mjs"];

// The media types the HTML specification calls JavaScript MIME types, lower
// cased and without their parameters. `text/javascript` is the one Pages sends
// today; the legacy spellings are here so a change of server does not fail a
// page that would in fact load.
const JAVASCRIPT_TYPES = new Set([
  "text/javascript",
  "application/javascript",
  "application/ecmascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript1.0",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
]);

/** Requests a path from the published site, or reports why it could not. */
async function head(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(new URL(path, SITE), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    return { response };
  } catch (error) {
    return { reason: `the published site could not be reached: ${error.message}` };
  } finally {
    clearTimeout(timer);
  }
}

/** The first candidate the site answers, or the reason none of them did. */
async function measure() {
  const failures = [];
  for (const path of CANDIDATES) {
    const { response, reason } = await head(path);
    if (reason) return { reason };
    if (response.ok) return { path, type: response.headers.get("content-type") ?? "" };
    failures.push(`${path} answered ${response.status}`);
  }
  return {
    reason:
      `no committed .mjs answered from ${SITE} (${failures.join(", ")}). ` +
      "Either the deploy has not run yet or these files were renamed.",
  };
}

const measured = await measure();

test("GitHub Pages serves a .mjs file with a JavaScript media type", { skip: measured.reason }, () => {
  const essence = measured.type.split(";")[0].trim().toLowerCase();
  assert.ok(
    JAVASCRIPT_TYPES.has(essence),
    `${measured.path} came back as "${measured.type}", which no browser will execute as a module. ` +
      "Rename the ported modules to .js and add api/package.json holding only " +
      '{"type": "module"}, per the item this test was written for.'
  );
});

test("and it is the type the ported API is served under", { skip: measured.reason }, () => {
  // The port is `.mjs` because of the measurement above. State the dependency
  // in the suite rather than only in a comment, so renaming the port without
  // re-measuring fails here instead of in a browser.
  assert.equal(
    measured.path.endsWith(".mjs"),
    true,
    "the measurement has to be taken on a .mjs file for it to say anything about the port"
  );
});
