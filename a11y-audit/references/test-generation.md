# Accessibility test generation

Use this reference after defining a component contract or applying a fix. Detect the project's existing test runner and utilities; do not introduce a second framework unless the user asks.

## Test behavior, not implementation trivia

Prefer assertions that reflect what users perceive and do:

- query by role, accessible name, label, text, or state;
- use realistic keyboard sequences and pointer interaction;
- assert focus placement/restoration and selected/expanded/invalid state;
- verify navigation destinations and action outcomes;
- run axe after the component reaches each meaningful state;
- test loading, empty, error, success, disabled, destructive, and responsive states that apply.

Do not rely mainly on snapshots, raw class names, or assertions that an ARIA attribute exists without proving the interaction works. An axe pass does not replace behavioral tests.

## Framework routing

- **React/Next:** use the existing Testing Library + user-event setup for isolated behavior; use Playwright for routing, portals, focus restoration, responsive states, and browser integration.
- **Vue/Nuxt:** use Vue Testing Library when present; otherwise the project's Vue Test Utils conventions. Prefer user-facing queries over wrapper internals.
- **Svelte/SvelteKit:** use Svelte Testing Library when present and Playwright for route-level behavior.
- **Angular:** use the existing TestBed/CDK harnesses and Angular Testing Library if configured; use Playwright for integrated focus/navigation.
- **Astro/server HTML/Web Components:** prefer Playwright or the project's browser-component runner so upgraded/custom-element behavior is exercised.

## Minimum generated suite

Generate only applicable tests:

1. semantic role and accessible name;
2. primary keyboard action;
3. focus entry, movement, and restoration;
4. exposed state changes;
5. invalid/error association and recovery;
6. async loading/success/failure announcement;
7. axe scan in initial and opened/error state;
8. page-context integration such as heading level, landmark name, or nested-interactive prevention;
9. responsive or mobile behavior when the interaction changes presentation.

## Example test plan

For a modal dialog:

- trigger opens a named dialog;
- initial focus follows the documented rule;
- Tab and Shift+Tab stay inside;
- Escape closes when permitted;
- close button works by keyboard and pointer;
- focus returns to the trigger;
- background controls are not operable while open;
- destructive pending/error state is announced and retains focus;
- axe reports no violations while open.

## Generated-code rules

- Match repository imports, render helpers, router providers, fake timers, and naming conventions.
- Reuse existing axe setup rather than installing another integration.
- Keep one behavioral concern per test and avoid arbitrary timeouts.
- Explain which contract requirement each test protects.
- If a behavior needs a real browser, do not fake it in a DOM-only runner; generate a Playwright test instead.
- State manual checks still required, especially screen-reader output, voice control, high contrast, text spacing, zoom/reflow, and subjective alternative text.
