import { ActionPolicy } from "../../core/interfaces/action-policy";
import { ActionPolicyEvaluator } from "../../core/interfaces/action-policy-evaluator";
import { ValidationRun } from "../../core/models/validation-run";
import { ValidationStatus } from "../../core/models/validation-status";

/**
 * Evaluates whether an Action should execute given its policy and run context.
 *
 * Rules applied in order:
 * 1. enabled must be true.
 * 2. If environments is non-empty, the current environment must appear in it.
 * 3. If onlyOnFailure is true, the run status must be Failed.
 */
export class DefaultActionPolicyEvaluator implements ActionPolicyEvaluator {
  public isEligible(_actionId: string, policy: ActionPolicy, run: ValidationRun, environment: string): boolean {
    if (!policy.enabled) {
      return false;
    }

    if (policy.environments && policy.environments.length > 0) {
      if (!policy.environments.includes(environment)) {
        return false;
      }
    }

    if (policy.onlyOnFailure && run.status !== ValidationStatus.Failed) {
      return false;
    }

    return true;
  }
}
