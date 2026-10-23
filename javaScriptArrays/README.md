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
