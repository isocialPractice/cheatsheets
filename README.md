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
at all.

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

**Where the Drawing Surface Came From**
It was not written here. `api/napkin-sketch/` is a vendored copy of the
published [`@isocialpractice/napkin-sketch`](https://www.npmjs.com/package/@isocialpractice/napkin-sketch)
build, pinned at `1.0.0`, and the project's own documentation site is the
reference for what it draws. Nothing in that folder is edited - the pin moves
instead:

```bash
node tools/vendor-napkin-sketch.mjs --pin <version>   # fetch and record a release
node tools/vendor-napkin-sketch.mjs --check           # hash the folder against the record
```

`--pin` verifies the tarball against the registry's own SHA-512 before it
unpacks a byte, copies the two entries this repository uses and whatever they
import, and records a digest per file in `api/napkin-sketch/PIN.json`. `--check`
reads that record with no network, and the Pages workflow runs it before it
publishes. It replaced a hand port of the same surface, which was removed once
the package was published.

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
full, and the one bundled notice the vendored chunks reach.
