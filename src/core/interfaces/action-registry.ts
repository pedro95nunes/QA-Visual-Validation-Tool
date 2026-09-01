import { Action } from "./action";

/**
 * Stores and resolves registered Actions by ID.
 *
 * Adding a new Action requires only registering it here — neither the ActionEngine
 * nor any other component needs modification.
 */
export interface ActionRegistry {
  register(action: Action): void;
  resolve(actionId: string): Action;
  all(): Action[];
}
