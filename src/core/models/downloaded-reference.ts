/** Represents reference content retrieved before it is persisted locally. */
export interface DownloadedReference {
  name: string;
  source: string;
  content: Uint8Array;
  width: number;
  height: number;
  metadata: Record<string, string>;
}
