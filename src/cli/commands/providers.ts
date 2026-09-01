import { BrowserProvider } from "../../configuration/browser-configuration";
import { DesignProviderType } from "../../configuration/design-configuration";
import { ComparatorProvider } from "../../configuration/comparison-configuration";
import { CliOutput } from "../output";

/** Displays all registered providers using enum values — not hardcoded strings. */
export function renderProviders(output: CliOutput): void {
  output.info("Browser Providers:");
  for (const value of Object.values(BrowserProvider)) {
    output.pass(value);
  }

  output.blank();
  output.info("Design Providers:");
  for (const value of Object.values(DesignProviderType)) {
    output.pass(value);
  }

  output.blank();
  output.info("Comparator Providers:");
  for (const value of Object.values(ComparatorProvider)) {
    output.pass(value);
  }
}
