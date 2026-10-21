# Changelog

> Release mode: dated - this project does not publish versions, tags, or releases.

The date of the change is the version, written `YYYY.MM.DD`.

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

## [2026.09.24]

### Added

- **The catalog has content: the eleven array examples are migrated.** Each is
  now a folder under `javascript/arrays/<kebab-name>/` holding a `sheet.json`
  and the example script it always had, with `meta.json` carrying the title at
  the category and the group level. `javascript` is titled `JavaScript` and
  `arrays` is titled `Arrays`, which is the whole reason a title lives in a
  `meta.json` rather than being read off a path.

  The eleven documents are transcribed from the payload each folder ships, by
  one rule for all of them: the leading statements of the script, blank rows
  kept, the source's own spelling and quote characters left alone so a document
  and its payload stay in lockstep. Where a script runs past the panel's row
  budget the excerpt stops early, and where a line runs past the panel's width
  its trailing output comment is shortened. Every one of the eleven composes
  clean and fills 85% to 94% of the code panel, against the 85% floor the
  eleven hand composed sheets were measured at - the figure that says a
  migrated document did not lose content on the way in. `node
  tools/build-manifest.mjs --check` passes on the tree and on the committed
  manifest.

- **The page builds both dropdowns from `cheatsheets.json`.** The manifest is
  fetched by relative path, so it resolves under the `/cheatsheets/` project
  base path on Pages and at the root of a local server alike. Every option is
  keyed by its slug id and labelled from a manifest title, which is what ends
  the one arrangement this page has always had backwards: `removeSpaceInVariable`
  took the label `Shift And Unshift` apart to reach `shiftAndUnshift.js`, so
  rewording a label renamed a file that nobody had renamed. It and the two case
  helpers beside it are gone with the hand maintained `optgroup`.

- **The sheet is composed in the browser.** This is the first time the page
  imports `api/cheatsheet/`, which is what the port was for. A selection
  reserves the frame's box from the entry's recorded width and height, fetches
  that folder's `sheet.json`, composes it, and injects the result as an inline
  `svg` with its own `width` and `height` stripped so the element scales off its
  `viewBox`. The box is reserved before the document is fetched rather than
  after, which is the job the image element's dimensions used to do.

### Changed

- **`index.html` is a module.** `import` and a top level `await fetch` are what
  the two items above needed, and both are refused a `file://` document under
  the same CORS rule, so a local server stopped being optional. The `README.md`
  line claiming the page works from disk said the opposite and now says that.
  A catalog that cannot be read shows a line saying so rather than leaving an
  empty dropdown to be interpreted.

- **The injected example is a module too, and only one is ever in the body.**
  Every selection used to append another `script` and never remove the last, so
  a reader who looked at four examples left four elements behind and each new
  example ran against the previous one's globals - which `console.clear()` hid
  rather than fixed. The previous element is now removed before the next goes
  in, the payload is injected with `type="module"` so its `var fruits` and
  `var A` are its own, and `console.clear()` is gone. The injected URL carries
  a per selection counter, because a module is registered once per URL per
  document and without it the second visit to an example would execute nothing.

- **Changing the category hides the group that was shown before.**
  `selectCheatsheet()` set one `optgroup` to `display: block` and set none back,
  which was correct while there was one category and would have shown the first
  category's examples under the second the moment there were two. Every group is
  now hidden and the chosen one shown, and a selection belonging to the category
  being left is cleared with its sheet rather than left on screen under a
  dropdown that no longer offers it.

### Fixed

- **The `javaScriptArrays/.jpg` placeholder `src` is gone**, along with the
  `javaScriptArrays/.js` reference beside it. Both files were deleted on
  2026.09.09 in `cec3805` while the markup kept pointing at one, so loading the
  page at all requested a file that answers 404 on the published site. The
  endpoint is no `src` attribute rather than an empty one: the element is now a
  container the page draws into, and there is no raster left for a `src` to
  name.

- **Four undeclared loop counters and one octal literal**, all of them forced
  into the open by injecting payloads as modules. Module scope is strict mode,
  so `for (i in cars)` in `max-and-min-function-and-sort-object.js` and
  `for (i in one)` and `for (i in tempArr)` in `max-and-min-value-array.js`
  stopped being global leaks and became `ReferenceError`s; the `optgroup` loop
  in `index.html` went out with the `optgroup` itself. `sort-numbers-array.js`
  carried the legacy octal literal `01`, which is a parse error in a module
  rather than a run time one, so that payload would not have loaded at all. It
  already evaluated to `1`, which is what it says now, in the payload and in
  the document transcribed from it.

- **The `XMLHttpRequest` probe is deleted rather than replaced**, which the
  queued item's own last bullet named as the likelier ending. Composing the
  sheet in the page removed the image request, so there is no response status
  to read, no broken icon to pre-empt, and no stalled request to leave an empty
  box behind. Three days of measurements - 09.08, 09.09, 09.10 - are kept in
  the **Preview Links and Example Loading** prose, because they are what the
  change of course was decided against.

- `tools/test-page-structure-browser.mjs` and
  `tools/test-theme-rendering-browser.mjs` serve `.mjs` as `text/javascript` and
  `.json` as `application/json`. Their servers needed neither until the page
  imported a module and fetched a manifest; a module script served as
  `application/octet-stream` is refused outright, so without this the page under
  test rendered nothing and eighteen browser cases timed out rather than one
  saying why.

- `tools/test-example-selection.mjs` is rewritten. It used to slice the page's
  script out of the HTML and run it in a `node:vm` sandbox against a hand built
  DOM, which is not possible for a module with imports and a top level `await`.
  Ten cases that can be read off the source text still are, so a bare clone
  holds the page to them; fourteen more drive a real engine, including one that
  selects all eleven examples in turn and fails on any page error, which is what
  the strict mode fixes above are held to. Hiding the previously shown
  `optgroup` needs two categories and the catalog has one, so the test server
  answers the manifest under `/two/` with the real eleven split across two
  synthetic categories.

- **Three migrated documents drew something the example does not do.**
  `splicing-arrays` drew `fruits.splice(2, 2, "Lemon", "Kiwi")` returning
  `['Apple']` and `sorting-arrays` drew `ONE[1].sort()` returning
  `['Apple', 'Banana']`; both really return the two and four elements the
  payload's own comment names. Each had lost the `(n)` element count that marks
  every other shortened comment in the eleven as partial, so they read as
  complete rather than as elided, and the console the page tells the reader to
  open prints the real thing beside the sheet that disagreed.

  `changing-elements` shortened a statement rather than a comment, which no
  other document does: it declared `nestArrayToChange` with `[1.0, 2.0]` where
  the example declares `[1.0, 2.0, 3.0, 4.0]`, and then drew
  `console.log(nestArrayToChange[1])` giving `(4) [1, 22.2, 3, 4]` three rows
  below. A reader typing what that sheet shows gets a two element array and a
  two element log.

  All three restored from the payload. Measured after: the same code cap, the
  same 93.8%, 90.6% and 85.4% panel fill and `codeFits` still true on each, so
  nothing was traded for the correction, and every statement the eleven draw is
  now its payload's own line.

- **A cheatsheet the reader moved on from no longer lands on top of the one
  they chose.** `showSheet()` awaits the document and then its body, so the
  order two documents answer in is not the order they were asked in: selecting
  Sorting Arrays and then Splicing Arrays before the first answered left the
  Sorting Arrays graphic in the frame under the name, the footnote and the
  dropdown of Splicing Arrays. Reachable by arrowing through the list, since a
  closed `select` fires `change` on every key. Each selection now carries a
  token and every step past an await checks it, so an abandoned composition
  draws nothing, and a late failure no longer takes down the sheet that
  replaced it.

- The suite is 352 cases, up from 343, all passing with a browser present.
  Seven of the nine new cases need no browser; the two that do are the reserved
  box measured while the document is still in flight, and the abandoned
  selection above.

## [2026.09.23]

### Added

- **`tools/build-manifest.mjs`, the catalog pipeline.** A dependency free Node
  script that walks the cheatsheet tree and writes `cheatsheets.json` at the
  repository root. A folder holding `sheet.json` is a cheatsheet and nothing
  else marks one; `meta.json` at each level carries the human readable title
  and the order, so no display text is ever reverse engineered out of a path.
  The payload is detected by extension and recorded as a path the page can
  fetch.

  Every document is actually composed, through `api/cheatsheet/`, and the
  composition's own width and height go into the manifest. That is what the
  page reserves before it composes into it, which is the job the image
  element's `width` and `height` did while a sheet was still a file the page
  fetched. A document the API refuses stops the build rather than being written
  without its box: a manifest that quietly omitted one entry's dimensions would
  ship exactly the layout shift the dimensions exist to prevent.

  The file is committed rather than built when the site deploys, so a local
  `php -S localhost:8000` still needs no Node. It carries no generation
  timestamp, for a narrower reason: `--check` compares the committed bytes
  against freshly generated output, and a timestamp would fail that comparison
  every run on a tree nobody had touched.
