import { Event } from "../../core/interfaces/event";
import { EventBus } from "../../core/interfaces/event-bus";
import { EventHandler } from "../../core/interfaces/event-handler";

/**
 * In-process pub/sub EventBus backed by a plain Map.
 *
 * - Handlers registered for a given type are called concurrently via Promise.allSettled.
 * - A handler failure does not prevent other handlers from executing.
 * - No global singleton — always inject this via the EventBus interface.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler<Event>[]>();

  public async publish<T extends Event>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.allSettled(handlers.map((handler) => handler.handle(event)));
  }

  public subscribe<T extends Event>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler as EventHandler<Event>]);
  }

  public unsubscribe<T extends Event>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(
      eventType,
      existing.filter((h) => h !== (handler as EventHandler<Event>))
    );
  }
}
