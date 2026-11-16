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
| `index.html` | Prose sections, a definition list, and a page menu |
| `tutorial/getting-started.html` | Code examples |
| `tutorial/reading-data.html` | A table, and a chart with a script behind it |
| `docs/configuration.html` | A table of options, in a folder of one page |
| `docs/reference/commands.html` | The comment syntax, a dropdown menu, prose outside the marking |
| `docs/reference/exit-codes.html` | A definition list, in a folder inside a folder |

The chart is the shape worth naming, because it is the one that is not merely
content: it brings a `<script>` with it, and that script holds a `</div>` in a
string. Both readers treat a script as opaque, so the closing tag inside it is
not a close - and a reader that got that wrong would end the marked element
early and carry half a page onto the generated cheatsheet with nothing said
about it.

## The three markings, and where each one is

| Marking | Where | What it says |
| --- | --- | --- |
| `data-cheatsheet` | Four of the six pages | This element wraps cheatsheet material |
| A `cheatsheet` comment | `docs/reference/commands.html` | The same, with properties an attribute has nowhere to put |
| `data-cheatsheet-menu` | `index.html`, `docs/reference/commands.html` | Where a menu is written **into** a page the site keeps |

The comment on `commands.html` is written the way every cheatsheet comment is,
and it stands in front of the element it applies to with nothing but whitespace
between them:

```html
<!-- {% cheatsheet: [heading: page] %} -->
<section>
```

That rule needed real markup to be read against: the page carries a paragraph
outside its marked element, so a directive carried forward to the next element
it could find would be one applied to the wrong material.

Both menu modes are here. `index.html` asks for `page`, one link to the page
carrying every cheatsheet; `commands.html` asks for `dropdown`, an entry per
generated page, from two folders down - so the link walk is exercised rather
than assumed. A menu that is **refused** is on the variant site below.

## A folder is a cheatsheet, and the immediate parent is the folder

`docs/reference/` is the folder inside a folder, and it is what says which name
a cheatsheet takes: its two pages are written as `reference.html`, headed
`Reference`, rather than joining the `docs/` cheatsheet above them. They are
marked one way each, so one cheatsheet is written out of both methods at once.

`docs/` is left holding one page on purpose. One page in a folder is a
cheatsheet with one section - the shape does not change with the count - and
the tempting other reading is to group only at two or more.

## Running the tooling against it

```batch
node tools/cheatsheet-site.mjs fixtures/site --dry-run
```

Nothing in this repository runs it against the repository root, and nothing
should: every marked element here is marked on purpose, and a crawl from the
root would collect this folder as though it were the site.

A real run writes a `cheatsheets/` folder beside these pages **and fills the
two menus**, which rewrites `index.html` and `commands.html` in place. That is
why every case runs it against a copy in the temporary folder, and why this
folder holds no generated output of its own.

## What a run writes, committed

`fixtures/expected/site/` holds every file a run creates or changes here, as it
comes out: the five generated pages, the manifest beside them, and the two
pages whose menus were filled. `tools/test-fixture-expected.mjs` runs the tool
against a copy and compares the two, so the output can be read and diffed
without running anything. Its header says how to regenerate them.

## The variant site beside this one

`fixtures/site-taken/` is the second root, and it carries the two cases this
one cannot: a `cheatsheets/` folder the site owner already has, so the output
ladder resolves past it, and a menu element holding a hand written menu, which
a run refuses rather than writing over. This root reads clean - the tool has
nothing to report about it - and that is worth keeping, so the refusals live
next door. Read [its README](../site-taken/README.md) for what it holds.
