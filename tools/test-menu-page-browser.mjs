// Browser driven checks for the one page shape only the data file route
// writes: `cheatsheet-menu.html`, the front door of a site generated from a
// single JSON file.
//
// **Why a rendered check earns its place beside the text ones.**
// `tools/test-cheatsheet-data.mjs` asserts the menu page's markup as a string
// and `tools/test-cheatsheet-site.mjs` asserts `renderMenu`'s output the same
// way. Both are real coverage, and neither can see the three things that decide
// whether the page works for a reader:
//
// - **A `<details>` with no script behind it is a claim about the engine.**
//   The tool writes no JavaScript, so opening and closing the menu is the
//   element's own behaviour, and the only thing that can confirm it is an
//   element doing it. A marked up site splices this menu into a page that may
//   carry its own script; a data file site has nothing but this.
// - **"A keyboard reaches it" is a measurement, not a rule.** A `<summary>` is
//   focusable and operable by Enter and Space in every engine that ships one,
//   which is a sentence about the specification rather than about the three
//   engines a reader actually uses. The `tabindex` on a carried table's
//   wrapper, two files over, exists because exactly that assumption was wrong
//   once.
// - **"The page fits a phone" is settled by a layout engine.** The generated
//   cheatsheet pages have a case for this in
//   `tools/test-site-pages-browser.mjs`; the menu page had never been measured
//   at any width, because until the data file route there was no such page.
//
// The Playwright arrangement is the one `tools/test-page-structure-browser.mjs`
// settled: `tools/` stays dependency free, there is no package.json, and a
// clone with nothing installed has to run the suite. So Playwright is looked
// for at run time where it is actually installed, and every case here skips
// with the reason when it is not found. Install it for a machine that should
// run them:
//
//   npm install -g @playwright/test && npx playwright install
//
// **Every case runs over all three engines**, which is not the line
// `tools/test-site-pages-browser.mjs` draws and is right here for a different
// reason: nothing in this file measures markup the tool wrote, which reads the
// same everywhere. Every case measures what an engine does with a `<details>` -
// what it hides, what it puts in the tab order, what Enter and Space do to it -
// and that is the thing engines have disagreed about.
//
// The sites under test are written by `main` into a temporary folder, because
// nothing committed carries a data file and a run writes a `cheatsheets/`
// folder beside the one it reads.
//
// Run with: node --test tools/test-menu-page-browser.mjs
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { main, MENU_PAGE } from "./cheatsheet-data.mjs";
import { MASTER_NAME, OUTPUT_NAME, SCROLL_WRAPPER } from "./cheatsheet-site.mjs";

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

/** A launch failure's first line, which is the sentence naming what is wrong. */
const firstLine = (text) => text.split(/\r?\n/)[0];

/** The engines looked for, in the order a report reads best in. */
const ENGINES = ["chromium", "firefox", "webkit"];

/**
 * The browser types Playwright offers this machine, or why there are none.
 *
 * What this resolves is the library and not a browser: every engine is a named
 * export of the module whether or not its binary was ever downloaded, so a type
 * found here says nothing about whether it launches. That is settled one engine
 * at a time in `before`, where the failure has an install command to offer.
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
      if (found.chromium) return { engines: found };
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
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/**
 * The generated folder at `/`, which is what the real site is.
 *
 * Every href the menu writes is a bare file name, so the folder the pages are
 * served from is the folder those names resolve against - and serving the
 * repository behind `/` instead would answer them from somewhere the generated
 * site never is.
 */
