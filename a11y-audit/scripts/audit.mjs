#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const WCAG_TAGS = {
  "2.0-a": ["wcag2a"],
  "2.0-aa": ["wcag2a", "wcag2aa"],
  "2.0-aaa": ["wcag2a", "wcag2aa", "wcag2aaa"],
  "2.1-a": ["wcag2a", "wcag21a"],
  "2.1-aa": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  "2.1-aaa": ["wcag2a", "wcag2aa", "wcag2aaa", "wcag21a", "wcag21aa", "wcag21aaa"],
  "2.2-a": ["wcag2a", "wcag21a"],
  "2.2-aa": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
  "2.2-aaa": [
    "wcag2a",
    "wcag2aa",
    "wcag2aaa",
    "wcag21a",
    "wcag21aa",
    "wcag21aaa",
    "wcag22aa",
  ],
};

const IMPACT_ORDER = ["critical", "serious", "moderate", "minor"];
const IMPACT_RANK = { minor: 1, moderate: 2, serious: 3, critical: 4 };
const MAX_SNIPPET = 280;
const MAX_TABS = 40;

function usage() {
  return `Usage: node scripts/audit.mjs --url <base-url> [options]

Options:
  --url <url>              Base URL of the running local app (required)
  --paths <path...>        Paths to scan (default: /)
  --paths-file <file>      Newline-separated paths
  --out <file>             Write the report to a file (default: stdout only)
  --format <format>        json (default) | sarif | junit | xlsx
  --baseline <file>        Compare with a previous JSON report and gate new issues only
  --fail-on <impact>       minor (default) | moderate | serious | critical | none
  --wcag <target>          2.0-a | 2.0-aa | 2.1-aa | 2.2-aa (default) | 2.2-aaa
  --viewport <WxH>         Viewport (default: 1280x800)
  --mobile                 Shorthand for --viewport 390x844
  --crawl                  Follow same-origin links from each seed path
  --max-pages <n>          Crawl / path cap (default: 20)
  --storage-state <file>   Playwright storageState JSON (logged-in session)
  --include-best-practice  Also run axe best-practice rules
  --no-keyboard            Skip tab-order / focus checks
  --timeout <ms>           Navigation timeout (default: 15000)
  --help                   Show this help
`;
}

function parseArgs(argv) {
  const opts = {
    url: null,
    paths: [],
    pathsFile: null,
    out: null,
    format: "json",
    baseline: null,
    failOn: "minor",
    wcag: "2.2-aa",
    viewport: { width: 1280, height: 800 },
    crawl: false,
    maxPages: 20,
    storageState: null,
    includeBestPractice: false,
    keyboard: true,
    timeout: 15000,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      return value;
    };

    switch (arg) {
      case "--help":
      case "-h":
        opts.help = true;
        break;
      case "--url":
        opts.url = next();
        break;
      case "--paths": {
        while (argv[i + 1] && !argv[i + 1].startsWith("--")) {
          opts.paths.push(argv[++i]);
        }
        break;
      }
      case "--paths-file":
        opts.pathsFile = next();
        break;
      case "--out":
        opts.out = next();
        break;
      case "--format":
        opts.format = next().toLowerCase();
        if (!["json", "sarif", "junit", "xlsx"].includes(opts.format)) {
          throw new Error(`Invalid --format ${opts.format}; expected json, sarif, junit, or xlsx`);
        }
        break;
      case "--baseline":
        opts.baseline = next();
        break;
      case "--fail-on":
        opts.failOn = next().toLowerCase();
        if (![...Object.keys(IMPACT_RANK), "none"].includes(opts.failOn)) {
          throw new Error(
            `Invalid --fail-on ${opts.failOn}; expected minor, moderate, serious, critical, or none`,
          );
        }
        break;
      case "--wcag":
        opts.wcag = next().toLowerCase();
        break;
      case "--viewport": {
        const raw = next();
        const match = /^(\d+)x(\d+)$/.exec(raw);
        if (!match) throw new Error(`Invalid --viewport ${raw} (use 1280x800)`);
        opts.viewport = { width: Number(match[1]), height: Number(match[2]) };
        break;
      }
      case "--mobile":
        opts.viewport = { width: 390, height: 844 };
        break;
      case "--crawl":
        opts.crawl = true;
        break;
      case "--max-pages":
        opts.maxPages = Number(next());
        break;
      case "--storage-state":
        opts.storageState = next();
        break;
      case "--include-best-practice":
        opts.includeBestPractice = true;
        break;
      case "--no-keyboard":
        opts.keyboard = false;
        break;
      case "--timeout":
        opts.timeout = Number(next());
        break;
      default:
        throw new Error(`Unknown argument: ${arg}\n${usage()}`);
    }
  }

  return opts;
}

