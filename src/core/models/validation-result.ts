import { ComparisonResult } from "./comparison-result";
import { Evidence } from "./evidence";
import { Reference } from "./reference";
import { ValidationStatus } from "./validation-status";
import { ValidationFailureKind } from "./validation-failure-kind";

/** Technology-independent result of validating a single target. */
export interface ValidationResult {
  pageId: string;
  status: ValidationStatus;
  failureKind?: ValidationFailureKind;
  comparison?: ComparisonResult;
  evidence?: Evidence;
  reference?: Reference;
  duration: number;
  findings: string[];
  metrics: Record<string, number>;
}
