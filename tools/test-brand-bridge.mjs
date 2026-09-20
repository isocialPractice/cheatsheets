// The bridge from a repository's declared brand to the `resources.md` the
// design language helper reads: `tools/build-brand-resources.mjs`.
//
// Most of what is checked here runs against a fixture written into a temporary
// folder rather than against this repository's own constants file. That file
// is inside `.claude/`, which is ignored, so a clone does not have one and a
// suite that depended on it would report a failure on every machine but this
// one. The cases that do read it skip with the reason where it is absent.
//
// The fixture is also where the three faults can be *demonstrated* rather than
// asserted. Each is a line the real file happens to contain; putting an
// equivalent line in a fixture makes the case readable without anyone needing
// the real brand in front of them.
//
// Run with: node --test tools/test-brand-bridge.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep } from "node:path";

import { parseResources } from "../api/graphic-design/brand.mjs";
import {
  DEFAULT_CONSTANTS,
  DEFAULT_OUT,
  descriptorsIn,
  editDistance,
  findBrandSection,
  readBrand,
  renderResources,
  slotsOf,
} from "./build-brand-resources.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A constants file shaped like a real one: a brand section under a misspelled
 * heading, surrounded by unrelated sections that also use `- key: value`.
 *
 * The `- Media: self` line is the one that matters. It belongs to an unrelated
 * section, and `media` is one of the keys `parseResources` treats as an assets
 * **folder**, so a parser pointed at the whole file would have the brand
 * declare a directory named `self`.
 */
const FIXTURE = `# Constants

## Completed Items

- rollCompleteMethod: details

## Brand Resouces

Use for \`resources.md\` file generated from A.I. helper. Links are relative to this file.

- logo: assets/logo.svg
- footer-img: assets/footer.png
- brand name: Acme Corp
- domain: example.com
- tag line: Sample tagline for the demo brand

## Social Media Posting

- Watch: \`**/*.{jpg,webp}\`
- Media: self
- Review: required
- Chrome Profile: 2
`;

/** A temporary constants file with the two assets beside it. */
function fixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), "brand-bridge-"));
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "assets", "logo.svg"), "<svg viewBox='0 0 10 10'></svg>", "utf8");
  writeFileSync(join(dir, "assets", "footer.png"), "not really a png", "utf8");
  const constants = join(dir, "constants.md");
  writeFileSync(constants, FIXTURE, "utf8");
  return { dir, constants, out: join(dir, "references") };
}

/* --- Fault 1: the heading is misspelled ---------------------------------- */

test("a misspelled heading is still the brand section", () => {
  const found = findBrandSection(FIXTURE);
  assert.ok(found, "the section was not found at all");
  assert.equal(found.heading, "Brand Resouces");
  assert.notEqual(found.spelling, "brand resources", "the fixture no longer carries the misspelling");
  assert.match(found.body, /- logo: assets\/logo\.svg/);
  // The section ends at the next heading of its own level, so the sections
  // around it are not part of it.
  assert.doesNotMatch(found.body, /Media: self/);
});

test("and so is the correct spelling, at any heading level", () => {
  for (const heading of ["## Brand Resources", "### Brand Resources", "# BRAND RESOURCES"]) {
    const found = findBrandSection(`${heading}\n\n- logo: assets/logo.svg\n`);
    assert.ok(found, `"${heading}" was not recognised`);
    assert.match(found.body, /logo/);
  }
});

test("but an unrelated heading is not swept in by the tolerance", () => {
  // The tolerance is two characters, which is enough for a slip and not
  // enough for a different section. Without this case the matcher could be
  // widened until it matched the first heading in any file.
  for (const heading of ["## Brand Guidelines", "## Resources", "## Completed Items", "## Code Reviews"]) {
    assert.equal(findBrandSection(`${heading}\n\n- logo: assets/logo.svg\n`), null, `"${heading}" was matched`);
  }
});

test("the distance the tolerance is measured with behaves", () => {
  assert.equal(editDistance("brand resouces", "brand resources"), 1);
  assert.equal(editDistance("brand resources", "brand resources"), 0);
  assert.ok(editDistance("resources", "brand resources") > 2);
});

/* --- Fault 2: a key that normalizes to no slot --------------------------- */

