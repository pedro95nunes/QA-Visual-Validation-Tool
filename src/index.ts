#!/usr/bin/env node

import { createCli } from "./cli/create-cli";
import { defaultApplicationConfiguration } from "./configuration/default-application-configuration";
import { ConsoleLogger } from "./infrastructure/logging/console-logger";
import { ApplicationProvider } from "./providers/application-provider";

const logger = new ConsoleLogger();
const applicationProvider = new ApplicationProvider(defaultApplicationConfiguration);
const cli = createCli(applicationProvider, logger);

void cli.parseAsync().catch(() => {
  logger.error("Validation failed.");
  process.exitCode = 1;
});
