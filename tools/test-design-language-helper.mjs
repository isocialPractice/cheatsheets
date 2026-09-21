// The design language helper, ported into `ai-helper/graphic-designer/`.
//
// The port is prose apart from four scripts, and prose is not what this file
// checks. It checks the four edits the port needed on the way in, because each
// one is a place where the helper reached for something this repository does
// not have, and three of the four fail **quietly** if they regress:
//
// - An API resolved by package name resolves to nothing here, and a report with
//   no palette reads as a file with no colors.
// - A `resources.md` looked for in the tracked `references/` is not found, and
//   an unconfigured brand draws a mark in the design language rather than a
//   hole, so the page still comes out looking finished.
// - A registration under `.claude/references/` whose root is taken as the
//   folder holding `references/` resolves every path against `.claude/` and
//   finds nothing.
//
// Only the fourth - the two command paths that went through a plugin root -
// fails loudly, and it is the one checked by reading the file.
//
// Run with: node --test tools/test-design-language-helper.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyzeMedia,
  analyzeSvg,
  decodeEntities,
} from "../ai-helper/graphic-designer/skills/design-language/scripts/analyze-media.mjs";
import {
  brandInstructions,
  findResourcesFile,
  loadGraphicApi,
  registrationRoot,
  resolveBrand,
} from "../ai-helper/graphic-designer/skills/design-language/scripts/brand-resources.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const helper = join(root, "ai-helper", "graphic-designer");
const scripts = join(helper, "skills", "design-language", "scripts");

/**
 * The asset the two end-to-end cases generate a skill from.
 *
 * A tracked file, and that is the whole of why this one. The brand assets sit
 * in `.claude/`, which is ignored, so a clone does not have them and a case
 * that named one would fail on every machine but the one that wrote it - the
 * reason `tools/test-brand-bridge.mjs` skips its own constants cases. Nothing
 * here wants *that* asset, only an SVG with type, strokes, radii and a named
 * group in it, and the render fixture beside this file is exactly that and is
 * pinned never to change.
 */
const ASSET = join(root, "tools", "fixtures", "shapes.svg");

/** The stem the generator names everything it writes after. */
const STEM = "shapes";

/** Reads a file of the port as text. */
const read = (...parts) => readFileSync(join(helper, ...parts), "utf8");

/* --- 1. What came across, and what did not -------------------------------- */

test("the two skills, the command and the contract file are all here", () => {
  for (const path of [
    ["commands", "design-language.md"],
    ["instructions", "design-language.instructions.md"],
    ["skills", "design-language", "SKILL.md"],
    ["skills", "design-language", "references", "resources.md"],
    ["skills", "design-language", "scripts", "analyze-media.mjs"],
    ["skills", "design-language", "scripts", "brand-resources.mjs"],
    ["skills", "design-language", "scripts", "generate-skill.mjs"],
    ["skills", "design-language", "scripts", "template.md"],
    ["skills", "graphic-design-api", "SKILL.md"],
    ["skills", "graphic-design-api", "references", "composition.md"],
    ["skills", "graphic-design-api", "references", "color-and-type.md"],
    ["skills", "graphic-design-api", "references", "principles.md"],
  ]) {
    assert.ok(existsSync(join(helper, ...path)), `${path.join("/")} did not come across`);
  }
});

test("and the installer did not", () => {
  // Upstream's installer copies this tree into a dot folder of its own
  // repository, and the plugin manifest names a marketplace this repository is
  // not part of. Neither has anything to do here, and a `.claude-plugin/`
  // sitting in the tree would read as though one did.
  assert.ok(!existsSync(join(helper, ".claude-plugin")), "the plugin manifest came across");
  // Nothing tells a reader to *run* it. The README still names it, in one
  // sentence saying why it is not here, and that is the opposite of an
  // instruction - so what is checked is the code blocks, which is where a
  // command a reader would paste actually lives.
  for (const name of ["README.md", "commands/design-language.md", "instructions/design-language.instructions.md"]) {
    for (const block of read(...name.split("/")).matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
      assert.doesNotMatch(block[1], /npm run/, `a code block in ${name} still runs an npm script`);
    }
  }
});

