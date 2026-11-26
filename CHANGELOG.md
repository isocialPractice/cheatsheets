# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> 19 earlier entries in `CHANGELOG-2026.md`, newest first.

## The versioning changed on 2026.11.02

**Every version below `1.0.0-alpha.1.0.0` is a date, and every version from it is
semantic.** The repository recorded its changes by the date they were applied,
written `YYYY.MM.DD`, for as long as there was nothing to version: the
deliverable was a page and a folder of images, and a semantic version of those
would have been a number nobody could read a promise out of.

What changed is that there is an API. **Implement Cheatsheet API** is finished
as of 2026.11.02 - the document, theme and layout models, the configuration
surface, the five output formats, the command line, and the tests that render a
fixture document to every format and compare it against committed output - so
there is now a public surface a caller writes against, and a version is the
only honest way to say what moved under them.

`1.0.0-alpha` carries the pre-release suffix on purpose. The surface is whole
and its shape is settled, and `alpha` is the statement that it has not yet been
depended on from outside this repository.

**Every semantic version is written `1.0.0-alpha.X.Y.Z`, since 2026.11.10.**
The core `1.0.0` is the release being worked towards and holds while the stage
is `alpha`; the work moves the triple after it. The versions before that day
were written `X.Y.Z-alpha` and were relabelled to the same triple - `1.8.0-alpha`
is `1.0.0-alpha.1.8.0`, and `1.0.0-alpha`, the first, is `1.0.0-alpha.1.0.0` -
with their tags and their GitHub releases renamed to match.

**The dated sections stay exactly as they are.** They are the record of how the
design language was measured, how the catalog was built and how the API was
written, and renumbering them as versions would invent promises that were never
made. Read the heading form to know which kind you are looking at: a component
of four digits that scans as a year is a date.

## [1.0.0-alpha.1.14.2]

A demo's two tones carry the meaning a reader reads a line by - the accent
reports, the amber refuses - and nothing in the suite held a refusal to the
amber. The 28 cases over the nine demos were green with that question entirely
open.

A patch, for the reason `1.0.0-alpha.1.14.1` was one: what moves is the ground a
reader stands on. No published surface changes shape, no demo behaves
differently, and no sheet is drawn differently - the one line in the committed
catalog that names a clamp was already correct, and the fix is to the check that
could not see it.

### Added

- **A ninth claim a demo answers: a line that names the clamp is drawn as a
  refusal.** `READ_CLAIMS` in `tools/test-demo-pages-browser.mjs` now carries
  each line's tone beside its text, as `READ_LOG` beside it always has, and the
  narration walk holds every line matching `CLAMPED` to `REFUSED` rather than
  `REPORTED`. What was missing is that the two walks read a line's tone and its
  wording in different places and never together. The pressing pass collects
  `unreported` against both colours at once, so what it rules out is a line
  drawn in the body ink - a page writing into the panel from somewhere other
  than its own two reporters - and nothing about which of the two a given line
  should be. The narration walk reads what a line *says*, and takes a line
  naming the clamp as the excuse that lets a width the layout did not take pass
  both of its width claims. So that excuse was granted on wording alone, and a
  clamp reported in the accent - a refusal drawn as a report of a width that
  took - was green in all 28. The regex deciding what counts as naming the
  clamp, both colour constants and the tone reader were already in the file, so
  the claim adds no vocabulary; the assertion sits ahead of the two width claims
  it underwrites, because that is what makes their excuse honest. Measured
  against the defect by writing the line through `report`: it fails twice at the
  288px frame with *`grow press 1 says "asked for 256.00px and got 240.00px:
  max-width clamped it" in rgb(76, 174, 80) - a line naming the clamp is a
  refusal, so it is drawn in rgb(253, 200, 58) and not the accent rgb(76, 174,
  80)`*, and through `warn` as `#grow` in
  `javascript/elements/measuring-and-styling/demo/index.html` writes it the file
  is 28 of 28 again. That is the one line in the committed catalog the regex
  matches, and it is the clamp the narration walk excused on its first day.

### Changed

- **The brief now says what a new demo does with a refusal, not only that it
  reports one.** **Say only what the page did** in `CONTRIBUTING.md` carries the
  third claim the narration walk makes and a third thing that follows for a new
  demo: write the refusal through the demo's own `warn` rather than its
  `report`, so the line a reader reads as a refusal is one. The claim count
  moves from eight to nine where it is stated - the list at the head of
  `tools/test-demo-pages-browser.mjs`, the narration walk's own list further
  down it, and **New Cheatsheets** in `TODO.md`, which now names the tone beside
  the document as what a demo's lines are read against.

## [1.0.0-alpha.1.14.1]

Two of the four **JS Elements** demos printed a line the document did not bear
out, and the 19 cases over them were green because each pressed every control
once, at one width.

A patch, for the reason `1.0.0-alpha.1.13.2` was one: a reader was told
something untrue. No published surface moves, nothing a caller writes against
changes shape, and no sheet is drawn differently. What is new is that a demo's
log panel is now read against the document it describes, where before a line
was held only to existing, in one of the two tones, with nothing thrown.

### Fixed

- **"Grow, then measure" reported a width `max-width: 100%` had clamped away.**
  `#panel` in `javascript/elements/measuring-and-styling/demo/index.html` is
  `width: 17.5rem` with `max-width: 100%`, and `#grow` read the box, wrote
  sixteen pixels onto it and read it back. Once the write passed the body's
  content box the used width stopped following it, and because the next press
  read `before` off the clamped box, `before + 16` was the same figure every
  time: at a 390px viewport press 2 reported `width 296.00px then 308.00px`
  under `the write landed: "312px"`, and from press 3 it printed `width 308.00px
  then 308.00px` with the inline width stuck at `324px`, still closing on *each
  read after a write lays the page out again*. At 320px it was wrong on the
  first press. The control's lesson - read, write, read, and the second read
  cannot be served from the last layout - read as a demonstration that a write
  changes nothing. The next width is now asked for from the last value asked
  for rather than from the box just measured, and where the two part company the
  panel says so in the refusal amber: `asked for 254.00px and got 238.00px:
  max-width clamped it`. A clamp reported is worth more than a clamp avoided,
  since the used width not being the specified width is the same lesson one
  layer in and the reason a rect is being read there at all. Measured at all
  four widths the page frames the demo at, six presses each: no press reports a
  figure it did not measure, and `#restore` still recovers the panel.
- **"Insert markup" reported `2 child element`.** `#markup` in
  `javascript/elements/creating-and-inserting/demo/index.html` hardcoded the
  singular, so press 1 read `and holds 1 child element` and was right while
  press 2 read `and holds 2 child element` and press 3 `and holds 3 child
  element`. The noun is read off the count.

### Added

- **`tools/test-demo-pages-browser.mjs` presses twice, at both of the frame's
  widths, and reads the panel against the document.** The eighth claim a demo
  answers, and the first that is about what a press *said* rather than that it
  answered at all. Neither defect above was reachable from the two walks already
  there: both frame a demo at `736` by `672`, the wide layout's box, and press
  each control once. The file now carries both boxes the page produces - the
  wide one and `288` by `832`, which is the frame below the 768px breakpoint on
  the smallest phone the page is drawn for - with the box named in the harness
  route's query, so one route serves both and a request naming none still gets
  the wide layout the framed walk has always used. Each control is pressed twice
  at each box and held to two claims, neither of them about a particular demo:
  a width a line says landed is a width something in the document measures,
  within half a pixel, or a line says the write was clamped; and where one
  press's count is 1 and the next press's is not, the words after the figure
  have to have changed. The widths are read off whichever element bears an
  inline pixel width rather than off a selector the file names, and only off an
  element this press wrote, so a clamped width an earlier control left behind is
  not reported once per control after it. The count is read across two presses
  rather than against the document because `and holds 2 child element` reports
  the count the document holds: what was wrong was the agreement, and watching
  one line's count cross 1 is the only way to see that without a dictionary of
  every noun a demo might count. Against the two defects it fails with
  *`grow press 1 says "the write landed: \"256px\"", and nothing in the document
  measures 256px`* and *`markup reports "and holds 1 child element" then "and
  holds 2 child element", so the count went from 1 to 2 and "child" did not
  follow it`*, and with them fixed the file is 28 of 28. Two more page loads per
  demo, both in series and each closed, which took this file from 47s to 128s;
  the contention recorded further up it was pages open at once rather than a
  file's length, so what the rest of the suite sees is unchanged.

## [1.0.0-alpha.1.14.0]

The next two content items of **New Cheatsheets** `->` **JavaScript**, taken
together because they are one batch: **JS Elements** at `javascript/elements/`
as four cheatsheets, and **JS Math** at `javascript/math/` as three. The catalog
goes from 37 cheatsheets in two categories to 44, and the `javascript` category
carries its first `embed` payloads.

A minor rather than a patch, for the reason `1.0.0-alpha.1.13.0` was one: a
batch is a **set**, and the repository is maintained under a standing rule that
every new set is drawn in a design of its own rather than in the one the set
before it used. So there is a fourth entry in `SET_COMPOSITIONS` -
`javascript-elements`, cyan on slate - and it is published surface in the same
sense the third was: a caller naming that id in a document gets that design.

**Two of the three checks over a composition were the third composition's
rather than any composition's**, and a fourth set is what made that visible.
Neither was wrong about the third; both would have passed the fourth while
reading nothing of it, or failed it for being a different design. Both are now
generated per composed set.

### Added

- **`javascript-elements`, the fourth set composition: cyan on slate, receding
  masthead.** Its own palette, type scale, grid and panel freedom, recorded in
  full under **Set compositions** in `DESIGN_LANGUAGE.md` with the measured
  contrast ratio of every pairing. The accent is a cyan at 1.85:1 on paper, so
  the substitution is live as it is in both palettes before it - `#0A6B64` is
  that cyan darkened to 6.36:1. The ground is a slate of the accent's own
  temperature, which puts the three designs at three temperatures rather than
  three hues: the recorded green is the warm-neutral middle of the wheel, the
  third's amber its warm end, and this its cool one. The six panel inks are
  built outward from the accent rather than across it, the lowest of them
  reaching 6.39:1 against the 4.5:1 text floor.
- **The masthead recedes in its type scale, which is the treatment.** Every cap
  is the lead-in's 112 at a stated factor - 1, 1.25, 1.375, 1.5 - so nothing in
  the scale is chosen. The order is the artwork's own, masthead to lead-in, and
  what changes is the span: the recorded scale runs 112 to 220 and the third 112
  to 196, where this runs 112 to 168. The brand wordmark stops being the largest
  thing on the sheet by a margin, which is what a reference sheet wants - these
  are gone to for a call signature rather than read at a glance.
- **A wider rail, and one step more code field.** The rail takes two steps from
  the panel, to seven, and is the one region in this composition that gains
  anything: a reference sheet is read down its left edge. The heading band gives
  a step to the code field rather than taking two from the masthead as the third
  did, because a title below the follow line needs less room than the artwork's
  fourteen steps rather than more - so the masthead band, the divider, the
  footer and the right margin are all the artwork's, untouched.
- **The footer band does not move at all, and one inset does.** The follow line
  is set at the artwork's own 154 px cap, where the third sets it at 140, so it
  is the one run on the sheet with no room to give: six steps between the mark
  square and the follow line leaves 2736 px of measure, the line measures
  2797.27 at that cap, and every sheet of the first two sets carries a note
  saying it was stepped down to 150 to get in. This composition keeps the cap and buys the room - four steps
  off the mark rather than six, which is 2832 px and fits. Narrowing the mark
  square was the alternative and is the wrong one: the square is the footer's
  own link area, so a sheet whose follow line fitted would be a sheet whose
  brand was harder to press.
- **Four cheatsheets under JS Elements** - *Creating and Inserting*,
  *Attributes and Properties*, *Finding and Traversing* and *Measuring and
  Styling* - and **three under JS Math** - *Rounding and Precision*, *Random and
  Ranges* and *Powers and Logs*. The four are `kind: embed`, which this category
  had none of: each carries a `demo/index.html` a reader presses, held by
  `tools/test-demo-pages-browser.mjs` to the seven claims a demo answers,
  directly and again inside the sandbox the page frames one in. The three are
  `kind: run`, so every output claim in them is checked against what the example
  logs.
- **Every one of the seven is 24 rows, and the figure is the composition's.** At
  the widest top padding a seed may choose, this panel has 1776 px for the
  block: 24 rows sit at 74.6 px of spacing and 25 fall under the 72 px floor,
  while nineteen is the other end of the window, where the 85% fill floor stops
  being reachable. The seven compose at 74.34 to 76.01 px of spacing and 0.851 to
  0.870 of fill, with every title at the 140 px cap the scale names and no
  display run stepped down anywhere in the set.

### Changed

- **`tools/test-set-compositions.mjs` reads every composed set's record, not
  one set's.** It held a `THIRD` constant and every figure case read that one
  composition's section, so a fourth set arrived carrying a full record of its
  own that nothing read - the one state a record check must not reach, because
  the figures look held while the cases that are green are over the set before
  them. The composed sets are now derived from `SET_COMPOSITIONS` and the cases
  are generated per set, so a fifth reaches them by existing.
- **And it resolves each heading inside that set's own record section.** Two
  compositions head their palette table with the same words, so a heading looked
  up across the whole document finds the first: the fourth composition's palette
  would have been checked against the third's table and reported correct.
  Passing by reading the wrong half of a document is worse than failing, so the
  composition's section is found first, by the id and title it is headed with,
  and every figure is read within it.
- **`tools/test-set-composition-browser.mjs` reads the display order off the
  set's own scale.** It asserted that the title leads the wordmark, which is the
  third composition's treatment and not a property of a composition - so it
  failed the fourth for bringing its masthead down to second, which is that
  set's whole point. What generalises is that the drawn sizes follow the scale
  the set records, pairwise, which still catches a run stepped down to fit its
  measure or a scale that reached the page half applied.
- **A treatment is held per set rather than dropped.** The factors are the whole
  of why either composed composition exists, and a scale that lost its treatment
  would pass every figure in the table above it. So the record check carries one
  entry per composed set naming the claim that set's factors make, and a new set
  adds one: without it the case fails rather than passing a scale nothing states
  a treatment for. `CONTRIBUTING.md` and `docs/adding-to-the-catalog.html` say
  so where a contributor reads them.
- **The record's listing heading no longer counts the compositions.** It read
  *The three*, and it is the heading the record check finds that table by, so a
  count in it is a figure that goes stale in the one place where going stale
  also breaks the check. The table below it is what says how many there are.
- **The frame heights are recorded as measured from the five demos that set
  them, and a demo added since is measured against them.** `index.html` and
  `CONTRIBUTING.md` both read as though every committed demo had been measured
  for the figures, which was true of five and is not of nine. The four new ones
  reach 514 px wide and 753 px narrow at their tallest, both inside the 672 and
  832 the frame is fixed at, so `element-observers` is still the demo that set
  them and neither figure moves.

## [1.0.0-alpha.1.13.2]

The word `green` in the section that defines the amber set, and the reason
nothing in 47 cases over that section noticed it.

A patch, and for a plainer reason than the two before it: a reader of the
record was told the wrong colour for one sheet element. No published surface
moves, nothing a caller writes against changes shape, and no sheet is drawn
differently. What is new is that the record's prose is now read against the
composition, where before only its tables were.

### Fixed

- **The third composition's record calls its rail amber, which is the colour
  it is drawn in.** Under `### javascript-general: amber on indigo, titled` in
  `DESIGN_LANGUAGE.md`, the paragraph that divides the 75 steps closed on *"So
  the sheet is a narrower green rail beside a wider panel"*. The rail is the
  spine, the spine is painted the `green` role, and that role is `#F2A33C` in
  this composition - so the one sentence a reader of that section reaches for
  to know what the sheet looks like named the colour of a different set. The
  word is a carry-over: the paragraph was written by editing the recorded
  composition's, where the rail is `#4DAE51` and *green* is right. The role
  token keeps its name, since it is the accent slot rather than a claim about a
  hue, so `api/cheatsheet/compositions.mjs` and `api/cheatsheet/theme.mjs` are
  untouched and the palette table in the same section already gave the hex.

### Added

- **`tools/test-set-compositions.mjs` reads the record's prose where it says
  what the accent draws.** Every case in that file compares a figure against a
  table, which is why all 47 passed over a section whose palette table was
  right and whose paragraph was wrong: a table holds the hex and a paragraph
  holds the word, and nothing read the word. The new case takes each region of
  the record that has an accent of its own - everything above `## Set
  compositions` for the recorded composition, and each set composition's own
  record section - and holds every accent word the record attaches to a shape
  the accent fills, the rail or spine, the divider and the rules flanking the
  title, to that region's own accent. The word for a set composition comes from
  its title, which already states it; the recorded composition's is the palette
  role's own name, which is the one composition where the token and the colour
  are the same string. A backticked `green` is skipped, being the role every
  composition carries. The words it looks for are the accents the repository
  has, because a carry-over can only bring a word that is already one of them,
  and it asserts that both regions were matched, so a pattern gone stale
  against how the record words these sentences cannot report a clean record it
  never read. Against the sentence as it stood it fails with *`javascript-general:
  a green rail, where its accent is amber`*.

## [1.0.0-alpha.1.13.1]

The two faults the UI/UX tester found in `javascript-general` the day it
shipped, and the check that found them, promoted out of a working folder and
into the suite.

Both were differences between a figure and what an engine draws from it, which
is why `tools/test-set-compositions.mjs` passed 47 of 47 against a composition
that was collapsing its own title into its own subtitle on two of nine sheets.
That file reads the record against `DESIGN_LANGUAGE.md`, and the record was
right. A patch rather than a minor: no published surface moves, nothing a
caller writes against changes shape, and what is new is what the repository can
see when a set is composed.

### Fixed

- **A display run is stepped by the descender it has to clear, not by a flat
  step.** The three runs of the third composition's heading band are a stack,
  and each sat a `STEP` of 48 px under the baseline above it - a constant, where
  the thing it has to clear is a share of the cap above it. At that set's 196 px
  title cap a descender reaches 59.70 px, so whether a sheet's title collided
  with its own subtitle was decided by whether that title happened to carry a
  `g`, `y`, `p` or `j`. Measured off the raster at the sheet's own 3600 px, with
  each run drawn alone and scanned column by column, **Errors and Debugging**
  ran 8 px of descender into the ascenders below it over 14 columns and
  **Comparing Values** touched over 4; the seven that cleared did so by 18 to 46
  px against the recorded composition's 75 to 96. The gap is now the descent the
  run's own cap implies - the face's 219 unit descender over its 719 unit cap
  height, so 0.3046 of any cap - plus 0.2699 of that cap of clear paper, which
  is the narrower of the two clearances the recorded stack leaves below a display
  run and therefore the one the artwork proves is enough. 112.60 px under the
  title and 64.34 px under the subtitle, and the clearance now holds whatever a
  title says and whatever cap a later composition puts it at.
- **The heading band takes the two steps that stack needs, and the masthead pays
  for them.** The band was 13 steps and the stack now reaches 1135.05 px from a
  band starting at 432, so it is 15. The alternative was stepping the title down
  to fit, and all nine titles drawn at one cap is the treatment the set exists
  for. The masthead gives up two of its ten - it holds a 242 px lockup in what
  the artwork gives 528 - one to the heading band and one to the code field,
  which goes from 44 steps to 43. Both totals still hold at 75 steps, so the
  bands tile the canvas and the columns do. The masthead's lockup comes up half a
  step, to `2.5`, so the paper above and below it keeps very nearly the
  proportion it had: 120 px and 70 against 144 and 94. Where the steps came from
  was measured rather than chosen - at 42 steps of code field five of the nine
  set their lines at 68.8 to 71.6 px, under the 72 px floor the set's own panel
  freedom allows, and at 41 all nine do. The nine now measure 72.2 to 74.4 px of
  line spacing and 0.863 to 0.899 of panel fill, with nothing stepped down.
- **The footer slot's width is the brand strip's own aspect, not a column of the
  grid.** `placeBrand` draws every brand raster `xMidYMid meet`, so a slot whose
  aspect is wider than the strip's centres the strip and leaves bare paper down
  the trim. The slot was the canvas less a right margin this composition had
  narrowed from six steps to five, which widened it to 3360 x 336 against the
  799 x 81 strip's 9.8642 and stood the brand mark 22.81 px off the left trim -
  a notch of paper under a divider that runs 0 to 3600 and beside a rail that
  starts at 0, on all nine sheets. Sampled off the raster at (8, 3400) it read
  `#FFFFFF` on a sheet of this set against `#000133` on a recorded one. The width
  is now the strip's aspect at the band's height rounded **down** to the step,
  which comes to the same 3312 the recorded composition arrives at from its own
  six step margin and is why the artwork's footer sits flush. Down rather than
  nearest because the mark sits on the trim only while the slot is no wider in
  aspect than the strip. `footerLinkAreas` reads the same letterbox off the same
  slot, so the four footer links followed the strip and needed no change.

### Added

- **`tools/test-set-composition-browser.mjs`**, which composes every sheet
  naming a set composition in a real engine and measures what was drawn. Four
  claims per set: that no two display runs' ink shares a column, and that the
  record's own gaps clear the descent of the run above them; that a brand
  raster's drawn left edge sits on the trim with the divider and the rail; that
  the title leads the wordmark and every title of the set is drawn at one cap;
  and that the panel's top padding, leftmost inset and line spacing all stay
  inside the set's own `panelFreedom`. It takes its subjects from
  `cheatsheets.json` rather than from a list, so a new set reaches it by
  existing.
- **The ink is read off a raster, because the boxes cannot see a collision.**
  Each display run is serialised alone over the paper, rasterised at the sheet's
  own 3600 px and scanned for the topmost and bottommost inked row in all 3600
  columns, and the answer per pair is the narrowest gap in any column where both
  runs have ink. Neither `getBBox` nor `getExtentOfChar` can answer it: both
  report the face's full ascent and descent, so both said the title and the
  subtitle overlapped by the same 40.4 px on all nine sheets whatever words were
  set, and that constancy is the tell. Reverting either fix puts the case red
  with the figure the tester reported - 22.81 px of letterbox, and
  **Comparing Values** touching over 4 columns at x=1974.
- The record carries both in `DESIGN_LANGUAGE.md` under **javascript-general**:
  **The display stack, and the descender each gap clears**, and **The footer
  slot, which the strip's aspect sets**, each with the table of figures it was
  measured at. `CONTRIBUTING.md` and `docs/adding-to-the-catalog.html` name the
  second check beside the first, with what a new set finds out from it.

## [1.0.0-alpha.1.13.0]

The first two content items of **New Cheatsheets** `->` **JavaScript**, taken
together because they are one batch: **General JavaScript Overview** at
`javascript/general-javascript-overview/` as six cheatsheets, and **JS Dates**
at `javascript/dates/` as three. The catalog goes from 28 cheatsheets in two
categories to 37.

A minor rather than a patch, because nine new documents are not what is new
here. A batch is a **set**, and the repository is maintained under a standing
rule that every new set is drawn in a design of its own - its own layout, type
treatment and colour - rather than in the one the set before it used. There was
nowhere to put that: `composeSheet` took a theme and a layout from its
**caller**, and the two callers that matter pass neither, so a design could be
handed to one sheet from a command line and to no sheet from the page. A sheet
now names its composition in its own document and `api/cheatsheet/compositions.mjs`
is what the name resolves to, which is new published surface -
`SET_COMPOSITIONS`, `SET_COMPOSITION_IDS`, `compositionNamed` and
`compositionOf`, with `composition` added to both document shapes.

### Added

- **A document may name the set composition it is drawn in**, as `composition`,
  by the id `api/cheatsheet/compositions.mjs` records it under. `composeSheet`
  resolves it to that set's own theme and layout, so a sheet is drawn in its
  set's design wherever it is composed rather than wherever a caller remembered
  to pass one. **A document naming none is the recorded composition**, which is
  what the twenty-eight sheets written before this carry, and they still take
  the path they always took - the shared `SHEET_THEME` and `SHEET_LAYOUT`
  objects, not a fresh derivation of them.
- **An entry is a design language record, and its theme and layout are derived
  from it** by `themeFrom` and `layoutFor`, which is how `SHEET_THEME` and
  `SHEET_LAYOUT` are derived. A theme object beside a layout object was the
  obvious shape and the wrong one: a band moved in one and not the other is a
  row at the wrong height with the runs still placed against the old one. Held
  this way a composition cannot be internally inconsistent, because there is
  one statement of where that band is.
- **`javascript-general`, the third set composition: amber on indigo, titled.**
  Its own palette, type scale, grid and panel freedom, recorded in full under
  **Set compositions** in `DESIGN_LANGUAGE.md` with the measured contrast ratio
  of every pairing. The accent moves from the recorded green to an amber at
  2.08:1 on paper, which puts the substitution live for exactly the reason it is
  live in the recorded palette - `#8A4B06` is that amber darkened to 6.80:1 and
  `readableInk` swaps it in for any accent run set on white. The six panel inks
  are a tint of the accent and a tint of its complement either side of a
  near-white plain, the lowest of them reaching 6.23:1 against the 4.5:1 text
  floor.
- **The title leads its type scale, which is the treatment.** Every cap is the
  lead-in's 112 at a stated factor - 1, 1.25, 1.5, 1.75 - and every stem is that
  cap at the share the recorded role already carries, so nothing in the scale is
  chosen. The recorded scale is led by the masthead at 220 because artwork is
  read one sheet at a time; this set is read three to a row on a profile grid,
  where what has to carry at a thumbnail's size is which cheatsheet a tile is.
- **Six cheatsheets under General JavaScript Overview** - *Values and Types*,
  *Comparing Values*, *Functions and Scope*, *Strings and Templates*,
  *Destructuring* and *Errors and Debugging* - and **three under JS Dates** -
  *Making a Date*, *Reading a Date* and *Date Arithmetic*. All nine are
  `kind: run`, so each carries a payload a browser injects, and every output
  claim in every one of them is checked against what the example logs.
- **The dates sheets are written in UTC throughout**, which is the subject
  rather than a caution about the suite: a date is a count of milliseconds, and
  `Date.UTC`, `toISOString` and the UTC getters are the parts of the API that
  mean the same thing in every zone. The three claims that could only be made
  about the reader's own zone are marked as remarks instead of being made.
- **`cheatsheets.json` carries `composition` on an entry that names one**, for
  the reason it carries `seed`: it is a property of the document that decides
  what the picture looks like, so a reader of the catalog can see which set a
  sheet belongs to without opening nine files.
- **`tools/test-set-compositions.mjs`** reads the record and the module against
  each other - every colour, every measured ratio, every cap, every stem and
  both step tables - and holds the two rules the record states rather than
  measures: every composition carries the recorded floors, and a composition
  drawn after the mechanism landed is not one an earlier set already used. It
  also pins the count of sheets naming no composition at twenty-eight, so a new
  sheet that forgot the field fails rather than composing in a design another
  set already used.
- **`tools/test-javascript-sheet-roles.mjs`** holds every composed `javascript`
  sheet to the per-line role rule its own language fixes, which nothing was
  doing: `tools/test-sheet-syntax-roles.mjs` reads `html-css` only, and the rule
  belongs to a language rather than to a category. The eleven
  `javaScriptArrays` sheets are on record as the one exemption, with the figure
  that makes the case - against the rule they report 146 departures across 238
  non-blank lines, because they transcribe artwork that predates the mapping by
  a month.

### Changed

- **The panel's freedom is narrowed for the set, and that is where its
  consistency is bought.** The recorded ranges are what eleven hand composed
  sheets happened to span - a top padding anywhere from 37 to 152 px - and
  reproducing that span is right for reproducing the artwork and wrong for a
  batch meant to read as one set. Every bound of `javascript-general` is a
  multiple of the step and inside the recorded range, so it is a narrowing of
  what the artwork left free rather than a new freedom. Measured across the nine
  sheets: line spacing 73.1 to 76.0 px, panel fill 0.858 to 0.899, and not one
  display run stepped down.
