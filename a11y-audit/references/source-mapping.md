# Source mapping and static checks

## Map an axe node to a file

Work from the node's `target` selector, `html` snippet, and accessible name.

1. Extract stable tokens: `id`, `data-testid`, `data-cy`, `name`, `aria-label`, visible text, `src`/`href` basename, BEM / CSS-module class (ignore hashed suffixes like `_a1b2c3`).
2. Search the repo for the strongest token first (`id`, test id, unique string). Then the component-looking class. Then the tag + nearby text.
3. Prefer the component that **owns** the element (`Button.tsx`) over a page that only renders it.
4. Framework hints:
   - Next.js `app/` or `pages/` → page shell; shared chrome in `layout`, `header`, `nav`, `sidebar`.
   - Multi-page HTML / webpack / 11ty / Nunjucks / Handlebars: search `<include src>`, `{% include %}`, `{{> name }}`, and `partials/` / `includes/` for the owning fragment, not every page that embeds it.
   - CSS modules: `hero_abc123` → search `hero` in `*.module.css` and the importing component.
   - Tailwind-only markup: search unique class combinations or the text node.
   - Contrast: if many nodes share one foreground/background pair, map the design token or utility once (`--color-brand-500`, `.menu-item-active`), not each leaf.
5. If several files match, open the one imported by the route under test.
6. If nothing matches (CMS HTML, third-party widget, CSS-in-JS hash only), mark `runtime-only` and say why.
7. Embedded players, charting libraries, and calendars: map the **host** wrapper (iframe `title`, scroll container, trigger). Do not treat vendor shadow DOM or painted SVG ticks as host markup to patch.

Do not invent a file path.

## Static greps

Run from the project root. Lookaround needs `--pcre2`. Opening tags often span lines — confirm the full tag before keeping a hit (an `alt` on the next line is not a missing-alt bug). Adapt globs to the stack. Ignore `node_modules`, `dist`, `.next`, `coverage`, vendor bundles.

```bash
rg -n --pcre2 --glob '!node_modules' --glob '!.next' --glob '!dist' \
  '<img(?![^>]*\balt=)' -g '*.{tsx,jsx,vue,svelte,html,astro}'

rg -n --pcre2 --glob '!node_modules' \
  '<input(?![^>]*\b(id|aria-label|aria-labelledby|title)=)' -g '*.{tsx,jsx,vue,html,svelte,astro}'

rg -n --pcre2 --glob '!node_modules' \
  '<(div|span)[^>]*(onClick|@click|v-on:click|on:click)' -g '*.{tsx,jsx,vue,html,svelte}'

rg -n --glob '!node_modules' \
  'outline\s*:\s*(none|0)\b|outline-none|outline-hidden' -g '*.{css,scss,tsx,jsx,vue,html}'

rg -n --glob '!node_modules' \
  'tabIndex=\{?[1-9]|tabindex=["'\'']?[1-9]' -g '*.{tsx,jsx,vue,html,svelte}'

rg -n --pcre2 --glob '!node_modules' \
  '<a(?![^>]*href=)' -g '*.{tsx,jsx,vue,html,svelte,astro}'

rg -n --glob '!node_modules' \
  'autoPlay|autoplay' -g '*.{tsx,jsx,vue,html,svelte,astro}'

rg -n --glob '!node_modules' \
  'user-scalable\s*=\s*no|maximum-scale\s*=\s*1' -g '*.{html,tsx,jsx,vue,astro}'

rg -n --glob '!node_modules' \
  'href=["'\'']#["'\'']' -g '*.{html,tsx,jsx,vue,svelte,astro}'
```

Keep a static hit only when it is a real a11y problem (icon-only control, unlabeled sibling input, clickable non-interactive element, `href="#"` used as a disclosure). Drop false positives (SVG `stroke` "outline", wrapping `<label>` without `for`, storybook stubs, tests). A `href="#"` leaf that only toggles Alpine/Vue state is a button, not a link.

If `eslint-plugin-jsx-a11y` or `eslint-plugin-vuejs-accessibility` is already configured, run the project's lint and filter to those plugins. Treat those hits as static findings and cross-check them against the axe report.
