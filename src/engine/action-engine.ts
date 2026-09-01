import { ActionExecutionException } from "../core/exceptions/action-execution.exception";
import { Action } from "../core/interfaces/action";
import { ActionContext } from "../core/interfaces/action-context";
import { ActionPolicyEvaluator } from "../core/interfaces/action-policy-evaluator";
import { ActionRegistry } from "../core/interfaces/action-registry";
import { ActionResult, ActionStatus } from "../core/interfaces/action-result";
import { EventHandler } from "../core/interfaces/event-handler";
import { Logger } from "../core/interfaces/logger";
import { ActionsConfiguration } from "../configuration/action-configuration";
import { ValidationCompletedEvent } from "../core/events/validation-completed.event";
import { ValidationRun } from "../core/models/validation-run";

/**
 * Discovers registered Actions, evaluates their policies, and executes eligible ones.
 *
 * Execution strategy: Promise.allSettled — actions run concurrently and one failure
 * never prevents others from completing. The ValidationRun is never mutated.
 *
 * The engine subscribes to {@link ValidationCompletedEvent} via {@link EventHandler},
 * so ValidationEngine and VisualValidationPlugin are unaware of it.
 */
export class ActionEngine implements EventHandler<ValidationCompletedEvent> {
  public constructor(
    private readonly logger: Logger,
    private readonly actionRegistry: ActionRegistry,
    private readonly policyEvaluator: ActionPolicyEvaluator,
    private readonly actionsConfig: ActionsConfiguration,
    private readonly environment: string
  ) {}

  public async handle(event: ValidationCompletedEvent): Promise<void> {
    await this.execute(event.run);
  }

  public async execute(run: ValidationRun): Promise<ActionResult[]> {
    const actions = this.actionRegistry.all();
    this.logger.info(`Action Engine: evaluating ${actions.length} registered action(s).`);

    const eligible: Action[] = [];
    const skipped: Array<{ id: string; name: string; reason: string }> = [];

    for (const action of actions) {
      const policy = this.actionsConfig[action.id] ?? { enabled: false };
      this.logger.info(`Evaluating action: ${action.name}`);
      this.logger.info(`  enabled      = ${policy.enabled}`);
      this.logger.info(`  environment  = ${this.environment || "(none)"}`);
      this.logger.info(`  onlyOnFailure= ${policy.onlyOnFailure ?? false}`);
      this.logger.info(`  run status   = ${run.status}`);

      if (this.policyEvaluator.isEligible(action.id, policy, run, this.environment)) {
        this.logger.info(`  → eligible`);
        eligible.push(action);
      } else {
        const reason = this.skipReason(policy, run);
        this.logger.info(`  → skipped (${reason})`);
        skipped.push({ id: action.id, name: action.name, reason });
      }
    }

    this.logger.info(`Action Engine: ${eligible.length} eligible, ${skipped.length} skipped.`);

    const context: ActionContext = {
      executionId: run.executionId,
      environment: this.environment,
      run,
      logger: this.logger,
    };

    const settled = await Promise.allSettled(eligible.map((action) => this.executeOne(action, context)));

    const results: ActionResult[] = settled.map((outcome, index) => {
      if (outcome.status === "fulfilled") {
        return outcome.value;
      }
      const action = eligible[index];
      const message = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      this.logger.error(`Action ${action.name} failed: ${message}`);
      return {
        actionId: action.id,
        actionName: action.name,
        success: false,
        status: ActionStatus.Failed,
        duration: 0,
        message,
        metadata: {},
      };
    });

    this.logSummary(results, skipped);
    return results;
  }

  private async executeOne(action: Action, context: ActionContext): Promise<ActionResult> {
    this.logger.info(`Executing action: ${action.name}`);
    const startedAt = performance.now();
    try {
      const result = await action.execute(context);
      this.logger.info(`Action ${action.name} completed: ${result.status}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ActionExecutionException(
        `Action "${action.name}" threw an unexpected error: ${message}`,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      const duration = performance.now() - startedAt;
      this.logger.info(`Action ${action.name} duration: ${duration.toFixed(1)}ms`);
    }
  }

  private skipReason(
    policy: { enabled: boolean; environments?: string[]; onlyOnFailure?: boolean },
    _run: ValidationRun
  ): string {
    if (!policy.enabled) return "disabled in configuration";
    if (policy.environments && policy.environments.length > 0 && !policy.environments.includes(this.environment)) {
      return `environment "${this.environment}" not in [${policy.environments.join(", ")}]`;
    }
    if (policy.onlyOnFailure) return "onlyOnFailure: validation passed";
    return "policy not satisfied";
  }

  private logSummary(results: ActionResult[], skipped: Array<{ id: string; name: string; reason: string }>): void {
    this.logger.info("Actions:");
    for (const result of results) {
      const icon = result.success ? "✔" : "✖";
      this.logger.info(`  ${icon} ${result.actionName}`);
    }
    for (const s of skipped) {
      this.logger.info(`  - ${s.name}: Skipped (${s.reason})`);
    }
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    this.logger.info(
      `Action Engine: ${results.length} executed (${succeeded} succeeded, ${failed} failed), ${skipped.length} skipped.`
    );
  }
}
