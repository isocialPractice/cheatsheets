# Cheatsheet

For someone who has already read the
[documentation](https://isocialpractice.github.io/cheatsheets/docs/index.html)
and wants the shapes back. No teaching.

## Commands

```bash
php -S localhost:8000                       # serve the root; the page needs a server
node --test                                 # the whole suite, no path and no glob
node tools/build-manifest.mjs               # rewrite cheatsheets.json
node tools/build-manifest.mjs --check       # the same walk as a gate
node api/napkin-sketch/VENDOR-CHECK.mjs     # hash the vendored copy against its record
node tools/cheatsheet.mjs --list            # what there is
node tools/cheatsheet.mjs --generate <slug> # compose and render one
node tools/cheatsheet-site.mjs <site>       # read a site, write cheatsheets out of it
```

## `tools/cheatsheet.mjs`

```text
--generate <slug>      compose by manifest slug or folder path
--document <path>      compose a JSON document instead of a catalog slug
--check [<slug>]       check without rendering
--list                 name what there is
--format <fmt>         svg (default), png, webp, jpg
--renderer <r>         auto (default), browser, builtin
--theme <name|path>    default, or a JSON theme, whole or partial
--layout <name|path>   sheet, or a JSON layout
--seed <n>             override the document's seed; identical seeds render identically
--scale <n>            device pixels per composition pixel (default 0.3889)
--quality <n>          encoder quality for png, webp, jpg (default 80)
--background <color>   a CSS color, or none for transparent
--max-bytes <n>        the weight a publishable render stays under (default 307200)
--out <path>           a file, a directory, or - for standard output
--data-only            emit the document and the composition's choices, render nothing
--dry-run              report what would be written, touch nothing
--json                 machine readable, naming which renderer answered
```

A publishable render goes beside its `sheet.json`; one that is not goes to
`.tmp/`. A `--document` render has no catalog folder, so it goes to `.tmp/`
either way.

## `tools/cheatsheet-site.mjs`

```text
<site>        the site root to crawl (required)
--out <dir>   write here instead of resolving cheatsheets/ under the site
--dry-run     report the folder and the pages, touch nothing
```

Markers:

```html
<div data-cheatsheet>              title, with the file name behind it
<div data-cheatsheet="title">      head from the page's own <title>
<div data-cheatsheet="page">       head from the file name, read as prose
```

```html
<!-- {% cheatsheet: [heading: page, group: page, name: splice] %} -->
```

| Property | Takes | Means |
| --- | --- | --- |
| `heading` | `title`, `page` | where the heading is read from |
| `group` | `folder`, `page` | join the folder's cheatsheet, or be one |
| `name` | a file name | what the cheatsheet is written as |

The comment applies to the element that follows it, with nothing but
whitespace between. Where a comment and an attribute both speak about one
heading, the comment wins and the disagreement is reported.

## The three models

| Model | Carries |
| --- | --- |
| **document** | a title and ordered sections |
| **theme** | palette roles, type stack and scale, spacing step, curve and shape tokens, stroke weights |
| **layout** | a named composition, its grid, and the slots a section may occupy |

A section asks for a **kind** of slot - `entries` or `listing` - never for one
by name. A layout keeps one slot per kind; naming none or keeping two is
refused by path.

A section carries **entries** (term, signature, description) or **lines** (a
worked listing, with a syntax role per line and meaningful indentation).

The **compact** document shape is a title and one flat `code` array, which is
exactly a formal document of one untitled listing:

```json
{
  "title": "Sample Sheet",
  "subtitle": "What this sheet is for",
  "kind": "read",
  "language": "javascript",
  "seed": "sample-sheet",
  "code": [
    { "text": "const items = [\"one\", \"two\", \"three\"];", "role": "identifier" },
    { "text": "console.log(items.length); // 3" }
  ]
}
```

A theme may be **partial**: laid over the recorded theme, then validated, then
held to being readable before anything is drawn.

## Rendering

```js
const render = await renderSheet(doc, { format: "webp", route: "browser" });
render.data        // the bytes, on every format
render.route       // which renderer answered
render.publishable // whether it draws the face the design language measured
```

`renderSVG` is canonical and every other format derives from it;
`renderFragment` is that markup made embeddable. Writing a render to disk is a
second import, `api/cheatsheet/files.mjs`, the only module in the folder that
reads `node:fs`.

## The catalog

```text
<category>/<sheet>/sheet.json
<category>/<group>/<sheet>/sheet.json
<category>/meta.json                    the readable title, and an order
```

`cheatsheets.json` is committed rather than built at deploy time, so a local
`php -S localhost:8000` needs no Node. Regenerate and commit it whenever a
cheatsheet is added, renamed or moved.

## Palette

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#F8F8F9` | `#020433` |
| Body text | `#020433` | `#F8F8F9` |
| Secondary text | `#414566` | `#9EBEA7` |
| Borders | `#6F6F8C` | `#6F6F8C` |
| Link, accent | `#2E7534` | `#4CAE50` |

The mark's green `#4CAE50` reaches 2.65:1 on the off white ground, so on light
it carries nothing a reader has to see an edge of; `#2E7534` is the same hue
darkened to 5.33:1 and takes those roles instead. One 8px spacing step, a 4px
radius. The full record, with every measured ratio, is in
[DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md).

## Rules worth not rediscovering

- Nothing under `api/napkin-sketch/` is ever edited. A newer version is
  vendored into it.
- A test file kept as a record is named `<name>.cases.mjs`, which no default
  `node --test` pattern matches.
- The eleven JPEGs in `javaScriptArrays/` are deleted from the runner's
  checkout before the Pages artifact is uploaded. They stay tracked and
  committed.
- Commit `cheatsheets.json` with whatever changed it.
