# Source mapping and static checks

## Map an axe node to a file

Work from the node's `target` selector, `html` snippet, and accessible name.

1. Extract stable tokens: `id`, `data-testid`, `data-cy`, `name`, `aria-label`, visible text, `src`/`href` basename, BEM / CSS-module class (ignore hashed suffixes like `_a1b2c3`).
2. Search the repo for the strongest token first (`id`, test id, unique string). Then the component-looking class. Then the tag + nearby text.
3. Prefer the component that **owns** the element (`Button.tsx`) over a page that only renders it.
4. Framework hints:
   - Next.js `app/` or `pages/` → page shell; shared chrome in `layout`, `header`, `nav`, `sidebar`.
   - CSS modules: `hero_abc123` → search `hero` in `*.module.css` and the importing component.
   - Tailwind-only markup: search unique class combinations or the text node.
5. If several files match, open the one imported by the route under test.
6. If nothing matches (CMS HTML, third-party widget, CSS-in-JS hash only), mark `runtime-only` and say why.

Do not invent a file path.

## Static greps

Run from the project root. Adapt globs to the stack (`*.{tsx,jsx,vue,svelte,html,astro}`). Ignore `node_modules`, `dist`, `.next`, `coverage`, vendor bundles.

```bash
rg -n --glob '!node_modules' --glob '!.next' --glob '!dist' \
  '<img(?![^>]*\balt=)' -g '*.{tsx,jsx,vue,svelte,html,astro}'

rg -n --glob '!node_modules' \
  '<input(?![^>]*\b(id|aria-label|aria-labelledby|title)=)' -g '*.{tsx,jsx,vue,html}'

rg -n --glob '!node_modules' \
  '<(div|span)[^>]*(onClick|@click|v-on:click)' -g '*.{tsx,jsx,vue}'

rg -n --glob '!node_modules' \
  'outline\s*:\s*(none|0)\b' -g '*.{css,scss,tsx,jsx,vue}'

rg -n --glob '!node_modules' \
  'tabIndex=\{?[1-9]' -g '*.{tsx,jsx,vue}'

rg -n --glob '!node_modules' \
  '<a(?![^>]*href=)' -g '*.{tsx,jsx,vue,html}'

rg -n --glob '!node_modules' \
  'autoPlay|autoplay' -g '*.{tsx,jsx,vue,html}'
```

Keep a static hit only when it is a real a11y problem (icon-only control, unlabeled input, clickable non-interactive element). Drop false positives (SVG `stroke` "outline", storybook stubs, tests).

If `eslint-plugin-jsx-a11y` or `eslint-plugin-vuejs-accessibility` is already configured, run the project's lint and filter to those plugins. Treat those hits as static findings and cross-check them against the axe report.