test("nothing addresses a script through a folder this repository does not have", () => {
  // The two paths in the command were `${CLAUDE_PLUGIN_ROOT}/skills/...`, which
  // is a folder that exists only where the helper was installed as a plugin.
  const files = [
    read("commands", "design-language.md"),
    read("instructions", "design-language.instructions.md"),
    read("skills", "design-language", "SKILL.md"),
    read("skills", "graphic-design-api", "SKILL.md"),
    read("README.md"),
  ];
  for (const text of files) {
    assert.doesNotMatch(text, /CLAUDE_PLUGIN_ROOT/, "a path still goes through the plugin root");
  }
  // And the paths they were replaced with resolve.
  const command = read("commands", "design-language.md");
  for (const match of command.matchAll(/node (ai-helper\/\S+\.mjs)/g)) {
    assert.ok(existsSync(join(root, match[1])), `the command names ${match[1]}, which is not there`);
  }
});

test("no prose imports the drawing API by package name", () => {
  // There is no `napkin-sketch` package here and no `package.json` to declare
  // one, so an example that imports it is an example that cannot be run.
  for (const dir of ["skills/design-language", "skills/graphic-design-api"]) {
    const walk = (at) =>
      readdirSync(join(helper, at), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(`${at}/${entry.name}`) : [`${at}/${entry.name}`]
      );
    for (const file of walk(dir)) {
      const text = readFileSync(join(helper, file), "utf8");
      assert.doesNotMatch(
        text,
        /from '(?:napkin-sketch)(?:\/[^']*)?'/,
        `${file} imports the drawing API as a package`
      );
    }
  }
});

/* --- 2. The loader, which is the edit that fails quietly ------------------ */

test("both scripts resolve the ported barrel", async () => {
  const api = await loadGraphicApi();
  for (const name of ["createComposition", "parseResources", "findBrandSlots", "decodePng", "inlineSvg"]) {
    assert.equal(typeof api[name], "function", `the barrel the loader found has no ${name}`);
  }
});

test("and the analyzer's own loader reaches it, which a decoded PNG is the proof of", async () => {
  // A PNG palette can only be non-empty if the API was loaded: there is no
  // second decoder in the script. This is the case upstream answered with
  // `npm run build`, and the answer here is the walk up to `api/`.
  const report = await analyzeMedia(join(root, "mark.png"), { colors: 4 });
  assert.ok(report.palette.length > 0, "the PNG came back with no palette, so the API was not found");
  // A raster still says what a raster cannot say. What it must not say is that
  // the API was missing, which is the note the walk up exists to prevent.
  for (const note of report.notes.concat(report.brand.notes)) {
    assert.doesNotMatch(note, /API was not loaded/, `the report says the API was missing: ${note}`);
  }
});

test("a loader that cannot find the API throws rather than returning nothing", async () => {
  // `brand-resources.mjs` is the half that must not degrade. Every other
  // failure in it leaves a brand slot, and a slot with nothing behind it is
  // drawn as a mark in the design language rather than left as a hole - so an
  // unresolved API would produce a finished looking page with nothing saying
  // the API was never there.
  const before = process.env.CHEATSHEET_GRAPHIC_DESIGN_API;
  process.env.CHEATSHEET_GRAPHIC_DESIGN_API = join(root, ".tmp", "no-such-barrel.mjs");
  try {
    await assert.rejects(() => loadGraphicApi(), /no-such-barrel\.mjs/);
  } finally {
    if (before === undefined) delete process.env.CHEATSHEET_GRAPHIC_DESIGN_API;
    else process.env.CHEATSHEET_GRAPHIC_DESIGN_API = before;
  }
});

