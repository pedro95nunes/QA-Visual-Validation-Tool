import { ComparisonConfiguration } from "./comparison-configuration";
import { VisualValidationPageConfiguration } from "./visual-validation-page-configuration";

/** Visual comparison settings independent of a concrete comparison engine. */
export interface VisualConfiguration {
  enabled: boolean;
  pages: VisualValidationPageConfiguration[];
  comparison: ComparisonConfiguration;
}
