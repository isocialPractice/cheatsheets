// Behavioural checks for selectExample() in index.html, run against a stub DOM
// so the page's own script is the code under test rather than a copy of it.
// Run with: node --test tools/test-example-selection.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const script = html.slice(
  html.indexOf("<script>") + "<script>".length,
  html.lastIndexOf("</script>")
);

// The source text tests below both read selectExample() out of the page script.
// One helper does it, and throws when either marker moves, so renaming the
// function or correcting the misspelled "// SUPORT FUNCTION" heading fails the
// tests outright instead of silently widening them to the whole script - which
// is what a bare indexOf returning -1 does through slice(0, -1).
function selectExampleSource() {
  const start = script.indexOf("function selectExample");
  if (start === -1) {
    throw new Error(
      "index.html no longer declares 'function selectExample'; " +
        "update the marker this helper slices from"
    );
  }
  const body = script.slice(start);
  const end = body.indexOf("\n// SUPORT FUNCTION");
  if (end === -1) {
    throw new Error(
      "index.html no longer carries the '// SUPORT FUNCTION' comment that ends " +
        "selectExample(); update the marker this helper slices to"
    );
  }
  return body.slice(0, end);
}

// A freshly loaded page: #curCheatSheetImg still carries the placeholder src
// the markup ships with, and the footnote is hidden.
function loadPage() {
  const el = (id, extra = {}) => ({ id, style: {}, value: "", ...extra });

  const optgroup = el("javaScriptArrays", { style: { display: "none" } });
  const selectExampleDiv = el("selectExample", {
    style: { display: "none" },
    getElementsByTagName: (tag) => (tag === "optgroup" ? [optgroup] : []),
  });
  const category = el("category", { nextElementSibling: selectExampleDiv });
  const showFootNote = el("showFootNote", { style: { display: "none" } });
  const curCheatSheetImg = el("curCheatSheetImg", {
    style: { display: "none" },
    src: "javaScriptArrays/.jpg",
  });

  const byId = {
    selectExample: selectExampleDiv,
    category,
    showFootNote,
    curCheatSheetImg,
  };

  const appended = [];
  const requests = [];

  const sandbox = {
    console: { clear() {}, log() {} },
    document: {
      getElementById: (id) => byId[id],
      createElement: () => ({}),
      body: { appendChild: (node) => appended.push(node) },
    },
    XMLHttpRequest: function () {
      // statusText is empty by default because that is what the published site
      // sees: HTTP/2 carries no reason phrase, so Chromium reports "" whatever
      // the status is. Only status says what happened.
      const request = { onload: null, onerror: null, status: 200, statusText: "" };
      request.open = (method, url) => {
        request.url = url;
      };
      request.send = () => requests.push(request);
      return request;
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);

  return { sandbox, showFootNote, curCheatSheetImg, appended, requests };
}

// Answer the pending image request the way a server would. statusText stays
// empty unless a case names one, modelling the HTTP/2 responses the published
// site actually returns.
function respond(page, status, statusText = "") {
  const request = page.requests.pop();
  request.status = status;
  request.statusText = statusText;
  request.onload.call(request);
  return request;
}

// Fail the pending request outright, the way a blocked or dropped one does.
function fail(page) {
  const request = page.requests.pop();
  request.onerror.call(request);
  return request;
}

test("the footnote shows on the very first selection of a fresh page", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });

  // The regression: this read the stale placeholder src, whose ".jpg"
  // basename is exactly 4 characters, and left the footnote hidden until a
  // second selection had replaced the src.
  assert.equal(page.showFootNote.style.display, "block");
});

test("the footnote survives the image request completing", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });
  respond(page, 200);

  assert.equal(page.showFootNote.style.display, "block");
  assert.equal(page.curCheatSheetImg.style.display, "block");
});

test("the footnote stays hidden when no example is selected", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "" });

  assert.equal(page.showFootNote.style.display, "none");
});

