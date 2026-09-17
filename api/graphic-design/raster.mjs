// Software rasterizer for the graphic-design API.
//
// Ported from `src/core/graphic-design/raster.ts` in napkin-sketch (MIT,
// isocialPractice), commit d43caac191b2dfd532b3311f4ca1ea6969bb002f.
//
// Walks the same composition the SVG writer walks and puts pixels in a
// framebuffer instead of tags in a string, so a script can produce a PNG with
// no canvas, no browser, and no native image dependency - which is the whole
// point, because Node has none of the three.
//
// The one primitive is a set of closed contours filled under a fill rule.
// Strokes become outlines in `geometry.mjs`, glyphs become strokes in
// `font.mjs`, clipping masks become coverage multiplied in, and images sample
// through the inverse of the same transform everything else is drawn with.
// Coverage is computed by scanline with four sub-rows a pixel and exact
// horizontal spans, which anti-aliases without a supersampled buffer and keeps
// two renders of one document byte-identical.
//
// **What this route is for here.** It draws text in the built-in single-stroke
// alphabet of `font.mjs`, not in the face `DESIGN_LANGUAGE.md` measured, so a
// raster produced this way is a shape-level regression target rather than a
// sheet anyone is shown. A published or posted raster goes through a real
// engine instead, which is the split **Render a composed SVG to a raster**
// under **Cheatsheet Composition Language** records.

import { toPx } from "./units.mjs";
import { parsePaint } from "./color.mjs";
import {
  apply,
  contourBounds,
  dashContour,
  elementMatrix,
  flattenShape,
  invert,
  meanScale,
  multiply,
  scaling,
  shapeCentre,
  strokeContour,
  transformContours,
} from "./geometry.mjs";
import { fontMetrics, layoutText, lineContours, transformText } from "./font.mjs";
import { decodePng, isPng } from "./png.mjs";
import { DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT } from "./types.mjs";

/**
 * A decoder for image formats the rasterizer cannot open by itself.
 *
 * @typedef {(src: string) => import('./png.mjs').RgbaImage | null} ImageDecoder
 */

/**
 * Options for {@link rasterizeComposition}.
 *
 * `decodeImage` covers the `image` elements that are not PNG. PNG is decoded
 * here; JPEG, GIF and SVG need a decoder the host supplies - a browser has one
 * in its canvas, and a Node caller can hand over whichever library it already
 * depends on. Without one, a non-PNG image is skipped and reported in
 * `warnings` rather than failing the render, because one unreadable placement
 * should not cost the other forty elements.
 *
 * @typedef {object} RasterOptions
 * @property {number} [scale] Device pixels per composition pixel. 2 renders at twice the size. Default 1.
 * @property {string | null} [background] Paints a background under the composition's own, e.g. `'#ffffff'`.
 * @property {ImageDecoder} [decodeImage] Decoder for `image` elements that are not PNG.
 */

/**
 * A rendered composition: pixels, their size, and anything skipped.
 *
 * @typedef {object} RasterResult
 * @property {number} width
 * @property {number} height
 * @property {Uint8ClampedArray} data Straight (non-premultiplied) RGBA, row-major.
 * @property {string[]} warnings Elements that could not be drawn, and why.
 */

/** Sub-rows sampled per pixel row. Four is the usual quality/cost knee. */
const SUBSAMPLES = 4;

