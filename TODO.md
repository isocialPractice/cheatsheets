# TODO

Planned work for this cheatsheet example repository. `## Current` holds the
next items to complete, in order; the level 2 sections below it are the
roadmap those items are drawn from.

This project is in **dated mode**. It has no releases and no tags, its source
is browser based, and it exists to hold and demonstrate learning examples. No
section applies a version, so each states its intent instead. `CHANGELOG.md`
keys its entries by date, written `YYYY.MM.DD`.

## Current

- [ ] Extract the repeating composition patterns from the eleven `javaScriptArrays` images and record them in `DESIGN_LANGUAGE.md`
  - Name each region the sheets reuse - title band, code block, annotation, footer - and give each its measured position and proportion
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [ ] Count the colors across the eleven images and record the repeating ones with each color's share, beside the palette already sampled from `mark.png`
  - Say plainly where a sheet color and a site color disagree, rather than averaging them into one value
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [ ] Extract the text from the images and identify the repeating font families, recording each with the role it carries
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [ ] Extract the text placement from the images and record which composition region each run of text falls into
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [ ] Turn the measured placement into the margin and padding tokens future cheatsheets are drawn to
  - One token set, expressed in the same 8px step the site already uses, so a generated sheet and the page around it agree
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images

### UI/UX Override - the unanswered probe

#### Resolve Issues

- [ ] Status Probe 2: the changelog credits the example script with 31 console lines it does not log
  - **Issue**: The interface half of the item is right and was verified route by route. The record of it is not. The 2026.09.09 `CHANGELOG.md` entry closes "the example logs its 31 lines with the footnote showing", and the archived **Status Probe 1** item says "the example script still logs its 31 console lines". Driving Chromium against `index.html` as a `file://` URL and selecting **Sorting Arrays**, the example logs 17 lines - every one of the 17 `console.log` calls `javaScriptArrays/SortingArrays.js` contains, counted from the source and matched against the console. 31 is the whole console after a *second* selection: 25 logged lines from two different examples, plus 2 `console.clear` markers and the 4 errors Chromium writes when it refuses the probe. Eight of those lines belong to **Slicing Arrays** and six are not output at all, so the figure names neither the example nor a single selection
  - **Goal**: Put the measured figure in both records - 17 lines from `SortingArrays.js`, which is every `console.log` in the file - rather than a session total the example did not produce. Nothing else in the entry changes: the behaviour it reports was verified and holds
  - From: Code Review Override - the icon and footnote fix

## GitHub Pages Deployment

Publish the example page as a GitHub Pages project site, deployed from an
Actions workflow on the default branch rather than from a branch or folder.
The page is a single hand written HTML file that already serves from the
repository root, so the root is the site and no generator is needed. Work
this section through the automation's GitHub Pages instructions, which own
site work however it was raised.

**Intent**: stand up the deployment that the repository has never had.

- [ ] Exclude the 20 MB of cheatsheet images from the published artifact, or confirm they are small enough to publish, once the image work below lands

## Preview Links and Example Loading

The README points readers at a third party HTML preview service, and
`selectExample()` in `index.html` branches on that service's URL to load
examples and images from a CDN instead of from the repository. A published
Pages site makes both unnecessary: the page is served from the repository,
so relative paths resolve on their own.

**Intent**: replace the preview workaround with the real site.

- [ ] Add the site link directly beneath the README's level 1 heading
- [ ] Replace the `XMLHttpRequest` probe that decides a missing image from the response status with an `img.onerror` handler or a `fetch` response check
  - The probe was patched on 2026.09.08 to read `this.status` instead of the reason phrase, which fixed the broken image icon on the published site but left the probe itself in place. Deleting it is still the endpoint, and this item and **Load the image only when an example is selected** under **Cheatsheet Images** are the two that do it
  - The probe downloads each image twice, once here and once through the `<img>` element, which is roughly 4 MB per selection at current image sizes
  - Whatever replaces it has to keep what the patch settled: a missing sheet hides the image and the footnote rather than showing a broken icon, and a page opened as a `file://` URL still works. `tools/test-example-selection.mjs` holds those as tests
  - The `fetch` half of this item is closed. The 2026.09.09 verification measured `fetch("javaScriptArrays/SortingArrays.jpg")` from a `file://` page and it throws `TypeError: Failed to fetch`, refused by the same CORS rule that refuses the `XMLHttpRequest`. A fetch response check would reintroduce the fault the 2026.09.09 entry fixed, so the `img.onerror` route is the only one of the two left
  - Half the `img.onerror` handler already exists, added on 2026.09.09 to hide the element when it cannot decode what the probe let through. Deleting the probe means giving that handler the footnote and the missing sheet decisions the probe still holds, not writing it from nothing
  - The blank first option is not a missing sheet, which is worth knowing before the replacement treats it as one. It requests `javaScriptArrays/.jpg`, a committed 72x72 image of a single white pixel value that answers 200 both locally and on the published site, so the empty selection takes the found branch and leaves a 600x600 white square in the image column. Nothing shows because the square matches the page background. The 2026.09.08 verification measured this: no dropdown option, blank included, resolves to a 404, so the missing sheet branch cannot be reached by clicking the page at all
  - The probe writes into the very console the footnote points the reader at, but only from a `file://` page. Measured 2026.09.09: one selection over http leaves the console holding the example's 17 lines and nothing else, while the same selection from a `file://` URL puts two Chromium errors ahead of them - the CORS refusal naming the image URL, and `Failed to load resource: net::ERR_FAILED` - once per selection. The page works either way; the reader following the instruction on screen meets two red lines first. Deleting the probe removes them

## Page Structure and Responsiveness

