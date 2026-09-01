import { BrowserConfiguration } from "./browser-configuration";
import { DesignConfiguration } from "./design-configuration";
import { EvidenceConfiguration } from "./evidence-configuration";
import { FigmaConfiguration } from "./figma-configuration";
import { PluginConfiguration } from "./plugin-configuration";
import { ReportConfiguration } from "./report-configuration";
import { ReferenceConfiguration } from "./reference-configuration";
import { VisualConfiguration } from "./visual-configuration";
import { ActionsConfiguration } from "./action-configuration";
import { ProjectConfiguration } from "./project-configuration";

/** Root configuration shape. Loading and parsing are intentionally deferred. */
export interface ApplicationConfiguration {
  project?: ProjectConfiguration;
  browser: BrowserConfiguration;
  design: DesignConfiguration;
  evidence: EvidenceConfiguration;
  figma: FigmaConfiguration;
  plugins: PluginConfiguration;
  reference: ReferenceConfiguration;
  report: ReportConfiguration;
  visual: VisualConfiguration;
  /** Named execution environment (e.g. staging, production). Used by action policies. */
  environment?: string;
  /** Per-action enable/disable and policy configuration. */
  actions?: ActionsConfiguration;
}
