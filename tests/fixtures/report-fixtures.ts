import { ComparisonResult } from "../../src/core/models/comparison-result";
import { ComparisonStatus } from "../../src/core/models/comparison-status";
import { Evidence } from "../../src/core/models/evidence";
import { Reference } from "../../src/core/models/reference";
import { ValidationExecutionResult } from "../../src/core/models/validation-execution-result";
import { ValidationFailureKind } from "../../src/core/models/validation-failure-kind";
import { ValidationResult } from "../../src/core/models/validation-result";
import { ValidationRun } from "../../src/core/models/validation-run";
import { ValidationStatus } from "../../src/core/models/validation-status";
import { buildValidationRun } from "../../src/reports/run-aggregator";

const STARTED_AT = new Date("2026-08-31T21:30:00.000Z");
const FINISHED_AT = new Date("2026-08-31T21:31:02.370Z");
const ENVIRONMENT = { nodeVersion: "v22.17.1", platform: "linux" };

export function evidenceFor(pageId: string): Evidence {
  return {
    id: `${pageId}-evidence`,
    name: pageId,
    filePath: `artifacts/evidence/${pageId}-src.png`,
    createdAt: STARTED_AT,
    width: 1440,
    height: 900,
    metadata: { fullPage: "true", imageFormat: "png" },
  };
}

export function referenceFor(pageId: string): Reference {
  return {
    id: `${pageId}-reference`,
    name: pageId,
    source: "figma",
    localPath: `artifacts/references/${pageId}-src.png`,
    downloadedAt: STARTED_AT,
    width: 1440,
    height: 900,
    metadata: { fileKey: "abc123", nodeId: "1:2", imageFormat: "png" },
  };
}

export function comparison(overrides: Partial<ComparisonResult> = {}): ComparisonResult {
  return {
    status: ComparisonStatus.Passed,
    differencePercentage: 0,
    differentPixels: 0,
    totalPixels: 1_296_000,
    width: 1440,
    height: 900,
    threshold: 0.1,
    pixelThreshold: 0.1,
    allowedDifferencePercentage: 1,
    passed: true,
    metadata: {},
    duration: 12.5,
    ...overrides,
  };
}

export function passedPage(pageId: string, differencePercentage = 0.12): ValidationResult {
  return {
    pageId,
    url: `https://example.com/${pageId}`,
    status: ValidationStatus.Passed,
    comparison: comparison({
      status: ComparisonStatus.Passed,
      differencePercentage,
      differentPixels: Math.round((differencePercentage / 100) * 1_296_000),
      passed: true,
      diffImage: differencePercentage > 0 ? `artifacts/diffs/${pageId}-diff-src.png` : undefined,
    }),
    evidence: evidenceFor(pageId),
    reference: referenceFor(pageId),
    duration: 5_400,
    findings: [],
    metrics: { differencePercentage, differentPixels: 0, totalPixels: 1_296_000 },
  };
}

export function failedPage(pageId: string, differencePercentage = 4.7): ValidationResult {
  const differentPixels = Math.round((differencePercentage / 100) * 1_296_000);
  return {
    pageId,
    url: `https://example.com/${pageId}`,
    status: ValidationStatus.Failed,
    comparison: comparison({
      status: ComparisonStatus.Failed,
      differencePercentage,
      differentPixels,
      passed: false,
      diffImage: `artifacts/diffs/${pageId}-diff-src.png`,
    }),
    evidence: evidenceFor(pageId),
    reference: referenceFor(pageId),
    duration: 6_120,
    findings: [`Comparison result: ${ComparisonStatus.Failed}.`],
    metrics: { differencePercentage, differentPixels, totalPixels: 1_296_000 },
  };
}

export function incompatibleDimensionsPage(pageId: string): ValidationResult {
  return {
    pageId,
    url: `https://example.com/${pageId}`,
    status: ValidationStatus.Error,
    comparison: comparison({
      status: ComparisonStatus.IncompatibleDimensions,
      passed: false,
      width: 1280,
      height: 720,
      metadata: { referenceDimensions: "1440x900", evidenceDimensions: "1280x720" },
    }),
    evidence: evidenceFor(pageId),
    reference: referenceFor(pageId),
    duration: 3_100,
    findings: [`Comparison result: ${ComparisonStatus.IncompatibleDimensions}.`],
    metrics: {},
  };
}

export function executionErrorPage(pageId: string): ValidationResult {
  return {
    pageId,
    url: `https://example.com/${pageId}`,
    status: ValidationStatus.Error,
    failureKind: ValidationFailureKind.Execution,
    duration: 900,
    findings: ["net::ERR_CONNECTION_REFUSED at https://example.com/broken", "Navigation timeout of 30000 ms exceeded"],
    metrics: {},
  };
}

export function executionFrom(results: ValidationResult[], pluginId = "visual-validation"): ValidationExecutionResult {
  const passed = results.filter((result) => result.status === ValidationStatus.Passed).length;
  const failed = results.filter((result) => result.status === ValidationStatus.Failed).length;
  const errors = results.filter((result) => result.status === ValidationStatus.Error).length;

  return {
    pluginId,
    status: errors > 0 ? ValidationStatus.Error : failed > 0 ? ValidationStatus.Failed : ValidationStatus.Passed,
    results,
    total: results.length,
    passed,
    failed,
    errors,
    duration: results.reduce((total, result) => total + result.duration, 0),
  };
}

export function runFrom(results: ValidationResult[], executionId = "2026-08-31T21-30-00Z-a8f31"): ValidationRun {
  return buildValidationRun({
    executionId,
    startedAt: STARTED_AT,
    finishedAt: FINISHED_AT,
    executions: [executionFrom(results)],
    environment: ENVIRONMENT,
  });
}

/** 1. Every page passed. */
export const allPassedRun = runFrom([passedPage("homepage", 0.12), passedPage("about", 0), passedPage("contact", 0.4)]);

/** 2. One page failed. */
export const oneFailedRun = runFrom([
  passedPage("homepage", 0.12),
  failedPage("about", 4.7),
  passedPage("contact", 0.2),
]);

/** 3. Multiple pages failed. */
export const multipleFailedRun = runFrom([
  failedPage("homepage", 6.1),
  failedPage("about", 4.7),
  passedPage("contact", 0.2),
]);

/** 4. Execution error. */
export const executionErrorRun = runFrom([passedPage("homepage", 0.1), executionErrorPage("about")]);

/** 5. Incompatible image dimensions. */
export const incompatibleDimensionsRun = runFrom([passedPage("homepage", 0.1), incompatibleDimensionsPage("about")]);

/** 6. Zero visual difference. */
export const zeroDifferenceRun = runFrom([passedPage("homepage", 0)]);

/** 7. Difference below the allowed threshold. */
export const belowThresholdRun = runFrom([passedPage("homepage", 0.6)]);

/** 8. Difference above the allowed threshold. */
export const aboveThresholdRun = runFrom([failedPage("homepage", 3.9)]);

export const FIXTURE_STARTED_AT = STARTED_AT;
export const FIXTURE_FINISHED_AT = FINISHED_AT;
export const FIXTURE_ENVIRONMENT = ENVIRONMENT;
