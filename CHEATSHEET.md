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
node tools/cheatsheet.mjs --all             # compose and render every one
node tools/cheatsheet-site.mjs <site>       # read a site, write cheatsheets out of it
node tools/cheatsheet-data.mjs <file>       # the same, out of one data file
```

## `tools/cheatsheet.mjs`

```text
--generate <slug>      compose by manifest slug or folder path
--all                  compose every catalog sheet, each from its own sheet.json
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

`--all` is the whole catalog in one act, which is what decides the cost of
writing a new sheet: it composes each entry from its own `sheet.json` by the
same path a single `--generate` takes, so the two write the same bytes to the
same place. A sheet that cannot be composed is reported against its own id and
the rest still run, the exit code saying some failed. It takes no `--out`,
`--seed` or `--data-only`: each of those means one sheet, and a batch has one
destination per cheatsheet.

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

Menus, written into the page rather than read out of it:

```html
<div data-cheatsheet-menu="page"></div>       link to all-cheatsheets.html
<div data-cheatsheet-menu="dropdown"></div>   an entry per generated page
```

Every cheatsheet is also written as `all-cheatsheets.html` in the generated
folder. A link is relative to the page the menu is in; an entry's text is the
generated file name read as prose. Anything already between the tags that this
tool did not write itself is refused rather than written over - a fill is
wrapped in `<!-- cheatsheet-site:menu -->`, which is how a run recognises its
own work - and a value naming neither menu is reported rather than defaulted.

A generated page carries a render of the cheatsheet's own document and the
material it was read from, so the page and a media file of the same sheet are
two renders of one composition.

## `tools/cheatsheet-data.mjs`

```text
<data file>    the file to read (required)
--format <f>   json, xml, html; read from the extension when not given
--out <dir>    write here instead of resolving cheatsheets/ beside the file
--dry-run      report the folder and the pages, touch nothing
```

For a site that is not written yet, so there is no page to mark. The same back
end: a data file says in one file what a marked up page says in an attribute or
a comment, and nothing past the read is different.

```json
{
  "menu": "dropdown",
  "entries": [
    {
      "page": "guide/arrays.html",
      "title": "Working with arrays",
      "material": ["<h2>splice</h2><p>Removes and inserts in place.</p>"]
    }
  ]
}
```

| Property | Takes | In a crawled site |
| --- | --- | --- |
| `dataVersion` | a number | nothing - no page declares one |
| `menu` | `page`, `dropdown` | `data-cheatsheet-menu` on an element |
| `entries` | a list of entries | the pages of the site |
| `page` | a path inside the site | the page's own path |
| `title` | text | `<title>` |
| `heading` | `title`, `page` | `heading:`, or `data-cheatsheet="<source>"` |
| `group` | `folder`, `page` | `group:` |
| `name` | a file name | `name:` |
| `material` | a list of blocks | what a `data-cheatsheet` element wraps |

The first three are the file's, the rest an entry's; `page` and `material` are
the two an entry cannot be written without. A block is markup, or
`{ "tag": "table", "markup": "<table>..." }` where the element is worth
recording - markup alone is recorded as a `<section>`. The menu is a page here,
`cheatsheet-menu.html`, since there is no page of the site's own to splice one
into. A finding names the property's path in the file, as `entries[2].heading`,
whichever format the file is written in.

**Three formats, one contract.** A property is the same word, means the same
thing and takes the same values in JSON, in XML and in HTML; only where the
value sits changes. In the two markup formats a property that holds a list is an
element carrying one child per item, and every other property is an attribute -
because a list of records has nowhere to go in an attribute, and neither has
markup. The outermost element is the file itself and its name is yours; HTML
steps over `<html>`, `<head>` and `<body>` to reach it.

```xml
<cheatsheets menu="dropdown">
  <entries>
    <entry page="guide/arrays.html" title="Working with arrays">
      <material>
        <block><![CDATA[<h2>splice</h2><p>Removes and inserts in place.</p>]]></block>
      </material>
    </entry>
  </entries>
</cheatsheets>
```

A block's markup is what its element holds. XML carries it escaped or in a CDATA
section; HTML carries it exactly as written, trimmed at its ends and never
re-indented - which is HTML's one advantage here and a large one for a file
somebody writes by hand, since a block of material *is* markup.

## `api/cheatsheet/site.mjs`

The browser entry point: the same two markings read off a loaded document with
ordinary DOM methods, for a site that will not run a build step.

```js
import { cheatsheetSection } from "./api/cheatsheet/index.mjs";

const { element, heading, findings } = cheatsheetSection(document);
if (element) document.body.append(element);
```

| Export | Answers |
| --- | --- |
| `markedElements` | the outermost marked elements, in document order |
| `linesOf` | the rows one element reads as, with a role each |
| `headingOf` | the heading a page asked for, and what to say about the asking |
| `collectFromDocument` | all of it as data, with the sheet document |
| `cheatsheetSection` | the section element, built and handed back |

It finds a marker a script wrote at run time, which a file scan cannot. It
fills no menu, because nothing here writes a folder for one to list.

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

A document may name a **composition**: the set composition it is drawn in, by
the id `api/cheatsheet/compositions.mjs` records it under. `composeSheet`
resolves that to the set's own theme and layout, so a sheet is drawn in its
set's design wherever it is composed rather than wherever a caller remembered
to pass one, and a `theme` or `layout` option is laid over the set's rather than
over the recorded one. Naming none is the recorded composition, which is what
every sheet written before compositions existed carries.

## Rendering

```js
const render = await renderSheet(doc, { format: "webp", route: "browser" });
render.data        // the bytes, on every format
render.route       // which renderer answered
render.publishable // whether it draws the face the design language measured
```

`renderSVG` is canonical and every other format derives from it;
`renderFragment` is that markup made embeddable, and takes `className`, `label`
and `id` - the last because a page may embed more than one sheet and a
composition always writes `id="cheatsheet"` on its root. Writing a render to
disk is a second import, `api/cheatsheet/files.mjs`, the only module in the
folder that reads `node:fs`.

A sheet's footer links out, and `variation.links` says where, in sheet pixels.
`renderSVG` writes them as a final `<g data-name="links">`, `withoutLinks` takes
it off again, and a fragment lifts them into a `<nav>` beside its `role="img"`
picture; `linkLayerFor(markup)` is that `<nav>` for a page with a box of its
own. A raster carries no link.

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
