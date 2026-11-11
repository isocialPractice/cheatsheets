// Checks on the output surface: the five formats a composed sheet comes back
// in, and the one module in the folder that writes anything.
//
// The property under test is not that a render produces bytes - every route
// obviously does - but that **a caller never has to reach past the layer to get
// them**. Until 2026.10.31 the way out of this API was
// `composeSheet(doc, options).composition.toSVG()`, which names the drawing
// surface's own method, and `import ... from "./raster.mjs"`, which named a
// module `index.mjs` exported nothing from. Both worked. Neither was the
// published surface, so neither could say what a render was for or what had
// drawn it, which is the same failure `options.language` was on the way in.
//
// So most of what is below is about what the result says: the route that
// answered, the family that drew, whether the render may be shown to a reader,
// and where the bytes went.
//
// Two of the cases are about what is **not** exported, and they matter more than
// they look. The page loads `api/cheatsheet/index.mjs` with a bare `import` and
// no build step, so a module in that file's static graph that reaches a Node
// builtin fails in a browser at load rather than at the call. `files.mjs` reads
// `node:fs` and `raster.mjs` resolves a headless browser; the first is reached
// by path and the second by a dynamic import inside `renderOf`, and the test
// below is what holds that arrangement in place.
//
// Since 2026.11.01 that walk **crosses the folder boundary**, down through the
// vendored drawing surface and its chunks, and the two entries the accent reader
// loads on demand are walked as roots of their own. The page loads all of it
// from this tree with nothing installed, so a builtin or a bare specifier one
// hop past `api/cheatsheet/` fails it exactly as one inside would.
//
// The last section is the other direction through `files.mjs`: a document read
// from a JSON file. `readDocument` is the object half of that model and belongs
// to `tools/test-sheet-models.mjs`; what is here is that JSON is the only
// format, and that a file is refused the way a literal is.
//
// The dependency free cases run everywhere. The browser cases resolve Chromium
// at run time and skip with the install command as their reason, which is the
// pattern `tools/test-sheet-raster.mjs` settled.
//
// Run with: node --test tools/test-sheet-render.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  composeSheet,
  filenameFor,
  fragmentFor,
  renderFragment,
  renderOf,
  renderSVG,
  renderSheet,
  slugFor,
  linkLayerFor,
  linksIn,
  withLinks,
  withoutLinks,
  FRAGMENT_CLASS,
  RASTER_RENDERS,
  RENDER_EXTENSIONS,
  RENDER_FORMATS,
  RENDER_MEDIA_TYPES,
} from "../api/cheatsheet/index.mjs";
import {
  namesDirectory,
  readDocumentFile,
  renderToFile,
  targetFor,
  writeRender,
} from "../api/cheatsheet/files.mjs";
import { resolveChromium } from "../api/cheatsheet/raster.mjs";
import { readBrandAssets } from "./build-manifest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scratch = join(root, ".tmp", "sheet-render-cases");

const { chromium, reason } = await resolveChromium();
const skip = chromium ? false : reason;

after(async () => {
  await rm(scratch, { recursive: true, force: true });
});

/** Whether a path is there at all. */
const exists = (path) =>
  stat(path).then(
    () => true,
    () => false
  );

/** A sheet with enough rows to fill the panel, so nothing under test is a void. */
const DOC = {
  title: "Splicing Array Elements",
  subtitle: "Splice Array",
  code: Array.from({ length: 20 }, (_, i) => ({
    text: `console.log(fruits.splice(${i}, 1));`,
    role: i % 4 === 3 ? "comment" : "plain",
  })),
};

const SEED = "splicing-arrays";

/** The opening `<svg>` tag of some markup. */
const rootTag = (markup) => markup.slice(markup.indexOf("<svg"), markup.indexOf(">", markup.indexOf("<svg")) + 1);

// --- The canonical output ---------------------------------------------------

test("renderSVG is the composition's own markup with its links, which is what canonical means", () => {
  // Byte for byte rather than equivalent. An SVG that went through this surface
  // and one taken off the composition by hand have to be the same file, or the
  // published route is a second renderer wearing the name of the first. Since
  // 2026.11.10 the one thing added is the link group, which the composition
  // cannot hold; take it off and what is left is `toSVG()` exactly.
  const { composition, variation } = composeSheet(DOC, { seed: SEED });
  const byHand = composition.toSVG();
  const rendered = renderSVG(DOC, { seed: SEED });
  assert.equal(rendered, withLinks(byHand, variation.links));
  assert.equal(withoutLinks(rendered), byHand);
  assert.match(rendered, /<g data-name="links">/);
});

test("and renderSheet with no format named is that same SVG, as bytes and as text", async () => {
  const render = await renderSheet(DOC, { seed: SEED });
  assert.equal(render.format, "svg");
  assert.equal(render.mediaType, "image/svg+xml");
  assert.equal(render.extension, "svg");
  assert.equal(render.text, renderSVG(DOC, { seed: SEED }));
  assert.equal(new TextDecoder().decode(render.data), render.text);
  assert.equal(render.bytes, render.data.byteLength);
});

