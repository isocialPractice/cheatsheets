# Contributing

How work is added to this repository. It is written from what was actually
done rather than from the rule, so every command below has been run here and
every claim about a gate names the case that enforces it.

Nothing has to be installed. `node --test` runs the suite and
`php -S localhost:8000` serves the page, which is the whole local workflow -
see [README.md](README.md) for both.

## What a cheatsheet is

A folder holding a `sheet.json`. Nothing else marks one. The document is the
deliverable: the page composes the graphic in the browser from it, so no folder
commits a raster.

Paths are lower case kebab ASCII and at most three levels deep,
`<category>/<cheatsheet>/` or `<category>/<group>/<cheatsheet>/`. The human
readable title lives in a `meta.json` at each level and is never derived from a
path, which is how `html-css` is titled `HTML/CSS`.

A cheatsheet folder holds, at most:

| File | What it is |
| --- | --- |
| `sheet.json` | The document. Required |
| `meta.json` | The order among its siblings, and a title when the document carries none |
| one readable or runnable file | The payload, named after the folder |
| `demo/index.html` | The payload instead, for a `kind: embed` sheet |
| `sheet.webp`, `sheet.png`, `sheet.jpg`, `sheet.svg` | A render, written on demand and never committed |

`sheet.*` is reserved for the document and for renders, so a payload is never
named `sheet.anything`. Any other file in the folder fails
`node tools/build-manifest.mjs --check` as unreferenced.

### Two shapes a document may be written in

Every committed `sheet.json` is in the **compact** shape: a title, a subtitle,
the language the example is in, a seed, and a `code` array of lines each naming
the colour role it is set in. Write a new one the same way - it is what the
catalog is in, what the page reads, and what
`node tools/cheatsheet.mjs --check` holds the whole catalog to.

Since 2026.10.29 the layer also takes a **formal** document, which carries
ordered sections instead of one flat run of rows:

```json
{
  "title": "Splicing Array Elements",
  "subtitle": "Add and remove in one call",
  "language": "javascript",
  "sections": [
    {
      "title": "Removing",
      "entries": [
        {
          "term": "splice",
          "signature": "items.splice(1, 2)",
          "description": "Removes two from index one"
        }
      ]
    }
  ]
}
```

`sections` is what tells the two apart, and either composes. The difference is
that the compact shape is a flat run of rows, while a formal document says what
the sheet is about in groups and leaves every question of rows to the layout.
An entry's `term` is required; its `signature` and `description` are not.

A formal section carries **`entries` or `lines`, exactly one of the two.**
Entries are the model's own shape, three readable fields each. `lines` is a
worked listing - the same lines the compact shape's `code` carries - and it is
there because a listing says things entries cannot: the syntax role per line
and the indentation that means a nesting level.

```json
{
  "title": "Splicing Array Elements",
  "sections": [
    {
      "title": "Removing",
      "lines": [
        { "text": "// remove two from index one", "role": "comment" },
        { "text": "const removed = items.splice(1, 2);" }
      ]
    }
  ]
}
```

A section may also name a **`slot`**, which asks for a *kind* of slot rather
than a slot: `"entries"` or `"listing"`. Naming the slot itself would tie the
document to one layout, which is what this model exists not to do, so the
layout answers the kind with whichever of its own slots keeps that content -
the code panel, on this repository's sheet, which holds both. A section naming
nothing asks for the kind its content already is, so the field is one most
documents never write.

Since 2026.11.03 it is resolved rather than only validated. A section asking
for a kind the layout holds no slot of, or for `"heading"` or `"brand"` - which
a layout fills from the document's own title, subtitle and brand assets rather
than from a section - is refused by path:

```text
cheatsheet: document.sections[0].slot asks for "brand", which a layout fills
from the document's own fields rather than from a section. A section may ask
for "entries" or "listing"
```

Before that the field was held to "a non-empty string" and read by nothing on
the composition path, so such a document validated, composed, and drew its
entries in the code panel exactly as though it had asked for nothing.

Since 2026.11.04 the resolved slot is also what the rows are **placed from**,
and the layout carries the matching limit: a composition sets one stream of
rows, so a layout keeps **one** slot for the content a section carries. A
layout file naming none - which every layout written before `holds` existed
does - and a layout file keeping a separate slot per kind are both refused by
`readLayout`, at the layout's own path rather than at a section's:

