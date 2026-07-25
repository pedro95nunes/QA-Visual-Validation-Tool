import { ScreenshotFormat } from "../core/models/screenshot-format";

/** Configuration required to retrieve a Figma frame as an image. */
export interface FigmaConfiguration {
  token: string;
  fileKey: string;
  nodeId: string;
  imageFormat: ScreenshotFormat;
  name: string;
}
