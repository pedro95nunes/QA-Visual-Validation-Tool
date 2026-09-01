import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ReferenceConfiguration } from "../configuration/reference-configuration";
import { ReferenceDownloadException } from "../core/exceptions/reference-download.exception";
import { DesignProvider } from "../core/interfaces/design-provider";
import { ReferenceService as ReferenceServiceContract } from "../core/interfaces/reference-service";
import { Storage } from "../core/interfaces/storage";
import { Reference } from "../core/models/reference";

/** Coordinates external reference retrieval and local artifact persistence. */
export class ReferenceService implements ReferenceServiceContract {
  public constructor(
    private readonly designProvider: DesignProvider,
    private readonly storage: Storage,
    private readonly configuration: ReferenceConfiguration
  ) {}

  public async retrieve(): Promise<Reference> {
    try {
      const downloadedReference = await this.designProvider.downloadReference();
      const id = randomUUID();
      const imageFormat = downloadedReference.metadata.imageFormat;
      const localPath = join(this.configuration.outputDirectory, `${downloadedReference.name}-${id}.${imageFormat}`);
      const storedPath = await this.storage.save(localPath, downloadedReference.content);

      return {
        id,
        name: downloadedReference.name,
        source: downloadedReference.source,
        localPath: storedPath,
        downloadedAt: new Date(),
        width: downloadedReference.width,
        height: downloadedReference.height,
        metadata: downloadedReference.metadata,
      };
    } catch (error) {
      if (error instanceof ReferenceDownloadException) {
        throw error;
      }

      throw new ReferenceDownloadException("Unable to retrieve and store a visual reference.", toError(error));
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