```text
cheatsheet: there is one problem with the layout.
  layout.slots: keep the content of a section in 2 places - code-panel,
  listing-panel. A composition sets one stream of rows, so one slot holds every
  kind a section may ask for
```

Before that the count was nobody's: the schema held `holds` to be optional, so
a layout naming no kind validated and then refused every formal document with a
message blaming `document.sections[0]`, and a layout keeping two slots
validated and drew both streams in the first one while the second never filled.

**Both shapes are permanent, and neither is going away** - settled 2026.11.02,
and the reason the compact shape is no longer called "provisional" anywhere.
`{ "title": ..., "code": [...] }` says exactly what
`{ "title": ..., "sections": [{ "lines": [...] }] }` says, so the compact shape
is the shorthand for the common case of a sheet that is one listing. A sheet
that groups its material reaches for the formal shape; a sheet that is one
worked example does not have to. `node tools/cheatsheet.mjs --data-only` reports
`shape` as `compact` or `formal` so a consumer of that JSON knows which it is
holding without probing for a field.

Both shapes are refused with the path to the offending field rather than a
sentence about the whole document, which is the half worth knowing when the
field is three levels down:

```text
cheatsheet: there is one problem with the sheet document.
  document.sections[0].entries[1].term: must not be empty
```

The models are in `api/cheatsheet/`: `document.mjs`, `theme.mjs`,
`layout.mjs`, and `schema.mjs` behind all three.

### What `composeSheet` takes, and what it will not

Since 2026.10.30 the three models are the whole input surface, alongside a seed
and the two brand assets:

```js
const { composition, variation } = composeSheet(doc, {
  seed: "splicing-arrays",
  theme: { name: "amber", colors: { green: "#E8833A" } },
  layout: SHEET_LAYOUT,
  brand,
});
```

Three options it used to take are refused by name, each pointing at what
replaced it, because a sheet composed in the recorded palette when a caller
asked for another one reports success and is wrong:

| Gone | Say it with |
| --- | --- |
| `language`, the whole design language record | `theme`. `themeFrom(language)` reads one out of a record you already hold |
| `face`, a width table | `theme.stack`, which is the metrics a theme owns |
| `codeFace`, the same for the code panel | `theme.stack`. A sheet is set in one stack |

**A theme may be partial.** It is laid over the recorded theme and then
validated, so the example above is a complete theme and the four measured type
sizes, the step, the curves and the stroke weights all stay where the design
language put them. The merge happens before the validation rather than instead
of it, which is what keeps a typo honest: `{ colours: {...} }` comes back as
`theme.colours: is not a field of this cheatsheet theme`.

**A theme has to be readable before it draws.** Every pairing of ink and ground
the theme and the layout imply is measured against the theme's own text floor -
the five fixed runs and the code panel's six syntax roles - after the one
substitution the design language nominates for green on a light ground. A theme
that fails is refused, naming each pairing and its ratio. The structural fills
are deliberately not in that set: the green spine and the four flanking bars
reach 2.80:1 on the sheets' white, and **The one place the sheets break the
site's own rule** records that as a reading rather than a defect.

**Shape and curve are named tokens**, like the type sizes already were. A slot
says `shape: "block"` and the theme answers with a form and a corner radius in
sheet pixels, so a layout carries no raw geometry a second backend could read
differently. The record names two curves, `square` and `display`; every
structural region of the eleven is `square`, which is why the committed SVG
fixture did not move when the tokens landed. A slot that names no shape takes
the token for the way it is drawn - `block` for a fill, `bar` for a stroke -
and a token whose form disagrees with that is refused.

**The type stack is a list, and a render says which family drew it.**
`theme.stack.family` is `["Helvetica Neue", "Arial", "system-ui", "sans-serif"]`
rather than that string, so a caller adds a fallback by pushing onto it.
`rasterizeSheet` then reports what the renderer actually resolved: the built-in
route resolves nothing, because it draws its own alphabet, and the browser route
measures a probe string against each generic to find the first family the engine
really has. An SVG names a stack it cannot guarantee, so without that field two
rasters of one document can be set in two faces with neither file saying so.

### What a render comes back as, and where it can go

Since 2026.10.31 the way out is the layer's too. Until then a caller reached
`composeSheet(doc, options).composition.toSVG()`, which names the drawing
surface's own method, and imported `api/cheatsheet/raster.mjs` by path for
pixels, because the published surface exported nothing from it. That is the
same leak `options.language` was on the way in, pointing the other way:

```js
import { renderSheet, renderSVG, renderFragment } from "./api/cheatsheet/index.mjs";

const markup = renderSVG(doc, { seed: "splicing-arrays" });
const fragment = renderFragment(doc, { seed: "splicing-arrays" });
const render = await renderSheet(doc, { format: "webp", route: "browser", scale: 0.4 });
```

**There are five formats and one of them is canonical.** `svg` is the
composition itself, in the face the markup names, and every other format is
derived from it - which is why it is the default and why it needs neither a
renderer nor an encoder behind it.

| Format | What it is |
| --- | --- |
| `svg` | The canonical output. `renderSVG` is the whole of it, and it is synchronous |
| `html` | That markup made embeddable. A wrapper, not a second renderer |
| `png` | Pixels, by the browser route or the dependency free one |
| `jpeg`, `webp` | The same, through a codec the engine carries. Browser route only |

**Every render returns its bytes**, as `data`, with `text` beside it where the
format has a string form. So a caller embedding a sheet in a response, a data
URL or a test never names a path. The result also says what answered: `route` is
`composition`, `browser` or `builtin`, `family` is the stack asked for and the
one that drew, and `publishable` is whether what came back draws the face the
design language measured.

`publishable` does **not** mean "may be posted". A weight cap, a destination and
a watch pattern are policy and belong to whoever is publishing - the preset
below is `tools/cheatsheet.mjs`'s, and the formats a post is drafted from are
the social recipe's.

**An HTML fragment is four things done to the markup**, three of which
`index.html` did by hand before this was published, which is what made it worth
lifting rather than inventing: the XML declaration comes off, because a browser
parsing HTML has nowhere to put a prolog; the root's `width` and `height` come
off so the element scales off its viewBox instead of overflowing its column; the
two scaling rules travel inline, because the embedding document's CSS is not
this repository's to write; and the wrapper is `role="img"` named by the sheet's
own title, since a cheatsheet is a picture of text. `{ wrap: false }` asks for
the element alone, which is what the page uses - its box already carries the
role and the name.

**Writing is a separate import, and that is deliberate.**
`api/cheatsheet/files.mjs` is the one module in the folder that reads
`node:fs`, the way the drawing surface keeps its own writer behind
`graphic-design/files`. The page loads `index.mjs` with a bare `import` and no
build step, so a Node builtin anywhere in that file's static graph would fail in
a browser at load rather than at the call.

```js
import { renderToFile, writeRender } from "./api/cheatsheet/files.mjs";

await renderToFile(doc, "out/sheet.webp", { format: "webp" }); // that exact file
await renderToFile(doc, "out/", { format: "webp" });           // a derived filename
await renderToFile(doc, null, { format: "svg" });              // nothing written; bytes back
await writeRender(render, "-");                                // standard output
```

One argument for four destinations, because they are four values of the same
question. A directory gets the sheet's title slugged, so it is a complete
instruction rather than half of one, and `{ name: "sheet" }` overrides that.

`raster.mjs` stays behind a path too, for a different reason: it resolves a
headless browser the page can never take. It is still reachable through the
surface - `renderSheet` imports it at the moment a raster is asked for - which
keeps the route published and keeps the module out of the page's network.

### Rendering one, from the command line

`tools/cheatsheet.mjs` is what writes a render from the catalog. It composes a
document through the same layer the page does and renders it through the surface
above, so the two cannot answer differently; what it adds is the catalog lookup,
the preset, and the rule about where a render is allowed to land:

```bash
node tools/cheatsheet.mjs --list
node tools/cheatsheet.mjs --check
node tools/cheatsheet.mjs --generate html-css/html-apis/web-storage --format webp
node tools/cheatsheet.mjs --document .tmp/draft.json --format webp
node tools/cheatsheet.mjs --help
```

Four things about it are worth knowing before the first call, and the rest is
in `--help` and the file's own header.

**A document does not have to be in the catalog.** `--generate <slug>` names a
cheatsheet in `cheatsheets.json`; `--document <path>` reads a JSON document from
anywhere and composes that, through `readDocumentFile` in
`api/cheatsheet/files.mjs`, which holds it to whichever of the two document
shapes it is written in. Naming both is refused rather than ranked - they are
two answers to the same question - and so is pairing `--document` with `--list`
or `--check`, which are questions about the catalog.