`index.html` now declares its language, carries a viewport tag, links the
repository favicon, and lays its two columns out as a wrapping flex row that
becomes a single column below 768px. What is left is what the reader still
meets on the page: the image announces itself as a generic `cheat sheet
image` to a screen reader, and no text and background pair in the stylesheet
has been measured against a contrast floor.

**Intent**: make the published page readable on the devices that will reach
it once it is public.

- [ ] Give the cheatsheet image an `alt` value naming the selected example rather than the generic `cheat sheet image`
- [ ] Check every text and background pair in the stylesheet reaches 4.5:1 contrast, or 3:1 for large headings
- [ ] Decide whether a browser driven layout test belongs beside `tools/test-page-structure.mjs`, and add it if so
  - That file reads the source text, so it confirms the rules are present but never what they render. The reflow was verified once by driving a browser, and nothing in the suite would catch a later regression
  - It would assert: both column tops equal at 1280px with the image left edge within 40px of the panel column's right edge; exactly one two column to one column transition, at 768px to 767px, with the image inside its column at every width between 1280 and 360; `documentElement.scrollWidth` equal to `clientWidth` at 390px; and `div.tools` travelling the full scroll distance rather than staying pinned
  - The decision to make first is the dependency: `tools/` is deliberately dependency free, and a browser test needs Playwright, which is currently installed only at user scope on one machine
  - Two further things the 2026.09.07 verification could only assert in a browser, if the decision goes that way: `#showFootNote` reaching computed `display: block` on the first selection of a freshly loaded page, which the stub DOM test covers as a style property but never as rendered state; and `favicon.ico` decoding square with the mark's green and navy halves in its pixels, which the byte level test cannot see because it parses the container rather than the image
  - One more from 2026.09.08, and the strongest case yet for the browser: a broken image icon is a rendered state with no property to read. The stub DOM proves the status branch chooses correctly, but only a browser shows that the element the branch produces is laid out at 0x0 with nothing decoded rather than at 600x18 with alt text. Asserting it needs the empty reason phrase, which no local server sends, so the test would have to reach the published origin over HTTP/2 or synthesise the response. The 2026.09.08 verification did the former: it served each version of `index.html` from the published origin so the image requests went out over the real `h2` connection, and read `naturalWidth` and the element's box back
  - And one from 2026.09.09: a `file://` page is the second rendered state with no property to read. Chromium refuses that page its own `XMLHttpRequest`, and no stub DOM reproduces either the refusal or the separate read the `<img>` element is still allowed, so only a browser shows the sheet decoding 3601x3601 into a 600x600 box on a page whose probe was denied. The 2026.09.09 verification asserted it by driving the real `file://` URL, which needs no server at all and is the cheapest of the browser cases to keep

## Cheatsheet Catalog

The category dropdown offers one option, and the inline configuration block
selects it on load because it is the only one. Both branches of the
`testEnvironment` condition now do the same thing apart from presetting an
example, and the folder holds two placeholder files named with no basename
at all, one of which is the image element's initial `src`.

**Intent**: let the page carry more than one cheatsheet without hand editing
the configuration block for each.

The manifest pipeline below is the one prerequisite for every item in **New
Cheatsheets**. Until it is in place, adding a category means hand editing
`index.html` again, which is the thing this section exists to remove.

### The Manifest Pipeline

- [ ] Write `tools/build-manifest.mjs`, a dependency free Node script that walks the cheatsheet tree and emits `cheatsheets.json` at the repository root
  - Treat any folder holding `sheet.webp` as a cheatsheet, read the `meta.json` at each level for its title and order, detect the payload by extension, and record each image's width, height and byte size
  - Commit `cheatsheets.json` rather than building it at deploy time, so the local `php -S localhost:8000` workflow keeps working without Node
- [ ] Add a `--check` mode to the same script that exits non zero on a broken tree
  - Fail on: a missing `sheet.webp` or title; a `kind` that contradicts what is on disk; a path segment that is not lower case kebab ASCII, or whose on disk casing differs byte for byte; depth greater than three; a duplicate id; a `sheet.webp` over the image budget; an unreferenced file in a cheatsheet folder; and a committed `cheatsheets.json` that differs from freshly generated output
  - The casing check is the one that matters most: Pages serves from a case sensitive filesystem while the work happens on Windows, so a casing mismatch passes locally and 404s only in production
- [ ] Run `--check` from a CI workflow that the Pages deploy job depends on, so a broken manifest cannot publish
  - Any new file under `.github/` needs `git add -f` on this machine, for the reason recorded in the archived Pages items
- [ ] Build both dropdowns in `index.html` from `cheatsheets.json` rather than from a hand maintained `optgroup`
  - Fetch the manifest by relative path so it resolves under the `/cheatsheets/` project base path
  - Key each `option` by its slug id and take its label from the manifest title, so no path is ever derived from display text
- [ ] Hide the previously shown `optgroup` when the category changes
  - `selectCheatsheet()` only ever sets one to `display: block`, so with more than one category the example dropdown accumulates stale groups
- [ ] Remove the injected `script` element from the previous selection before appending the next one, and inject with `type="module"`
  - Each selection currently appends another `script` and never removes the last, so globals leak and collide between examples. `console.clear()` hides the symptom rather than the cause
- [ ] Add hash routing so a cheatsheet has a shareable link and preselects on load

### Catalog Cleanup

- [ ] Select the category automatically only while exactly one exists, rather than naming it in the script
- [ ] Remove the `testEnvironment` block, or reduce it to the one behavior that differs between its branches
- [ ] Replace the empty basename `javaScriptArrays/.js` and `javaScriptArrays/.jpg` placeholders, leaving the image with no `src` until one is chosen
- [ ] Show the console instructions only for a cheatsheet whose payload actually runs in the browser
  - The heading blurb, the "Press F12" step and `#showFootNote` are hard wired, and most of the new catalog is not a runnable browser script
