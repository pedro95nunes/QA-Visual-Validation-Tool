import { VisualValidationRequest } from "../models/visual-validation-request";
import { ReferenceService } from "./reference-service";

/** Creates a reference service for an individual visual validation request. */
export interface ReferenceServiceFactory {
  create(request: VisualValidationRequest): ReferenceService;
}
