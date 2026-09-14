# Design Language

The design language of this repository, in two parts: the published site at
<https://isocialpractice.github.io/cheatsheets/>, and the cheatsheet images
the site displays.

Two artworks, measured the same way. `mark.png` is the only mark the
repository carries, so the site's palette comes from it and its composition
follows its geometry; every value in the sections up to **Layout** is either
**sampled** from the mark or **derived** from one that was, and the Source
section says which it is and where it came from. **The sheets** then records
what the eleven images in `javaScriptArrays/` are composed of, every figure
counted off the decoded image by `tools/measure-sheet-composition.mjs`.
Nothing here is invented, and where the two artworks disagree this document
says so rather than averaging them.

> **Status**: everything from **Palette and roles** through **Layout** is
> implemented. `index.html` declares its language, carries a viewport tag,
> links the favicon, lays its columns out as a wrapping flex row that
> collapses to one column below 768px, and since 2026.09.13 draws itself in
> the palette, the type scale and the 8px step below, in both themes.
> `tools/test-contrast.mjs` measures every text and background pair the page
> renders against its floor and fails on one that drops under it, and
> `tools/test-page-structure-browser.mjs` drives a real engine over what those
> rules render. What is still a target rather than a stylesheet is every token
> under **The sheets**: nothing is drawn to them yet, and the algorithms under
> **Cheatsheet Composition Language** in `TODO.md` are the work that will draw
> to them.

## Source

`mark.png` is a 417x418 mark, 174,306 opaque pixels across 322 unique
colors. Three of those colors cover 97.72% of it: a deep navy ground, a mid
green figure, and a white highlight.

It is the artwork the counts below were taken over, kept in the repository so
they stay checkable. `favicon.ico` is the icon derived from it and is not the
same image: see **The icon** at the end of this document.

### Sampled from the mark

Counted over every pixel, not estimated:

| Sampled | Hex | Pixels | Share | Where it sits in the mark |
| --- | --- | --- | --- | --- |
| Navy | `#000133` | 76,395 | 43.83% | The ground, and the dominant color by area |
| Green | `#4CAE50` | 62,940 | 36.11% | The figure |
| White | `#FFFFFF` | 31,000 | 17.78% | The highlight |

The remaining 2.28% is antialiasing along the figure's edges. No single
edge color exceeds 0.47%, so none of them carries a role.

### Derived from those three

The tokens below are **not** in the mark. Each one states the sampled color
it comes from and the reason it moved, so no value here is unaccounted for:

| Derived | Hex | From | Why it moved |
| --- | --- | --- | --- |
| Navy, soft | `#020433` | `#000133` | The ground warmed off absolute black-blue. 1.01:1 against the sampled navy, so the mark still reads as itself |
| Off white | `#F8F8F9` | `#FFFFFF` | The highlight softened, so a full page of it is not pure white |
| Slate | `#414566` | `#000133` | The ground lightened until it carries secondary text at 8.72:1 |
| Muted | `#6F6F8C` | `#000133` | Lightened further, stopping at 4.57:1, the AA floor for normal text |
| Green, dark | `#2E7534` | `#4CAE50` | The figure darkened until it carries link text on light at 5.33:1 |
| Sage | `#9EBEA7` | `#4CAE50` | The figure desaturated toward the highlight for secondary text on dark, at 9.72:1 |

The mark is a filled square with square corners and no thin strokes: dense,
flat, and orthogonal. Spacing, radii, and weight follow from that rather
than from a rounded or airy reading.

## Palette and roles

Roles are assigned by measured contrast, not by preference. Every ratio
below was computed against its stated background, and every pairing the
site uses for text reaches at least 4.5:1.

### Light theme

| Role | Hex | On | Ratio | Passes |
| --- | --- | --- | --- | --- |
| Page background | `#F8F8F9` | - | - | - |
| Body text | `#020433` | `#F8F8F9` | 18.53:1 | AA normal |
| Secondary text | `#414566` | `#F8F8F9` | 8.72:1 | AA normal |
| Muted text, borders | `#6F6F8C` | `#F8F8F9` | 4.57:1 | AA normal |
| Link, accent text | `#2E7534` | `#F8F8F9` | 5.33:1 | AA normal |