- **A `theme` or `layout` option is laid over the set's rather than over the
  recorded one.** This is what makes an option and a composition compose rather
  than compete: a `--theme` naming one colour over a sheet of the third set
  moves that colour and leaves the other ten where that set put them. Laid over
  the recorded theme it would silently hand back the recorded palette for
  everything the caller did not name, which is the failure `composeSheet`
  refuses `options.language` to avoid, arriving by a different door.
- **The bars flanking the title are short, and that followed from the scale
  rather than being a second opinion about it.** A bar and the title's measure
  come out of the same 3600, so a longer bar is a narrower measure and a
  narrower measure is a title stepped down to fit it. The first draft had them
  at ten steps and every title of the set but two was stepped down from the 196
  cap the scale had just put at the top, one of them to 145 - the treatment and
  the geometry were arguing and the geometry was winning on every sheet. At five
  steps the measure is 2928 and nothing is stepped down anywhere in the set.

### Fixed

- **The code panel's ink is checked against the sheet's own six, not against one
  list.** `tools/test-sheet-accent-ink-browser.mjs` held every sheet in the
  catalog to the recorded palette, so the nine sheets of a set with a palette of
  its own reported six unknown inks each and the assertion named a colour drift
  that was the design. The palette is resolved per document now, and the
  coverage claim with it: every one of a composition's six has to be drawn by
  some sheet drawn in it, which is the claim that was being made about the
  catalog and is only ever true of a set. The recorded six it pins as literals
  are held against `SYNTAX` by a case of their own, so the pin cannot drift
  either.
- **Three lines of the new sheets were shortened rather than excused.**
  `Number.isInteger(total)` and `Number.isNaN(NaN)` inside a `console.log` with
  a trailing comment, and a ternary guard carrying `Number` three times, each
  drew a glyph more than a page pixel from where an unsplit line would put it -
  1.060, 1.039 and 1.046 px. The design language says the fix is to write fewer
  runs and never to raise the floor, so each was split or rewritten and all nine
  sheets now measure under it.

## [1.0.0-alpha.1.12.0]

Three items that each close the last open question of a section. Two of them are
what was left of **Dedicated cheatsheet website** `->` **Building on the API** -
the two formats a data file may also be written in, and the decision about where
a generated folder is published - and the third is the one open item of
**Cheatsheet Composition Language** `->` **The Composition Algorithm**, which is
how a new cheatsheet's picture is produced.

A minor rather than a patch, for the reason `1.0.0-alpha.1.11.0` was: there is
new published surface. `DATA_FORMATS`, `formatOf`, `readData` and
`WRAPPER_ELEMENTS` on the data route, `--format` on its command line, `--all` on
`tools/cheatsheet.mjs`, and `composeEach` and `reportOfAll` exported for it.

### Added

- **A data file may be written in XML or in HTML as well as JSON**, read from
  the file's extension or named with `--format`. The whole of what a format
  decides is *where a value is written*: a property is the same word in all
  three, means the same thing, takes the same values, and is reported with the
  same path in a finding. `readData` hands back one record whichever file it
  read, so the contract, the findings, the pages, the render, the manifest and
  the menu are still reached by one path - *the three formats read the same
  material into the same record*, *and therefore into the same pages*, and *a
  run reads xml and html, and writes the same folder the json writes* are the
  three cases that hold it, the last of them comparing the generated folders
  file by file rather than by count.
- **In the two markup formats the shape follows from what an attribute can
  hold**, which is what makes it a decision rather than a preference: a
  property that holds a list is an element carrying one child per item, and
  every other property is an attribute. A list of records has nowhere to go in
  an attribute and neither has markup. **The element one item of a list is
  written as is named by the contract too** - `entries` is `[ <entry>, ... ]`
  and `material` is `[ <block>, ... ]` - so `<entries>` holding `<entry>` is
  read off `DATA_PROPERTIES` rather than chosen beside it, which is the same
  reading `heading`, `group` and `name` already get from `COMMENT_PROPERTIES`.
  A value written the other way round is reported with the shape it should
  have had and the file is still read.
- **HTML is the one format where a block of material needs no escaping at
  all**, which is the reason it is worth having beside XML: a block *is*
  markup, so XML carries it escaped or in a CDATA section and HTML carries it
  exactly as written, trimmed at its ends and never re-indented. The markup
  inside a block is never scanned, so an `<entry>` in a code sample is a code
  sample - and in XML a CDATA section may hold the closing tag of the element
  holding it, which is what a cheatsheet about data files would carry and what
  an `indexOf` would have closed the block on.
- **The outermost element is the file itself and its name is the writer's**,
  since nothing in the contract names a file. HTML steps over `<html>`,
  `<head>` and `<body>` on the way to it, so a fragment and a whole page read
  identically; `<head>` is the one wrapper never descended into, or a page's
  `<title>` would be read as the file element.
- **`tools/cheatsheet.mjs --all` composes every cheatsheet in the catalog from
  its own `sheet.json`.** `--generate <slug>` has composed one through this
  layer since 2026.10.27 and `--check` has read all of them since the same day,
  but there was no way to *write* all of them - so the answer to how a new
  sheet's picture is produced was 28 invocations or a screenshot taken by hand,
  and for a catalog meant to grow from one category to ten that figure is what
  decides the cost of writing one sheet. It composes by the path a single
  `--generate` takes - `compose`, then `renderSubject`, with one settings object
  for the call - and *and composes each of them exactly as --generate of that
  slug would* holds the two together across the whole catalog rather than a
  sample. One sheet that cannot be composed is reported against its own id and
  the rest still run, the exit code saying some failed. `--out`, `--seed` and
  `--data-only` are refused with it rather than ranked: each means one sheet,
  and a batch has one of each per cheatsheet.
- **Where a generated folder is published is written down.** Both ways are
  supported and the default is decided by the route rather than by taste,
  because the two routes promise different things: a crawled site's folder is a
  section of that site - resolved under the site root, menu spliced into the
  site's own pages, carried URLs rewritten relative to it - and a data file
  site's folder is a site of its own, which is why `cheatsheet-menu.html` is
  written as its front door. Either may be published the other way on one
  condition, and the condition is checkable rather than advice: a generated page
  is self-contained - one stylesheet in its own head, one inline `<svg>` per
  cheatsheet, no script, and every link between generated pages a bare file name
  - so the only thing tying a folder to a host is a URL the source material
  carried, and those are the only references in the folder written with `../`.
  `grep -r '="\.\./' cheatsheets/` lists them, and an empty result means the
  folder can be served from anywhere. It is under **Where the generated folder
  is published** in `docs/generating-from-a-site.html`, and both tools' `--help`
  names it, which a case holds so the record and the pointers cannot come apart.

### Fixed

- **A record read out of a markup format is built on a null prototype**, which
  is the one place those two formats need care that `JSON.parse` does not:
  `JSON.parse` makes a `__proto__` key an ordinary own property, and assigning
  the same name onto an object literal sets that object's prototype instead - so
  the property would vanish from the reading that reports a property the contract
  does not know, and the file's fault would be invisible rather than named.
- **The file element of an HTML data file is the element holding `<entries>`**,
  rather than the first thing in the body that is not a wrapper. A document with
  a heading above its data - `<h1>The cheatsheets this folder is written from</h1>`
  and then the file element, which is the habit stepping over `<html>`, `<head>`
  and `<body>` exists to accommodate - read the heading as the file and reported
  that `entries` was not set, about a file that set it on the next line. The
  first non-wrapper element is now the fallback instead, so a document holding no
  list at all still reports the contract against the element its writer meant as
  the file.
- **A closing tag that opened nothing is reported rather than quietly ending the
  list it is in.** A mismatched `</wrong>` between two `<entry>` elements left
  the second one unread, with no finding and no refusal - a page missing from the
  generated site, and a run that exited 0 having written a site with a hole in
  it. It is the same loss an element that is never closed causes, and that one
  has reported itself with its line since the day it was written. A block's own
  markup is still never read as structure, so a cheatsheet carrying an HTML
  sample is a cheatsheet carrying an HTML sample.

## [1.0.0-alpha.1.11.0]

The data file route, which is the two items of **Dedicated cheatsheet website**
`->` **Building on the API** that the section's own order put last and that this
run took together: the contract a data file is written against, and the
generator that reads one. A site that already publishes its material marks the
pages it has; a site that is not written yet has no page to mark, which was the
one case the scanner could never serve.

A minor rather than a patch, for the reason `1.0.0-alpha.1.10.0` was: there is
new published surface - `tools/cheatsheet-data.mjs` with its `DATA_PROPERTIES`
contract, and `cheatsheetDocument` exported from the scanner for the one page
the new route writes that the old one has no equivalent of.

### Added

- **`tools/cheatsheet-data.mjs` writes a whole cheatsheet site out of one JSON
  file**: a page per entry, `all-cheatsheets.html` carrying all of them,
  `cheatsheet-menu.html` to move between them, and the manifest. It is a second
  front end and emphatically not a second generator - everything past the read
  is imported, so `renderCheatsheet` and `renderMaster` write the pages,
  `plannedPages` says what a run writes, `manifestFor` records it, `renderMenu`
  builds the menu, and `resolveOutput` and `readManifest` settle which folder
  they go in. *A data file site and a marked up site write the same cheatsheet,
  byte for byte* is the case that holds it: the same material through both front
  ends, and the two renders compared. Every other case in that file would still
  pass on the day the two routes started writing different pages.
- **`DATA_PROPERTIES` is the contract, and it is one object rather than a
  passage of prose.** Nine properties, three of the file's and six of an
  entry's, each saying what it maps onto in a marked up page - which is the
  mapping itself. The read decides what a property is from it, a finding for a
  property it does not know reads the same list to say what the vocabulary is,
  `--help` prints the table, and `docs/generating-from-a-site.html` tabulates
  it. **Three of the nine are not defined there at all**: `heading`, `group` and
  `name` take their values and their descriptions from `COMMENT_PROPERTIES`,
  which takes `heading` from the published `HEADING_SOURCES` the DOM route
  reads. The item's own words for why - a third vocabulary that drifts from
  either of the two that exist is the failure to avoid - and the chain is what
  makes it one reading rather than three that agree today. Two cases hold both
  links of it.
- **A data file is the comment method, said in JSON**, which is the sentence the
  whole mapping follows from. A comment is the marking that can say several
  things at once and so is a record with several fields, so the three properties
  a comment carries are the three an entry carries, and they are carried on
  every block of the entry rather than the first - `commentOption` answers the
  same whichever block it looks at, since a page says one thing about its own
  heading however many elements it marked. The attribute is still in the mapping
  for the two markings that have no comment form: `material` is what a
  `data-cheatsheet` element wraps, and `menu` is `data-cheatsheet-menu`.
- **The preset half of the mapping is the element.** A crawled page has an
  element whether or not it meant to choose one, and a data file has none, so
  one is supplied: a block written as markup alone is recorded as a
  `<section>`, and a block that names its own element keeps it. The name is
  written onto the generated page as `data-cheatsheet-block`, the same place the
  scanner records the real element it found, and is read by nothing else.
- **The menu is a page here, and that is the one thing the new route writes that
  the old one has no shape for.** A crawled site has pages of its own for a menu
  to be spliced into; a data file site is nothing but the generated folder. So
  `cheatsheet-menu.html` is the front door - the same `<details>` a marked page
  would have been filled with, in the shared document shell, linking its
  siblings - and it claims its name the way `all-cheatsheets.html` does, an
  entry that wants it being told rather than written over. `cheatsheetDocument`
  is exported from `tools/cheatsheet-site.mjs` for it, so the menu page is not a
  second kind of document in the same folder.
- **A finding names the property's path in the file**, as `entries[2].heading`,
  because that is what a reader has to go and edit. The judgement is the
  markings' own: a property the contract does not hold, or a value it does not
  take, is reported and ignored, and the pages that could be read are still
  written. An entry that names no page, names a path outside the site, names a
  page another entry already stands for, or carries no material is reported and
  writes nothing. **A path is read one segment at a time**, so an empty segment
  and a `.` are refused beside a leading slash and a `..`: `guide//arrays.html`
  is what string concatenation produces when the folder it joined was already
  empty, and the folder both of those resolve to is no folder at all. A file
  that is not a record, holds no `entries`, or declares a
  version this tool does not read is refused whole - the asymmetry being
  deliberate, since a file written against a later vocabulary holds properties
  this one would drop in silence.
- **The two numbers the fixture gate turns on are written down, in
  `tools/test-fixture-expected.mjs`.** The expectation tree is held to 160 KB
  and 64 KB a file, against the 124,381 bytes over 11 files it was on
  2026.11.19 - room for two or three more composed pages, which is what adding a
  marked up fixture page costs, and no more. The clock is the gate's own: the
  three files `.github/workflows/pages.yml` runs are read off the workflow,
  timed in a child, and held to 8 seconds against the 215 ms they take. That
  figure is loose on purpose - wall time on a shared runner is not a figure
  anything can be held to within a factor, so the budget is against a change of
  kind rather than against drift, and everything it exists to catch costs
  seconds at minimum. Which three files are in the gate is pinned in a case of
  its own, so a browser driven file added there fails by name rather than by how
  long it took. That is the sixth and last item of **Cliche
  Tutorial/Documentation Site to Test Cheatsheet API and Script**, and the one
  that was waiting for the gate rather than for the fixture.

### Fixed

- **The browser cases that select a cheatsheet wait for the one they asked for
  rather than for any sheet at all.** `#curCheatSheet` keeps the outgoing
  graphic while the next document is in flight - deliberately, and *nothing
  below the sheet moves while the graphic is still in flight* is the case that
  holds the page to it - so `waitForSelector("#curCheatSheet > svg")` was
  satisfied by the previous sheet's graphic the instant it was called, on every
  selection but the first. Under load the evaluate after one could therefore
  read the sheet the reader had moved on from, which is how *a committed unrun
  cheatsheet draws, injects nothing and asks for no console* reported `Colors
  and Backgrounds` against the selected `Typography and Text` once in three full
  sweeps on 2026.11.14: the sheet one place along from the one asked for, while
  the page was behaving exactly as written. All twenty wait sites in
  `tools/test-example-selection.mjs` now wait on the graphic's own `<title>`
  matching the sheet that was selected, which the drawn assertions already read.
  A flake is worse than a failure - it names a defect that is not there, on the
  day somebody is reading the log for a different reason - and the fix is in the
  wait rather than in the page, because clearing the box before selecting would
  cost the page the reservation that other case exists for.
- **The gate's clock counts what the gate ran.** Node's test runner sets
  `NODE_TEST_CONTEXT` in every file it loads, and a `node --test` that sees it
  in its own environment reports *run() is being called recursively within a
  test file*, runs nothing and exits 0 - so the timing case above measured
  node's start-up, read 33 ms, and passed for as long as it existed, which was
  the hour between writing it and counting what the child ran. It comes off the
  child's environment now, and the case reads the child's own passing tally
  before it believes the measurement.

## [1.0.0-alpha.1.10.2]

The five fixture items, which is the last of **Cliche Tutorial/Documentation
Site to Test Cheatsheet API and Script**. `fixtures/site/` now carries every
marking the site tooling reads, a folder inside a folder, and both menu modes;
`fixtures/site-taken/` is a second root where everything is already the site
owner's; and what a run writes against either one is committed under
`fixtures/expected/` and compared in the Pages gate.

A patch rather than a minor, for the reason `1.0.0-alpha.1.10.1` was: there is
no new published surface, and nothing a generated page or the API does changes.
What changes is what the repository can say when either of them moves - until
now nothing in it stated what a generated page is supposed to look like, so a
page that composed its figure at half the size or linked a menu one folder too
high would have passed every case there was.

It also carries the two names the suite prints that `## [Unreleased]` had been
holding since 2026.11.14, which is the release they ship with.

### Changed

- **The containment case is named for the promise both its branches keep.** *A
  carried table that declared a width wider than the page is clamped* is now *a
  carried table that declared a width wider than the page is contained in its
  box, not the page*, which is the shape the content-wide case beside it already
  used. The old name was true in two of the three engines the case has run over
  since `1.0.0-alpha.1.10.1`: Chromium 151 and Firefox 153 clamp the declared
  800 to the 374px box, while WebKit 26.5 leaves the table at 800 and scrolls
  the wrapper the remaining 426px. Both branches pin a number rather than
  falling through, so the case was sound and only its name was not - what the
  suite printed was a tick beside *is clamped > webkit* for the one engine where
  the table is not clamped. The body and the fifteen lines of comment above it
  are untouched.
- **`tools/test-docs-pages-browser.mjs` opens on the cases it actually holds.**
  Its multi engine paragraph counted three where the file has four - the focus
  ring case joined it the same day that paragraph was written - and gave one of
  the two readings the three launches are paid for. It now gives both: the tab
  order WebKit puts no scroll box in, and the `:focus-visible` match that no
  engine makes on a programmatic `focus()`, which is why that case drives a real
  Tab press and reads the ring off all three. The count is left to be read off
  the `test(` lines rather than written down again, since writing it down is
  what went stale.
- **`tools/test-fixture-site.mjs` reads what the two roots carry rather than
  what they lack.** Its fourth section listed five things that belonged to later
  items and held them absent, so that a fixture which quietly grew one would not
  make the item adding it read as done. All five landed here, so the section is
  gone and the cases that replace it read the markings, the nesting, the two
  menu modes and the variant off the fixtures - and the README check asks where
  each one is instead of that it is missing. Twelve cases where there were
  eight.
- **`tools/test-site-pages-browser.mjs` reads five generated pages.** The
  fixture writes `reference.html` now, so the page list and the master page's
  sheet ids carry it. Nothing else about that file changed: four sheets on one
  page is still what the `id` option exists for, and it is still what the case
  measures.

### Added

- **Both authoring methods have a fixture, in one folder.**
  `docs/commands.html` is `docs/reference/commands.html` and is marked with the
  comment syntax rather than the attribute, standing in front of its `<section>`
  with nothing but whitespace between the two - which the page's own prose
  outside the marking is what exercises, since a directive carried forward to
  the next element it could find would be one applied to the wrong material. Its
  sibling `exit-codes.html` is marked with the attribute, so `reference.html` is
  one cheatsheet written out of both methods. The comment asks for
  `heading: page` and the page's `<title>` is a sentence, so the heading read
  off the file name is visibly the file name.
- **A folder inside a folder, which is what says which name a cheatsheet
  takes.** `docs/reference/` is three segments deep, so `pageFolder` reading the
  **immediate** parent is the difference between `reference.html` and
  `docs.html` - and two folders at the root could never have asked that. `docs/`
  is left holding one page on purpose: one page in a folder is a cheatsheet with
  one section, and the tempting other reading is to group only at two or more.
- **Both menu modes, each in the page a site would mark it on.** `index.html`
  asks for the `page` mode, one link to the page carrying every cheatsheet;
  `commands.html` asks for the `dropdown`, an entry per generated page, from two
  folders down - so the link walk that mode raised is exercised rather than
  assumed, and a run fills `../../cheatsheets/reference.html` rather than a path
  that works from the folder the tool resolved.
- **`fixtures/site-taken/`, a second root where everything is already the site
  owner's.** A `cheatsheets/` folder of their own, so the output ladder resolves
  past it and writes into `cheatsheets/cheatsheets/` - the case the ladder's unit
  tests cannot reach, since resolving is a question about a disk. And a `<nav>`
  holding a menu somebody wrote by hand, which a run refuses rather than writes
  over, because it recognises only its own fill. That is the one expected finding
  of the root and the reason it is a second root: `fixtures/site/` reads clean,
  and a root with an expected finding cannot be asserted to have none.

### Tested

- **`fixtures/expected/`, the output a run writes, committed.** Every file a run
  creates or changes in either root, at the path it lands at: the five generated
  pages and their manifest, the two pages whose menus were filled, and the
  variant's two pages in the folder the ladder resolved. Until now nothing in
  the repository said what a generated page is supposed to look like, which is
  the same gap `tools/test-render-fixture.mjs` was written for one layer down.
- **`tools/test-fixture-expected.mjs` runs the tool against both roots and
  compares the two.** A diff of the tree rather than a read of the output
  folder, because a run writes into pages the site owner keeps as well - so a
  file it deleted, or one it started writing somewhere new, is part of what is
  pinned. It also pins the exit code each root ends on, and holds every file the
  first run wrote byte identical over a second run. What that second run does
  not reach is the folder it resolves: a run that stopped reading the name its
  manifest recorded would write a third folder beside the first and leave the
  first one's files untouched, so the recorded name being read at all is held by
  `tools/test-cheatsheet-site.mjs` rather than here.
- **The API is pinned with it.** A generated page is the tool's page shape
  wrapped around `api/cheatsheet/` composing material read off the fixture, so
  the `<svg>` in every expected page moves when the layout, the type
  measurement, the theme or the seed does. The browser route reading a live
  document is still `tools/test-site-pages-browser.mjs` through an engine and
  `tools/test-browser-entry.mjs` against a hand written DOM.
- **The Pages gate runs the site tooling against the fixtures.** Three files in
  the job that already checks the vendored surface and the catalog, so a change
  that moved a generated page cannot reach the published site with nothing
  having read it. Three rather than the whole suite, because this is the gate in
  front of a deploy and what belongs in it is what the deploy would otherwise
  publish wrong - and, like the two checks beside it, it installs nothing.

## [1.0.0-alpha.1.10.1]

The same defect as the release before it, in the second file that was carrying
it: `docs/docs.css` put `display: block; overflow-x: auto` on every
documentation table, which is the pair `1.0.0-alpha.1.10.0` had just moved off a
carried `<table>` and onto a wrapper. Unlike the generated-page case this one
was not hypothetical - it was live on the published site, where it had been
since the documentation moved out of `README.md` on 2026.11.08.

A patch rather than a minor: there is no new surface a caller writes against,
and nothing a generated page or the API does changes. What changes is how this
repository's own documentation reads, and which engines the suite reads it in.

### Fixed

- **Every documentation table lays its rows out to the width its stylesheet
  declares.** A `<table>` at `display: block` is not a table box, so its rows
  are laid out in an **anonymous table box** that has no width of its own and
  shrinks to fit - the `width: 100%` beside it sized the block that scrolled and
  never reached the columns. Measured at 1280x900 in a 768px column, in Chromium
  151 and WebKit 26.5, over the four tables on `docs/cheatsheet.html`: the
  palette table drew its rows at **288.2**, the property table at **489.5**, the
  export table at **647.4** and the model table at **740.1**, so one page showed
  four tables at four widths where its stylesheet asked for one. The five tables
  on the other pages measured 767 against a 768 box, which is their content
  being wider than the column rather than the rule being honoured - restoring
  `display: table` draws all nine at 768. At 390x844 the palette table was still
  288.2 in a 358px column.
- **The table is left a table and the box around it scrolls.** `table` keeps
  `width: 100%` with `max-width: 100%` beside it, and `div.table-scroll` carries
  `max-width: 100%; overflow-x: auto`. Each of the nine tables on the site -
  four on `docs/cheatsheet.html`, two on `docs/rendering-outside-the-page.html`,
  one each on `docs/drawing-a-sheet.html`, `docs/generating-from-a-site.html`
  and `docs/index.html` - is written inside one. A class here and an attribute
  on the generated pages, because those write into a site owner's folder where a
  class name can collide and these pages are the repository's own.
- **A documentation table wider than a phone can be scrolled from a
  keyboard.** Each wrapper carries `tabindex="0"`, for the reason the carried
  table's wrapper does: WebKit puts no scroll box in the tab order itself, so
  without it the surface table on `docs/index.html` - 378.3px wide in a 358px
  column at 390x844, in Chromium and WebKit both - was unreachable in Safari
  without a pointer. No `role="region"` and no `aria-label`, because no
  documentation table has a `<caption>` to be named from and a region a screen
  reader announces and cannot name is worse than no region.

### Changed

- **The suite reads three engines where one is not an answer.**
  `tools/test-site-pages-browser.mjs` resolved `chromium` and nothing else, so
  the keyboard case added in the previous release passed on one of the two
  engines that never needed the attribute it was written for. It now launches
  whichever of Chromium, Firefox and WebKit are installed and skips per engine,
  with that engine's install command as the reason, over the cases that measure
  containment and keyboard reach.
- **The clamp is asserted only where the engine clamps.** *A carried table that
  declared a width wider than the page is clamped* was engine specific as
  written. At 390x844 Chromium 151 and Firefox 153 clamp `#declared-wide` from
  800 to the 374px box; **WebKit 26.5 leaves the table at 800 and scrolls the
  wrapper the remaining 426px**. That is not a regression - WebKit reads the same
  800 with the style block removed entirely - and the promise holds either way,
  since the page scrolls sideways in none of the three. So the box and the page
  are asserted over every engine, the clamp only where it happens, and WebKit's
  scroll is recorded as the other way the same promise is kept.
- **`docs/tests.html` says why a few cases want three browsers**, and
  `docs/generating-from-a-site.html` records that the engine the carried
  wrapper's `tabindex` was written for is now the engine it is measured in.

### Tested

- **`tools/test-docs-pages-browser.mjs`** is new, named the way the other
  browser driven files in `tools/` are, and reads every `<table>` on every page
  in `docs/` at 1280x900 and at 390x844 over all three engines. Four cases:
  the rows span the table's own width with `display: table` on it, a table wider
  than its box has something hidden in it while the page never scrolls sideways,
  every box takes focus and scrolls with an ArrowRight, and every box reached by
  a real Tab press draws the site's focus ring without widening the page. The
  first two fail on the stylesheet as it stood, in all three engines; the third
  passed vacuously against markup carrying no wrapper at all, so it counts the
  boxes against the tables before it asserts anything about them. The fourth
  counts the rings it read against the boxes the site carries, both read off the
  pages, so the nine boxes standing today are a measurement rather than a figure
  a tenth table would contradict.
- **The structural half is checked without a browser too.**
  `tools/test-docs-site.mjs` is dependency free and reads the pages as text,
  which is why it watched this site for five days without noticing - a column
  width is a layout result. *Is the table in a box at all* is not, so it now
  holds that every `<table>` is wrapped in a focusable `div.table-scroll`, one
  box per table, and that the stylesheet puts neither `display: block` nor an
  `overflow-x` on the table itself. That is the case that runs on a bare clone,
  and the way this comes back is a table added to a page without a wrapper.

## [1.0.0-alpha.1.10.0]

The containment that shipped in `1.0.0-alpha.1.9.0`, measured a second time and
found to cost more than it said. `display: block` on a carried `<table>`
contains it and takes it out of the table formatting context, so a width the
site owner declared sized the box that scrolled rather than the table that laid
out - and `width: 100%`, which is the commonest thing an author writes on a
table, drew every column at content width on an ordinary page. The containment
moves onto a `<div>` the tool writes around the table, which leaves the table a
table and makes the keyboard remedy the previous release had refused available
on an element the tool owns.

It is a minor rather than a patch for the reason the previous one was: there is
new published surface - `wrapCarriedTables` and `SCROLL_WRAPPER` - and it
changes what a generated page says for every site whose material carries a
table.

### Fixed

- **A width declared on a carried table lays out its columns again.** A
  `<table>` at `display: block` is not a table box, so its `<caption>`,
  `<thead>` and `<tbody>` are wrapped in an **anonymous table box** that has no
  width of its own and shrinks to fit: the declared width reached the block that
  scrolled and the columns were laid out as though nothing had been declared.
  Measured on a generated page, read as written and again with the style block
  disabled - a `<table style="width: 100%">` was a 1264px box at 1280px with its
  rows drawn at **152.9**, against 1258 with no block at all, and 374 against
  368 at 390px; a `<table style="width: 50%">` drew its rows at **64.7** against
  628 and 183. The `<caption>` shrank with the rows, so a caption that sat on
  one line across the table wrapped into a column of one and two word lines. A
  table that declared nothing was untouched at either width, which is why both
  fixture tables and all four cases watching them passed throughout.
