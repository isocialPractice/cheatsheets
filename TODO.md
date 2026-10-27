# TODO

Planned work for this cheatsheet example repository. `## Current` holds the
next items to complete, in order; the level 2 sections below it are the
roadmap those items are drawn from.

This project is in **dated mode**. It has no releases and no tags, its source
is browser based, and it exists to hold and demonstrate learning examples. No
section applies a version, so each states its intent instead. `CHANGELOG.md`
keys its entries by date, written `YYYY.MM.DD`.

## Current

- [ ] Define the cheatsheet document model: a title, ordered sections, and entries carrying a term, a signature and a description, independent of how any of it is drawn
  - Thirty-three readers of the provisional shape exist as of 2026.10.27, and five of them are not regenerable: `index.html`, `api/cheatsheet/compose.mjs`, `tools/test-render-fixture.mjs`, `tools/cheatsheet.mjs` and `tools/test-cheatsheet-cli.mjs`. The other twenty-eight are the `sheet.json` documents and can be rewritten by a script. The page is the one with no marker saying its shape may change; `tools/cheatsheet.mjs --data-only` already emits `shape: "provisional"` beside the document it returns, which is the migration point to keep
  - The provisional shape has two validated fields to inherit rather than invent: `title` must be a non-empty string and `language` must be a string, `null` or absent, both refused by `composeSheet` in this layer's own words. A `kind` has a reader outside the document - `detectPayload` reports `embed` from a `demo/` folder alone and `--check` fails a document that disagrees - so the model inherits one field whose authority is the filesystem
  - From: Implement Cheatsheet API `->` The Core Model
- [ ] Define the theme model: palette roles, type stack and scale, spacing step, radius and stroke weight, read from `DESIGN_LANGUAGE.md` rather than hard coded
  - The roles resolve to concrete values through the color parser `api/cheatsheet/contrast.mjs` carries, since the package's root entry exports none, so a theme and a rendered fill cannot disagree about what a color is
  - From: Implement Cheatsheet API `->` The Core Model
- [ ] Define the layout model: a named composition, its column and row grid, and the slots a section may occupy
  - Two rulers, not one, per **What a generated sheet is measured in** in `DESIGN_LANGUAGE.md`: a width that decides where ink goes is `drawnWidth` and a width that decides whether ink fits is `measureRun`. Every run the model places inherits that division
  - Ordering takes a chain rather than a number, since 2026.10.23: an `order` in a `meta.json` ranks a folder among its own siblings only, so a sheet's place is its group's order and then its own
  - An indent inside a `code` line is a nesting level and never a column, per **An indent is a level, and a column is not addressable** in `DESIGN_LANGUAGE.md`. The rule governs the drawn panel and not the payload file beside it, which is read in a monospace editor - so a model that owns whitespace owns it for one of the two artifacts, which is a thing to decide rather than discover
  - From: Implement Cheatsheet API `->` The Core Model
- [ ] Map the layout model onto the package's element builders, so a slot becomes `rect`, `text` and `line` calls rather than a string of SVG
  - `tools/cheatsheet.mjs` holds `--layout` open for this: it recognises the flag and refuses it, saying a named layout is this model's. Satisfying the flag is part of the item
  - From: Implement Cheatsheet API `->` The Core Model
- [ ] Validate a document and a theme against their schemas, failing with the path to the offending field rather than a generic error
  - From: Implement Cheatsheet API `->` The Core Model

### UI/UX Override - the framed demo's dialog

#### Resolve Issues

- [ ] Sandboxed Demo Frame 1: the framed dialog cannot be closed by either of its own buttons
  - **Issue**: found 2026.10.27, driving the five demos through the frame in Chromium over HTTP. `sandbox="allow-scripts"` withholds form submission, and `html-css/html-apis/clipboard-and-dialog/demo/index.html` closes its dialog with `<form method="dialog">`. Framed, **Keep** and **Discard** do nothing: the dialog stays open, `returnValue` stays `""`, no line is written, and Chromium logs `Blocked form submission to '' because the form's frame is sandboxed and the 'allow-forms' permission is not set.` on each press. Escape is the only way out and reports `that was Escape, which chose nothing` - to a reader who just pressed **Keep**. The same two buttons work in the demo's own tab and work framed under `allow-scripts allow-forms`, so the demo is right and the grant is what is short. The sheet above the frame teaches the form it blocks: row 17 of that sheet's `sheet.json` is `form.method = "dialog";`. The other 16 controls across the five demos all answer through the frame, `showModal()` keeps its backdrop and its focus trap, and both clipboard buttons report `NotAllowedError` rather than throwing
  - **Goal**: Resolve to [sandboxed-demo-frame-forms.prompt.md](.claude/prompts/sandboxed-demo-frame-forms.prompt.md)
  - From: Cheatsheet Catalog `->` What the Page Does With a Payload

#### Found Issues

- [ ] No test presses a demo's controls through the frame the page puts it in
  - **Issue**: `tools/test-demo-pages-browser.mjs` opens each `demo/index.html` directly and presses everything on it; `tools/test-example-selection.mjs` drives the page and holds what a selection leaves in the document. Neither drives a control *through* the frame, so "the demo works" and "the demo works framed" are different claims and only the first is held. Both files were green on the day the dialog stopped closing, and the whole suite - 639 cases - passed with the defect in it
  - **Goal**: covered by the fix above, section 4 of its prompt file: add the framed walk to `tools/test-demo-pages-browser.mjs`, reading the sandbox token from `index.html` rather than repeating it, so the test follows the grant when it next changes. The implementation is in `test-results/ui-ux-tester.agent/ui-ux-tester.2026.10.27-embed-demo-frame.cases.mjs`
  - From: UI/UX Override - the framed demo's dialog

## GitHub Pages Deployment

Publish the example page as a GitHub Pages project site, deployed from an
Actions workflow on the default branch rather than from a branch or folder.
The page is a single hand written HTML file that already serves from the
repository root, so the root is the site and no generator is needed. Work
this section through the automation's GitHub Pages instructions, which own
site work however it was raised.

**Intent**: stand up the deployment that the repository has never had.

Nothing is outstanding here. The deployment was stood up on 2026.10.14, and the
last open question closed on 2026.10.26: the eleven reference JPEGs do not ship
in the artifact, which is 88.5% of its bytes removed for files nothing on the
site asks for. The step is in the `build` job, the reasoning is **What the site
does not carry** in `CONTRIBUTING.md`, and `tools/test-pages-media-type.mjs`
holds both the step and the absence of any reference to the folder from a file
that does ship.

## Preview Links and Example Loading

The README points readers at a third party HTML preview service, and
`selectExample()` in `index.html` branches on that service's URL to load
examples and images from a CDN instead of from the repository. A published
Pages site makes both unnecessary: the page is served from the repository,
so relative paths resolve on their own.

**Intent**: replace the preview workaround with the real site.

**The image loading states this section spent three days measuring no longer
exist**, and the dates are worth keeping because they are what the change of
course was decided against. The probe was patched on 2026.09.08 to read
`this.status` rather than the reason phrase, which HTTP/2 does not carry; the
`file://` measurement on 09.09 found `fetch` and `XMLHttpRequest` refused
alike, so the element was handed the sheet rather than told about it; and the
09.10 measurement found a shown element with nothing decoded holding a zero
height box until a stalled request timed out. On 2026.09.24 the page began
composing its sheet from a document instead of fetching a raster, which
removed the request all three were about.

Nothing is outstanding here either, as of 2026.10.16: the site link is the
first thing under the README's level 1 heading, where a reader meets it before
anything else the file has to say.

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
`tools/test-page-structure-browser.mjs` for what the rules render. The last
open case closed on 2026.10.27: the one wait in
`tools/test-sheet-accent-arrival-browser.mjs` that covers a deliberately held
dependency is sized for a loaded machine rather than an idle one, at
`HELD_ARRIVAL` of 60 s with the reason in that file's header, and on reaching
the ceiling it reports where the page had got to rather than timing out bare.

## Cheatsheet Catalog

The page builds both dropdowns from `cheatsheets.json` and composes the chosen
sheet into a reserved box, so a cheatsheet is added by committing a folder and
regenerating the manifest rather than by editing the markup. The category is
selected on arrival only while exactly one exists; the `testEnvironment` block
and the placeholder `src` beside it are both gone.

**Intent**: let the page carry more than one cheatsheet without hand editing
the configuration block for each.

The manifest pipeline is the one prerequisite for every item in **New
Cheatsheets**, and as of 2026.09.24 it is in place end to end.
`tools/build-manifest.mjs` walks the tree, composes every `sheet.json` for its
box, writes the committed `cheatsheets.json`, and gates the Pages deploy with
`--check`; the eleven array examples are migrated into `javascript/arrays/` and
are what the walk finds; and `index.html` reads the file, keying each option by
its slug id and taking every label from a manifest title, so no path is derived
from display text anywhere. The page is a module and fetches its own catalog,
which is what ended the `file://` route - **Repository Records** holds the
README item that says so.

### The Manifest Pipeline

Nothing is outstanding here. The pipeline was in place end to end on
2026.09.24, and 2026.10.16 added the last thing it was missing as a reader
facing feature: a cheatsheet is addressable by the slug its option already
carried, so `index.html#javascript/arrays/splicing-arrays` opens the page with
that sheet drawn. `tools/test-example-selection.mjs` holds the cases.

### What the Page Does With a Payload

Nothing is outstanding here. The page injected a `run` payload and ignored
every other kind, which was right while `run` was the only kind committed and
stopped being right on 2026.10.26 when the first `embed` payloads landed. From
2026.10.27 an `embed` sheet's `demo/index.html` is framed under the sheet with
`sandbox="allow-scripts"`, decided once for the catalog rather than per sheet,
and the frame comes down on the next selection and on a category change.
`CONTRIBUTING.md` records what a demo may rely on in that frame, and
`tools/test-example-selection.mjs` holds the grant, the destination and the
teardown.

### Catalog Cleanup

Nothing is outstanding here. The `testEnvironment` block and the placeholder
`src` went with the manifest work, and on 2026.10.16 the three lines telling the
reader to open a console stopped being hard wired: the heading blurb, the third
step in the panel and the footnote are now shown together from the selected
entry's `kind`, so only a cheatsheet with a payload to inject asks for a
console.

## Example Script Quality

The example scripts are the repository's product: someone reads them to
learn the method being demonstrated, so a wrong comment teaches the wrong
thing. The undeclared loop counters are fixed: the page injects every payload
as a module, and module scope is strict mode, so an undeclared counter stopped
being a leak and became a failure.

**Intent**: make the examples correct as teaching material.

Nothing is outstanding here as of 2026.10.19, and the section's own claim is
now held by a test rather than by reading. `tools/test-example-comments.mjs`
runs every `kind: run` payload and compares each trailing comment against what
the call logged: 48 of 87 claims were wrong when it was first pointed at them,
22 substantively and 26 by an invisible character. The header comment went
rather than being made uniform, which the item offered as the alternative, and
all eleven files are plain ASCII with a case per file holding them there.

Two faults were measured here on 2026.10.19 and left for later, because the
four items queued then named neither. Both closed on 2026.10.23:
`javascript/arrays/sort-numbers-array` had a `console. log` with a space after
the dot, which parsed and ran and was the only call in the eleven written that
way, and `javascript/arrays/splicing-arrays` held `"Orage"` as a data value,
which took four lines to correct rather than one - the array, the claim that
faithfully reported it, and both again in that cheatsheet's `sheet.json`.
Nothing is outstanding here.

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

**Both halves about the eleven closed on 2026.10.23.** What they are now is
written at `javaScriptArrays/README.md`, with a pointer from `README.md`:
reference rather than any cheatsheet's deliverable, the evidence
`DESIGN_LANGUAGE.md` was measured off and what a composed sheet is aimed at
reproducing, kept as JPEG because `tools/test-sheet-composition.mjs`
re-measures them against those tables. The collaborator record went into
`CONTRIBUTING.md` beside how a category is added, which is where its item
asked for it: a commit that creates a `sheet.json` or writes a render out adds
`graphic-designer`, and one that only moves or regenerates what is there does
not.

Nothing is outstanding here. The render itself landed on 2026.10.27 as
`tools/cheatsheet.mjs`, which composes through the same layer the page does and
takes one of two routes, reporting which answered. Where it writes is a rule
rather than a default - beside its own `sheet.json` when the render is
publishable, and into `.tmp/` when it is not - because the social recipe globs
the working tree and drafts a post for whatever lands beside a document. The
PNG-then-convert pipeline this section expected is not there and needs no
ImageMagick: the browser route encodes WebP directly. Its defaults are the
preset in `CONTRIBUTING.md`, read off that document by a case rather than
copied into the tool.

## Repository Records

