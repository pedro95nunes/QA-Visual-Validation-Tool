import { Browser } from "./browser";

/** Creates a configured browser implementation for an execution. */
export interface BrowserFactory {
  create(): Browser;
}
