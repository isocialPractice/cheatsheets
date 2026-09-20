// Drives a real engine over a composed sheet, and checks that it draws the
// text where the committed width table said it would.
//
// **This is the acceptance check for the whole font decision.** Every other
// case about faces is a check of arithmetic against itself: `measureText` and
// the table agree because one reads the other. What none of them can answer is
// whether a browser handed the resulting SVG puts the glyphs where the table
// predicted. If it does not, a generated sheet is measured correctly and drawn
// wrong, and nothing in a dependency free suite would ever say so.
//
// Nothing is added to the repository for it. There is no package.json and
// `node --test` has to work on a clone with nothing installed, so Playwright
// is looked for at run time in the places it is actually installed and every
// case below skips with the reason where it is absent. Install it for
// a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// The measurement that produced the table lives in
// `tools/measure-font-widths.mjs`, which is a script rather than a test: it is
// run by hand when the table needs regenerating. This file is the standing
// check that the committed result still holds.
//
// Run with: node --test tools/test-sheet-faces-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { measureText } from "../api/graphic-design/font.mjs";
import { composeSheet, SHEET_FACE, sizeForCap } from "../api/cheatsheet/index.mjs";

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. Identical to
// `tools/test-page-structure-browser.mjs`, so a machine that runs one runs both.
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
        // Not installed at this base, which is the ordinary case for all but
        // one of them.
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

const runtime = await loadChromium();
const skip = runtime.chromium ? false : runtime.reason;

let browser;
if (!skip) browser = await runtime.chromium.launch();

after(async () => {
  await browser?.close();
});

const DOC = {
  title: "JavaScript Array Practical Use Starting Point",
  subtitle: "Splice Array",
  code: [
    { text: "var fruits = ['Banana', 'Orange', 'Apple', 'Mango'];", role: "plain" },
    { text: "console.log(fruits.splice(2, 2, 'Lemon', 'Kiwi'));", role: "plain" },
    { text: "// (2) ['Apple', 'Mango']", role: "comment" },
    { text: "var trees = ['Maple', 'Spruce', 'Palm'];", role: "plain" },
    { text: "trees.splice(3, 0, 'Birch');", role: "plain" },
  ],
};

/**
 * Renders a composition's SVG at its own scale and reads back what each run
 * actually occupies.
 */
async function measureInBrowser(svg) {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  // At the composition's own scale, so a reported box is in composition units
  // and nothing has to be divided back out.
  await page.setContent(`<!doctype html><style>html,body{margin:0}</style>${svg}`);
  const boxes = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll("text")) {
      const box = el.getBBox();
      out[el.getAttribute("data-name")] = { x: box.x, y: box.y, width: box.width, height: box.height };
    }
    return out;
  });
  await page.close();
  return boxes;
}

test("the browser draws each run at the width the committed table predicted", { skip }, async () => {
  const { composition } = composeSheet(DOC, { seed: "splice-array" });
  const drawn = await measureInBrowser(composition.toSVG());

  // `getBBox` returns the ink box, tight to the glyphs, while the table sums
  // advances and so includes the last glyph's right side bearing. The browser
  // therefore reads a little narrow, and how much depends on what the run ends
  // in: six of the ten runs here agree to within 0.01%, and the widest gap is
  // the subtitle at 1.02%, which ends in a "y". 2% is the band that tolerates
  // the bearing without tolerating a wrong face - the case below measures what
  // a wrong one costs, and it is an order of magnitude more than this.
  let worst = { name: "", share: 0 };
  for (const element of composition.elements) {
    if (element.type !== "text") continue;
    const box = drawn[element.name];
    assert.ok(box, `${element.name} was not drawn at all`);
    const predicted = measureText(element.text, {
      fontSize: element.fontSize,
      face: element.face ?? SHEET_FACE,
    });
    const share = Math.abs(box.width - predicted) / predicted;
    if (share > worst.share) worst = { name: element.name, share };
    assert.ok(
      share < 0.02,
      `${element.name}: the table predicted ${predicted.toFixed(1)} px and the browser drew ` +
        `${box.width.toFixed(1)} px, a difference of ${(share * 100).toFixed(2)}%`
    );
  }
  assert.ok(worst.name, "no text was measured, so this case proved nothing");
});

test("and the built-in alphabet would have missed every one of them", { skip }, async () => {
  // The counter-check, without which a table that happened to be right for the
  // wrong reason would pass the case above and nothing would show that taking a
  // face mattered at all.
  //
  // Two different comparisons are easy to run together here, so: against the
  // *artwork* the built-in alphabet is 62% too wide, which is the figure
  // `DESIGN_LANGUAGE.md` records and `tools/test-sheet-faces.mjs` asserts.
  // Against what a *browser* draws it is 9% to 21%, measured across these runs.
  // This is the second of those, because the browser is what is on screen here.
  // 21% of a 900 px run is 190 sheet pixels, or 32 at display size.
  const { composition } = composeSheet(DOC, { seed: "splice-array" });
  const drawn = await measureInBrowser(composition.toSVG());

  for (const element of composition.elements) {
    if (element.type !== "text") continue;
    const face = element.face ?? SHEET_FACE;
    // The built-in alphabet at the size whose cap matches this run's, which is
    // what the port measured with before it took a face.
    const cap = (element.fontSize * face.capHeight) / face.unitsPerEm;
    const builtin = measureText(element.text, { fontSize: (cap * 15) / 11 });
    const share = Math.abs(drawn[element.name].width - builtin) / drawn[element.name].width;
    assert.ok(
      share > 0.05,
      `${element.name}: the built-in alphabet predicted ${builtin.toFixed(1)} px against the ` +
        `${drawn[element.name].width.toFixed(1)} px drawn, which is only ${(share * 100).toFixed(1)}% out`
    );
  }
});

test("no run overflows the region the composition fitted it to", { skip }, async () => {
  // Fitting is measured in the table; this is whether the fit survives contact
  // with the engine that draws it.
  const { composition } = composeSheet(
    {
      ...DOC,
      title: "A Considerably Longer Title Than Any Of The Eleven Sheets Were Given",
    },
    { seed: 3 }
  );
  const drawn = await measureInBrowser(composition.toSVG());
  const title = drawn.title;
  // Between the two flanking rules, which is what the title is set across.
  assert.ok(title.x >= 432 - 1, `the title starts at ${title.x.toFixed(1)}, inside the left rule`);
  assert.ok(
    title.x + title.width <= 3600 - 432 + 1,
    `the title ends at ${(title.x + title.width).toFixed(1)}, inside the right rule`
  );
});

test("the face's cap height is the one a browser actually renders", { skip }, async () => {
  // The conversion from a measured cap height to a font size is what places
  // every run vertically. It is arithmetic against the committed cap of 719
  // units per em, and this is the case that says the engine agrees.
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>cap</title>");
  const rendered = await page.evaluate((size) => {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${size}px "Helvetica Neue", Arial, system-ui, sans-serif`;
    return ctx.measureText("H").actualBoundingBoxAscent;
  }, sizeForCap(141, SHEET_FACE));
  await page.close();
  assert.ok(
    Math.abs(rendered - 141) < 1.5,
    `a size asked to reach a 141 px cap rendered one of ${rendered.toFixed(1)} px`
  );
});
