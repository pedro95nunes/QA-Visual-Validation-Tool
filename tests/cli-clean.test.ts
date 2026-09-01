import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runClean } from "../src/cli/commands/clean";
import { Logger } from "../src/core/interfaces/logger";
import { CliOutput } from "../src/cli/output";

class RecordingLogger implements Logger {
  public readonly lines: string[] = [];
  public info(message: string): void {
    this.lines.push(message);
  }
  public error(message: string): void {
    this.lines.push(`[error] ${message}`);
  }
}

async function tempArtifacts(): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), "atlas-clean-"));
  const dir = join(base, "artifacts");
  await mkdir(join(dir, "evidence"), { recursive: true });
  await writeFile(join(dir, "evidence", "homepage.png"), "not-a-real-png");
  return dir;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

test("runClean returns 0 and reports nothing to clean when directory is absent", async () => {
  const logger = new RecordingLogger();
  const code = await runClean(new CliOutput(logger), "/tmp/atlas-does-not-exist-xyz", true);

  assert.equal(code, 0);
  assert.ok(logger.lines.some((l) => l.toLowerCase().includes("nothing to clean")));
});

test("runClean with --force deletes the artifacts directory", async () => {
  const dir = await tempArtifacts();
  const logger = new RecordingLogger();

  const code = await runClean(new CliOutput(logger), dir, true);

  assert.equal(code, 0);
  assert.equal(await exists(dir), false, "artifacts directory should be removed");
});

test("runClean refuses to delete in a non-interactive terminal without --force", async () => {
  const dir = await tempArtifacts();
  const logger = new RecordingLogger();

  // node:test runs without a TTY, so stdin.isTTY is undefined/false here.
  const code = await runClean(new CliOutput(logger), dir, false);

  assert.equal(code, 2, "should return exit code 2 in non-interactive mode");
  assert.equal(await exists(dir), true, "artifacts directory must NOT be deleted");
  assert.ok(logger.lines.some((l) => l.toLowerCase().includes("--force")));
});