- **`--check`, the same walk as a gate.** It exits non zero on a missing,
  unparsable or invalid `sheet.json` or a missing title; a `kind` that
  contradicts what is in the folder; a path segment that is not lower case
  kebab ASCII, or a payload whose on disk casing differs byte for byte from
  what the document named; a cheatsheet sitting less than two levels below the
  root, having no category to be listed under; a duplicate id; a composition
  that will not fit its own margins; an
  unreferenced file or folder in a cheatsheet folder; a level holding a
  cheatsheet and no title of its own; and a `cheatsheets.json` that differs
  from freshly generated output.

  The casing rule is the one that earns the gate. Pages serves from a case
  sensitive filesystem while the work happens on Windows, so a mismatch
  resolves on the machine that made it and 404s only in production. Every path
  the manifest records comes from `readdir` rather than from what a file said
  it was called, and a payload a document names by hand is resolved a segment
  at a time against a real listing: `Src/example.js` is the same failure one
  folder up as `Example.js` is in the folder itself, and a stat would confirm
  both on Windows. A payload that climbs out of its own folder is refused
  before any of that, since what the manifest hands the page to fetch is
  inside the cheatsheet.

  The unreferenced rule covers folders for the same reason it covers files.
  The walk stops descending at a cheatsheet folder, so a subfolder is the one
  place no other rule looks, and a `sheet.json` inside one is not a second
  cheatsheet. Only `demo/` and the folder a named payload sits in are expected
  there.

  Two of the rules are deliberately not what they could have been. A sparse
  code panel is a **warning** and not a failure: a short cheatsheet is inside
  every margin, it is just emptier than the eleven measured sheets were, and
  failing it would refuse a short sheet for being short. And `sheet.*` is
  reserved in a cheatsheet folder, so `sheet.json` is the document while
  `sheet.webp`, `sheet.png`, `sheet.jpg` and `sheet.svg` are renders the
  unreferenced rule lets through by name. Naming them is what makes that rule
  give one answer everywhere - a render is untracked, so a rule that asked git
  what was committed would pass on the machine that rendered it and fail on the
  runner.
- **The Pages deploy waits on the check.** `.github/workflows/pages.yml` gained
  a `manifest` job that runs `node tools/build-manifest.mjs --check`, and
  `build` now carries `needs: manifest`, so a broken catalog cannot publish.
  The job installs nothing: the script imports Node builtins and relative paths
  only, which is the same no-build-step constraint the port was written under,
  and `tools/test-build-manifest.mjs` holds both halves of that - no install
  step in the workflow, and no bare specifier in the script.
- `cheatsheets.json`, committed. It is empty today, because no folder holds a
  `sheet.json` until the eleven array examples are migrated to
  `javascript/arrays/`. An empty catalog is a state the pipeline handles rather
  than a gap: it is what `--check` runs against on every push until then.
- 51 cases in `tools/test-build-manifest.mjs`, covering the walk, the manifest
  shape and its determinism, payload detection, all nine check rules, the
  command line, the repository's own tree, and the workflow wiring. The last of
  those is the easiest thing to lose: a job can be added, pass on every push,
  and gate nothing at all, because nothing downstream needs it.

### Changed

- `README.md` gained a **The Catalog** paragraph, naming the convention, the
  two commands and when to regenerate.
- **Raster Export and Example Images** in `TODO.md` now records where a render
  goes, which is the question the `--check` item asked it. The render is named
  as expected output rather than written outside the folder, and `<name>` is
  `sheet` for a cheatsheet folder, which is what `.claude/constants.md` already
  expects of `<category>/<cheatsheet>/sheet.webp`.

## [2026.09.22]

### Fixed

- **`--report` prints at the scale its own figures were read at, and says so.**
  The flag documented itself as printing "the comparison at any scale" while
  `run()` called `reportShares` with no scale at all, so it only ever printed
  the 0.25 default - which put the heading grey 0.09 points off the census and
  the comment grey 0.06, against the "within 0.03 points" the same file's header
  and the `2026.09.21` entry below both record. Neither set of numbers was
  wrong: 0.03 is the full size reading and the drift a quarter-size raster adds
  is the antialiasing of its own downsample. What was wrong is that the only
  command a reader had printed the other one, unlabelled, and the two read as a
  three-fold drift in the asset. There is now a `--scale` flag reaching the
  argument `reportShares` always took, it defaults to full size, and the report
  heading carries the scale beside the pixel size so two readings cannot be
  compared at cross purposes.
- **A theme's census follows the theme's palette.** `CENSUS` was a field on
  `SHEET_LANGUAGE`, and a theme is a spread copy of that object with `colors`
  and `syntax` replaced - so `emberTheme.census` named four colours the ember
  theme never draws, while the object declared itself `typeof SHEET_LANGUAGE`.
  Nothing read it yet, which is the only reason nothing had failed; the first
  consumer to compose an asset for a themed category would have got the sheets'
  palette back and no way to tell, because a palette measured off the wrong
  asset still looks measured.

  The two halves are now separated by what they are evidence of.
  `CENSUS_SHARES` holds the six shares, which were counted off this artwork and
  cannot be re-counted for a palette nobody has drawn. `censusFor(language)`
  pairs them with the hexes of whatever language it is handed, so a theme's
  census is the recorded proportions in the theme's own colors - the only
  reading of it that invents no figure. `CENSUS` is what that returns for the
  eleven sheets, and it is no longer a field on `SHEET_LANGUAGE`, so the spread
  that caused this cannot happen again.
- **`NOTICE` credits a port note to a file that now carries one.** The
  `ai-helper/graphic-designer/` paragraph said the four files under
  `skills/design-language/scripts/` each name their upstream file and record
  what changed on the way in. Three did. The fourth, `template.md`, is a
  fill-in procedure rather than a script - and the port had changed a path in
  it exactly as in the other three, rewriting its import block to reach
  `api/graphic-design/` because there is no package here to import. So it
  needed the line rather than an exemption from it, and it now carries the same
  upstream-and-commit note. `NOTICE` names the directory it is counting instead
  of a bare figure, since that file is what scopes the CC0 waiver and its
  claims should be checkable against the tree.

### Changed

- `composeLanguageAsset` takes a `language`, defaulting to `SHEET_LANGUAGE`,
  and reads every figure off it rather than off module imports. Composing the
  asset for a theme was the case the census fix was found in, and half of it -
  regions themed, panel ink not - would have been worse than none. It returns
  the census it composed against, so `measureShares` and `reportShares` can be
  handed the same one instead of reaching for the module.
- `DESIGN_LANGUAGE.md` and `examples/README.md` record where a census belongs
  and why it is the one table `SHEET_LANGUAGE` does not carry.

## [2026.09.21]

### Added

- `ai-helper/graphic-designer/`, the design language helper ported from the
  sibling `napkin-sketch` repository at the same commit the drawing surface came
  from: two skills, a command, a contract file and four scripts. It reads one
  finished graphic into a written design language and generates a per-asset
  skill that can draw more work in it. With this the port of that repository's
  graphic design work is complete - the surface draws, and this is the half that
  decides what to draw.
  - **The API is resolved by path rather than by package name.** Upstream
    imported `napkin-sketch` and fell back to a clone's `dist/`, and this
    repository is neither: it has no `package.json` and the surface is source
    rather than build output. Both scripts that resolved it now walk up from
    their own folder for `api/graphic-design/index.mjs`, which is what lets the
    copy of `brand-resources.mjs` inside a generated skill, four folders deeper,
    reach the same barrel. `CHEATSHEET_GRAPHIC_DESIGN_API` names it outright for
    a skill generated outside the tree.
  - **A loader that finds nothing says so**, and that is the load bearing half
    rather than a nicety. Every other failure in the brand path degrades on
    purpose: an asset that does not resolve leaves a slot, and a slot with
    nothing behind it is filled with a mark drawn in the design language rather
    than left as a hole. So an unresolved API would have produced the same
    finished looking page with nothing anywhere saying the API was never loaded.
    `brand-resources.mjs` throws, and every `analyze-media.mjs` report carries
    the reason in `notes`.
  - **The brand comes from the constants file**, through the bridge that landed
    on 09.20. `.claude/references/` is searched ahead of the tracked
    `references/` upstream knew about, so the generated `resources.md` resolves
    with no environment variable set, and a registration written into that
    folder resolves its own relative paths against the repository rather than
    against `.claude/`.
  - **The installer did not come across.** It writes into a dot folder of its
    own repository, and the plugin manifest names a marketplace this repository
    is not part of. The command and the contract file are addressed by path
    instead, which is what the two `${CLAUDE_PLUGIN_ROOT}` paths became.
