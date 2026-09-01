import assert from "node:assert/strict";
import test from "node:test";
import { mergeConfiguration, applyCliOverrides } from "../src/configuration/configuration-merger";
import { defaultApplicationConfiguration } from "../src/configuration/default-application-configuration";

// ── mergeConfiguration ──────────────────────────────────────────────────────

test("returns base unchanged when YAML is empty", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, {});
  assert.equal(merged.browser.provider, defaultApplicationConfiguration.browser.provider);
  assert.equal(merged.environment, defaultApplicationConfiguration.environment);
});

test("merges environment string from YAML", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, { environment: "production" });
  assert.equal(merged.environment, "production");
});

test("merges browser headless from YAML", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, {
    browser: { headless: false },
  });
  assert.equal(merged.browser.headless, false);
  assert.equal(merged.browser.provider, defaultApplicationConfiguration.browser.provider);
});

test("replaces visual pages array from YAML", () => {
  const pages = [
    { id: "about", url: "https://example.com/about", reference: { provider: "figma", fileKey: "k", nodeId: "1:2" } },
  ];
  const merged = mergeConfiguration(defaultApplicationConfiguration, { visual: { pages } });
  assert.equal(merged.visual.pages.length, 1);
  assert.equal(merged.visual.pages[0].id, "about");
});

test("merges report html.enabled from YAML", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, {
    report: { html: { enabled: false } },
  });
  assert.equal(merged.report.html.enabled, false);
  assert.equal(merged.report.json.enabled, defaultApplicationConfiguration.report.json.enabled);
});

test("replaces actions entirely from YAML", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, {
    actions: { qase: { enabled: true, onlyOnFailure: true } },
  });
  assert.equal(merged.actions?.qase?.enabled, true);
});

test("merges project name from YAML", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, {
    project: { name: "Test App" },
  });
  assert.equal(merged.project?.name, "Test App");
});

test("ignores unknown YAML keys without throwing", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, {
    unknownTopLevelKey: "some value",
  });
  assert.equal(merged.browser.provider, defaultApplicationConfiguration.browser.provider);
});

test("merges viewport from YAML", () => {
  const merged = mergeConfiguration(defaultApplicationConfiguration, {
    browser: { viewport: { width: 1920, height: 1080 } },
  });
  assert.equal(merged.browser.viewport.width, 1920);
  assert.equal(merged.browser.viewport.height, 1080);
});

// ── applyCliOverrides ───────────────────────────────────────────────────────

test("returns base unchanged when overrides is empty", () => {
  const result = applyCliOverrides(defaultApplicationConfiguration, {});
  assert.equal(result.environment, defaultApplicationConfiguration.environment);
  assert.equal(result.report.html.enabled, defaultApplicationConfiguration.report.html.enabled);
});

test("overrides environment via CLI", () => {
  const result = applyCliOverrides(defaultApplicationConfiguration, { environment: "staging" });
  assert.equal(result.environment, "staging");
});

test("enables qase action via CLI override", () => {
  const base = {
    ...defaultApplicationConfiguration,
    actions: { qase: { enabled: false, onlyOnFailure: true } },
  };
  const result = applyCliOverrides(base, { actions: { qase: { enabled: true } } });
  assert.equal(result.actions?.qase?.enabled, true);
  assert.equal(result.actions?.qase?.onlyOnFailure, true);
});

test("disables qase action via CLI override", () => {
  const base = {
    ...defaultApplicationConfiguration,
    actions: { qase: { enabled: true, onlyOnFailure: true } },
  };
  const result = applyCliOverrides(base, { actions: { qase: { enabled: false } } });
  assert.equal(result.actions?.qase?.enabled, false);
});

test("disables HTML report via CLI override", () => {
  const result = applyCliOverrides(defaultApplicationConfiguration, {
    report: { html: { enabled: false } },
  });
  assert.equal(result.report.html.enabled, false);
  assert.equal(result.report.json.enabled, defaultApplicationConfiguration.report.json.enabled);
});

test("enables JSON report via CLI override even when base disables it", () => {
  const base = {
    ...defaultApplicationConfiguration,
    report: { ...defaultApplicationConfiguration.report, json: { enabled: false } },
  };
  const result = applyCliOverrides(base, { report: { json: { enabled: true } } });
  assert.equal(result.report.json.enabled, true);
});

test("CLI overrides do not mutate the base configuration", () => {
  const base = { ...defaultApplicationConfiguration };
  applyCliOverrides(base, { environment: "production" });
  assert.equal(base.environment, defaultApplicationConfiguration.environment);
});

test("configuration precedence: CLI wins over YAML wins over defaults", () => {
  const defaults = defaultApplicationConfiguration;
  const yamlMerged = mergeConfiguration(defaults, { environment: "staging" });
  const withCli = applyCliOverrides(yamlMerged, { environment: "production" });

  assert.equal(defaults.environment, "");
  assert.equal(yamlMerged.environment, "staging");
  assert.equal(withCli.environment, "production");
});
