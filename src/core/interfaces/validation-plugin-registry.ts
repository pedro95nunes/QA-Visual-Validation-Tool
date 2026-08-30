import { ValidationPlugin } from "./validation-plugin";

/** Resolves registered validation plugins by their stable identifier. */
export interface ValidationPluginRegistry {
  resolve(id: string): ValidationPlugin;
}
