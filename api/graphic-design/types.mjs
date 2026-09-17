// Data model for the graphic-design API.
//
// Ported from `src/core/graphic-design/types.ts` in napkin-sketch (MIT,
// isocialPractice), commit d43caac191b2dfd532b3311f4ca1ea6969bb002f. The
// upstream file is TypeScript interfaces and five constants; an interface has
// no runtime form, so the port carries the model as JSDoc typedefs. An editor
// still checks a composition against it, and nothing has to be built first,
// which is the whole reason the port is `.mjs` rather than `.ts`.
//
// A composition is a list of elements over a page of a known size. Every
// element is a plain object - no classes, no DOM, no canvas - so a composition
// can be built in Node, stored as JSON, and rendered by more than one back
// end. Two back ends ship: an SVG writer and a software rasterizer that
// encodes PNG. Both read this model and nothing else, which is what makes "the
// same graphic in two formats" a property of the design rather than a claim
// the tests have to police.
//
// Coordinates are numbers in the composition's `units` (pixels by default),
// measured from the top-left corner with y increasing downwards - the same
// frame SVG uses, so what is written here is what the SVG says.

/**
 * A point in composition units.
 *
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * The page a composition is drawn on.
 *
 * `useGuiCanvas` is carried so a document written by either repository round
 * trips through the other, and it is read by nothing here: `canvas.ts` is the
 * one upstream module this port drops, because it paints into a GUI canvas
 * this repository does not have.
 *
 * @typedef {object} PageOptions
 * @property {number} [width] Page width in `units`. Defaults to {@link DEFAULT_COMPOSITION_SIZE}.
 * @property {number} [height] Page height in `units`. Defaults to {@link DEFAULT_COMPOSITION_SIZE}.
 * @property {import('./units.mjs').LengthUnit} [units] Unit every coordinate is expressed in. Default `px`.
 * @property {string | null} [background] Page background. `null` (the default) leaves the page transparent.
 * @property {string} [id] Document id, written as the root `<svg id>`.
 * @property {string} [title] Human title, written as `<title>` for accessibility.
 * @property {boolean} [useGuiCanvas] Carried for document compatibility; no renderer here reads it.
 */

/**
 * Fill rule for self-intersecting outlines.
 *
 * @typedef {'nonzero' | 'evenodd'} FillRule
 */

/**
 * Stroke cap shape.
 *
 * @typedef {'butt' | 'round' | 'square'} LineCap
 */

/**
 * Stroke join shape.
 *
 * @typedef {'miter' | 'round' | 'bevel'} LineJoin
 */

/**
 * Paint and geometry properties every element understands.
 *
 * @typedef {object} CommonProps
 * @property {string} [id] Stable id. Referenced by clipping masks and written to the SVG.
 * @property {string} [name] Name, written as `data-name` - the label a design tool would show.
 * @property {string | null} [fill] Fill paint as a CSS color, or `null` for no fill.
 * @property {number} [fillOpacity] Fill alpha in 0-1, multiplied into the fill color's own alpha.
 * @property {FillRule} [fillRule] How a self-intersecting outline decides inside from outside.
 * @property {string | null} [stroke] Stroke paint as a CSS color, or `null` for no stroke.
 * @property {number} [strokeWidth] Stroke width in composition units. Default 1 when a stroke is set.
 * @property {number} [strokeOpacity] Stroke alpha in 0-1.
 * @property {LineCap} [lineCap] Cap drawn at the ends of an open stroke. Default `butt`.
 * @property {LineJoin} [lineJoin] Join drawn where two stroke segments meet. Default `miter`.
 * @property {number[]} [dash] Dash pattern in composition units, e.g. `[4, 2]`.
 * @property {number} [dashOffset] Offset into the dash pattern.
 * @property {number} [opacity] Element alpha in 0-1, multiplied over fill and stroke alike.
 * @property {number} [rotate] Rotation in degrees, clockwise, about `origin`.
 * @property {number | Point} [scale] Uniform or per-axis scale applied about `origin`.
 * @property {Point} [translate] Translation applied after rotation and scale.
 * @property {Point} [origin] Pivot for rotation and scale. Defaults to the element's own centre.
 * @property {string | ClipShape} [clip] Clipping mask: an id defined with `defineClip`, or an inline shape.
 * @property {boolean} [visible] Set false to keep an element in the model but out of every render.
 */

