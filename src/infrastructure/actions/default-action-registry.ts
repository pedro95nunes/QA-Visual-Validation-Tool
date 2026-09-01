import { ActionConfigurationException } from "../../core/exceptions/action-configuration.exception";
import { Action } from "../../core/interfaces/action";
import { ActionRegistry } from "../../core/interfaces/action-registry";

/**
 * Map-backed ActionRegistry.
 *
 * Adding a new Action requires only calling register() — the ActionEngine and
 * policy evaluator need no modification.
 */
export class DefaultActionRegistry implements ActionRegistry {
  private readonly actions = new Map<string, Action>();

  public register(action: Action): void {
    this.actions.set(action.id, action);
  }

  public resolve(actionId: string): Action {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new ActionConfigurationException(`No action registered with id: "${actionId}".`);
    }
    return action;
  }

  public all(): Action[] {
    return Array.from(this.actions.values());
  }
}
