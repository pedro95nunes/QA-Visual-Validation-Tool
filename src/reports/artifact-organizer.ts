import { extname, posix } from "node:path";
import { Logger } from "../core/interfaces/logger";
import { PageArtifactPaths } from "../core/interfaces/report";
import { Storage } from "../core/interfaces/storage";
import { ValidationResult } from "../core/models/validation-result";
import { ValidationRun } from "../core/models/validation-run";
import { RunLayout, relativeFromReport } from "./run-layout";

const DEFAULT_IMAGE_EXTENSION = ".png";

/**
 * Copies the evidence, reference, and diff images referenced by a run into the
 * isolated run directory using the {@link Storage} abstraction, and returns the
 * portable relative paths a report should use to link them.
 *
 * Missing source artifacts (for example on an execution error) are skipped
 * without failing the run; every skip is logged.
 */
export class ArtifactOrganizer {
  public constructor(
    private readonly storage: Storage,
    private readonly logger: Logger
  ) {}

  public async organize(run: ValidationRun, layout: RunLayout): Promise<Record<string, PageArtifactPaths>> {
    const artifacts: Record<string, PageArtifactPaths> = {};

    for (const execution of run.executions) {
      for (const result of execution.results) {
        const paths = await this.organizePage(result, layout);
        if (paths.evidence || paths.reference || paths.diff) {
          artifacts[result.pageId] = { ...artifacts[result.pageId], ...paths };
        }
      }
    }

    return artifacts;
  }

  private async organizePage(result: ValidationResult, layout: RunLayout): Promise<PageArtifactPaths> {
    const slug = toSlug(result.pageId);

    return {
      evidence: await this.copy(
        result.evidence?.filePath,
        layout.evidenceDirectory,
        `${slug}${extensionOf(result.evidence?.filePath)}`,
        layout.reportDirectory
      ),
      reference: await this.copy(
        result.reference?.localPath,
        layout.referenceDirectory,
        `${slug}${extensionOf(result.reference?.localPath)}`,
        layout.reportDirectory
      ),
      diff: await this.copy(
        result.comparison?.diffImage,
        layout.diffDirectory,
        `${slug}-diff${extensionOf(result.comparison?.diffImage)}`,
        layout.reportDirectory
      ),
    };
  }

  private async copy(
    source: string | undefined,
    targetDirectory: string,
    targetFileName: string,
    reportDirectory: string
  ): Promise<string | undefined> {
    if (!source) {
      return undefined;
    }

    const targetPath = posix.join(targetDirectory, targetFileName);

    try {
      const content = await this.storage.read(source);
      await this.storage.save(targetPath, content);
      return relativeFromReport(reportDirectory, targetPath);
    } catch (error) {
      this.logger.info(`Skipped artifact '${source}': ${toReason(error)}`);
      return undefined;
    }
  }
}

function toSlug(pageId: string): string {
  const slug = pageId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "page";
}

function extensionOf(filePath: string | undefined): string {
  const extension = filePath ? extname(filePath) : "";
  return extension || DEFAULT_IMAGE_EXTENSION;
}

function toReason(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
