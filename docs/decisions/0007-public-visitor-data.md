# 0007 Visitor-level data on public projects

## Context

Public projects expose aggregates to anyone. Raw events, visitor lists and sessions are more sensitive than totals.

## Decision

Recommended default: visitor-level reads are admin-only unless a project turns on `publicVisitorData`, which is off by default.

## Status

Open, default. Source: row 7 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- The `detail` access level covers events, visitors and sessions routes.
- Turning the flag on is an explicit per-project choice.
- SQL access never follows this flag; anonymous callers cannot run SQL on any project.
