import assert from "node:assert/strict";
import test from "node:test";
import { ReferenceConfiguration } from "../src/configuration/reference-configuration";
import { DesignProvider } from "../src/core/interfaces/design-provider";
import { Storage } from "../src/core/interfaces/storage";
import { DownloadedReference } from "../src/core/models/downloaded-reference";
import { ReferenceService } from "../src/engine/reference-service";

class StaticDesignProvider implements DesignProvider {
  public async downloadReference(): Promise<DownloadedReference> {
    return {
      name: "homepage",
      source: "figma",
      content: new Uint8Array([1, 2, 3]),
      width: 1_440,
      height: 900,
      metadata: { imageFormat: "png" },
    };
  }

  public async healthCheck(): Promise<void> {}
}

class MemoryStorage implements Storage {
  public savedPath?: string;

  public async save(filePath: string, _content: Uint8Array): Promise<string> {
    this.savedPath = filePath;
    return filePath;
  }

  public async read(): Promise<Uint8Array> {
    return new Uint8Array();
  }
}

test("retrieves a reference and stores it through abstractions", async () => {
  const storage = new MemoryStorage();
  const configuration: ReferenceConfiguration = { outputDirectory: "artifacts/references" };
  const service = new ReferenceService(new StaticDesignProvider(), storage, configuration);

  const reference = await service.retrieve();

  assert.equal(reference.source, "figma");
  assert.equal(reference.width, 1_440);
  assert.equal(reference.height, 900);
  assert.match(reference.localPath, /^artifacts\/references\/homepage-.+\.png$/);
  assert.equal(storage.savedPath, reference.localPath);
});
