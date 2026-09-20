// Geometry for the graphic-design API: affine transforms, shapes flattened to
// polylines, an SVG path reader, dashing, and stroke outlining.
//
// Ported from `src/core/graphic-design/geometry.ts` in napkin-sketch (MIT,
// isocialPractice), commit d43caac191b2dfd532b3311f4ca1ea6969bb002f.
//
// Everything a renderer draws reduces to one of two things here - a list of
// closed contours to fill, or a list of open contours to stroke - and the
// stroker turns the second into the first. The rasterizer then has exactly one
// primitive to implement, and the SVG writer emits the original shape rather
// than the flattening, so the vector output stays as small and as editable as
// a design tool would have written it.
//
// ---
//
// **The one local change to this module** is a single letter pair in the path
// tokenizer, `PATH_TOKEN`, which makes the refusal of an elliptical arc real
// rather than documented. That constant carries the whole account. Everything
// else here is upstream.

/**
 * A contour: a run of points, closed or open depending on the caller.
 *
 * @typedef {import('./types.mjs').Point[]} Contour
 */

/**
 * An affine transform as the six numbers SVG names them:
 * `[a, b, c, d, e, f]` maps `(x, y)` to `(a x + c y + e, b x + d y + f)`.
 *
 * @typedef {[number, number, number, number, number, number]} Matrix
 */

/**
 * The transform that changes nothing.
 *
 * @type {Matrix}
 */
export const IDENTITY = [1, 0, 0, 1, 0, 0];

/**
 * Composes two transforms: the result applies `n` after `m`.
 *
 * @param {Matrix} m
 * @param {Matrix} n
 * @returns {Matrix}
 */
export function multiply(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/**
 * Applies a transform to a point.
 *
 * @param {Matrix} m
 * @param {import('./types.mjs').Point} p
 * @returns {import('./types.mjs').Point}
 */
export function apply(m, p) {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/**
 * Inverts a transform. Returns the identity for a degenerate matrix.
 *
 * @param {Matrix} m
 * @returns {Matrix}
 */
export function invert(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det) return IDENTITY;
  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}

/**
 * A translation.
 *
 * @param {number} tx
 * @param {number} ty
 * @returns {Matrix}
 */
export function translation(tx, ty) {
  return [1, 0, 0, 1, tx, ty];
}

/**
 * A scale about the origin.
 *
 * @param {number} sx
 * @param {number} sy
 * @returns {Matrix}
 */
export function scaling(sx, sy) {
  return [sx, 0, 0, sy, 0, 0];
}

/**
 * A clockwise rotation in degrees about the origin.
 *
 * @param {number} degrees
 * @returns {Matrix}
 */
export function rotation(degrees) {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, s, -s, c, 0, 0];
}

/**
 * The average of a transform's two axis scales - used to scale stroke width.
 *
 * @param {Matrix} m
 * @returns {number}
 */
export function meanScale(m) {
  const sx = Math.hypot(m[0], m[1]);
  const sy = Math.hypot(m[2], m[3]);
  return (sx + sy) / 2 || 1;
}

/**
 * Builds the transform an element's `rotate`, `scale` and `translate` ask for.
 *
 * Rotation and scale happen about `origin`, which defaults to the centre the
 * caller passes in - the element's own middle - so "rotate 15 degrees" turns a
 * shape in place rather than swinging it around the page corner.
 *
 * @param {{ rotate?: number, scale?: number | import('./types.mjs').Point, translate?: import('./types.mjs').Point, origin?: import('./types.mjs').Point }} el
 * @param {import('./types.mjs').Point} centre
 * @returns {Matrix}
 */
export function elementMatrix(el, centre) {
  const rotate = el.rotate ?? 0;
  const scale = el.scale ?? 1;
  const sx = typeof scale === "number" ? scale : scale.x;
  const sy = typeof scale === "number" ? scale : scale.y;
  const move = el.translate;
  if (!rotate && sx === 1 && sy === 1 && !move) return IDENTITY;

  const o = el.origin ?? centre;
  /** @type {Matrix} */
  let m = IDENTITY;
  if (move) m = multiply(m, translation(move.x, move.y));
  m = multiply(m, translation(o.x, o.y));
  if (rotate) m = multiply(m, rotation(rotate));
  if (sx !== 1 || sy !== 1) m = multiply(m, scaling(sx, sy));
  m = multiply(m, translation(-o.x, -o.y));
  return m;
}