- **The containment is a wrapper the tool wrote.** Each carried `<table>` is
  written inside `<div data-cheatsheet-scroll>`, and the style block contains
  the wrapper instead: `[data-cheatsheet-block] [data-cheatsheet-scroll]
  { max-width: 100%; overflow-x: auto; }` with `table { max-width: 100%; }`
  beside it. The table keeps its table box, so `<caption>`, `<thead>` and the
  column sizing algorithm apply as the owner wrote them, and the wrapper is what
  scrolls. `width: fit-content` is gone with the block box that needed it - a
  table box shrinks to fit on its own, and the two fixture tables measure 439.1
  and 512.1 at 1280px, which is what they measured before any of this existed.
- **A carried table that overflows can be scrolled from a keyboard on Safari.**
  The previous release wrote down that neither box that scrolls carries a
  `tabindex` and rested on the browser's own behaviour. Measured at 390x844 on a
  generated page carrying a table 2586px wide in a 374px column and the wide
  listing: **Chromium 151** puts both boxes in the tab order and moves
  `scrollLeft` 40px per ArrowRight, **Firefox 153** the same at 32px and 36px,
  and **WebKit 605.1.15, reporting Safari 26.5**, reaches neither box in
  fourteen presses - so 2212px inside the table and 156px inside the listing
  were unreachable without a pointer, the listing since `1.0.0-alpha.1.8.1` and
  the table since `1.0.0-alpha.1.9.0`. Both objections that ruled the remedy out
  fall away on the wrapper: it is not the site owner's element, and a table's
  `<caption>` is the owner's own words rather than a name the tool invented. The
  wrapper carries `tabindex="0"`, with `role="region"` and an `aria-label` from
  the caption where there is one - and neither where there is none, because a
  region a screen reader announces and cannot name is worse than no region.
- **The carried listing is said rather than fixed, and that is the whole of
  it.** A `<pre>` is the owner's own element and has no caption to be named
  from, so the only remedies are an attribute written into their markup or a
  wrapper under an invented name. `docs/generating-from-a-site.html` states the
  three engine measurement, says plainly that a carried listing wider than the
  page cannot be scrolled from a keyboard on Safari, and names the two levers a
  site owner has - including that a `tabindex="0"` they write on their own
  `<pre>` is carried onto the generated page with everything else.

### Changed

- **A second thing in carried material no longer survives untouched.** The
  first was a relative URL; a carried table now arrives inside a wrapper that
  was not in the owner's markup. Nothing about the table itself is changed, and
  the wrapper is written where the URLs have already been rewritten, so it sits
  around the table as it will be read. Only the outermost table of a nest is
  wrapped, a table inside a comment or a carried `<script>` is not a table, and
  a table this scan cannot close is carried exactly as written rather than
  closed at a guess.
- **`data-cheatsheet-scroll` cannot be read as a marking**, which is what makes
  it safe to write into a folder the next run walks over. The marker scan
  requires the character after `data-cheatsheet` to end the attribute name, so a
  longer name is a different attribute - the same thing that already keeps
  `data-cheatsheet-menu` and `data-cheatsheet-block` out of the collector - and
  the browser route asks `querySelectorAll` for `[data-cheatsheet]`, which does
  not match a longer name either.
- **The browser route writes no wrapper.** `api/cheatsheet/site.mjs` builds its
  section inside a page that already carries the owner's stylesheet, so there is
  no style block there for a wrapper to pair with and a `<div>` written on that
  route would change the carried shape for no containment at all.
- **`docs/generating-from-a-site.html` records the second reading**, with the
  measurements that found it, what an anonymous table box does to a declared
  width, the wrapper and its attributes, the one line of CSS that turns the
  scrolling off, the three engine keyboard table, and the tab stop the attribute
  costs on a table that fits.

### Tested

- **The row is measured, not the box.** `tools/test-site-pages-browser.mjs`
  gains a `<table style="width: 100%">` on the wide-material page and asserts
  the last row's span against the table's width at 1280px and at 390px, with the
  caption's width beside it. The box was 1264 either way, which is what made the
  defect invisible to a measurement for a day; the row and the caption are the
  two things that said which of the two had happened.
- **The existing content-wide case watches the wrapper.** The finding is
  unchanged - the page does not scroll sideways - but the box that scrolls is
  the wrapper now, so the case asserts the wrapper's `overflow-x` and its
  scroll, the table overflowing it, and `display: table` on the table itself,
  which is the half that says nothing was re-laid out to fit.
- **The keyboard fix is asserted as text and exercised in a browser.** The
  attribute and the name from the caption are pinned in
  `tools/test-cheatsheet-site.mjs`, since the engine the suite drives is one of
  the two that never needed them; the browser case focuses the wrapper, waits
  for the animated scroll rather than reading it in the turn after the press,
  and watches `scrollLeft` move.
- **What the wrapper is not written around.** A carried listing, a carried
  list, a table inside a table, a commented-out table, a table in a script
  string, an unclosed table and a self-closing one - each silent when it is
  wrong, which is why each is a case rather than a comment. With the two the
  naming decision turns on: a table with a caption is a named region, and a
  table without one is reachable and claims no role.

## [1.0.0-alpha.1.9.0]

The two halves of the previous release that were reasoned rather than measured,
measured - and the one that was wrong, fixed. `1.0.0-alpha.1.8.1` contained a
carried `<pre>`, and wrote the `img` and `table` rules beside it on the argument
that they were the same defect from the two other elements that carry an
intrinsic width. That is true of `img` and was not true of `table`, and a page
carrying a seven column table scrolled sideways exactly as it had before. Beside
it, an older defect found while building the case for the image rule: a relative
URL in carried material pointed at nothing once the material was carried onto a
page in another folder, so the image rule was a rule for images that on such a
site never loaded.

It is a minor rather than a patch because the URL fix is new published surface -
`carryUrls` and `carriedUrlFindings`, and an output folder parameter on
`writePages`, `renderCheatsheet` and `renderMaster` - and because it changes
what a generated page says for every site whose material is not written with
root relative URLs.

### Fixed

- **A table made wide by its own content is contained, which `max-width: 100%`
  never did.** A table's used width is never lower than its min-content width -
  the sum of each column's longest unbreakable run - and `max-width` does not
  lower that, so the rule computed, `getComputedStyle(table).maxWidth` reading
  `100%`, and changed nothing. Measured at a 390x844 viewport over a generated
  page carrying a seven column table: the table stayed at 413.6 in a 374 column
  and the page measured 422 against a `clientWidth` of 390, with and without the
  rule. It is contained the way the listing is instead, by scrolling itself:
  `[data-cheatsheet-block] table { max-width: 100%; width: fit-content;
  display: block; overflow-x: auto; }` gives 374 and 390. Of the four candidates
  measured, `table-layout: fixed; width: 100%` also contains it and reflows
  every column to an equal share, which changes what the carried record looks
  like; `max-width: 100%; overflow-x: auto` is the one that looks like the fix
  and changes nothing at all, because a `display: table` box ignores `overflow`.
- **`width: fit-content` is what keeps that to the tables that needed it**, and
  it was measured rather than assumed. A table box shrinks to fit and a block
  box fills its container, and `max-width: 100%` does not stop that because 100%
  of the container is the container - so `display: block` on its own took the two
  fixture tables from 439.1 and 512.1 wide at 1280px to 1264, stretching every
  carried table across the page for a rule that only had business reaching one
  too wide to fit. With `fit-content` they measure 439.1 and 512.1 again, as
  they did before the style block existed, and only a table wider than the page
  is contained. A browser too old for `fit-content` falls back to `width: auto`,
  which is the stretch: still contained, which is the half that matters.
- **A relative URL in carried material points at what it pointed at.** Material
  is collected out of a page in one folder and written onto a page in another,
  and until now every `src`, `href`, `srcset` and `poster` in it was carried
  byte for byte - so `<img src="badge.svg">` on `guide/using-it.html` became a
  request for `cheatsheets/badge.svg`, and a link to a sibling page became a
  request for a name beside the generated page. Measured against a server that
  logs what was asked for, both 404'd and only a root relative `/badge.svg`
  survived the carry. Each is now rewritten through `linkFrom`, which already
  walks two site relative paths for the menu links: resolve the URL against the
  folder the source page sits in, then walk from the generated page to it, so
  `badge.svg` becomes `../guide/badge.svg`. The tool already knew the hazard by
  name - `menuMessage`'s `nested` case refuses to fill a menu inside marked
  material because its links would be relative to the wrong page - and said
  nothing about the same URLs in the material itself.
- **Nothing else about the material is changed**, which is most of what the fix
  had to get right. An absolute URL, a protocol relative `//host`, a path that
  was already root relative and a bare fragment all already mean what they
  meant; a path that walked above the site root was leaving the site and has no
  site relative form to rewrite into; a URL in a comment or in what a carried
  `<script>` says is text rather than markup. The query and the fragment ride
  along untouched, a path naming a folder keeps its trailing separator, and the
  quoting the site chose is the quoting that goes back. `<form action>` and
  `<base href>` are left alone on purpose: rewriting the first points a form at
  a handler nobody expected, and rewriting the second changes how every other
  URL on the page resolves rather than one of them. A bare `?query` meant the
  page it was written on and now means the page carrying it, which is the one
  shape still carried as written and is recorded as such rather than guessed at.
- **An attribute is only rewritten where it is an attribute.** The values are
  found by walking the start tag rather than by pattern, for the reason
  `startTagAt` is a scan: a pattern looking for `\shref\s*=` finds one inside
  `<div title="see href=x">`, and rewriting there corrupts a site owner's own
  prose. A carried `<script src>` is rewritten and what the script says is not.

### Changed

- **The output folder is a parameter of the write rather than of the manifest
  alone.** `writePages`, `renderCheatsheet` and `renderMaster` take the folder
  as a page of the site names it, because carried material holds URLs and a
  relative URL has to be walked from somewhere. All three default to the folder
  the ladder resolves first, which is what every caller but `main` means.
- **An output folder outside the site reports the URLs it could not rewrite.**
  There is no site relative path from a generated page to anything there, so the
  material is carried as written and is broken exactly as it was before - said
  per page and with a count, rather than left silent, which is what the menu's
  own outside-the-site refusal already does.
- **Neither box that scrolls carries a `tabindex`, and that is now written
  down.** A scrollable region with no focusable child is reachable from a
  keyboard only where the browser makes scroll containers focusable itself, and
  the usual remedy - `tabindex="0"` with an accessible name - is an attribute
  written into a site owner's own element and a name invented for material the
  tool only read. It would also land on every carried listing and table rather
  than on the ones that actually scroll, since whether a box overflows is a
  layout result. The rule relies on the browser, and a site owner has the two
  levers that always win here: their own CSS after the block, and their own
  markup. The listing rule shipped in `1.0.0-alpha.1.8.1` under the same
  constraint without saying so, and this closes that for both.
- **`docs/generating-from-a-site.html` records all of it**, with what the table
  rule costs a table box, why scrolling was preferred to reflowing it, the
  example of a URL before and after the carry, the list of what is deliberately
  left alone, and the keyboard decision above. `docs/tests.html` gains the one thing a reader of a red suite needs:
  that `node --test` sweeps git-ignored working folders too, and which cases
  name the files when it does.

### Tested

- **A carried image, a declared-width table and a content-wide table are
  measured in a browser**, promoted into `tools/test-site-pages-browser.mjs`
  from the UI/UX verification that found the defect. The fixture carries no
  `<img>` at all and both its tables fit 390px, which is why the two rules went
  in on reasoning in the first place, so the material is written into a second
  copy of the fixture rather than into `fixtures/site/` - the five queued items
  that edit those five pages do not need a sixth landing among them.
- **The tables that already fitted are watched against their own content, not
  against a figure.** The drawn width is compared with the same table at
  `width: max-content`, which is what a table box would have shrunk to, so the
  case says "shrink to fit, not stretched" without hard-coding a font
  measurement - and it is the case that caught `display: block` stretching them.
  Their caption and their rows are asserted too, as the first two things a block
  box could have taken away.
- **Nothing a generated page asks for comes back 404.** A browser case over a
  second generated site whose material carries an image beside its source page,
  a link to its sibling and a path that was already root relative - the case
  that would have caught the URL defect on its own, whichever of the three
  remedies had been taken. Without the rewrite it reports
  `/cheatsheets/badge.svg -> 404`.
- **Every shape a site writes is pinned as text.**
  `tools/test-cheatsheet-site.mjs` asserts what a sibling file, a sibling page,
  a walk upwards, a root relative path, an absolute URL, a protocol relative
  one, a `mailto:`, a bare fragment, an empty value, a query, a folder, a
  `srcset`, a `poster`, each quoting style and a self-closing tag become - and
  the three places a rewrite must not reach, which are a comment, a script's
  body, and an attribute whose value merely contains the text of one.
- **The documentation link check no longer reads an example as a link.** Both
  link cases in `tools/test-docs-site.mjs` scan the raw source for `href="..."`
  and `src="..."`, which is what keeps them dependency free and what made them
  wrong the first time a page documented markup carrying one. Listings are
  blanked before the scan, offsets preserved, because nothing on the site links
  from inside a `<pre>` and a `<pre>` is the one place a documentation page
  writes somebody else's markup.
- **The suite is one command again, and the record of why it was not says
  where the fix belonged.** On 2026-11-10 a browser profile signed in under
  `mcp-todo/state/chrome/` brought 38 `*.test.js` files from an installed
  extension into the sweep, every one of them failing, and both discovery
  invariants in `tools/test-suite-invocation.mjs` failed with them. Nothing in
  this repository could fix it - the files were inside a third-party bundle, so
  the remedy the cases name in their own message was unavailable, and the levers
  that would have worked were the operator's - and it was fixed where it
  belonged, the tool now keeping its profile in a per-user folder outside any
  workspace. `node --test` from the root is green again at 1053 cases with one
  skipped, the invocation never changed, and what the guard cases bought was the
  day's notice rather than a week of it.

## [1.0.0-alpha.1.8.1]

A generated page stopped scrolling sideways on a phone. It is a patch, and the
whole of it is three CSS rules and the two cases that hold them: the found issue
the UI/UX verification of 2026.11.10 raised, resolved from the plan it left
behind. The composed sheet was never what did it - every sheet on those pages
measured 374x374 inside a 390px viewport, which is the half that run changed and
the half that worked.

### Fixed

- **A generated page carries three rules about its own layout, as
  `BLOCK_STYLE`.** It was written whole with an empty `<head>` - no `<link>`,
  no `<style>` - so a `<pre>` carried off a site was `white-space: pre` and
  `overflow-x: visible` by the browser's own default, and one long line anywhere
  in the material set the width of the whole document. Measured at a 390px
  viewport over `fixtures/site/`, `tutorial.html` and `all-cheatsheets.html`
  reported a `scrollWidth` of 494 against a `clientWidth` of 390, pushed by a
  single carried template literal; `index.html` and `docs.html` held at 390 only
  because their longest line was shorter, so it was a property of the material
  rather than of the page. `[data-cheatsheet-block] pre { overflow-x: auto; }`
  is the rule that closes it, and it is the one `docs/docs.css` already proved
  on this repository's own pages. It was inherited rather than introduced: the
  same fixture through the previous release writes the same empty head and
  measures the same 494px.
- **A carried image or table is contained in the same breath.** Both set a page
  width the way a `<pre>` does and neither was exercised by the fixture, so
  `img` and `table` are held to `max-width: 100%` with the same scope rather
  than waiting to be told the same thing twice.
- **Not `white-space: pre-wrap`**, which would have been the smaller change and
  the wrong one. A line break inserted into a carried listing changes what the
  listing says, and the material under the figure is described to a site owner
  as the record the lossy reading came from. Scrolling a listing is what this
  repository's own documentation chose for itself.

### Changed

- **Every selector is scoped to `data-cheatsheet-block`, and nothing styles the
  figure.** The constraint the tool runs under is that the folder it writes into
  belongs to somebody else, so the rules reach the blocks it wrote and nothing
  the owner's markup carries outside them, they sit in the head where anything
  added afterwards wins on cascade order, and they say nothing about type, colour
  or spacing. The figure keeps its own inline style and gets no second opinion,
  which is how the two would come to disagree. An HTML comment above the block
  names what it is for, because an unexplained `<style>` block in generated
  output is one a site owner deletes.
- **The browser route carries no style block**, and now says so. A section built
  by `api/cheatsheet/site.mjs` is appended to a page that already has a
  stylesheet, so a site wanting the listing rule on that route writes it into
  their own CSS. `docs/generating-from-a-site.html` records the block, the
  reasoning and that asymmetry.

### Tested

- **A generated page does not scroll sideways at 390px, and scrolls its listing
  instead.** Promoted into `tools/test-site-pages-browser.mjs` from the
  verification that found it, and asserted on all four generated pages rather
  than the two that failed - the two that passed are the guard for anyone who
  later widens the fixture's material. It asserts the document fits and that a
  listing wider than the page computes `overflow-x: auto`, because a page that
  fitted because the material had been wrapped would pass the first assertion
  and change what the listing says.
- **The rule is pinned as text as well as behaviour.**
  `tools/test-cheatsheet-site.mjs` reads the written head of both a cheatsheet
  page and the master page for the block, the three rules, and the comment above
  them, and asserts that *every* selector in it starts with
  `[data-cheatsheet-block]` rather than that the three known ones are there -
  what makes generated CSS safe in somebody else's folder is its scope, and a
  scope is text.

## [1.0.0-alpha.1.8.0]

A sheet's footer links out. The strip's mark goes to practicing.xyz and its
three icons to Mastodon, Instagram and X, and the footer stopped naming GitHub to
do it: Mastodon's logo is drawn where the GitHub mark was, and the X mark where
the Twitter bird was. A minor version, because a sheet that links is something a
reader of every format but the rasters can now do. The two plans this came from,
and the one beside it, ship in the same entry; both are under `.claude/prompts/`,
which is ignored like the rest of `.claude/`, so a clone has the record of them
here and not the files.

### Added

- **The composition reports where a sheet links out, as `variation.links`.**
  The drawing surface has no anchor element, so a composition cannot hold a
  link, and the areas come back beside it in sheet pixels. The strip's are
  measured on `assets/footer.png` in its own 799 x 81 pixels and kept with its
  loader as `FOOTER_LINKS` in `api/cheatsheet/brand.mjs`, then carried through
  the same `xMidYMid meet` placement the strip is given. A raster asset now
  carries its own `width` and `height`, read from the PNG header by `pngSize`,
  and a strip of any other size is placed with no links and a note saying so,
  because areas measured on one image land on the wrong parts of another.
- **The drawn footer links too.** A sheet with no strip, which is every page
  `tools/cheatsheet-site.mjs` generates, links its navy mark square to the site,
  and its follow line to the same place while that line is the default one. A
  follow line a document wrote is its own words and gets no link.
- **`withLinks` is the one place a link reaches markup.** It writes the areas
  after `toSVG()` as a final `<g data-name="links">`, one `<a>` per destination
  holding a rect per area, `fill="none"` and `pointer-events="all"`, so the
  sheet looks exactly as composed. `withoutLinks` takes the group off and leaves
  `toSVG()` byte for byte, and `linksIn` reads it back. `renderSVG`,
  `renderFragment`, `renderOf` and `index.html` all write through it, and the
  full size tab carries the links as well.
- **A fragment lifts the links out of the picture.** Everything inside
  `role="img"` is presentational, so a link left in the SVG would be focusable
  with no name. A fragment of a sheet that links out is now an outer box holding
  the named picture and a `<nav>` from `linkLayerFor`, its anchors laid over the
  sheet in percentages of the viewBox. A destination with two areas is one tab
  stop, the second `aria-hidden` and there for a pointer only. A sheet with no
  links is the one `role="img"` box it was.
- **`index.html` repeats the four links as text under the sheet.** On a phone
  the icons are about 15 x 20 CSS px, under the 24 px WCAG 2.2 asks a target to
  reach (2.5.8), and the same links elsewhere on the page at a passing size are
  that criterion's own equivalent. Each is held to at least 24 x 24, and the
  Mastodon link carries `rel="me"`, in markup rather than script so a verifier
  reading the page finds it. Generated pages carry neither: they are somebody
  else's site.
- **`.claude/prompts/links.prompt.md`**, the plan this entry carries out. Its
  fifth phase, a Cheatsheet API page on the practicing.xyz site converted from
  this repository's documentation, ran on that site the same day. Nothing of it
  lands here, and the plan's own record is where it is described.
- **`.claude/prompts/update-extract-html.prompt.md` plans teaching a local HTML
  extraction tool to recognize a GitHub Pages documentation site.** It is
  written to be moved to the workspace that tool lives in and run there with
  `/handle-big-tasks`. The extractor and the page builder never call each other
  today, so the one call is built rather than reused: a check that verifies a
  layout profile before anything is written, a Markdown writer beside the XML
  one, and a switch on the page builder that runs both around the page it
  makes. Its acceptance case is reproducing the page the first plan makes.

### Changed

- **`assets/footer.png` draws Mastodon's logo and the X mark.** Mastodon's is
  its own purple file, a bubble in a gradient from `#6364FF` to `#563ACC` with a
  white "m" painted on it, sized to the GitHub glyph's 23 rows; the X is the
  outline X's own site serves, fitted to the bird's 23 x 21. Both were drawn at
  8x and averaged down, and 930 pixels changed, every one inside the two old
  icons' boxes, so the navy block and every figure **The footer is one strip**
  records still hold. The eleven reference JPEGs keep the GitHub mark and the
  bird: the design language is re-measured against their bytes, and
  `DESIGN_LANGUAGE.md` now says which of the two footers each figure is about.
- **A fragment of a sheet that links out has a new outer shape.** It was one
  `<div class="cheatsheet" role="img">`; it is now that class on a positioned box
  holding a `<div role="img">` and the `<nav>`. A stylesheet reaching
  `.cheatsheet > svg` reaches nothing now, and `.cheatsheet svg` still does.
  `{ wrap: false }` still returns the element as handed over, its link group
  included, for a caller whose box is not an image.
- **`CHEATSHEET.md` and `docs/cheatsheet.html` name the links under
  Rendering**, in step with each other: where `variation.links` comes from,
  `withoutLinks`, the fragment's `<nav>`, `linkLayerFor`, and that a raster
  carries none. `CONTRIBUTING.md`, `docs/drawing-a-sheet.html` and
  `docs/rendering-outside-the-page.html` carry the longer account.
- **Four pins moved, each read before it was regenerated.**
  `tools/fixtures/sheet.variation.json` gained the drawn footer's two links,
  `sheet.fragment.html` the new shape, and `sheet.renders.json` the bytes of
  both. `tools/fixtures/sheet.svg` and the PNG digest did not move, which is the
  evidence the composition itself is untouched.

### Tested

- `tools/test-sheet-brand.mjs`: the asset's header size, the strip's four links
  and no GitHub, the placement arithmetic and no overlap, a 2 x 1 strip placed
  with none, and the drawn footer both ways.
- `tools/test-sheet-render.mjs`: the links on both routes, that they paint
  nothing, the fragment's layer and its one stop per destination, writing twice
  as once, and escaping once each way.
- `tools/test-render-formats.mjs`: a raster is the same bytes with the links and
  without them.
- `tools/test-sheet-footer-browser.mjs`: at 1400 and 390 px, a pointer on each
  mark the strip draws - found in the strip's own pixels, not read from the
  areas - lands on that mark's link, and the comma between two icons on none.
  Moving one area off its icon fails both widths.
- `tools/test-page-structure-browser.mjs`: on `index.html` the sheet's four
  links are named tab stops in the strip's order, outside the image, with the
  text row after them; on a phone the row's links reach 24 x 24, Mastodon's
  carries `rel="me"`, and both go when the sheet does.
- `tools/test-cheatsheet-site.mjs` and `tools/test-site-pages-browser.mjs`: a
  generated page links its drawn footer to the site once, in markup and in a
  real engine, and links no account.

## [1.0.0-alpha.1.7.0]

The generated page stopped being string concatenation, and the half of the site
tooling a build step cannot reach arrived beside it. Both are items of
**Building on the API**, and taking them together is what settled the vocabulary
question underneath them: there are two readers of `data-cheatsheet` now, so the
attribute names belong to one of them rather than to both.

### Added

- **A generated page is a render of a composition.** `siteDocument` builds a
  document of the three models out of what the collector found, `renderFragment`
  composes it, and `sheetLines` splices the result in above the material - so a
  media file of the same cheatsheet is `renderSheet` of the same object rather
  than a second code path that happens to agree today. The figure is spliced in
  by the function that writes one cheatsheet rather than by its two callers,
  which is what makes this one replacement covering every page the tool writes:
  the master page concatenates that function, so a cheatsheet page and the same
  cheatsheet inside the master carry the same render.
- **The material stays, and the reading above it is lossy on purpose.** A sheet
  is a picture of text, so a table becomes rows, a chart's `<script>`
  contributes nothing and a `<pre>` listing loses its indentation - which is
  stated in `textLines` rather than discovered, along with the one it cannot
  keep: an indent is a level, and dedenting a listing against its own shallowest
  line needs a reading of where a listing starts that a scan has not got. The
  markup is written onto the page underneath, untouched, because a reader who
  wants the table rather than a picture of it has nowhere else to get it.
- **A heading keeps its role on the composed sheet.** `<h2>`, a table's `<th>`,
  a `<caption>`, a `<figcaption>` and a `<summary>` are labels for what follows
  them, and the design language sets a label as a comment row. Two roles of the
  six, deliberately: markup says what a run of text is **structurally** and
  nothing about what it is lexically, so a `keyword` read off a `<code>` element
  would be this tool guessing at a language nobody told it.
- **`api/cheatsheet/site.mjs`, the browser entry point.** A page that can run a
  `<script type="module">` builds its own cheatsheet section from the elements
  it already has - no checkout, no Node and nothing installed.
  `cheatsheetSection(document)` hands back a `<section>` in the shape the
  scripted tool writes: a heading, the composed figure, and a `<main>` per block.
  It is handed back rather than inserted, because where it goes is the page's
  decision, and the material is **cloned rather than moved** - moving the nodes
  would take the material out of the page it was published on, which is the
  failure that looks like working, since the section would be right.
- **Which is the half a scan cannot do.** The first limit
  `tools/cheatsheet-site.mjs` states in its own header is that it reads the
  markup as written, so a marker a script wrote at run time is invisible to it.
  A site built from a template at load time, or one whose content arrives from a
  fetch, has markings the file on disk does not carry. `collectFromDocument` is
  the same five answers as data for a caller that wants the document and not the
  markup, and `linesOf` is the DOM's own answer to what `textLines` does with a
  pattern - the better half of the pair, since the walk knows which element a
  run of text sits in rather than keeping a list of exceptions standing in for a
  tree.
- **`renderFragment` takes an `id`.** A composition carries `id="cheatsheet"` on
  its root, which is right for the one sheet a standalone SVG is and is the same
  id twice on a page holding two - invalid markup, and whichever came first for
  a stylesheet or a script reaching for it. The master page is the case that
  raised it, so it is an option of the surface rather than a rewrite in the
  tool: a page embedding several sheets is the API's question as much as the
  site tool's. `format: "svg"` says it has no effect there rather than ignoring
  it, the markup being the composition itself, id and all. Both callers name
  their fragment through `slugFor`, the derivation the surface already uses for
  a render's file name: the names they read are a site owner's file or folder
  name and a page's own `<title>`, and an `id` may hold no ASCII whitespace, so
  `getting started.html` would otherwise write an id no selector can reach.
