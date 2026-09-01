import { Report } from "../core/interfaces/report";
import { ReportRegistry } from "../core/interfaces/report-registry";

/** A report paired with whether configuration has enabled it. */
export interface RegisteredReport {
  report: Report;
  enabled: boolean;
}

/**
 * Selects reports purely from configuration. New formats (JUnit XML, Markdown,
 * PDF, Allure, …) are added by registering another {@link RegisteredReport};
 * no orchestration code changes.
 */
export class DefaultReportRegistry implements ReportRegistry {
  private readonly registered: RegisteredReport[];

  public constructor(
    registered: RegisteredReport[],
    private readonly reportingEnabled: boolean
  ) {
    this.registered = [...registered];
  }

  public enabledReports(): Report[] {
    if (!this.reportingEnabled) {
      return [];
    }

    return this.registered.filter((entry) => entry.enabled).map((entry) => entry.report);
  }
}
