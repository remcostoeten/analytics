# 0002 Project visibility

## Context

The v1 dashboard shows every project to anyone. Some projects, such as client sites, should not be visible without signing in.

## Decision

Projects are `public` by default, as the dashboard is today, and can be switched to `private`.

## Status

Settled. Source: row 2 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Aggregate reads of a public project need no credentials.
- A private project answers 404, not 403, to callers without access, so its name does not leak.
- `GET /v2/projects` lists public projects for anyone and every project for admins.
