import { AtlasException } from "./atlas.exception";

/** Indicates that an artifact could not be persisted or read back. */
export class StorageException extends AtlasException {}
