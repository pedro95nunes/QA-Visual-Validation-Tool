import { ValidationEngine } from "../engine/validation-engine";
import { ConsoleLogger } from "../infrastructure/logging/console-logger";

/** Composition root that wires concrete infrastructure into the application. */
export class ApplicationProvider {
  public createValidationEngine(): ValidationEngine {
    const logger = new ConsoleLogger();
    return new ValidationEngine(logger);
  }
}
