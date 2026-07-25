import { ApplicationConfiguration } from "./application-configuration";
import { BrowserProvider } from "./browser-configuration";
import { DesignProviderType } from "./design-configuration";
import { ScreenshotFormat } from "../core/models/screenshot-format";

const DEFAULT_TARGET_URL = "https://example.com";
const DEFAULT_BROWSER_TIMEOUT = 30_000;
const DEFAULT_VIEWPORT_WIDTH = 1_440;
const DEFAULT_VIEWPORT_HEIGHT = 900;
const DEFAULT_EVIDENCE_DIRECTORY = "artifacts";
const DEFAULT_EVIDENCE_NAME = "page";
const DEFAULT_REFERENCE_DIRECTORY = "artifacts/references";
const DEFAULT_REFERENCE_NAME = "reference";
const FIGMA_TOKEN_VARIABLE = "FIGMA_TOKEN";
const FIGMA_FILE_KEY_VARIABLE = "FIGMA_FILE_KEY";
const FIGMA_NODE_ID_VARIABLE = "FIGMA_NODE_ID";

/** Default configuration until a configuration loader is introduced. */
export const defaultApplicationConfiguration: ApplicationConfiguration = {
  browser: {
    provider: BrowserProvider.Playwright,
    headless: true,
    timeout: DEFAULT_BROWSER_TIMEOUT,
    viewport: {
      width: DEFAULT_VIEWPORT_WIDTH,
      height: DEFAULT_VIEWPORT_HEIGHT
    },
    url: DEFAULT_TARGET_URL
  },
  design: {
    provider: DesignProviderType.Figma
  },
  evidence: {
    outputDirectory: `${DEFAULT_EVIDENCE_DIRECTORY}/evidence`,
    fullPage: true,
    imageFormat: ScreenshotFormat.Png,
    name: DEFAULT_EVIDENCE_NAME
  },
  figma: {
    token: environmentValue(FIGMA_TOKEN_VARIABLE),
    fileKey: environmentValue(FIGMA_FILE_KEY_VARIABLE),
    nodeId: environmentValue(FIGMA_NODE_ID_VARIABLE),
    imageFormat: ScreenshotFormat.Png,
    name: DEFAULT_REFERENCE_NAME
  },
  reference: {
    outputDirectory: DEFAULT_REFERENCE_DIRECTORY
  },
  report: {
    outputDirectory: "reports"
  },
  visual: {
    baselineDirectory: "baselines",
    threshold: 0
  }
};

function environmentValue(name: string): string {
  return process.env[name] ?? "";
}