function tagsFor(wcag, includeBestPractice) {
  const tags = WCAG_TAGS[wcag];
  if (!tags) {
    throw new Error(
      `Unknown --wcag ${wcag}. Expected one of: ${Object.keys(WCAG_TAGS).join(", ")}`,
    );
  }
  return includeBestPractice ? [...tags, "best-practice"] : tags;
}

function normalizePath(value, base) {
  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(value, base);
    if (url.origin !== new URL(base).origin) return null;
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return null;
  }
}

function wcagFromTags(tags) {
  return (tags || [])
    .filter((tag) => /^wcag\d+$/.test(tag))
    .map((tag) => {
      const digits = tag.replace("wcag", "");
      return digits.split("").join(".");
    });
}

function slimNode(node) {
  return {
    target: node.target,
    html: (node.html || "").slice(0, MAX_SNIPPET),
    failureSummary: node.failureSummary || null,
  };
}

function slimResults(results, kind) {
  return (results[kind] || []).map((item) => ({
    id: item.id,
    impact: item.impact,
    description: item.description,
    help: item.help,
    helpUrl: item.helpUrl,
    tags: item.tags,
    wcag: wcagFromTags(item.tags),
    nodes: (item.nodes || []).slice(0, 25).map(slimNode),
  }));
}

async function collectStructure(page) {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (el) => ({
        level: Number(el.tagName[1]),
        text: (el.textContent || "").trim().slice(0, 120),
      }),
    );
    const landmarkSel =
      "header, nav, main, aside, footer, [role='banner'], [role='navigation'], [role='main'], [role='contentinfo'], [role='complementary'], [role='search']";
    const landmarks = [...document.querySelectorAll(landmarkSel)].map((el) => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role") || el.tagName.toLowerCase(),
      name: (el.getAttribute("aria-label") || "").slice(0, 80),
    }));
    return {
      title: document.title || "",
      lang: document.documentElement.lang || "",
      headings,
      landmarks,
    };
  });
}

async function collectLinks(page, baseUrl) {
  const hrefs = await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => a.getAttribute("href")).filter(Boolean),
  );
  const origin = new URL(baseUrl).origin;
  const paths = new Set();
  for (const href of hrefs) {
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue;
    }
    try {
      const url = new URL(href, baseUrl);
      if (url.origin !== origin) continue;
      if (url.hash && url.pathname === new URL(page.url()).pathname) continue;
      paths.add(`${url.pathname}${url.search}` || "/");
    } catch {
      /* ignore invalid hrefs */
    }
  }
  return [...paths];
}

