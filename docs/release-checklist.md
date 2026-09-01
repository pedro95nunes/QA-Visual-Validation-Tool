# Release checklist

Run through this list before tagging a new version. All commands are the project's
actual npm scripts. Do not publish anything externally without an explicit decision.

## 1. Quality gates

- [ ] `npm ci` completes cleanly
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes (unit + integration; e2e skipped without the env flag)
- [ ] `npm run build` succeeds
- [ ] `npm run test:integration` passes (real Playwright)
- [ ] `npm run test:e2e` passes (full pipeline)
- [ ] `npm run test:coverage` reviewed; critical paths adequately covered

## 2. Security review

- [ ] No tokens, passwords, or `.env` files committed (`git ls-files | grep -iE '\.env|token|secret'` returns nothing sensitive)
- [ ] Figma / Qase tokens are read from environment variables only
- [ ] Example configs contain placeholders only
- [ ] Reports and logs do not contain secrets (redaction verified)
- [ ] `.gitignore` covers `node_modules/`, `dist/`, `coverage/`, `artifacts/`, `.env*`, logs

## 3. Dependency review

- [ ] `npm audit` reviewed; unresolved advisories recorded in [technical-debt.md](technical-debt.md)
- [ ] No unnecessary or unsafe dependency upgrades in this release

## 4. Documentation review

- [ ] README quick start works end to end
- [ ] `docs/architecture.md` reflects the current design
- [ ] ADRs added for any new architectural decisions
- [ ] `CHANGELOG.md` updated and the release entry dated
- [ ] `docs/technical-debt.md` updated

## 5. CLI verification

- [ ] `atlas --help` and every subcommand `--help` render correctly
- [ ] `atlas version` prints the expected version
- [ ] `atlas doctor` reports environment/config status
- [ ] `atlas providers` / `atlas actions` list registered extensions
- [ ] Exit codes correct: `0` pass, `1` visual failure, `2` configuration error, `3` execution error

## 6. Artifact verification

- [ ] A validation run produces `artifacts/runs/<execution-id>/` with report, evidence, references, diffs
- [ ] Report paths are relative (artifacts are portable)
- [ ] `atlas clean` safely removes the artifacts directory

## 7. CI verification

- [ ] CI is green on the release commit
- [ ] Failure-artifact upload works (verified at least once)

## 8. Versioning

- [ ] `package.json` version bumped following SemVer
- [ ] Git tag created (`vX.Y.Z`)
