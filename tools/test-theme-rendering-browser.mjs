// Browser driven checks for the two themes in index.html, beside the source
// text checks in tools/test-contrast.mjs. That file parses the stylesheet and
// confirms the tokens are declared and that every pair it declares clears its
// floor; this one drives a real engine and confirms the tokens arrive on the
// elements, in both color schemes.
//
// **Why a rendered check earns its place next to a parsed one.** A stylesheet
// can be correct as text and wrong on screen, and the gap between the two is
// where this file lives. A token can be declared and never reach the element
// that claims it. A focus ring can be declared and never be painted. A dark
// theme can be written into a media query the control never inherits, leaving
// the browser to draw its own chrome against a ground the page chose. None of
// those change a byte of the stylesheet, so none of them can fail a parse, and
// until this file existed nothing in the repository rendered the dark theme at
// all.
//
// The Playwright arrangement is the one tools/test-page-structure-browser.mjs
// settled, for the same reason: `tools/` stays dependency free, there is no
// package.json, and a clone with nothing installed has to run the suite. So
// Playwright is looked for at run time where it is actually installed, and
// every case here skips with the reason when it is not found. Install it for a
// machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// Run with: node --test tools/test-theme-rendering-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. `@playwright/test`
// keeps `playwright` in its own node_modules rather than beside itself, which
// is why resolution is based at its entry file instead of at the global root.
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
      // The resolved entry is CommonJS, so the named exports arrive under
      // default as well as beside it depending on how it was built.
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

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/vnd.microsoft.icon",
};

