# 0005 Package name

## Context

SDK 1.x is published as `@remcostoeten/analytics` with ESM and CJS builds. 2.0 has a new API and envelope.

## Decision

Recommended default: publish 2.0 as `@remcostoeten/analytics@2.0.0` on the same name, ESM only.

## Status

Open, default. Source: row 5 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Existing users upgrade by a major version instead of switching packages.
- Dropping the CJS build halves the package; every current bundler and Node 22+ load ESM.
- Prereleases go out under the `next` tag so a plain install keeps giving 1.x until 2.0 ships.
