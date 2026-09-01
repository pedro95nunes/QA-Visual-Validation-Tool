import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ApplicationConfiguration } from "./application-configuration";
import { defaultApplicationConfiguration } from "./default-application-configuration";
import { mergeConfiguration } from "./configuration-merger";
import { ConfigurationException } from "../core/exceptions/configuration.exception";

export const DEFAULT_CONFIG_FILENAMES = ["atlas.config.yaml", "atlas.config.yml"] as const;

export interface ConfigurationLoadResult {
  /** Merged and validated configuration ready for use. */
  readonly configuration: ApplicationConfiguration;
  /** Absolute path to the config file that was loaded, if any. */
  readonly filePath?: string;
}

/**
 * Loads and merges configuration from an atlas.config.yaml file.
 *
 * Precedence (highest → lowest):
 *   CLI arguments → environment variables → YAML file → built-in defaults
 *
 * Environment variable interpolation: ${VAR_NAME} in YAML values is replaced
 * with the current process environment value. Missing variables become empty strings.
 *
 * If no config file is found, returns the built-in defaults unchanged.
 */
export async function loadConfiguration(configPath?: string): Promise<ConfigurationLoadResult> {
  const filePath = configPath ? resolve(configPath) : await findDefaultConfigFile();

  if (!filePath) {
    return { configuration: defaultApplicationConfiguration };
  }

  const raw = await readConfigFile(filePath);
  const interpolated = interpolateEnvVars(raw);
  const parsed = parseYamlSafely(interpolated, filePath);
  const configuration = mergeConfiguration(defaultApplicationConfiguration, parsed);

  return { configuration, filePath };
}

/** Resolves the path to the first config file found in the current directory. */
export async function findDefaultConfigFile(): Promise<string | undefined> {
  for (const name of DEFAULT_CONFIG_FILENAMES) {
    const candidate = resolve(process.cwd(), name);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Replaces ${VAR_NAME} placeholders in YAML content with environment variable values.
 * Missing variables are replaced with an empty string (never throw).
 */
export function interpolateEnvVars(content: string): string {
  return content.replace(/\$\{([^}]+)\}/g, (_, name: string) => process.env[name] ?? "");
}

async function readConfigFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    throw new ConfigurationException(
      `Cannot read configuration file: ${filePath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

function parseYamlSafely(content: string, filePath: string): Record<string, unknown> {
  try {
    const result = parseYaml(content);
    if (result === null || result === undefined) return {};
    if (typeof result !== "object" || Array.isArray(result)) {
      throw new ConfigurationException(`Configuration file must contain a YAML mapping (object). File: ${filePath}`);
    }
    return result as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ConfigurationException) throw error;
    throw new ConfigurationException(
      `Failed to parse YAML configuration: ${filePath}\n${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
