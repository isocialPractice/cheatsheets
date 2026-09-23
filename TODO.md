# TODO

Planned work for this cheatsheet example repository. `## Current` holds the
next items to complete, in order; the level 2 sections below it are the
roadmap those items are drawn from.

This project is in **dated mode**. It has no releases and no tags, its source
is browser based, and it exists to hold and demonstrate learning examples. No
section applies a version, so each states its intent instead. `CHANGELOG.md`
keys its entries by date, written `YYYY.MM.DD`.

## Current

- [ ] Migrate the eleven array examples to `javascript/arrays/` under the new convention, as the acceptance test for the manifest pipeline
  - The existing eleven must render with no hand edited HTML before any new category is added
  - Each becomes `javascript/arrays/<kebab-name>/` holding a `sheet.json` and the example script the folder already has, with `meta.json` carrying the title at the category and group levels. `node tools/build-manifest.mjs --check` is what says the tree is right
  - Watch the panel fill warning. Each of the eleven is a full sheet, so each should clear the 85% floor the eleven were measured at, and a migrated document that warns is a document that lost content on the way in
  - From: Cheatsheet Catalog `->` Catalog Cleanup
- [ ] Build both dropdowns in `index.html` from `cheatsheets.json` rather than from a hand maintained `optgroup`
  - Fetch the manifest by relative path so it resolves under the `/cheatsheets/` project base path
  - Key each `option` by its slug id and take its label from the manifest title, so no path is ever derived from display text
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [ ] Hide the previously shown `optgroup` when the category changes
  - `selectCheatsheet()` only ever sets one to `display: block`, so with more than one category the example dropdown accumulates stale groups
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [ ] Remove the injected `script` element from the previous selection before appending the next one, and inject with `type="module"`
  - Each selection currently appends another `script` and never removes the last, so globals leak and collide between examples. `console.clear()` hides the symptom rather than the cause
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [ ] Remove the `javaScriptArrays/.jpg` initial `src` the markup still ships, and the `javaScriptArrays/.js` reference beside it
  - Both files were deleted on 2026.09.09 in `cec3805`, the image at 11,859 bytes, while `index.html` kept pointing at one. What the markup calls a placeholder is a live 404 on the published site, carried at `index.html` line 217
  - The endpoint is no `src` attribute at all rather than an empty one, because the composed sheet replaces this element with a container the page injects an inline `svg` into. Doing both in one change is one edit rather than two, and there is no raster left for a `src` to name
  - This is the item that makes the page import `api/cheatsheet/` for the first time. The composed box comes from the manifest entry's `width` and `height`, reserved before the sheet is composed into it
  - From: Cheatsheet Catalog `->` Catalog Cleanup

## GitHub Pages Deployment

Publish the example page as a GitHub Pages project site, deployed from an
Actions workflow on the default branch rather than from a branch or folder.
The page is a single hand written HTML file that already serves from the
repository root, so the root is the site and no generator is needed. Work
this section through the automation's GitHub Pages instructions, which own
site work however it was raised.

**Intent**: stand up the deployment that the repository has never had.

- [ ] Decide whether the eleven `javaScriptArrays` example images ship in the published artifact, now that no cheatsheet serves a raster
  - They total roughly 20 MB and are kept as reference for what the API produces, not as any cheatsheet's graphic. The page composes its sheet in the browser, so nothing in the artifact needs them except a page that shows them as examples
  - The choice is between excluding them from the upload step and linking them from the repository, or publishing them and paying the 20 MB once rather than the 250 MB the old budget was sized against

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
  - Whatever replaces it has to keep what the patch settled, and that constraint splits by which branch the probe took, because since 2026.09.10 the two branches decide differently. A probe that answers a non-2xx hides the image and the footnote together, a missing sheet meaning a missing example: `a missing cheatsheet image hides both the image and the footnote` in `tools/test-example-selection.mjs` holds that half. A probe that never answers hides neither. It hands the sheet to the image element, which shows it from its own `onload` once it has decoded one, and leaves the footnote to the example script that is fetched separately - `an unanswered probe hands the sheet over without rendering it`, `the image element shows itself once it has decoded the sheet` and `the image element hides itself when it cannot decode what got through` hold that half between them. A page opened as a `file://` URL still works, and it is the only route that reaches the unanswered branch by ordinary use
  - The `fetch` half of this item is closed. The 2026.09.09 verification measured `fetch("javaScriptArrays/SortingArrays.jpg")` from a `file://` page and it throws `TypeError: Failed to fetch`, refused by the same CORS rule that refuses the `XMLHttpRequest`. A fetch response check would reintroduce the fault the 2026.09.09 entry fixed, so the `img.onerror` route is the only one of the two left
  - Half the `img.onerror` handler already exists, added on 2026.09.09 to hide the element when it cannot decode what the probe let through. Deleting the probe means giving that handler the footnote and the missing sheet decisions the probe still holds, not writing it from nothing
  - The blank first option requests `javaScriptArrays/.jpg`, and what that resolves to changed after it was measured. The 2026.09.08 verification found a committed 72x72 image of a single white pixel value answering 200 both locally and on the published site, so the empty selection took the found branch and left a 600x600 white square that showed nothing because it matched the page background, and it concluded that no dropdown option, blank included, resolves to a 404. That file was deleted the next day in `cec3805` while the markup kept the `src`, so the blank option now answers 404 and the missing sheet branch is reached by loading the page at all. A replacement written from the old conclusion is written against a measurement this repository has since invalidated
  - A browser harness now exists, as `tools/test-page-structure-browser.mjs`, and deliberately covers none of the three rendered states this item turns on - the broken icon measured 2026.09.08, the `file://` page measured 2026.09.09, and the stalled request measured 2026.09.10. Each needs its own origin, scheme or stalling server rather than a viewport, so each belongs to whichever run replaces the probe, and the harness is there to build on. That file's header records the same boundary from its side
  - Composing the sheet in the page removes the request this probes, so the port may close this item rather than the replacement handler doing it. The states measured below still describe what the page did and are the record either way
  - The probe writes into the very console the footnote points the reader at, but only from a `file://` page. Measured 2026.09.09: one selection over http leaves the console holding the example's 17 lines and nothing else, while the same selection from a `file://` URL puts two Chromium errors ahead of them - the CORS refusal naming the image URL, and `Failed to load resource: net::ERR_FAILED` - once per selection. The page works either way; the reader following the instruction on screen meets two red lines first. Deleting the probe removes them

## Page Structure and Responsiveness

`index.html` declares its language, carries a viewport tag, links the
repository favicon, lays its two columns out as a wrapping flex row that
becomes a single column below 768px, draws itself in the design language, and
names the selected example in the image's alt text. Every text and background
pair it renders has been measured against its contrast floor, and the layout
is asserted in a real engine as well as in the source text.

**Intent**: make the published page readable on the devices that will reach
it once it is public.

Nothing is outstanding here. Two suites hold what the section settled:
`tools/test-contrast.mjs` for the pairings, and
`tools/test-page-structure-browser.mjs` for what the rules render.

## Cheatsheet Catalog

The category dropdown offers one option, and the inline configuration block
selects it on load because it is the only one. Both branches of the
`testEnvironment` condition now do the same thing apart from presetting an
example, and the image element's initial `src` still names a placeholder file
the folder no longer holds.

**Intent**: let the page carry more than one cheatsheet without hand editing
the configuration block for each.

The manifest pipeline below is the one prerequisite for every item in **New
Cheatsheets**. Half of it is in place: `tools/build-manifest.mjs` walks the
tree, composes every `sheet.json` for its box, writes the committed
`cheatsheets.json`, and gates the Pages deploy with `--check`. The catalog it
walks is empty until the eleven array examples are migrated, and nothing reads
the file yet - the page still carries its `optgroup` by hand, which is what the
items below take out.

### The Manifest Pipeline

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
- [ ] Remove the `javaScriptArrays/.jpg` initial `src` the markup still ships, and the `javaScriptArrays/.js` reference beside it
  - Both files were deleted on 2026.09.09 in `cec3805`, the image at 11,859 bytes, while `index.html` kept pointing at one. What the markup calls a placeholder is a live 404 on the published site, carried at `index.html` line 217
  - The endpoint is no `src` attribute at all rather than an empty one, because the composed sheet replaces this element with a container the page injects an inline `svg` into. Doing both in one change is one edit rather than two, and there is no raster left for a `src` to name
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

## Raster Export and Example Images

No cheatsheet serves a raster any more. The page composes its sheet in the
browser, so the page weight this section was written to cut is not carried at
all rather than carried more cheaply. What is left is the other half of the
graphic: a rendered media file, produced on demand for something outside the
page, and the eleven hand composed images the design language was measured
from.

**Intent**: keep raster output available where it is still wanted, and say what
the eleven existing images are now for.

The figures the old budget was sized against are worth keeping, because they
are what the change of course was decided on. The eleven images total roughly
20 MB, between 1.5 MB and 2.3 MB each, and at that average the roughly 120
planned cheatsheets would have come to about 250 MB, a quarter of the 1 GB
GitHub Pages limit and unreadable on a phone connection. A composed sheet
commits none of it.

- [ ] Set the export preset for a rendered post image and record it where a contributor will read it: WebP, quality 80, 1400 pixel maximum long edge, 200 KB target, 300 KB hard cap
  - This is a preset for a file something outside the page asked for, not a per cheatsheet deliverable. Nothing in the repository is measured against it, because nothing is committed to measure
  - WebP rather than JPEG specifically because these are text dense code renders, where WebP holds small glyph edges better at the same weight
  - Raise an individual render to quality 90 when its code is not legible, rather than raising its dimensions past 1400 pixels