A `--document` render always goes to `.tmp/`, publishable or not, and the rule
below says why: the folder a publishable render lands in is where a `sheet.json`
lives and where the social recipe looks, and a document named by path is in
neither. `--out` is the way to put one anywhere else.

**It reports which renderer answered, and that is not cosmetic.** The browser
route draws the face the design language measured; the built-in route draws a
single stroke alphabet, because it carries no font file. Both are legible and
only one of them is the sheet, so `--renderer auto` prefers the browser, falls
back with the reason recorded, and never claims the route it did not take.
`--renderer browser` refuses to fall back.

**Where it writes depends on whether what it made may be published.** A
publishable render goes beside its own `sheet.json` as `sheet.<ext>`; anything
else goes to `.tmp/`. The reason is the social recipe in
`.claude/constants.md`: it globs the working tree for `**/*.{jpg,webp}` and
drafts a post for each new match, so whatever lands beside a document is a
thing somebody may post. A built-in-alphabet render is not, nor is one under
the publish floor or over the weight cap. `--out` overrides the destination and
is always obeyed.

**`--theme` and `--layout` each take one recorded name or a file.** The record
holds one of each - the theme is `default` and the layout is `sheet` - so a
name that is neither says what the options are rather than quietly composing
the only one it has. Anything else is a path to a JSON model, which is read,
validated, and refused by the path to the offending field:

```bash
node tools/cheatsheet.mjs --generate <slug> --layout .tmp/two-column.layout.json
node tools/cheatsheet.mjs --generate <slug> --theme .tmp/amber.theme.json
```

A `--theme` file is a **theme** rather than a design language, and it may be
partial - `{ "colors": { "green": "#E8833A" } }` is a whole answer. It used to
be parsed straight into the retired `options.language`, so changing six colours
meant writing out every coordinate on the sheet.

Seed the ledger before rendering the whole catalog at once -
`cross-os-social seed --workspace mcp-todo` - or the first bulk run reads as 28
new images and drafts 28 posts.

### The preset a render is written at

The render row above is the only file in the table that is never committed, so
nothing in the repository is measured against this preset - there is nothing
committed to measure. It is for the moment something outside the page asks for
a picture of a sheet: a social post, a slide, a README somewhere else.

`tools/cheatsheet.mjs` takes every raster figure below from it, and a flag
overrides each. Format is the exception: `--format` defaults to `svg`, which is
the composition itself and needs no encoder, and the WebP in the table is what
`--format webp` is then written at. `node --test tools/test-cheatsheet-cli.mjs`
reads the table below and fails where the command and this document disagree,
so the figures are stated once.

| Setting | Value |
| --- | --- |
| Format | WebP |
| Quality | 80 |
| Long edge | 1400 px, which is `scale: 1400 / 3600`, or `0.3889` |
| Target weight | 200 KB |
| Hard cap | 300 KB |

**WebP rather than JPEG, and the gap is not small.** These are text dense code
renders, where the thing that degrades first is the edge of a small glyph.
Measured on 2026.10.26 over four sheets - the densest of the eleven, one from
each `read` group, and one of the new `embed` sheets - at 1400 px:

| Sheet | WebP q80 | WebP q90 | JPEG q80 |
| --- | --- | --- | --- |
| Max and Min Function and Sort Object | 112.2 KB | 145.7 KB | 196.4 KB |
| Forms and Inputs | 107.5 KB | 139.2 KB | 187.9 KB |
| Fetch and Abort | 98.7 KB | 129.2 KB | 173.5 KB |
| Flexbox and Grid | 66.7 KB | 86.8 KB | 130.0 KB |

So WebP at 80 lands between 67 and 112 KB, comfortably inside the 200 KB
target, and JPEG at the same quality and the same pixel size costs 1.7 to 2.0
times as much for a picture of the same thing.

**Raise an individual render to quality 90 when its code is not legible, and
never raise its dimensions past 1400 px.** Quality 90 costs 20 to 30 KB on the
figures above and stays inside the target on every sheet measured, so there is
room for it. Going wider is the move to avoid: the long edge is what the
consumer's own layout is sized against, and 1400 px already clears
`MIN_PUBLISH_SCALE` in `api/cheatsheet/raster.mjs` - the floor below which the
code face's stems fall under one device pixel and grey out - by 200 px, since
that floor works out at 1200 px on this canvas.

