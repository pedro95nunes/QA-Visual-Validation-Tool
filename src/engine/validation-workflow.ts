import { Logger } from "../core/interfaces/logger";
import { ExecutionIdFactory } from "../core/interfaces/execution-id-factory";
import { EventBus } from "../core/interfaces/event-bus";
import { ReportResult } from "../core/models/report-result";
import { RunEnvironment, ValidationRun } from "../core/models/validation-run";
import { VALIDATION_COMPLETED } from "../core/events/validation-completed.event";
import { VALIDATION_STARTED } from "../core/events/validation-started.event";
import { VALIDATION_FAILED } from "../core/events/validation-failed.event";
import { ValidationEngine } from "./validation-engine";
import { ReportEngine } from "../reports/report-engine";
import { buildValidationRun } from "../reports/run-aggregator";

/** Everything the CLI needs after a validation run: the aggregate and its reports. */
export interface ValidationWorkflowResult {
  run: ValidationRun;
  reports: ReportResult[];
  runDirectory: string;
}

/**
 * Application-level orchestration that connects validation to reporting without
 * either side depending on the other. It owns the execution identity, runs the
 * {@link ValidationEngine}, builds the canonical {@link ValidationRun}, and then
 * hands it to the {@link ReportEngine}.
 *
 * After building the run, it publishes {@link ValidationCompletedEvent} on the
 * {@link EventBus}. The {@link ActionEngine} subscribes to that event and executes
 * eligible actions independently — the workflow never calls actions directly.
 */
export class ValidationWorkflow {
  public constructor(
    private readonly logger: Logger,
    private readonly engine: ValidationEngine,
    private readonly reportEngine: ReportEngine,
    private readonly executionIdFactory: ExecutionIdFactory,
    private readonly environment: () => RunEnvironment = defaultEnvironment,
    private readonly eventBus?: EventBus
  ) {}

  public async run(): Promise<ValidationWorkflowResult> {
    const executionId = this.executionIdFactory.create();
    this.logger.info(`Execution ID: ${executionId}`);

    await this.eventBus?.publish({
      type: VALIDATION_STARTED,
      occurredAt: new Date(),
      executionId,
    });

    const startedAt = new Date();

    let executions;
    try {
      executions = await this.engine.execute(executionId);
    } catch (error) {
      await this.eventBus?.publish({
        type: VALIDATION_FAILED,
        occurredAt: new Date(),
        executionId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }

    const finishedAt = new Date();

    const run = buildValidationRun({
      executionId,
      startedAt,
      finishedAt,
      executions,
      environment: this.environment(),
    });

    this.logger.info("Validation completed. Publishing ValidationCompletedEvent.");
    await this.eventBus?.publish({
      type: VALIDATION_COMPLETED,
      occurredAt: new Date(),
      executionId,
      run,
    });

    const { reports, runDirectory } = await this.reportEngine.generate(run);
    return { run, reports, runDirectory };
  }
}

function defaultEnvironment(): RunEnvironment {
  return { nodeVersion: process.version, platform: process.platform };
}