async function auditKeyboard(page) {
  const issues = [];
  const tabOrder = [];

  const positiveTabindex = await page.evaluate(() =>
    [...document.querySelectorAll("[tabindex]")].flatMap((el) => {
      const value = Number(el.getAttribute("tabindex"));
      if (!Number.isFinite(value) || value <= 0) return [];
      return [
        {
          tabindex: value,
          html: el.outerHTML.slice(0, 200),
        },
      ];
    }),
  );
  if (positiveTabindex.length) {
    issues.push({
      id: "positive-tabindex",
      impact: "moderate",
      wcag: ["2.4.3"],
      help: "Positive tabindex values disrupt sequential focus order",
      nodes: positiveTabindex,
    });
  }

  await page.evaluate(() => {
    document.body.setAttribute("data-a11y-audit-root", "true");
    if (!document.body.hasAttribute("tabindex")) {
      document.body.setAttribute("tabindex", "-1");
      document.body.setAttribute("data-a11y-audit-tabindex", "1");
    }
  });
  await page.locator("body").focus();

  let previous = null;
  let stuck = 0;
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) {
        return null;
      }
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const outlineVisible =
        cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      const ring =
        cs.boxShadow !== "none" &&
        cs.boxShadow !== "rgba(0, 0, 0, 0) 0px 0px 0px 0px";
      const parts = [];
      let node = el;
      for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth++) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          parts.unshift(`#${node.id}`);
          break;
        }
        const cls = (node.className && typeof node.className === "string"
          ? node.className
          : ""
        )
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((name) => `.${name}`)
          .join("");
        part += cls;
        parts.unshift(part);
        node = node.parentElement;
      }
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        role: el.getAttribute("role"),
        name: (
          el.getAttribute("aria-label") ||
          el.getAttribute("alt") ||
          (el.innerText || "").trim() ||
          el.getAttribute("placeholder") ||
          ""
        ).slice(0, 80),
        selector: parts.join(" > "),
        visibleFocus: outlineVisible || ring,
        inViewport:
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight,
        href: el.getAttribute("href"),
      };
    });

    if (!info) {
      stuck += 1;
      if (stuck >= 2) break;
      continue;
    }
    stuck = 0;
    const key = `${info.selector}|${info.name}`;
    if (key === previous && i > 0) {
      issues.push({
        id: "focus-trap-or-stuck",
        impact: "serious",
        wcag: ["2.1.2"],
        help: "Tab stopped moving to a new element",
        nodes: [{ target: [info.selector], html: info.name }],
      });
      break;
    }
    previous = key;
    tabOrder.push(info);

    if (!info.visibleFocus) {
      issues.push({
        id: "focus-not-visible",
        impact: "serious",
        wcag: ["2.4.7"],
        help: "Focused element has no visible focus indicator",
        nodes: [{ target: [info.selector], html: info.name || info.tag }],
      });
    }
    if (!info.inViewport) {
      issues.push({
        id: "focus-offscreen",
        impact: "moderate",
        wcag: ["2.4.11"],
        help: "Focused element is outside the viewport",
        nodes: [{ target: [info.selector], html: info.name || info.tag }],
      });
    }
  }

  await page.evaluate(() => {
    const body = document.body;
    if (body.getAttribute("data-a11y-audit-tabindex")) {
      body.removeAttribute("tabindex");
      body.removeAttribute("data-a11y-audit-tabindex");
    }
    body.removeAttribute("data-a11y-audit-root");
  });

  const first = tabOrder[0];
  if (
    first &&
    tabOrder.length >= 8 &&
    !(first.href || "").startsWith("#") &&
    !/skip/i.test(first.name || "")
  ) {
    issues.push({
      id: "skip-link-review",
      impact: "minor",
      wcag: ["2.4.1"],
      help: "First focusable control is not a skip link; review 2.4.1 Bypass Blocks",
      nodes: [{ target: [first.selector], html: first.name || first.tag }],
    });
  }

  return { tabOrder, issues };
}

async function scanPage(page, url, opts, tags) {
  const response = await page.goto(url, {
    waitUntil: "load",
    timeout: opts.timeout,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));

  const builder = new AxeBuilder({ page }).withTags(tags);
  const axe = await builder.analyze();
  const structure = await collectStructure(page);
  const keyboard = opts.keyboard ? await auditKeyboard(page) : null;

  return {
    url: page.url(),
    status: response ? response.status() : null,
    title: structure.title,
    lang: structure.lang,
    viewport: opts.viewport,
    violations: slimResults(axe, "violations"),
    incomplete: slimResults(axe, "incomplete"),
    structure,
    keyboard,
    engine: {
      name: axe.testEngine?.name,
      version: axe.testEngine?.version,
    },
  };
}

