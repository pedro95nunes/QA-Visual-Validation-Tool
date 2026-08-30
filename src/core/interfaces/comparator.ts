import { Evidence } from "../models/evidence";
import { ComparisonOptions } from "../models/comparison-options";
import { ComparisonResult } from "../models/comparison-result";
import { Reference } from "../models/reference";

/** Compares captured evidence with an expected visual reference. */
export interface Comparator {
  compare(reference: Reference, evidence: Evidence, options?: ComparisonOptions): Promise<ComparisonResult>;
}
