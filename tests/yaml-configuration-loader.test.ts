import assert from "node:assert/strict";
import test from "node:test";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { loadConfiguration, interpolateEnvVars } from "../src/configuration/yaml-configuration-loader";
import { defaultApplicationConfiguration } from "../src/configuration/default-application-configuration";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = join(tmpdir(), `atlas-test-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ── interpolateEnvVars ──────────────────────────────────────────────────────

test("interpolates a single environment variable", () => {
  process.env.__ATLAS_TEST_VAR__ = "hello";
  const result = interpolateEnvVars("value: ${__ATLAS_TEST_VAR__}");
  delete process.env.__ATLAS_TEST_VAR__;
  assert.equal(result, "value: hello");
});

test("replaces missing variable with empty string", () => {
  delete process.env.__ATLAS_MISSING__;
  const result = interpolateEnvVars("value: ${__ATLAS_MISSING__}");
  assert.equal(result, "value: ");
});

test("interpolates multiple variables in one string", () => {
  process.env.__ATLAS_A__ = "alpha";
  process.env.__ATLAS_B__ = "beta";
  const result = interpolateEnvVars("${__ATLAS_A__}/${__ATLAS_B__}");
  delete process.env.__ATLAS_A__;
  delete process.env.__ATLAS_B__;
  assert.equal(result, "alpha/beta");
});

test("leaves content without placeholders unchanged", () => {
  const result = interpolateEnvVars("provider: playwright");
  assert.equal(result, "provider: playwright");
});

// ── loadConfiguration — no file ─────────────────────────────────────────────

test("returns default configuration when no path is given and no config file in cwd", async () => {
  // Run from a temp dir that has no atlas.config.yaml
  await withTempDir(async (dir) => {
    const saved = process.cwd();
    process.chdir(dir);
    try {
      const { configuration, filePath } = await loadConfiguration(undefined);
      assert.equal(filePath, undefined);
      assert.equal(configuration.browser.provider, defaultApplicationConfiguration.browser.provider);
    } finally {
      process.chdir(saved);
    }
  });
});

test("throws ConfigurationException when an explicit path does not exist", async () => {
  await assert.rejects(
    () => loadConfiguration("/definitely/does/not/exist.yaml"),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match((err as Error).message, /Cannot read configuration file/);
      return true;
    }
  );
});

// ── loadConfiguration — YAML loading ───────────────────────────────────────

test("loads and merges environment field from YAML", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(file, "environment: staging\n");

    const { configuration, filePath } = await loadConfiguration(file);

    assert.equal(configuration.environment, "staging");
    assert.equal(filePath, file);
  });
});

test("loads browser headless setting from YAML", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(file, "browser:\n  headless: false\n");

    const { configuration } = await loadConfiguration(file);

    assert.equal(configuration.browser.headless, false);
    assert.equal(configuration.browser.provider, defaultApplicationConfiguration.browser.provider);
  });
});

test("replaces visual pages array from YAML", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(
      file,
      `
visual:
  enabled: true
  pages:
    - id: about
      url: https://example.com/about
      reference:
        provider: figma
        fileKey: abc
        nodeId: "1:2"
`
    );
    const { configuration } = await loadConfiguration(file);

    assert.equal(configuration.visual.pages.length, 1);
    assert.equal(configuration.visual.pages[0].id, "about");
  });
});

test("loads report configuration from YAML", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(file, "report:\n  html:\n    enabled: false\n");

    const { configuration } = await loadConfiguration(file);

    assert.equal(configuration.report.html.enabled, false);
    assert.equal(configuration.report.json.enabled, defaultApplicationConfiguration.report.json.enabled);
  });
});

test("loads actions configuration from YAML", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(
      file,
      `
actions:
  qase:
    enabled: true
    onlyOnFailure: true
    environments:
      - staging
`
    );
    const { configuration } = await loadConfiguration(file);

    assert.equal(configuration.actions?.qase?.enabled, true);
    assert.deepEqual(configuration.actions?.qase?.environments, ["staging"]);
  });
});

test("interpolates env vars in YAML before parsing", async () => {
  await withTempDir(async (dir) => {
    process.env.__ATLAS_FILE_KEY__ = "testkey123";
    const file = join(dir, "atlas.config.yaml");
    await writeFile(
      file,
      `
visual:
  pages:
    - id: homepage
      url: https://example.com
      reference:
        provider: figma
        fileKey: \${__ATLAS_FILE_KEY__}
        nodeId: "1:2"
`
    );
    const { configuration } = await loadConfiguration(file);
    delete process.env.__ATLAS_FILE_KEY__;

    assert.equal(configuration.visual.pages[0].reference.fileKey, "testkey123");
  });
});

test("loads project name from YAML", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(file, "project:\n  name: My App\n");

    const { configuration } = await loadConfiguration(file);

    assert.equal(configuration.project?.name, "My App");
  });
});

test("throws ConfigurationException for malformed YAML", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(file, "browser:\n  - this: is\n  invalid: yaml: structure:\n");

    await assert.rejects(
      () => loadConfiguration(file),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      }
    );
  });
});

test("empty YAML file returns defaults without error", async () => {
  await withTempDir(async (dir) => {
    const file = join(dir, "atlas.config.yaml");
    await writeFile(file, "");

    const { configuration } = await loadConfiguration(file);

    assert.equal(configuration.browser.provider, defaultApplicationConfiguration.browser.provider);
  });
});
