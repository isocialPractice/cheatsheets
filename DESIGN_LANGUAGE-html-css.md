# Design Language: html-css

The design language every cheatsheet in the `html-css/` category is drawn to.

It is a **derivation** of `DESIGN_LANGUAGE.md`, not a second opinion about it.
The global record was measured off eleven hand composed images; this category
has no artwork of its own and never will, because a sheet here is composed in
the browser rather than drawn and exported. So the asset that was measured is
one `tools/compose-language-asset.mjs` composed out of the global record, and
every figure below is what an analyzer read back off that asset.

That indirection is the point. The design language helper refuses to invent a
value its source did not give it, which is the property worth keeping; a
category with nothing drawn has nothing to point it at. Composing the record
into an asset and measuring that keeps the refusal intact and still answers the
question, and it makes the two records checkable against each other rather than
merely consistent in prose.

## How to reproduce every figure here

Three commands, in order. Nothing below was read by eye.

```bash
node tools/compose-language-asset.mjs --category html-css --report
node ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs \
  ".tmp/language-asset/html-css.svg" --colors 12 --markdown
node ai-helper/graphic-designer/skills/design-language/scripts/generate-skill.mjs \
  ".tmp/language-asset/html-css.svg" --to .claude/skills
```

The asset goes to `.tmp/`, which is ignored, because it is an **input to a
measurement** rather than an artifact: a committed copy would be a second
record of figures `DESIGN_LANGUAGE.md` already holds, and two records drift.
The generated skill goes to `.claude/skills/html-css/`, ignored for the same
reason - it is derived from this file, so this file is what is kept.

Measured 2026.10.19, at the asset's full 3600 px size.

## The page

3600 by 3600, square. Margin 241.

Not 3601. The eleven source images are 3601 square and that extra pixel is
export rounding, which matters here because 3600 divides cleanly by the 48 px
step the sheets and the site share and 3601 does not. A sheet in this category
is composed at 3600.

## Palette

Two measurements of the same six colours, and they disagree on purpose. The
first is how often the asset **references** a colour, which is what the file
declares. The second is how much page each one **covers**, taken by rendering
the file, and it is the one the roles come from - because "which colour is the
ground" is a question about area.

| Colour | Referenced | Covers | Role |
| --- | --- | --- | --- |
| `#000132` | 7.1% | 61.8% | Ground, and the ink on paper |
| `#FFFFFF` | 7.1% | 28.6% | Paper |
| `#4DAE51` | 14.3% | 5.7% | Accent |
| `#414143` | 19.1% | 1.7% | Display type on paper |
| `#B4BEC8` | 38.1% | 0.6% | Comment ink in the code panel |
| `#ADF8B7` | 14.3% | 0.2% | Identifier ink in the code panel |

The ordering inverts almost exactly between the two columns, which is the whole
reason both are recorded. Comment grey is referenced more than any other colour
and covers less than one percent of the page; the navy ground is referenced
twice and covers three fifths of it. A generated graphic carrying the right
colours in the wrong proportions produces the right swatches and the wrong
roles, and only the area column catches that.

### The 60-30-10 to hold work against

61.8 / 28.6 / 5.7, navy to white to green, with the three ink colours summing
to 2.5%. A sheet in this category that lands outside that shape is outside the
language however correct its hex values are.

The remaining 0.9% is the antialiasing of the asset's own edges, spread over
six near colours none of which reaches 0.3%. None of them carries a role.

## Type

- Family: the sheet face, as `DESIGN_LANGUAGE.md` records it under **The
  faces**. The asset names `Helvetica Neue` because that is the family the
  composition sets, and the measuring happens in the face that will draw the
  text.
- Sizes measured: **305.98**, **214.19**, **196.11**, **155.77**.

Those four are display, head, body and caption, and they are sizes rather than
cap heights. The composition works in cap heights and converts, so a size here
is the converted figure and not a token to set type at directly: the tokens are
in `api/cheatsheet/language.mjs`, which is this repository's global record in
the form code reads.

The asset carries its type as `text` elements with **no fill**. They draw
nothing and exist so that one file can carry both halves of the record - an
element is either a letterform or an area, and the palette above is an area
measurement. Without them an analyzer reports no sizes at all and invents a
type scale, which is the exact failure the asset exists to prevent.

## Strokes and radii

None. The asset declares no stroke width and no corner radius, and that is a
measurement rather than an omission: the mark the global palette was sampled
from is a filled square with square corners and no thin strokes, so the
language is dense, flat and orthogonal. A rounded or stroked sheet in this
category is a drift.

## Brand slots