- `tools/compose-language-asset.mjs`, which composes a temporary SVG out of the
  recorded design language so a category with no artwork has something to
  measure one from. The helper refuses to invent a value an asset did not give
  it, and the answer to a category that has not been drawn is to compose the
  asset the record already describes rather than to relax the refusal. The
  per-category language is then a derivation of the global record.
  - It reproduces the recorded **proportions**, not only the recorded colors,
    because a role is decided from area. The regions alone put navy at 63.2% and
    white at 30.9%; the census puts them at 60.97% and 28.96%, and the
    difference is the type drawn on top. The three colors the census quantifies
    as ink and nothing else are drawn at exactly the area it gives them, and
    land within 0.03 points of it.
  - What it does not draw, it says. The wordmark is "in white and green", plain
    code is white and the follow line is navy, and the census splits none of the
    three from the grounds they share a color with - so each is carried as a
    type record and no ink, and navy lands 1.27 points high as a result.
    `--report` prints the whole comparison. No role moves.
  - The type is carried as `text` elements with no fill, which is the only way
    one file holds both halves: an element is a letterform or an area and not
    both. Without them the analyzer measures no sizes and the generator invents
    a type scale, which is the failure the asset exists to prevent.
  - It writes to `.tmp/`. It is an input to a measurement rather than an
    artifact, and a committed copy would be a second record of figures
    `DESIGN_LANGUAGE.md` already holds.
- `CENSUS` in `api/cheatsheet/language.mjs`: the color census of the eleven
  sheets in the form code reads, with the document's own table checked against
  it so the two cannot drift.
- `tools/test-design-language-helper.mjs` and `tools/test-language-asset.mjs`,
  30 cases between them. The suite is 287, from 257. The two end-to-end cases
  generate their skill from `tools/fixtures/shapes.svg` rather than from a brand
  asset, because the brand assets are in `.claude/` and a clone has none - the
  same reason `tools/test-brand-bridge.mjs` skips its own constants cases, and
  the fixture is pinned never to change, so the cases run everywhere instead of
  passing on one machine.

### Fixed

- `analyze-media.mjs` read a `font-family` attribute and a `font-family`
  declaration with one pattern, and the two end differently - an attribute at
  its closing quote, a declaration at the `;` after it. A family with a space
  in its name is quoted in the CSS and therefore escaped in the markup, and
  `&quot;` carries a semicolon of its own, so the pattern stopped four
  characters in and the family was reported as `&quot`. That is not a name
  anything resolves, and it reached the design language as though it had been
  measured. The two forms are now two branches and the attribute is decoded.
  It is upstream's defect rather than the port's: every design tool that exports
  a spaced family name hits it.

### Changed

- `NOTICE` and `README.md` scope a second directory out of the CC0 waiver.
  `ai-helper/graphic-designer/` is copied source under MIT, like
  `api/graphic-design/` beside it, and the README now says where both came from
  and links the repository they came from.
- **The colors the sheets are drawn in** in `DESIGN_LANGUAGE.md` records that
  the census is what the composed asset reproduces, and why an area table is the
  one a role has to be read from.

## [2026.09.20]

### Added

- `api/graphic-design/API.md`, the reference a caller of the ported drawing
  surface reads: every export grouped by module, and every limit stated as the
  behaviour it actually is rather than as a note in a header. The record is held
  honest rather than reviewed - `tools/test-graphic-design-port.mjs` now fails
  on an export with no entry, on an entry naming a call the port does not have,
  and on a stated limit the port does not enforce, and it provokes the two
  refusals it quotes rather than reading them.
- **Composing a sheet** in `DESIGN_LANGUAGE.md`, the composition algorithm's own
  record: the three figures a seed moves and why those are the three the artwork
  left free, the order the choices are made in, the three floors with the
  derivation of each, what a floor does instead of clamping, the fitting rule,
  and the contrast pass. Four cases in
  `tools/test-composition-algorithm.mjs` read its tables against
  `api/cheatsheet/language.mjs`, including the worked example of the padding
  ceiling, so a figure edited in one record and not the other fails rather than
  drifts.
- `examples/`, the worked pair: one document, composed through the recorded
  design language and then through a second theme, with a README that is a
  transcript of a real run.
  - The pair exists to show that the two axes are independent, and it measures
    that rather than stating it. A theme moves every paint and not one
    coordinate; a seed moves geometry and no paint. The restyle script composes
    both and compares, and `tools/test-worked-examples.mjs` holds both
    directions.
  - A theme is a modified copy of `SHEET_LANGUAGE` passed as
    `options.language`, so there is no theme format to learn. It is a re-tint
    and not an inversion: the colour roles each carry two jobs - the dark ground
    is also the dark ink - so swapping them would put dark type on a dark
    ground.
  - The second theme's accent is deliberately placed where the recorded green
    sits, under the text floor on white with a darker substitute nominated. An
    accent that passed everywhere would leave `readableInk` inert under the
    theme, and the example would be demonstrating a check that never fires.
- `tools/build-brand-resources.mjs`, the bridge from the brand a repository
  declares in its constants file to the `resources.md` the design language
  helper reads. All three faults the item named are handled, and each is
  demonstrated in `tools/test-brand-bridge.mjs` against a fixture rather than
  against the real declaration, which is ignored and absent from a clone.
  - The misspelled heading is matched within an edit distance of two rather than
    corrected: a constants file belongs to the user and is never edited by a
    run.
  - The asset folder is declared rather than the files, so a file's own name is
    the slot. A footer declared under a key that normalizes to `footerImg` -
    which no composition asks for - resolves to `footer` because `footer.png` is
    what is in the folder.
  - Only the brand section's lines are read. That matters most for one stray
    key: `- Media: self`, under an unrelated section, is a directory key, so a
    parser handed the whole file declares an assets folder named `self`.
  - It writes to `.claude/references/`, which is ignored, rather than the
    tracked `references/` the helper defaults to, and prints the
    `NAPKIN_BRAND_RESOURCES` assignment that points the helper at it.
- `tools/test-suite-invocation.mjs`, which settles how the suite runs and holds
  the naming that decision depends on: every file importing `node:test` is named
  so Node's own discovery finds it, and nothing that is not a test is named so
  it does.

### Changed

- **The suite is run with a bare `node --test` from the repository root**, no
  path and no glob. That is what settles the invocation for tests outside
  `tools/`, which was the item's subject: Node walks the tree from the working
  directory, so a test written beside the module it covers is found without the
  command changing.
  - Both forms it replaces were wrong. `node --test tools/` resolves the folder
    as a CommonJS module and exits with `Cannot find module` before a case runs.
  - The glob form was the worse of the two, and not for the reason on record.
    The shell hands Node every `.mjs` in the folder and Node runs each as a test
    file, so it ran `tools/measure-font-widths.mjs` - which drives Chromium and
    exits non-zero without Playwright. Under `--test` that is a failing test, so
    the documented invocation failed on exactly the bare clone
    `tools/test-page-structure-browser.mjs` settled the suite had to run on. It
    also ran `tools/measure-sheet-composition.mjs`, decoding all eleven JPEGs
    and printing its report as one more passing "test".
  - Measured with Playwright hidden: 257 cases, 229 passed, 28 skipped with the
    install command as their reason, none failed.
- `PATH_TOKEN` in `api/graphic-design/geometry.mjs` matches `A` and `a`, which
  is the third local change to a ported module, after the paint refusal in
  `svg.mjs` on 2026.09.16 and the face in `font.mjs` on 2026.09.17. Writing the
  API reference turned up that the arc limit was documented and not carried:
  upstream's tokenizer does not list the arc among its command letters, so an
  `A` matched neither alternative, was skipped by the scan entirely, and its
  seven parameters were read as coordinates of the command before it. The
  `default:` branch whose whole job is to raise on an arc was unreachable for
  the one command it was written for.
  - What that produced was not an error. `M 0 0 A 5 5 0 0 1 10 10 A 5 5 0 0 1
    20 0` parsed clean into an eight point polyline of nonsense, because
    fourteen leftover numbers divide evenly into pairs. A path whose leftovers
    were odd raised `malformed path data` instead, naming the whole string
    rather than the command. Whether an unsupported arc was reported came down
    to arithmetic.
  - It is the same decision `svg.mjs` already records for paints, and the
    reference now states both as one: this port refuses at the call rather than
    handing a renderer something it will draw wrongly with no error attached.