// Serve the repository, and only the repository: a path that climbs out of it
// is refused rather than read.
function serveRepository() {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const file = join(root, requested === "/" ? "index.html" : requested);
    if (!file.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}/` })
    );
  });
}

const runtime = await loadChromium();
const skip = runtime.chromium ? false : runtime.reason;

let browser;
let site;

if (!skip) {
  site = await serveRepository();
  browser = await runtime.chromium.launch();
}

after(async () => {
  await browser?.close();
  site?.server.close();
});

// WCAG 2.1 relative luminance, from the definitions rather than from a table,
// so a rendered color is measured the same way tools/test-contrast.mjs
// measures a declared one.
function channel(eightBit) {
  const c = eightBit / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// "rgb(2, 4, 51)" and "rgba(2, 4, 51, 1)" both read back as the three channels
// the engine resolved, which is what a computed style always returns.
const rgb = (css) => css.match(/\d+/g).slice(0, 3).map(Number);
const hex = ([r, g, b]) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const channels = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// The two themes as DESIGN_LANGUAGE.md records them under **Palette and
// roles**. Restated here as what each role must render as, which is the thing
// a parse cannot see; the stylesheet's own copy of these values is what
// tools/test-contrast.mjs checks against the same tables.
const THEMES = [
  {
    name: "light",
    scheme: "light",
    page: "#F8F8F9",
    text: "#020433",
    secondary: "#414566",
    border: "#6F6F8C",
    accent: "#2E7534",
  },
  {
    name: "dark",
    scheme: "dark",
    page: "#020433",
    text: "#F8F8F9",
    secondary: "#9EBEA7",
    border: "#6F6F8C",
    accent: "#4CAE50",
  },
];

// A page with an example chosen, so the sheet is on screen and has a frame to
// measure. Nothing about the frame can be read from the placeholder, which
// ships hidden.
async function openPage(theme, { choose = "Sorting Arrays" } = {}) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    colorScheme: theme.scheme,
  });
  await page.goto(site.base);
  if (choose) {
    await page.selectOption("#example", { label: choose });
    await page.waitForFunction(() => {
      const image = document.getElementById("curCheatSheetImg");
      return image.complete && image.naturalWidth > 0;
    });
  }
  return page;
}

for (const theme of THEMES) {
  test(`${theme.name}: every surface takes the token the record assigns it`, { skip }, async () => {
    const page = await openPage(theme);
    const seen = await page.evaluate(() => {
      const read = (selector, property) =>
        getComputedStyle(document.querySelector(selector))[property];
      return {
        pageGround: read("body", "backgroundColor"),
        bodyText: read("body", "color"),
        title: read("h1", "color"),
        panelHeading: read("h3", "color"),
        label: read("label", "color"),
        footnote: read("#showFootNote", "color"),
        rule: read("hr", "borderTopColor"),
        panelFrame: read("div.tools", "borderTopColor"),
        sheetFrame: read("div.col img", "borderTopColor"),
        dropdownGround: read("#category", "backgroundColor"),
        dropdownText: read("#category", "color"),
      };
    });
    await page.close();

    // A token that is declared but never reaches its element fails here and
    // nowhere else: the stylesheet still parses, and the pair still measures.
    assert.equal(hex(rgb(seen.pageGround)), theme.page, "page ground");
    assert.equal(hex(rgb(seen.bodyText)), theme.text, "body text");
    assert.equal(hex(rgb(seen.title)), theme.text, "the title inherits body text");
    assert.equal(hex(rgb(seen.panelHeading)), theme.secondary, "panel heading");
    assert.equal(hex(rgb(seen.label)), theme.secondary, "dropdown label");
    assert.equal(hex(rgb(seen.footnote)), theme.secondary, "footnote");
    assert.equal(hex(rgb(seen.rule)), theme.accent, "the rule under the title");
    assert.equal(hex(rgb(seen.panelFrame)), theme.border, "panel frame");
    assert.equal(hex(rgb(seen.sheetFrame)), theme.border, "sheet frame");
    assert.equal(hex(rgb(seen.dropdownGround)), theme.page, "the dropdown sits on the page ground");
    assert.equal(hex(rgb(seen.dropdownText)), theme.text, "dropdown text");
  });

  test(`${theme.name}: every run of text renders in the page's own face`, { skip }, async () => {
    // The same failure as the one above, in the one property a color check
    // cannot see. Until 2026.09.14 `body` set a size and a line height and no
    // family at all, so the page fell to the browser default and rendered in
    // Times New Roman beside artwork set throughout in a grotesque. Nothing in
    // the repository failed, because an omission leaves no wrong value behind
    // to fail on.
    //
    // tools/test-contrast.mjs holds the half a parse can reach: that --font is
    // declared, that `body` asks for it, and that the stack is the one
    // DESIGN_LANGUAGE.md records under **The page's face**. A declared stack
    // can still resolve to nothing at all, and only an engine says which
    // family answered. That is the half that lives here.
    const page = await openPage(theme);
    const seen = await page.evaluate(() => {
      const round = (value) => Math.round(value * 100) / 100;
      const stack = getComputedStyle(document.body).fontFamily;

      // Every run of text on the page, addressed by what it is rather than by
      // a position, so reordering the page cannot quietly drop one.
      const computed = {};
      for (const [name, selector] of Object.entries({
        "the title": "h1",
        "the paragraph under it": "body > p",
        "the instructions heading": "div.tools h3",
        "the first step": "div.tools ol li:nth-child(1)",
        "the last step": "div.tools ol li:last-child",
        "the cheatsheet label": 'label[for="category"]',
        "the example label": 'label[for="example"]',
        "the footnote": "#showFootNote",
        "the cheatsheet dropdown": "#category",
        "the example dropdown": "#example",
      })) {
        const element = document.querySelector(selector);
        computed[name] = element && getComputedStyle(element).fontFamily;
      }

      // A family resolves or it does not, and the only way to see which is to
      // set a string in it and measure. A computed value proves nothing on its
      // own: it reports the stack verbatim whether or not a single member of
      // it exists on the machine.
      const widthIn = (family) => {
        const span = document.createElement("span");
        span.textContent = "Select Cheatsheet from dropdown";
        span.style.cssText =
          "position:absolute;left:-9999px;white-space:nowrap;font-size:16px;font-family:" +
          family;
        document.body.appendChild(span);
        const width = round(span.getBoundingClientRect().width);
        span.remove();
        return width;
      };

      // The controls take `font: inherit`, and whether a native control honors
      // that is a question about the engine rather than about the stylesheet.
      // `max-width: 100%` comes off first: #example wants more width than its
      // column leaves it, so measured as it sits both faces sit on the cap and
      // the comparison reads the cap instead of the text.
      const control = (id) => {
        const select = document.getElementById(id);
        const before = { family: select.style.fontFamily, max: select.style.maxWidth };
        const measure = (family) => {
          select.style.maxWidth = "none";
          select.style.fontFamily = family;
          const width = round(select.getBoundingClientRect().width);
          select.style.fontFamily = before.family;
          select.style.maxWidth = before.max;
          return width;
        };
        return { asItIs: measure(""), asSerif: measure('"Times New Roman", serif') };
      };

      // A wider face needs more room than the one it replaced, so the longest
      // option has to still fit the control that shows it.
      const select = document.getElementById("example");
      const style = getComputedStyle(select);
      const inner =
        select.getBoundingClientRect().width -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight) -
        parseFloat(style.borderLeftWidth) -
        parseFloat(style.borderRightWidth);
      const labelWidth = (text) => {
        const span = document.createElement("span");
        span.textContent = text;
        span.style.cssText =
          "position:absolute;left:-9999px;white-space:nowrap;font:" + style.font;
        document.body.appendChild(span);
        const width = round(span.getBoundingClientRect().width);
        span.remove();
        return width;
      };

      return {
        stack,
        computed,
        rendered: widthIn(stack),
        asSerif: widthIn("serif"),
        asSansSerif: widthIn("sans-serif"),
        controls: { category: control("category"), example: control("example") },
        clipped: [...select.querySelectorAll("option")]
          .map((option) => option.text)
          .filter((text) => text && labelWidth(text) > inner),
      };
    });
    await page.close();

    for (const [name, family] of Object.entries(seen.computed)) {
      assert.ok(family, `${name} is not on the page at all`);
      assert.equal(family, seen.stack, `${name} does not take the body's stack`);
    }

    // Not the serif, which is the face the page had when it had none of its
    // own. Measured against the generic rather than against a family name, so
    // a machine without Times New Roman is judged by what it does have.
    assert.notEqual(
      seen.rendered,
      seen.asSerif,
      `the stack resolves to ${seen.rendered}px, exactly what the serif measures`
    );
    // And it resolved to something: a stack whose every member is missing
    // falls past the last generic to the browser's own default.
    assert.equal(
      seen.rendered,
      seen.asSansSerif,
      `the stack measures ${seen.rendered}px against ${seen.asSansSerif}px for the ` +
        "sans-serif generic, so no member of it resolved"
    );

    // The controls render it rather than merely computing it.
    for (const [id, widths] of Object.entries(seen.controls)) {
      assert.ok(
        widths.asItIs - widths.asSerif >= 4,
        `#${id} is ${widths.asItIs}px as it stands against ${widths.asSerif}px in a serif, ` +
          "too close to tell the two faces apart"
      );
    }
    assert.deepEqual(seen.clipped, [], "these option labels no longer fit the control");
  });

  test(`${theme.name}: the panel and the sheet carry the same frame`, { skip }, async () => {
    // The two columns read as a pair because they share one edge. A frame that
    // drifts on one of them - a width, a style, a color, or one side of four -
    // puts a bordered box beside a loose picture again.
    const page = await openPage(theme);
    const frames = await page.evaluate(() => {
      const sides = (selector) => {
        const style = getComputedStyle(document.querySelector(selector));
        return ["Top", "Right", "Bottom", "Left"].map(
          (side) =>
            `${style[`border${side}Width`]} ${style[`border${side}Style`]} ` +
            `${style[`border${side}Color`]}`
        );
      };
      return { panel: sides("div.tools"), sheet: sides("div.col img") };
    });
    await page.close();

    assert.equal(new Set(frames.panel).size, 1, "the panel frame differs side to side");
    assert.equal(new Set(frames.sheet).size, 1, "the sheet frame differs side to side");
    assert.equal(frames.panel[0], frames.sheet[0], "the two columns do not share one frame");
    assert.match(frames.panel[0], /^1px solid /, `the frame is ${frames.panel[0]}`);
  });

  test(`${theme.name}: the focus ring is painted rather than merely declared`, { skip }, async () => {
    const page = await openPage(theme);

    for (const id of ["category", "example"]) {
      // Reached the way a reader reaches it. `focus()` on its own does not
      // always satisfy :focus-visible, and an outline that only ever appears
      // under a programmatic focus is one no keyboard user sees.
      await page.locator(`#${id}`).focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");

      const state = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        const panel = document.querySelector("div.tools").getBoundingClientRect();
        const offset = parseFloat(style.outlineOffset) || 0;
        const width = parseFloat(style.outlineWidth) || 0;
        return {
          focused: document.activeElement === element,
          width: style.outlineWidth,
          style: style.outlineStyle,
          color: style.outlineColor,
          offset: style.outlineOffset,
          // The ring is drawn outside the border box, so it can be declared
          // correctly and still be clipped away by whatever contains it.
          insidePanel:
            box.left - offset - width >= panel.left &&
            box.right + offset + width <= panel.right &&
            box.top - offset - width >= panel.top &&
            box.bottom + offset + width <= panel.bottom,
        };
      }, `#${id}`);

      assert.ok(state.focused, `#${id} did not take focus from the keyboard`);
      assert.equal(state.style, "solid", `#${id} ring style`);
      assert.equal(state.width, "2px", `#${id} ring width`);
      assert.equal(state.offset, "2px", `#${id} ring offset`);
      assert.equal(hex(rgb(state.color)), theme.accent, `#${id} ring color`);
      assert.ok(state.insidePanel, `#${id} ring is clipped by the panel it sits in`);

      // Findable where it lands. The ring and the control's own border are not
      // compared to each other: `outline-offset: 2px` lays the page ground
      // between them, so each is measured against that ground at the 3:1
      // non-text floor rather than against the other.
      const ring = channels(theme.accent);
      const ground = channels(theme.page);
      const edge = channels(theme.border);
      assert.ok(
        ratio(ring, ground) >= 3,
        `#${id} ring is ${ratio(ring, ground).toFixed(2)}:1 on the page ground`
      );
      assert.ok(
        ratio(edge, ground) >= 3,
        `#${id} border is ${ratio(edge, ground).toFixed(2)}:1 on the page ground`
      );
    }

    await page.close();
  });

  test(`${theme.name}: the dropdown's own chrome agrees with the theme`, { skip }, async () => {
    // The popup a dropdown opens is drawn by the browser, not by the page, and
    // it is the one surface the stylesheet cannot reach directly. What decides
    // whether it fights the theme is `color-scheme` reaching the control, and
    // what the options resolve to once it has.
    const page = await openPage(theme);
    const chrome = await page.evaluate(() => {
      const select = document.getElementById("example");
      const style = getComputedStyle(select);
      const option = select.querySelector("optgroup option");
      const group = select.querySelector("optgroup");
      return {
        scheme: style.colorScheme,
        ground: style.backgroundColor,
        face: style.fontFamily,
        bodyFace: getComputedStyle(document.body).fontFamily,
        optionGround: getComputedStyle(option).backgroundColor,
        optionText: getComputedStyle(option).color,
        groupGround: getComputedStyle(group).backgroundColor,
        groupText: getComputedStyle(group).color,
      };
    });
    await page.close();

    // Without this the browser paints a light popup under dark page chrome.
    assert.match(
      chrome.scheme,
      new RegExp(theme.scheme),
      `the dropdown resolved color-scheme to "${chrome.scheme}" on the ${theme.name} theme`
    );
    assert.equal(chrome.face, chrome.bodyFace, "the dropdown left the page's type behind");

    // A transparent option ground resolves to the control's own, which is what
    // the popup will actually paint behind the text.
    const settled = (declared) =>
      declared === "rgba(0, 0, 0, 0)" ? chrome.ground : declared;
    for (const [what, text, ground] of [
      ["option", chrome.optionText, settled(chrome.optionGround)],
      ["optgroup label", chrome.groupText, settled(chrome.groupGround)],
    ]) {
      const measured = ratio(rgb(text), rgb(ground));
      assert.ok(
        measured >= 4.5,
        `${what} renders ${hex(rgb(text))} on ${hex(rgb(ground))} at ` +
          `${measured.toFixed(2)}:1, under the 4.5:1 text floor`
      );
    }
  });
}