- **`fixtures/site/`, a placeholder site the tooling can be run against.** Five
  pages, half tutorial and half documentation for a tool, carrying every page
  shape the item names: prose sections, a definition list, code examples, a
  table with a caption and header cells, and a chart. The chart is the one worth
  naming, because it is not only content - it brings a `<script>` with it, and
  that script holds a `</div>` in a string. Both readers treat a script as an
  opaque span, so that closing tag is not a close; a reader that counted it
  would end the marked element early and carry half a page onto the generated
  cheatsheet with nothing said about it.
- **Everything in the fixture is placeholder content**, and that is held rather
  than intended: `tools/test-fixture-site.mjs` reads every address in it and
  requires a reserved domain, checks the one phone number is the reserved
  exchange, and measures the whole folder against a byte budget so the day
  somebody pastes a real page in is the day a case says so. It is also the only
  marked up folder in this repository, which is why the suite runs the tool
  against a **copy** in the temporary folder and why `CONTRIBUTING.md` now says
  never to run it against the repository root.
- **29 cases over the three, and two new files.**
  `tools/test-cheatsheet-site.mjs` is at 157 with the composition, the refusal
  and the slugged name; `tools/test-browser-entry.mjs` is 11 against a hand
  written stub of the DOM, which doubles as the statement of how small a surface
  the module needs; and `tools/test-fixture-site.mjs` is 8 over the fixture
  itself, including the five things its README says are deliberately absent, so
  a fixture that quietly grew one would not make the item that adds it read as
  already done. The suite is 1019 cases.

### Changed

- **A menu element is never written over.** A fill is wrapped in
  `<!-- cheatsheet-site:menu -->` and its closing pair, so a run can tell its own
  work from a site owner's: an element carrying that signature is filled again,
  and one carrying anything else is left exactly as it was. The signature is
  what made the refusal possible at all, and it is the thing an empty check
  cannot answer - a menu element is not empty on the second run either, so a
  refusal reading emptiness would fill once and never again, while filling
  everything non-empty deletes a hand written menu the first time it runs. It is
  read as a pair wrapping the **whole** span, because the one thing worse than
  refusing to fill is filling over markup on the strength of a word. A menu
  element can now get nine things wrong rather than eight, and the new one names
  both ways out: empty the element, or keep the markup and drop the attribute.
  This reverses what `1.0.0-alpha.1.6.0` recorded as a hazard in this file, in the
  tool's own header and on the documentation page.
- **The two markings, the heading sources, the element lists and `prose` moved
  to the published surface.** They are declared in `api/cheatsheet/site.mjs` and
  re-exported by `tools/cheatsheet-site.mjs` under the names they already had,
  so nothing that imported them changed. The reason is the browser entry point:
  with two readers of one vocabulary, a copy in each is two vocabularies that
  agree until one of them is edited - and `prose` was already one function for
  exactly that argument, a page headed from its own file name and a folder
  headed from its own name being one answer read off two names. There are three
  names now.
- **"Dependency free" is now "installs nothing".** The site tool imports
  `api/cheatsheet/index.mjs`, which is this repository's own code, published
  with it and loaded by a relative path. A bare specifier is still an install
  and there is still not one, and the case that held the old spelling was
  written so that the day the surface was imported would be a deliberate edit to
  it rather than a drift - which is what happened. It now allows a builtin or a
  path inside the repository, names the one non-builtin import exactly, and
  reads a multi-line import, the previous pattern having been able to find none.
- **`docs/generating-from-a-site.html` gained the two routes and what a page
  carries**, with `CHEATSHEET.md` and `docs/cheatsheet.html` kept in step down
  to their listings, which is what the parity case holds them to.

## [1.0.0-alpha.1.6.0]

The menu element, and the documentation site folded in with it. The site landed
on 2026.11.08 and carried no version of its own - the work was documentation,
its one piece of code was the test that guards it, and the site's version is
whatever the default branch holds - so it waited here for the next release to
fold it in, which this is.

### Added

- **A site can say where its cheatsheet menu goes, and both menus are now
  filled.** `data-cheatsheet-menu="page"` is a link to the page carrying every
  cheatsheet and `data-cheatsheet-menu="dropdown"` is an entry per page of the
  generated folder. The attribute is the one `collectMarked` has passed over by
  name since it was written - an attribute whose name merely starts the same way
  as the marker is a different attribute - so a site has been able to write this
  since before there was anything to put in one. It is also the only marking
  this tool writes **into** a page the site owner keeps rather than reading out
  of it, which is why the page is spliced rather than rebuilt: its indentation,
  its line endings and everything the scan does not understand come back exactly
  as they went in, and a page marking two menus is read and written once with
  the splices applied from the end backwards.
- **A master page, `all-cheatsheets.html`, composed by the same function that
  writes the individual pages.** `sheetLines` writes one cheatsheet at the
  heading level it is handed, so a cheatsheet page is that at level 1 and the
  master is every cheatsheet at level 2 under a heading of its own, each in a
  `<section data-cheatsheet-sheet>` naming the file it is also written as. A
  second renderer was the obvious shape and is what the item ruled out: the two
  pages would have shown the same material differently the first time either was
  changed, with nothing to say which was right. It is a page of the generated
  folder like any other - in the plan, in the manifest and in the name check -
  and it claims its name **before** any cheatsheet is offered one, so the page
  every menu links to cannot be written over. That is also why it is not called
  `index.html`: a site's own root `index.html` is the commonest marked page
  there is, and a master page of that name would collide on nearly every site.
- **A link is relative to the page it is written into, not to the folder the
  tool resolved.** Everything else a run writes goes into that folder, so a
  marked page two folders down is the case the menu had to answer rather than
  discover: `linkFrom` walks the two site relative paths apart, over their own
  segments rather than through `relative()` from `node:path`, which answers in
  this platform's separators and resolves a relative path against a working
  folder that has nothing to do with either path. An output folder outside the
  site has no such link and is reported rather than written as an absolute path
  that works on one machine.
- **An entry's text is the prose form of the generated file's name**, so
  `base64Utils.html` reads `Base 64 Utils` in a menu by the same conversion that
  heads a page from its own name. Not the cheatsheet's heading, which may have
  been read off a `<title>` and be a sentence a site wrote to be read - the
  wrong length for a menu, and the one thing not every entry's source has in
  common.
- **Six things a menu element can get wrong, each reported with the page and the
  line.** A value naming neither menu, and no value at all - neither is given a
  default, unlike the marker's, because the two menus are a link and a list and
  guessing writes markup nobody asked for into somebody else's page. An element
  that can enclose nothing and one that is never closed, which are the answers
  the marker already had. An element carrying both markings, where the material
  was read out of it and a menu written in would replace what was just
  collected. And a menu element **inside** marked material, which is the one
  case neither scan sees alone: filling it would put the menu on the generated
  cheatsheet the next run writes, where its links are relative to the wrong
  page, and it is the only marking that would make a second run write a
  different cheatsheet than the first.
- **The two authoring methods documented side by side, with the trade-off
  argued rather than described.** `docs/generating-from-a-site.html` had a
  paragraph each; it now has a table of five rows and the argument the table is
  for - an attribute carries one value and nothing to learn, a comment carries
  as much as the page has to say and a syntax to get right with five more ways
  to write it wrong, so the question is not which is better but how much the
  page has to say. With a note that nothing is lost by starting with the
  attribute, since a page changes method by having a comment written in front of
  the element it already marked.
- **16 cases over the menu and the master page**, taking
  `tools/test-cheatsheet-site.mjs` to 145. The ones worth naming are the ones
  about what is **not** written: a page keeping its CRLF and its indentation, a
  page whose material and whose prose outside the two marked spans are untouched,
  a dry run that reports the menus and fills none of them, and a second run that
  leaves a filled page byte for byte as the first one left it - the fill is
  composed from the manifest rather than from what is in the element, so it
  converges after one run instead of growing.

- **A documentation site at `docs/`, and a `README.md` that is a front door.**
  The README crossed 300 lines on 2026.11.07 and was 310 by the time it was
  measured, which is the point at which one file is carrying more than one file
  should. Its eleven sections are now thirteen hand written pages - ten section
  pages, since the two about viewing the examples share one, plus an overview
  and the two short records below - and the README keeps a stand-in per section
  whose level 2 heading links to the page carrying the rest. Nothing was summarized into existence on the way: the pages carry
  the text the README had, word for word, and the README is 192 lines.
- **`QUICKSTART.md` and `CHEATSHEET.md`.** The first is the essentials for a
  reader who wants a sheet on screen now; the second is the commands, the
  flags, the model shapes and the palette, dense and scannable, for someone who
  has read the rest. Each is a file in the repository and a page on the site,
  because a reader on github.com gets the file rendered and a reader on the
  site gets the page.
- **`tools/test-docs-site.mjs`, 31 cases over the site.** The menu is static
  markup repeated on thirteen pages - which is what lets the whole site read
  with JavaScript off, and exactly the shape that drifts - so it is compared
  across the pages byte for byte, with `aria-current` normalised away and then
  asserted to be the one entry naming the page that carries it. Every entry
  names a file that exists and every file is named by an entry, every relative
  link resolves, every fragment is an id its own page carries, and the README's
  links back at the site are held the same way.
- **A link to the documentation on the example page.** The pages link back at
  it, and without this the pair was reachable from one end only: a reader who
  arrived at the composed sheet had no route to the documentation that explains
  how it got there.
- **`docs/docs.css`, recorded in `DESIGN_LANGUAGE.md`.** The stylesheet opens on the same token block `index.html` carries,
  token for token, and the test holds the shared ones equal across the two. The
  three it adds are recorded with their measured ratios: an `h2` step the app
  page never needed, a monospace stack for examples that are text rather than
  artwork, and a code surface per theme - `#EEEEF1` and `#0A0C44` - carrying
  body ink at 16.99:1 and 17.22:1, the accent link at 4.89:1 and 6.51:1, and a
  boundary at 4.19:1 and 3.77:1. The one substitution holds there too: the
  mark's green reaches 2.42:1 on the light code surface, so `#2E7534` carries
  the link inside a listing as well as outside one.

### Changed

- **The manifest's shape moved to `3`.** `pages` now carries the master page
  first and the site's cheatsheets after it, told apart by `master` in
  `headingSource`. No field was added and none was renamed, so a reader looking
  a page up by name is unaffected - but one that counted the entries to count
  the site's cheatsheets is off by one, which is a meaning changed in silence
  and what the number is raised for. `readManifest` reads every shape the tool
  has written, as before, because the folder is taken from where the file is.
- **The menu element's plain content is written over.** A hand written menu
  left in the element as a fallback is replaced; leaving such an element alone
  is the item queued behind this one, and until it lands a menu element whose
  content is plain is an element this tool owns. It is stated in the file's own
  header and on the documentation page rather than left to be discovered.
- **Content that is not plain is refused instead.** A menu element holding
  material marked with `data-cheatsheet`, or holding a second menu element, is
  reported with the page and the line and left alone. Neither is a fallback
  somebody loses the look of: the first would delete the site's only copy of
  material the collector had just read out of that page, since the next run
  finds nothing marked there to write again, and the second cut the page's
  markup apart, because the fills are applied back to front and the inner one
  had already moved the offset the outer one was measured with. A menu element
  can now get eight things wrong rather than six.
- **The menu wraps below 900px rather than stacking.** Thirteen entries in a
  column is 820px measured at 390x844, which is most of a phone screen standing
  between a reader and the page they opened. Below the breakpoint each group's
  list is a wrapped inline row and the whole menu is 500px with the page's own
  title on screen beneath it; above it the menu is a 280px fixed column that
  scrolls in its own right. Either way the page being read is marked with
  `aria-current="page"` and a border or an underline, never by colour alone.
- **`tools/test-theme-rendering-browser.mjs` names the gaps it measures.** It
  took the paragraph under the rule as `body > p`, which matched the
  documentation link the moment that landed above it, and read one gap as
  spanning two paragraphs - 74px, which the 8px step does not divide, with
  every declaration on the page still on it. The three gaps are now named for
  the elements they are between.

## [1.0.0-alpha.1.5.0]

### Added

- **A second way for a site to mark its material: a comment.**
  `tools/cheatsheet-site.mjs` read one attribute, which carries one value, so a
  page with several things to say about its material had nowhere to put them.
  `<!-- {% cheatsheet: [heading: page, group: page, name: splice] %} -->` is
  where: it applies to the element that follows it, with nothing but whitespace
  in between, and it is a comment rather than a second attribute because it says
  something about the content after it rather than about an element it sits on.
  The element's extent is read with the same depth walk `closingTagOf` gives the
  attribute, so nesting, an unclosed element and a void element all answer the
  way they already did.
- **A cheatsheet comment stays opaque**, which is the decision the parse turns
  on. It is still a comment, so a `data-cheatsheet` written inside one is still
  not a marker - that is the whole of what a commented-out section means, and
  making the comment transparent instead would have turned every marker a site
  owner had decided against back on. `commentDirectives` reads the directives
  out of the comment ranges `opaqueRanges` already found, filtered by their
  opener so there is one walk of the document rather than two readings of it that
  could disagree about where a comment ends.
- **Three properties, recorded as data in `COMMENT_PROPERTIES`.** `heading`
  names the source the heading is read from, `group` says whether the page joins
  its folder's cheatsheet or is one of its own, and `name` says what file the
  cheatsheet is written as - every option the tool has to set rather than every
  property a syntax could carry. It is data for the reason `HEADING_SOURCES` is:
  the parse reads the list to decide what a property is and the finding reads it
  to say what the vocabulary is, so the two cannot disagree about it. `group:
  page` is the one thing a page inside a folder had no way to ask for, and
  `name` belongs to the cheatsheet rather than to the page, because a folder of
  four pages is one file and any of the four can say what it is called.
- **More than one property per comment**, which is what the brackets are for.
  The list is split on the commas that are not inside a quoted value and each
  pair on its first colon, so the three shapes a hand written list has all read:
  a trailing comma is a trailing comma rather than a property with no name, a
  value may hold a colon, and a quoted value may hold a space or a comma. A
  property written twice with two values keeps the first and says which it
  dropped; written twice with one value it is a repeat and says nothing, which
  is the silence a page naming one heading source twice already got.
- **A comment is reported with the page and the line it was written on**, which
  nothing else in this tool is. Every finding before this named an element a
  reader could search their page for, and the words of the wrong comment on a
  page of several are the same words - so the offset the scan already carried is
  turned into a line by `lineAt` rather than thrown away. Eight things a comment
  can be wrong about have a sentence each, in `COMMENT_PROBLEMS`: a body that is
  not a bracketed list, a property the vocabulary does not hold, a value a
  property does not take, a property with no value, a property written twice, a
  name that is not a file name, a comment with no element after it, and a
  comment sitting inside material already collected. Each says what was ignored
  and what happened instead, and the content after the comment is still
  collected with the defaults - a finding is the site's to fix and not a reason
  to drop the page.
- **A comment that marked nothing sets nothing.** The properties belong to the
  material, so the last two of those eight reach neither the page's heading nor
  its grouping nor the file its cheatsheet is written as, and the finding names
  which of them was dropped. The alternative contradicts itself: a comment left
  in front of prose would be reported as having marked nothing and then rename
  the cheatsheet anyway, and because the first answer in source order wins it
  would outrank the comment that did mark the material.
- **A name is refused rather than sanitised.** `NAME_PATTERN` is stricter than
  any filesystem involved, because the value becomes a path under the generated
  folder: a `/`, a `\` or a leading dot in it is either a folder this tool does
  not create or a way out of the one it resolved, and a site owner who wrote
  `name: ../out` meant something. `namingFindings` is the opposite shape of
  `nameCollisions` and is kept separate from it for that reason - a collision is
  two cheatsheets wanting one name, and this is one cheatsheet being given two.

### Changed

- **The two methods are one collector, and marked material is collected once
  whichever method marked it.** `collectMarked` gathers candidates from both and
  one merge decides between them, which is what makes that a rule about the
  material rather than a rule about the attribute: a comment whose element also
  carries `data-cheatsheet` is one block carrying both answers, and either method
  written inside the other's element is part of it. The two are not treated alike
  when one is dropped, and the asymmetry is deliberate - a nested attribute adds
  nothing to what its parent already said and goes in silence as it always has,
  while a nested comment carries properties that are being ignored, which is the
  kind of silence this tool spends its findings on. A block now carries the
  `method` that marked it, the `line` it was marked on, and the `properties` and
  `problems` a comment read.
- **Where a comment and the attribute both speak, the comment wins**, and
  `headingFor` is the one place that is stated rather than wherever the two
  readings happen to meet. A comment is the more specific of the two: it was
  written about this material, while an attribute sits on an element and may have
  been there first. The disagreement is reported either way, which is the same
  judgement a page naming two heading sources in one method already got, and the
  finding names the markup the page actually wrote rather than the method it
  could have used instead.
- **`groupCheatsheets` is two passes**, because a name belongs to a cheatsheet
  and not to a page: which name a folder's cheatsheet wants is not knowable until
  its pages are all in hand. The pass that claims names runs over the groups in
  the order they were first seen, which is page order, so the winner of a name
  collision is the one it always was. A cheatsheet that was dropped for a
  collision reports no naming disagreement - nothing named it in the end, so a
  sentence saying which name was used would describe a file that is not there.
- **`README.md` states the comment syntax beside the attribute**: what a comment
  applies to, the three properties and what each sets, that a comment is still a
  comment, and which of the two methods wins where both speak.

## [1.0.0-alpha.1.4.0]

### Added

- **A folder of a site is a cheatsheet.** `tools/cheatsheet-site.mjs` wrote one
  page per source page, named for that page's own file; it now groups every
  marked page of a folder into one page named and headed for the folder, with a
  `<section data-cheatsheet-page>` and an `<h2>` per source so each page keeps
  the heading it asked for. A page at the site root has no folder to be named
  for and is written under its own name, as before. `pageFolder` answers the
  immediate parent, which is what makes one folder one cheatsheet rather than
  one top-level section with everything below it in it, and `groupCheatsheets`
  is the one function the write, the plan, the manifest and the collisions all
  read - the same argument `carryingPages` makes one step earlier.
- **A heading read off a name is read as prose**, through `prose`:
  `somePageName.html` is headed `Some Page Name` and the folder `base64Utils/`
  heads its cheatsheet `Base 64 Utils`. Four breaks, each a shape a real file
  name has - a separator the name already carried, a case change, an acronym run
  before a capitalised word, and either side of a digit run - so
  `parseHTMLString` is `Parse HTML String` rather than `Parse H T M L String` or
  `Parse HTMLString`. Only the first letter of a word is touched, because a site
  that wrote `HTML` meant it and lower casing the rest would answer `Html`. A
  `<title>` is left exactly as the site wrote it: a file name is written for a
  filesystem and a title was written to be read.
- **A folder's sections read in the order the site reads.** The `Map` the
  grouping is built on iterates in insertion order and pages are pushed in the
  order `crawlSite` hands them over, which is sorted by path, so there is no
  second sort to disagree with the first. The case holds the grouped page
  against `crawlSite` itself rather than against a list written beside it, which
  is the only form in which the claim - that the two agree - is actually
  asserted.

### Fixed

- **A name is no longer the one thing the collision report could not settle.**
  `index.html` in two folders was the case the flat output folder collided on
  most, and it was reported rather than resolved because naming belonged to this
  item: `guide/index.html` and `reference/index.html` are now `guide.html` and
  `reference.html`. What is left is the two the grouping cannot settle - a
  repeated folder name under different parents, and a root page named for a
  folder beside it - and those are still refused rather than overwritten, now
  one finding per dropped cheatsheet instead of one per page, so a folder of
  four pages that lost a name is one sentence. A finding writes a folder with a
  trailing `/`, which is the whole of what tells `docs/` from `docs.html` in a
  sentence naming both.
- **A name is claimed without case**, so the check cannot be walked through on
  the filesystems most site owners have. `a/Guide/` and `b/guide/` want
  `Guide.html` and `guide.html`, which are two files on Linux and one file on
  Windows and macOS: comparing the names as written wrote both there, left the
  first one's material overwritten by the second, and reported and recorded two
  cheatsheets with one file on disk and an exit code of `0` - the exact outcome
  the collision check exists to rule out, reached through the check itself. The
  second is now dropped and reported like any other collision, and the finding
  names both spellings, since one of them printed twice would read as a plain
  repeat rather than as the two names a case collision is made of.

### Changed

- **The manifest's shape is `2`**, because a page entry's `source` became
  `sources`: a cheatsheet named for a folder is made of every marked page in it,
  and a scalar field left pointing at the first is a field whose meaning changed
  in silence. `headingSource` gained the value `folder`, which no marker names -
  `HEADING_SOURCES` is still the two values a site writes.
  **`readManifest` reads every shape this tool has written**, per
  `MANIFEST_READABLE`, rather than only the current one. The folder is taken
  from where the file is rather than from anything inside it, so an older
  manifest answers that question as well as a current one - while refusing a
  version-1 file would make an existing `cheatsheets/` folder invisible and
  cause exactly the second section beside the first that the manifest exists to
  prevent. The run rewrites the file, so one run heals the shape, and a version
  this tool has never written is still passed over.
- **`renderPage` is `renderCheatsheet`** and takes a cheatsheet rather than a
  page, since a cheatsheet is what is written. `pageFilename` answers the
  folder's name, `plannedPages` carries `sources` and a `headingSource` instead
  of one `id` and one `source`, `writePages` carries a `name` and `sources`
  instead of one `id`, and the report line names every source of a grouped page
  - one naming only the first would read as the others having been dropped,
  which is what a collision finding means.
- **A generated page's file name moves for every page that sits in a folder.**
  A site owner who committed `cheatsheets/install.html` from `guide/install.html`
  gets `cheatsheets/guide.html` on the next run, with the old file left where it
  was: the tool writes what the site has and removes nothing it did not write.
  The project version is a minor step because the versioned public surface is
  `api/cheatsheet/` and nothing in it moved; the tool's own artifact carries its
  own compatibility number, and that is the one that was raised.
- **`README.md` states the naming and the grouping**, which is what a site owner
  reads before pointing the tool at their own checkout: a folder as a subject, a
  root page under its own name, the prose conversion, and the two collisions that
  are left.

## [1.0.0-alpha.1.3.0]

### Added

- **`tools/cheatsheet-site.mjs` records the folder it resolved**, in
  `cheatsheet-site.json` inside that folder, and a later run reads it through
  `readManifest` before the ladder is consulted. The manifest names the folder's
  own site relative path and, per generated page, its source, its file name, its
  heading and which source that heading came from - everything a reader needs to
  find the generated section without recomputing the ladder, **The Menu Element**
  being the one in `TODO.md` that will. Written from the answer rather than
  during the resolution, so `resolveOutput` still creates nothing, which is the
  only reason its second candidate is reachable at all. Where the file sits
  outranks what its `output` field says, so a renamed or copied folder is the
  folder a site owner has, and this run rewrites the field, so a stale one heals.
- **`--dry-run` reports the folder and the pages a run would write, and touches
  nothing** - no folder created, no page written, no manifest. It is nearly free
  for the reason the manifest is careful: resolving already creates nothing, so
  what is left is not calling `writePages`. Both modes report from one plan,
  `plannedPages`, so what a dry run promises and what a real run does cannot
  drift - held by comparing the two reports line for line rather than by
  comparing the plan with itself.
- **The marker's value chooses the page's heading**, through `headingFor`:
  `data-cheatsheet="title"` reads the page's own `<title>` and
  `data-cheatsheet="page"` reads its file name, trimmed and matched without
  regard to case because an attribute value is written by hand. The file name is
  taken verbatim - **Convert a camel case file name to prose** is the next item
  under the same header. A value naming neither source is a finding against the
  page it was written on, naming the source that did answer, and a value a page
  cannot honour is a finding too: an explicit `title` on a page with no `<title>`
  is reported where the default on the same page is not, because the default has
  a documented fallback and the ask does not. Two sources named on one page is a
  page asking for two headings, so the first in source order wins and the
  disagreement is reported rather than left to the last write.

### Fixed

- **A second run over an unchanged site writes the same bytes into the same
  folder.** It did neither. Run one found `cheatsheets/` free and wrote there, so
  run two found that name taken - by its own output - and resolved
  `cheatsheets/cheatsheets/`: a site owner who ran the tool twice had two
  cheatsheet sections, one of them stale, nothing overwritten and nothing said
  about it. The manifest is what closes it, and the case that pins it deletes the
  manifest and watches the second run land in the second folder, so what the
  file buys is asserted rather than described. Byte identity is held over three
  runs with the manifest included in the comparison, and paired with the case
  that keeps it from meaning frozen: a page the site changed is the only
  generated page that changes.
- **A generated page's heading no longer ignores what the page asked for.**
  `collectMarked` had carried the marker's value through without judging it since
  the collector was written, and `renderPage` took the `<title>` with the file
  name behind it whatever the value said - so a page marked
  `data-cheatsheet="page"` was headed from its title, in silence, and the two
  values the attribute accepts meant nothing.

### Changed

- **`README.md` states the heading values, the dry run and the manifest**, which
  is where a site owner pointing the tool at their own checkout reads what it
  will leave behind. The generated folder now carries `cheatsheet-site.json`
  beside the pages, and four cases in `tools/test-cheatsheet-site.mjs` that
  asserted the folder's contents were updated to expect it.

## [1.0.0-alpha.1.2.0]

### Added

- **`rowSlot` and `sectionSlots` in `api/cheatsheet/layout.mjs`**, both on the
  published surface through `api/cheatsheet/index.mjs`. `sectionSlots` is the
  subset of a layout's holding slots a section can reach - the title, the
  subtitle and the footer lockup hold a kind each and are filled from named
  fields of the document, so counting every slot carrying `holds` would count
  three places a section can never go. `rowSlot` is the one of them a
  composition sets its rows in, and it is what `composeSheet` now places from.

### Fixed

- **The resolved slot is what the rows are placed from**, which closes the
  limitation the `1.0.0-alpha.1.1.0` note below records in its own words: *"what
  resolution buys, for now, is the refusal and not the placement"*. `rowsFor`
  called `slotForSection` for its refusal and threw the answer away, and
  `composeSheet` took every figure of the code block - the padding ceiling, the
  two usable measures, the spacing the fill floor allows, the fill it reports,
  and the `x` and `y` of every row - from the design language's `bands.code` and
  `divisions.panel` instead. The same region was written in two places and only
  one of them was read, so a layout that moved its panel moved the ground and
  left the rows behind, and a layout keeping a slot per kind drew both streams
  in the code panel while the slot the document had resolved stayed empty.
  Measured 2026.11.03 against a layout with a second `listing-panel`: six rows,
  all at the code panel's own `x`, and the resolved slot never filled.
  `composeSheet` now measures and places against `boxOf(layout,
  rowSlot(layout))`, for a compact document as well as a formal one. On the
  recorded layout that box is the language's panel to the pixel, so the eleven
  sheets and every committed fixture reproduce byte for byte.
- **A layout that keeps nowhere for a section is refused at the layout's own
  path**, where the schema used to accept it and the composition used to blame
  the document for it. `holds` is optional per slot and most slots hold nothing,
  so a layout omitting it everywhere - which every layout written before the
  field existed does - passed `readLayout`, composed a compact document, and
  refused a formal one with `document.sections[0].slot asks for "entries"`. The
  schema said optional, the composition said required, and the message named the
  wrong file. The requirement is now counted once, over the whole layout, beside
  the other cross references `readLayout` makes: `layout.slots: keep nowhere for
  the content of a section ... One slot has to hold "entries" or "listing"`. Both
  document shapes get that one answer.
- **And a layout that keeps two of them is refused by the same count.** A
  composition sets one stream of rows, so which slot a section goes in stops
  being a choice the moment a layout offers two - `slotForSection` already
  refused two slots holding *one* kind and said so, and the kinds split across
  two slots went through. Named back with both slots, so the file that is wrong
  says which lines are wrong. The refusals are kept on `rowSlot` as well, since
  `rowsFor` takes a layout nothing read and a placement from `undefined` draws
  every row at `NaN`.

### Changed

- **`README.md` and `CONTRIBUTING.md` state the one-slot rule**, which is where
  a caller writing a layout for `--layout <path>` reads it. Neither said how
  many slots a layout keeps for a section, and the answer had been "one" since
  the field was added and enforced nowhere.

## [1.0.0-alpha.1.1.0]

### Added

- **A section's `slot` is resolved against the layout, by `slotForSection` in
  `api/cheatsheet/layout.mjs`.** `SECTION_KINDS` names the two kinds a section
  may ask for, `kindOfSection` reports the kind a section asks for, and `rowsFor`
  takes an optional second argument: handed a layout it resolves every section
  before it projects a row, and handed none it projects exactly what it always
  did. `composeSheet` passes one, so the resolution is on the composition path
  and the three names are on the published surface through
  `api/cheatsheet/index.mjs`.
- **The site collector scans a start tag rather than searching it**, through a
  private `startTagAt` in `tools/cheatsheet-site.mjs` that walks from the `<`
  tracking whether the cursor is inside a single or double quoted value. Where
  the tag begins, where it ends and the text an attribute is read out of now all
  come off one scan, so the three cannot disagree with each other.

### Fixed

- **A section naming a `slot` this layout cannot answer is refused by name,
  rather than drawn in the code panel regardless.** `SheetSection.slot` is documented as
  the field that points outward and `slotsHolding` is the query that answers it,
  and nothing on the composition path called it: `rowsFor` concatenated every
  section's rows into one stream regardless, so
  `{ title, sections: [{ slot: "brand", entries: [...] }] }` validated, composed
  and drew its entries in the code panel with no refusal and no note. The model
  said one thing and the drawing did another, which is the one failure a document
  model defined to be independent of the layout cannot afford. Four answers now,
  each a different mistake: a kind that is no kind at all, a real kind a section
  may not ask for - `heading` and `brand` are filled from the document's own
  title, subtitle and brand assets - a kind this layout holds no slot of, and a
  kind more than one slot holds, which a composition placing one row stream
  cannot choose between. Every refusal carries the section's own path, so
  `document.sections[1].slot` names the one that is wrong rather than the
  document. The field stays a plain string in the document schema on purpose:
  the kinds are the layout's, and validating against them in `document.mjs`
  would be the model reading a layout. What resolution buys, for now, is the
  refusal and not the placement: the projection is still one stream of rows and
  the code panel still draws it, so a layout keeping a separate slot per kind
  resolves two slots and fills one. On this repository's sheet the two resolve
  to the same panel, which is why the distinction does not show here.
- **A `>` inside an attribute value is no longer read as the end of a start
  tag**, which failed two silent ways on markup that needs no escaping to be
  written. Before the marker, `<div title="a>b" data-cheatsheet><pre>x</pre></div>`
  collected **nothing**: the `>` in the value looked like the end of the tag, so
  the marker read as sitting outside one, the candidate was dropped, and the page
  contributed no block and raised no finding. Inside the marker's own value,
  `<div data-cheatsheet="a>b"><pre>x</pre></div>` collected the **wrong** thing:
  the tag was cut at that `>`, so the value came back as `"a` and the remainder
  of the start tag was carried onto the generated page as content.
