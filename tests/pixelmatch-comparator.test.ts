import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PNG } from "pngjs";
import { ComparisonConfiguration, ComparatorProvider } from "../src/configuration/comparison-configuration";
import { Storage } from "../src/core/interfaces/storage";
import { Evidence } from "../src/core/models/evidence";
import { ComparisonStatus } from "../src/core/models/comparison-status";
import { Reference } from "../src/core/models/reference";
import { PixelmatchComparator } from "../src/infrastructure/comparator/pixelmatch-comparator";

class MemoryStorage implements Storage {
  public savedPath?: string;
  public content?: Uint8Array;

  public async save(filePath: string, content: Uint8Array): Promise<string> {
    this.savedPath = filePath;
    this.content = content;
    return filePath;
  }

  public async read(): Promise<Uint8Array> {
    return this.content ?? new Uint8Array();
  }
}

const comparisonConfiguration: ComparisonConfiguration = {
  comparator: ComparatorProvider.Pixelmatch,
  pixelThreshold: 0.1,
  allowedDifferencePercentage: 10,
  includeAA: false,
  alpha: 0.5,
  outputDirectory: "artifacts/diffs",
};

test("passes identical PNG images without storing a diff", async () => {
  await withImages([255, 255, 255, 255], [255, 255, 255, 255], async (reference, evidence) => {
    const storage = new MemoryStorage();
    const result = await new PixelmatchComparator(storage, comparisonConfiguration).compare(reference, evidence);

    assert.equal(result.status, ComparisonStatus.Passed, JSON.stringify(result.metadata));
    assert.equal(result.differentPixels, 0);
    assert.equal(result.differencePercentage, 0);
    assert.equal(result.diffImage, undefined);
    assert.equal(storage.savedPath, undefined);
  });
});

test("stores a diff image and passes when differences are within the allowed percentage", async () => {
  await withSinglePixelDifference(async (reference, evidence) => {
    const storage = new MemoryStorage();
    const result = await new PixelmatchComparator(storage, comparisonConfiguration).compare(reference, evidence);

    assert.equal(result.status, ComparisonStatus.Passed);
    assert.equal(result.differentPixels, 1);
    assert.equal(result.differencePercentage, 6.25);
    assert.equal(result.diffImage, "artifacts/diffs/reference-diff.png");
    assert.ok(storage.content);
  });
});

test("fails when differences exceed the allowed percentage", async () => {
  const strictConfiguration = { ...comparisonConfiguration, allowedDifferencePercentage: 1 };
  await withSinglePixelDifference(async (reference, evidence) => {
    const result = await new PixelmatchComparator(new MemoryStorage(), strictConfiguration).compare(
      reference,
      evidence
    );

    assert.equal(result.status, ComparisonStatus.Failed, JSON.stringify(result.metadata));
    assert.equal(result.passed, false);
  });
});

async function withSinglePixelDifference(
  assertion: (reference: Reference, evidence: Evidence) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "atlas-comparator-"));
  const referencePath = join(directory, "reference.png");
  const evidencePath = join(directory, "evidence.png");
  const reference = new PNG({ width: 4, height: 4 });
  reference.data.fill(255);
  const evidence = PNG.sync.read(PNG.sync.write(reference));
  evidence.data.set([0, 0, 0, 255], 0);
  await writeFile(referencePath, PNG.sync.write(reference));
  await writeFile(evidencePath, PNG.sync.write(evidence));

  try {
    await assertion(referenceFor(referencePath), evidenceFor(evidencePath));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("returns incompatible dimensions without attempting comparison", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atlas-comparator-"));
  const referencePath = join(directory, "reference.png");
  const evidencePath = join(directory, "evidence.png");
  await writeFile(referencePath, pngBuffer(4, 4, [255, 255, 255, 255]));
  await writeFile(evidencePath, pngBuffer(2, 2, [255, 255, 255, 255]));

  try {
    const result = await new PixelmatchComparator(new MemoryStorage(), comparisonConfiguration).compare(
      referenceFor(referencePath),
      evidenceFor(evidencePath)
    );

    assert.equal(result.status, ComparisonStatus.IncompatibleDimensions);
    assert.deepEqual(result.metadata, { referenceDimensions: "4x4", evidenceDimensions: "2x2" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("returns invalid evidence for unreadable image data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atlas-comparator-"));
  const referencePath = join(directory, "reference.png");
  const evidencePath = join(directory, "evidence.png");
  await writeFile(referencePath, pngBuffer(4, 4, [255, 255, 255, 255]));
  await writeFile(evidencePath, "not a PNG");

  try {
    const result = await new PixelmatchComparator(new MemoryStorage(), comparisonConfiguration).compare(
      referenceFor(referencePath),
      evidenceFor(evidencePath)
    );

    assert.equal(result.status, ComparisonStatus.InvalidEvidence);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function withImages(
  referenceColor: [number, number, number, number],
  evidenceColor: [number, number, number, number],
  assertion: (reference: Reference, evidence: Evidence) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "atlas-comparator-"));
  const referencePath = join(directory, "reference.png");
  const evidencePath = join(directory, "evidence.png");
  await writeFile(referencePath, pngBuffer(4, 4, referenceColor));
  await writeFile(evidencePath, pngBuffer(4, 4, evidenceColor));

  try {
    await assertion(referenceFor(referencePath), evidenceFor(evidencePath));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function pngBuffer(width: number, height: number, color: [number, number, number, number]): Buffer {
  const image = new PNG({ width, height });
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data.set(color, offset);
  }
  return PNG.sync.write(image);
}

function referenceFor(localPath: string): Reference {
  return {
    id: "reference",
    name: "reference",
    source: "test",
    localPath,
    downloadedAt: new Date(),
    width: 4,
    height: 4,
    metadata: {},
  };
}

function evidenceFor(filePath: string): Evidence {
  return {
    id: "evidence",
    name: "evidence",
    filePath,
    createdAt: new Date(),
    width: 4,
    height: 4,
    metadata: {},
  };
}