## Adding a cheatsheet to a category that exists

1. Make the folder and write its `meta.json` with an `order`.
2. Write the payload - the example, as a reader would meet it.
3. Write `sheet.json`: the `title`, a `subtitle`, the `kind`, the `language`
   the example is written in, a `seed`, and the `code` lines.
4. Regenerate the catalog and gate it:

   ```bash
   node tools/build-manifest.mjs
   node tools/build-manifest.mjs --check
   ```

5. Run the suite with `node --test`.

Four things about the `code` lines are worth stating, because each has cost a
run:

- **The `code` array and the payload carry the same text.** The panel draws the
  array; the payload is the same example as a file. They are written together
  and they are checked by reading, which is the one place here with no gate
  behind it.
- **`language` is what colours the panel.** The drawing surface reads the
  example with that grammar and each token takes one of the six syntax roles
  the design language names. A sheet that names no language, or names one
  nothing is registered under, falls back to the per-line `role` and
  `--check` reports which of the two it used.
- **The per-line `role` is still declared on every line.** It is the fallback
  rather than what draws, and the table it has to agree with lives in the
  category's design language. `node --test tools/test-sheet-syntax-roles.mjs`
  holds a sheet to the table for the language it declares, and fails a sheet
  whose language has no table rather than skipping it.
- **An indent is a nesting level, never a character column.** The panel is set
  in a proportional face, so spaces and letters are different widths and no
  number of spaces lands a value under a value on the line above. Indent a
  continuation one level deeper than the line it continues - four spaces under
  a two space declaration - rather than padding it to where the first value
  starts. Written as padding it is drawn wherever those spaces reach, which was
  35.4 px left of its column the one time it was tried.

  `node --test tools/test-sheet-indent-columns-browser.mjs` holds a sheet to it
  two ways. The ladder: the indents a sheet declares have to be `0`, one unit,
  two units and so on with no rung skipped, which is the one shape a padded
  column cannot be written in. Six sheets predated the rule; five were fixed on
  2026.10.25 and the sixth is listed in that file as a standing exception, with
  the reason it is one. The list is not a queue - a row added to it is a
  decision to argue for, not debt to clear - and the case fails on any sheet
  that is not on it.

  And the defect directly, since 2026.10.27: no line is indented to the first
  character of a token in the line above, where that line leaves a construct
  open and so is continued rather than nested into. That case walks every
  sheet, the exceptions included, because a row on the record exempts a sheet
  from the ladder and nothing exempts one from the thing the ladder stands for.

  The rule governs the `code` array, which is drawn in a proportional face. It
  does not reach the payload file, which is read in a monospace editor where a
  padded column lands where it was counted to. The two normally carry the same
  text anyway; where a transcribed sheet makes them differ, say so where a
  reader meets it, as `javaScriptArrays/README.md` does for the one sheet that
  does.

A blank line carries no `role`. A role on one would be a colour on nothing.

### What a `kind: embed` demo may rely on

An `embed` sheet's `demo/index.html` is loaded by the page into an `iframe`
carrying `sandbox="allow-scripts allow-forms"`, and nothing else. Settled on
2026.10.27, once for the catalog rather than per sheet, so a demo is written
against one answer; `allow-forms` was added on 2026.10.28, for the reason the
last row of the table below gives.

**What that grant takes away**, because `allow-scripts` alone gives the frame
an opaque origin:

| | In the frame | Opening `demo/index.html` directly |
| --- | --- | --- |
| `localStorage`, `sessionStorage` | Access throws `SecurityError` | Works |
| `navigator.clipboard` | `undefined` - an opaque origin is not a secure context | Works on `https` and on `localhost` |
| Cookies, `document.domain`, reaching `parent` | Refused | Same origin as the site |
| `fetch`, `URL`, `AbortController`, the observers, `dialog.showModal` | All work | All work |
| `<form method="dialog">`, any form submission | Works, with `allow-forms` granted | Works |

The last row is why the grant is two tokens rather than one. Opening a
`dialog` needs nothing, but closing one from inside itself is a form
submission, so under `allow-scripts` alone the **Clipboard and Dialogs**
demo's two in-dialog buttons did nothing and Escape was the only route out.
`allow-forms` buys form submission and nothing else - the frame keeps its
opaque origin, and `allow-top-navigation` is still absent, so a form cannot
move the page the reader is on.