### Dark theme

| Role | Hex | On | Ratio | Passes |
| --- | --- | --- | --- | --- |
| Page background | `#020433` | - | - | - |
| Body text | `#F8F8F9` | `#020433` | 18.53:1 | AA normal |
| Link, accent text | `#4CAE50` | `#020433` | 7.00:1 | AA normal |
| Secondary text | `#9EBEA7` | `#020433` | 9.72:1 | AA normal |
| Borders | `#6F6F8C` | `#020433` | 4.05:1 | AA non-text |

`#6F6F8C` is the one token that is not restated for the dark theme. It reaches
4.57:1 on the off white ground and 4.05:1 on the navy, so it clears the 3:1
floor a control boundary has to clear on both and one value serves for both.
What it does not clear on the navy is the 4.5:1 text floor, so on dark it draws
edges and never glyphs; secondary text there is `#9EBEA7`.

### The one substitution

The mark's green `#4CAE50` reaches only **2.65:1** on the off white
background. That clears neither the 4.5:1 floor for normal text nor the
3:1 floor for a control border or a focus ring, so on the light theme the
figure's own green carries **nothing**: not body text, not links, and not
an accent a reader has to see the edge of. It is left to fills, where the
color is decoration and no boundary depends on it.

`#2E7534` is the same hue darkened until it reaches 5.33:1, and it takes
every one of those roles on light backgrounds in its place: link text,
rules, the selected state of a dropdown, the focus ring. Compliance wins
over fidelity to the artwork.

On the dark theme no substitution is needed: the figure green `#4CAE50`
reaches 7.00:1 on the navy ground and is used as drawn.

## Type scale

The page is a reading surface wrapped around a screenshot, so the scale is
short and the body size is the anchor.

| Step | Size | Line height | Used for |
| --- | --- | --- | --- |
| `h1` | 2rem | 1.2 | The page title |
| `h3` | 1.25rem | 1.3 | The instructions panel heading |
| Body | 1rem | 1.6 | Paragraphs, list items, labels |
| Small | 0.875rem | 1.5 | The footnote |

The examples themselves are read from the screenshots rather than from the
page, so no monospace face is loaded.

### The page's face

The page is set in `"Helvetica Neue", Arial, system-ui, sans-serif`, declared
once as the `--font` token and taken by `body`. Both `<select>` controls
inherit it through `font: inherit`, so the whole page is one face.

It was measured in a real engine on 2026.09.13 that it was not. The stylesheet
set a size and a line height on `body` and no family at all, so
`getComputedStyle(document.body).fontFamily` resolved to `"Times New Roman"`
and the page rendered with serifs beside artwork set throughout in a
grotesque. The color and the 8px step carried the pairing and the type did
not.

It is a stack rather than a family so nothing has to ship: a grotesque where
one is installed, the platform's own interface face where it is not, and the
generic as the last resort.

**This is not an identification of the sheets' face.** The artwork's display
face cannot be named from the artwork, which **The faces are not named**
records and this does not reopen. A family chosen for the page because it is
legible and installed nearly everywhere is evidence about the page and about
nothing else.

## Spacing and radius

A single 8px step, because the mark is orthogonal and evenly weighted.

| Token | Value |
| --- | --- |
| `space-1` | 8px |
| `space-2` | 16px |
| `space-3` | 24px |
| `space-4` | 32px |
| Radius | 4px |
| Max content width | 1024px |

The 4px radius is deliberately small. The mark has square corners, so a
rounded interface would read as belonging to something else.

## Layout

- **Responsive is a constant.** The site must read from a phone to a wide
  desktop. The `margin-left: 500px` offset on the image and the
  `position: fixed` tools panel that made this a desktop only page are gone.