- [ ] Keep the eleven `javaScriptArrays` images as reference examples and say in the repository what they are
  - They are what the ported API is aimed at reproducing, and the record of what a hand composed sheet looked like before one was generated. They are no longer any cheatsheet's deliverable
  - They stay as JPEG. Converting them buys nothing once no page weight depends on them, and re-encoding them re-keys the social ledger for eleven files that are not new content
  - `tools/test-sheet-composition.mjs` re-measures these exact files against the tables in `DESIGN_LANGUAGE.md`, so converting them would break the suite that holds the extraction
- [ ] Write `tools/cheatsheet.mjs`, the command line that composes a sheet and renders it to a media file
  - The flags, the two renderers and the three rules they carry are specified in `.claude/prompts/current-plan.prompt.md`
  - Resolve the browser at run time from a local install, from `PLAYWRIGHT_MODULE`, or from the user scope global, and skip with the install command as the reason when none answers, which is the pattern `tools/test-page-structure-browser.mjs` settled
  - Write the PNG into `.tmp/` and convert it to `<name>.webp` beside the cheatsheet, so `Watch: **/*.{jpg,webp}` in `.claude/constants.md` needs no change. Widening the watch to `png` sweeps in the favicon working set, measured at 46 files
  - Renders are untracked. Confirm the social tool globs the working tree rather than the commit before relying on that, since a pattern matching nothing reads exactly like a quiet day
  - **The render is named as expected output, rather than written outside the folder.** That is the answer to the question the `--check` item asks here: `sheet.*` is reserved in a cheatsheet folder, so `sheet.json` is the document and `sheet.webp`, `sheet.png`, `sheet.jpg` and `sheet.svg` are renders the tree rule lets through by name. Naming them is what makes the rule give the same answer everywhere - a render is untracked, so a rule that asked git what was committed would pass on the machine that rendered it and fail on the runner. `<name>` is therefore `sheet` for a cheatsheet folder, which is also what `.claude/constants.md` already expects of `<category>/<cheatsheet>/sheet.webp`
  - Seed the social ledger before the first bulk render, for the reason the constants give for a bulk conversion: the ledger is keyed by path, so a first run over the whole catalog would draft one post per sheet
- [ ] Raise the displayed sheet cap from 600 pixels to `min(100%, 900px)` and give the composed sheet a route to full size
  - 600 pixels is too small to read code in, which is the whole purpose of the sheet
  - An inline `svg` scales without the file size penalty that made 600 pixels a compromise, so this is now about the column's measure rather than about what a larger file costs
- [ ] Add a `graphic-designer` collaborator when a sheet composition or a rendered image is created
  - Required by the collaborators constant in `.claude/constants.md`. A composed sheet is drawn rather than captured, so the constant binds on the composition as much as on the render

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
- **Every cheatsheet folder holds a `sheet.json`**, the cheatsheet document
  the API composes the graphic from. The document is required; the demo
  payload is not. No folder commits a raster: the page composes its sheet in
  the browser through `api/graphic-design/`, and a raster is rendered on
  demand only when something outside the page asks for one, per **Raster
  Export and Example Images**.
- **A category's design language is generated once and archived once.** The
  first item in a category composes the temporary SVG, measures it into
  `DESIGN_LANGUAGE-<category>.md`, and generates the skill that draws every
  cheatsheet in that category to it. The last item moves that skill to
  `.claude/archived-skills/<category>/` and records the path on the completed
  item, so a correction to a finished cheatsheet is drawn in the same
  language as its siblings rather than in a regenerated approximation of it.
- **The sheet count** on an item says how many cheatsheets that subject
  becomes, between 1 and 8, each taking a different area of focus. It is
  scaled to the depth of the subject: a narrow one that documents in a page
  gets 1, a language that documents in a book gets 8. Three kinds of item
  carry no count - a master cheatsheet, which is one sheet by definition; a
  group heading, which makes a folder rather than a cheatsheet; and a
  `Propose` item, which already names its own number and gives each accepted
  idea a count of its own when that idea is queued.
- **`kind`** selects what the page does with the payload: `run` injects a
  browser script, `read` renders the source as text, `embed` loads
  `demo/index.html` in a sandboxed frame, `none` is graphic only.
- **`graphic-designer` is added as a collaborator** on any commit that
  creates or converts an image, per the collaborators constant in
  `.claude/constants.md`. A sheet composed as SVG is drawn rather than
  captured, so the constant binds on the composition as much as on a render.
- **Build order**: JavaScript first, because it absorbs the existing eleven
  array examples and proves the pipeline on `kind: run` alone. Then HTML/CSS,
  which forces `embed` and the first sub group. Then Programming, which
  forces `read` and the second sub group. After those three every structural
  unknown is settled and the remaining seven are content only.

### HTML/CSS

The `html-css/` category. Forces the first `embed` payloads and the first sub
group, so it is built second.

- [ ] Add the **General HTML Overview** cheatsheet at `html-css/general-html-overview/`, `kind: read`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **General CSS Overview** cheatsheet at `html-css/general-css-overview/`, `kind: read`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- **HTML APIs** is a group at `html-css/html-apis/`, carrying its own `meta.json`. Its cheatsheets follow

- [ ] Add the **Common Browser Built-in APIs** cheatsheet at `html-css/html-apis/common-browser-apis/`, `kind: embed`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Google Maps APIs** cheatsheet at `html-css/html-apis/google-maps-apis/`, `kind: embed`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - The demo must not ship an API key. Show the call shapes and let a reader supply their own
- [ ] Propose 4 new API cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **HTML/CSS Draw SVG** cheatsheet at `html-css/draw-svg/`, `kind: embed`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **HTML/CSS Use Canvas** cheatsheet at `html-css/use-canvas/`, `kind: embed`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Advanced HTML** cheatsheet at `html-css/advanced-html/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Advanced CSS** cheatsheet at `html-css/advanced-css/`, `kind: embed`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 3 new HTML/CSS cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- **Two master cheatsheets** belong to this category, because it covers two languages

- [ ] Add the **Master Cheatsheet: HTML** at `html-css/master-html/`, `kind: none`, carrying the imperative takeaways from every HTML item in this section
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Master Cheatsheet: CSS** at `html-css/master-css/`, `kind: none`, carrying the imperative takeaways from every CSS item in this section
  - Graphic: `sheet.json` required, composed through the API

### JavaScript

The `javascript/` category. Built first: the existing eleven array examples
migrate into it as the `arrays` sub group, so building this category is the
migration and the pipeline's acceptance test.

- [ ] Add the **General JavaScript Overview** cheatsheet at `javascript/general-javascript-overview/`, `kind: run`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JS Dates** cheatsheet at `javascript/dates/`, `kind: run`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JS Elements** cheatsheet at `javascript/elements/`, `kind: embed`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JS Math** cheatsheet at `javascript/math/`, `kind: run`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JS Statements** cheatsheet at `javascript/statements/`, `kind: run`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JS Objects** cheatsheet at `javascript/objects/`, `kind: run`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JS DOM** cheatsheet at `javascript/dom/`, `kind: embed`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JS Versions** cheatsheet at `javascript/versions/`, `kind: read`
  - Create `2` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - A version comparison is a table rather than a runnable script, which is why it reads rather than runs
- [ ] Propose 5 new JavaScript cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **Master Cheatsheet: JavaScript** at `javascript/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API

### Miscellaneous

The `miscellaneous/` category. The heaviest `embed` work in the roadmap, since
four of its items are complete small applications rather than snippets. Build
it once `embed` is proven elsewhere.

- [ ] Add the **Rotating Clock** cheatsheet at `miscellaneous/rotating-clock/`, `kind: embed`, built in vanilla HTML, CSS and JavaScript
  - Create `1` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Tic-Tac-Toe** cheatsheet at `miscellaneous/tic-tac-toe/`, `kind: embed`, built in vanilla HTML, CSS and JavaScript
  - Create `1` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Canvas Platformer Game** cheatsheet at `miscellaneous/canvas-platformer/`, `kind: embed`, built on `canvas` in vanilla HTML, CSS and JavaScript
  - Create `2` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Interactive Chart and Data Tool** cheatsheet at `miscellaneous/interactive-chart-tool/`, `kind: embed`, built in vanilla HTML, CSS and JavaScript with a graph library
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - Vendor the graph library into the demo folder rather than loading it from a CDN, so the site keeps its no third party guarantee
- [ ] Add the **VS Code Extension Essentials** cheatsheet at `miscellaneous/vs-code-extension/`, `kind: read`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- **MCP Essentials** is a group at `miscellaneous/mcp/`, carrying its own `meta.json`. Its cheatsheets follow

- [ ] Add the **MCP Server** cheatsheet at `miscellaneous/mcp/server/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **MCP Client** cheatsheet at `miscellaneous/mcp/client/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **MCP Host** cheatsheet at `miscellaneous/mcp/host/`, `kind: read`, covering the host or wrapper role
  - Create `2` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API

### XML

The `xml/` category. Content only once the pipeline is proven.

