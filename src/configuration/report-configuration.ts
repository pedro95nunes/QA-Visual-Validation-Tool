/** Enables or disables a single report format. */
export interface ReportFormatConfiguration {
  enabled: boolean;
}

/** Controls report generation and where run artifacts are organized. */
export interface ReportConfiguration {
  /** Master switch for the whole reporting layer. */
  enabled: boolean;
  /** Root directory under which per-execution run folders are created. */
  outputDirectory: string;
  html: ReportFormatConfiguration;
  json: ReportFormatConfiguration;
}
