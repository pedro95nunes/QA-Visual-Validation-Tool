# Technical debt & known limitations

This document records known limitations of Atlas Visual v1.0. Items are classified as
**Critical / High / Medium / Low**. Nothing here blocks the v1.0 release; each item lists
the problem, its impact, and a recommendation.

There are **no Critical or High items** at v1.0.

---

## Medium

### TD-1 — Test coverage of the CLI `validate` action path

- **Problem:** Unit/integration coverage sits at roughly two-thirds of statements. The
  `validate` command's `action` handler (option parsing → workflow → exit code) is exercised
  end to end by the e2e test, but its error-formatting branches are not directly unit-tested.
- **Impact:** A regression in verbose/normal error formatting or exit-code mapping could pass CI.
- **Recommendation:** Extract the exit-code and error-rendering helpers (already pure functions)
  into direct unit tests. Track coverage of `resolveExitCode` and `renderValidationOutcome`.

### TD-2 — No declarative schema for YAML configuration

- **Problem:** Configuration validation is imperative (loaders + `atlas doctor`) rather than a
  single JSON Schema. Some invalid shapes are only caught at use time.
- **Impact:** Error messages are good but validation rules are spread across several files, which
  is harder to evolve and to document exhaustively.
- **Recommendation:** Introduce a JSON Schema (or Zod) for `atlas.config.yaml` and validate on
  load. This was listed as a future-sprint item and remains the right next step. Keep the
  actionable error messages.

---

## Low

### TD-3 — Only Chromium is wired for the browser abstraction

- **Problem:** `BrowserProvider` models multiple engines, but `PlaywrightBrowser` launches
  Chromium only.
- **Impact:** Cross-engine validation (Firefox/WebKit) is not yet possible despite the abstraction.
- **Recommendation:** Parameterize the Playwright launcher by engine. No core changes required —
  this is exactly the extension the abstraction was designed for.

### TD-4 — Qase action is a mock

- **Problem:** `MockQaseAction` proves the event → action → policy wiring but does not call the
  real Qase API. This is intentional for v1.0 (Qase must remain optional and credential-free).
- **Impact:** Users cannot push real results to Qase yet.
- **Recommendation:** Implement `QaseClient` behind the existing `Action` abstraction in a future
  release. The engine, plugin, comparator, and reports do not change.

### TD-5 — Integration fixtures are generated at runtime

- **Problem:** The Playwright integration/e2e test writes a small HTML page and reference image at
  runtime instead of loading committed, versioned fixture assets.
- **Impact:** The scenario is deterministic but not visually reviewable in the repo, and the test
  is gated behind `ATLAS_RUN_INTEGRATION=true`.
- **Recommendation:** Optionally commit stable fixtures under `tests/fixtures/` (pages, references,
  diffs) for review and to broaden comparator scenarios.

### TD-7 — Version string duplicated

- **Problem:** The release version lives in two places: `package.json` (`version`) and
  `ApplicationMetadata.version` (used by `atlas version` / `--version`). They must be kept in sync
  manually.
- **Impact:** They can drift (this was the case before v1.0, where the CLI reported `0.1.0`).
- **Recommendation:** Source the CLI version from `package.json` at build/runtime so there is a
  single source of truth. Deferred to avoid fragile path resolution across the `dist/` boundary in v1.0.

### TD-6 — Minimal logging abstraction

- **Problem:** The `Logger` interface exposes `info`/`error` only; there is no `debug`/`warn` level
  or structured output. Verbosity is handled at the CLI `CliOutput` layer.
- **Impact:** Fine for CLI use; less convenient if Atlas is embedded as a library needing structured logs.
- **Recommendation:** Add log levels if/when a library/embedding use case appears. Not needed for v1.0.

---

## Dependency status

`npm audit` reports **0 vulnerabilities** as of the v1.0 release. No dependencies were force-upgraded
for this release. Re-run `npm audit` at each release and record any unresolved advisories here.
