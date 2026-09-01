import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { ComparisonConfiguration } from "../../configuration/comparison-configuration";
import { Comparator } from "../../core/interfaces/comparator";
import { Storage } from "../../core/interfaces/storage";
import { Evidence } from "../../core/models/evidence";
import { ComparisonOptions, RgbColor } from "../../core/models/comparison-options";
import { ComparisonResult } from "../../core/models/comparison-result";
import { ComparisonStatus } from "../../core/models/comparison-status";
import { Reference } from "../../core/models/reference";

const PNG_EXTENSION = ".png";

/** Pixelmatch adapter that reads PNGs, generates diffs, and stores them via Storage. */
export class PixelmatchComparator implements Comparator {
  public constructor(
    private readonly storage: Storage,
    private readonly configuration: ComparisonConfiguration
  ) {}

  public async compare(
    reference: Reference,
    evidence: Evidence,
    options?: ComparisonOptions
  ): Promise<ComparisonResult> {
    const startedAt = performance.now();
    const comparisonOptions = this.resolveOptions(options);
    const referenceImage = await this.readImage(reference.localPath, ComparisonStatus.InvalidReference);
    if ("result" in referenceImage) {
      return this.finish(referenceImage.result, startedAt, comparisonOptions);
    }

    const evidenceImage = await this.readImage(evidence.filePath, ComparisonStatus.InvalidEvidence);
    if ("result" in evidenceImage) {
      return this.finish(evidenceImage.result, startedAt, comparisonOptions);
    }

    if (
      referenceImage.image.width !== evidenceImage.image.width ||
      referenceImage.image.height !== evidenceImage.image.height
    ) {
      return this.finish(
        {
          status: ComparisonStatus.IncompatibleDimensions,
          width: evidenceImage.image.width,
          height: evidenceImage.image.height,
          metadata: {
            referenceDimensions: `${referenceImage.image.width}x${referenceImage.image.height}`,
            evidenceDimensions: `${evidenceImage.image.width}x${evidenceImage.image.height}`,
          },
        },
        startedAt,
        comparisonOptions
      );
    }

    try {
      const { width, height } = referenceImage.image;
      const diffImage = new PNG({ width, height });
      const differentPixels = pixelmatch(
        referenceImage.image.data,
        evidenceImage.image.data,
        diffImage.data,
        width,
        height,
        this.toPixelmatchOptions(comparisonOptions)
      );
      const totalPixels = width * height;
      const differencePercentage = (differentPixels / totalPixels) * 100;
      const passed = differencePercentage <= comparisonOptions.allowedDifferencePercentage;
      const diffImagePath = differentPixels > 0 ? await this.storeDiffImage(diffImage, reference.name) : undefined;

      return this.finish(
        {
          status: passed ? ComparisonStatus.Passed : ComparisonStatus.Failed,
          width,
          height,
          differentPixels,
          totalPixels,
          differencePercentage,
          passed,
          diffImage: diffImagePath,
          metadata: {},
        },
        startedAt,
        comparisonOptions
      );
    } catch (error) {
      return this.finish(
        {
          status: ComparisonStatus.Error,
          metadata: { reason: toSafeErrorReason(error) },
        },
        startedAt,
        comparisonOptions
      );
    }
  }

  private async readImage(
    filePath: string,
    status: ComparisonStatus.InvalidReference | ComparisonStatus.InvalidEvidence
  ): Promise<{ image: PNG } | { result: Partial<ComparisonResult> }> {
    if (extname(filePath).toLowerCase() !== PNG_EXTENSION) {
      return { result: { status, metadata: { reason: "Only PNG images are supported." } } };
    }

    try {
      return { image: PNG.sync.read(await readFile(filePath)) };
    } catch {
      return { result: { status, metadata: { reason: "Image could not be read." } } };
    }
  }

  private async storeDiffImage(diffImage: PNG, referenceName: string): Promise<string> {
    const baseName = basename(referenceName || "reference", extname(referenceName || "reference"));
    const filePath = join(this.configuration.outputDirectory, `${baseName}-diff.png`);
    return this.storage.save(filePath, PNG.sync.write(diffImage));
  }

  private resolveOptions(options?: ComparisonOptions): ComparisonOptions {
    return (
      options ?? {
        pixelThreshold: this.configuration.pixelThreshold,
        allowedDifferencePercentage: this.configuration.allowedDifferencePercentage,
        includeAA: this.configuration.includeAA,
        alpha: this.configuration.alpha,
      }
    );
  }

  private toPixelmatchOptions(options: ComparisonOptions): {
    threshold: number;
    includeAA: boolean;
    alpha: number;
    diffColor?: [number, number, number];
    diffColorAlt?: [number, number, number];
  } {
    const pixelmatchOptions: {
      threshold: number;
      includeAA: boolean;
      alpha: number;
      diffColor?: [number, number, number];
      diffColorAlt?: [number, number, number];
    } = {
      threshold: options.pixelThreshold,
      includeAA: options.includeAA,
      alpha: options.alpha,
    };

    if (options.diffColor) {
      pixelmatchOptions.diffColor = toPixelmatchColor(options.diffColor);
    }
    if (options.diffColorAlt) {
      pixelmatchOptions.diffColorAlt = toPixelmatchColor(options.diffColorAlt);
    }

    return pixelmatchOptions;
  }

  private finish(
    partialResult: Partial<ComparisonResult>,
    startedAt: number,
    options: ComparisonOptions
  ): ComparisonResult {
    return {
      status: partialResult.status ?? ComparisonStatus.Error,
      differencePercentage: partialResult.differencePercentage ?? 0,
      differentPixels: partialResult.differentPixels ?? 0,
      totalPixels: partialResult.totalPixels ?? 0,
      width: partialResult.width,
      height: partialResult.height,
      threshold: options.pixelThreshold,
      pixelThreshold: options.pixelThreshold,
      allowedDifferencePercentage: options.allowedDifferencePercentage,
      passed: partialResult.passed ?? false,
      diffImage: partialResult.diffImage,
      metadata: partialResult.metadata ?? {},
      duration: performance.now() - startedAt,
    };
  }
}

function toPixelmatchColor(color: RgbColor): [number, number, number] {
  return [color.red, color.green, color.blue];
}

function toSafeErrorReason(error: unknown): string {
  return error instanceof Error ? error.message : "Comparison could not be completed.";
}
