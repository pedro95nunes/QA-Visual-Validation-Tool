import assert from "node:assert/strict";
import test from "node:test";
import { DefaultExecutionIdFactory } from "../src/infrastructure/execution/default-execution-id-factory";

test("produces a filesystem-safe, sortable identifier", () => {
  const factory = new DefaultExecutionIdFactory(
    () => new Date("2026-08-31T21:30:42.123Z"),
    () => "a8f31"
  );

  const id = factory.create();

  assert.equal(id, "2026-08-31T21-30-42Z-a8f31");
  assert.equal(id.includes(":"), false);
  assert.match(id, /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-[a-z0-9]+$/);
});

test("does not collide for executions within the same second", () => {
  let suffix = 0;
  const factory = new DefaultExecutionIdFactory(
    () => new Date("2026-08-31T21:30:42.000Z"),
    () => `s${suffix++}`
  );

  assert.notEqual(factory.create(), factory.create());
});

test("default suffix is a short alphanumeric string", () => {
  const id = new DefaultExecutionIdFactory(() => new Date("2026-01-01T00:00:00.000Z")).create();

  assert.match(id, /^2026-01-01T00-00-00Z-[a-f0-9]{5}$/);
});
