import assert from "node:assert/strict";
import test from "node:test";
import { ActionEngine } from "../src/engine/action-engine";
import { Action } from "../src/core/interfaces/action";
import { ActionContext } from "../src/core/interfaces/action-context";
import { ActionResult, ActionStatus } from "../src/core/interfaces/action-result";
import { ActionsConfiguration } from "../src/configuration/action-configuration";
import { Logger } from "../src/core/interfaces/logger";
import { DefaultActionRegistry } from "../src/infrastructure/actions/default-action-registry";
import { DefaultActionPolicyEvaluator } from "../src/infrastructure/actions/default-action-policy-evaluator";
import { ValidationRun } from "../src/core/models/validation-run";
import { oneFailedRun, zeroDifferenceRun } from "./fixtures/report-fixtures";

class SilentLogger implements Logger {
  public info(): void {}
  public error(): void {}
}

class SuccessfulAction implements Action {
  public readonly calls: ActionContext[] = [];
  public constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
  public async execute(context: ActionContext): Promise<ActionResult> {
    this.calls.push(context);
    return {
      actionId: this.id,
      actionName: this.name,
      success: true,
      status: ActionStatus.Executed,
      duration: 1,
      message: "ok",
      metadata: {},
    };
  }
}

class FailingAction implements Action {
  public readonly id = "failing";
  public readonly name = "Failing Action";
  public async execute(_context: ActionContext): Promise<ActionResult> {
    throw new Error("integration outage");
  }
}

function engine(actions: Action[], config: ActionsConfiguration, run?: ValidationRun, environment = ""): ActionEngine {
  const registry = new DefaultActionRegistry();
  for (const action of actions) {
    registry.register(action);
  }
  return new ActionEngine(new SilentLogger(), registry, new DefaultActionPolicyEvaluator(), config, environment);
}

// ── enabled / disabled ─────────────────────────────────────────────────────

test("executes an enabled action", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], { qase: { enabled: true } });

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 1);
  assert.equal(results[0].status, ActionStatus.Executed);
  assert.equal(action.calls.length, 1);
});

test("skips a disabled action", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], { qase: { enabled: false } });

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 0);
  assert.equal(action.calls.length, 0);
});

test("skips when no configuration entry exists for the action", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], {});

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 0);
  assert.equal(action.calls.length, 0);
});

// ── onlyOnFailure ──────────────────────────────────────────────────────────

test("skips when onlyOnFailure=true and run passed", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], { qase: { enabled: true, onlyOnFailure: true } });

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 0);
  assert.equal(action.calls.length, 0);
});

test("executes when onlyOnFailure=true and run failed", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], { qase: { enabled: true, onlyOnFailure: true } });

  const results = await eng.execute(oneFailedRun);

  assert.equal(results.length, 1);
  assert.equal(results[0].success, true);
});

// ── environment ────────────────────────────────────────────────────────────

test("skips when current environment is not in the policy list", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine(
    [action],
    { qase: { enabled: true, environments: ["staging", "production"] } },
    undefined,
    "local"
  );

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 0);
});

test("executes when current environment matches the policy list", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], { qase: { enabled: true, environments: ["staging"] } }, undefined, "staging");

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 1);
  assert.equal(results[0].success, true);
});

// ── failure isolation ──────────────────────────────────────────────────────

test("a failing action does not prevent other actions from executing", async () => {
  const successful = new SuccessfulAction("slack", "Slack");
  const failing = new FailingAction();
  const eng = engine([failing, successful], {
    failing: { enabled: true },
    slack: { enabled: true },
  });

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 2);
  assert.equal(successful.calls.length, 1);

  const failResult = results.find((r) => r.actionId === "failing");
  assert.ok(failResult);
  assert.equal(failResult!.success, false);
  assert.equal(failResult!.status, ActionStatus.Failed);
});

test("a failing action result does not mutate the ValidationRun", async () => {
  const failing = new FailingAction();
  const eng = engine([failing], { failing: { enabled: true } });

  const statusBefore = oneFailedRun.status;
  await eng.execute(oneFailedRun);

  assert.equal(oneFailedRun.status, statusBefore);
});

// ── multiple actions ───────────────────────────────────────────────────────

test("executes multiple eligible actions independently", async () => {
  const qase = new SuccessfulAction("qase", "Qase");
  const slack = new SuccessfulAction("slack", "Slack");
  const eng = engine([qase, slack], { qase: { enabled: true }, slack: { enabled: true } });

  const results = await eng.execute(zeroDifferenceRun);

  assert.equal(results.length, 2);
  assert.equal(qase.calls.length, 1);
  assert.equal(slack.calls.length, 1);
});

// ── ActionContext ──────────────────────────────────────────────────────────

test("passes the correct executionId and environment in ActionContext", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], { qase: { enabled: true } }, undefined, "staging");

  await eng.execute(zeroDifferenceRun);

  const ctx = action.calls[0];
  assert.equal(ctx.executionId, zeroDifferenceRun.executionId);
  assert.equal(ctx.environment, "staging");
  assert.strictEqual(ctx.run, zeroDifferenceRun);
});

// ── EventHandler interface ─────────────────────────────────────────────────

test("handle() dispatches the ValidationCompletedEvent to execute()", async () => {
  const action = new SuccessfulAction("qase", "Qase");
  const eng = engine([action], { qase: { enabled: true } });

  await eng.handle({
    type: "validation.completed",
    occurredAt: new Date(),
    executionId: zeroDifferenceRun.executionId,
    run: zeroDifferenceRun,
  });

  assert.equal(action.calls.length, 1);
});
