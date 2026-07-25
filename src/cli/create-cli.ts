import { Command } from "commander";
import { Logger } from "../core/interfaces/logger";
import { ApplicationMetadata } from "../core/models/application-metadata";
import { ApplicationProvider } from "../providers/application-provider";

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

    await applicationProvider.createValidationEngine().execute();
  });

  program.command("version").description("Display the application version").action(() => {
    logger.info(ApplicationMetadata.version);
  });

  program.command("doctor").description("Check the application environment").action(() => {
    logger.info("Doctor checks are planned for a future sprint.");
  });

  return program;
}
