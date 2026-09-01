import assert from "node:assert/strict";
import test from "node:test";
import { BrowserConfiguration, BrowserProvider } from "../src/configuration/browser-configuration";
import { ConfigurationException } from "../src/core/exceptions/configuration.exception";
import { DefaultBrowserFactory } from "../src/infrastructure/browser/default-browser-factory";
import { PlaywrightBrowser } from "../src/infrastructure/browser/playwright-browser";

const browserConfiguration: BrowserConfiguration = {
  provider: BrowserProvider.Playwright,
  headless: true,
  timeout: 30_000,
  viewport: { width: 1_440, height: 900 },
  url: "https://example.test",
};

test("creates a Playwright browser for the Playwright provider", () => {
  const factory = new DefaultBrowserFactory(browserConfiguration);

  const browser = factory.create();

  assert.equal(browser instanceof PlaywrightBrowser, true);
});

test("rejects an unsupported browser provider", () => {
  const unsupportedConfiguration = {
    ...browserConfiguration,
    provider: "unsupported",
  } as unknown as BrowserConfiguration;
  const factory = new DefaultBrowserFactory(unsupportedConfiguration);

  assert.throws(() => factory.create(), ConfigurationException);
});
