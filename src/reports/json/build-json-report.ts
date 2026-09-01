import { ReportContext } from "../../core/interfaces/report";
import { ValidationResult } from "../../core/models/validation-result";
import { ValidationRun } from "../../core/models/validation-run";
import { redactMetadata } from "../redact";

/** Machine-readable projection of a {@link ValidationRun}. Safe to serialize as-is. */
export interface JsonReportDocument {
  execution: {
    id: string;
    status: string;
    startedAt: string;
    finishedAt: string;
    duration: number;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
  };
  environment: {
    nodeVersion: string;
    platform: string;
  };
  plugins: Array<{
    id: string;
    status: string;
    total: number;
    passed: number;
    failed: number;
    errors: number;
    duration: number;
  }>;
  pages: JsonReportPage[];
}

export interface JsonReportPage {
  id: string;
  url: string | null;
  status: string;
  failureKind: string | null;
  duration: number;
  findings: string[];
  metrics: Record<string, number>;
  comparison: {
    status: string;
    differencePercentage: number;
    differentPixels: number;
    totalPixels: number;
    allowedDifferencePercentage: number;
    width: number | null;
    height: number | null;
    metadata: Record<string, string>;
  } | null;
  artifacts: {
    evidence: string | null;
    reference: string | null;
    diff: string | null;
  };
}

/**
 * Builds the JSON document from generic run data only. It reuses the counts on
 * {@link ValidationRun} and never re-derives them from page results.
 */
export function buildJsonReport(run: ValidationRun, context: ReportContext): JsonReportDocument {
  return {
    execution: {
      id: run.executionId,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt.toISOString(),
      duration: run.duration,
    },
    summary: { ...run.summary },
    environment: { ...run.environment },
    plugins: run.executions.map((execution) => ({
      id: execution.pluginId,
      status: execution.status,
      total: execution.total,
      passed: execution.passed,
      failed: execution.failed,
      errors: execution.errors,
      duration: round(execution.duration),
    })),
    pages: run.executions.flatMap((execution) => execution.results.map((result) => toPage(result, context))),
  };
}

function toPage(result: ValidationResult, context: ReportContext): JsonReportPage {
  const artifacts = context.artifacts[result.pageId] ?? {};

  return {
    id: result.pageId,
    url: result.url ?? null,
    status: result.status,
    failureKind: result.failureKind ?? null,
    duration: round(result.duration),
    findings: [...result.findings],
    metrics: { ...result.metrics },
    comparison: result.comparison
      ? {
          status: result.comparison.status,
          differencePercentage: result.comparison.differencePercentage,
          differentPixels: result.comparison.differentPixels,
          totalPixels: result.comparison.totalPixels,
          allowedDifferencePercentage: result.comparison.allowedDifferencePercentage,
          width: result.comparison.width ?? null,
          height: result.comparison.height ?? null,
          metadata: redactMetadata(result.comparison.metadata),
        }
      : null,
    artifacts: {
      evidence: artifacts.evidence ?? null,
      reference: artifacts.reference ?? null,
      diff: artifacts.diff ?? null,
    },
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
