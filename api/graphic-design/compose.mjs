// The authoring surface of the graphic-design API.
//
// Ported from `src/core/graphic-design/compose.ts` in napkin-sketch (MIT,
// isocialPractice), commit d43caac191b2dfd532b3311f4ca1ea6969bb002f.
//
// A `Composition` is a page plus a list of elements and a method per shape.
// Every method takes a plain object of properties, returns the element it
// created - so it can be referenced later, or handed to a clipping mask - and
// appends it to the composition in drawing order. Nothing renders until one of
// `toSVG`, `toPNG` or `render` is called, and rendering never mutates the
// document, so one composition can be written out in both formats and the two
// are the same graphic by construction rather than by inspection.
//
// ```js
// const design = createComposition({ width: 360, height: 360, background: "#fdfcf7" });
// design.rect({ x: 24, y: 24, width: 312, height: 120, rx: 12, fill: "#326478" });
// design.text({ x: 180, y: 96, text: "Acme Corp", align: "center", fill: "#ffffff" });
// const svg = design.toSVG();
// const png = design.toPNG();
// ```

import { DEFAULT_UNITS, DEFAULT_COMPOSITION_SIZE } from "./types.mjs";
import { compositionToSvg } from "./svg.mjs";
import { encodePng } from "./png.mjs";
import { rasterizeComposition } from "./raster.mjs";

/**
 * An ordered list of elements and the methods that append to it.
 *
 * Shared by the composition itself and by every group inside it, so a group is
 * built with exactly the calls the page is built with.
 */
export class ElementList {
  /**
   * The elements, in drawing order: later ones paint over earlier ones.
   *
   * @type {import('./types.mjs').Element[]}
   */
  elements = [];

  /**
   * Appends an element built by hand.
   *
   * @template {import('./types.mjs').Element} T
   * @param {T} element
   * @returns {T}
   */
  add(element) {
    this.elements.push(element);
    return element;
  }

  /**
   * Appends several elements at once.
   *
   * @param {import('./types.mjs').Element[]} elements
   * @returns {import('./types.mjs').Element[]}
   */
  addAll(elements) {
    this.elements.push(...elements);
    return elements;
  }

  /**
   * A rectangle, with optional rounded corners.
   *
   * @param {Omit<import('./types.mjs').RectElement, 'type'>} props
   * @returns {import('./types.mjs').RectElement}
   */
  rect(props) {
    return this.add({ type: "rect", ...props });
  }

  /**
   * A circle.
   *
   * @param {Omit<import('./types.mjs').CircleElement, 'type'>} props
   * @returns {import('./types.mjs').CircleElement}
   */
  circle(props) {
    return this.add({ type: "circle", ...props });
  }

  /**
   * An ellipse.
   *
   * @param {Omit<import('./types.mjs').EllipseElement, 'type'>} props
   * @returns {import('./types.mjs').EllipseElement}
   */
  ellipse(props) {
    return this.add({ type: "ellipse", ...props });
  }

  /**
   * A triangle, from three points or from a box and a direction.
   *
   * @param {Omit<import('./types.mjs').TriangleElement, 'type'>} props
   * @returns {import('./types.mjs').TriangleElement}
   */
  triangle(props) {
    return this.add({ type: "triangle", ...props });
  }

  /**
   * A closed polygon.
   *
   * @param {Omit<import('./types.mjs').PolygonElement, 'type'>} props
   * @returns {import('./types.mjs').PolygonElement}
   */
  polygon(props) {
    return this.add({ type: "polygon", ...props });
  }

  /**
   * An open polyline.
   *
   * @param {Omit<import('./types.mjs').PolylineElement, 'type'>} props
   * @returns {import('./types.mjs').PolylineElement}
   */
  polyline(props) {
    return this.add({ type: "polyline", ...props });
  }

  /**
   * A straight line.
   *
   * @param {Omit<import('./types.mjs').LineElement, 'type'>} props
   * @returns {import('./types.mjs').LineElement}
   */
  line(props) {
    return this.add({ type: "line", ...props });
  }

  /**
   * A path in SVG path syntax (`M L H V C S Q T Z`).
   *
   * @param {Omit<import('./types.mjs').PathElement, 'type'>} props
   * @returns {import('./types.mjs').PathElement}
   */
  path(props) {
    return this.add({ type: "path", ...props });
  }

  /**
   * A block of text, wrapped and aligned.
   *
   * @param {Omit<import('./types.mjs').TextElement, 'type'>} props
   * @returns {import('./types.mjs').TextElement}
   */
  text(props) {
    return this.add({ type: "text", ...props });
  }

  /**
   * A placed media file, given as a data URL.
   *
   * @param {Omit<import('./types.mjs').ImageElement, 'type'>} props
   * @returns {import('./types.mjs').ImageElement}
   */
  image(props) {
    return this.add({ type: "image", ...props });
  }

  /**
   * A group: one transform, one opacity and one clip over several children.
   *
   * Pass a builder to fill it, which keeps the children beside the group that
   * owns them rather than in a variable declared above it.
   *
   * @param {Omit<import('./types.mjs').GroupElement, 'type' | 'children'> & { children?: import('./types.mjs').Element[] }} [props]
   * @param {(group: ElementList) => void} [build]
   * @returns {import('./types.mjs').GroupElement}
   */
  group(props = {}, build) {
    const children = props.children ? [...props.children] : [];
    /** @type {import('./types.mjs').GroupElement} */
    const element = { ...props, type: "group", children };
    if (build) {
      const inner = new ElementList();
      build(inner);
      children.push(...inner.elements);
    }
    return this.add(element);
  }
}

