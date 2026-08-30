import { randomUUID } from "node:crypto";
import { ValidationException } from "../core/exceptions/validation.exception";
import { Logger } from "../core/interfaces/logger";
import { ValidationPluginRegistry } from "../core/interfaces/validation-plugin-registry";
import { ValidationExecutionResult } from "../core/models/validation-execution-result";

/** Resolves configured plugins and aggregates their generic validation results. */
export class ValidationEngine {
  public constructor(
    private readonly logger: Logger,
    private readonly pluginRegistry: ValidationPluginRegistry,
    private readonly enabledPluginIds: string[]
  ) {}

  public async execute(): Promise<ValidationExecutionResult[]> {
    this.logger.info("Validation started.");

    try {
      const context = { executionId: randomUUID() };
      const results = await Promise.all(
        this.enabledPluginIds.map((pluginId) => this.pluginRegistry.resolve(pluginId).execute(context))
      );
      this.logAggregateResults(results);
      return results;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }

      throw new ValidationException("Validation execution failed.", toError(error));
    } finally {
      this.logger.info("Validation finished.");
    }
  }

  private logAggregateResults(results: ValidationExecutionResult[]): void {
    for (const result of results) {
      this.logger.info(
        `${result.pluginId}: ${result.status} (${result.passed}/${result.total} passed, ${result.failed} failed, ${result.errors} errors).`
      );
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
