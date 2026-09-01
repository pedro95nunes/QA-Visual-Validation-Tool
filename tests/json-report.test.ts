import assert from "node:assert/strict";
import test from "node:test";
import { ReportContext } from "../src/core/interfaces/report";
import { Storage } from "../src/core/interfaces/storage";
import { ValidationRun } from "../src/core/models/validation-run";
import { JsonReport } from "../src/reports/json/json-report";
import { buildJsonReport, JsonReportDocument } from "../src/reports/json/build-json-report";
import {
  allPassedRun,
  oneFailedRun,
  executionErrorRun,
  incompatibleDimensionsRun,
  belowThresholdRun,
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

test("writes valid, machine-readable JSON to report.json", async () => {
  const storage = new CapturingStorage();
  const result = await new JsonReport(storage).generate(oneFailedRun, contextFor(oneFailedRun));

  assert.equal(result.reportId, "json");
  assert.equal(result.outputPath, `artifacts/runs/${oneFailedRun.executionId}/report/report.json`);
  const parsed = JSON.parse(storage.saved!.text) as JsonReportDocument;
  assert.equal(parsed.execution.status, "FAILED");
  assert.equal(parsed.summary.total, 3);
  assert.equal(parsed.summary.failed, 1);
  assert.equal(parsed.pages.length, 3);
});

test("mirrors the ValidationRun counts instead of recomputing them", () => {
  const document = buildJsonReport(allPassedRun, contextFor(allPassedRun));

  assert.deepEqual(document.summary, allPassedRun.summary);
  assert.equal(document.execution.id, allPassedRun.executionId);
  assert.equal(document.execution.startedAt, allPassedRun.startedAt.toISOString());
});

test("includes per-page comparison metrics and artifact references", () => {
  const document = buildJsonReport(oneFailedRun, contextFor(oneFailedRun));
  const about = document.pages.find((page) => page.id === "about")!;

  assert.equal(about.status, "FAILED");
  assert.equal(about.url, "https://example.com/about");
  assert.equal(about.comparison?.allowedDifferencePercentage, 1);
  assert.ok(about.comparison && about.comparison.differentPixels > 0);
  assert.equal(about.artifacts.evidence, "../evidence/about.png");
  assert.equal(about.artifacts.diff, "../diffs/about-diff.png");
});

test("represents execution errors without evidence", () => {
  const document = buildJsonReport(executionErrorRun, contextFor(executionErrorRun));
  const about = document.pages.find((page) => page.id === "about")!;

  assert.equal(about.status, "ERROR");
  assert.equal(about.failureKind, "EXECUTION");
  assert.equal(about.comparison, null);
  assert.equal(about.artifacts.evidence, null);
  assert.ok(about.findings.length >= 1);
});

test("represents incompatible dimensions through comparison status and metadata", () => {
  const document = buildJsonReport(incompatibleDimensionsRun, contextFor(incompatibleDimensionsRun));
  const about = document.pages.find((page) => page.id === "about")!;

  assert.equal(about.comparison?.status, "INCOMPATIBLE_DIMENSIONS");
  assert.equal(about.comparison?.metadata.referenceDimensions, "1440x900");
});

test("distinguishes difference below and above the allowed threshold", () => {
  const below = buildJsonReport(belowThresholdRun, contextFor(belowThresholdRun)).pages[0];
  const above = buildJsonReport(aboveThresholdRun, contextFor(aboveThresholdRun)).pages[0];

  assert.equal(below.status, "PASSED");
  assert.equal(below.comparison!.differencePercentage <= below.comparison!.allowedDifferencePercentage, true);
  assert.equal(above.status, "FAILED");
  assert.equal(above.comparison!.differencePercentage > above.comparison!.allowedDifferencePercentage, true);
});

test("redacts secret-like comparison metadata values", () => {
  const run = structuredClone(aboveThresholdRun);
  run.executions[0].results[0].comparison!.metadata = { authorization: "Bearer abc", note: "safe" };

  const document = buildJsonReport(run, contextFor(run));

  assert.equal(document.pages[0].comparison!.metadata.authorization, "***");
  assert.equal(document.pages[0].comparison!.metadata.note, "safe");
});
