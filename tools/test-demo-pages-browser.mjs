// Opens the `demo/index.html` of every `embed` cheatsheet in a real engine and
// presses everything on it.
//
// **The first file in this repository that opens a demo at all.** Five of them
// landed on 2026.10.26 as the `html-apis` group, and every committed test
// reached the sheets rather than the payloads: `tools/test-example-selection.mjs`
// drives the page and selects each of the five, `tools/test-sheet-syntax-roles.mjs`
// holds their per-line roles, `tools/test-sheet-indent-columns-browser.mjs`
// holds their drawn columns - and none of the three loads the page a reader is
// sent to. A demo whose every control threw on the first click would have
// passed the whole suite.
//
// ## What a demo is held to
//
// Seven claims, none of them about a particular demo, so the next `embed` sheet
// is covered by writing its folder rather than by editing this file:
//
// - **Every control answers.** Pressing a control either writes a line into the
//   log panel or opens a dialog whose close writes one. A control that does
//   neither is a dead control, which is the fault a reader meets first.
// - **A refusal is reported, never thrown.** No console error and no uncaught
//   page error across the whole run, and every line in the panel carries either
//   the accent or the refusal amber. The browsers these pages run in withhold
//   the clipboard and may withhold storage, so the demos are written to say so
//   in a line - and a line is what this checks for, rather than checking that
//   the permission was granted, which depends on the engine and not on the page.
// - **Every control takes keyboard focus visibly.** Walked with Tab, each
//   control the order reaches draws an outline of its own or the user agent's.
// - **Nothing overflows a narrow window.** 320px across, which is the narrow
//   width this repository has measured at since 2026.10.19 and is well inside
//   the site's one width breakpoint, `max-width: 767px` in `index.html`. A
//   demo carries no breakpoint of its own, so what is under test is whether it
//   reflows on its own terms.
// - **The page is painted in the site's dark theme.** The four values from the
//   dark table in `DESIGN_LANGUAGE.md`, read off the custom properties. A demo
//   is a page in its own right and nothing else imports the site's stylesheet,
//   so this is the only thing holding the two in step.
// - **It answers the same framed as the page frames it.** Every control, and
//   every button a dialog offers, pressed again inside an `iframe` carrying the
//   page's own sandbox - which is a second claim rather than the same one,
//   because the grant can withhold something a control needs. See **The framed
//   walk** at the foot of this file.
// - **It never moves the page holding it.** No control, and no button in a
//   dialog, navigates the top level document. The frame is granted form
//   submission and not `allow-top-navigation`, so a submission resolves inside
//   the frame; this reads the behaviour rather than the grant, which
//   `tools/test-example-selection.mjs` pins on its own.
//
// ## Settling, rather than waiting for the first change
//
// Every handler but one opens by clearing the panel, so the first change after
// a click is the clear - which arrives synchronously, in front of the awaits
// that produce the lines. A wait for "the panel changed" therefore reads an
// `async` handler's panel while it is empty, and three working controls were
// measured as writing nothing that way on 2026.10.26. So {@link press} waits
// for the panel to stop changing with at least one line in it.
//
// Nothing is added to the repository for this - Playwright is looked for at run
// time in the places it is actually installed and every case skips with the
// reason where it is absent. Install it for a machine that should run them:
//
//   npm install -g @playwright/test && npx playwright install chromium
//
// The repository is served on an ephemeral port, as in
// `tools/test-example-selection.mjs`: a demo is a module page and the file
// scheme gives it an opaque origin, where `web-storage` reports no storage
// rather than exercising the store it is about.
//
// Run with: node --test tools/test-demo-pages-browser.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "cheatsheets.json"), "utf8"));

// Where Playwright is looked for, in order: a local install, then whatever
// PLAYWRIGHT_MODULE names, then the user scope global. Identical to the sibling
// browser files, so a machine that runs one runs all of them.
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

/**
 * The sandbox the page frames a demo under, read from `index.html`.
 *
 * Read rather than repeated, so the framed walk below follows the page the
 * next time the grant changes instead of holding the demos to a string that
 * has gone stale. It is read with a regular expression rather than by
 * evaluating the page, because the token is wanted before a browser is
 * launched - the harness the server hands out carries it in its markup.
 *
 * A miss throws here, at load, rather than framing a demo under a default:
 * `sandbox=""` is the strictest grant there is, so a silent fallback would
 * fail every case below with the wrong diagnosis.
 */
