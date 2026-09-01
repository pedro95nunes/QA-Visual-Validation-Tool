# ADR-002: Design-reference abstraction

**Status:** Accepted

## Context

Reference images come from a design source. Figma is the first source, but teams also use
Adobe XD, Penpot, or plain image files. Coupling the comparator to Figma's API and token model
would leak vendor concerns (and secrets) into the validation core.

## Decision

Define a `DesignProvider` / `ReferenceService` abstraction in `core` that returns a
`DownloadedReference` regardless of source. The `FigmaProvider` implements it in infrastructure
and reads its token from an environment variable. Secrets are never part of domain models.

## Consequences

- The comparator receives a reference image; it does not know or care that it came from Figma.
- Swapping or adding a design source is an infrastructure-only change behind the same interface.
- Figma tokens stay in the environment and out of configuration files, reports, and logs.
- Tests mock the provider (and, for the Figma provider, mock HTTP) — no live credentials required.