test("a missing cheatsheet image hides both the image and the footnote", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });
  // No reason phrase, as on the published site. Reading statusText here found
  // "" rather than "Not Found", took the 404 for a hit, and set the missing
  // path as the src - a broken image icon in place of a hidden one.
  respond(page, 404);

  assert.equal(page.showFootNote.style.display, "none");
  assert.equal(page.curCheatSheetImg.style.display, "none");
  assert.equal(page.curCheatSheetImg.src, "");
});

test("a 404 carrying a reason phrase is still a miss", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });
  // What the HTTP/1.1 development server sends, which is the only case the
  // reason phrase branch ever handled.
  respond(page, 404, "Not Found");

  assert.equal(page.showFootNote.style.display, "none");
  assert.equal(page.curCheatSheetImg.style.display, "none");
});

test("a response carrying no status line is not a ruling against the sheet", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });
  // Status 0 inside onload means a response arrived over a scheme that sends no
  // status line. No scheme the page is opened over produces it - a file:// page
  // never reaches onload at all, as the case below records - but a zero is
  // still not a non-2xx, so the probe has ruled nothing out.
  respond(page, 0);

  assert.equal(page.curCheatSheetImg.src, "javaScriptArrays/SortingArrays.jpg");
  assert.equal(page.curCheatSheetImg.style.display, "block");
  assert.equal(page.showFootNote.style.display, "block");
});

test("an unanswered probe leaves the sheet to the image element", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });
  // What a file:// page does, measured in Chromium on 2026.09.09: the page's
  // own XMLHttpRequest is refused by the CORS rules, onload never fires, and
  // onerror runs at readyState 4 with status 0. The <img> element is not
  // refused the same read and decodes the sheet from disk, so hiding it here
  // would hide a sheet that is sitting right there. The footnote stays too: the
  // example script loads on its own and logs the console output it points at.
  fail(page);

  assert.equal(page.curCheatSheetImg.src, "javaScriptArrays/SortingArrays.jpg");
  assert.equal(page.curCheatSheetImg.style.display, "block");
  assert.equal(page.showFootNote.style.display, "block");
});

test("the image element hides itself when it cannot decode what got through", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });
  fail(page);
  // The other half of an unanswered probe: a dropped or blocked request over
  // HTTP reaches the same branch, and there the element cannot load the sheet
  // either. Its own onerror hides it, so no broken icon survives a probe that
  // went unanswered. The footnote stays, because the example script is fetched
  // separately from the image.
  page.curCheatSheetImg.onerror.call(page.curCheatSheetImg);

  assert.equal(page.curCheatSheetImg.style.display, "none");
  assert.equal(page.showFootNote.style.display, "block");
});

test("the selection loads its script and image by relative path", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });

  assert.equal(page.appended[0].src, "javaScriptArrays/SortingArrays.js");
  assert.equal(page.requests[0].url, "javaScriptArrays/SortingArrays.jpg");
});

test("the footnote is decided without reading the image element's src", () => {
  const fn = selectExampleSource();

  assert.doesNotMatch(fn, /curCheatSheetImg\.src\.replace/);
  assert.doesNotMatch(fn, /lastIndexOf\("\/"\)/);
});

test("the image request is judged by status rather than by reason phrase", () => {
  const fn = selectExampleSource();

  assert.doesNotMatch(fn, /statusText/);
  assert.match(fn, /this\.status/);
});

test("the source helper refuses to read a function it cannot find both ends of", () => {
  // The failure the helper exists to stop: with either marker gone, indexOf
  // returns -1 and slice(0, -1) hands back nearly the whole script, so both
  // tests above keep passing while reading code they do not name.
  assert.match(script, /function selectExample/);
  assert.match(script, /\n\/\/ SUPORT FUNCTION/);
  assert.doesNotMatch(selectExampleSource(), /function removeSpaceInVariable/);
});
