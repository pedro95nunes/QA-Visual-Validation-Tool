import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../src/core/interfaces/logger";
import { Storage } from "../src/core/interfaces/storage";
import { ArtifactOrganizer } from "../src/reports/artifact-organizer";
import { createRunLayout } from "../src/reports/run-layout";
import { oneFailedRun, executionErrorRun, zeroDifferenceRun } from "./fixtures/report-fixtures";

class SilentLogger implements Logger {
  public readonly messages: string[] = [];
  public info(message: string): void {
    this.messages.push(message);
  }
  public error(): void {}
}

class MapStorage implements Storage {
  public readonly saved = new Map<string, Uint8Array>();
  public constructor(private readonly existing: Record<string, Uint8Array> = {}) {}

  public async save(filePath: string, content: Uint8Array): Promise<string> {
    this.saved.set(filePath, content);
    return filePath;
  }

  public async read(filePath: string): Promise<Uint8Array> {
    const known = this.existing[filePath] ?? this.saved.get(filePath);
    if (!known) {
      throw new Error(`missing source: ${filePath}`);
    }
    return known;
  }
}

const layout = createRunLayout("artifacts", "2026-08-31T21-30-00Z-a8f31");

function sourcesFor(run = oneFailedRun): Record<string, Uint8Array> {
  const sources: Record<string, Uint8Array> = {};
  for (const execution of run.executions) {
    for (const result of execution.results) {
      if (result.evidence) sources[result.evidence.filePath] = new Uint8Array([1]);
      if (result.reference) sources[result.reference.localPath] = new Uint8Array([2]);
      if (result.comparison?.diffImage) sources[result.comparison.diffImage] = new Uint8Array([3]);
    }
  }
  return sources;
}

test("copies evidence, reference, and diff into the isolated run directory", async () => {
  const storage = new MapStorage(sourcesFor());
  const organizer = new ArtifactOrganizer(storage, new SilentLogger());

  const artifacts = await organizer.organize(oneFailedRun, layout);

  assert.ok(storage.saved.has("artifacts/runs/2026-08-31T21-30-00Z-a8f31/evidence/about.png"));
  assert.ok(storage.saved.has("artifacts/runs/2026-08-31T21-30-00Z-a8f31/references/about.png"));
  assert.ok(storage.saved.has("artifacts/runs/2026-08-31T21-30-00Z-a8f31/diffs/about-diff.png"));
  assert.equal(artifacts.about.evidence, "../evidence/about.png");
  assert.equal(artifacts.about.reference, "../references/about.png");
  assert.equal(artifacts.about.diff, "../diffs/about-diff.png");
});

test("uses portable relative paths from the report directory", async () => {
  const storage = new MapStorage(sourcesFor());
  const organizer = new ArtifactOrganizer(storage, new SilentLogger());

  const artifacts = await organizer.organize(oneFailedRun, layout);

  for (const page of Object.values(artifacts)) {
    for (const path of Object.values(page)) {
      assert.equal(typeof path === "string" && path.startsWith(".."), true);
      assert.equal((path as string).includes("\\"), false);
      assert.equal((path as string).includes(":"), false);
    }
  }
});

test("skips missing source artifacts without failing the run", async () => {
  const logger = new SilentLogger();
  const storage = new MapStorage(sourcesFor(executionErrorRun));
  const organizer = new ArtifactOrganizer(storage, logger);

  const artifacts = await organizer.organize(executionErrorRun, layout);

  assert.ok(artifacts.homepage.evidence);
  assert.equal(artifacts.about, undefined);
});

test("passed page without a diff only organizes evidence and reference", async () => {
  const storage = new MapStorage(sourcesFor(zeroDifferenceRun));
  const organizer = new ArtifactOrganizer(storage, new SilentLogger());

  const artifacts = await organizer.organize(zeroDifferenceRun, layout);

  assert.ok(artifacts.homepage.evidence);
  assert.ok(artifacts.homepage.reference);
  assert.equal(artifacts.homepage.diff, undefined);
});