- [ ] Add the **General XML Overview** cheatsheet at `xml/general-xml-overview/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **XML AJAX** cheatsheet at `xml/ajax/`, `kind: embed`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **XML DOM** cheatsheet at `xml/dom/`, `kind: run`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **XML Languages** cheatsheet at `xml/languages/`, `kind: read`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **XML Data** cheatsheet at `xml/data/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 2 new XML cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **Master Cheatsheet: XML** at `xml/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API

### Web Templates

The `web-templates/` category. Every item is a static site generator, so each
payload is configuration and templating read as text rather than run.

- [ ] Add the **Hugo** cheatsheet at `web-templates/hugo/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Eleventy** cheatsheet at `web-templates/eleventy/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Astro** cheatsheet at `web-templates/astro/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Jekyll** cheatsheet at `web-templates/jekyll/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - Jekyll template syntax in a payload can be eaten by a site generator. The repository publishes with `.nojekyll`, so this is safe here, but keep the sample fenced
- [ ] Add the **Wordpress** cheatsheet at `web-templates/wordpress/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 2 new web template cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **Master Cheatsheet: Web Templates** at `web-templates/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API

### Electronics

The `electronics/` category. Mostly `none` and `read`: a breadboard cannot be
embedded, so the graphic carries nearly all the value here. Build it late,
since it blocks nothing.

- [ ] Add the **Electronic Components** cheatsheet at `electronics/components/`, `kind: none`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API. This item is graphic only, so the sheet is the entire deliverable
- [ ] Add the **555 Timer** cheatsheet at `electronics/555-timer/`, `kind: none`
  - Create `1` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API. This item is graphic only, so the sheet is the entire deliverable
- [ ] Add the **Arduino** cheatsheet at `electronics/arduino/`, `kind: read`, with a `demo.ino` payload
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Arduino Command Line Tool** cheatsheet at `electronics/arduino-cli/`, `kind: read`
  - Create `2` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 4 new electronics cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **Master Cheatsheet: Electronics** at `electronics/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API

### Hardware

The `hardware/` category. The smallest section, and like Electronics it is
`read` and `none` only, so it blocks nothing and is built last.

- [ ] Add the **Chip: 65c02** cheatsheet at `hardware/65c02/`, `kind: read`, with an assembly payload
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Dev Board: ESP32** cheatsheet at `hardware/esp32/`, `kind: read`, with a `demo.ino` payload
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 2 new hardware cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **Master Cheatsheet: Hardware** at `hardware/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API
  - The source list named a master cheatsheet twice for this category. It is written once here, which is what two identical entries can only have meant

### Server

The `server/` category. Every item is a language that does not run in a
browser, so all of them read their payload as text.

- [ ] Add the **PHP** cheatsheet at `server/php/`, `kind: read`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Java** cheatsheet at `server/java/`, `kind: read`
  - Create `7` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Python** cheatsheet at `server/python/`, `kind: read`
  - Create `7` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **SQL** cheatsheet at `server/sql/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **JSON** cheatsheet at `server/json/`, `kind: read`
  - Create `2` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **NodeJS** cheatsheet at `server/nodejs/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - Node runs JavaScript but not in the browser, so this reads rather than runs. Anything that genuinely runs in the page belongs under the JavaScript category
- [ ] Add the **Perl** cheatsheet at `server/perl/`, `kind: read`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **TypeScript** cheatsheet at `server/typescript/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 6 new server cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **Master Cheatsheet: Server** at `server/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API

### Frameworks

The `frameworks/` category. The largest by item count once its twelve
proposed ideas land. Mostly `embed`, since a framework is best shown running.

- [ ] Add the **Bootstrap CSS** cheatsheet at `frameworks/bootstrap/`, `kind: embed`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **jQuery** cheatsheet at `frameworks/jquery/`, `kind: embed`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **React** cheatsheet at `frameworks/react/`, `kind: embed`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - Vendor the library into the demo folder and use a build free form, so the site keeps working with no toolchain
- [ ] Add the **AngularJS** cheatsheet at `frameworks/angularjs/`, `kind: embed`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **AppML** cheatsheet at `frameworks/appml/`, `kind: embed`
  - Create `1` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Sass for CSS** cheatsheet at `frameworks/sass/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - Sass compiles before it reaches a browser, so this reads rather than embeds. Show the source beside the CSS it produces
- [ ] Add the **Django** cheatsheet at `frameworks/django/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 12 new framework cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
  - Twelve is the largest batch in this roadmap. Queue them in groups rather than all at once, so the category stays reviewable
- [ ] Add the **Master Cheatsheet: Frameworks** at `frameworks/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API

### Programming

The `programming/` category. Built third, because it forces the `read` payload
across compiled languages and the second sub group.

- [ ] Add the **C++** cheatsheet at `programming/c-plus-plus/`, `kind: read`
  - Create `8` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - The folder name spells the operator out, because `+` in a path is decoded as a space by some servers. The title in `meta.json` stays `C++`
- [ ] Add the **C#** cheatsheet at `programming/c-sharp/`, `kind: read`
  - Create `7` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - The folder name spells the symbol out, because `#` in a path starts a URL fragment. The title in `meta.json` stays `C#`
