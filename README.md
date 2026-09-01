# Atlas Visual

Atlas Visual is an open-source visual validation platform for QA teams. It compares browser screenshots against Figma design references and generates portable HTML and JSON reports. An event-driven Action Engine executes external integrations (Qase, Slack, Jira, …) after the run — without coupling the validation flow to any vendor.

---

## What's new in v1.0 (production readiness)

The v1.0 release hardens the platform for real-world, open-source use. Highlights:

- **`atlas clean` command** — safely removes the artifacts directory (confirmation required unless `--force`); never touches paths outside the configured directory.
- **Full test strategy** — unit, integration, and a deterministic end-to-end pipeline test (`test:e2e`), all using local fixtures and requiring no external credentials.
- **Coverage** — `c8` coverage (`npm run test:coverage`), source-mapped to TypeScript.
- **CI/CD** — GitHub Actions (`.github/workflows/ci.yml`) running lint, typecheck, format check, unit, integration, e2e, and coverage on PRs and pushes; failed runs upload artifacts (never secrets).
- **Code quality** — ESLint (typescript-eslint), Prettier (`format` / `format:check`), strict TypeScript.
- **Security** — secrets stay in environment variables; `.env`, `artifacts/`, `dist/`, `coverage/`, and local machine files are git-ignored; reports and logs redact secrets; `npm audit` reports 0 vulnerabilities.
- **Docs & governance** — [CONTRIBUTING](CONTRIBUTING.md), [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md), [CHANGELOG](CHANGELOG.md), [release checklist](docs/release-checklist.md), [technical-debt register](docs/technical-debt.md), [ADRs](docs/adr/), issue/PR templates, and a runnable [example project](examples/basic/).
- **Architecture review** — final Clean Architecture / SOLID review and extensibility exercises in [docs/architecture.md](docs/architecture.md).

See [CHANGELOG.md](CHANGELOG.md) for the complete v1.0 notes.

---

## Installation

```bash
npm install -g atlas-visual
# or run locally:
npm install
npm run build
```

---

## Quick Start

```bash
# 1. Initialize a project (interactive)
atlas init

# 2. Set your Figma credentials
export FIGMA_TOKEN="your-figma-token"
export FIGMA_FILE_KEY="your-file-key"
export FIGMA_NODE_ID="your-node-id"

# 3. Verify the environment
atlas doctor

# 4. Run validation
atlas validate
```

---

## CLI Commands

### `atlas init`

Interactively creates `atlas.config.yaml` in the current directory.

```
atlas init
```

Guides you through:

- Project name and environment
- Target URL and page ID
- Figma node ID
- Report formats (HTML / JSON)
- Action integrations (Qase, …)

Secrets (API tokens) are **never collected**. The generated config uses `${ENV_VAR}` placeholders.

In CI or non-interactive terminals, `atlas init` exits with code `2` and provides instructions for manual setup.

---

### `atlas doctor`

Validates the environment and configuration.

```
atlas doctor
atlas doctor --config ./staging.yaml
```

Checks:

- Node.js version (18+ required)
- Configuration file presence
- Browser provider (Playwright)
- Figma token and file key
- Comparator (Pixelmatch)
- Storage output directory
- Report formats
- Action configuration

Example output:

```
────────────────────────────────────────

Atlas Doctor
────────────────────────────────────────
  ✓ Node.js  v22.17.1
  ✓ Configuration file  /project/atlas.config.yaml
  ✓ Browser provider (Playwright)
  ✓ FIGMA_TOKEN  Configured (value hidden)
  ✓ Figma file key
  ✓ Comparator (Pixelmatch)
  ✓ Storage (local filesystem)  Output: artifacts
  ✓ Reports  Enabled: HTML, JSON
  ─ Action: qase  Disabled
  ─ Action: slack  Disabled

No problems found.
```

---

### `atlas validate`

Runs visual validation and generates reports.

```
atlas validate
atlas validate --config ./atlas.config.yaml
atlas validate --environment staging
atlas validate --qase
atlas validate --no-qase
atlas validate --html
atlas validate --no-html
atlas validate --json
atlas validate --no-json
atlas validate --quiet
atlas validate --verbose
```

**Flags:**

| Flag                   | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `--config <path>`      | Path to configuration file (default: `atlas.config.yaml`)         |
| `--environment <env>`  | Override the execution environment for this run only              |
| `--qase` / `--no-qase` | Enable or disable the Qase action for this run only               |
| `--html` / `--no-html` | Enable or disable the HTML report for this run only               |
| `--json` / `--no-json` | Enable or disable the JSON report for this run only               |
| `--quiet`              | Suppress informational output; only errors and final status shown |
| `--verbose`            | Show detailed execution information                               |

**Configuration precedence (highest → lowest):**

```
CLI flags  →  Environment variables  →  atlas.config.yaml  →  Built-in defaults
```

