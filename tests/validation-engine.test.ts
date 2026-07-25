import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationConfiguration } from "../src/configuration/application-configuration";
import { BrowserProvider } from "../src/configuration/browser-configuration";
import { DesignProviderType } from "../src/configuration/design-configuration";
import { ScreenshotFormat } from "../src/core/models/screenshot-format";
import { Browser } from "../src/core/interfaces/browser";
import { BrowserFactory } from "../src/core/interfaces/browser-factory";
import { Logger } from "../src/core/interfaces/logger";
import { ReferenceService } from "../src/core/interfaces/reference-service";
import { ScreenshotService } from "../src/core/interfaces/screenshot-service";
import { ScreenshotServiceFactory } from "../src/core/interfaces/screenshot-service-factory";
import { Evidence } from "../src/core/models/evidence";
import { Reference } from "../src/core/models/reference";
import { ExecutionStatus } from "../src/core/models/execution-status";
import { ValidationEngine } from "../src/engine/validation-engine";

class TestLogger implements Logger {
  public readonly messages: string[] = [];

  public info(message: string): void {
    this.messages.push(message);
  }

  public error(_message: string): void {}
}

class TestBrowser implements Browser {
  public readonly openedUrls: string[] = [];
  public launched = false;
  public closed = false;

  public async launch(): Promise<void> {
    this.launched = true;
  }

  public async open(url: string): Promise<void> {
    this.openedUrls.push(url);
  }

  public async captureScreenshot(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  public async close(): Promise<void> {
    this.closed = true;
  }
}

class TestScreenshotService implements ScreenshotService {
  public captured = false;

  public async capture(): Promise<Evidence> {
    this.captured = true;
    return {
      id: "evidence-id",
      name: "page",
      filePath: "artifacts/page.png",
      createdAt: new Date(),
      width: 1,
      height: 1,
      metadata: {}
    };
  }
}

class TestScreenshotServiceFactory implements ScreenshotServiceFactory {
  public constructor(private readonly screenshotService: ScreenshotService) {}

  public create(_browser: Browser): ScreenshotService {
    return this.screenshotService;
  }
}

class TestReferenceService implements ReferenceService {
  public retrieved = false;

  public async retrieve(): Promise<Reference> {
    this.retrieved = true;
    return {
      id: "reference-id",
      name: "reference",
      source: "figma",
      localPath: "artifacts/references/reference.png",
      downloadedAt: new Date(),
      width: 1,
      height: 1,
      metadata: {}
    };
  }
}

class TestBrowserFactory implements BrowserFactory {
  public constructor(private readonly browser: Browser) {}

  public create(): Browser {
    return this.browser;
  }
}

const testConfiguration: ApplicationConfiguration = {
  browser: {
    provider: BrowserProvider.Playwright,
    headless: true,
    timeout: 30_000,
    viewport: { width: 1_440, height: 900 },
    url: "https://example.test"
  },
  design: { provider: DesignProviderType.Figma },
  evidence: {
    outputDirectory: "artifacts",
    fullPage: true,
    imageFormat: ScreenshotFormat.Png,
    name: "page"
  },
  figma: {
    token: "test-token",
    fileKey: "file-key",
    nodeId: "node-id",
    imageFormat: ScreenshotFormat.Png,
    name: "reference"
  },
  reference: { outputDirectory: "artifacts/references" },
  report: { outputDirectory: "reports" },
  visual: { baselineDirectory: "baselines", threshold: 0 }
};

test("executes the browser lifecycle successfully", async () => {
  const logger = new TestLogger();
  const browser = new TestBrowser();
  const screenshotService = new TestScreenshotService();
  const referenceService = new TestReferenceService();
  const engine = new ValidationEngine(
    logger,
    new TestBrowserFactory(browser),
    new TestScreenshotServiceFactory(screenshotService),
    referenceService,
    testConfiguration
  );

  const status = await engine.execute();

  assert.equal(status, ExecutionStatus.Succeeded);
  assert.equal(browser.launched, true);
  assert.deepEqual(browser.openedUrls, [testConfiguration.browser.url]);
  assert.equal(screenshotService.captured, true);
  assert.equal(referenceService.retrieved, true);
  assert.equal(browser.closed, true);
  assert.deepEqual(logger.messages, [
    "Validation started.",
    "Browser initialized.",
    "Opening page.",
    "Page loaded successfully.",
    "Capturing screenshot.",
    "Evidence captured: artifacts/page.png",
    "Downloading reference.",
    "Reference downloaded.",
    "Reference stored: artifacts/references/reference.png",
    "Closing browser.",
    "Validation finished."
  ]);
});
