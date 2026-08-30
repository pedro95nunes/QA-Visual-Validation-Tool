import { EvidenceConfiguration } from "../../configuration/evidence-configuration";
import { Browser } from "../../core/interfaces/browser";
import { ScreenshotService } from "../../core/interfaces/screenshot-service";
import { ScreenshotServiceFactory } from "../../core/interfaces/screenshot-service-factory";
import { Storage } from "../../core/interfaces/storage";
import { PlaywrightScreenshotService } from "./playwright-screenshot-service";

/** Composes screenshot capture with the configured artifact storage. */
export class DefaultScreenshotServiceFactory implements ScreenshotServiceFactory {
  public constructor(
    private readonly storage: Storage,
    private readonly configuration: EvidenceConfiguration
  ) {}

  public create(browser: Browser, name?: string): ScreenshotService {
    return new PlaywrightScreenshotService(browser, this.storage, {
      ...this.configuration,
      name: name ?? this.configuration.name
    });
  }
}
