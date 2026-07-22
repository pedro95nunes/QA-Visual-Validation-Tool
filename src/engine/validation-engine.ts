import { Logger } from "../core/interfaces/logger";
import { ExecutionStatus } from "../core/models/execution-status";

/** Coordinates the current validation application flow. */
export class ValidationEngine {
  public constructor(private readonly logger: Logger) {}

  public execute(): ExecutionStatus {
    this.logger.info("Validation Engine started.");
    this.logger.info("Validation finished successfully.");

    return ExecutionStatus.Succeeded;
  }
}
