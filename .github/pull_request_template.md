## Summary

<!-- What does this PR change and why? -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor / tech debt
- [ ] CI / tooling

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes
- [ ] `npm run test:integration` passes (if behavior changed)
- [ ] Docs updated (README / architecture / ADR) where relevant
- [ ] No secrets, personal paths, or private URLs added

## Architecture

- [ ] Core remains free of infrastructure imports (no Playwright / Figma / Pixelmatch in `core/` or `engine/`)
- [ ] New providers/actions/comparators are wired through their abstractions only

## Notes

<!-- Anything reviewers should pay special attention to. -->