- [ ] Migrate the eleven array examples to `javascript/arrays/` under the new convention, as the acceptance test for the manifest pipeline
  - The existing eleven must render with no hand edited HTML before any new category is added

## Example Script Quality

The example scripts are the repository's product: someone reads them to
learn the method being demonstrated, so a wrong comment teaches the wrong
thing. Several carry misspellings in the commented output, loop counters are
declared without `let` or `var` in two places and leak to the global scope,
and the file header comment is inconsistent across the folder.

**Intent**: make the examples correct as teaching material.

- [ ] Correct the misspelled words in the commented output in `shiftAndUnshift.js`
- [ ] Declare the loop counter with `let` in the `optgroup` loop in `index.html` and in the `for (i in cars)` loop in `MaxandMinFunctionandSortObject.js`
- [ ] Fix the `CONGIF` misspelling in the `index.html` configuration comment
- [ ] Give every example file the same header comment, or drop it from all of them
- [ ] Check each example's commented output against what the script actually logs

## Cheatsheet Images

The eleven cheatsheet images total roughly 20 MB, between 1.5 MB and 2.3 MB
each, and the page displays them at a maximum width of 600 pixels. Every one
is served at full capture resolution. On a published site that is the whole
page weight, paid for on every example a reader selects.

**Intent**: cut the page weight the site will otherwise carry.

The budget matters more once **New Cheatsheets** lands. At the current
average, the roughly 120 planned cheatsheets would come to about 250 MB,
which is a quarter of the 1 GB GitHub Pages limit and unreadable on a
phone connection.

- [ ] Set the image budget and record it where a contributor will read it: WebP, quality 80, 1400 pixel maximum long edge, 200 KB target, 300 KB hard cap, one `sheet.webp` per cheatsheet
  - WebP rather than JPEG specifically because these are text dense code screenshots, where WebP holds small glyph edges better at the same weight
  - Raise an individual sheet to quality 90 when its code is not legible, rather than raising its dimensions past 1400 pixels
- [ ] Enforce the budget from the manifest `--check` mode, so an oversize image fails the build rather than relying on a guideline
- [ ] Convert the eleven existing JPEG screenshots to WebP within the budget and delete the JPEGs
  - The original blobs stay in git history, so `git clone` stays large. That is not worth a history rewrite for 20 MB, and the published site is unaffected
- [ ] Raise the displayed image cap from 600 pixels to `min(100%, 900px)` and make the image open the full file when clicked
  - 600 pixels is too small to read code in, which is the whole purpose of the screenshot
- [ ] Load the image only when an example is selected, rather than probing for it on every change
  - Ship the `img` with no `src`, set `width` and `height` from the manifest to stop layout shift, add `decoding="async"`, and give `alt` the cheatsheet title
  - This deletes the probe that 2026.09.08 patched. It was patched rather than left for this item because the fault was live on the published site and this item waits on a manifest that does not exist yet
- [ ] Add a `graphic-designer` collaborator when any replacement image is created
  - Required by the collaborators constant in `.claude/constants.md`

## Repository Records

The repository has no contributing guidance, and the README describes the
local preview but not the published site. The LICENSE is CC0 1.0 and is not
mentioned anywhere in the README.

**Intent**: give the repository the records the automation and a reader both
expect to find.

- [ ] Note the CC0 1.0 license in `README.md`
- [ ] Describe both ways to view the examples in `README.md`: the published site, and a local server for anyone working on the page
  - Say plainly that opening `index.html` as a `file://` URL will stop working once the page fetches its manifest, so a local server stops being optional
- [ ] Record how a new cheatsheet category is added, once the catalog work settles the shape

## New Cheatsheets

Ten new cheatsheet categories, queued from the user note. Each level 3
section below is one category and becomes one folder at the repository root.
Today the repository holds a single category, so this section is the bulk of
its future content.

**Intent**: grow the catalog from one category to ten without hand editing
the page for each addition.

### Conventions for every item in this section

These hold for every item below, and are repeated on each item only where an
item would otherwise be ambiguous once it is copied into `## Current`.

- **The prerequisite**: the manifest pipeline under **Cheatsheet Catalog**
  must be working before any item here is started. Until then, adding a
  cheatsheet means hand editing `index.html`.
- **Paths** are lower case kebab ASCII, at most three levels deep:
  `<category>/<cheatsheet>/` or `<category>/<group>/<cheatsheet>/`. The human
  readable title lives in `meta.json` and is never derived from a path, which
  is why `HTML/CSS` becomes `html-css` and `C++` becomes `c-plus-plus`.
- **Every cheatsheet folder holds a `sheet.webp`**, within the image budget
  set under **Cheatsheet Images**. The graphic is required; the demo payload
  is not.
- **`kind`** selects what the page does with the payload: `run` injects a
  browser script, `read` renders the source as text, `embed` loads
  `demo/index.html` in a sandboxed frame, `none` is graphic only.
- **`graphic-designer` is added as a collaborator** on any commit that
  creates or converts an image, per the collaborators constant in
  `.claude/constants.md`.
- **Build order**: JavaScript first, because it absorbs the existing eleven
  array examples and proves the pipeline on `kind: run` alone. Then HTML/CSS,
  which forces `embed` and the first sub group. Then Programming, which
  forces `read` and the second sub group. After those three every structural
  unknown is settled and the remaining seven are content only.

### HTML/CSS

The `html-css/` category. Forces the first `embed` payloads and the first sub
group, so it is built second.