/** A premultiplied RGBA framebuffer in 0-1, which is where blending is exact. */
class Framebuffer {
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = new Float32Array(width * height * 4);
  }

  /**
   * Composites a flat colour through a coverage mask, source-over.
   *
   * @param {Float32Array} coverage
   * @param {import('./color.mjs').Rgba} color
   * @param {number} alpha
   */
  fill(coverage, color, alpha) {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;
    const base = color.a * alpha;
    if (base <= 0) return;
    for (let i = 0; i < coverage.length; i++) {
      const c = coverage[i];
      if (c <= 0) continue;
      const a = Math.min(1, c) * base;
      if (a <= 0) continue;
      const p = i * 4;
      const inv = 1 - a;
      this.pixels[p] = r * a + this.pixels[p] * inv;
      this.pixels[p + 1] = g * a + this.pixels[p + 1] * inv;
      this.pixels[p + 2] = b * a + this.pixels[p + 2] * inv;
      this.pixels[p + 3] = a + this.pixels[p + 3] * inv;
    }
  }

  /**
   * Composites one premultiplied sample, source-over.
   *
   * @param {number} index
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number} a
   */
  blend(index, r, g, b, a) {
    if (a <= 0) return;
    const p = index * 4;
    const inv = 1 - a;
    this.pixels[p] = r + this.pixels[p] * inv;
    this.pixels[p + 1] = g + this.pixels[p + 1] * inv;
    this.pixels[p + 2] = b + this.pixels[p + 2] * inv;
    this.pixels[p + 3] = a + this.pixels[p + 3] * inv;
  }

  /**
   * Un-premultiplies into the straight RGBA bytes a PNG carries.
   *
   * @returns {Uint8ClampedArray}
   */
  toRgba() {
    const out = new Uint8ClampedArray(this.width * this.height * 4);
    for (let i = 0; i < this.width * this.height; i++) {
      const p = i * 4;
      const a = this.pixels[p + 3];
      if (a <= 0) continue;
      out[p] = Math.round((this.pixels[p] / a) * 255);
      out[p + 1] = Math.round((this.pixels[p + 1] / a) * 255);
      out[p + 2] = Math.round((this.pixels[p + 2] / a) * 255);
      out[p + 3] = Math.round(a * 255);
    }
    return out;
  }
}

/**
 * Adds `weight` of coverage to the pixels a horizontal span covers.
 *
 * @param {Float32Array} coverage
 * @param {number} width
 * @param {number} row
 * @param {number} from
 * @param {number} to
 * @param {number} weight
 */
function addSpan(coverage, width, row, from, to, weight) {
  const start = Math.max(0, from);
  const end = Math.min(width, to);
  if (end <= start) return;
  const first = Math.floor(start);
  const last = Math.min(width - 1, Math.floor(end - 1e-9));
  const offset = row * width;
  if (first === last) {
    coverage[offset + first] += (end - start) * weight;
    return;
  }
  coverage[offset + first] += (first + 1 - start) * weight;
  for (let x = first + 1; x < last; x++) coverage[offset + x] += weight;
  coverage[offset + last] += (end - last) * weight;
}

/**
 * Computes per-pixel coverage for a set of closed contours in device space.
 *
 * @param {import('./geometry.mjs').Contour[]} contours
 * @param {number} width
 * @param {number} height
 * @param {import('./types.mjs').FillRule} [rule] `nonzero` unions overlapping
 *   pieces, which is what a stroke outline wants; `evenodd` punches them, which
 *   is what a donut wants.
 * @returns {Float32Array}
 */
export function rasterizeContours(contours, width, height, rule = "nonzero") {
  const coverage = new Float32Array(width * height);
  const bounds = contourBounds(contours);
  if (!bounds) return coverage;

  const firstRow = Math.max(0, Math.floor(bounds.y));
  const lastRow = Math.min(height - 1, Math.ceil(bounds.y + bounds.height));
  const weight = 1 / SUBSAMPLES;
  /** @type {Array<{ x: number, winding: number }>} */
  const crossings = [];

  for (let row = firstRow; row <= lastRow; row++) {
    for (let sub = 0; sub < SUBSAMPLES; sub++) {
      const y = row + (sub + 0.5) / SUBSAMPLES;
      crossings.length = 0;
      for (const contour of contours) {
        const n = contour.length;
        if (n < 2) continue;
        for (let i = 0; i < n; i++) {
          const a = contour[i];
          const b = contour[(i + 1) % n];
          if (a.y === b.y) continue;
          const top = a.y < b.y ? a : b;
          const bottom = a.y < b.y ? b : a;
          if (y < top.y || y >= bottom.y) continue;
          const t = (y - top.y) / (bottom.y - top.y);
          crossings.push({ x: top.x + (bottom.x - top.x) * t, winding: a.y < b.y ? 1 : -1 });
        }
      }
      if (crossings.length < 2) continue;
      crossings.sort((p, q) => p.x - q.x);

      if (rule === "evenodd") {
        for (let i = 0; i + 1 < crossings.length; i += 2) {
          addSpan(coverage, width, row, crossings[i].x, crossings[i + 1].x, weight);
        }
      } else {
        let winding = 0;
        for (let i = 0; i + 1 < crossings.length; i++) {
          winding += crossings[i].winding;
          if (winding !== 0) {
            addSpan(coverage, width, row, crossings[i].x, crossings[i + 1].x, weight);
          }
        }
      }
    }
  }
  return coverage;
}

