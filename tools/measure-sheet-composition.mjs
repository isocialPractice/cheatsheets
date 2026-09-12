#!/usr/bin/env node
/**
 * Measure the design language of the cheatsheet images in `javaScriptArrays/`.
 *
 * Every number `DESIGN_LANGUAGE.md` records about the sheets comes out of this
 * script, so the document stays checkable against the artwork the way its
 * palette already is against `mark.png`. Nothing here estimates: each figure is
 * a pixel count, a run length or a bounding box read off the decoded image.
 *
 * Usage:
 *   node tools/measure-sheet-composition.mjs [--json <path>] [image...]
 *
 * With no image arguments it measures every `.jpg` in `javaScriptArrays/`.
 * ImageMagick (`magick`) decodes the JPEG; nothing else is required.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";

/* The four colors the sheets are built from. A pixel is assigned to the
   nearest of them within TOL, and to `other` when nothing is that close.
   TOL is 34 because JPEG at quality 99 spreads a flat fill by a few units per
   channel while the four anchors sit hundreds apart, so no widening short of
   an order of magnitude can make two of them collide. */
const ANCHORS = [
  { name: "navy",  rgb: [0, 1, 50] },
  { name: "white", rgb: [255, 255, 255] },
  { name: "green", rgb: [77, 174, 81] },
  { name: "grey",  rgb: [65, 65, 67] },
];
const OTHER = ANCHORS.length;
const TOL = 34;

/* The published page caps a sheet at 600px wide, so one site pixel is this
   many sheet pixels. Every `site` figure below is a sheet measurement divided
   by that scale - the size a reader actually sees. */
const SITE_WIDTH = 600;

/* The geometry is asked for rather than read back out of the pixel count. A
   count alone cannot tell a square image from a non-square one whose pixels
   happen to multiply to a square - 512x128 is 256 squared - and an image taken
   for 256x256 reports every row, column and region in this file wrongly while
   passing every check in it. */
function decode(file) {
  const [w, h] = execFileSync("magick", ["identify", "-format", "%w %h", file])
    .toString().trim().split(/\s+/).map(Number);
  if (!(w > 0) || w !== h) throw new Error(`${file}: ${w}x${h} is not a square image`);
  const raw = execFileSync("magick", [file, "-depth", "8", "rgb:-"], { maxBuffer: 1 << 30 });
  if (raw.length !== w * h * 3)
    throw new Error(`${file}: decoded ${raw.length / 3} pixels, expected ${w * h}`);
  return { raw, w, h };
}

function classify({ raw, w, h }) {
  const cl = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 3) {
    const r = raw[p], g = raw[p + 1], b = raw[p + 2];
    let best = OTHER, bd = TOL * TOL;
    for (let k = 0; k < ANCHORS.length; k++) {
      const [ar, ag, ab] = ANCHORS[k].rgb;
      const dr = r - ar, dg = g - ag, db = b - ab;
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; best = k; }
    }
    cl[i] = best;
  }
  return cl;
}

const rowCount = (cl, w, y, c) => {
  let n = 0; const o = y * w;
  for (let x = 0; x < w; x++) if (cl[o + x] === c) n++;
  return n;
};

const rowExtent = (cl, w, y, c) => {
  let a = -1, b = -1; const o = y * w;
  for (let x = 0; x < w; x++) if (cl[o + x] === c) { if (a < 0) a = x; b = x; }
  return [a, b];
};

function rowRuns(cl, w, y, c, min) {
  const out = []; let s = -1; const o = y * w;
  for (let x = 0; x <= w; x++) {
    const on = x < w && cl[o + x] === c;
    if (on) { if (s < 0) s = x; }
    else if (s >= 0) { if (x - s >= min) out.push([s, x - s]); s = -1; }
  }
  return out;
}

function mode(values) {
  const m = new Map(); let best = values[0], bc = 0;
  for (const v of values) { const n = (m.get(v) || 0) + 1; m.set(v, n); if (n > bc) { bc = n; best = v; } }
  return { value: best, rows: bc, of: values.length };
}

const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 });

/* --- composition regions ------------------------------------------------ */