- Two columns on wide screens: the controls beside the cheatsheet image, as
  a flex row wrapping at a `space-4` gap.
- One column below 768px, controls first, image beneath at full width.
- The image is capped at 600px wide on desktop, which is the width the page
  has always displayed it at, and scales down with its column below that. It
  carries the same 1px border as the instructions panel: a sheet's masthead is
  the mark's navy and its body is near white, so without a frame the top band
  merges into the dark ground and the sides merge into the light one.
- The page is centred at the 1024px maximum content width, with a `space-2`
  gutter so nothing meets the edge of a phone screen. That width is the row's
  own measure and not a round number: 360 for the panel, a `space-4` gap and
  600 for the sheet is 992, and the two gutters make 1024, which is 128 whole
  8px steps. It was 1200px until 2026.09.14, and the difference showed: the
  sheet's column takes whatever width is left while the sheet inside it stays
  capped at 600px and left aligned, so from 1025px up the frame stopped as
  much as 176px short of the column it sits in and the composition read off
  centre. Capping the page at its content puts the two edges back together at
  every width without moving anything else.

## The sheets

The eleven images in `javaScriptArrays/` were composed by hand and share a look
that had never been written down. This part records it, on the same terms as the
palette above: every figure is a pixel count, a run length or a bounding box read
off the decoded image, and nothing here is estimated or read by eye.

`tools/measure-sheet-composition.mjs` produces all of it bar two figures that
ImageMagick answers directly - the RMSE table below and the font survey under
**The faces are not named** - and each of those records the command it was read
with. Run the script to check every other number below against the artwork:

```bash
node tools/measure-sheet-composition.mjs
```

It decodes each JPEG with ImageMagick, assigns every pixel to the nearest of the
four fills the sheets are built from, and reads the regions out of the resulting
runs. Where a figure carries a range rather than one value, the range is the
spread across the eleven sheets and the text says what causes it.

### The canvas

All eleven are **3601x3601**, square, sRGB, JPEG quality 99.

3601 is one pixel over 3600, and that pixel is export rounding rather than
anything in the composition. It matters only in **The step the sheets are drawn
to** below, where 3600 divides cleanly and 3601 does not.

### Composition regions

Six regions stack down the canvas, in this order, on every sheet. Each is a flat
fill or a band bounded by one, so each has an edge that can be measured rather
than judged.

| Region | Fill | Rows | Sheet px | Share of canvas | Holds |
| --- | --- | --- | --- | --- | --- |
| **Masthead** | Navy | 0 to 526 | 527 | 14.63% | The wordmark, in white and green |
| **Heading band** | White | 527 to 1188 | 662 | 18.38% | The two flanking rules, the title, the subtitle, the lead-in |
| **Code panel** | Navy | 1189 to 3215 | 2027 | 56.29% | The syntax-colored example |
| **Green rule** | Green | 3217 to 3261 | 45 | 1.25% | Nothing; it is the divider above the footer |
| **Footer** | White | 3262 to 3600 | 339 | 9.41% | The mark square and the follow line |

Nine of the eleven sheets leave one row between the code panel and the divider
that belongs to neither: row 3216 on the six that match the table above, and row
3223 on the three whose panel ends seven rows lower. That row is what makes
527 + 662 + 2027 + 1 + 45 + 339 exactly 3601. On the other two the divider starts
where the panel ends and the five bands account for the canvas on their own.
Either way the bands leave at most one row over.

Across the canvas there are three divisions:

| Division | Fill | Columns | Sheet px | Share of canvas |
| --- | --- | --- | --- | --- |
| **Green spine** | Green | 0 to 230 | 231 | 6.42% |
| **Code panel** | Navy | 231 to 3330 | 3100 | 86.09% |
| **Right margin** | White | 3331 to 3600 | 270 | 7.50% |

The spine is flush to the left edge and the panel begins where it ends, so below
the heading band the composition has no left margin at all. The right margin is
the only one.

