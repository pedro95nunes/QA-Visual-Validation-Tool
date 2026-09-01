import { ReportResult } from "../models/report-result";
import { ValidationRun } from "../models/validation-run";

/** Relative locations (from the report directory) of a page's organized artifacts. */
export interface PageArtifactPaths {
  evidence?: string;
  reference?: string;
  diff?: string;
}

/** Filesystem context handed to a report so it can reference organized artifacts. */
export interface ReportContext {
  executionId: string;
  /** Directory that isolates every artifact produced by this execution. */
  runDirectory: string;
  /** Directory where report files must be written. */
  reportDirectory: string;
  /** Per-page artifact paths, relative to {@link ReportContext.reportDirectory}. */
  artifacts: Record<string, PageArtifactPaths>;
  generatedAt: Date;
}

/**
 * A renderer that turns a generic {@link ValidationRun} into a persisted artifact.
 *
 * Implementations must not depend on how the validation was performed
 * (browser, design provider, or comparison engine).
 */
export interface Report {
  readonly id: string;
  readonly name: string;
  generate(run: ValidationRun, context: ReportContext): Promise<ReportResult>;
}
