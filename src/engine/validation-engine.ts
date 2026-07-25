import { ApplicationConfiguration } from "../configuration/application-configuration";
import { ValidationException } from "../core/exceptions/validation.exception";
import { BrowserFactory } from "../core/interfaces/browser-factory";
import { Logger } from "../core/interfaces/logger";
import { ReferenceService } from "../core/interfaces/reference-service";
import { ScreenshotServiceFactory } from "../core/interfaces/screenshot-service-factory";
import { ExecutionStatus } from "../core/models/execution-status";

/** Coordinates the current validation application flow. */
export class ValidationEngine {
  public constructor(
    private readonly logger: Logger,
    private readonly browserFactory: BrowserFactory,
    private readonly screenshotServiceFactory: ScreenshotServiceFactory,
    private readonly referenceService: ReferenceService,
    private readonly configuration: ApplicationConfiguration
  ) {}

  public async execute(): Promise<ExecutionStatus> {
    this.logger.info("Validation started.");
    const browser = this.browserFactory.create();

    try {
      await browser.launch();
      this.logger.info("Browser initialized.");
      this.logger.info("Opening page.");
      await browser.open(this.configuration.browser.url);
      this.logger.info("Page loaded successfully.");
      this.logger.info("Capturing screenshot.");
      const screenshotService = this.screenshotServiceFactory.create(browser);
      const evidence = await screenshotService.capture();
      this.logger.info(`Evidence captured: ${evidence.filePath}`);
      this.logger.info("Downloading reference.");
      const reference = await this.referenceService.retrieve();
      this.logger.info("Reference downloaded.");
      this.logger.info(`Reference stored: ${reference.localPath}`);
      return ExecutionStatus.Succeeded;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }

      throw new ValidationException("Validation execution failed.", toError(error));
    } finally {
      this.logger.info("Closing browser.");
      await browser.close();
      this.logger.info("Validation finished.");
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
