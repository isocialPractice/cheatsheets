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

### Rendering one, from the command line

`tools/cheatsheet.mjs` is what writes a render. It composes a document through
the same layer the page does and hands the composition to one of two
renderers:

```bash
node tools/cheatsheet.mjs --list
node tools/cheatsheet.mjs --check
node tools/cheatsheet.mjs --generate html-css/html-apis/web-storage --format webp
node tools/cheatsheet.mjs --help
```

Two things about it are worth knowing before the first call, and the rest is in
`--help` and the file's own header.

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
carrying `sandbox="allow-scripts"`, and nothing else. Settled on 2026.10.27,
once for the catalog rather than per sheet, so a demo is written against one
answer.

**What that grant takes away**, because `allow-scripts` alone gives the frame
an opaque origin:

| | In the frame | Opening `demo/index.html` directly |
| --- | --- | --- |
| `localStorage`, `sessionStorage` | Access throws `SecurityError` | Works |
| `navigator.clipboard` | `undefined` - an opaque origin is not a secure context | Works on `https` and on `localhost` |
| Cookies, `document.domain`, reaching `parent` | Refused | Same origin as the site |
| `fetch`, `URL`, `AbortController`, the observers, `dialog.showModal` | All work | All work |

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
writing a render out is image work. Any commit that does either adds
`graphic-designer` as a collaborator, per the collaborators constant this
repository is maintained under.

That applies to a new cheatsheet, to a correction that changes what a sheet
draws, and to a render written beside one. It does not apply to a commit that
only moves, renames or regenerates what is already there.

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
