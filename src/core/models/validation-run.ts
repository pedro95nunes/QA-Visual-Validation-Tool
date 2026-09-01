import { ValidationExecutionResult } from "./validation-execution-result";
import { ValidationStatus } from "./validation-status";

/** Cross-plugin totals for a single validation execution. */
export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
}

/** Non-sensitive description of where a validation run was executed. */
export interface RunEnvironment {
  nodeVersion: string;
  platform: string;
}

/**
 * Canonical run-level aggregate consumed by the report layer.
 *
 * It composes the Sprint 6 per-plugin {@link ValidationExecutionResult} aggregates
 * and adds run identity, timing, and environment. Counts are summed from the
 * plugin aggregates; they are never recomputed from individual page results.
 */
export interface ValidationRun {
  executionId: string;
  status: ValidationStatus;
  startedAt: Date;
  finishedAt: Date;
  /** Wall-clock duration of the run, in milliseconds. */
  duration: number;
  summary: RunSummary;
  environment: RunEnvironment;
  executions: ValidationExecutionResult[];
}
