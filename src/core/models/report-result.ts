/** Technology-independent outcome of generating a single report. */
export interface ReportResult {
  /** Stable identifier of the report that produced this result (e.g. "html", "json"). */
  reportId: string;
  /** Human-readable report name. */
  reportName: string;
  /** Path to the primary generated file, relative to the configured output directory root. */
  outputPath: string;
  generatedAt: Date;
  success: boolean;
  /** Sanitized, string-only diagnostic details. Never contains secrets. */
  metadata: Record<string, string>;
}