/**
 * Multiplies a coverage mask by a clip mask, in place.
 *
 * @param {Float32Array} coverage
 * @param {Float32Array | null} clip
 * @returns {Float32Array}
 */
function applyClip(coverage, clip) {
  if (!clip) return coverage;
  for (let i = 0; i < coverage.length; i++) {
    coverage[i] = Math.min(1, coverage[i]) * Math.min(1, clip[i]);
  }
  return coverage;
}

/**
 * A data URL split into its media type and its bytes.
 *
 * @param {string} src
 * @returns {{ mime: string, bytes: Uint8Array } | null}
 */
function decodeDataUrl(src) {
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(src.trim());
  if (!match) return null;
  const mime = match[1] || "application/octet-stream";
  const payload = match[3];
  if (!match[2]) {
    const text = decodeURIComponent(payload);
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
    return { mime, bytes };
  }
  const binary =
    typeof atob === "function"
      ? atob(payload)
      : globalThis.Buffer.from(payload, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff;
  return { mime, bytes };
}

/**
 * The state one element is drawn with.
 *
 * @typedef {object} Frame
 * @property {import('./geometry.mjs').Matrix} matrix
 * @property {Float32Array | null} clip
 * @property {number} opacity
 */

/**
 * Everything the element walk needs to reach.
 *
 * @typedef {object} RenderContext
 * @property {Framebuffer} buffer
 * @property {number} width
 * @property {number} height
 * @property {Map<string, { shapes: import('./types.mjs').ClipShape[], fillRule?: import('./types.mjs').FillRule }>} clips
 * @property {Map<string, import('./png.mjs').RgbaImage | null>} cache
 * @property {ImageDecoder} [decodeImage]
 * @property {string[]} warnings
 */

/**
 * Builds the coverage mask a clip reference or inline shape resolves to.
 *
 * @param {RenderContext} ctx
 * @param {string | import('./types.mjs').ClipShape} clip
 * @param {import('./geometry.mjs').Matrix} matrix
 * @param {Float32Array | null} inherited
 * @returns {Float32Array | null}
 */
function clipMask(ctx, clip, matrix, inherited) {
  const definition =
    typeof clip === "string" ? ctx.clips.get(clip) : { shapes: [clip], fillRule: undefined };
  if (!definition) {
    ctx.warnings.push(`clip "${String(clip)}" is not defined`);
    return inherited;
  }
  /** @type {import('./geometry.mjs').Contour[]} */
  const contours = [];
  for (const shape of definition.shapes) {
    const local = multiply(matrix, elementMatrix(shape, shapeCentre(shape)));
    const flat = flattenShape(shape);
    contours.push(...transformContours(flat.closed, local));
  }
  const mask = rasterizeContours(contours, ctx.width, ctx.height, definition.fillRule ?? "nonzero");
  if (!inherited) return mask;
  for (let i = 0; i < mask.length; i++) mask[i] = Math.min(1, mask[i]) * Math.min(1, inherited[i]);
  return mask;
}

/**
 * Fills a set of contours with an element's fill paint.
 *
 * @param {RenderContext} ctx
 * @param {import('./geometry.mjs').Contour[]} contours
 * @param {import('./types.mjs').Element} el
 * @param {Frame} frame
 * @param {import('./types.mjs').FillRule} rule
 */
function paintFill(ctx, contours, el, frame, rule) {
  const paint = parsePaint(el.fill);
  if (!paint || contours.length === 0) return;
  const coverage = applyClip(rasterizeContours(contours, ctx.width, ctx.height, rule), frame.clip);
  ctx.buffer.fill(coverage, paint, frame.opacity * (el.fillOpacity ?? 1));
}

/**
 * Strokes a set of contours with an element's stroke paint.
 *
 * @param {RenderContext} ctx
 * @param {import('./geometry.mjs').Contour[]} closed
 * @param {import('./geometry.mjs').Contour[]} open
 * @param {import('./types.mjs').Element} el
 * @param {Frame} frame
 */
function paintStroke(ctx, closed, open, el, frame) {
  const paint = parsePaint(el.stroke);
  if (!paint) return;
  const width = (el.strokeWidth ?? 1) * meanScale(frame.matrix);
  if (width <= 0) return;

  /** @type {import('./geometry.mjs').Contour[]} */
  const outlines = [];
  /**
   * @param {import('./geometry.mjs').Contour} points
   * @param {boolean} isClosed
   */
  const push = (points, isClosed) => {
    const dash = el.dash;
    const scale = meanScale(frame.matrix);
    if (dash && dash.length > 0) {
      const pattern = dash.map((n) => n * scale);
      for (const piece of dashContour(points, pattern, (el.dashOffset ?? 0) * scale, isClosed)) {
        outlines.push(
          ...strokeContour(piece, { width, cap: el.lineCap, join: el.lineJoin, closed: false })
        );
      }
      return;
    }
    outlines.push(
      ...strokeContour(points, { width, cap: el.lineCap, join: el.lineJoin, closed: isClosed })
    );
  };

  for (const contour of closed) push(contour, true);
  for (const contour of open) push(contour, false);
  if (outlines.length === 0) return;
  const coverage = applyClip(
    rasterizeContours(outlines, ctx.width, ctx.height, "nonzero"),
    frame.clip
  );
  ctx.buffer.fill(coverage, paint, frame.opacity * (el.strokeOpacity ?? 1));
}

/**
 * Draws a text element by filling the pen strokes of the built-in font.
 *
 * @param {RenderContext} ctx
 * @param {import('./types.mjs').TextElement} el
 * @param {Frame} frame
 */
function paintText(ctx, el, frame) {
  const fill = parsePaint(el.fill === undefined ? "#000000" : el.fill);
  const stroke = parsePaint(el.stroke);
  if (!fill && !stroke) return;

  const fontSize = el.fontSize ?? DEFAULT_FONT_SIZE;
  const metrics = fontMetrics(fontSize, el.fontWeight, el.fontStyle, el.face);
  const content = transformText(el.text, el.transform);
  const layout = layoutText(content, {
    x: el.x,
    y: el.y,
    fontSize,
    lineHeight: el.lineHeight ?? DEFAULT_LINE_HEIGHT,
    align: el.align ?? "left",
    baseline: el.baseline ?? "alphabetic",
    maxWidth: el.maxWidth,
    letterSpacing: el.letterSpacing,
    wordSpacing: el.wordSpacing,
    paragraphSpacing: el.paragraphSpacing,
    indent: el.indent,
    face: el.face,
  });

  /** @type {import('./geometry.mjs').Contour[]} */
  const contours = [];
  for (const line of layout.lines) {
    contours.push(
      ...lineContours(line.text, line.x, line.y, {
        fontSize,
        letterSpacing: el.letterSpacing,
        wordSpacing: (el.wordSpacing ?? 0) + line.wordSpacing,
        slant: metrics.slant,
        strokeWidth: metrics.strokeWidth,
        face: el.face,
      })
    );
    if (el.decoration === "underline" || el.decoration === "line-through") {
      const y =
        el.decoration === "underline"
          ? line.y + metrics.descender * 0.45
          : line.y - metrics.xHeight * 0.4;
      contours.push(
        ...strokeContour(
          [
            { x: line.x, y },
            { x: line.x + line.width, y },
          ],
          { width: metrics.strokeWidth, cap: "butt", join: "miter" }
        )
      );
    }
  }

  const device = transformContours(contours, frame.matrix);
  const coverage = applyClip(
    rasterizeContours(device, ctx.width, ctx.height, "nonzero"),
    frame.clip
  );
  const paint = fill ?? stroke;
  if (!paint) return;
  ctx.buffer.fill(
    coverage,
    paint,
    frame.opacity * (fill ? (el.fillOpacity ?? 1) : (el.strokeOpacity ?? 1))
  );
}

/**
 * Loads and caches the pixels behind an `image` element's `src`.
 *
 * @param {RenderContext} ctx
 * @param {string} src
 * @returns {import('./png.mjs').RgbaImage | null}
 */
function loadImage(ctx, src) {
  const cached = ctx.cache.get(src);
  if (cached !== undefined) return cached;

  /** @type {import('./png.mjs').RgbaImage | null} */
  let image = null;
  const data = decodeDataUrl(src);
  if (data && isPng(data.bytes)) {
    try {
      image = decodePng(data.bytes);
    } catch (err) {
      ctx.warnings.push(`image could not be decoded: ${err.message}`);
    }
  } else if (ctx.decodeImage) {
    image = ctx.decodeImage(src);
  } else {
    ctx.warnings.push(
      `image skipped: only PNG data URLs decode without a decoder (got ${data ? data.mime : "a non-data URL"})`
    );
  }
  ctx.cache.set(src, image);
  return image;
}

/**
 * The transform that maps an image's own pixel grid into composition units.
 *
 * @param {import('./types.mjs').ImageElement} el
 * @param {import('./png.mjs').RgbaImage} image
 * @returns {import('./geometry.mjs').Matrix}
 */
function imagePlacement(el, image) {
  const fit = el.fit ?? "fill";
  const sx = el.width / image.width;
  const sy = el.height / image.height;
  let scaleX = sx;
  let scaleY = sy;
  if (fit === "contain") scaleX = scaleY = Math.min(sx, sy);
  else if (fit === "cover") scaleX = scaleY = Math.max(sx, sy);
  else if (fit === "none") scaleX = scaleY = 1;
  const offsetX = el.x + (el.width - image.width * scaleX) / 2;
  const offsetY = el.y + (el.height - image.height * scaleY) / 2;
  return [scaleX, 0, 0, scaleY, offsetX, offsetY];
}

/**
 * Draws a placed image, sampled bilinearly through the inverse transform.
 *
 * @param {RenderContext} ctx
 * @param {import('./types.mjs').ImageElement} el
 * @param {Frame} frame
 */
function paintImage(ctx, el, frame) {
  const image = loadImage(ctx, el.src);
  if (!image) return;

  const box = [
    { x: el.x, y: el.y },
    { x: el.x + el.width, y: el.y },
    { x: el.x + el.width, y: el.y + el.height },
    { x: el.x, y: el.y + el.height },
  ];
  const device = transformContours([box], frame.matrix);
  const coverage = applyClip(
    rasterizeContours(device, ctx.width, ctx.height, "nonzero"),
    frame.clip
  );
  const bounds = contourBounds(device);
  if (!bounds) return;

  const toDevice = multiply(frame.matrix, imagePlacement(el, image));
  const toImage = invert(toDevice);
  const alpha = frame.opacity;
  const x0 = Math.max(0, Math.floor(bounds.x));
  const y0 = Math.max(0, Math.floor(bounds.y));
  const x1 = Math.min(ctx.width - 1, Math.ceil(bounds.x + bounds.width));
  const y1 = Math.min(ctx.height - 1, Math.ceil(bounds.y + bounds.height));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const index = y * ctx.width + x;
      const cover = Math.min(1, coverage[index]);
      if (cover <= 0) continue;
      const source = apply(toImage, { x: x + 0.5, y: y + 0.5 });
      const sample = sampleBilinear(image, source.x - 0.5, source.y - 0.5);
      if (!sample) continue;
      const a = (sample[3] / 255) * cover * alpha;
      if (a <= 0) continue;
      ctx.buffer.blend(index, (sample[0] / 255) * a, (sample[1] / 255) * a, (sample[2] / 255) * a, a);
    }
  }
}

