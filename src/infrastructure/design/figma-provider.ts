import { FigmaConfiguration } from "../../configuration/figma-configuration";
import { InvalidReferenceException } from "../../core/exceptions/invalid-reference.exception";
import { ReferenceDownloadException } from "../../core/exceptions/reference-download.exception";
import { ReferenceProviderException } from "../../core/exceptions/reference-provider.exception";
import { DesignProvider } from "../../core/interfaces/design-provider";
import { DownloadedReference } from "../../core/models/downloaded-reference";
import { ScreenshotFormat } from "../../core/models/screenshot-format";
import { readPngDimensions } from "../../utils/read-png-dimensions";

const FIGMA_API_URL = "https://api.figma.com/v1";
const FIGMA_SOURCE = "figma";
const FIGMA_TOKEN_HEADER = "X-Figma-Token";

type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>;

/** Figma REST API adapter for retrieving a configured frame as an image. */
export class FigmaProvider implements DesignProvider {
  public constructor(
    private readonly configuration: FigmaConfiguration,
    private readonly fetcher: FetchFunction = fetch
  ) {}

  public async downloadReference(): Promise<DownloadedReference> {
    this.validateConfiguration();

    const nodeId = normalizeFigmaNodeId(this.configuration.nodeId);

    try {
      const imageUrl = await this.getImageUrl(nodeId);
      const imageResponse = await this.fetcher(imageUrl);

      if (!imageResponse.ok) {
        throw new ReferenceDownloadException(
          `Figma image download failed with HTTP ${imageResponse.status} (${imageResponse.statusText || "no status text"}).`
        );
      }

      const content = new Uint8Array(await imageResponse.arrayBuffer());
      const dimensions = readPngDimensions(content);

      return {
        name: this.configuration.name,
        source: FIGMA_SOURCE,
        content,
        width: dimensions.width,
        height: dimensions.height,
        metadata: {
          fileKey: this.configuration.fileKey,
          nodeId,
          imageFormat: this.configuration.imageFormat,
        },
      };
    } catch (error) {
      if (error instanceof ReferenceDownloadException || error instanceof InvalidReferenceException) {
        throw error;
      }

      throw new ReferenceProviderException("Unable to retrieve a reference from Figma.", toError(error));
    }
  }

  public async healthCheck(): Promise<void> {
    this.validateConfiguration();

    try {
      const response = await this.fetcher(`${FIGMA_API_URL}/me`, { headers: this.authenticationHeaders() });
      if (!response.ok) {
        const detail = await describeFigmaError(response);
        throw new ReferenceProviderException(
          `Figma health check failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}.`
        );
      }
    } catch (error) {
      if (error instanceof ReferenceProviderException) {
        throw error;
      }

      throw new ReferenceProviderException("Unable to connect to Figma.", toError(error));
    }
  }

  private async getImageUrl(nodeId: string): Promise<string> {
    const requestUrl = new URL(`${FIGMA_API_URL}/images/${this.configuration.fileKey}`);
    requestUrl.searchParams.set("ids", nodeId);
    requestUrl.searchParams.set("format", toFigmaImageFormat(this.configuration.imageFormat));
    const response = await this.fetcher(requestUrl.toString(), { headers: this.authenticationHeaders() });

    if (!response.ok) {
      const detail = await describeFigmaError(response);
      throw new ReferenceDownloadException(
        `Figma returned HTTP ${response.status} for the requested frame${detail ? `: ${detail}` : ""}.`
      );
    }

    const body: unknown = await response.json();
    const imageUrl = getImageUrl(body, nodeId);
    if (!imageUrl) {
      throw new ReferenceDownloadException(
        `Figma did not return an image for node "${nodeId}". ` +
          `Check that FIGMA_NODE_ID uses the "1:23" form (copy a frame link and convert the "-" to ":") ` +
          `and that the frame exists in file "${this.configuration.fileKey}".`
      );
    }

    return imageUrl;
  }

  private authenticationHeaders(): HeadersInit {
    return { [FIGMA_TOKEN_HEADER]: this.configuration.token };
  }

  private validateConfiguration(): void {
    if (!this.configuration.token || !this.configuration.fileKey || !this.configuration.nodeId) {
      throw new ReferenceProviderException(
        "Figma configuration requires FIGMA_TOKEN, FIGMA_FILE_KEY, and FIGMA_NODE_ID environment variables."
      );
    }
  }
}

/**
 * Normalizes a Figma node identifier into the `:`-delimited form the REST API returns.
 *
 * Accepts the value users most commonly paste by mistake:
 * - a full link or query string (`…?node-id=2-51&t=abc`) → extracts `node-id`
 * - a trailing tracking param (`2-51&t=abc`) → drops everything after `&`
 * - the link's `-` form (`2-51`) → converts to the API's `2:51`
 * An already-correct `2:51` is returned unchanged.
 */
export function normalizeFigmaNodeId(raw: string): string {
  let value = (raw ?? "").trim();

  const param = value.match(/node-id=([^&\s]+)/i);
  if (param) {
    value = param[1];
  }

  value = value.split("&")[0];
  value = value.replace(/^(\d+)-(\d+)$/, "$1:$2");

  return value;
}

/** Extracts a human-readable message from a Figma error response, without leaking secrets. */
async function describeFigmaError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return response.statusText ?? "";
    }

    try {
      const parsed = JSON.parse(text) as { err?: unknown; message?: unknown };
      const message = parsed.err ?? parsed.message;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    } catch {
      // Body was not JSON — fall through to the raw (truncated) text.
    }

    return text.slice(0, 200);
  } catch {
    return response.statusText ?? "";
  }
}

function getImageUrl(body: unknown, nodeId: string): string | undefined {
  if (!body || typeof body !== "object" || !("images" in body)) {
    return undefined;
  }

  const images = body.images;
  if (!images || typeof images !== "object" || !(nodeId in images)) {
    return undefined;
  }

  const imageUrl = (images as Record<string, unknown>)[nodeId];
  return typeof imageUrl === "string" ? imageUrl : undefined;
}

function toFigmaImageFormat(format: ScreenshotFormat): "png" {
  switch (format) {
    case ScreenshotFormat.Png:
      return "png";
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
