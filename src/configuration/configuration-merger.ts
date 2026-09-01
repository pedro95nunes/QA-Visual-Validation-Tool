import { ApplicationConfiguration } from "./application-configuration";
import { ActionsConfiguration } from "./action-configuration";
import { BrowserProvider } from "./browser-configuration";
import { DesignProviderType } from "./design-configuration";
import { ScreenshotFormat } from "../core/models/screenshot-format";

/**
 * Per-execution CLI overrides.
 *
 * These values take highest precedence and are applied without persisting to disk.
 * All fields are optional — only the overrides explicitly passed are applied.
 */
export interface CliOverrides {
  environment?: string;
  actions?: Record<string, { enabled?: boolean }>;
  report?: {
    html?: { enabled?: boolean };
    json?: { enabled?: boolean };
  };
}

/**
 * Merges a parsed YAML document onto the base configuration.
 *
 * Rules:
 * - Primitives and strings: YAML value wins when present.
 * - Arrays (e.g. visual.pages): YAML value replaces the base entirely.
 * - Objects: recursive field-level merge.
 * - Unknown YAML keys are silently ignored.
 */
export function mergeConfiguration(
  base: ApplicationConfiguration,
  yaml: Record<string, unknown>
): ApplicationConfiguration {
  const merged: ApplicationConfiguration = { ...base };

  if (has(yaml, "project") && isObject(yaml.project)) {
    merged.project = { ...base.project, ...(yaml.project as object) };
  }

  if (has(yaml, "environment") && typeof yaml.environment === "string") {
    merged.environment = yaml.environment;
  }

  if (has(yaml, "browser") && isObject(yaml.browser)) {
    const b = yaml.browser as Record<string, unknown>;
    merged.browser = {
      ...base.browser,
      ...(typeof b.provider === "string" ? { provider: b.provider as BrowserProvider } : {}),
      ...(typeof b.headless === "boolean" ? { headless: b.headless } : {}),
      ...(typeof b.timeout === "number" ? { timeout: b.timeout } : {}),
      ...(typeof b.url === "string" ? { url: b.url } : {}),
      ...(isObject(b.viewport) ? { viewport: { ...base.browser.viewport, ...(b.viewport as object) } } : {}),
    };
  }

  if (has(yaml, "figma") && isObject(yaml.figma)) {
    const f = yaml.figma as Record<string, unknown>;
    merged.figma = {
      ...base.figma,
      ...(typeof f.token === "string" && f.token ? { token: f.token } : {}),
      ...(typeof f.fileKey === "string" && f.fileKey ? { fileKey: f.fileKey } : {}),
      ...(typeof f.nodeId === "string" && f.nodeId ? { nodeId: f.nodeId } : {}),
      ...(typeof f.imageFormat === "string" ? { imageFormat: f.imageFormat as ScreenshotFormat } : {}),
      ...(typeof f.name === "string" ? { name: f.name } : {}),
    };
  }

  if (has(yaml, "visual") && isObject(yaml.visual)) {
    const v = yaml.visual as Record<string, unknown>;
    merged.visual = {
      ...base.visual,
      ...(typeof v.enabled === "boolean" ? { enabled: v.enabled } : {}),
      ...(Array.isArray(v.pages) ? { pages: v.pages } : {}),
      ...(isObject(v.comparison)
        ? {
            comparison: {
              ...base.visual.comparison,
              ...(v.comparison as object),
            },
          }
        : {}),
    };
  }

  if (has(yaml, "report") && isObject(yaml.report)) {
    const r = yaml.report as Record<string, unknown>;
    merged.report = {
      ...base.report,
      ...(typeof r.enabled === "boolean" ? { enabled: r.enabled } : {}),
      ...(typeof r.outputDirectory === "string" ? { outputDirectory: r.outputDirectory } : {}),
      ...(isObject(r.html) ? { html: { ...base.report.html, ...(r.html as object) } } : {}),
      ...(isObject(r.json) ? { json: { ...base.report.json, ...(r.json as object) } } : {}),
    };
  }

  if (has(yaml, "actions") && isObject(yaml.actions)) {
    merged.actions = yaml.actions as ActionsConfiguration;
  }

  if (has(yaml, "design") && isObject(yaml.design)) {
    const d = yaml.design as Record<string, unknown>;
    merged.design = {
      ...base.design,
      ...(typeof d.provider === "string" ? { provider: d.provider as DesignProviderType } : {}),
    };
  }

  return merged;
}

/**
 * Applies per-execution CLI overrides on top of a base configuration.
 *
 * CLI arguments take highest precedence. The source configuration is never mutated.
 */
export function applyCliOverrides(base: ApplicationConfiguration, overrides: CliOverrides): ApplicationConfiguration {
  const result: ApplicationConfiguration = { ...base };

  if (overrides.environment !== undefined) {
    result.environment = overrides.environment;
  }

  if (overrides.report) {
    result.report = { ...base.report };
    if (overrides.report.html?.enabled !== undefined) {
      result.report = { ...result.report, html: { ...result.report.html, enabled: overrides.report.html.enabled } };
    }
    if (overrides.report.json?.enabled !== undefined) {
      result.report = { ...result.report, json: { ...result.report.json, enabled: overrides.report.json.enabled } };
    }
  }

  if (overrides.actions) {
    const mergedActions: ActionsConfiguration = { ...(base.actions ?? {}) };
    for (const [id, actionOverride] of Object.entries(overrides.actions)) {
      if (actionOverride.enabled !== undefined) {
        mergedActions[id] = {
          ...(mergedActions[id] ?? { enabled: false }),
          enabled: actionOverride.enabled,
        };
      }
    }
    result.actions = mergedActions;
  }

  return result;
}

function has(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