function serve(base) {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    const file = join(base, requested === "/" ? "/index.html" : requested);
    if (!file.startsWith(base)) {
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

/** `main` with its two streams swallowed, the way the tool's own cases run it. */
async function generate(file) {
  const write = process.stdout.write;
  const fail = process.stderr.write;
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  try {
    return await main([file]);
  } finally {
    process.stdout.write = write;
    process.stderr.write = fail;
  }
}

const runtime = await loadEngines();

/**
 * Why every case here is skipped, or `false`.
 *
 * Assigned once more in `before`, when Chromium turns out not to launch: the
 * library resolving says nothing about a binary being on disk. Read inside each
 * case rather than at registration, so the second assignment is in force by the
 * time any of them runs.
 */
let skip = runtime.engines ? false : runtime.reason;

/** The engines that launched, by name. */
const browsers = new Map();
/** Why an engine is not in {@link browsers}, for a per engine skip. */
const unavailable = new Map();

let scratch;
/** The site the request's own shape produces: three pages and a menu. */
let site;
/** A second site, carrying a table made wide by its own content. */
let carried;

// Three entries over two folders, which is the smallest data file that makes
// every kind of menu entry at once: a master page carrying all of it, a folder
// page carrying two, and a page of its own at the site root.
const DATA = {
  menu: "dropdown",
  entries: [
    {
      page: "guide/arrays.html",
      title: "Working with arrays",
      material: [
        "<h2>splice</h2><p>Removes and inserts in place.</p>",
        {
          tag: "table",
          markup:
            "<table><caption>Returns</caption>" +
            "<tr><th>call</th><td>the removed items</td></tr></table>",
        },
      ],
    },
    {
      page: "guide/strings.html",
      title: "Working with strings",
      material: ["<h2>slice</h2><p>Copies a range out.</p>"],
    },
    {
      page: "index.html",
      title: "Acme Corp developer notes",
      material: ["<h2>Start here</h2><p>The notes are grouped by subject.</p>"],
    },
  ],
};

// The seven column table `tools/test-site-pages-browser.mjs` measures the
// containment of, carried through the data file route instead of a crawl. The
// site above cannot stand in for it: its two cell table fits any viewport, so
// nothing about the scroll box would be exercised by it at all.
const WIDE_TABLE =
  '<table id="content-wide"><caption>Regions and their quarters</caption>' +
  "<tr><th>Region</th><th>Q1 revenue</th><th>Q2 revenue</th><th>Q3 revenue</th>" +
  "<th>Q4 revenue</th><th>Account manager</th><th>Notes carried over</th></tr>" +
  "<tr><td>Region West</td><td>128,400</td><td>131,900</td><td>142,250</td>" +
  "<td>150,000</td><td>Jane Doe</td><td>Renewed on the same terms</td></tr></table>";

const WIDE_DATA = {
  menu: "dropdown",
  entries: [
    {
      page: "guide/arrays.html",
      title: "Working with arrays",
      material: [{ tag: "table", markup: WIDE_TABLE }],
    },
    {
      page: "index.html",
      title: "Acme Corp developer notes",
      material: ["<h2>Start here</h2>"],
    },
  ],
};

/** One data file in its own folder, generated, and served at `/`. */
async function buildSite(name, data) {
  const folder = join(scratch, name);
  await mkdir(folder, { recursive: true });
  const file = join(folder, "site.json");
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
  assert.equal(await generate(file), 0, `the generator did not write the ${name} site`);
  return serve(join(folder, OUTPUT_NAME));
}

before(async () => {
  if (skip) return;
  scratch = await mkdtemp(join(tmpdir(), "cheatsheet-menu-page-"));
  site = await buildSite("data-site", DATA);
  carried = await buildSite("wide-site", WIDE_DATA);
  for (const name of ENGINES) {
    const type = runtime.engines[name];
    if (!type) {
      unavailable.set(name, `This copy of Playwright offers no ${name}.`);
      continue;
    }
    try {
      browsers.set(name, await type.launch());
    } catch (error) {
      // A missing binary and a broken one read the same from here, and the
      // same command fixes both.
      unavailable.set(
        name,
        `${name} did not launch: ${firstLine(error.message)}. ` +
          `Run \`npx playwright install ${name}\`.`
      );
    }
  }
  if (!browsers.get("chromium")) skip = unavailable.get("chromium");
});

after(async () => {
  for (const one of browsers.values()) await one.close();
  site?.server.close();
  carried?.server.close();
  if (scratch) await rm(scratch, { recursive: true, force: true });
});

/**
 * Run one case over every engine that launched, as a subtest naming it.
 *
 * An engine that is not installed skips its own subtest with the install
 * command, so a machine with Chromium alone reports the two it has not got
 * rather than failing or passing silently.
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

/** The menu page, in one engine, at one viewport. */
async function openMenu(engine, viewport = { width: 1280, height: 900 }) {
  const context = await engine.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${site.base}/${MENU_PAGE}`, { waitUntil: "load" });
  return { context, page };
}

test("the menu page is a heading, the menu, and nothing else, all inside the viewport", async (t) => {
  await overEngines(t, async (engine, name) => {
    const { context, page } = await openMenu(engine);
    try {
      const seen = await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return {
            left: Math.round(r.left),
            top: Math.round(r.top),
            right: Math.round(r.right),
            bottom: Math.round(r.bottom),
          };
        };
        return {
          title: document.title,
          lang: document.documentElement.lang,
          children: [...document.body.children].map((el) => el.tagName.toLowerCase()),
          h1: document.querySelector("h1")?.textContent ?? null,
          h1Box: box(document.querySelector("h1")),
          detailsBox: box(document.querySelector("details")),
          scripts: document.querySelectorAll("script").length,
          client: document.documentElement.clientWidth,
        };
      });
      assert.equal(seen.h1, "Cheatsheet Menu", `${name}: the heading is not the page's own name`);
      assert.equal(seen.title, "Cheatsheet Menu", `${name}: the document title is ${seen.title}`);
      assert.equal(seen.lang, "en", `${name}: the document declares no language`);
      assert.deepEqual(
        seen.children,
        ["h1", "details"],
        `${name}: the body holds something besides the heading and the menu`
      );
      // The claim the whole menu rests on: no script, so what opens it below is
      // the element and not something this tool wrote.
      assert.equal(seen.scripts, 0, `${name}: the page carries script, which it is said not to`);
      for (const [what, b] of [
        ["the heading", seen.h1Box],
        ["the menu", seen.detailsBox],
      ]) {
        assert.ok(
          b.left >= -1 && b.top >= -1 && b.right <= seen.client + 1,
          `${name}: ${what} is drawn outside the viewport at ${JSON.stringify(b)}`
        );
      }
      assert.ok(
        seen.detailsBox.top >= seen.h1Box.bottom - 1,
        `${name}: the menu at ${seen.detailsBox.top} overlaps the heading ending at ` +
          `${seen.h1Box.bottom}`
      );
    } finally {
      await context.close();
    }
  });
});

