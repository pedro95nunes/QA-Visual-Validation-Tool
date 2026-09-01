import { ActionContext } from "./action-context";
import { ActionResult } from "./action-result";

/**
 * Side-effect that executes based on a validation outcome.
 *
 * Each Action is a self-contained integration point (Qase, Slack, Jira, …).
 * Actions are discovered via the {@link ActionRegistry} and controlled by {@link ActionPolicy}.
 */
export interface Action {
  readonly id: string;
  readonly name: string;
  execute(context: ActionContext): Promise<ActionResult>;
}
