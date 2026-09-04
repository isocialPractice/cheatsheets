# TODO

Planned work for this cheatsheet example repository. `## Current` holds the
next items to complete, in order; the level 2 sections below it are the
roadmap those items are drawn from.

This project is in **dated mode**. It has no `CHANGELOG.md`, no releases and
no tags, its source is browser based, and it exists to hold and demonstrate
learning examples. No section applies a version, so each states its intent
instead.

## Current

- [ ] Create `.github/workflows/pages.yml` deploying the repository root on push to the default branch and on `workflow_dispatch`
  - From: GitHub Pages Deployment
- [ ] Enable GitHub Pages for the repository with its source set to GitHub Actions
  - From: GitHub Pages Deployment
- [ ] Add a `.nojekyll` file at the published root
  - From: GitHub Pages Deployment
- [ ] Force add both `.github/workflows/pages.yml` and `.nojekyll` when they are committed
  - Both paths match `.*` in this machine's global ignore file, so a plain `git add <path>` exits 1 and `git add -A` skips them without a word. Neither file reaches GitHub without `git add -f`, and the two items above are checked off either way
  - From: GitHub Pages Deployment
- [ ] Replace the `htmlpreview` link in `README.md` with the repository's own GitHub Pages URL
  - From: Preview Links and Example Loading
- [ ] Remove the `htmlpreview` and CDN branch from `selectExample()` in `index.html` so examples load by relative path
  - From: Preview Links and Example Loading

## GitHub Pages Deployment

Publish the example page as a GitHub Pages project site, deployed from an
Actions workflow on the default branch rather than from a branch or folder.
The page is a single hand written HTML file that already serves from the
repository root, so the root is the site and no generator is needed. Work
this section through the automation's GitHub Pages instructions, which own
site work however it was raised.

**Intent**: stand up the deployment that the repository has never had.

- [ ] Create `.github/workflows/pages.yml` deploying the repository root on push to the default branch and on `workflow_dispatch`
  - Resolve the default branch from the repository rather than assuming it
- [ ] Give the workflow `contents: read`, `pages: write`, and `id-token: write` permissions, and a concurrency group so overlapping deploys cannot race
- [ ] Use the Pages action sequence: configure the environment, upload the site directory as the Pages artifact, then deploy it in a job bound to the `github-pages` environment
- [ ] Enable GitHub Pages for the repository with its source set to GitHub Actions
  - Resolve the owner from the repository itself, not from the signed in account, and report rather than work around a missing permission
- [ ] Add a `.nojekyll` file at the published root
  - The site is not built by Jekyll, so without it any path beginning with an underscore is dropped silently
- [ ] Force add both `.github/workflows/pages.yml` and `.nojekyll` when they are committed
  - A global ignore rule on this machine matches every dotted path, so both files are ignored here and neither would be tracked without `git add -f`. Only `.gitignore` escapes it, because it was committed before the rule applied. An untracked workflow means the site never builds, and an untracked `.nojekyll` means it builds wrong
- [ ] Exclude the 20 MB of cheatsheet images from the published artifact, or confirm they are small enough to publish, once the image work below lands

## Preview Links and Example Loading

The README points readers at a third party HTML preview service, and
`selectExample()` in `index.html` branches on that service's URL to load
examples and images from a CDN instead of from the repository. A published
Pages site makes both unnecessary: the page is served from the repository,
so relative paths resolve on their own.

**Intent**: replace the preview workaround with the real site.

- [ ] Replace the `htmlpreview` link in `README.md` with the repository's own GitHub Pages URL
  - Take the URL from the repository rather than building one by hand, and lower case the owner in the host
- [ ] Add the site link directly beneath the README's level 1 heading
- [ ] Remove the `htmlpreview` and CDN branch from `selectExample()` in `index.html` so examples load by relative path
- [ ] Confirm every asset path resolves under the project site base path rather than the domain root
- [ ] Replace the `XMLHttpRequest` probe that compares `statusText` against `"Not Found"` with an `img.onerror` handler or a `fetch` response check
  - The current test depends on a status text the server is free to change, and it fires a second request for an image the page then loads again

## Page Structure and Responsiveness

`index.html` is a fixed width desktop layout: the instructions panel is
pinned with `position: fixed`, the image is pushed clear of it with a
`margin-left` of 500 pixels, and there is no viewport meta tag. On a phone
the image sits off screen. The document also declares no language, and the
favicon the repository carries is never linked.

**Intent**: make the published page readable on the devices that will reach
it once it is public.

- [ ] Add `lang="en"` to the `<html>` element
- [ ] Add a `<meta name="viewport" content="width=device-width, initial-scale=1">` tag
- [ ] Replace the fixed `margin-left` offset and pinned tools panel with a layout that reflows to a single column on narrow screens
- [ ] Link `favicon.ico` from the document head
- [ ] Give the cheatsheet image an `alt` value naming the selected example rather than the generic `cheat sheet image`
- [ ] Check every text and background pair in the stylesheet reaches 4.5:1 contrast, or 3:1 for large headings

## Cheatsheet Catalog

The category dropdown offers one option, and the inline configuration block
selects it on load because it is the only one. Both branches of the
`testEnvironment` condition now do the same thing apart from presetting an
example, and the folder holds two placeholder files named with no basename
at all, one of which is the image element's initial `src`.

**Intent**: let the page carry more than one cheatsheet without hand editing
the configuration block for each.

- [ ] Select the category automatically only while exactly one exists, rather than naming it in the script
- [ ] Remove the `testEnvironment` block, or reduce it to the one behavior that differs between its branches
- [ ] Replace the empty basename `javaScriptArrays/.js` and `javaScriptArrays/.jpg` placeholders, leaving the image with no `src` until one is chosen
- [ ] Build the example dropdown from the files present rather than from a hand maintained `optgroup`
- [ ] Add a second cheatsheet category alongside the array examples

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

- [ ] Serve the images at the width the page displays them rather than at full capture resolution
- [ ] Compress the images, keeping the code in each screenshot legible
- [ ] Load the image only when an example is selected, rather than probing for it on every change
- [ ] Add a `graphic-designer` collaborator when any replacement image is created
  - Required by the collaborators constant in the user note

## Repository Records

The repository has no changelog and no contributing guidance, and the README
describes the local preview but not the published site. The LICENSE is CC0
1.0 and is not mentioned anywhere in the README.

**Intent**: give the repository the records the automation and a reader both
expect to find.

- [ ] Create `CHANGELOG.md` declaring dated release mode on the line beneath its title
- [ ] Note the CC0 1.0 license in `README.md`
- [ ] Describe both ways to view the examples in `README.md`: the published site, and a local server for anyone working on the page
- [ ] Record how a new cheatsheet category is added, once the catalog work settles the shape