- **And the same boundary is read when counting to the closing tag.**
  `<div title="a/>b">` is a plain open, and taking the first `>` ended the tag
  early and left a `/` in front of it, so the XHTML self-close test read it as
  one, the depth never rose, the first `</div>` closed the marked element, and
  everything after it was dropped. Silently: the count reached zero, so the page
  looked cleanly closed. Found while fixing the two above, from the same cause.

### Changed

- **`.claude/constants.md` records semantic versioning**, which the
  `1.0.0-alpha.1.0.0` note below listed as deliberately outstanding. The standing note
  put that rewrite after the **release** of the first semantic version rather
  than after the switch, and `v1.0.0-alpha` was tagged and published on
  2026.11.02, so it fired. The **Versioning and releases** rule is replaced and
  carries the stage suffix; the other five rules in the file are untouched.
- **`TODO.md` opens by saying the project is in released mode**, where it had
  said dated. A roadmap section still states its intent rather than naming a
  size, and every changelog entry below `1.0.0-alpha.1.0.0` is still keyed by the date
  it was applied.
- **`CONTRIBUTING.md` documents `slot`**, which it had not: what a kind is, why
  a document names a kind rather than a slot, and the refusal a section gets for
  asking to be put where nothing reads a section from.

### Notes

- **One scanning limit is kept rather than closed, and is stated in the file's
  header.** A *closing* tag spelled inside an attribute value - a
  `title="</div>"` on some other element inside a marked `<div>` - still closes
  the marked element there, because the depth count looks for one name rather
  than tokenizing every tag it passes. It is one step past the markup a site may
  legally write, since an unescaped `<` in an attribute value is a parse error
  where the `>` this version fixed is not, and closing it needs the walk to pass
  over whole start tags: a tokenizer rather than a patch. It is silent when it
  happens and there is a case measuring that, so a later fix has an expectation
  to flip instead of a behaviour to discover.
- **`cross-os-social` is still refusing every call**, measured again on
  2026.11.03 with the same `The build is older than the source it came from`
  that 2026.10.15, 2026.10.27 and 2026.11.02 met. No route record and no drift
  reading could be taken. Nothing was owed a draft this run in any case: the
  watch pattern matched the eleven original JPEGs, all already in the ledger,
  and no image was created.

## [1.0.0-alpha.1.0.0]

### Added

- **A formal section can carry a code listing.** A section holds `entries` or
  `lines`, exactly one of the two, and `lines` is the same line shape the
  compact `code` array has always carried - a text and an optional syntax role.
  `rowsFor` in `api/cheatsheet/layout.mjs` passes a listing through as rows
  unchanged, which is the only correct projection for one: its indentation means
  a nesting level and its role means a syntax colour, so a layout that re-wrapped
  or re-indented it would be changing what the document says rather than how it
  is set. `SLOT_KINDS` gained `listing` beside `heading`, `entries` and `brand`,
  and a slot's `holds` may now name one kind or several - this sheet's own
  `code-panel` names both, because entries become rows and a listing already is
  rows.
- **`tools/test-render-formats.mjs` pins the output surface against committed
  output, one render per format.** The SVG is the committed `sheet.svg` byte for
  byte, which is the claim worth making about that format: the surface adds
  nothing to the composition's own markup. The fragment is committed in full as
  `tools/fixtures/sheet.fragment.html`, the built-in raster at scale 1 is the
  committed digest reached through the door, and every render's report -
  media type, extension, route, pixels, `publishable`, family, notes - is
  committed as `tools/fixtures/sheet.renders.json`. `jpeg` and `webp` pin their
  declared surface rather than their bytes, and skip with the install command on
  a clone with no browser: an engine's raster moves with its build, its platform
  font stack and its codec, none of which is this repository's change, and a
  digest over them would fail on somebody else's release schedule. A case holds
  that there is an expectation for every format the surface names, so a sixth
  arrives with a pin or with a stated reason it has none.
- **`tools/fixtures/sheet.mjs`** holds the fixture document and its seed, beside
  the files it is pinned as. Two test files now pin that sheet at two layers -
  the composition in `test-render-fixture.mjs`, the output surface in
  `test-render-formats.mjs` - and a copy in each would drift silently, because
  the two pin different artifacts and nothing compares them.
- **`tools/cheatsheet-site.mjs`**, a dependency free script that crawls a site
  tree, collects the content it has marked with `data-cheatsheet`, and writes a
  cheatsheet page per source page that carried any. It runs against somebody
  else's checkout, so every import is a Node builtin and nothing assumes this
  repository's layout. With no parser available the collector scans: it counts
  tags of the same name to find where a marked element ends, refuses a name that
  merely starts the same way on both the opening and the closing side, ignores a
  comment and a `<script>` and a `<style>` on both counts - a marker inside one
  is not a marker and a tag inside one is not a nesting level, so a `</div>`
  written in a script string does not end the element early - and reports markup
  it could not read as a finding against its page rather than writing a page
  with the rest of the file in it.
- **The output folder is resolved before anything is written.** `cheatsheets/`
  under the site root, then `cheatsheets/cheatsheets/`, then
  `cheatsheets/cheatsheets_0/` counting upward until a name is free, bounded at a
  hundred tries. Resolving creates nothing, which is what makes the ladder
  reachable at all - a resolution that created the folder as it tested it would
  find its first candidate taken by the time it considered the second. A file
  with the folder's name counts as taken, and every name after the first sits
  inside the first, so a site ends up with one `cheatsheets/` however many runs
  have resolved a name under it.
- **Two pages wanting one output name is reported rather than resolved.** The
  output folder is flat and a generated page takes its source file's base name,
  so a site with `guide/index.html` and `reference/index.html` marked has two
  pages asking for `index.html`. Neither is overwritten: the first in page order
  is written, the second is a finding naming both, and the run exits non-zero
  like any other finding. Qualifying the name instead would be a naming scheme,
  and naming belongs to the parent tag method.
- **`tools/test-drawing-credit.mjs`** holds the drawing-credit rule: the exact
  trailer, the refusal of the dangerous reading, and a case that fails any queued
  item listing the collaborator among its own steps.

### Changed

- **The compact document shape is no longer called provisional, because both
  shapes are permanent.** The word carried a promise - that the twenty-eight
  committed `sheet.json` documents would be ported to `sections` and the word
  retired with them - and the port would lose information rather than move it.
  With a listing kind in the formal model the port is available and lossless,
  and the compact shape is what it always was: the shorthand for a document of
  one listing, since `{ title, code }` says exactly what
  `{ title, sections: [{ lines: code }] }` says. A case composes both through the
  whole algorithm and compares the markup, which is where that claim would break
  if it were only a claim. `PROVISIONAL_SCHEMA` is `COMPACT_SCHEMA`,
  `ProvisionalDocument` is `CompactDocument`, and
  `tools/cheatsheet.mjs --data-only` reports `shape: "compact"` rather than
  `"provisional"` - a marker that says which shape a consumer is holding instead
  of how long it has left. Not one document was rewritten.
- **"Add `graphic-designer` as a collaborator" means a `Co-Authored-By` trailer,
  and the exact text is in `CONTRIBUTING.md`.** The rule was stated in three
  places and satisfied in none, and the reason was that it read two ways. The
  repository-collaborator reading is not merely unintended: `graphic-designer` is
  a real GitHub account registered in 2014 and belonging to someone with no
  connection to this project, so acting on that reading would hand push access to
  a stranger. The trailer's email is the address this repository already credits
  agent work to, because GitHub attributes a co-author by email and never by
  name. Whoever writes the commit adds it; it is not a step the work carries out,
  which is why the conventions under **New Cheatsheets** now point at the rule
  instead of asking more than fifty queued items to do something a run cannot.
- **`themePairings` resolves the rowed slots through `slotsHolding`** rather than
  by comparing `holds` for equality. The equality test measured nothing the day a
  slot could hold two kinds, and what it stopped measuring was the six syntax
  inks on the code panel - the only pairings on the sheet that are not on a slot
  of their own.
- **This repository versions semantically from here**, which is what finishing
  **Implement Cheatsheet API** was the condition for. See **The versioning
  changed on 2026.11.02** above for what that means and what it leaves alone;
  this is the first version under it, and the dated sections below are
  untouched.

### Notes

- **`.claude/constants.md` still records the policy this version replaces.** Its
  **Versioning and releases** rule says the repository cuts no releases and
  bumps no semantic version, and a run does not edit that file - it is the
  operator's. The standing note that asked for this switch anticipated the
  collision and put the constant's rewrite after the **release** of the first
  semantic version rather than after the switch, so it is deliberately still
  outstanding. The one line that needs changing is the rule's opening sentence.
- **The drawing-credit rule is now checkable but still not automatic.** A commit
  that creates a `sheet.json` or writes a render out carries
  `Co-Authored-By: graphic-designer <noreply@anthropic.com>`, and whoever writes
  the commit adds it: a run records a commit mode in a two-line file and does not
  call `git`, so nothing in the work itself can.
- **`cross-os-social` is still refusing every call**, measured again on
  2026.11.02 with the same `The build is older than the source it came from`
  that 2026.10.15 and 2026.10.27 met. No route record and no drift reading could
  be taken. The watch pattern is not the fault: it matched the eleven original
  JPEGs, all already in the ledger, which is a quiet day rather than a stale
  recipe.

## [2026.11.01]

### Added

- **A document can be read from a file.** `readDocumentFile` in
  `api/cheatsheet/files.mjs` takes a path, parses the JSON, and holds it to
  whichever of the two document schemas it is written in - reporting which one
  did. It is in `files.mjs` rather than in `document.mjs` because reading a file
  is `node:fs`, and `document.mjs` is in the static graph of `index.mjs`, which
  the page loads with a bare `import`. `readDocument` beside it is still the
  plain-object form, and the file route calls it rather than repeating the
  refusals, so a bad field comes back as
  `document.sections[2].entries[1].term` either way.
- **JSON is the only input format, and another one is refused by name.** A path
  ending in `.yaml`, `.yml`, `.toml`, `.json5`, `.jsonc`, `.md` or a module
  extension is turned down with what to do instead - a parser this repository
  does not install, or a plain object a caller imports and hands over - before
  the disk is touched. `JSON.parse` on a YAML file reports a syntax error at
  character 1, which says the file is broken when what is true is that it is a
  file this reader was never going to open. A folder is refused as well: which
  file in a folder is the document is a catalog convention, and nothing in this
  layer may assume this repository's layout.
- **`tools/cheatsheet.mjs --document <path>` composes a document that is not in
  the catalog.** Every route into the command was a manifest slug until now, so
  a sheet `tools/build-manifest.mjs` had never seen could not be rendered at any
  format - which made the command a catalog tool with a renderer behind it
  rather than an entry point for a document. Both routes report the same fields,
  with a new `source` saying which flag named the sheet, because a consumer
  parsing `--json` should not have to branch on which was typed.
- **`examples/render-formats.mjs`, one worked example per output format.** It
  composes the document the other two examples compose, once, and renders it to
  all five formats through `renderOf`, reporting which route answered, which
  family drew, the pixels, the bytes and whether the result may be shown to a
  reader. Three of the five need nothing installed; `jpeg` and `webp` are
  browser only and come back with the reason rather than bringing the run down,
  which is what lets the whole example run on a bare clone.

### Changed

- **The static import walk crosses the folder boundary**, in
  `tools/test-sheet-render.mjs`. It followed only `./` specifiers inside
  `api/cheatsheet/`, so "the published surface reaches no Node builtin" was
  true of thirteen files and silent about everything past them - including the
  vendored drawing surface the page actually draws through. A specifier is now
  resolved against the directory of the file that wrote it, the way the runtime
  resolves one, which takes the walk into `graphic-design/index.js` and down
  through its chunks. It also reports a bare specifier, which is the
  module-level form of "nothing to install", and the two entries the accent
  reader loads on demand are walked as roots of their own, because the page does
  load them. Seventeen modules in the static graph and eleven in the on-demand
  one, with no builtin and no bare name in either.
- **The worked examples write through `api/cheatsheet/` rather than through the
  drawing surface underneath.** `reproduce-sheet.mjs` and `restyle-sheet.mjs`
  both called `writeComposition` from `graphic-design/files`, which worked and
  was a hand copy of the route this layer published on 2026.10.31 - so the
  published route had no example at all. Both render with `renderOf` and write
  with `writeRender` now. One visible consequence: the restyled sheet is
  `splicing-arrays-ember.svg` rather than `splicing-arrays.ember.svg`, because a
  derived filename is slugged. Both report the file repository relative, the way
  `render-formats.mjs` does - `writeRender` hands back a resolved path, and an
  absolute one is the single figure in these reports nobody can compare against
  anything, besides carrying the reader's own home folder on Windows.

## [2026.10.31]

### Added

- **The cheatsheet API has an output surface.** `renderSVG`, `renderFragment`,
  `renderSheet` and `renderOf` are exported from `api/cheatsheet/index.mjs`, and
  between them they are every way out of the layer. Until now a caller reached
  past it for all of them: `composeSheet(doc, options).composition.toSVG()`
  names the drawing surface's own method, and pixels meant importing
  `api/cheatsheet/raster.mjs` by path, because the published surface exported
  nothing from it. That is the same leak `options.language` was on the way in,
  pointing the other way - and it had the same consequence, that the published
  API could not say what a render was for or what had drawn it.
- **Five formats, one of them canonical.** `svg` is the composition itself in
  the face the markup names, so it needs neither a renderer nor an encoder and
  is the default; `html` is that markup made embeddable; `png`, `jpeg` and
  `webp` are a photograph of it by either raster route. A format with no
  consumer here is refused rather than substituted, because a caller who writes
  `sheet.gif` and receives a PNG has a file that lies about itself.
- **Every render comes back as data**, as `data` on every format with `text`
  beside it where the format has a string form, so a sheet is embedded in a
  response, a data URL or a test without a path being named. The result also
  says what answered: `route` is `composition`, `browser` or `builtin`,
  `family` is the stack asked for beside the one that drew, and `publishable`
  is whether what came back draws the face the design language measured. What
  `publishable` does not mean is "may be posted" - a weight cap and a
  destination are policy and stay with whoever publishes.
- **An HTML fragment, which is four things done to the canonical markup** and
  not a second renderer. The XML declaration comes off, because a browser
  parsing HTML has nowhere to put a prolog; the root's `width` and `height`
  come off so the element scales off its viewBox rather than overflowing its
  column; the two scaling rules travel inline, because the embedding
  document's CSS is not this repository's to write; and the wrapper is
  `role="img"` named by the sheet's own title, since a cheatsheet is a picture
  of text. Three of the four were written out by hand in `index.html`, which is
  what made this worth publishing rather than inventing.
- **`api/cheatsheet/files.mjs`, the one module in the folder that writes
  anything.** `writeRender` takes a named path, a directory under a filename
  derived from the sheet's own title, `-` for standard output, or `null` for
  none at all - one argument for four destinations, because they are four
  values of the same question. `renderToFile` is the whole route from a
  document to a file. It is a separate import for the reason the drawing
  surface keeps its own writer behind `graphic-design/files`: the page loads
  `index.mjs` with a bare `import` and no build step, so a Node builtin
  anywhere in that file's static graph would fail in a browser at load rather
  than at the call. A test walks that graph and holds it.
- **`namesDirectory`**, which is the rule that tells a directory from a file
  with its leading dots stripped first. It was `tools/cheatsheet.mjs`'s own,
  found there by a write that failed with `EISDIR` on `--out .tmp`; the command
  reads it from the surface now, so there is one copy of a rule that cost a
  failed write to find.

### Changed

- **`index.html` reads its fragment from the published surface** rather than
  stripping the size attributes itself. The behaviour is unchanged; what
  changed is that the page and the library can no longer drift apart while both
  keep working, which is the failure a hand copy makes invisibly.
- **`tools/cheatsheet.mjs` renders and writes through the surface too.** It
  branched on the format itself, called `composition.toSVG()` on one side and
  imported `rasterizeSheet` by path on the other, and judged `publishable` from
  the route and the scale a second time; all three are the surface's now, and
  the command no longer imports `api/cheatsheet/raster.mjs` at all. What stays
  with the command is the half that is policy: the catalog lookup, the preset,
  the weight cap, and the rule that a publishable render goes beside its own
  `sheet.json` and anything else goes to `.tmp/`.
- **The format table's `route` field is `format`**, the name the output surface
  knows a format by. `jpg` on the command line and on disk is still `jpeg` to
  the surface, which names the codec rather than the extension, and
  `RENDER_EXTENSIONS` is where that one difference now lives.

### Fixed

- **`filenameFor` read its extension off the lookup with a truth test**, so
  every name on `Object.prototype` passed for a format: `filenameFor({ format:
  "constructor", title: "Splicing Array Elements" })` returned
  `splicing-array-elements.function Object() { [native code] }` instead of the
  error it documents, and `targetFor` resolved that into a path. It is
  `Object.hasOwn` now, the guard `formatNamed` beside it already carried for the
  same reason.
- **`renderFragment` took the raster options and dropped them.** `scale`,
  `quality`, `background` and `route` have no meaning for markup, and a fragment
  is the one door that cannot report them as a note because it hands back a
  string. `renderFragment(doc, { scale: 2 })` returned a fragment at the
  composition's own size with nothing saying the option had been ignored, where
  `renderSVG` refuses the same thing. It refuses it too.
- **A test that asserted the format table's source text now asserts the
  property.** It matched `route: "jpeg"` in `tools/cheatsheet.mjs` as a string,
  so renaming the field turned a passing test red over something that had not
  moved. It renders a `jpg` and reads the extension off the written file and
  the marker out of its bytes instead, which is the claim it was always making.

## [2026.10.30]

### Changed

- **The three models are the cheatsheet API's only public input surface.**
  `composeSheet` takes a document, a theme, a layout, a seed and the two brand
  assets, and nothing else. `options.language` - the whole design language
  record, every band, division and baseline on the sheet - and `options.face`
  and `options.codeFace`, which are the renderer's own width tables, are
  refused by name, each pointing at the model that replaced it. They are
  refused rather than ignored because a caller who asks for a palette and
  silently gets the recorded one has a sheet that reports success and is not
  the one they asked for. So a caller composes a sheet without naming anything
  a renderer owns.
- **`tools/cheatsheet.mjs --theme` reads a theme rather than a design
  language**, and a theme file may be partial. It used to parse its file
  straight into the retired `options.language`, so changing six colours meant
  writing out every coordinate on the sheet. `--data-only` now reports which
  theme answered beside which layout did.
- **`theme.stack.family` is a list of families rather than one CSS string.**
  `familyList` and `familyCss` convert between the two, and the join reproduces
  the recorded stack exactly, which is what let the field change shape without
  a glyph of committed output moving.
- **The theme's `radius` is now the `display` curve of a named curve table.**
  One figure, named, in one place: `languageFor` writes `curves.display` back
  into the design language as `radius`, so the record and the theme cannot
  disagree about it.
- **`examples/ember-theme.mjs` is a partial theme** - a name and two palettes,
  nothing else - where it was a modified copy of `SHEET_LANGUAGE`. It exports
  `emberLanguage` for `tools/compose-language-asset.mjs`, which draws a design
  language rather than a sheet and so legitimately takes a whole record;
  the record is derived from the same partial, so the two cannot drift.
- **A theme whose type cannot be read is refused rather than annotated.** It
  used to compose, set `variation.contrastHolds` to `false`, write a note and
  hand back a finished sheet nobody could read. The measurement of what a
  sheet actually drew is unchanged and still reported; what moved is that a
  theme, being an input, is now refused up front.

### Added

- **A partial theme, laid over the recorded theme and then validated.**
  `themeOver(partial)` fills what a partial omits from the base and holds the
  result to the whole schema, so a caller moves one colour without restating
  the palette and a caller who misspells a field is still told which field, by
  path. Omission is filled; error is not. `readTheme` is unchanged and remains
  the strict reader a whole theme is held to.
- **Shape and curve as named tokens on the theme**, which completes the set the
  type sizes and the stroke weights were already in. `theme.curves` names the
  corner radii in sheet pixels - `square` and the record's `display` - and
  `theme.shapes` names a form and a curve together, so a layout slot says
  `shape: "block"` and carries no geometry of its own for a second backend to
  read differently. Every structural region of the eleven is `square`, which is
  why the committed SVG fixture did not move. `shapeOf` and `curveOf` resolve a
  slot against a theme and refuse a token the theme has not got, the way
  `paintOf` already did for a palette role - and also refuse a token whose form
  disagrees with the way the slot is drawn, which is the one cross reference
  neither model's reader can make alone, since `readLayout` never sees a theme
  and `readTheme` never sees a layout.
- **`assertReadable`, `readableRoles` and `themePairings`**, which measure every
  pairing of ink and ground a theme and a layout imply - the five fixed runs and
  the code panel's six syntax roles - after the one substitution the design
  language nominates for green on a light ground. The structural fills are
  deliberately outside that set: the green spine and the four flanking bars
  reach 2.80:1 on the sheets' white, and **The one place the sheets break the
  site's own rule** records that as a reading rather than a defect, so a
  boundary rejection would refuse the eleven sheets the floors were measured
  off.
- **A record of which face actually drew a render.** `variation.stack` carries
  the families asked for and the CSS the markup names; `SheetRaster.family`
  carries what the renderer resolved. The built-in route resolves nothing,
  because it draws its own single stroke alphabet, and the browser route
  measures a probe string against each generic to find the first family the
  engine really has - `document.fonts.check` reports on loading rather than on
  availability and comes back true for a family a machine has never had. An SVG
  names a stack it cannot guarantee, so without this two rasters of one
  document can be set in two faces with neither file saying so.

### Fixed

- **A stroke slot's shape token is resolved when the slot is drawn, so the one
  cross reference between a layout and a theme is made for every slot that has
  a shape rather than for the fills alone.** `placeSlots` reached `shapeOf`
  only through `curveOf`, and only a fill reads a curve, so a layout whose
  stroke slot named `block` - a token describing a rectangle - composed and
  drew a line with nothing said. The recorded layout has no stroke slot, which
  is why the committed output is unaffected and why a replacement layout was
  the only thing exposed.
- **`languageFor` no longer describes the `display` curve as inert.** Its
  comment listed the curve beside `spacing.step` and `spacing.tokens` as
  written through and moving nothing, which was true of the `radius` the field
  replaced and is not true of the token: `curveOf` reads `curves.display` for
  any slot shaped `display` and `placeSlots` writes it as that slot's `rx`. No
  slot of the recorded layout names that shape, which is the real reason the
  committed SVG did not move.

### Notes

- **The twenty-eight committed `sheet.json` documents stay in the provisional
  shape, and that is now a decision rather than a deferral.** The item that
  landed the narrowing above assumed they would move off it first. They should
  not: each is a worked code listing with a syntax role per line and meaningful
  indentation, and the formal document's entries are a term, a signature and a
  description. Rewriting a listing as entries would lose the per-line roles the
  three role tables colour, lose the indent-is-a-level rule, change every
  rendered sheet and break the committed fixture - a loss of information rather
  than a port. Both shapes remain the document model's, each held to its own
  schema, and `--data-only` still declares which it emitted. What is actually
  open is whether the formal model should learn to carry a listing at all, and
  that is queued under **Implement Cheatsheet API** as its own item.

## [2026.10.29]

### Added

- **The cheatsheet API's three models, which are what a caller describes a
  sheet in.** A **document** of a title and ordered sections, each entry
  carrying a term, a signature and a description; a **theme** of palette
  roles, a type stack and scale, the spacing step, the radius and the stroke
  weights; and a **layout** of a named composition, the grid it sits on, and
  the slots a section may occupy. They are `api/cheatsheet/document.mjs`,
  `theme.mjs` and `layout.mjs`, and they are additive: `composeSheet` still
  takes the provisional shape all twenty-eight committed `sheet.json`
  documents are written in, and takes a formal one as readily.
- **A schema validator that refuses a model by the path to the field**, in
  `api/cheatsheet/schema.mjs`. The layer's two refusals were hand written
  checks on a title and a `language`, and neither approach reaches a term
  three levels down at a numbered position, so a refusal now reads
  `document.sections[2].entries[1].term: must be a string, and is absent` and
  carries every offending field at once rather than the first.
  Both existing refusals moved into the document model's schema, which is
  where they belong, and the messages changed with them.
- **`--layout` on `tools/cheatsheet.mjs`, which that file had been refusing by
  name since it was written.** It takes `sheet` - the one composition the
  design language records - or a path to a JSON layout, which is read,
  validated and composed to, exactly as `--theme` takes a theme.
  `--data-only` now reports which layout answered. `--script` is still refused
  by name: a demo payload is not an input to a composition.
