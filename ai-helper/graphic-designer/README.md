# graphic-designer

Read an existing graphic into a written design language, then generate a skill
that can draw more work in it. The point is that "make another one like this"
stops being a brief somebody re-explains and becomes a script with a name.

Ported from `ai-helper/graphic-designer/` in the sibling `napkin-sketch`
repository (MIT, isocialPractice), commit
`d43caac191b2dfd532b3311f4ca1ea6969bb002f` - the same commit the drawing
surface under `api/napkin-sketch/` came from. It is the last piece of that
port: the surface draws, and this is what decides what to draw.

```text
ai-helper/graphic-designer/
├── commands/design-language.md            the procedure, as a command
├── instructions/design-language.instructions.md
└── skills/
    ├── design-language/                   measure an asset, write it down, generate the skill
    │   ├── SKILL.md
    │   ├── references/resources.md        the brand file's full specification
    │   └── scripts/
    │       ├── analyze-media.mjs          the measuring tool, importable as analyzeMedia
    │       ├── brand-resources.mjs        resolves resources.md, importable as resolveBrand
    │       ├── generate-skill.mjs         the generator, importable as generateSkill
    │       └── template.md                fill-in-the-blank procedure
    └── graphic-design-api/                compose graphics in code, with judgment
        ├── SKILL.md
        └── references/
            ├── composition.md
            ├── color-and-type.md
            └── principles.md
```

## Using it

```bash
node ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs mark.png --colors 12
node ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs mark.png --markdown
node ai-helper/graphic-designer/skills/design-language/scripts/generate-skill.mjs mark.png --to .claude/skills
```

`commands/design-language.md` is the whole procedure written out, from measuring
to checking the generated script against the source it was measured from.

## What it can measure

| Format | Palette | Type | Strokes, radii, structure |
| --- | --- | --- | --- |
| SVG | yes, weighted by class usage | yes | yes |
| PNG | yes, quantized from the pixels | no | no |
| JPEG, GIF, WebP | no decoder | no | no |

The honesty is the feature. An empty palette means "not measured", never "no
colors", and a design language whose values were guessed is worse than none -
the next asset gets drawn to it.

## What changed on the way in

Four things, and every one of them is a path rather than a behaviour. The port
is recorded in the header of each file it touched.

- **The API is resolved by path, not by package name.** Upstream imported
  `napkin-sketch` and fell back to a clone's `dist/`. This repository has no
  `package.json` and no build step, so `analyze-media.mjs` and
  `brand-resources.mjs` walk up from their own folder for
  `api/napkin-sketch/api/index.js`. The walk is what lets the copy of
  `brand-resources.mjs` inside a generated skill, four folders deeper, reach the
  same barrel; `CHEATSHEET_GRAPHIC_DESIGN_API` names it outright from outside
  the tree.
- **A loader that finds nothing says so.** That is load bearing rather than
  tidy. An unresolved *asset* leaves a slot that is drawn as a mark in the
  design language, which is correct for a brand nobody configured - so an
  unresolved *API* would otherwise produce the same finished looking page with
  nothing anywhere saying the API was never loaded. `brand-resources.mjs`
  throws, and every `analyze-media.mjs` report carries the reason in `notes`.
- **The brand comes from the constants file.** `.claude/constants.md` declares
  it, `tools/build-brand-resources.mjs` generates the `resources.md` these
  scripts read, and it writes into `.claude/references/` because the
  declaration is a real name, a real domain and a real tagline. The scripts
  look there before the tracked `references/` upstream knew about.
- **The installer did not come across.** Upstream's `npm run ai-helper` copies
  this tree into a dot folder of its own repository, which is not a thing to do
  here, and the plugin manifest names a marketplace this repository is not part
  of. The command and the contract file are addressed by path instead.

## Where the output goes

- The **design language file** goes where the work is: beside the asset, or at
  the project root. This repository's own `DESIGN_LANGUAGE.md` is written by
  hand from measurements and is never a generated file - do not write over it.
- The **generated skill** goes in `.claude/skills/<stem>/`, colliding to
  `<stem>_0` rather than overwriting. That folder is gitignored here, which is
  correct: a generated skill is an artifact, not source.
- The **graphics a generated script draws** go to `.tmp/design-language/`,
  which is ignored for the same reason. `--out` moves them.

Neither the skill nor the graphics go back into this folder.
