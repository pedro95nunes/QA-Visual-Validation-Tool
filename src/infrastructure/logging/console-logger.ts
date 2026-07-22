import { Logger } from "../../core/interfaces/logger";

/** Console-backed adapter for the application's Logger boundary. */
export class ConsoleLogger implements Logger {
  public info(message: string): void {
    console.log(message);
  }

  public error(message: string): void {
    console.error(message);
  }
}