- **`tools/test-sheet-schema.mjs` and `tools/test-sheet-models.mjs`**, 63 cases
  between them. The models' figures are read back against the tables in
  `DESIGN_LANGUAGE.md` rather than only against `language.mjs`, which is what
  catches a model derived faithfully from a transcription that had itself
  drifted.

### Changed

- **The sheet's structure is drawn from the layout rather than from
  coordinates written out at each call.** The four grounds, the four bars
  flanking the title and the footer's mark square were nine `composition.rect`
  calls with their geometry computed inline; they are now slots on the layout,
  and one mapping turns a slot into a `rect` or a `line`. The five fixed runs
  read their baseline, their measure, their size and their paint off a slot
  too. The committed SVG fixture is byte for byte what it was, which is the
  evidence that this is the same composition expressed differently rather than
  a new one.
- **A theme can be handed to `composeSheet` as `options.theme`**, and a layout
  as `options.layout`. Passing neither composes to what the eleven images were
  measured at. The copy-the-whole-record route `examples/ember-theme.mjs`
  demonstrates is unchanged and still works; `themeFrom` and `languageFor`
  convert between the two, so neither is a dead end.
- **`api/cheatsheet/compose.mjs` validates its document instead of checking
  two fields.** The refusal for a document with no title and the one for a
  `language` that is not a string are the same refusals, in the same layer's
  words, reached through the schema - so they now carry a path, and a formal
  document is refused the same way before anything is drawn.

## [2026.10.28]

### Fixed

- **A framed demo's dialog closes on its own buttons again.** The frame an
  `embed` cheatsheet's demo runs in landed on 2026.10.27 with
  `sandbox="allow-scripts"` and nothing else, and that grant withholds form
  submission - which is how a `dialog` element is closed from inside itself.
  **Clipboard and Dialogs** closes its dialog with a `<form method="dialog">`,
  so framed, its **Keep** and **Discard** buttons did nothing at all: the
  dialog stayed open, the return value stayed empty, no line was written, and
  Chromium logged a blocked submission on each press. Escape was the only route
  out, and it reports `that was Escape, which chose nothing` - to a reader who
  had just pressed **Keep**.

  `DEMO_SANDBOX` in `index.html` is now `allow-scripts allow-forms`. The grant
  rather than the demo, because the sheet above the frame teaches the form the
  frame was blocking: row 17 of that cheatsheet's `sheet.json` is
  `form.method = "dialog";`, so a reader is shown that line in the artwork and
  then presses exactly it below. Closing the dialog from a click handler
  instead would have made the demo work and the sheet above it wrong.
  `allow-forms` buys form submission and nothing else - the frame keeps its
  opaque origin, so storage and the clipboard stay refused and `parent` stays
  unreachable, and `allow-top-navigation` is still absent, so a form cannot
  move the page the reader is on. The only new reach is a submission to an
  external URL, which `allow-scripts` already permitted through `fetch`.
  `allow-same-origin` remains the token that is never added, and `allow-modals`
  is still absent and still not needed.

- **A press that repeats the previous press's wording is no longer read as a
  press that wrote nothing.** `press()` in `tools/test-demo-pages-browser.mjs`
  called a control answered when the log panel's markup differed from what it
  held before the click, which is a false negative the moment two controls
  report the same thing. `#round` and `#clear` in `web-storage` both answer
  "no storage on this origin" where there is none, so the second rebuilt
  markup identical to the first's. The panel is emptied before each press
  instead, which makes a line in it afterwards that press's own line. The
  direct pass never met this - storage works over http on 127.0.0.1 - and the
  framed walk below met it immediately.

### Added

- **Every demo's controls are pressed through a frame carrying the page's own
  sandbox**, in `tools/test-demo-pages-browser.mjs`. Opening `demo/index.html`
  directly holds the demo on its own terms; the page puts it in a sandboxed
  `iframe`, and until now nothing held that. Both files in the suite that touch
  a demo were green on the day the dialog above stopped closing, and so was
  the suite around them, with two dead buttons in it.

  The walk asserts, for every `embed` cheatsheet, that each control still
  writes a line or opens a dialog, that a dialog opened inside the frame closes
  on each of its own buttons with the return value that button carries, and
  that the frame logs nothing but a `Permissions policy violation` - which is
  the engine reporting a permission the sandbox withheld and the demo then
  reports properly in a line. The token is read out of `index.html` rather than
  repeated, so the cases follow the page the next time the grant changes. The
  harness is this file's own one-frame page, served from the same origin as the
  demos: driving the real page is `tools/test-example-selection.mjs`'s job, and
  a harness is what lets the grant be read from the page and applied here.

### Changed

- `CONTRIBUTING.md`, under **What a `kind: embed` demo may rely on**, names the
  grant as both tokens and gains the row that was missing: a
  `<form method="dialog">`, or any form submission, works in the frame with
  `allow-forms` granted. The three records that said the dialog demo was
  unaffected by the sandbox - that table, the doc comment on `DEMO_SANDBOX`,
  and the 2026.10.27 entry below - are each corrected where they sit.

## [2026.10.27]

### Added

- **An `embed` cheatsheet's demo is loaded in a sandboxed frame, so the five
  committed demos are reachable from the page.** `selectExample()` in
  `index.html` branched on `kind === "run"` alone, so `cheatsheets.json` named
  a `demo/index.html` for each of the five and no route on the page requested
  one. The frame goes below the row rather than in the sheet's column, because
  these demos lay out as a wrapping row of buttons over a log panel and are
  tall when they are narrow - the sheet's column is 344 px wide at a 768 px
  viewport, so beside the sheet the frame would have been at its tallest where
  the page had least room. Its two heights, 672 px wide and 832 px narrow, are
  the tallest of the five measured at every width the frame can take after
  pressing every control each one ships.

  **The sandbox is `allow-scripts` and nothing else**, decided once for the
  catalog rather than per sheet, since the roadmap holds seven more `embed`
  subjects. `allow-same-origin` beside it is not a weaker sandbox but no
  sandbox: the frame becomes same-origin with the page, free to reach
  `parent.document`, take the `sandbox` attribute off its own frame and write
  into the site's own storage. What the strict frame costs was measured across
  all five demos - an opaque origin has no storage and is not a secure
  context, so `localStorage` throws and `navigator.clipboard` is undefined -
  and all five already report a refusal rather than throwing, which for a
  storage cheatsheet is part of what it teaches. A link under the frame opens
  the same demo in its own tab with the site's permissions. `allow-modals` is
  absent and is not needed: it governs `alert`, `confirm`, `prompt` and
  `print`, not a `dialog` element.

  **Corrected 2026.10.28**: that last claim was checked by opening a dialog,
  and opening one is not the half the sandbox governs. Closing a `dialog` from
  inside itself is a `<form method="dialog">` submission, which
  `allow-scripts` alone withholds - so this entry shipped the **Clipboard and
  Dialogs** demo with both of its in-dialog buttons dead in the frame. The
  grant is now `allow-scripts allow-forms`; `allow-modals` is still absent and
  still not needed.

  The frame is created per selection rather than having its `src` rewritten,
  and the reason is the back button: assigning `src` to a frame already in the
  document pushes an entry onto the joint session history, while the first
  navigation of a freshly inserted frame replaces. It also comes down on a
  category change, which the injected script element does not need to - a
  script that has run is inert, while a frame left in place keeps a live
  document in it with its observers and timers going. `CONTRIBUTING.md` records
  what a demo may rely on, where a demo author reads it.

- **`tools/cheatsheet.mjs`, the command line that composes a sheet and renders
  it to a media file.** `--generate <slug>`, `--list` and `--check`, with the
  flags the plan specifies: `--format` (svg, png, webp, jpg), `--renderer`
  (auto, browser, builtin), `--theme`, `--seed`, `--scale`, `--quality`,
  `--background`, `--max-bytes`, `--out`, `--data-only`, `--dry-run` and
  `--json`. Every raster figure is the preset recorded under **The preset a
  render is written at** in `CONTRIBUTING.md`, read off that document by a case
  rather than copied: quality 80, a 1400 px long edge, a 200 KB target and a
  300 KB cap. The preset's format, WebP, is the one figure that is not also a
  default - `--format` defaults to `svg`, which is the composition itself and
  needs neither a renderer nor an encoder behind it.

  **`--scale` is device pixels per composition pixel**, so the preset's long
  edge is a scale of `1400 / 3600`, or 0.3889. The plan's default of 2 is the
  misreading `api/cheatsheet/raster.mjs` warns about - that figure is per
  *display* pixel - and would ask for a 7200 square image.

  **Where a render is written is a rule rather than a default**: beside its own
  `sheet.json` as `sheet.<ext>` when it is publishable, and into `.tmp/` when
  it is not. The social recipe in `.claude/constants.md` globs the working tree
  for `**/*.{jpg,webp}` and drafts a post per new match, so a built-in-alphabet
  render, one under the publish floor, or one over the weight cap goes
  somewhere that glob does not reach. `--out` overrides and is always obeyed.
  No ImageMagick is needed after all - the browser route encodes WebP directly,
  so the PNG-then-convert pipeline the item was written around is not there,
  and nothing writes a PNG beside a cheatsheet unless asked to.

  `--layout` and `--script` are recognised and refused by name, saying that a
  named layout and a payload-as-input both belong to the models queued under
  **Implement Cheatsheet API**. Accepted and ignored would have left a caller
  believing a sheet had been composed to a layout it had not.

- **`tools/test-sheet-indent-columns-browser.mjs` holds the padded continuation
  directly, rather than by the ladder that stood proxy for it.** The new case
  walks every document and reports any line indented to the first character of
  a token in the line above, where that line leaves a construct open and so is
  continued rather than nested into. All three conditions are needed: without
  the open-construct test, `p {` over `  max-width: 66ch;` reads as a pad and
  two correctly nested CSS sheets are reported.

  It closes the hole a proxy always has - a sheet exempt from the proxy was
  exempt from the defect too, and
  `javascript/arrays/max-and-min-function-and-sort-object` is on the record for
  declaring `0, 1, 3, 4` to match the artwork it transcribes. Until now the
  only thing asserting that sheet had no padded column was the prose on its own
  exemption row. The walk is proved rather than trusted: run over the sheets as
  of `89a11d5` it reports exactly the nine the 2026.10.24 measurement found,
  token for token, and those nine are written out in the file so the record
  survives a clone that cannot reach that commit.

### Fixed

- **`node --test` no longer sweeps a UI/UX tester's leftover record into the
  suite.** The documented whole-suite command walks the tree from the root and
  has read no `.gitignore`, so `test-results/**/*.test.mjs` joins the suite on
  the machine that produced it - and `tools/test-suite-invocation.mjs` could
  not see any of that, because its own walk excluded every folder `.gitignore`
  names. Both discovery invariants were therefore blind to the one folder the
  real command does sweep, which on this machine was 1 failure of 590 while all
  589 tracked cases passed.

  The two were made to agree in the direction of the command, because the
  command is not this repository's to change in the other direction: there is
  no file-level exclusion flag on `node --test`, and the only mechanism that
  works is the leading dot, which is `test-results/`'s name and not ours - the
  reviewing agent's own instructions name that folder and live outside this
  repository. So the walk now sweeps what the command sweeps, and `.gitignore`
  answers a different question: not what is *in* the suite but what the
  repository *owns*. A third case fails on any discovered file that is a
  working artifact, naming it and the remedy - rename to `<name>.cases.mjs`,
  which keeps the record where the tester wrote it and takes it out of the
  sweep. Today's artifact was renamed rather than deleted, and
  `CONTRIBUTING.md` records the convention.

- **The one wait in `tools/test-sheet-accent-arrival-browser.mjs` that covers a
  deliberately held dependency is sized for a loaded machine.** "the catalog
  arrives with the accent reader still in flight" failed once in three
  consecutive full-suite runs at 15,214.66 ms against a 15,000 ms ceiling - a
  timeout, not an assertion, with the file passing on its own every time. It is
  the only arrival in the file a case is holding part of, and `node --test`
  drives several browsers at once, so the ceiling is now `HELD_ARRIVAL`, 60 s,
  with the reason recorded in the file's header. Raising every timeout in the
  file would have treated a contention flake as a slow page. A ceiling is kept
  rather than waiting unbounded, so a page that never arrives still fails in
  finite time, and on reaching it the case now reports where the page had got
  to - a manifest that answered beside a catalog still not ready is a page
  fault, and neither reaching the page is this wait being too short.

## [2026.10.26]

### Added

- **The `html-apis` group, with the repository's first five `embed`
  cheatsheets.** **Common Browser Built-in APIs** becomes
  [`html-css/html-apis/`](html-css/html-apis/) carrying one sheet per area of
  focus - [Fetch and Abort](html-css/html-apis/fetch-and-abort/sheet.json),
  [Web Storage](html-css/html-apis/web-storage/sheet.json),
  [Element Observers](html-css/html-apis/element-observers/sheet.json),
  [URL and Query Strings](html-css/html-apis/url-and-query-strings/sheet.json)
  and [Clipboard and Dialogs](html-css/html-apis/clipboard-and-dialog/sheet.json) -
  each with a `demo/index.html` that is one self-contained page. The group's
  `meta.json` carries `order: 3`, which places all five after the twelve
  already in the category; since 2026.10.23 the catalog orders a sheet by the
  chain of orders down its path, so numbering them from 1 collides with
  neither group that already does. `cheatsheets.json` holds 28 cheatsheets
  now, up from 23.

  `embed` was the one payload kind no committed cheatsheet exercised, and what
  it turned out to add is recorded in `DESIGN_LANGUAGE-html-css.md`: the folder
  decides the kind and the document only agrees, because `detectPayload`
  reports `embed` from the presence of a `demo/` folder alone and `--check`
  holds the declared `kind` to what is on disk. Every demo was driven in
  Chromium before it was committed - 17 controls across the five, no console
  error and no page error, each reporting its own refusal where the browser
  withholds a permission.

  Each demo writes its report lines by building a `span` and filling it with
  `textContent`, never by interpolating into markup. Three of the five report
  something that did not come from the page - a clipboard read, a pasted
  address, a stored value - and an opaque-path URL such as
  `js:<img src=x onerror=...>` reaches `pathname` with its angle brackets
  intact, since the parser only percent-encodes those in a special scheme. An
  `insertAdjacentHTML` holding the line would run it.
- **`tools/test-demo-pages-browser.mjs`, which opens every `embed` demo in a
  real engine and presses everything on it.** The five payloads were the first
  files in the catalog no committed test loaded: the sheets were covered from
  three directions and a demo whose every control threw on the first click
  would still have passed the suite. Written as five rules rather than as these
  five pages - every control answers, a refusal is reported and never thrown,
  every control takes keyboard focus visibly, nothing overflows 320px, and the
  page is painted in the site's dark theme - so the next `embed` sheet is
  covered by creating its folder.
- **A JavaScript per-line role table, the category's third language**, in
  `DESIGN_LANGUAGE-html-css.md` with its derivation in
  `tools/test-sheet-syntax-roles.mjs`. The five sheets declare
  `language: javascript`, and that file fails a sheet naming a language it has
  no table for rather than skipping it, so the table and the derivation were
  written before the sheets were. All 126 non-blank lines were authored by
  intent and then reconciled against the rule, and the rule agreed with every
  one of them.

  It straddles the two tables already there rather than ordering structure and
  configuration one way or the other: a line that is nothing but closing
  punctuation is structure, then a continuation, then structure again for a
  control word, then configuration. `});` is why - it closes a brace while a
  paren is still open around it, so the continuation test reaches it first and
  colours a brace amber. Two things the CSS derivation never needed: a string
  literal is stripped before a comment is looked for, since a URL carries a
  `//` inside it, and the state carries *which* bracket is innermost rather
  than how many are open, since a callback body sits inside an unclosed paren
  as well as its own brace.
- **The export preset for a rendered post image**, in `CONTRIBUTING.md` beside
  the render row it governs: WebP, quality 80, 1400 px long edge, a 200 KB
  target and a 300 KB cap. Nothing in the repository is measured against it
  because no render is committed, so it is recorded with the measurement that
  justifies it instead. Over four sheets at 1400 px, WebP at 80 lands between
  66.7 and 112.2 KB while JPEG at the same quality and size costs 1.7 to 2.0
  times as much - 130.0 to 196.4 KB - which is the claim that these are text
  dense renders where a small glyph edge degrades first. Quality 90 is the
  escape hatch for an illegible render at 20 to 30 KB more, and 1400 px is the
  ceiling: it already clears `MIN_PUBLISH_SCALE` by 200 px, that floor working
  out at 1200 px on this canvas.
- **A limit on how many runs a code line may be split into**, in
  `DESIGN_LANGUAGE.md` under **What a generated sheet is measured in**. A run
  is placed at an absolute coordinate, so nothing reproduces the pair the
  engine would have kerned *across* a join, and the residual accumulates along
  the line rather than staying at the seam. Measured over all 28 sheets at the
  page's 900 px cap: one seam is within **0.144 px** at worst, while a whole
  line reaches **0.769 px** against the engine's own layout of it unsplit -
  `fetch-and-abort` line 19, six runs, 35 characters, a long way inside every
  margin. So a line's run count is bounded by this and not by its width.

### Changed

- **The Pages artifact no longer carries the eleven reference JPEGs.** They are
  20,302,335 bytes of the 22,944,433 the repository tracks - 88.5% of the
  artifact, 11 files of 192 - and nothing on the site asks for any of them:
  `index.html` references none, `cheatsheets.json` records none, no
  `sheet.json` names one, and the catalog walk never enters that folder because
  it holds no `sheet.json`. Both readings they exist for happen in a clone
  rather than over HTTP, so the `build` job of `.github/workflows/pages.yml`
  deletes them from its own checkout before uploading. They stay tracked and
  committed, and their README still ships so the path answers rather than
  404ing.

  Recorded as **What the site does not carry** in `CONTRIBUTING.md`, because a
  workflow that drops tracked files reads as a fault to whoever meets it next,
  and pinned in `tools/test-pages-media-type.mjs` - which holds the step to
  removing the images rather than the folder, and reads every file the artifact
  still carries for a reference to them. That second half is the one worth
  having: the risk is not the deletion but someone later writing a reference
  into a file that does ship, which resolves locally and 404s on the site.
- **`refresh(event.key, event.newValue);` became `refresh(event.key);`** on the
  **Web Storage** sheet while it was being written. At six runs it drew
  **1.026 px** from where an unsplit line would draw it, the only failure the
  catalog has recorded against `tools/test-sheet-accent-ink-browser.mjs`; the
  shorter line measures 0.170. The floor is a page pixel because a page pixel
  is what a reader can see, so the line was shortened rather than the floor
  raised.
- **A case that asserted `read` on every `html-css` sheet now asserts "not
  `run`".** `tools/test-example-selection.mjs` held the whole category to
  `kind: read`, and the five `embed` sheets failed it while the behaviour it
  was written for held perfectly - the page branches on `run` and nothing else.
  Naming one of the three other kinds made it a test of what the category
  happened to contain rather than of what the page does with a payload it will
  not run.

## [2026.10.25]

### Fixed

- **Nine padded continuations across five sheets are indented rather than
  padded**, which empties the catalog's padded-column debt. Each was written
  with enough spaces to sit under a value in the line above, which is the right
  arithmetic in a monospace face and the wrong one in the panel's proportional
  stack. Measured in Chromium on 2026.10.24 at the page's 900 px cap, against
  the character each line was written to sit under:
  [forms-and-inputs](html-css/general-html-overview/forms-and-inputs/sheet.json)
  rows 4 and 8 drew 16.584 px left of the `id=` above them and row 14 drew
  **36.993 px** left of a `type=` eighteen characters along, the widest in the
  catalog;
  [images-and-media](html-css/general-html-overview/images-and-media/sheet.json)
  rows 2, 9 and 16 each drew 17.322 px left of a `src=`;
  [document-structure](html-css/general-html-overview/document-structure/sheet.json)
  row 5 drew 21.679 px left of a `name=`;
  [links-and-navigation](html-css/general-html-overview/links-and-navigation/sheet.json)
  row 15 drew 8.326 px left of an `href=`; and
  [sort-numbers-array](javascript/arrays/sort-numbers-array/sheet.json) row 13
  drew 16.113 px left of the `a.sort(` above it. Each is now indented one level
  past the line it continues, and the four `html-css` sheets carry the same
  change in the `.html` payload beside them.

### Changed

- **The record of sheets that do not indent in a ladder is a record of one
  decision rather than a queue of debt.** `NOT_A_LADDER` in
  [test-sheet-indent-columns-browser.mjs](tools/test-sheet-indent-columns-browser.mjs)
  opened with six rows on 2026.10.24; five were padded continuations and are
  fixed above. The sixth,
  [max-and-min-function-and-sort-object](javascript/arrays/max-and-min-function-and-sort-object/sheet.json),
  is kept exactly as transcribed and stays on the record with the argument for
  it. The list is not a queue now, so a row added to it is a decision to argue
  for rather than debt somebody will clear.

- **The two transcribed sheets were settled against the artwork rather than
  against an assumption about it.** The premise for leaving both alone was that
  re-indenting a panel makes it disagree with the image it reproduces. Measured
  off the artwork on 2026.10.24, that holds for one of them and not the other.
  In `SortNumbersArray.jpg` the `b.sort(` of row 13 and the `a.sort(` it was
  padded under are 3 units apart at the artwork's own 3601 px scale - 0.75 px
  at the page's cap - while the composed panel drew the same pair 16.102 px
  apart, so the padding was what broke the artwork's column rather than what
  preserved it, and the sheet is nearer its image for being re-indented. In
  `MaxandMinFunctionandSortObject.jpg` the `cars` rows really are one space in,
  the sort body three and the closing `return` four, which is exactly what that
  sheet declares, so re-indenting it would move three rows off the image.

### Added

- **A case holding the exception record to the catalog it describes**, in the
  same file. The existing case walks the catalog and reads the record for each
  path, so a row naming a path the catalog no longer holds was never looked at:
  a renamed or deleted sheet left its row behind, passing silently. The new
  case walks the record instead and fails a row whose path is not in the
  catalog, a row listed twice, a row recording no indents, and a row carrying
  no note saying why it is kept.

### Documentation

- **Where a sheet is allowed to stop matching its image**, a new section in
  [javaScriptArrays/README.md](javaScriptArrays/README.md), which is where a
  reader meets the question. It carries both decisions above with the figures
  they were taken on, and states the limit of the rule: it governs the drawn
  panel, not the payload file beside it. A payload is read in a monospace
  editor, where a padded column lands exactly where it was counted to, so
  `sort-numbers-array.js` keeps the artwork's alignment on the line the panel
  now nests.
- The same limit and the standing exception are recorded in
  [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md) under **An indent is a level, and a
  column is not addressable**, and the fourth note on the `code` lines in
  [CONTRIBUTING.md](CONTRIBUTING.md) no longer says six sheets predate the rule.

## [2026.10.24]

### Fixed

- **The `box-shadow` continuation on Colors and Backgrounds is indented
  rather than padded**, in both
  [sheet.json](html-css/general-css-overview/colors-and-backgrounds/sheet.json)
  and the `.css` payload beside it. It was written with fourteen spaces so its
  second value would sit under the first, which is the right arithmetic in a
  monospace face and the wrong one here: the panel is set in the sheet's own
  proportional stack, where a space is 15.079 composition units and
  `  box-shadow: ` is 352.7. Measured in Chromium on 2026.10.23 the
  continuation was drawn **141.6 units left** of the value it was padded to sit
  under - 35.4 px at the page's 900 px cap, and visible as such in a capture.

  It now takes the four space indent the `linear-gradient(` block on the same
  sheet already used, so the sheet's two multi-value continuations agree with
  each other and both sit in a column the face can land on.

### Added

- **[tools/test-sheet-indent-columns-browser.mjs](tools/test-sheet-indent-columns-browser.mjs)**,
  the third browser file to read a drawn code panel and the first to compare
  one line with another. It draws every committed sheet in Chromium and holds
  each to two claims: every line declaring the same indent begins within a page
  pixel of one column, measured at under 0.3 px across the catalog and at zero
  on most sheets, and a line indented deeper than the line above it begins
  right of it.

  **Neither of those catches a padded continuation, which was measured rather
  than assumed.** Run against the sheet before the fix above, both passed: the
  padded line began at 739.110 against the `  box-shadow:` line's 558.159, so
  it was further right than the line above, and its indent of 14 had one line
  on the sheet, so its column agreed with itself. What a reader saw is a line
  out of column with a value *inside* another line, and no comparison between
  two line starts can see that.

  So the file carries a third claim, and it is the one that fails on the
  defect: **the indents a sheet declares form a contiguous ladder of one
  unit** - `0`, one unit, two units, every rung used. Padding is measured in
  characters of the line above rather than in levels, so it lands on a rung
  that is not there. The sheet declared `0, 2, 4, 14` before the fix and
  declares `0, 2, 4` after it. That half needs no browser and runs on a bare
  clone, which is what makes the next one cheap to catch.

- **The rule behind it**, in
  [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md) under **An indent is a level, and a
  column is not addressable**, and as a fourth note on the `code` lines in
  [CONTRIBUTING.md](CONTRIBUTING.md). An indent in a sheet's `code` is a
  nesting level and nothing else, because a proportional face makes no count of
  spaces reach a position inside the line above.

### Changed

- **Six sheets that predate the rule are recorded as debt rather than
  exempted**, in `NOT_A_LADDER` in the new test file, each with what it does
  and how far out it draws: `sort-numbers-array` pads `b.sort` under an
  `a.sort` 16.113 px away, `document-structure` pads `content=` under a `name=`
  21.679 px away, `links-and-navigation` pads `target=` under an `href=` 8.326
  px away, `images-and-media` pads three attributes under a `src=` 17.322 px
  away each, and `forms-and-inputs` pads two under an `id=` 16.584 px away and
  a `checked>` 36.993 px away, which is the widest in the catalog.
  `max-and-min-function-and-sort-object` is the one entry with no padded
  column: it nests array rows by one space and a sort body by three, so it has
  two units rather than one.

  The record holds the indents each sheet declares today, so a sheet that is
  fixed, or that changes its indents at all, is reported as a stale row rather
  than passing on one. Two of the six transcribe one of the eleven original
  images, where changing the panel makes it disagree with the artwork it
  reproduces, so emptying the list is a decision for a person and is queued as
  one.

## [2026.10.23]

### Added

- **The General CSS Overview group, and with it the second group the
  `html-css` category has held.** Six cheatsheets at
  `html-css/general-css-overview/`, every one `kind: read` and every one
  `language: css`: selectors and specificity, the box model, colors and
  backgrounds, typography and text, flexbox and grid, and responsive design.
  Each folder holds a `sheet.json`, a `meta.json` for its order, and one
  readable `.css` payload carrying the same example as a file. No folder
  commits a raster, as none in the catalog does.

  The count is the subject's own, from the conventions under **New
  Cheatsheets**: a subject becomes between one and eight cheatsheets, so
  `general-css-overview` is the group and its six areas are the cheatsheets
  under it. The category's design language and its generated skill already
  existed and neither was regenerated - **General HTML Overview** recorded
  them on 2026.10.19 and this is a second subject going into the same
  language. `node tools/build-manifest.mjs --check` passes on the result,
  twenty-three documents across two categories, each composed rather than
  taken on trust: the six land between 85.0% and 88.0% of the code panel
  against the 85% floor the eleven were measured at, every line fits, every
  display run fits, every pairing clears its contrast floor, and all six
  colour token by token rather than falling back.

