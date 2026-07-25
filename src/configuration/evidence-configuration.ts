import { ScreenshotFormat } from "../core/models/screenshot-format";

/** Controls how visual evidence is produced and stored. */
export interface EvidenceConfiguration {
  outputDirectory: string;
  fullPage: boolean;
  imageFormat: ScreenshotFormat;
  name: string;
}