- [ ] Add the **Kotlin** cheatsheet at `programming/kotlin/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Go** cheatsheet at `programming/go/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **R** cheatsheet at `programming/r/`, `kind: read`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **git Command Line Tool** cheatsheet at `programming/git/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- **Command Line** is a group at `programming/command-line/`, carrying its own `meta.json`. Its cheatsheets follow

- [ ] Add the **Linux Command Line** cheatsheet at `programming/command-line/linux/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Windows DOS Command Line** cheatsheet at `programming/command-line/windows-dos/`, `kind: read`
  - Create `4` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **Windows PowerShell Command Line** cheatsheet at `programming/command-line/powershell/`, `kind: read`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Add the **MacOS Command Line** cheatsheet at `programming/command-line/macos/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 1 new command line cheatsheet idea and queue an item for it if accepted
  - Graphic: the accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **curl Command Line Tool** cheatsheet at `programming/curl/`, `kind: read`
  - Create `3` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
- [ ] Propose 9 new programming cheatsheet ideas and queue one item per accepted idea
  - Graphic: each accepted idea carries its own `sheet.json`, composed through the API
- [ ] Add the **Master Cheatsheet: Programming** at `programming/master/`, `kind: none`, carrying the imperative takeaways from every sibling in this section
  - Graphic: `sheet.json` required, composed through the API

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

The extraction itself is done and recorded under **The sheets** in
`DESIGN_LANGUAGE.md`, measured by `tools/measure-sheet-composition.mjs`, and
the page is now drawn to what it settled. Nothing is outstanding here; the
two sections below are the algorithms that draw a new sheet to the same
record.

### The Composition Algorithm

**The floors are in and no seed can cross one.** `FLOORS` in `language.mjs`
carries three, each derived from something already measured rather than chosen:
a display cap of one step, a code cap of the minimum measured spacing at the cap
share, and a panel fill of 0.85, which is the least filled panel of the eleven.
The fill floor narrows the margin as well as the spacing, because the padding is
drawn first and the two can be chosen into a corner. Contrast is checked rather
than assumed: every run is measured against the ground it was placed on through
`contrast.mjs`, and the one substitution the design language nominated is
applied. A floor is never a clamp - a run that still does not fit is left at the
floor and reported, since the floors bound what a seed may do and a document
carrying too much or too little is the document's fault.

**A category with no artwork has an asset now**, composed rather than relaxed
for. `tools/compose-language-asset.mjs` draws the regions exactly as
`language.mjs` records them and the ink to the new `CENSUS`, and writes to
`.tmp/` because it is an input to a measurement rather than an artifact.

The proportions are the point and not the colors. A role is decided from area,
so an asset carrying the right colors over the wrong areas produces a palette
that is right about its swatches and wrong about which one is the ground, and
nothing downstream can tell. The regions alone put navy at 63.2% and white at
30.9%; the census puts them at 60.97% and 28.96%, and the difference is the type
drawn over them.

**What the record could not supply is stated rather than invented.** The census
folds each ground colour together with the ink set in it - the wordmark is "in
white and green", plain code is white, the follow line is navy - so none of the
three can be drawn without splitting a figure the record does not split. They
are carried as type records and no ink, navy lands 1.27 points high as a result,
and `--report` prints the comparison. The three colours the census quantifies as
ink and nothing else land within 0.03 points. No role moves, which is what the
asset is measured for.

The type is carried as `text` with no fill, which is how one file holds both
halves: an element is a letterform or an area and not both. Without it the
analyzer measures no sizes and the generator invents a type scale, which is the
failure the asset exists to prevent.

- [ ] Compose every new cheatsheet from its `sheet.json` through the API rather than capturing a screenshot by hand

### Rendering and Conversion

**Both routes are in `api/cheatsheet/raster.mjs`**, which is Node only and kept
out of the barrel for the same reason `files.mjs` is kept out of the port's. The
caller names the route, the scale, the background and the format, and what comes
back carries a `publishable` field: never true for the built-in route, which has
no font file and strokes its own alphabet, and true for the browser route only
at or above the scale floor. `auto` prefers the browser and records the reason
when it falls back. PNG, JPEG and WebP only; GIF and TIFF are refused rather
than substituted.

One figure was read carefully rather than copied. "A scale of 2 or 3" is device
pixels per **display** pixel, and `scale` counts composition pixels, of which
there are six per display pixel - so the floor is `2 / DISPLAY_SCALE`, near a
third, and taking the roadmap figure straight would have made every published
sheet a 7200 px square.

**Text stays text**, and that is now an acceptance check rather than a property
nobody was testing. The sheet's runs reach the SVG as `text` elements, the words
are recoverable from the markup, no element in the document is a path, and a
title full of characters XML cannot carry is escaped rather than outlined.

**The algorithm is recorded**, under **Composing a sheet** in
`DESIGN_LANGUAGE.md`: what a seed moves and why those three figures are the
three the artwork left free, the order the choices are made in, the three
floors with the derivation of each, what a floor does instead of clamping, the
fitting rule, and the contrast pass. It went there rather than into
`.claude/agent-note.md`, which is transient by design - a run leaves it for the
next run and deletes it once the check is resolved.

The figures in it are read against `language.mjs` by
`tools/test-composition-algorithm.mjs`, including the worked example of the
padding ceiling, so a figure edited in one record and not the other fails
rather than drifts.

## Port the napkin-sketch Graphic Design API

A sibling repository already holds the drawing surface this roadmap was about
to write from nothing. `napkin-sketch` carries a graphic design API at
`src/core/graphic-design/`: 5,227 lines of TypeScript with no runtime
dependencies, composing rectangles, circles, ellipses, triangles, polygons,
lines, paths and text into one document and rendering it to SVG or to PNG.
Porting a reduced version of it is less work than writing an SVG generator, and
it arrives with its limits already documented.

**Intent**: give this repository a drawing surface it did not write, in the
form the page and the Node scripts can both import.

The port is what the composition algorithm above calls and what the API below
is a surface over, so it is worked before either.

**The surface itself is ported and now in the repository**, as 6,093 lines of
dependency free `.mjs` under `api/graphic-design/`: `units`, `types`, `color`,
`geometry`, `font`, `svg`, `compose`, `deflate`, `png`, `raster` and `brand`,
with `canvas` dropped and a barrel over the rest. It landed at 5,899 and the
figure has moved twice since, both times for a local edit rather than a
re-port: the face-aware `font.mjs` on 09.17, and the barrel's header on 09.19
recording why the Node only half is not exported from it. It is verified against a
bundle of the upstream TypeScript rather than against a reading of it, and
`tools/test-graphic-design-port.mjs` holds what porting cost. What is left
below is everything the port did not settle by landing.

**The Node only half landed as `api/graphic-design/files.mjs`**, holding
`writeComposition` alone: `imageDataUrl` and `mediaTypeOf` serve placed bitmaps
and the design language allows none. It is deliberately not re-exported from the
barrel, and the port's suite now holds that boundary from both sides - the
barrel does not reach it, no browser-safe module reaches it transitively, and it
imports `node:fs/promises` and `node:path` and nothing else.

**The render is pinned against committed output**, in `tools/fixtures/` and
`tools/test-render-fixture.mjs`. Two fixtures: a synthetic document exercising
every element kind, a clip and a matrix, committed in both formats in full; and
a real sheet at a named seed, whose SVG and variation report are committed in
full and whose 930 KB raster is committed as a digest. Rendering twice in one
process is checked beside them, but it is the weaker half - both renders come
from the same loaded module, so only a file on disk catches a renderer that
changed. `MCP_FIXTURE_UPDATE=1` rewrites the expectations once the new output
has been read.

**The font metrics question is settled**, which was the largest of those and
the one every composition item was waiting on. `font.mjs` now takes an optional
face and measures in it, with the built-in alphabet as the default so omitting
one reproduces the port exactly. The route taken was the committed width table
rather than letting the browser break an unmeasured block, and the figures are
in **What a generated sheet is measured in** in `DESIGN_LANGUAGE.md`. The one
consequence for the items below: this is the first local change to a ported
module, so a later diff against upstream reads `font.mjs` as upstream above the
divider in its header and this repository's below it.

**The surface and its limits are recorded in `api/graphic-design/API.md`**,
beside the barrel a caller imports, and the record is held honest rather than
reviewed: `tools/test-graphic-design-port.mjs` fails on an export with no entry,
on an entry naming a call the port does not have, and on a stated limit the port
does not enforce.

Writing it turned up a limit that was documented and not carried. An elliptical
arc was **not** refused - upstream's path tokenizer does not list `A` among its
command letters, so an arc was skipped by the scan and its seven parameters read
as coordinates of the command before it. A path with two arcs leaves fourteen
numbers, which divide evenly into pairs, so it parsed into a polyline of nonsense
with no error at all; a path with one left an odd number over and raised
`malformed path data`, naming the string rather than the command. Whether an
unsupported arc was reported came down to arithmetic. `PATH_TOKEN` now matches
the letter, which is the second local change to a ported module after
`font.mjs`, and the case that used to assert the accidental behaviour now
asserts the stated one.

**The suite is run with a bare `node --test` from the repository root**, which
is what settles the invocation for tests outside `tools/`: Node walks the tree
from the working directory, so a test written beside the module it covers is
found without the command changing. Both forms it replaced were wrong -
`node --test tools/` resolves the folder as a CommonJS module and exits, and the
glob form hands Node every `.mjs` in the folder, so it ran
`measure-font-widths.mjs`, which exits non-zero without Playwright and therefore
**failed the suite on exactly the bare clone the constraint was written for**.
`tools/test-suite-invocation.mjs` records the decision and holds the naming the
bare command depends on. Measured with Playwright hidden: 257 cases, 229 passed,
28 skipped with the install command as their reason, none failed.

**The worked examples are in `examples/`**: one document, composed through the
recorded design language and then through a second theme, with
`tools/test-worked-examples.mjs` checking the claims the README makes about
them. The pair demonstrates that the two axes are independent - a theme moves
every paint and not one coordinate, a seed moves geometry and no paint - by
composing both and comparing rather than by saying so.

**The brand bridge is `tools/build-brand-resources.mjs`**, which reads the
declaration out of the constants file and writes a `resources.md` the helper's
own parser reads correctly. All three faults are handled: the misspelled heading
is matched within an edit distance of two rather than corrected, since a
constants file is the user's; the asset folder is declared rather than the
files, so a file's own name is the slot and a key normalizing to no known
descriptor stops mattering; and only the brand section's lines are read, which
matters most for the one stray key that is itself a directory key. It writes to
`.claude/references/`, ignored, and prints the variable that points the helper
at it.

**The helper is ported too, which finishes this section.**
`ai-helper/graphic-designer/` holds the two skills, the command, the contract
file and the four scripts, at the same commit as the surface, and the README
beside them records what changed on the way in. It landed at that path rather
than anywhere else because upstream's own `graphic-design-api` skill already
addressed a script through it, so one of the paths that had to be corrected was
already correct.

The three edits the item named were all needed. The API is resolved by walking
up for `api/graphic-design/index.mjs` rather than by package name, which is what
lets the copy of `brand-resources.mjs` inside a generated skill reach the same
barrel from four folders down. The two `${CLAUDE_PLUGIN_ROOT}` paths in the
command became repository paths, and a test now resolves every path the command
names rather than trusting them. The installer and the plugin manifest did not
come across.

A fourth edit was not in the item and was load bearing anyway. The registration
records its paths relative to the folder holding `references/`, and with the
file in `.claude/references/` that folder is `.claude/` - so every path in it
resolved one level too deep and found nothing. The brand file itself has the
same shape and is searched for in the ignored folder first, which is what makes
the bridge resolve with no environment variable set.

**And one reading defect was found rather than reviewed.** `analyze-media.mjs`
matched a `font-family` attribute and a `font-family` declaration with one
pattern. They end differently - an attribute at its closing quote, a declaration
at the `;` after it - and a family with a space in its name is escaped in the
markup, so `&quot;Helvetica Neue&quot;` stopped the pattern four characters in
and the family was reported as `&quot`. Not a name anything resolves, recorded
in a design language as though measured. It is upstream's defect: every design
tool that exports a spaced family hits it.

## Implement Cheatsheet API

A cheatsheet is currently a screenshot someone took. This section replaces
that with an API: a caller describes the content and the design, and the API
composes the sheet. It has to work outside this repository as well as inside
it, so nothing in it may assume this page, this folder layout or this
category.

**Intent**: make a cheatsheet something a program composes rather than
something a person captures.

The port above is this section's prerequisite, along with the composition
algorithm under **Cheatsheet Composition Language**. The drawing surface now
exists and is ported, and what this section builds is the cheatsheet layer
over it: the document, theme and layout models the ported API knows nothing
about. `createComposition` and its element builders draw shapes; they have no
notion of a term, a signature or a section.

### The Core Model

- [ ] Define the cheatsheet document model: a title, ordered sections, and entries carrying a term, a signature and a description, independent of how any of it is drawn
- [ ] Define the theme model: palette roles, type stack and scale, spacing step, radius and stroke weight, read from `DESIGN_LANGUAGE.md` rather than hard coded
  - The roles resolve to concrete values through the ported `parseColor` and `formatColor`, so a theme and a rendered fill cannot disagree about what a color is
- [ ] Define the layout model: a named composition, its column and row grid, and the slots a section may occupy
- [ ] Map the layout model onto the ported element builders, so a slot becomes `rect`, `text` and `line` calls rather than a string of SVG
- [ ] Validate a document and a theme against their schemas, failing with the path to the offending field rather than a generic error
- [ ] Publish those three models as the API's only public input surface, so a caller composes a sheet without ever naming a renderer

### Configuration

- [ ] Accept a partial theme and merge it over the default, so a caller overrides one color without restating the palette
- [ ] Resolve every color role to a concrete value and reject any pairing below the contrast floor the design language sets
- [ ] Accept a font family list with fallbacks, and record which family a rendered sheet actually used
  - The SVG names a family it cannot guarantee, and the browser raster route resolves it to whatever that machine has. Recording what a render actually used is the only way the two are comparable
- [ ] Take design element choices - shape, curve, size, weight - as named tokens rather than raw CSS, so one document renders the same on every backend
- [ ] Load a document from JSON and from a plain object, and assume no other input format

### Renderers and Output

- [ ] Compose a document into a ported `Composition` and render it with `toSVG()`, the one canonical output every other format is derived from
- [ ] Render a document to an HTML fragment for embedding in a page
  - `toSVG()` already returns the string the page injects, so the fragment is a wrapper around it rather than a second renderer
- [ ] Return every render as raw data as well as writing a file, so a caller can embed the result without touching disk
  - The port already splits this way: `toSVG`, `toPNG` and `rasterize` return data, and only `files.mjs` touches disk
- [ ] Take the raster route from the call rather than assuming one, and say which route produced a given file
  - The ported `toPNG()` is dependency free and draws the built in alphabet; the browser route draws the real face. A file that does not say which one made it cannot be reviewed against the design language
- [ ] Write output to a named path, to a directory with a derived filename, or to an in-memory buffer
  - The ported `writeComposition(source, dir, name, options)` already covers the second and third

### Embedding the API

- [ ] Confirm the page imports `api/graphic-design/index.mjs` directly, with no build step between
  - The port delivers the dependency free ES module this item used to ask for, so what is left is the acceptance check rather than the work
- [ ] Expose a command line entry point that reads a document file and writes an output file, with the raster backend optional
  - SVG needs no browser and a raster does, which is the whole reason the backend is optional. `tools/cheatsheet.mjs` under **Raster Export and Example Images** is that entry point, and its flags are specified in `.claude/prompts/current-plan.prompt.md`
- [ ] Give the command line a data only mode that structures and orders cheatsheet content without rendering it, for callers that want the organized data rather than the picture
- [ ] Document the public API surface with one worked example per output format
  - Two formats now rather than five, since GIF and TIFF are dropped
- [ ] Cover the API with tests that render a fixture document to every format and compare against committed output
  - Rendering is deterministic in both formats, so the comparison is byte for byte rather than approximate

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
  - The mechanism is now concrete: one document composes to `toSVG()`, and the page and the media file are two renders of it rather than two code paths
- [ ] Expose a browser entry point that builds a cheatsheet section from elements found with ordinary DOM methods, for a site that will not run a build step
  - The ported renderers import nothing from Node, so this is satisfied by the port rather than needing a second build of the API. It was speculative before the port settled it
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
- [ ] Generate a composed SVG as the first supported output, the shortest path from a source to something a reader can see
  - A media file is a render of that SVG rather than a separate output, so the helper produces one thing and the export route turns it into the rest
- [ ] Generate a single webpage from the same document, once the media file output is settled
- [ ] Generate a new section for an existing website, reusing the scripted tool's insertion points rather than a second mechanism
- [ ] Generate a whole new site from one source, as the largest of the four outputs
- [ ] Validate every generated document before rendering, so a malformed generation fails at the model rather than inside a renderer
  - Validation has to know the ported limits, or a generated document can ask for what the renderer refuses: no gradients, filters or patterns, and no elliptical arc in path data
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
- [ ] Create 4 new ideas for **Raster Export and Example Images**
- [ ] Create 2 new ideas for **Repository Records**
- [ ] Create 9 new ideas for **New Cheatsheets**
- [ ] Create 6 new ideas for **Cheatsheet Composition Language**
- [ ] Create 4 new ideas for **Port the napkin-sketch Graphic Design API**
- [ ] Create 7 new ideas for **Implement Cheatsheet API**
- [ ] Create 8 new ideas for **Dedicated cheatsheet website**
- [ ] Create 5 new ideas for **AI Helper API**
- [ ] Create 3 new ideas for **Cliche Tutorial/Documentation Site to Test Cheatsheet API and Script**

## Complete

<details>
<summary>Show Details</summary>

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
  - Chromium was driven against `index.html` as a `file://` URL: `send()` does not throw, `onload` never fires, and `onerror` runs at `readyState` 4 with status 0, the console naming the CORS rule that refused it. So `onerror` is the branch that case reaches, and the `status === 0` clause inside `onload` was never the `file://` case at all. The `<img>` element is not refused the same read - it decodes the sheet from disk at 3601x3601 - and the example script still logs its 17 console lines, one for every `console.log` call in `SortingArrays.js`, so a refused probe should hide neither the sheet nor the footnote. An unanswered probe now hands the sheet to the element, the element's own `onerror` hides it when it cannot decode one, the probe rules a sheet out only on a definite non-2xx status, and the comments, both test names and the 2026.09.08 `CHANGELOG.md` entry say all of that
  - From: Code Review Override - the icon and footnote fix
