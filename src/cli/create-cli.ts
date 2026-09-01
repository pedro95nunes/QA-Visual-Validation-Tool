import { Command } from "commander";
import { Logger } from "../core/interfaces/logger";
import { ApplicationMetadata } from "../core/models/application-metadata";
import { ApplicationProvider } from "../providers/application-provider";
import { ApplicationConfiguration } from "../configuration/application-configuration";
import { applyCliOverrides } from "../configuration/configuration-merger";
import { ValidationStatus } from "../core/models/validation-status";
import { ValidationFailureKind } from "../core/models/validation-failure-kind";
import { ValidationWorkflowResult } from "../engine/validation-workflow";
import { ConfigurationDoctor, renderDoctorResults } from "./commands/doctor";
import { renderProviders } from "./commands/providers";
import { renderActions } from "./commands/actions";
import { runInit } from "./commands/init";
import { runClean } from "./commands/clean";
import { CliOutput } from "./output";
import { DefaultActionRegistry } from "../infrastructure/actions/default-action-registry";
import { MockQaseAction } from "../actions/mock-qase.action";

/**
 * Creates the Commander CLI program.
 *
 * The CLI is a presentation layer only — it parses arguments, formats output,
 * and delegates to application services. No validation, comparison, or report
 * logic lives here.
 *
 * @param applicationProvider - Pre-wired composition root for the base configuration.
 * @param logger              - Output target (console in production, silent in tests).
 * @param baseConfiguration   - The loaded configuration (YAML + defaults).
 * @param configFilePath      - Path to the loaded config file, if any.
 */