function pageSandbox() {
  const source = readFileSync(join(root, "index.html"), "utf8");
  const found = source.match(/\bconst DEMO_SANDBOX = "([^"]*)";/);
  if (!found) {
    throw new Error("index.html no longer declares `const DEMO_SANDBOX = \"...\";`");
  }
  return found[1];
}

const DEMO_SANDBOX = pageSandbox();

/** Where the server answers with a harness instead of a file. */
const FRAME_ROUTE = "/__framed/";

/**
 * The box the page gives a frame on its wide layout, from **Fit the frame** in
 * `CONTRIBUTING.md`.
 *
 * The figures are here so a demo lays out under the walk the way it lays out
 * for a reader, and not because this file holds them - whether a demo fits is
 * measured in the record under `test-results/ui-ux-tester.agent/`. 672px is the
 * tallest of the committed demos rounded up to the page's 8px step, so nothing
 * should scroll inside the frame at this width.
 */
const FRAME_BOX = { width: 736, height: 672 };

/** A top level page holding one demo in a frame, sandboxed as the page does it. */
function frameHarness(payload) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>framed demo harness</title>
<style>
 html, body { margin: 0; background: #020433; }
 iframe {
  display: block;
  width: ${FRAME_BOX.width}px;
  height: ${FRAME_BOX.height}px;
  border: 0;
 }
</style>
</head>
<body>
<iframe title="framed demo" sandbox="${DEMO_SANDBOX}" src="/${payload}"></iframe>
</body>
</html>
`;
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/vnd.microsoft.icon",
};

/**
 * Serve the repository, and only the repository - plus one page that is not in
 * it.
 *
 * {@link FRAME_ROUTE} is answered from {@link frameHarness} rather than from
 * disk, because the framed walk needs a top level document holding an `iframe`
 * and the repository has no such file. It is served from the same origin as
 * the demos so the harness is as close to the page as a test can get without
 * loading the page.
 */
function serveRepository() {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent(request.url.split("?")[0]);
    if (requested.startsWith(FRAME_ROUTE)) {
      response.writeHead(200, { "content-type": TYPES[".html"] });
      response.end(frameHarness(requested.slice(FRAME_ROUTE.length)));
      return;
    }
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

/**
 * The site's dark theme, from **Dark theme** in `DESIGN_LANGUAGE.md`.
 *
 * The demos name them `--ground`, `--ink`, `--accent` and `--edge` where
 * `index.html` names them `--page`, `--text`, `--accent` and `--border`. The
 * names are each page's own; the values are the record's.
 */
const DARK = {
  ground: "#020433",
  ink: "#F8F8F9",
  accent: "#4CAE50",
  edge: "#6F6F8C",
};

/** The accent as the engine reports it, and the amber a refusal is drawn in. */
const REPORTED = "rgb(76, 174, 80)";
const REFUSED = "rgb(253, 200, 58)";

/** Every `embed` cheatsheet in the committed catalog, with its payload. */
function embedDemos() {
  return manifest.categories
    .flatMap((category) => category.cheatsheets)
    .filter((entry) => entry.kind === "embed")
    .map((entry) => ({ id: entry.id, title: entry.title, payload: entry.payload }));
}

const demos = embedDemos();
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

/** The log panel: its markup, and the colour each line is drawn in. */
const READ_LOG = () => {
  const log = document.querySelector("#log");
  if (!log) return null;
  return {
    html: log.innerHTML,
    lines: [...log.querySelectorAll("span")].map((span) => ({
      text: span.textContent,
      color: getComputedStyle(span).color,
    })),
  };
};

/**
 * Opens a demo with its console and its uncaught errors collected.
 *
 * The two arrays are live, so a case reads them after it has finished pressing
 * rather than subscribing per press.
 */
async function openDemo(payload, viewport = { width: 1000, height: 800 }) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  await page.goto(`${site.base}${payload}`, { waitUntil: "load" });
  return { page, consoleErrors, pageErrors };
}

/** How long a control is given to finish answering, and to settle once it has. */
const ANSWER_MS = 6000;
const SETTLE_MS = 400;

/**
 * Presses one control and waits for the panel to finish saying what it says.
 *
 * See **Settling** in the header: the wait is for the markup to stop changing
 * with a line in it, never for the first change, which on every handler that
 * clears the panel is the clear.
 *
 * **The panel is emptied before the press rather than compared with what it
 * held.** Comparing is a false negative the moment two controls report the
 * same thing: `#round` and `#clear` in `web-storage` both answer "no storage
 * on this origin" where there is none, so the second press rebuilds markup
 * identical to the first's and reads as having written nothing. Measured on
 * 2026.10.28 by the framed walk at the foot of this file, where the frame's
 * opaque origin makes both refuse - the direct pass never met it, because
 * storage works over http on 127.0.0.1. Every handler clears the panel itself
 * bar the two in `element-observers`, which append, and an empty panel costs
 * those two nothing. So after the press, a line in the panel is this press's
 * line and no earlier one's.
 */
async function press(page, handle) {
  await page.evaluate(() => {
    document.querySelector("#log").textContent = "";
  });
  await handle.click();
  const deadline = Date.now() + ANSWER_MS;
  let last = null;
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    const seen = await page.evaluate(() => ({
      html: document.querySelector("#log").innerHTML,
      lines: document.querySelectorAll("#log span").length,
      dialog: Boolean(document.querySelector("dialog[open]")),
    }));
    if (seen.dialog) break;
    if (seen.html !== last) {
      last = seen.html;
      stableSince = Date.now();
    } else if (seen.lines > 0 && Date.now() - stableSince >= SETTLE_MS) {
      break;
    }
    await page.waitForTimeout(80);
  }
  const now = await page.evaluate(READ_LOG);
  const dialog = await page.evaluate(() => Boolean(document.querySelector("dialog[open]")));
  return { now, dialog, wrote: now.lines.length > 0 };
}

