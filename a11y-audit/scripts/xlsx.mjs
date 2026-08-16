import writeExcelFile from "write-excel-file/node";

const C = { navy: "#172554", blue: "#1D4ED8", white: "#FFFFFF", border: "#CBD5E1", muted: "#475569", critical: "#FECACA", serious: "#FED7AA", moderate: "#FEF3C7", minor: "#DBEAFE", review: "#EDE9FE", new: "#DCFCE7", resolved: "#E2E8F0" };
const borders = { topBorderColor: C.border, bottomBorderColor: C.border, leftBorderColor: C.border, rightBorderColor: C.border, topBorderStyle: "thin", bottomBorderStyle: "thin", leftBorderStyle: "thin", rightBorderStyle: "thin" };

function cell(value, style = {}) {
  return { value: value ?? "", wrap: true, verticalAlign: "top", ...borders, ...style };
}

function header(value) {
  return cell(value, { fontWeight: "bold", textColor: C.white, backgroundColor: C.blue, verticalAlign: "center", height: 28 });
}

function impactCell(value) {
  const impact = String(value || "minor").toLowerCase();
  return cell(impact, { fontWeight: "bold", backgroundColor: C[impact] || C.minor });
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
  return Array.isArray(node?.target) ? node.target.join(" ") : String(node?.target || "document");
}

function findingRows(report) {
  const regression = report.regression;
  const newKeys = new Set((regression?.newFindings || []).map((item) => item.key));
  const rows = [];
  for (const page of report.pages || []) {
    for (const [source, items] of [["axe", page.violations || []], ["keyboard", page.keyboard?.issues || []]]) {
      for (const item of items) {
        for (const node of item.nodes?.length ? item.nodes : [null]) {
          const target = targetText(node);
          const key = `${source}|${pagePath(page.url)}|${item.id}|${target}`;
          const isNew = regression && newKeys.has(key);
          rows.push([
            cell(regression ? (isNew ? "New" : "Existing") : "Current", { backgroundColor: isNew ? C.new : undefined }),
            impactCell(item.impact), cell(source), cell(item.id), cell((item.wcag || []).join(", ")), cell(page.url), cell(target),
            cell(item.help || item.description || item.id), cell(node?.html || ""), cell(node?.failureSummary || ""), cell(item.helpUrl || ""),
          ]);
        }
      }
    }
  }
  return rows;
}

function reviewRows(report) {
  const rows = [];
  for (const page of report.pages || []) {
    for (const item of page.incomplete || []) {
      for (const node of item.nodes?.length ? item.nodes : [null]) {
        rows.push([impactCell(item.impact || "review"), cell(item.id), cell((item.wcag || []).join(", ")), cell(page.url), cell(targetText(node)), cell(item.help || item.description || item.id), cell(node?.html || ""), cell(node?.failureSummary || ""), cell(item.helpUrl || "")]);
      }
    }
  }
  return rows;
}

function dataSheet(sheet, labels, widths, rows) {
  return { sheet, data: [labels.map(header), ...rows], columns: widths.map((width) => ({ width })), stickyRowsCount: 1, showGridLines: false };
}

