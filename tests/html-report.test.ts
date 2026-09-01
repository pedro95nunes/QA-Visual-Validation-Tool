import assert from "node:assert/strict";
import test from "node:test";
import { ReportContext } from "../src/core/interfaces/report";
import { Storage } from "../src/core/interfaces/storage";
import { ValidationRun } from "../src/core/models/validation-run";
import { HtmlReport } from "../src/reports/html/html-report";
import { renderReportHtml } from "../src/reports/html/render-html";
import {
  allPassedRun,
  oneFailedRun,
  multipleFailedRun,
  executionErrorRun,
  incompatibleDimensionsRun,
  zeroDifferenceRun,
  aboveThresholdRun,
} from "./fixtures/report-fixtures";

class CapturingStorage implements Storage {
  public saved?: { path: string; text: string };
  public async save(filePath: string, content: Uint8Array): Promise<string> {
    this.saved = { path: filePath, text: Buffer.from(content).toString("utf8") };
    return filePath;
  }
  public async read(): Promise<Uint8Array> {
    return new Uint8Array();
  }
}

function contextFor(run: ValidationRun): ReportContext {
  const artifacts: Record<string, { evidence?: string; reference?: string; diff?: string }> = {};
  for (const execution of run.executions) {
    for (const result of execution.results) {
      artifacts[result.pageId] = {
        evidence: result.evidence ? `../evidence/${result.pageId}.png` : undefined,
        reference: result.reference ? `../references/${result.pageId}.png` : undefined,
        diff: result.comparison?.diffImage ? `../diffs/${result.pageId}-diff.png` : undefined,
      };
    }
  }

  return {
    executionId: run.executionId,
    runDirectory: `artifacts/runs/${run.executionId}`,
    reportDirectory: `artifacts/runs/${run.executionId}/report`,
    artifacts,
    generatedAt: new Date("2026-08-31T21:31:03.000Z"),
  };
}

async function generate(run: ValidationRun): Promise<string> {
  const storage = new CapturingStorage();
  const result = await new HtmlReport(storage).generate(run, contextFor(run));
  assert.equal(result.reportId, "html");
  assert.equal(result.outputPath, `artifacts/runs/${run.executionId}/report/index.html`);
  assert.ok(storage.saved);
  return storage.saved.text;
}

test("renders header, summary counts and duration", async () => {
  const html = await generate(allPassedRun);

  assert.match(html, /Atlas Visual/);
  assert.match(html, /Visual Validation Report/);
  assert.match(html, /Status: PASSED/);
  assert.match(html, /62\.37s/);
  assert.match(html, /<html lang="en">/);
});

test("renders a per-page results row for every page", async () => {
  const html = await generate(oneFailedRun);

  assert.match(html, /homepage/);
  assert.match(html, /about/);
  assert.match(html, /contact/);
  assert.match(html, /4\.70%/);
  assert.match(html, /1\.00%/);
});

test("does not rely on color alone for status", async () => {
  const html = await generate(oneFailedRun);

  assert.match(html, /data-status="FAILED"/);
  assert.match(html, /Status: FAILED/);
  assert.match(html, /class="pill" data-status="PASSED"/);
});

test("references organized artifacts with relative portable paths", async () => {
  const html = await generate(oneFailedRun);

  assert.match(html, /src="\.\.\/evidence\/about\.png"/);
  assert.match(html, /src="\.\.\/references\/about\.png"/);
  assert.match(html, /src="\.\.\/diffs\/about-diff\.png"/);
  assert.equal(html.includes("/Users/"), false);
  assert.equal(html.includes("artifacts/evidence/about-src.png"), false);
});

test("shows failed-page diagnostics needed for defect creation", async () => {
  const html = await generate(multipleFailedRun);

  assert.match(html, /Failed pages/);
  assert.match(html, /Different pixels/);
  assert.match(html, /Allowed difference/);
  assert.match(html, /Rendered size/);
  assert.match(html, /Page URL/);
  assert.match(html, /https:\/\/example\.com\/about/);
});

test("renders execution errors with a collapsible technical section and no raw stack in the summary", async () => {
  const html = await generate(executionErrorRun);

  assert.match(html, /<h2 id="errors-heading">Errors<\/h2>/);
  assert.match(html, /Error type/);
  assert.match(html, /ERR_CONNECTION_REFUSED/);
  assert.match(html, /<details><summary>Technical detail<\/summary>/);
});

test("renders incompatible dimensions as an error with comparison metadata", async () => {
  const html = await generate(incompatibleDimensionsRun);

  assert.match(html, /INCOMPATIBLE_DIMENSIONS/);
  assert.match(html, /1440x900/);
  assert.match(html, /1280x720/);
});

test("renders a clean successful run with an empty failed section", async () => {
  const html = await generate(zeroDifferenceRun);

  assert.match(html, /No visual differences exceeded the allowed threshold\./);
  assert.match(html, /No execution errors were reported\./);
});

test("escapes dynamic content and never prints secret-like metadata values", async () => {
  const run = structuredClone(aboveThresholdRun);
  run.executions[0].results[0].pageId = "<script>alert(1)</script>";
  run.executions[0].results[0].comparison!.metadata = { token: "super-secret", referenceDimensions: "1440x900" };

  const html = renderReportHtml(run, contextFor(run));

  assert.equal(html.includes("<script>alert(1)</script>"), false);
  assert.match(html, /&lt;script&gt;/);
  assert.equal(html.includes("super-secret"), false);
  assert.match(html, /\*\*\*/);
});
