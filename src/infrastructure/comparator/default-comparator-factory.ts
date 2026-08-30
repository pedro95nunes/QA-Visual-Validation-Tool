import { ComparisonConfiguration, ComparatorProvider } from "../../configuration/comparison-configuration";
import { ConfigurationException } from "../../core/exceptions/configuration.exception";
import { ComparatorFactory } from "../../core/interfaces/comparator-factory";
import { Comparator } from "../../core/interfaces/comparator";
import { Storage } from "../../core/interfaces/storage";
import { PixelmatchComparator } from "./pixelmatch-comparator";

/** Creates the visual comparison implementation selected by configuration. */
export class DefaultComparatorFactory implements ComparatorFactory {
  public constructor(
    private readonly storage: Storage,
    private readonly configuration: ComparisonConfiguration
  ) {}

  public create(): Comparator {
    switch (this.configuration.comparator) {
      case ComparatorProvider.Pixelmatch:
        return new PixelmatchComparator(this.storage, this.configuration);
      default:
        throw new ConfigurationException(`Unsupported comparator: ${this.configuration.comparator}.`);
    }
  }
}
