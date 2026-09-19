// The fixture document the port's render is pinned against.
//
// A module rather than a JSON file, because it has to be *built* through the
// authoring surface a caller uses. A committed document would pin the
// renderers alone and let `rect()`, `group()` or the element defaults change
// underneath them without a single case turning red.
//
// It is deliberately small and deliberately ugly. Every element kind the port
// draws appears exactly once, at coordinates chosen to land on and between
// pixel boundaries, so a change to the flattener, the stroker, the clipper or
// the colour parser moves bytes. What it is not is a picture of anything: a
// fixture that looked like a cheatsheet would invite someone to improve it, and
// the entire value of this document is that it never changes.
//
// The cheatsheet fixture beside it, in `tools/test-render-fixture.mjs`, is the
// other half - that one is a real sheet at a named seed, and pins the
// composition layer rather than the port.

import { createComposition } from "../../api/graphic-design/compose.mjs";

/** The document, built fresh each call so no test can mutate another's. */
export function fixtureComposition() {
  const design = createComposition({
    width: 240,
    height: 160,
    background: "#fdfcf7",
    title: "Demo Tool",
    id: "fixture",
  });

  // A named mask, so the clip path is exercised by id rather than inline.
  design.defineClip("band", { type: "rect", x: 8, y: 8, width: 224, height: 64 });

  design.rect({ name: "panel", x: 8, y: 8, width: 224, height: 64, rx: 4, fill: "#326478" });
  // Clipped and half transparent: the mask and the alpha blend are on the same
  // element, because each is cheap to get right alone and they interact.
  design.circle({ name: "dot", cx: 32, cy: 40, r: 12, fill: "#4dae51", opacity: 0.8, clip: "band" });
  design.ellipse({ name: "oval", cx: 72, cy: 40, rx: 20, ry: 11, fill: "#f8f5ae" });
  design.triangle({
    name: "wedge",
    points: [
      { x: 104, y: 52 },
      { x: 124, y: 52 },
      { x: 114, y: 26 },
    ],
    fill: "#fdc83a",
  });
  design.polygon({
    name: "chevron",
    points: [
      { x: 140, y: 28 },
      { x: 156, y: 40 },
      { x: 140, y: 52 },
      { x: 148, y: 40 },
    ],
    fill: "#adf8b7",
  });
  design.polyline({
    name: "trace",
    points: [
      { x: 168, y: 52 },
      { x: 178, y: 28 },
      { x: 188, y: 46 },
      { x: 198, y: 30 },
    ],
    fill: "none",
    stroke: "#ffffff",
    strokeWidth: 2,
  });
  design.line({ name: "rule", x1: 8, y1: 80, x2: 232, y2: 80, stroke: "#4dae51", strokeWidth: 3 });
  // No `A` command: an elliptical arc is refused by the port on purpose, and a
  // fixture that used one would be a fixture that never renders.
  design.path({
    name: "curve",
    d: "M 16 112 C 56 88, 96 136, 136 112 L 176 112",
    fill: "none",
    stroke: "#2e7534",
    strokeWidth: 2,
  });
  design.text({
    name: "label",
    x: 120,
    y: 140,
    text: "Acme Corp",
    align: "center",
    fill: "#414143",
    fontSize: 14,
  });
  // A group carries a rotation and a translation, so the matrix path is
  // exercised as well as the elements inside it. The angle is off the axis on
  // purpose: a 90 degree rotation is exact in floating point and would pass a
  // broken matrix.
  design.group({ name: "badge", translate: { x: 196, y: 124 }, rotate: 12, origin: { x: 0, y: 0 } }, (g) => {
    g.rect({ name: "badge-ground", x: -14, y: -10, width: 28, height: 20, rx: 2, fill: "#000132" });
    g.text({ name: "badge-text", x: 0, y: 4, text: "xyz", align: "center", fill: "#ffffff", fontSize: 9 });
  });

  return design;
}