- The case asserting that limit used to assert the accidental behaviour, and
  passing was the proof. It read the arc as "refused by the reader rather than
  by a branch that names it", on the reasoning that the leftover numbers "run
  out" - which they do for one arc and do not for two. It now asserts the stated
  limit, from both the reader and a composition, and checks that the message
  names the command rather than the string.
- `README.md` records how to run the suite and points at the API reference, the
  design language and the worked examples. It is 37 lines, still well under the
  over-long threshold.

### Fixed

- A committed assertion in `tools/test-graphic-design-port.mjs` that could not
  fail. The pattern refusing `imageDataUrl` and `mediaTypeOf` in `files.mjs` was
  built from a plain template literal, and `\s` is not an escape JavaScript
  knows, so the backslashes were dropped and `\b` became a backspace character:
  the regex read `exports+(asyncs+)?functions+imageDataUrl<BS>`, which matches
  nothing, so the case passed whatever that file held. Rebuilt with
  `String.raw`.
- The drawing example in `api/graphic-design/API.md` set a run of text taken
  from the brand declared in the ignored constants file. A reference is public
  and a declaration is not, so the example now sets placeholder text instead.

## [2026.09.19]

### Added

- Floors on what a seeded variation may do, as `FLOORS` in
  `api/cheatsheet/language.mjs` and the enforcement of them in `compose.mjs`.
  Each of the three is derived from something already measured rather than
  chosen: a display cap of one step, a code cap of the minimum measured line
  spacing at the cap share, and a panel fill of 0.85, which is the least filled
  code panel of the eleven sheets.
  - The fill floor narrows the spacing the seed may draw from, and the margin as
    well. The padding is chosen before the spacing, and at the measured maximum
    of 152 px the block can occupy at most 0.849 of the panel before a line is
    placed, so a seed drawing it would be one no spacing could rescue.
  - A floor that no spacing can reach - a document with too few rows - leaves
    the measured range intact rather than collapsing it onto its own maximum,
    which would have made every seed compose the same sheet with the panel still
    empty. It is reported through `fillsPanel` instead.
  - A floor is never a clamp. A run that still does not fit at the floor is left
    at the floor and reported through `runsFit` or `codeFits`, because pushing it
    back up would put ink outside the region it was fitted to.
  - And a floor never outranks the room actually available, which is the reading
    a crowded document turns on. Past about 31 rows the spacing the panel has
    room for is already below the measured minimum, so a floor applied as "at
    least the minimum" would hand the seed an inverted range and set the block at
    the one spacing that certainly does not fit; one step later the cap such a
    spacing yields is already under `codeCap`, so the same reading would step the
    cap *up* past its own line spacing and overlap every line. The eleven run 18
    to 36 rows, so both are inside the record. A floor stops a descent and never
    starts an ascent.
- `api/cheatsheet/contrast.mjs`, which measures a composed sheet's pairings
  rather than trusting the table that recorded them. Every run is checked against
  the ground it was placed on, all of them are reported and not only the
  failures, and the one substitution the design language nominated - the sheets'
  green becoming `#2E7534` where it has to be read on a light ground - is applied
  rather than merely written down.
- `api/graphic-design/files.mjs`, the port's Node only half, holding
  `writeComposition` alone. Upstream's `imageDataUrl` and `mediaTypeOf` serve
  placed bitmaps and the design language allows none, so neither came across. It
  is deliberately not re-exported from the barrel: a browser handed `node:fs`
  fails at load rather than at the call, so exporting it would break every page
  importing the barrel whether or not it ever wrote a file.
- `api/cheatsheet/raster.mjs`, which turns a composed sheet into pixels by one of
  two routes, with the route, the scale, the background and the format all taken
  from the call.
  - The routes are not two implementations of one thing. The ported `toPNG()`
    has no font file and strokes a built-in single stroke alphabet, so it is a
    shape level regression target; a real engine draws in the face the design
    language measured. `publishable` on the result is the single field that says
    which was used, and it is never true for the built-in route.
  - The scale floor is `2 / DISPLAY_SCALE`, near a third, rather than the 2 the
    roadmap names. That figure is device pixels per *display* pixel and `scale`
    counts composition pixels, of which there are six per display pixel, so
    reading it straight would have made every published sheet a 7200 px square.
  - PNG, JPEG and WebP. GIF and TIFF are refused with a message rather than
    silently substituted, because a caller who writes `sheet.gif` and receives a
    PNG has a file that lies about itself.
- `tools/fixtures/` and `tools/test-render-fixture.mjs`, which pin the render
  against committed output. A synthetic document exercising every element kind,
  a clip and a matrix is committed in both formats in full; a real sheet at a
  named seed has its SVG and its variation report committed in full and its
  930 KB raster committed as a digest. Rendering twice in one process is checked
  beside them and is the weaker half - both renders come from the same loaded
  module, so only a file on disk catches a renderer that changed.
  `MCP_FIXTURE_UPDATE=1` rewrites the expectations once the new output has been
  read.
- `tools/test-sheet-raster.mjs`, 15 cases over the two routes. The
  dependency free half runs anywhere; the browser half resolves Chromium at run
  time and skips with the install command as its reason where it is absent.
- 35 cases in `tools/test-composition-algorithm.mjs` and
  `tools/test-graphic-design-port.mjs` covering the floors, the contrast check,
  the Node only boundary from both sides, and the constraint that a sheet's text
  reaches the SVG as characters rather than as outlined paths.
  `node --test tools/*.mjs` now reports 218 against 171 before. The crowded end
  of the record has its own case: the floor sweep composes a 19 row document, and
  both floor inversions above only open past 31 rows.

### Changed

- The suite's canonical cheatsheet document is 19 rows rather than 9. The eleven
  sheets run 18 to 36 rows counting the blanks between statements, so a nine line
  example was sparser than anything in the repository and measured the algorithm
  against a sheet the design language does not contain.
- `DESIGN_LANGUAGE.md` now names the ground beside the substitute green's
  contrast ratio. The same colour was recorded at 5.33:1 under **The one
  substitution**, against the site's off white `#F8F8F9`, and that figure had
  been carried into a sentence about the sheets' pure white, where the true ratio
  is 5.66:1. Both numbers were right and the pair read as a contradiction.

## [2026.09.17]

### Added

- `api/cheatsheet/`, this repository's own layer over the ported drawing
  surface, as five dependency free `.mjs` files the page can import with no
  build step. The dependency runs one way only - it imports
  `api/graphic-design/` and nothing there imports it - so the port is still
  diffable against upstream.
  - `faces.mjs` carries the width table a generated sheet is measured in, the
    four cap heights the artwork was set at, and the conversion from a cap
    height to a font size.
  - `language.mjs` carries `DESIGN_LANGUAGE.md` in the form the algorithm
    reads: the five bands, the three divisions, the token set, the colors and
    the syntax palette, the flanking rules, the mark square, the measured
    baseline of every fixed run, and the three figures the code panel is free
    within.
  - `variation.mjs` holds the seeded source every choice is drawn from -
    SplitMix32, a string-to-seed hash, and a recorder that keeps what was
    chosen.
  - `compose.mjs` is the composition algorithm: a cheatsheet document and the
    language in, a composition variation out.
- `tools/measure-font-widths.mjs`, which drives Chromium over a canvas 2D
  context and reads a font stack's advance widths at 1000 units per em. It is
  run once and its output committed, not called at composition time: the page
  composes in a browser with no Node in reach, and a sheet has to measure
  identically on a machine with no browser at all. It skips with the install
  command as its reason where Playwright is absent, which is the pattern
  `tools/test-page-structure-browser.mjs` settled.
- `tools/test-sheet-faces.mjs`, `tools/test-composition-algorithm.mjs` and
  `tools/test-sheet-faces-browser.mjs`, 53 cases between them. The last of the
  three resolves a browser at run time and skips with the install command as
  its reason where Playwright is absent. `node --test tools/*.mjs` now reports
  171 against 117 before, counting as that command does - the figure includes
  one entry per file for `tools/measure-font-widths.mjs` and
  `tools/measure-sheet-composition.mjs`, which carry no cases of their own.
