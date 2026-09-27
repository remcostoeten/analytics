# 0013 Branching

## Context

v2 first had its own integration branch, which would have to be merged back as one large change.

## Decision

Trunk on `master`: v1 lives in `v1/`, v2 at the repo root, and epics squash-merge into `master`.

## Status

Settled. Source: row 13 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- There is no `v2` branch; every epic branches from `master`.
- v2 code never imports from `v1/`, so v2 epics cannot break production.
- v1's Vercel projects should skip builds when nothing under `v1/` changed.
