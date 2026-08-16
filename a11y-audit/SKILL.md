---
name: a11y-audit
description: >
  Design, review, or audit accessible web interfaces in any framework. For new
  components, infer the correct semantic and interaction pattern from the
  component's purpose, placement on the page, surrounding landmarks, and user
  journey, then provide framework-native structure, an accessible API, keyboard
  behavior, states, and test guidance. For existing sites, use Playwright,
  axe-core, keyboard checks, and source review to map WCAG issues back to
  components with concrete fixes. Use when the user asks how to create or place
  an accessible component, requests accessibility feedback or a component API,
  asks to check accessibility, run an a11y audit, find WCAG issues, test keyboard
  or screen-reader support, scan a local site, or invokes /a11y-audit.
---

# Accessible component guidance and audit

Guide accessible component design from page context, or audit a running site and map findings to source. Default standard is WCAG 2.2 AA. Do not claim conformance from an automated scan.

Resolve `<skill-root>` as the directory that contains this `SKILL.md`.

## Rules

- Evidence required: URL, selector or snippet, WCAG criterion, impact, and a source location when the repo is available.
- Automated + keyboard + static coverage is partial. Say what was not tested.
- Report only unless the user asks to fix. After fixes, re-run the same pages.
- Do not install ESLint plugins, axe, or Playwright into the **user** project. Skill dependencies stay in `<skill-root>`.
- Do not disable axe rules or exclude nodes to clean the report.
- Prefer native HTML (`button`, `label`, `main`) over ARIA on a `div`.
- Choose semantics from user intent and page context, not from the component's visual appearance or framework name.
- Preserve the host project's framework, design system, conventions, and existing accessible primitives. Do not introduce a new framework for an example.
- Do not add ARIA when native HTML already provides the required role, name, state, and keyboard behavior.

## Workflow

### 1. Choose the mode

- **Create or advise:** the user is planning or building a component. Follow **Component guidance** below. A running site is optional.
- **Review a component:** inspect its source, rendered placement, callers, and states. Follow **Component guidance**, then report concrete feedback.
- **Audit a site:** the user wants broad coverage or a WCAG scan. Follow **Site audit** below.
- **Fix:** change code only when requested, then verify the affected interaction and pages.

## Component guidance

### 2. Understand placement and purpose

Inspect the route, parent layout, nearby headings and landmarks, repeated instances, and the action that follows. If source is available, find where the component is rendered and how its props are populated. Ask only when an answer materially changes the semantic pattern.

Classify the component before writing code:

- navigation vs in-page action;
- page landmark vs content inside a landmark;
- persistent, repeated, conditional, modal, or transient;
- static content, disclosure, selection, data entry, status, or composite widget;
- destructive, asynchronous, validation-sensitive, or time-sensitive behavior.

Read [references/component-guidance.md](references/component-guidance.md). Use the placement matrix and interaction contracts to select the pattern. The same visual control can require different markup in different locations: a logo in a site header may link home, while the same logo on the home page may be a non-link image; a list of links is navigation only when it represents a meaningful navigation set.

For dialogs, comboboxes, menus, tabs, grids, date pickers, carousels, tooltips, drag-and-drop, file upload, and other coordinated widgets, read [references/pattern-playbooks.md](references/pattern-playbooks.md). Apply the pattern rejection gate before recommending custom ARIA.

### 3. Define the accessible contract

Before implementation, state:

1. semantic element or established ARIA pattern;
2. accessible name and description source;
3. keyboard behavior and focus movement;
4. states and relationships exposed to assistive technology;
5. behavior for loading, empty, error, success, disabled, and destructive states that apply;
6. page-level effects such as heading hierarchy, landmark names, focus restoration, and live announcements;
7. public props that make accessible usage the default and invalid combinations difficult.

Do not expose raw `role`, `tabIndex`, or arbitrary ARIA props as the primary way to repair an unclear component API. Prefer intent-bearing props such as `label`, `description`, `expanded`, `errorMessage`, `onDismiss`, or `headingLevel` when the consumer genuinely controls those values.

### 4. Implement or advise in the detected framework

Use the repository's framework and component conventions. Keep semantics identical across React/Next, Vue/Nuxt, Svelte/SvelteKit, Angular, Astro, Web Components, or server-rendered HTML; translate only binding, slots, events, and lifecycle syntax.

- Reuse an existing accessible primitive when its behavior matches the contract.
- For custom composite widgets, follow the complete WAI-ARIA interaction pattern, including focus management; partial ARIA is not acceptable.
- Preserve consumer-supplied IDs safely and generate stable unique IDs where relationships require them.
- Keep visible labels visible unless the product explicitly needs an icon-only control.
- Treat responsive variants as the same accessibility contract, not separate semantics.

