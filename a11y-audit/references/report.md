# Audit report format

Do not claim WCAG conformance. Title the report with the standard that was scanned.

## Header

- Target URL
- Standard (default WCAG 2.2 AA) and axe tags actually used
- Pages and viewports scanned
- Auth: anonymous or storage-state
- Date
- Coverage: axe + keyboard + static. Not tested: screen readers, captions judgment, cognitive language, 1.4.13 hover content unless you did those by hand

## Summary

| Impact | Count |
| --- | --- |
| critical | n |
| serious | n |
| moderate | n |
| minor | n |
| review | n (axe `incomplete` + keyboard/static review items) |

Then: pages scanned, unique rules failed, top 3 user-facing risks.

## Findings

Group by impact (critical → minor). One block per unique rule + component:

```
### [serious] image-alt — 1.1.1 Non-text Content
Pages: / /products
Selector: img.hero
HTML: <img class="hero" src="/hero.jpg">
Source: src/components/Hero.tsx:18
Impact: Screen reader users hear the filename or nothing.
Fix: Add descriptive alt, or alt="" if decorative.
```

- `Source` is file:line, or `runtime-only — <reason>`.
- `Fix` is specific to this codebase (component names, tokens, existing `sr-only` / `Label` primitives). No generic essays.
- Cite axe `helpUrl` once per rule, not per node.

## Review items

Axe `incomplete` (often contrast over images/gradients) and keyboard notes that are not definite fails. Label them **review**, not violations.

## Static-only

Issues found in source that the loaded pages never rendered (dead routes, unopened dialogs, clickable `div`s). Same block shape; mark `Detected: static`.

## Patterns

Recurring causes, not one-off nodes: "icon buttons lack accessible names in `src/components/ui/`".

## Out of scope / not tested

List honestly (e.g. logged-in account settings, third-party checkout iframe, VoiceOver).
