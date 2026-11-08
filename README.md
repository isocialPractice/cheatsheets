# Cheat Sheet Practical Use Example Output

`Ctrl + click` to view [cheatsheets documentation](https://isocialpractice.github.io/cheatsheets/docs/index.html)

[Preview Cheat Sheet Examples](https://isocialpractice.github.io/cheatsheets/index.html)
\- *opens in the current tab*.

A cheatsheet here is composed rather than screenshotted. The page reads a
catalog, composes the sheet you pick in the browser and runs the example behind
it; a command line composes the same sheet to a file; and a third tool reads a
whole other site and writes cheatsheets out of it. Nothing has to be installed
for any of that.

- [QUICKSTART.md](QUICKSTART.md) - a sheet on screen now.
- [CHEATSHEET.md](CHEATSHEET.md) - the commands, flags and model shapes, dense.
- [The documentation site](https://isocialpractice.github.io/cheatsheets/docs/index.html) -
  all of it, a page per section below.

## [Two Ways to View the Examples](https://isocialpractice.github.io/cheatsheets/docs/viewing-the-examples.html)

They are for two different readers, so they are listed as two routes rather
than as one with a caveat attached. The published site is for reading the
examples; a local server is for working on the page that draws them. Nobody
needs both.

1. **The published site.** Follow the link under the title, pick a cheatsheet
   from the first dropdown and an example from the second. The address bar
   follows the selection, so a cheatsheet can be linked to directly, as in
   `index.html#javascript/arrays/splicing-arrays`.
2. **A local server.** For anyone changing the page, the catalog or a sheet.
   Clone the repository, serve the root, and open the address it prints:

```bash
php -S localhost:8000
```

A server is required rather than convenient: the page reads its catalog with
`fetch` and imports the drawing surface as a module, and a browser refuses both
to a `file://` document. Opening `index.html` straight from disk does not give
a degraded view of the page, it gives a blank one.

## [Source for Examples](https://isocialpractice.github.io/cheatsheets/docs/viewing-the-examples.html)

The examples used are based on examples from:
1. Javascript Arrays:
     - w3schools - [JS Array Methods](https://www.w3schools.com/js/js_array_methods.asp)
     - MDN Web Docs - [Sorting Arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)

## [Drawing a Sheet](https://isocialpractice.github.io/cheatsheets/docs/drawing-a-sheet.html)

`api/napkin-sketch/` is the drawing surface, and `api/cheatsheet/` is the layer
that knows what a sheet is, drawn to [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md).
Nothing has to be installed: the browser imports both by relative path with no
build step, and `php -S localhost:8000` is still the whole local workflow.
Worked examples are in [examples/](examples/README.md).

The code panel is coloured token by token, from the language a sheet names. A
category gets a design language of its own, recorded at the root as
`DESIGN_LANGUAGE-<category>.md` - the first is
[DESIGN_LANGUAGE-html-css.md](DESIGN_LANGUAGE-html-css.md).

## [The Three Models](https://isocialpractice.github.io/cheatsheets/docs/three-models.html)

A caller describes a cheatsheet in three objects, each with a schema of its
own: a **document** of a title and ordered sections; a **theme** of palette
roles, a type stack and scale, the spacing step, the curve and shape tokens and
the stroke weights; and a **layout** of a named composition, the grid it sits
on, and the slots a section may occupy. The document says nothing about how any
of it is drawn, which is what lets one document be set to two layouts.

The three are the whole public input surface, alongside a seed and the two
brand assets. The theme and the layout are both derived from
[DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md) rather than written out again, and a
theme may be partial: pass one and only what it carries moves.

`renderSVG` is the canonical output and every other format is derived from it:

```js
const render = await renderSheet(doc, { format: "webp", route: "browser" });
render.data        // the bytes, on every format
render.route       // which renderer answered
render.publishable // whether it draws the face the design language measured
```

Every render comes back as data, so a sheet is embedded without a path being
named. Each of the five formats has a worked example of its own in
[examples/render-formats.mjs](examples/render-formats.mjs).

## [The Catalog](https://isocialpractice.github.io/cheatsheets/docs/catalog.html)

Every cheatsheet is a folder holding a `sheet.json`, at `<category>/<sheet>/`
or `<category>/<group>/<sheet>/`, with the human readable titles in a
`meta.json` at each level. `node tools/build-manifest.mjs` walks that tree and
writes [cheatsheets.json](cheatsheets.json), which is committed rather than
built when the site deploys, so a local `php -S localhost:8000` needs no Node.
Regenerate and commit it whenever a cheatsheet is added, renamed or moved.

```bash
node tools/build-manifest.mjs --check
```

The same walk as a gate. The Pages workflow runs it before it publishes, which
is where a casing mismatch is caught - those resolve on Windows and 404 on the
published site.

## [Rendering a Sheet Outside the Page](https://isocialpractice.github.io/cheatsheets/docs/rendering-outside-the-page.html)

The page composes its sheet as SVG in the browser and nothing commits a raster,
so a picture of a sheet is made on demand:

```bash
node tools/cheatsheet.mjs --generate <slug> --format webp
```

It reports which of the two raster routes answered, because a file that does
not say that cannot be reviewed against the design language. A sheet does not
have to be in the catalog to be rendered: `--document <path>` reads a JSON
document from anywhere in place of a slug. `--help` has the rest.

## [Generating Cheatsheets From Another Site](https://isocialpractice.github.io/cheatsheets/docs/generating-from-a-site.html)

A site that already publishes code examples and explanatory sections holds
everything a cheatsheet needs:

```bash
node tools/cheatsheet-site.mjs <site>
```

It crawls the tree for elements carrying `data-cheatsheet`, collects what each
one wraps, and writes a cheatsheet page per folder of the site that marked any.
A folder is a subject, so a folder is a cheatsheet. A page with more than one
thing to say marks its material with a comment instead, which carries as many
properties as it needs:

```html
<!-- {% cheatsheet: [heading: page, group: page, name: splice] %} -->
```

Both methods feed one collector, so a page may use either and a site may use
both. `--dry-run` reports the folder it resolved and the pages it would write,
and touches nothing. The script imports nothing but Node builtins, because it
runs against somebody else's checkout.

## [Adding to the Catalog](https://isocialpractice.github.io/cheatsheets/docs/adding-to-the-catalog.html)

[CONTRIBUTING.md](CONTRIBUTING.md) is the record of how a cheatsheet and a
whole category are added, written from what was done rather than from the rule.
The eleven images in [javaScriptArrays/](javaScriptArrays/README.md) are
reference rather than any cheatsheet's graphic - they are what the global design
language was measured off, and what a composed sheet is aimed at reproducing.

## [Where the Drawing Surface Came From](https://isocialpractice.github.io/cheatsheets/docs/drawing-surface.html)

It was not written here. `api/napkin-sketch/` is a vendored copy of the
published [`@isocialpractice/napkin-sketch`](https://www.npmjs.com/package/@isocialpractice/napkin-sketch)
build, pinned at `1.1.0`. The copy is written by the package's own command, and
nothing in the folder is ever edited - a newer version is vendored into it
instead:

```bash
npx @isocialpractice/napkin-sketch vendor --list       # the parts, and what each costs a page
npx @isocialpractice/napkin-sketch vendor graphic-design graphic-design/files markdown main \
  --out api/napkin-sketch                              # fetch, verify and write the copy
node api/napkin-sketch/VENDOR-CHECK.mjs                # hash the folder against its record
```

`ai-helper/graphic-designer/` is still a hand port, of the design language
helper that sits on top of that surface. See
[ai-helper/graphic-designer/README.md](ai-helper/graphic-designer/README.md) for
what changed on the way in.

## [Tests](https://isocialpractice.github.io/cheatsheets/docs/tests.html)

Run the suite from the repository root with `node --test`, no path and no glob
after it:

```bash
node --test
```

Node finds every test file in the tree, so nothing needs changing when a test
moves. Nothing has to be installed first: cases that need a browser skip with
the install command as their reason.

## [Licence](https://isocialpractice.github.io/cheatsheets/docs/licence.html)

This repository is CC0 1.0 Universal ([LICENSE](LICENSE)), with two directories
scoped out of that waiver: `api/napkin-sketch/` is a vendored copy of
[`napkin-sketch`](https://github.com/isocialPractice/napkin-sketch) and
`ai-helper/graphic-designer/` is a port from it, and both stay under its MIT
licence. [NOTICE](NOTICE) carries the copyright line, the permission text in
full, and the four bundled notices the vendored parts reach.