- [x] Status Probe 2: the changelog credits the example script with 31 console lines it does not log
  - **Issue**: The interface half of the item is right and was verified route by route. The record of it is not. The 2026.09.09 `CHANGELOG.md` entry closes "the example logs its 31 lines with the footnote showing", and the archived **Status Probe 1** item says "the example script still logs its 31 console lines". Driving Chromium against `index.html` as a `file://` URL and selecting **Sorting Arrays**, the example logs 17 lines - every one of the 17 `console.log` calls `javaScriptArrays/SortingArrays.js` contains, counted from the source and matched against the console. 31 is the whole console after a *second* selection: 25 logged lines from two different examples, plus 2 `console.clear` markers and the 4 errors Chromium writes when it refuses the probe. Eight of those lines belong to **Slicing Arrays** and six are not output at all, so the figure names neither the example nor a single selection
  - **Goal**: Put the measured figure in both records - 17 lines from `SortingArrays.js`, which is every `console.log` in the file - rather than a session total the example did not produce. Nothing else in the entry changes: the behaviour it reports was verified and holds
  - From: Code Review Override - the icon and footnote fix
- [x] Status Probe 3: an unanswered probe leaves the image element on screen for as long as its own request takes to fail
  - **Issue**: `xhttp.onerror` now calls `settleImage(true)`, which sets `curCheatSheetImg.src` to the sheet path and `display: block` in the same breath, and the element's own `onerror` is the only thing that takes it back down. That handler runs only once the element's request has finished failing. Serve `index.html` over HTTP and stall the image request rather than dropping it - a throttled or offline network, a proxy holding the connection open, an extension blackholing the path - and the probe errors first while the element's request never completes, so `onerror` never fires and the image column sits at `display: block` showing the `cheat sheet image` alt text, with the footnote beside it. Before 2026.09.09 that state was hidden the instant the probe failed. The 2026.09.09 verification aborted the request in flight, which fails at once, so it measured the fast case only; even there the element is visible from the probe's failure until its own, which is the broken icon the probe exists to prevent shown briefly rather than not at all
  - **Goal**: Show the element only once it has decoded something on the unanswered-probe path. Give `curCheatSheetImg` an `onload` handler that sets `display: block`, and have the `xhttp.onerror` branch set the `src` while leaving the element hidden, so nothing renders until there is a sheet to render. Keep what 2026.09.09 settled - the sheet still appears on a `file://` page and the footnote still stays - and verify it in a browser, since neither the pending state nor the broken icon is a property the stub DOM can read. Add the load handler to `tools/test-example-selection.mjs` beside the failure case already there
  - From: Code Review Override - the icon and footnote fix
- [x] The probe replacement item states a constraint the code no longer meets
  - **Issue**: Under **Replace the `XMLHttpRequest` probe that decides a missing image from the response status** in **Preview Links and Example Loading**, the constraint bullet reads "a missing sheet hides the image and the footnote rather than showing a broken icon, and a page opened as a `file://` URL still works. `tools/test-example-selection.mjs` holds those as tests". As of 2026.09.09 the footnote half holds only when the probe answers. On the unanswered-probe path the footnote deliberately stays, and the test `an unanswered probe leaves the sheet to the image element` asserts exactly that. A run implementing the item from that bullet either recouples the footnote to the image, undoing this turn's fix, or reads the tests it cites and finds them contradicting the constraint they are said to hold
  - **Goal**: Split the constraint by path: a probe that answers a non-2xx hides the image and the footnote together, while a probe that never answers hides neither, leaving the sheet to the element and the footnote to the example script that loads separately. Name the test holding each half
  - From: Code Review Override - the window before the element gives up
- [x] The 2026.09.10 changelog entry credits the stall with a symptom only a finished failure produces
  - **Issue**: The entry says the pre-change page left "the empty box and its `cheat sheet image` alt text ... on screen for as long as the stall lasted". Driving Chromium against a server that drops the probe and holds the image element's request open, the pre-change page paints nothing at all for the whole stall: `#curCheatSheetImg` sits at `display: block` in a 600x0 box, 358x0 at 390px wide, because `height: auto` on a request still in flight has no intrinsic size to resolve against. No alt text and no broken icon is drawn, and its column stays 0 tall, so full page captures of the pre and post change pages under the same stall are byte identical at 1280x900 and at 390x844. The 600x18 with alt text this describes is the state after the element's request has finished failing, which is the 2026.09.08 measurement recorded under **Page Structure and Responsiveness**, not the window the fix addresses. The same paragraph's own `display: block` at 600x0 is exact and contradicts its alt text sentence, since a 0 tall box has nothing to draw text in
  - **Goal**: Rewrite that one sentence to the state that was measured - the element stayed shown having decoded nothing, holding a 600x0 box for as long as the stall lasted - and drop the claim that a reader saw alt text, keeping the rest of the entry as it stands
  - From: UI/UX Override - the stalled sheet paints nothing