/**
 * Bilinear sample, or `null` outside the image.
 *
 * @param {import('./png.mjs').RgbaImage} image
 * @param {number} x
 * @param {number} y
 * @returns {[number, number, number, number] | null}
 */
function sampleBilinear(image, x, y) {
  if (x < -0.5 || y < -0.5 || x > image.width - 0.5 || y > image.height - 0.5) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  /**
   * @param {number} px
   * @param {number} py
   * @param {number} channel
   * @returns {number}
   */
  const at = (px, py, channel) => {
    const cx = Math.min(Math.max(px, 0), image.width - 1);
    const cy = Math.min(Math.max(py, 0), image.height - 1);
    return image.data[(cy * image.width + cx) * 4 + channel];
  };
  /** @type {[number, number, number, number]} */
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = at(x0, y0, c) * (1 - fx) + at(x0 + 1, y0, c) * fx;
    const bottom = at(x0, y0 + 1, c) * (1 - fx) + at(x0 + 1, y0 + 1, c) * fx;
    out[c] = top * (1 - fy) + bottom * fy;
  }
  return out;
}

/**
 * Draws one element, recursing through groups.
 *
 * @param {RenderContext} ctx
 * @param {import('./types.mjs').Element} el
 * @param {Frame} parent
 */
function drawElement(ctx, el, parent) {
  if (el.visible === false) return;
  const matrix = multiply(parent.matrix, elementMatrix(el, shapeCentre(el)));
  const opacity = parent.opacity * (el.opacity ?? 1);
  if (opacity <= 0) return;
  const clip = el.clip ? clipMask(ctx, el.clip, matrix, parent.clip) : parent.clip;
  /** @type {Frame} */
  const frame = { matrix, clip, opacity };

  if (el.type === "group") {
    for (const child of el.children) drawElement(ctx, child, frame);
    return;
  }
  if (el.type === "text") {
    paintText(ctx, el, frame);
    return;
  }
  if (el.type === "image") {
    paintImage(ctx, el, frame);
    return;
  }

  const flat = flattenShape(el);
  const closed = transformContours(flat.closed, matrix);
  const open = transformContours(flat.open, matrix);
  paintFill(ctx, closed, el, frame, el.fillRule ?? "nonzero");
  paintStroke(ctx, closed, open, el, frame);
}

