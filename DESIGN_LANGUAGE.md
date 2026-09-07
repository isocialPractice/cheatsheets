# Design Language

The design language for the published site at
<https://isocialpractice.github.io/cheatsheets/>.

`mark.png` is the only mark the repository carries, so the palette comes
from it and the composition follows its geometry. Every value below is
either **sampled** from the mark or **derived** from one that was, and the
Source section says which it is and where it came from. Nothing here is
invented.

> **Status**: the **Layout** section below is implemented. `index.html`
> declares its language, carries a viewport tag, links the favicon, and lays
> its columns out as a wrapping flex row that collapses to one column below
> 768px. The palette and the type scale are still the target rather than the
> stylesheet. **Apply what the extraction settles to the site's own
> stylesheet**, under **Cheatsheet Composition Language** in `TODO.md`, is the
> work that applies them; the contrast audit under **Page Structure and
> Responsiveness** measures them once they are there.

## Source

`mark.png` is a 417x418 mark, 174,306 opaque pixels across 322 unique
colors. Three of those colors cover 97.72% of it: a deep navy ground, a mid
green figure, and a white highlight.

It is the artwork the counts below were taken over, kept in the repository so
they stay checkable. `favicon.ico` is the icon derived from it and is not the
same image: see **The icon** at the end of this document.

### Sampled from the mark

Counted over every pixel, not estimated:

| Sampled | Hex | Pixels | Share | Where it sits in the mark |
| --- | --- | --- | --- | --- |
| Navy | `#000133` | 76,395 | 43.83% | The ground, and the dominant color by area |
| Green | `#4CAE50` | 62,940 | 36.11% | The figure |
| White | `#FFFFFF` | 31,000 | 17.78% | The highlight |

The remaining 2.28% is antialiasing along the figure's edges. No single
edge color exceeds 0.47%, so none of them carries a role.

### Derived from those three

The tokens below are **not** in the mark. Each one states the sampled color
it comes from and the reason it moved, so no value here is unaccounted for:

| Derived | Hex | From | Why it moved |
| --- | --- | --- | --- |
| Navy, soft | `#020433` | `#000133` | The ground warmed off absolute black-blue. 1.01:1 against the sampled navy, so the mark still reads as itself |
| Off white | `#F8F8F9` | `#FFFFFF` | The highlight softened, so a full page of it is not pure white |
| Slate | `#414566` | `#000133` | The ground lightened until it carries secondary text at 8.72:1 |
| Muted | `#6F6F8C` | `#000133` | Lightened further, stopping at 4.57:1, the AA floor for normal text |
| Green, dark | `#2E7534` | `#4CAE50` | The figure darkened until it carries link text on light at 5.33:1 |
| Sage | `#9EBEA7` | `#4CAE50` | The figure desaturated toward the highlight for secondary text on dark, at 9.72:1 |

The mark is a filled square with square corners and no thin strokes: dense,
flat, and orthogonal. Spacing, radii, and weight follow from that rather
than from a rounded or airy reading.

## Palette and roles

Roles are assigned by measured contrast, not by preference. Every ratio
below was computed against its stated background, and every pairing the
site uses for text reaches at least 4.5:1.

### Light theme

| Role | Hex | On | Ratio | Passes |
| --- | --- | --- | --- | --- |
| Page background | `#F8F8F9` | - | - | - |
| Body text | `#020433` | `#F8F8F9` | 18.53:1 | AA normal |
| Secondary text | `#414566` | `#F8F8F9` | 8.72:1 | AA normal |
| Muted text, borders | `#6F6F8C` | `#F8F8F9` | 4.57:1 | AA normal |
| Link, accent text | `#2E7534` | `#F8F8F9` | 5.33:1 | AA normal |

### Dark theme

| Role | Hex | On | Ratio | Passes |
| --- | --- | --- | --- | --- |
| Page background | `#020433` | - | - | - |
| Body text | `#F8F8F9` | `#020433` | 18.53:1 | AA normal |
| Link, accent text | `#4CAE50` | `#020433` | 7.00:1 | AA normal |
| Secondary text | `#9EBEA7` | `#020433` | 9.72:1 | AA normal |

### The one substitution

