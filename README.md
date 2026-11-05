# Cheat Sheet Practical Use Example Output

[Preview Cheat Sheet Examples](https://isocialpractice.github.io/cheatsheets/index.html)
\- *opens in the current tab*.

**Two Ways to View the Examples**
They are for two different readers, so they are listed as two routes rather
than as one with a caveat attached. The published site is for reading the
examples; a local server is for working on the page that draws them. Nobody
needs both.

**1. The Published Site**<br>
Follow the link under the title. Pick a cheatsheet from the first dropdown and
an example from the second, and the sheet is composed in the browser. Where an
example is a script, the page says so and asks for the console; the script's
output - the illustrated examples from the cheat sheet posts - goes there. A
cheatsheet that runs nothing is drawn without any of that being mentioned.
Nothing is downloaded and nothing is installed.

The address bar follows the selection, so a cheatsheet can be linked to
directly. The fragment is the cheatsheet's own path, as in
`index.html#javascript/arrays/splicing-arrays`, and a link naming one that has
since been renamed or removed opens the page as though it carried no fragment
at all, with the dead slug cleared out of the address bar rather than left
there for the reader to copy and pass on.

**2. A Local Server**<br>
For anyone changing the page, the catalog or a sheet. Clone the repository,
serve the root, and open the address it prints:

```bash
php -S localhost:8000
```

A server is required rather than convenient, and this is the part worth reading
twice: the page reads its catalog with `fetch` and imports the drawing surface
as a module, and a browser refuses both to a `file://` document. Opening
`index.html` straight from disk does not give a degraded view of the page, it
gives a blank one.

**Source for Examples**
The examples used are based on examples from:
1. Javascript Arrays:
     - w3schools - [JS Array Methods](https://www.w3schools.com/js/js_array_methods.asp)
     - MDN Web Docs - [Sorting Arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)

**Drawing a Sheet**
A cheatsheet is composed rather than screenshotted. `api/napkin-sketch/` is the
drawing surface, and `api/cheatsheet/` is the layer that knows what a sheet is,
drawn to [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md). Nothing has to be installed:
the browser imports both by relative path with no build step, and
`php -S localhost:8000` is still the whole local workflow. Worked examples are
in [examples/](examples/README.md).

The code panel is coloured token by token: a sheet names the language its
example is written in, the drawing surface reads it, and each token takes one
of the six syntax roles the design language names. Reading the code is the
heaviest thing the page loads, so it is fetched on demand beside the catalog
rather than before the first paint - a sheet drawn before it arrives falls back
to the one role per line every `sheet.json` still declares, and says which of
the two it used.

**The Three Models**
A caller describes a cheatsheet in three objects, each with a schema of its
own: a **document** of a title and ordered sections; a **theme** of palette
roles, a type stack and scale, the spacing step, the curve and shape tokens and
the stroke weights; and a **layout** of a named composition, the grid it sits
on, and the slots a section may occupy. The document says nothing about how any
of it is drawn, which is what lets one document be set to two layouts.

A section asks the layout for a **kind** of slot rather than for a slot by
name - `entries` or `listing` - and the layout answers with the one it keeps for
that content. A composition sets one stream of rows, so a layout keeps **one**
such slot, and the rows are placed from that slot's own box: a layout file that
names no slot for a section, or that keeps two of them, is refused by path on
the way in rather than drawn in a panel nobody asked for.

A section carries **entries or lines**: entries are a term, a signature and a
description each, and `lines` is a worked code listing, whose syntax role per
line and whose indentation both carry meaning an entry has nowhere to put. A
document may also be written in the **compact** shape - a title and one flat
`code` array, which is what every `sheet.json` in this repository is in and what
the page reads. Both shapes are permanent: the compact one is exactly a formal
document of one untitled listing, so it is the shorthand for the common case
rather than a draft of anything.

The three are the whole public input surface, alongside a seed and the two
brand assets. Nothing the renderer reads for itself is accepted: the design
language record and the two width tables used to be passable as
`options.language`, `options.face` and `options.codeFace`, and each is now
refused by name pointing at the model that replaced it. So a caller composes a
sheet without naming anything a renderer owns.

The theme and the layout are both derived from
[DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md) rather than written out again, so a
figure corrected in the record is corrected in both. Pass neither and a sheet
composes to what the eleven images were measured at; pass one and only what it
carries moves - a theme changes every paint and not one coordinate.

A theme may be **partial**: it is laid over the recorded theme and then
validated, so one colour moves without the palette being restated, and a
misspelt field is still named back by path. It is also held to being readable
before anything is drawn - every pairing of ink and ground the theme and the
layout imply is measured against the text floor, after the one substitution the
design language nominates, and a theme that fails is refused rather than
composed and annotated.

The type stack is a list of families rather than a CSS string, and a render
records which of them actually drew it: the SVG names a stack it cannot
guarantee, so the browser route measures what the engine resolved and reports it
beside the bytes.

The way out is the layer's too, as of 2026.10.31. `renderSVG` is the canonical
output and every other format is derived from it, `renderFragment` is that
markup made embeddable in a page, and `renderSheet` names any of the five
formats and takes the raster route from the call:

```js
const render = await renderSheet(doc, { format: "webp", route: "browser" });
render.data        // the bytes, on every format
render.route       // which renderer answered
render.publishable // whether it draws the face the design language measured
```

Every render comes back as data, so a sheet is embedded without a path being
named. Writing one is a second import, `api/cheatsheet/files.mjs`, which is the
only module in the folder that reads `node:fs` - the page loads the surface with
a bare `import`, so a Node builtin in its static graph would fail in a browser
at load. That module reads a document as well as writing a render:
`readDocumentFile` takes a path and holds the JSON to whichever of the two
document shapes it is written in, while `readDocument` beside it is the
plain-object form. Those two are the whole input model, and a path naming any
other format is refused by name rather than handed to `JSON.parse`.

Each of the five formats has a worked example of its own in
[examples/render-formats.mjs](examples/render-formats.mjs), which composes one document
and renders it five times - and reports which route answered, which family
drew, and whether the result may be shown to a reader.

A model that is wrong is refused with the path to the field, in the notation a
caller would reach it by:

```text
cheatsheet: there is one problem with the sheet document.
  document.sections[2].entries[1].term: must be a string, and is absent
```

A category gets a design language of its own, recorded at the root as
`DESIGN_LANGUAGE-<category>.md` - the first is
[DESIGN_LANGUAGE-html-css.md](DESIGN_LANGUAGE-html-css.md). It is derived from
the global record rather than being a second opinion about it: a category with
no artwork has nothing to measure, so `tools/compose-language-asset.mjs`
composes the record into a temporary SVG and the helper under
`ai-helper/graphic-designer/` measures that. `javascript` is the exception and
needs no file, because `DESIGN_LANGUAGE.md` was measured off its own images.

**The Catalog**
Every cheatsheet is a folder holding a `sheet.json`, at `<category>/<sheet>/`
or `<category>/<group>/<sheet>/`, with the human readable titles in a
`meta.json` at each level. `node tools/build-manifest.mjs` walks that tree and
writes [cheatsheets.json](cheatsheets.json), which is committed rather than
built when the site deploys, so a local `php -S localhost:8000` needs no Node.
Regenerate and commit it whenever a cheatsheet is added, renamed or moved.
`node tools/build-manifest.mjs --check` is the same walk as a gate: it fails a
missing title, a path that is not lower case kebab, a `kind` that disagrees
with what is in the folder, a sheet whose composition will not fit its own
margins, and a `cheatsheets.json` that has gone stale. The Pages workflow runs
it before it publishes, which is where a casing mismatch is caught - those
resolve on Windows and 404 on the published site.

**Rendering a Sheet Outside the Page**
The page composes its sheet as SVG in the browser and nothing commits a raster,
so a picture of a sheet is made on demand:
`node tools/cheatsheet.mjs --generate <slug> --format webp`. It composes and
renders through the same layer the page does, which then takes one of two
routes - a real engine, which draws the face the design language measured, or
the drawing surface's own dependency free rasterizer, which draws a built in
single stroke alphabet. It reports which one answered, because a file that does
not say that cannot be reviewed against the design language. `--theme` and `--layout` each
take the one name the record supports or a path to a JSON model of its own (and
a `--theme` file may be partial), `--data-only` emits the document and what the
composition chose without rendering anything, `--list` names what there is, and
`--help` the rest.

A sheet does not have to be in the catalog to be rendered:
`--document <path>` reads a JSON document from anywhere in place of a slug, so
the command is an entry point for a document rather than for this repository's
own index. It reports the same fields either way, with `source` saying which
flag named the sheet.

**Generating Cheatsheets From Another Site**
A site that already publishes code examples and explanatory sections holds
everything a cheatsheet needs; `node tools/cheatsheet-site.mjs <site>` is what
reads it. It crawls the tree for elements carrying `data-cheatsheet`, collects
what each one wraps, and writes a cheatsheet page per source page that carried
any. The output folder is resolved before anything is written - `cheatsheets/`
under the site root, then `cheatsheets/cheatsheets/`, then
`cheatsheets/cheatsheets_0/` and upward until a name is free - so a site that
already has one of those keeps it. The script imports nothing but Node
builtins, because it runs against somebody else's checkout.

The marker's value chooses the page's heading. `data-cheatsheet="title"` takes
it from the page's own `<title>` and `data-cheatsheet="page"` from its file
name; marked without a value, a page takes its title with its file name behind
it. A value naming neither is reported with the page it was written on rather
than quietly handed the default, as is an explicit `title` on a page that has
none - the default has a documented fallback and the ask does not.

A run can be read before it is trusted and run twice without moving anything.
`--dry-run` reports the folder it resolved and the pages it would write, and
touches nothing. A real run records the name it resolved in
`cheatsheets/.../cheatsheet-site.json`, and a later run reads that rather than
resolving a second section beside the first - which is what it would otherwise
do, because run one's output is what makes `cheatsheets/` taken for run two.
The manifest carries no timestamp, so a second run over an unchanged site
writes the same bytes and the generated pages can be committed and diffed.

Having no parser available is what makes the collector a scanner, and the
limits of scanning are listed in that file's own header rather than left to be
discovered. A start tag is walked rather than searched, so a `>` inside an
attribute value is not read as the end of one: `<div title="a>b"
data-cheatsheet>` is legal HTML, is one element, and is collected as one.

**Adding to the Catalog**
[CONTRIBUTING.md](CONTRIBUTING.md) is the record of how a cheatsheet and a
whole category are added, written from what was done rather than from the rule:
what a cheatsheet folder may hold, what a sandboxed `embed` demo may rely on,
the three commands a category's design language is derived with, where the
generated skill goes and why it is not committed, and the checks to run before
committing. The eleven images in
[javaScriptArrays/](javaScriptArrays/README.md) are reference rather than any
cheatsheet's graphic - they are what the global design language was measured
off, and what a composed sheet is aimed at reproducing.

**Where the Drawing Surface Came From**
It was not written here. `api/napkin-sketch/` is a vendored copy of the
published [`@isocialpractice/napkin-sketch`](https://www.npmjs.com/package/@isocialpractice/napkin-sketch)
build, pinned at `1.1.0`, and the project's own documentation site is the
reference for what it draws. The copy is written by the package's own command,
and nothing in the folder is ever edited - a newer version is vendored into it
instead:

```bash
npx @isocialpractice/napkin-sketch vendor --list       # the parts, and what each costs a page
npx @isocialpractice/napkin-sketch vendor graphic-design graphic-design/files markdown main \
  --out api/napkin-sketch                              # fetch, verify and write the copy
node api/napkin-sketch/VENDOR-CHECK.mjs                # hash the folder against its record
```

`vendor` verifies the tarball against the registry's own SHA-512 before it
unpacks a byte, copies each part's entry and every file it reaches, and records
a digest per file in `api/napkin-sketch/VENDOR.json`. `VENDOR-CHECK.mjs` is
written beside it and reads that record with plain `node`, no install and no
network; the Pages workflow runs it before it publishes. `vendor` refuses to
write into a folder holding files it has no record of, so the folder is removed
first when the mechanism itself changes.

`ai-helper/graphic-designer/` is still a hand port, of the design language
helper that sits on top of that surface - it reads one finished graphic into a
written design language and generates a skill that can draw more work in it. See
[ai-helper/graphic-designer/README.md](ai-helper/graphic-designer/README.md) for
what changed on the way in.

**Tests**
Run the suite from the repository root with `node --test`, no path and no glob
after it. Node finds every test file in the tree, so nothing needs changing when
a test moves. Nothing has to be installed first: cases that need a browser skip
with the install command as their reason.

**Licence**
This repository is CC0 1.0 Universal ([LICENSE](LICENSE)), with two directories
scoped out of that waiver: `api/napkin-sketch/` is a vendored copy of
[`napkin-sketch`](https://github.com/isocialPractice/napkin-sketch) and
`ai-helper/graphic-designer/` is a port from it, and both stay under its MIT
licence. [NOTICE](NOTICE) carries the copyright line, the permission text in
full, and the four bundled notices the vendored parts reach - the three the
Markdown entry brings with it, and the hyphenation patterns the chunks have
always carried.
