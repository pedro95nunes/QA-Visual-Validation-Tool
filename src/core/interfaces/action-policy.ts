/** Controls whether and when an Action is allowed to execute. */
export interface ActionPolicy {
  /** Master switch for this action. */
  enabled: boolean;
  /**
   * Restricts execution to specific named environments (e.g. staging, production).
   * When omitted or empty, the action is not restricted by environment.
   */
  environments?: string[];
  /** When true, the action is skipped if the validation run passed. */
  onlyOnFailure?: boolean;
}
