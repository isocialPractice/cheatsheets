// Checks what GitHub Pages actually answers a `.mjs` request with.
//
// **Why this is a test and not a note.** The whole in-browser route depends on
// it. A module script served as `application/octet-stream` is refused by every
// browser, so if Pages did not answer with a JavaScript media type the page
// could not import `api/cheatsheet/` at all, and the drawing surface it reaches
// could not be loaded either.
//
// It was measured before a line of the composition layer was written, because
// the answer decided the file naming for the whole of `api/`: a server that
// refused `.mjs` would have meant renaming every module and adding an
// `api/package.json` holding `{"type": "module"}` as a scope marker. The
// vendored surface ships `.js` and carries scope markers of its own, inside
// `api/napkin-sketch/` and never above it, so Pages has to answer for both
// extensions - which it does, both being JavaScript to it.
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
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SITE = "https://isocialpractice.github.io/cheatsheets/";

// Any committed `.mjs` under the published root answers the question; the
// suite's own files are the ones guaranteed to be there. The first that
// answers is the measurement, so a file renamed later does not fail the test
// for a reason that has nothing to do with media types.
const CANDIDATES = ["tools/test-contrast.mjs", "tools/test-page-structure.mjs", "tools/test-favicon.mjs"];

// And the same question for `.js`, which the page now also imports as a module.
// The drawing surface vendored into `api/napkin-sketch/` on 2026.10.14 is a
// published build and is `.js` throughout, so the measurement above stopped
// covering everything the page loads the moment it landed. Measured against the
// live site that day: `application/javascript; charset=utf-8`, which is a
// JavaScript MIME type under the same definition.
//
// An example payload rather than the vendored entry, because a payload is a
// committed `.js` whose path the catalog already asserts and the vendored
// folder is not: `tools/build-manifest.mjs --check` holds every one of these
// against `cheatsheets.json`, so a renamed payload fails there rather than
// quietly skipping this.
//
// They are the migrated paths, not the pre-2026.09.24 `javaScriptArrays/*.js`
// the eleven were published under. That folder has held only its `.jpg`
// reference images since the migration, so the old names answer today only
// because the deploy is behind - and would 404 the moment it caught up, which
// is a case that skips for good rather than one that measures anything.
const JS_CANDIDATES = [
  "javascript/arrays/changing-elements/changing-elements.js",
  "javascript/arrays/sorting-arrays/sorting-arrays.js",
  "javascript/arrays/slicing-arrays/slicing-arrays.js",
];

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

/**
 * The first candidate the site answers, or the reason none of them did.
 *
 * @param {string[]} candidates
 * @param {string} extension Named in the failure, so a skip says what went unmeasured.
 */
async function measure(candidates, extension) {
  const failures = [];
  for (const path of candidates) {
    const { response, reason } = await head(path);
    if (reason) return { reason };
    if (response.ok) return { path, type: response.headers.get("content-type") ?? "" };
    failures.push(`${path} answered ${response.status}`);
  }
  return {
    reason:
      `no committed ${extension} answered from ${SITE} (${failures.join(", ")}). ` +
      "Either the deploy has not run yet or these files were renamed.",
  };
}

const measured = await measure(CANDIDATES, ".mjs");
const measuredJs = await measure(JS_CANDIDATES, ".js");

test("every candidate is a file this repository actually publishes", async () => {
  // The one case here that needs no network, and the only thing standing
  // between a renamed candidate and a case that skips for good. Both lists are
  // read by `measure` above, which treats a 404 as "the deploy has not run
  // yet" - correct while a path is waiting for a deploy, and indistinguishable
  // from a path that is never coming. A path missing from the tree is the
  // second of those, so it is answered here instead.
  //
  // The fault this is for: the `.js` list named `javaScriptArrays/*.js`, which
  // the eleven examples were published under until they moved into
  // `javascript/arrays/<slug>/` on 2026.09.24. The old names still answered
  // from the live site, because the deploy was behind, so the case passed while
  // measuring a file no commit since the migration contains.
  for (const path of [...CANDIDATES, ...JS_CANDIDATES]) {
    await assert.doesNotReject(
      () => access(join(root, ...path.split("/"))),
      `${path} is a candidate here and is not in the tree, so the case that reads it can only skip`
    );
  }
});