Read from the asset's own layer names, so these are positions that were marked
rather than guessed at from pixels.

| Slot | Region | Box (x, y, w, h) | Page share | How | Confidence |
| --- | --- | --- | --- | --- | --- |
| `logo` | bottom-left | 0, 3264, 288, 336 | 0.8% | named | 0.95 |

One slot, not two. The footer mark square is named because the global record
gives it a box and a colour; the wordmark is **not** named, because a slot is
found from the extent of what was drawn and the asset draws nothing there - the
record says the wordmark is "in white and green" without saying how much of
each, so inventing a share would be inventing a figure. A declared slot that
can never resolve is worse than an undeclared one.

What fills the slot comes from the **Brand Resources** section of
`.claude/constants.md`, by way of `node tools/build-brand-resources.mjs`.
Nothing in this file names a brand value, and nothing in this file should: the
language is the geometry and the colour, and the brand is configuration.

## What this category adds on top of the global record

The global record was measured off eleven JavaScript sheets, every one a
`kind: run` payload. This category is where two more of the four payload kinds
first appear - `read` with its two overview groups, and `embed` with **HTML
APIs** - and that changes what the code panel carries rather than how it is
drawn. Only `none` is still unused, and the two master sheets are what will
bring it.

- **`kind: read` sets markup in the panel, not statements.** The panel's
  syntax roles are unchanged - `plain`, `comment`, `identifier`, `keyword`,
  `string`, `number`, with the colours the palette above gives them - but the
  mapping onto markup is this category's to fix, and it is fixed here.

  **A `sheet.json` carries one role per line, not one per token**, and from
  2026.10.20 that is the fallback rather than what draws - see **How a token
  takes its colour** in `DESIGN_LANGUAGE.md`. The rule below is still the
  rule: it is what a panel falls back to when no grammar reads the example,
  and it is what every sheet in this category declares. A line takes the role
  of the most specific thing it introduces, tested in this order:

  | A line that | Takes | Which reads as |
  | --- | --- | --- |
  | opens `<!--` | `comment` | Comment grey |
  | is a wrapped attribute, continuing a tag opened above it | `string` | Amber |
  | carries an attribute anywhere in it | `identifier` | Pale green |
  | is nothing but tags once the tags are removed | `keyword` | Pale yellow |
  | holds prose between its tags | plain | White |

  Structure comes out yellow, configuration green and content white, and
  `tools/test-sheet-syntax-roles.mjs` holds every sheet in the category to the
  table above.

  **How many lines of each the six sheets hold, counted over all 130 non-blank
  lines on 2026.10.20**, one figure per sheet in ascending order:

  | Role | Lines per sheet | Range | Of 130 |
  | --- | --- | --- | --- |
  | `keyword` | 3, 3, 3, 5, 12, 16 | 3 to 16 | 42 |
  | `identifier` | 1, 5, 5, 8, 9, 10 | 1 to 10 | 38 |
  | plain | 1, 1, 2, 4, 4, 14 | 1 to 14 | 26 |
  | `comment` | 0, 1, 1, 3, 4, 6 | 0 to 6 | 15 |
  | `string` | 0, 0, 1, 1, 3, 4 | 0 to 4 | 9 |
  | `number` | 0, 0, 0, 0, 0, 0 | - | 0 |

  **Each row is its own range, and the document used to give one for all of
  them.** It read "the six sheets in the category land between three and
  sixteen lines of each", which is `keyword`'s range and only `keyword`'s: both
  ends of it come from that row. Green reaches 1 and white reaches 1, so both
  fall under the lower end, and two roles are missing from a sheet entirely -
  Text Content carries no comment and no `string` line. A figure that fits one
  row of six is not a measurement of the table, and the next category measured
  against this document would have been held to it.

  `number` goes unused, and is left unused rather than forced: with a role per
  line there is no markup line that is a bare number, and inventing one would
  put a colour on the sheet that nothing on it means. Token colouring does not
  change that for markup either - there is no number in any of the six
  examples to colour.
