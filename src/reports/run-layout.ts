import { posix } from "node:path";

/** Absolute-within-project directory paths that isolate one execution's artifacts. */
export interface RunLayout {
  runDirectory: string;
  reportDirectory: string;
  evidenceDirectory: string;
  referenceDirectory: string;
  diffDirectory: string;
}

/**
 * Derives the directory layout for an execution.
 *
 * Every path is built with POSIX separators so generated reports reference
 * artifacts with portable forward slashes regardless of the host platform.
 */
export function createRunLayout(outputDirectory: string, executionId: string): RunLayout {
  const runDirectory = posix.join(toPosix(outputDirectory), "runs", executionId);

  return {
    runDirectory,
    reportDirectory: posix.join(runDirectory, "report"),
    evidenceDirectory: posix.join(runDirectory, "evidence"),
    referenceDirectory: posix.join(runDirectory, "references"),
    diffDirectory: posix.join(runDirectory, "diffs"),
  };
}

/** Computes a portable, relative reference from the report directory to a target. */
export function relativeFromReport(reportDirectory: string, targetPath: string): string {
  return toPosix(posix.relative(reportDirectory, targetPath));
}

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}
