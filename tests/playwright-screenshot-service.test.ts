import assert from "node:assert/strict";
import test from "node:test";
import { EvidenceConfiguration } from "../src/configuration/evidence-configuration";
import { Browser } from "../src/core/interfaces/browser";
import { Storage } from "../src/core/interfaces/storage";
import { ScreenshotFormat } from "../src/core/models/screenshot-format";
import { PlaywrightScreenshotService } from "../src/infrastructure/screenshot/playwright-screenshot-service";

class ScreenshotBrowser implements Browser {
  public captured = false;

  public async launch(): Promise<void> {}
  public async open(_url: string): Promise<void> {}

  public async captureScreenshot(): Promise<Uint8Array> {
    this.captured = true;
    return createPngHeader(1_440, 900);
  }

  public async close(): Promise<void> {}
}

class MemoryStorage implements Storage {
  public filePath?: string;
  public content?: Uint8Array;

  public async save(filePath: string, content: Uint8Array): Promise<string> {
    this.filePath = filePath;
    this.content = content;
    return filePath;
  }

  public async read(): Promise<Uint8Array> {
    return this.content ?? new Uint8Array();
  }
}

const evidenceConfiguration: EvidenceConfiguration = {
  outputDirectory: "artifacts",
  fullPage: true,
  imageFormat: ScreenshotFormat.Png,
  name: "homepage",
};

test("captures and stores evidence through generic browser and storage boundaries", async () => {
  const browser = new ScreenshotBrowser();
  const storage = new MemoryStorage();
  const service = new PlaywrightScreenshotService(browser, storage, evidenceConfiguration);

  const evidence = await service.capture();

  assert.equal(browser.captured, true);
  assert.equal(evidence.name, evidenceConfiguration.name);
  assert.equal(evidence.width, 1_440);
  assert.equal(evidence.height, 900);
  assert.equal(evidence.metadata.fullPage, "true");
  assert.match(evidence.filePath, /^artifacts\/homepage-.+\.png$/);
  assert.deepEqual(storage.content, createPngHeader(1_440, 900));
});

function createPngHeader(width: number, height: number): Uint8Array {
  const content = new Uint8Array(24);
  content.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const dataView = new DataView(content.buffer);
  dataView.setUint32(16, width);
  dataView.setUint32(20, height);
  return content;
}
