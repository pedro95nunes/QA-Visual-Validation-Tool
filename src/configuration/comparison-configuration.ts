/** Supported implementations of the visual comparison boundary. */
export enum ComparatorProvider {
  Pixelmatch = "pixelmatch"
}

/** Separates per-pixel sensitivity from the accepted result percentage. */
export interface ComparisonConfiguration {
  comparator: ComparatorProvider;
  pixelThreshold: number;
  allowedDifferencePercentage: number;
  includeAA: boolean;
  alpha: number;
  outputDirectory: string;
}
