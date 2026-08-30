import { ApplicationConfiguration } from "../configuration/application-configuration";
import { DefaultComparatorFactory } from "../infrastructure/comparator/default-comparator-factory";
import { ValidationEngine } from "../engine/validation-engine";
import { ValidationPluginRegistry } from "../engine/validation-plugin-registry";
import { DefaultBrowserFactory } from "../infrastructure/browser/default-browser-factory";
import { DefaultReferenceServiceFactory } from "../infrastructure/design/default-reference-service-factory";
import { ConsoleLogger } from "../infrastructure/logging/console-logger";
import { DefaultScreenshotServiceFactory } from "../infrastructure/screenshot/default-screenshot-service-factory";
import { LocalFileStorage } from "../infrastructure/storage/local-file-storage";
import { VisualValidationPlugin } from "../plugins/visual-validation-plugin";

/** Composition root that wires concrete infrastructure into the application. */
export class ApplicationProvider {
  public constructor(private readonly configuration: ApplicationConfiguration) {}

  public createValidationEngine(): ValidationEngine {
    const logger = new ConsoleLogger();
    const browserFactory = new DefaultBrowserFactory(this.configuration.browser);
    const storage = new LocalFileStorage();
    const screenshotServiceFactory = new DefaultScreenshotServiceFactory(storage, this.configuration.evidence);
    const comparator = new DefaultComparatorFactory(storage, this.configuration.visual.comparison).create();
    const referenceServiceFactory = new DefaultReferenceServiceFactory(
      storage,
      this.configuration.figma,
      this.configuration.reference
    );
    const visualValidationPlugin = new VisualValidationPlugin(
      logger,
      browserFactory,
      screenshotServiceFactory,
      referenceServiceFactory,
      comparator,
      this.configuration.visual.enabled ? this.configuration.visual.pages : [],
      this.configuration.visual.comparison
    );
    const pluginRegistry = new ValidationPluginRegistry([visualValidationPlugin]);
    return new ValidationEngine(logger, pluginRegistry, this.configuration.plugins.enabled);
  }
}
