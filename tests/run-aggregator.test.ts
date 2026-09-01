import assert from "node:assert/strict";
import test from "node:test";
import { ValidationStatus } from "../src/core/models/validation-status";
import { buildValidationRun } from "../src/reports/run-aggregator";
import { executionFrom, failedPage, executionErrorPage, passedPage } from "./fixtures/report-fixtures";

const environment = { nodeVersion: "v22.17.1", platform: "linux" };

test("sums the Sprint 6 plugin aggregates without recomputing per page", () => {
  const run = buildValidationRun({
    executionId: "run-1",
    startedAt: new Date("2026-08-31T21:30:00.000Z"),
    finishedAt: new Date("2026-08-31T21:30:10.000Z"),
    executions: [
      executionFrom([passedPage("homepage"), failedPage("about")], "visual-validation"),
      executionFrom([passedPage("contact")], "another-plugin"),
    ],
    environment,
  });

  assert.deepEqual(run.summary, { total: 3, passed: 2, failed: 1, errors: 0 });
  assert.equal(run.status, ValidationStatus.Failed);
  assert.equal(run.duration, 10_000);
});

test("marks the run as an error when any plugin reports an error", () => {
  const run = buildValidationRun({
    executionId: "run-2",
    startedAt: new Date("2026-08-31T21:30:00.000Z"),
    finishedAt: new Date("2026-08-31T21:30:01.000Z"),
    executions: [executionFrom([passedPage("homepage"), executionErrorPage("about")])],
    environment,
  });

  assert.equal(run.status, ValidationStatus.Error);
  assert.equal(run.summary.errors, 1);
});

test("reports a passed run when every plugin passed", () => {
  const run = buildValidationRun({
    executionId: "run-3",
    startedAt: new Date("2026-08-31T21:30:00.000Z"),
    finishedAt: new Date("2026-08-31T21:30:05.000Z"),
    executions: [executionFrom([passedPage("homepage"), passedPage("about")])],
    environment,
  });

  assert.equal(run.status, ValidationStatus.Passed);
  assert.equal(run.summary.passed, 2);
  assert.equal(run.environment.platform, "linux");
});
