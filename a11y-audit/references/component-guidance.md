# Accessible component guidance

## Placement matrix

Determine the component's relationship to the page before choosing markup.

| Placement or purpose | Default structure | Key questions |
| --- | --- | --- |
| Skip link | First focusable control; in-page link to `main` | Can keyboard users bypass repeated chrome? |
| Site-wide header | `header` containing one primary `nav` when present | Is the home link named? Is this repeated on every page? |
| Page header inside `main` | Usually a `div`/sectioning context with the page `h1`, not another banner landmark | Does the route have exactly one clear page title? |
| Repeated navigation set | Named `nav` with a list of links | Can multiple nav landmarks be distinguished by name? |
| Breadcrumbs | Named `nav`, ordered list, current page with `aria-current="page"` | Is the current item a link only when navigation is meaningful? |
| Sidebar | `aside` only when complementary to the main content; named `nav` when it is navigation | Would the content still make sense without it? Are group triggers buttons with `aria-expanded`, not `href="#"`? |
| Icon-only control | `<button>` with a required accessible name | Is the name a semantic `label` / `sr-only` text, not a tooltip-only hint? |
| Main content | One primary `main` landmark | Are nested reusable components incorrectly creating more `main` elements? |
| Search | `search` landmark or named form | Is there a visible label and a clear submit action? |
| Repeated cards | List when the collection is conceptually a list; headings only when each card starts a real subsection | Does the whole card become a nested-interactive click target? |
| Page tabs | Tabs only when panels share one page context; links when changing routes | Does browser history/navigation change? Are arrow keys expected? |
| Disclosure | `button` with `aria-expanded` and `aria-controls` when useful | Is it independent content, not mutually exclusive tab selection? |
| Modal task | Native `dialog` where supported or a complete dialog pattern | Is focus placed, trapped, and restored? Is the background inert? |
| Non-modal panel | Region/disclosure, not automatically a dialog | Must users interact before returning to the page? |
| Status/toast | Visible status plus `role="status"` or `alert` only according to urgency | Does it persist long enough and remain discoverable? |
| Form field | Visible `label`, control, description, and programmatically associated error | Is required/invalid state conveyed beyond color? |
| Data table | Native table with caption and scoped headers | Is this truly tabular data rather than layout? |
| Pagination | Named `nav`, links for destinations, current page state | Do labels distinguish page numbers without replacing visible text? |
| Footer | Top-level `footer`; nested footer only for a section it actually describes | Are repeated navigation groups named? |

Landmarks must describe page structure, not reusable component boundaries. Headings describe content hierarchy, not font size. Links navigate; buttons perform actions.

## Component contract

For every component, establish the applicable parts of this contract:

- **Role and element:** native element first; use an ARIA role only for an established pattern without a native equivalent.
- **Name:** visible text, associated label, `aria-labelledby`, or a concise fallback. Do not duplicate or contradict visible text with `aria-label`.
- **Description:** help and error text associated with `aria-describedby` when useful.
- **State:** expose expanded, selected, pressed, checked, current, invalid, busy, or disabled state only when semantically applicable.
- **Relationships:** stable unique IDs for controls, panels, labels, descriptions, and errors.
- **Keyboard:** native behavior by default; document the complete key map for composite widgets.
- **Focus:** visible focus, logical order, placement after open/navigation/error, and restoration after close or removal.
- **Announcements:** use live regions sparingly for asynchronous changes that would otherwise be missed. Do not announce content already reached by focus.
- **Visual resilience:** 200% text zoom, 400% reflow where applicable, forced colors, reduced motion, adequate contrast, and non-color cues.
- **Input resilience:** pointer, keyboard, touch, voice input, and screen-reader operation; minimum target size or sufficient spacing.

## API design

Make the accessible path the easiest path.

- Require a usable label for icon-only controls through a semantic prop such as `label`.
- Accept visible children for ordinary buttons and links; do not require callers to duplicate their text in ARIA.
- Model mutually exclusive variants with explicit types or framework validators, such as link (`href`) versus action (`onActivate`).
- Pair validation props: `invalid` should have or derive an `errorMessage` and relationship ID.
- Allow heading level to follow page context without styling being tied to the chosen `h1`–`h6` element.
- Avoid a generic `as` prop when it permits invalid semantics without enforcing the corresponding behavior.
- Forward refs only when consumers need focus or measurement; do not make manual focus repair the default integration path.
- Document accessible defaults and the few responsibilities that remain with the caller because they depend on placement.

## Framework translation

Keep the semantic contract stable and translate framework mechanics:

- **React/Next:** use `useId` for relationships, refs/effects for deliberate focus changes, and links from the active router for navigation.
- **Vue/Nuxt:** use `defineProps`/`defineEmits`, template refs, generated instance IDs, and router links for navigation.
- **Svelte/SvelteKit:** use component props/events, bindings/actions for focus behavior, and native/router links as appropriate.
- **Angular:** use inputs/outputs, template references, directives, and Angular Router links; preserve native events and elements.
- **Astro/server HTML:** prefer zero-JavaScript native behavior; hydrate only interactions that require client state.
- **HTML with a binding layer (Alpine, Stimulus, htmx, Petite Vue):** keep native elements; bind state onto `button`, `dialog`, and labelled fields. `@click` / `data-action` on a `div` or `span` is not an accessible control.
- **Web Components:** use `ElementInternals` where form association or semantics require it, manage shadow-DOM labels/focus carefully, and expose states consistently.

Framework syntax never justifies changing a button into a clickable `div`, removing a label, or implementing only part of a composite widget pattern.

## Feedback format

For component advice or review, use this compact structure:

1. **Context and recommendation** — placement, user goal, and chosen pattern.
2. **Accessible contract** — semantics, name, keyboard/focus, state, and page relationships.
3. **Framework implementation** — focused code or API changes using project conventions.
4. **Feedback** — confirmed barriers first, then risks and enhancements; include affected users and WCAG criteria only when applicable.
5. **Verification** — keyboard sequence, screen-reader expectations, automated checks, responsive/zoom states, and failure/loading/error states.

When reviewing a screenshot without DOM/source, do not infer accessible names, roles, focus order, or announcements from appearance. State what needs runtime or code verification.