/**
 * Opens one demo inside a frame carrying the page's own sandbox.
 *
 * The two arrays belong to the harness page and collect the frame's messages
 * too, which is what makes a withheld permission visible at all: the engine
 * reports one on the top level console, and the demo then reports it again in
 * a line of its own.
 */
async function openFramed(payload, viewport = { width: 1000, height: 800 }) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  await page.goto(`${site.base}${FRAME_ROUTE.slice(1)}${payload}`, { waitUntil: "load" });
  const element = await page.waitForSelector("iframe", { state: "attached" });
  const frame = await element.contentFrame();
  await frame.waitForSelector("#log", { state: "attached" });
  // Watched from here rather than from `newPage`, so the document's own load
  // is not counted as a demo having moved anything. See **The top level** at
  // the foot of the framed walk for what this is for.
  const navigated = [];
  page.on("framenavigated", (moved) => {
    if (moved === page.mainFrame()) navigated.push(moved.url());
  });
  return { page, frame, consoleErrors, pageErrors, navigated };
}

/**
 * The engine's own notice that the sandbox withheld something.
 *
 * Chromium logs one of these when a demo reaches for the clipboard inside the
 * frame, and the demo reports the same refusal in a line - so the message is
 * the sandbox working as intended and the engine saying so, not the frame
 * costing the demo anything. Everything else the frame logs is a fault.
 */
const WITHHELD = /Permissions policy violation/i;

/** Every `demo/` folder under a category, found on disk rather than declared. */
function demoFoldersOnDisk() {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "demo") found.push(join(dir, entry.name));
      else walk(join(dir, entry.name));
    }
  };
  for (const category of manifest.categories) {
    const dir = join(root, category.id);
    if (existsSync(dir)) walk(dir);
  }
  return found.map((dir) => relative(root, dir).split(sep).join("/"));
}

// **The anti-vacuity guard, and it is a two-way one.** Every case below is
// generated from the catalog, so a catalog holding no `embed` entry would make
// the whole file a row of passes for a group that is not there. Counting the
// entries is the wrong guard for that, because zero is the right answer for a
// repository that has no demos yet. What is never right is the two disagreeing:
// a `demo/` folder on disk that the catalog does not offer is a group that
// half landed, which is exactly the state in which the cases below would go
// quiet without saying so.
//
// This is not what `tools/test-build-manifest.mjs` holds. That file holds the
// builder to its fixtures - `detectPayload` reporting `embed` from a `demo/`
// folder, and `--check` refusing a declared kind the disk does not support.
// This holds the committed catalog to the committed tree.
test("the catalog offers every demo folder in the tree, and no more", { skip }, () => {
  const onDisk = demoFoldersOnDisk().sort();
  const offered = demos.map((demo) => demo.payload.replace(/\/index\.html$/, "")).sort();
  assert.deepEqual(
    onDisk,
    offered,
    `the catalog offers ${offered.length} demo(s) and the tree holds ${onDisk.length}`
  );
  for (const demo of demos) {
    assert.match(demo.payload, /\/demo\/index\.html$/, `${demo.id} does not point at a demo page`);
    assert.ok(existsSync(join(root, demo.payload)), `${demo.id} names a demo page that is not there`);
  }
});

