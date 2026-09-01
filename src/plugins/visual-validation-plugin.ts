import { ComparisonConfiguration } from "../configuration/comparison-configuration";
import { VisualValidationPageConfiguration } from "../configuration/visual-validation-page-configuration";
import { ConfigurationException } from "../core/exceptions/configuration.exception";
import { BrowserFactory } from "../core/interfaces/browser-factory";
import { Comparator } from "../core/interfaces/comparator";
import { Logger } from "../core/interfaces/logger";
import { ReferenceServiceFactory } from "../core/interfaces/reference-service-factory";
import { ScreenshotServiceFactory } from "../core/interfaces/screenshot-service-factory";
import { ValidationPlugin } from "../core/interfaces/validation-plugin";
import { ComparisonOptions } from "../core/models/comparison-options";
import { ComparisonStatus } from "../core/models/comparison-status";
import { ValidationContext } from "../core/models/validation-context";
import { ValidationExecutionResult } from "../core/models/validation-execution-result";
import { ValidationFailureKind } from "../core/models/validation-failure-kind";
import { ValidationResult } from "../core/models/validation-result";
import { ValidationStatus } from "../core/models/validation-status";
import { VisualValidationRequest } from "../core/models/visual-validation-request";

const PLUGIN_ID = "visual-validation";
const PLUGIN_NAME = "Visual Validation";

/** Orchestrates evidence, reference, and comparison for configured visual pages. */
export class VisualValidationPlugin implements ValidationPlugin {
  public readonly id = PLUGIN_ID;
  public readonly name = PLUGIN_NAME;

  public constructor(
    private readonly logger: Logger,
    private readonly browserFactory: BrowserFactory,
    private readonly screenshotServiceFactory: ScreenshotServiceFactory,
    private readonly referenceServiceFactory: ReferenceServiceFactory,
    private readonly comparator: Comparator,
    private readonly pages: VisualValidationPageConfiguration[],
    private readonly comparisonConfiguration: ComparisonConfiguration
  ) {}

  public async execute(_context: ValidationContext): Promise<ValidationExecutionResult> {
    const startedAt = performance.now();
    const browser = this.browserFactory.create();
    const results: ValidationResult[] = [];

    try {
      await browser.launch();
      for (const page of this.pages) {
        results.push(await this.validatePage(browser, page));
      }
    } catch (error) {
      results.push(this.executionFailureResult(error));
    } finally {
      try {
        await browser.close();
      } catch (error) {
        results.push(this.executionFailureResult(error));
      }
    }

    return aggregateResults(this.id, results, performance.now() - startedAt);
  }

  private async validatePage(
    browser: ReturnType<BrowserFactory["create"]>,
    page: VisualValidationPageConfiguration
  ): Promise<ValidationResult> {
    const startedAt = performance.now();
    this.logger.info(`Page: ${page.id}`);

    try {
      const request = this.toRequest(page);
      this.logger.info("Opening page...");
      await browser.open(request.url);
      this.logger.info("Capturing evidence...");
      const evidence = await this.screenshotServiceFactory.create(browser, page.id).capture();
      this.logger.info("Retrieving reference...");
      const reference = await this.referenceServiceFactory.create(request).retrieve();
      this.logger.info("Comparing...");
      const comparison = await this.comparator.compare(reference, evidence, request.comparison);
      const status = comparison.passed
        ? ValidationStatus.Passed
        : comparison.status === ComparisonStatus.Failed
          ? ValidationStatus.Failed
          : ValidationStatus.Error;
      this.logger.info(`Difference: ${comparison.differencePercentage.toFixed(2)}%`);
      this.logger.info(`Allowed: ${comparison.allowedDifferencePercentage.toFixed(2)}%`);
      this.logger.info(`Result: ${status}`);

      return {
        pageId: page.id,
        url: page.url,
        status,
        comparison,
        evidence,
        reference,
        duration: performance.now() - startedAt,
        findings: comparison.passed ? [] : [`Comparison result: ${comparison.status}.`],
        metrics: {
          differencePercentage: comparison.differencePercentage,
          differentPixels: comparison.differentPixels,
          totalPixels: comparison.totalPixels,
        },
      };
    } catch (error) {
      this.logger.error(`Page ${page.id} failed: ${toSafeMessage(error)}`);
      return {
        pageId: page.id,
        url: page.url,
        status: ValidationStatus.Error,
        failureKind:
          error instanceof ConfigurationException
            ? ValidationFailureKind.Configuration
            : ValidationFailureKind.Execution,
        duration: performance.now() - startedAt,
        findings: [toSafeMessage(error)],
        metrics: {},
      };
    }
  }

  private toRequest(page: VisualValidationPageConfiguration): VisualValidationRequest {
    validatePageConfiguration(page);
    const comparison = { ...this.comparisonConfiguration, ...page.comparison };
    validateComparisonConfiguration(comparison);

    return {
      pageId: page.id,
      url: page.url,
      reference: page.reference,
      comparison: toComparisonOptions(comparison),
    };
  }

  private executionFailureResult(error: unknown): ValidationResult {
    return {
      pageId: "execution",
      status: ValidationStatus.Error,
      duration: 0,
      findings: [toSafeMessage(error)],
      metrics: {},
    };
  }
}

function toComparisonOptions(configuration: ComparisonConfiguration): ComparisonOptions {
  return {
    pixelThreshold: configuration.pixelThreshold,
    allowedDifferencePercentage: configuration.allowedDifferencePercentage,
    includeAA: configuration.includeAA,
    alpha: configuration.alpha,
  };
}

function validatePageConfiguration(page: VisualValidationPageConfiguration): void {
  if (!page.id.trim()) throw new ConfigurationException("Visual validation page id is required.");
  if (!page.url.trim()) throw new ConfigurationException(`Visual validation page '${page.id}' requires a URL.`);
  if (!page.reference?.provider)
    throw new ConfigurationException(`Visual validation page '${page.id}' requires a reference provider.`);
  if (!page.reference.fileKey.trim())
    throw new ConfigurationException(`Visual validation page '${page.id}' requires a Figma fileKey.`);
  if (!page.reference.nodeId.trim())
    throw new ConfigurationException(`Visual validation page '${page.id}' requires a Figma nodeId.`);
}

function validateComparisonConfiguration(configuration: ComparisonConfiguration): void {
  if (configuration.pixelThreshold < 0 || configuration.pixelThreshold > 1) {
    throw new ConfigurationException("Comparison pixelThreshold must be between 0 and 1.");
  }
  if (configuration.allowedDifferencePercentage < 0 || configuration.allowedDifferencePercentage > 100) {
    throw new ConfigurationException("Comparison allowedDifferencePercentage must be between 0 and 100.");
  }
  if (configuration.alpha < 0 || configuration.alpha > 1) {
    throw new ConfigurationException("Comparison alpha must be between 0 and 1.");
  }
}

function aggregateResults(pluginId: string, results: ValidationResult[], duration: number): ValidationExecutionResult {
  const passed = results.filter((result) => result.status === ValidationStatus.Passed).length;
  const failed = results.filter((result) => result.status === ValidationStatus.Failed).length;
  const errors = results.filter((result) => result.status === ValidationStatus.Error).length;
  return {
    pluginId,
    status: errors > 0 ? ValidationStatus.Error : failed > 0 ? ValidationStatus.Failed : ValidationStatus.Passed,
    results,
    total: results.length,
    passed,
    failed,
    errors,
    duration,
  };
}

function toSafeMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Visual validation failed.";
}