/**
 * Transforms every point of every contour.
 *
 * @param {Contour[]} contours
 * @param {Matrix} m
 * @returns {Contour[]}
 */
export function transformContours(contours, m) {
  if (m === IDENTITY) return contours;
  return contours.map((c) => c.map((p) => apply(m, p)));
}

/**
 * The axis-aligned bounds of a set of contours, or `null` when empty.
 *
 * @param {Contour[]} contours
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function contourBounds(contours) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const contour of contours) {
    for (const p of contour) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// How many line segments a curve is cut into.
//
// Fixed rather than adaptive, and deliberately generous: the rasterizer is the
// only consumer, a composition page is a few hundred units across, and a fixed
// count keeps two renders of the same document byte-identical.
const CURVE_STEPS = 24;

/**
 * Samples a cubic Bezier, excluding its first point (the caller has it).
 *
 * @param {import('./types.mjs').Point} p0
 * @param {import('./types.mjs').Point} p1
 * @param {import('./types.mjs').Point} p2
 * @param {import('./types.mjs').Point} p3
 * @param {import('./types.mjs').Point[]} out
 */
function cubic(p0, p1, p2, p3, out) {
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
}

/** The Bezier constant for a quarter circle: 4/3 * tan(pi/8). */
const KAPPA = 0.5522847498307936;

/**
 * An ellipse as one closed contour of four Bezier quarters.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} rx
 * @param {number} ry
 * @returns {Contour}
 */
export function ellipseContour(cx, cy, rx, ry) {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  /** @type {import('./types.mjs').Point[]} */
  const pts = [{ x: cx + rx, y: cy }];
  cubic(
    { x: cx + rx, y: cy },
    { x: cx + rx, y: cy + oy },
    { x: cx + ox, y: cy + ry },
    { x: cx, y: cy + ry },
    pts
  );
  cubic(
    { x: cx, y: cy + ry },
    { x: cx - ox, y: cy + ry },
    { x: cx - rx, y: cy + oy },
    { x: cx - rx, y: cy },
    pts
  );
  cubic(
    { x: cx - rx, y: cy },
    { x: cx - rx, y: cy - oy },
    { x: cx - ox, y: cy - ry },
    { x: cx, y: cy - ry },
    pts
  );
  cubic(
    { x: cx, y: cy - ry },
    { x: cx + ox, y: cy - ry },
    { x: cx + rx, y: cy - oy },
    { x: cx + rx, y: cy },
    pts
  );
  return pts;
}

/**
 * A rectangle, with elliptical corners when `rx`/`ry` are non-zero.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} [rx]
 * @param {number} [ry]
 * @returns {Contour}
 */
export function rectContour(x, y, width, height, rx = 0, ry = rx) {
  const w = Math.abs(width);
  const h = Math.abs(height);
  const x0 = width < 0 ? x + width : x;
  const y0 = height < 0 ? y + height : y;
  const a = Math.min(Math.max(rx, 0), w / 2);
  const b = Math.min(Math.max(ry, 0), h / 2);
  if (a <= 0 || b <= 0) {
    return [
      { x: x0, y: y0 },
      { x: x0 + w, y: y0 },
      { x: x0 + w, y: y0 + h },
      { x: x0, y: y0 + h },
    ];
  }

  const ox = a * KAPPA;
  const oy = b * KAPPA;
  /** @type {import('./types.mjs').Point[]} */
  const pts = [{ x: x0 + a, y: y0 }];
  pts.push({ x: x0 + w - a, y: y0 });
  cubic(
    { x: x0 + w - a, y: y0 },
    { x: x0 + w - a + ox, y: y0 },
    { x: x0 + w, y: y0 + b - oy },
    { x: x0 + w, y: y0 + b },
    pts
  );
  pts.push({ x: x0 + w, y: y0 + h - b });
  cubic(
    { x: x0 + w, y: y0 + h - b },
    { x: x0 + w, y: y0 + h - b + oy },
    { x: x0 + w - a + ox, y: y0 + h },
    { x: x0 + w - a, y: y0 + h },
    pts
  );
  pts.push({ x: x0 + a, y: y0 + h });
  cubic(
    { x: x0 + a, y: y0 + h },
    { x: x0 + a - ox, y: y0 + h },
    { x: x0, y: y0 + h - b + oy },
    { x: x0, y: y0 + h - b },
    pts
  );
  pts.push({ x: x0, y: y0 + b });
  cubic(
    { x: x0, y: y0 + b },
    { x: x0, y: y0 + b - oy },
    { x: x0 + a - ox, y: y0 },
    { x: x0 + a, y: y0 },
    pts
  );
  return pts;
}

