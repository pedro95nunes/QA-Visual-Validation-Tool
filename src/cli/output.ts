import { Logger } from "../core/interfaces/logger";

export const DIVIDER = "────────────────────────────────────────";

export const icons = {
  pass: "✓",
  fail: "✗",
  warn: "⚠",
  skip: "─",
  bullet: "•",
} as const;

/** Structured output helper. Writes to the given Logger at info level. */
export class CliOutput {
  public constructor(
    private readonly logger: Logger,
    private readonly quiet = false
  ) {}

  public divider(): void {
    if (!this.quiet) this.logger.info(DIVIDER);
  }

  public blank(): void {
    if (!this.quiet) this.logger.info("");
  }

  public section(title: string): void {
    if (!this.quiet) {
      this.blank();
      this.logger.info(title);
      this.divider();
    }
  }

  public pass(label: string, detail?: string): void {
    const suffix = detail ? `  ${detail}` : "";
    this.logger.info(`  ${icons.pass} ${label}${suffix}`);
  }

  public fail(label: string, detail?: string): void {
    const suffix = detail ? `  ${detail}` : "";
    this.logger.info(`  ${icons.fail} ${label}${suffix}`);
  }

  public warn(label: string, detail?: string): void {
    if (!this.quiet) {
      const suffix = detail ? `  ${detail}` : "";
      this.logger.info(`  ${icons.warn} ${label}${suffix}`);
    }
  }

  public item(label: string, value?: string): void {
    if (!this.quiet) {
      const suffix = value ? `: ${value}` : "";
      this.logger.info(`  ${icons.bullet} ${label}${suffix}`);
    }
  }

  public info(message: string): void {
    if (!this.quiet) this.logger.info(message);
  }

  public always(message: string): void {
    this.logger.info(message);
  }

  public error(message: string): void {
    this.logger.error(message);
  }

  public fix(message: string): void {
    if (!this.quiet) this.logger.info(`    Fix: ${message}`);
  }

  public keyValue(key: string, value: string): void {
    if (!this.quiet) this.logger.info(`  ${key}: ${value}`);
  }
}
