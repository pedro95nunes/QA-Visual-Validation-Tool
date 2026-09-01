import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationDoctor } from "../src/cli/commands/doctor";
import { defaultApplicationConfiguration } from "../src/configuration/default-application-configuration";
import { ApplicationConfiguration } from "../src/configuration/application-configuration";

function configWith(overrides: Partial<ApplicationConfiguration>): ApplicationConfiguration {
  return { ...defaultApplicationConfiguration, ...overrides };
}

// ── Node.js version check ───────────────────────────────────────────────────

test("Node.js check passes for current runtime", () => {
  const doctor = new ConfigurationDoctor(defaultApplicationConfiguration);
  const checks = doctor.check();
  const node = checks.find((c) => c.name === "Node.js");
  assert.ok(node, "Node.js check must exist");
  assert.equal(node!.passed, true);
});

// ── Config file check ───────────────────────────────────────────────────────

test("config file check passes when filePath is provided", () => {
  const doctor = new ConfigurationDoctor(defaultApplicationConfiguration, "/path/to/atlas.config.yaml");
  const checks = doctor.check();
  const cfg = checks.find((c) => c.name === "Configuration file");
  assert.ok(cfg);
  assert.equal(cfg!.passed, true);
});

test("config file check fails when no filePath", () => {
  const doctor = new ConfigurationDoctor(defaultApplicationConfiguration, undefined);
  const checks = doctor.check();
  const cfg = checks.find((c) => c.name === "Configuration file");
  assert.ok(cfg);
  assert.equal(cfg!.passed, false);
  assert.ok(cfg!.fix, "Should provide a fix suggestion");
});

// ── Figma token check ───────────────────────────────────────────────────────

test("Figma token check passes when token is non-empty", () => {
  const config = configWith({ figma: { ...defaultApplicationConfiguration.figma, token: "secret" } });
  const doctor = new ConfigurationDoctor(config);
  const checks = doctor.check();
  const tokenCheck = checks.find((c) => c.name === "FIGMA_TOKEN");
  assert.ok(tokenCheck);
  assert.equal(tokenCheck!.passed, true);
  assert.ok(!tokenCheck!.detail?.includes("secret"), "Token value must not appear in output");
});

test("Figma token check fails when token is empty", () => {
  const config = configWith({ figma: { ...defaultApplicationConfiguration.figma, token: "" } });
  const doctor = new ConfigurationDoctor(config);
  const checks = doctor.check();
  const tokenCheck = checks.find((c) => c.name === "FIGMA_TOKEN");
  assert.ok(tokenCheck);
  assert.equal(tokenCheck!.passed, false);
  assert.ok(tokenCheck!.fix?.includes("FIGMA_TOKEN"), "Fix should mention FIGMA_TOKEN");
});

// ── Report check ────────────────────────────────────────────────────────────

test("report check passes when at least one format is enabled", () => {
  const doctor = new ConfigurationDoctor(defaultApplicationConfiguration);
  const checks = doctor.check();
  const rep = checks.find((c) => c.name === "Reports");
  assert.ok(rep);
  assert.equal(rep!.passed, true);
});

test("report check fails when reporting enabled but no format selected", () => {
  const config = configWith({
    report: {
      ...defaultApplicationConfiguration.report,
      enabled: true,
      html: { enabled: false },
      json: { enabled: false },
    },
  });
  const doctor = new ConfigurationDoctor(config);
  const checks = doctor.check();
  const rep = checks.find((c) => c.name === "Reports");
  assert.ok(rep);
  assert.equal(rep!.passed, false);
});

// ── Action checks ───────────────────────────────────────────────────────────

test("action checks report status for each configured action", () => {
  const config = configWith({
    actions: {
      qase: { enabled: false },
      slack: { enabled: true },
    },
  });
  const doctor = new ConfigurationDoctor(config);
  const checks = doctor.check();

  const qase = checks.find((c) => c.name === "Action: qase");
  const slack = checks.find((c) => c.name === "Action: slack");

  assert.ok(qase, "Should have a check for qase");
  assert.ok(slack, "Should have a check for slack");
  assert.ok(qase!.detail?.includes("Disabled"));
  assert.ok(slack!.detail?.includes("Enabled"));
});

// ── All checks present ──────────────────────────────────────────────────────

test("check() returns at least 7 diagnostic items", () => {
  const doctor = new ConfigurationDoctor(defaultApplicationConfiguration);
  const checks = doctor.check();
  assert.ok(checks.length >= 7, `Expected at least 7 checks, got ${checks.length}`);
});