- [ ] Add the **General HTML Overview** cheatsheet at `html-css/general-html-overview/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **General CSS Overview** cheatsheet at `html-css/general-css-overview/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **HTML APIs** group at `html-css/html-apis/` with its own `meta.json`
  - [ ] Add the **Common Browser Built-in APIs** cheatsheet at `html-css/html-apis/common-browser-apis/`, `kind: embed`
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Add the **Google Maps APIs** cheatsheet at `html-css/html-apis/google-maps-apis/`, `kind: embed`
    - Graphic: `sheet.webp` required, to the image budget
    - The demo must not ship an API key. Show the call shapes and let a reader supply their own
  - [ ] Propose 4 new API cheatsheet ideas and queue one item per accepted idea
    - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **HTML/CSS Draw SVG** cheatsheet at `html-css/draw-svg/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **HTML/CSS Use Canvas** cheatsheet at `html-css/use-canvas/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Advanced HTML** cheatsheet at `html-css/advanced-html/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Advanced CSS** cheatsheet at `html-css/advanced-css/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 3 new HTML/CSS cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the two master cheatsheets for this category
  - This category is the one that needs two, because it covers two languages
  - [ ] Add the **Master Cheatsheet: HTML** at `html-css/master-html/`, `kind: none`, carrying the imperative takeaways from every HTML item in this section
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Add the **Master Cheatsheet: CSS** at `html-css/master-css/`, `kind: none`, carrying the imperative takeaways from every CSS item in this section
    - Graphic: `sheet.webp` required, to the image budget

### JavaScript

The `javascript/` category. Built first: the existing eleven array examples
migrate into it as the `arrays` sub group, so building this category is the
migration and the pipeline's acceptance test.

- [ ] Add the **General JavaScript Overview** cheatsheet at `javascript/general-javascript-overview/`, `kind: run`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JS Dates** cheatsheet at `javascript/dates/`, `kind: run`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JS Elements** cheatsheet at `javascript/elements/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JS Math** cheatsheet at `javascript/math/`, `kind: run`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JS Statements** cheatsheet at `javascript/statements/`, `kind: run`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JS Objects** cheatsheet at `javascript/objects/`, `kind: run`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JS DOM** cheatsheet at `javascript/dom/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JS Versions** cheatsheet at `javascript/versions/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
  - A version comparison is a table rather than a runnable script, which is why it reads rather than runs
- [ ] Propose 5 new JavaScript cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **Master Cheatsheet: JavaScript** at `javascript/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget

### Miscellaneous

The `miscellaneous/` category. The heaviest `embed` work in the roadmap, since
four of its items are complete small applications rather than snippets. Build
it once `embed` is proven elsewhere.

- [ ] Add the **Rotating Clock** cheatsheet at `miscellaneous/rotating-clock/`, `kind: embed`, built in vanilla HTML, CSS and JavaScript
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Tic-Tac-Toe** cheatsheet at `miscellaneous/tic-tac-toe/`, `kind: embed`, built in vanilla HTML, CSS and JavaScript
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Canvas Platformer Game** cheatsheet at `miscellaneous/canvas-platformer/`, `kind: embed`, built on `canvas` in vanilla HTML, CSS and JavaScript
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Interactive Chart and Data Tool** cheatsheet at `miscellaneous/interactive-chart-tool/`, `kind: embed`, built in vanilla HTML, CSS and JavaScript with a graph library
  - Graphic: `sheet.webp` required, to the image budget
  - Vendor the graph library into the demo folder rather than loading it from a CDN, so the site keeps its no third party guarantee
- [ ] Add the **VS Code Extension Essentials** cheatsheet at `miscellaneous/vs-code-extension/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **MCP Essentials** group at `miscellaneous/mcp/` with its own `meta.json`
  - [ ] Add the **MCP Server** cheatsheet at `miscellaneous/mcp/server/`, `kind: read`
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Add the **MCP Client** cheatsheet at `miscellaneous/mcp/client/`, `kind: read`
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Add the **MCP Host** cheatsheet at `miscellaneous/mcp/host/`, `kind: read`, covering the host or wrapper role
    - Graphic: `sheet.webp` required, to the image budget

### XML

The `xml/` category. Content only once the pipeline is proven.

- [ ] Add the **General XML Overview** cheatsheet at `xml/general-xml-overview/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **XML AJAX** cheatsheet at `xml/ajax/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **XML DOM** cheatsheet at `xml/dom/`, `kind: run`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **XML Languages** cheatsheet at `xml/languages/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **XML Data** cheatsheet at `xml/data/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 2 new XML cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **Master Cheatsheet: XML** at `xml/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget

### Web Templates

The `web-templates/` category. Every item is a static site generator, so each
payload is configuration and templating read as text rather than run.

- [ ] Add the **Hugo** cheatsheet at `web-templates/hugo/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Eleventy** cheatsheet at `web-templates/eleventy/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Astro** cheatsheet at `web-templates/astro/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Jekyll** cheatsheet at `web-templates/jekyll/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
  - Jekyll template syntax in a payload can be eaten by a site generator. The repository publishes with `.nojekyll`, so this is safe here, but keep the sample fenced
- [ ] Add the **Wordpress** cheatsheet at `web-templates/wordpress/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 2 new web template cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **Master Cheatsheet: Web Templates** at `web-templates/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget

### Electronics

The `electronics/` category. Mostly `none` and `read`: a breadboard cannot be
embedded, so the graphic carries nearly all the value here. Build it late,
since it blocks nothing.

- [ ] Add the **Electronic Components** cheatsheet at `electronics/components/`, `kind: none`
  - Graphic: `sheet.webp` required, to the image budget. This item is graphic only, so the sheet is the entire deliverable
- [ ] Add the **555 Timer** cheatsheet at `electronics/555-timer/`, `kind: none`
  - Graphic: `sheet.webp` required, to the image budget. This item is graphic only, so the sheet is the entire deliverable
