# 0003 Lint baseline

## Context

Oxlint was pinned at 0.10.0 with no config, so only default correctness rules ran and none of the house rules were enforced.

## Decision

Adopt the Skriuw lint rulebook with Oxlint 1.85.0 and oxfmt 0.70.0, so both repos lint the same way.

## Status

Settled. Source: row 3 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- `.oxlintrc.json` carries the anti-slop rules and the `house` plugin (`no-silent-catch`, `local-type-name`).
- `no-floating-promises` runs in type-aware mode, which needs explicit folder roots in the lint script.
- Frozen v1 code keeps a correctness-only config and is not held to the new rules.
