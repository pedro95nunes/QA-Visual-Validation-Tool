import { ActionRegistry } from "../../core/interfaces/action-registry";
import { ActionsConfiguration } from "../../configuration/action-configuration";
import { CliOutput } from "../output";

/**
 * Displays all actions from the registry with their current policy state.
 *
 * Uses the existing ActionRegistry — the list is not hardcoded.
 */
export function renderActions(
  output: CliOutput,
  registry: ActionRegistry,
  actionsConfig: ActionsConfiguration = {}
): void {
  const actions = registry.all();

  if (actions.length === 0) {
    output.info("No actions registered.");
    return;
  }

  output.info("Available Actions:");
  for (const action of actions) {
    const policy = actionsConfig[action.id];
    const status = policy?.enabled ? "enabled" : "disabled";
    const environments =
      policy?.environments && policy.environments.length > 0
        ? `  environments: [${policy.environments.join(", ")}]`
        : "";
    const onlyOnFailure = policy?.onlyOnFailure ? "  onlyOnFailure: true" : "";
    const detail = `(${status})${onlyOnFailure}${environments}`;
    if (policy?.enabled) {
      output.pass(`${action.id}  —  ${action.name}  ${detail}`);
    } else {
      output.fail(`${action.id}  —  ${action.name}  ${detail}`);
    }
  }
}
