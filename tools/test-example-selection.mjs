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
      const request = { onload: null, statusText: "OK" };
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

// Answer the pending image request the way a server would.
function respond(page, statusText) {
  const request = page.requests.pop();
  request.statusText = statusText;
  request.onload.call(request);
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
  respond(page, "OK");

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
  respond(page, "Not Found");

  assert.equal(page.showFootNote.style.display, "none");
  assert.equal(page.curCheatSheetImg.style.display, "none");
  assert.equal(page.curCheatSheetImg.src, "");
});

test("the selection loads its script and image by relative path", () => {
  const page = loadPage();
  page.sandbox.selectExample({ value: "Sorting Arrays" });

  assert.equal(page.appended[0].src, "javaScriptArrays/SortingArrays.js");
  assert.equal(page.requests[0].url, "javaScriptArrays/SortingArrays.jpg");
});

test("the footnote is decided without reading the image element's src", () => {
  const body = script.slice(script.indexOf("function selectExample"));
  const fn = body.slice(0, body.indexOf("\n// SUPORT FUNCTION"));

  assert.doesNotMatch(fn, /curCheatSheetImg\.src\.replace/);
  assert.doesNotMatch(fn, /lastIndexOf\("\/"\)/);
});
