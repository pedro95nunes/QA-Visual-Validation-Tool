import { Reference } from "../models/reference";

/** Retrieves and persists the expected reference for an execution. */
export interface ReferenceService {
  retrieve(): Promise<Reference>;
}
