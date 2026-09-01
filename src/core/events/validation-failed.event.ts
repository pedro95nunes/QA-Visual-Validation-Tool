import { Event } from "../interfaces/event";

export const VALIDATION_FAILED = "validation.failed";

/** Published when an unrecoverable error prevents a validation run from completing. */
export interface ValidationFailedEvent extends Event {
  readonly type: typeof VALIDATION_FAILED;
  readonly executionId: string;
  readonly error: Error;
}