The columns above are the boundaries between the three fills. The panel's own
measured bounding box lands on 231 or 232 depending on which side of the
boundary the antialiased edge falls on that sheet, so it reads 3098 or 3099 px
wide against the 3100 px of canvas the division occupies.

The spine starts at row 980, 209 rows above the panel it runs beside, and ends
with it.

Inside the heading band sit two green rules, each drawn as a pair flush to the
left and right edges with the title between them:

| Rule | Rows | Height | Left run | Right run |
| --- | --- | --- | --- | --- |
| Upper | 532 to 576 | 45 | x 0 to 419 | x 3181 to 3600 |
| Lower | 623 to 642 | 20 | x 0 to 419 | x 3181 to 3600 |

Each run is 420 wide, and the 2761 px between them is what the title is set
across.

#### How closely the eleven repeat

Every figure in the tables above holds to within one pixel on all eleven sheets,
apart from the three deviations named below. One pixel is the floor: JPEG at
quality 99 moves a flat edge by that much on its own.

The regions are not merely the same size, they are the same artwork. Comparing
each sheet's template regions against `ChangingElements.jpg`, as RMSE over the
full 0 to 1 range:

| Region | Worst RMSE across the other nine template sheets |
| --- | --- |
| Masthead | 0.040 |
| Title | 0.090 |
| Lead-in | 0.098 |
| Follow line | 0.076 |
| Footer band | 0.054 |

`shiftAndUnshift.jpg` is the tenth and is left out of that column, because its
lead-in sits 84px lower and the same comparison returns **0.448** there rather
than 0.098. On the other four regions it reads 0.040, 0.090, 0.076 and 0.053,
which is the worst figure or within 0.001 of it.

Four of those come back at RMSE 0.000 against one other sheet, which is
bit-for-bit identity, so the repetition is a shared source rather than a careful
redrawing.

This table is read with `magick compare` over each region's crop rather than by
the measuring script. The masthead row is:

```bash
magick compare -metric RMSE -crop 3601x527+0+0 +repage javaScriptArrays/ChangingElements.jpg javaScriptArrays/<other>.jpg null:
```

Three sheets deviate, and each deviation is worth knowing before anything is
generated to this language:

- **`shiftAndUnshift.jpg` pushes everything below the subtitle down by 84px.**
  Its lead-in starts at 1105 rather than 1021 and its code panel at 1273 rather
  than 1189. The panel's bottom moves only 7px, so the panel is 77px shorter, and
  its right edge is 3246 rather than 3330. It is the one sheet whose heading band
  is 746 rather than 662.
- **`ChangingElements.jpg` and `SplicingArrays.jpg` end the code panel at 3222
  rather than 3215**, which leaves their divider 38 rows tall rather than 45. The
  footer still starts at 3262, so the difference is absorbed by the divider.
- **Nothing inside the code panel repeats.** The left inset of the leftmost code
  line ranges from 85 to 414 px across the eleven, and the type size varies with
  how much code the sheet carries. The panel is a fixed frame around free
  content, and it is the only region of which that is true.

### The colors the sheets are drawn in

Counted over all 142,639,211 pixels of the eleven sheets. JPEG spreads a flat
fill across hundreds of neighbouring triples, so each figure below is the exact
color plus every triple within 12 units of it; the fold is what makes the share
mean anything. The sheets carry between 8,306 and 9,369 exact colors each, and
the six below cover 98.74% of the pixels.

| Hex | Pixels | Share | Role on the sheet |
| --- | --- | --- | --- |
| `#000132` | 86,972,962 | 60.97% | The masthead and code panel ground, the footer mark square, and the footer type |
| `#FFFFFF` | 41,303,201 | 28.96% | The heading and footer ground, and plain code |
| `#4DAE51` | 8,551,556 | 6.00% | The spine, both flanking rules, the divider, and the handle sigil in the footer |
| `#414143` | 2,667,326 | 1.87% | The title, the subtitle and the lead-in |
| `#B4BEC8` | 994,490 | 0.70% | Comments in the code panel |
| `#ADF8B7` | 337,940 | 0.24% | Identifiers in the code panel |

