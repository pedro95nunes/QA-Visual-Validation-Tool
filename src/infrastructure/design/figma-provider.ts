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

    try {
      const imageUrl = await this.getImageUrl();
      const imageResponse = await this.fetcher(imageUrl);

      if (!imageResponse.ok) {
        throw new ReferenceDownloadException("Figma returned an unsuccessful response for the reference image.");
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
          nodeId: this.configuration.nodeId,
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
        throw new ReferenceProviderException("Figma health check was unsuccessful.");
      }
    } catch (error) {
      if (error instanceof ReferenceProviderException) {
        throw error;
      }

      throw new ReferenceProviderException("Unable to connect to Figma.", toError(error));
    }
  }

  private async getImageUrl(): Promise<string> {
    const requestUrl = new URL(`${FIGMA_API_URL}/images/${this.configuration.fileKey}`);
    requestUrl.searchParams.set("ids", this.configuration.nodeId);
    requestUrl.searchParams.set("format", toFigmaImageFormat(this.configuration.imageFormat));
    const response = await this.fetcher(requestUrl.toString(), { headers: this.authenticationHeaders() });

    if (!response.ok) {
      throw new ReferenceDownloadException("Figma returned an unsuccessful response for the requested frame.");
    }

    const body: unknown = await response.json();
    const imageUrl = getImageUrl(body, this.configuration.nodeId);
    if (!imageUrl) {
      throw new ReferenceDownloadException("Figma did not return an image for the configured frame.");
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
