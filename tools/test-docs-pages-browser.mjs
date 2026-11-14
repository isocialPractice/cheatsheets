// Browser driven checks over the tables on the documentation site in `docs/`,
// beside the dependency free checks in `tools/test-docs-site.mjs`.
//
// **Why a second file rather than two more cases there.**
// `tools/test-docs-site.mjs` is dependency free by design and reads the pages
// as text, which is the whole reason it has watched this site since 2026.11.08
// without noticing that every table on it was laid out to the wrong width. A
// column width is a layout result: no text reader can see one, and an engine is
// the only thing that can.
//
// What it missed, found by the UI/UX tester on 2026.11.13 and closed the day
// after. `docs/docs.css` carried `display: block; overflow-x: auto` on `table`,
// which is the pair `1.0.0-alpha.1.10.0` had just moved off a carried `<table>`
// and onto a wrapper in `tools/cheatsheet-site.mjs`. A `<table>` at
// `display: block` is not a table box: its rows are laid out in an anonymous
// table box that has no width of its own and shrinks to fit, so the
// `width: 100%` beside it sized the block that scrolled and never reached the
// columns. Measured at 1280x900 in a 768px column, in Chromium 151 and WebKit
// 26.5, over the four tables on `docs/cheatsheet.html`:
//
//   Role / Light / Dark        box 768   rows 288.2
//   Property / Takes / Means   box 768   rows 489.5
//   Export / Answers           box 768   rows 647.4
//   Model / Carries            box 768   rows 740.1
//
// So one page showed four tables at four widths where its stylesheet asked for
// one, live on the published site. The five tables on the other pages measured
// 767 - their content is wider than the column, so shrinking to fit and filling
// it arrive at the same number, which is what made this read as four odd tables
// rather than as a rule doing nothing.
//
// The remedy is the one this repository had already argued out for a carried
// table, in `BLOCK_STYLE` and `wrapCarriedTables`: the table stays a table box,
// and `div.table-scroll` is the box that scrolls. A class here and an attribute
// there, because a generated page writes into a site owner's folder where a
// class name can collide and these pages are the repository's own.
//
// The Playwright arrangement is the one `tools/test-page-structure-browser.mjs`
// settled and `tools/test-site-pages-browser.mjs` extended: `tools/` stays
// dependency free, there is no package.json, and a clone with nothing installed
// has to run the suite. So Playwright is looked for at run time where it is
// actually installed, every engine that launches is measured, and each that
// does not skips its own subtest with the command that would fix it. Install it
// for a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install
//
// **Three engines, because one of the three cases here is only ever false in
// one of them.** The widths read the same everywhere; the keyboard reach does
// not. WebKit puts no scroll box in the tab order of its own, measured three
// ways on 2026.11.12 and again on 2026.11.13, so without the `tabindex` on each
// wrapper a documentation table wider than a phone is unreachable in Safari and
// in no other engine. A case for it driving Chromium alone would pass on the
// engine that never needed it.
//
// Run with: node --test tools/test-docs-pages-browser.mjs
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The class the stylesheet puts the containment on, and the pages carry. */
const WRAPPER = "table-scroll";

/** The engines looked for, in the order a report reads best in. */
const ENGINES = ["chromium", "firefox", "webkit"];

/** A launch failure's first line, which is the sentence naming what is wrong. */
const firstLine = (text) => text.split(/\r?\n/)[0];

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

/**
 * The browser types Playwright offers this machine, or why there are none.
 *
 * **What this resolves is the library and not a browser.** Every engine is a
 * named export of the module whether or not its binary was ever downloaded, so
 * a type found here says nothing about whether it launches - that is settled
 * one engine at a time in `before`, where the failure has an install command to
 * offer.
 *
 * @returns {Promise<{ engines?: Record<string, import("playwright").BrowserType>, reason?: string }>}
 */