- [ ] Add the **Arduino** cheatsheet at `electronics/arduino/`, `kind: read`, with a `demo.ino` payload
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Arduino Command Line Tool** cheatsheet at `electronics/arduino-cli/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 4 new electronics cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **Master Cheatsheet: Electronics** at `electronics/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget

### Hardware

The `hardware/` category. The smallest section, and like Electronics it is
`read` and `none` only, so it blocks nothing and is built last.

- [ ] Add the **Chip: 65c02** cheatsheet at `hardware/65c02/`, `kind: read`, with an assembly payload
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Dev Board: ESP32** cheatsheet at `hardware/esp32/`, `kind: read`, with a `demo.ino` payload
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 2 new hardware cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **Master Cheatsheet: Hardware** at `hardware/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget
  - The source list named a master cheatsheet twice for this category. It is written once here, which is what two identical entries can only have meant

### Server

The `server/` category. Every item is a language that does not run in a
browser, so all of them read their payload as text.

- [ ] Add the **PHP** cheatsheet at `server/php/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Java** cheatsheet at `server/java/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Python** cheatsheet at `server/python/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **SQL** cheatsheet at `server/sql/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **JSON** cheatsheet at `server/json/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **NodeJS** cheatsheet at `server/nodejs/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
  - Node runs JavaScript but not in the browser, so this reads rather than runs. Anything that genuinely runs in the page belongs under the JavaScript category
- [ ] Add the **Perl** cheatsheet at `server/perl/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **TypeScript** cheatsheet at `server/typescript/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 6 new server cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **Master Cheatsheet: Server** at `server/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget

### Frameworks

The `frameworks/` category. The largest by item count once its twelve
proposed ideas land. Mostly `embed`, since a framework is best shown running.

- [ ] Add the **Bootstrap CSS** cheatsheet at `frameworks/bootstrap/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **jQuery** cheatsheet at `frameworks/jquery/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **React** cheatsheet at `frameworks/react/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
  - Vendor the library into the demo folder and use a build free form, so the site keeps working with no toolchain
- [ ] Add the **AngularJS** cheatsheet at `frameworks/angularjs/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **AppML** cheatsheet at `frameworks/appml/`, `kind: embed`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Sass for CSS** cheatsheet at `frameworks/sass/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
  - Sass compiles before it reaches a browser, so this reads rather than embeds. Show the source beside the CSS it produces
- [ ] Add the **Django** cheatsheet at `frameworks/django/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 12 new framework cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
  - Twelve is the largest batch in this roadmap. Queue them in groups rather than all at once, so the category stays reviewable
- [ ] Add the **Master Cheatsheet: Frameworks** at `frameworks/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget

### Programming

The `programming/` category. Built third, because it forces the `read` payload
across compiled languages and the second sub group.

- [ ] Add the **C++** cheatsheet at `programming/c-plus-plus/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
  - The folder name spells the operator out, because `+` in a path is decoded as a space by some servers. The title in `meta.json` stays `C++`
- [ ] Add the **C#** cheatsheet at `programming/c-sharp/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
  - The folder name spells the symbol out, because `#` in a path starts a URL fragment. The title in `meta.json` stays `C#`
- [ ] Add the **Kotlin** cheatsheet at `programming/kotlin/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Go** cheatsheet at `programming/go/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **R** cheatsheet at `programming/r/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **git Command Line Tool** cheatsheet at `programming/git/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Add the **Command Line** group at `programming/command-line/` with its own `meta.json`
  - [ ] Add the **Linux Command Line** cheatsheet at `programming/command-line/linux/`, `kind: read`
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Add the **Windows DOS Command Line** cheatsheet at `programming/command-line/windows-dos/`, `kind: read`
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Add the **Windows PowerShell Command Line** cheatsheet at `programming/command-line/powershell/`, `kind: read`
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Add the **MacOS Command Line** cheatsheet at `programming/command-line/macos/`, `kind: read`
    - Graphic: `sheet.webp` required, to the image budget
  - [ ] Propose 1 new command line cheatsheet idea and queue an item for it if accepted
    - Graphic: the accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **curl Command Line Tool** cheatsheet at `programming/curl/`, `kind: read`
  - Graphic: `sheet.webp` required, to the image budget