// **A closed `<details>` keeps its content's geometry, so a box measurement is
// the wrong reading, and the obvious case here is one that passes on a broken
// page.** Measured 2026.11.19 on this page with the disclosure closed: all
// three engines report the `<ul>` at 1264x54 with `visibility: visible` and
// `display: block`, because the content sits in a `::details-content` box that
// is skipped rather than laid out away. So `getBoundingClientRect().height === 0`
// and `getComputedStyle(list).visibility` both read a working closed menu as an
// open one, in every engine.
//
// What does mean hidden, and agrees across Chromium 151, Firefox 153 and
// WebKit 26.5: `checkVisibility()` is false, the entries are not returned by
// `elementFromPoint` at their own coordinates, and the `<details>` element's
// own height is the summary's alone - 18, 19 and 21px closed against 88, 93 and
// 88px open. All three are asserted. The first is the reading the platform
// offers, the second is the one that proves a closed entry cannot be clicked,
// and the third is the one a person looking at the page would make.
test("the dropdown arrives closed, opens on the summary, and closes again", async (t) => {
  await overEngines(t, async (engine, name) => {
    const { context, page } = await openMenu(engine);
    try {
      const read = () =>
        page.evaluate(() => {
          const details = document.querySelector("details");
          const list = details.querySelector("ul");
          const link = details.querySelector("ul li a");
          const r = link.getBoundingClientRect();
          const at = document.elementFromPoint(
            Math.round(r.left + r.width / 2),
            Math.round(r.top + r.height / 2)
          );
          return {
            open: details.open,
            attribute: details.hasAttribute("open"),
            shown: list.checkVisibility(),
            reachable: at !== null && at.tagName.toLowerCase() === "a",
            height: Math.round(details.getBoundingClientRect().height),
            summary: Math.round(details.querySelector("summary").getBoundingClientRect().height),
          };
        });
      const arrival = await read();
      await page.click("details > summary");
      const opened = await read();
      await page.click("details > summary");
      const closed = await read();
      assert.equal(arrival.open, false, `${name}: the dropdown is open on arrival`);
      assert.equal(arrival.attribute, false, `${name}: the generated markup carries open=`);
      assert.equal(arrival.shown, false, `${name}: the entries are showing while it is closed`);
      assert.equal(arrival.reachable, false, `${name}: a closed entry answers a click`);
      assert.ok(
        arrival.height <= arrival.summary + 4,
        `${name}: closed, the disclosure is ${arrival.height}px over a ${arrival.summary}px ` +
          "summary, so it is taking room for entries nobody can see"
      );
      assert.equal(opened.open, true, `${name}: activating the summary did not open it`);
      assert.equal(opened.shown, true, `${name}: it opened without showing the entries`);
      assert.equal(opened.reachable, true, `${name}: it opened with the entries unclickable`);
      assert.ok(
        opened.height > arrival.height + 20,
        `${name}: opening it took the disclosure from ${arrival.height}px to ${opened.height}px, ` +
          "so nothing was revealed"
      );
      assert.equal(closed.open, false, `${name}: activating it a second time did not close it`);
      assert.equal(closed.shown, false, `${name}: it closed with the entries still showing`);
      assert.equal(closed.reachable, false, `${name}: it closed with the entries still clickable`);
      assert.equal(
        closed.height,
        arrival.height,
        `${name}: closed again it is ${closed.height}px, not the ${arrival.height}px it arrived at`
      );
    } finally {
      await context.close();
    }
  });
});

