# Changelog

> Release mode: dated - this project does not publish versions, tags, or releases.

The date of the change is the version, written `YYYY.MM.DD`.

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
