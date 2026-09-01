#!/usr/bin/env node

import { createCli } from "./cli/create-cli";
import { ConsoleLogger } from "./infrastructure/logging/console-logger";
import { ConfigurationException } from "./core/exceptions/configuration.exception";
import { ApplicationProvider } from "./providers/application-provider";
import { loadConfiguration } from "./configuration/yaml-configuration-loader";

async function main(): Promise<void> {
  const logger = new ConsoleLogger();

  try {
    // Quick argv scan for --config before Commander parses the full tree.
    const configPath = extractConfigPath(process.argv);

    const { configuration, filePath } = await loadConfiguration(configPath);
    const applicationProvider = new ApplicationProvider(configuration);

    const cli = createCli(applicationProvider, logger, configuration, filePath);
    await cli.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof ConfigurationException) {
      logger.error(`Configuration error: ${error.message}`);
      process.exitCode = 2;
      return;
    }
    logger.error(error instanceof Error ? error.message : "Unexpected error.");
    process.exitCode = 3;
  }
}

/** Extracts the value of --config from raw argv without invoking Commander. */
function extractConfigPath(argv: string[]): string | undefined {
  const idx = argv.indexOf("--config");
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  const match = argv.find((a) => a.startsWith("--config="));
  return match?.split("=")[1];
}

void main();
