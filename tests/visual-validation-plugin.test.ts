import assert from "node:assert/strict";
import test from "node:test";
import { ComparisonConfiguration, ComparatorProvider } from "../src/configuration/comparison-configuration";
import { DesignProviderType } from "../src/configuration/design-configuration";
import { VisualValidationPageConfiguration } from "../src/configuration/visual-validation-page-configuration";
import { Browser } from "../src/core/interfaces/browser";
import { BrowserFactory } from "../src/core/interfaces/browser-factory";
import { Comparator } from "../src/core/interfaces/comparator";
import { Logger } from "../src/core/interfaces/logger";
import { ReferenceServiceFactory } from "../src/core/interfaces/reference-service-factory";
import { ScreenshotService } from "../src/core/interfaces/screenshot-service";
import { ScreenshotServiceFactory } from "../src/core/interfaces/screenshot-service-factory";
import { ComparisonOptions } from "../src/core/models/comparison-options";
import { ComparisonResult } from "../src/core/models/comparison-result";
import { ComparisonStatus } from "../src/core/models/comparison-status";
import { Evidence } from "../src/core/models/evidence";
import { Reference } from "../src/core/models/reference";
import { ValidationFailureKind } from "../src/core/models/validation-failure-kind";
import { ValidationStatus } from "../src/core/models/validation-status";
import { VisualValidationPlugin } from "../src/plugins/visual-validation-plugin";

class TestLogger implements Logger { public info(_message: string): void {} public error(_message: string): void {} }
class TestBrowser implements Browser {
  public opened: string[] = []; public closed = false;
  public async launch(): Promise<void> {}
  public async open(url: string): Promise<void> { this.opened.push(url); }
  public async captureScreenshot(): Promise<Uint8Array> { return new Uint8Array(); }
  public async close(): Promise<void> { this.closed = true; }
}
class TestBrowserFactory implements BrowserFactory { public constructor(private readonly browser: Browser) {} public create(): Browser { return this.browser; } }
class TestScreenshots implements ScreenshotServiceFactory {
  public create(_browser: Browser, name?: string): ScreenshotService {
    return { capture: async (): Promise<Evidence> => ({ id: name ?? "page", name: name ?? "page", filePath: "evidence.png", createdAt: new Date(), width: 1, height: 1, metadata: {} }) };
  }
}
class TestReferences implements ReferenceServiceFactory {
  public create(): { retrieve(): Promise<Reference> } {
    return { retrieve: async (): Promise<Reference> => ({ id: "reference", name: "reference", source: "test", localPath: "reference.png", downloadedAt: new Date(), width: 1, height: 1, metadata: {} }) };
  }
}
class ControlledComparator implements Comparator {
  public constructor(private readonly statuses: ComparisonStatus[]) {}
  public async compare(_reference: Reference, _evidence: Evidence, _options?: ComparisonOptions): Promise<ComparisonResult> {
    const status = this.statuses.shift() ?? ComparisonStatus.Passed;
    return { status, differencePercentage: status === ComparisonStatus.Passed ? 0 : 5, differentPixels: 1, totalPixels: 1, width: 1, height: 1, threshold: 0.1, pixelThreshold: 0.1, allowedDifferencePercentage: 1, passed: status === ComparisonStatus.Passed, metadata: {}, duration: 1 };
  }
}

const comparison: ComparisonConfiguration = { comparator: ComparatorProvider.Pixelmatch, pixelThreshold: 0.1, allowedDifferencePercentage: 1, includeAA: false, alpha: 0.5, outputDirectory: "artifacts/diffs" };
const pages: VisualValidationPageConfiguration[] = [
  { id: "homepage", url: "https://example.test", reference: { provider: DesignProviderType.Figma, fileKey: "file", nodeId: "node" } },
  { id: "about", url: "https://example.test/about", reference: { provider: DesignProviderType.Figma, fileKey: "file", nodeId: "node" } }
];

test("evaluates every page and aggregates partial failures", async () => {
  const browser = new TestBrowser();
  const plugin = new VisualValidationPlugin(new TestLogger(), new TestBrowserFactory(browser), new TestScreenshots(), new TestReferences(), new ControlledComparator([ComparisonStatus.Passed, ComparisonStatus.Failed]), pages, comparison);
  const result = await plugin.execute({ executionId: "test" });

  assert.equal(result.status, ValidationStatus.Failed);
  assert.equal(result.total, 2);
  assert.equal(result.passed, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(browser.opened, pages.map((page) => page.url));
  assert.equal(browser.closed, true);
});

test("returns a configuration error for an invalid page without blocking its lifecycle", async () => {
  const invalidPage = { ...pages[0], id: "", reference: { ...pages[0].reference, fileKey: "" } };
  const plugin = new VisualValidationPlugin(new TestLogger(), new TestBrowserFactory(new TestBrowser()), new TestScreenshots(), new TestReferences(), new ControlledComparator([]), [invalidPage], comparison);
  const result = await plugin.execute({ executionId: "test" });

  assert.equal(result.status, ValidationStatus.Error);
  assert.equal(result.results[0].failureKind, ValidationFailureKind.Configuration);
  assert.match(result.results[0].findings[0], /page id is required/);
});
