# Atlas Visual architecture

```mermaid
flowchart TD
  CLI --> Engine[ValidationEngine]
  Engine --> Registry[ValidationPluginRegistry]
  Registry --> Plugin[VisualValidationPlugin]
  Plugin --> Browser[Browser]
  Plugin --> Reference[ReferenceService]
  Plugin --> Comparator[Comparator]
  Browser --> Playwright[PlaywrightBrowser]
  Reference --> Figma[FigmaProvider]
  Comparator --> Pixelmatch[PixelmatchComparator]
  Plugin --> Result[ValidationResult]
  Result --> Aggregate[ValidationExecutionResult]
```

The engine resolves registered plugins only. The visual plugin validates each configured page independently, aggregates results after browser shutdown, and maps configuration failures to CLI exit code `2`, comparison failures to `1`, and execution errors to `3`.
