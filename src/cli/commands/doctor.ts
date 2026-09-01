import { ApplicationConfiguration } from "../../configuration/application-configuration";
import { BrowserProvider } from "../../configuration/browser-configuration";
import { ComparatorProvider } from "../../configuration/comparison-configuration";
import { CliOutput } from "../output";

export interface DiagnosticCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail?: string;
  readonly fix?: string;
}

/** Runs all environment and configuration diagnostic checks. */
export class ConfigurationDoctor {
  public constructor(
    private readonly configuration: ApplicationConfiguration,
    private readonly configFilePath?: string
  ) {}

  public check(): DiagnosticCheck[] {
    const checks: DiagnosticCheck[] = [];

    checks.push(checkNodeVersion());
    checks.push(this.checkConfigFile());
    checks.push(this.checkBrowserProvider());
    checks.push(this.checkFigmaToken());
    checks.push(this.checkFigmaFileKey());
    checks.push(this.checkPixelmatch());
    checks.push(this.checkStorage());
    checks.push(this.checkReportConfiguration());

    const actionChecks = this.checkActions();
    checks.push(...actionChecks);

    return checks;
  }

  private checkConfigFile(): DiagnosticCheck {
    if (this.configFilePath) {
      return { name: "Configuration file", passed: true, detail: this.configFilePath };
    }
    return {
      name: "Configuration file",
      passed: false,
      detail: "No atlas.config.yaml found.",
      fix: "Run 'atlas init' to create a configuration file.",
    };
  }

  private checkBrowserProvider(): DiagnosticCheck {
    const provider = this.configuration.browser.provider;
    if (provider === BrowserProvider.Playwright) {
      return { name: "Browser provider (Playwright)", passed: true };
    }
    return {
      name: "Browser provider",
      passed: false,
      detail: `Unknown provider: ${provider}`,
      fix: `Set browser.provider to "playwright" in your configuration.`,
    };
  }

  private checkFigmaToken(): DiagnosticCheck {
    const token = this.configuration.figma.token;
    if (token && token.length > 0) {
      return { name: "FIGMA_TOKEN", passed: true, detail: "Configured (value hidden)" };
    }
    return {
      name: "FIGMA_TOKEN",
      passed: false,
      detail: "Environment variable FIGMA_TOKEN is not set.",
      fix: `export FIGMA_TOKEN="your-figma-token"`,
    };
  }

  private checkFigmaFileKey(): DiagnosticCheck {
    const hasPageWithKey = this.configuration.visual.pages.some(
      (p) => p.reference?.fileKey && p.reference.fileKey.length > 0
    );
    if (hasPageWithKey) {
      return { name: "Figma file key", passed: true };
    }
    const globalKey = this.configuration.figma.fileKey;
    if (globalKey && globalKey.length > 0) {
      return { name: "Figma file key", passed: true };
    }
    return {
      name: "Figma file key",
      passed: false,
      detail: "No Figma file key configured.",
      fix: `export FIGMA_FILE_KEY="your-file-key"  (or set reference.fileKey in config)`,
    };
  }

  private checkPixelmatch(): DiagnosticCheck {
    const comparator = this.configuration.visual.comparison.comparator;
    if (comparator === ComparatorProvider.Pixelmatch) {
      return { name: "Comparator (Pixelmatch)", passed: true };
    }
    return {
      name: "Comparator",
      passed: false,
      detail: `Unknown comparator: ${comparator}`,
      fix: `Set visual.comparison.comparator to "pixelmatch" in your configuration.`,
    };
  }

  private checkStorage(): DiagnosticCheck {
    const dir = this.configuration.report.outputDirectory;
    if (dir && dir.length > 0) {
      return { name: "Storage (local filesystem)", passed: true, detail: `Output: ${dir}` };
    }
    return {
      name: "Storage",
      passed: false,
      detail: "No output directory configured.",
      fix: `Set report.outputDirectory in your configuration.`,
    };
  }

  private checkReportConfiguration(): DiagnosticCheck {
    const report = this.configuration.report;
    if (!report.enabled) {
      return { name: "Reports", passed: true, detail: "Disabled" };
    }
    const enabled = [report.html.enabled ? "HTML" : null, report.json.enabled ? "JSON" : null]
      .filter(Boolean)
      .join(", ");

    if (enabled.length > 0) {
      return { name: "Reports", passed: true, detail: `Enabled: ${enabled}` };
    }
    return {
      name: "Reports",
      passed: false,
      detail: "Reports are enabled but no format is selected.",
      fix: "Set report.html.enabled or report.json.enabled to true.",
    };
  }

  private checkActions(): DiagnosticCheck[] {
    const actions = this.configuration.actions;
    if (!actions || Object.keys(actions).length === 0) {
      return [{ name: "Actions", passed: true, detail: "None configured" }];
    }
    return Object.entries(actions).map(([id, policy]) => ({
      name: `Action: ${id}`,
      passed: true,
      detail: policy.enabled ? "Enabled" : "Disabled",
    }));
  }
}

function checkNodeVersion(): DiagnosticCheck {
  const version = process.version;
  const major = parseInt(version.slice(1), 10);
  if (major >= 18) {
    return { name: "Node.js", passed: true, detail: version };
  }
  return {
    name: "Node.js",
    passed: false,
    detail: `Node.js ${version} detected. Version 18 or higher is required.`,
    fix: "Upgrade Node.js to version 18 or higher.",
  };
}

/** Writes the doctor results to the given output. Returns true if all checks passed. */
export function renderDoctorResults(output: CliOutput, checks: DiagnosticCheck[]): boolean {
  const allPassed = checks.every((c) => c.passed);

  for (const check of checks) {
    if (check.passed) {
      output.pass(check.name, check.detail);
    } else {
      output.fail(check.name, check.detail);
      if (check.fix) {
        output.fix(check.fix);
      }
    }
  }

  output.blank();

  if (allPassed) {
    output.always("No problems found.");
  } else {
    const failures = checks.filter((c) => !c.passed).length;
    output.always(`${failures} problem(s) found. See the fixes above.`);
  }

  return allPassed;
}