function regions(cl, w, h) {
  const r = {};

  /* Masthead: the navy band at the top, ending at the first row the white
     heading ground takes over. Read from the white side rather than the navy
     one because the masthead's own wordmark drops its navy share well below
     any threshold a band test would use. */
  let y = 0;
  while (y < h && rowCount(cl, w, y, 1) < w * 0.5) y++;
  r.masthead = box(0, 0, w - 1, y - 1);

  /* The full-width green rule above the footer. */
  const full = [];
  for (let yy = 0; yy < h; yy++) if (rowCount(cl, w, yy, 2) >= w * 0.95) full.push(yy);
  r.greenRule = full.length ? box(0, full[0], w - 1, full[full.length - 1]) : null;

  /* The flanking green rules under the masthead: rows carrying exactly two
     long green runs, one against each edge. */
  const bands = [];
  for (let yy = r.masthead.h; yy < h * 0.35; yy++) {
    const rs = rowRuns(cl, w, yy, 2, 60);
    if (rs.length === 2 && rs[0][1] > 300 && rs[1][1] > 300) {
      const last = bands[bands.length - 1];
      if (last && yy === last.y1 + 1) { last.y1 = yy; last.runs.push(rs); }
      else bands.push({ y0: yy, y1: yy, runs: [rs] });
    }
  }
  r.flankRules = bands.filter(b => b.y1 - b.y0 >= 4).map(b => ({
    ...box(0, b.y0, w - 1, b.y1),
    left: box(mode(b.runs.map(v => v[0][0])).value, b.y0, mode(b.runs.map(v => v[0][0] + v[0][1] - 1)).value, b.y1),
    right: box(mode(b.runs.map(v => v[1][0])).value, b.y0, mode(b.runs.map(v => v[1][0] + v[1][1] - 1)).value, b.y1),
  }));
  const belowRules = r.flankRules.length ? r.flankRules[r.flankRules.length - 1].y1 + 1 : r.masthead.h;

  /* The code panel: the navy rectangle filling most of the width below the
     rules. Its edges are the mode of the longest navy run's ends, because a
     code line ending in a navy-adjacent color can shorten one row's run. */
  let cy0 = -1, cy1 = -1; const xs0 = [], xs1 = [];
  for (let yy = belowRules; yy < h; yy++) {
    let best = [0, 0];
    for (const run of rowRuns(cl, w, yy, 0, 1)) if (run[1] > best[1]) best = run;
    if (best[1] >= w * 0.5) { if (cy0 < 0) cy0 = yy; cy1 = yy; xs0.push(best[0]); xs1.push(best[0] + best[1] - 1); }
  }
  const px0 = mode(xs0), px1 = mode(xs1);
  r.codePanel = { ...box(px0.value, cy0, px1.value, cy1), x0Rows: px0, x1Rows: px1 };

  /* The green spine down the left of the code panel. */
  let sy0 = -1, sy1 = -1; const sx0 = [], sx1 = [];
  const spineStop = r.greenRule ? r.greenRule.y0 : h;
  for (let yy = belowRules; yy < spineStop; yy++)
    for (const [s, l] of rowRuns(cl, w, yy, 2, 120))
      if (s < w * 0.1 && l <= w * 0.1) { if (sy0 < 0) sy0 = yy; sy1 = yy; sx0.push(s); sx1.push(s + l - 1); }
  r.spine = sy0 < 0 ? null : box(mode(sx0).value, sy0, mode(sx1).value, sy1);

  /* The footer, and the navy square holding the mark inside it. The square is
     measured from the navy run flush against the left edge, not from the row's
     last navy pixel: the footer's own type is navy too, so the last-pixel
     reading lands on the square only in the rows the type happens to miss. */
  const gEnd = r.greenRule ? r.greenRule.y1 : 0;
  r.footer = box(0, gEnd + 1, w - 1, h - 1);
  let fy0 = -1, fy1 = -1; const fx1 = [];
  for (let yy = gEnd + 1; yy < h; yy++) {
    const flush = rowRuns(cl, w, yy, 0, 1).find(run => run[0] <= 1);
    if (flush && flush[1] >= 100) { if (fy0 < 0) fy0 = yy; fy1 = yy; fx1.push(flush[0] + flush[1] - 1); }
  }
  /* The widest flush run, not the commonest: the mark drawn inside the square
     is green, so on every row it crosses, the navy run stops short at it. Only
     the rows above and below the mark carry the square's full width. */
  r.footerMark = fy0 < 0 ? null : box(0, fy0, Math.max(...fx1), fy1);

  /* Where the footer's type may start: the first column right of the square
     that is clean white down the whole band. Starting at the square's own edge
     instead would read its antialiased boundary - a column of ink 339 rows
     tall - as the first glyph on the line. */
  r.footerTextFrom = r.footerMark ? firstClearColumn(cl, w, r.footer, r.footerMark.x1 + 1) : r.footer.x0;

  /* What is left between the rules and the code panel is the heading ground:
     the one region defined by the regions around it rather than by a fill. */
  r.headingBand = box(0, r.masthead.h, w - 1, r.codePanel.y0 - 1);
  return r;
}

