# 0014 Who runs this

## Context

The plan could serve only Remco, others running their own copy, or others using a hosted service. These differ a lot in work.

## Decision

Models 1 and 2: Remco self-hosts, and others can self-host their own copy. A hosted service stays a note for later.

## Status

Settled. Source: row 14 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Epic E5.1 adds a setup guide, `.env.example`, a `bun run setup` command and a deploy button.
- Organizations, roles and row-level security are built anyway, which keeps a hosted service possible later.
- Sign-up, quotas and billing are out of scope.
