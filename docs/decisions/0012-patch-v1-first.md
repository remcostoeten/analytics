# 0012 Patch 1.x first

## Context

SDK 1.x has known web vitals and own-traffic bugs, and v2 replaces it.

## Decision

No. 1.x is frozen and gets no more releases. The web vitals and own-traffic fixes ship with 2.0.

## Status

Settled. Source: row 12 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Epic E0.2 was dropped.
- v1 receives fixes only when Remco asks.
- 1.x users get the fixes by upgrading to 2.0.
