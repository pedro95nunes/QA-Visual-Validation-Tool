import { ApplicationConfiguration } from "./application-configuration";
import { BrowserProvider } from "./browser-configuration";
import { ComparatorProvider } from "./comparison-configuration";
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
const DEFAULT_DIFF_DIRECTORY = "artifacts/diffs";
const DEFAULT_REPORT_OUTPUT_DIRECTORY = "artifacts";
const DEFAULT_PIXEL_THRESHOLD = 0.1;
const DEFAULT_ALLOWED_DIFFERENCE_PERCENTAGE = 1;
const FIGMA_TOKEN_VARIABLE = "FIGMA_TOKEN";
const FIGMA_FILE_KEY_VARIABLE = "FIGMA_FILE_KEY";
const FIGMA_NODE_ID_VARIABLE = "FIGMA_NODE_ID";
const VISUAL_VALIDATION_PLUGIN_ID = "visual-validation";

/** Default configuration until a configuration loader is introduced. */
export const defaultApplicationConfiguration: ApplicationConfiguration = {
  environment: "",
  actions: {
    qase: { enabled: false, onlyOnFailure: true, environments: [] },
    slack: { enabled: false, onlyOnFailure: true, environments: [] },
  },
  browser: {
    provider: BrowserProvider.Playwright,
    headless: true,
    timeout: DEFAULT_BROWSER_TIMEOUT,
    viewport: {
      width: DEFAULT_VIEWPORT_WIDTH,
      height: DEFAULT_VIEWPORT_HEIGHT,
    },
    url: DEFAULT_TARGET_URL,
  },
  design: {
    provider: DesignProviderType.Figma,
  },
  evidence: {
    outputDirectory: `${DEFAULT_EVIDENCE_DIRECTORY}/evidence`,
    fullPage: true,
    imageFormat: ScreenshotFormat.Png,
    name: DEFAULT_EVIDENCE_NAME,
  },
  figma: {
    token: environmentValue(FIGMA_TOKEN_VARIABLE),
    fileKey: environmentValue(FIGMA_FILE_KEY_VARIABLE),
    nodeId: environmentValue(FIGMA_NODE_ID_VARIABLE),
    imageFormat: ScreenshotFormat.Png,
    name: DEFAULT_REFERENCE_NAME,
  },
  plugins: {
    enabled: [VISUAL_VALIDATION_PLUGIN_ID],
  },
  reference: {
    outputDirectory: DEFAULT_REFERENCE_DIRECTORY,
  },
  report: {
    enabled: true,
    outputDirectory: DEFAULT_REPORT_OUTPUT_DIRECTORY,
    html: { enabled: true },
    json: { enabled: true },
  },
  visual: {
    enabled: true,
    pages: [
      {
        id: "homepage",
        url: DEFAULT_TARGET_URL,
        reference: {
          provider: DesignProviderType.Figma,
          fileKey: environmentValue(FIGMA_FILE_KEY_VARIABLE),
          nodeId: environmentValue(FIGMA_NODE_ID_VARIABLE),
        },
      },
    ],
    comparison: {
      comparator: ComparatorProvider.Pixelmatch,
      pixelThreshold: DEFAULT_PIXEL_THRESHOLD,
      allowedDifferencePercentage: DEFAULT_ALLOWED_DIFFERENCE_PERCENTAGE,
      includeAA: false,
      alpha: 0.5,
      outputDirectory: DEFAULT_DIFF_DIRECTORY,
    },
  },
};

function environmentValue(name: string): string {
  return process.env[name] ?? "";
}