async function loadEngines() {
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
      const found = Object.fromEntries(
        ENGINES.map((name) => [name, module[name] ?? module.default?.[name]]).filter(
          ([, type]) => Boolean(type)
        )
      );
      if (Object.keys(found).length > 0) return { engines: found };
    } catch {
      // Try the next one.
    }
  }
  return {
    reason:
      "Playwright is not installed. Run `npm install -g @playwright/test && " +
      "npx playwright install`, or point PLAYWRIGHT_MODULE at a copy.",
  };
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/vnd.microsoft.icon",
};

// The repository itself is the site: `docs/` is published from the root and its
// pages reach the stylesheet beside them and the favicon one folder up, so a
// server rooted anywhere else answers two requests a reader's browser would
// not.
function serve() {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const file = join(root, requested);
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
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` })
    );
  });
}

// Read from the folder rather than listed, so a page added to the site is
// measured the day it lands. A page with no table contributes nothing and costs
// one navigation.
const PAGES = (await readdir(join(root, "docs")))
  .filter((name) => name.endsWith(".html"))
  .sort();

const runtime = await loadEngines();

/** Why every case here is skipped, or `false`. */
const skip = runtime.engines ? false : runtime.reason;

/** The engines that launched, by name. */
const browsers = new Map();
/** Why an engine is not in {@link browsers}, for a per engine skip. */
const unavailable = new Map();

let site;

before(async () => {
  if (skip) return;
  site = await serve();
  for (const name of ENGINES) {
    const type = runtime.engines[name];
    if (!type) {
      unavailable.set(name, `This copy of Playwright offers no ${name}.`);
      continue;
    }
    try {
      browsers.set(name, await type.launch());
    } catch (error) {
      // A missing binary and a broken one read the same from here, and the same
      // command fixes both.
      unavailable.set(
        name,
        `${name} did not launch: ${firstLine(error.message)}. ` +
          `Run \`npx playwright install ${name}\`.`
      );
    }
  }
});

after(async () => {
  for (const one of browsers.values()) await one.close();
  site?.server.close();
});

/**
 * Run one case over every engine that launched, as a subtest naming it.
 *
 * @param {import("node:test").TestContext} t
 * @param {(engine: import("playwright").Browser, name: string) => Promise<void>} body
 */
async function overEngines(t, body) {
  if (skip) return t.skip(skip);
  let ran = 0;
  for (const name of ENGINES) {
    await t.test(name, async (st) => {
      const engine = browsers.get(name);
      if (!engine) return st.skip(unavailable.get(name));
      ran += 1;
      await body(engine, name);
    });
  }
  assert.ok(ran > 0, "no engine launched, so nothing was measured");
}

/**
 * Every table on every documentation page, with the box it sits in.
 *
 * **The row is the measurement and the box is not**, which is what made the
 * defect invisible for five days: a `<table>` at `display: block` measured the
 * full 768 either way, and only the row said which of the two had happened.
 *
 * @param {import("playwright").Browser} engine
 * @param {{ width: number, height: number }} viewport
 */
async function measure(engine, viewport) {
  const context = await engine.newContext({ viewport });
  const page = await context.newPage();
  const seen = [];
  try {
    for (const name of PAGES) {
      await page.goto(`${site.base}/docs/${name}`, { waitUntil: "load" });
      const read = await page.evaluate((wrapper) => {
        const de = document.documentElement;
        const round = (n) => Math.round(n * 10) / 10;
        return {
          client: de.clientWidth,
          scroll: de.scrollWidth,
          tables: [...document.querySelectorAll("table")].map((table, at) => {
            const rows = [...table.querySelectorAll("tr")];
            const last = rows[rows.length - 1]?.getBoundingClientRect() ?? null;
            const box = table.closest(`div.${wrapper}`);
            const area = box?.getBoundingClientRect() ?? null;
            return {
              at,
              // The first row's text, so a failure names the table a reader
              // would recognise rather than its index.
              head: (rows[0]?.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 48),
              display: getComputedStyle(table).display,
              width: round(table.getBoundingClientRect().width),
              rows: last === null ? null : round(last.width),
              wrapped: box !== null,
              boxWidth: area === null ? null : round(area.width),
              boxFits: area === null ? null : area.right <= de.clientWidth + 1,
              boxOverflowX: box === null ? null : getComputedStyle(box).overflowX,
              boxHides: box === null ? null : Math.round(box.scrollWidth - box.clientWidth),
              tabindex: box === null ? null : box.getAttribute("tabindex"),
            };
          }),
        };
      }, WRAPPER);
      if (read.tables.length > 0) seen.push({ page: name, ...read });
    }
  } finally {
    await context.close();
  }
  return seen;
}