/* The first column at or after `from` that is clean white down the region.
   "Clean" allows a 1% shortfall, because the outermost row of the canvas is
   JPEG ringing on every sheet and a strict test therefore finds no clear
   column at all, silently falling back to the edge it was asked to clear. */
function firstClearColumn(cl, w, region, from) {
  const floor = (region.y1 - region.y0 + 1) * 0.99;
  for (let x = from; x <= region.x1; x++) {
    let white = 0;
    for (let y = region.y0; y <= region.y1; y++) if (cl[y * w + x] === 1) white++;
    if (white >= floor) return x;
  }
  return from;
}

/* --- text lines --------------------------------------------------------- */

/* A text line is a run of rows carrying ink. What counts as ink is named per
   region, because no single rule holds across the sheet:

   - `ground` lists the classes that are never ink. In the heading band every
     structural fill is green, so calling green ground leaves the grey type on
     its own and the flanking rules and the spine stop reading as text.
   - `ink`, when given, is an allowlist instead: only those classes count. The
     heading type is one flat grey, so naming it excludes the `other` class,
     and with it the one-pixel JPEG ring down the canvas edge that otherwise
     reports every heading as spanning the full width.
   - The code panel gets no allowlist, because its syntax colors are exactly
     what `other` holds.

   Runs shorter than `minRows` are dropped as ringing along a region edge. */
function textLines(cl, w, region, { ground = [], ink = null }, minRows = 6, minInk = 8) {
  const isBg = ink ? c => !ink.includes(c) : c => ground.includes(c);
  const lines = []; let cur = null;
  for (let y = region.y0; y <= region.y1; y++) {
    let ink = 0;
    const o = y * w;
    for (let x = region.x0; x <= region.x1; x++) if (!isBg(cl[o + x])) ink++;
    if (ink >= minInk) {
      if (cur) { cur.y1 = y; cur.rows.push(ink); }
      else cur = { y0: y, y1: y, rows: [ink] };
    } else if (cur) { if (cur.y1 - cur.y0 + 1 >= minRows) lines.push(cur); cur = null; }
  }
  if (cur && cur.y1 - cur.y0 + 1 >= minRows) lines.push(cur);
  return lines.map(l => {
    /* A column belongs to the line only if it carries ink on three rows or
       more. One- and two-row columns are the JPEG ring along a region edge and
       the antialiased boundary of a green rule, and taking the raw extent
       instead reports every heading as spanning the full canvas. */
    const [x0, x1] = inkExtent(cl, w, region, l, isBg, 3);
    const line = { y0: l.y0, y1: l.y1, x0, x1 };
    return {
      ...box(x0, l.y0, x1, l.y1),
      ink: l.rows.reduce((n, v) => n + v, 0),
      ...typeMetrics(cl, w, line, isBg),
    };
  });
}

function inkExtent(cl, w, region, line, isBg, minRows) {
  const cols = new Int32Array(region.x1 - region.x0 + 1);
  for (let y = line.y0; y <= line.y1; y++) {
    const o = y * w;
    for (let x = region.x0; x <= region.x1; x++) if (!isBg(cl[o + x])) cols[x - region.x0]++;
  }
  let a = -1, b = -1;
  for (let i = 0; i < cols.length; i++) if (cols[i] >= minRows) { if (a < 0) a = i; b = i; }
  return a < 0 ? [region.x0, region.x1] : [region.x0 + a, region.x0 + b];
}

/* Vertical type metrics, read off the line's own row-ink profile.
   A line of mixed-case type inks few rows over its cap band and many over its
   x-height band, so the half-maximum crossings bracket the x-height and the
   outermost inked rows bracket cap-to-descender. Stroke weight is the mode of
   the horizontal ink run lengths, which for type is the stem width. */
