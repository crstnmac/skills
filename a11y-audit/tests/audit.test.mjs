import assert from "node:assert/strict";
import test from "node:test";

import {
  compareBaseline,
  findingRecords,
  formatReport,
  shouldFail,
  toJunit,
  toSarif,
} from "../scripts/audit.mjs";
import { toXlsx } from "../scripts/xlsx.mjs";

function report(violations = [], keyboardIssues = []) {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    pages: [
      {
        url: "http://localhost:3000/products?sort=new",
        violations,
        keyboard: { issues: keyboardIssues },
      },
    ],
    summary: {},
  };
}

const imageAlt = {
  id: "image-alt",
  impact: "critical",
  help: "Images must have alternate text",
  helpUrl: "https://dequeuniversity.com/rules/axe/image-alt",
  nodes: [{ target: ["img.hero"] }],
};

test("creates stable finding records without the host origin", () => {
  const [finding] = findingRecords(report([imageAlt]));
  assert.equal(finding.key, "axe|/products?sort=new|image-alt|img.hero");
});

test("baseline comparison returns only new and resolved findings", () => {
  const current = report([imageAlt]);
  const previous = report([], [
    {
      id: "focus-not-visible",
      impact: "serious",
      help: "No focus indicator",
      nodes: [{ target: ["button.buy"] }],
    },
  ]);
  const comparison = compareBaseline(current, previous);
  assert.equal(comparison.newFindings[0].ruleId, "image-alt");
  assert.equal(comparison.resolvedFindings[0].ruleId, "focus-not-visible");
});

test("severity gates apply to all findings or regressions", () => {
  const current = report([imageAlt]);
  assert.equal(shouldFail(current, "critical"), true);
  assert.equal(shouldFail(current, "none"), false);
  current.regression = { newFindings: [] };
  assert.equal(shouldFail(current, "minor"), false);
});

test("SARIF includes rules, results, and fingerprints", () => {
  const sarif = toSarif(report([imageAlt]));
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs[0].results[0].ruleId, "image-alt");
  assert.match(sarif.runs[0].results[0].partialFingerprints.accessibilityFinding, /img\.hero/);
});

test("JUnit escapes finding content", () => {
  const junit = toJunit(
    report([{ ...imageAlt, help: 'Image <alt> must be "useful" & present' }]),
  );
  assert.match(junit, /&lt;alt&gt;/);
  assert.match(junit, /&quot;useful&quot;/);
  assert.match(junit, /&amp; present/);
});

test("formatReport keeps JSON as the default interchange format", () => {
  const current = report([imageAlt]);
  assert.deepEqual(JSON.parse(formatReport(current, "json")), current);
  assert.match(formatReport(current, "junit"), /^<\?xml/);
});

test("XLSX export creates structured workbook sheets", async () => {
  const current = report([imageAlt]);
  current.baseUrl = "http://localhost:3000";
  current.wcag = "2.2-aa";
  current.viewport = { width: 1280, height: 800 };
  current.pages[0].status = 200;
  current.pages[0].title = "Products";
  current.pages[0].lang = "en";
  current.pages[0].incomplete = [];
  current.pages[0].viewport = current.viewport;
  current.summary = { pages: 1 };

  const buffer = await toXlsx(current);
  assert.equal(Buffer.from(buffer).subarray(0, 2).toString(), "PK");

  assert.ok(buffer.byteLength > 2_000);
});
