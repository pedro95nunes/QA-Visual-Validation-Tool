/** Describes the outcome of an evidence-to-reference comparison. */
export enum ComparisonStatus {
  Passed = "PASSED",
  Failed = "FAILED",
  IncompatibleDimensions = "INCOMPATIBLE_DIMENSIONS",
  InvalidReference = "INVALID_REFERENCE",
  InvalidEvidence = "INVALID_EVIDENCE",
  Error = "ERROR",
}
