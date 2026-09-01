import assert from "node:assert/strict";
import test from "node:test";
import { FigmaConfiguration } from "../src/configuration/figma-configuration";
import { ScreenshotFormat } from "../src/core/models/screenshot-format";
import { FigmaProvider, normalizeFigmaNodeId } from "../src/infrastructure/design/figma-provider";

const configuration: FigmaConfiguration = {
  token: "test-token",
  fileKey: "file-key",
  nodeId: "node-id",
  imageFormat: ScreenshotFormat.Png,
  name: "homepage",
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

// ── node id normalization ─────────────────────────────────────────────────────

test("normalizeFigmaNodeId converts the link '-' form to the API ':' form", () => {
  assert.equal(normalizeFigmaNodeId("2-51"), "2:51");
});

test("normalizeFigmaNodeId leaves an already-correct ':' id unchanged", () => {
  assert.equal(normalizeFigmaNodeId("2:51"), "2:51");
});

test("normalizeFigmaNodeId strips a pasted tracking suffix", () => {
  assert.equal(normalizeFigmaNodeId("2-51&t=4Ax1ZMpOkyBMOs0F-0"), "2:51");
});

test("normalizeFigmaNodeId extracts node-id from a full pasted link", () => {
  assert.equal(normalizeFigmaNodeId("https://www.figma.com/design/KEY/name?node-id=2-51&t=abc"), "2:51");
});

test("provider requests and looks up the normalized node id when config uses the '-' form", async () => {
  const config: FigmaConfiguration = { ...configuration, nodeId: "2-51" };
  const requests: string[] = [];
  const provider = new FigmaProvider(config, async (input) => {
    requests.push(input);
    if (input.includes("api.figma.com")) {
      // Figma always keys the response with the ':' form.
      return jsonResponse({ images: { "2:51": "https://image.test/frame.png" } });
    }
    return imageResponse(createPngHeader(800, 600));
  });

  const reference = await provider.downloadReference();

  assert.equal(reference.width, 800);
  assert.equal(reference.metadata?.nodeId, "2:51");
  assert.match(requests[0], /ids=2(%3A|:)51/);
});

// ── error surfacing ───────────────────────────────────────────────────────────

test("surfaces the real HTTP status and Figma error message for a bad frame", async () => {
  const provider = new FigmaProvider(configuration, async () =>
    errorResponse(400, { status: 400, err: "ID is not a valid node_id" })
  );

  await assert.rejects(provider.downloadReference(), (error: Error) => {
    assert.match(error.message, /400/);
    assert.match(error.message, /not a valid node_id/);
    return true;
  });
});

test("surfaces a 429 rate-limit response distinctly", async () => {
  const provider = new FigmaProvider(configuration, async () =>
    errorResponse(429, { status: 429, err: "Rate limit exceeded" })
  );

  await assert.rejects(provider.downloadReference(), (error: Error) => {
    assert.match(error.message, /429/);
    assert.match(error.message, /Rate limit exceeded/);
    return true;
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

function errorResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    statusText: "",
    text: async () => JSON.stringify(body),
  } as Response;
}

function imageResponse(content: Uint8Array): Response {
  return {
    ok: true,
    arrayBuffer: async () => content.buffer,
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