test("markup is composed by nothing, so it reports the composition as its route", async () => {
  const render = await renderSheet(DOC, { seed: SEED });
  assert.equal(render.route, "composition");
  assert.equal(render.scale, null);
  assert.equal(render.pixels, null);
  // The composition's own size is still reported, in the unit the markup is
  // written in. Two fields rather than one, because device pixels and
  // composition pixels are two units and a field whose unit moves with the
  // format is a field nobody can read.
  assert.deepEqual(render.size, { width: 3600, height: 3600 });
});

test("and it is publishable, because it is the sheet in the face the page draws", async () => {
  const render = await renderSheet(DOC, { seed: SEED });
  assert.equal(render.publishable, true);
  // What the markup cannot say is which of the families it names actually drew,
  // because that is the reader's machine and not the file. A null `resolved` is
  // that answer rather than a gap in it.
  assert.deepEqual(render.family.resolved, null);
  assert.ok(render.family.requested.length > 0, "the render names no font stack at all");
  assert.match(render.family.how, /resolved by whatever opens it/);
});

test("the variation comes back with it, so a caller sees what the composition gave way on", async () => {
  const render = await renderSheet(DOC, { seed: SEED });
  assert.equal(render.variation.seed, composeSheet(DOC, { seed: SEED }).variation.seed);
  assert.ok(Array.isArray(render.notes));
  assert.equal(render.title, "Splicing Array Elements");
});

// --- The HTML fragment ------------------------------------------------------

test("a fragment drops the XML declaration, which is the one thing the page gets away without", () => {
  // The page parses its markup as `image/svg+xml` and imports the element, so
  // it never meets the prolog as HTML. A fragment set as HTML does, and a
  // browser parsing HTML has nowhere to put one.
  const markup = renderSVG(DOC, { seed: SEED });
  assert.ok(markup.startsWith("<?xml"), "the composition no longer writes a declaration to drop");
  assert.ok(!fragmentFor(markup).includes("<?xml"));
});

test("and drops the size attributes while keeping the viewBox, so the sheet scales", () => {
  const tag = rootTag(fragmentFor(renderSVG(DOC, { seed: SEED })));
  assert.ok(!/\swidth="/.test(tag), tag);
  assert.ok(!/\sheight="/.test(tag), tag);
  // The viewBox is what carries the 3600 square once the attributes are gone.
  // Dropping both without it would leave an element with no intrinsic size at
  // all, which collapses rather than scaling.
  assert.match(tag, /viewBox="0 0 3600 3600"/);
});

test("and carries the two scaling rules inline, so it holds in a page with no stylesheet", () => {
  // They are `div.col div.sheet > svg` in `index.html`. A fragment is embedded
  // in a document whose CSS this repository does not write, so the rules travel
  // with it.
  const tag = rootTag(fragmentFor(renderSVG(DOC, { seed: SEED })));
  assert.match(tag, /style="display:block;width:100%;height:auto"/);
});

test("a style already on the root is kept, with the scaling rules in front of it", () => {
  // In front rather than over, so the caller's own declarations are the later
  // ones and win. Last one wins is the whole of the CSS rule being relied on.
  const tag = rootTag(fragmentFor('<svg viewBox="0 0 10 10" style="outline:1px solid red"></svg>'));
  assert.match(tag, /style="display:block;width:100%;height:auto;outline:1px solid red"/);
});

test("the wrapper names the image rather than asking a reader to read the picture", () => {
  // A cheatsheet is a picture of text. The page already does this to its own
  // box; the fragment carries it so an embedder does not have to know to. A
  // sheet that links out holds the picture and its links side by side, because
  // a link inside an image has no name a screen reader can give it.
  const fragment = renderFragment(DOC, { seed: SEED });
  assert.match(fragment, new RegExp(`^<div class="${FRAGMENT_CLASS}" style="position:relative">\\n<div role="img" aria-label="`));
  assert.match(fragment, /<div role="img" aria-label="Splicing Array Elements cheat sheet">/);
  assert.ok(fragment.trimEnd().endsWith("</div>"));
});

test("and a sheet with no links is the one box it always was", () => {
  const fragment = fragmentFor('<svg viewBox="0 0 10 10"><title>Plain</title></svg>');
  assert.match(fragment, new RegExp(`^<div class="${FRAGMENT_CLASS}" role="img" aria-label="Plain cheat sheet">`));
  assert.ok(!fragment.includes("<nav"));
});

test("and the class and the label are the caller's to change", () => {
  const fragment = renderFragment(DOC, { seed: SEED, className: "demo-sheet", label: "A demo" });
  assert.match(fragment, /^<div class="demo-sheet" style="position:relative">/);
  assert.match(fragment, /<div role="img" aria-label="A demo">/);
});

test("a label with markup in it is escaped, because it lands in an attribute", () => {
  const fragment = fragmentFor('<svg viewBox="0 0 10 10"></svg>', { label: 'a "quoted" <tag> & more' });
  assert.match(fragment, /aria-label="a &quot;quoted&quot; &lt;tag&gt; &amp; more"/);
});

test("and an entity the composition already escaped is not escaped a second time", () => {
  // `&amp;` in a composed title would come back `&amp;amp;` and read literally,
  // which is the failure a blanket ampersand replacement makes.
  const fragment = fragmentFor('<svg viewBox="0 0 10 10"><title>Rock &amp; Roll</title></svg>');
  assert.match(fragment, /aria-label="Rock &amp; Roll cheat sheet"/);
});

test("`wrap: false` gives the element alone, which is what a page with its own box wants", () => {
  const bare = fragmentFor(renderSVG(DOC, { seed: SEED }), { wrap: false });
  assert.ok(bare.startsWith("<svg"), bare.slice(0, 40));
  assert.ok(!bare.includes("<div"));
  // And it is still the embeddable form: the declaration and the attributes are
  // gone whether or not there is a wrapper.
  assert.ok(!bare.includes("<?xml"));
  assert.ok(!/\swidth="/.test(rootTag(bare)));
});

test("the fragment is a wrapper around the canonical markup and not a second renderer", () => {
  // Everything between the root tag and the close is the composition's own
  // output, unchanged. The whole claim of the item this closes.
  const markup = renderSVG(DOC, { seed: SEED });
  const bare = fragmentFor(markup, { wrap: false });
  const body = (text) => text.slice(text.indexOf(">", text.indexOf("<svg")) + 1);
  assert.equal(body(bare), body(markup).trimEnd());
});

test("markup that is not a composed sheet is refused rather than wrapped", () => {
  for (const given of ["", "   ", null, 42, "<html><body>not a sheet</body></html>"]) {
    assert.throws(() => fragmentFor(given), /cheatsheet:/, `${JSON.stringify(given)} was accepted`);
  }
});

test("the page reads the fragment from this surface rather than stripping attributes itself", () => {
  // The anti drift half of the item. The behaviour was written out by hand in
  // the page, which is what made it worth publishing; a page that kept its own
  // copy would drift from the published one invisibly, both working.
  const page = readFileSync(join(root, "index.html"), "utf8");
  // The picture without its links, which the page lays beside it through the
  // same surface rather than writing a layer of its own.
  assert.match(page, /fragmentFor\(picture, \{ wrap: false \}\)/);
  assert.match(page, /const picture = withoutLinks\(markup\)/);
  assert.match(page, /linkLayerFor\(markup\)/);
  assert.ok(
    !page.includes('removeAttribute("width")'),
    "the page still takes the size attributes off by hand"
  );
});

// --- Where a sheet links out -------------------------------------------------

const brand = await readBrandAssets(root);

/** The `<a>` elements of a markup's link group, read back the way a writer reads them. */
const anchorsIn = (markup) =>
  [.../<g data-name="links">([\s\S]*?)<\/g>/.exec(markup)?.[1].matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g) ?? []].map(
    ([, attributes, inner]) => ({
      href: /href="([^"]*)"/.exec(attributes)[1],
      title: /<title>([^<]*)<\/title>/.exec(inner)?.[1],
      rects: (inner.match(/<rect /g) ?? []).length,
      attributes,
    })
  );