- **The CSS half of the category's per-line role mapping**, in
  [DESIGN_LANGUAGE-html-css.md](DESIGN_LANGUAGE-html-css.md) beside the markup
  half, as five tests read in order: a comment is `comment`, a wrapped value
  line is `string`, a line that opens or closes a block or sits outside one is
  `keyword`, a line carrying a declaration is `identifier`, and anything else
  is plain.

  **The two structure and configuration rows are in the opposite order to the
  markup table, and that is the substance of it rather than a formatting
  choice.** Markup tests configuration first, because a line carrying an
  attribute is `identifier` even though it is also a tag. CSS cannot: a
  selector is allowed a colon - `a:hover`, `p::first-line`, `*::before` and a
  width query inside `@media` all carry one - so a declaration test applied
  first reads every one of them as a property. What tells the two apart is
  whether a rule's own block is open, which is why the derivation carries the
  open blocks and the kind of each: an at-rule's block holds selectors, a
  rule's block holds declarations, and `@media` nesting a rule means both are
  open at once.

  Counted over all 149 non-blank lines, the six hold 65 `keyword`, 57
  `identifier`, 19 `comment` and 8 `string`. The role that goes unused is
  plain, where markup's was `number`, and for the same reason rather than a
  different one: no line of a stylesheet is prose, so white has nothing to
  colour. `number` is unused here too and only as a per-line role - a hex
  colour, a length and a font weight are all read as numbers token by token,
  which is what actually draws.

- **[CONTRIBUTING.md](CONTRIBUTING.md), the record of how a cheatsheet and a
  whole category are added.** Written from what was done rather than from the
  rule: what a cheatsheet folder may hold and which names are reserved, the
  three commands a category's design language is derived with, where the
  generated skill goes and why it is not committed, that a category whose
  examples are in a new language needs both a role table and a derivation, and
  the three checks to run before committing. It also carries the collaborator
  convention - a composed sheet is drawn rather than captured, so any commit
  creating a `sheet.json` or writing a render out adds `graphic-designer` as a
  collaborator, while one that only moves or regenerates what is there does
  not.

- **[javaScriptArrays/README.md](javaScriptArrays/README.md), saying what the
  eleven images are now.** They are not any cheatsheet's deliverable and
  nothing serves them: they are what every figure in `DESIGN_LANGUAGE.md` was
  measured off, and what a composed sheet is aimed at reproducing. They stay as
  JPEG at the roughly 20 MB the eleven total, because
  `tools/test-sheet-composition.mjs` re-measures them against those tables and
  converting them would break the suite that holds the extraction. Their names
  predate the kebab convention and are left alone: the folder holds no
  `sheet.json`, so the catalog walk never reaches it.

### Fixed

- **A category's second group no longer interleaves with its first.** An
  `order` in a `meta.json` ranks a folder among its own siblings and nothing
  further, so two groups of six both running 1 to 6 collide on every number -
  and `cheatsheets.json` ordered a category's sheets on that number alone. The
  twelve `html-css` sheets came back 1, 1, 2, 2, 3, 3 and the page offered a
  CSS sheet between every pair of HTML ones. `orderPath` in
  `tools/build-manifest.mjs` now ranks a sheet by the chain of orders down its
  path, the group's first and then its own, so the groups are offered whole and
  in the order their own `meta.json` files give. A cheatsheet sitting directly
  under a category is ranked by its own order against the groups beside it
  rather than pushed to either end.

  Nothing caught this earlier because every category had held exactly one
  group, where the chain's first step is the same for every sheet and the
  second step is the sheet's own order - which is the single number the old
  comparator read. `entry.order` in the manifest is unchanged and still the
  sheet's own number; the array's order is the catalog's.

- **Two sloppy spellings the comment check measured but did not cover.**
  `console. log(` in `javascript/arrays/sort-numbers-array` parses and runs and
  was the only call in the eleven written that way; it is now `console.log(`,
  in the payload and in the `sheet.json` line that carries it. `"Orage"` in
  `javascript/arrays/splicing-arrays` was a data value, so correcting it is
  four lines rather than one - the array, the claim that faithfully reported
  it, and both again in that cheatsheet's `sheet.json`. It is `"Orange"` in all
  four, and `node --test tools/test-example-comments.mjs` still holds all 24
  cases, which is what says the claims match what the example logs.

- **A wrapped value on Typography and Text padded to a column the panel's face
  cannot reach.** `font-family` continues onto a second row, and that row
  was indented fifteen spaces so `Arial` would sit under `"Helvetica Neue"`.
  That lands only in a monospace face. The code panel is set in the sheet's own
  `"Helvetica Neue", Arial, system-ui, sans-serif`, where fifteen spaces are
  worth 226.2 composition units against the 310.5 that `  font-family: `
  measures, so the continuation was drawn 84.3 units left of the value above
  it - 21.1 px at the page's 900px cap. It is indented four spaces now, which
  is what the `linear-gradient(` block on **Colors and Backgrounds** and the
  `grid-template-areas:` block on **Flexbox and Grid** already do. The sheet
  still fills 87.4% of the code panel and the line is still `string`, since the
  role follows the open declaration rather than the indent.

### Changed

- **`tools/test-sheet-syntax-roles.mjs` dispatches on the language a sheet
  declares**, rather than deriving every line from the markup table. A sheet
  naming a language the file holds no table for now **fails** rather than being
  skipped, because skipping is how a third language would arrive in the
  category with nothing holding it to anything. The two derivations differ in
  more than their table: a blank line resets markup's open-tag state and resets
  nothing in CSS, since that state is a heuristic standing in for a parser
  while brace depth is the document's real structure, and a CSS comment is
  taken out of a line before anything measures it, because a colon inside one
  would otherwise open a declaration that never existed.

  Twelve per-sheet cases now, and the coverage floor is per language: 130
  markup lines and 149 CSS lines, 279 in all.

- **Two cases pinning the group ordering**, one at each level it can break. In
  `tools/test-example-selection.mjs`, a category's groups are offered whole and
  one after another, over the committed catalog. In
  `tools/test-build-manifest.mjs`, two groups on an invented tree each numbering
  their sheets from 1, with a flat cheatsheet ordered between them to say that
  one sitting directly under a category is ranked against the groups rather
  than pushed to an end.

- **The README names where the records are**, in a new **Adding to the
  Catalog** paragraph: `CONTRIBUTING.md` for how a cheatsheet and a category
  are added, and the eleven images as reference rather than any cheatsheet's
  graphic.

## [2026.10.22]

### Fixed

- **A centred run is now centred on the width the engine draws, not the width
  the table sums.** `centredAt` in `api/cheatsheet/faces.mjs` put a run's left
  edge at the centre less half of `measureRun`, which carries no kerning, while
  the engine kerns inside the one `<text>` element it draws the run in - so
  half of every kerned pair came off one side of the axis. 16 of the catalog's
  34 centred runs hold one of the 96 pairs, 11 titles and 5 subtitles, and the
  pair table puts each of them this far off the canvas axis:
  `javascript/arrays/max-and-min-value-array`'s title, "Max and Min Value
  Array", at 12.65 composition units; the `text-content` and `tables-and-data`
  titles at 10.88; the `shift-and-unshift` subtitle at 8.34; eight `javascript`
  titles at 5.39; three `html-css` subtitles at 4.28; and one more at 1.31.
  Drawn in Chromium at the page's 900 px cap the worst of those measured
  **3.15 px** off the axis. All 34 now sit within 0.214 units, or **0.053 page
  pixels**.
- **It moved only the runs that were wrong**, which is what let it land on its
  own rather than as a rider. Kerning is exactly zero for a run holding none of
  the 96 pairs, so the two rulers return the same float and eighteen of the 34
  did not move at all. The three runs a generated sheet reuses from the artwork
  hold no pair either, so the four fixed-text widths the design language
  records - 2084, 2595, 1481 and 2723 - and the heading band's recorded
  geometry are untouched. In the committed fixture the whole change is two
  lines: the title's `x` and the subtitle's, each by half of one ` A` pair.
- **The masthead lockup is measured the same way.** The mark is placed at the
  wordmark's right edge, which is a sibling positioned against what the engine
  drew, so it reads `drawnWidth` now as well. Nothing moves today - the default
  wordmark holds none of the 96 pairs - but a document naming its own wordmark
  is a slot the API already has, and this was the third instance of one rule in
  the layer rather than a second special case.

### Changed

- **The two rulers now divide by what the width is being asked, not by whether
  a run is drawn whole.** A width that decides *where ink goes* - a centred
  run's left edge, the next run along a split code line, a mark set against a
  wordmark's end - is `drawnWidth`. A width that decides *whether ink fits* -
  which cap a run is stepped down to, whether the widest code line clears the
  panel - stays `measureRun`. **What a generated sheet is measured in** in
  `DESIGN_LANGUAGE.md` states it that way and carries both sets of
  measurements; `api/cheatsheet/compose.mjs` and `faces.mjs` name which half
  each call site is on.
- **Fitting stays unkerned deliberately, and the claim it rests on is now
  asserted.** Every one of the 96 pairs is negative, so the advances
  over-measure a run and anything fitted by them is drawn narrower than the
  region it was fitted to. Re-fitting on the kerned width would buy a fraction
  of a percent of extra room and move every cap on every sheet, so it is
  declined - but a face whose table carried a positive pair would silently make
  the fitting optimistic, which is why `tools/test-sheet-faces.mjs` now holds
  the sign of the table rather than leaving it as an observation.

### Added

- **Three cases in `tools/test-sheet-faces-browser.mjs`** that ask a real
  engine where a centred run ended up, over every sheet in the committed
  catalog. Nothing in the dependency-free suite could see this defect, because
  both sides of every comparison there read the same table, and the one browser
  case that drew a sheet measured a synthetic document whose title holds no
  kerned pair.
  - **The ink box is read alongside the advance box rather than instead of
    it**, which is the finding worth keeping from writing them. The advance box
    is what `drawnWidth` sums, so it is held at a quarter of a page pixel; the
    ink box carries the glyphs' own side bearings, and
    `compare-array-function`'s subtitle, "Sort by a rule you write yourself",
    kerns by nothing, is centred to 0.059 units, and reads as 0.854 px off
    centre by its box alone - its `S` has no left bearing and its `f` overhangs
    its own advance by 6.71 units. So the ink box is held at a page pixel and a
    half: still four times inside the 3.15 px defect above, and loose enough
    that a correctly drawn letterform does not fail it.
- Two cases in `tools/test-sheet-faces.mjs`: that a run holding none of the 96
  pairs is centred exactly where it always was, and that no pair in the table
  widens a run. And one in `tools/test-sheet-brand.mjs`, reading off a composed
  sheet rather than off a copy of the defaults: the three runs a sheet reuses
  from the artwork hold no pair the engine kerns, which is what keeps their
  recorded widths exact now that placement is kerned. The suite is at 494
  cases, from 488.

## [2026.10.21]

### Fixed

- **A code line split into accent runs now draws flush, because the runs
  advance by what they draw rather than by what the whole prefix measures.**
  Colouring a panel token by token made each line several `<text>` elements,
  and each was placed at `x + measureRun(prefix)`. The committed width table
  sums per-character advances; the engine that draws the glyphs also kerns. So
  the table decided where every run began while the engine decided how wide the
  run before it drew, and the difference opened as a gap at the boundary.
  Measured in Chromium across all seventeen sheets at the page's 900 px cap:
  1,791 run boundaries, 32 at or over a whole page pixel, worst 2.50 px, and
  fifteen of the 32 inside a token rather than widening a space -
  `nestArrayToChange[` before its index on thirteen lines of
  `javascript/arrays/changing-elements`, `Term` before `</dt>`, `Total` before
  `</th>`. The same 1,791 boundaries now sit within 0.144 px, and within 0.042
  inside a token.
- **The 96 pairs the font stack kerns are measured and committed**, beside the
  advances in `api/cheatsheet/faces.mjs`, and `api/cheatsheet/faces.mjs` grew a
  second ruler to read them: `drawnWidth` is the engine's width for a run, as
  against `measureRun`, which stays the composition's. Only a split code line
  uses the second one. Every other coordinate is still worked from the
  advances alone, because that is the ruler the geometry in
  `DESIGN_LANGUAGE.md` was matched against, and a run drawn whole has no
  boundary to open a seam at.
- **The pairs had to be read in SVG text layout rather than through a canvas.**
  `measureText` reports no kerning for any pair holding a space, while the same
  pair laid out in a `<text>` element kerns by up to 55 units per em - so a
  table read from a canvas is short by exactly the eight space pairs, which are
  the ones a line of code hits most often. `tools/measure-font-widths.mjs`
  measures both ways and `--emit` now writes both tables. Its earlier finding
  that summing per character equals the engine's own answer "to 0.000%" was
  true of the one string it was checked against and not of the families, which
  is what `DESIGN_LANGUAGE.md` now says.
- **The first interactive control on the page no longer waits on the heaviest
  thing the page loads.** `prepareAccents()` sat in the same `Promise.all` as
  the catalog fetch, and `Promise.all` settles on its slowest member, so
  building the dropdowns was gated behind the accent reader - 10 files and
  977,629 bytes. Timed in Chromium throttled to 1.5 Mbps with 150 ms of
  latency, the category dropdown gained its options at 7,182 ms as against
  2,543 ms with the reader's entry blocked. Over loopback the ordering is
  identical and the cost is invisible, which is how the comment above the call
  and the comment in `api/cheatsheet/accents.mjs` both came to say nothing
  waited on it while the code did.
- **A sheet drawn before the accent reader lands is now redrawn when it
  arrives**, rather than keeping its per-line colours for as long as the reader
  stays on it. The document is already in hand, so the redraw is one
  composition and no round trip, and the box it replaces is the same box.
- **The page reads the reader's answer and says so when it is `false`.**
  `prepareAccents` is written not to throw and to hand back `{ ready, reason }`
  for exactly that, and the third slot of the destructuring was dropped, so a
  page that could not load the reader drew every sheet per-line and said
  nothing anywhere.
- **`tools/build-manifest.mjs` reads the same answer, and reports the reader
  once instead of its consequence seventeen times.** `const accents = await
  prepareAccents()` was never read again. Under `--check` that surfaced as one
  warning per sheet, all of them naming the same cause; under a plain build it
  left no trace at all, because build mode reports `catalog.findings` and rule
  6a never reaches it. A failed reader is now one `accents` warning against
  `api/napkin-sketch`, in both modes and in `--json`, and the per-sheet warning
  stands down only when the reader is the cause - a document that names no
  language is still reported per sheet. It stays a warning: the manifest's own
  bytes do not depend on how a panel was coloured.
- **A `language` that is not a string is refused in this layer's own words.**
  `composeSheet` checked the shape of every other document field it reads and
  not that one, so `{ language: 123 }` left as `TypeError: t.trim is not a
  function` from inside the vendored bundle - an error naming neither the field
  nor the file that passed it on. Absent and `null` still mean the document has
  no language and still draw.
- **`forgetAccents` is called where it was written to be called.** The one case
  that needs the un-prepared path said in its own comment that it relied on
  being ordered first in the file instead, which is the dependence on position
  it said it was avoiding; the reset it declined to use was exercised by
  nothing. A second case now runs the round trip from the prepared state, which
  is the only state the reset exists for.
- **`tools/test-vendored-surface.mjs` no longer reports its own source as the
  thing it forbids.** The case greps the tree for the retired vendoring
  mechanism, and it cannot name what it looks for without matching itself, so
  it failed the moment it was written - the suite has been at 434 of 435 since
  2026.10.20. Its own path joins the four already excluded as the record of the
  work rather than instructions to follow.

### Added

- **`tools/test-sheet-accent-seams-browser.mjs`**, the acceptance check for
  colouring a line token by token: every committed sheet is composed, drawn in
  Chromium at the page's own cap, and every adjacent pair of drawn runs is
  measured against the engine's own width for the characters between them.
  While a line was one element the question could not be asked, because the
  engine laid the line out itself and absorbed its own kerning. It needs no
  server - the composition is the subject - and skips with the install command
  where Playwright is absent, like every other browser case here.
- **`tools/test-sheet-accent-arrival-browser.mjs`**, three things about the
  reader's arrival: the catalog arrives with the reader stalled indefinitely,
  a sheet drawn while it is stalled draws in its per-line roles, and it is
  redrawn once the reader lands. The stall is what makes the first of those a
  test of the dependency rather than of relative speed, which over loopback is
  noise - a drafted version asserted the catalog became usable before the wave
  finished and failed against a page that was already correct.
- Cases in `tools/test-sheet-faces.mjs` for the pair table, in
  `tools/test-composition-algorithm.mjs` for the refused `language`, and in
  `tools/test-build-manifest.mjs` for the reader finding and the per-sheet
  warning standing down. The suite is at 464 cases, from 435.
- **`tools/test-sheet-accent-ink-browser.mjs`**, the sibling of the seams file
  and a different question about the same subject: where the ink of a split
  line lands, rather than how wide the gap between two runs is. Each line is
  measured against one `<text>` holding the whole of it in the same face,
  anchored on the first glyph the sheet drew, so a gap reads as a positive
  shift on everything after the boundary, letters crossing as a negative one,
  and drift as a shift that grows along the line. A seam compared with
  `Math.abs` can tell none of those apart. The panel bounds, the full size
  route at 3600 and the palette are held here too, none of which anything
  else reads off a drawn sheet.
- Three cases in `tools/test-sheet-accent-arrival-browser.mjs`: the redraw
  moving nothing around it, sampled every animation frame so a flash is asked
  about rather than argued about; the full size blob carrying the redrawn
  sheet rather than only a `blob:` scheme; and a served document with a
  wrong-typed `language` emptying the frame and naming the field. The suite is
  at 488 cases, from 464.

## [2026.10.20]

### Added

- **The code panel is coloured token by token.** A `sheet.json` carried one
  `role` for a whole line, and the panel drew it in one colour - wrong wherever
  a line holds more than one kind of thing, which is most lines.
  `api/cheatsheet/accents.mjs` reads the example with the drawing surface's
  Clean Language Accents and maps each coloured run's scope to one of the six
  roles the design language names, so a tag, an attribute name and a string on
  one line now draw in three colours. The palette did not move: only how a
  token's colour is chosen did. All seventeen sheets name the language their
  example is written in, `html` or `javascript`, and the six roles are the six
  that were already there.
- **Two groupings in that mapping are this repository's own.** The surface
  classifies a scope for its own two themes, where an attribute name and a
  number are one blue; these sheets have two different greens and a recorded
  rule saying which is which. An attribute name, a CSS property and a
  JavaScript property take `identifier`; a selector and a doctype take
  `keyword`. The rest is the surface's classification, stepped down from its
  nine roles to six, with `addition` and `deletion` drawing plain because
  nothing on a sheet means them.
- **The per-line role stays, as the fallback**, and a composition says which of
  the two coloured it - `accents` in the variation report reads `token`, `line`
  or `missing:<language>`. `node tools/build-manifest.mjs --check` reports a
  panel that fell back as a warning, because a fallback nothing mentions is the
  one state that looks exactly like the state that was meant.
- **`tools/test-sheet-syntax-roles.mjs`**, which holds every `html-css` sheet
  to the per-line mapping its own design language fixes. Nothing in `tools/`
  pinned that: `tools/test-language-asset.mjs` checks the role colours and
  never which line takes which role, so a line given the wrong role was
  something a reader saw and no case failed on. It derives the expected role
  from the rule's own five tests, carrying the open-tag state across lines
  rather than reading it off the line before, and resetting it on a blank line.
- **`tools/test-sheet-accents.mjs`**, seventeen cases over the token mapping:
  which role each scope draws in, that every line comes back fully covered with
  no gap or overlap, that a comment running across two lines is a comment on
  both, that adjacent stretches in one role are one element, and that every
  committed sheet composes token by token.
- **Each dropdown opens on a placeholder that names the choice.** The catalog
  holds two categories, so nothing is preselected and `#category` sat on a
  hidden empty option: a bordered box with a chevron and no text in it, which
  is also what a control looks like when its options never arrived, and it was
  the first interactive thing on the page. It now reads `Choose a category` and
  `#example` reads `Choose a cheatsheet`.

### Changed