- [x] The test named for the image element hiding itself no longer has anything to hide
  - **Issue**: `the image element hides itself when it cannot decode what got through` in `tools/test-example-selection.mjs` calls `fail(page)` and then the element's own `onerror`, and asserts `display` is `none`. Before 2026.09.10 `fail(page)` left the element at `block`, so the assertion measured the handler taking it down. It now leaves the element at `none`, so the same assertion holds whatever the handler does short of showing the element: emptying `curCheatSheetImg.onerror` to `function() {}` in `index.html` and running the file leaves all 13 cases passing, measured on 2026.09.10. The path where the handler still decides the outcome has no case at all - the probe answers 200, `settleImage(true)` shows the element before anything is decoded, and what arrives is not an image, which a truncated `.jpg` and the 200 HTML a single page host answers an unknown path with both produce
  - **Goal**: Add a case that answers the probe with `respond(page, 200)`, asserts the element is shown, then calls its `onerror` and asserts it is hidden, so the handler is measured on the branch that still shows the element first. Keep the unanswered branch case, and give it an assertion that fails when the handler stops hiding rather than one the starting state already satisfies
  - From: Code Review Override - the same symptom in the code comments
- [x] The stall symptom the changelog is being corrected for was written into two code comments as well
  - **Issue**: The queued **UI/UX Override - the stalled sheet paints nothing** corrects one sentence of the 2026.09.10 `CHANGELOG.md` entry, but the same claim went into the code in the same turn and no item reaches it. `index.html` says of the branch it replaced "Showing it here put the alt text on screen from the moment the probe failed until the element's own request finished failing", and `tools/test-example-selection.mjs` says "Showing it at this point left the alt text on screen for as long as the element's own request took to fail". Both describe the in flight window, and both name a symptom it does not produce: the run's own measurement in `.tmp/ui-ux/log-entry-0910.txt` is that a request still in flight leaves the element no intrinsic size, so `height: auto` resolves to 0 and the pre-change page held a 600x0 box that painted nothing - no alt text, no broken icon, the captures byte identical to the fixed page. Correcting the changelog alone leaves the claim standing in the two files a reader checks first, and the source comment is the one a later run copies from
  - **Goal**: Rewrite both comments to the state that was measured - the element stayed shown having decoded nothing, holding a zero height box for as long as the stall lasted - in the same terms the changelog sentence is rewritten to, so the three records say one thing. Change nothing else in either comment: what each says about which branch shows the element, and when, was verified and holds
  - From: Code Review Override - the same symptom in the code comments
- [x] Extract the repeating composition patterns from the eleven `javaScriptArrays` images and record them in `DESIGN_LANGUAGE.md`
  - Name each region the sheets reuse - title band, code block, annotation, footer - and give each its measured position and proportion
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [x] Count the colors across the eleven images and record the repeating ones with each color's share, beside the palette already sampled from `mark.png`
  - Say plainly where a sheet color and a site color disagree, rather than averaging them into one value
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [x] Extract the text from the images and identify the repeating font families, recording each with the role it carries
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [x] Extract the text placement from the images and record which composition region each run of text falls into
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [x] Turn the measured placement into the margin and padding tokens future cheatsheets are drawn to
  - One token set, expressed in the same 8px step the site already uses, so a generated sheet and the page around it agree
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [x] Apply what the extraction settles to the site's own stylesheet, so the page and the sheets it displays read as one design
  - The sheets' own palette is not the site's: their heading grey `#414143` is 35 units from the site's slate, and their green reaches only 2.80:1 on white, which is the pairing **The one substitution** already forbids. The stylesheet takes the site values, not the sheets'
  - The 8px step is common ground. The sheets' five vertical bands land on it and close exactly at the display width, so the page's spacing and a sheet's bands can share one rhythm
  - Applied as custom properties: the five palette roles, the four type steps, `--space-1` through `--space-4` and the 4px radius, with a `prefers-color-scheme: dark` block restating the four colors that change. Two layout facts came out of it that a source text test could not have found - a padded control given `max-width: 100%` overflows its container without `box-sizing: border-box`, and the panel column's 360px flex basis is not a minimum, so the widest dropdown option can wrap the row before the breakpoint has decided
  - From: Cheatsheet Composition Language `->` Extracting the Language from the Images
- [x] Check every text and background pair in the stylesheet reaches 4.5:1 contrast, or 3:1 for large headings
  - Twenty four pairings, twelve in each theme, every one clearing its floor. `tools/test-contrast.mjs` is the audit and re-runs it: it reads the tokens out of the stylesheet's own custom properties, makes each pair name the rule that declares it, and refuses a hex that appears in no table in `DESIGN_LANGUAGE.md`
  - One figure came out of it that the design language had not recorded: `#6F6F8C` reaches 4.05:1 on the navy ground against 4.57:1 on the off white, so it draws every edge in both themes and no glyph on the dark one
  - From: Page Structure and Responsiveness
- [x] Give the cheatsheet image an `alt` value naming the selected example rather than the generic `cheat sheet image`
  - The alt is taken from the chosen option's label rather than from its value. The two are not the same string on every option - "Shift And Unshift" is selected by the value "shift And Unshift" - because the value is what the file path is built from, and announcing it would read a file name out
  - The markup ships an empty alt. Nothing is selected on a fresh load, so there is no example for it to name
  - From: Page Structure and Responsiveness
- [x] Decide whether a browser driven layout test belongs beside `tools/test-page-structure.mjs`, and add it if so
  - **Decided yes**, and added as `tools/test-page-structure-browser.mjs`. The dependency question is answered rather than traded off: nothing is added to the repository, Playwright is resolved at run time from a local install, from `PLAYWRIGHT_MODULE`, or from the user scope global, and every case is skipped with the install command as its reason when none of the three answers. A bare clone still passes the suite, and a machine with a browser gets the assertions. The page is served from a throwaway `node:http` server on an ephemeral port, so the run needs no `php -S` and no network
  - It asserts both column tops equal at 1280px with the image starting 32px past the panel column; exactly one change of shape between 1280px and 360px, at 768px to 767px; `scrollWidth` equal to `clientWidth` at 390px; and the tools panel travelling the full distance of a scroll rather than holding its place. The scan found no width between 1280 and 360 where the image leaves its column or the page scrolls sideways. It also settles the two states the 2026.09.07 verification named: `#showFootNote` computing to `display: block` on the first selection of a freshly loaded page, and `favicon.ico` decoding 48x48 square at 36.89% navy, 30.60% green and 12.72% white
  - The three image loading states are deliberately not in it. Each needs its own origin, scheme or stalling server rather than a viewport, so each is recorded against the probe replacement item that changes the code they describe
  - From: Page Structure and Responsiveness
- [x] The page's body face and the sheets' face are two different typographic systems
  - **Issue**: `DESIGN_LANGUAGE.md` loads no family, so `body` falls to the browser default and `getComputedStyle(document.body).fontFamily` resolves to `"Times New Roman"` - the page renders with serifs, including both `<select>` controls through `font: inherit`. The sheets beside it are set throughout in what the record itself calls a bold condensed grotesque. The color and the 8px rhythm carry the pairing; the type does not, and the page reads as a different document from the artwork it displays
  - **Goal**: Resolve to [page-face-decision.prompt.md](.claude/prompts/page-face-decision.prompt.md)
  - From: UI/UX Override - the visual surface of index.html
- [x] The framed sheet stops up to 176px short of its own column between 1025px and 1280px
  - **Issue**: `div.col:last-child` is `flex: 1 1 320px` and grows to the remaining width while `div.col img` is capped at `max-width: 600px` and left aligned, so the page's visible content ends well left of its measure and the composition sits off centre. It is worst at exactly 1200px, the width `body { max-width }` is set to. The geometry predates this run - `git show HEAD:index.html` carries both rules - but the 1px frame the run added is what makes the column's real extent legible, so the frame surfaced it rather than caused it and should stay
  - **Goal**: Resolve to [sheet-column-measure.prompt.md](.claude/prompts/sheet-column-measure.prompt.md)
  - From: UI/UX Override - the visual surface of index.html
- [x] Verify GitHub Pages answers a `.mjs` request with a JavaScript media type before the page depends on importing one
  - First, and before a line is ported. A module script served as `application/octet-stream` is refused, and the whole in browser route fails after the port is written. The fallback renames every ported file, so measuring it afterwards means renaming thousands of lines rather than choosing an extension
  - Measured 2026.09.15 against this repository's own published site: `tools/test-contrast.mjs` and `tools/measure-sheet-composition.mjs` both answer `200` with `content-type: text/javascript; charset=utf-8`, which is a JavaScript MIME type under the HTML specification. `.mjs` stands, and the `.js` rename with `api/package.json` is not needed. `tools/test-pages-media-type.mjs` holds the measurement and skips with its reason when there is no network
  - From: Port the napkin-sketch Graphic Design API
- [x] Port the surface to `api/graphic-design/` as dependency free `.mjs`, with no build step and no `package.json`
  - A top level `api/` rather than `tools/`, because the page imports this at run time and everything in `tools/` is a Node only script the published site never loads. No build step, so the local `php -S localhost:8000` workflow keeps working without Node
  - `tools/test-graphic-design-port.mjs` holds the three properties porting cost rather than the drawing upstream already settled: every import is a sibling with its extension, nothing reads `node:`, `require` or `process`, and there is no `package.json` or build output in the tree
  - From: Port the napkin-sketch Graphic Design API
