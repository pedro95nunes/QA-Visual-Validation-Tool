import { chromium } from "playwright";
import type { Browser as PlaywrightBrowserInstance, BrowserContext, Page } from "playwright";
import { BrowserConfiguration } from "../../configuration/browser-configuration";
import { Browser } from "../../core/interfaces/browser";
import { BrowserInitializationException } from "../../core/exceptions/browser-initialization.exception";
import { BrowserShutdownException } from "../../core/exceptions/browser-shutdown.exception";
import { NavigationException } from "../../core/exceptions/navigation.exception";
import { ScreenshotException } from "../../core/exceptions/screenshot.exception";
import { ScreenshotFormat } from "../../core/models/screenshot-format";
import { ScreenshotOptions } from "../../core/models/screenshot-options";

/** Playwright-backed implementation of the generic Browser contract. */
export class PlaywrightBrowser implements Browser {
  private browser?: PlaywrightBrowserInstance;
  private context?: BrowserContext;
  private page?: Page;

  public constructor(private readonly configuration: BrowserConfiguration) {}

  public async launch(): Promise<void> {
    try {
      this.browser = await chromium.launch({ headless: this.configuration.headless });
      this.context = await this.browser.newContext({ viewport: this.configuration.viewport });
      this.context.setDefaultTimeout(this.configuration.timeout);
      this.page = await this.context.newPage();
    } catch (error) {
      throw new BrowserInitializationException("Unable to initialize the browser.", toError(error));
    }
  }

  public async open(url: string): Promise<void> {
    if (!this.page) {
      throw new NavigationException("The browser must be launched before opening a page.");
    }

    try {
      await this.page.goto(url, { waitUntil: "load" });
    } catch (error) {
      throw new NavigationException(`Unable to open page: ${url}.`, toError(error));
    }
  }

  public async captureScreenshot(options: ScreenshotOptions): Promise<Uint8Array> {
    if (!this.page) {
      throw new ScreenshotException("The browser must be launched before capturing a screenshot.");
    }

    try {
      return await this.page.screenshot({
        fullPage: options.fullPage,
        type: toPlaywrightScreenshotType(options.format)
      });
    } catch (error) {
      throw new ScreenshotException("Unable to capture a screenshot.", toError(error));
    }
  }

  public async close(): Promise<void> {
    if (!this.browser) {
      return;
    }

    try {
      await this.browser.close();
      this.page = undefined;
      this.context = undefined;
      this.browser = undefined;
    } catch (error) {
      throw new BrowserShutdownException("Unable to close the browser.", toError(error));
    }
  }
}

function toPlaywrightScreenshotType(format: ScreenshotFormat): "png" {
  switch (format) {
    case ScreenshotFormat.Png:
      return "png";
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
