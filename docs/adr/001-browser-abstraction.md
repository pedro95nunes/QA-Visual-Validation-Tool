# ADR-001: Browser abstraction

**Status:** Accepted

## Context

Visual validation needs to open pages and capture screenshots. Playwright is the chosen
implementation, but binding the engine directly to Playwright would make the tool impossible
to retarget (e.g. to Selenium) and hard to unit-test without launching a real browser.

## Decision

Define a `Browser` interface (plus `BrowserFactory`) in `core`. Infrastructure provides
`PlaywrightBrowser` / `DefaultBrowserFactory`. `VisualValidationPlugin` depends only on the
interface. The browser lifecycle is owned by the plugin and protected with `try/finally` so the
browser always closes, including on error.

## Consequences

- The engine and plugin never import Playwright; `core` stays technology-independent.
- Tests substitute a fake `Browser` and run without a real browser.
- Adding another engine (Selenium, a different Playwright engine) is an infrastructure-only change.
- The factory indirection is a small amount of extra wiring, accepted for the isolation it buys.