/**
 * The three corners of a triangle described by a box and a direction.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {'up' | 'down' | 'left' | 'right'} [variant]
 * @returns {Contour}
 */
export function triangleContour(x, y, width, height, variant = "up") {
  const x1 = x + width;
  const y1 = y + height;
  const midX = x + width / 2;
  const midY = y + height / 2;
  switch (variant) {
    case "down":
      return [
        { x, y },
        { x: x1, y },
        { x: midX, y: y1 },
      ];
    case "left":
      return [
        { x, y: midY },
        { x: x1, y },
        { x: x1, y: y1 },
      ];
    case "right":
      return [
        { x, y },
        { x: x1, y: midY },
        { x, y: y1 },
      ];
    default:
      return [
        { x: midX, y },
        { x: x1, y: y1 },
        { x, y: y1 },
      ];
  }
}

/**
 * One subpath read out of an SVG `d` string.
 *
 * @typedef {object} ParsedSubpath
 * @property {import('./types.mjs').Point[]} points
 * @property {boolean} closed
 */

/**
 * The command letters and numbers a `d` string is read as.
 *
 * **The `Aa` here is a local correction, and is the second edit this port has
 * made to a module it took from upstream.** Upstream's class is
 * `[MmLlHhVvCcSsQqTtZz]`, which does not include the arc - so an `A` matched
 * neither alternative, was skipped by the scan entirely, and its seven
 * parameters were read as coordinates of whatever command came before it. The
 * `default:` branch below, whose whole job is to raise on an arc, was
 * unreachable for the one command it was written for.
 *
 * What that produced was not an error. `M 0 0 A 5 5 0 0 1 10 10 A 5 5 0 0 1
 * 20 0` parsed cleanly into an eight point polyline of nonsense, because
 * fourteen leftover numbers divide evenly into pairs. A path whose leftovers
 * happened to be odd raised `malformed path data` instead, naming the whole
 * string rather than the command - so whether an unsupported arc was reported
 * at all came down to arithmetic.
 *
 * Matching the letter is what makes the refusal real, and it is the same
 * decision `svg.mjs` records for paints: this port refuses what it cannot
 * read rather than letting it through to be wrong somewhere with no error
 * attached. `api/graphic-design/API.md` states the limit a caller sees.
 */
const PATH_TOKEN = /([MmLlHhVvCcSsQqTtZzAa])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;

/**
 * Reads an SVG `d` string into flattened subpaths.
 *
 * Handles `M L H V C S Q T Z` in both cases. An `A` command, or anything else
 * unrecognised, raises - the model documents arcs as unsupported, and failing
 * at the path is far cheaper to diagnose than a shape that quietly loses a
 * corner.
 *
 * @param {string} d
 * @returns {ParsedSubpath[]}
 */