- **CSS takes a second table, because the order is the other way round.** The
  category covers three languages, and a sheet says which it is in by naming
  its `language` - `html` on the six of **General HTML Overview**, `css` on the
  six of **General CSS Overview**, and `javascript` on the five of **HTML
  APIs**. The roles and the colours are the same six; what a line has to be
  read for is not.

  | A line that | Takes | Which reads as |
  | --- | --- | --- |
  | opens a comment, or continues one opened above it | `comment` | Comment grey |
  | is a wrapped value, continuing a declaration opened above it | `string` | Amber |
  | opens a block, closes one, or is a selector or at-rule outside a block | `keyword` | Pale yellow |
  | carries a declaration - a property, a colon and a value | `identifier` | Pale green |
  | holds anything else | plain | White |

  Structure comes out yellow and configuration green, exactly as in markup. The
  table reads from the top, and **the two structure and configuration rows are
  in the opposite order to the markup table above**. That is not a stylistic
  choice. A CSS selector is allowed a colon - `a:hover`,
  `p::first-line`, `*::before` and a width query inside `@media` all carry one -
  so a declaration test applied first reads every one of them as a property. A
  selector is recognised by where it sits instead: outside a rule's own block
  there is nothing a line can be *but* structure, which is why the row says
  "outside a block" rather than naming a shape.

  **What tells a declaration from a pseudo-selector is the open brace, not the
  line.** Both are a name, a colon and something after it, so the derivation
  carries the open blocks and the kind of each: an at-rule's block holds
  selectors, a rule's block holds declarations, and `@media` nesting a rule
  means both are open at once. `tools/test-sheet-syntax-roles.mjs` holds every
  sheet in the category to whichever of the two tables its `language` names,
  and fails a sheet naming a language it has no table for rather than skipping
  it.

  **How many lines of each the six CSS sheets hold, counted over all 149
  non-blank lines on 2026.10.23**, one figure per sheet in ascending order:

  | Role | Lines per sheet | Range | Of 149 |
  | --- | --- | --- | --- |
  | `keyword` | 8, 8, 10, 10, 14, 15 | 8 to 15 | 65 |
  | `identifier` | 7, 8, 8, 9, 12, 13 | 7 to 13 | 57 |
  | `comment` | 3, 3, 3, 3, 3, 4 | 3 to 4 | 19 |
  | `string` | 0, 0, 0, 1, 2, 5 | 0 to 5 | 8 |
  | plain | 0, 0, 0, 0, 0, 0 | - | 0 |
  | `number` | 0, 0, 0, 0, 0, 0 | - | 0 |

  **The role that goes unused is plain, where markup's was `number`**, and for
  the same reason rather than a different one: there is no CSS line that is
  prose. Every line of a stylesheet is a comment, a selector, an at-rule, a
  brace, a declaration or the tail of one, so white has nothing to colour and
  is left uncoloured instead of being given something. `number` is unused here
  too, and only as a per-line role - a hex colour, a length and a font weight
  are all read as numbers *token by token*, which is what actually draws. That
  is the one place the two tables disagree about more than order: markup has no
  number anywhere in it, and CSS is full of them.
- **JavaScript takes a third table, and it straddles the other two.** The
  category's third language arrived on 2026.10.26 with **HTML APIs**, whose
  five sheets declare `language: javascript`. The roles and the colours are the
  same six again; what changes is that the structure and configuration rows
  cannot simply be ordered, because JavaScript needs one of them on each side
  of the continuation row.

  | A line that | Takes | Which reads as |
  | --- | --- | --- |
  | opens `//`, or opens or continues a `/* */` comment | `comment` | Comment grey |
  | is nothing but punctuation, closing what was opened above it | `keyword` | Pale yellow |
  | continues a call or a literal left open above it | `string` | Amber |
  | opens with a control or function word | `keyword` | Pale yellow |
  | carries a binding, a property, an assignment or a call | `identifier` | Pale green |
  | holds anything else | plain | White |

  Structure comes out yellow and configuration green as in both tables above.
  **The two yellow rows are deliberate and the continuation row sits between
  them**, which is the one thing this table does that neither of the others
  needs. A callback's closing `});` is punctuation that closes a brace while a
  paren is still open around it, so the continuation test reaches it first and
  colours a brace amber. A line that closes and does nothing else is structure
  whatever is open above it, which is the row above the continuation; the row
  below it is the ordinary case.

  **`const`, `let` and `var` are configuration, not structure**, which is the
  one judgement in the table. A declaration carries a reserved word and what it
  introduces is a binding, so it takes green by the same reading that makes a
  line carrying an attribute green in markup. What takes yellow is a line that
  controls flow or opens a definition.

  Two things the derivation needs that the CSS one did not, both in
  `tools/test-sheet-syntax-roles.mjs`:

  - **A string literal is taken out before a comment is looked for.** A URL is
    the commonest literal in a browser API example and carries a `//` inside
    it, so reading comments first calls every line holding one a comment. CSS
    has no equivalent and never needed the step.
  - **Which bracket is innermost decides a continuation, not how many are
    open.** A callback body sits inside an unclosed paren as well as inside its
    own brace, so a depth count reads every statement in it as a wrapped
    argument. The brace being on top is what says they are statements.

  **How many lines of each the five sheets hold, counted over all 126 non-blank
  lines on 2026.10.26**, one figure per sheet in ascending order:

  | Role | Lines per sheet | Range | Of 126 |
  | --- | --- | --- | --- |
  | `identifier` | 11, 12, 12, 12, 15 | 11 to 15 | 62 |
  | `keyword` | 3, 7, 7, 9, 9 | 3 to 9 | 35 |
  | `comment` | 4, 5, 6, 6, 6 | 4 to 6 | 27 |
  | `string` | 0, 0, 0, 0, 2 | 0 to 2 | 2 |
  | plain | 0, 0, 0, 0, 0 | - | 0 |
  | `number` | 0, 0, 0, 0, 0 | - | 0 |

  **Green leads here where yellow led in both tables above**, and that is the
  shape of the language rather than a choice: a stylesheet is mostly selectors
  and braces, while a page of API calls is mostly calls. `string` is nearly
  absent for the opposite reason to CSS's - a wrapped line needs a literal
  split across rows, and only `web-storage` writes one, in the array its JSON
  round trip stores. Both unused roles are left unused, as in both tables
  above: plain because every line of this JavaScript is a comment, a piece of
  structure or a call, and `number` because no line is a bare number. Token
  colouring draws numbers inside lines, which is what actually reaches the
  panel.
