# Worked examples

Two scripts over one document. The first reproduces an existing cheatsheet
from that document; the second takes the same document through a second theme.
The pair is what the eleven kept images in `javaScriptArrays/` are for: the
sheets are no longer the product, they are the reference the generated ones are
measured against.

Nothing has to be installed. Both run on a bare clone.

```bash
node examples/reproduce-sheet.mjs
node examples/restyle-sheet.mjs
```

Each writes an SVG to `.tmp/examples/`, which this repository ignores - the
output is a demonstration, not an artifact. `--out <dir>` sends it elsewhere,
and `--raster` writes a PNG beside it.

| File | What it is |
| --- | --- |
| `splicing-arrays.mjs` | The document both examples compose, and the seed they compose it at |
| `reproduce-sheet.mjs` | The document through the recorded design language |
| `ember-theme.mjs` | A second palette, as a modified copy of `SHEET_LANGUAGE` |
| `restyle-sheet.mjs` | The same document, the same seed, through that theme |

## 1. Reproducing a sheet

`javaScriptArrays/SplicingArrays.jpg` is a screenshot of a sheet somebody
composed by hand. `reproduce-sheet.mjs` composes the same sheet from a
document, through the design language measured off that artwork, and reports
what the composition chose:

```text
seed              splicing-arrays -> 2112388739
face              sheet

the three figures the seed moved
  top padding     48 px
  left inset      240 px
  line spacing    101.49 px

what it had to fit
  title cap       141 px, against the artwork's 141
  code cap        62 px
  panel fill      93.7%, floor 85%

code fits         true
runs fit          true
fills panel       true
contrast holds    true
```

Three things in that report are worth reading rather than skimming.

**The seed is the sheet's own slug.** A string is hashed to a number, so a
sheet regenerates identically without anyone having to record a figure beside
it, and the report prints both halves so the number is recoverable.

**Only three figures came from the seed.** Everything else - the canvas, the
five bands, the three divisions, the flanking rules, the mark square, the
baselines of the four runs whose text never changes - is the artwork's, fixed
for every seed. **What a seed moves** in `DESIGN_LANGUAGE.md` says why those
three and no others.

**The notes are the composition saying what it gave way on.** This document
produces two:

```text
  - The subtitle was stepped down from a 112 px cap to 107 px to fit the 2544 px its region leaves.
  - The follow line was stepped down from a 154 px cap to 150 px to fit the 2736 px its region leaves.
```

That is the fitting rule working, not a fault. The artwork's display face is
condensed to 0.684 of any stack a generated sheet can name, so a run set at the
artwork's measured cap is wider here than it was there. What gives is the
size - never the letterform, because squeezing the glyphs would forge a
condensed face out of one that is not, and a reader sees that immediately.

### What "reproduce" does not claim

It is not a pixel match against the JPEG, and it cannot be. The original's
typeface is not named and not available - **The faces are not named** in
`DESIGN_LANGUAGE.md` records how far the identification got and where it
stopped. What is reproduced is every figure the artwork can be measured for.

## 2. Restyling it

`restyle-sheet.mjs` composes the same document, at the same seed, through
`ember-theme.mjs`. A theme is a modified copy of `SHEET_LANGUAGE`, passed as
`options.language` - there is no separate theme format, because the design
language is already exported as one object for exactly this.

```js
import { composeSheet } from "../api/cheatsheet/compose.mjs";
import { emberTheme } from "./ember-theme.mjs";

const { composition, variation } = composeSheet(doc, { seed, language: emberTheme });
```

**The point of the pair is that the two axes are independent.** The theme moves
every colour and nothing else; the seed moves the three free figures and
nothing else. The script measures that rather than asserting it:

```text
the two axes, measured against the recorded language
  geometry        identical
  paints          6 in the theme, 1 shared with the record
```

The one shared paint is white, which both palettes use for the light ground.
Every other colour on the page changed, and not one coordinate did.

### A theme is a re-tint, not an inversion

The colour roles are named after the artwork's own colours, and each carries
two jobs: `navy` is the dark ground *and* the dark ink, `white` is the light
ground *and* plain code. Swapping the two would put the footer's dark type on a
dark ground and the masthead's light type on a light one. So a theme re-tints
within the role structure the eleven established. A genuinely inverted sheet
would be a change to the design language rather than a theme over it.

### The contrast check is what makes a new palette safe

A theme is a set of colours the design language never measured, so the table in
`DESIGN_LANGUAGE.md` says nothing about it. The check runs on the composed
sheet instead - every run against the ground it was actually placed on, after
it was drawn rather than before, because the ink a run ends up in is not always
the ink it was asked for:

```text
contrast, measured on what was drawn
  wordmark     #FFFFFF on #241B2F  16.50:1  ok
  title        #3A3A40 on #FFFFFF  11.30:1  ok
  code-3       #FFC38B on #241B2F  10.55:1  ok
  follow-line  #241B2F on #FFFFFF  16.50:1  ok
```

Every pairing is reported, not only the failures, and anything under the 4.5:1
text floor is named with its measured ratio.

The theme's amber accent sits deliberately where the recorded green sits: at
2.71:1 on white it is a fill rather than text, exactly as the sheets' green is
at 2.80:1, and it carries a darker amber for text that has to be read on a
light ground. A theme that skipped that would leave `readableInk` silently
inert under it.

## Where to read next

- [api/graphic-design/API.md](../api/graphic-design/API.md) - the drawing
  surface: every export and every limit.
- [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md) - what the sheets are made of,
  and **Composing a sheet** for the algorithm that draws to it.
- `tools/test-worked-examples.mjs` - these examples under test, so a reader who
  runs them gets what this file says they will.