- [x] Port `types`, `units`, `color`, `geometry`, `font`, `svg`, `compose`, `raster`, `png`, `deflate` and `brand`, and leave `canvas` behind
  - `brand.mjs` carries `parseResources`, `descriptorFromFilename`, `placeBrand`, `brandMark` and `inlineSvg`, which the design language helper calls at run time, so it is the brand resource convention rather than logo detection. `canvas.ts` is the only drop
  - `types.ts` and `raster.ts` import `toPx` from `../units.js`, one folder above the tree being ported, so the port is not self contained as the folder listing suggests
  - Landed as 5,899 lines of `.mjs` from 5,041 lines of TypeScript, rather than the 4,400 to 4,700 the estimate carried. The port is larger than its source rather than smaller, because a JSDoc typedef and a `@param` per argument cost more lines than the inline annotations they replace; `types.mjs` alone is 335 lines of documentation and five constants
  - Verified against the source rather than against a reading of it: the sibling repository's own esbuild bundles `src/core/graphic-design/index.ts` into a module with the same surface, and 131 comparisons across every module agree, including two identical SVG strings and two identical 37,450 byte PNG files
  - From: Port the napkin-sketch Graphic Design API
- [x] **Upstream Notice**: Carry the upstream license notice into the port
  - `napkin-sketch` is MIT and this repository is CC0 1.0. Copied source keeps its notice
  - Carried per file rather than as a single notice at the root, because a module read on its own is the way any of these will actually be read. Every one of the twelve opens by naming the upstream file it came from and `napkin-sketch (MIT, isocialPractice)`, and `tools/test-graphic-design-port.mjs` fails if one of them stops saying so
  - From: Port the napkin-sketch Graphic Design API
- [x] Record the source commit the port was taken from, so a later run can diff the two rather than guess
  - `d43caac191b2dfd532b3311f4ca1ea6969bb002f`, `update: version 4.2.2-alpha`, dated 2026.09.14. It sits in the same header line as the licence notice in all twelve modules, and the same test holds it there, so the commit is recorded beside the code it describes rather than in a file that can drift from it
  - From: Port the napkin-sketch Graphic Design API
- [x] Upstream Notice 1
  - **Issue**: what landed is an attribution line, not a notice. Every module opens with ``Ported from `src/core/graphic-design/<file>.ts` in napkin-sketch (MIT, isocialPractice), commit d43caac191b2dfd532b3311f4ca1ea6969bb002f``, which records provenance and the diff point but carries neither the copyright line nor the permission text. MIT asks for both in "all copies or substantial portions", and 5,899 lines is a substantial portion. Meanwhile the repository's own `LICENSE` is CC0 1.0 with nothing scoping it, so the file that governs the tree waives rights over code held under different terms. The failing state is concrete: a reader, or GitHub's own licence detector, takes `LICENSE` at its word and redistributes `api/graphic-design/` as public domain
  - **Goal**: carry the notice itself, not a pointer to it. Decide where it lives before writing it, because the obvious spot is closed: `tools/test-graphic-design-port.mjs` asserts `readdirSync(portDir)` equals the twelve module names exactly, so an `api/graphic-design/LICENSE` fails the suite on arrival. A root `NOTICE`, or a scoping paragraph in `LICENSE`, avoids that and says the same thing. Whichever is chosen, the per-file headers stay - they are what makes a later diff against upstream possible, and that is a separate job from licensing
  - From: Port the napkin-sketch Graphic Design API
- [x] The suite forbids the next file the roadmap asks for
  - **Issue**: `tools/test-graphic-design-port.mjs` line 63 asserts `assert.deepEqual(files, PORTED)`, where `PORTED` is the twelve names on disk today. **Keep the Node only helpers in `api/graphic-design/files.mjs`** sits four items below this one under the same heading, so the run that works it creates the thirteenth file and turns the suite red on a case that has nothing to do with what it changed. The test's own comment names `files` as "the Node-only half and is its own queued item", so the collision was foreseen and left in
  - **Goal**: settle whether that is a tripwire or an oversight, and make the file say which. If the exact list is deliberate, add a line to the case saying that a new module is expected to update `PORTED` by hand. If it is not, assert that `PORTED` is a subset of what is there and that every extra entry is a `.mjs` - the neighbouring cases already forbid `canvas`, a `package.json` and build output, which is most of what the exact match was buying
  - From: Code Review Override - what the port carried in with it
- [x] The colour guarantee holds in the renderer this repository will not use
  - **Issue**: `tools/test-graphic-design-port.mjs` titles a case "an unrecognised colour fails where the swatch is written" and then asserts only that `api.parseColor("nosuchcolour")` raises in isolation. In a composition it does not fail where the swatch is written. `design.rect({ fill: "nosuchcolour" })` returns normally, and `toSVG()` returns normally with `fill="nosuchcolour"` in the markup, which a browser drops on the floor and paints black. Only `toPNG()` raises, because only the rasterizer has to turn the name into numbers. That is upstream's deliberate design - `color.mjs` says the SVG writer passes colours through because a browser is the better parser - but it lands badly here, because the page composes its sheet as inline SVG in the browser, so the one renderer this repository ships is the one that never checks a swatch. A misspelled token in a generated sheet is a black region and no error anywhere
  - **Goal**: either give the case a name that matches what it asserts, or give the claim something that makes it true - a validation pass over a document's paints, called before `toSVG`, that raises the same error the rasterizer would. The second is the useful one and it is cheap: `parsePaint` already exists and the element walk already exists. Settle it before **Write the composition algorithm**, which is what will start generating paints rather than writing them by hand
  - From: Code Review Override - what the port carried in with it
- [x] Give the ported `font.mjs` the sheets' own metrics rather than the built in alphabet's
  - The display face is not nameable from the artwork - it matches none of the 481 fonts surveyed - so the generator is given the four measured cap heights rather than a family. The code face is proportional, not monospaced, so its code must not be set to a grid
  - Upstream `measureText` measures the built in alphabet, not the named family, so text laid out run beside run in a proportional family overprints in the SVG while looking right in the raster. Settle which of the two routes answers it before the composition algorithm depends on either
  - From: Port the napkin-sketch Graphic Design API
- [x] Write the composition algorithm: given a cheatsheet document and the extracted language, produce a composition variation
  - The language is recorded under **The sheets** in `DESIGN_LANGUAGE.md`: six regions down the canvas, three across it, one token set at the 8px step, and four measured type sizes that are not a scale. A generated sheet composes at 3600, not 3601 - 3600 is 75 whole steps and the extra pixel is export rounding
  - From: Cheatsheet Composition Language `->` The Composition Algorithm
- [x] Make every variation deterministic from a seed, so one can be reproduced, reviewed and regenerated identically
  - The ported renderers are pure: one document renders to identical bytes every time, in both formats. So the seed is the only thing a variation turns on, and determinism is a property of the composition rather than of the renderer
  - From: Cheatsheet Composition Language `->` The Composition Algorithm
- [x] Constrain every variation to the extracted margins, spacing and contrast floors, so no seed can produce an unreadable sheet
  - The algorithm and the seed landed on 09.17 and left two things for this item. A short example fills under half the panel and the composition only reports it, as `variation.panelFill`; and a run that overflows is stepped down with no floor under how small it may get
  - The contrast half is already data rather than work: `language.mjs` carries the floors and the green that may carry text on a white ground, and nothing yet checks a composed pairing against them
  - From: Cheatsheet Composition Language `->` The Composition Algorithm
- [x] Keep the Node only helpers in `api/graphic-design/files.mjs`, separate from everything the page imports, so no renderer drags `node:fs` into a browser
  - Keep `writeComposition`. Drop `imageDataUrl` and `mediaTypeOf`, which exist for placed bitmaps, and the design language allows none
  - From: Port the napkin-sketch Graphic Design API
- [x] Cover the port with a test that renders a fixture document twice and compares byte for byte
  - Upstream rendering is pure and deterministic in both formats, and that property is what makes a generated sheet reviewable and a seeded variation reproducible
  - There is a fixture now that there was not before: a composed sheet at a named seed. `tools/test-composition-algorithm.mjs` already compares two renders of one document in the same process, so what is left here is the committed expected output that survives a process
  - From: Port the napkin-sketch Graphic Design API
- [x] Render a composed SVG to a raster, taking the route, the scale and the background from the call
  - Two routes exist and only one is publishable. The ported `toPNG()` is dependency free and draws its text in a built in single stroke alphabet, so it is a shape level regression target rather than a sheet anyone sees. A published or posted raster goes through a real engine, in the face the design language measured
  - Small raster text needs a scale of 2 or 3. A stroke thinner than a device pixel anti-aliases to grey
  - GIF and TIFF are dropped. Neither has a consumer here, and the social recipe in `.claude/constants.md` publishes `jpg` and `webp`
  - The face the real engine draws in is settled now, and `tools/test-sheet-faces-browser.mjs` already resolves a browser at run time and skips with the install command as its reason, which is the pattern the route selection wants
  - From: Cheatsheet Composition Language `->` Rendering and Conversion
- [x] Keep reference text as real characters in the SVG rather than converting it to paths, so a sheet stays selectable, searchable and translatable
  - The ported `svg.mjs` emits live `text` already, so this is a constraint on how the composition calls the API rather than something to write
  - `compose.mjs` calls only `text` for every run, so this is an acceptance check and a case that fails if a later change starts emitting outlines
  - From: Cheatsheet Composition Language `->` Rendering and Conversion
- [x] Record the ported surface and every limit it carries where a caller will read it
  - The limits are load bearing: no gradients, filters or patterns; solid paint, opacity and clipping masks only; and an elliptical arc `A` in path data is refused rather than quietly losing a corner
  - The sheets' 4px radius is a rounded rectangle, which `rect` draws with `rx`, so nothing composed so far needs an arc
  - Two limits landed since the item was written and belong in the same record: the port refuses a paint it cannot read where upstream passes it through, and `files.mjs` is Node only and deliberately absent from the barrel
  - From: Port the napkin-sketch Graphic Design API
