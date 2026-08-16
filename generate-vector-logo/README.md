# generate-vector-logo

A Codex skill for designing original, non-letterform geometric SVG logo marks and production-ready logo systems.

## Install

Recommended, using the open skills CLI:

```bash
npx skills add crstnmac/skills --skill generate-vector-logo
```

For a global Codex installation without prompts:

```bash
npx skills add crstnmac/skills \
  --skill generate-vector-logo \
  --global \
  --agent codex \
  --yes
```

Alternatively, install the npm package directly:

```bash
npm install @crstnmac/generate-vector-logo
```

The skill bundle is installed at `node_modules/@crstnmac/generate-vector-logo`.
Copy or link that directory into your Codex skills directory, then invoke `$generate-vector-logo`.

## Included tools

- `validate_svg.py` validates logo SVG structure, accessibility, local references, and flat-mark constraints.
- `render_variants.py` renders SVG previews through librsvg, resvg, or a pinned resvg npm fallback.
- `build_macos_icons.py` stages and generates macOS iconsets without replacing existing assets until rendering succeeds.

Python 3.9 or newer is required for the bundled scripts. Rendering requires `rsvg-convert`, `resvg`, or Node.js 18+ with the optional resvg dependency.

## Verify

```bash
npm test
npm pack --dry-run
```

## License

MIT