`allow-same-origin` is deliberately not granted. Beside `allow-scripts` it is
not a weaker sandbox but no sandbox: the frame becomes same-origin with the
page, so it can reach `parent.document`, take the `sandbox` attribute off its
own frame and reload itself unrestricted - and write into the site's own
storage on the way. `allow-modals` is not granted either, and is not needed: it
governs `alert`, `confirm`, `prompt` and `print`, not a `dialog` element.

So **a demo reports a refusal rather than assuming a capability**. Reach for
storage or the clipboard through a guard, write the refusal into the demo's own
log panel, and let that be part of what the demo teaches - an opaque origin
having no storage is a true and useful thing for a storage cheatsheet to show.
A demo that throws instead shows a reader nothing. Under the frame the page
offers a link to the same demo in its own tab, which is where a reader goes for
the half the sandbox withholds.

**Fit the frame.** Its height is fixed, measured from all five committed demos
at every width the page can give them: **672px** on the wide layout, where the
frame is 736px across at its narrowest, and **832px** below the 768px
breakpoint, where it narrows to 288px on the smallest phone. Both are the
tallest demo rounded up to the page's 8px step. A taller demo scrolls inside the frame rather than
being clipped, which is the fallback and not the intention - a demo that needs
more room is better split than scrolled.

`node --test tools/test-example-selection.mjs` holds all of it: the grant, that
the markup ships no frame for a `src` to be rewritten on, that an `embed` sheet
frames the payload the manifest records and every other kind frames nothing,
that the frame comes down on the next selection and on a category change, and
that the demo inside it answers its own controls.

## Adding a new category

A category is a folder at the repository root, and the work that is easy to
lose is the design language rather than the cheatsheets. These are the steps in
the order they were taken for `html-css`, which is the only category added this
way so far.

1. **Write `<category>/meta.json`** with the display `title` and the `order`
   the category is offered in.

2. **Compose an asset to measure, then measure it.** A category has no artwork
   of its own - a sheet here is composed rather than drawn and exported - so
   there is nothing for the design language helper to read. Composing the
   global record into an asset and measuring that keeps the helper's refusal to
   invent a figure intact and still answers the question:

   ```bash
   node tools/compose-language-asset.mjs --category <category> --report
   node ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs \
     ".tmp/language-asset/<category>.svg" --colors 12 --markdown
   node ai-helper/graphic-designer/skills/design-language/scripts/generate-skill.mjs \
     ".tmp/language-asset/<category>.svg" --to .claude/skills
   ```

3. **Write `DESIGN_LANGUAGE-<category>.md`** at the repository root from what
   the analyzer reported, opening with the commands above so every figure in it
   can be reproduced. The asset goes to `.tmp/` and the generated skill to
   `.claude/skills/`, both ignored: the asset is an input to a measurement and
   the skill is derived from the record, so the record is what is kept.

   `node --test tools/test-build-manifest.mjs` fails a category that holds
   cheatsheets and no design language, and fails a design language naming a
   category the catalog no longer holds. `javascript` is the one exception and
   needs no file, because the global `DESIGN_LANGUAGE.md` was measured off its
   own eleven images.

4. **Record what the category adds on top of the global record**, in that same
   file. For `html-css` that was the payload kinds it introduced and the
   per-line role table for each language its examples are written in. A
   category whose examples are in a language no existing table covers needs
   both the table and its derivation in
   `tools/test-sheet-syntax-roles.mjs`, or its sheets are the only ones in the
   category nothing holds to a rule.

5. **Write the cheatsheets**, per the section above: `meta.json` at every
   level, then one `sheet.json` and one payload each.

6. **Regenerate and gate the catalog**, then run the suite.

### An order ranks siblings, and nothing further

The `order` in a `meta.json` ranks a folder among its own siblings. A category
with two groups has two sheets numbered 1, two numbered 2, and so on, so the
catalog orders a cheatsheet by the chain of orders down its path - the group's
order first, then the sheet's order inside it. A cheatsheet sitting directly
under a category is ranked by its own order against the groups beside it.

That is the builder's job and not yours; what it means for a contributor is
that a group's `meta.json` needs an `order` of its own, and that two groups may
number their sheets from 1 without colliding.

