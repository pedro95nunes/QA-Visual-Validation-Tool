import { Event } from "../interfaces/event";

export const VALIDATION_STARTED = "validation.started";

/** Published when a validation execution begins. */
export interface ValidationStartedEvent extends Event {
  readonly type: typeof VALIDATION_STARTED;
  readonly executionId: string;
}