// The menu is the whole of this page, so the first Tab landing on it is not a
// nicety: there is nothing else for a keyboard to reach. Enter and Space are
// both asserted because a `<summary>` is the one control whose Space handling
// has differed between engines, and reading one of them would measure half of
// what a reader has.
//
// **The focus indicator is read off the pixels rather than off `outline`.** The
// computed value differs by engine - `auto 1px rgb(16, 16, 16)` in Chromium,
// `auto 1px rgb(0, 0, 0)` in Firefox, `auto 3px rgb(0, 0, 0)` in WebKit - and
// `auto` says nothing about anything being painted. Two screenshots of the same
// element differing is the thing actually being promised.
test("a keyboard reaches the summary first, shows the focus, and toggles it with Enter and Space", async (t) => {
  await overEngines(t, async (engine, name) => {
    const { context, page } = await openMenu(engine);
    try {
      const before = await page.locator("details > summary").screenshot();
      await page.keyboard.press("Tab");
      const first = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el.tagName.toLowerCase(),
          isSummary: el === document.querySelector("details > summary"),
        };
      });
      const after = await page.locator("details > summary").screenshot();
      assert.ok(
        first.isSummary,
        `${name}: the first Tab landed on <${first.tag}> rather than the summary`
      );
      assert.ok(
        !before.equals(after),
        `${name}: focusing the summary changed no pixel in it, so no focus indicator is drawn`
      );
      const open = () => page.evaluate(() => document.querySelector("details").open);
      for (const key of ["Enter", "Space"]) {
        await page.keyboard.press(key);
        assert.equal(await open(), true, `${name}: ${key} did not open the disclosure`);
        await page.keyboard.press(key);
        assert.equal(await open(), false, `${name}: ${key} did not close it again`);
      }
    } finally {
      await context.close();
    }
  });
});

