import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../src/core/interfaces/logger";
import { ValidationPlugin } from "../src/core/interfaces/validation-plugin";
import { ValidationContext } from "../src/core/models/validation-context";
import { ValidationExecutionResult } from "../src/core/models/validation-execution-result";
import { ValidationStatus } from "../src/core/models/validation-status";
import { ValidationEngine } from "../src/engine/validation-engine";
import { ValidationPluginRegistry } from "../src/engine/validation-plugin-registry";

class TestLogger implements Logger {
  public readonly messages: string[] = [];
  public info(message: string): void {
    this.messages.push(message);
  }
  public error(_message: string): void {}
}

class FakePlugin implements ValidationPlugin {
  public readonly id = "fake";
  public readonly name = "Fake";
  public executed = false;
  public async execute(_context: ValidationContext): Promise<ValidationExecutionResult> {
    this.executed = true;
    return {
      pluginId: this.id,
      status: ValidationStatus.Passed,
      results: [],
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      duration: 1,
    };
  }
}

test("executes registered plugins without knowing validation details", async () => {
  const logger = new TestLogger();
  const plugin = new FakePlugin();
  const engine = new ValidationEngine(logger, new ValidationPluginRegistry([plugin]), [plugin.id]);

  const results = await engine.execute();

  assert.equal(plugin.executed, true);
  assert.equal(results[0].status, ValidationStatus.Passed);
  assert.equal(logger.messages[0], "Validation started.");
  assert.match(logger.messages[1], /fake: PASSED/);
  assert.equal(logger.messages[2], "Validation finished.");
});