- [x] Record the algorithm each of the steps above settles on, where the next run will read it
  - Unblocked now. The item names "each of the steps above" and the raster step was the one still queued; with the routes in `api/cheatsheet/raster.mjs` all three are settled, so this is the one pass the roadmap held it for rather than two halves
  - The renderer half and the font route half are already recorded. What is left is the composition's own record: what a seed moves, what it may not, the three floors and why each is the figure it is, and why the three free figures are the three the artwork left free
  - It belongs in `DESIGN_LANGUAGE.md`, not in `.claude/agent-note.md`, which is transient by design
  - From: Cheatsheet Composition Language `->` Rendering and Conversion
- [x] Settle how the suite runs once tests live outside `tools/`, and fix or correct the invocation the test files document
  - That invocation is still broken. `tools/test-page-structure-browser.mjs` records the constraint that `node --test tools/` "has to work on a clone with nothing installed", and on Node 24.1.0 it resolves `tools` as a CommonJS module and exits with `Cannot find module`. `node --test tools/*.mjs` passes all 217 cases, so it is the documented invocation that is wrong rather than the tests
  - More pressing than it was. `tools/fixtures/` now holds a folder of non-test modules inside the folder the glob sweeps, and the suite carries a full size raster encode, so what the invocation includes and what it costs both matter
  - Whatever replaces it keeps what that file settled: a bare clone with nothing installed still runs the suite, and a case needing a browser skips with the install command as its reason
  - From: Port the napkin-sketch Graphic Design API
- [x] Build the worked examples that show what the port produces and how it is reconfigured
  - Reproduce one existing `javaScriptArrays` sheet from a document, then restyle that same document through a second theme. That pair is what the eleven kept images are for, per **Raster Export and Example Images**
  - Unblocked by the raster route: an example that reproduces a sheet has to be able to produce a comparable raster, and `rasterizeSheet` is what produces one in the face the design language measured
  - From: Port the napkin-sketch Graphic Design API
- [x] Bridge the brand resources recorded in `.claude/constants.md` to the `resources.md` the helper reads
  - Nothing reads the constants section today. The helper reads a `resources.md`, and this repository has none, so the bridge is work rather than an assumption
  - Three faults to handle: the heading is misspelled, so anything matching the correct spelling finds nothing; the footer asset is declared under a key that normalizes to a descriptor no composition asks for, which declaring the folder instead fixes by making the file name the slot; and pointing the parser at the constants file directly would also read every other `- key: value` line in it as a brand slot
  - Register the helper against a folder inside `.claude/`, which is ignored. Its default is a tracked folder at the repository root, and the brand values are a real domain, a real name and a real tagline
  - Queued ahead of the helper itself, which cannot be configured until the bridge exists
  - From: Port the napkin-sketch Graphic Design API
- [x] Port the design language helper: its two skills, its command and its contract file
  - It is prose apart from four scripts, and those four are what make it work. They measure an asset, resolve a `resources.md` into placeable assets, and generate a per asset skill
  - Three edits are needed on the way in. Re-point the API loader in the two scripts that resolve the drawing API by package name, since no package exists here. Correct the two paths that address the scripts through a folder this repository does not have. Do not port the installer, which can only write into a dot folder of its own repository
  - The helper depends on the ported `brand.mjs` at run time. A loader that cannot find the API must say so, because an unconfigured brand is filled with a mark drawn in the design language rather than left as a hole, so a broken path looks like a result
  - Unblocked now. `tools/build-brand-resources.mjs` writes the `resources.md` the helper reads, to `.claude/references/`, and prints the `NAPKIN_BRAND_RESOURCES` assignment that points it there. Configure the port against that rather than against the tracked folder the helper defaults to
  - This is the last item in its section. Closing it is what settles **Add links to `napkin-sketch`** in `.claude/user-note.md`, which has been waiting on the port being complete since 09.15
  - Landed at `ai-helper/graphic-designer/`, mirroring the upstream layout, which is what keeps the one path in the `graphic-design-api` skill that already addressed a script correct. The three edits were made and a fourth was needed: the registration's own root, which reads one folder too deep when the file sits in `.claude/references/`
  - From: Port the napkin-sketch Graphic Design API
- [x] Compose a temporary SVG from the recorded tokens, so a category with no artwork still has something to measure a design language from
  - The helper measures an asset and refuses to invent a value the asset did not give it. A category that has not been built has no asset, so one is composed from **The sheets** in `DESIGN_LANGUAGE.md` and measured back. The per category language is then a derivation of the global record rather than a second opinion about it
  - It must reproduce the recorded region proportions, not only the recorded colors. A vector palette is weighted by usage and a raster palette by area, and roles are decided from area, so the right colors in the wrong proportions produce the right palette with the wrong roles and nothing downstream can tell
  - Write it to `.tmp/`. It is an input to a measurement rather than an artifact
  - Queued with the helper rather than with the rest of its own section, because the helper is what consumes it and neither can be checked without the other
  - `tools/compose-language-asset.mjs`, drawn to the new `CENSUS` in `language.mjs`. Composing it also turned up the one thing the record could not supply: the census folds each ground colour together with the ink set in it, so three runs are carried as type and no ink and the drift that leaves is stated rather than closed with an invented split
  - From: Cheatsheet Composition Language `->` The Composition Algorithm
- [x] `--report` prints at one scale and the figures it prints contradict the file it is in
  - **Issue**: `tools/compose-language-asset.mjs` documents `--report` as printing "the comparison at any scale", and `run()` calls `reportShares(composition)` with no scale, so the flag only ever prints the 0.25 default. `node tools/compose-language-asset.mjs --report` reports the heading grey 0.09 points off the census and the comment grey 0.06, where the same file's header and the `2026.09.21` changelog entry both say the three ink colours land "within 0.03 points". Both sets of numbers are right - 0.03 is the full size reading - but the only command a reader has prints the ones that read as a three-fold drift
  - **Goal**: give the CLI a `--scale` flag that reaches the argument `reportShares` already takes, default it to the scale the documented figures were measured at, and have the report name the scale it used so the two records cannot be compared at cross purposes
  - From: Code Review Override - the language asset and the helper port
- [x] `NOTICE` credits a port note to a file that does not carry one
  - **Issue**: the `ai-helper/graphic-designer/` paragraph says "The four scripts name the upstream file they came from and record what changed on the way in". Three do. The fourth entry in `scripts/` is `template.md`, which is a fill-in procedure and carries no port header, so a reader checking the licence scoping against the tree finds the claim short by one
  - **Goal**: either count the three `.mjs` scripts the sentence is actually true of, or give `template.md` the same upstream-and-commit line the other three carry. `NOTICE` is the file the CC0 waiver is scoped by, so the claim in it should be checkable
  - From: Code Review Override - the language asset and the helper port
- [x] A theme inherits the sheets' census and nothing says it is stale
  - **Issue**: `CENSUS` joined `SHEET_LANGUAGE` in `api/cheatsheet/language.mjs`, and a theme is built by spreading that object. `examples/ember-theme.mjs` replaces `colors` and `syntax` and inherits `census`, so `emberTheme.census` names `#000132`, `#4DAE51`, `#B4BEC8` and `#ADF8B7` - four colours the ember theme never draws - while declaring itself `@type {typeof SHEET_LANGUAGE}`. Nothing reads `language.census` today, so nothing fails yet; `tools/compose-language-asset.mjs` reads the module level `CENSUS` rather than a language it was handed, which is why the first consumer to compose an asset for a themed category gets the sheets' palette back
  - **Goal**: decide which of the two a census belongs to and make the code say so - either derive the shares from the language passed in, so a theme's census follows its own palette, or move `CENSUS` out of `SHEET_LANGUAGE` and leave it a record of the eleven sheets alone. Have `tools/compose-language-asset.mjs` take its census from wherever that lands rather than from the module
  - From: Code Review Override - the language asset and the helper port
- [x] Write `tools/build-manifest.mjs`, a dependency free Node script that walks the cheatsheet tree and emits `cheatsheets.json` at the repository root
  - Treat any folder holding `sheet.json` as a cheatsheet, read the `meta.json` at each level for its title and order, detect the payload by extension, and record each document's composed width and height
  - The recorded dimensions are what stops layout shift. The page reserves the composed box from the manifest before it composes the sheet into it, which is the job the image's `width` and `height` used to do when a sheet was a file the page fetched
  - Commit `cheatsheets.json` rather than building it at deploy time, so the local `php -S localhost:8000` workflow keeps working without Node
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [x] Add a `--check` mode to the same script that exits non zero on a broken tree
  - Fail on: a missing, unparsable or invalid `sheet.json`, or a missing title; a `kind` that contradicts what is on disk; a path segment that is not lower case kebab ASCII, or whose on disk casing differs byte for byte; depth greater than three; a duplicate id; a `sheet.json` whose composition falls outside the extracted margins; an unreferenced file in a cheatsheet folder; and a committed `cheatsheets.json` that differs from freshly generated output
  - The unreferenced file rule has to let a rendered raster through, or it fails a tree the export command line just wrote into. Either name a render as expected output or write it outside the cheatsheet folder, and say which under **Raster Export and Example Images**
  - The casing check is the one that matters most: Pages serves from a case sensitive filesystem while the work happens on Windows, so a casing mismatch passes locally and 404s only in production
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [x] Run `--check` from a CI workflow that the Pages deploy job depends on, so a broken manifest cannot publish
  - Any new file under `.github/` needs `git add -f` on this machine, for the reason recorded in the archived Pages items
  - From: Cheatsheet Catalog `->` The Manifest Pipeline

</details>