/**
 * An axis-aligned rectangle, optionally with rounded corners.
 *
 * `rx` sets `ry` too when `ry` is omitted.
 *
 * @typedef {CommonProps & {
 *   type: 'rect',
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   rx?: number,
 *   ry?: number
 * }} RectElement
 */

/**
 * A circle given by its centre and radius.
 *
 * @typedef {CommonProps & { type: 'circle', cx: number, cy: number, r: number }} CircleElement
 */

/**
 * An ellipse given by its centre and two radii.
 *
 * @typedef {CommonProps & {
 *   type: 'ellipse',
 *   cx: number,
 *   cy: number,
 *   rx: number,
 *   ry: number
 * }} EllipseElement
 */

/**
 * A triangle.
 *
 * Either three explicit `points`, or a bounding box plus a `variant` - the box
 * form is what a layout wants ("a triangle in this slot"), and the points form
 * is what a drawing wants. `variant` defaults to `up`.
 *
 * @typedef {CommonProps & {
 *   type: 'triangle',
 *   points?: [Point, Point, Point],
 *   x?: number,
 *   y?: number,
 *   width?: number,
 *   height?: number,
 *   variant?: 'up' | 'down' | 'left' | 'right'
 * }} TriangleElement
 */

/**
 * A closed polygon through the given points.
 *
 * @typedef {CommonProps & { type: 'polygon', points: Point[] }} PolygonElement
 */

/**
 * An open polyline through the given points.
 *
 * @typedef {CommonProps & { type: 'polyline', points: Point[] }} PolylineElement
 */

/**
 * A straight line segment.
 *
 * @typedef {CommonProps & {
 *   type: 'line',
 *   x1: number,
 *   y1: number,
 *   x2: number,
 *   y2: number
 * }} LineElement
 */

/**
 * A path written in SVG path syntax.
 *
 * The supported commands are `M L H V C S Q T Z` in both cases. Elliptical
 * arcs (`A`) are deliberately absent: every rounded corner this API draws is
 * generated as Beziers, so nothing in the model needs them, and a half-right
 * arc converter is worse than an honest gap.
 *
 * @typedef {CommonProps & { type: 'path', d: string }} PathElement
 */

/**
 * Horizontal alignment of a text block against its anchor.
 *
 * @typedef {'left' | 'center' | 'right' | 'justify'} TextAlign
 */

/**
 * Which part of the first line the `y` coordinate names.
 *
 * @typedef {'alphabetic' | 'top' | 'middle' | 'bottom'} TextBaseline
 */

/**
 * Character-level text styling.
 *
 * @typedef {object} TextStyle
 * @property {import('./font.mjs').Face} [face] The metrics this run is measured with. Default the built-in alphabet. When it names a `fontFamily`, that is also what the SVG asks for, so a run cannot be measured in one face and drawn in another.
 * @property {string} [fontFamily] CSS font family list. Default the face's own, else {@link DEFAULT_TEXT_FONT}.
 * @property {number} [fontSize] Font size in composition units. Default {@link DEFAULT_FONT_SIZE}.
 * @property {number | 'normal' | 'bold'} [fontWeight] `normal`, `bold`, or a numeric CSS weight.
 * @property {'normal' | 'italic'} [fontStyle] `normal` or `italic`.
 * @property {number} [letterSpacing] Extra space between characters, in composition units.
 * @property {number} [wordSpacing] Extra space added to each word gap, in composition units.
 * @property {'none' | 'underline' | 'line-through'} [decoration] Underline or strike-through.
 * @property {'none' | 'uppercase' | 'lowercase' | 'capitalize'} [transform] Case transform applied before layout, so it also affects wrapping.
 */