## A commit that draws gets a collaborator

A composed sheet is drawn rather than captured, so creating a `sheet.json` or
writing a render out is image work. Any commit that does either credits
`graphic-designer`, per the collaborators constant this repository is
maintained under.

That applies to a new cheatsheet, to a correction that changes what a sheet
draws, and to a render written beside one. It does not apply to a commit that
only moves, renames or regenerates what is already there.

### What "collaborator" means here, settled 2026.11.02

**It is a trailer on the commit message, and it is exactly this:**

```text
Co-Authored-By: graphic-designer <noreply@anthropic.com>
```

The wording had read two ways for as long as it was written down - a co-author
on a commit, or a collaborator on the repository - and until this was settled no
commit had ever satisfied either. `git log --grep=graphic-designer -i` returned
nothing and no commit in the history carried a trailer naming it.

**The repository-collaborator reading is not merely unintended; it is wrong,
and the cheap way to find that out is to look the name up.** `graphic-designer`
is a real GitHub account, registered in 2014, belonging to a designer with no
connection to this project. Adding it to this repository's collaborators would
hand push access to a stranger who never asked for it. So "collaborator" never
means a repository collaborator here, whatever the vocabulary suggests, and the
one safe act is the trailer above.

Two details of that trailer are deliberate:

- **The email is `noreply@anthropic.com`,** which is the address this
  repository's history already credits its agent work to. GitHub attributes a
  `Co-Authored-By` trailer by matching the **email**, never the name, so this
  form credits the agent in the log and links to no account at all. An address
  that resolved to the unrelated `graphic-designer` account would put a
  stranger's avatar on the drawing commits, which is the same mistake as the
  collaborator reading wearing different clothes.
- **The name is the agent, not a person.** `graphic-designer` is the design
  skill this repository ships at `ai-helper/graphic-designer/` and installs into
  `.claude/skills/`. Crediting it is the same kind of record as the
  `Co-Authored-By: Claude ...` trailer every commit here already carries.

### Who adds it

**Whoever writes the commit** - a contributor committing by hand, or the
automation that commits on a run's behalf.

It is **not** a step the work itself carries out, and that distinction is the
reason the rule went unsatisfied for so long. A run working this repository
records a commit *mode* in `.claude/commit-mode.request` and does not call
`git`; that file is two lines, a mode and a description, with nowhere to put a
trailer. So an item in `TODO.md` that lists "add `graphic-designer` as a
collaborator" among its steps is listing something it cannot do, and the
convention under **New Cheatsheets** says so rather than asking for it.

`tools/test-drawing-credit.mjs` holds the trailer's exact text against this
section, refuses the collaborator reading in writing, and fails any queued item
that lists adding the collaborator among its own steps - so the form above and
the form a committer copies cannot drift apart, and the line cannot creep back
into work that has no way to carry it out.

## What is in `javaScriptArrays/`

Eleven JPEG images, and they are not any cheatsheet's deliverable. They are
reference: the hand composed sheets the global design language was measured off,
and the record of what a cheatsheet looked like before one was composed. See
[javaScriptArrays/README.md](javaScriptArrays/README.md).

They stay as they are. `tools/test-sheet-composition.mjs` re-measures those
exact files against the tables in `DESIGN_LANGUAGE.md`, so converting or
re-encoding them would break the suite that holds the extraction.

## What the site does not carry

The published site is the repository root with **one** exception, settled on
2026.10.26: the eleven JPEGs above are deleted from the runner's checkout
before the artifact is uploaded, in the `build` job of
`.github/workflows/pages.yml`. Everything else ships, including `tools/` and
`api/`.

They are 20,302,335 bytes of the 22,944,433 the repository tracks - **88.5% of
the artifact, and 11 files of 192** - and the site asks for none of them:
`index.html` references none, `cheatsheets.json` records none, no `sheet.json`
names one, and the catalog walk never enters that folder because it holds no
`sheet.json`. They are read as evidence instead, from a clone and never over
HTTP, so leaving them out costs the suite nothing.

Two things follow for a contributor:

- **They are still tracked and still committed.** Only the runner's throwaway
  copy loses them. `git clone` gets all eleven, which is what the suite needs.
- **`javaScriptArrays/README.md` does ship.** The path answers on the site and
  explains what the folder is, rather than 404ing for anyone following a link.

