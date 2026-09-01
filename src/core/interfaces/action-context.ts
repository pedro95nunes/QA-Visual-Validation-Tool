import { Logger } from "./logger";
import { ValidationRun } from "../models/validation-run";

/**
 * Generic information available to every Action during execution.
 *
 * Contains only structured validation data — no Playwright, Figma, or Pixelmatch objects.
 */
export interface ActionContext {
  readonly executionId: string;
  /** Named environment (e.g. staging, production). Empty string when not configured. */
  readonly environment: string;
  readonly run: ValidationRun;
  readonly logger: Logger;
}
