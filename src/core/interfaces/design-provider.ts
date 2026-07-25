import { DownloadedReference } from "../models/downloaded-reference";

/** Retrieves expected visual references from an external design source. */
export interface DesignProvider {
  downloadReference(): Promise<DownloadedReference>;
  healthCheck(): Promise<void>;
}
