# Contributing to Atlas Visual

Thanks for your interest in improving Atlas Visual! This document describes how to
set up your environment and the expectations for contributions.

## Development setup

**Requirements**

- Node.js `>=18` (the repository pins a version in [`.nvmrc`](.nvmrc); run `nvm use`)
- npm (the repository commits `package-lock.json`; use `npm ci` for reproducible installs)

```bash
git clone <repository-url>
cd atlas-visual
npm ci
npx playwright install chromium   # only needed for integration / e2e tests
cp .env.example .env               # fill in Figma values if you run real validations
npm run build
```

## Everyday commands

| Command                    | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `npm run build`            | Compile TypeScript to `dist/`                               |
| `npm test`                 | Build + run the full test suite                             |
| `npm run test:unit`        | Fast unit tests only (no browser)                           |
| `npm run test:integration` | Integration tests, including real Playwright                |
| `npm run test:e2e`         | The end-to-end pipeline test (real Playwright + Pixelmatch) |
| `npm run test:coverage`    | Full suite under `c8` coverage                              |
| `npm run typecheck`        | `tsc --noEmit`                                              |
| `npm run lint`             | ESLint over `src/` and `tests/`                             |
| `npm run format`           | Rewrite files with Prettier                                 |
| `npm run format:check`     | Verify formatting (used in CI)                              |

## Branch & PR strategy

- Branch off `master` using a short, descriptive name (`fix/…`, `feat/…`, `docs/…`).
- Keep pull requests focused; unrelated formatting churn makes review harder.
- Fill in the pull request template checklist.
- CI must be green: lint, typecheck, format check, unit, integration, and e2e.

## Commit expectations

- Use clear, imperative commit subjects (e.g. `feat: add clean command`).
- Conventional-commit prefixes (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`)
  are encouraged and keep the [CHANGELOG](CHANGELOG.md) easy to maintain.
- Do not commit secrets, `.env` files, `dist/`, `artifacts/`, or `coverage/`.

## Architecture rules (must hold)

Atlas Visual follows Clean Architecture. Dependencies point **inward**. When contributing:

- `core/` (domain models, interfaces, exceptions) must not import infrastructure.
- `ValidationEngine` / `VisualValidationPlugin` must **not** import Playwright, Figma, or Pixelmatch.
- The report layer must not depend on Playwright, Figma, or Pixelmatch.
- Actions must not depend on HTML parsing or browser internals.
- New external providers must implement an existing abstraction
  (`Browser`, `DesignProvider`/`ReferenceService`, `Comparator`, `Action`, `Report`).
- Secrets must never be part of domain models or written to reports/logs.

See [`docs/architecture.md`](docs/architecture.md) and the ADRs in [`docs/adr/`](docs/adr/)
for the reasoning behind these rules.

## Adding an extension

- **A new browser** (e.g. Selenium): implement `Browser` + `BrowserFactory`; register it. No core changes.
- **A new design source** (e.g. Adobe XD): implement `DesignProvider`/`ReferenceService`. No core changes.
- **A new comparator** (e.g. Percy/SSIM): implement `Comparator` + `ComparatorFactory`. No core changes.
- **A new action** (e.g. Slack, Jira): implement `Action`; register it with the `ActionRegistry`.

Each extension ships with unit tests and, where it touches I/O, an integration test that
uses local fixtures rather than live network calls or credentials.

## Reporting bugs / requesting features

Use the issue templates under [`.github/ISSUE_TEMPLATE`](.github/ISSUE_TEMPLATE). Never paste
tokens or credentials into an issue.
