import { ScreenshotFormat } from "./screenshot-format";

/** Generic options used to capture a browser screenshot. */
export interface ScreenshotOptions {
  fullPage: boolean;
  format: ScreenshotFormat;
}