- **The vendored drawing surface is `@isocialpractice/napkin-sketch@1.1.0`,
  written by the package's own `napkin-sketch vendor`.** `1.1.0` carries the
  three fixes reported from here on 2026.10.14 -
  [#10](https://github.com/isocialPractice/napkin-sketch/issues/10) a
  composition-only entry, [#11](https://github.com/isocialPractice/napkin-sketch/issues/11)
  an elliptical arc refused rather than drawn as a polyline, and
  [#12](https://github.com/isocialPractice/napkin-sketch/issues/12) a quoted
  font family read as its name rather than as `&quot` - and a `vendor` command
  made for re-vendoring a copy like this one. Four parts are vendored:
  `graphic-design`, `graphic-design/files`, `markdown`, and the whole API,
  which is where the accent functions are exported from.
- **`api/cheatsheet/` draws through the `graphic-design` entry**, which is what
  #10 was filed for. The page's own module graph is now that entry alone - four
  files, 131,291 bytes and 50,622 gzipped at level 6, against `1.0.0`'s five
  files, 772,665 bytes and 273,169 gzipped. That is a 5.4x cut on what loads
  before the first paint.
- **Reading code is fetched on demand, and it is the heavy half.** The
  `markdown` entry and the API that reads with it are imported dynamically by
  `api/cheatsheet/accents.mjs` and asked for beside the catalog rather than in
  front of the first paint: eight more files, 856,291 bytes and 290,824
  gzipped, most of it highlight.js's common set of 36 grammars. A reader who
  draws a sheet ends up with twelve files, 987,582 bytes and 341,446 gzipped -
  25% more than `1.0.0` in total, on a critical path a fifth the size.
  `composeSheet` stays synchronous; preparing is the asynchronous half and it
  happens once per process.
- **The Pages gate runs `node api/napkin-sketch/VENDOR-CHECK.mjs`**, which the
  vendor command writes beside the copy. It hashes every file against
  `VENDOR.json` with plain `node`, no install and no network, which is what the
  retired `tools/vendor-napkin-sketch.mjs --check` did with code written here.
- **The design language helper reads a quoted font family upstream's way.** The
  reading correction this repository carried locally was reported as #12 and
  released in `1.1.0`, so `analyze-media.mjs` takes the published copy's family
  reading and entity decoder. There is one reading of a quoted family in the
  tree now and not two; it still returns `Helvetica Neue` for the committed
  fixture, measured.
- **`forms-and-inputs` row 15 declares `string`.** The line
  `                  checked> Free</label>` declared no role and so drew plain
  white, while the two wrapped-attribute continuations in the same panel drew
  amber and `links-and-navigation` row 16 - the same construction - declares
  `string`. Measured over all 130 non-blank lines in the six sheets on
  2026.10.19: 129 agreed with the category's own rule and this one did not.
  Token colouring settles what a reader sees, drawing `checked` as the
  attribute it is and `Free` as the prose it is; the declared role is the
  fallback and now matches the rule as well.
- **The second dropdown's placeholder stays selectable, and the first does
  not.** The two blank options do not mean the same thing: choosing a category
  is how a reader gets anywhere, so that placeholder is a label and is
  `disabled`, while re-selecting the second is how a reader takes the sheet
  back down, so it only gained the name it was missing. Disabling both removed
  the only way out of a selection, which three cases in
  `tools/test-example-selection.mjs` caught.

### Fixed

- **`DESIGN_LANGUAGE-html-css.md` gave one range of lines per role for three
  roles, and it was one role's range.** It read "the six sheets in the category
  land between three and sixteen lines of each", and both ends of that come
  from `keyword`, which runs 3, 3, 3, 5, 12, 16. Green runs 1, 5, 5, 8, 9, 10
  and white runs 1, 1, 2, 4, 4, 14, so both reach below the lower end, and two
  roles are missing from a sheet entirely - Text Content carries no comment and
  no `string` line. The single range is replaced by a table of all six, one
  figure per sheet, counted over all 130 non-blank lines on 2026.10.20. The
  **General CSS Overview** item in the queue is drawn to this document and
  would have inherited the figure that fits one row of six.

### Removed

- **`tools/vendor-napkin-sketch.mjs` and its 390 line test**, which existed
  because `1.0.0` shipped no way to make a vendored copy. `1.1.0` does, so the
  tool went with the folder it wrote. Most of that test was about the tool -
  its tar reader, its specifier scan, its refusal of a path climbing out of the
  folder - and the part that was never about the tool is now
  `tools/test-vendored-surface.mjs`: the copy matches its own record, the scope
  markers stay inside the folder, every entry loads with nothing installed, the
  Pages gate checks the copy, and nothing in the tree still names `PIN.json` or
  `vendor-napkin-sketch`.
- **`api/napkin-sketch/PIN.json`**, replaced by the `VENDOR.json` the vendor
  command writes.

## [2026.10.19]

### Added

- **The `html-css` category, and with it the second category the catalog has
  ever held.** Six cheatsheets under a **General HTML Overview** group at
  `html-css/general-html-overview/`, every one `kind: read`: document
  structure, text content, links and navigation, images and media, forms and
  inputs, and tables and data. Each folder holds a `sheet.json`, a `meta.json`
  for its order, and one readable `.html` payload the page renders as source
  text. No folder commits a raster; the graphic is composed in the browser
  through `api/cheatsheet/`, as every sheet in the catalog is.

  The sheet count is the subject's own, from the conventions under **New
  Cheatsheets**: a subject becomes between one and eight cheatsheets, each
  taking a different area of focus, so `general-html-overview` is the group and
  the six areas are the cheatsheets. `node tools/build-manifest.mjs --check`
  passes on the result, which is seventeen documents across two categories, and
  every one of them is composed rather than taken on trust.

- **A design language for the category, derived rather than invented.**
  [DESIGN_LANGUAGE-html-css.md](DESIGN_LANGUAGE-html-css.md) records the
  palette by reference share and by area, the four measured type sizes, the one
  named brand slot and the 60-30-10 the category's work is held against. Every
  figure in it came off an asset `tools/compose-language-asset.mjs` composed
  out of `DESIGN_LANGUAGE.md`, because a category drawn in the browser has no
  artwork to measure and the way out is to compose the record rather than relax
  the helper's refusal to invent a value. Measured at full size the asset puts
  navy at 61.8% of the page against the recorded 60.97%, white at 28.6%, green
  at 5.7%, and the three ink colours within 0.2 points of their shares.

  It also fixes the one thing the global record could not: how a `sheet.json`
  carries markup. A document gives one role per **line**, not one per token, so
  the category's rule is read in that order - a comment is `comment`, a wrapped
  attribute line is `string`, a line carrying an attribute is `identifier`, a
  line that is nothing but tags is `keyword`, and a line of prose is plain.
  `number` is recorded as unused rather than forced onto a line that does not
  mean it.

  The generated skill is at `.claude/skills/html-css/`, which is ignored:
  it is derived from the committed record, so the record is what is kept.

- **`tools/test-example-comments.mjs`, which holds every example's commented
  output to what the example actually logs.** Twenty four cases. Each payload
  runs in a `vm` context with a `"use strict";` prologue and `lineOffset: -1`
  so the strictness is the module's the page injects and a stack frame still
  names the line the committed file holds; the `console.log` replacement reads
  that line off the frame and renders each argument at the call, before
  anything can mutate it. The rendering is the browser console's own notation,
  stated in the file rather than borrowed from a Chrome release no test on this
  machine can observe.

  A trailing comment opening `NOTE`, `IMPORTANT`, `WILL BE` or `WOULD BE` is a
  remark and is not compared, which is the examples' own convention rather than
  a new one: some lines have nothing to claim, like a value that is random
  every run. A line hit more than once joins its outputs with `", "`, which is
  how the one looping example already wrote its claim.

- **A `/one/` route in `tools/test-example-selection.mjs`**, serving the
  committed catalog's first category on its own. The fixtures have inverted:
  `/two/` existed because the real catalog held one category, and the single
  category arrival - which is the only arrival the page's preselection is about
  - is now the shape that needs one.

- **Two cases pinning what this run added.** A committed `read` cheatsheet
  draws, has no script element injected for it and asks for no console, which
  until today could only be asserted against `/drawn/` and a manifest a test
  rewrote in memory. And every category after the first carries its own
  `DESIGN_LANGUAGE-<category>.md`, with nothing recorded for a category the
  catalog no longer holds, so the next category added without its language
  fails rather than being drawn to one nobody wrote down.

### Fixed

- **The eleven examples' commented output, 48 of whose 87 claims were wrong.**
  Measured by running the checker above against the committed files: 22 were
  substantively wrong, and the other 26 differed from the console by a
  character nobody can see. What it found:

  - `sorting-arrays.js` carried eight claims written for an array the file does
    not hold. `ONE[0]` is `[20, 0, 1, 1000]` and the comment said
    `[2, 0, 10, 3]`; sorted it is `[0, 1, 1000, 20]` and the comment said
    `[0, 1, 10, 2]`, twice. Five more gave a four element array a count of
    three.
  - `shift-and-unshift.js` said `appple` where the console writes `apple`, and
    gave three array logs as bare comma lists rather than as what the console
    shows.
  - `changing-elements.js` showed a string inside an array unquoted.
  - `random-sort-array.js` claimed `r, a, n, s, e, q` for a randomly shuffled
    array. It is a remark now, saying the order is random and different every
    run, because no comment can pin that one.
  - `max-and-min-function-and-sort-object.js` wrote three object literals out
    by hand where the console shows `(3) [{...}, {...}, {...}]`. The detail is
    not lost: the loop below it logs the three, and its claim moved onto the
    line that makes it.
  - `sort-numbers-array.js` left four array logs without their element count,
    and one log with no comment at all.
  - `splicing-arrays.js` ended a claim with a semicolon that is not in the
    output.
  - **Thirty six lines across six files carried a character that is not
    ASCII**: 34 non-breaking spaces, almost all of them sitting between the
    `(n)` count and the bracket where the console writes an ordinary space, and
    16 curly quotes over five lines. Either is exactly as wrong as a miscounted
    element and neither is visible to a reader; between them they account for
    26 of the 48 wrong claims. All eleven files are plain ASCII now, and a case
    per file holds them there.

  The one correction outside a comment is in `shift-and-unshift.js`, where
  `bannana` was a data value the comments were faithfully reproducing. Spelling
  it correctly in the comment alone would have made the comment wrong, so the
  array element is `banana` and the claims follow it. `sheet.json` for that
  cheatsheet carries the same correction, because the drawn sheet shows the
  same code.

- **The `// JavaScript Document` header is gone from the five files that had
  it.** The queued item offered the choice of giving all eleven the same header
  or dropping it from all, and dropping is what the header is worth: it is an
  editor artifact, it says nothing the file name does not, six of the eleven
  never had it, and the `sheet.json` documents that mirror these files already
  omitted it. All eleven now open with the example's own first line.

- **Four browser tests assumed a catalog with one category, and the page
  deliberately behaves differently with two.** `index.html` preselects a
  category only while `categorySelect.options.length === 2`, so
  `#selectExample` ships hidden the moment a second lands and a
  `selectOption("#example", ...)` with no category named first waits out
  Playwright's timeout. Forty one cases failed on that, across
  `test-example-selection.mjs`, `test-page-structure-browser.mjs`,
  `test-sheet-footer-browser.mjs` and `test-theme-rendering-browser.mjs`. The
  page is right and the tests were measuring the old catalog: each now names
  the category, as a reader does, and the three cases that were about the
  preselection itself go to `/one/`.

  Two of them needed more than a selection. `test-sheet-footer-browser.mjs`
  took its example by `{ index: 1 }`, which counts the options of every
  category rather than the shown one, so it stopped meaning "the first sheet
  offered" as soon as a category was added; it names the sheet now. And
  `test-theme-rendering-browser.mjs` reads a native control's face by comparing
  its intrinsic width against a serif, which needs the two faces to disagree -
  with `JavaScript` and `HTML/CSS` both on offer the serif's widest option was
  not the stack's widest, the two maxima landed 2px apart, and the case failed
  for having nothing left to read. It measures a probe option now, one string
  in both faces, which cannot reorder.

- **`Fix the CONGIF misspelling in the index.html configuration comment` closed
  by verification, as its own text asked.** Re-measured today: `CONGIF` appears
  nowhere in the repository outside `TODO.md` and the roadmap plan that record
  the item, and `index.html` holds no configuration comment to carry it - that
  block went out with `testEnvironment` on 2026.09.24. Nothing was written.

- **A stale comment in `tools/test-build-manifest.mjs`.** "the repository's own
  tree passes the check" described itself as holding an empty tree "until the
  eleven array examples are migrated". They migrated on 2026.09.24. It now says
  what the check actually walks, which is seventeen documents in two
  categories.

## [2026.10.18]

### Fixed

- **The refusal's hash guard is credited with what it actually saves.** The
  comment above `if (location.hash) writeFragment("")` in `applyFragment()`
  gave the guard's reason as keeping an ordinary arrival from writing "no
  history entry at all", and the 2026.10.17 entry below repeats that wording.
  `writeFragment` records through `history.replaceState`, which replaces the
  current entry and never pushes one, so there was never an entry for the
  guard to prevent: serving the page with the clearing made unconditional
  takes `history.length` from 1 to 2 exactly as the committed version does,
  leaves the address bar with no fragment, and lands on `about:blank` after
  one press of back. The guard stays, because skipping a `replaceState` that
  has nothing to clear is still worth the branch, and the comment now claims
  the saved call rather than the entry.

  No test changed. `tools/test-example-selection.mjs` already recorded the
  measurement under "an arrival with no fragment writes nothing to the address
  bar", including the note that no test can tell the two versions apart, so
  the code was the only one of the two statements out of step.

## [2026.10.17]

### Fixed

- **A dead fragment is cleared where it is refused, not where it happens to be
  noticed.** `applyFragment()` returned `false` and left the address bar alone;
  the slug was wiped afterwards by `selectCheatsheet()`, which the start up
  block calls only when the fragment failed **and** the catalog holds exactly
  one category. That second condition is the whole catalog today, so the
  behaviour read as correct - and `#javascript/arrays/no-such-sheet` against a
  two category catalog arrived with nothing selected, nothing drawn, and the
  refused slug still in the address bar for the reader to copy and pass on. The
  refusal now clears it itself, guarded on `location.hash` so an arrival with
  no fragment still writes no history entry at all. A malformed escape reaches
  the same branch, which is correct: it is a fragment naming nothing by another
  route.

  The regression is pinned against the suite's existing two category fixture
  rather than the committed one, because the committed catalog passes this
  either way - the preselection covers for it, and would go on doing so until
  the first run that adds a category.

- **The first instruction on the page is spelled the way its own label is.**
  "Select Cheatsheat from dropdown." sat four lines above
  `<label for="category">Select Cheatsheet</label>`, naming the same control
  two different ways, at the top of the instructions panel and on screen from
  the moment the page opens. The pair is now pinned to each other in
  `tools/test-page-structure.mjs`, so a later rewording of one that leaves the
  other behind is caught in the suite instead of on screen.

## [2026.10.16]

### Added

- **A cheatsheet has a shareable link.** The page keyed every option by its
  slug already, so the fragment is that slug and needed no second naming
  scheme: `index.html#javascript/arrays/splicing-arrays` opens the page with
  that sheet selected and drawn. The fragment is resolved after both dropdowns
  are built rather than before, which is what makes resolving it a lookup in
  the catalog instead of a second walk of the manifest, and a fragment naming
  nothing there - a renamed folder, a hand typed link - falls back to the
  arrival the page would have had without one rather than sitting empty behind
  a failure the reader cannot see.

  The category travels with the entry for this, rather than being read off the
  front of the slug. The slug is a path that happens to open with its category,
  so splitting it would appear to work until a folder moved, and then it would
  send an arrival by link to a category that does not exist - quietly, and on
  that one route only. It is the same fault the manifest's own ids were brought
  in to end.

- **The selection is written back to the address bar**, so what is on screen is
  what a reader copies. `history.replaceState` rather than an assignment to
  `location.hash`, which pushes: with a push per selection, a reader who looked
  at four cheatsheets would need four presses of the back button to leave by
  the way they came in. The fragment tracks the selection in both directions -
  changing the category, choosing the blank option and arriving on a dead slug
  all clear it - so it never names a sheet the page is not showing.

### Fixed

- **The page no longer asks every reader to open a console.** Three lines said
  to: the paragraph under the rule, the third step in the instructions panel,
  and the footnote at the bottom. Only the footnote was conditional; the other
  two were in the markup unconditionally, and the footnote points back up at
  them - "the methods mentioned up top" - so a cheatsheet with no payload kept
  both of the instructions that did not apply, and the one line that did know
  the kind was the one that went.

  Only a `kind: "run"` cheatsheet has a payload injected, and the catalog
  recognises `read`, `embed` and `none` besides, so the three are now shown and
  hidden together from the selected entry's kind. They are restored to `""`
  rather than to `"block"` because one of them is an `li`: block takes its
  marker with it, and the step would have come back as an unnumbered line in a
  numbered list.

### Changed

- **The README leads with the site link**, directly under the level 1 heading,
  and describes the two ways to view the examples as two routes. The published
  site and a local server are for two different readers - one reading the
  examples, one working on the page that draws them - and they had been one
  paragraph with the server requirement bolted onto the end of it. The
  `file://` warning is now part of the local server route and says what it
  actually costs: not a degraded view of the page, a blank one.

### Verified

- **The README's licence paragraph is accurate as it stands.** It names CC0 1.0
  Universal against `LICENSE`, scopes out `api/napkin-sketch/` as the vendored
  package and `ai-helper/graphic-designer/` as the hand port, puts both under
  MIT, and points at `NOTICE`. Checked against all three files rather than
  rewritten, which is what the item asked for: the two directories it names are
  what the vendoring left behind, and `NOTICE` carries the copyright line, the
  permission text in full and the bundled notice the vendored chunks reach.

### Tested

- Twenty one cases for the two page changes, in `tools/test-example-selection.mjs`
  and `tools/test-page-structure.mjs`. The claims a parse can reach are read off
  the source text, so a bare clone still holds the page to them; the rest run in
  Chromium on the terms the suite already settled.
- A third synthetic route, `/drawn/`, answers the manifest with one entry's
  `kind` changed to `none` and its payload dropped. All eleven committed
  cheatsheets are runnable scripts, so the page's behaviour for the other three
  kinds had nothing in the repository to read it against; the folder is left
  alone, so the document still fetches and composes.
- The link cases cover an arrival by fragment, a fragment into the second
  category, a dead slug, a percent escaped slug and a malformed one. The last
  is there because `decodeURIComponent("%zz")` throws and the call sits in the
  page's top level start up block, where an unguarded throw would take the
  catalog down and show the reader the "could not be loaded" paragraph instead.
- `history.length` is measured across four selections rather than the mechanism
  being trusted, and `getComputedStyle` is read for the step's `list-item`
  rather than the inline property, because an inline assignment cannot tell a
  rendered marker from a string.

## [2026.10.15]

### Fixed

- **The footer mark no longer meets the sheet's trim.** The artwork's footer
  is a navy block flush to the bottom left corner, filling the band, with the
  mark set 192 px into it - so what reaches the edge is a ground, and the mark
  is held off it. `assets/footer.png` was a tight 752 by 51 crop that began at
  the mark itself, so a placed strip put the green bar at x 0 against page
  white: the one element on a sheet whose own ink touched the trim, and at the
  page's 900 px render it met the frame's own border.

  The asset now carries that ground - the same lockup, inset 46 columns into a
  navy plate, on a 799 by 81 frame. Scanned at the 3600 square against
  `javaScriptArrays/SplicingArrays.jpg`, the composed green bar now starts at
  **x 191** against the artwork's 192, the plate reaches x 0 and both band
  edges, and the follow line starts at **x 602** against the artwork's 604.
  Before the change the strip began at x 0 and its follow line at 437.

  **The inset is the asset's and not the slot's**, which is why the fix is an
  image rather than a figure. `BRAND_SLOTS.footer.x` is 0 before it and after
  it: only the asset knows where its own mark ends - 93 of its 799 columns, a
  proportion no constant could derive - so a plate drawn by `compose.mjs`
  would have to guess that edge and would notch visibly wherever it guessed
  wrong. The 799 by 81 is also what keeps the plate flush. It is a shade wider
  than the slot's own 3312 by 336 ratio, so `contain` fits to the width and
  leaves no half-pixel of page white down the trim, which an exactly
  proportioned frame did leave.

  `tools/test-sheet-brand.mjs` pins it by reading pixels back out of the
  rasterizer rather than by asserting a constant, because no constant moved.
  Put the old asset back and it fails on the trim column being white.

- **Six source lines no longer name the deleted graphic-design port as
  something a reader can still go and look at.** The port became the pinned
  `@isocialpractice/napkin-sketch` copy on 2026.10.14, and that turn's
  verification grep passed only because it could not see them: four sat in
  files that were still untracked, and two wrote `port's`, which
  `-w "the port"` does not match. One of the two is split across a line break,
  so no line-based grep could have found it at all.

  `api/cheatsheet/brand.mjs` now restates `BrandSource` from the vendored
  surface and points at `api/napkin-sketch/`; `tools/test-sheet-brand.mjs` and
  `tools/test-sheet-raster.mjs` name the surface where they named the port.
  The two scope-marker comments in `tools/vendor-napkin-sketch.mjs` and
  `tools/test-vendor-napkin-sketch.mjs` keep their decision and lose their
  reason, which cited `tools/test-graphic-design-port.mjs` - a file the same
  turn deleted. They now state it on its own terms: a marker belongs with the
  copy it scopes, and one at `api/package.json` would reach every sibling and
  declare this repository's own source a module as a side effect of vendoring
  somebody else's.

  Two further lines in `tools/vendor-napkin-sketch.mjs` were outside the six
  and had to go for the verification to pass - one calling the constraints the
  port's, one pointing at the port's own `files.mjs` for a boundary the
  package draws itself. The grep now returns only `TODO.md`, `CHANGELOG.md`
  and lines about the design language helper, which stays ported.

- **`brand.mjs` no longer sends a reader to `raster.mjs` for a guard that is
  not in it.** The comment on `dataUrlFrom` explained its `btoa`/`Buffer` pair
  as "the same guard `raster.mjs` carries for the decode side", and
  `tools/test-sheet-brand.mjs` repeated it. No `raster.mjs` in the tree holds
  either global - the one that did was `api/graphic-design/raster.mjs`,
  deleted in the same turn those comments were written, so a reader was being
  sent to the only `raster.mjs` there is to find something that was never in
  it. Both now explain the pair on its own terms and name where the decode
  side actually lives: the vendored surface's own rasterizer, which reaches
  for `atob` and falls back to `globalThis.Buffer`.

### Measured

- **The `Buffer` arm in `dataUrlFrom` is a branch nothing reaches.** Measured
  while the comment above was being rewritten, because it decided how much of
  it survived: `btoa` has been a Node global since 16, the vendored package
  declares `node >=22.12`, and `.github/workflows/pages.yml` pins 22. The arm
  is kept - it costs a line, and the arm never taken is the cheap half of the
  pair - but the comment now says it is a fallback rather than implying both
  halves are live.

- **The footer strip's text sets at a 149 px cap**, against the 154 the follow
  line measures, and the strip is 3 per cent short of the artwork rather than
  3 per cent over as it was. `DESIGN_LANGUAGE.md` and `language.mjs` both
  carried the round 154 as though the asset produced it; neither did, before
  or after. The figures recorded now are the measured ones.

### Verified

- **The published site composes a sheet through the vendored package** - the
  half of the 2026.10.14 deploy that no run could check from inside the turn
  that pushed it, since the build runs on the server minutes afterwards.
  Driven against <https://isocialpractice.github.io/cheatsheets/>: the catalog
  reaches `ready`, selecting an example draws `#curCheatSheet > svg` with 65
  descendants, and `api/napkin-sketch/api/index.js` with its four chunks all
  answer 200 as `application/javascript`. No request failed, and the console
  carried only the example's own output. The media type ruled out beforehand
  was not the risk it looked like: both extensions serve as JavaScript.

## [2026.10.14]

### Added

- **A cheatsheet carries its brand assets.** `assets/logo.svg` and
  `assets/footer.png` were committed on 2026.09.24 and nothing composed
  reached them: the masthead set a lone wordmark centred on the canvas axis,
  and the footer drew a bare navy rectangle where the artwork's lockup goes.
  Both slots now take the real asset, through a new `api/cheatsheet/brand.mjs`
  and a `brand` option on `composeSheet`.

  Both slot boxes were measured off `javaScriptArrays/SplicingArrays.jpg` by
  scanning for the mark's own green, and are recorded as `BRAND_SLOTS` in
  `language.mjs` and in **The two places a sheet carries an asset rather than
  shapes** in `DESIGN_LANGUAGE.md`. The masthead mark occupies x 2182 to 2634
  and y 132 to 374 - 452 by 242, at the wordmark's own ink top, 305 px past the
  end of the wordmark's text. The footer strip takes the band less the right
  margin, 0 to 3312, where its text sets at the 154 px cap the follow line
  measures.

  That also settled what `RUNS.wordmark` records. Its `left` of 550 and `width`
  of 2084 reach 2634, which is the **lockup** - the wordmark and the mark
  together - and not the text alone, which is 1327 px wide. `compose.mjs` had
  recorded the lockup's 208 px offset from the canvas axis, inferred a second
  element that would make the pair centred, and declined to reproduce the
  offset without it. The element is real; the inference was not. Nothing in
  that masthead is centred, and a generated sheet centres the lockup anyway,
  for the reason the file already gave for the lone wordmark.

  A sheet composes without a brand exactly as it did before - every slot falls
  back to what it drew - which is what keeps `tools/fixtures/sheet.svg` pinned
  byte for byte. A document that names its own `followLine` keeps the drawn
  footer, because the strip carries fixed text.

- **The composed sheet has a route to its own full size, and a bigger cap to
  start from.** The displayed cap moves from 600 px to `min(100%, 900px)`, and
  the page's measure moves with it from 1024 to 1324 - the two are one figure,
  since a 900 px cap inside a 1024 px page is a 600 px sheet capped by its
  column. Under 900 px that cap resolves to 100%, so a phone gets what it
  always got: the code is drawn at 65.4 sheet pixels in a 3600 px square, which
  is 6.23 CSS px at 375 px and reads as grey texture rather than as text. A
  link under the sheet opens the composition in a tab of its own, at its own
  3600 px, from a blob of the markup already in memory - no second request and
  no raster.

- **`tools/vendor-napkin-sketch.mjs`**, which pins a published release of the
  drawing surface into `api/napkin-sketch/`. `--pin <version>` verifies the
  tarball against the registry's own SHA-512 before it gunzips a byte, reads
  the ustar archive, walks the two entries' import specifiers to find the
  chunks they reach, drops the `dist/` prefix so every relative import resolves
  unchanged, deletes anything the pin did not write, and records a SHA-256 per
  file in `api/napkin-sketch/PIN.json`. `--check` hashes the folder against
  that record with no network, and the Pages workflow runs it beside the
  manifest check.

  The chunks are read from the entries rather than from a list because their
  names are build hashes, so a list would silently vendor the wrong set on the
  next release. At `1.0.0` that is five chunks, four from the root entry and
  one more from the Node only file writer.

### Changed

- **`api/cheatsheet/` measures its own runs.** The layer carries a `Face`
  typedef and a `measureRun` of its own, reading the committed width table with
  the arithmetic the drawing surface used, and nothing here asks that surface
  how wide anything is any more. Every run reaches it as a `font-family` and an
  `x`: the three centred runs are placed at the centre less half the measured
  width and set left aligned, because the published surface reads neither a
  face on an element nor a width table in its measuring options.

  `tools/fixtures/sheet.svg` is byte identical across the change.
  `sheet.png.sha256` is not, and that is the whole of what moved: with no face
  reaching it, the built-in rasterizer advances its single stroke alphabet by
  its own widths, so runs are about half again as wide and the follow line runs
  off the canvas. That route was never the publishable one -
  `api/cheatsheet/raster.mjs` is - and what the digest pins is the geometry,
  the paints and the element set.

- **The paint refusal is the layer's, with a colour reader to match.**
  `composeSheet` reads every fill and stroke of the document it composed and
  raises on one no renderer can read, quoting it. Measured on 2026.10.13:
  `fill: "ofwhite"` is written straight into the markup by the package's
  `toSVG()` and refused only by its `toPNG()` - and the page composes inline
  SVG and never rasterizes, so an unreadable paint would be a black region with
  no error anywhere. `parseSheetColor` reads the hex forms and nothing else,
  which is every one of the 22 paints the design language and the worked
  example's theme declare.

- **The drawing surface is a vendored copy of the published package.**
  `api/napkin-sketch/` holds `@isocialpractice/napkin-sketch@1.0.0` - two
  entries, five chunks, three scope markers and the package's own licence and
  notices - and every importer points at it. The page downloads 772,665 bytes,
  273,169 gzipped at level 6, where the ten port modules it loaded were 144,760
  and 47,135. Closing that gap is what the upstream request below is for.

  Nothing in that folder is edited; a fix arrives by moving the pin. The Pages
  manifest job pins `actions/setup-node@v4` at Node 22, because the package
  declares 22.12 or later and that job composes every sheet through it. Nothing
  is installed, so `php -S localhost:8000` and a bare clone's `node --test`
  both still work.

- **The eleven examples are offered in the order the page taught them**, from
  the simplest array edit to sorting objects by property. Built from
  `cheatsheets.json` they came out alphabetically, so the first sheet a reader
  met was Changing Elements and the teaching order was gone. Each of the eleven
  folders gains a `meta.json` carrying its `order`; `byOrder` in
  `tools/build-manifest.mjs` already read one and the fallback to the id was
  what decided.

- **The widest example label fits the control it is offered in.** At 375 px the
  dropdown read "Max and Min Function and Sort Obje", cut mid word with nothing
  marking the cut. Measured in Chromium: the label sets at 273.02 px, a select
  spends 18 px on padding and border and 18.98 px on its dropdown arrow, so the
  control needs 310 px to the pixel - and had 310 at 1280 px and 293 at 375 px.
  The control now takes the panel's whole measure, the panel pads a step
  tighter at each end, and `text-overflow: ellipsis` marks a cut under about
  360 px where no padding leaves 310. `tools/test-page-structure-browser.mjs`
  pins both widths and measures the arrow rather than quoting it.

- **The brand bridge resolves a rooted path against the repository.**
  `- logo: /assets/logo.svg` in a constants file is a link as a reader writes
  one, and reading it as a filesystem path sent it to the drive root. From
  2026.09.24, when the two assets were committed, the bridge reported both as
  missing while the files sat in the tree it was reading from, and two suite
  cases had been failing on it.

### Removed

- **The hand port of the graphic design API**, `api/graphic-design/`: thirteen
  modules of 6,240 lines, its `API.md`, and the 537 line
  `tools/test-graphic-design-port.mjs` that held it against upstream. The
  published package replaces it, and the project's own documentation site
  replaces the reference. `NOTICE` scopes `api/napkin-sketch/` out of the CC0
  waiver in its place, carries the package's MIT text in full, and adds the
  en-US hyphenation patterns notice, which is the one third-party notice the
  vendored chunks actually reach.

### Fixed

- **The 2026.09.20 entry below counted the arc refusal as the second local
  change to a ported module, and it was the third.** Measured with `git log`:
  the paint refusal in `svg.mjs` landed 2026.09.16, the face in `font.mjs`
  2026.09.17, and the arc in `geometry.mjs` 2026.09.20.

- **The new `.js` media type case measured a path no commit since 2026.09.24
  contains.** `tools/test-pages-media-type.mjs` asked the live site for
  `javaScriptArrays/ChangingElements.js` and two beside it. Those are where the
  eleven examples lived until they moved into `javascript/arrays/<slug>/`, and
  that folder has held only its `.jpg` reference images since. The case passed
  because the deploy was behind and the old names still answered; the moment it
  caught up all three would have 404'd and the case would have skipped for
  good, taking with it the one measurement the vendored `.js` surface rests on.
  The candidates are the migrated payloads now, and a case with no network of
  its own asserts every candidate in both lists is in the tree - a 404 means
  "the deploy has not run yet", which reads identically to a path that is never
  coming.

- **`tools/vendor-napkin-sketch.mjs` wrote a vendored file wherever its path
  pointed.** Both halves of that path are the tarball's to choose: it names its
  own entries, and the modules in it name their own imports. A chunk importing
  `"../../../../../x.js"` normalizes above `package/`, and an archive carrying
  an entry at that name handed the copy a file to write there - the `..`
  segments survived both prefix strips and landed outside
  `api/napkin-sketch/`. The integrity digest does not reach this: it proves the
  bytes are the ones the registry published, which says nothing about where
  their paths point. `vendoredName` now refuses a `..` segment, before the
  first write, so a pin that stops there leaves nothing half applied.

### Reported upstream

- Three reports against `@isocialpractice/napkin-sketch`, each measured against
  `1.0.0` rather than remembered:
  - [#10](https://github.com/isocialPractice/napkin-sketch/issues/10) asks for
    a composition-only subpath entry, which would also give back `parseColor`,
    `escapeXml` and `isPng`. The composition chunk is 41,985 gzipped against
    the 273,169 the root entry reaches.
  - [#11](https://github.com/isocialPractice/napkin-sketch/issues/11) reports
    that an elliptical arc draws as a polyline of its own parameters with no
    error, byte for byte identical to drawing those numbers as a polyline,
    where the reference says arcs are unsupported.
  - [#12](https://github.com/isocialPractice/napkin-sketch/issues/12) reports
    that the helper's `analyze-media.mjs` reads an escaped spaced family as
    `&quot`, because one pattern serves an attribute and a declaration.

## [2026.10.13]

### Changed

- **The roadmap depends on the published napkin-sketch package rather than on
  a copy of it.** The graphic design API this repository hand ported into
  `api/graphic-design/` reached npm as `@isocialpractice/napkin-sketch` at
  `1.0.0` on 2026.10.12. `TODO.md` gains **Depend on the napkin-sketch
  Package**, six items that move the port's local changes into
  `api/cheatsheet/` or upstream, vendor the pinned build into
  `api/napkin-sketch/` with nothing installed, re-point every importer, delete
  the port, and ask upstream for a composition-only entry. They are queued in
  that order as a user override in `## Current`. No code changes yet.

  Every figure the section states was measured against the `1.0.0` tarball
  rather than carried over, and the one result its order depends on held:
  with the three centred runs placed by the layer and the face dropped, the
  committed sheet fixture comes out byte for byte through the port and through
  the package alike, and so does the shape fixture.

- **Port the napkin-sketch Graphic Design API is closed rather than renamed.**
  Its prose becomes a short record of what the port was and what replaces it,
  and the fourteen archived items that name it keep their `From:` lines. The
  nineteen lines elsewhere in `TODO.md` that described the port as the live
  surface are rewritten against the package, and **Create New Ideas** asks for
  three ideas for the new section instead of four for the closed one.

### Fixed

- **The port's line count had gone stale, and its history had a gap.** The
  port's section said 6,093 lines and that the figure "has moved twice since"
  it landed at 5,899. That was the twelve browser safe modules on 2026.09.19,
  but the figure had moved three times by then, on 09.16, 09.17 and 09.19, and
  the arc correction on 09.20 moved it to 6,137 without the section following.
  The closed section states 6,240, all thirteen modules with `files.mjs`, and
  the order of the three local changes as `git log` records it. The 2026.09.20
  entry below repeats the miscount, calling the arc refusal the second local
  change to a ported module when it was the third; that sentence is queued as
  a found issue rather than corrected here.
