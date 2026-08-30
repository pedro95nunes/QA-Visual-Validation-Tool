import { ConfigurationException } from "../core/exceptions/configuration.exception";
import { ValidationPlugin } from "../core/interfaces/validation-plugin";
import { ValidationPluginRegistry as ValidationPluginRegistryContract } from "../core/interfaces/validation-plugin-registry";

/** In-memory registry used by the composition root to discover validation plugins. */
export class ValidationPluginRegistry implements ValidationPluginRegistryContract {
  private readonly plugins = new Map<string, ValidationPlugin>();

  public constructor(plugins: ValidationPlugin[]) {
    for (const plugin of plugins) {
      this.plugins.set(plugin.id, plugin);
    }
  }

  public resolve(id: string): ValidationPlugin {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new ConfigurationException(`No validation plugin is registered with id: ${id}.`);
    }

    return plugin;
  }
}
