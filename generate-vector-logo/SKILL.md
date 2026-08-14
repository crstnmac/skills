---
name: generate-vector-logo
description: Create or refine original, production-ready, non-letterform geometric SVG logo marks, app icons, monochrome variants, and React logo components from a brief or visual reference. Use for requests to design, generate, tune a logo prompt, translate “like this brand” into originality-safe design traits, refine, validate, render, or export an abstract logo, symbol, favicon, brand mark, or flat vector icon where clean editable SVG geometry, small-size legibility, reference calibration, visual iteration, and platform icon assets matter. Excludes initials, monograms, typography, hidden letters, and alphabet-derived symbols.
---

# Generate Vector Logo

Create an original logo system from deliberate SVG geometry. Use references for abstract design traits, never tracing. Keep paths, masks, color, accessibility, and exports deterministic.

## Core rules

- Produce an original mark. Never trace, autovectorize, or closely reproduce a stock image, watermark, logo, or trademark.
- Never use initials, monograms, letterforms, typographic fragments, hidden letters, alphabetic negative space, or geometry derived from a name. Do not begin concept generation from the spelling or initials of the brand.
- Use image generation only for optional mood exploration. Do not use raster output as the final logo source.
- Prefer a strong silhouette, few primitives, no text, and no detail that disappears at 16–32 px.
- Make the primary subject readable in pure black. Integrate secondary metaphors through the construction; do not paste a grid, badge, or data symbol onto a generic icon.
- Separate the invariant master mark from optional surface or material expressions. A finish must never rescue weak geometry.
- Keep the mono mark themeable with `currentColor`.
- Use a mask for a hole that must cut across overlapping shapes. Do not use `evenodd` to union overlapping positive shapes.
- Do not claim visual quality before rendering and inspecting large and small previews.

## Workflow

### 1. Calibrate the brief and reference

Extract the subject, personality, geometric language, required contexts, colors, symbolic constraints, and smallest intended size. Ignore the brand name as a source of shape or concept.

When a named brand, site, image, or visual reference is supplied, inspect the actual reference rather than relying on memory. Read [references/brief-calibration.md](references/brief-calibration.md). Separate:

- **invariant structure** — silhouette, primitive rhythm, spacing, negative-space behavior;
- **identity system** — what stays fixed and what varies across applications;
- **surface expression** — color, material, texture, lighting, motion, or mockup treatment.

Adopt only abstract principles. Deliberately change subject construction, proportions, and signature arrangement. For ambiguous or reference-led work, write a short working brief containing the design thesis, primary and secondary readings, construction language, adopted and rejected reference traits, constraints, and rejection criteria.

### 2. Lock the concept hierarchy

State the thesis:

> A **[primary subject]** built from **[construction language]**, with **[secondary meaning]** emerging through **[shared geometry or negative space]**.

Require the primary reading to survive in pure black. Keep the secondary reading subordinate and structural. Derive both readings from objects, systems, motion, spatial relationships, or domain metaphors. Reject any direction whose silhouette or negative space can reasonably be described as a letter, initial, monogram, or typographic character. If the user changes the target or says the prompt is wrong, recalibrate the thesis and discard unsuitable directions before polishing.

### 3. Build distinct directions

Create 3–5 genuinely different SVG directions in a temporary `logo-variants/` folder. Change the governing construction and semantic strategy—not only coordinates, color, texture, or material. Possible strategies include primitive union, continuous silhouette, negative-space symbol, folded geometry, or modular grid. Name and explain each direction using only its non-alphabetic subject and metaphor; do not describe it through resemblance to a character.

For each direction, identify the primary read, secondary meaning, governing construction, and originality distance from the reference. Use an explicit `viewBox`, 2–8 drawable elements when practical, fills rather than fragile strokes for tiny marks, an accessible `<title>`, and no external images, fonts, scripts, or filters.

Read [references/vector-logo-construction.md](references/vector-logo-construction.md) when choosing geometry, cutouts, optical corrections, colors, or export variants.

### 4. Validate and render

Resolve script paths relative to this `SKILL.md`.

```bash
python3 <skill-root>/scripts/validate_svg.py --strict-flat logo-variants/*.svg
python3 <skill-root>/scripts/render_variants.py logo-variants --output-dir logo-previews/512 --width 512 --allow-npx
python3 <skill-root>/scripts/render_variants.py logo-variants --output-dir logo-previews/32 --width 32 --allow-npx
```

Inspect every PNG with `view_image`. Compare silhouette, balance, negative space, distinctiveness, originality, and 32 px legibility. Reject directions where the reference is more recognizable than the requested subject, the secondary metaphor looks attached, or material styling does the conceptual work.

### 5. Refine the winner

- Align the visual center rather than only the mathematical center.
- Enlarge small holes and gaps optically.
- Overlap joined primitives enough to avoid raster seams.
- Simplify anchors and delete invisible details.
- Test on light, dark, and transparent backgrounds.
- Re-render after every material geometry change.

If no user selection is available, choose the strongest direction and state the rationale instead of blocking progress.

### 6. Deliver the logo system

Default deliverables:

- `logo-mark.svg` — primary standalone mark;
- `logo-mark-mono.svg` — transparent `currentColor` mark;
- `logo-app-icon.svg` — square, plated source when needed;
- 512 px and 32 px previews;
- a concise construction and usage note.

Add a React component only when the project uses React. Generate unique mask or gradient IDs with `useId()` so repeated instances do not collide.

For macOS or Tauri icon assets, after inspecting the target directory:

```bash
python3 <skill-root>/scripts/build_macos_icons.py logo-app-icon.svg --output-dir src-tauri/icons --allow-npx
```

Pass `--force` only when replacement is explicitly intended.

### 7. Verify

- Re-run strict SVG validation on final assets.
- Inspect final 512 px, 32 px, and when relevant 16 px renders.
- Run the host project’s typecheck/build if integrating files.
- Confirm favicon and app-icon references point to the new assets.
- Report created or replaced assets and any cache/rebuild step.

## Revise before delivery when

- the mark resembles a reference or retains its signature structure or silhouette;
- the mark resembles any letter, initial, monogram, numeral, punctuation mark, or typographic construction;
- the silhouette is ambiguous without explanatory text;
- a secondary metaphor is pasted on rather than shaping the mark;
- color, texture, glass, metal, gradients, or 3D treatment rescues weak geometry;
- directions differ mainly by finish rather than construction;
- a hole closes, seam appears, or subject changes at 32 px;
- the app plate and foreground lose contrast;
- the SVG contains raster data, external dependencies, unstable IDs, or embedded text;
- only one untested direction was made for an open-ended brief.
