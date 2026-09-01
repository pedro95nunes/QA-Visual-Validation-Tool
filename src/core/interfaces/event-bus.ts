import { Event } from "./event";
import { EventHandler } from "./event-handler";

/**
 * Publishes events and dispatches them to registered handlers.
 *
 * Consumers never depend on concrete implementations — always inject via this interface.
 */
export interface EventBus {
  publish<T extends Event>(event: T): Promise<void>;
  subscribe<T extends Event>(eventType: string, handler: EventHandler<T>): void;
  unsubscribe<T extends Event>(eventType: string, handler: EventHandler<T>): void;
}
