/** Defines the application's logging boundary. */
export interface Logger {
  info(message: string): void;
  error(message: string): void;
}