export function parsePathData(d) {
  /** @type {Array<string | number>} */
  const tokens = [];
  /** @type {RegExpExecArray | null} */
  let match;
  PATH_TOKEN.lastIndex = 0;
  while ((match = PATH_TOKEN.exec(d))) {
    tokens.push(match[1] ? match[1] : parseFloat(match[2]));
  }

  /** @type {ParsedSubpath[]} */
  const subpaths = [];
  /** @type {import('./types.mjs').Point[]} */
  let current = [];
  let closed = false;
  /** @type {import('./types.mjs').Point} */
  let cursor = { x: 0, y: 0 };
  /** @type {import('./types.mjs').Point} */
  let start = { x: 0, y: 0 };
  /** @type {import('./types.mjs').Point | null} */
  let lastControl = null;
  let command = "";
  let i = 0;

  const flush = () => {
    if (current.length > 1) subpaths.push({ points: current, closed });
    current = [];
    closed = false;
  };
  const num = () => {
    const v = tokens[i++];
    if (typeof v !== "number") throw new Error(`graphic-design: malformed path data near "${d}"`);
    return v;
  };

  while (i < tokens.length) {
    const token = tokens[i];
    if (typeof token === "string") {
      command = token;
      i++;
      if (command === "Z" || command === "z") {
        if (current.length > 1) {
          closed = true;
          flush();
        }
        cursor = { ...start };
        continue;
      }
    } else if (!command) {
      throw new Error("graphic-design: path data must start with a move command");
    }

    const relative = command === command.toLowerCase();
    const base = relative ? cursor : { x: 0, y: 0 };

    switch (command.toUpperCase()) {
      case "M": {
        flush();
        cursor = { x: base.x + num(), y: base.y + num() };
        start = { ...cursor };
        current = [{ ...cursor }];
        lastControl = null;
        // A second coordinate pair after a move is an implicit lineto.
        command = relative ? "l" : "L";
        break;
      }
      case "L": {
        cursor = { x: base.x + num(), y: base.y + num() };
        current.push({ ...cursor });
        lastControl = null;
        break;
      }
      case "H": {
        cursor = { x: base.x + num(), y: cursor.y };
        current.push({ ...cursor });
        lastControl = null;
        break;
      }
      case "V": {
        cursor = { x: cursor.x, y: base.y + num() };
        current.push({ ...cursor });
        lastControl = null;
        break;
      }
      case "C":
      case "S": {
        /** @type {import('./types.mjs').Point} */
        let c1;
        if (command.toUpperCase() === "C") {
          c1 = { x: base.x + num(), y: base.y + num() };
        } else {
          c1 = lastControl
            ? { x: 2 * cursor.x - lastControl.x, y: 2 * cursor.y - lastControl.y }
            : { ...cursor };
        }
        const c2 = { x: base.x + num(), y: base.y + num() };
        const end = { x: base.x + num(), y: base.y + num() };
        cubic(cursor, c1, c2, end, current);
        lastControl = c2;
        cursor = end;
        break;
      }
      case "Q":
      case "T": {
        /** @type {import('./types.mjs').Point} */
        const q =
          command.toUpperCase() === "Q"
            ? { x: base.x + num(), y: base.y + num() }
            : lastControl
              ? { x: 2 * cursor.x - lastControl.x, y: 2 * cursor.y - lastControl.y }
              : { ...cursor };
        const end = { x: base.x + num(), y: base.y + num() };
        // A quadratic is the cubic with its controls two thirds of the way out.
        cubic(
          cursor,
          { x: cursor.x + (2 / 3) * (q.x - cursor.x), y: cursor.y + (2 / 3) * (q.y - cursor.y) },
          { x: end.x + (2 / 3) * (q.x - end.x), y: end.y + (2 / 3) * (q.y - end.y) },
          end,
          current
        );
        lastControl = q;
        cursor = end;
        break;
      }
      default:
        throw new Error(`graphic-design: unsupported path command "${command}"`);
    }
  }
  flush();
  return subpaths;
}

/**
 * Flattened geometry: closed contours to fill, open contours to stroke.
 *
 * @typedef {object} Flattened
 * @property {Contour[]} closed Contours treated as closed when filling.
 * @property {Contour[]} open Contours treated as open when stroking.
 */

/**
 * Where a shape's transform pivots when no explicit origin was given.
 *
 * @param {import('./types.mjs').Element | import('./types.mjs').ClipShape} el
 * @returns {import('./types.mjs').Point}
 */
export function shapeCentre(el) {
  switch (el.type) {
    case "rect":
      return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
    case "circle":
    case "ellipse":
      return { x: el.cx, y: el.cy };
    case "image":
      return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
    case "line":
      return { x: (el.x1 + el.x2) / 2, y: (el.y1 + el.y2) / 2 };
    case "text":
      return { x: el.x, y: el.y };
    default: {
      const flat = flattenShape(el);
      const box = contourBounds(flat.closed.concat(flat.open));
      return box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: 0, y: 0 };
    }
  }
}

/**
 * Flattens a shape to contours in its own coordinate space.
 *
 * Text and images are not shapes and come back empty - the renderers handle
 * both, because one needs a font and the other needs pixels.
 *
 * @param {import('./types.mjs').Element | import('./types.mjs').ClipShape} el
 * @returns {Flattened}
 */
