import { Browser } from "./browser";
import { ScreenshotService } from "./screenshot-service";

/** Creates an evidence capture service bound to a browser execution. */
export interface ScreenshotServiceFactory {
  create(browser: Browser, name?: string): ScreenshotService;
}
