import { ComparisonOptions } from "./comparison-options";

/** Provider-agnostic input required to validate one visual page. */
export interface VisualValidationRequest {
  pageId: string;
  url: string;
  reference: {
    provider: string;
    fileKey: string;
    nodeId: string;
  };
  comparison: ComparisonOptions;
}
