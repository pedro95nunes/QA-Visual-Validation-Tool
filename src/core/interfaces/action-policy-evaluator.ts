import { ActionPolicy } from "./action-policy";
import { ValidationRun } from "../models/validation-run";

/**
 * Determines whether an Action should execute given its policy and execution context.
 *
 * Separating this from the ActionEngine keeps policy business rules independently testable.
 */
export interface ActionPolicyEvaluator {
  isEligible(actionId: string, policy: ActionPolicy, run: ValidationRun, environment: string): boolean;
}
