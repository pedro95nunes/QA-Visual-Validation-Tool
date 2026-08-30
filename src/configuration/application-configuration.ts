import { BrowserConfiguration } from "./browser-configuration";
import { DesignConfiguration } from "./design-configuration";
import { EvidenceConfiguration } from "./evidence-configuration";
import { FigmaConfiguration } from "./figma-configuration";
import { PluginConfiguration } from "./plugin-configuration";
import { ReportConfiguration } from "./report-configuration";
import { ReferenceConfiguration } from "./reference-configuration";
import { VisualConfiguration } from "./visual-configuration";

/** Root configuration shape. Loading and parsing are intentionally deferred. */
export interface ApplicationConfiguration {
  browser: BrowserConfiguration;
  design: DesignConfiguration;
  evidence: EvidenceConfiguration;
  figma: FigmaConfiguration;
  plugins: PluginConfiguration;
  reference: ReferenceConfiguration;
  report: ReportConfiguration;
  visual: VisualConfiguration;
}