export function flattenShape(el) {
  switch (el.type) {
    case "rect":
      return {
        closed: [rectContour(el.x, el.y, el.width, el.height, el.rx ?? 0, el.ry ?? el.rx ?? 0)],
        open: [],
      };
    case "circle":
      return { closed: [ellipseContour(el.cx, el.cy, el.r, el.r)], open: [] };
    case "ellipse":
      return { closed: [ellipseContour(el.cx, el.cy, el.rx, el.ry)], open: [] };
    case "triangle": {
      const pts = el.points
        ? el.points.map((p) => ({ ...p }))
        : triangleContour(el.x ?? 0, el.y ?? 0, el.width ?? 0, el.height ?? 0, el.variant);
      return { closed: [pts], open: [] };
    }
    case "polygon":
      return { closed: [el.points.map((p) => ({ ...p }))], open: [] };
    case "polyline":
      return { closed: [], open: [el.points.map((p) => ({ ...p }))] };
    case "line":
      return {
        closed: [],
        open: [
          [
            { x: el.x1, y: el.y1 },
            { x: el.x2, y: el.y2 },
          ],
        ],
      };
    case "path": {
      const subpaths = parsePathData(el.d);
      return {
        closed: subpaths.filter((s) => s.closed).map((s) => s.points),
        open: subpaths.filter((s) => !s.closed).map((s) => s.points),
      };
    }
    default:
      return { closed: [], open: [] };
  }
}

/**
 * Splits a contour into the dashes of a pattern.
 *
 * @param {import('./types.mjs').Point[]} points
 * @param {number[]} pattern
 * @param {number} [offset]
 * @param {boolean} [closed]
 * @returns {Contour[]}
 */
export function dashContour(points, pattern, offset = 0, closed = false) {
  const dashes = pattern.filter((n) => Number.isFinite(n) && n >= 0);
  const total = dashes.reduce((sum, n) => sum + n, 0);
  if (dashes.length === 0 || total <= 0) return [closed ? [...points, points[0]] : points];

  const path = closed && points.length > 1 ? [...points, points[0]] : points;
  /** @type {Contour[]} */
  const out = [];
  let index = 0;
  let remaining = dashes[0];
  let on = true;
  let skip = ((offset % total) + total) % total;
  while (skip > 0) {
    const step = Math.min(skip, remaining);
    remaining -= step;
    skip -= step;
    if (remaining <= 1e-9) {
      index = (index + 1) % dashes.length;
      remaining = dashes[index];
      on = !on;
    }
  }

  /** @type {import('./types.mjs').Point[]} */
  let run = on ? [path[0]] : [];
  for (let i = 0; i < path.length - 1; i++) {
    let a = path[i];
    const b = path[i + 1];
    let length = Math.hypot(b.x - a.x, b.y - a.y);
    while (length > remaining) {
      const t = remaining / length;
      const cut = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (on) {
        run.push(cut);
        if (run.length > 1) out.push(run);
        run = [];
      } else {
        run = [cut];
      }
      on = !on;
      a = cut;
      length -= remaining;
      index = (index + 1) % dashes.length;
      remaining = dashes[index];
    }
    remaining -= length;
    if (on) run.push(b);
    if (remaining <= 1e-9) {
      if (on && run.length > 1) out.push(run);
      run = on ? [] : [b];
      on = !on;
      index = (index + 1) % dashes.length;
      remaining = dashes[index];
      if (on) run = [b];
    }
  }
  if (on && run.length > 1) out.push(run);
  return out;
}

/**
 * A disc as a closed contour, wound the same way every other outline is.
 *
 * @param {import('./types.mjs').Point} centre
 * @param {number} radius
 * @param {number} [steps]
 * @returns {Contour}
 */
function disc(centre, radius, steps = 16) {
  /** @type {Contour} */
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    pts.push({ x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius });
  }
  return pts;
}

/**
 * Twice the signed area of a contour; positive means clockwise on screen.
 *
 * @param {Contour} contour
 * @returns {number}
 */
function signedArea(contour) {
  let sum = 0;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i];
    const b = contour[(i + 1) % contour.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum;
}

/**
 * Winds a contour clockwise, so a union of pieces fills under `nonzero`.
 *
 * @param {Contour} contour
 * @returns {Contour}
 */
function clockwise(contour) {
  return signedArea(contour) >= 0 ? contour : [...contour].reverse();
}

/**
 * Removes the consecutive duplicates that would give a segment no direction.
 *
 * @param {import('./types.mjs').Point[]} points
 * @returns {import('./types.mjs').Point[]}
 */
function dedupe(points) {
  /** @type {import('./types.mjs').Point[]} */
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1e-9 || Math.abs(last.y - p.y) > 1e-9) out.push(p);
  }
  return out;
}

