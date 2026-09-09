# Changelog

> Release mode: dated - this project does not publish versions, tags, or releases.

The date of the change is the version, written `YYYY.MM.DD`.

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
  example logs its 31 lines with the footnote showing.
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