// **One page per demo, and one pressing pass, rather than one of each per
// rule.** The five rules below were five cases to begin with, which opened five
// pages per demo and pressed every control four times over. That is 25 page
// loads in a file that runs beside every other browser file in the suite, and
// measured on 2026.10.26 it was enough contention to take an unrelated
// 30-second `waitForSelector` in `tools/test-example-selection.mjs` past its
// wait - twice in three full-suite runs, against none in two runs with this
// file held out. Five loads cost the suite nothing worth noticing and the
// pressing pass is shared, so the narrow-window rule is read with the panel
// already full, which is the state a reader meets rather than an empty page.
//
// The cost is granularity: a demo that breaks two rules reports one failing
// case. Each assertion names its own rule and the violation it found, which is
// what a reader needs from the output; the case name alone was never enough.
for (const demo of demos) {
  test(`${demo.title} behaves as a demo page`, { skip }, async () => {
    const { page, consoleErrors, pageErrors } = await openDemo(demo.payload);
    assert.deepEqual([consoleErrors, pageErrors], [[], []], `${demo.id} on load`);
    assert.ok(await page.evaluate(READ_LOG), `${demo.id} has no #log panel`);

    // --- Painted in the site's dark theme.
    const painted = await page.evaluate((names) => {
      const style = getComputedStyle(document.documentElement);
      return {
        read: Object.fromEntries(
          names.map((name) => [name, style.getPropertyValue(`--${name}`).trim().toUpperCase()])
        ),
        body: getComputedStyle(document.body).backgroundColor,
      };
    }, Object.keys(DARK));
    for (const [name, hex] of Object.entries(DARK)) {
      assert.equal(painted.read[name], hex, `${demo.id} paints --${name} as ${painted.read[name]}`);
    }
    assert.equal(painted.body, "rgb(2, 4, 51)", `${demo.id} does not stand on the navy ground`);

    // --- Keyboard focus, walked before anything is pressed so the order is the
    // one a reader arriving by keyboard meets.
    const walked = [];
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const at = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        return {
          name: element.id || element.textContent?.trim().slice(0, 24) || element.tagName,
          // **The style decides this and the width cannot.** Chromium reports
          // `outline-width: 3px` on an element whose `outline-style` is `none`,
          // so a predicate that reads the width alone passes a control with no
          // ring at all - measured against `outline: none` on 2026.10.26, which
          // is why the style is tested first. `auto` is the user agent's own
          // ring, painted as a light band whatever the colour computes to, and
          // counts as visible.
          ring:
            style.outlineStyle !== "none" &&
            style.outlineStyle !== "hidden" &&
            parseFloat(style.outlineWidth) > 0,
          outline: `${style.outlineStyle} ${style.outlineWidth}`,
        };
      });
      if (!at) break;
      if (walked.some((seen) => seen.name === at.name)) break;
      walked.push(at);
    }
    assert.ok(walked.length > 0, `${demo.id} has nothing the Tab order reaches`);
    assert.deepEqual(
      walked.filter((at) => !at.ring).map((at) => `${at.name}: ${at.outline}`),
      [],
      `${demo.id} has a control the Tab order reaches with no visible ring`
    );

    // --- Every control answers, and every line it writes is a report.
    const controls = await page.locator("button:not(dialog button)").all();
    assert.ok(controls.length > 0, `${demo.id} offers no control`);
    const dead = [];
    const unreported = [];
    for (const control of controls) {
      const name = (await control.getAttribute("id")) ?? (await control.textContent());
      const result = await press(page, control);
      let lines = result.now.lines;
      if (!result.wrote) {
        if (!result.dialog) {
          dead.push(`${name}: wrote nothing and opened nothing`);
        } else {
          // A control that opens a dialog answers when the dialog is closed,
          // which is the one route out every dialog has whatever its buttons
          // are.
          await page.keyboard.press("Escape");
          await page.waitForTimeout(SETTLE_MS);
          const closed = await page.evaluate(READ_LOG);
          lines = closed.lines;
          if (closed.lines.length === 0) {
            dead.push(`${name}: opened a dialog whose close wrote nothing`);
          }
          if (await page.evaluate(() => Boolean(document.querySelector("dialog[open]")))) {
            dead.push(`${name}: opened a dialog that Escape did not close`);
          }
        }
      } else if (result.dialog) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(SETTLE_MS);
        lines = (await page.evaluate(READ_LOG)).lines;
      }
      for (const line of lines) {
        if (line.color !== REPORTED && line.color !== REFUSED) {
          unreported.push(`${name} wrote ${JSON.stringify(line.text)} in ${line.color}`);
        }
      }
    }
    // **The uncaught error is asserted first, and the order is the diagnosis.**
    // A handler that throws instead of reporting leaves the panel empty, so
    // both this and the dead-control assertion below fire on one defect. Read
    // in the other order, rethrowing an AbortError is reported as "a control
    // that does not answer", which sends a reader looking at the control rather
    // than at the `catch` that was taken out from under it.
    assert.deepEqual([consoleErrors, pageErrors], [[], []], `${demo.id} across every control`);
    assert.deepEqual(dead, [], `${demo.id} has a control that does not answer`);
    // Both colours are a report. What this rules out is a line drawn in the
    // body ink, which is a page writing into the panel from somewhere other
    // than its own two reporters.
    assert.deepEqual(unreported, [], `${demo.id} wrote a line in neither the accent nor the amber`);

    // --- A narrow window, read with the panel holding what the pressing pass
    // put there.
    await page.setViewportSize({ width: 320, height: 860 });
    await page.waitForTimeout(SETTLE_MS);
    const fit = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      widest: [...document.querySelectorAll("body *")]
        .map((element) => ({
          name: element.id || element.tagName,
          right: Math.round(element.getBoundingClientRect().right),
        }))
        .sort((a, b) => b.right - a.right)[0],
    }));
    assert.ok(
      fit.scrollWidth <= fit.clientWidth,
      `${demo.id} overflows at 320px: ${fit.scrollWidth} against ${fit.clientWidth}, ` +
        `widest ${fit.widest.name} reaching ${fit.widest.right}`
    );

    await page.close();
  });
}

