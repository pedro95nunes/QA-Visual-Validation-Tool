/** Base exception for expected Atlas Visual failures. */
export class AtlasException extends Error {
  public constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
