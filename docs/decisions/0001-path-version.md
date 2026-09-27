# 0001 Path version

## Context

v1 clients post to the unversioned `/e` and `/e/batch` routes. v2 changes the envelope, the event naming and the auth model, so both shapes have to be served side by side until 1.x traffic is gone.

## Decision

Every v2 route lives under `/v2`. The unversioned `/e` counts as v1. After 2.0, the path version and the npm package version move independently.

## Status

Settled. Source: row 1 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- The Hono ingestion keeps serving `/e` for 1.x clients until phase 5 retires it.
- A later breaking API change means `/v3`, not a new major of the SDK, and the other way around.
- The OpenAPI document, the dashboard client and the SDK all target `/v2`.
