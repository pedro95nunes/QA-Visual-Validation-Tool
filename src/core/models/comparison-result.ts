import { ComparisonStatus } from "./comparison-status";

/** Technology-independent outcome and metrics of a visual comparison. */
export interface ComparisonResult {
  status: ComparisonStatus;
  differencePercentage: number;
  differentPixels: number;
  totalPixels: number;
  width?: number;
  height?: number;
  threshold: number;
  pixelThreshold: number;
  allowedDifferencePercentage: number;
  passed: boolean;
  diffImage?: string;
  metadata: Record<string, string>;
  duration: number;
}