test("and the analyzer says which path it looked for rather than reporting an empty file", async () => {
  const before = process.env.CHEATSHEET_GRAPHIC_DESIGN_API;
  process.env.CHEATSHEET_GRAPHIC_DESIGN_API = join(root, ".tmp", "no-such-barrel.mjs");
  try {
    const report = await analyzeMedia(join(root, "mark.png"), { colors: 4 });
    assert.equal(report.palette.length, 0, "a PNG decoded without the API");
    assert.ok(
      report.notes.some((note) => note.includes("no-such-barrel.mjs")),
      `no note named the path that failed: ${JSON.stringify(report.notes)}`
    );
    assert.ok(
      report.brand.notes.some((note) => note.includes("no-such-barrel.mjs")),
      "the brand report did not say why it found nothing"
    );
  } finally {
    if (before === undefined) delete process.env.CHEATSHEET_GRAPHIC_DESIGN_API;
    else process.env.CHEATSHEET_GRAPHIC_DESIGN_API = before;
  }
});

/* --- 3. Where the brand comes from --------------------------------------- */

test("the brand file is looked for in the ignored folder before the tracked one", () => {
  // `tools/build-brand-resources.mjs` writes `.claude/references/resources.md`
  // rather than the root, because the declaration is a real name and a real
  // domain. Upstream knew only the root, so this is the edit that makes the
  // bridge reachable without an environment variable.
  const before = process.env.NAPKIN_BRAND_RESOURCES;
  delete process.env.NAPKIN_BRAND_RESOURCES;
  try {
    const found = findResourcesFile({ cwd: root });
    if (!existsSync(join(root, ".claude", "references", "resources.md"))) {
      assert.equal(found, null, "something was found where the generated file is not");
      return;
    }
    assert.equal(
      relative(root, found).replace(/\\/g, "/"),
      ".claude/references/resources.md",
      "the tracked folder won, or nothing was found"
    );
  } finally {
    if (before !== undefined) process.env.NAPKIN_BRAND_RESOURCES = before;
  }
});

test("a registration in the ignored folder resolves its paths against the repository, not against .claude", () => {
  // Every path in a registration is relative to the folder holding
  // `references/`. Read literally, a registration at
  // `<repo>/.claude/references/` makes that folder `<repo>/.claude`, and every
  // path in it then resolves one level too deep and finds nothing.
  assert.equal(registrationRoot(join(root, ".claude", "references", "x.json")), root);
  assert.equal(registrationRoot(join(root, "references", "x.json")), root);
});

test("an unconfigured brand points at the bridge rather than at a file to hand-write", () => {
  const text = brandInstructions({ path: null, assets: {}, text: {}, configured: false, notes: [] });
  assert.match(text, /tools\/build-brand-resources\.mjs/);
  assert.match(text, /\.claude\/constants\.md/);
});

test("and this repository's own brand resolves through it", async (t) => {
  // `.claude/` is ignored, so a clone has no generated file and nothing to
  // resolve. That is the ordinary state rather than a failure.
  if (!existsSync(join(root, ".claude", "references", "resources.md"))) {
    t.skip("no .claude/references/resources.md; run node tools/build-brand-resources.mjs");
    return;
  }
  const brand = await resolveBrand({ cwd: root });
  assert.ok(brand.configured, "the generated file resolved nothing");
  assert.ok(brand.has("logo"), "the logo slot has no asset behind it");
});

/* --- 4. The one reading bug the port fixed -------------------------------- */

test("a font family escaped in the markup is read back as its own name", () => {
  // A family with a space in it is quoted in CSS and therefore escaped in an
  // attribute, and `&quot;` carries a semicolon. Upstream's single pattern for
  // both the attribute and the declaration ended at that semicolon, so the
  // family came back as `&quot` - a name no browser resolves, recorded in a
  // design language as though it had been measured.
  const svg = `<svg viewBox="0 0 10 10"><text font-family="&quot;Helvetica Neue&quot;, Arial, sans-serif" font-size="12">a</text></svg>`;
  assert.deepEqual(analyzeSvg(svg, 4).type.families, ["Helvetica Neue"]);
  assert.deepEqual(decodeEntities("&quot;a&quot; &amp; &#65;"), '"a" & A');
});