/**
 * Renders a composition into RGBA pixels.
 *
 * The page's own units decide the device size: a 360 by 360 pixel page comes
 * out 360 by 360, and a 100 by 100 millimetre page comes out at the CSS
 * reference of 96 pixels to the inch, the same ratio the SVG export assumes.
 *
 * @param {import('./types.mjs').CompositionDocument} doc
 * @param {RasterOptions} [options]
 * @returns {RasterResult}
 */
export function rasterizeComposition(doc, options = {}) {
  const scale = Math.max(options.scale ?? 1, 0.01);
  const unitScale = toPx(1, doc.units) * scale;
  const width = Math.max(1, Math.round(doc.width * unitScale));
  const height = Math.max(1, Math.round(doc.height * unitScale));

  const buffer = new Framebuffer(width, height);
  /** @type {RenderContext} */
  const ctx = {
    buffer,
    width,
    height,
    clips: new Map(
      doc.clips.map((clip) => [clip.id, { shapes: clip.shapes, fillRule: clip.fillRule }])
    ),
    cache: new Map(),
    decodeImage: options.decodeImage,
    warnings: [],
  };

  const page = new Float32Array(width * height).fill(1);
  for (const color of [options.background, doc.background]) {
    const paint = parsePaint(color);
    if (paint) buffer.fill(page, paint, 1);
  }

  /** @type {Frame} */
  const root = { matrix: scaling(unitScale, unitScale), clip: null, opacity: 1 };
  for (const el of doc.elements) drawElement(ctx, el, root);

  return { width, height, data: buffer.toRgba(), warnings: ctx.warnings };
}
