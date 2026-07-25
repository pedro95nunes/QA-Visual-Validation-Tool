/** Persists generated artifacts without exposing a storage provider. */
export interface Storage {
  save(filePath: string, content: Uint8Array): Promise<string>;
}