/** A page of elements, renderable to SVG or PNG. */
export class Composition extends ElementList {
  /**
   * @param {import('./types.mjs').PageOptions} [options]
   */
  constructor(options = {}) {
    super();
    /** Page width in {@link Composition#units}. */
    this.width = options.width ?? DEFAULT_COMPOSITION_SIZE;
    /** Page height in {@link Composition#units}. */
    this.height = options.height ?? DEFAULT_COMPOSITION_SIZE;
    /** The unit every coordinate in this composition is read in. */
    this.units = options.units ?? DEFAULT_UNITS;
    /** Page background, or `null` for transparent. */
    this.background = options.background ?? null;
    /** Document id, written as the root `<svg id>`. */
    this.id = options.id;
    /** Human title, written as `<title>`. */
    this.title = options.title;
    /** Carried for document compatibility; no renderer here reads it. */
    this.useGuiCanvas = options.useGuiCanvas ?? false;
    /**
     * Named clipping masks this composition defines.
     *
     * @type {import('./types.mjs').ClipDefinition[]}
     */
    this.clips = [];
  }

  /**
   * Defines a named clipping mask.
   *
   * Elements reference it by id - `clip: 'badge'` - so one mask can be shared,
   * which is the case a mask usually exists for. A one-off mask can be written
   * inline on the element instead.
   *
   * @param {string} id
   * @param {import('./types.mjs').ClipShape | import('./types.mjs').ClipShape[]} shapes
   * @param {import('./types.mjs').FillRule} [fillRule]
   * @returns {import('./types.mjs').ClipDefinition}
   */
  defineClip(id, shapes, fillRule) {
    /** @type {import('./types.mjs').ClipDefinition} */
    const definition = {
      id,
      shapes: Array.isArray(shapes) ? shapes : [shapes],
      fillRule,
    };
    this.clips.push(definition);
    return definition;
  }

  /**
   * Snapshots the composition as the plain document the renderers read.
   *
   * @returns {import('./types.mjs').CompositionDocument}
   */
  toDocument() {
    return {
      width: this.width,
      height: this.height,
      units: this.units,
      background: this.background,
      id: this.id,
      title: this.title,
      useGuiCanvas: this.useGuiCanvas,
      elements: this.elements,
      clips: this.clips,
    };
  }

  /**
   * Renders the composition as an SVG document.
   *
   * @param {import('./svg.mjs').SvgOptions} [options]
   * @returns {string}
   */
  toSVG(options) {
    return compositionToSvg(this.toDocument(), options);
  }

  /**
   * Renders the composition as PNG file bytes.
   *
   * @param {import('./raster.mjs').RasterOptions} [options]
   * @returns {Uint8Array}
   */
  toPNG(options) {
    return renderPng(this.toDocument(), options).data;
  }

  /**
   * Renders to pixels, keeping the warnings the raster pass collected.
   *
   * @param {import('./raster.mjs').RasterOptions} [options]
   * @returns {import('./raster.mjs').RasterResult}
   */
  rasterize(options) {
    return rasterizeComposition(this.toDocument(), options);
  }
}

/**
 * Creates a composition. Defaults to a 360 by 360 pixel page.
 *
 * @param {import('./types.mjs').PageOptions} [options]
 * @returns {Composition}
 */
export function createComposition(options = {}) {
  return new Composition(options);
}

/**
 * A PNG render: the file bytes, its pixel size, and anything skipped.
 *
 * @typedef {object} PngRender
 * @property {Uint8Array} data
 * @property {number} width
 * @property {number} height
 * @property {string[]} warnings
 */

/**
 * Renders a composition document to PNG file bytes.
 *
 * @param {import('./types.mjs').CompositionDocument} doc
 * @param {import('./raster.mjs').RasterOptions} [options]
 * @returns {PngRender}
 */
export function renderPng(doc, options = {}) {
  const raster = rasterizeComposition(doc, options);
  return {
    data: encodePng(raster.data, raster.width, raster.height),
    width: raster.width,
    height: raster.height,
    warnings: raster.warnings,
  };
}

/**
 * The export formats a composition renders to.
 *
 * @typedef {'svg' | 'png'} CompositionFormat
 */

/**
 * Options accepted by {@link renderComposition}.
 *
 * @typedef {import('./raster.mjs').RasterOptions & import('./svg.mjs').SvgOptions & { format?: CompositionFormat }} RenderOptions
 */

/**
 * Renders a composition in one of its formats.
 *
 * The single entry point a caller parameterises over: the same document, the
 * same elements, the same layout, and the only difference between the two
 * results is the media the graphic is carried in.
 *
 * @param {Composition | import('./types.mjs').CompositionDocument} source
 * @param {RenderOptions} [options]
 * @returns {string | Uint8Array}
 */
export function renderComposition(source, options = {}) {
  const doc = source instanceof Composition ? source.toDocument() : source;
  if (options.format === "png") return renderPng(doc, options).data;
  return compositionToSvg(doc, options);
}