CLI flags apply to the current execution only. They never modify `atlas.config.yaml`.

Example output:

```
────────────────────────────────────────
Atlas Visual Validation Platform
Configuration: /project/atlas.config.yaml
────────────────────────────────────────

Validation
────────────────────────────────────────
  ✓ homepage  https://example.com
  ✗ about  https://example.com/about
    Difference: 4.32%  (allowed: 1.00%)
  ✓ contact  https://example.com/contact

Summary
────────────────────────────────────────
  Total:    3
  Passed:   2
  Failed:   1
  Duration: 12.4s

Reports
────────────────────────────────────────
  ✓ HTML  artifacts/runs/2026-08-31T21-30-42Z-a8f31/report/index.html
  ✓ JSON  artifacts/runs/2026-08-31T21-30-42Z-a8f31/report/report.json
  Artifacts: artifacts/runs/2026-08-31T21-30-42Z-a8f31

────────────────────────────────────────
Validation FAILED
```

**Exit codes:**

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| `0`  | All pages passed                             |
| `1`  | One or more pages failed (visual difference) |
| `2`  | Configuration error                          |
| `3`  | Execution error                              |

---

### `atlas providers`

Lists all registered browser, design, and comparator providers.

```
atlas providers
```

---

### `atlas actions`

Lists all registered actions and their current policy from configuration.

```
atlas actions
atlas actions --config ./atlas.config.yaml
```

---

### `atlas clean`

Removes the artifacts directory (evidence, references, diffs, and reports). In an interactive
terminal it asks for confirmation; in CI or any non-interactive shell you must pass `--force`.
It never deletes anything outside the configured artifacts directory.

```
atlas clean
atlas clean --force
```

---

### `atlas version`

Displays the application version.

```
atlas version
```

---

## Configuration

Atlas Visual is configured via `atlas.config.yaml` in your project root. You can specify a different file with `--config`.

### Full configuration reference

```yaml
# atlas.config.yaml

project:
  name: My Website

# Named execution environment — used by action policies
environment: local

browser:
  provider: playwright # currently: playwright
  headless: true
  timeout: 30000 # milliseconds
  viewport:
    width: 1440
    height: 900

visual:
  enabled: true
  pages:
    - id: homepage
      url: https://example.com
      reference:
        provider: figma
        fileKey: ${FIGMA_FILE_KEY} # env var interpolation
        nodeId: ${FIGMA_NODE_ID}
      comparison:
        pixelThreshold: 0.1 # 0–1 per-pixel sensitivity
        allowedDifferencePercentage: 1.0 # 0–100 acceptance limit

report:
  enabled: true
  outputDirectory: artifacts
  html:
    enabled: true
  json:
    enabled: true

actions:
  qase:
    enabled: false
    onlyOnFailure: true
    environments:
      - staging
      - production
  slack:
    enabled: false
```

If `atlas.config.yaml` is absent, Atlas Visual uses built-in defaults and reads Figma credentials from environment variables.

### Precedence of config files

1. `atlas.config.yaml` (checked first)
2. `atlas.config.yml` (fallback)
3. Built-in defaults (if neither exists)

When both `.yaml` and `.yml` exist, `.yaml` takes precedence. Atlas will not silently choose between two conflicting files.

---

## Environment Variables

| Variable         | Description                    | Required    |
| ---------------- | ------------------------------ | ----------- |
| `FIGMA_TOKEN`    | Figma personal access token    | Yes         |
| `FIGMA_FILE_KEY` | Figma file key (from file URL) | Yes         |
| `FIGMA_NODE_ID`  | Default Figma node ID          | Recommended |

Secrets are **never** written to logs, reports, or doctor output. The doctor confirms a token is set without printing its value.

### Environment variable interpolation

Use `${VAR_NAME}` in `atlas.config.yaml` to reference environment variables:

```yaml
visual:
  pages:
    - id: homepage
      reference:
        fileKey: ${FIGMA_FILE_KEY}
        nodeId: ${FIGMA_NODE_ID}
```

Missing variables are replaced with an empty string (never a crash).

---

## Reports and Artifacts

```
artifacts/
  runs/
    2026-08-31T21-30-42Z-a8f31/
      report/
        index.html     # human-readable, portable
        report.json    # machine-readable
      evidence/        # current screenshots
      references/      # Figma design references
      diffs/           # pixel-difference images
```

Each run gets a unique, filesystem-safe, chronologically sortable execution ID. Previous runs are never overwritten.

Reports reference artifacts with relative paths so they work from any location (local, CI artifact bundle, archive).

---

## Event Bus & Action Engine

After validation, `ValidationWorkflow` publishes `ValidationCompletedEvent` on the `EventBus`. The `ActionEngine` subscribes and executes eligible actions — the `ValidationEngine` and `ReportEngine` are unaware of this.

