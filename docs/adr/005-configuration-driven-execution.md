# ADR-005: Configuration-driven execution

**Status:** Accepted

## Context

Atlas targets QA engineers who are not necessarily developers. Execution must be declarative and
portable across machines and CI, without editing code. It also must support secrets safely and
allow per-run overrides.

## Decision

Drive execution from `atlas.config.yaml`. Configuration is layered: built-in defaults → YAML file
→ CLI overrides, merged by an explicit `configuration-merger`. Secrets are injected via
environment-variable interpolation (`${FIGMA_TOKEN}`) and never stored in the file. The CLI is a
presentation layer that parses arguments and delegates; no validation logic lives in it.

## Consequences

- The same config runs identically on a laptop and in CI; artifacts use relative paths and stay portable.
- Non-technical users edit YAML, not TypeScript.
- Precedence is explicit and testable; overrides (`--environment`, `--no-html`, `--qase`) are predictable.
- Secrets remain in the environment, keeping domain models and committed files secret-free.
