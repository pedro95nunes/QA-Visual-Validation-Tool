import { posix } from "node:path";
import { Report, ReportContext } from "../../core/interfaces/report";
import { ReportResult } from "../../core/models/report-result";
import { ValidationRun } from "../../core/models/validation-run";
import { Storage } from "../../core/interfaces/storage";
import { buildJsonReport } from "./build-json-report";

export const JSON_REPORT_ID = "json";
const JSON_REPORT_FILE = "report.json";

/** Writes a machine-readable JSON report for downstream automation. */
export class JsonReport implements Report {
  public readonly id = JSON_REPORT_ID;
  public readonly name = "JSON";

  public constructor(private readonly storage: Storage) {}

  public async generate(run: ValidationRun, context: ReportContext): Promise<ReportResult> {
    const document = buildJsonReport(run, context);
    const serialized = `${JSON.stringify(document, null, 2)}\n`;
    const outputPath = posix.join(context.reportDirectory, JSON_REPORT_FILE);
    const storedPath = await this.storage.save(outputPath, Buffer.from(serialized, "utf8"));

    return {
      reportId: this.id,
      reportName: this.name,
      outputPath: storedPath,
      generatedAt: context.generatedAt,
      success: true,
      metadata: {
        pages: String(document.summary.total),
        status: document.execution.status,
      },
    };
  }
}
