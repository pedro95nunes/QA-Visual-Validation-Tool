# Basic example — Atlas Visual

A minimal, runnable configuration that validates a single page against a Figma
reference and produces HTML + JSON reports.

## What this demonstrates

- Page configuration (`visual.pages`)
- A Figma design reference (via environment variables — no secrets in the file)
- Comparison thresholds (`pixelThreshold`, `allowedDifferencePercentage`)
- HTML and JSON reports
- An optional, disabled-by-default Qase action

## Files

- [`atlas.config.yaml`](atlas.config.yaml) — the configuration for this example.

## Run it

From this directory (or copy `atlas.config.yaml` to your project root):

```bash
# 1. Provide Figma credentials (never commit these)
export FIGMA_TOKEN=your-figma-personal-access-token
export FIGMA_FILE_KEY=your-figma-file-key
export FIGMA_NODE_ID=your-figma-node-id

# 2. Check the environment and configuration
atlas doctor --config ./atlas.config.yaml

# 3. Run validation
atlas validate --config ./atlas.config.yaml
```

> The token is read from the environment. `atlas.config.yaml` only references
> `${FIGMA_FILE_KEY}` / `${FIGMA_NODE_ID}` — it contains no secrets and is safe to commit.

## Where the results go

After `atlas validate`, look under `artifacts/`:

```
artifacts/
  runs/
    <execution-id>/
      report/        index.html + report.json
      evidence/      the captured screenshot(s)
      references/    the Figma reference image(s)
      diffs/         pixel-diff image(s) for failed pages
```

Open `artifacts/runs/<execution-id>/report/index.html` in a browser to review results.
Paths inside the reports are relative, so the whole run folder is portable.

## Exit codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| `0`  | All pages passed                       |
| `1`  | At least one visual difference         |
| `2`  | Configuration error                    |
| `3`  | Execution error (e.g. browser/network) |

## Enabling the Qase action (optional)

Qase is off by default and requires no credentials to run Atlas. To try the wiring,
set `actions.qase.enabled: true` in the config (the bundled implementation is a mock
that logs instead of calling the real API). See the root README and
[ADR-004](../../docs/adr/004-event-driven-actions.md).
