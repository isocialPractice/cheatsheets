// Drives a real engine over every committed sheet and asks whether a code
// line split into several `<text>` elements draws where it was placed.
//
// **This is the acceptance check for colouring a line token by token.**
// `tools/test-sheet-accents.mjs` holds the roles - which scope draws in which
// of the six colours, and how a line is cut out of a block read as one piece -
// and every case in it is arithmetic against arithmetic. What none of them can
// answer is whether the runs the composer placed sit flush against each other
// once a browser has drawn the glyphs. While a line was one element the
// question could not be asked: the engine laid the whole line out itself and
// absorbed its own kerning. Split, the table decides where every run starts
// and the engine decides how wide each one draws, so any disagreement between
// them lands at a boundary as a gap a reader can see.
//
// It is the sibling of `tools/test-sheet-faces-browser.mjs`, which asks the
// same kind of question about whole runs, and it is written the same way:
// composed in Node, drawn in Chromium at the page's own cap, measured in
// composition units and reported in page pixels. Nothing is added to the
// repository for it - Playwright is looked for at run time in the places it
// is actually installed and every case skips with the reason where it is
// absent. Install it for a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// No server either, and that is deliberate: the composition is the subject,
// not the page, so the SVG goes straight into `setContent` and the sheets are
// read off disk. `tools/test-sheet-accent-arrival-browser.mjs` is the one that
// needs a page, because what it measures is when the page's own controls
// arrive.
//
// Run with: node --test tools/test-sheet-accent-seams-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { accentRoles, composeSheet, prepareAccents } from "../api/cheatsheet/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. Identical to
// `tools/test-sheet-faces-browser.mjs`, so a machine that runs one runs both.
function candidateBases() {
  const bases = [import.meta.url];
  const globals = [];
  if (process.platform === "win32" && process.env.APPDATA) {
    globals.push(join(process.env.APPDATA, "npm", "node_modules"));
  }
  globals.push("/usr/local/lib/node_modules", "/usr/lib/node_modules");
  for (const dir of globals) {
    bases.push(pathToFileURL(join(dir, "resolve-from-here.js")).href);
    bases.push(pathToFileURL(join(dir, "@playwright", "test", "index.js")).href);
  }
  return bases;
}

async function loadChromium() {
  const named = process.env.PLAYWRIGHT_MODULE;
  const specifiers = named ? [named] : [];
  for (const base of candidateBases()) {
    const require = createRequire(base);
    for (const name of ["playwright", "playwright-core"]) {
      try {
        specifiers.push(pathToFileURL(require.resolve(name)).href);
      } catch {
        // Not installed at this base, the ordinary case for all but one.
      }
    }
  }
  for (const specifier of specifiers) {
    try {
      const module = await import(specifier);
      const chromium = module.chromium ?? module.default?.chromium;
      if (chromium) return { chromium };
    } catch {
      // Try the next one.
    }
  }
  return {
    reason:
      "Playwright is not installed. Run `npm install -g @playwright/test && " +
      "npx playwright install chromium`, or point PLAYWRIGHT_MODULE at a copy.",
  };
}

/** The widest the page draws a sheet, from the `div.sheet` rule in index.html. */
const PAGE_CAP = 900;

/** Composition units across, which is the canvas the design language records. */
const CANVAS = 3600;

/**
 * A seam is reported at the reader's own geometry rather than in composition
 * units, because a fifth of a unit is not a defect and a fifth of a page pixel
 * is a different claim about the same number.
 */
const SCALE = PAGE_CAP / CANVAS;

/** Every cheatsheet the committed catalog holds, in the order it lists them. */
async function catalogPaths() {
  const manifest = JSON.parse(await readFile(join(root, "cheatsheets.json"), "utf8"));
  return manifest.categories.flatMap((category) => category.cheatsheets.map((sheet) => sheet.path));
}

const runtime = await loadChromium();
const skip = runtime.chromium ? false : runtime.reason;

let browser;
let page;
if (!skip) {
  browser = await runtime.chromium.launch();
  page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  // One page for the whole file. Each measurement replaces what is in it, and
  // the engine is being asked about text layout, which no earlier sheet can
  // influence.
  await page.setContent('<!doctype html><style>html,body{margin:0}</style><div id="host"></div>');
}
// The reader, or there are no split runs to measure and every case below would
// pass by having nothing to look at. Asserted rather than assumed, in the
// first case.
const reader = skip ? { ready: false, reason: skip } : await prepareAccents();

after(async () => {
  await browser?.close();
});

/**
 * Draws a composition at the page's cap and reports every run boundary.
 *
 * Two numbers per boundary, and only the first of them is a seam. The engine's
 * own width for the stretch between two drawn runs is read from a probe
 * element holding that exact text in the same face, which is what the sheet
 * would have drawn had the two runs been one. The seam is the difference
 * between that and the distance the composition actually put between them.
 *
 * @param {string} markup The composition's SVG.
 * @param {string[]} texts The code lines, in order, exactly as they are drawn.
 * @param {import('../api/cheatsheet/accents.mjs').RoleRun[][]} lines The runs per line.
 */
