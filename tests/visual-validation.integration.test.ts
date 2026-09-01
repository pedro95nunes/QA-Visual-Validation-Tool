import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { BrowserProvider } from "../src/configuration/browser-configuration";
import { ComparisonConfiguration, ComparatorProvider } from "../src/configuration/comparison-configuration";
import { EvidenceConfiguration } from "../src/configuration/evidence-configuration";
import { DesignProviderType } from "../src/configuration/design-configuration";
import { Logger } from "../src/core/interfaces/logger";
import { ReferenceServiceFactory } from "../src/core/interfaces/reference-service-factory";
import { ReferenceService } from "../src/core/interfaces/reference-service";
import { Reference } from "../src/core/models/reference";
import { ScreenshotFormat } from "../src/core/models/screenshot-format";
import { ValidationStatus } from "../src/core/models/validation-status";
import { VisualValidationRequest } from "../src/core/models/visual-validation-request";
import { DefaultBrowserFactory } from "../src/infrastructure/browser/default-browser-factory";
import { PixelmatchComparator } from "../src/infrastructure/comparator/pixelmatch-comparator";
import { DefaultScreenshotServiceFactory } from "../src/infrastructure/screenshot/default-screenshot-service-factory";
import { LocalFileStorage } from "../src/infrastructure/storage/local-file-storage";
import { VisualValidationPlugin } from "../src/plugins/visual-validation-plugin";

const integrationTest = process.env.ATLAS_RUN_INTEGRATION === "true" ? test : test.skip;
class SilentLogger implements Logger {
  public info(_message: string): void {}
  public error(_message: string): void {}
}
class StaticReferences implements ReferenceServiceFactory {
  public constructor(private readonly reference: Reference) {}
  public create(_request: VisualValidationRequest): ReferenceService {
    return { retrieve: async () => this.reference };
  }
}

integrationTest("validates a local page through real Playwright and Pixelmatch", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atlas-integration-"));
  const pagePath = join(directory, "page.html");
  const referencePath = join(directory, "reference.png");
  const url = pathToFileURL(pagePath).toString();
  const browserConfig = {
    provider: BrowserProvider.Playwright,
    headless: true,
    timeout: 30_000,
    viewport: { width: 800, height: 600 },
    url,
  };
  const comparison: ComparisonConfiguration = {
    comparator: ComparatorProvider.Pixelmatch,
    pixelThreshold: 0.1,
    allowedDifferencePercentage: 0,
    includeAA: false,
    alpha: 0.5,
    outputDirectory: join(directory, "diffs"),
  };
  const storage = new LocalFileStorage();

  try {
    await writeFile(pagePath, "<main style='font:24px Arial;padding:32px'>Atlas fixture</main>");
    const baseline = new DefaultBrowserFactory(browserConfig).create();
    await baseline.launch();
    await baseline.open(url);
    await writeFile(referencePath, await baseline.captureScreenshot({ fullPage: true, format: ScreenshotFormat.Png }));
    await baseline.close();
    const reference: Reference = {
      id: "reference",
      name: "homepage",
      source: "local",
      localPath: referencePath,
      downloadedAt: new Date(),
      width: 800,
      height: 600,
      metadata: {},
    };
    const evidenceConfig: EvidenceConfiguration = {
      outputDirectory: join(directory, "evidence"),
      fullPage: true,
      imageFormat: ScreenshotFormat.Png,
      name: "homepage",
    };
    const plugin = new VisualValidationPlugin(
      new SilentLogger(),
      new DefaultBrowserFactory(browserConfig),
      new DefaultScreenshotServiceFactory(storage, evidenceConfig),
      new StaticReferences(reference),
      new PixelmatchComparator(storage, comparison),
      [{ id: "homepage", url, reference: { provider: DesignProviderType.Figma, fileKey: "local", nodeId: "local" } }],
      comparison
    );

    const result = await plugin.execute({ executionId: "integration" });
    assert.equal(result.status, ValidationStatus.Passed);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
