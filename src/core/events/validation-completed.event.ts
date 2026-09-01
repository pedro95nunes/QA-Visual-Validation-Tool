import { Event } from "../interfaces/event";
import { ValidationRun } from "../models/validation-run";

export const VALIDATION_COMPLETED = "validation.completed";

/** Published when a validation execution finishes successfully and the run is assembled. */
export interface ValidationCompletedEvent extends Event {
  readonly type: typeof VALIDATION_COMPLETED;
  readonly executionId: string;
  readonly run: ValidationRun;
}
