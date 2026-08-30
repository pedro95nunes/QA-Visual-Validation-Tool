import { ComparisonConfiguration } from "./comparison-configuration";
import { DesignProviderType } from "./design-configuration";

/** Per-page reference source without exposing a provider SDK. */
export interface VisualReferenceConfiguration {
  provider: DesignProviderType;
  fileKey: string;
  nodeId: string;
}

/** Describes one page in a visual validation execution. */
export interface VisualValidationPageConfiguration {
  id: string;
  url: string;
  reference: VisualReferenceConfiguration;
  comparison?: Partial<ComparisonConfiguration>;
}
