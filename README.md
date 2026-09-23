# Cheat Sheet Practical Use Example Output

**Preview in Browser**<br> 
Click the link below to preview in browser: **NOTE** \- *opens in current tab*. <br>
[Preview Cheat Sheet Examples](https://isocialpractice.github.io/cheatsheets/index.html)

**Download and Preview**<br>
The terminal will output the examples illustrated from the social media cheat sheet posts.
Download repo, start a localhost (php -S localhost:8000) and open in browser, follow the instructions on page, then open terminal to see the results.
Opening `index.html` straight from disk works as well: the examples, the cheat sheet images and the console output all load from a `file://` URL.

**Source for Examples**
The examples used are based on examples from:
1. Javascript Arrays:
     - w3schools - [JS Array Methods](https://www.w3schools.com/js/js_array_methods.asp)
     - MDN Web Docs - [Sorting Arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)

**Drawing a Sheet**
A cheatsheet is composed rather than screenshotted. `api/graphic-design/` is the
drawing surface and [API.md](api/graphic-design/API.md) is its reference, every
export and every limit; `api/cheatsheet/` is the layer that knows what a sheet
is, drawn to [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md). Both are dependency free
`.mjs` a browser imports with no build step. Worked examples are in
[examples/](examples/README.md).

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
It was not written here. `api/graphic-design/` is a hand port of the graphic
design API from [`napkin-sketch`](https://github.com/isocialPractice/napkin-sketch),
a sibling repository, and `ai-helper/graphic-designer/` is a port of the design
language helper that sits on top of it - it reads one finished graphic into a
written design language and generates a skill that can draw more work in it. See
[ai-helper/graphic-designer/README.md](ai-helper/graphic-designer/README.md) for
what changed on the way in. Every ported module names the upstream file and the
commit it was taken at, so the two can still be diffed.

**Tests**
Run the suite from the repository root with `node --test`, no path and no glob
after it. Node finds every test file in the tree, so nothing needs changing when
a test moves. Nothing has to be installed first: cases that need a browser skip
with the install command as their reason.

**Licence**
This repository is CC0 1.0 Universal ([LICENSE](LICENSE)), with two directories
scoped out of that waiver: `api/graphic-design/` and `ai-helper/graphic-designer/`
are ports from [`napkin-sketch`](https://github.com/isocialPractice/napkin-sketch)
and stay under its MIT licence. [NOTICE](NOTICE) carries the copyright line and
the permission text in full.
