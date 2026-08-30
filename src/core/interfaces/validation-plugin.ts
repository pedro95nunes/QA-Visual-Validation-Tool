import { ValidationContext } from "../models/validation-context";
import { ValidationExecutionResult } from "../models/validation-execution-result";

/** A discoverable unit of generic validation work. */
export interface ValidationPlugin {
  readonly id: string;
  readonly name: string;
  execute(context: ValidationContext): Promise<ValidationExecutionResult>;
}