/** How many tables one reading covered, for a case to prove it read some. */
const counted = (seen) => seen.reduce((all, one) => all + one.tables.length, 0);

// The case the found issue of 2026.11.13 was opened for. It fails on the
// stylesheet as it stood between 2026.11.08 and 2026.11.14, at both viewports,
// and loudest on the palette table: 288.2 against the 768 its stylesheet asked
// for. Reading the first table on the first page would prove nothing - that one
// is the fourth of four on `docs/cheatsheet.html` - which is why every table on
// every page is read.
test("every documentation table lays its rows out to the width its stylesheet declares", async (t) => {
  await overEngines(t, async (engine, name) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const seen = await measure(engine, viewport);
      assert.ok(counted(seen) > 0, `${name}: the site carried no table to measure`);
      for (const { page, tables } of seen) {
        for (const table of tables) {
          const at = `${name} ${page} at ${viewport.width}px, "${table.head}"`;
          // The table is a table box, which is the defect itself rather than a
          // consequence of it: everything below follows from this one.
          assert.equal(table.display, "table", `${at}: the table is display: ${table.display}`);
          assert.ok(table.wrapped, `${at}: the table sits in no div.${WRAPPER}`);
          // `width: 100%` is what the stylesheet declares, so a table honouring
          // it is as wide as the box it was given. Where its own content is
          // wider it is wider still, which is the case below.
          assert.ok(
            table.width >= table.boxWidth - 1,
            `${at}: the table is ${table.width}px in a ${table.boxWidth}px box`
          );
          // And the rows are laid out to the table's own width rather than to
          // their content, which is the half the box could not say. The
          // allowance is the pixel a collapsed border puts outside the row box;
          // the defect drew these rows up to 479.8px short of their table.
          assert.ok(table.rows !== null, `${at}: the table has no row to measure`);
          assert.ok(
            table.rows >= table.width - 2,
            `${at}: the last row spans ${table.rows}px in a ${table.width}px table`
          );
        }
      }
    }
  });
});

// The containment half, at the one viewport where a documentation table is
// wider than the column it is in. Which table that is depends on the engine -
// on 2026.11.14 it was the surface table on `docs/index.html`, 378.3 wide in a
// 358px column in Chromium 151 and WebKit 26.5 and 358 in Firefox 153 - so what
// is asserted over every engine is the promise rather than the table: no page
// scrolls sideways, every box is one that scrolls, and a table wider than its
// box has something hidden in it rather than columns that were re-laid out.
test("a documentation table wider than the column scrolls its box, not the page", async (t) => {
  await overEngines(t, async (engine, name) => {
    const viewport = { width: 390, height: 844 };
    const seen = await measure(engine, viewport);
    assert.ok(counted(seen) > 0, `${name}: the site carried no table to measure`);
    for (const { page, client, scroll, tables } of seen) {
      assert.equal(
        scroll,
        client,
        `${name} ${page}: the page measures ${scroll} against a client width of ${client}`
      );
      for (const table of tables) {
        const at = `${name} ${page}, "${table.head}"`;
        assert.ok(table.boxFits, `${at}: the box is ${table.boxWidth}px in a ${client}px page`);
        assert.equal(
          table.boxOverflowX,
          "auto",
          `${at}: the box around the table computes overflow-x ${table.boxOverflowX}`
        );
        // A table wider than its box is contained by the box and not re-laid
        // out, which is what the wrapper was taken over `display: block` for:
        // the columns a reader sees are the ones the page declared.
        if (table.width > table.boxWidth + 1) {
          assert.ok(
            table.boxHides > 0,
            `${at}: the table is ${table.width}px in a ${table.boxWidth}px box that hides nothing`
          );
        }
      }
    }
  });
});

