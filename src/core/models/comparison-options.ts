/** RGB color used to express differences without exposing library types. */
export interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

/** Generic controls for visual comparison behavior. */
export interface ComparisonOptions {
  pixelThreshold: number;
  allowedDifferencePercentage: number;
  includeAA: boolean;
  alpha: number;
  diffColor?: RgbColor;
  diffColorAlt?: RgbColor;
}
