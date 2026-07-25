import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { EvidenceConfiguration } from "../../configuration/evidence-configuration";
import { EvidenceCaptureException } from "../../core/exceptions/evidence-capture.exception";
import { Browser } from "../../core/interfaces/browser";
import { ScreenshotService } from "../../core/interfaces/screenshot-service";
import { Storage } from "../../core/interfaces/storage";
import { Evidence } from "../../core/models/evidence";
import { ScreenshotFormat } from "../../core/models/screenshot-format";
import { readPngDimensions } from "../../utils/read-png-dimensions";

/** Captures browser evidence and persists it through the Storage boundary. */
export class PlaywrightScreenshotService implements ScreenshotService {
  public constructor(
    private readonly browser: Browser,
    private readonly storage: Storage,
    private readonly configuration: EvidenceConfiguration
  ) {}

  public async capture(): Promise<Evidence> {
    try {
      const content = await this.browser.captureScreenshot({
        fullPage: this.configuration.fullPage,
        format: this.configuration.imageFormat
      });
      const dimensions = readPngDimensions(content);
      const id = randomUUID();
      const filePath = join(
        this.configuration.outputDirectory,
        `${this.configuration.name}-${id}.${this.configuration.imageFormat}`
      );
      const storedFilePath = await this.storage.save(filePath, content);

      return {
        id,
        name: this.configuration.name,
        filePath: storedFilePath,
        createdAt: new Date(),
        width: dimensions.width,
        height: dimensions.height,
        metadata: {
          fullPage: String(this.configuration.fullPage),
          imageFormat: this.configuration.imageFormat
        }
      };
    } catch (error) {
      if (error instanceof EvidenceCaptureException) {
        throw error;
      }

      throw new EvidenceCaptureException("Unable to capture visual evidence.", toError(error));
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