Below those sit the rest of the syntax palette. `#F8F5AE` colors keywords,
`#FDC83A` string literals and `#8DE632` numeric literals, and each of the three
was measured at 100% inside the code panel. They rank lower than the six above
only because an example that contains no string has no `#FDC83A` in it.

**Two entries the census returns are not colors of this design language at all**,
and are recorded here so nothing tries to give them a role:

- `#9F9F9F`, which lands 99% in the heading band, is within 2 units of the
  halfway blend of `#414143` and `#FFFFFF`. It is the antialiased edge of the
  heading type, not a tone.
- `#545979`, which lands 96% in the code panel, is within 10 units of the halfway
  blend of `#B4BEC8` and `#000132`. It is the antialiased edge of a comment.

Three more are brand colors belonging to the social icons in the footer rather
than to the sheets: `#24292F` and `#1D9BF0`, each measured at 95% or more inside
the footer, and the gradient behind the third icon.

#### Where a sheet color and a site color disagree

The site palette above was sampled from `mark.png`. The sheets were composed
separately, and the two do not agree. Stated plainly rather than averaged:

| Sheet color | Site color | Distance | What the difference is |
| --- | --- | --- | --- |
| `#000132` | `#000133` sampled navy | 1 | One unit of blue. The sheets and the mark are the same navy to the eye and not the same value |
| `#000132` | `#020433` soft navy | 3 | The site's page navy was warmed off the sampled value; the sheets were not |
| `#4DAE51` | `#4CAE50` sampled green | 1 | One unit of red and one of blue |
| `#FFFFFF` | `#FFFFFF` sampled white | 0 | The only exact agreement |
| `#FFFFFF` | `#F8F8F9` off white | 8 | The site softens its page white; the sheets use pure white |
| `#414143` | `#414566` slate | 35 | Not the same color. The sheets' heading grey is neutral; the site's secondary text is blue-tinted |
| `#B4BEC8`, `#ADF8B7`, `#FDC83A`, `#F8F5AE`, `#8DE632` | nothing | - | The syntax palette has no counterpart in the site palette |

The first five rows are near enough that a generated sheet can adopt the site
values without looking unlike the eleven. The grey is a real divergence, and the
syntax palette is simply absent from the site's record.

#### The one place the sheets break the site's own rule

**The one substitution** above records that the mark's green reaches only 2.65:1
on the off white background, clears neither the 4.5:1 text floor nor the 3:1
boundary floor, and therefore carries nothing on a light ground.

The sheets' green reaches **2.80:1** on their white, and the footer draws the
sigil of the account handle in it, on white, inside a run of text. That is what
the site palette forbids, done on every one of the eleven.

It is recorded rather than corrected: the sheets are the repository's existing
content and nothing here repaints them. What it settles is the rule for generated
sheets, which is the site's rule unchanged. On a white ground the green is a
fill, and text that has to be read takes `#2E7534` at 5.33:1.

Every other pairing the sheets use clears its floor:

| Ink | Ground | Ratio |
| --- | --- | --- |
| `#FFFFFF` | `#000132` | 19.99:1 |
| `#ADF8B7` | `#000132` | 16.08:1 |
| `#F8F5AE` | `#000132` | 17.77:1 |
| `#FDC83A` | `#000132` | 12.85:1 |
| `#8DE632` | `#000132` | 12.85:1 |
| `#B4BEC8` | `#000132` | 10.61:1 |
| `#4DAE51` | `#000132` | 7.13:1 |
| `#000132` | `#FFFFFF` | 19.99:1 |
| `#414143` | `#FFFFFF` | 10.18:1 |
| `#4DAE51` | `#FFFFFF` | **2.80:1** |

### The faces

Four type roles repeat on every sheet. Each is measured from its own row-ink
profile: the ink height is the line's full extent, the cap or ascent height runs
from the top of the line to the baseline, and the stem is the modal width of a
horizontal ink run, which for type is the stroke.