- **What a generated sheet is measured in** in `DESIGN_LANGUAGE.md`, recording
  the font route and the figures that settled it.

### Changed

- **The ported `font.mjs` now measures in the face that will draw the text,
  rather than in its own built-in alphabet.** Every measuring and layout
  function takes an optional face; omitting one reproduces the built-in
  behaviour exactly, which is asserted at six sizes across `measureText`,
  `fontMetrics`, `charWidth`, `layoutText` and `lineStrokes` rather than
  assumed. `BUILTIN_FACE` is the built-in alphabet described in that form, with
  its advances derived from the glyph table rather than restated beside it.

  The gap this closes is not marginal. The lead-in is the one run of artwork
  whose text is known, at 1481 px wide and a 112 px cap, and the built-in
  alphabet predicts **2403 px** for it - 62% too wide, so a second run laid out
  after the first would begin most of its own width past where it belongs.

  Of the two routes open, the committed width table was taken over letting the
  browser break an unmeasured block. The tables in `DESIGN_LANGUAGE.md` ask for
  extents a browser cannot be asked for in advance - a title 2595 px wide
  centred within 2 px of the canvas axis, flanking rules placed against that
  width - and the dependency free raster route has no browser whose breaks it
  could follow. Three measurements make one committed table defensible rather
  than machine-local: `Arial`, `Helvetica` and `Liberation Sans` disagree with
  the resolved stack by **0 units on all 95 characters**; summing per character
  equals the engine's own measurement of a whole string to **0.000%**, so none
  of them kerns; and the artwork's face is condensed to **0.684** of the stack,
  which is the same finding **The faces are not named** reached from the other
  side. Checked end to end, a composed sheet rendered in Chromium draws its
  runs within **0.29%** of what the table predicted.
- The rasterizer reads the face too, which is what keeps the two back ends one
  composition. It still draws the built-in glyph shapes - they are the only
  ones it has - but it advances the pen by the face's widths and scales each
  glyph so its cap matches the face's. So the SVG and the PNG break lines in
  the same places and put every line at the same coordinates, and the only
  thing the format changes is the shape of the letters. The cost is in
  letterfit rather than in layout.
- The SVG writer asks the browser for the family the face was measured from
  when a text element names none, so a run cannot be measured in one face and
  drawn in another.
- `TextStyle` in `types.mjs` carries `face`, and the barrel exports
  `BUILTIN_FACE`.

### Fixed

- **A long example could place its last line below the code panel while the
  composition reported that it fitted.** The spacing a seed may choose was
  sized by dividing the padded panel height by the number of gaps between
  lines, which reserves nothing for the cap height the block reaches above its
  first baseline or the descender it reaches below its last - neither of which
  is a gap. An eighteen line example at seed 2073 put its last baseline 21 px
  below the panel and its ink 43 px below, over the green divider, with
  `codeFits` true and no note. The two fractions are now taken out of the
  height before the spacing is drawn, so every composition that reports a fit
  keeps the whole block inside the panel with the top padding clear at both
  ends. The cap's share of the spacing is one named constant rather than the
  same literal in two places.
- **A code line whose role named an inherited property was painted with a
  function rather than falling back to plain.** `syntax` is an object literal,
  so a role of `constructor`, `toString` or `hasOwnProperty` answered from
  `Object.prototype` and the `?? plain` fallback never fired; the paint reached
  the renderer as a function and `toSVG()` raised `unsupported color "function
  toString() { [native code] }"`. The lookup reads own properties only, which
  is the guard `glyph` and `roleStyle` already carry.

### Known

- **A short example leaves a void in the code panel, and the composition
  reports it rather than closing it.** The eleven sheets all fill their panel
  because every one of them carries enough code to; a four line example at the
  measured maximum spacing fills under half of it. Closing the gap means either
  centring the block or letting the panel shrink, and both are decisions for
  **Constrain every variation to the extracted margins, spacing and contrast
  floors**, which is the item that settles what a variation may not do. Until
  then `variation.panelFill` says what fraction of the panel the example
  occupies.
- **The artwork's wordmark sits 208.5 px left of the canvas axis and a composed
  sheet centres its own.** A second masthead element sits to the wordmark's
  right on all eleven and the pair is what is centred; a document has no way to
  declare that element yet. Reproducing the offset without the thing that
  balances it would put a lone run visibly off centre and call it fidelity.

## [2026.09.16]

### Added

- `NOTICE` at the repository root, carrying the MIT copyright line and the
  permission text in full for `api/graphic-design/`. The per-module headers
  that landed with the port record a source file and a commit, which is
  provenance rather than a licence: MIT asks for the copyright and permission
  text in "all copies or substantial portions", and 5,899 lines is a
  substantial portion. The notice also scopes the CC0 `LICENSE` off that one
  directory, so the file governing the tree no longer waives rights over code
  held under different terms. `LICENSE` itself is untouched and still reads as
  verbatim CC0; `README.md` gains a licence section pointing at both.
- `validatePaints(doc)`, exported from the barrel and run by
  `compositionToSvg` before it writes any markup. It walks a document's page
  background and every element's fill and stroke, groups included, and raises
  the rasterizer's own error on the first paint no renderer can read.

### Changed

- The SVG back end now refuses a colour it cannot read, which upstream does
  not. Upstream passes the string through to the markup on the reasoning that
  a browser is the better parser, and catches a misspelling in the rasterizer,
  where a name has to become numbers. That holds when a PNG is the deliverable
  and fails here: the page composes its sheet as inline SVG, so the rasterizer
  never runs and a misspelled token was a black region with no error anywhere.
  `compositionToSvg(doc, { validate: false })` restores the upstream behaviour,
  which is what keeps the port diffable against the source it came from. Valid
  documents render to identical bytes either way, and the differential harness
  against the bundled upstream TypeScript still reports all 131 surfaces
  identical.
- `tools/test-graphic-design-port.mjs` no longer asserts that
  `api/graphic-design/` holds exactly the twelve names on disk today. That
  exact match would have turned the suite red on the run that adds
  `files.mjs` - the Node only half, queued under **Port the napkin-sketch
  Graphic Design API** and named in the test's own comment - over a collision
  with nothing to do with what that run changed. What the exact match was
  buying is asserted on its own and stays: `canvas` is refused, a
  `package.json` and build output are refused, and the import and Node checks
  read the module list rather than the folder. What is left is that every
  module asked for is present and every extra file is an ES module the page
  could parse, which still refuses a stray `LICENSE` or `README` in there.

### Fixed

- The case titled "an unrecognised colour fails where the swatch is written"
  asserted only that `parseColor` raises in isolation, which was not what its
  name claimed and not what happened in a composition. It now renders through
  both back ends and holds the claim across a fill, a stroke, a group and the
  page background, alongside new cases proving the five paints that mean "do
  not paint" are not mistaken for typos and that the upstream pass-through is
  still reachable.

## [2026.09.15]

### Added

- `api/graphic-design/`, a hand port of the drawing surface this roadmap was
  about to write from nothing. Eleven modules and a barrel over them:
  `units`, `types`, `color`, `geometry`, `font`, `svg`, `compose`, `deflate`,
  `png`, `raster` and `brand`, 5,899 lines of dependency free `.mjs` from the
  5,041 lines of TypeScript they came from. It composes rectangles, circles,
  ellipses, triangles, polygons, polylines, lines, paths, text, placed media
  and clipping masks into one document, and renders that document to SVG or to
  PNG with no canvas, no browser and no native image dependency. A top level
  `api/` rather than `tools/`, because the page imports this at run time and
  everything in `tools/` is a Node only script the published site never loads.
  No build step and no `package.json`, so the local `php -S localhost:8000`
  workflow keeps working without Node.
- The port is verified against its source rather than against its author's
  reading of it. Bundling `src/core/graphic-design/index.ts` with the sibling
  repository's own esbuild gives a module with the same surface, and a
  throwaway comparison over 131 cases - every colour form, every path command,
  every cap and join, four alignments against four baselines, the whole brand
  resource surface, PNG in both directions, and a document carrying an image,
  a clip, an `evenodd` path, a millimetre page and a hidden element - found no
  difference in any of them. The two SVG documents are identical strings and
  the two PNG files are identical bytes, 37,450 of them.
