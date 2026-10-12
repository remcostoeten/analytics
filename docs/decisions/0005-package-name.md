# 0005 Package name

## Context

SDK 1.x is published as `@remcostoeten/analytics` with ESM and CJS builds. 2.0 has a new API and envelope.

## Decision

Publish 2.0 as `@spoar/sdk@2.0.0`, a new package under the Spoar scope, ESM only. 1.x stays on `@remcostoeten/analytics`.

## Status

Decided. Source: row 5 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Existing users switch packages; the migrating page in the docs maps every 1.x entry to its 2.0 location.
- Dropping the CJS build halves the package; every current bundler and Node 22+ load ESM.
- The 2.0 prereleases went out under the `next` tag until October 2026; since 2.0.0 every release publishes to `latest` and the `next` tag is retired.
