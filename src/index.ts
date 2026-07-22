#!/usr/bin/env node

import { createCli } from "./cli/create-cli";
import { ConsoleLogger } from "./infrastructure/logging/console-logger";
import { ApplicationProvider } from "./providers/application-provider";

const logger = new ConsoleLogger();
const applicationProvider = new ApplicationProvider();
const cli = createCli(applicationProvider, logger);

cli.parse();