test("the reference images are left out of the artifact, and nothing served asks for them", async () => {
  // The decision of 2026.10.26, in the two halves that can go wrong
  // independently. Needs no network: it is about what the artifact holds, not
  // about what the server answers with.
  //
  // The eleven JPEGs are 88.5% of the tracked bytes and the site requests none
  // of them, so the `build` job deletes them from its own checkout. The risk
  // that creates is not the deletion - it is someone later writing a reference
  // to one into a file that *does* ship, which resolves locally and 404s on
  // the site. That is the second half below, and it is the half worth having.
  const workflow = await readFile(join(root, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(
    workflow,
    /rm javaScriptArrays\/\*\.jpg/,
    "the build job no longer drops the reference images, so the artifact carries 20 MB nothing asks for"
  );
  assert.match(
    workflow,
    /test -e javaScriptArrays\/README\.md/,
    "the step no longer checks the README survives, so the folder can 404 on the site"
  );
  // Only the JPEGs, and only by that glob. A step widened to the folder would
  // take the README with it.
  assert.doesNotMatch(
    workflow,
    /rm -r\w* javaScriptArrays\b(?!\/\*\.jpg)/,
    "the step removes the whole folder rather than the images in it"
  );

  // The second half. Every file the artifact still carries, read for a
  // reference to the folder - prose in a markdown file is a link a reader
  // follows and is fine, so only the files a browser resolves paths out of
  // are read: the page, the catalog, and every sheet document.
  const served = ["index.html", "cheatsheets.json"];
  const manifest = JSON.parse(await readFile(join(root, "cheatsheets.json"), "utf8"));
  for (const category of manifest.categories) {
    for (const sheet of category.cheatsheets) served.push(`${sheet.path}/sheet.json`);
  }
  for (const path of served) {
    const text = await readFile(join(root, ...path.split("/")), "utf8");
    assert.doesNotMatch(
      text,
      /javaScriptArrays/,
      `${path} ships and names javaScriptArrays/, which the artifact no longer carries`
    );
  }
});

test("GitHub Pages serves a .mjs file with a JavaScript media type", { skip: measured.reason }, () => {
  const essence = measured.type.split(";")[0].trim().toLowerCase();
  assert.ok(
    JAVASCRIPT_TYPES.has(essence),
    `${measured.path} came back as "${measured.type}", which no browser will execute as a module. ` +
      "Rename the modules under api/cheatsheet/ to .js and give that folder a " +
      'package.json holding only {"type": "module"}, per the item this test was written for.'
  );
});

test("and it is the type the composition layer is served under", { skip: measured.reason }, () => {
  // `api/cheatsheet/` is `.mjs` because of the measurement above. State the
  // dependency in the suite rather than only in a comment, so renaming those
  // modules without re-measuring fails here instead of in a browser.
  assert.equal(
    measured.path.endsWith(".mjs"),
    true,
    "the measurement has to be taken on a .mjs file for it to say anything about api/cheatsheet/"
  );
});

test("and it serves a .js file with one too, which is what the surface ships", { skip: measuredJs.reason }, () => {
  // The page imports `api/cheatsheet/` as `.mjs` and that layer imports
  // `api/napkin-sketch/graphic-design/index.js`. Both extensions therefore
  // have to be executable as modules, and only one of them was ever measured.
  //
  // Nothing about this is a reason to rename the vendored files: nothing under
  // that folder is edited, and `napkin-sketch vendor` writes each part's files
  // byte for byte so their imports resolve as they do in the package, which a
  // rename would break. The measurement is here so that
  // if a server ever stopped answering for `.js`, the suite says so rather than
  // a reader meeting a page that draws nothing.
  const essence = measuredJs.type.split(";")[0].trim().toLowerCase();
  assert.ok(
    JAVASCRIPT_TYPES.has(essence),
    `${measuredJs.path} came back as "${measuredJs.type}", and the vendored drawing surface is ` +
      ".js throughout, so no browser would execute it as a module."
  );
});
