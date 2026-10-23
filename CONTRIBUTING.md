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

Three things about the `code` lines are worth stating, because each has cost a
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

A blank line carries no `role`. A role on one would be a colour on nothing.

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

Commit `cheatsheets.json` with whatever changed it. It is committed rather than
built at deploy time so that a local `php -S localhost:8000` needs no Node.

Nothing under `api/napkin-sketch/` is ever edited. It is a vendored copy
written by the package's own command, and a newer version is vendored into it
instead - the README says how.
