import { ReportContext } from "../../core/interfaces/report";
import { ComparisonResult } from "../../core/models/comparison-result";
import { ValidationResult } from "../../core/models/validation-result";
import { ValidationRun } from "../../core/models/validation-run";
import { ValidationStatus } from "../../core/models/validation-status";
import { redactMetadata } from "../redact";

const APP_NAME = "Atlas Visual";
const REPORT_TITLE = "Visual Validation Report";

interface StatusPresentation {
  label: string;
  icon: string;
}

const STATUS_PRESENTATION: Record<ValidationStatus, StatusPresentation> = {
  [ValidationStatus.Passed]: { label: "Passed", icon: "✓" },
  [ValidationStatus.Failed]: { label: "Failed", icon: "✗" },
  [ValidationStatus.Error]: { label: "Error", icon: "!" },
};

/** Renders a self-contained, portable HTML document for a validation run. */
export function renderReportHtml(run: ValidationRun, context: ReportContext): string {
  const results = flattenResults(run);

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(`${APP_NAME} — ${REPORT_TITLE}`)}</title>`,
    `<style>${STYLES}</style>`,
    "</head>",
    "<body>",
    renderHeader(run),
    "<main>",
    renderSummary(run),
    renderPageResults(results),
    renderFailedPages(results, context),
    renderVisualComparison(results, context),
    renderErrors(results),
    renderMetadata(run, context),
    "</main>",
    renderFooter(),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function flattenResults(run: ValidationRun): ValidationResult[] {
  return run.executions.flatMap((execution) => execution.results);
}

function renderHeader(run: ValidationRun): string {
  return [
    "<header>",
    `<p class="eyebrow">${escapeHtml(APP_NAME)}</p>`,
    `<h1>${escapeHtml(REPORT_TITLE)}</h1>`,
    '<dl class="header-meta">',
    metaRow("Execution", run.executionId),
    metaRow("Started", run.startedAt.toISOString()),
    metaRow("Finished", run.finishedAt.toISOString()),
    metaRow("Environment", `Node ${run.environment.nodeVersion} on ${run.environment.platform}`),
    "</dl>",
    "</header>",
  ].join("\n");
}

function renderSummary(run: ValidationRun): string {
  const totalDifferentPixels = run.executions
    .flatMap((execution) => execution.results)
    .reduce((total, result) => total + (result.comparison?.differentPixels ?? 0), 0);

  return [
    '<section aria-labelledby="summary-heading">',
    '<h2 id="summary-heading">Execution summary</h2>',
    statusBanner(run.status),
    '<ul class="summary-grid">',
    summaryItem("Pages", String(run.summary.total)),
    summaryItem("Passed", String(run.summary.passed)),
    summaryItem("Failed", String(run.summary.failed)),
    summaryItem("Errors", String(run.summary.errors)),
    summaryItem("Duration", formatDuration(run.duration)),
    summaryItem("Different pixels", totalDifferentPixels.toLocaleString("en-US")),
    "</ul>",
    "</section>",
  ].join("\n");
}

function renderPageResults(results: ValidationResult[]): string {
  if (results.length === 0) {
    return section("page-results-heading", "Page results", "<p>No pages were validated.</p>");
  }

  const rows = results
    .map((result) => {
      const comparison = result.comparison;
      return [
        "<tr>",
        `<td>${escapeHtml(result.pageId)}</td>`,
        `<td>${result.url ? `<a href="${escapeAttribute(result.url)}">${escapeHtml(result.url)}</a>` : "—"}</td>`,
        `<td>${statusPill(result.status)}</td>`,
        `<td>${formatDuration(result.duration)}</td>`,
        `<td>${comparison ? `${formatPercentage(comparison.differencePercentage)}` : "—"}</td>`,
        `<td>${comparison ? comparison.differentPixels.toLocaleString("en-US") : "—"}</td>`,
        `<td>${comparison ? comparison.totalPixels.toLocaleString("en-US") : "—"}</td>`,
        `<td>${comparison ? formatPercentage(comparison.allowedDifferencePercentage) : "—"}</td>`,
        "</tr>",
      ].join("");
    })
    .join("\n");

  const table = [
    '<div class="table-scroll">',
    "<table>",
    '<caption class="sr-only">Per-page validation results</caption>',
    "<thead><tr>",
    '<th scope="col">Page</th>',
    '<th scope="col">URL</th>',
    '<th scope="col">Status</th>',
    '<th scope="col">Duration</th>',
    '<th scope="col">Difference</th>',
    '<th scope="col">Different pixels</th>',
    '<th scope="col">Total pixels</th>',
    '<th scope="col">Allowed</th>',
    "</tr></thead>",
    `<tbody>${rows}</tbody>`,
    "</table>",
    "</div>",
  ].join("\n");

  return section("page-results-heading", "Page results", table);
}

function renderFailedPages(results: ValidationResult[], context: ReportContext): string {
  const failed = results.filter((result) => result.status === ValidationStatus.Failed);
  if (failed.length === 0) {
    return section("failed-heading", "Failed pages", "<p>No visual differences exceeded the allowed threshold.</p>");
  }

  const cards = failed.map((result) => renderFailedCard(result, context)).join("\n");
  return section("failed-heading", "Failed pages", cards);
}

function renderFailedCard(result: ValidationResult, context: ReportContext): string {
  const comparison = result.comparison;
  const diagnostics = [
    diagnosticRow("Difference", comparison ? formatPercentage(comparison.differencePercentage) : "—"),
    diagnosticRow("Allowed difference", comparison ? formatPercentage(comparison.allowedDifferencePercentage) : "—"),
    diagnosticRow("Different pixels", comparison ? comparison.differentPixels.toLocaleString("en-US") : "—"),
    diagnosticRow("Total pixels", comparison ? comparison.totalPixels.toLocaleString("en-US") : "—"),
    diagnosticRow("Rendered size", renderedSize(comparison)),
    diagnosticRow("Page URL", result.url ?? "—"),
    diagnosticRow("Execution duration", formatDuration(result.duration)),
  ].join("\n");

  return [
    `<article class="card" data-status="${ValidationStatus.Failed}">`,
    `<h3>${statusIcon(ValidationStatus.Failed)} ${escapeHtml(result.pageId)}</h3>`,
    `<p class="status-line">${statusPill(result.status)}</p>`,
    '<dl class="diagnostics">',
    diagnostics,
    "</dl>",
    renderComparisonFigures(result, context),
    renderFindings(result),
    "</article>",
  ].join("\n");
}

function renderVisualComparison(results: ValidationResult[], context: ReportContext): string {
  const withArtifacts = results.filter((result) => hasAnyArtifact(result.pageId, context));
  if (withArtifacts.length === 0) {
    return section("visual-heading", "Visual comparison", "<p>No images were captured for this run.</p>");
  }

  const blocks = withArtifacts
    .map((result) =>
      [
        '<article class="card">',
        `<h3>${statusIcon(result.status)} ${escapeHtml(result.pageId)}</h3>`,
        `<p class="status-line">${statusPill(result.status)}</p>`,
        renderComparisonFigures(result, context),
        "</article>",
      ].join("\n")
    )
    .join("\n");

  return section("visual-heading", "Visual comparison", blocks);
}

function renderComparisonFigures(result: ValidationResult, context: ReportContext): string {
  const artifacts = context.artifacts[result.pageId] ?? {};
  const figures = [
    imageFigure("Reference", artifacts.reference),
    imageFigure("Actual", artifacts.evidence),
    imageFigure("Difference", artifacts.diff),
  ].join("\n");

  return `<div class="comparison-grid">${figures}</div>`;
}

function renderErrors(results: ValidationResult[]): string {
  const errored = results.filter((result) => result.status === ValidationStatus.Error);
  if (errored.length === 0) {
    return section("errors-heading", "Errors", "<p>No execution errors were reported.</p>");
  }

  const cards = errored
    .map((result) => {
      const kind = result.failureKind ?? result.comparison?.status ?? "EXECUTION";
      const message = result.findings[0] ?? "No further detail was reported.";
      const technical =
        result.findings.length > 1
          ? `<details><summary>Technical detail</summary><pre>${escapeHtml(result.findings.join("\n"))}</pre></details>`
          : "";

      return [
        `<article class="card" data-status="${ValidationStatus.Error}">`,
        `<h3>${statusIcon(ValidationStatus.Error)} ${escapeHtml(result.pageId)}</h3>`,
        '<dl class="diagnostics">',
        diagnosticRow("Error type", String(kind)),
        diagnosticRow("Message", message),
        diagnosticRow("Page URL", result.url ?? "—"),
        "</dl>",
        technical,
        "</article>",
      ].join("\n");
    })
    .join("\n");

  return section("errors-heading", "Errors", cards);
}

function renderMetadata(run: ValidationRun, context: ReportContext): string {
  const pluginRows = run.executions
    .map((execution) =>
      [
        "<tr>",
        `<td>${escapeHtml(execution.pluginId)}</td>`,
        `<td>${statusPill(execution.status)}</td>`,
        `<td>${execution.passed}/${execution.total}</td>`,
        `<td>${execution.failed}</td>`,
        `<td>${execution.errors}</td>`,
        "</tr>",
      ].join("")
    )
    .join("\n");

  const comparisonMeta = run.executions
    .flatMap((execution) => execution.results)
    .filter((result) => result.comparison && Object.keys(result.comparison.metadata).length > 0)
    .map((result) => renderComparisonMetadata(result.pageId, result.comparison as ComparisonResult))
    .join("\n");

  const body = [
    '<dl class="header-meta">',
    metaRow("Execution ID", run.executionId),
    metaRow("Run folder", portableRunFolder(context)),
    metaRow("Generated at", context.generatedAt.toISOString()),
    metaRow("Node version", run.environment.nodeVersion),
    metaRow("Platform", run.environment.platform),
    "</dl>",
    '<div class="table-scroll">',
    "<table>",
    '<caption class="sr-only">Plugin results</caption>',
    '<thead><tr><th scope="col">Plugin</th><th scope="col">Status</th><th scope="col">Passed</th><th scope="col">Failed</th><th scope="col">Errors</th></tr></thead>',
    `<tbody>${pluginRows}</tbody>`,
    "</table>",
    "</div>",
    comparisonMeta,
  ].join("\n");

  return section("metadata-heading", "Execution metadata", body);
}

function renderComparisonMetadata(pageId: string, comparison: ComparisonResult): string {
  const rows = Object.entries(redactMetadata(comparison.metadata))
    .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  return [
    `<details><summary>${escapeHtml(pageId)} comparison metadata</summary>`,
    '<div class="table-scroll"><table><tbody>',
    rows,
    "</tbody></table></div>",
    "</details>",
  ].join("\n");
}

function renderFindings(result: ValidationResult): string {
  if (result.findings.length === 0) {
    return "";
  }

  const items = result.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("");
  return `<div class="findings"><h4>Findings</h4><ul>${items}</ul></div>`;
}

function renderFooter(): string {
  return `<footer><p>Generated by ${escapeHtml(APP_NAME)}.</p></footer>`;
}

function section(headingId: string, title: string, body: string): string {
  return [
    `<section aria-labelledby="${headingId}">`,
    `<h2 id="${headingId}">${escapeHtml(title)}</h2>`,
    body,
    "</section>",
  ].join("\n");
}

function statusBanner(status: ValidationStatus): string {
  const presentation = STATUS_PRESENTATION[status];
  return [
    `<p class="status-banner" data-status="${status}" role="status">`,
    `<span class="status-icon" aria-hidden="true">${presentation.icon}</span>`,
    `<span class="status-text">Status: ${escapeHtml(presentation.label.toUpperCase())}</span>`,
    "</p>",
  ].join("");
}

function statusPill(status: ValidationStatus): string {
  const presentation = STATUS_PRESENTATION[status];
  return `<span class="pill" data-status="${status}"><span aria-hidden="true">${presentation.icon}</span> ${escapeHtml(presentation.label)}</span>`;
}

function statusIcon(status: ValidationStatus): string {
  return `<span class="status-icon" aria-hidden="true">${STATUS_PRESENTATION[status].icon}</span>`;
}

function summaryItem(label: string, value: string): string {
  return `<li><span class="summary-label">${escapeHtml(label)}</span><span class="summary-value">${escapeHtml(value)}</span></li>`;
}

function metaRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function diagnosticRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function imageFigure(caption: string, source: string | undefined): string {
  const body = source
    ? `<img loading="lazy" src="${escapeAttribute(source)}" alt="${escapeAttribute(`${caption} image`)}" />`
    : `<p class="missing">${escapeHtml(`${caption} not available`)}</p>`;

  return `<figure><figcaption>${escapeHtml(caption)}</figcaption>${body}</figure>`;
}

function hasAnyArtifact(pageId: string, context: ReportContext): boolean {
  const artifacts = context.artifacts[pageId];
  return Boolean(artifacts && (artifacts.evidence || artifacts.reference || artifacts.diff));
}

/** A relative, machine-independent locator for the run folder. */
function portableRunFolder(context: ReportContext): string {
  const segments = context.runDirectory.split("/").filter(Boolean);
  const runsIndex = segments.lastIndexOf("runs");
  const relevant = runsIndex >= 0 ? segments.slice(runsIndex) : [segments[segments.length - 1] ?? context.executionId];
  return `${relevant.join("/")}/`;
}

function renderedSize(comparison: ComparisonResult | undefined): string {
  if (!comparison || comparison.width === undefined || comparison.height === undefined) {
    return "—";
  }
  return `${comparison.width}×${comparison.height}`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

/** Escapes text for use in element content. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes text for use inside a double-quoted attribute. */
export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

const STYLES = `
:root { color-scheme: light dark; --pass: #1a7f37; --fail: #b3261e; --error: #8a5a00; --bg: #ffffff; --fg: #1b1b1b; --muted: #5a5a5a; --border: #d0d0d0; --card: #f6f6f6; }
@media (prefers-color-scheme: dark) { :root { --bg: #101215; --fg: #e9e9e9; --muted: #a0a0a0; --border: #2c2f33; --card: #181b1f; --pass: #3fb950; --fail: #ff7b72; --error: #d2a24c; } }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--fg); line-height: 1.5; }
header, main, footer { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
header { border-bottom: 1px solid var(--border); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--muted); margin: 0; }
h1 { margin: 0.25rem 0 1rem; font-size: 1.6rem; }
h2 { font-size: 1.2rem; margin-top: 2.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
h3 { font-size: 1.05rem; margin: 0 0 0.5rem; }
.header-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.5rem 1.5rem; margin: 0; }
.header-meta dt { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.header-meta dd { margin: 0 0 0.5rem; word-break: break-word; }
.status-banner { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; padding: 0.75rem 1rem; border-radius: 8px; border: 2px solid var(--border); }
.status-banner[data-status="PASSED"] { border-color: var(--pass); color: var(--pass); }
.status-banner[data-status="FAILED"] { border-color: var(--fail); color: var(--fail); }
.status-banner[data-status="ERROR"] { border-color: var(--error); color: var(--error); }
.status-icon { font-weight: 900; }
.summary-grid { list-style: none; padding: 0; margin: 1rem 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }
.summary-grid li { border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
.summary-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.summary-value { font-size: 1.3rem; font-weight: 700; }
.table-scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; margin-top: 0.75rem; font-size: 0.92rem; }
th, td { text-align: left; padding: 0.5rem 0.65rem; border-bottom: 1px solid var(--border); vertical-align: top; }
th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.pill { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.1rem 0.5rem; border-radius: 999px; border: 1px solid var(--border); font-size: 0.8rem; font-weight: 700; }
.pill[data-status="PASSED"] { color: var(--pass); border-color: var(--pass); }
.pill[data-status="FAILED"] { color: var(--fail); border-color: var(--fail); }
.pill[data-status="ERROR"] { color: var(--error); border-color: var(--error); }
.card { border: 1px solid var(--border); border-left-width: 5px; border-radius: 8px; padding: 1rem; margin-top: 1rem; background: var(--card); }
.card[data-status="FAILED"] { border-left-color: var(--fail); }
.card[data-status="ERROR"] { border-left-color: var(--error); }
.status-line { margin: 0 0 0.75rem; }
.diagnostics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.4rem 1.5rem; margin: 0 0 1rem; }
.diagnostics dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.diagnostics dd { margin: 0 0 0.4rem; word-break: break-word; }
.comparison-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
figure { margin: 0; border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem; background: var(--bg); }
figcaption { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.4rem; }
figure img { width: 100%; height: auto; display: block; border-radius: 4px; }
.missing { color: var(--muted); font-style: italic; margin: 0; }
.findings ul { margin: 0.25rem 0 0; padding-left: 1.1rem; }
.findings h4 { margin: 0.75rem 0 0.25rem; font-size: 0.85rem; }
details { margin-top: 0.75rem; }
summary { cursor: pointer; font-weight: 600; }
pre { overflow-x: auto; background: var(--card); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border); }
footer { color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--border); }
a { color: inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
`;