function typeMetrics(cl, w, line, isBg) {
  const h = line.y1 - line.y0 + 1;
  const rows = new Int32Array(h);
  const strokes = [];
  for (let y = line.y0; y <= line.y1; y++) {
    const o = y * w; let run = 0;
    for (let x = line.x0; x <= line.x1; x++) {
      if (!isBg(cl[o + x])) { rows[y - line.y0]++; run++; }
      else { if (run > 0 && run <= 200) strokes.push(run); run = 0; }
    }
    if (run > 0 && run <= 200) strokes.push(run);
  }
  const half = Math.max(...rows) / 2;
  let xTop = -1, base = -1;
  for (let i = 0; i < h; i++) if (rows[i] >= half) { if (xTop < 0) xTop = i; base = i; }
  /* Index 0 is the line's first inked row - the top of the tallest ascender or
     capital - and `base` is the last row the x-height band reaches, which is
     the baseline. Rows past it are descenders. */
  return {
    ascent: base < 0 ? null : base + 1,
    xHeight: xTop < 0 ? null : base - xTop + 1,
    descent: base < 0 ? null : h - 1 - base,
    strokeMode: strokes.length ? mode(strokes).value : null,
  };
}

/* --- pitch and the monospace test ---------------------------------------- */

/* The line pitch is the lag at which the panel's row-ink profile correlates
   most strongly with itself: code lines repeat down the panel at one spacing,
   so the profile does too. Returns the lag with the strongest normalized
   correlation inside the search window. */
function pitch(profile, lo, hi) {
  const n = profile.length;
  let mean = 0;
  for (const v of profile) mean += v;
  mean /= n;
  const d = profile.map(v => v - mean);
  let denom = 0;
  for (const v of d) denom += v * v;
  let best = { lag: 0, r: -1 };
  if (denom === 0) return best;
  for (let lag = lo; lag <= hi && lag < n; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += d[i] * d[i + lag];
    const r = s / denom;
    if (r > best.r) best = { lag, r: Number(r.toFixed(4)) };
  }
  return best;
}

function inkProfiles(cl, w, region, bg) {
  const cols = new Int32Array(region.w), rows = new Int32Array(region.h);
  for (let y = region.y0; y <= region.y1; y++) {
    const o = y * w;
    for (let x = region.x0; x <= region.x1; x++) {
      if (cl[o + x] !== bg) { cols[x - region.x0]++; rows[y - region.y0]++; }
    }
  }
  return { cols: Array.from(cols), rows: Array.from(rows) };
}

/* The steps between consecutive code lines, smallest first. */
function lineSteps(lines) {
  const steps = lines.slice(1).map((l, i) => l.y0 - lines[i].y0).sort((a, b) => a - b);
  return steps.length ? { min: steps[0], median: steps[Math.floor(steps.length / 2)], max: steps[steps.length - 1] } : null;
}

/* How far a set of gaps sits from whole multiples of the unit they would share
   if they were laid on a grid, averaged and given as a fraction of that unit.
   The unit is the 10th percentile rather than the minimum, because one gap
   made meaninglessly small by a glyph antialiasing into two pieces would
   otherwise set the scale for all of them. */
