# 0015 Roles and SQL access

## Context

One admin allowlist is not enough to let someone else view one project or run SQL, and SQL can reach every visitor-level row.

## Decision

Better Auth organizations with owner, admin and viewer roles. Admins see visitor-level data and run SQL on the projects they list; viewers see aggregates only. SQL is limited to owners, admins and `sql`-scoped tokens, and every run is logged. The analyst role was dropped as unneeded (migration 0033 turns analysts into viewers).

## Status

Settled. Source: row 15 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- A `query_runs` table records who ran what, when and on which projects.
- Each project has an `sqlEnabled` switch.
- The database enforces project scope through row-level policies on the queryable views.
