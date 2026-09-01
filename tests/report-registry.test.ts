import assert from "node:assert/strict";
import test from "node:test";
import { Report, ReportContext } from "../src/core/interfaces/report";
import { ReportResult } from "../src/core/models/report-result";
import { ValidationRun } from "../src/core/models/validation-run";
import { DefaultReportRegistry } from "../src/reports/default-report-registry";

class StubReport implements Report {
  public constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
  public async generate(_run: ValidationRun, context: ReportContext): Promise<ReportResult> {
    return {
      reportId: this.id,
      reportName: this.name,
      outputPath: `${context.reportDirectory}/${this.id}`,
      generatedAt: context.generatedAt,
      success: true,
      metadata: {},
    };
  }
}

const html = new StubReport("html", "HTML");
const json = new StubReport("json", "JSON");

test("returns only the reports enabled by configuration", () => {
  const registry = new DefaultReportRegistry(
    [
      { report: html, enabled: true },
      { report: json, enabled: false },
    ],
    true
  );

  assert.deepEqual(
    registry.enabledReports().map((report) => report.id),
    ["html"]
  );
});

test("returns nothing when reporting is disabled entirely", () => {
  const registry = new DefaultReportRegistry(
    [
      { report: html, enabled: true },
      { report: json, enabled: true },
    ],
    false
  );

  assert.deepEqual(registry.enabledReports(), []);
});

test("supports enabling every registered report", () => {
  const registry = new DefaultReportRegistry(
    [
      { report: html, enabled: true },
      { report: json, enabled: true },
    ],
    true
  );

  assert.deepEqual(
    registry.enabledReports().map((report) => report.id),
    ["html", "json"]
  );
});

test("a future report format is added without touching orchestration", () => {
  const junit = new StubReport("junit", "JUnit XML");
  const registry = new DefaultReportRegistry(
    [
      { report: html, enabled: false },
      { report: junit, enabled: true },
    ],
    true
  );

  assert.deepEqual(
    registry.enabledReports().map((report) => report.id),
    ["junit"]
  );
});
