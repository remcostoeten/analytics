# 0005 Package name

## Context

SDK 1.x is published as `@remcostoeten/analytics` with ESM and CJS builds. 2.0 has a new API and envelope, and covers more than web analytics: speed insights, error tracking, bot scoring and alerts. The earlier default was to publish 2.0 as `@remcostoeten/analytics@2.0.0` on the same name.

## Decision

Settled on Oct 2, 2026: 2.0 ships under a new brand, Spoar. The SDK is published as `@spoar/sdk`, ESM only. Remco owns the `@spoar` npm scope and published a placeholder `@spoar/sdk@0.0.1`. Every workspace package moves to the scope (`@spoar/contract`, `@spoar/shared`, `@spoar/engine`, `@spoar/api`, `@spoar/docs`, `@spoar/scripts`).

## Status

Settled. Source: row 5 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Existing users switch packages instead of upgrading a major version. 1.x stays on `@remcostoeten/analytics` and gets a deprecation note pointing at `@spoar/sdk` once 2.0 is stable (E5.1).
- The contract package is published as `@spoar/contract` next to the SDK, or bundled into it, because the SDK imports it at runtime.
- Dropping the CJS build halves the package; every current bundler and Node 22+ load ESM.
- Prereleases go out under the `next` tag.
- Storage keys, event names and the `/v2` API paths do not change with the brand.