- `tools/test-graphic-design-port.mjs`, 14 cases holding what porting cost
  rather than what upstream already settled: nothing in the port imports
  outside its own folder, nothing reaches for Node, every sibling import names
  a file that exists and carries its extension, there is no `package.json` and
  no build output, `canvas` is absent, the barrel exports the authoring
  surface and the four brand functions `.claude/constants.md` is written
  against, the units reduction kept `toPx`, a composition renders live `<text>`
  rather than outlines, a render decodes back at the scale it was asked for,
  an elliptical arc raises, an unknown colour raises, and every module carries
  the upstream MIT notice and the commit it was taken from.
- `tools/test-pages-media-type.mjs`, which asks the published site what it
  serves a `.mjs` file as. It needs the network, so it is the one case in the
  suite that skips with its reason rather than failing when there is none.

### Changed

- The `.mjs` extension is now a measurement rather than an assumption.
  GitHub Pages answers `tools/test-contrast.mjs` and
  `tools/measure-sheet-composition.mjs` on this repository's own published site
  with `200` and `content-type: text/javascript; charset=utf-8`, which is a
  JavaScript MIME type under the HTML specification, so a module script and a
  bare `import` both accept it. The fallback that was queued behind this - name
  every ported file `.js` and add `api/package.json` holding only
  `{"type": "module"}` - is not needed, which is what makes the port's
  thousands of lines safe to land under the extension they were written with.
  Measuring it first was the point: the same answer found afterwards would
  have been a rename of the whole tree.

## [2026.09.14]

### Fixed

- The page has a face of its own. The stylesheet set a size and a line height
  on `body` and no family at all, so every run of text on it - the title, the
  instructions, the labels, the footnote, and both `<select>` controls through
  `font: inherit` - fell to the browser default and rendered in Times New
  Roman, beside artwork set throughout in a grotesque. A `--font` token now
  sits in `:root` with the palette and the step, and `body` takes it. It is a
  stack rather than a family so nothing has to ship: `"Helvetica Neue"`, then
  `Arial`, then `system-ui`, then the generic. Measured in a real engine, the
  page renders 241.92px of the same sample string that Times New Roman sets at
  217.28px, which is Arial to the pixel on the machine this was checked on.
- The framed sheet meets the right edge of its own column again. `div.col img`
  is capped at 600px and left aligned while its column takes whatever width the
  row has left, so from 1025px up the sheet stopped as much as 176px short of
  its column and the composition sat off centre - worst at exactly the 1200px
  `body { max-width }` then carried. The page is capped at 1024px instead,
  which is the row's own measure rather than a round number: 360 for the panel,
  a 32px gap and 600 for the sheet is 992, and a `space-2` gutter each side
  makes 1024, or 128 whole 8px steps. Measured at 1280, 1200, 1100, 1025, 1024,
  900 and 769px, the gap is 0 at every one. The 1px frame the 2026.09.13 run
  added is what made the asymmetry legible rather than what caused it, and it
  stays.

### Added

- `tools/test-contrast.mjs` holds the type the way it already holds the color.
  Three cases: `body` takes `font-family` from `--font` rather than from the
  browser, the stack resolves without anything installed - more than one
  family, `system-ui` among them, a generic last - and the stack in the
  stylesheet is the stack `DESIGN_LANGUAGE.md` records. The omission it
  replaces was invisible in the source, because a family that is never
  declared leaves no wrong value to read.
- The width scan in `tools/test-page-structure-browser.mjs` measures how far
  the sheet stops short of its column, not only whether it is inside it. The
  two are different questions and the old one passed throughout the 176px:
  containment held at every width while the empty ground sat beside the frame.
  Across 1280px down to 769px the trailing gap has to stay within one
  `space-4`. Reverted to the old 1200px cap it catches 224 of those 512 widths,
  every one from 1057px to 1280px.

### Changed

- `DESIGN_LANGUAGE.md` records the page's face under **The page's face**,
  stated as a decision about the page and explicitly not as an identification
  of the sheets'. **The faces are not named** gains a pointer to it, because
  the two read as contradicting each other otherwise: declining to name the
  artwork's display face is a finding, and leaving the page with whatever face
  the browser preferred was an omission, and one silence was carrying both.
  The maximum content width in **Spacing and radius** and **Layout** is 1024px,
  with the arithmetic that arrives at it.

## [2026.09.13]

### Added

- `index.html` is drawn in the design language rather than in the browser
  defaults. The stylesheet declares the palette, the type scale, the 8px step
  and the 4px radius from `DESIGN_LANGUAGE.md` as custom properties and uses
  them throughout, and a `prefers-color-scheme: dark` block restates the four
  that change so the page reads on a dark ground as well as a light one. The
  8px step is the one thing the page and the sheets it displays already had in
  common - the sheets' five vertical bands land on it and close exactly at the
  display width - so the page's spacing now shares a rhythm with the artwork
  inside it rather than keeping one of its own.
- The image announces the example that was selected. It carried the generic
  `cheat sheet image` on every selection, which told a screen reader nothing
  about which of the eleven sheets was on screen; `selectExample()` now writes
  the chosen option's own label - `Sorting Arrays cheat sheet` - and the markup
  ships an empty alt, because on a fresh load no example is selected and there
  is nothing to name. The label is read off the option rather than taken from
  its value: the two are not the same string on every option, and the value
  exists to spell a file name rather than to be read out.
- `tools/test-contrast.mjs` measures every text and background pair the page
  renders, in both themes, against 4.5:1 for normal text and 3:1 for large text
  and for a boundary a reader has to see the edge of. Twenty four pairings, all
  clearing their floor. It restates no color: the tokens are read out of the
  stylesheet's own custom properties, each pair names the rule that declares
  it, and a separate check refuses any hex in the stylesheet that appears in no
  table in `DESIGN_LANGUAGE.md`, so a token edited to a failing value, a rule
  that stops using the token it claims, and an invented color all fail.
- `tools/test-page-structure-browser.mjs` drives a real engine over the layout,
  which is the decision the roadmap item asked for and the reasoning is in the
  file's header. It asserts both column tops equal at 1280px with the image
  starting 32px past the panel column; exactly one change of shape between
  1280px and 360px, at 768px to 767px, with the image inside its column and no
  sideways scroll at all 921 widths; `scrollWidth` equal to `clientWidth` at
  390px; and the tools panel travelling the full 200px of a scroll rather than
  holding its distance from the top. It also settles the two states the
  2026.09.07 verification could only reach in a browser: `#showFootNote`
  computing to `display: block` on the first selection of a freshly loaded
  page, and `favicon.ico` decoding 48x48 square with the mark's navy at 36.89%
  of its pixels, its green at 30.60% and its white at 12.72%.

### Changed

- The cheatsheet image is framed in the border color. Its masthead is the
  mark's own navy and its body is near white, so against the new dark ground
  the top band merges into the page and against the light one the sides do,
  and either way a reader cannot see where the artwork stops. The frame is the
  same 1px the instructions panel carries, which is what makes the two columns
  read as one system.
- The three `<br>` elements that spaced the page did so by line height, which
  lands on no step. The stylesheet carries that spacing now, in multiples of 8.
- Padding is inside the width everywhere. Without that, a dropdown given
  `max-width: 100%` and 8px of padding overflows its container by 16px, which
  is a sideways scroll on a phone.
- The panel column takes `min-width: 0`. Its 360px basis is a flex basis, not a
  minimum, and the widest option in the example dropdown can raise the column's
  own minimum above it and wrap the row before the 768px breakpoint has had a
  chance to decide. Measured across every width from 1280 to 360, the row now
  changes shape exactly once.
- The stub DOM in `tools/test-example-selection.mjs` models a real `<select>`,
  with the twelve options read out of `index.html` rather than invented. The
  page reads both halves of the chosen option now, so a stub carrying only a
  value could not exercise the one option whose two halves differ.

### Measured

- `#6F6F8C` reaches **4.05:1** on the navy ground, against 4.57:1 on the off
  white. It is the one token the dark theme does not restate: it clears the
  3:1 boundary floor on both, so one value draws every edge in both themes,
  and it clears the 4.5:1 text floor on neither ground but the light one, so
  on dark it draws no glyphs. Recorded in the dark theme table.

## [2026.09.12]

### Added

- `DESIGN_LANGUAGE.md` records the design language of the eleven cheatsheet
  images under a new **The sheets** part, which is the first time anything in
  the repository has said what they are composed of. It names the six regions
  that stack down the canvas and the three that divide it, with the rows,
  columns, pixel heights and share of canvas each occupies; counts the colors
  over all 142,639,211 pixels of the set and gives each its role; measures the
  four type roles and states which of them are one face; places every run of
  text in the region it falls into; and derives one token set at the site's
  own 8px step.
