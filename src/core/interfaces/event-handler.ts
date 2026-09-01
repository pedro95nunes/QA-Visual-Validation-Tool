import { Event } from "./event";

/** Handles a specific event type. Each handler is independently testable. */
export interface EventHandler<T extends Event> {
  handle(event: T): Promise<void>;
}
