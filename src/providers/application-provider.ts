import { ApplicationConfiguration } from "../configuration/application-configuration";
import { DefaultComparatorFactory } from "../infrastructure/comparator/default-comparator-factory";
import { ValidationEngine } from "../engine/validation-engine";
import { ValidationWorkflow } from "../engine/validation-workflow";
import { ActionEngine } from "../engine/action-engine";
import { ValidationPluginRegistry } from "../engine/validation-plugin-registry";
import { DefaultBrowserFactory } from "../infrastructure/browser/default-browser-factory";
import { DefaultReferenceServiceFactory } from "../infrastructure/design/default-reference-service-factory";
import { DefaultExecutionIdFactory } from "../infrastructure/execution/default-execution-id-factory";
import { ConsoleLogger } from "../infrastructure/logging/console-logger";
import { DefaultScreenshotServiceFactory } from "../infrastructure/screenshot/default-screenshot-service-factory";
import { LocalFileStorage } from "../infrastructure/storage/local-file-storage";
import { InMemoryEventBus } from "../infrastructure/events/in-memory-event-bus";
import { DefaultActionRegistry } from "../infrastructure/actions/default-action-registry";
import { DefaultActionPolicyEvaluator } from "../infrastructure/actions/default-action-policy-evaluator";
import { VisualValidationPlugin } from "../plugins/visual-validation-plugin";
import { ArtifactOrganizer } from "../reports/artifact-organizer";
import { DefaultReportRegistry } from "../reports/default-report-registry";
import { HtmlReport } from "../reports/html/html-report";
import { JsonReport } from "../reports/json/json-report";
import { ReportEngine } from "../reports/report-engine";
import { MockQaseAction } from "../actions/mock-qase.action";
import { VALIDATION_COMPLETED } from "../core/events/validation-completed.event";

/** Composition root that wires concrete infrastructure into the application. */
export class ApplicationProvider {
  public constructor(private readonly configuration: ApplicationConfiguration) {}

  public createValidationEngine(): ValidationEngine {
    const logger = new ConsoleLogger();
    const storage = new LocalFileStorage();
    const browserFactory = new DefaultBrowserFactory(this.configuration.browser);
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

  public createValidationWorkflow(): ValidationWorkflow {
    const logger = new ConsoleLogger();
    const storage = new LocalFileStorage();
    const engine = this.createValidationEngine();
    const reportEngine = new ReportEngine(
      logger,
      new DefaultReportRegistry(
        [
          { report: new HtmlReport(storage), enabled: this.configuration.report.html.enabled },
          { report: new JsonReport(storage), enabled: this.configuration.report.json.enabled },
        ],
        this.configuration.report.enabled
      ),
      new ArtifactOrganizer(storage, logger),
      this.configuration.report
    );

    const eventBus = new InMemoryEventBus();

    const actionRegistry = new DefaultActionRegistry();
    actionRegistry.register(new MockQaseAction());

    const actionEngine = new ActionEngine(
      logger,
      actionRegistry,
      new DefaultActionPolicyEvaluator(),
      this.configuration.actions ?? {},
      this.configuration.environment ?? ""
    );

    eventBus.subscribe(VALIDATION_COMPLETED, actionEngine);

    return new ValidationWorkflow(logger, engine, reportEngine, new DefaultExecutionIdFactory(), undefined, eventBus);
  }
}