const TARGETS = {
  practicing: "https://practicing.xyz",
  mastodon: "https://mastodon.social/@isocialPractice",
  instagram: "https://www.instagram.com/isocialpractice/",
  x: "https://x.com/isocialpractice",
};

test("a sheet with the footer strip links its mark and its three icons", () => {
  const markup = renderSVG(DOC, { seed: SEED, brand });
  const anchors = anchorsIn(markup);
  assert.deepEqual(
    anchors.map((one) => one.href),
    [TARGETS.practicing, TARGETS.mastodon, TARGETS.instagram, TARGETS.x]
  );
  for (const one of anchors) {
    assert.equal(one.rects, 1, `${one.href} has ${one.rects} areas`);
    assert.ok(one.title, `${one.href} has no name`);
    // A new tab, and nothing of the page it was opened from handed over.
    assert.match(one.attributes, /target="_blank"/);
    assert.match(one.attributes, /rel="noopener noreferrer"/);
  }
  assert.doesNotMatch(markup, /github\.com/, "the footer stopped naming GitHub and the markup still links it");
  // The group is the last thing drawn, so nothing composed sits over a link.
  assert.match(markup, /<\/g>\n<\/svg>\n$/);
});

test("the drawn footer is one link to the site, over the mark square and the follow line", () => {
  // Two areas that go to the same place are one link, so a keyboard meets the
  // site once rather than twice in a row.
  const anchors = anchorsIn(renderSVG(DOC, { seed: SEED }));
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].href, TARGETS.practicing);
  assert.equal(anchors[0].rects, 2);
  // A document's own follow line is its own words, and gets no link.
  const own = anchorsIn(renderSVG({ ...DOC, followLine: "Read the rest elsewhere" }, { seed: SEED }));
  assert.equal(own.length, 1);
  assert.equal(own[0].rects, 1, "a follow line the document wrote was linked to the site");
});

test("the links paint nothing, so a linked sheet looks the one composed", () => {
  const markup = renderSVG(DOC, { seed: SEED, brand });
  const group = /<g data-name="links">[\s\S]*?<\/g>/.exec(markup)[0];
  for (const rect of group.match(/<rect [^>]*\/>/g)) {
    assert.match(rect, /fill="none"/);
    assert.match(rect, /pointer-events="all"/);
    assert.doesNotMatch(rect, /stroke=/);
  }
});