- `tools/measure-sheet-composition.mjs` produces every figure in that part bar
  the RMSE comparison and the font survey, which record the `magick` commands
  they were read with, so the sheets stay checkable against the artwork the way
  the palette already is against `mark.png`. It decodes each JPEG with ImageMagick, assigns each pixel
  to the nearest of the four fills, and reads the regions, the text lines, the
  type metrics and the color census out of the runs. No dependency beyond
  ImageMagick.
- `tools/test-sheet-composition.mjs` checks the measurements hold across all
  eleven sheets and that the tables in `DESIGN_LANGUAGE.md` are the numbers the
  artwork returns. It parses the region, division and color tables out of the
  document and compares each cell against a fresh measurement, so a table that
  drifts away from the images fails rather than going unnoticed. Two figures
  written into the document were wrong when the checks first ran and are
  corrected below.

### Changed

- The document now describes two artworks rather than one. Its opening said it
  was the design language of the published site; the site and the sheets are
  now stated as two parts measured the same way, and the **Status** note records
  that the sheet tokens are a target rather than something drawn to yet.

### Fixed

- Two figures in the new part were corrected by the checks that were written
  against them. The transition row between the code panel and the divider was
  recorded as always present; it exists on nine of the eleven sheets, and on the
  other two the divider starts where the panel ends. The line-grid control that
  calibrates the monospace test was recorded as landing between 0.007 and 0.023
  on nine sheets; it does so on eight, and stays under 0.1 on ten.
- Five further figures were corrected after the fact, every one of them in a
  table the new checks do not read:
  - The code panel's residual across the canvas is **4.52 display pixels**, not
    4.72. A 64 step token is 512 site px against the 516.52 the division
    measures.
  - The row belonging to no region is row 3216 on six sheets and row 3223 on the
    three whose panel ends seven rows lower, rather than row 3216 on nine of
    them. On those three, row 3216 is inside the code panel.
  - The token table listed the code panel's top padding as a `step` and the
    footer's bottom padding as a `step-2`. Neither is on the step - the first
    runs from 37 to 152 sheet px across the eleven, the second is a step and a
    half - and both are now recorded beneath the table as the exceptions they
    are. The residual figures either side of them were already correct.
  - The RMSE column is the worst across the other nine template sheets, not the
    other ten: `shiftAndUnshift.jpg` returns 0.448 on the lead-in it offsets by
    84px, against the 0.098 recorded.
  - The six largest colors cover 98.74% of the pixels, not of the 8,306 to 9,369
    exact colors the same sentence counts.
- `tools/measure-sheet-composition.mjs` read the canvas size back out of the
  pixel count, so its own square-image guard passed anything whose pixels
  multiply to a square - 512x128 is 256 squared - and measured it as 256x256,
  reporting every row, column and region wrongly. It asks ImageMagick for the
  geometry now. `--json` with no path after it ran the full measurement, wrote
  nothing and reported success; it fails on the missing argument instead.

### Measured

- **The code face is proportional, not monospaced.** Splitting each code line
  into runs of inked columns and measuring how far the gaps between run starts
  sit from whole multiples of one advance, the sheets miss by 0.186 to 0.230 on
  all eleven. The same statistic over the code lines themselves, which do sit on
  one spacing, returns 0.007 to 0.023 on eight of them. A generated sheet that
  assumed a monospace would set its code to a grid the eleven never used.
- **The five vertical bands land on the site's 8px step and close exactly.**
  Snapped to it they are 11, 14, 42, 1 and 7 steps, which is 75 steps of 48
  sheet pixels and exactly 3600. No band sits more than 1.74 display pixels off.
  The three divisions across the canvas do not close: snapping each to its
  nearest step overruns the canvas by a full step, so the recorded grid drops
  the code panel to 64 steps and carries a 4.52 px residual there.
- **The sheets break the site's own contrast rule in one place.** Their green
  reaches 2.80:1 on white, and the footer draws the sigil of the account handle
  in it inside a run of text. `DESIGN_LANGUAGE.md` already forbids the mark's
  green on a light ground for exactly that reason. The sheets are left as they
  are and the rule is restated for generated ones.
- **The display face cannot be named from the artwork, and that was tested.**
  The lead-in reads identically on every sheet at 1481 x 141 px, so it is the
  run to match against. Rendering it in each of the 481 fonts installed here and
  scaling every result to the reference height, seventeen come within 6% of the
  reference width and all seventeen fail on letterform. The face is a bold
  condensed grotesque that is not on this machine. The metrics a renderer
  actually needs are recorded either way.
- **Ten of the eleven sheets share one template to within a pixel**, and four
  template regions come back bit-for-bit identical between two of them.
  `shiftAndUnshift.jpg` pushes everything below its subtitle down by 84px, and
  two sheets end the code panel seven rows lower and absorb it in the divider.
  Nothing inside the code panel repeats at all: its left inset ranges over
  329px across the set.

## [2026.09.11]

### Added

- `tools/test-example-selection.mjs` covers the branch where the image element's
  error handler is still what decides the outcome. The probe answers 200, which
  rules nothing out, so the element is shown before anything has been decoded -
  the state a truncated `.jpg` and the 200 HTML a single page host answers an
  unknown path with both arrive in - and only the element's own `onerror` takes
  the broken icon back down. The case asserts the element is shown, calls the
  handler, and asserts it is hidden.

### Changed

- The unanswered probe case in the same file measures the handler rather than
  the state it starts in. `offerSheetToElement()` already leaves the element
  hidden on that branch, so a `display` check after the handler held whatever
  the handler did: emptying `curCheatSheetImg.onerror` to `function() {}` left
  every case passing. The element is now put up before the handler is called,
  so the assertion fails when the handler stops taking it down. Both cases were
  confirmed against that same emptied handler.
- The stall symptom recorded on 2026.09.10 is corrected in all three places it
  was written. The 2026.09.10 entry below, the `offerSheetToElement()` comment
  in `index.html`, and the unanswered probe case's comment in
  `tools/test-example-selection.mjs` each said the pre-change page left the
  `cheat sheet image` alt text on screen for the length of the stall. It did
  not: a request still in flight gives the element no intrinsic size, so
  `height: auto` resolves to 0, and the element sat shown having decoded
  nothing in a box 600 wide and 0 tall, painting neither alt text nor a broken
  icon. The 600x18 with alt text is the state after that request has finished
  failing, which is the 2026.09.08 measurement. The fix those records describe
  is unaffected and still holds.

## [2026.09.10]

### Fixed

- A cheatsheet image no longer occupies the page while it is still being fetched.
  When the probe went unanswered it set the sheet path and `display: block` in
  the same breath, and the image element's own error handler was the only thing
  that could take it back down - which happens only once that element's request
  has finished failing. A request that stalls rather than fails, on a throttled
  connection or behind a proxy holding it open, never reaches that handler, so
  the element stayed shown having decoded nothing, holding a 600x0 box for as
  long as the stall lasted. The element is now handed the path while left
  hidden, and shows itself from a new `onload` handler once it has decoded a
  sheet. Driving Chromium against a server that drops the probe and stalls the
  image request, the element ends at `display: none` and 0x0 where it had been
  `display: block` at 600x0 with nothing decoded.

### Changed

- The 2026.09.09 entry and the archived **Status Probe 1** item both credited
  the example script with 31 console lines. It logs 17, one for every
  `console.log` call in `javaScriptArrays/SortingArrays.js`, counted from the
  source and matched against the console. 31 was the whole console after a
  second selection: 25 lines from two different examples, 2 `console.clear`
  markers, and the 4 errors Chromium writes when it refuses a `file://` page its
  own probe. Both records now carry the measured figure. Nothing else in the
  entry changes - the behaviour it reports was verified and holds.
- `tools/test-example-selection.mjs` follows the split. `an unanswered probe
  leaves the sheet to the image element` becomes `an unanswered probe hands the
  sheet over without rendering it`, which asserts the element is given the path
  and left hidden, and `the image element shows itself once it has decoded the
  sheet` is added beside it for the load handler.
- `TODO.md` states the probe replacement constraint by branch rather than as one
  rule. A probe that answers a non-2xx hides the image and the footnote
  together; a probe that never answers hides neither, leaving the sheet to the
  element and the footnote to the example script that is fetched separately. The
  single rule it replaced had been contradicted by the tests it cited.
- Every cheatsheet item under **New Cheatsheets** in `TODO.md` now states how
  many sheets its subject becomes, between 1 and 8, scaled to how much the
  subject documents. 66 items carry a count; master cheatsheets, group headings
  and `Propose` items carry none, and the conventions for that section say why.

