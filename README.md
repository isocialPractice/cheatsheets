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
`node tools/cheatsheet.mjs --generate <slug> --format webp`. It composes
through the same layer the page does and then takes one of two routes - a real
engine, which draws the face the design language measured, or the drawing
surface's own dependency free rasterizer, which draws a built in single stroke
alphabet. It reports which one answered, because a file that does not say that
cannot be reviewed against the design language. `--list` names what there is
and `--help` the rest.

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