test("a fragment lifts the links out of the picture into a named layer beside it", () => {
  const fragment = renderFragment(DOC, { seed: SEED, brand });
  const picture = /<div role="img"[^>]*>([\s\S]*?)<\/div>/.exec(fragment)[1];
  assert.doesNotMatch(picture, /<a\s/, "a link was left inside the image, where it has no name");
  assert.doesNotMatch(picture, /data-name="links"/);
  const nav = /<nav class="cheatsheet-links" aria-label="Follow practicing\.xyz"[^>]*>([\s\S]*?)<\/nav>/.exec(fragment);
  assert.ok(nav, "the fragment has no link layer");
  const anchors = [...nav[1].matchAll(/<a\s([^>]*)><\/a>/g)].map(([, attributes]) => attributes);
  assert.deepEqual(
    anchors.map((one) => /href="([^"]*)"/.exec(one)[1]),
    [TARGETS.practicing, TARGETS.mastodon, TARGETS.instagram, TARGETS.x]
  );
  for (const one of anchors) {
    assert.match(one, /aria-label="[^"]+"/);
    assert.match(one, /style="position:absolute;display:block;pointer-events:auto;left:[\d.]+%;top:[\d.]+%;width:[\d.]+%;height:[\d.]+%"/);
  }
});

test("and a destination with two areas is one stop for a keyboard and a reader", () => {
  const fragment = renderFragment(DOC, { seed: SEED });
  const anchors = [...fragment.matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/g)][0][1].match(/<a\s[^>]*><\/a>/g);
  assert.equal(anchors.length, 2);
  assert.match(anchors[0], /aria-label="practicing\.xyz"/);
  assert.doesNotMatch(anchors[0], /tabindex|aria-hidden/);
  assert.match(anchors[1], /aria-hidden="true" tabindex="-1"/);
  assert.doesNotMatch(anchors[1], /aria-label/);
});

test("writing the links twice is writing them once, and none is no group", () => {
  const { composition, variation } = composeSheet(DOC, { seed: SEED, brand });
  const raw = composition.toSVG();
  const once = withLinks(raw, variation.links);
  assert.equal(withLinks(once, variation.links), once);
  assert.equal(withoutLinks(once), raw);
  assert.equal(withLinks(raw, []), raw);
  assert.deepEqual(
    linksIn(once).map((one) => [one.href, one.areas.length]),
    [[TARGETS.practicing, 1], [TARGETS.mastodon, 1], [TARGETS.instagram, 1], [TARGETS.x, 1]]
  );
});