test("every vertical gap down the page is a multiple of the 8px step", { skip }, async () => {
  // The step is declared as four tokens and tools/test-contrast.mjs confirms
  // the four are multiples of 8. What it cannot confirm is the gap that
  // reaches the screen, because adjacent margins collapse to the larger of the
  // two and a collapse is a layout event rather than a declaration. Three
  // `<br>` elements used to space this page by line height, which is a
  // distance the step does not divide; their absence is asserted here rather
  // than assumed.
  const page = await openPage(THEMES[0]);
  const measured = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const gap = (above, below) => Math.round(box(below).top - box(above).bottom);
    return {
      titleToRule: gap("h1", "hr"),
      ruleToParagraph: gap("hr", "body > p"),
      paragraphToRow: gap("body > p", "div.row"),
      rowToFootnote: gap("div.row", "#showFootNote"),
      headingToList: gap("div.tools h3", "div.tools ol"),
      listToLabel: gap("div.tools ol", 'label[for="category"]'),
      labelToDropdown: gap('label[for="category"]', "#category"),
      dropdownToNextLabel: gap("#category", 'label[for="example"]'),
      breaks: document.querySelectorAll("body br").length,
    };
  });
  await page.close();

  assert.equal(measured.breaks, 0, "a <br> is spacing the page by line height again");
  for (const [name, value] of Object.entries(measured)) {
    if (name === "breaks") continue;
    assert.ok(value >= 0, `${name} is ${value}px, so the two elements overlap`);
    assert.equal(value % 8, 0, `${name} is ${value}px, which the 8px step does not divide`);
  }
});
