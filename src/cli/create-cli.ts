import { Command } from "commander";
import { Logger } from "../core/interfaces/logger";
import { ApplicationMetadata } from "../core/models/application-metadata";
import { ApplicationProvider } from "../providers/application-provider";
import { ValidationStatus } from "../core/models/validation-status";
import { ValidationFailureKind } from "../core/models/validation-failure-kind";

const VALIDATION_START_MESSAGE = "Starting validation...";
const DIVIDER = "-----------------------------------------";

/** Creates the command-line adapter without embedding application flow logic. */
export function createCli(applicationProvider: ApplicationProvider, logger: Logger): Command {
  const program = new Command();

  program.name(ApplicationMetadata.name).description(ApplicationMetadata.description);
  program.command("validate").description("Start a validation execution").action(async () => {
    logger.info(DIVIDER);
    logger.info(ApplicationMetadata.description);
    logger.info(VALIDATION_START_MESSAGE);
    logger.info(DIVIDER);

    const results = await applicationProvider.createValidationEngine().execute();
    if (results.some((result) => result.results.some(
      (pageResult) => pageResult.failureKind === ValidationFailureKind.Configuration
    ))) {
      process.exitCode = 2;
    } else if (results.some((result) => result.status === ValidationStatus.Error)) {
      process.exitCode = 3;
    } else if (results.some((result) => result.status === ValidationStatus.Failed)) {
      process.exitCode = 1;
    }
  });

  program.command("version").description("Display the application version").action(() => {
    logger.info(ApplicationMetadata.version);
  });

  program.command("doctor").description("Check the application environment").action(() => {
    logger.info("Doctor checks are planned for a future sprint.");
  });

  return program;
}