The mark's green `#4CAE50` reaches only **2.65:1** on the off white
background. That clears neither the 4.5:1 floor for normal text nor the
3:1 floor for a control border or a focus ring, so on the light theme the
figure's own green carries **nothing**: not body text, not links, and not
an accent a reader has to see the edge of. It is left to fills, where the
color is decoration and no boundary depends on it.

`#2E7534` is the same hue darkened until it reaches 5.33:1, and it takes
every one of those roles on light backgrounds in its place: link text,
rules, the selected state of a dropdown, the focus ring. Compliance wins
over fidelity to the artwork.

On the dark theme no substitution is needed: the figure green `#4CAE50`
reaches 7.00:1 on the navy ground and is used as drawn.

## Type scale

The page is a reading surface wrapped around a screenshot, so the scale is
short and the body size is the anchor.

| Step | Size | Line height | Used for |
| --- | --- | --- | --- |
| `h1` | 2rem | 1.2 | The page title |
| `h3` | 1.25rem | 1.3 | The instructions panel heading |
| Body | 1rem | 1.6 | Paragraphs, list items, labels |
| Small | 0.875rem | 1.5 | The footnote |

Body text is the browser default stack. The examples themselves are read
from the screenshots rather than from the page, so no monospace face is
loaded.

## Spacing and radius

A single 8px step, because the mark is orthogonal and evenly weighted.

| Token | Value |
| --- | --- |
| `space-1` | 8px |
| `space-2` | 16px |
| `space-3` | 24px |
| `space-4` | 32px |
| Radius | 4px |
| Max content width | 1200px |

The 4px radius is deliberately small. The mark has square corners, so a
rounded interface would read as belonging to something else.

## Layout

- **Responsive is a constant.** The site must read from a phone to a wide
  desktop. The `margin-left: 500px` offset on the image and the
  `position: fixed` tools panel that made this a desktop only page are gone.
- Two columns on wide screens: the controls beside the cheatsheet image, as
  a flex row wrapping at a `space-4` gap.
- One column below 768px, controls first, image beneath at full width.
- The image is capped at 600px wide on desktop, which is the width the page
  has always displayed it at, and scales down with its column below that.
- The page is centred at the 1200px maximum content width, with a `space-2`
  gutter so nothing meets the edge of a phone screen.

## Graphics

No stock imagery. The cheatsheet screenshots are the repository's own
content, and any mark the site needs beyond them is drawn in SVG or CSS
from the palette above.

## The icon

`favicon.ico` is a real ICO carrying three square frames - 16, 32 and 48
pixels - at the sizes browsers ask for. It is derived from `mark.png` and
nothing else.

The derivation, so the icon can be rebuilt from the artwork:

| Step | Value | Why |
| --- | --- | --- |
| Crop | `413x413+2+3` | The artwork carries a 2-3px white export margin. The mark inside it is exactly square, so the crop needs no distortion and no dropped row |
| Bleed | Full | The mark is a filled square, so it fills the frame. A 16px icon cannot spare 12% of its width on a margin that was never part of the mark |
| Filter | Box, in sRGB | Averaging over the source area cannot overshoot, so no halo appears along the N, and it leaves the three sampled colors **exactly** as counted above |
| Frames | 16, 32, 48, 8-bit | Each frame holds under 256 colors, so the palette is lossless and the file is smaller than the artwork it came from |

Two filters were rejected against the table above rather than by eye.
Averaging in linear light washed the navy ground toward grey, because the
white highlight dominates a linear average. Sigmoidal contrast and levels
sharpened the 16px frame, but moved the figure green off `#4CAE50` - to
`#44B549` and `#42B747` - and a palette this document calls sampled cannot
be quietly resampled. Lanczos and an unsharp pass both rang along the
navy edges.

Holding the three sampled colors did not separate the candidates on its own.
Every filter tried reproduces `#000133`, `#4CAE50` and `#FFFFFF` exactly at
16px, apart from Lanczos in linear light, which drops the navy, and the
sigmoidal and levels passes above. Box was chosen on the two rejections
recorded here rather than on the palette.

At 16px the N softens; that is inherent to a 26:1 reduction of a slab
letterform, and what still reads at tab size is the green and navy split
square, which is the mark's strongest signal.