## [2026.09.09]

### Fixed

- A cheatsheet opened straight from disk shows its sheet again. `selectExample()`
  probes for the image with an `XMLHttpRequest`, and Chromium refuses a `file://`
  page that request under its CORS rules, so the probe's error handler is the
  only one that ever runs there. That handler hid the image and the footnote, on
  the reading that a refused probe meant a missing sheet. It does not: the `img`
  element is not refused the same read and decodes the sheet from disk, and the
  example script loads on its own and logs the console output the footnote points
  at. An unanswered probe now hands the decision to the element and leaves the
  footnote alone. Driving Chromium against the page as a `file://` URL, the sheet
  renders 600x600 from a 3601x3601 image where it had been hidden, and the
  example logs its 17 lines - every `console.log` call in `SortingArrays.js` -
  with the footnote showing.
- A dropped or blocked request over HTTP reaches that same handler, where showing
  the sheet would risk the broken icon the probe exists to prevent. The image
  element now carries its own error handler, which hides it when the browser
  cannot decode what the probe let through. Verified by aborting the image
  request in flight: the element ends hidden at 0x0 with nothing decoded and no
  broken icon, and the footnote stays.

### Changed

- The probe rules a sheet out rather than ruling one in. Only a definite non-2xx
  status hides the image, so a status of `0` no longer needs a branch of its own
  claiming to be the `file://` case, which it never was.
- `tools/test-example-selection.mjs` names its cases after what the browser does.
  `a file:// read reports no status and still counts as found` and `a request
  that fails outright hides the image and the footnote` described one `file://`
  page two contradictory ways, and neither matched it. A case for the image
  element's own failure is added alongside them.
- One helper in the same file slices `selectExample()` out of the page script for
  both source text tests, and throws when either marker is absent. Both tests had
  recomputed the slice themselves, so correcting the misspelled `// SUPORT
  FUNCTION` heading in `index.html` would have made `indexOf` return `-1` and
  `slice(0, -1)` widen them to nearly the whole script, passing while no longer
  reading the function they name.
- The 2026.09.08 entry below is amended where it said a `file://` response
  reaches the load handler carrying a status of `0`. It does not.
- `README.md` records that the page runs from a `file://` URL as well as from a
  local server.

## [2026.09.08]

### Fixed

- A cheatsheet with no image now hides the image on the published site instead
  of showing a broken image icon. `selectExample()` decided a missing sheet by
  comparing the response's reason phrase against `Not Found`. The phrase is
  server chosen and HTTP/2 carries none, so the published site reported an
  empty phrase for every response and the branch never ran; the page then set
  the 404 path as the image `src` and displayed it. The check now reads the
  numeric status. Only an HTTP/1.1 server sends the phrase, which is why the
  local development server never showed the fault.
- Selecting an example on a page opened as a `file://` URL no longer leaves the
  previous sheet on screen. Chromium refuses such a page its own request, so
  neither handler ran and nothing replaced what the previous selection had left
  behind. The request now has an error handler, and a refused request is the one
  case that reaches it. This entry first said a `file://` response instead
  arrives at the load handler carrying a status of `0`. A browser was driven
  against the page on 2026.09.09 and it does not, and what the error handler
  should do about the refusal is settled in that day's entry.

### Changed

- `tools/test-example-selection.mjs` stubs `status` alongside `statusText`, and
  leaves the phrase empty unless a case names one, so its missing image case
  models the HTTP/2 response the published site returns rather than a contract
  only the development server can satisfy. Four cases cover what the stub could
  not reach before: a phraseless 404, a 404 carrying a phrase, a response with
  no status line, and a request that fails outright, which is the one a `file://`
  page gets.
- The two entries archived in `TODO.md` on 2026.09.07 record what was done in
  the one line form the rest of `## Complete` uses. They had kept the `Issue`
  and `Goal` properties they were queued with, which state the defect in the
  present tense and read as though the work is still open.

## [2026.09.07]

### Fixed

- The footnote beneath the columns now appears on the first example selected
  rather than from the second onward. `selectExample()` decided it by reading
  the basename length back off `curCheatSheetImg.src`, which still held the
  previous selection at that point - on a fresh page, the `.jpg` placeholder,
  whose basename is exactly the 4 characters the test needed to exceed. The
  footnote is now set from the selection being made, where the new image
  location is already known.
- `favicon.ico` is a real ICO carrying 16, 32 and 48 pixel square frames. The
  file previously held a PNG payload: browsers decoded it, but the bytes
  disagreed with both the name and the `image/vnd.microsoft.icon` type the
  server sends, and its 417x418 dimensions were neither square nor a standard
  icon size, so every browser rescaled it for the tab.

### Added

- `mark.png`, the 417x418 artwork `favicon.ico` is derived from, kept so the
  palette counts in `DESIGN_LANGUAGE.md` stay checkable against the image they
  were taken over.
- `tools/test-example-selection.mjs`, which runs `index.html`'s own script in a
  stub DOM and covers the footnote across a first selection, a missing image
  and an empty selection.
- `tools/test-favicon.mjs`, which parses the ICO container and checks its
  frames, along with the icon link in the document head.

### Changed

- The icon link in `index.html` declares `type="image/vnd.microsoft.icon"` and
  `sizes="16x16 32x32 48x48"`, replacing the `sizes="any"` that claimed a
  scalable icon the file never was.
- `DESIGN_LANGUAGE.md` names `mark.png` as the sampled source, and a new **The
  icon** section records the crop, filter and frame sizes the icon is built
  with, the filters rejected for moving the sampled colors, and which of the
  filters tried held all three of them exactly.

## [2026.09.06]

### Added

- A viewport meta tag, a `lang="en"` declaration and a `favicon.ico` link in
  the document head of `index.html`, so the page states its language, scales
  to the device it is opened on, and shows the mark the repository already
  carried.
- `tools/test-page-structure.mjs`, dependency free checks over the document
  head and the responsive stylesheet, run with `node --test`.
- Six roadmap sections in `TODO.md`: **Cheatsheet Composition Language**,
  covering the design language to be read out of the existing cheatsheet
  images and the composition, SVG and conversion algorithms drawn from it;
  **Implement Cheatsheet API**; **Dedicated cheatsheet website**; **AI Helper
  API**; **Cliche Tutorial/Documentation Site to Test Cheatsheet API and
  Script**; and **Create New Ideas**, which closes the roadmap with one item
  for each of the other thirteen sections.

### Changed

- The layout in `index.html` reflows. The two columns are a wrapping flex row
  that becomes a single column below 768px, and the image scales with its
  column to a 600px cap. The `position: fixed` tools panel and the
  `margin-left: 500px` offset that pushed the image clear of it are gone, so
  the image no longer sits off screen on a phone.
- `DESIGN_LANGUAGE.md` records the layout as implemented rather than as a
  target, and notes that the palette and type scale are still the target.

### Verified

- The GitHub Pages deployment first published on 2026.09.05. The
  `Deploy GitHub Pages` run for that commit concluded `success`, and the site
  answers at <https://isocialpractice.github.io/cheatsheets/>.

## [2026.09.05]

### Added

- A GitHub Pages deploy workflow at `.github/workflows/pages.yml`, publishing
  the repository root on every push to `main` and on `workflow_dispatch`. It
  carries `contents: read`, `pages: write` and `id-token: write`, a `pages`
  concurrency group so overlapping deploys cannot race, and the configure,
  upload, deploy sequence with the deploy job bound to the `github-pages`
  environment.
- GitHub Pages enabled for the repository with its source set to GitHub
  Actions, publishing at <https://isocialpractice.github.io/cheatsheets/>.
- A `.nojekyll` file at the published root, so no path beginning with an
  underscore is dropped from the site.
- `DESIGN_LANGUAGE.md`, recording the site palette, the type scale, spacing,
  and the measured contrast ratio for every text and background pair the site
  uses. The palette separates the three colors counted in `favicon.ico`, which
  cover 97.72% of the mark, from the six derived from them, and each derived
  value names its origin and the ratio it was moved to reach.
- A **New Cheatsheets** roadmap section in `TODO.md`, covering ten new
  cheatsheet categories and the shared infrastructure they need.

### Changed

- The preview link in `README.md` now points at the repository's own
  published site instead of a third party HTML preview service.
- `selectExample()` in `index.html` loads each example's script and image by
  relative path. The branch that rewrote both to a CDN when the page was
  opened through the preview service is gone, along with the `checkPreview`
  variable that selected it.
