import { BrowserConfiguration } from "./browser-configuration";
import { ReportConfiguration } from "./report-configuration";
import { VisualConfiguration } from "./visual-configuration";

/** Root configuration shape. Loading and parsing are intentionally deferred. */
export interface ApplicationConfiguration {
  browser: BrowserConfiguration;
  report: ReportConfiguration;
  visual: VisualConfiguration;
}