test("the entries are the generated siblings, in order, and each one answers", async (t) => {
  await overEngines(t, async (engine, name) => {
    const { context, page } = await openMenu(engine);
    try {
      const entries = await page.evaluate(() =>
        [...document.querySelectorAll("details ul li a")].map((a) => ({
          text: a.textContent,
          href: a.getAttribute("href"),
          resolved: a.href,
        }))
      );
      // The master page first, because `pagesToWrite` wrote it first, and the
      // rest as prose forms of the file names rather than of the headings.
      assert.deepEqual(
        entries.map((e) => e.text),
        ["All Cheatsheets", "Guide", "Index"],
        `${name}: the entries are not the generated pages with the master leading`
      );
      assert.deepEqual(
        entries.map((e) => e.href),
        [MASTER_NAME, "guide.html", "index.html"],
        `${name}: an href is not a bare sibling file name`
      );
      const folder = `${site.base}/`;
      for (const entry of entries) {
        // The failure this guards is a menu whose links walk into
        // `cheatsheets/cheatsheets/`, which a folder prefixed target would do
        // and which reads as a working menu until one is followed.
        assert.equal(
          entry.resolved,
          `${folder}${entry.href}`,
          `${name}: ${entry.href} resolves to ${entry.resolved}, which is not a sibling`
        );
        await page.click("details > summary");
        const response = await Promise.all([
          page.waitForNavigation({ waitUntil: "load" }),
          page.click(`details ul li a[href="${entry.href}"]`),
        ]).then(([navigation]) => navigation);
        const landed = await page.evaluate(() => ({
          url: location.href,
          h1: document.querySelector("h1")?.textContent ?? null,
        }));
        assert.equal(
          response.status(),
          200,
          `${name}: ${entry.href} answered ${response.status()}`
        );
        assert.equal(
          landed.url,
          `${folder}${entry.href}`,
          `${name}: following ${entry.href} landed on ${landed.url}`
        );
        assert.ok(landed.h1, `${name}: ${entry.href} has no heading, so it is not a page`);
        await page.goBack({ waitUntil: "load" });
      }
    } finally {
      await context.close();
    }
  });
});

test("the menu page does not scroll sideways at 390px, open or closed", async (t) => {
  await overEngines(t, async (engine, name) => {
    const { context, page } = await openMenu(engine, { width: 390, height: 844 });
    try {
      const measure = () =>
        page.evaluate(() => {
          const de = document.documentElement;
          const boxes = [
            ["the summary", document.querySelector("details > summary")],
            ...[...document.querySelectorAll("details ul li a")].map((a) => [a.textContent, a]),
          ];
          return {
            scrollWidth: de.scrollWidth,
            clientWidth: de.clientWidth,
            outside: boxes
              .map(([what, el]) => [what, el.getBoundingClientRect()])
              .filter(([, r]) => r.right > de.clientWidth + 1 || r.left < -1)
              .map(([what, r]) => `${what} reaches ${Math.round(r.right)}px`),
          };
        });
      const closed = await measure();
      await page.click("details > summary");
      const opened = await measure();
      // Both states, because the entries have no box at all until it is open
      // and they are the only thing on the page wide enough to push it.
      for (const [state, seen] of [
        ["closed", closed],
        ["open", opened],
      ]) {
        assert.equal(
          seen.scrollWidth,
          seen.clientWidth,
          `${name}: ${state}, the page measures ${seen.scrollWidth} against ${seen.clientWidth}`
        );
        assert.deepEqual(
          seen.outside,
          [],
          `${name}: ${state}, something is outside the viewport: ${seen.outside.join("; ")}`
        );
      }
    } finally {
      await context.close();
    }
  });
});

