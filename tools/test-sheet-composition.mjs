// Checks that the composition measurements hold across all eleven sheets, and
// that the figures DESIGN_LANGUAGE.md records under "The sheets" are the ones
// the artwork actually returns. The second half is the point: a table nobody
// re-measures drifts away from the images it describes without anything
// noticing.
//
// Run with: node --test tools/test-sheet-composition.mjs
//
// ImageMagick decodes the JPEGs. Without it on PATH every test here skips with
// that as the stated reason rather than passing on nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const doc = readFileSync(join(root, "DESIGN_LANGUAGE.md"), "utf8");

function haveImageMagick() {
  try {
    execFileSync("magick", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const skip = haveImageMagick() ? false : "ImageMagick (magick) is not on PATH";

// One measuring run for the whole file: it decodes eleven 13 megapixel images,
// so doing it per test would cost eleven times over for the same numbers.
const sheets = skip ? [] : measureAll();

function measureAll() {
  const dir = mkdtempSync(join(tmpdir(), "sheet-composition-"));
  const out = join(dir, "measurements.json");
  try {
    execFileSync(
      process.execPath,
      [join(root, "tools", "measure-sheet-composition.mjs"), "--json", out],
      { cwd: root, stdio: ["ignore", "ignore", "ignore"] }
    );
    return JSON.parse(readFileSync(out, "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The value every sheet agrees on, or a failure naming the ones that did not.
function agreed(label, read) {
  const values = sheets.map(read);
  const unique = [...new Set(values)];
  assert.equal(
    unique.length,
    1,
    `${label} differs across the sheets: ${sheets
      .map((s, i) => `${s.file}=${values[i]}`)
      .join(", ")}`
  );
  return unique[0];
}

// The rows of the first markdown table following `heading`, split into cells.
function tableAfter(heading) {
  const from = doc.indexOf(heading);
  assert.notEqual(from, -1, `DESIGN_LANGUAGE.md has no "${heading}" heading`);
  const lines = doc.slice(from).split("\n");
  const start = lines.findIndex((l) => l.startsWith("| "));
  assert.notEqual(start, -1, `no table under "${heading}"`);
  const rows = [];
  // Skip the header row and the divider beneath it.
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("| ")) break;
    rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
  }
  return rows;
}

const plain = (cell) => cell.replace(/[*`]/g, "");
const number = (cell) => Number(plain(cell).replace(/[,%]/g, ""));

test("all eleven sheets measure", { skip }, () => {
  assert.equal(sheets.length, 11);
});

test("every sheet is the same square canvas", { skip }, () => {
  assert.equal(agreed("canvas width", (s) => s.canvas.w), 3601);
  assert.equal(agreed("canvas height", (s) => s.canvas.h), 3601);
});

test("the regions stack down the canvas", { skip }, () => {
  for (const s of sheets) {
    const r = s.regions;
    assert.ok(r.greenRule, `${s.file} has no divider`);
    assert.ok(r.spine, `${s.file} has no spine`);
    assert.ok(r.footerMark, `${s.file} has no footer mark square`);
    const bands =
      r.masthead.h + r.headingBand.h + r.codePanel.h + r.greenRule.h + r.footer.h;
    // On most sheets one transition row sits between the code panel and the
    // divider and belongs to neither; on the rest the divider starts where the
    // panel ends. So the bands account for the canvas or leave that one row.
    const over = s.canvas.h - bands;
    assert.ok(
      over === 0 || over === 1,
      `${s.file}: bands sum to ${bands}, leaving ${over} of ${s.canvas.h}`
    );
    assert.equal(r.masthead.y1 + 1, r.headingBand.y0, `${s.file}: masthead to heading band`);
    assert.equal(r.headingBand.y1 + 1, r.codePanel.y0, `${s.file}: heading band to code panel`);
    assert.equal(r.codePanel.y1 + 1 + over, r.greenRule.y0, `${s.file}: code panel to divider`);
    assert.equal(r.greenRule.y1 + 1, r.footer.y0, `${s.file}: divider to footer`);
  }
});

test("the spine, the code panel and the right margin span the canvas", { skip }, () => {
  for (const s of sheets) {
    const { spine, codePanel } = s.regions;
    assert.equal(spine.x0, 0, `${s.file}: the spine is not flush left`);
    // The panel begins where the spine ends, give or take the one pixel JPEG
    // moves a flat edge by.
    assert.ok(
      Math.abs(codePanel.x0 - (spine.x1 + 1)) <= 1,
      `${s.file}: the panel starts at ${codePanel.x0}, the spine ends at ${spine.x1}`
    );
    // The panel's bounding box starts on whichever side of the spine boundary
    // its antialiased edge falls, so the three may leave that column over.
    const right = s.canvas.w - 1 - codePanel.x1;
    const over = s.canvas.w - (spine.w + codePanel.w + right);
    assert.ok(
      over === 0 || over === 1,
      `${s.file}: divisions sum to ${s.canvas.w - over} of ${s.canvas.w}`
    );
  }
});

test("the template holds on every sheet to within a pixel", { skip }, () => {
  assert.equal(agreed("masthead height", (s) => s.regions.masthead.h), 527);
  assert.equal(agreed("spine width", (s) => s.regions.spine.w), 231);
  assert.equal(agreed("spine left edge", (s) => s.regions.spine.x0), 0);
  assert.equal(agreed("flanking rule count", (s) => s.regions.flankRules.length), 2);
  assert.equal(agreed("upper rule height", (s) => s.regions.flankRules[0].h), 45);
  assert.equal(agreed("lower rule height", (s) => s.regions.flankRules[1].h), 20);
  assert.equal(agreed("left rule right edge", (s) => s.regions.flankRules[0].left.x1), 419);
  assert.equal(agreed("right rule left edge", (s) => s.regions.flankRules[0].right.x0), 3181);
  assert.equal(agreed("heading text lines", (s) => s.lines.headingBand.length), 3);
  assert.equal(agreed("footer text lines", (s) => s.lines.footer.length), 1);
});

test("the code face is proportional, not monospaced", { skip }, () => {
  for (const s of sheets) {
    assert.ok(
      s.monospace.residual >= 0.15,
      `${s.file}: glyph advances sit ${s.monospace.residual} from a grid, which is close enough to call monospaced`
    );
  }
  // The control measures the same statistic where a grid is known to exist, so
  // it is what says the figure above means anything. A sheet whose code lines
  // sit close enough for a descender to bridge two line boxes reads higher;
  // the rest have to stay an order of magnitude below the glyph figure.
  const clean = sheets.filter((s) => s.monospace.control.residual < 0.1);
  assert.ok(
    clean.length >= 10,
    `only ${clean.length} sheets return a clean line-grid control, expected at least 10`
  );
});

test("the region table in DESIGN_LANGUAGE.md matches the measurement", { skip }, () => {
  const measured = {
    Masthead: (r) => r.masthead,
    "Heading band": (r) => r.headingBand,
    "Code panel": (r) => r.codePanel,
    "Green rule": (r) => r.greenRule,
    Footer: (r) => r.footer,
  };
  const rows = tableAfter("### Composition regions");
  assert.equal(rows.length, 5, "expected five region rows");
  // The ten sheets that share the template; shiftAndUnshift.jpg carries the
  // 84px offset the document records separately, and the table is not it.
  const template = sheets.filter((s) => !s.file.startsWith("shiftAndUnshift"));
  for (const row of rows) {
    const name = plain(row[0]);
    const read = measured[name];
    assert.ok(read, `unrecognised region row "${name}"`);
    const [y0, y1] = plain(row[2]).split(" to ").map(Number);
    const height = number(row[3]);
    const share = number(row[4]);
    const boxes = template.map((s) => read(s.regions)).filter((b) => b);
    assert.equal(boxes.length, template.length, `${name} missing on some sheets`);
    // Two sheets end the code panel seven rows lower and absorb it in the
    // divider, which the document records under "How closely the eleven
    // repeat". Eight rows is that deviation and nothing wider.
    for (const b of boxes) {
      assert.ok(Math.abs(b.y0 - y0) <= 8, `${name}: documented row ${y0}, measured ${b.y0}`);
      assert.ok(Math.abs(b.y1 - y1) <= 8, `${name}: documented row ${y1}, measured ${b.y1}`);
      assert.ok(
        Math.abs(b.h - height) <= 8,
        `${name}: documented ${height}px, measured ${b.h}px`
      );
    }
    assert.ok(
      Math.abs(share - (height / 3601) * 100) < 0.01,
      `${name}: documented ${share}% is not ${height} of 3601`
    );
  }
});

test("the division table in DESIGN_LANGUAGE.md matches the measurement", { skip }, () => {
  const rows = tableAfter("Across the canvas there are three divisions:");
  assert.equal(rows.length, 3, "expected three division rows");
  const widths = rows.map((r) => number(r[3]));
  assert.equal(widths.reduce((a, b) => a + b, 0), 3601, "the divisions do not span the canvas");
  const [spine, panel, margin] = widths;
  const template = sheets.filter((s) => !s.file.startsWith("shiftAndUnshift"));
  // The documented columns are the boundaries between the fills; a measured
  // bounding box lands on either side of one, so it reads up to two pixels
  // narrower. The document says so beneath the table.
  for (const s of template) {
    assert.equal(s.regions.spine.w, spine, `${s.file}: spine width`);
    assert.ok(
      Math.abs(s.regions.codePanel.w - panel) <= 2,
      `${s.file}: documented panel ${panel}px, measured ${s.regions.codePanel.w}px`
    );
    const right = s.canvas.w - 1 - s.regions.codePanel.x1;
    assert.ok(
      Math.abs(right - margin) <= 2,
      `${s.file}: documented margin ${margin}px, measured ${right}px`
    );
  }
});

test("the color table in DESIGN_LANGUAGE.md matches the census", { skip }, () => {
  const rows = tableAfter("### The colors the sheets are drawn in");
  assert.equal(rows.length, 6, "expected six color rows");
  const total = sheets.reduce((n, s) => n + s.census.pixels, 0);
  assert.equal(
    total,
    142639211,
    "the documented pixel total is not what the eleven sheets hold"
  );
  for (const row of rows) {
    const hex = plain(row[0]);
    const documented = number(row[1]);
    const share = number(row[2]);
    // The census folds every triple within 12 units into its anchor, and an
    // anchor may be named by a neighbouring triple on a different sheet, so the
    // count is summed the same way the document's table was.
    let counted = 0;
    for (const s of sheets) {
      for (const c of s.census.colors) if (within(c.hex, hex, 18)) counted += c.total;
    }
    assert.equal(counted, documented, `${hex}: documented ${documented}, counted ${counted}`);
    assert.ok(
      Math.abs(share - (counted / total) * 100) < 0.01,
      `${hex}: documented ${share}% is not ${counted} of ${total}`
    );
  }
});

function within(a, b, distance) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) <= distance;
}