export function createCli(
  applicationProvider: ApplicationProvider,
  logger: Logger,
  baseConfiguration: ApplicationConfiguration,
  configFilePath?: string
): Command {
  const program = new Command();

  program
    .name(ApplicationMetadata.name)
    .description(ApplicationMetadata.description)
    .version(ApplicationMetadata.version, "--version", "Display the application version")
    .option("--config <path>", "path to configuration file (default: atlas.config.yaml)")
    .helpOption("-h, --help", "Display help");

  // ── atlas validate ─────────────────────────────────────────────────────────
  program
    .command("validate")
    .description("Run visual validation against configured pages")
    .option("--environment <env>", "override the execution environment")
    .option("--qase", "enable the Qase action for this execution")
    .option("--no-qase", "disable the Qase action for this execution")
    .option("--html", "enable the HTML report for this execution")
    .option("--no-html", "disable the HTML report for this execution")
    .option("--json", "enable the JSON report for this execution")
    .option("--no-json", "disable the JSON report for this execution")
    .option("--quiet", "suppress informational output; only errors and the final status are shown")
    .option("--verbose", "show detailed diagnostic information")
    .addHelpText(
      "after",
      `
Examples:
  atlas validate
  atlas validate --config ./custom.yaml
  atlas validate --environment staging
  atlas validate --qase
  atlas validate --no-html --quiet
`
    )
    .action(async (options: ValidateOptions) => {
      const quiet = Boolean(options.quiet);
      const output = new CliOutput(logger, quiet);

      output.divider();
      output.info(ApplicationMetadata.description);
      if (configFilePath) output.info(`Configuration: ${configFilePath}`);
      output.divider();

      const config = applyCliOverrides(baseConfiguration, {
        environment: options.environment,
        actions: buildActionOverrides(options),
        report: buildReportOverrides(options),
      });

      const provider = new ApplicationProvider(config);

      try {
        const outcome = await provider.createValidationWorkflow().run();
        renderValidationOutcome(output, outcome, options.verbose ?? false);
        process.exitCode = resolveExitCode(outcome);
      } catch (error) {
        output.error(
          options.verbose
            ? `Error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
            : `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 3;
      }
    });

  // ── atlas init ─────────────────────────────────────────────────────────────
  program
    .command("init")
    .description("Interactively create an atlas.config.yaml in the current directory")
    .addHelpText(
      "after",
      `
Examples:
  atlas init
`
    )
    .action(async () => {
      const output = new CliOutput(logger);
      const exitCode = await runInit(output);
      process.exitCode = exitCode;
    });

  // ── atlas doctor ───────────────────────────────────────────────────────────
  program
    .command("doctor")
    .description("Validate the environment and configuration")
    .addHelpText(
      "after",
      `
Examples:
  atlas doctor
  atlas doctor --config ./custom.yaml
`
    )
    .action(() => {
      const output = new CliOutput(logger);
      output.section("Atlas Doctor");

      const doctor = new ConfigurationDoctor(baseConfiguration, configFilePath);
      const checks = doctor.check();
      const allPassed = renderDoctorResults(output, checks);

      process.exitCode = allPassed ? 0 : 1;
    });

  // ── atlas providers ────────────────────────────────────────────────────────
  program
    .command("providers")
    .description("List all registered browser, design, and comparator providers")
    .action(() => {
      const output = new CliOutput(logger);
      output.section("Providers");
      renderProviders(output);
    });

  // ── atlas actions ──────────────────────────────────────────────────────────
  program
    .command("actions")
    .description("List all registered actions and their current policy")
    .action(() => {
      const output = new CliOutput(logger);
      output.section("Actions");

      // Build a registry reflecting what is registered in this project
      const registry = new DefaultActionRegistry();
      registry.register(new MockQaseAction());

      renderActions(output, registry, baseConfiguration.actions ?? {});
    });

  // ── atlas clean ────────────────────────────────────────────────────────────
  program
    .command("clean")
    .description("Remove the artifacts directory (evidence, references, diffs, reports)")
    .option("--force", "skip the confirmation prompt (required in non-interactive/CI environments)")
    .addHelpText(
      "after",
      `
Examples:
  atlas clean
  atlas clean --force
`
    )
    .action(async (options: CleanOptions) => {
      const output = new CliOutput(logger);
      const artifactsDir = baseConfiguration.report.outputDirectory;
      process.exitCode = await runClean(output, artifactsDir, Boolean(options.force));
    });

  // ── atlas version ──────────────────────────────────────────────────────────
  program
    .command("version")
    .description("Display the application version")
    .action(() => {
      logger.info(ApplicationMetadata.version);
    });

  return program;
}

// ── Option types ─────────────────────────────────────────────────────────────

interface ValidateOptions {
  environment?: string;
  qase?: boolean;
  html?: boolean;
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

interface CleanOptions {
  force?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildActionOverrides(options: ValidateOptions): Record<string, { enabled?: boolean }> | undefined {
  const overrides: Record<string, { enabled?: boolean }> = {};
  if (options.qase !== undefined) overrides.qase = { enabled: options.qase };
  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

function buildReportOverrides(
  options: ValidateOptions
): { html?: { enabled?: boolean }; json?: { enabled?: boolean } } | undefined {
  const report: { html?: { enabled?: boolean }; json?: { enabled?: boolean } } = {};
  if (options.html !== undefined) report.html = { enabled: options.html };
  if (options.json !== undefined) report.json = { enabled: options.json };
  return Object.keys(report).length > 0 ? report : undefined;
}

function renderValidationOutcome(output: CliOutput, outcome: ValidationWorkflowResult, verbose: boolean): void {
  const pageResults = outcome.run.executions.flatMap((e) => e.results);

  output.section("Validation");

  for (const result of pageResults) {
    if (result.status === ValidationStatus.Passed) {
      output.pass(result.pageId, result.url);
    } else if (result.status === ValidationStatus.Failed) {
      const diff = result.comparison?.differencePercentage.toFixed(2);
      const allowed = result.comparison?.allowedDifferencePercentage.toFixed(2);
      output.fail(result.pageId, result.url);
      if (diff !== undefined) output.info(`    Difference: ${diff}%  (allowed: ${allowed}%)`);
    } else {
      output.fail(result.pageId, result.findings[0] ?? "execution error");
    }
  }

  const { summary } = outcome.run;
  output.section("Summary");
  output.info(`  Total:    ${summary.total}`);
  output.info(`  Passed:   ${summary.passed}`);
  output.info(`  Failed:   ${summary.failed}`);
  if (summary.errors > 0) output.info(`  Errors:   ${summary.errors}`);
  output.info(`  Duration: ${(outcome.run.duration / 1000).toFixed(1)}s`);

  output.section("Reports");

  for (const report of outcome.reports) {
    output.pass(report.reportName, report.outputPath);
  }

  if (outcome.reports.length === 0) {
    output.info("  (reporting disabled)");
  }

  output.info(`  Artifacts: ${outcome.runDirectory}`);

  output.blank();
  output.divider();

  if (verbose) {
    output.info("");
    output.info("Execution ID: " + outcome.run.executionId);
    output.info("Environment:  " + outcome.run.environment.nodeVersion);
    output.info("Platform:     " + outcome.run.environment.platform);
  }

  const statusLabel =
    outcome.run.status === ValidationStatus.Passed
      ? "PASSED"
      : outcome.run.status === ValidationStatus.Failed
        ? "FAILED"
        : "ERROR";

  output.always(`Validation ${statusLabel}`);
}

function resolveExitCode(outcome: ValidationWorkflowResult): number {
  const pageResults = outcome.run.executions.flatMap((e) => e.results);

  if (pageResults.some((r) => r.failureKind === ValidationFailureKind.Configuration)) {
    return 2;
  }
  if (outcome.run.status === ValidationStatus.Error) return 3;
  if (outcome.run.status === ValidationStatus.Failed) return 1;
  return 0;
}
