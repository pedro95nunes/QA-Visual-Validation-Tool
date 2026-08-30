#!/usr/bin/env node

import { createCli } from "./cli/create-cli";
import { defaultApplicationConfiguration } from "./configuration/default-application-configuration";
import { ConsoleLogger } from "./infrastructure/logging/console-logger";
import { ConfigurationException } from "./core/exceptions/configuration.exception";
import { ApplicationProvider } from "./providers/application-provider";

const logger = new ConsoleLogger();
const applicationProvider = new ApplicationProvider(defaultApplicationConfiguration);
const cli = createCli(applicationProvider, logger);

void cli.parseAsync().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : "Validation execution failed.");
  process.exitCode = error instanceof ConfigurationException ? 2 : 3;
});
