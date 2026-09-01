import assert from "node:assert/strict";
import test from "node:test";
import { Action } from "../src/core/interfaces/action";
import { ActionContext } from "../src/core/interfaces/action-context";
import { ActionResult, ActionStatus } from "../src/core/interfaces/action-result";
import { ActionConfigurationException } from "../src/core/exceptions/action-configuration.exception";
import { DefaultActionRegistry } from "../src/infrastructure/actions/default-action-registry";

class StubAction implements Action {
  public constructor(
    public readonly id: string,
    public readonly name: string
  ) {}
  public async execute(_context: ActionContext): Promise<ActionResult> {
    return {
      actionId: this.id,
      actionName: this.name,
      success: true,
      status: ActionStatus.Executed,
      duration: 0,
      metadata: {},
    };
  }
}

test("resolves a registered action by id", () => {
  const registry = new DefaultActionRegistry();
  const action = new StubAction("qase", "Qase");
  registry.register(action);

  const resolved = registry.resolve("qase");

  assert.strictEqual(resolved, action);
});

test("all() returns every registered action", () => {
  const registry = new DefaultActionRegistry();
  const qase = new StubAction("qase", "Qase");
  const slack = new StubAction("slack", "Slack");
  registry.register(qase);
  registry.register(slack);

  const all = registry.all();

  assert.equal(all.length, 2);
  assert.ok(all.includes(qase));
  assert.ok(all.includes(slack));
});

test("all() returns empty array when no actions are registered", () => {
  const registry = new DefaultActionRegistry();
  assert.deepEqual(registry.all(), []);
});

test("throws ActionConfigurationException when resolving an unknown id", () => {
  const registry = new DefaultActionRegistry();

  assert.throws(
    () => registry.resolve("unknown"),
    (error: unknown) => {
      assert.ok(error instanceof ActionConfigurationException);
      assert.match((error as Error).message, /unknown/);
      return true;
    }
  );
});

test("registering the same id twice overwrites the previous action", () => {
  const registry = new DefaultActionRegistry();
  const v1 = new StubAction("qase", "Qase v1");
  const v2 = new StubAction("qase", "Qase v2");
  registry.register(v1);
  registry.register(v2);

  assert.strictEqual(registry.resolve("qase"), v2);
  assert.equal(registry.all().length, 1);
});
