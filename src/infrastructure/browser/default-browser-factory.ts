import { BrowserConfiguration, BrowserProvider } from "../../configuration/browser-configuration";
import { ConfigurationException } from "../../core/exceptions/configuration.exception";
import { BrowserFactory } from "../../core/interfaces/browser-factory";
import { Browser } from "../../core/interfaces/browser";
import { PlaywrightBrowser } from "./playwright-browser";

/** Selects the browser provider configured for the current execution. */
export class DefaultBrowserFactory implements BrowserFactory {
  public constructor(private readonly configuration: BrowserConfiguration) {}

  public create(): Browser {
    switch (this.configuration.provider) {
      case BrowserProvider.Playwright:
        return new PlaywrightBrowser(this.configuration);
      default:
        throw new ConfigurationException(`Unsupported browser provider: ${this.configuration.provider}.`);
    }
  }
}