function gridResidual(gaps) {
  if (gaps.length < 4) return null;
  const sorted = [...gaps].sort((a, b) => a - b);
  const unit = sorted[Math.floor(sorted.length * 0.1)];
  if (!unit) return null;
  let sum = 0;
  for (const g of gaps) sum += Math.abs(g - Math.max(1, Math.round(g / unit)) * unit);
  return {
    unit,
    gaps: gaps.length,
    residual: Number((sum / gaps.length / unit).toFixed(3)),
    p10: sorted[Math.floor(sorted.length * 0.1)],
    median: sorted[Math.floor(sorted.length * 0.5)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
  };
}

/* Is the code face monospaced?

   A monospaced face puts every glyph on one advance, so the gaps between the
   left edges of consecutive glyphs are that advance or a whole multiple of it,
   give or take the sidebearing each glyph carries. A proportional face has no
   such number: a narrow letter and a wide one are simply different widths.

   So: split each code line into runs of inked columns, take the gaps between
   the run starts, propose the smallest reliable gap as the advance, and measure
   how far the rest sit from a whole multiple of it. `residual` is that distance
   averaged and expressed as a fraction of the advance - near zero if the face
   is monospaced, and a sizeable fraction of an advance if it is not. */
function monospaceTest(cl, w, lines, bgClass, minInkRows = 2) {
  const gaps = [];
  for (const line of lines) {
    const cols = new Int32Array(line.x1 - line.x0 + 1);
    for (let y = line.y0; y <= line.y1; y++) {
      const o = y * w;
      for (let x = line.x0; x <= line.x1; x++) if (cl[o + x] !== bgClass) cols[x - line.x0]++;
    }
    const starts = []; let on = false;
    for (let i = 0; i < cols.length; i++) {
      const ink = cols[i] >= minInkRows;
      if (ink && !on) starts.push(i);
      on = ink;
    }
    for (let i = 1; i < starts.length; i++) gaps.push(starts[i] - starts[i - 1]);
  }
  if (gaps.length < 20) return null;
  const across = gridResidual(gaps);
  /* The same statistic over the gaps between the code lines themselves, where
     the answer is known: those lines do sit on one spacing, blank lines making
     some gaps a whole multiple of it. It is the calibration for the figure
     above - whatever residual a real grid produces here is the floor a
     monospaced face would have to reach across the line. */
  const control = gridResidual(lines.slice(1).map((l, i) => l.y0 - lines[i].y0));
  return { ...across, control: control && { unit: control.unit, residual: control.residual } };
}

/* --- color census ------------------------------------------------------- */

/* Exact RGB counts first, then every color within `radius` of a top exact
   color is folded into it. The fold is what makes the figure mean anything:
   JPEG spreads one flat fill over hundreds of neighbouring triples, so the
   exact count of a fill understates it by a wide margin. */
function census(raw, w, h, topN = 12, radius = 12) {
  const exact = new Map();
  for (let i = 0, p = 0; i < w * h; i++, p += 3) {
    const key = (raw[p] << 16) | (raw[p + 1] << 8) | raw[p + 2];
    exact.set(key, (exact.get(key) || 0) + 1);
  }
  const sorted = [...exact.entries()].sort((a, b) => b[1] - a[1]);
  const anchors = [];
  for (const [key, n] of sorted) {
    const r = key >> 16, g = (key >> 8) & 255, b = key & 255;
    if (anchors.some(a => (a.r - r) ** 2 + (a.g - g) ** 2 + (a.b - b) ** 2 <= (radius * 3) ** 2)) continue;
    anchors.push({ r, g, b, exact: n, total: 0 });
    if (anchors.length >= topN) break;
  }
  let folded = 0;
  for (const [key, n] of exact) {
    const r = key >> 16, g = (key >> 8) & 255, b = key & 255;
    let best = -1, bd = radius * radius * 3;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const d = (a.r - r) ** 2 + (a.g - g) ** 2 + (a.b - b) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) { anchors[best].total += n; folded += n; }
  }
  const px = w * h;
  return {
    pixels: px,
    uniqueExact: exact.size,
    covered: Number((folded / px * 100).toFixed(2)),
    colors: anchors.map(a => ({
      hex: "#" + [a.r, a.g, a.b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase(),
      rgb: [a.r, a.g, a.b],
      exact: a.exact,
      total: a.total,
      share: Number((a.total / px * 100).toFixed(2)),
    })).sort((a, b) => b.total - a.total),
  };
}

/* --- the site palette, for comparison ------------------------------------ */

/* The values `DESIGN_LANGUAGE.md` already records, sampled from `mark.png` or
   derived from something that was. They are repeated here so the comparison
   below runs without parsing the document; if the document changes, change
   these with it. */
const SITE_PALETTE = [
  { role: "Navy (sampled)", hex: "#000133" },
  { role: "Navy, soft", hex: "#020433" },
  { role: "Green (sampled)", hex: "#4CAE50" },
  { role: "Green, dark", hex: "#2E7534" },
  { role: "White (sampled)", hex: "#FFFFFF" },
  { role: "Off white", hex: "#F8F8F9" },
  { role: "Slate", hex: "#414566" },
  { role: "Muted", hex: "#6F6F8C" },
  { role: "Sage", hex: "#9EBEA7" },
];

const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

/* WCAG 2 relative luminance and contrast ratio. */
function luminance([r, g, b]) {
  const c = [r, g, b].map(v => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Number(((l1 + 0.05) / (l2 + 0.05)).toFixed(2));
}

const distance = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));

