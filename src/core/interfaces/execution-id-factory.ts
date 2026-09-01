/** Creates unique, filesystem-safe identifiers for validation executions. */
export interface ExecutionIdFactory {
  create(): string;
}
