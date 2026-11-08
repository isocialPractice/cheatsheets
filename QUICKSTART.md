# Quickstart

The essentials, for a reader who wants a sheet on screen now. Everything else
is on the
[documentation site](https://isocialpractice.github.io/cheatsheets/docs/index.html).

## See a sheet

Open [the example page](https://isocialpractice.github.io/cheatsheets/index.html),
pick a cheatsheet from the first dropdown and an example from the second. The
sheet is composed in the browser. Nothing is downloaded and nothing is
installed.

## Serve it locally

```bash
git clone https://github.com/isocialPractice/cheatsheets.git
cd cheatsheets
php -S localhost:8000
```

A server is required rather than convenient: the page reads its catalog with
`fetch` and imports the drawing surface as a module, and a browser refuses both
to a `file://` document. Opening `index.html` from disk gives a blank page, not
a degraded one.

## Draw a sheet to a file

```bash
node tools/cheatsheet.mjs --list
node tools/cheatsheet.mjs --generate javascript/arrays/splicing-arrays --format webp
```

The command reports which of the two raster routes answered, because a file
that does not say that cannot be reviewed against the design language. Nothing
has to be installed for either.

## Draw a document of your own

A document in the **compact** shape is a title and one flat `code` array, which
is what every `sheet.json` in this repository is written in:

```json
{
  "title": "Sample Sheet",
  "subtitle": "What this sheet is for",
  "kind": "read",
  "language": "javascript",
  "seed": "sample-sheet",
  "code": [
    { "text": "const items = [\"one\", \"two\", \"three\"];", "role": "identifier" },
    { "text": "console.log(items.length); // 3" }
  ]
}
```

A document does not have to be in the catalog to be rendered:

```bash
node tools/cheatsheet.mjs --document sample-sheet.json --format svg
```

## Add it to the catalog

A cheatsheet is a folder holding a `sheet.json`, at `<category>/<sheet>/` or
`<category>/<group>/<sheet>/`, with the readable titles in a `meta.json` at
each level:

```text
javascript/arrays/sample-sheet/sheet.json
javascript/arrays/sample-sheet/meta.json
```

Then regenerate the manifest the page reads and commit it with whatever changed
it:

```bash
node tools/build-manifest.mjs
```

## Before you commit

```bash
node tools/build-manifest.mjs --check
node api/napkin-sketch/VENDOR-CHECK.mjs
node --test
```

The first two are what the Pages workflow runs before it publishes. The first
catches the fault that is invisible locally: Pages serves from a case sensitive
filesystem while the work happens on Windows, so a path cased wrongly resolves
on the machine that wrote it and 404s on the published site.
