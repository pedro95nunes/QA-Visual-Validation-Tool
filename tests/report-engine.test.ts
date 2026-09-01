import assert from "node:assert/strict";
import test from "node:test";
import { ReportConfiguration } from "../src/configuration/report-configuration";
import { ReportGenerationException } from "../src/core/exceptions/report-generation.exception";
import { Logger } from "../src/core/interfaces/logger";
import { Report, ReportContext } from "../src/core/interfaces/report";
import { Storage } from "../src/core/interfaces/storage";
import { ReportResult } from "../src/core/models/report-result";
import { ValidationRun } from "../src/core/models/validation-run";
import { ArtifactOrganizer } from "../src/reports/artifact-organizer";
import { DefaultReportRegistry } from "../src/reports/default-report-registry";
import { ReportEngine } from "../src/reports/report-engine";
import { oneFailedRun, zeroDifferenceRun } from "./fixtures/report-fixtures";

class SilentLogger implements Logger {
  public readonly messages: string[] = [];
  public info(message: string): void {
    this.messages.push(message);
  }
  public error(): void {}
}

class NullStorage implements Storage {
  public async save(filePath: string): Promise<string> {
    return filePath;
  }
  public async read(): Promise<Uint8Array> {
    return new Uint8Array([0]);
  }
}

class RecordingReport implements Report {
  public calls = 0;
  public constructor(
    public readonly id = "html",
    public readonly name = "HTML"
  ) {}
  public async generate(_run: ValidationRun, context: ReportContext): Promise<ReportResult> {
    this.calls += 1;
    return {
      reportId: this.id,
      reportName: this.name,
      outputPath: `${context.reportDirectory}/index.html`,
      generatedAt: context.generatedAt,
      success: true,
      metadata: {},
    };
  }
}

const config = (overrides: Partial<ReportConfiguration> = {}): ReportConfiguration => ({
  enabled: true,
  outputDirectory: "artifacts",
  html: { enabled: true },
  json: { enabled: true },
  ...overrides,
});

function engineWith(reports: { report: Report; enabled: boolean }[], configuration: ReportConfiguration): ReportEngine {
  const logger = new SilentLogger();
  return new ReportEngine(
    logger,
    new DefaultReportRegistry(reports, configuration.enabled),
    new ArtifactOrganizer(new NullStorage(), logger),
    configuration
  );
}

test("generates every enabled report and reports the run directory", async () => {
  const html = new RecordingReport("html", "HTML");
  const json = new RecordingReport("json", "JSON");
  const engine = engineWith(
    [
      { report: html, enabled: true },
      { report: json, enabled: true },
    ],
    config()
  );

  const result = await engine.generate(oneFailedRun);

  assert.equal(html.calls, 1);
  assert.equal(json.calls, 1);
  assert.equal(result.reports.length, 2);
  assert.equal(result.runDirectory, `artifacts/runs/${oneFailedRun.executionId}`);
});

test("skips report generation when reporting is disabled", async () => {
  const html = new RecordingReport();
  const engine = engineWith([{ report: html, enabled: true }], config({ enabled: false }));

  const result = await engine.generate(zeroDifferenceRun);

  assert.equal(html.calls, 0);
  assert.deepEqual(result.reports, []);
  assert.equal(result.runDirectory, `artifacts/runs/${zeroDifferenceRun.executionId}`);
});

test("honours disabling an individual report format", async () => {
  const html = new RecordingReport("html", "HTML");
  const json = new RecordingReport("json", "JSON");
  const engine = engineWith(
    [
      { report: html, enabled: true },
      { report: json, enabled: false },
    ],
    config({ json: { enabled: false } })
  );

  const result = await engine.generate(zeroDifferenceRun);

  assert.equal(html.calls, 1);
  assert.equal(json.calls, 0);
  assert.deepEqual(
    result.reports.map((report) => report.reportId),
    ["html"]
  );
});

test("does not silently hide a report generation failure", async () => {
  const failing: Report = {
    id: "html",
    name: "HTML",
    generate: async () => {
      throw new Error("disk full");
    },
  };
  const engine = engineWith([{ report: failing, enabled: true }], config());

  await assert.rejects(engine.generate(oneFailedRun), (error: unknown) => {
    assert.ok(error instanceof ReportGenerationException);
    assert.match((error as Error).message, /Unable to generate validation reports/);
    return true;
  });
});
