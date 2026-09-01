# Changelog

All notable changes to Atlas Visual are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-01

First public release. Atlas Visual is a configuration-driven, vendor-neutral
visual validation platform for QA teams.

### Added

**Core platform**

- CLI (`atlas`) with `validate`, `init`, `doctor`, `providers`, `actions`, `clean`, and `version` commands.
- YAML configuration with environment-variable interpolation and layered precedence (defaults → file → CLI overrides).
- Clean-architecture core: domain models, interfaces, and exceptions with no infrastructure dependencies.

**Visual validation pipeline**

- Browser abstraction with a Playwright implementation (Chromium).
- Screenshot / evidence capture with a safe browser lifecycle (`try/finally`).
- Design-reference abstraction with a Figma provider (token via environment variable).
- Comparator abstraction with a Pixelmatch implementation.
- `VisualValidationPlugin` orchestrating capture → reference → compare → result, per page.
- `ValidationResult` / `ValidationExecutionResult` / `ValidationRun` aggregates.

**Reporting & artifacts**

- HTML report (semantic, accessible, status not conveyed by color alone) and machine-readable JSON report.
- Per-execution artifact organization under `artifacts/runs/<execution-id>/` with portable relative paths.
- Secret redaction in reports and logs.

**Events & actions**

- In-memory event bus and event-driven `ActionEngine`.
- `ActionRegistry` and configurable action policies (enable/disable, `onlyOnFailure`, environment scoping).
- Optional, disabled-by-default Qase action (mock client; real integration deferred). No credentials required to run Atlas.

**Developer experience & quality**

- Strict TypeScript, ESLint (typescript-eslint), and Prettier.
- Unit, integration, and end-to-end tests; `c8` coverage.
- GitHub Actions CI (lint, typecheck, format check, unit, integration, e2e, coverage) with failure-artifact upload.
- Documentation: README, architecture guide, ADRs, technical-debt register, release checklist, contributing guide, and a runnable example project.

### Security

- `.env`, `artifacts/`, `dist/`, `coverage/`, and local machine files are git-ignored.
- Provider tokens (Figma, Qase) are read from environment variables only; example configs contain placeholders.

[1.0.0]: #100--2026-09-01
