import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LocalFileStorage } from "../src/infrastructure/storage/local-file-storage";

test("stores an artifact in a local directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atlas-visual-storage-"));
  const filePath = join(directory, "nested", "evidence.png");
  const content = new Uint8Array([1, 2, 3]);
  const storage = new LocalFileStorage();

  try {
    const storedPath = await storage.save(filePath, content);

    assert.equal(storedPath, filePath);
    assert.deepEqual(await readFile(filePath), Buffer.from(content));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