- **A `read` sheet needs no `demo/` folder, and an `embed` sheet is nothing
  but one.** The payload of a `read` sheet is rendered as source text, so the
  one readable file beside `sheet.json` is the whole of it. `embed` is the
  other end: the folder holds `sheet.json`, `meta.json` and `demo/`, and
  nothing else at all. The category's first five landed on 2026.10.26 as
  **HTML APIs**, and its structure deliberately arrived before its hardest
  payload kind did.

  **What the kind turned out to add is that the folder decides it and the
  document only agrees.** `detectPayload` in `tools/build-manifest.mjs` reports
  `embed` from the presence of a `demo/` folder alone - never from the declared
  `kind`, which `--check` then holds to what is on disk. So an `embed` sheet is
  made by creating the folder, and a declared `kind: embed` beside no `demo/`
  is refused rather than believed. Two consequences a sheet author meets:

  - **The entry is fixed at `demo/index.html`.** A `demo/` holding no
    `index.html` is an error naming the missing file, rather than a sheet with
    nothing to load.
  - **Everything the demo needs goes inside `demo/`.** The unreferenced-files
    rule lets through `demo/` and the one folder a named payload sits in, and
    the walk stops at a cheatsheet folder - so a stray file beside one is a
    hard error, while anything at any depth inside `demo/` is unexamined. That
    is why each of the five demos is one self-contained page carrying its own
    style and script inline rather than three files sharing a stylesheet.
  - **A demo writes into its log panel as text, never as markup.** Each of the
    five builds a `span`, sets `textContent` and appends it. Three of them
    report something the page did not write - what the clipboard held, what was
    typed into the address field, what another tab stored - and
    `insertAdjacentHTML` holding that line parses whatever markup it carried.
    The one shape that proves it is not hypothetical is an opaque-path URL:
    `js:<img src=x onerror=...>` reaches `pathname` with its angle brackets
    intact, because the parser percent-encodes those in a special scheme and
    leaves them alone in an opaque one.

  **The page does not frame it yet**, which belongs here because the manifest
  records a payload the reader cannot reach: `index.html` branches on `run`
  alone, so an `embed` sheet composes its graphic and loads no frame. The five
  payloads are committed, correct and unopened, which is a gap in the page
  rather than in the sheets.
- **The panel fill floor applies as it does everywhere.** A sheet whose example
  is short enough to leave the panel emptier than the eleven were is reported
  by `node tools/build-manifest.mjs --check` as a warning rather than refused,
  because a sparse panel is inside every margin and failing it would refuse a
  short cheatsheet for being short.

## What the source could not say

- **Nothing about a raster.** The asset is an SVG, so colours, type, strokes,
  radii and structure are all declared values rather than observations. That is
  the better case; it is recorded because the opposite case - a JPEG, which
  tells an analyzer nothing measurable - is what the global record had to work
  from.
- **The generated skill's own output sits at a different ratio.** Its default
  composition is a poster rather than a cheatsheet, and measures 98.1% navy to
  1.5% white. Paper and ink agree with this record exactly; the accent reads a
  shade off because a placed brand asset supplies its own green. That is the
  poster's ratio and not this language's, and the skill is the tool rather than
  the record.
