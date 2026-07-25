import { ApplicationConfiguration } from "../configuration/application-configuration";
import { DesignProviderType } from "../configuration/design-configuration";
import { ConfigurationException } from "../core/exceptions/configuration.exception";
import { ValidationEngine } from "../engine/validation-engine";
import { ReferenceService } from "../engine/reference-service";
import { DesignProvider } from "../core/interfaces/design-provider";
import { DefaultBrowserFactory } from "../infrastructure/browser/default-browser-factory";
import { FigmaProvider } from "../infrastructure/design/figma-provider";
import { ConsoleLogger } from "../infrastructure/logging/console-logger";
import { DefaultScreenshotServiceFactory } from "../infrastructure/screenshot/default-screenshot-service-factory";
import { LocalFileStorage } from "../infrastructure/storage/local-file-storage";

/** Composition root that wires concrete infrastructure into the application. */
export class ApplicationProvider {
  public constructor(private readonly configuration: ApplicationConfiguration) {}

  public createValidationEngine(): ValidationEngine {
    const logger = new ConsoleLogger();
    const browserFactory = new DefaultBrowserFactory(this.configuration.browser);
    const storage = new LocalFileStorage();
    const screenshotServiceFactory = new DefaultScreenshotServiceFactory(storage, this.configuration.evidence);
    const referenceService = new ReferenceService(this.createDesignProvider(), storage, this.configuration.reference);
    return new ValidationEngine(logger, browserFactory, screenshotServiceFactory, referenceService, this.configuration);
  }

  private createDesignProvider(): DesignProvider {
    switch (this.configuration.design.provider) {
      case DesignProviderType.Figma:
        return new FigmaProvider(this.configuration.figma);
      default:
        throw new ConfigurationException(`Unsupported design provider: ${this.configuration.design.provider}.`);
    }
  }
}
