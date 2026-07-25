/** A portable description of captured visual evidence. */
export interface Evidence {
  id: string;
  name: string;
  filePath: string;
  createdAt: Date;
  width: number;
  height: number;
  metadata: Record<string, string>;
}
