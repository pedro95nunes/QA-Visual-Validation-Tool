/** Supported providers for retrieving expected visual references. */
export enum DesignProviderType {
  Figma = "figma"
}

/** Selects the provider used to retrieve visual references. */
export interface DesignConfiguration {
  provider: DesignProviderType;
}
