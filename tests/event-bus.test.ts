import assert from "node:assert/strict";
import test from "node:test";
import { Event } from "../src/core/interfaces/event";
import { EventHandler } from "../src/core/interfaces/event-handler";
import { InMemoryEventBus } from "../src/infrastructure/events/in-memory-event-bus";

interface TestEvent extends Event {
  readonly type: "test.event";
  readonly payload: string;
}

class RecordingHandler implements EventHandler<TestEvent> {
  public readonly received: TestEvent[] = [];
  public async handle(event: TestEvent): Promise<void> {
    this.received.push(event);
  }
}

class ThrowingHandler implements EventHandler<TestEvent> {
  public async handle(_event: TestEvent): Promise<void> {
    throw new Error("handler error");
  }
}

function testEvent(payload = "hello"): TestEvent {
  return { type: "test.event", occurredAt: new Date(), payload };
}

test("delivers a published event to a subscribed handler", async () => {
  const bus = new InMemoryEventBus();
  const handler = new RecordingHandler();
  bus.subscribe("test.event", handler);

  await bus.publish(testEvent("data"));

  assert.equal(handler.received.length, 1);
  assert.equal(handler.received[0].payload, "data");
});

test("delivers to all handlers subscribed for the same event type", async () => {
  const bus = new InMemoryEventBus();
  const a = new RecordingHandler();
  const b = new RecordingHandler();
  bus.subscribe("test.event", a);
  bus.subscribe("test.event", b);

  await bus.publish(testEvent());

  assert.equal(a.received.length, 1);
  assert.equal(b.received.length, 1);
});

test("does not deliver to handlers for a different event type", async () => {
  const bus = new InMemoryEventBus();
  const handler = new RecordingHandler();
  bus.subscribe("other.event", handler);

  await bus.publish(testEvent());

  assert.equal(handler.received.length, 0);
});

test("does not deliver to an unsubscribed handler", async () => {
  const bus = new InMemoryEventBus();
  const handler = new RecordingHandler();
  bus.subscribe("test.event", handler);
  bus.unsubscribe("test.event", handler);

  await bus.publish(testEvent());

  assert.equal(handler.received.length, 0);
});

test("unsubscribing one handler does not affect other handlers", async () => {
  const bus = new InMemoryEventBus();
  const keep = new RecordingHandler();
  const remove = new RecordingHandler();
  bus.subscribe("test.event", keep);
  bus.subscribe("test.event", remove);
  bus.unsubscribe("test.event", remove);

  await bus.publish(testEvent());

  assert.equal(keep.received.length, 1);
  assert.equal(remove.received.length, 0);
});

test("a failing handler does not prevent other handlers from receiving the event", async () => {
  const bus = new InMemoryEventBus();
  const thrower = new ThrowingHandler();
  const recorder = new RecordingHandler();
  bus.subscribe("test.event", thrower);
  bus.subscribe("test.event", recorder);

  await bus.publish(testEvent());

  assert.equal(recorder.received.length, 1);
});

test("publishes when no handlers are registered", async () => {
  const bus = new InMemoryEventBus();
  await assert.doesNotReject(() => bus.publish(testEvent()));
});