function summarySheet(report, findings, reviews) {
  const impacts = ["critical", "serious", "moderate", "minor"];
  const rows = [
    [cell("Accessibility audit report", { columnSpan: 5, fontSize: 20, fontWeight: "bold", textColor: C.white, backgroundColor: C.navy, verticalAlign: "center", height: 36 }), null, null, null, null],
    [],
    [header("Audit details"), header("Value"), cell(""), header("Impact"), header("Finding nodes")],
  ];
  const metadata = [
    ["Target", report.baseUrl || ""],
    ["Generated", report.generatedAt ? new Date(report.generatedAt) : new Date()],
    ["Standard", `WCAG ${report.wcag || "2.2-aa"}`],
    ["Pages scanned", report.summary?.pages ?? report.pages?.length ?? 0],
    ["Viewport", report.viewport ? `${report.viewport.width}×${report.viewport.height}` : ""],
    ["Baseline", report.regression?.baselineGeneratedAt || "None"],
  ];
  metadata.forEach(([label, value], index) => {
    const impact = impacts[index];
    const valueCell = value instanceof Date ? cell(value, { type: Date, format: "yyyy-mm-dd hh:mm" }) : cell(value);
    rows.push([cell(label, { fontWeight: "bold", textColor: C.muted }), valueCell, cell(""), impact ? impactCell(impact) : cell(index === 4 ? "Review items" : ""), cell(impact ? findings.filter((item) => item[1].value === impact).length : index === 4 ? reviews.length : "")]);
  });
  if (report.regression) {
    rows.push([], [header("Regression status"), header("Count"), { ...header("Meaning"), columnSpan: 3 }, null, null]);
    rows.push(
      [cell("New", { backgroundColor: C.new, fontWeight: "bold" }), cell(report.regression.newFindings?.length || 0), { ...cell("Present now, absent from baseline"), columnSpan: 3 }, null, null],
      [cell("Resolved", { backgroundColor: C.resolved, fontWeight: "bold" }), cell(report.regression.resolvedFindings?.length || 0), { ...cell("Present in baseline, absent now"), columnSpan: 3 }, null, null],
      [cell("Unchanged", { fontWeight: "bold" }), cell(report.regression.unchangedCount || 0), { ...cell("Present in both reports"), columnSpan: 3 }, null, null],
    );
  }
  return { sheet: "Summary", data: rows, columns: [22, 46, 4, 20, 18].map((width) => ({ width })), stickyRowsCount: 1, showGridLines: false };
}

export async function toXlsx(report) {
  const findings = findingRows(report);
  const reviews = reviewRows(report);
  const pages = (report.pages || []).map((page) => [cell(page.url), cell(page.status ?? ""), cell(page.title || ""), cell(page.lang || ""), cell(page.viewport ? `${page.viewport.width}×${page.viewport.height}` : ""), cell(page.violations?.length || 0), cell(page.incomplete?.length || 0), cell(page.keyboard?.issues?.length || 0), cell(page.error || page.loadError || "")]);
  const sheets = [
    summarySheet(report, findings, reviews),
    dataSheet("Findings", ["Status", "Impact", "Source", "Rule", "WCAG", "Page", "Selector / target", "Issue", "HTML", "Failure summary", "Help URL"], [12, 12, 12, 22, 18, 34, 32, 38, 42, 42, 36], findings),
    dataSheet("Pages", ["Page", "HTTP status", "Title", "Language", "Viewport", "Violation rules", "Review rules", "Keyboard issues", "Load error"], [38, 14, 28, 12, 15, 16, 14, 16, 36], pages),
    dataSheet("Review Items", ["Impact", "Rule", "WCAG", "Page", "Target", "Review needed", "HTML", "Failure summary", "Help URL"], [12, 22, 18, 34, 32, 38, 42, 42, 36], reviews),
  ];
  if (report.regression) {
    const regressions = [...(report.regression.newFindings || []).map((item) => ["New", item]), ...(report.regression.resolvedFindings || []).map((item) => ["Resolved", item])].map(([change, item]) => [cell(change, { backgroundColor: change === "New" ? C.new : C.resolved, fontWeight: "bold" }), impactCell(item.impact), cell(item.source), cell(item.ruleId || item.id), cell(item.path), cell(item.target), cell(item.message || item.help), cell(item.helpUrl || "")]);
    sheets.push(dataSheet("Regressions", ["Change", "Impact", "Source", "Rule", "Path", "Target", "Message", "Help URL"], [13, 12, 12, 22, 30, 32, 40, 36], regressions));
  }
  return writeExcelFile(sheets, { fontFamily: "Aptos", fontSize: 11 }).toBuffer();
}