test("a footer declared under any key fills the footer slot, because the folder is what is declared", async () => {
  const { dir, constants, out } = fixtureRepo();
  try {
    const brand = await readBrand(FIXTURE, constants);
    // What the constants file said, which is the key that resolves to nothing.
    assert.deepEqual(
      brand.assets.map((asset) => asset.key).sort(),
      ["footerImg", "logo"],
      "the declaration no longer carries the key this fault is about"
    );
    assert.equal(brand.folder, resolve(dir, "assets"));

    // What the generated file says instead, and what the helper takes from it.
    const resources = renderResources(brand, out, constants);
    assert.match(resources, /^- assets: \.\.[\\/]assets$/m);
    assert.doesNotMatch(resources, /footerImg/, "the unusable key was carried into the generated file");
    assert.deepEqual((await descriptorsIn(brand.folder)).sort(), ["footer", "logo"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("and the folder is written relative to the generated file, not to the constants file", async () => {
  // The two live in different folders, so a path copied across unchanged
  // resolves to nothing. `../assets` from `references/` is the whole point.
  const { dir, constants, out } = fixtureRepo();
  try {
    const brand = await readBrand(FIXTURE, constants);
    const declared = /^- assets: (.+)$/m.exec(renderResources(brand, out, constants))[1];
    assert.equal(resolve(out, declared), resolve(dir, "assets"));
    assert.ok(existsSync(resolve(out, declared)), "the declared folder does not resolve to anything");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* --- Fault 3: the rest of the file is not brand -------------------------- */

test("nothing outside the brand section is read as a brand slot", async () => {
  const { dir, constants, out } = fixtureRepo();
  try {
    const brand = await readBrand(FIXTURE, constants);
    const resources = renderResources(brand, out, constants);
    for (const stray of ["rollCompleteMethod", "watch", "review", "chromeProfile", "self"]) {
      assert.doesNotMatch(
        resources,
        new RegExp(stray, "i"),
        `"${stray}" comes from outside the brand section and reached the generated file`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("which matters most for the one stray key that is an assets folder", () => {
  // Demonstrating the harm rather than describing it: `media` is a directory
  // key, so a parser handed the whole file declares a folder named `self`.
  const wholeFile = parseResources(FIXTURE);
  assert.equal(wholeFile.directories.media, "self");
  // And the section on its own does not.
  assert.equal(parseResources(findBrandSection(FIXTURE).body).directories.media, undefined);
});

/* --- What the helper ends up reading ------------------------------------- */

test("the generated file parses back into the slots the helper asks for", async () => {
  const { dir, constants, out } = fixtureRepo();
  try {
    const brand = await readBrand(FIXTURE, constants);
    const slots = slotsOf(renderResources(brand, out, constants));
    assert.deepEqual(slots.directories, ["assets"]);
    assert.deepEqual(slots.text.sort(), ["brandName", "domain", "tagline"]);
    // No single-asset lines, because the folder covers both.
    assert.deepEqual(slots.paths, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("its own prose does not parse as a declaration", async () => {
  // The generated file explains itself, and an explanation that parsed as a
  // slot would be a brand asset named after a sentence.
  const { dir, constants, out } = fixtureRepo();
  try {
    const resources = renderResources(await readBrand(FIXTURE, constants), out, constants);
    const declared = parseResources(resources);
    assert.deepEqual(
      declared.entries.map((entry) => entry.key).sort(),
      ["assets", "brandName", "domain", "tagline"]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a declared asset that is not on disk is reported rather than written as though it were", async () => {
  const { dir, constants } = fixtureRepo();
  try {
    rmSync(join(dir, "assets", "footer.png"));
    const brand = await readBrand(FIXTURE, constants);
    assert.equal(brand.assets.find((asset) => asset.key === "footerImg").exists, false);
    assert.ok(
      brand.notes.some((note) => note.includes("footer.png")),
      "a missing asset produced no note"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a file with no brand section at all is a null rather than an empty brand", async () => {
  // An empty brand and no brand are different things, and only one of them is
  // worth writing a file for: the helper fills an unconfigured slot with a
  // mark drawn in the design language, so an empty `resources.md` looks
  // exactly like a working one.
  assert.equal(await readBrand("# Constants\n\n## Code Reviews\n\n- Review: light\n", "constants.md"), null);
});

/* --- Where it writes ----------------------------------------------------- */

test("the default output is inside an ignored folder, not the tracked one the helper prefers", () => {
  // The helper's own default is `references/resources.md`, found by walking up
  // from the working directory - which at a repository root is tracked. The
  // brand values are a real domain, a real name and a real tagline, so the
  // generated file goes inside `.claude/`, which the ignore rules cover.
  const relOut = DEFAULT_OUT.slice(root.length + 1).split(sep);
  assert.ok(relOut[0].startsWith("."), `the default output is ${relOut.join("/")}, which is not an ignored folder`);
  assert.notEqual(relOut[0], "references", "the default output is the tracked folder at the repository root");
  assert.equal(relOut.at(-1), "references");
});

/* --- Against this repository's own declaration --------------------------- */

const noConstants = !existsSync(DEFAULT_CONSTANTS);
const skip = noConstants && {
  skip: `${DEFAULT_CONSTANTS.slice(root.length + 1)} is not in this clone, which is the ordinary case - it is ignored.`,
};

test("this repository's own brand section is found and resolves", { ...skip }, async () => {
  const { readFile } = await import("node:fs/promises");
  const brand = await readBrand(await readFile(DEFAULT_CONSTANTS, "utf8"), DEFAULT_CONSTANTS);
  assert.ok(brand, "the constants file declares no brand section");
  assert.ok(brand.folder, "the declared assets do not share one folder");
  const descriptors = await descriptorsIn(brand.folder);
  assert.ok(descriptors.includes("logo"), `the asset folder yields ${descriptors.join(", ")} and no logo`);
  assert.ok(descriptors.includes("footer"), `the asset folder yields ${descriptors.join(", ")} and no footer`);
  for (const asset of brand.assets) {
    assert.equal(asset.exists, true, `${asset.key} declares ${asset.declared}, which is not there`);
  }
});
