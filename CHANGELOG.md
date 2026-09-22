# Changelog

> Release mode: dated - this project does not publish versions, tags, or releases.

The date of the change is the version, written `YYYY.MM.DD`.

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
  is the second local change to a ported module after `font.mjs`. Writing the
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
