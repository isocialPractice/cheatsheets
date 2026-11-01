# Worked examples

Three scripts over one document. The first reproduces an existing cheatsheet
from that document; the second takes the same document through a second theme;
the third takes it out through every format the API renders. The first pair is
what the eleven kept images in `javaScriptArrays/` are for: the sheets are no
longer the product, they are the reference the generated ones are measured
against.

Nothing has to be installed. All three run on a bare clone - the two formats
that need a browser report why they could not rather than failing the run.

```bash
node examples/reproduce-sheet.mjs
node examples/restyle-sheet.mjs
node examples/render-formats.mjs
```

Each writes into `.tmp/examples/`, which this repository ignores - the output is
a demonstration, not an artifact. `--out <dir>` sends it elsewhere, and on the
first two `--raster` writes a PNG beside the SVG.

| File | What it is |
| --- | --- |
| `splicing-arrays.mjs` | The document all three examples compose, and the seed they compose it at |
| `reproduce-sheet.mjs` | The document through the recorded design language |
| `ember-theme.mjs` | A second palette, as a partial theme over the recorded one |
| `restyle-sheet.mjs` | The same document, the same seed, through that theme |
| `render-formats.mjs` | The same composition through all five output formats |

**Every example writes through `api/cheatsheet/`**, as of 2026.11.01. The first
two used `writeComposition` from the drawing surface underneath, which worked
and was a hand copy of the route this layer publishes: `renderOf` for the bytes
and `writeRender` for the file. An example that reaches past the surface it is
demonstrating documents a door rather than the one that was built.

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

masthead mark     vector
footer lockup     image

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
five bands, the three divisions, the flanking rules, the footer's own box, the
baselines of the four runs whose text never changes - is the artwork's, fixed
for every seed. **What a seed moves** in `DESIGN_LANGUAGE.md` says why those
three and no others.

**The two brand slots say how they were filled.** The artwork sets the brand's
mark beside the masthead wordmark and draws a footer strip with three social
icons in it, and this example passes `assets/logo.svg` and `assets/footer.png`
in so both are drawn rather than stood in for. `vector` means the mark was
inlined as shapes, which both renderers draw; `image` means the strip was
placed as pixels, which is the only form that carries an icon over a gradient
on a surface with no gradients. `drawn` is the fallback, and it is what a clone
without the assets reports: a lone wordmark centred on the axis and a navy
rectangle where the strip goes.

**The notes are the composition saying what it gave way on.** This document
produces two:

```text
  - The subtitle was stepped down from a 112 px cap to 107 px to fit the 2544 px its region leaves.
```

Only one, since the footer strip landed: the follow line is fitted and
reported when the composition sets it as type, and here the artwork's own
strip is placed instead. Without the assets the report carries a second note:

```text
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
`ember-theme.mjs`. A theme is the **theme model** in
`api/cheatsheet/theme.mjs`: the themeable half of the design language on its
own - the palette roles, the type stack and scale, the spacing step, the curve
and shape tokens, the stroke weights - with a schema that refuses a role that
is missing or a colour the renderer cannot read.

It used to be a modified copy of `SHEET_LANGUAGE`, passed as
`options.language`. That option was retired on 2026.10.30 and is refused by
name: handing the whole record over to change six colours handed a caller every
band, division and baseline on the sheet as well, with nothing saying which
parts were theirs to move. `themeFrom(language)` is the way to read a theme out
of a record you already hold, and `languageFor(theme)` puts one back in.

**The example's theme is written as a partial**, which is the shortest form
there is: a name and two palettes, and nothing else. `composeSheet` lays it
over the recorded theme and validates the result, so everything the file does
not mention stays where the design language put it. Restating the four measured
type sizes to change a colour is how a theme file ends up carrying a figure
nobody meant to move - and the validation still happens after the merge, so a
field that is *named* wrongly comes back as
`theme.colours: is not a field of this cheatsheet theme`.

The one recorded table a theme does not carry is the colour census, and the
reason is that a census is an **area** measurement of the eleven sheets: a
record copied with `colors` and `syntax` replaced would carry the sheets' hexes
through under the theme's name, reading as measured because everything beside
it was. `censusFor(language)` restates it instead - the recorded shares, in
whichever palette it is given. `ember-theme.mjs` exports `emberLanguage` for
the tools that draw a design language rather than a sheet, derived from the same
partial so the two cannot drift.

```js
import { composeSheet } from "../api/cheatsheet/compose.mjs";
import { emberTheme } from "./ember-theme.mjs";