// **The page carries no stylesheet by design** - the site owner's own is what
// dresses it - so what is worth asserting is that the undressed page is usable,
// not that it is handsome. Usable here is four things: the entries are list
// items, they carry a marker, they are underlined so nothing reads as plain
// text, and they are stacked one per line with a box big enough to hit.
test("at a desktop width the opened menu reads as a list of stacked, clickable entries", async (t) => {
  await overEngines(t, async (engine, name) => {
    const { context, page } = await openMenu(engine, { width: 1280, height: 900 });
    try {
      await page.click("details > summary");
      const seen = await page.evaluate(() => {
        const items = [...document.querySelectorAll("details ul li")];
        const links = [...document.querySelectorAll("details ul li a")];
        const itemStyle = getComputedStyle(items[0]);
        return {
          listStyleType: itemStyle.listStyleType,
          itemDisplay: itemStyle.display,
          decoration: getComputedStyle(links[0]).textDecorationLine,
          tops: links.map((a) => Math.round(a.getBoundingClientRect().top)),
          sizes: links.map((a) => {
            const r = a.getBoundingClientRect();
            return [Math.round(r.width), Math.round(r.height)];
          }),
        };
      });
      assert.equal(seen.itemDisplay, "list-item", `${name}: the entries are not list items`);
      assert.notEqual(seen.listStyleType, "none", `${name}: the entries carry no marker`);
      assert.equal(
        seen.decoration,
        "underline",
        `${name}: the entries are not underlined, so nothing tells them from text`
      );
      assert.equal(seen.tops.length, 3, `${name}: ${seen.tops.length} entries drawn`);
      for (let at = 1; at < seen.tops.length; at += 1) {
        assert.ok(
          seen.tops[at] > seen.tops[at - 1],
          `${name}: entry ${at + 1} sits at ${seen.tops[at]}, not below entry ${at} at ` +
            `${seen.tops[at - 1]}`
        );
      }
      for (const [at, [width, height]] of seen.sizes.entries()) {
        assert.ok(
          width > 20 && height > 10,
          `${name}: entry ${at + 1} is a ${width}x${height} box, too small to hit`
        );
      }
    } finally {
      await context.close();
    }
  });
});

// The other half of what the data file route promises: that the pages the menu
// leads to are the pages the crawl route writes. The text cases compare the two
// front ends byte for byte, which settles the markup and leaves open whether
// the markup draws - a composed figure and a carried table are both things only
// an engine resolves.
test("a page reached through the menu draws its composed figure and its carried table", async (t) => {
  await overEngines(t, async (engine, name) => {
    const { context, page } = await openMenu(engine, { width: 1280, height: 900 });
    try {
      await page.click("details > summary");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "load" }),
        page.click('details ul li a[href="guide.html"]'),
      ]);
      const seen = await page.evaluate((wrapper) => {
        const svg = document.querySelector("svg");
        const r = svg.getBoundingClientRect();
        const table = document.querySelector("table");
        const box = table.closest(`[${wrapper}]`);
        return {
          h1: document.querySelector("h1")?.textContent,
          svg: { width: Math.round(r.width), height: Math.round(r.height) },
          viewBox: svg.getAttribute("viewBox"),
          svgTitle: svg.querySelector("title")?.textContent,
          altText: document.querySelector("[role=img]")?.getAttribute("aria-label"),
          caption: table.querySelector("caption")?.textContent,
          cells: [...table.querySelectorAll("th, td")].map((cell) => cell.textContent),
          tableDisplay: getComputedStyle(table).display,
          tableHeight: Math.round(table.getBoundingClientRect().height),
          boxed: box !== null,
          boxOverflowX: box === null ? null : getComputedStyle(box).overflowX,
          boxTabIndex: box?.getAttribute("tabindex") ?? null,
          boxRole: box?.getAttribute("role") ?? null,
          boxLabel: box?.getAttribute("aria-label") ?? null,
          sections: [...document.querySelectorAll("[data-cheatsheet-page]")].map((one) =>
            one.getAttribute("data-cheatsheet-page")
          ),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      }, SCROLL_WRAPPER);
      assert.equal(seen.h1, "Guide", `${name}: the page the menu led to is not Guide`);
      // The figure is drawn, and drawn square: the attributes come off and
      // `width:100%;height:auto` goes on, so a 3600 square shrinking to a
      // rectangle is the whole of what could go wrong and is invisible in the
      // markup.
      assert.equal(seen.viewBox, "0 0 3600 3600", `${name}: the figure's viewBox`);
      assert.ok(seen.svg.width > 200, `${name}: the figure is ${seen.svg.width}px wide`);
      assert.ok(
        Math.abs(seen.svg.width - seen.svg.height) <= 2,
        `${name}: a 3600 square drew ${seen.svg.width}x${seen.svg.height}, so its ratio was lost`
      );
      assert.equal(seen.svgTitle, "Guide", `${name}: the figure has no accessible title`);
      assert.equal(seen.altText, "Guide cheat sheet", `${name}: the figure's label`);
      // And painted rather than blank, which every assertion above passes with.
      const painted = await page.locator("svg").screenshot();
      const values = new Set();
      for (let at = 0; at < painted.length; at += 997) values.add(painted[at]);
      assert.ok(
        values.size > 4,
        `${name}: the figure's pixels read as ${values.size} value(s), so nothing was painted`
      );
      // And the carried material arrives below it, in the box the crawl route
      // gives it and with the label it takes from the caption.
      assert.deepEqual(seen.sections, ["guide/arrays.html", "guide/strings.html"]);
      assert.equal(seen.caption, "Returns", `${name}: the carried table lost its caption`);
      assert.deepEqual(seen.cells, ["call", "the removed items"]);
      assert.equal(seen.tableDisplay, "table", `${name}: the carried table is ${seen.tableDisplay}`);
      assert.ok(seen.tableHeight > 10, `${name}: the table drew ${seen.tableHeight}px tall`);
      assert.ok(seen.boxed, `${name}: the carried table was given no box`);
      assert.equal(seen.boxOverflowX, "auto", `${name}: the box is not one that scrolls`);
      assert.equal(seen.boxTabIndex, "0", `${name}: the box is not in the tab order`);
      assert.equal(seen.boxRole, "region", `${name}: the box is a ${seen.boxRole}`);
      assert.equal(seen.boxLabel, "Returns", `${name}: the box took no label from the caption`);
      assert.equal(
        seen.scrollWidth,
        seen.clientWidth,
        `${name}: the page measures ${seen.scrollWidth} against ${seen.clientWidth}`
      );
    } finally {
      await context.close();
    }
  });
});

