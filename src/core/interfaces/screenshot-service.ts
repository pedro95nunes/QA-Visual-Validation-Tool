import { Evidence } from "../models/evidence";

/** Captures evidence from the current browser page. */
export interface ScreenshotService {
  capture(): Promise<Evidence>;
}