const { composition, variation } = composeSheet(doc, { seed, theme: emberTheme });
```

**A theme is held to being readable before it draws.** Every pairing of ink and
ground the theme and the layout imply is measured against the text floor, after
the one substitution the design language nominates, and a theme that fails is
refused with each pairing and its ratio named. So the contrast table the script
prints is about what the sheet **drew** - which includes every ink that was
substituted - rather than about whether the palette was usable at all.

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

## 3. One render per output format

`render-formats.mjs` is the example for the **output** surface, the way the two
above are examples for the input one. It composes the document once and renders
it five times:

```bash
node examples/render-formats.mjs
node examples/render-formats.mjs --format webp --out .tmp/examples/formats
```

| Format | What it is | Behind it | On a bare clone |
| --- | --- | --- | --- |
| `svg` | The composition itself, in the face the markup names | Nothing. `toSVG()` is the whole of it | Renders |
| `html` | That markup made embeddable in a page | A string transform, no second renderer | Renders |
| `png` | Pixels, by either route | A browser, or the built-in single stroke alphabet | Renders, and says which route answered |
| `jpeg` | The same, through a codec the engine carries | A browser only | Reports why it could not |
| `webp` | The same, and what a social post is drafted from | A browser only | Reports why it could not |

**Composed once, rendered five times.** `renderOf` takes the pair
`composeSheet` already returned, so composing - which is the expensive half -
happens once for all five. `renderSheet(doc, options)` is the one-call form and
is what a caller with a single format wants:

```js
import { renderSheet } from "../api/cheatsheet/index.mjs";

const render = await renderSheet(doc, { format: "webp", route: "auto", quality: 80 });
render.data        // the bytes, on every format
render.route       // which renderer actually answered
render.publishable // whether it draws the face the design language measured
```

Three things in the report are worth reading rather than skimming.

**`drawn by` is the answer, not a request.** `route: "auto"` prefers a browser
and falls back to the built-in alphabet where it can, and a file that does not
say which one made it cannot be reviewed against the design language. The
example names `auto` on all three rasters for that reason: naming `browser`
would make it fail where there is none, and naming `builtin` would draw the
stroked alphabet on a machine that could have drawn the real face.

**`family` is `null` for markup, and that is an answer.** An SVG names a stack
of families and whoever opens it resolves the name, so there is no family for the
file to report. A raster has a renderer to ask, and the browser route asks it -
which is why the `png`, `jpeg` and `webp` rows name a face and the first two
say the reader's machine will decide.

**`publishable` is about the face, not about permission.** It means the render
draws the face the design language measured, so a reader looking at it is
looking at the sheet. A weight cap, a destination and a watch pattern are
policy and belong to whoever is publishing - the preset in `CONTRIBUTING.md` is
`tools/cheatsheet.mjs`'s, and the formats a post is drafted from are the social
recipe's.

### The fragment has three doors and one transform

`html` is the one format with a second entry point, because a page wants the
markup rather than the bytes:

| Call | Takes | Gives back |
| --- | --- | --- |
| `fragmentFor(markup, options)` | Markup already in hand | The fragment |
| `renderFragment(doc, options)` | A document | The fragment, composed first |
| `renderSheet(doc, { format: "html" })` | A document | The same fragment, as bytes |

The fragment is the canonical markup with the four things a page has to do to it
done already: the XML declaration off, the width and height attributes off, the
two scaling rules inline so it holds in a page with no stylesheet, and a wrapper
carrying an accessible name. `index.html` reads its sheets this way rather than
stripping the attributes itself.

### Writing is a second import, on purpose

`writeRender` is in `api/cheatsheet/files.mjs` and is not exported from
`index.mjs`:

```js
import { writeRender } from "../api/cheatsheet/files.mjs";

await writeRender(render, "out/");   // out/<title slugged>.<ext>
await writeRender(render, null);     // nothing written; the bytes come back
```

That module reads `node:fs`, and the page loads the surface with a bare
`import` and no build step - so a Node builtin in the static graph of
`index.mjs` would fail a browser at load rather than at the call. The `null`
case is the one a test and a server response both want: a render is already in
memory by the time it reaches a writer, so "write it nowhere" is the honest
shape of that request.

## Where to read next

- [the drawing surface's own reference](https://isocialpractice.github.io/napkin-sketch/) - the drawing
  surface: every export and every limit.
- [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md) - what the sheets are made of,
  and **Composing a sheet** for the algorithm that draws to it.
- `tools/test-worked-examples.mjs` - these examples under test, so a reader who
  runs them gets what this file says they will.
- `tools/cheatsheet.mjs --document <path>` - the same output surface from a
  command line, over a JSON document rather than a module.