| Role | Ink height | Cap or ascent | Stem | Stem as a share of cap | Lower band to cap |
| --- | --- | --- | --- | --- | --- |
| Masthead wordmark | 241 | 220 | 19 | 8.6% | 0.632 |
| Follow line | 201 | 154 | 19 | 12.3% | 0.675 to 0.682 |
| Title | 178 | 141 | 18 | 12.8% | 0.7376 |
| Subtitle and lead-in | 141 | 112 | 14 | 12.5% | 0.735 to 0.748 |

Three things follow, and all three are measurements rather than identifications.
No font file ships with the sheets, and **The faces are not named** below records
what happened when naming one was attempted.

- **The title, the subtitle and the lead-in are one face at two sizes.** Their
  stem-to-cap shares agree to within 0.3 points, and the title's lower band ratio
  is 0.7376 on all eleven against the lead-in's 0.7411 on all eleven, a
  difference of 0.0035. The subtitle and the lead-in are the same size as each
  other, cap for cap and stem for stem.
- **The masthead is the same skeleton at a lighter weight.** Its stem is 19 px at
  a 220 px cap where the follow line's is 19 px at a 154 px cap, so relative to
  its size it is markedly lighter. Both are set in small capitals: each carries
  two cap heights and no true x-height band. Their ratios differ because the
  follow line ends in a lowercase handle, so its lower band is a blend of a
  small-cap height and an x-height rather than a clean reading of either.
- **The code face is proportional, not monospaced.** This was tested rather than
  assumed. Splitting each code line into runs of inked columns and taking the
  gaps between run starts, a monospaced face puts every gap on one advance or a
  whole multiple of it. Measured as a fraction of that advance, the sheets miss
  by **0.186 to 0.230** on all eleven. The same statistic over the gaps between
  the code lines themselves, which do sit on one spacing, comes back at **0.007
  to 0.023** on eight of the eleven and under 0.1 on ten. A real grid and the
  glyph advances are an order of magnitude apart, which settles it.

  The sheets where the control reads higher, `MaxandMinFunctionandSortObject` at
  0.296 and `shiftAndUnshift` at 0.095, are ones where two code lines sit close
  enough for a descender to bridge them, splitting the line boxes the control
  measures. Their glyph figures, 0.198 and 0.186, are in line with the rest.

The code line spacing is the one type measurement that varies by design. It runs
from 56 to 116 px across the eleven, tracking how much code the sheet has to fit
into a panel that does not change size.

#### The faces are not named

Naming the display face was attempted and failed, which is worth recording so
nobody repeats it expecting a different answer.

The lead-in is the run to test against: its text is the same on every sheet, it
carries capitals, lowercase, an ascender and a descender, and it measures
1481 x 141 px. Rendering that string in each of the 481 fonts installed on the
machine this was measured on, trimming, and scaling each to the reference's
141 px height gives a width that a matching face would have to land near:

```bash
magick -background white -fill black -font "<family>" -pointsize 200   label:"Starting Point for Practical Use:"   -colorspace gray -threshold 60% -negate -trim +repage -resize x141 +repage out.png
```

Seventeen of the 481 come within 6% of 1481 px, and every one of them fails on
letterform once its ink is compared against the reference. The nearest three are
Tw Cen MT Condensed, which is far too light; Agency FB Bold, whose bowls are
squared where the reference's are round; and Gill Sans MT Condensed, which is
humanist where the reference is a grotesque. There is no near miss among them:
the best candidate leaves more ink unmatched than the reference contains.

So the face is a bold condensed grotesque that is not on this machine, and it
cannot be named from the artwork. What generated sheets need is in the table
above regardless: a face is specified to a renderer by its metrics, and the cap
heights, stems and lower-band ratios are all measured. A family name, when one
turns up, is a substitution to check against those numbers rather than a fact
this document is missing.