async function measureSeams(markup, texts, lines) {
  return page.evaluate(
    ({ markup, texts, lines, cap }) => {
      const SVG = "http://www.w3.org/2000/svg";
      const XML = "http://www.w3.org/XML/1998/namespace";
      const host = document.getElementById("host");
      const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
      if (parsed.documentElement.nodeName === "parsererror") throw new Error("the SVG did not parse");
      host.replaceChildren(document.importNode(parsed.documentElement, true));
      const drawn = host.firstElementChild;
      // At the composition's own scale, so every figure below is in
      // composition units and nothing has to be divided back out. The page
      // scales the same markup down to its column; a seam does not care which,
      // because both are one linear transform of these coordinates.
      drawn.setAttribute("width", String(cap));
      drawn.removeAttribute("height");

      const out = [];
      for (let index = 0; index < texts.length; index += 1) {
        const text = texts[index];
        const runs = lines[index] ?? [];
        const parts = [...drawn.querySelectorAll(`text[data-name^="code-${index}-"]`)];
        if (parts.length < 2) continue;

        const first = parts[0];
        // The probe holds a stretch of this line in the face the line is drawn
        // in, so the engine says how wide it lays that stretch out.
        //
        // `setAttributeNS` for `xml:space`, not `setAttribute`. On an element
        // in an HTML-parsed document the second makes an attribute whose name
        // merely holds a colon, the engine never sees the preserve, and every
        // measurement of a stretch that starts with an indent is taken on a
        // shorter string than the one on the sheet.
        const probe = document.createElementNS(SVG, "text");
        probe.setAttribute("font-family", first.getAttribute("font-family"));
        probe.setAttribute("font-size", first.getAttribute("font-size"));
        probe.setAttributeNS(XML, "xml:space", "preserve");
        probe.setAttribute("fill", "none");
        const span = document.createElementNS(SVG, "tspan");
        span.setAttribute("x", "0");
        span.setAttribute("y", "0");
        probe.appendChild(span);
        drawn.appendChild(probe);
        const engineWidth = (from, to) => {
          span.textContent = text.slice(from, to);
          return probe.getComputedTextLength();
        };

        const boundaries = parts
          .map((part) => {
            const at = Number(part.getAttribute("data-name").slice(`code-${index}-`.length));
            const run = runs[at];
            return run ? { at, start: run.start, x: Number(part.querySelector("tspan").getAttribute("x")) } : null;
          })
          .filter(Boolean);

        const seams = [];
        for (let k = 1; k < boundaries.length; k += 1) {
          const before = boundaries[k - 1];
          const here = boundaries[k];
          const stretch = text.slice(before.start, here.start);
          seams.push({
            seam: here.x - before.x - engineWidth(before.start, here.start),
            // A gap that falls where the line already has a space reads as
            // slightly loose spacing. One between two tokens with nothing
            // between them opens inside the code, which is the visible
            // failure. Worth telling apart.
            spaced: /\s/.test(stretch),
            stretch,
          });
        }
        probe.remove();
        out.push({ index, text, seams });
      }
      host.replaceChildren();
      return out;
    },
    { markup, texts, lines, cap: PAGE_CAP }
  );
}

// Everything the cases need is in hand before the first of them is
// registered. `node --test` starts running as soon as the microtask queue
// drains, so an `await` between two `test()` calls lets the file's `after`
// hook fire against the tests registered so far and closes the browser out
// from under the rest.
const paths = await catalogPaths();
const documents = new Map(
  await Promise.all(
    paths.map(async (path) => [
      path,
      JSON.parse(await readFile(join(root, ...path.split("/"), "sheet.json"), "utf8")),
    ])
  )
);

test("the accent reader loads, or every case below proves nothing", { skip }, () => {
  // Without it `accentRoles` answers null, no line is split, and a file whose
  // whole subject is where the split runs land would pass by having none.
  assert.equal(reader.ready, true, reader.reason ?? "the accent reader did not load");
});

for (const path of paths) {
  test(`${path} draws every run flush with the one before it`, { skip }, async () => {
    const doc = documents.get(path);
    const texts = doc.code.map((line) => line.text);
    const roles = accentRoles(texts, doc.language);
    assert.ok(roles, `${path} read no runs, so its panel is not coloured token by token`);
    assert.equal(roles.missing, null, `${path} is written in a language nothing is registered under`);

    const { composition, variation } = composeSheet(doc, { seed: doc.seed });
    assert.equal(variation.accents, "token", `${path} composed in ${variation.accents} mode`);

    const measured = await measureSeams(composition.toSVG(), texts, roles.lines);
    assert.ok(measured.length > 0, `${path} drew no line as more than one run`);

    let worst = { seam: 0 };
    let worstTight = { seam: 0 };
    let boundaries = 0;
    let over = 0;
    for (const line of measured) {
      for (const seam of line.seams) {
        boundaries += 1;
        if (Math.abs(seam.seam) * SCALE >= 1) over += 1;
        if (Math.abs(seam.seam) > Math.abs(worst.seam)) worst = { ...seam, line: line.index, text: line.text };
        if (!seam.spaced && Math.abs(seam.seam) > Math.abs(worstTight.seam)) {
          worstTight = { ...seam, line: line.index, text: line.text };
        }
      }
    }
    const worstPage = Math.abs(worst.seam) * SCALE;
    console.log(
      `  ${path}: ${boundaries} boundaries, worst ${worstPage.toFixed(3)} px ` +
        `(${worst.spaced ? "at a space" : "mid-token"}), worst mid-token ` +
        `${(Math.abs(worstTight.seam) * SCALE).toFixed(3)} px, ${over} at or over 1 px`
    );
    assert.equal(
      over,
      0,
      `${over} of ${boundaries} boundaries are at or over a page pixel; worst was ` +
        `${worstPage.toFixed(3)} px on line ${worst.line} after ${JSON.stringify(worst.stretch ?? "")} ` +
        `in ${JSON.stringify(worst.text ?? "")}`
    );
  });
}
