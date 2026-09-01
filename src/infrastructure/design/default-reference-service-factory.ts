import { DesignProviderType } from "../../configuration/design-configuration";
import { FigmaConfiguration } from "../../configuration/figma-configuration";
import { ReferenceConfiguration } from "../../configuration/reference-configuration";
import { ConfigurationException } from "../../core/exceptions/configuration.exception";
import { ReferenceServiceFactory } from "../../core/interfaces/reference-service-factory";
import { Storage } from "../../core/interfaces/storage";
import { VisualValidationRequest } from "../../core/models/visual-validation-request";
import { ReferenceService } from "../../engine/reference-service";
import { FigmaProvider } from "./figma-provider";

/** Builds page-specific reference services from generic visual requests. */
export class DefaultReferenceServiceFactory implements ReferenceServiceFactory {
  public constructor(
    private readonly storage: Storage,
    private readonly figmaConfiguration: FigmaConfiguration,
    private readonly referenceConfiguration: ReferenceConfiguration
  ) {}

  public create(request: VisualValidationRequest): ReferenceService {
    if (request.reference.provider !== DesignProviderType.Figma) {
      throw new ConfigurationException(`Unsupported reference provider: ${request.reference.provider}.`);
    }

    const provider = new FigmaProvider({
      ...this.figmaConfiguration,
      fileKey: request.reference.fileKey,
      nodeId: request.reference.nodeId,
      name: request.pageId,
    });

    return new ReferenceService(provider, this.storage, this.referenceConfiguration);
  }
}