```yaml
actions:
  qase:
    enabled: true
    onlyOnFailure: true # skip if validation passed
    environments:
      - staging
      - production
```

Actions that fail **do not** affect the `ValidationRun` status. Other actions continue executing.

### Adding an action

Implement `Action` and register it:

```typescript
actionRegistry.register(new MyJiraAction());
```

No other code changes are needed.

---

## CI/CD Usage

Atlas Visual is designed to work without interactive prompts in CI.

```yaml
# Example GitHub Actions workflow
- name: Install
  run: npm install

- name: Validate environment
  run: atlas doctor

- name: Run visual validation
  run: atlas validate --environment staging --quiet
  env:
    FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
    FIGMA_FILE_KEY: ${{ secrets.FIGMA_FILE_KEY }}
    FIGMA_NODE_ID: ${{ secrets.FIGMA_NODE_ID }}
```

For Qase integration on staging:

```bash
atlas validate --environment staging --qase
```

---

## Testing

Atlas Visual ships unit, integration, and end-to-end tests. Tests use local fixtures and never
require Figma or Qase credentials.

```bash
npm test                 # build + full suite (e2e is skipped without the flag below)
npm run test:unit        # fast unit tests only
npm run test:integration # real Playwright, mocked HTTP for Figma, reports, action pipeline
npm run test:e2e         # full pipeline against a local page (real Playwright + Pixelmatch)
npm run test:coverage    # full suite under c8, source-mapped to TypeScript
```

The integration and e2e tests launch a real Chromium via Playwright. Install it once with
`npx playwright install chromium`. Coverage focuses on critical paths (configuration, validation
orchestration, comparator, aggregation, reports, action policies, CLI exit codes, error handling);
known gaps are tracked in [docs/technical-debt.md](docs/technical-debt.md).

---

## CI/CD

The repository ships a GitHub Actions pipeline ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
that runs on pull requests and pushes to `master`/`main`:

1. Install → 2. Lint → 3. Type check → 4. Format check → 5. Unit tests → 6. Build
   (matrix: Node 18/20/22), then a separate job for **integration + e2e** with a real browser,
   plus an informational **coverage** job. Failed runs upload `artifacts/**` for inspection; no
   secrets are ever uploaded.

---

## Development workflow

```bash
git clone <repository-url>
cd atlas-visual
npm ci
npx playwright install chromium
cp .env.example .env
npm run build
npm test
```

Before opening a PR: `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm test`
must pass. See [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, commit conventions, and the
architectural rules that PRs must respect.

---

## Extending Atlas

Every extension is added behind an existing abstraction — the core never changes.

- **Add a browser** (e.g. Selenium): implement `Browser` + `BrowserFactory` under
  `src/infrastructure/browser/`, register it in `DefaultBrowserFactory`.
- **Add a design source** (e.g. Adobe XD): implement `DesignProvider`/`ReferenceService` under
  `src/infrastructure/design/`, register it in `DefaultReferenceServiceFactory`.
- **Add a comparator** (e.g. SSIM): implement `Comparator` + `ComparatorFactory` under
  `src/infrastructure/comparator/`, register it in `DefaultComparatorFactory`.
- **Add an action** (e.g. Slack, Jira): implement `Action` under `src/actions/`, register it with
  the `ActionRegistry`. Actions run via the event bus and cannot affect the validation flow.

See [docs/architecture.md](docs/architecture.md) and the [ADRs](docs/adr/) for the reasoning.

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation including
Mermaid diagrams, SOLID analysis, Clean Architecture layers, extension exercises, and the
[Architecture Decision Records](docs/adr/).

---

## Roadmap

1. Foundation: CLI and execution architecture.
2. Browser abstraction.
3. Evidence capture.
4. Design reference provider (Figma).
5. Visual comparator (Pixelmatch).
6. Visual validation plugin.
7. Reports and artifacts (HTML + JSON).
8. Event Bus & Action Engine.
9. CLI & Developer Experience — `atlas init`, `atlas doctor`, `atlas providers`, `atlas actions`, YAML configuration, configuration precedence.
10. Production readiness (**v1.0, current**) — test strategy, coverage, CI/CD, linting/formatting, security & dependency review, `atlas clean`, documentation, example project, ADRs, release checklist.

## Roadmap for v1.1+

- Real Qase / Slack / Jira / GitHub Issues integrations
- Additional report formats (JUnit XML, Allure)
- Configuration schema validation with JSON Schema
- Additional browser engines (Firefox, WebKit) behind the existing abstraction
- `atlas validate --interactive` for guided page selection

See [CHANGELOG.md](CHANGELOG.md) for the v1.0 release notes and
[docs/technical-debt.md](docs/technical-debt.md) for known limitations.

- `atlas validate --interactive` for guided page selection
