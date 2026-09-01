import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { StorageException } from "../../core/exceptions/storage.exception";
import { Storage } from "../../core/interfaces/storage";

/** Stores and reads artifacts on the local filesystem. */
export class LocalFileStorage implements Storage {
  public async save(filePath: string, content: Uint8Array): Promise<string> {
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
      return filePath;
    } catch (error) {
      throw new StorageException(`Unable to store artifact at: ${filePath}.`, toError(error));
    }
  }

  public async read(filePath: string): Promise<Uint8Array> {
    try {
      return await readFile(filePath);
    } catch (error) {
      throw new StorageException(`Unable to read artifact at: ${filePath}.`, toError(error));
    }
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
