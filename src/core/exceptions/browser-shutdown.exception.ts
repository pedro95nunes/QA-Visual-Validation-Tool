import { AtlasException } from "./atlas.exception";

/** Indicates that a browser could not be shut down safely. */
export class BrowserShutdownException extends AtlasException {}