function summarize(pages) {
  const byImpact = Object.fromEntries(IMPACT_ORDER.map((name) => [name, 0]));
  const byRule = {};
  let violations = 0;
  let incomplete = 0;
  let keyboardIssues = 0;

  for (const page of pages) {
    for (const item of page.violations) {
      violations += 1;
      if (item.impact && byImpact[item.impact] !== undefined) {
        byImpact[item.impact] += 1;
      }
      byRule[item.id] = (byRule[item.id] || 0) + 1;
    }
    incomplete += page.incomplete.length;
    keyboardIssues += page.keyboard?.issues.length || 0;
  }

  return {
    pages: pages.length,
    violations,
    incomplete,
    keyboardIssues,
    byImpact,
    byRule,
  };
}

function printTable(report) {
  const { summary } = report;
  console.error(
    `a11y-audit  ${report.baseUrl}  WCAG ${report.wcag}  ${summary.pages} page(s)`,
  );
  console.error(
    `violations=${summary.violations}  incomplete=${summary.incomplete}  keyboard=${summary.keyboardIssues}`,
  );
  for (const page of report.pages) {
    const counts = page.violations.reduce((acc, item) => {
      acc[item.impact || "other"] = (acc[item.impact || "other"] || 0) + 1;
      return acc;
    }, {});
    const impact = IMPACT_ORDER.filter((name) => counts[name])
      .map((name) => `${counts[name]} ${name}`)
      .join(", ");
    console.error(`  ${page.status || "—"}  ${page.url}  ${impact || "0 violations"}`);
  }
}

function pagePath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return rawUrl;
  }
}

function targetText(node) {
  const target = node?.target;
  return Array.isArray(target) ? target.join(" ") : String(target || "document");
}

export function findingRecords(report) {
  const records = [];
  for (const page of report.pages || []) {
    for (const item of page.violations || []) {
      const nodes = item.nodes?.length ? item.nodes : [null];
      for (const node of nodes) {
        const target = targetText(node);
        records.push({
          key: `axe|${pagePath(page.url)}|${item.id}|${target}`,
          source: "axe",
          page: page.url,
          path: pagePath(page.url),
          ruleId: item.id,
          impact: item.impact || "minor",
          message: item.help || item.description || item.id,
          helpUrl: item.helpUrl || null,
          target,
        });
      }
    }
    for (const item of page.keyboard?.issues || []) {
      const nodes = item.nodes?.length ? item.nodes : [null];
      for (const node of nodes) {
        const target = targetText(node);
        records.push({
          key: `keyboard|${pagePath(page.url)}|${item.id}|${target}`,
          source: "keyboard",
          page: page.url,
          path: pagePath(page.url),
          ruleId: item.id,
          impact: item.impact || "minor",
          message: item.help || item.id,
          helpUrl: null,
          target,
        });
      }
    }
  }
  return records;
}

export function compareBaseline(report, baseline) {
  const current = findingRecords(report);
  const previous = findingRecords(baseline);
  const currentKeys = new Set(current.map((item) => item.key));
  const previousKeys = new Set(previous.map((item) => item.key));
  return {
    baselineGeneratedAt: baseline.generatedAt || null,
    newFindings: current.filter((item) => !previousKeys.has(item.key)),
    resolvedFindings: previous.filter((item) => !currentKeys.has(item.key)),
    unchangedCount: current.filter((item) => previousKeys.has(item.key)).length,
  };
}

function sarifLevel(impact) {
  if (impact === "critical" || impact === "serious") return "error";
  if (impact === "moderate") return "warning";
  return "note";
}

export function toSarif(report) {
  const findings = report.regression?.newFindings || findingRecords(report);
  const ruleMap = new Map();
  for (const finding of findings) {
    if (!ruleMap.has(finding.ruleId)) {
      ruleMap.set(finding.ruleId, {
        id: finding.ruleId,
        shortDescription: { text: finding.message },
        helpUri: finding.helpUrl || undefined,
      });
    }
  }
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "a11y-audit",
            informationUri: "https://github.com/crstnmac/skills/tree/main/a11y-audit",
            rules: [...ruleMap.values()],
          },
        },
        results: findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: sarifLevel(finding.impact),
          message: { text: `${finding.message} (${finding.target})` },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: finding.page },
              },
            },
          ],
          partialFingerprints: { accessibilityFinding: finding.key },
        })),
      },
    ],
  };
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function toJunit(report) {
  const findings = report.regression?.newFindings || findingRecords(report);
  const cases = findings.map(
    (finding) =>
      `  <testcase classname="${xmlEscape(finding.path)}" name="${xmlEscape(
        `${finding.ruleId} ${finding.target}`,
      )}"><failure type="${xmlEscape(finding.impact)}" message="${xmlEscape(
        finding.message,
      )}">${xmlEscape(finding.page)}</failure></testcase>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="a11y-audit" tests="${findings.length}" failures="${findings.length}">`,
    ...cases,
    "</testsuite>",
    "",
  ].join("\n");
}