The repository has its contributing guidance as of 2026.10.23. The README leads
with the published site link, describes the published site and a local server
as two routes for two different readers, says plainly that `file://` gives a
blank page rather than a degraded one, points at the contributing record, and
carries a **Licence** paragraph naming CC0 1.0 and the two directories scoped
out of the waiver. `CONTRIBUTING.md` holds the rest: what a cheatsheet folder
may hold and which names are reserved, the three commands a category's design
language is derived with, where the generated skill goes and why it is not
committed, that a category whose examples are in a new language needs both a
role table and a derivation of it, the collaborator a drawing commit carries,
and the three checks to run before committing. It was written while the steps
were being taken rather than remembered, which is why it waited for a second
category to exist and then for a second subject going into one.

**Intent**: give the repository the records the automation and a reader both
expect to find.

What is left here is one standing constant nothing can currently follow, whose
fix is outside this repository, and one question about what a commit trailer
means. Measured again on 2026.10.27: every `cross-os-social` call, `--version`
included, still exits with `The build is older than the source it came from`.
`doctor`, the drift check and `run --dry-run` were all attempted that day and
all three refused, so no route record and no drift reading was taken for the
third run running.

The third item closed on 2026.10.27. `node --test` sweeps `test-results/`,
which `tools/test-suite-invocation.mjs` excluded from its own walk, so both
discovery invariants were blind to the one folder the real command does sweep.
The walk now sweeps what the command sweeps and `.gitignore` answers what the
repository owns rather than what is in the suite, with a third case failing on
any discovered file that is a working artifact and naming the remedy.

- [ ] Settle the `## Social Media Posting` constant, which nothing can currently follow
  - **Issue**: measured 2026.10.15. The rule asks every run to record this session's routes with `cross-os-social doctor --workspace mcp-todo --json`, and to check the recipe for drift before drafting. Every command, `--version` included, exits with `The build is older than the source it came from, so this would run the previous behaviour without saying so. Run \`npm run build\` first.` The shim on `PATH` resolves to the globally linked `cross-os-automation-mcp`, so the stale build is in that package and not in this repository
  - **Goal**: rebuild that package, then confirm from here that `doctor` reports `availableDrives` and that `recipes --from .claude/constants.md --heading "Recipe: cheatsheet-post" --json` reports `drift.differs`. If the toolbox is not going to be rebuilt, turn the constant off instead - a standing rule no run can follow is worse than no rule, because each run spends a step discovering it again
  - Filed here rather than as a found issue under `## Current` on purpose. The fix is outside this repository, so an override header carrying it would suppress the regular queue every run until someone rebuilt a tool this repository does not own
  - No draft was lost to it on 2026.10.15: the only image that run touched was `assets/footer.png`, which is a brand asset rather than a cheatsheet, and the recipe watches `jpg` and `webp` only
  - From: version.control = null
- [ ] Settle what "add `graphic-designer` as a collaborator" means, because no commit has ever done it
  - **Issue**: found 2026.10.26. The `## Collaborators` constant asks for it on any commit that creates an image, `CONTRIBUTING.md` restates it as a rule a drawing commit follows, and every cheatsheet item in **New Cheatsheets** carries it as a line of its own. `git log --grep=graphic-designer -i` returns nothing, and no commit in the history carries a trailer naming it - including `1aaf579`, which added the six **General CSS Overview** sheets. So the rule is stated in three places and satisfied in none
  - **Issue**: it is not clear which of two things it asks for, which is probably why. A commit trailer naming a co-author is one reading; a GitHub repository collaborator, added once in the repository's settings rather than per commit, is the other. "Add as a collaborator" is the vocabulary of the second and "on a commit" is the vocabulary of the first, and `CONTRIBUTING.md` currently reads as both at once
  - **Goal**: decide which it is and make it true. If it is a trailer, it has to be something the committing step can add, since a run records a commit mode and does not run `git` - so either the mode file carries it or the automation learns the rule, and `CONTRIBUTING.md` should name the exact trailer. If it is a repository collaborator, check whether the account is already one and reword the constant and `CONTRIBUTING.md` to stop implying a per-commit act. Either way, drop the line from the remaining cheatsheet items in **New Cheatsheets** if it is not something an item can carry out
  - Worth settling before the next cheatsheet item rather than after. More than fifty of them still carry the line, and each one currently records an intention no commit fulfils
  - From: version.control = null

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
  the browser through the napkin-sketch package vendored under
  `api/napkin-sketch/`, and a raster is rendered on demand only when
  something outside the page asks for one, per **Raster Export and Example
  Images**.
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

**The category exists as of 2026.10.19**, and three things it settled hold for
every item left in it. Its design language is recorded at
`DESIGN_LANGUAGE-html-css.md`, derived from the global record by
`tools/compose-language-asset.mjs` rather than measured off artwork, and every
sheet here is drawn to it; the generated skill is at `.claude/skills/html-css/`
and is an artifact, so the committed record is the one to read. A subject's
sheet count makes that subject a group and its areas of focus the cheatsheets
under it, which is what `general-html-overview` became - so the first sub group
arrived with the first item rather than with **HTML APIs**. And a `sheet.json`
declares a role per line by the rule the design language fixes, which from
2026.10.20 is the fallback rather than what draws: a sheet names the
`language` its example is written in and the panel is coloured token by token,
with the per-line role standing in only where no grammar reads it.

**The second subject landed on 2026.10.23**, and it settled two more things
every item left here inherits. A role table belongs to a **language**, not to
the category: `general-css-overview` writes CSS rather than markup, so
`DESIGN_LANGUAGE-html-css.md` now carries two tables whose structure and
configuration rows are in opposite orders, and
`tools/test-sheet-syntax-roles.mjs` dispatches on the declared `language` and
fails a sheet naming one it has no table for rather than skipping it. An item
here whose examples are in a third language writes both the table and the
derivation. And an `order` in a `meta.json` ranks a folder among its own
siblings only, so a sheet's place inside the category is the group's order and
then its own - which the catalog now reads as a chain. Two groups may number
their sheets from 1 without colliding, and a group needs an `order` of its
own.

**The third subject landed on 2026.10.26**, as the five sheets of **HTML
APIs**, and it settled the two things the `embed` items left here were waiting
on. `embed` is decided by the folder and not by the document: `detectPayload`
reports it from the presence of a `demo/` folder alone and `--check` holds the
declared `kind` to what is on disk, so a sheet is made `embed` by creating the
folder, the entry is fixed at `demo/index.html`, and everything the demo needs
goes inside `demo/` because a stray file beside one is a hard error. And the
category's third language is `javascript`, whose per-line table and derivation
are now written, so an item here whose examples are JavaScript needs neither -
only one in a **fourth** language does. Both are recorded in
`DESIGN_LANGUAGE-html-css.md`.

Two things an item here should know rather than rediscover. **The page does not
frame an `embed` payload yet** - `index.html` branches on `run` alone, so the
five demos are committed, correct and unopened, which is queued under
**Cheatsheet Catalog** rather than here. And **a code line's run count is
bounded**, per the limit measured into `DESIGN_LANGUAGE.md` on the same day: a
line split into six accent runs drew 1.026 px out of place and had to be
shortened, while every seam in it measured clean.

- **HTML APIs** is a group at `html-css/html-apis/`, carrying its own `meta.json`. Its cheatsheets follow

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
out of the barrel for the same reason the package keeps `writeComposition`
behind its own Node entry. The caller names the route, the scale, the background
and the format, and what comes back carries a `publishable` field: never true
for the built-in route, which has no font file and strokes its own alphabet, and
true for the browser route only at or above the scale floor. `auto` prefers the
browser and records the reason when it falls back. PNG, JPEG and WebP only; GIF
and TIFF are refused rather than substituted.

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

This section is finished and superseded. Between 2026.09.15 and 2026.09.21 the
graphic design API of the sibling `napkin-sketch` repository was hand ported
into `api/graphic-design/` as dependency free `.mjs`, verified against a bundle
of the upstream TypeScript, recorded in `api/graphic-design/API.md`, pinned
against committed fixtures, and followed in by the design language helper at
`ai-helper/graphic-designer/`. Three behaviours were changed locally on the
way, in this order: the SVG writer refuses a paint it cannot read, from
2026.09.16; text is measured in an optional face, from 2026.09.17; and an
elliptical arc in path data is refused, from 2026.09.20. The port stands at
6,240 lines in thirteen modules, and the fourteen items that made it are
archived under `## Complete` with this section's name on them.

The port was the interim reading of the user todo it fired on. On 2026.10.12
the same API was published as `@isocialpractice/napkin-sketch`, and **Depend
on the napkin-sketch Package** below replaced the port with that package,
moved the three local changes into `api/cheatsheet/` or upstream, and deleted
this directory on 2026.10.14. Nothing is queued here and nothing will be.

**Intent**: closed. The record of how the surface arrived is in the archived
items; the record of how it is used now is the section below.

## Depend on the `napkin-sketch` Package

This section is finished. Between 2026.10.13 and 2026.10.14 the hand port of
the graphic design API was replaced by the published package it was a copy of,
and on 2026.10.20 the pin moved to `1.1.0` and the vendoring mechanism became
the package's own. `@isocialpractice/napkin-sketch@1.1.0` is written into
`api/napkin-sketch/` by `napkin-sketch vendor`, verified against the registry's
own SHA-512, recorded in `VENDOR.json` and checked by the `VENDOR-CHECK.mjs`
beside it; every importer draws through it. Nothing is installed:
`php -S localhost:8000` is still the whole local workflow, a bare clone still
passes `node --test`, and the Pages workflow still runs the check after a
checkout with no install step.

The three behaviours the port had changed locally went two ways. The paint
refusal and the text measuring became this repository's own, in
`api/cheatsheet/contrast.mjs` and `api/cheatsheet/faces.mjs`, because a
published release cannot carry them; the arc went upstream as a report, with
the helper's font-family reading and a request for a composition-only entry.
`api/graphic-design/` and its 537 line test were deleted on 2026.10.14.

