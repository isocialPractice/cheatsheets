# The variant site: everything here is already the owner's

A second fixture root, beside [`site/`](../site/README.md), and the whole of
what it carries is a site that got there first. The primary fixture reads
clean - the tool has nothing to report about it - so the cases where the tool
refuses to touch something a site owner already has need a root of their own.

It is one page of notes, and two things that were there before any run.

## A `cheatsheets/` folder of their own

`cheatsheets/` is the name a run writes its generated section into, and here it
is a folder the site keeps. So the ladder is exercised rather than assumed: a
run tries `cheatsheets/`, finds it taken, and writes into
`cheatsheets/cheatsheets/` instead.

```batch
node tools/cheatsheet-site.mjs fixtures/site-taken --dry-run
```

reports `names tried      cheatsheets, cheatsheets/cheatsheets`, and
`cheatsheets/index.html` is byte for byte what it was afterwards. The crawl
never descends into a folder of that name, so nothing in there is collected
either - the page in it says as much, and that is the only reason it holds a
page at all: a folder with no file in it cannot be committed.

A second run finds the manifest the first one wrote and reuses the folder
rather than resolving a third one, which is the failure the manifest exists to
prevent and the one that needs two runs to see.

## A menu somebody wrote by hand

The `<nav>` on `index.html` carries `data-cheatsheet-menu` and already holds a
menu of its own. A fill is written over whatever is between the tags, and a run
recognises only its own fill - wrapped in a comment it writes itself - so this
one is refused and reported rather than replaced.

That is the one expected finding of this root, and the run exits non-zero
because of it. Both halves are the fixture: the two menus that are filled are
on the site next door, and the one that is not is here.

## Everything in it is placeholder content

Northwind Traders, `demo-app`, `admin@example.net`, 123 Main Street,
(555) 123-4567. A different placeholder organisation from the site beside it,
so the two roots cannot be read as one, and nothing here describes a real one.

## What a run writes

Nothing, in this folder. `fixtures/expected/site-taken/` holds every file a run
creates or changes here, committed, and `tools/test-fixture-expected.mjs`
compares a real run against it - so the generated pages can be read and diffed
without running anything.
