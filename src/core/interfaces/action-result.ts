/** Outcome of a single Action execution attempt. */
export interface ActionResult {
  readonly actionId: string;
  readonly actionName: string;
  readonly success: boolean;
  readonly status: ActionStatus;
  /** Wall-clock duration in milliseconds. */
  readonly duration: number;
  readonly message?: string;
  readonly metadata: Record<string, unknown>;
}

/** Disposition of an action after the engine processed it. */
export enum ActionStatus {
  Executed = "executed",
  Skipped = "skipped",
  Failed = "failed",
}
