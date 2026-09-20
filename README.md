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

**Tests**
Run the suite from the repository root with `node --test`, no path and no glob
after it. Node finds every test file in the tree, so nothing needs changing when
a test moves. Nothing has to be installed first: cases that need a browser skip
with the install command as their reason.

**Licence**
This repository is CC0 1.0 Universal ([LICENSE](LICENSE)), with one directory
scoped out of that waiver: `api/graphic-design/` is a port of the drawing API
from [`napkin-sketch`](https://github.com/isocialPractice/napkin-sketch) and
stays under its MIT licence. [NOTICE](NOTICE) carries the copyright line and
the permission text in full.
