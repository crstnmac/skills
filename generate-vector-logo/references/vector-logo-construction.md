# Vector logo construction reference

## Reference abstraction

Treat references as evidence about design language, not coordinates. Extract mass, direction, negative-space strategy, symmetry, corner character, and primitive rhythm. Ignore watermarks and stock-art artifacts. Change at least two governing properties; change three for a distinctive trademark.

## Non-letterform constraint

Construct symbols from objects, systems, motion, spatial relationships, natural forms, or domain metaphors. Never use initials, monograms, letters, numerals, punctuation, typographic fragments, hidden alphabetic shapes, or negative space derived from a brand name. During review, rotate and mirror the mark mentally; reject it if a typographic character becomes a dominant reading.

## Construction families

- **Primitive union:** overlap circles, rectangles, and polygons substantially. Useful for compact app marks.
- **Continuous silhouette:** use one closed path with few smooth Bézier segments when the outline carries identity.
- **Negative space:** begin with an outer mass and remove one or two intentional holes that remain open at 16–32 px.
- **Modular/grid:** repeat a small primitive set consistently, then optically correct the mathematical result.
- **Monoline:** use only when line character is central; test joins/caps and expand strokes for production compatibility when needed.

## Boolean geometry, masks, and holes

Two filled sibling elements visually union. Do not put overlapping positive subpaths into one `fill-rule="evenodd"` path when their overlap must remain filled.

Use a mask when a hole cuts through multiple overlapping primitives:

```svg
<defs>
  <mask id="mark-cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="112" height="96">
    <rect width="112" height="96" fill="#fff"/>
    <circle cx="54" cy="40" r="6" fill="#000"/>
  </mask>
</defs>
<g mask="url(#mark-cutout)">
  <circle cx="40" cy="48" r="36"/>
  <polygon points="62,36 110,48 62,60"/>
</g>
```

White reveals; black removes. Size masks in user space. Ensure IDs are unique when embedded repeatedly. Overlap joined primitives enough to prevent fractional-pixel seams.

## Optical correction

- Extend points slightly beyond circular visual boundaries.
- Make small counters larger than proportional scaling suggests.
- Shift asymmetric marks until occupied mass feels centered.
- Reduce lower visual weight when round shapes appear to sag.
- Keep tangent directions consistent where curves meet.
- Make internal gaps wider because rasterization closes them first.

## Small-size evaluation

Render at 512 px for curve quality, 32 px for icon behavior, and 16 px for favicons. Confirm recognition, open counters, joined shapes, edge balance, and background separation. Delete weak details instead of enlarging everything.

## Color and variants

Build geometry in monochrome first. Recommended variants are primary colors, a transparent `currentColor` mark, a reversed mark, and a square app icon with literal sRGB plate colors. Use gradients only when explicitly required and only after the silhouette works in one color.

## React integration

Use `currentColor` for mono components and correct `title`, `decorative`, `role`, `aria-hidden`, and `aria-label` behavior. Generate local IDs with `useId()`:

```tsx
const uid = useId().replace(/:/g, "")
const maskId = `logo-cutout-${uid}`
```

Never hardcode shared mask or gradient IDs when multiple instances can appear.

## Export matrix

| Asset | Purpose | Requirements |
| --- | --- | --- |
| `logo-mark.svg` | Primary scalable mark | Accessible title, documented colors |
| `logo-mark-mono.svg` | UI/print mono | Transparent, `currentColor`, no plate |
| `logo-app-icon.svg` | Platform source | Square viewBox, safe margin, static colors |
| 32 px PNG | Small-size QA | Crisp silhouette, open counters |
| 512 px PNG | Review/store preview | Clean curves and optical balance |
| `.icns` | macOS/Tauri | Generated from one square SVG source |

Do not hand-edit individual PNG sizes. Correct the SVG and regenerate.

## Common failure patterns

- **Illustration disguised as a logo:** many details, highlights, feathers, shadows. Return to silhouette and one defining feature.
- **Generic primitive assembly:** technically depicts the subject but lacks distinctive proportion or tension. Change posture, negative space, attachment, or rhythm.
- **Pasted-on metaphor:** a grid, badge, or sparkle sits on a generic mark. Make the metaphor determine anatomy or spacing.
- **Accidental letterform:** the silhouette or counter reads as an alphabetic or typographic character. Rebuild from a non-linguistic subject rather than disguising the character.
- **Surface-led concept:** glass, metal, gradients, texture, lighting, or 3D makes a weak shape seem distinctive. Return to a pure-black master.
- **Unstable SVG:** external fonts/images, duplicate IDs, scripts, filters, raster data, or undeclared namespaces. Simplify and validate.
