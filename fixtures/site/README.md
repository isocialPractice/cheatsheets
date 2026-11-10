# The fixture site

A small site that exists only so the cheatsheet tooling has something to run
against. Half of it is a tutorial and half of it is documentation for a tool,
which is the shape a real site that wants a cheatsheet section has.

It is deliberately unremarkable. The point is to carry every page shape
`tools/cheatsheet-site.mjs` and `api/cheatsheet/site.mjs` have to handle, not
to be interesting to read.

## Everything in it is placeholder content

Acme Corp, `demo-app`, `jane.doe@example.com`, 123 Main Street, (555) 123-4567.
Nothing here describes a real organisation, a real person or a real product,
and nothing should be added that does: a fixture is read as an example of how
to mark a site up, so a real value written into one is a real value published
twice over.

## What it is for

| Page | The shapes it carries |
| --- | --- |
| `index.html` | Prose sections, and a definition list |
| `tutorial/getting-started.html` | Code examples |
| `tutorial/reading-data.html` | A table, and a chart with a script behind it |
| `docs/configuration.html` | A table of options |
| `docs/commands.html` | Code examples, and prose around them |

The chart is the shape worth naming, because it is the one that is not merely
content: it brings a `<script>` with it, and that script holds a `</div>` in a
string. Both readers treat a script as opaque, so the closing tag inside it is
not a close - and a reader that got that wrong would end the marked element
early and carry half a page onto the generated cheatsheet with nothing said
about it.

## Running the tooling against it

```batch
node tools/cheatsheet-site.mjs fixtures/site --dry-run
```

Nothing in this repository runs it against the repository root, and nothing
should: every marked element here is marked on purpose, and a crawl from the
root would collect this folder as though it were the site.

A real run writes a `cheatsheets/` folder beside these pages. It is not
committed yet - comparing generated pages against committed expected output is
its own item, and it waits for the page composition to settle.

## What is deliberately not here yet

| Absent | The item that adds it |
| --- | --- |
| A section marked with the comment syntax | Mark one section with the parent tag method and another with the comment syntax |
| A folder nested inside a folder | Include a nested folder of sibling pages |
| A page carrying `data-cheatsheet-menu` | Add a page carrying `data-cheatsheet-menu` in each of its two modes |
| A pre-existing `cheatsheets/` folder | Include a variant that already has a `cheatsheets/` folder |
| Committed expected output, and a CI run | Run the scripted tool and the API against the fixture in CI |

Every page here is marked with the parent tag method, which is the simple case
and the one that needs no syntax learned. The comment syntax gets its own
fixture when the item for it is worked.
