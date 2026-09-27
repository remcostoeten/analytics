# 0006 What a project is

## Context

In v1 a project id is a free string that defaults to the hostname, and the origin allowlist is one environment variable for all projects.

## Decision

Recommended default: a project is a config row owned by you, with visibility, allowed origins, keys and retention. It is not a tenant.

## Status

Open, default. Source: row 6 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Migration 0009 adds the `projects` table with public and hashed secret keys per project.
- Allowed origins and retention move from environment variables to the row.
- Multi-tenant isolation is not built now; organizations and an `org_id` keep that path open.
