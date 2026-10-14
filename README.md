# Cheat Sheet Practical Use Example Output

**Preview in Browser**<br> 
Click the link below to preview in browser: **NOTE** \- *opens in current tab*. <br>
[Preview Cheat Sheet Examples](https://isocialpractice.github.io/cheatsheets/index.html)

**Download and Preview**<br>
The terminal will output the examples illustrated from the social media cheat sheet posts.
Download repo, start a localhost (php -S localhost:8000) and open in browser, follow the instructions on page, then open terminal to see the results.
A local server is required rather than convenient. The page reads its catalog with
`fetch` and imports the drawing surface as a module, and a browser refuses both to a
`file://` document, so opening `index.html` straight from disk no longer works.

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
