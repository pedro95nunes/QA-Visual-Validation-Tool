import assert from "node:assert/strict";
import test from "node:test";
import { ActionPolicy } from "../src/core/interfaces/action-policy";
import { DefaultActionPolicyEvaluator } from "../src/infrastructure/actions/default-action-policy-evaluator";
import { oneFailedRun, zeroDifferenceRun } from "./fixtures/report-fixtures";

const evaluator = new DefaultActionPolicyEvaluator();

function policy(overrides: Partial<ActionPolicy> = {}): ActionPolicy {
  return { enabled: true, ...overrides };
}

test("eligible when enabled, no environment restriction, no onlyOnFailure", () => {
  assert.equal(evaluator.isEligible("qase", policy(), zeroDifferenceRun, ""), true);
});

test("not eligible when disabled", () => {
  assert.equal(evaluator.isEligible("qase", policy({ enabled: false }), oneFailedRun, "staging"), false);
});

test("eligible when environment matches the policy list", () => {
  assert.equal(
    evaluator.isEligible("qase", policy({ environments: ["staging", "production"] }), zeroDifferenceRun, "staging"),
    true
  );
});

test("not eligible when environment does not match the policy list", () => {
  assert.equal(
    evaluator.isEligible("qase", policy({ environments: ["staging", "production"] }), zeroDifferenceRun, "local"),
    false
  );
});

test("eligible when environments list is empty (no restriction)", () => {
  assert.equal(evaluator.isEligible("qase", policy({ environments: [] }), zeroDifferenceRun, "any-value"), true);
});

test("eligible when environments list is omitted", () => {
  assert.equal(evaluator.isEligible("qase", policy({ environments: undefined }), zeroDifferenceRun, ""), true);
});

test("not eligible when onlyOnFailure is true and run passed", () => {
  assert.equal(evaluator.isEligible("qase", policy({ onlyOnFailure: true }), zeroDifferenceRun, ""), false);
});

test("eligible when onlyOnFailure is true and run failed", () => {
  assert.equal(evaluator.isEligible("qase", policy({ onlyOnFailure: true }), oneFailedRun, ""), true);
});

test("not eligible when enabled=true, onlyOnFailure=true, run passed, environment matches", () => {
  assert.equal(
    evaluator.isEligible(
      "qase",
      policy({ onlyOnFailure: true, environments: ["staging"] }),
      zeroDifferenceRun,
      "staging"
    ),
    false
  );
});

test("eligible when enabled=true, onlyOnFailure=true, run failed, environment matches", () => {
  assert.equal(
    evaluator.isEligible("qase", policy({ onlyOnFailure: true, environments: ["staging"] }), oneFailedRun, "staging"),
    true
  );
});

test("not eligible when environment does not match even if run failed", () => {
  assert.equal(
    evaluator.isEligible("qase", policy({ onlyOnFailure: true, environments: ["production"] }), oneFailedRun, "local"),
    false
  );
});
