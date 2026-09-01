import { randomUUID } from "node:crypto";
import { ExecutionIdFactory } from "../../core/interfaces/execution-id-factory";

const SHORT_SUFFIX_LENGTH = 5;

/**
 * Produces identifiers such as `2026-08-31T21-30-42Z-a8f31`.
 *
 * The timestamp keeps runs sortable; the random suffix avoids collisions when
 * two executions start within the same second. Colons are removed so the value
 * is safe to use directly as a directory name on every platform.
 */
export class DefaultExecutionIdFactory implements ExecutionIdFactory {
  public constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly shortId: () => string = defaultShortId
  ) {}

  public create(): string {
    const timestamp = this.now()
      .toISOString()
      .replace(/\.\d+Z$/, "Z")
      .replace(/:/g, "-");

    return `${timestamp}-${this.shortId()}`;
  }
}

function defaultShortId(): string {
  return randomUUID().replace(/-/g, "").slice(0, SHORT_SUFFIX_LENGTH);
}
