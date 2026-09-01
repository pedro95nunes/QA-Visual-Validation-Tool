import assert from "node:assert/strict";
import test from "node:test";
import { renderProviders } from "../src/cli/commands/providers";
import { renderActions } from "../src/cli/commands/actions";
import { DefaultActionRegistry } from "../src/infrastructure/actions/default-action-registry";
import { MockQaseAction } from "../src/actions/mock-qase.action";
import { Logger } from "../src/core/interfaces/logger";
import { CliOutput } from "../src/cli/output";
import { BrowserProvider } from "../src/configuration/browser-configuration";
import { DesignProviderType } from "../src/configuration/design-configuration";
import { ComparatorProvider } from "../src/configuration/comparison-configuration";

class RecordingLogger implements Logger {
  public readonly lines: string[] = [];
  public info(message: string): void {
    this.lines.push(message);
  }
  public error(message: string): void {
    this.lines.push(`[error] ${message}`);
  }
}

function outputWith(logger: RecordingLogger): CliOutput {
  return new CliOutput(logger);
}

// ── providers ───────────────────────────────────────────────────────────────

test("renderProviders outputs every BrowserProvider value", () => {
  const logger = new RecordingLogger();
  renderProviders(outputWith(logger));
  for (const value of Object.values(BrowserProvider)) {
    assert.ok(
      logger.lines.some((l) => l.includes(value)),
      `Expected output to include: ${value}`
    );
  }
});

test("renderProviders outputs every DesignProviderType value", () => {
  const logger = new RecordingLogger();
  renderProviders(outputWith(logger));
  for (const value of Object.values(DesignProviderType)) {
    assert.ok(
      logger.lines.some((l) => l.includes(value)),
      `Expected output to include: ${value}`
    );
  }
});

test("renderProviders outputs every ComparatorProvider value", () => {
  const logger = new RecordingLogger();
  renderProviders(outputWith(logger));
  for (const value of Object.values(ComparatorProvider)) {
    assert.ok(
      logger.lines.some((l) => l.includes(value)),
      `Expected output to include: ${value}`
    );
  }
});

// ── actions ─────────────────────────────────────────────────────────────────

test("renderActions uses ActionRegistry — does not hardcode action IDs", () => {
  const registry = new DefaultActionRegistry();
  registry.register(new MockQaseAction());
  const logger = new RecordingLogger();

  renderActions(outputWith(logger), registry, {});

  assert.ok(logger.lines.some((l) => l.includes("qase")));
});

test("renderActions shows enabled status from configuration", () => {
  const registry = new DefaultActionRegistry();
  registry.register(new MockQaseAction());
  const logger = new RecordingLogger();

  renderActions(outputWith(logger), registry, { qase: { enabled: true } });

  const line = logger.lines.find((l) => l.includes("qase"))!;
  assert.ok(line.includes("enabled"), `Expected "enabled" in: ${line}`);
});

test("renderActions shows disabled status when action is off", () => {
  const registry = new DefaultActionRegistry();
  registry.register(new MockQaseAction());
  const logger = new RecordingLogger();

  renderActions(outputWith(logger), registry, { qase: { enabled: false } });

  const line = logger.lines.find((l) => l.includes("qase"))!;
  assert.ok(line.includes("disabled"), `Expected "disabled" in: ${line}`);
});

test("renderActions with empty registry shows no-actions message", () => {
  const registry = new DefaultActionRegistry();
  const logger = new RecordingLogger();

  renderActions(outputWith(logger), registry, {});

  assert.ok(logger.lines.some((l) => l.toLowerCase().includes("no action")));
});