export function formatReport(report, format) {
  if (format === "sarif") return JSON.stringify(toSarif(report), null, 2);
  if (format === "junit") return toJunit(report);
  return JSON.stringify(report, null, 2);
}

export function shouldFail(report, failOn) {
  if (failOn === "none") return false;
  const threshold = IMPACT_RANK[failOn];
  const findings = report.regression?.newFindings || findingRecords(report);
  return findings.some((item) => (IMPACT_RANK[item.impact] || 1) >= threshold);
}

async function loadPaths(opts, baseUrl) {
  const paths = [];
  if (opts.pathsFile) {
    const text = readFileSync(opts.pathsFile, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const normalized = normalizePath(trimmed, baseUrl);
      if (normalized) paths.push(normalized);
    }
  }
  paths.push(...opts.paths.map((item) => normalizePath(item, baseUrl)).filter(Boolean));
  if (!paths.length) paths.push("/");
  return [...new Set(paths)];
}

export async function runAudit(opts) {
  const tags = tagsFor(opts.wcag, opts.includeBestPractice);
  const baseUrl = opts.url.replace(/\/+$/, "") || opts.url;
  const seeds = await loadPaths(opts, baseUrl);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: opts.viewport,
    storageState: opts.storageState || undefined,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(opts.timeout);

  const queue = [...seeds];
  const seen = new Set();
  const pages = [];

  try {
    while (queue.length && pages.length < opts.maxPages) {
      const path = queue.shift();
      if (seen.has(path)) continue;
      seen.add(path);
      const target = new URL(path, `${baseUrl}/`).toString();

      try {
        const result = await scanPage(page, target, opts, tags);
        pages.push(result);
        if (opts.crawl) {
          const found = await collectLinks(page, baseUrl);
          for (const nextPath of found) {
            if (!seen.has(nextPath) && !queue.includes(nextPath)) {
              queue.push(nextPath);
            }
          }
        }
      } catch (error) {
        pages.push({
          url: target,
          status: null,
          error: error instanceof Error ? error.message : String(error),
          violations: [],
          incomplete: [],
          keyboard: null,
          structure: null,
          viewport: opts.viewport,
        });
      }
    }
  } finally {
    await browser.close();
  }

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    wcag: opts.wcag,
    tags,
    viewport: opts.viewport,
    crawl: opts.crawl,
    pages,
    summary: summarize(pages),
  };
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }

  if (opts.help) {
    console.log(usage());
    return;
  }
  if (!opts.url) {
    console.error(`--url is required\n${usage()}`);
    process.exit(2);
  }
  if (opts.format === "xlsx" && !opts.out) {
    console.error("--format xlsx requires --out <file.xlsx>");
    process.exit(2);
  }

  const report = await runAudit(opts);
  if (opts.baseline) {
    let baseline;
    try {
      baseline = JSON.parse(readFileSync(opts.baseline, "utf8"));
    } catch (error) {
      console.error(`Unable to read baseline ${opts.baseline}: ${error.message}`);
      process.exit(2);
    }
    report.regression = compareBaseline(report, baseline);
  }
  const output =
    opts.format === "xlsx"
      ? await (await import("./xlsx.mjs")).toXlsx(report)
      : formatReport(report, opts.format);
  if (opts.out) {
    writeFileSync(opts.out, output);
    console.error(`Wrote ${opts.out}`);
  } else {
    console.log(output);
  }
  printTable(report);
  if (shouldFail(report, opts.failOn) || report.pages.some((page) => page.error)) {
    process.exitCode = 1;
  }
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