- [ ] Propose 9 new programming cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.webp`, to the image budget
- [ ] Add the **Master Cheatsheet: Programming** at `programming/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.webp` required, to the image budget

## Cheatsheet Composition Language

The eleven cheatsheet images in `javaScriptArrays/` were composed by hand and
share a look that has never been written down. `DESIGN_LANGUAGE.md` records
the site's palette, sampled from `mark.png`, but nothing yet records the
language of the sheets themselves. Reading it out of the images is what turns
a hand composed sheet into a generated one.

**Intent**: recover the design language from the existing sheets, then build
the algorithms that draw new sheets to it.

Everything below feeds `DESIGN_LANGUAGE.md`, which stays the single record of
what the sheets and the site both look like.

### Extracting the Language from the Images

- [ ] Extract the repeating composition patterns from the eleven `javaScriptArrays` images and record them in `DESIGN_LANGUAGE.md`
  - Name each region the sheets reuse - title band, code block, annotation, footer - and give each its measured position and proportion
- [ ] Count the colors across the eleven images and record the repeating ones with each color's share, beside the palette already sampled from `mark.png`
  - Say plainly where a sheet color and a site color disagree, rather than averaging them into one value
- [ ] Extract the text from the images and identify the repeating font families, recording each with the role it carries
- [ ] Extract the text placement from the images and record which composition region each run of text falls into
- [ ] Turn the measured placement into the margin and padding tokens future cheatsheets are drawn to
  - One token set, expressed in the same 8px step the site already uses, so a generated sheet and the page around it agree
- [ ] Apply what the extraction settles to the site's own stylesheet, so the page and the sheets it displays read as one design

### The Composition Algorithm

- [ ] Write the composition algorithm: given a cheatsheet document and the extracted language, produce a composition variation
- [ ] Make every variation deterministic from a seed, so one can be reproduced, reviewed and regenerated identically
- [ ] Constrain every variation to the extracted margins, spacing and contrast floors, so no seed can produce an unreadable sheet
- [ ] Compose the sheets for new cheatsheets with the algorithm rather than capturing screenshots by hand

### Rendering and Conversion

- [ ] Write the SVG generation algorithm: reference content as raw character data, composition as layered shapes and design elements
- [ ] Keep reference text as real characters in the SVG rather than converting it to paths, so a sheet stays selectable, searchable and translatable
- [ ] Write the conversion algorithm that renders a generated SVG to PNG, JPG, GIF and TIFF
  - Take scale and background from the call rather than assuming one, since GIF and TIFF do not carry the same alpha as PNG
- [ ] Record the algorithm each of the three steps above settles on, where the next run will read it
  - The user note asks for this in `.claude/agent-note.md`. That file carries checks rather than work, so the algorithm itself belongs in `DESIGN_LANGUAGE.md` with an agent note section pointing at it, which keeps both the ask and the file's purpose intact

## Implement Cheatsheet API

A cheatsheet is currently a screenshot someone took. This section replaces
that with an API: a caller describes the content and the design, and the API
composes the sheet. It has to work outside this repository as well as inside
it, so nothing in it may assume this page, this folder layout or this
category.

**Intent**: make a cheatsheet something a program composes rather than
something a person captures.

The composition and rendering algorithms under **Cheatsheet Composition
Language** are this section's prerequisite. The API is the surface over them,
and building the surface first would fix an interface around behavior that
does not exist yet.

### The Core Model

- [ ] Define the cheatsheet document model: a title, ordered sections, and entries carrying a term, a signature and a description, independent of how any of it is drawn
- [ ] Define the theme model: palette roles, type stack and scale, spacing step, radius and stroke weight, read from `DESIGN_LANGUAGE.md` rather than hard coded
- [ ] Define the layout model: a named composition, its column and row grid, and the slots a section may occupy
- [ ] Validate a document and a theme against their schemas, failing with the path to the offending field rather than a generic error
- [ ] Publish those three models as the API's only public input surface, so a caller composes a sheet without ever naming a renderer

### Configuration

- [ ] Accept a partial theme and merge it over the default, so a caller overrides one color without restating the palette
- [ ] Resolve every color role to a concrete value and reject any pairing below the contrast floor the design language sets
- [ ] Accept a font family list with fallbacks, and record which family a rendered sheet actually used
- [ ] Take design element choices - shape, curve, size, weight - as named tokens rather than raw CSS, so one document renders the same on every backend
- [ ] Load a document from JSON and from a plain object, and assume no other input format

### Renderers and Output

- [ ] Render a document to SVG, as the one canonical output every other format is derived from
- [ ] Render a document to an HTML fragment for embedding in a page
- [ ] Return every render as raw data as well as writing a file, so a caller can embed the result without touching disk
- [ ] Convert the SVG to PNG, JPG, GIF and TIFF through the conversion algorithm, taking scale and background from the call
- [ ] Write output to a named path, to a directory with a derived filename, or to an in-memory buffer

### Embedding the API

- [ ] Ship the API as an ES module with no runtime dependencies, so a browser can import it directly
- [ ] Expose a command line entry point that reads a document file and writes an output file, with the graphics backend optional
- [ ] Give the command line a data only mode that structures and orders cheatsheet content without rendering it, for callers that want the organized data rather than the picture
- [ ] Document the public API surface with one worked example per output format
- [ ] Cover the API with tests that render a fixture document to every format and compare against committed output

## Dedicated cheatsheet website

A site that already carries code examples, tables and explanatory sections
holds everything a cheatsheet needs; what it lacks is a way to say so. This
section builds the tool that reads those markings and writes the cheatsheet
pages, and the routes by which an existing site or a new one uses the API
directly.

**Intent**: let a site generate its own cheatsheet section from the content
it already publishes.

Two authoring methods are planned deliberately: a parent tag for the simple
case, and a comment syntax for the case that needs options. Both feed one
collector, so a page may use either and a site may use both.

### The Scripted Tool

- [ ] Write `tools/cheatsheet-site.mjs`, a dependency free Node script that crawls a site tree, collects marked content and writes cheatsheet pages
- [ ] Resolve the output folder before writing anything: use `cheatsheets/`, and when that exists fall back to `cheatsheets/cheatsheets/`, then `cheatsheets/cheatsheets_0/` and upward until a free name is found
- [ ] Record the resolved output folder in a generated manifest, so the menu builder and a second run read the same location rather than resolving it again
- [ ] Add a `--dry-run` mode reporting the pages it would write and the folder it resolved, without touching disk
- [ ] Make a second run over an unchanged site produce byte identical output, so the generated pages can be committed and diffed

### The Parent Tag Method

- [ ] Collect every element carrying `data-cheatsheet` and take its content as that page's cheatsheet reference material
- [ ] Read the attribute value: `title` takes the heading from the page's `<title>` element, `page` takes it from the page's file name
- [ ] Convert a camel case file name to prose for the heading, so `somePageName.html` becomes `Some Page Name`, splitting on case changes and digit boundaries
- [ ] Group the pages of a folder into one cheatsheet page named for that folder, so `sectionName/1.html` and `sectionName/2.html` produce `sectionName.html` in the resolved output folder
- [ ] Preserve the source order of the pages within a folder, so a generated cheatsheet reads in the order the site does
- [ ] Skip a page carrying no marked element rather than emitting an empty section for it

### The Comment Syntax Method

- [ ] Parse `<!-- {% cheatsheet: [<property>: <value>] %} -->` and apply it to the content that follows it
- [ ] Define the property vocabulary the comment accepts and map each property onto the scripted tool's options
- [ ] Accept more than one property per comment, as an array of property and value pairs
- [ ] Report an unknown property with the file and line it appeared on rather than ignoring it
- [ ] Let a comment override the parent tag method's defaults on the same page, so the two methods can be mixed
- [ ] Document both methods side by side, with the trade-off between them stated plainly

### The Menu Element

- [ ] Fill `<div data-cheatsheet-menu="page"></div>` with a link to one master page concatenating every cheatsheet's data
- [ ] Fill `<div data-cheatsheet-menu="dropdown"></div>` with one entry per page in the resolved cheatsheets folder
- [ ] Derive each dropdown entry's link from the page path and its text from the prose form of the page name
- [ ] Leave the menu element's content untouched when it is not empty, so a hand written menu is never overwritten
- [ ] Generate the master page from the same collected data as the individual pages, so the two cannot drift apart

### Building on the API

- [ ] Render each generated page through the cheatsheet API rather than by string concatenation, so the site and the media files share one composition
- [ ] Expose a browser entry point that builds a cheatsheet section from elements found with ordinary DOM methods, for a site that will not run a build step
- [ ] Generate a whole site - a menu and one page per entry - from a single JSON data file
- [ ] Accept XML and HTML as data file formats alongside JSON, mapping each onto the same internal model
- [ ] Define the preset mapping from data file properties to tags and attributes, and document it as the contract a new site writes against
- [ ] Decide and record whether the generated site is published as a section of an existing site or as its own subdomain

## AI Helper API

A wrapper that takes a URL or raw data and returns a cheatsheet, through a
plugin exclusive to this tool. It is the shortest path from something a
reader already has to something the API can compose, and it produces
documents rather than pictures, so nothing here bypasses the models.

**Intent**: let a source become a cheatsheet without anyone writing the
document by hand.

- [ ] Define the helper's single entry point: a source - a URL or raw data - and a requested output, returning a cheatsheet document
- [ ] Fetch and extract readable content from a URL, and accept raw text, HTML and JSON as the same source type
- [ ] Reduce an extracted source to the cheatsheet document model, so the helper's output is the API's input and nothing skips the model
- [ ] Build the plugin the helper calls, exclusive to this tool, exposing the document, theme and layout models
- [ ] Generate a media file as the first supported output, the shortest path from a source to something a reader can see
- [ ] Generate a single webpage from the same document, once the media file output is settled
- [ ] Generate a new section for an existing website, reusing the scripted tool's insertion points rather than a second mechanism
- [ ] Generate a whole new site from one source, as the largest of the four outputs
- [ ] Validate every generated document before rendering, so a malformed generation fails at the model rather than inside a renderer
- [ ] Cache a fetched source by URL so repeated generations do not refetch it
- [ ] State in the documentation what the helper does not do: it composes what the source carries, and does not invent reference content
- [ ] Cover the helper with tests driven by recorded fixtures rather than live network calls

## Cliche Tutorial/Documentation Site to Test Cheatsheet API and Script

A small fixture site, half tutorial and half tool documentation, existing
only so the scripted tool and the API have something to run against. It is
deliberately unremarkable: the point is to carry every page shape the tool
has to handle, not to be interesting.

**Intent**: give the site tooling a target that fails loudly when the tooling
breaks.

Its content is placeholder throughout - Acme Corp, `demo-app`,
`jane.doe@example.com` - so nothing real can leak into a fixture that is read
as an example of how to mark a site up.

- [ ] Build the fixture site under `fixtures/site/`, half tutorial and half tool documentation, using placeholder content only
- [ ] Give it the page shapes the scripted tool must handle: code examples, prose sections, tables and a chart
- [ ] Mark one section with the parent tag method and another with the comment syntax, so both paths have a fixture
- [ ] Include a nested folder of sibling pages, so the folder-to-one-page rule has something to exercise
- [ ] Add a page carrying `data-cheatsheet-menu` in each of its two modes
- [ ] Include a variant that already has a `cheatsheets/` folder, so the folder resolution fallback is exercised rather than assumed
- [ ] Run the scripted tool and the API against the fixture in CI, comparing generated pages against committed expected output
- [ ] Keep the fixture small enough that running it on every commit costs nothing

## Create New Ideas

One item per roadmap section, each asking for a stated number of new ideas
for that section. It is the last section to be worked: an idea is only worth
generating once the section it belongs to has been built far enough to show
what it is missing.

**Intent**: refill the roadmap from what the finished work reveals, rather
than from what was imagined at the start.

An accepted idea becomes an item in the section it was generated for, not in
this one. This section carries no item for itself, which would only ever
generate ideas about generating ideas.

- [ ] Create 3 new ideas for **GitHub Pages Deployment**
- [ ] Create 3 new ideas for **Preview Links and Example Loading**
- [ ] Create 4 new ideas for **Page Structure and Responsiveness**
- [ ] Create 5 new ideas for **Cheatsheet Catalog**
- [ ] Create 4 new ideas for **Example Script Quality**
- [ ] Create 4 new ideas for **Cheatsheet Images**
- [ ] Create 2 new ideas for **Repository Records**
- [ ] Create 9 new ideas for **New Cheatsheets**
- [ ] Create 6 new ideas for **Cheatsheet Composition Language**
- [ ] Create 7 new ideas for **Implement Cheatsheet API**
- [ ] Create 8 new ideas for **Dedicated cheatsheet website**
- [ ] Create 5 new ideas for **AI Helper API**
- [ ] Create 3 new ideas for **Cliche Tutorial/Documentation Site to Test Cheatsheet API and Script**

## Complete

- [x] Create `.github/workflows/pages.yml` deploying the repository root on push to the default branch and on `workflow_dispatch`
  - From: GitHub Pages Deployment
- [x] Enable GitHub Pages for the repository with its source set to GitHub Actions
  - From: GitHub Pages Deployment
- [x] Add a `.nojekyll` file at the published root
  - From: GitHub Pages Deployment
- [x] Force add both `.github/workflows/pages.yml` and `.nojekyll` when they are committed
  - Both paths match `.*` in this machine's global ignore file, so a plain `git add <path>` exits 1 and `git add -A` skips them without a word. Neither file reaches GitHub without `git add -f`, and the two items above are checked off either way
  - From: GitHub Pages Deployment
- [x] Replace the `htmlpreview` link in `README.md` with the repository's own GitHub Pages URL
  - From: Preview Links and Example Loading
- [x] Remove the `htmlpreview` and CDN branch from `selectExample()` in `index.html` so examples load by relative path
  - From: Preview Links and Example Loading
- [x] Give the workflow `contents: read`, `pages: write`, and `id-token: write` permissions, and a concurrency group so overlapping deploys cannot race
  - From: GitHub Pages Deployment
- [x] Use the Pages action sequence: configure the environment, upload the site directory as the Pages artifact, then deploy it in a job bound to the `github-pages` environment
  - From: GitHub Pages Deployment
- [x] Confirm every asset path resolves under the project site base path rather than the domain root
  - Verified by serving the tracked site under a `/cheatsheets/` prefix: `index.html`, the example `.js` and `.jpg`, `.nojekyll` and `favicon.ico` all answered 200 under the prefix, and the same example path answered 404 at the domain root
  - From: Preview Links and Example Loading
- [x] Create `CHANGELOG.md` declaring dated release mode on the line beneath its title
  - From: Repository Records
- [x] Verify the documentation site deployed
  - The `Deploy GitHub Pages` run for commit `3157813` concluded `success`, so the site published at <https://isocialpractice.github.io/cheatsheets/>
  - From: GitHub Pages Deployment
- [x] Add `lang="en"` to the `<html>` element
  - From: Page Structure and Responsiveness
- [x] Add a `<meta name="viewport" content="width=device-width, initial-scale=1">` tag
  - From: Page Structure and Responsiveness
- [x] Link `favicon.ico` from the document head
  - From: Page Structure and Responsiveness
- [x] Replace the fixed `margin-left` offset and pinned tools panel with a layout that reflows to a single column on narrow screens
  - The two columns are a wrapping flex row that becomes one column below 768px, and the image scales to the column instead of sitting behind a 500 pixel offset
  - From: Page Structure and Responsiveness
- [x] The footnote beneath the columns stays hidden until the second selection
  - The footnote is now set from the selection being made, where the new image location is already known, rather than read back off `curCheatSheetImg.src`, which still held the previous selection at that point
  - From: UI/UX Override - page reflow
- [x] `favicon.ico` carries a PNG payload rather than an icon
  - `favicon.ico` is now a real ICO carrying 16, 32 and 48 pixel square frames, the head link declares the matching type and sizes, and `mark.png`, the artwork it is derived from, is kept beside it
  - From: UI/UX Override - page reflow
- [x] The two items this run completed were archived in `## Complete` with their `**Issue**` and `**Goal**` properties instead of a result line
  - Both property blocks were replaced with the one line result the rest of `## Complete` uses, each keeping its `From:` line
  - From: Code Review Override - the icon and footnote fix