test("and a family in a style block still reads as it did", () => {
  const svg = `<svg viewBox="0 0 10 10"><style>.a { font-family: "Helvetica Neue", Arial; fill: #123456 }</style><text class="a">a</text></svg>`;
  assert.deepEqual(analyzeSvg(svg, 4).type.families, ["Helvetica Neue"]);
});

/* --- 5. The whole helper, end to end -------------------------------------- */

test("an asset generates a skill that runs and draws both formats", () => {
  // The long way round on purpose. A generated skill carries its own copy of
  // `brand-resources.mjs` four folders down, and the copy has to find the same
  // barrel by walking up - which is the property the package name used to
  // provide and the reason the loader walks rather than joining a fixed path.
  // Inside `.tmp/`, which is inside the repository. That matters: the walk up
  // is what finds the API, so a skill generated into the system temporary
  // folder finds nothing - which is the next case, and its own answer.
  mkdirSync(join(root, ".tmp"), { recursive: true });
  const dir = mkdtempSync(join(root, ".tmp", "helper-suite-"));
  try {
    execFileSync(
      process.execPath,
      [
        join(scripts, "generate-skill.mjs"),
        ASSET,
        "--to",
        join(dir, "skills"),
        "--register",
        join(dir, ".claude", "references"),
        "--out",
        join(dir, "out"),
        "--force",
      ],
      { cwd: root, encoding: "utf8" }
    );

    const script = join(dir, "skills", STEM, "scripts", `make-${STEM}.mjs`);
    assert.ok(existsSync(script), "no composing script was written");
    assert.ok(existsSync(join(dir, "skills", STEM, "SKILL.md")));
    assert.ok(existsSync(join(dir, "skills", STEM, "DESIGN_LANGUAGE.md")));

    execFileSync(process.execPath, [script, "--out", join(dir, "out")], { cwd: root, encoding: "utf8" });
    assert.ok(existsSync(join(dir, "out", `${STEM}.svg`)), "no SVG came out");
    assert.ok(existsSync(join(dir, "out", `${STEM}.png`)), "no PNG came out");

    // The registration is what makes a generated skill reachable without
    // anyone remembering a path, so its own paths have to resolve.
    const registration = JSON.parse(readFileSync(join(dir, ".claude", "references", "graphic-design-api.json"), "utf8"));
    assert.ok(existsSync(resolve(dir, registration.script)), "the registration names a script that is not there");
    assert.ok(existsSync(resolve(dir, registration.skillDir)), "the registration names a skill folder that is not there");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a skill generated outside the repository still finds the API, given the variable", () => {
  // The walk up ends at the drive root, so a skill generated into a temporary
  // folder has no `api/graphic-design/` above it. That is the case
  // `CHEATSHEET_GRAPHIC_DESIGN_API` exists for, and it is the only route left
  // once the package name is gone.
  const dir = mkdtempSync(join(tmpdir(), "cheatsheet-helper-away-"));
  try {
    const barrel = join(root, "api", "graphic-design", "index.mjs");
    const env = { ...process.env, CHEATSHEET_GRAPHIC_DESIGN_API: barrel };
    execFileSync(
      process.execPath,
      [join(scripts, "generate-skill.mjs"), ASSET, "--to", join(dir, "skills"), "--no-register", "--force"],
      { cwd: dir, env, encoding: "utf8" }
    );
    const out = execFileSync(
      process.execPath,
      [join(dir, "skills", STEM, "scripts", `make-${STEM}.mjs`), "--out", join(dir, "out")],
      { cwd: dir, env, encoding: "utf8" }
    );
    assert.match(out, /wrote/);
    assert.ok(existsSync(join(dir, "out", `${STEM}.png`)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
