# ADR-004: Event-driven actions

**Status:** Accepted

## Context

After validation, teams want side effects: create a Qase run, post to Slack, open a Jira issue.
Calling these directly from the validation engine would couple the core to every integration,
make failures in one integration affect validation, and require engine changes per integration.

## Decision

Emit domain events (`validation-started`, `validation-completed`, `validation-failed`) onto an
in-memory `EventBus`. An `ActionEngine` subscribes and runs registered `Action`s according to
`ActionPolicy` (enabled, `onlyOnFailure`, environment scoping). Actions are isolated: one failing
action does not fail validation or other actions.

## Consequences

- The engine, plugin, comparator, and reports have no knowledge of Qase/Slack/Jira.
- Actions are opt-in and disabled by default; Atlas runs with no action credentials.
- Adding an integration means implementing `Action` and registering it — no core changes.
- The indirection of an event bus is justified by the isolation and extensibility it provides.
