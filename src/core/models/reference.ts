/** A technology-independent expected visual reference. */
export interface Reference {
  id: string;
  name: string;
  source: string;
  localPath: string;
  downloadedAt: Date;
  width: number;
  height: number;
  metadata: Record<string, string>;
}