This says nothing about the page that displays the sheets, which is a separate
question settled separately under **The page's face**. Declining to name the
artwork's face is a finding; leaving the page with whatever face the browser
happened to prefer was an omission, and until 2026.09.14 one silence was
carrying both.

### Where the text sits

Every run of text falls into one of the regions above. These are the positions on
the ten sheets that share the template; `shiftAndUnshift.jpg` places its lead-in
84 px lower, as recorded above.

| Run | Region | Rows | Columns | Set |
| --- | --- | --- | --- | --- |
| Wordmark | Masthead | 133 to 373 | 550 to 2633 | Left of centre by 208.5 px |
| Title | Heading band | 589 to 766 | 501 to 3095 | Centred, within 2 px of the canvas axis |
| Subtitle | Heading band | 811 to 951 | varies with the text | Centred, within 17 px |
| Lead-in | Heading band | 1021 to 1161 | 377 to 1858 | Left, 146 px in from the spine |
| Code | Code panel | 1235 onward | varies with the code | Left, at no fixed inset |
| Follow line | Footer | 3325 to 3525 | 603 to 3325 | Left, 311 px in from the mark square |

Four of those runs are fixed text and measure identically on every sheet: the
wordmark at 2084 px wide, the title at 2595, the lead-in at 1481 and the follow
line at 2723, each to within one pixel. Two carry the sheet's own subject and
vary: the subtitle, which is centred so its width is free, and the code.

The title is the run that fixes the heading band's geometry. It is centred on the
canvas, 2595 px wide, and leaves 81 px to the left flanking rule and 85 px to the
right one, so the rules and the title were placed against each other rather than
independently.

The mark square in the footer is 292 x 339, flush to the bottom left corner, and
the follow line clears it by 311 px and ends 275 px short of the right edge.

### The step the sheets are drawn to

The site lays out on an 8px step. A sheet is displayed at 600 px wide, so one
site pixel is 6.0017 sheet pixels and the site's step is **48 sheet pixels**.

That step divides the canvas exactly. 3600 is 75 steps of 48, which is why the
one pixel of export rounding is worth naming: **a generated sheet should be
composed at 3600, not 3601.**

Snapped to the step, the five bands close on the canvas with nothing left over:

| Band | Measured | Site px | Token | Steps | Residual at display size |
| --- | --- | --- | --- | --- | --- |
| Masthead | 527 | 87.81 | 528 | 11 | +0.19 px |
| Heading band | 662 | 110.30 | 672 | 14 | +1.70 px |
| Code panel | 2027 | 337.74 | 2016 | 42 | -1.74 px |
| Divider | 45 | 7.50 | 48 | 1 | +0.50 px |
| Footer | 339 | 56.48 | 336 | 7 | -0.48 px |

528 + 672 + 2016 + 48 + 336 is 3600, and 11 + 14 + 42 + 1 + 7 is 75. No band is
more than 1.74 display pixels from the step, which is under a quarter of one.

**The divisions across the canvas do not close, and that has to be said rather
than rounded away.** Snapping each to its nearest step gives 240 + 3120 + 288 =
3648, a full step over the canvas. The grid below drops the panel to 64 steps so
the row closes, which is the cheapest of the three corrections and the only one
that puts no extra error on a margin:

| Division | Measured | Site px | Token | Steps | Residual at display size |
| --- | --- | --- | --- | --- | --- |
| Green spine | 231 | 38.49 | 240 | 5 | +1.51 px |
| Code panel | 3100 | 516.52 | 3072 | 64 | -4.52 px |
| Right margin | 270 | 44.99 | 288 | 6 | +3.01 px |

A generated sheet will therefore sit up to 4.5 display pixels off the eleven
across the canvas, against 1.7 down it. That is the cost of the sheets and the
page agreeing on one step, and it is the trade this record takes.

#### The tokens

One set, in multiples of the step, with the largest distance any sheet sits from
each. Sheet values are for a 3600 px composition; the site column is the same
token at display size.

