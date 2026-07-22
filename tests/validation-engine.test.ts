import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../src/core/interfaces/logger";
import { ExecutionStatus } from "../src/core/models/execution-status";
import { ValidationEngine } from "../src/engine/validation-engine";

class TestLogger implements Logger {
  public readonly messages: string[] = [];

  public info(message: string): void {
    this.messages.push(message);
  }

  public error(_message: string): void {}
}

test("executes the validation engine successfully", () => {
  const logger = new TestLogger();
  const engine = new ValidationEngine(logger);

  const status = engine.execute();

  assert.equal(status, ExecutionStatus.Succeeded);
  assert.deepEqual(logger.messages, [
    "Validation Engine started.",
    "Validation finished successfully."
  ]);
});