// WebKit puts no scroll box in the tab order itself, so this is the case that
// needs an engine other than Chromium to mean anything. The two halves are
// asserted separately on purpose: taking focus is true of every box on every
// page at every width, while scrolling with a press needs a box with something
// hidden in it, which at 390px is one table on one page and in two engines of
// the three. A case that asserted only the second would pass vacuously in
// Firefox, and in all three the day a reworded cell changed a column width.
test("every documentation table's box is reached by a keyboard, and scrolls with one", async (t) => {
  await overEngines(t, async (engine, name) => {
    const context = await engine.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const focus = (index) =>
      page.evaluate(
        ([wrapper, at]) => {
          const box = document.querySelectorAll(`div.${wrapper}`)[at];
          box.focus();
          return box.scrollLeft;
        },
        [WRAPPER, index]
      );
    const left = (index) =>
      page.evaluate(
        ([wrapper, at]) => document.querySelectorAll(`div.${wrapper}`)[at].scrollLeft,
        [WRAPPER, index]
      );
    try {
      let scrolled = 0;
      for (const which of PAGES) {
        await page.goto(`${site.base}/docs/${which}`, { waitUntil: "load" });
        const read = await page.evaluate(
          (wrapper) => ({
            tables: document.querySelectorAll("table").length,
            boxes: [...document.querySelectorAll(`div.${wrapper}`)].map((box, at) => {
              box.focus();
              return {
                at,
                tabindex: box.getAttribute("tabindex"),
                focused: document.activeElement === box,
                hides: Math.round(box.scrollWidth - box.clientWidth),
              };
            }),
          }),
          WRAPPER
        );
        const boxes = read.boxes;
        // Counted, because a page with no box at all asserts nothing below it -
        // which is exactly the state this case was written against, and a case
        // that passes on the defect it watches for is worse than no case.
        assert.equal(
          boxes.length,
          read.tables,
          `${name} ${which}: ${read.tables} tables and ${boxes.length} boxes to scroll them in`
        );
        for (const box of boxes) {
          const at = `${name} ${which}, box ${box.at}`;
          assert.equal(box.tabindex, "0", `${at}: the box carries tabindex ${box.tabindex}`);
          assert.ok(box.focused, `${at}: the box around a table cannot take focus`);
        }
        for (const box of boxes.filter((one) => one.hides > 0)) {
          const at = `${name} ${which}, box ${box.at}`;
          // Focused again by itself: the loop above left focus on the page's
          // last box, which is not necessarily this one.
          const before = await focus(box.at);
          await page.keyboard.press("ArrowRight");
          // **Waited for rather than read.** A keyboard scroll is animated, so
          // reading `scrollLeft` in the turn after the press reads where the box
          // still is and not where it is going - a case that fails on a working
          // fix, which is the one thing a regression test may not do.
          const until = Date.now() + 2000;
          let after = await left(box.at);
          while (after <= before && Date.now() < until) {
            await page.waitForTimeout(50);
            after = await left(box.at);
          }
          assert.ok(
            after > before,
            `${at}: hides ${box.hides}px and one ArrowRight moved scrollLeft ` +
              `from ${before} to ${after}`
          );
          scrolled += 1;
        }
      }
      // Reported rather than asserted. Firefox lays the one wide table out to
      // the column, so it has nothing to scroll, and that is an engine
      // disagreeing about a column width rather than about the fix.
      if (scrolled === 0) {
        t.diagnostic(`${name}: no documentation table overflows its box at 390px`);
      }
    } finally {
      await context.close();
    }
  });
});