| Token | Sheet px | Site px | Steps | What the sheets use it for | Worst residual |
| --- | --- | --- | --- | --- | --- |
| `step` | 48 | 8 | 1 | The divider's height, the gap between the two flanking rules, the gap from the title to the subtitle | 0.67 px |
| `step-2` | 96 | 16 | 2 | The gutter from a flanking rule to the title | 2.50 px |
| `step-3` | 144 | 24 | 3 | The masthead's padding above and below the wordmark, the lead-in's inset from the spine | 1.84 px |
| `step-4` | 192 | 32 | 4 | How far the spine starts above the code panel | 2.82 px |
| `step-6` | 288 | 48 | 6 | The right margin, the follow line's inset from the mark square | 3.82 px |
| `step-9` | 432 | 72 | 9 | The width of each flanking rule | 2.02 px |
| `step-10` | 480 | 80 | 10 | The title's left margin | 3.48 px |

`step-6` and `step-10` are where the hand composition sits furthest from any
step, and both are horizontal. Nothing vertical misses by more than 2.82 px.

Two gaps a reader would expect in that table are absent, because neither is on
the step and putting them there would have hidden it:

- **The code panel's top padding**, from the panel's edge to the first row of
  code, runs from 37 to 152 sheet px across the eleven - 6.16 to 25.33 at
  display size. It is the same finding as **Nothing inside the code panel
  repeats** above, seen from the other side.
- **The footer's bottom padding**, from the follow line to the foot of the
  canvas, is 74 or 75 sheet px, which is 12.33 to 12.50 at display size. It is
  a step and a half, and it lands on no token in this set.

Type sizes are not tokenised, because the sheets carry no scale to tokenise. The
four measured cap heights are 220, 154, 141 and 112 sheet pixels, which is 36.66,
25.66, 23.49 and 18.66 at display size, and the steps between them - 1.26, 1.13
and 1.20 - are not one ratio. They are four sizes chosen by hand, and a generated
sheet should take them as the four measured values rather than reconstruct a
scale that was never there.

## Graphics

No stock imagery. The cheatsheet sheets are the repository's own content and
their composition is recorded under **The sheets** above; any mark the site
needs beyond them is drawn in SVG or CSS from the palette above.

## The icon

`favicon.ico` is a real ICO carrying three square frames - 16, 32 and 48
pixels - at the sizes browsers ask for. It is derived from `mark.png` and
nothing else.

The derivation, so the icon can be rebuilt from the artwork:

| Step | Value | Why |
| --- | --- | --- |
| Crop | `413x413+2+3` | The artwork carries a 2-3px white export margin. The mark inside it is exactly square, so the crop needs no distortion and no dropped row |
| Bleed | Full | The mark is a filled square, so it fills the frame. A 16px icon cannot spare 12% of its width on a margin that was never part of the mark |
| Filter | Box, in sRGB | Averaging over the source area cannot overshoot, so no halo appears along the N, and it leaves the three sampled colors **exactly** as counted above |
| Frames | 16, 32, 48, 8-bit | Each frame holds under 256 colors, so the palette is lossless and the file is smaller than the artwork it came from |

Two filters were rejected against the table above rather than by eye.
Averaging in linear light washed the navy ground toward grey, because the
white highlight dominates a linear average. Sigmoidal contrast and levels
sharpened the 16px frame, but moved the figure green off `#4CAE50` - to
`#44B549` and `#42B747` - and a palette this document calls sampled cannot
be quietly resampled. Lanczos and an unsharp pass both rang along the
navy edges.

Holding the three sampled colors did not separate the candidates on its own.
Every filter tried reproduces `#000133`, `#4CAE50` and `#FFFFFF` exactly at
16px, apart from Lanczos in linear light, which drops the navy, and the
sigmoidal and levels passes above. Box was chosen on the two rejections
recorded here rather than on the palette.

At 16px the N softens; that is inherent to a 26:1 reduction of a slab
letterform, and what still reads at tab size is the green and navy split
square, which is the mark's strongest signal.
