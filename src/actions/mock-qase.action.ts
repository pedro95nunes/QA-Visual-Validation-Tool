import { Action } from "../core/interfaces/action";
import { ActionContext } from "../core/interfaces/action-context";
import { ActionResult, ActionStatus } from "../core/interfaces/action-result";
import { ValidationStatus } from "../core/models/validation-status";

/**
 * Placeholder Qase integration that demonstrates the Action contract.
 *
 * Does NOT make real Qase API calls. It logs what a real implementation
 * would do, proving that Qase can be added without touching the
 * ValidationEngine, VisualValidationPlugin, or ReportEngine.
 *
 * Future implementation will replace the execute() body with:
 *   QaseClient.createDefect(title, description, attachments)
 *
 * Defect title format: [BUG][Visual Automation] <page> visual difference
 */
export class MockQaseAction implements Action {
  public readonly id = "qase";
  public readonly name = "Qase";

  public async execute(context: ActionContext): Promise<ActionResult> {
    const startedAt = performance.now();

    const failedResults = context.run.executions
      .flatMap((execution) => execution.results)
      .filter((result) => result.status === ValidationStatus.Failed);

    if (failedResults.length === 0) {
      const message = "No visual failures — no Qase defects would be created.";
      context.logger.info(`Mock Qase: ${message}`);
      return {
        actionId: this.id,
        actionName: this.name,
        success: true,
        status: ActionStatus.Executed,
        duration: performance.now() - startedAt,
        message,
        metadata: { defectsWouldBeCreated: 0 },
      };
    }

    const defectTitles = failedResults.map((result) => `[BUG][Visual Automation] ${result.pageId} visual difference`);

    for (const title of defectTitles) {
      context.logger.info(`Mock Qase: Would create defect — "${title}"`);
    }

    const message = `Would create ${defectTitles.length} defect(s) in Qase.`;
    context.logger.info(`Mock Qase: ${message}`);

    return {
      actionId: this.id,
      actionName: this.name,
      success: true,
      status: ActionStatus.Executed,
      duration: performance.now() - startedAt,
      message,
      metadata: {
        executionId: context.run.executionId,
        environment: context.environment,
        defectsWouldBeCreated: defectTitles.length,
        defectTitles,
      },
    };
  }
}