/**
 * Block-level text styling.
 *
 * @typedef {object} ParagraphStyle
 * @property {TextAlign} [align] Horizontal alignment within the text block. Default `left`.
 * @property {number} [lineHeight] Line advance as a multiple of the font size. Default 1.2.
 * @property {number} [maxWidth] Wrap width in composition units. Omit to break only on newlines.
 * @property {number} [paragraphSpacing] Extra space before each paragraph after the first.
 * @property {number} [indent] First-line indent of each paragraph.
 * @property {TextBaseline} [baseline] What `y` measures on the first line. Default `alphabetic`.
 */

/**
 * A run of text, wrapped and aligned as a block.
 *
 * `x` and `y` are the anchor; what each means depends on the paragraph's
 * alignment and baseline. A newline in `text` starts a new paragraph.
 *
 * @typedef {CommonProps & TextStyle & ParagraphStyle & {
 *   type: 'text',
 *   x: number,
 *   y: number,
 *   text: string
 * }} TextElement
 */

/**
 * How a placed image fills the box it was given.
 *
 * @typedef {'fill' | 'contain' | 'cover' | 'none'} ImageFit
 */

/**
 * A placed media file.
 *
 * `src` is a data URL. The SVG writer embeds whatever it is handed, so JPEG,
 * PNG, GIF and SVG all round-trip; the rasterizer decodes PNG itself and asks
 * the caller for a decoder for anything else, through `RasterOptions.decodeImage`.
 *
 * @typedef {CommonProps & {
 *   type: 'image',
 *   src: string,
 *   x: number,
 *   y: number,
 *   width: number,
 *   height: number,
 *   fit?: ImageFit,
 *   alt?: string
 * }} ImageElement
 */

/**
 * A transform applied to a set of children as one.
 *
 * @typedef {CommonProps & { type: 'group', children: Element[] }} GroupElement
 */

/**
 * Any element a composition can hold.
 *
 * @typedef {RectElement
 *   | CircleElement
 *   | EllipseElement
 *   | TriangleElement
 *   | PolygonElement
 *   | PolylineElement
 *   | LineElement
 *   | PathElement
 *   | TextElement
 *   | ImageElement
 *   | GroupElement} Element
 */

/**
 * The element kinds a clipping mask may be built from.
 *
 * @typedef {RectElement
 *   | CircleElement
 *   | EllipseElement
 *   | TriangleElement
 *   | PolygonElement
 *   | PathElement} ClipShape
 */

/**
 * A named clipping mask, referenced by `clip: '<id>'`.
 *
 * @typedef {object} ClipDefinition
 * @property {string} id
 * @property {ClipShape[]} shapes
 * @property {FillRule} [fillRule] Fill rule used to decide what the mask keeps. Default `nonzero`.
 */

/**
 * A finished composition: a page, its elements, and its clipping masks.
 *
 * @typedef {object} CompositionDocument
 * @property {number} width
 * @property {number} height
 * @property {import('./units.mjs').LengthUnit} units
 * @property {string | null} background
 * @property {string} [id]
 * @property {string} [title]
 * @property {boolean} useGuiCanvas
 * @property {Element[]} elements
 * @property {ClipDefinition[]} clips
 */

/** Page size used when a composition does not name one: 360 by 360. */
export const DEFAULT_COMPOSITION_SIZE = 360;

/** Unit every coordinate is read in unless the page names another. */
export const DEFAULT_UNITS = "px";

/** Font stack used by a text element that does not name one. */
export const DEFAULT_TEXT_FONT = "Helvetica, Arial, 'Liberation Sans', sans-serif";

/** Font size used by a text element that does not name one. */
export const DEFAULT_FONT_SIZE = 16;

/** Line advance as a multiple of the font size. */
export const DEFAULT_LINE_HEIGHT = 1.2;

/**
 * Type guard for the elements that carry a `children` array.
 *
 * @param {Element} el
 * @returns {boolean}
 */
export function isGroup(el) {
  return el.type === "group";
}