/**
 * Options for {@link strokeContour}.
 *
 * @typedef {object} StrokeOptions
 * @property {number} width
 * @property {'butt' | 'round' | 'square'} [cap]
 * @property {'miter' | 'round' | 'bevel'} [join]
 * @property {boolean} [closed]
 * @property {number} [miterLimit]
 */

/**
 * Turns a stroked contour into the closed outlines that fill to the same mark.
 *
 * One quad per segment, plus a join piece at every interior vertex and a cap
 * piece at each end, all wound the same direction. Filling the set under the
 * nonzero rule unions them, so overlapping pieces leave no seam - which is
 * what makes a thick polyline look like one mark rather than a row of quads.
 *
 * @param {import('./types.mjs').Point[]} points
 * @param {StrokeOptions} options
 * @returns {Contour[]}
 */
export function strokeContour(points, options) {
  const pts = dedupe(points);
  const half = Math.max(options.width, 0) / 2;
  if (half <= 0) return [];
  const cap = options.cap ?? "butt";
  const join = options.join ?? "miter";
  const closed = options.closed === true && pts.length > 2;
  if (pts.length < 2) {
    // A degenerate contour still draws a dot under a round or square cap.
    if (pts.length === 1 && cap === "round") return [disc(pts[0], half)];
    if (pts.length === 1 && cap === "square") {
      return [clockwise(rectContour(pts[0].x - half, pts[0].y - half, half * 2, half * 2))];
    }
    return [];
  }

  /** @type {Contour[]} */
  const out = [];
  const segments = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < segments; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;
    let a0 = a;
    let b0 = b;
    if (!closed && cap === "square") {
      const ex = (dx / len) * half;
      const ey = (dy / len) * half;
      if (i === 0) a0 = { x: a.x - ex, y: a.y - ey };
      if (i === segments - 1) b0 = { x: b.x + ex, y: b.y + ey };
    }
    out.push(
      clockwise([
        { x: a0.x + nx, y: a0.y + ny },
        { x: b0.x + nx, y: b0.y + ny },
        { x: b0.x - nx, y: b0.y - ny },
        { x: a0.x - nx, y: a0.y - ny },
      ])
    );
  }

  const joins = closed ? pts.length : pts.length - 2;
  for (let k = 0; k < joins; k++) {
    const index = closed ? k : k + 1;
    const prev = pts[(index - 1 + pts.length) % pts.length];
    const here = pts[index];
    const next = pts[(index + 1) % pts.length];
    if (join === "round") {
      out.push(disc(here, half));
      continue;
    }
    const inDir = { x: here.x - prev.x, y: here.y - prev.y };
    const outDir = { x: next.x - here.x, y: next.y - here.y };
    const inLen = Math.hypot(inDir.x, inDir.y) || 1;
    const outLen = Math.hypot(outDir.x, outDir.y) || 1;
    const cross = (inDir.x * outDir.y - inDir.y * outDir.x) / (inLen * outLen);
    if (Math.abs(cross) < 1e-6) continue;
    const side = cross > 0 ? -1 : 1;
    const n1 = { x: (-inDir.y / inLen) * half * side, y: (inDir.x / inLen) * half * side };
    const n2 = { x: (-outDir.y / outLen) * half * side, y: (outDir.x / outLen) * half * side };
    const p1 = { x: here.x + n1.x, y: here.y + n1.y };
    const p2 = { x: here.x + n2.x, y: here.y + n2.y };
    const bevel = clockwise([here, p1, p2]);
    if (join === "bevel") {
      out.push(bevel);
      continue;
    }
    // Miter: extend both edges to where they meet, unless the spike is longer
    // than the limit allows, in which case fall back to the bevel.
    const cosHalf = Math.sqrt(
      Math.max(0, (1 + (inDir.x * outDir.x + inDir.y * outDir.y) / (inLen * outLen)) / 2)
    );
    const ratio = cosHalf > 1e-6 ? 1 / cosHalf : Infinity;
    if (ratio > (options.miterLimit ?? 4)) {
      out.push(bevel);
      continue;
    }
    const mid = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };
    const midLen = Math.hypot(mid.x, mid.y) || 1;
    const tip = {
      x: here.x + (mid.x / midLen) * half * ratio,
      y: here.y + (mid.y / midLen) * half * ratio,
    };
    out.push(clockwise([here, p1, tip, p2]));
  }

  if (!closed && cap === "round") {
    out.push(disc(pts[0], half));
    out.push(disc(pts[pts.length - 1], half));
  }
  return out;
}
