import assert from "node:assert/strict";
import test from "node:test";
import { FigmaConfiguration } from "../src/configuration/figma-configuration";
import { ScreenshotFormat } from "../src/core/models/screenshot-format";
import { FigmaProvider } from "../src/infrastructure/design/figma-provider";

const configuration: FigmaConfiguration = {
  token: "test-token",
  fileKey: "file-key",
  nodeId: "node-id",
  imageFormat: ScreenshotFormat.Png,
  name: "homepage"
};

test("downloads a Figma frame without exposing its HTTP details", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const provider = new FigmaProvider(configuration, async (input, init) => {
    requests.push({ input, init });

    if (input.includes("api.figma.com")) {
      return jsonResponse({ images: { "node-id": "https://image.test/homepage.png" } });
    }

    return imageResponse(createPngHeader(1_440, 900));
  });

  const reference = await provider.downloadReference();

  assert.equal(reference.source, "figma");
  assert.equal(reference.width, 1_440);
  assert.equal(reference.height, 900);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].init?.headers, { "X-Figma-Token": configuration.token });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body
  } as Response;
}

function imageResponse(content: Uint8Array): Response {
  return {
    ok: true,
    arrayBuffer: async () => content.buffer
  } as Response;
}

function createPngHeader(width: number, height: number): Uint8Array {
  const content = new Uint8Array(24);
  content.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const dataView = new DataView(content.buffer);
  dataView.setUint32(16, width);
  dataView.setUint32(20, height);
  return content;
}
