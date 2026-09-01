import { Report } from "./report";

/** Resolves the reports that configuration has enabled for an execution. */
export interface ReportRegistry {
  enabledReports(): Report[];
}