/* --- per sheet ---------------------------------------------------------- */

function measure(file) {
  const img = decode(file);
  const { raw, w, h } = img;
  const cl = classify(img);
  const reg = regions(cl, w, h);
  const site = v => Number((v / (w / SITE_WIDTH)).toFixed(2));
  const codeProfiles = inkProfiles(cl, w, reg.codePanel, 0);
  const codeLines = textLines(cl, w, reg.codePanel, { ground: [0] });

  return {
    file: basename(file),
    canvas: { w, h },
    regions: reg,
    site: {
      scale: Number((w / SITE_WIDTH).toFixed(4)),
      masthead: site(reg.masthead.h),
      headingBand: site(reg.headingBand.h),
      codePanel: { w: site(reg.codePanel.w), h: site(reg.codePanel.h), x0: site(reg.codePanel.x0) },
      spineW: reg.spine ? site(reg.spine.w) : null,
      greenRule: reg.greenRule ? site(reg.greenRule.h) : null,
      footer: site(reg.footer.h),
    },
    lines: {
      /* The masthead wordmark is white type beside a green mark, and the
         heading type is one flat grey, so both are named directly. The code
         panel is the exception that takes a ground instead, since its syntax
         colors are the very ones an allowlist would have to enumerate - and so
         is the footer, whose type is navy beside brand-colored icons. */
      masthead: textLines(cl, w, reg.masthead, { ink: [1, 2] }),
      headingBand: textLines(cl, w, reg.headingBand, { ink: [3] }),
      codePanel: codeLines,
      footer: textLines(cl, w, { ...reg.footer, x0: reg.footerTextFrom }, { ground: [1] }),
    },
    pitch: {
      /* The window is wide enough to hold any plausible line pitch at this
         canvas size and narrow enough to exclude the lag-0 peak. */
      codeLine: pitch(codeProfiles.rows, 30, 200),
      /* Cross-check: the spacing the line boxes themselves report, which owes
         nothing to the correlation above. Blank lines make some steps a whole
         multiple, so the smallest step is the one to compare. */
      codeLineSteps: lineSteps(codeLines),
    },
    monospace: monospaceTest(cl, w, codeLines, 0),
    census: census(raw, w, h),
  };
}

/* --- run ---------------------------------------------------------------- */

const argv = process.argv.slice(2);
let jsonPath = null;
const files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--json") {
    jsonPath = argv[++i];
    /* Without this the flag runs the whole measurement and writes nothing,
       reporting success for the one thing it was asked to produce. */
    if (!jsonPath) throw new Error("--json needs a path to write to");
  }
  else files.push(argv[i]);
}
if (!files.length) {
  const dir = "javaScriptArrays";
  for (const f of readdirSync(dir)) if (f.toLowerCase().endsWith(".jpg")) files.push(join(dir, f));
}

const all = [];
for (const f of files) {
  process.stderr.write(`measuring ${f}\n`);
  all.push(measure(f));
}

if (jsonPath) {
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(all, null, 1));
  process.stderr.write(`wrote ${jsonPath}\n`);
}

/* Summary: every figure that is identical across the set, and the spread of
   every figure that is not. */