// **The framed walk: the same demo, reached the way a reader reaches it.** The
// pass above opens `demo/index.html` directly, which is the demo on its own
// terms; the page puts it in a sandboxed `iframe`, which is the demo as it is
// published. Those are two claims, and until 2026.10.28 only the first was
// held - both files in this suite that touch a demo were green on the day the
// **Clipboard and Dialogs** dialog stopped closing in the frame, because
// `sandbox="allow-scripts"` withholds form submission and that dialog closes
// through a `<form method="dialog">`. The whole suite was green with two dead
// buttons in it.
//
// The harness is this file's own one-frame page rather than `index.html`:
// driving the real page is the job of `tools/test-example-selection.mjs`, and
// a harness is what lets the grant be read from the page and applied here. So
// {@link DEMO_SANDBOX} is read out of `index.html` at load - the next time the
// grant changes, these cases change with it rather than holding the demos to a
// token that has gone stale.
//
// One further page load per demo, which is five, against the contention
// measured in the comment above: a demo is loaded twice in this file now, once
// directly and once framed, and the framed pass presses what the direct pass
// presses rather than re-testing the theme, the Tab order or the reflow. The
// frame cannot change any of those three.
for (const demo of demos) {
  test(`${demo.title} answers through the frame the page puts it in`, { skip }, async () => {
    const { page, frame, consoleErrors, pageErrors, navigated } = await openFramed(demo.payload);
    const landed = page.url();
    const controls = await frame.$$("button:not(dialog button)");
    assert.ok(controls.length > 0, `${demo.id} offers no control inside the frame`);
    const dead = [];
    const stuck = [];

    for (const control of controls) {
      const name = (await control.getAttribute("id")) ?? (await control.textContent());
      const result = await press(frame, control);
      if (!result.dialog) {
        if (!result.wrote) dead.push(`${name}: wrote nothing and opened nothing`);
        continue;
      }

      // --- A dialog, which is the half of this the direct pass cannot reach.
      // There Escape is enough, because it is the one route out every dialog
      // has whatever its buttons are; here each button is the thing under
      // test, since closing a dialog from inside itself is a form submission
      // and the sandbox is what decides whether one is allowed.
      const buttons = await frame.evaluate(() =>
        [...document.querySelectorAll("dialog[open] button")].map((button) => ({
          label: button.textContent.trim(),
          value: button.value,
        }))
      );
      if (buttons.length === 0) {
        dead.push(`${name}: opened a dialog offering no button to close it with`);
      }
      for (const [index, button] of buttons.entries()) {
        const was = (await frame.evaluate(READ_LOG)).lines.length;
        // Pressed through the DOM rather than with Playwright's click. A click
        // on a control that changes nothing costs the case a 30 second
        // timeout, and changing nothing is exactly the regression under test -
        // so the assertion that most needs to fail quickly would otherwise
        // have been the slowest in the file.
        await frame.evaluate(
          (at) => document.querySelectorAll("dialog[open] button")[at].click(),
          index
        );
        // `close` is dispatched as a queued task, so the `open` attribute is
        // already gone while the event is still on its way: reading the panel
        // off the attribute alone races the line the handler writes.
        await frame.waitForTimeout(SETTLE_MS);
        const now = await frame.evaluate(() => ({
          open: Boolean(document.querySelector("dialog[open]")),
          returnValue: document.querySelector("dialog").returnValue,
          lines: document.querySelectorAll("#log span").length,
        }));
        if (now.open) {
          stuck.push(`${name} -> ${button.label}: the dialog stayed open`);
          await frame.press("dialog[open]", "Escape");
          await frame.waitForFunction(() => !document.querySelector("dialog[open]")).catch(() => {});
        } else {
          // Held only where the button carries one. A button with no `value`
          // closes a dialog with an empty return value legitimately, and the
          // `open` reading above is what tells that from not closing at all.
          if (button.value && now.returnValue !== button.value) {
            stuck.push(
              `${name} -> ${button.label}: closed with returnValue ` +
                `${JSON.stringify(now.returnValue)} rather than ${JSON.stringify(button.value)}`
            );
          }
          if (now.lines === was) {
            stuck.push(`${name} -> ${button.label}: closed the dialog and wrote nothing`);
          }
        }
        if (index < buttons.length - 1) {
          await control.click();
          await frame.waitForSelector("dialog[open]");
        }
      }
      if (await frame.evaluate(() => Boolean(document.querySelector("dialog[open]")))) {
        await frame.press("dialog[open]", "Escape");
        await frame.waitForFunction(() => !document.querySelector("dialog[open]")).catch(() => {});
      }
    }

    // **Read before the two walks below it, and the order is the diagnosis.**
    // A blocked submission is logged by the engine and leaves the dialog open,
    // so one defect fires this and `stuck`. Read the other way round, the
    // report is "a dialog its own buttons do not close", which sends a reader
    // to the demo - and the demo is right; it is the grant that is short.
    const logged = pageErrors
      .concat(consoleErrors)
      .filter((message) => !/favicon/i.test(message));
    assert.deepEqual(
      logged.filter((message) => !WITHHELD.test(message)),
      [],
      `${demo.id} logged something inside the frame that is not a withheld permission`
    );
    assert.deepEqual(dead, [], `${demo.id} has a control that does not answer through the frame`);
    assert.deepEqual(
      stuck,
      [],
      `${demo.id} has a dialog that does not close on its own buttons through the frame`
    );

    // **The top level, which the grant decides and nothing else was reading.**
    // `allow-forms` buys a submission, and a submission has a target: left to
    // itself a `<form method="dialog">` resolves inside the dialog, but a form
    // aimed at `_top`, or a link carrying the same target, would move the page
    // the reader is on rather than the demo. `allow-top-navigation` is what
    // permits that and is deliberately absent, so nothing a demo does here may
    // navigate the document holding it.
    //
    // `tools/test-example-selection.mjs` pins the grant token itself, which
    // catches the token being added; this catches the behaviour, which is the
    // half a demo could reach by some route the token does not name.
    assert.deepEqual(
      navigated,
      [],
      `${demo.id} navigated the page holding it, which the sandbox withholds`
    );
    assert.equal(page.url(), landed, `${demo.id} moved the address bar of the page holding it`);

    await page.close();
  });
}
