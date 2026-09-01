import assert from "node:assert/strict";
import test from "node:test";
import { ComparisonConfiguration, ComparatorProvider } from "../src/configuration/comparison-configuration";
import { Storage } from "../src/core/interfaces/storage";
import { DefaultComparatorFactory } from "../src/infrastructure/comparator/default-comparator-factory";
import { PixelmatchComparator } from "../src/infrastructure/comparator/pixelmatch-comparator";

class MemoryStorage implements Storage {
  public async save(filePath: string, _content: Uint8Array): Promise<string> {
    return filePath;
  }

  public async read(): Promise<Uint8Array> {
    return new Uint8Array();
  }
}

test("creates the Pixelmatch comparator selected by configuration", () => {
  const configuration: ComparisonConfiguration = {
    comparator: ComparatorProvider.Pixelmatch,
    pixelThreshold: 0.1,
    allowedDifferencePercentage: 1,
    includeAA: false,
    alpha: 0.5,
    outputDirectory: "artifacts/diffs",
  };

  const comparator = new DefaultComparatorFactory(new MemoryStorage(), configuration).create();

  assert.equal(comparator instanceof PixelmatchComparator, true);
});