// The containment `tools/test-site-pages-browser.mjs` measures on a crawled
// site, read on a page the data file route wrote. Same promise, same three
// readings: the box fits the page, the table overflows the box rather than
// being re-laid out to fit it, and the box takes a keyboard.
test("a content-wide table the data route carried scrolls in its box, not the page, at 390px", async (t) => {
  await overEngines(t, async (engine, name) => {
    const context = await engine.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    try {
      await page.goto(`${carried.base}/guide.html`, { waitUntil: "load" });
      const seen = await page.evaluate((wrapper) => {
        const table = document.getElementById("content-wide");
        const box = table.closest(`[${wrapper}]`);
        const de = document.documentElement;
        const br = box.getBoundingClientRect();
        box.focus();
        return {
          tableWidth: Math.round(table.getBoundingClientRect().width),
          boxWidth: Math.round(br.width),
          boxFits: br.right <= de.clientWidth + 1,
          boxOverflowX: getComputedStyle(box).overflowX,
          boxScrolls: box.scrollWidth > box.clientWidth + 1,
          focused: document.activeElement === box,
          display: getComputedStyle(table).display,
          scrollWidth: de.scrollWidth,
          clientWidth: de.clientWidth,
        };
      }, SCROLL_WRAPPER);
      assert.ok(seen.boxFits, `${name}: the box around the table reaches past the page`);
      assert.equal(seen.boxOverflowX, "auto", `${name}: the box is not one that scrolls`);
      assert.ok(seen.boxScrolls, `${name}: the table fits its box, so nothing was contained`);
      assert.ok(
        seen.tableWidth > seen.boxWidth + 1,
        `${name}: the table is ${seen.tableWidth}px inside a ${seen.boxWidth}px box, so its ` +
          "columns were re-laid out"
      );
      assert.equal(seen.display, "table", `${name}: the carried table is display: ${seen.display}`);
      assert.ok(seen.focused, `${name}: the box around a carried table cannot take focus`);
      assert.equal(
        seen.scrollWidth,
        seen.clientWidth,
        `${name}: the page measures ${seen.scrollWidth} against ${seen.clientWidth}`
      );
    } finally {
      await context.close();
    }
  });
});