- [x] **Status Probe**: `selectExample()` decides a missing cheatsheet image from the server's reason phrase, which the published site never sends
  - The handler now branches on the numeric `this.status`, treating `0` as found so a `file://` page still shows its sheet, and an `onerror` handler covers the blocked or dropped request that never reached `onload` at all. `tools/test-example-selection.mjs` stubs `status` with an empty phrase, as HTTP/2 sends, and adds cases for a phraseless 404, a 404 with a phrase, a `file://` read and a failed request
  - From: Code Review Override - the icon and footnote fix
- [x] The two source text tests in `tools/test-example-selection.mjs` each copy the same brittle slice instead of sharing one
  - Both now call one `selectExampleSource()` helper, which throws naming the marker that moved when either `function selectExample` or the `// SUPORT FUNCTION` heading is absent, so correcting the misspelling fails the tests instead of widening them to the whole script. A third test holds that failure open, asserting both markers are present and that the slice stops short of `removeSpaceInVariable`
  - From: Code Review Override - the file scheme branch
- [x] **Status Probe 1**: settle what a `file://` page actually does, then make the comments, the test names and the changelog agree with it
  - Chromium was driven against `index.html` as a `file://` URL: `send()` does not throw, `onload` never fires, and `onerror` runs at `readyState` 4 with status 0, the console naming the CORS rule that refused it. So `onerror` is the branch that case reaches, and the `status === 0` clause inside `onload` was never the `file://` case at all. The `<img>` element is not refused the same read - it decodes the sheet from disk at 3601x3601 - and the example script still logs its 31 console lines, so a refused probe should hide neither the sheet nor the footnote. An unanswered probe now hands the sheet to the element, the element's own `onerror` hides it when it cannot decode one, the probe rules a sheet out only on a definite non-2xx status, and the comments, both test names and the 2026.09.08 `CHANGELOG.md` entry say all of that
  - From: Code Review Override - the icon and footnote fix