If the folder ever grows a file the site does need, the step is a literal
`rm javaScriptArrays/*.jpg` and will not touch it - but say so there, because a
workflow that drops tracked files reads as a fault to whoever meets it next.

## Where the documentation lives

The long documentation moved out of `README.md` into `docs/` on 2026.11.08,
when the README crossed 300 lines. Four things follow for anyone writing
documentation here.

**`docs/` is hand written HTML, and there is no build step.** Thirteen pages,
one stylesheet, and nothing else - no generator, no dependency, no script on
any page. That is the same constraint that keeps `php -S localhost:8000` the
whole local workflow, and it is the reason a `.md` file is not a page: the site
publishes the repository root with a `.nojekyll` beside it, so Markdown is
served as raw text rather than rendered.

**The menu is repeated on every page, and a test holds it together.** The
repetition is what lets the site read with JavaScript off, and it is exactly
the shape that drifts, so `tools/test-docs-site.mjs` compares the menu across
the pages byte for byte, checks that every entry names a file and every file is
named by an entry, and resolves every relative link. Add a page and you add it
to thirteen menus; the test tells you which one you missed.

**`README.md` is a front door.** Each section keeps a short stand-in - a
paragraph, a small table, one code block - and its level 2 heading is a link to
the page carrying the rest. The test asserts that too: a level 2 heading that
is not a link to a page on the site fails.

**`QUICKSTART.md` and `CHEATSHEET.md` are each a file and a page.** The file is
what a reader on github.com gets rendered; the page is what a reader on the
site gets. Edit both, and the test compares their listings so one corrected
command cannot leave the other behind.

### Linking out of a documentation page

| Linking to | Write |
| --- | --- |
| Another documentation page | A relative link - `three-models.html` |
| The example page | `../index.html` |
| A Markdown record in the repository | The GitHub blob URL |

The last row is the one that is not obvious. `../DESIGN_LANGUAGE.md` resolves
on the site and serves plain text, because nothing renders Markdown there. The
blob URL renders, and it is the same document.

### A colour goes in the record before it goes in the stylesheet

`docs/docs.css` opens on the same token block `index.html` carries, and the
test holds the shared tokens equal across the two and every colour in either
against a table in `DESIGN_LANGUAGE.md`. A new ground is measured against the
inks it carries and written into **The documentation site** there first.

## Before you commit

```bash
node tools/build-manifest.mjs --check
node api/napkin-sketch/VENDOR-CHECK.mjs
node --test
```

The first two are what the Pages workflow runs before it publishes, and the
first is the one that catches a fault invisible locally: Pages serves from a
case sensitive filesystem while the work happens on Windows, so a path cased
wrongly resolves here and 404s on the published site.

### A leftover test file is named `.cases.mjs`

`node --test` walks the whole tree from the root, and it has read no
`.gitignore`. `.tmp/` escapes it because Node's default patterns do not match
into a dot directory; `test-results/` and `mcp-todo/` do not escape it, so
anything named `test-*.mjs` or `*.test.mjs` under either joins the suite on the
machine that wrote it.

That matters for one file in particular. A UI/UX review leaves its record in
`test-results/ui-ux-tester.agent/`, and the record is sometimes a test file
written to prove a walk finds the defect the review was sent to measure. That
is the right thing to assert on the day and a permanently failing case the day
after the fix lands, for a reason nobody reading the failure can act on.

So **a test file kept as a record is named `<name>.cases.mjs`**, which no
default pattern matches. It stays where it was written, it still runs on its
own by explicit path, and it is out of the suite:

```bash
node --test test-results/ui-ux-tester.agent/<name>.cases.mjs
```

`tools/test-suite-invocation.mjs` holds the rule, in "and nothing it runs is a
working artifact rather than the repository's own". It reports the path and this
remedy, so the rename is asked for on the day the record is written rather than
discovered weeks later as a red suite. Do not answer it by deleting the record,
and do not answer it by adding the folder to a list of exclusions in that file -
the folder's name is set by the reviewing agent's own instructions, which live
outside this repository.

Commit `cheatsheets.json` with whatever changed it. It is committed rather than
built at deploy time so that a local `php -S localhost:8000` needs no Node.

Nothing under `api/napkin-sketch/` is ever edited. It is a vendored copy
written by the package's own command, and a newer version is vendored into it
instead - the README says how.