// The half the three cases above leave open. They prove the box is in the tab
// order and that a press moves it; neither says a reader can see where focus
// went. That matters more here than it usually would, because the `tabindex`
// added nine tab stops to a site that had none of them, and eight of the nine
// hide nothing at 390px while all nine hide nothing at 1280px - so most of what
// was added is a stop whose only job is to show itself. A silent, invisible
// stop is the worst of both: the reader presses Tab, the page looks unchanged,
// and the next press moves on.
//
// The site carries one global `:focus-visible { outline: 2px solid var(--accent);
// outline-offset: 2px }` and the wrapper leans on it rather than styling
// itself, which is the right call and also the fragile one - an `outline: none`
// anywhere above it, or a rule that stopped matching a plain div, would take
// the ring off all nine at once and no case here would have noticed.
//
// **Reached with a real Tab rather than `focus()`**, because `:focus-visible`
// is precisely the selector that tells the two apart: a programmatic focus on
// a div does not match it in any engine, so a case written with `focus()` would
// read `outline: none` on a working site and fail for the wrong reason. One
// pass of Tab presses per page, reading the ring off each box as focus lands on
// it, rather than a reload per box.
//
// The offset is read too. A 2px ring sitting 2px outside a box that is already
// flush with the reading column is the one way this rule could undo the
// containment the wrapper was added for, so the page's own width is measured
// while the ring is up: 374 of 390 at the phone width, so it fits.
test("every documentation table's box shows where focus went, and the ring costs no width", async (t) => {
  await overEngines(t, async (engine, name) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await engine.newContext({ viewport });
      const page = await context.newPage();
      try {
        let rings = 0;
        let boxes = 0;
        for (const which of PAGES) {
          await page.goto(`${site.base}/docs/${which}`, { waitUntil: "load" });
          const counts = await page.evaluate(
            (wrapper) => ({
              boxes: document.querySelectorAll(`div.${wrapper}`).length,
              focusable: document.querySelectorAll(
                'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
              ).length,
            }),
            WRAPPER
          );
          if (counts.boxes === 0) continue;
          boxes += counts.boxes;
          const seen = new Map();
          const limit = counts.focusable * 2 + 20;
          for (let press = 0; press < limit && seen.size < counts.boxes; press += 1) {
            await page.keyboard.press("Tab");
            const read = await page.evaluate((wrapper) => {
              const boxes = [...document.querySelectorAll(`div.${wrapper}`)];
              const el = document.activeElement;
              const at = boxes.indexOf(el);
              if (at < 0) return null;
              const cs = getComputedStyle(el);
              const de = document.documentElement;
              return {
                at,
                visible: el.matches(":focus-visible"),
                style: cs.outlineStyle,
                width: parseFloat(cs.outlineWidth),
                offset: cs.outlineOffset,
                right: Math.round(el.getBoundingClientRect().right * 10) / 10,
                client: de.clientWidth,
                scroll: de.scrollWidth,
              };
            }, WRAPPER);
            if (read) seen.set(read.at, read);
          }
          assert.equal(
            seen.size,
            counts.boxes,
            `${name} ${which} at ${viewport.width}px: Tab reached ${seen.size} of ` +
              `${counts.boxes} boxes in ${limit} presses`
          );
          for (const ring of seen.values()) {
            const at = `${name} ${which} at ${viewport.width}px, box ${ring.at}`;
            assert.ok(ring.visible, `${at}: focused by Tab and does not match :focus-visible`);
            assert.notEqual(ring.style, "none", `${at}: the focus ring is outline-style none`);
            assert.ok(ring.width >= 2, `${at}: the focus ring is ${ring.width}px`);
            // Wearing it does not widen the page, which a ring offset outside
            // a box flush with the column is the one way to do.
            assert.equal(
              ring.scroll,
              ring.client,
              `${at}: focused, the page measures ${ring.scroll} in ${ring.client}`
            );
            assert.ok(
              ring.right <= ring.client,
              `${at}: the box reaches ${ring.right} in a ${ring.client}px page`
            );
            rings += 1;
          }
        }
        // Counted off the site rather than written down. The site carried nine
        // boxes on 2026.11.14, and a tenth table added to a page is a page this
        // case covers rather than a figure it contradicts - which is the same
        // reason `PAGES` is read from the folder. The vacuity this guards is a
        // site with no box at all, so that is what is asserted.
        assert.ok(boxes > 0, `${name} at ${viewport.width}px: the site carries no box to focus`);
        assert.equal(
          rings,
          boxes,
          `${name} at ${viewport.width}px: read a ring off ${rings} of the site's ${boxes} boxes`
        );
      } finally {
        await context.close();
      }
    }
  });
});