test("an href and a label are escaped once on the way in, and not again on the way out", () => {
  const markup = withLinks('<svg viewBox="0 0 100 100"><title>T</title></svg>', [
    { name: "a", href: "https://example.com/?a=1&b=2", label: 'Say "hi" <now>', x: 10, y: 20, width: 30, height: 40 },
  ]);
  assert.match(markup, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(markup, /<title>Say &quot;hi&quot; &lt;now&gt;<\/title>/);
  const layer = linkLayerFor(markup);
  assert.match(layer, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(layer, /aria-label="Say &quot;hi&quot; &lt;now&gt;"/);
  assert.match(layer, /left:10%;top:20%;width:30%;height:40%/);
  // And the picture's own name is its title, not the link's.
  assert.match(fragmentFor(markup), /aria-label="T cheat sheet"/);
});

// --- Every render comes back as data ----------------------------------------

test("every format returns its bytes, which is what lets a caller embed without a path", async () => {
  const cases = [{ format: "svg" }, { format: "html" }, { format: "png", route: "builtin", scale: 0.05 }];
  for (const options of cases) {
    const render = await renderSheet(DOC, { seed: SEED, ...options });
    assert.ok(render.data instanceof Uint8Array, `${options.format} did not come back as bytes`);
    assert.ok(render.data.byteLength > 0, `${options.format} came back empty`);
    assert.equal(render.bytes, render.data.byteLength, options.format);
    assert.equal(render.mediaType, RENDER_MEDIA_TYPES[options.format]);
  }
});

test("a raster has no text form, and markup does", async () => {
  // `text` is the string where there is one and null where there is not, rather
  // than a decode of arbitrary bytes. A JPEG decoded as UTF-8 is not a string
  // anybody wants.
  assert.equal(typeof (await renderSheet(DOC, { seed: SEED })).text, "string");
  const png = await renderSheet(DOC, { seed: SEED, format: "png", route: "builtin", scale: 0.05 });
  assert.equal(png.text, null);
});

/**
 * The static import graph of one or more entry files, as repository relative
 * POSIX paths, with anything in it that a browser cannot take.
 *
 * **It crosses folder boundaries**, which is the half that was missing until
 * 2026.11.01: the walk resolved `./` specifiers inside `api/cheatsheet/` and
 * stopped there, so a `node:fs` reached one hop further - through the vendored
 * drawing surface the page draws by - would have passed it. A specifier is now
 * resolved against the directory of the file that wrote it, the way the runtime
 * resolves one.
 *
 * Two things it reports rather than asserts, because the two failures are
 * different:
 *
 * | Reported | What it would mean |
 * | --- | --- |
 * | `builtins` | A page fails at load: there is no `node:fs` in a browser |
 * | `bare` | A page fails at load for a second reason: a bare specifier needs an install or an import map |
 *
 * A dynamic `import("y")` is deliberately not matched. That is the form
 * `renderOf` reaches `raster.mjs` by and `prepareAccents` reaches the accent
 * reader by, and keeping it out of this walk is the whole point of reaching
 * them that way. The two entries that *are* reached dynamically are walked as
 * their own roots below.
 *
 * @param {string[]} entries Repository relative paths.
 * @returns {{ seen: string[], builtins: string[], bare: string[] }}
 */
function staticGraph(entries) {
  const seen = new Set();
  const builtins = [];
  const bare = [];
  const queue = entries.map((entry) => resolve(root, entry));
  while (queue.length > 0) {
    const file = queue.pop();
    const name = relative(root, file).split(sep).join("/");
    if (seen.has(name)) continue;
    seen.add(name);
    const source = readFileSync(file, "utf8");
    for (const [, specifier] of source.matchAll(
      // `import x from "y"`, `export x from "y"` and a bare `import "y"`, in
      // both of the shapes this tree is written in. `\bfrom` rather than
      // `\sfrom`, because the vendored files are a minified build: they write
      // `import{a as b}from"../chunks/x.js";import{...}from"..."`, with no
      // space in front of `from` and a `;` where a hand written file has a
      // newline. The boundary set is start of file, newline or `;` and nothing
      // else, which is what keeps a line comment out - every fake import in
      // this tree is in a `//` or ` * ` documentation block, and neither of
      // those characters is whitespace after a newline.
      /(?:^|[\n;])\s*(?:import|export)\s*(?:[^;'"]*?\bfrom\s*)?["']([^"']+)["']/g
    )) {
      if (specifier.startsWith("node:")) {
        builtins.push(`${name} -> ${specifier}`);
        continue;
      }
      if (specifier.startsWith(".")) {
        queue.push(resolve(dirname(file), specifier));
        continue;
      }
      bare.push(`${name} -> ${specifier}`);
    }
  }
  return { seen: [...seen].sort(), builtins, bare };
}

test("the public surface reaches no Node builtin, which is what the page's bare import needs", async () => {
  // The invariant the whole arrangement rests on. `files.mjs` reads `node:fs`
  // and `raster.mjs` resolves Playwright, so a static import of either from
  // anything in this graph would fail a page at load rather than at the call.
  const { seen, builtins, bare } = staticGraph(["api/cheatsheet/index.mjs"]);
  assert.deepEqual(builtins, [], "the published surface statically imports a Node builtin");
  // Nothing to install, which is the other half of "no build step and no
  // install between": a bare specifier is a name only a package manager or an
  // import map can answer, and the page has neither.
  assert.deepEqual(bare, [], "the published surface statically imports a package by bare name");
  // And the two that do reach a builtin are genuinely outside that graph rather
  // than merely unreached by this walk.
  assert.ok(seen.includes("api/cheatsheet/render.mjs"), "the walk never reached the output surface");
  // And the browser entry point, which is the half of the surface this
  // invariant was always *for*: a module a page imports to build its own
  // cheatsheet section is the module a Node builtin would break loudest.
  assert.ok(seen.includes("api/cheatsheet/site.mjs"), "the walk never reached the browser entry point");
  assert.ok(!seen.includes("api/cheatsheet/files.mjs"), "files.mjs is in the static graph of index.mjs");
  assert.ok(!seen.includes("api/cheatsheet/raster.mjs"), "raster.mjs is in the static graph of index.mjs");
  // Which is only interesting because they are reachable at all.
  const surface = await import("../api/cheatsheet/index.mjs");
  assert.equal(typeof surface.renderSheet, "function");
});

test("and the walk crosses into the vendored surface, which is where it used to stop", () => {
  // The hop this case exists for. `compose.mjs` imports the drawing surface by
  // relative path and the surface imports its own chunks the same way, so the
  // page loads all of it from this tree - and a builtin anywhere down there
  // fails the page exactly as one in this folder would. The walk followed only
  // `./` inside `api/cheatsheet/` until 2026.11.01, so the assertion above was
  // true of thirteen files and silent about the rest.
  const { seen } = staticGraph(["api/cheatsheet/index.mjs"]);
  assert.ok(
    seen.includes("api/napkin-sketch/graphic-design/index.js"),
    `the walk never left api/cheatsheet/:\n${seen.join("\n")}`
  );
  const chunks = seen.filter((name) => name.startsWith("api/napkin-sketch/chunks/"));
  assert.ok(chunks.length > 0, "the walk reached the surface entry and none of the chunks behind it");
  // The surface's own writer is the file on the other side of the same split
  // this folder makes, and it is reached by path the way `files.mjs` is.
  assert.ok(
    !seen.includes("api/napkin-sketch/graphic-design/files.js"),
    "the surface's own writer is in the page's graph"
  );
});

test("the accent reader is loaded on demand, and a browser can take that too", () => {
  // The two entries `accents.mjs` imports dynamically. They are outside the
  // static graph on purpose - 328.0 KB and 269.1 KB gzipped against 49.5 KB for
  // the composition entry - but the page does load them, with the first
  // `sheet.json` rather than in front of it, so the same two claims have to
  // hold of them: no builtin, and nothing to install.
  const entries = ["api/napkin-sketch/markdown/index.js", "api/napkin-sketch/api/index.js"];
  for (const entry of entries) {
    const { seen } = staticGraph(["api/cheatsheet/index.mjs"]);
    assert.ok(!seen.includes(entry), `${entry} is in the page's first module graph`);
  }
  const { seen, builtins, bare } = staticGraph(entries);
  assert.deepEqual(builtins, [], "the accent reader statically imports a Node builtin");
  assert.deepEqual(bare, [], "the accent reader statically imports a package by bare name");
  // Named in `accents.mjs` by the same two paths, so the entries walked here
  // are the entries that are actually loaded.
  const source = readFileSync(join(root, "api", "cheatsheet", "accents.mjs"), "utf8");
  for (const entry of entries) {
    assert.ok(seen.includes(entry), `${entry} was not reached`);
    assert.ok(source.includes(entry.replace("api/napkin-sketch/", "../napkin-sketch/")), entry);
  }
});

// --- The route is taken from the call, and named on the result ---------------

test("the built-in route answers everywhere and says it may not be published", async () => {
  const render = await renderSheet(DOC, { seed: SEED, format: "png", route: "builtin", scale: 0.05 });
  assert.equal(render.route, "builtin");
  assert.equal(render.requestedRoute, "builtin");
  assert.equal(render.publishable, false);
  assert.equal(render.family.resolved, null);
  assert.ok(
    render.notes.some((note) => note.includes("single stroke alphabet")),
    `the notes were ${JSON.stringify(render.notes)}`
  );
  // Device pixels this time, off the scale that was asked for.
  assert.deepEqual(render.pixels, { width: 180, height: 180 });
  assert.equal(render.scale, 0.05);
});

test("the browser route draws the real face and says which family it got", { skip }, async () => {
  const render = await renderSheet(DOC, { seed: SEED, format: "webp", route: "browser", scale: 0.4 });
  assert.equal(render.route, "browser");
  assert.equal(render.publishable, true);
  assert.ok(render.family.resolved, "the browser route named no family");
  assert.ok(
    render.family.requested.includes(render.family.resolved),
    `${render.family.resolved} is not one of ${JSON.stringify(render.family.requested)}`
  );
  assert.match(render.family.how, /measured/);
});

test("a route named for markup is a note rather than an error, because it means nothing", async () => {
  // `format: "svg", route: "browser"` is a reasonable thing to write: the markup
  // is the composition's own, whoever would have drawn it.
  const render = await renderSheet(DOC, { seed: SEED, route: "browser" });
  assert.equal(render.route, "composition");
  assert.ok(
    render.notes.some((note) => note.includes("has no effect on SVG")),
    `the notes were ${JSON.stringify(render.notes)}`
  );
});

test("and so is a scale, for the same reason", async () => {
  const render = await renderSheet(DOC, { seed: SEED, format: "html", scale: 2 });
  assert.ok(
    render.notes.some((note) => note.includes("no pixels to apply it to")),
    `the notes were ${JSON.stringify(render.notes)}`
  );
});

test("a format with no consumer here is refused, not substituted", async () => {
  // A caller who writes `sheet.gif` and receives a PNG has a file that lies
  // about itself.
  for (const format of ["gif", "tiff", "constructor", "__proto__"]) {
    await assert.rejects(
      () => renderSheet(DOC, { seed: SEED, format }),
      /is not a format this surface renders/,
      format
    );
  }
  assert.deepEqual(RENDER_FORMATS, ["svg", "html", "png", "jpeg", "webp"]);
  assert.deepEqual(RASTER_RENDERS, ["png", "jpeg", "webp"]);
});

test("an option this surface does not take is named back rather than ignored", async () => {
  // Ignored is the failure that cannot be seen: a caller who wrote `scal: 0.4`
  // and silently got the full 3600 square has a render nothing reports as wrong.
  await assert.rejects(() => renderSheet(DOC, { scal: 0.4 }), /`options\.scal` is not an option/);
  await assert.rejects(() => renderSheet(DOC, { renderer: "browser" }), /`options\.renderer` is not/);
  assert.throws(() => renderSVG(DOC, { format: "png" }), /renderSVG renders SVG/);
  assert.throws(() => renderSVG(DOC, { scale: 2 }), /has no meaning for SVG/);
  assert.throws(() => renderFragment(DOC, { format: "png" }), /renderFragment renders HTML/);
  // A fragment is markup too, so the raster options are as meaningless to it as
  // they are to SVG - and it is the door with no notes to carry them on, since
  // it hands back a string. It took them and dropped them until 2026.10.31,
  // which is the one failure `splitOptions` exists to prevent: `scale` ignored
  // reads as a fragment at the size that was asked for and is not one.
  for (const option of [{ scale: 2 }, { quality: 10 }, { background: "red" }, { route: "browser" }]) {
    assert.throws(
      () => renderFragment(DOC, { seed: SEED, ...option }),
      /has no meaning for a fragment/,
      Object.keys(option)[0]
    );
  }
  // And the three a fragment does take still pass through it.
  assert.ok(renderFragment(DOC, { seed: SEED, wrap: false, className: "c", label: "l" }).startsWith("<svg"));
});

test("renderOf takes the pair composeSheet returns, and says so when it is handed less", async () => {
  const composed = composeSheet(DOC, { seed: SEED });
  const render = await renderOf(composed);
  assert.equal(render.text, renderSVG(DOC, { seed: SEED }));
  // A bare composition cannot say what stack it asked for or what it gave way
  // on, so a render made from one would look like a render with nothing to say.
  await assert.rejects(() => renderOf(composed.composition), /composeSheet returns/);
  await assert.rejects(() => renderOf({ composition: composed.composition }), /no variation/);
  // And a compose option has no meaning once the composition exists.
  await assert.rejects(() => renderOf(composed, { seed: "other" }), /composed with rather than rendered with/);
});

// --- Writing it somewhere ---------------------------------------------------

test("a named path is written exactly there", async () => {
  const path = join(scratch, "named", "one.svg");
  const { written } = await renderToFile(DOC, path, { seed: SEED });
  assert.equal(written.path, path);
  assert.equal(written.wrote, true);
  assert.equal(written.derived, false);
  assert.equal(await readFile(path, "utf8"), renderSVG(DOC, { seed: SEED }));
});

test("a directory gets a filename derived from the sheet's own title", async () => {
  const folder = join(scratch, "derived");
  const { written } = await renderToFile(DOC, folder, { seed: SEED });
  assert.equal(written.derived, true);
  assert.equal(written.path, join(folder, "splicing-array-elements.svg"));
  assert.deepEqual(await readdir(folder), ["splicing-array-elements.svg"]);
});

test("and a name given with it wins over the derived one", async () => {
  const folder = join(scratch, "named-in-folder");
  const { written } = await renderToFile(DOC, folder, { seed: SEED, name: "sheet" });
  assert.equal(written.path, join(folder, "sheet.svg"));
  assert.equal(written.derived, false);
});

test("a dot directory is a directory, not a file with a long extension", async () => {
  // `.tmp` ends in `.tmp`, so an extension test that did not strip the leading
  // dots read it as a file and failed the write with `EISDIR`. The rule lives
  // in `files.mjs` now, and `tools/cheatsheet.mjs` reads it from there.
  const render = await renderSheet(DOC, { seed: SEED });
  for (const given of [".tmp", ".tmp/", ".tmp/.staging"]) {
    assert.equal(namesDirectory(given), true, given);
  }
  for (const given of [".tmp/.hidden.webp", "out/one.svg", "sheet.png"]) {
    assert.equal(namesDirectory(given), false, given);
  }
  const where = targetFor(render, ".tmp/.staging", { root, name: "sheet" });
  assert.equal(where.path, join(root, ".tmp", ".staging", "sheet.svg"));
});

test("null writes nothing and hands the bytes back, which is the in-memory case", async () => {
  const before = await readdir(scratch).catch(() => []);
  const render = await renderSheet(DOC, { seed: SEED, format: "html" });
  const written = await writeRender(render, null);
  assert.equal(written.path, null);
  assert.equal(written.wrote, false);
  // The bytes come back on every route, written or not, so a caller that wants
  // the file and the data never reads the file back.
  assert.equal(written.data, render.data);
  assert.equal(written.bytes, render.bytes);
  // And nothing appeared anywhere, which is the half a null path is for.
  assert.deepEqual(await readdir(scratch).catch(() => []), before);
});

test("standard output is a target like any other, named `-`", async () => {
  const render = await renderSheet(DOC, { seed: SEED });
  assert.deepEqual(targetFor(render, "-"), { path: "-", stdout: true, derived: false });
});

test("and a target that is none of the four is refused", async () => {
  const render = await renderSheet(DOC, { seed: SEED });
  assert.throws(() => targetFor(render, "   "), /a render target is a file, a directory/);
  await assert.rejects(() => writeRender({ data: "not bytes" }), /carries its bytes as `data`/);
});

test("a filename is the title slugged, and a title that slugs to nothing is `sheet`", () => {
  // A render's format and title are all a filename is read off, so the pair is
  // written out here rather than produced: the built-in route encodes PNG only,
  // and asking the browser route for a WebP to read a string off it would make
  // this case skip on a bare clone for no reason.
  const render = { format: "webp", title: DOC.title };
  assert.equal(filenameFor(render, undefined), "splicing-array-elements.webp");
  assert.equal(filenameFor(render, "sheet"), "sheet.webp");
  assert.equal(slugFor("Splicing Array Elements"), "splicing-array-elements");
  assert.equal(slugFor("  ---  "), "sheet");
  assert.equal(slugFor(null), "sheet");
  assert.equal(slugFor("Rock & Roll: Vol. 2"), "rock-roll-vol-2");
  assert.throws(() => filenameFor({ format: "gif" }), /a format this surface writes/);
  // `RENDER_EXTENSIONS` is an object literal, so a truth test on the lookup let
  // every name on `Object.prototype` through: `format: "constructor"` named a
  // file `splicing-array-elements.function Object() { [native code] }` and the
  // error above was never thrown. The same guard `formatNamed` has, here too.
  for (const format of ["constructor", "toString", "valueOf", "__proto__", undefined, 7]) {
    assert.throws(
      () => filenameFor({ format, title: DOC.title }),
      /a format this surface writes/,
      JSON.stringify(format)
    );
  }
});

test("the extension a format is written under is the one the social recipe watches", () => {
  // The one place the format's name and the file's name differ: `jpeg` names the
  // codec, and `**/*.{jpg,webp}` matches the file.
  assert.equal(RENDER_EXTENSIONS.jpeg, "jpg");
  for (const format of RENDER_FORMATS) {
    assert.equal(typeof RENDER_EXTENSIONS[format], "string", format);
  }
});

test("a write creates the folder it is given, including one that is not there yet", async () => {
  const path = join(scratch, "deep", "deeper", "still", "one.svg");
  const { written } = await renderToFile(DOC, path, { seed: SEED });
  assert.equal(written.path, path);
  assert.ok((await readFile(path, "utf8")).startsWith("<?xml"));
  assert.ok(path.split(sep).includes("still"));
});

// --- Reading a document, which is the other direction through the same door --
//
// `readDocument` in `document.mjs` is the object half of the input model and is
// held by `tools/test-sheet-models.mjs`. What is below is only the file half:
// that JSON is the one format, that a path which is not one is refused by name
// rather than by `JSON.parse`, and that a document off disk is refused exactly
// as a literal is - by field path, through the same reader.

/** Writes a document into the scratch folder and gives back its path. */
async function documentFile(name, document) {
  const path = join(scratch, name);
  await mkdir(scratch, { recursive: true });
  await writeFile(path, JSON.stringify(document), "utf8");
  return path;
}

test("a document is read from JSON and reports which of the two shapes held it", async () => {
  const compact = await readDocumentFile(await documentFile("compact.json", DOC));
  assert.equal(compact.shape, "compact");
  // Nothing in the reader coerces, fills a default or reorders a section, which
  // is what `readDocument` promises and this route has to keep - so what comes
  // back deep equals the document that was written out, field for field.
  assert.deepEqual(compact.document, DOC);

  const formal = {
    title: "Array Methods",
    sections: [{ title: "Removing", entries: [{ term: "splice", signature: "splice(start, count)" }] }],
  };
  const read = await readDocumentFile(await documentFile("formal.json", formal));
  assert.equal(read.shape, "formal");
  assert.deepEqual(read.document, formal);
  // And the shape the reader reports is the shape the surface then renders, so
  // the two cannot disagree about what was in the file.
  assert.equal(renderSVG(read.document, { seed: SEED }).includes("Array Methods"), true);
});

test("the path it was read from comes back resolved, and a relative one needs a root", async () => {
  const path = await documentFile("rooted.json", DOC);
  const read = await readDocumentFile(path);
  assert.equal(read.path, path);
  // The same `root` option `targetFor` takes, so a caller holding a repository
  // relative path has one answer for both directions.
  const fromRoot = relative(root, path).split(sep).join("/");
  assert.equal((await readDocumentFile(fromRoot, { root })).path, path);
});

test("JSON is the only input format, and another one is refused by name", async () => {
  // `JSON.parse` on a YAML file reports a syntax error at character 1, which
  // says the file is broken when what is true is that it is a file this reader
  // was never going to open.
  for (const [name, reason] of [
    ["doc.yaml", /YAML needs a parser/],
    ["doc.yml", /YAML needs a parser/],
    ["doc.toml", /TOML needs a parser/],
    ["doc.json5", /comments and trailing commas/],
    ["doc.md", /prose rather than a document model/],
    ["doc.mjs", /import it and hand it to `readDocument`/],
  ]) {
    await assert.rejects(() => readDocumentFile(name, { root: scratch }), reason, name);
    await assert.rejects(
      () => readDocumentFile(name, { root: scratch }),
      /from JSON and from a plain object, and from nothing else/,
      name
    );
  }
  // Refused before the disk is touched, so a format this reader does not take
  // says so whether the file is there or not.
  assert.equal(await exists(join(scratch, "doc.yaml")), false);
});

test("a folder is refused rather than resolved to a document inside it", async () => {
  // Which file in a folder is the document is a catalog convention, and
  // `## Implement Cheatsheet API` holds that nothing in this layer may assume
  // this repository's folder layout. `tools/cheatsheet.mjs --generate` is where
  // that convention lives.
  await mkdir(join(scratch, "folder"), { recursive: true });
  await assert.rejects(
    () => readDocumentFile(join(scratch, "folder")),
    (error) => {
      assert.match(error.message, /is a folder/);
      assert.match(error.message, /sheet\.json/);
      assert.match(error.message, /--generate/);
      return true;
    }
  );
});

test("and a bad document off disk is refused by field path, the way a literal is", async () => {
  const path = await documentFile("broken.json", { subtitle: "no title at all", code: [] });
  await assert.rejects(() => readDocumentFile(path), /document\.title: must be a string, and is absent/);

  // Three failures that have to read differently, because each sends a reader
  // somewhere else: a path nobody typed right, a file that is not JSON, and a
  // document that is JSON and is not a sheet.
  await assert.rejects(() => readDocumentFile(join(scratch, "no-such.json")), /could not be read/);
  await writeFile(join(scratch, "truncated.json"), '{"title": "Half', "utf8");
  await assert.rejects(() => readDocumentFile(join(scratch, "truncated.json")), /is not valid JSON/);
  await assert.rejects(() => readDocumentFile(""), /a document is read from a path to a JSON file/);
});