The weight is what the upstream request is about and it is re-measured on every
pin. At `1.0.0` the page downloaded five files, 772,665 bytes and 273,169
gzipped at level 6, against 144,760 and 47,135 for the ten port modules it
loaded before: the composition chunk alone was 112,842 and 41,985, and the rest
was the editor the root entry pulled in with it. `1.1.0` ships the
composition-only entry [#10](https://github.com/isocialPractice/napkin-sketch/issues/10)
asked for, and the page's own module graph is now that entry alone - four
files, 131,291 bytes and 50,622 gzipped, a 5.4x cut on what loads before the
first paint.

What grew instead is a second wave, loaded on demand. Token colouring needs the
`markdown` entry and the accent functions the whole API exports, which
`api/cheatsheet/accents.mjs` imports dynamically and `index.html` asks for
beside the catalog rather than in front of it: eight more files, 856,291 bytes
and 290,824 gzipped. A reader who draws a sheet therefore ends up with twelve
files, 987,582 bytes and 341,446 gzipped - 25% more than `1.0.0` in total, on a
critical path a fifth the size. Reading code is what costs it: highlight.js's
common set of 36 grammars is the bulk of that second wave.

**Intent**: closed. Nothing is queued here. What reopens it is another release
to pin, which is a re-vendor and a re-measure rather than a section.

## Implement Cheatsheet API

A cheatsheet is currently a screenshot someone took. This section replaces
that with an API: a caller describes the content and the design, and the API
composes the sheet. It has to work outside this repository as well as inside
it, so nothing in it may assume this page, this folder layout or this
category.

**Intent**: make a cheatsheet something a program composes rather than
something a person captures.

The drawing surface is this section's prerequisite, along with the
composition algorithm under **Cheatsheet Composition Language**. The surface
is the napkin-sketch package, per **Depend on the `napkin-sketch` Package**,
and what this section builds is the cheatsheet layer over it: the document,
theme and layout models the package knows nothing about. `createComposition`
and its element builders draw shapes; they have no notion of a term, a
signature or a section.

### The Core Model

- [ ] Define the cheatsheet document model: a title, ordered sections, and entries carrying a term, a signature and a description, independent of how any of it is drawn
- [ ] Define the theme model: palette roles, type stack and scale, spacing step, radius and stroke weight, read from `DESIGN_LANGUAGE.md` rather than hard coded
  - The roles resolve to concrete values through the color parser `api/cheatsheet/contrast.mjs` carries, since the package's root entry exports none, so a theme and a rendered fill cannot disagree about what a color is
- [ ] Define the layout model: a named composition, its column and row grid, and the slots a section may occupy
- [ ] Map the layout model onto the package's element builders, so a slot becomes `rect`, `text` and `line` calls rather than a string of SVG
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

- [ ] Compose a document into a napkin-sketch `Composition` and render it with `toSVG()`, the one canonical output every other format is derived from
- [ ] Render a document to an HTML fragment for embedding in a page
  - `toSVG()` already returns the string the page injects, so the fragment is a wrapper around it rather than a second renderer
- [ ] Return every render as raw data as well as writing a file, so a caller can embed the result without touching disk
  - The package already splits this way: `toSVG`, `toPNG` and `rasterize` return data, and only its `graphic-design/files` entry touches disk
- [ ] Take the raster route from the call rather than assuming one, and say which route produced a given file
  - The package's `toPNG()` is dependency free and draws the built in alphabet; the browser route draws the real face. A file that does not say which one made it cannot be reviewed against the design language
- [ ] Write output to a named path, to a directory with a derived filename, or to an in-memory buffer
  - The package's `writeComposition(source, dir, name, options)`, from its `graphic-design/files` entry, already covers the second and third

### Embedding the API

- [ ] Confirm the page reaches the vendored `api/napkin-sketch/api/index.js` through `api/cheatsheet/`, with no build step and no install between
  - The vendored build is the dependency free ES module this item used to ask for, so what is left is the acceptance check rather than the work
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
  - The package's root entry imports nothing from Node, measured on the five files the page loads, so this is satisfied by the dependency rather than needing a second build of the API. It was speculative before the port settled it
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
  - Validation has to know the limits the design language and the package set, or a generated document can ask for what the renderer draws wrongly: an elliptical arc in path data, which the package draws as nonsense rather than refusing, and a paint its SVG writer passes through unread. The package draws gradients and effects now and the design language allows none, so the validator refuses those on the language's authority
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
- [ ] Create 3 new ideas for **Depend on the `napkin-sketch` Package**
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
- [x] Migrate the eleven array examples to `javascript/arrays/` under the new convention, as the acceptance test for the manifest pipeline
  - The existing eleven must render with no hand edited HTML before any new category is added
  - Each becomes `javascript/arrays/<kebab-name>/` holding a `sheet.json` and the example script the folder already has, with `meta.json` carrying the title at the category and group levels. `node tools/build-manifest.mjs --check` is what says the tree is right
  - Watch the panel fill warning. Each of the eleven is a full sheet, so each should clear the 85% floor the eleven were measured at, and a migrated document that warns is a document that lost content on the way in
  - From: Cheatsheet Catalog `->` Catalog Cleanup
- [x] Build both dropdowns in `index.html` from `cheatsheets.json` rather than from a hand maintained `optgroup`
  - Fetch the manifest by relative path so it resolves under the `/cheatsheets/` project base path
  - Key each `option` by its slug id and take its label from the manifest title, so no path is ever derived from display text
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [x] Hide the previously shown `optgroup` when the category changes
  - `selectCheatsheet()` only ever sets one to `display: block`, so with more than one category the example dropdown accumulates stale groups
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [x] Remove the injected `script` element from the previous selection before appending the next one, and inject with `type="module"`
  - Each selection currently appends another `script` and never removes the last, so globals leak and collide between examples. `console.clear()` hides the symptom rather than the cause
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [x] Remove the `javaScriptArrays/.jpg` initial `src` the markup still ships, and the `javaScriptArrays/.js` reference beside it
  - Both files were deleted on 2026.09.09 in `cec3805`, the image at 11,859 bytes, while `index.html` kept pointing at one. What the markup calls a placeholder is a live 404 on the published site, carried at `index.html` line 217
  - The endpoint is no `src` attribute at all rather than an empty one, because the composed sheet replaces this element with a container the page injects an inline `svg` into. Doing both in one change is one edit rather than two, and there is no raster left for a `src` to name
  - This is the item that makes the page import `api/cheatsheet/` for the first time. The composed box comes from the manifest entry's `width` and `height`, reserved before the sheet is composed into it
  - From: Cheatsheet Catalog `->` Catalog Cleanup
- [x] Replace the `XMLHttpRequest` probe that decides a missing image from the response status with an `img.onerror` handler or a `fetch` response check
  - Closed by deletion rather than by replacement, which this item's own last bullet named as the likelier ending: composing the sheet in the page removed the image request, so there is no response status to read and nothing for a probe to rule out. The `img` element the handler belonged to is gone with it
  - What the probe was patched for is settled the same way. There is no broken icon, because nothing is fetched; no `file://` refusal, because the page does not run from `file://` at all; and no stalled request to leave an empty box, because the box is reserved from the manifest and filled by a synchronous composition
  - From: Preview Links and Example Loading
- [x] Select the category automatically only while exactly one exists, rather than naming it in the script
  - Closed by **Build both dropdowns in `index.html` from `cheatsheets.json`**, which took the named category out and had to decide what replaced it. One category is selected on arrival because there is nothing to choose between; a second makes the choice the reader's
  - From: Cheatsheet Catalog `->` Catalog Cleanup
- [x] Remove the `testEnvironment` block, or reduce it to the one behavior that differs between its branches
  - Removed rather than reduced. The one behavior that differed was presetting an example, and it differed by naming a literal the manifest now supplies, so there was nothing left in the block to keep
  - From: Cheatsheet Catalog `->` Catalog Cleanup
- [x] Declare the loop counter with `let` in the `optgroup` loop in `index.html` and in the `for (i in cars)` loop in `MaxandMinFunctionandSortObject.js`
  - Forced by **Remove the injected `script` element from the previous selection**, which injects every payload with `type="module"`. Module scope is strict mode, so an undeclared counter is a `ReferenceError` at run time rather than a global leak
  - Four counters rather than the two this item names. `max-and-min-value-array.js` carries two more, at `for (i in one)` and `for (i in tempArr)`, and the `optgroup` loop in `index.html` went out with the hand maintained `optgroup` itself
  - One more strict mode refusal turned up beside them, and it is a parse error rather than a run time one: `sort-numbers-array.js` carried the legacy octal literal `01`, which a module refuses outright. It already evaluated to `1` in sloppy mode, so `1` is what it says now, in the payload and in the document transcribed from it
  - From: Example Script Quality
- [x] The assets are not being included in the cheatsheet composition
  - **Issue**: The logo and footer asset are excluded
  - **Goal**: Use the [`logo.svg`](assets/logo.svg) and [`footer`](assets/footer.png) assets in the cheatsheet composition
  - From: UI/UX Override - the catalog driven page
- [x] The longest example label is cut off in the control on a phone
  - **Issue**: At 375px the example dropdown reads "Max and Min Function and Sort Obje", cut mid word with nothing to mark the cut, because a `select` computes `text-overflow: clip`. Measured in Chromium at 375x812: the control is 293px wide and spends 38px on its own padding, border and dropdown arrow, leaving 255px of text room against a label that needs 273px. At 1280px the control is 310px, which leaves 272px against the same 273px: within a pixel of the boundary, and the capture shows it rendering in full, so this is the phone alone. It predates the catalog work - the same eleven labels sat in the hand maintained `optgroup` under the same `select` rules - so nothing regressed here, but nothing covers it either. Captured in `test-results/ui-ux-tester.agent/ui-ux-tester.2026.09.24-light-phone-375x812-example-control.png`
  - **Goal**: Give the control a legible way to run out of room. `text-overflow: ellipsis` on `select` at least marks the cut as a cut; letting the control take the panel's full measure below the breakpoint would avoid the cut outright. Pin whichever is chosen with the measurement above: at 1280px and at 375px, the widest option's text width must not exceed the control's own width less its padding, border and arrow. `tools/test-page-structure-browser.mjs` is where that belongs, beside the width scans it already runs
  - From: UI/UX Override - the catalog driven page
- [x] The sheet's code is too small to read below the 768px breakpoint
  - **Issue**: The code is drawn at 65.4 sheet pixels in a 3600px square composition, so a reader gets whatever the column scales that to. Measured at 1:1 device pixels: a 1280px viewport gives a 600px sheet and 10.89 CSS px of code, small but readable; 900px gives 476px and 8.64 CSS px; 768px gives 344px and 6.25 CSS px; 375px gives 343px and 6.23 CSS px, which reads as grey texture rather than as text. Captured in `test-results/ui-ux-tester.agent/ui-ux-tester.2026.09.24-light-phone-375x812-sheet-code-1x.png`
  - **Goal**: The queued **Raise the displayed sheet cap from 600 pixels to `min(100%, 900px)`** does not reach this, and that is the point of recording it here: `min(100%, 900px)` resolves to 100% at every width under 900px, so the phone gets exactly what it gets today. What the phone needs is the full size route that item already mentions, reachable from the sheet itself. Decide it alongside that item rather than after it
  - From: UI/UX Override - the catalog driven page
- [x] The eleven examples are offered alphabetically rather than in the order the page taught them
  - **Issue**: The hand maintained `optgroup` listed them Shift And Unshift, Changing Elements, Splicing Arrays, Concating Arrays, Slicing Arrays, Sorting Arrays, Sort Numbers Array, Compare Array Function, Random Sort Array, Max and Min Value Array, Max and Min Function and Sort Object: a progression from the simplest array edit to sorting objects by property. Built from `cheatsheets.json` they come out Changing Elements, Compare Array Function, Concating Arrays, Max and Min Function and Sort Object, Max and Min Value Array, Random Sort Array, Shift And Unshift, Slicing Arrays, Sort Numbers Array, Sorting Arrays, Splicing Arrays. All eleven labels are present and correct, so the migration held its own terms; what changed is that the first sheet a reader meets is now Changing Elements and the teaching order is gone
  - **Goal**: No code change is needed. `byOrder` in `tools/build-manifest.mjs` already sorts by a declared `order` before falling back to the id, and `readLevel` already reads `order` from a folder's own `meta.json`; none of the eleven cheatsheet folders carries one, which is why the fallback decides. Add a `meta.json` holding `{ "order": n }` to each of the eleven in the order above, regenerate, and confirm with `node tools/build-manifest.mjs --check`
  - From: UI/UX Override - the catalog driven page
- [x] Give `api/cheatsheet/` its own run measurement, so no sheet run is measured or placed by the drawing API
  - `compose.mjs` calls the port's `measureText` with a `face`, and the package's ignores it: at a 100 px size the lead-in measures 1573.33 through the package with or without the sheet face, and 1389.40 through the port with it. `MeasureOptions` in the package's `font.d.ts` is `fontSize`, `letterSpacing` and `wordSpacing`, and `layoutText` takes no face either
  - Measure a run from the committed table in `faces.mjs` in a function the layer exports, with the arithmetic the port's `measureText` uses: each character's advance over units per em times the size, plus letter and word spacing, less the trailing letter space. `capThatFits` and `widestLine` read it, the `Face` typedef moves into `faces.mjs` because the package's types carry none, and nothing in the layer imports a measuring call from the drawing API
  - Set `fontFamily` on every run from its face, place the wordmark, the title and the subtitle at `x` equal to the centre less half the measured width with `align: "left"`, and stop passing `face` on the element: the port's `svg.mjs` read `el.face` for the centring and for the `font-family` fallback, and the package's writer reads neither
  - Measured on 2026.10.13 by doing exactly that to the fixture sheet's document by hand: 20 runs carry a face and 3 are centred, the centre less half the width agrees with the port's own layout on all 3, and the SVG matches `tools/fixtures/sheet.svg` byte for byte whether the port or the package writes it
  - Acceptance: `tools/fixtures/sheet.svg` is byte-identical before and after, with the port still in place, and `tools/test-sheet-faces-browser.mjs` still draws every run within 0.29% of the table. `tools/fixtures/sheet.png.sha256` moves here and is re-pinned with `MCP_FIXTURE_UPDATE=1` once the diff is read: the port's rasterizer advanced its built-in glyphs by the face's widths and scaled them to its cap, no face reaches it after this, and the built-in route was never publishable. `tools/test-sheet-faces.mjs` keeps its cases about the table, moved onto the layer's function, and loses the ones about the built-in alphabet, which belong to the port and go with it
  - From: Depend on the `napkin-sketch` Package
- [x] Carry the paint refusal in `api/cheatsheet/`, since the package's SVG writer does not
  - Measured: `fill: "ofwhite"` is written into the markup by the package's `toSVG()` and refused only by `toPNG()`, with `unsupported color "ofwhite"`. The port refused it in both, and the reason stands: the page composes inline SVG and the rasterizer never runs there, so an unreadable paint is a black region with no error anywhere
  - `composeSheet` checks every fill and stroke in the document it composed with the layer's own colour parser, and raises the message the port raised. `contrast.mjs` needs that parser too, because the package's root entry exports no `parseColor`. It reads the hex forms, since the 22 paints the design language and the worked example's theme declare are all hex, measured on 2026.10.13; it passes an unset paint and the do-not-paint values the port passed; and it refuses everything else
  - Acceptance: `tools/fixtures/sheet.svg` is byte-identical, and a test composes a sheet through a theme carrying an unreadable paint and asserts the refusal names the paint
  - From: Depend on the `napkin-sketch` Package
- [x] Vendor the published build into `api/napkin-sketch/` with `tools/vendor-napkin-sketch.mjs`, pinned by version and integrity
  - `--pin <version>` reads the registry document, verifies the tarball's sha512 against `dist.integrity` with `node:crypto` before reading it, gunzips with `node:zlib`, reads the tar with a minimal ustar reader, and copies the root entry `dist/api/index.js`, the Node only `dist/graphic-design/files.js`, every chunk either imports transitively, the three `package.json` scope markers beside them, `LICENSE` and `THIRD-PARTY-NOTICES.md`, with the `dist/` prefix dropped so the entries' own relative imports resolve unchanged. Chunks are read from the entries' import specifiers rather than from a list, because their names are build hashes; at `1.0.0` that is five chunks, four for the root entry and one more for the files entry. Anything in the folder the pin did not write is deleted
  - It records `api/napkin-sketch/PIN.json`: name, version, tarball URL, integrity, the two entry paths and a sha256 per vendored file. `--check` hashes the folder against that record with no network and exits non-zero on a file that differs, is missing or is unrecorded; the Pages manifest job runs it beside `build-manifest.mjs --check`, with no install step added
  - Nothing is installed and nothing is shelled out to, so `php -S localhost:8000` and a bare clone's `node --test` keep working. Measured on 2026.10.13 with the `1.0.0` files laid out this way in a scratch folder: both entries load from relative paths with nothing installed. The scope markers sit under `api/napkin-sketch/`, never at `api/package.json`, which `tools/test-graphic-design-port.mjs` refuses while the port is present
  - The alternatives were measured against the recorded decisions and refused: a `package.json` with `npm ci` makes Node mandatory and adds an install step; a CDN import reintroduces the kind of dependency the page shed on 2026.09.05; copying one chunk behind a hand written entry is a fork, since the chunk's exports are mangled names that change per build
  - Record the weight on this item when it lands, gzipped at level 6: five files, 772,665 bytes and 273,169 gzipped at `1.0.0`, against 144,760 and 47,135 for the ten port modules the page loads today. The composition chunk alone is 112,842 and 41,985. That gap is what the upstream request below exists to close, and the figure is re-measured on every pin
  - From: Depend on the `napkin-sketch` Package
- [x] Re-point every importer at the vendored entry, and keep the ported helper
  - Measured on 2026.10.13: 38 tracked files name `api/graphic-design` outside the port, `TODO.md` and `CHANGELOG.md`, and 19 of them resolve it when they run. Re-point 18 of those: `api/cheatsheet/compose.mjs` and `contrast.mjs`; `examples/reproduce-sheet.mjs` and `restyle-sheet.mjs`; `tools/build-brand-resources.mjs`, `compose-language-asset.mjs`, `fixtures/shapes.mjs`, `measure-font-widths.mjs`, `test-brand-bridge.mjs`, `test-composition-algorithm.mjs`, `test-design-language-helper.mjs`, `test-render-fixture.mjs`, `test-sheet-faces.mjs`, `test-sheet-faces-browser.mjs` and `test-sheet-raster.mjs`; and the three scripts under `ai-helper/graphic-designer/skills/design-language/scripts/`. The nineteenth, `tools/test-graphic-design-port.mjs`, tests the port itself and goes with it in the next item. Grep before and after, for the path and for the path built from segments, rather than trusting this list
  - Browser safe code imports `api/napkin-sketch/api/index.js` by relative path; Node only code imports `writeComposition` from `api/napkin-sketch/graphic-design/files.js` by relative path, and the page never reaches the second, which is the same boundary the port drew around `files.mjs`. No bare specifier anywhere, because nothing resolves one without `node_modules`
  - Three names the package's root entry does not export are replaced rather than reached for: `parseColor` by the layer's parser from the paint item, and `escapeXml` and `isPng` by a line each in the tests that use them. The measuring calls that took a face are replaced by the layer's function from the measuring item, since the package's take none
  - The ported helper stays and the package's copy is not used: the package resolves the API by package name with a clone's `dist/` as the fallback, and the port carries the walk-up loader, the brand bridge registration root and the `font-family` fix the package still lacks. `analyze-media.mjs` and `brand-resources.mjs` walk up for `api/napkin-sketch/api/index.js` instead, `CHEATSHEET_GRAPHIC_DESIGN_API` names it from outside the tree, and `tools/test-design-language-helper.mjs` asserts the new path where it asserted the old. The helper's eleven calls are all on the root entry: `createComposition`, `rasterizeComposition`, `renderPng`, `decodePng`, `layoutText`, `inlineSvg`, `placeBrand`, `brandMark`, `findBrandSlots`, `parseResources` and `descriptorFromFilename`
  - The seven import lines in the helper's docs move in the same change, because a generated script copies them: two in `skills/design-language/SKILL.md`, two in `skills/design-language/scripts/template.md`, one in `skills/graphic-design-api/SKILL.md` and two in `skills/graphic-design-api/references/composition.md`
  - Pin `actions/setup-node@v4` with `node-version: 22` in the Pages manifest job, because the package declares Node 22.12 or later and that job composes every sheet through it. `tools/test-build-manifest.mjs` already allows a setup-node step and refuses only an install
  - Acceptance: `tools/fixtures/sheet.svg` and `sheet.png.sha256` hold, since the face left the renderer in the measuring item and the two renderers agree once it has; `shapes.svg` and `shapes.png` hold as well, measured on 2026.10.13 by building the shape fixture through the package's own `createComposition`; `node --test` is green on a bare clone with the port still present
  - From: Depend on the `napkin-sketch` Package
- [x] Delete the port and rescope the records to the package
  - Remove `api/graphic-design/`, thirteen modules of 6,240 lines and its `API.md`, and `tools/test-graphic-design-port.mjs`, 537 lines, in a commit of their own after the item above is green. The reference becomes the package's own composition pages on its documentation site, linked from the README
  - `NOTICE` scopes `api/napkin-sketch/` out of the CC0 waiver as MIT, carrying the package's `LICENSE` text in full, and beside it the en-US hyphenation patterns notice from the package's `THIRD-PARTY-NOTICES.md`, because the chunks the page loads bundle those patterns. The same notices place `marked`, `marked-highlight` and `highlight.js` in the Markdown and Node entries, which are not vendored, so they are not carried. `ai-helper/graphic-designer/` keeps its paragraph as it stands
  - `README.md` says the drawing surface is the published package at the pinned version, that `api/napkin-sketch/` is a vendored copy nothing here edits, how the pin is moved, and that nothing has to be installed; its **Where the Drawing Surface Came From**, **Drawing a Sheet** and **Licence** paragraphs change to match
  - Every other tracked line that names `api/graphic-design`, or calls the drawing surface the port or ported, is rewritten: the files the re-point item leaves naming it in prose, a typedef or a comment, among them `DESIGN_LANGUAGE.md`, `examples/README.md`, `index.html`, the headers in `api/cheatsheet/`, the comments in `tools/` and the helper's own docs. A typedef that named a port module is dropped, since the vendored build carries no types. The helper's docs state the port's limits as the API's, and `skills/graphic-design-api/SKILL.md` says there are no gradients, filters or patterns; the package draws gradients and effects, so a limit that stays is stated as the design language's
  - Verification: `git grep -n api/graphic-design` returns only `TODO.md` and `CHANGELOG.md`; `git grep -n -i -w -e ported -e "the port"` returns only those two and lines about the helper, which stays ported; `node --test` is green; the published site composes a sheet after the deploy
  - From: Depend on the `napkin-sketch` Package
- [x] Take the barrel request and the two local corrections upstream
  - Ask the upstream repository for a composition-only subpath entry, `./graphic-design` beside the existing `./graphic-design/files`, exporting what `dist/core/graphic-design/index.d.ts` already lists, so a browser that imports the composition API stops fetching the editor. It would also give back `parseColor`, `escapeXml` and `isPng`, which that list carries and the root entry leaves out. The measured difference is 273,169 bytes gzipped against 41,985 for the composition chunk alone. Record the issue URL on this item, and when a release carries the entry, move the pin, vendor that entry instead of the root, and re-measure
  - Report the arc: upstream's path tokenizer does not list `A`, so `M 0 0 A 5 5 0 0 1 10 10 A 5 5 0 0 1 20 0` passes `toSVG()` with the arc in the markup and draws through `toPNG()` as a polyline of its parameters with no error, where the composition reference says arcs are unsupported. The port's `PATH_TOKEN` correction is the fix, and it is a one line change to `geometry.ts`
  - Report the family: `analyze-media.mjs` matches a `font-family` attribute and a declaration with one pattern, so an escaped spaced family such as `&quot;Helvetica Neue&quot;` is reported as `&quot`. The `1.0.0` copy still carries the single pattern, read on 2026.10.13, and the port's correction is recorded in the ported helper's README
  - These are reports and not patches to the vendored copy. Nothing under `api/napkin-sketch/` is ever edited; a fix arrives by moving the pin
  - From: Depend on the `napkin-sketch` Package
  - Filed 2026.10.14 against `isocialPractice/napkin-sketch`: the subpath entry is [#10](https://github.com/isocialPractice/napkin-sketch/issues/10), the arc is [#11](https://github.com/isocialPractice/napkin-sketch/issues/11), the family pattern is [#12](https://github.com/isocialPractice/napkin-sketch/issues/12). Each was re-measured against the vendored `1.0.0` before it was filed
- [x] The 2026.09.20 changelog entry counts the arc refusal as the second local change to a ported module, and it was the third
  - **Issue**: `CHANGELOG.md` under `2026.09.20` says `PATH_TOKEN` matching `A` and `a` "is the second local change to a ported module after `font.mjs`". Measured with `git log` on `api/graphic-design/` on 2026.10.13: `23d9239` made `svg.mjs` refuse a paint it cannot read on 2026.09.16, `81a5602` made `font.mjs` measure in a face on 2026.09.17, and `ae977a5` made `geometry.mjs` refuse the arc on 2026.09.20, so the arc was the third. The port section's prose carried the same count until **Depend on the `napkin-sketch` Package** replaced it with the measured order, and `api/graphic-design/API.md` still calls the face "the one local change to a ported module" but goes with the port, so this changelog sentence is the record left to correct
  - **Goal**: The 2026.09.20 entry names the arc refusal as the third local change to a ported module, after the paint refusal of 2026.09.16 and the face of 2026.09.17. Nothing else in the entry changes
  - From: User Override - the napkin-sketch dependency
- [x] Raise the displayed sheet cap from 600 pixels to `min(100%, 900px)` and give the composed sheet a route to full size
  - 600 pixels is too small to read code in, which is the whole purpose of the sheet
  - An inline `svg` scales without the file size penalty that made 600 pixels a compromise, so this is now about the column's measure rather than about what a larger file costs
  - From: Raster Export and Example Images
- [x] Verify the published site composes a sheet through the vendored package
  - The last line of **Delete the port and rescope the records to the package** acceptance, and the one half of it this run could not do: the deploy runs on the server after the push, minutes after the run that made it ends
  - Open <https://isocialpractice.github.io/cheatsheets/>, choose an example, and confirm a sheet is drawn. The surface it draws through is `api/napkin-sketch/`, so a failure here is a fetch or a media type rather than a composition: the vendored files are `.js` where everything else the page loads is `.mjs`, and Pages has never been measured on that extension
  - Check the browser console for a module that would not load, and `api/napkin-sketch/api/index.js` in the network panel for the media type it came back as
  - From: Depend on the `napkin-sketch` Package
- [x] Stop six source lines naming the deleted port as something a reader can still go and look at
  - **Issue**: **Delete the port and rescope the records to the package** set its own verification as `git grep -n -i -w -e ported -e "the port"` returning only `TODO.md`, `CHANGELOG.md` and lines about the helper, which stays ported. Six lines fail it, and the grep passed because it cannot see any of them: four sit in files that are still untracked, and two use `port's`, which `-w "the port"` does not match. `api/cheatsheet/brand.mjs` line 39 calls the `BrandAsset` typedef "the port's own `BrandSource`" and line 92 explains a guard by "the two halves of the port"; `tools/test-sheet-brand.mjs` line 103 says both renderers draw "the port's inlined vector" and line 217 offers "a vector the port can parse"; `tools/test-sheet-raster.mjs` line 5 describes one raster route as "the port's built-in single stroke alphabet", and that file is named in the re-point item's own list; and `tools/vendor-napkin-sketch.mjs` lines 46-47 with `tools/test-vendor-napkin-sketch.mjs` lines 301-302 both say the scope markers sit inside the folder because `tools/test-graphic-design-port.mjs` "refuses" one above it - a file the same turn deleted, so the stated reason for a live decision now points at nothing
  - **Goal**: Rewrite each to name the vendored surface, in the terms the rest of the layer now uses: a typedef restated from the package, a guard explained on its own terms, the surface's built-in alphabet. For the two scope marker comments the decision stands and only its reason has expired - the markers belong with the copy they scope - so state that rather than citing a deleted test. Re-run the item's own verification with a grep that can see what the first one could not: `git grep` plus the untracked files, and `port's` as well as `the port`
  - From: UI/UX Override - the footer mark sits on the sheet's trim edge
- [x] Correct the claim that `raster.mjs` carries the encoder guard `brand.mjs` is explaining
  - **Issue**: `api/cheatsheet/brand.mjs` lines 90-92 justify picking `btoa` or `Buffer` with "which is the same guard `raster.mjs` carries for the decode side and for the same reason", and `tools/test-sheet-brand.mjs` line 75 repeats it as "which is the guard `raster.mjs` carries on the decode side". No `raster.mjs` in the tree carries one: `grep -n "btoa\|atob\|Buffer" api/cheatsheet/raster.mjs` is empty. The guard was real and was at `api/graphic-design/raster.mjs` lines 279-281, deleted in the same turn that wrote these two comments, so what is left is a reader being sent to the only `raster.mjs` there is - the one in the same folder - to read something that is not in it
  - **Goal**: Explain the two encoders on their own terms, which need no second file to stand up: a browser has `btoa` and no `Buffer`, and this module composes in both runtimes. Worth measuring while the comment is being rewritten, because it decides how much of it survives: the manifest job now pins Node 22 and the package declares 22.12 or later, and `btoa` has been a Node global since 16, so the `Buffer` arm may be a branch nothing reaches any more. If the symmetry with the decode side is worth keeping, name where it actually lives now - the vendored surface's own rasterizer - rather than a path in this folder
  - From: UI/UX Override - the footer mark sits on the sheet's trim edge
- [x] Give the footer strip the left margin the artwork gives it
  - **Issue**: the brand strip reaches the sheet and is drawn at the artwork's own size, but it starts one pixel further left than the artwork does. Measured off the green bar of the mark at the strip's left end, scanned in a canvas at 3600 square from both the composed sheet and `javaScriptArrays/SplicingArrays.jpg`: the artwork sets that bar at x 192 to 291, inside a navy block that bleeds to the canvas edge behind it, while the composed sheet sets it at x 0 to 105 with page white around it. The mark therefore touches the sheet's left edge, where every other element on the sheet holds a margin, and at the page's 900px render it meets the frame's own border. The size is not the fault: the mark stands 213 px against the artwork's 199 and the follow line 215 against 205, so the strip is within seven percent of the artwork it was measured off, and it is centred in its band with 55 px above and 56 below
  - **Goal**: either give `BRAND_SLOTS.footer` an `x` inset so the asset clears the edge - it is `x: 0` today, and the asset is a tight crop of the lockup that starts at the mark - or carry the artwork's navy block in `assets/footer.png` so that what bleeds to the edge is a shape rather than the mark itself. The second keeps the slot arithmetic as it is and is the closer reading of the artwork
  - From: UI/UX Override - the footer mark sits on the sheet's trim edge
- [x] Add hash routing so a cheatsheet has a shareable link and preselects on load
  - The page keys every option by its slug id now, so the fragment is that slug and needs no second naming scheme. `javascript/arrays/splicing-arrays` is what an option carries and what a link should carry
  - Both dropdowns are built from the manifest before anything is selected, so a fragment read on load has a catalog to resolve against. Resolve it after the build rather than before, and fall back to the single category preselection when the fragment names nothing in the catalog
  - Write the fragment on selection as well as read it on load, and leave the reader's own history usable: replacing the entry rather than pushing one keeps the back button on the page they arrived from
  - From: Cheatsheet Catalog `->` The Manifest Pipeline
- [x] Show the console instructions only for a cheatsheet whose payload actually runs in the browser
  - The heading blurb, the "Press F12" step and `#showFootNote` are hard wired, and most of the new catalog is not a runnable browser script
  - The page reads `entry.kind` already and shows the footnote for `run` alone, so what is left here is the hard wired heading blurb and the "Press F12" step
  - From: Cheatsheet Catalog `->` Catalog Cleanup
- [x] Add the site link directly beneath the README's level 1 heading
  - From: Preview Links and Example Loading
- [x] Note the CC0 1.0 license in `README.md`
  - Check before working it. The README carries a **Licence** paragraph naming CC0 1.0 and the directories scoped out of the waiver, which **Depend on the `napkin-sketch` Package** changes from two ports to the vendored package and the ported helper, so this wants checking against the file as it stands when it is worked rather than writing
  - From: Repository Records
- [x] Describe both ways to view the examples in `README.md`: the published site, and a local server for anyone working on the page
  - Say plainly that opening `index.html` as a `file://` URL will stop working once the page fetches its manifest, so a local server stops being optional
  - That sub-bullet came true on 2026.09.24 and the false sentence it was written against is already corrected, so what is left is whether the two routes read as two routes rather than as one paragraph with a warning bolted on
  - From: Repository Records
- [x] A dead fragment stays in the address bar once the catalog holds a second category
  - **Issue**: `index.html` clears a fragment that resolved to nothing only as a side effect of the single category preselection - `writeFragment("")` is reached from `selectCheatsheet()`, which the start up block calls only when `applyFragment()` failed **and** `categorySelect.options.length === 2`. Measured in Chromium on 2026.10.16 against the catalog served with one extra category appended in memory: `#javascript/arrays/no-such-sheet` arrives with no category chosen, no example and no sheet, all correct, but keeps `#javascript/arrays/no-such-sheet` in the address bar instead of emptying it. A live link still resolves and draws with two categories, so the routing scales; only the refusal leaks. The committed one category catalog clears it correctly, which is why the suite is green today and why this activates silently on the first run that adds a category. `tools/test-example-selection.mjs` already states the requirement this breaks, in the comment on **a fragment naming nothing in the catalog arrives as if it were absent**: a reader who copied the address bar from there would pass the dead link on
  - **Goal**: Resolve to [dead-fragment-survives-a-second-category.prompt.md](.claude/prompts/dead-fragment-survives-a-second-category.prompt.md)
  - From: UI/UX Override - hash routing and the console guidance
- [x] Correct the "Cheatsheat" misspelling in the first instruction in `index.html`
  - **Issue**: `index.html:259` reads `<li>Select Cheatsheat from dropdown.</li>`. It is the first line of the Instructions panel and the first instruction a reader is given, on screen from the moment the page opens and in every capture this verification took. The word is "Cheatsheet", as the `<label for="category">Select Cheatsheet</label>` four lines below it already has it. Measured 2026.10.16: `Cheatsheat` appears once in the repository and in no todo item, so nothing queued reaches it - the two misspelling items under `## Current` name a different file and a comment that no longer exists
  - **Goal**: Change the one occurrence to "Cheatsheet" so the step and the label beneath it agree. `tools/test-page-structure.mjs` reads the page source and is where an assertion pinning the two spellings to each other would sit, if one is wanted
  - From: UI/UX Override - hash routing and the console guidance
- [x] The refusal's `location.hash` guard is credited with preventing a history entry it could never write
  - **Issue**: `applyFragment()` guards its `writeFragment("")` with `if (location.hash)`, and the comment above it gives the reason as "so an ordinary arrival, which had nothing to refuse, still writes no history entry at all". `writeFragment` records through `history.replaceState`, which replaces the current entry and never pushes one, so there is no entry for the guard to prevent. Measured 2026.10.17 by serving `index.html` twice, once as committed and once with the guard removed so the clearing is unconditional: both arrivals take `history.length` from 1 to 2, both leave the address bar with no fragment, and both land on `about:blank` after one press of back. The behaviour the guard is credited with holds without it
  - **Goal**: Keep the guard, which still saves a pointless `replaceState` on every bare arrival, and reword the comment to claim that rather than a history entry it prevents. The measurement is recorded in `tools/test-example-selection.mjs` under "an arrival with no fragment writes nothing to the address bar", which says what it does and does not pin; keep the two statements in agreement
  - From: UI/UX Override - refused fragment and instruction spelling
- [x] **Wrapped Attribute Colour**: Add the **General HTML Overview** cheatsheet at `html-css/general-html-overview/`, `kind: read`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - This is the first item in a new category, so it is the one that generates that category's design language and skill, per **Conventions for every item in this section**: compose the temporary SVG with `tools/compose-language-asset.mjs`, measure it into `DESIGN_LANGUAGE-html-css.md`, and generate the skill that every later `html-css/` sheet is drawn to
  - `kind: read` renders the source as text, so this item needs no `demo/` folder. The first `embed` payload in the category is the **Common Browser Built-in APIs** item further down it
  - Regenerate `cheatsheets.json` with `node tools/build-manifest.mjs` and gate it with `--check`, which fails a missing title, a path that is not lower case kebab, a `kind` that disagrees with the folder and a sheet whose composition will not fit its own margins
  - Add `graphic-designer` as a collaborator on the commit, per the collaborators constant: a sheet composed as SVG is drawn rather than captured, so the constant binds on the composition
  - From: New Cheatsheets `->` HTML/CSS
- [x] Correct the misspelled words in the commented output in `javascript/arrays/shift-and-unshift/shift-and-unshift.js`
  - The item named `shiftAndUnshift.js` at the repository root until 2026.10.16, which is where the file sat before the catalog migration moved it on 2026.09.24. The path above is the one that exists
  - From: Example Script Quality
- [x] Fix the `CONGIF` misspelling in the `index.html` configuration comment
  - Check before working it. Measured 2026.10.16: `CONGIF` appears nowhere in the repository, and `index.html` has no configuration comment left to carry it - it went out with the `testEnvironment` block when the page began reading `cheatsheets.json` on 2026.09.24. If that still holds, close this by verification rather than by writing
  - From: Example Script Quality
- [x] Give every example file the same header comment, or drop it from all of them
  - Eleven files, now at `javascript/arrays/<slug>/<slug>.js`. Each is injected as a module, so whatever is chosen has to survive module scope and strict mode
  - From: Example Script Quality
- [x] Check each example's commented output against what the script actually logs
  - `tools/test-example-selection.mjs` selects all eleven in turn and fails on a page error, so the scripts run; what nothing checks is whether the commented output beside each call is what the console receives
  - From: Example Script Quality
- [x] Re-vendor `@isocialpractice/napkin-sketch` at `1.1.0` with the package's own `vendor` command
  - **Issue**: `api/napkin-sketch/` holds `1.0.0`, copied on 2026.10.14 by
    this repository's own `tools/vendor-napkin-sketch.mjs` and recorded in
    `PIN.json`. The three issues reported from here that day are fixed and
    released upstream in `1.1.0`, on 2026.10.19:
    [#10](https://github.com/isocialPractice/napkin-sketch/issues/10) a
    `graphic-design` entry of its own,
    [#11](https://github.com/isocialPractice/napkin-sketch/issues/11) an
    elliptical arc refused rather than drawn as a polyline, and
    [#12](https://github.com/isocialPractice/napkin-sketch/issues/12) a quoted
    font family read as its name rather than as `&quot`. The same release adds
    `napkin-sketch vendor`, made for re-vendoring a copy like this one. There is
    no `1.0.1`: npm holds `1.0.0` and `1.1.0`, and `1.1.0` carries the fixes.
  - **Goal**: `api/napkin-sketch/` is written by `napkin-sketch vendor` at
    `1.1.0`, recorded in its `VENDOR.json` and checked by its
    `VENDOR-CHECK.mjs`, and holds the parts this repository uses:
    `graphic-design` - the entry #10 was filed for, about 49 KB gzipped against
    the main entry's 270 KB - `graphic-design/files`, and `markdown` for the
    item below. The imports in `api/cheatsheet/` move from
    `napkin-sketch/api/index.js` to the `graphic-design` entry wherever it
    exports what they import.
  - **`vendor` never writes into a folder it did not write**, and this one was
    written by `tools/vendor-napkin-sketch.mjs`. Remove the old folder first
    rather than vendoring over it. `napkin-sketch vendor --list` names every
    part and what it costs a page.
  - The old mechanism goes with the old folder: `tools/vendor-napkin-sketch.mjs`,
    `tools/test-vendor-napkin-sketch.mjs`, the `--check` step in
    `.github/workflows/pages.yml` - which becomes
    `node api/napkin-sketch/VENDOR-CHECK.mjs`, plain node with no install - the
    vendoring lines in `README.md`, and every other place that names `PIN.json`
    or `vendor-napkin-sketch` outside `.tmp/`.
  - `ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs`
    reads a quoted font family itself, which is the fix #12 made upstream.
    Compare it with the helper `vendor --ai-helper` copies, and keep one reading,
    not two.
  - Every test passes and the site composes as it did.
    `tools/test-pages-media-type.mjs` reads the vendored copy, so it is the
    first to say whether the layout moved.
  - From: Depend on the `napkin-sketch` Package
- [x] **Token Accents**: Color code by token with napkin-sketch's Clean Language Accents
  - **Issue**: Code syntax highlighting is incorrect. A code line in a composed
    sheet takes one `role` for the whole line - `plain`, `comment`,
    `identifier`, `keyword`, `string` or `number` - set by hand in `sheet.json`
    and drawn by `roleColor()` in `api/cheatsheet/compose.mjs`. So a line
    holding a keyword, an identifier and a string is drawn in one color, and a
    line given the wrong role is wrong from end to end.
    `Wrapped Attribute Colour 1`, in the UI/UX override below, is one such
    line.
  - **Goal**: Code in a composed sheet is colored token by token with
    [Clean Language Accents](https://isocialpractice.github.io/napkin-sketch/api/markdown/index.html#for-agents),
    from the `markdown` part the item above vendors, in the colors
    `DESIGN_LANGUAGE.md` already gives each role. The palette stays; only how
    a token's color is chosen changes.
  - Per the page's **For agents**: import the `markdown` entry once before
    drawing, name languages by id, install a language before the text using it
    is drawn, and read `missing` from `accentRuns`, so a sheet in a language
    nobody installed says so rather than drawing plain.
  - Decide whether the per-line `role` stays as the fallback for a language
    with no grammar, or goes; 17 sheets set one today. Record the decision in
    `DESIGN_LANGUAGE.md`, where the **General CSS Overview** item in the
    regular queue will read it before writing its own per-line mapping.
  - **The UI/UX override below is about the per-line rule this replaces.**
    Work its items against the result: say whether token colors settle
    `Wrapped Attribute Colour 1` and the per-role counts, and what still
    applies where they do not.
  - Depends on the item above, which brings the `markdown` part in.
  - From: Depend on the `napkin-sketch` Package
- [x] Wrapped Attribute Colour 1
  - **Issue**: One line of one cheatsheet takes a syntax role the category's own rule does not give it, and the inconsistency is visible in the rendered panel. `html-css/general-html-overview/forms-and-inputs/sheet.json` row 15, `                  checked> Free</label>`, declares no role and so draws `plain` white. It continues the `<label><input` opened on row 14, which carries no closing `>`, so the rule in `DESIGN_LANGUAGE-html-css.md` reaches "is a wrapped attribute, continuing a tag opened above it" before it reaches the prose test and gives the line `string`, which is amber. The same panel draws two lines of exactly that shape amber, the `autocomplete="email" required>` and `minlength="12" required>` continuations, so a reader scanning for where a tag carries on gets two of three and the attribute `checked` is set in the colour the sheet reserves for prose. A sibling sheet settles which colour was meant: `links-and-navigation` row 16 is the same construction - wrapped attributes, the `>` that closes the tag, then prose and a closing tag - and is declared `string`. Measured 2026.10.19 over `php -S localhost:8000` at the page's 900px cap, by applying the rule's own table to all 130 non-blank lines in the six sheets: 129 agree and this one does not. Captured in `test-results/ui-ux-tester.agent/ui-ux-tester.2026.10.19-crop-html-wrapped-attributes-1x.png`
  - **Goal**: Resolve to [wrapped-attribute-colour.prompt.md](.claude/prompts/wrapped-attribute-colour.prompt.md)
  - From: New Cheatsheets `->` HTML/CSS
- [x] The design language's count of lines per role holds for one role of the three it names
  - **Issue**: `DESIGN_LANGUAGE-html-css.md` says under **What this category adds on top of the global record** that "Structure comes out yellow, configuration green, content white, and the six sheets in the category land between three and sixteen lines of each". Counted across the six on 2026.10.19, that holds for yellow alone: `keyword` runs 3, 3, 3, 5, 12, 16, which is where both ends of the quoted range come from. Green runs 1, 5, 5, 8, 9, 10 and white runs 1, 1, 3, 4, 4, 14, so both fall below three - Text Content carries one green line, and Links and Navigation and Images and Media carry one white line each. Two roles are absent from a sheet altogether: Text Content has no comment and no `string` line. The figure reads as a measurement of all three and is a measurement of one
  - **Goal**: Replace the single range with the three the sheets actually land in, or state the range per role, so the next category measured against this document is held to a figure that was taken rather than to one that fits only yellow. The **General CSS Overview** item under `## Current` says it is drawn to this document, so it is the item that would inherit the wrong figure
  - From: UI/UX Override - the markup panel and the bare arrival
- [x] The first dropdown arrives blank, which is also what a dropdown looks like when it failed to load
  - **Issue**: The catalog holds two categories, so nothing is preselected and `#category` sits on its `<option value="" style="display:none">`. The control renders as a bordered box with a chevron and no text in it, and it is the first interactive thing on the page. Observed 2026.10.19 at 1400x1000 and at 375x812 in `arrival-1400x1000.png` and `arrival-375x812.png`. A reader is not stuck - the `Select Cheatsheet` label sits above it and step 1 beside it - but the control itself is the one element that could name the choice and says nothing, and a blank control is the same shape a control takes when its options never arrived. The right-hand column is 0px high rather than an empty frame, so nothing there reads as a failure; this is the only part of the arrival that can be misread. Noted beside it: `#category` hides its blank option and `#example` does not, so the second dropdown offers a selectable empty row and the first does not
  - **Goal**: Give the first control a placeholder its closed state can show - a `disabled selected` option reading something like `Choose a category` - rather than a hidden empty one, and settle whether the two controls should treat their blank option alike. `tools/test-page-structure.mjs` reads the page source and is where an assertion over the placeholder would sit
  - From: UI/UX Override - the markup panel and the bare arrival
- [x] Token Accents 1
  - **Issue**: A code line is now several `<text>` elements placed at `x + measureRun(prefix)`, and `measureRun` sums per-character advances with no kerning while the engine kerns the glyphs it draws. While a line was one element the engine laid it out end to end and absorbed its own kerning; now the table decides where every run starts, so the difference opens as a gap at the boundary. Measured in Chromium over `php -S localhost:8000`, all seventeen sheets drawn at the page's 900px cap, taking each gap as `drawn_x(next) - drawn_x(current) - engineWidth(text between them)`: 1,791 boundaries, 32 at or over one page pixel against the request's own expectation of under one, worst 2.50 px after ` A = [` on `javascript/arrays/slicing-arrays` row 0. Fifteen of the 32 are mid-token, where the two runs have no whitespace between them and the gap opens inside the code: `nestArrayToChange[` before its index on 13 lines of `javascript/arrays/changing-elements` at 1.75-1.78 px, `Term` before `</dt>` on `text-content` row 22 at 1.65 px, and `Total` before `</th>` on `tables-and-data` row 24 at 1.43 px. Isolated at the sheets' code size, `" "`, `"A"` and `"="` each agree with the engine to within 0.04 units while `" A = ["` disagrees by 6.86, which is the kerning. `forms-and-inputs`, the panel the original report was written against, is the cleanest in the catalog at 0.04 px, so the defect is not where it was looked for. Captured in `test-results/ui-ux-tester.agent/ui-ux-tester.2026.10.20-panel-changing-token-6x.png`, against `-panel-changing-fallback-6x.png` where the same lines draw tight
  - **Goal**: Resolve to [token-accent-seams.prompt.md](.claude/prompts/token-accent-seams.prompt.md)
  - From: Depend on the `napkin-sketch` Package
- [x] Token Accents 2
  - **Issue**: `index.html` puts `prepareAccents()` in the same `Promise.all` as the catalog fetch, and `Promise.all` settles on its slowest member, so `buildDropdowns` is gated behind the heaviest thing the page loads. The comment above the call says "nothing waits on it" and `api/cheatsheet/accents.mjs` says the reader "arrives alongside the first `sheet.json` rather than in front of it"; the code does the opposite. Timed in Chromium throttled to 1.5 Mbps and 150 ms latency, watching when `#category` gains its options: 7,182 ms as the page ships against 2,543 ms with the accent entry blocked, so the first interactive control arrives 4,639 ms later than it needs to. On loopback the ordering is the same and the cost is hidden, the catalog at 53.4 ms after the wave finished at 29.6 ms. On a host that compresses, the wave is about 335 KB gzipped and still sits roughly 1.5 s in front of the control. The same line drops the third result, so the `{ ready, reason }` that `prepareAccents` is written not to throw is never read and a page that cannot load the reader draws per-line and says so nowhere
  - **Goal**: Resolve to [token-accent-wave-blocks-catalog.prompt.md](.claude/prompts/token-accent-wave-blocks-catalog.prompt.md)
  - From: Depend on the `napkin-sketch` Package
- [x] The manifest asks the accent reader to load and never reads its answer
  - **Issue**: `tools/build-manifest.mjs:967` is `const accents = await prepareAccents();` and `accents` is never read again. `prepareAccents` is written not to throw and to hand back `{ ready, reason }` for exactly this reason - its own doc says "a composition that fell back silently is the case this repository has been bitten by before, so the reason comes back to be reported" - and this is the second of the layer's two callers to drop it, after the `index.html` line **Token Accents 2** covers. The two modes fail differently. Under `--check`, rule `accents` in `checkCatalog` warns once per sheet, so seventeen warnings appear and the gate still exits 0. Under a plain `node tools/build-manifest.mjs`, `findings` is `catalog.findings`, which rule 6a never reaches, so a reader that failed to load leaves no trace at all: the tool prints `wrote cheatsheets.json` and `cheatsheets 17 in 2 categories` exactly as it does on a good run. Reachable by deleting or renaming `api/napkin-sketch/markdown/`, which `VENDOR-CHECK.mjs` would catch and `build-manifest.mjs` would not
  - **Goal**: Read the result and say so when it is `false` - the `reason` on stderr before the catalog is read is enough, since it is one line per run and not one per sheet. Decide at the same time whether a failed reader should fail `--check` rather than warn seventeen times: the manifest's own bytes do not depend on accents, so a warning may be the right level, but it should be one warning about the reader rather than seventeen about its consequences
  - From: UI/UX Override - token accents, measured in a browser
- [x] `forgetAccents` is exported for a test that says it does not call it
  - **Issue**: `api/cheatsheet/accents.mjs` exports `forgetAccents`, `api/cheatsheet/index.mjs` re-exports it, and nothing in the repository calls it. Its own docstring says it is "For tests that need the un-prepared path back", and the one case that needs that path - `nothing is coloured token by token before the reader is prepared` in `tools/test-sheet-accents.mjs` - says in its comment that `forgetAccents` "is not called here", relying on being ordered first in the file instead. So the reset exists for a caller that chose not to use it, and nothing exercises it: a `forgetAccents` that stopped working would fail no case
  - **Goal**: Either call it where it was written to be called - which would also free that case from depending on its position in the file - or drop it from both modules. Not both ways: an exported reset nothing calls is a third state of this module that nothing holds to anything
  - From: UI/UX Override - token accents, measured in a browser
- [x] A wrong-typed `language` leaves the layer as a minified third-party crash
  - **Issue**: `composeSheet` checks the shape of every document field it had before this run - `doc.title` raises `cheatsheet: a sheet document needs a title`, and `codeLines` returns `[]` rather than throwing when `doc.code` is neither a string nor an array - and `doc.language` is checked nowhere. `accentRoles` guards only `!language`, so a truthy non-string is handed to `accentRuns`, and `composeSheet({ title: "x", language: 123, code: [{ text: "a" }] })` throws `TypeError: t.trim is not a function` from inside the vendored bundle. Same for `true`, an array or an object. `node tools/build-manifest.mjs --check` catches it and reports `the document does not compose, so it has no box to reserve: t.trim is not a function`, which names neither the field nor the file's own layer, and `selectExample()` in `index.html` does not catch it at all
  - **Goal**: Refuse a non-string `language` where the document's other fields are refused, in the layer's own words, or coerce it the way `codeLines` coerces `code`. One line either way, and it keeps the rule the rest of `composeSheet` already follows: a document this layer cannot read is this layer's error to name
  - From: UI/UX Override - token accents, measured in a browser
- [x] A test case reports its own source as the thing it forbids, and has since it was written
  - **Issue**: `tools/test-vendored-surface.mjs` greps the tree for `PIN.json|vendor-napkin-sketch`, the vendoring mechanism retired with `1.0.0`, and excludes four paths that keep the old names as a record. Its own path is not among them, and the case cannot name what it looks for without matching itself - the regex is in its source and so is the word in the comment above it. So it has failed every run since it landed on 2026.10.20, which is why `node --test` was at 434 of 435 on a clean tree. Found by running the suite before touching anything this run, not by a review
  - **Goal**: Exclude `tools/test-vendored-surface.mjs` alongside the four already there, for the same reason they are there, and say in the comment why a fifth was needed
  - From: UI/UX Override - token accents, measured in a browser
- [x] A centred run is centred on a width the engine does not draw
  - **Issue**: `centredAt` in `api/cheatsheet/faces.mjs` puts the middle of a run on the point it is given, and it measures that run with `measureRun`, which sums advances and carries no kerning. The engine that draws the glyphs kerns, so a run holding a kerned pair is drawn narrower than it was centred as, and sits off centre by half the kerning. Measured against the committed pair table on 2026.10.21, 16 runs across the seventeen sheets are affected: worst `javascript/arrays/max-and-min-value-array`'s title, "Max and Min Value Array", 25.30 units of kerning and so 12.65 composition units off centre, which is 3.16 px at the page's 900px cap; then `text-content` and `tables-and-data` at 10.88 units each, nine `javascript` titles at 5.39, and four subtitles between 1.40 and 4.28. **Where it does not reach**: the wordmark, the lead-in and the follow line hold no kerned pair at all, so the four fixed-text widths `DESIGN_LANGUAGE.md` records - 2084, 2595, 1481 and 2723 - are exactly as measured and the heading band's recorded geometry is untouched. Only a run carrying the sheet's own subject moves. **How it was found**: not by a review. It falls out of the pair table landing for **Token Accents 1**, which is what made a kerning error measurable anywhere in the layer for the first time; the same run declined to fix it, because `measureRun` is the ruler every recorded coordinate was matched against and changing it moves every centred run on every sheet to fix a defect in sixteen of them
  - **Goal**: Decide whether `centredAt` should measure with `drawnWidth` instead, and land it as its own change rather than as a rider. Three things have to be settled together: the committed fixtures in `tools/fixtures/` that `tools/test-render-fixture.mjs` pins byte for byte, whether `runsFit` and `codeFits` should stay on the unkerned ruler - they currently over-measure, which is conservative and safe - and whether **What a generated sheet is measured in** in `DESIGN_LANGUAGE.md` should state one ruler for placement and one for fitting rather than the split it states now. A browser case belongs with it, measuring a drawn title's ink box against the canvas axis, which is the only check that would have caught this
  - From: Depend on the `napkin-sketch` Package
- [x] **Padded Continuation**: Add the **General CSS Overview** cheatsheet at `html-css/general-css-overview/`, `kind: read`
  - Create `6` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - The category exists, so this item generates no design language and no skill. It is drawn to `DESIGN_LANGUAGE-html-css.md`, which `General HTML Overview` recorded on 2026.10.19, and the skill at `.claude/skills/html-css/` is already generated and ignored
  - The sheet count makes the subject a group and its six areas the cheatsheets under it, at `html-css/general-css-overview/<area>/`, which is the shape the first item settled
  - Each sheet names its `language` as `css`, which is what colours the panel token by token - the six sheets of **General HTML Overview** name `html`. The per-line `role` is the fallback and is still declared, per **How a token takes its colour** in `DESIGN_LANGUAGE.md`. For CSS that reads as: a comment is `comment`, a selector or an at-rule is `keyword`, a declaration is `identifier`, and a wrapped value line is `string`. The HTML mapping is recorded in the design language; add the CSS one beside it rather than leaving it to be re-derived
  - `tools/test-sheet-syntax-roles.mjs` derives the expected role from the HTML mapping only. Extend it to read the CSS mapping for a sheet whose `language` is `css`, or those six sheets are the only ones in the category nothing holds to a rule
  - Regenerate `cheatsheets.json` with `node tools/build-manifest.mjs` and gate it with `--check`
  - Add `graphic-designer` as a collaborator on the commit, per the collaborators constant
  - From: New Cheatsheets `->` HTML/CSS
- [x] Record how a new cheatsheet category is added, once the catalog work settles the shape
  - Unblocked on 2026.10.19: `html-css` is a category that was really added, so the record is written from what was actually done rather than from the rule. The item above adds a second subject to it, which is what exercises the record while it is being written
  - The steps that are easy to lose, in the order they were taken: compose the category's asset with `node tools/compose-language-asset.mjs --category <id>`, measure it into `DESIGN_LANGUAGE-<id>.md` with the analyzer under `ai-helper/graphic-designer/`, generate the skill into `.claude/skills/`, write `meta.json` at every level, write one `sheet.json` and one payload per cheatsheet, then regenerate and gate the manifest
  - `javascript` is the exception worth stating: its language is the global `DESIGN_LANGUAGE.md`, because that was measured off its own eleven images
  - `node --test tools/test-build-manifest.mjs` already fails a category with no design language, so the record describes a gate rather than a convention nobody checks
  - From: Repository Records
- [x] Close the two sloppy spellings the comment check measured but did not cover
  - `console. log(` in `javascript/arrays/sort-numbers-array/sort-numbers-array.js` parses and runs; it is the only call in the eleven written that way
  - `"Orage"` in `javascript/arrays/splicing-arrays/splicing-arrays.js` is a data value, so correcting it means correcting the four claims that faithfully report it, and `sheet.json` for that cheatsheet as well. That is the same shape as the `bannana` correction on 2026.10.19, which is the precedent to follow
  - `node --test tools/test-example-comments.mjs` is what says the claims still match afterwards
  - From: Example Script Quality
- [x] Keep the eleven `javaScriptArrays` images as reference examples and say in the repository what they are
  - They are what a composed sheet is aimed at reproducing, and the record of what a hand composed sheet looked like before one was generated. They are no longer any cheatsheet's deliverable
  - They stay as JPEG. Converting them buys nothing once no page weight depends on them, and re-encoding them re-keys the social ledger for eleven files that are not new content
  - `tools/test-sheet-composition.mjs` re-measures these exact files against the tables in `DESIGN_LANGUAGE.md`, so converting them would break the suite that holds the extraction
  - Unblocked on 2026.10.19: the roadmap held this until a second category existed, because what the eleven are for reads differently once a category is drawn rather than captured. One is
  - From: Raster Export and Example Images
- [x] Add a `graphic-designer` collaborator when a sheet composition or a rendered image is created
  - Required by the collaborators constant in `.claude/constants.md`. A composed sheet is drawn rather than captured, so the constant binds on the composition as much as on the render
  - A run records the commit mode and the automation commits, so the deliverable here is the record a committer reads rather than a commit this run makes. Write it where the item above is writing how a category is added
  - From: Raster Export and Example Images
- [x] Padded Continuation 1 - the `box-shadow` continuation on **Colors and Backgrounds** is drawn well left of the value it is padded to sit under
  - **Issue**: `html-css/general-css-overview/colors-and-backgrounds/sheet.json` writes its two-line `box-shadow` as `"  box-shadow: 0 1px 2px rgb(0 1 51 / 24%),"` followed by `"              0 8px 24px rgb(0 1 51 / 32%);"` - fourteen spaces, padded so the second value sits under the first. That alignment holds only in a monospace face, and the code panel is set in the sheet's own `"Helvetica Neue", Arial, system-ui, sans-serif`. Measured in a real engine on 2026.10.23 with `getStartPositionOfChar` on each line's first visible glyph: the `0` of `0 1px 2px` is set at x 880.736 and the `0` of `0 8px 24px` at x 739.110, so the continuation lands **141.626 composition units left** of the value above it - 35.4 px at the page's 900px cap, and visible as such in the capture. Fourteen spaces are worth 211.1 units at 15.079 each, while `  box-shadow: ` measures 352.7. Nothing else on the six is affected: every other line sits in its column to within 0.07 units, and the `linear-gradient(` block on this same sheet indents its three wrapped values by four spaces rather than padding them, which is why that block reads correctly
  - **Goal**: Indent the continuation by the convention the gradient block on this sheet already uses - four spaces, `"    0 8px 24px rgb(0 1 51 / 32%);"` - rather than padding it to a column a proportional face cannot land on. That also makes the sheet's two multi-value continuations agree with each other. Then pin it: no case in the suite compares where one line's first glyph is set against where the line above it set its own, which is why this reached the catalog. A case belongs beside `tools/test-sheet-accent-ink-browser.mjs`, reading each committed sheet's `sheet.json` for the indent each line declares and asserting that every line sharing an indent begins within a page pixel of one column, and that a line indented deeper begins right of the one above it. It has to read the first *visible* glyph, not the tspan's `x`: a run's leading spaces are folded into it on some lines and skipped on others, so comparing pen positions reports a correctly indented `"  );"` as thirty units out of column
  - From: New Cheatsheets `->` HTML/CSS
- [x] Nine more lines across six sheets pad an indent to a column a proportional face cannot land on
  - **Issue**: **Padded Continuation 1** was fixed as filed and its measurement was exact, but the claim beside it - "nothing else on the six is affected" - held only for the six `general-css-overview` sheets and only for the weaker test of whether a line sits in its own column. Measured on 2026.10.24 in Chromium at the page's 900px cap, against the character each padded line was written to sit under: `html-css/general-html-overview/forms-and-inputs` rows 4 and 8 pad an attribute under the `id=` of the `<input` above them and draw 16.584 px left of it, and row 14 pads `checked>` under a `type=` eighteen characters along and draws **36.993 px** left of it, which is wider than the 35.407 px the filed issue was raised for; `images-and-media` rows 2, 9 and 16 each pad an attribute under a `src=` and draw 17.322 px left of it; `document-structure` row 5 pads `content=` under a `name=` and draws 21.679 px left of it; `links-and-navigation` row 15 pads `target=` under an `href=` and draws 8.326 px left of it; and `javascript/arrays/sort-numbers-array` row 13 pads `b.sort` under the `a.sort` above it and draws 16.113 px left of it. `javascript/arrays/max-and-min-function-and-sort-object` breaks the same rule without padding a column: it nests array rows by one space and a sort body by three, so it has two indent units rather than one
  - **Goal**: Decide what the two transcriptions do, then make the catalog hold the rule without a record. The four `html-css` sheets are this repository's own writing and are straightforward: indent each continuation one level past the line it continues, in the `sheet.json` and in the payload file together, since the two carry the same text. The two `javascript/arrays` sheets transcribe one of the eleven original images, where re-indenting the panel makes it disagree with the artwork it reproduces and `javaScriptArrays/README.md` says what the eleven are for - so that half is a judgment call rather than an edit, and either answer needs writing down where a reader meets it. Whichever way each goes, delete its row from `NOT_A_LADDER` in `tools/test-sheet-indent-columns-browser.mjs`; the case already fails on a stale row, so the list cannot be left behind. The rule itself is recorded and needs no restating - **An indent is a level, and a column is not addressable** in `DESIGN_LANGUAGE.md`, and the fourth note on the `code` lines in `CONTRIBUTING.md`
  - From: New Cheatsheets `->` HTML/CSS
- [x] The artwork aligns the column `sort-numbers-array` pads, so faithfulness argues for re-indenting it rather than against
  - **Issue**: the found issue above leaves the two `javascript/arrays` sheets open on the grounds that re-indenting the panel "makes it disagree with the artwork it reproduces". Measured on 2026.10.24 off `javaScriptArrays/SortNumbersArray.jpg` at its own 3601px scale, that is the wrong way round for `sort-numbers-array`. In the artwork the `b.sort(` of row 13 begins at x=637 and the `a.sort(` it was padded to sit under begins at x=640 - **3 units apart, 0.75 px at the page's 900px cap**, under the floor a reader can see - and the pair tracks in parallel for the whole line, the `.` at 673 against 679 and the `(` at 800 against 805. The composed panel draws that same pair **16.102 px apart**. So the panel already disagrees with the artwork on exactly the line the padding was kept for: the eight spaces are what break the artwork's column in a proportional face, not what preserve it. The sheet has diverged from the artwork in text as well, so "a faithful copy" does not describe it today - row 2 drops the artwork's `// (9) [1, 2, 3, 8, 12, 25, 33, 50, 73]`, row 9 corrects the artwork's `01` to `1`, rows 5 and 6 merge two artwork lines into one reworded line ending `// no change`, the artwork's typographic quotes are straight quotes here, and the artwork's second `IMPORTANT` block and its `/* */` comment style are gone entirely. `max-and-min-function-and-sort-object` is the opposite case and the premise holds for it: the artwork nests its `cars` rows by one space and its sort body by three, which is exactly what the sheet declares, so re-indenting that one really would move it off the artwork
  - **Goal**: settle the `javascript/arrays` half of the found issue above against this measurement rather than against the premise written into it. `sort-numbers-array` row 13 has no artwork column left to lose, so indent it one level like any other continuation and delete its row from `NOT_A_LADDER` in `tools/test-sheet-indent-columns-browser.mjs`. `max-and-min-function-and-sort-object` is the one sheet where the artwork argument is real, so decide that one on its own terms and write the reason into `javaScriptArrays/README.md` beside what the eleven images are for, since that is where a reader meets the question. The measurements and the crops they were read off are in `test-results/ui-ux-tester.agent/`, stamped `ui-ux-tester.2026.10.24-`
  - From: UI/UX Override - the artwork answers the transcription question
- [x] Add the **Common Browser Built-in APIs** cheatsheet at `html-css/html-apis/common-browser-apis/`, `kind: embed`
  - Create `5` new cheatsheets, each with a different area of focus for the subject
  - Graphic: `sheet.json` required, composed through the API
  - **This is the repository's first `embed` payload**, and the one payload kind no committed cheatsheet exercises. `detectPayload` in `tools/build-manifest.mjs` reports `embed` from the presence of a `demo/` folder alone, and `--check` holds the declared `kind` to what is on disk, so the folder is what decides and the document only has to agree with it
  - The unreferenced-files rule lets through `demo/` and the one folder a named payload sits in, and nothing else. Everything the demo needs goes inside `demo/`, whose entry is `demo/index.html` - the walk stops at a cheatsheet folder, so nothing accounts for a stray file beside one
  - `html-apis` is a group at `html-css/html-apis/` and needs a `meta.json` with an `order` of its own, which is what places its five sheets after the twelve already in the category. Since 2026.10.23 the catalog orders a sheet by the chain of orders down its path, so this group numbering its sheets from 1 does not collide with the two groups that already do
  - The category exists, so this item generates no design language and no skill, exactly as **General CSS Overview** did not. It is drawn to `DESIGN_LANGUAGE-html-css.md`
  - **Decide what language the code panel shows before writing the sheets, because the suite now holds it.** `tools/test-sheet-syntax-roles.mjs` dispatches on the declared `language` and **fails** a sheet naming one it has no table for rather than skipping it, and it holds tables for `html` and `css` only. A panel showing the demo's markup is `language: html` and needs nothing new; a panel showing the demo's script is a third language, and that means writing both its per-line table into `DESIGN_LANGUAGE-html-css.md` and its derivation into that test
  - `DESIGN_LANGUAGE-html-css.md` already names this item as the category's first `embed` payload, under **What this category adds on top of the global record**. Record there what the kind turned out to add, the way the two `read` groups did
  - Regenerate `cheatsheets.json` with `node tools/build-manifest.mjs` and gate it with `--check`
  - Add `graphic-designer` as a collaborator on the commit, per the collaborators constant and the record now in `CONTRIBUTING.md`
  - From: New Cheatsheets `->` HTML/CSS
- [x] Decide whether the eleven `javaScriptArrays` example images ship in the published artifact, now that no cheatsheet serves a raster
  - They total roughly 20 MB and are kept as reference for what the API produces, not as any cheatsheet's graphic. The page composes its sheet in the browser, so nothing in the artifact needs them except a page that shows them as examples
  - The choice is between excluding them from the upload step and linking them from the repository, or publishing them and paying the 20 MB once rather than the 250 MB the old budget was sized against
  - Unblocked on 2026.10.23: what the eleven are for is written down now, at `javaScriptArrays/README.md`, so the decision is taken against a stated purpose rather than against a guess at one. Nothing on the published page references them
  - Whichever way it goes, say so where a contributor reads it. An exclusion is a step in `.github/workflows/pages.yml`, and a workflow that quietly drops 20 MB of tracked files is the kind of thing that reads as a fault later
  - From: GitHub Pages Deployment
- [x] Set the export preset for a rendered post image and record it where a contributor will read it: WebP, quality 80, 1400 pixel maximum long edge, 200 KB target, 300 KB hard cap
  - This is a preset for a file something outside the page asked for, not a per cheatsheet deliverable. Nothing in the repository is measured against it, because nothing is committed to measure
  - WebP rather than JPEG specifically because these are text dense code renders, where WebP holds small glyph edges better at the same weight
  - Raise an individual render to quality 90 when its code is not legible, rather than raising its dimensions past 1400 pixels
  - `CONTRIBUTING.md` is the file the item's "where a contributor will read it" now names, as of 2026.10.23. A render is already described there as a `sheet.*` the tree rule lets through by name and never commits; the preset belongs beside that rather than in a section of its own
  - From: Raster Export and Example Images
- [x] **Sandboxed Demo Frame**: Load an `embed` cheatsheet's `demo/index.html` in a sandboxed frame, so the five committed demos are reachable from the page
  - **Issue**: found 2026.10.26, while adding the **HTML APIs** group. `selectExample()` in `index.html` branches on `entry.kind === "run"` alone, so an `embed` sheet composes its graphic and loads nothing. `cheatsheets.json` records a payload for each of the five - `html-css/html-apis/<sheet>/demo/index.html` - and no route on the page requests it, so the manifest names a file the reader cannot reach
  - **Goal**: frame the payload for `kind: embed` the way the conventions in **New Cheatsheets** already describe it - `embed` loads `demo/index.html` in a sandboxed frame. Take the frame down on the next selection the way the injected script element already is, and leave the console guidance down, since an embed writes to its own frame rather than to the reader's console
  - The five demos were each driven in Chromium before they were committed and all 17 of their controls work, so what is missing is the page's side only. They are self-contained single pages that degrade where a permission is withheld, which is the behaviour a sandboxed frame will exercise: `localStorage` throws on an opaque origin and the clipboard is refused without `allow-same-origin`, and both are already reported rather than thrown
  - Decide the `sandbox` attribute deliberately rather than by what makes the demos pass. `allow-scripts` alone gives an opaque origin, which is the safest frame and the one that disables storage; adding `allow-same-origin` restores it and weakens the isolation. Whichever is chosen, say so where a demo author reads it, because it decides what a demo may rely on
  - `tools/test-example-selection.mjs` holds the behaviour that exists today in "a committed unrun cheatsheet draws, injects nothing and asks for no console", which covers every kind but `run`. An embed that frames something will need that case split rather than widened
  - From: Cheatsheet Catalog `->` What the Page Does With a Payload
- [x] Hold the padded continuation directly, so the one sheet exempt from the ladder is not exempt from the defect
  - **Issue**: observed on 2026.10.25 while verifying the nine re-indented lines, and it is a gap rather than a fault - nothing is drawn wrongly today. `tools/test-sheet-indent-columns-browser.mjs` catches a padded continuation by proxy: its own header says the ladder "stands proxy for" the defect, because the two drawn cases cannot see a line that is out of column with a value *inside* the line above. The proxy has one hole, and `NOT_A_LADDER` is it. `javascript/arrays/max-and-min-function-and-sort-object` is exempt from the ladder case by a row whose note asserts "no padded column: measured on 2026.10.24, not one of its lines aims at a position inside the line above" - a measured claim that no case checks. So on the one sheet in the catalog the ladder does not cover, the defect the whole file exists to catch is held by a comment
  - **Goal**: add a document-only case beside the ladder case in that file, asserting no sheet indents a line to the first character of a token in the line above. Two conditions, and both are needed: the line above has to leave a construct open - an unterminated tag, or a trailing binary operator - so the line below is a continuation rather than a child, and the indent has to land on a token start in it. Without the first condition a short CSS selector reads as a pad: `p {` over `  max-width: 66ch;` puts the `{` at character 2 against an indent of 2, and `html-css/general-css-overview/typography-and-text` row 17 and `responsive-design` row 25 are both reported as pads until it goes in. Prove the case rather than trusting a zero - run the same walk over the sheets as of `89a11d5` and it has to report exactly the nine the 2026.10.24 measurement found, token for token; run it over the catalog today and it reports none. A working implementation and that before/after proof are in `test-results/ui-ux-tester.agent/`, stamped `ui-ux-tester.2026.10.25-`
  - Proposed rather than promoted on purpose: the file it belongs in was still uncommitted in the working tree when this was written, so adding the case here would have folded the main call's own edits to it into a test commit
  - From: Cheatsheet Composition Language `->` The Composition Algorithm
- [x] Size the accent-arrival wait against a loaded machine rather than an idle one
  - **Issue**: observed on 2026.10.25. `the catalog arrives with the accent reader still in flight` in `tools/test-sheet-accent-arrival-browser.mjs` failed once in three consecutive full-suite runs, at 15214.66 ms against the `waitForSelector('html[data-catalog="ready"]', { timeout: 15000 })` on its first line - a timeout, not an assertion. The file passes on its own every time, and the whole suite passed either side of it. The case deliberately holds the accent reader so the page has to arrive without it, and `node --test` runs several browser files at once, so on a contended machine the held page can take longer to report ready than the wait allows. Nothing about the page is wrong: it is the only wait in the file that has to cover a deliberately stalled dependency, and it is the shortest thing standing between a clean suite and a red one nobody can reproduce
  - **Goal**: make the wait proportionate to what it is waiting for, rather than raising every timeout in the file. Either give this one case a longer wait with the reason written beside it, or wait on the signal rather than the clock - the page already sets `data-catalog="ready"`, so the case can poll that without a ceiling and fail on a page that never sets it. Whichever it is, record in the file's header that this case runs against a held dependency under suite contention, so the next person reading a flake here does not re-derive it
  - From: Page Structure and Responsiveness
- [x] Hold the documented suite invocation to what it sweeps on a working machine, not only in a clone
  - **Issue**: found 2026.10.26. `node --test` from the repository root is the documented whole-suite command, and Node's default patterns match `test-results/**/*.test.mjs` - `test-results` is not a dot directory and Node knows nothing about `.gitignore`. So a UI/UX tester's leftover artifact joins the suite on the machine that produced it. One does today: the untracked `test-results/ui-ux-tester.agent/ui-ux-tester.2026.10.25-indent-on-the-page.test.mjs` asserts its walk finds nine padded continuations in HEAD, which the 2026.10.25 run then fixed, so it fails permanently and takes `node --test` to 1 failure of 590 on this machine while the 589 tracked cases pass
  - **Issue**: `tools/test-suite-invocation.mjs` cannot see any of that. Its `ignoredDirectories()` reads `.gitignore` and so excludes `test-results/` from its own walk, which means both discovery invariants - "finds every file that holds tests" and "runs nothing that is not a test" - are blind to exactly the folder the real command does sweep. The header's claim that the walk "excludes what `.gitignore` excludes" is a statement about that walk being read as one about the suite
  - **Goal**: decide which of the two is wrong and make them agree. Either the documented invocation grows an exclusion so the command matches the invariant, or the invariant stops excluding gitignored folders so it reports what the command will actually run. Do not fix it by deleting the artifact: it is untracked, it is a tester's own record, and the next tester writes another one
  - A tester's artifact asserting a pre-fix state is the recurring shape rather than a one-off. It is written to prove a walk finds the defect it was sent to measure, which is the right thing to assert on the day and a permanent failure the day after the fix lands
  - From: version.control = null
- [x] Write `tools/cheatsheet.mjs`, the command line that composes a sheet and renders it to a media file
  - The flags, the two renderers and the three rules they carry are specified in `.claude/prompts/current-plan.prompt.md`
  - Resolve the browser at run time from a local install, from `PLAYWRIGHT_MODULE`, or from the user scope global, and skip with the install command as the reason when none answers, which is the pattern `tools/test-page-structure-browser.mjs` settled
  - Write the PNG into `.tmp/` and convert it to `<name>.webp` beside the cheatsheet, so `Watch: **/*.{jpg,webp}` in `.claude/constants.md` needs no change. Widening the watch to `png` sweeps in the favicon working set, measured at 46 files
  - Renders are untracked. Confirm the social tool globs the working tree rather than the commit before relying on that, since a pattern matching nothing reads exactly like a quiet day
  - **The render is named as expected output, rather than written outside the folder.** That is the answer to the question the `--check` item asks here: `sheet.*` is reserved in a cheatsheet folder, so `sheet.json` is the document and `sheet.webp`, `sheet.png`, `sheet.jpg` and `sheet.svg` are renders the tree rule lets through by name. Naming them is what makes the rule give the same answer everywhere - a render is untracked, so a rule that asked git what was committed would pass on the machine that rendered it and fail on the runner. `<name>` is therefore `sheet` for a cheatsheet folder, which is also what `.claude/constants.md` already expects of `<category>/<cheatsheet>/sheet.webp`
  - Seed the social ledger before the first bulk render, for the reason the constants give for a bulk conversion: the ledger is keyed by path, so a first run over the whole catalog would draft one post per sheet
  - **The preset this writes at is settled as of 2026.10.26** and is recorded under **The preset a render is written at** in `CONTRIBUTING.md`: WebP, quality 80, a 1400 px long edge, a 200 KB target and a 300 KB cap. Take the defaults from there rather than choosing new ones, and let a flag override each. The long edge is a scale of `1400 / 3600`, which the document notes clears `MIN_PUBLISH_SCALE` in `api/cheatsheet/raster.mjs` - that floor works out at 1200 px on this canvas, so a smaller render comes back marked unpublishable and the CLI should say so rather than write it silently
  - From: Raster Export and Example Images

</details>
