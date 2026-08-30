import { Comparator } from "./comparator";

/** Selects the configured visual comparison implementation. */
export interface ComparatorFactory {
  create(): Comparator;
}
