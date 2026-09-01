import { RunEnvironment, RunSummary, ValidationRun } from "../core/models/validation-run";
import { ValidationExecutionResult } from "../core/models/validation-execution-result";
import { ValidationStatus } from "../core/models/validation-status";

export interface BuildValidationRunInput {
  executionId: string;
  startedAt: Date;
  finishedAt: Date;
  executions: ValidationExecutionResult[];
  environment: RunEnvironment;
}

/**
 * Builds the canonical run-level aggregate from the Sprint 6 per-plugin results.
 *
 * Totals are summed from the plugin aggregates that already computed them; they
 * are never recalculated from individual page results, so the report layer and
 * the engine cannot disagree.
 */
export function buildValidationRun(input: BuildValidationRunInput): ValidationRun {
  const summary = summarize(input.executions);

  return {
    executionId: input.executionId,
    status: resolveStatus(summary),
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    duration: Math.max(0, input.finishedAt.getTime() - input.startedAt.getTime()),
    summary,
    environment: input.environment,
    executions: input.executions,
  };
}

function summarize(executions: ValidationExecutionResult[]): RunSummary {
  return executions.reduce<RunSummary>(
    (totals, execution) => ({
      total: totals.total + execution.total,
      passed: totals.passed + execution.passed,
      failed: totals.failed + execution.failed,
      errors: totals.errors + execution.errors,
    }),
    { total: 0, passed: 0, failed: 0, errors: 0 }
  );
}

function resolveStatus(summary: RunSummary): ValidationStatus {
  if (summary.errors > 0) {
    return ValidationStatus.Error;
  }
  if (summary.failed > 0) {
    return ValidationStatus.Failed;
  }
  return ValidationStatus.Passed;
}