const pick = {
  "canvas width": s => s.canvas.w,
  "masthead height": s => s.regions.masthead.h,
  "flank rule count": s => s.regions.flankRules.length,
  "flank rule 1 y0": s => s.regions.flankRules[0] && s.regions.flankRules[0].y0,
  "flank rule 1 height": s => s.regions.flankRules[0] && s.regions.flankRules[0].h,
  "flank rule 1 left x1": s => s.regions.flankRules[0] && s.regions.flankRules[0].left.x1,
  "flank rule 1 right x0": s => s.regions.flankRules[0] && s.regions.flankRules[0].right.x0,
  "flank rule 2 y0": s => s.regions.flankRules[1] && s.regions.flankRules[1].y0,
  "flank rule 2 height": s => s.regions.flankRules[1] && s.regions.flankRules[1].h,
  "heading band height": s => s.regions.headingBand.h,
  "spine x0": s => s.regions.spine && s.regions.spine.x0,
  "spine width": s => s.regions.spine && s.regions.spine.w,
  "spine y0": s => s.regions.spine && s.regions.spine.y0,
  "spine height": s => s.regions.spine && s.regions.spine.h,
  "code panel x0": s => s.regions.codePanel.x0,
  "code panel x1": s => s.regions.codePanel.x1,
  "code panel y0": s => s.regions.codePanel.y0,
  "code panel y1": s => s.regions.codePanel.y1,
  "code panel width": s => s.regions.codePanel.w,
  "code panel height": s => s.regions.codePanel.h,
  "green rule y0": s => s.regions.greenRule && s.regions.greenRule.y0,
  "green rule height": s => s.regions.greenRule && s.regions.greenRule.h,
  "footer y0": s => s.regions.footer.y0,
  "footer height": s => s.regions.footer.h,
  "footer mark width": s => s.regions.footerMark && s.regions.footerMark.w,
  "footer mark height": s => s.regions.footerMark && s.regions.footerMark.h,
  "footer text from": s => s.regions.footerTextFrom,
  "masthead text lines": s => s.lines.masthead.length,
  "heading text lines": s => s.lines.headingBand.length,
  "code text lines": s => s.lines.codePanel.length,
  "footer text lines": s => s.lines.footer.length,
  "code line pitch (px)": s => s.pitch.codeLine.lag,
  "code line step, min": s => s.pitch.codeLineSteps && s.pitch.codeLineSteps.min,
  "monospace residual": s => s.monospace && s.monospace.residual,
  "line-grid control residual": s => s.monospace && s.monospace.control && s.monospace.control.residual,
};

console.log(`\n${all.length} sheet(s)\n`);
console.log("| Measure | Value across the set |");
console.log("| --- | --- |");
for (const [label, fn] of Object.entries(pick)) {
  const vs = all.map(fn);
  const uniq = [...new Set(vs)];
  const cell = uniq.length === 1
    ? `${uniq[0]} on all ${all.length}`
    : `${Math.min(...vs)}-${Math.max(...vs)} (${uniq.length} values)`;
  console.log(`| ${label} | ${cell} |`);
}

/* --- the colors, folded across the whole set ----------------------------- */

/* Every sheet's census merged into one, so a color's share is its share of the
   eleven sheets rather than of whichever one it happened to be counted on. */
const merged = [];
for (const c of all.flatMap(sheet => sheet.census.colors.map(v => ({ ...v, sheet: sheet.file })))
  .sort((a, b) => b.total - a.total)) {
  const g = merged.find(m => distance(m.rgb, c.rgb) <= 18);
  if (g) { g.total += c.total; g.sheets.add(c.sheet); }
  else merged.push({ hex: c.hex, rgb: c.rgb, total: c.total, sheets: new Set([c.sheet]) });
}
merged.sort((a, b) => b.total - a.total);
const totalPx = all.reduce((n, sheet) => n + sheet.census.pixels, 0);

console.log(`
colors, over ${totalPx.toLocaleString()} pixels
`);
/* "In top 12 of" rather than "on": the census keeps each sheet's twelve
   largest colors, so a color counted in five sheets may still be present on the
   other six below that cut. */
console.log("| Hex | Pixels | Share | In top 12 of | Nearest site color | Distance | Same? |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const m of merged) {
  if (m.total / totalPx < 0.0002) continue;
  let near = null;
  for (const sp of SITE_PALETTE) {
    const d = distance(m.rgb, hexToRgb(sp.hex));
    if (!near || d < near.d) near = { ...sp, d };
  }
  console.log(`| ${m.hex} | ${m.total.toLocaleString()} | ${(m.total / totalPx * 100).toFixed(2)}% | ${m.sheets.size}/${all.length} | ${near.role} ${near.hex} | ${near.d} | ${near.d === 0 ? 'exact' : 'no'} |`);
}

console.log("\ncontrast of the sheet colors against the two grounds they are drawn on\n");
console.log("| Ink | On navy #000132 | On white #FFFFFF |");
console.log("| --- | --- | --- |");
const navy = [0, 1, 50], white = [255, 255, 255];
for (const m of merged) {
  if (m.total / totalPx < 0.0002) continue;
  console.log(`| ${m.hex} | ${contrast(m.rgb, navy)}:1 | ${contrast(m.rgb, white)}:1 |`);
}
