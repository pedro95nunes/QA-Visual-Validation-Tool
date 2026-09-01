/** Base contract for all domain and application events. */
export interface Event {
  readonly type: string;
  readonly occurredAt: Date;
}
