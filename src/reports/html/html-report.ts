import { posix } from "node:path";
import { Report, ReportContext } from "../../core/interfaces/report";
import { ReportResult } from "../../core/models/report-result";
import { ValidationRun } from "../../core/models/validation-run";
import { Storage } from "../../core/interfaces/storage";
import { renderReportHtml } from "./render-html";

export const HTML_REPORT_ID = "html";
const HTML_REPORT_FILE = "index.html";

/** Writes a human-readable, portable static HTML report for a validation run. */
export class HtmlReport implements Report {
  public readonly id = HTML_REPORT_ID;
  public readonly name = "HTML";

  public constructor(private readonly storage: Storage) {}

  public async generate(run: ValidationRun, context: ReportContext): Promise<ReportResult> {
    const html = renderReportHtml(run, context);
    const outputPath = posix.join(context.reportDirectory, HTML_REPORT_FILE);
    const storedPath = await this.storage.save(outputPath, Buffer.from(html, "utf8"));

    return {
      reportId: this.id,
      reportName: this.name,
      outputPath: storedPath,
      generatedAt: context.generatedAt,
      success: true,
      metadata: {
        pages: String(run.summary.total),
        failed: String(run.summary.failed),
        status: run.status,
      },
    };
  }
}
