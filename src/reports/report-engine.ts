import { ReportConfiguration } from "../configuration/report-configuration";
import { ReportGenerationException } from "../core/exceptions/report-generation.exception";
import { Logger } from "../core/interfaces/logger";
import { ReportContext } from "../core/interfaces/report";
import { ReportRegistry } from "../core/interfaces/report-registry";
import { ReportResult } from "../core/models/report-result";
import { ValidationRun } from "../core/models/validation-run";
import { ArtifactOrganizer } from "./artifact-organizer";
import { createRunLayout } from "./run-layout";

/** Outcome of a report-engine invocation. */
export interface ReportEngineResult {
  reports: ReportResult[];
  /** Directory that isolates this execution's artifacts, whether or not reports ran. */
  runDirectory: string;
}

/**
 * Application-level orchestration of the report layer. It organizes artifacts
 * into an isolated run directory, then asks every configured {@link Report} to
 * render itself. It consumes only the generic {@link ValidationRun}.
 */
export class ReportEngine {
  public constructor(
    private readonly logger: Logger,
    private readonly registry: ReportRegistry,
    private readonly organizer: ArtifactOrganizer,
    private readonly configuration: ReportConfiguration
  ) {}

  public async generate(run: ValidationRun): Promise<ReportEngineResult> {
    const layout = createRunLayout(this.configuration.outputDirectory, run.executionId);
    const reports = this.registry.enabledReports();

    if (reports.length === 0) {
      this.logger.info("Report generation is disabled.");
      return { reports: [], runDirectory: layout.runDirectory };
    }

    this.logger.info("Generating reports...");

    try {
      const artifacts = await this.organizer.organize(run, layout);
      const context: ReportContext = {
        executionId: run.executionId,
        runDirectory: layout.runDirectory,
        reportDirectory: layout.reportDirectory,
        artifacts,
        generatedAt: new Date(),
      };

      const results: ReportResult[] = [];
      for (const report of reports) {
        const result = await report.generate(run, context);
        this.logger.info(`${report.name} report generated: ${result.outputPath}`);
        results.push(result);
      }

      this.logger.info(`Artifacts stored in: ${layout.runDirectory}`);
      return { reports: results, runDirectory: layout.runDirectory };
    } catch (error) {
      throw new ReportGenerationException("Unable to generate validation reports.", toError(error));
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
