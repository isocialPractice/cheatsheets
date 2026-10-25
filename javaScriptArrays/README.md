# The eleven reference images

These are not any cheatsheet's deliverable, and nothing in the repository
serves them. They are kept for two reasons.

**They are what the global design language was measured off.** Every figure in
[DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md) - the palette and its shares, the
type scale, the strokes, the radii, the five bands down the canvas - was read
back off these eleven files rather than chosen.
`tools/test-sheet-composition.mjs` re-measures them against those tables, by
running `tools/measure-sheet-composition.mjs` over every `.jpg` in this folder,
so they are the evidence the record rests on and not a copy of it. ImageMagick
decodes the images, and without it on `PATH` every case there skips with that as
its stated reason rather than passing on nothing.

**They are what a composed sheet is aimed at reproducing.** They were composed
by hand, before anything here could compose one. A cheatsheet today is a
`sheet.json` drawn in the browser through `api/cheatsheet/`, and these are the
record of what that output is being held to.

So they stay exactly as they are, as JPEG, at the roughly 20 MB the eleven
total. Converting them would buy nothing - no page weight depends on them any
more - and it would break the suite that holds the extraction, because the
tables were measured against these bytes.

The examples the sheets illustrate are live, under
[`javascript/arrays/`](../javascript/arrays/), one folder per cheatsheet. Those
are what the page offers; these are the reference behind them.

## Where a sheet is allowed to stop matching its image

A sheet that transcribes one of these is held to the same rules as any other,
and the two met on 2026.10.25 over indentation. **An indent is a level, and a
column is not addressable** in [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md) says
a `code` line is indented one nesting level past the line it continues, never
padded with spaces to sit under a value in the line above - because the panel
is set in a proportional face, where no count of spaces reaches a position
inside another line. These images are set in that same face, so a column
written as padding is not drawn where it was aimed here either. Two of the
sheets under [`javascript/arrays/`](../javascript/arrays/) were written against
the image rather than against that rule, and they went opposite ways.

**`sort-numbers-array` was re-indented, and lost no column by it.** Its row 13
padded `b.sort(` with eight spaces to sit under the `a.sort(` of row 12. In
`SortNumbersArray.jpg` that pair really is aligned - 3 units apart at the
artwork's own 3601 px scale, which is 0.75 px at the page's 900 px cap - but
the composed panel drew the same pair **16.102 px** apart, measured in Chromium
on 2026.10.24. The padding was what broke the artwork's column rather than what
preserved it, so the line is indented one level now and the panel is nearer the
image than it was.

**`max-and-min-function-and-sort-object` was kept exactly as transcribed.** It
declares four indents where the ladder rule allows a multiple of one unit, and
that is not a padded column: measured the same day, not one of its lines aims
at a position inside the line above, so the defect the rule stands proxy for is
absent from it. The four come straight off
`MaxandMinFunctionandSortObject.jpg`, which draws the `cars` rows one space in,
the sort body three and the closing `return 0;    });` four. Re-indenting it
would move three of its rows off the image it reproduces, for no gain a reader
could see. It is on record as the one standing exception, in `NOT_A_LADDER` in
`tools/test-sheet-indent-columns-browser.mjs`, which fails on any sheet that is
not listed there.

**The rule reaches the panel, not the payload.** A `sheet.json` is drawn in a
proportional face; the `.js` beside it is read in whatever monospace editor
opens it, where eight spaces under ` return ` land exactly where they were
counted to. So `sort-numbers-array.js` keeps the artwork's alignment on that
line while the panel takes the nesting level, and the two differ there on
purpose.

| Image | The cheatsheet it was composed for |
| --- | --- |
| `shiftAndUnshift.jpg` | Shift And Unshift |
| `ChangingElements.jpg` | Changing Elements |
| `SplicingArrays.jpg` | Splicing Arrays |
| `ConcatingArrays.jpg` | Concating Arrays |
| `SlicingArrays.jpg` | Slicing Arrays |
| `SortingArrays.jpg` | Sorting Arrays |
| `SortNumbersArray.jpg` | Sort Numbers Array |
| `CompareArrayFunction.jpg` | Compare Array Function |
| `RandomSortArray.jpg` | Random Sort Array |
| `MaxandMinValueArray.jpg` | Max and Min Value Array |
| `MaxandMinFunctionandSortObject.jpg` | Max and Min Function and Sort Object |

The names predate the lower case kebab convention the catalog is held to, and
they are left alone deliberately: this folder holds no `sheet.json`, so the
catalog walk never reaches it and no path rule is applied to it. Renaming them
would change the evidence without improving anything.