Provide the smallest framework-native example that demonstrates the contract. Include usage in its actual page context when placement changes the answer.

Read [references/test-generation.md](references/test-generation.md) and provide behavioral tests when the user asks to implement, fix, or test the component. Route tests to the repository's existing framework. Use Playwright for focus, browser, route, portal, or responsive behavior that a DOM-only runner cannot prove.

### 5. Give component feedback

Lead with whether the chosen pattern fits the component's purpose and placement. Then report:

- what already works;
- definite barriers, with affected users and relevant WCAG criteria;
- contextual risks or questions that cannot be proven from the supplied state;
- a corrected semantic structure or API;
- keyboard, focus, screen-reader, zoom/reflow, contrast, motion, and touch-target checks that apply;
- tests at component and page level.

Distinguish violations from recommendations. Do not call a preference a WCAG failure. When only code is available, clearly label runtime-dependent checks.

## Site audit

### 2. Resolve the target

Use the URL the user gave. Otherwise detect the local app:

- `package.json` scripts (`dev`, `start`) and framework defaults (Next `3000`, Vite `5173`, Remix `5173`, Astro `4321`, Angular `4200`, Django/Rails `8000`, Hugo `1313`).
- `.env*` for `PORT`, `HOST`.
- An already-listening process on those ports.

Probe the URL (`curl -I` or an HTTP GET). If nothing is listening, start the project's dev script in the background and wait until it responds. Do not kill a server the user already started.

If the app needs auth, collect a Playwright `storageState` JSON (the user logs in once) and pass `--storage-state`.

### 3. Discover pages

Build a path list. Cap at 20 unless the user asks for more.

1. Paths the user named.
2. Router files: `app/**/page.{js,jsx,ts,tsx}`, `pages/**/*.{js,jsx,ts,tsx}` (skip `api/`, `_app`, `_document`), `src/routes/**`, `src/pages/**`.
3. Same-origin links from the homepage if the router is unclear — use `--crawl`.

Always include `/`. Skip dynamic routes that need unknown IDs unless the user provides values (`/posts/1`). Prefer one representative of each template.

### 4. Run the browser audit

First time in this environment:

```bash
npm install --prefix <skill-root>
npx --prefix <skill-root> playwright install chromium
```

Then:

```bash
node <skill-root>/scripts/audit.mjs \
  --url <base-url> \
  --paths / /about \
  --out a11y-report.json
```

Useful flags: `--wcag 2.2-aa` (default), `--mobile`, `--viewport 1280x800`, `--crawl --max-pages 15`, `--storage-state <file>`, `--include-best-practice`.

For CI regression checks, save the canonical JSON report, then compare later runs against it:

```bash
node <skill-root>/scripts/audit.mjs --url <base-url> \
  --fail-on none --out a11y-report.json
node <skill-root>/scripts/audit.mjs --url <base-url> \
  --baseline a11y-report.json --fail-on serious \
  --format sarif --out a11y-results.sarif
```

Supported formats are `json`, `sarif`, `junit`, and `xlsx`. Without a baseline, the severity gate applies to every finding. With a baseline, it applies only to new findings; page-load errors always fail. Keep the baseline JSON as an intentional reviewed artifact—never refresh it merely to make CI pass.

For a shareable Excel report instead of chat or JSON output:

```bash
node <skill-root>/scripts/audit.mjs --url <base-url> \
  --format xlsx --out accessibility-report.xlsx
```

The workbook contains a formatted summary plus sheets for findings, pages, review items, and—when a baseline is supplied—new and resolved regressions. Inspect the saved workbook rather than copying the raw audit payload into the conversation.

If the user asked for a full pass, run desktop then `--mobile` and merge findings. Read the JSON. Do not summarize from memory of the CLI table.

### 5. Map to source and scan the codebase

Follow [references/source-mapping.md](references/source-mapping.md). Every runtime violation should get a file and line, or an explicit "runtime-only" reason.

Run the static greps in that file. If the project already has `eslint-plugin-jsx-a11y`, `eslint-plugin-vuejs-accessibility`, or similar, run the project's lint script and keep a11y rules only. Do not add those plugins.

### 6. Report

Write the audit in the conversation using [references/report.md](references/report.md). Deduplicate the same rule + component across pages into one finding with a page list.

If the user asked to fix: apply focused patches (one concern per change), then re-run `audit.mjs` on the affected paths and report before/after counts.
