# ADR-003: Comparator abstraction

**Status:** Accepted

## Context

Image comparison is the heart of the tool. Pixelmatch is the initial algorithm, but SSIM,
perceptual hashing, or a hosted service (e.g. Percy) are all plausible alternatives. The
validation flow should not be rewritten to change how images are compared.

## Decision

Define a `Comparator` interface (plus `ComparatorFactory`) in `core` that takes two images and
comparison options and returns a `ComparisonResult` (difference percentage, allowed threshold,
diff image, status). `PixelmatchComparator` implements it in infrastructure.

## Consequences

- Threshold and result semantics live in the domain, independent of the algorithm.
- A new comparator is an infrastructure-only addition selected by configuration.
- Dimension mismatches and other failure modes are expressed as domain results, not vendor errors.
- The comparator is pure and easily unit-tested with fixture images.
