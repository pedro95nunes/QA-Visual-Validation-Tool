import { ActionPolicy } from "../core/interfaces/action-policy";

/**
 * Configuration block for all registered actions.
 *
 * Each key is an action ID (e.g. "qase", "slack"). The value is the policy
 * that controls when the action is eligible to execute.
 *
 * Example YAML equivalent:
 *   actions:
 *     qase:
 *       enabled: true
 *       onlyOnFailure: true
 *       environments: [staging, production]
 *     slack:
 *       enabled: false
 */
export type ActionsConfiguration = Record<string, ActionPolicy>;
