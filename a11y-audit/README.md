# a11y-audit

A framework-aware skill for designing and reviewing accessible components from their page context, plus auditing locally running websites with Playwright, axe-core, keyboard checks, and source review.

It can advise on a component before code exists, review an implementation in React, Vue, Svelte, Angular, Astro, Web Components, or server-rendered HTML, and run evidence-based WCAG audits against a live site.

## Install

```bash
npm install @crstnmac/a11y-audit
```

The skill bundle is installed at `node_modules/@crstnmac/a11y-audit`.
Copy or link that directory into your agent skills directory, then invoke `$a11y-audit`.

```bash
ln -s "$(pwd)/node_modules/@crstnmac/a11y-audit" ~/.grok/skills/a11y-audit
```

First time, install the Chromium browser used by the runner:

```bash
npx playwright install chromium
```

## CLI

```bash
npx a11y-audit --url http://localhost:3000 --paths / /about --out a11y-report.json
```

Useful flags: `--wcag 2.2-aa` (default), `--mobile`, `--crawl --max-pages 15`, `--storage-state <file>`, `--include-best-practice`.

CI regression mode supports reviewed JSON baselines, severity thresholds, SARIF, and JUnit:

```bash
npx a11y-audit --url http://localhost:3000 --fail-on none --out baseline.json
npx a11y-audit --url http://localhost:3000 --baseline baseline.json \
  --fail-on serious --format sarif --out a11y-results.sarif
```

Node.js 18 or newer is required.

## Verify

```bash
npm test
npm pack --dry-run
```

## License

MIT
