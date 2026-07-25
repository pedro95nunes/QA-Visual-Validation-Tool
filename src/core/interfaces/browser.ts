import { ScreenshotOptions } from "../models/screenshot-options";

/** Defines the browser capabilities required by application orchestration. */
export interface Browser {
  launch(): Promise<void>;
  open(url: string): Promise<void>;
  captureScreenshot(options: ScreenshotOptions): Promise<Uint8Array>;
  close(): Promise<void>;
}
