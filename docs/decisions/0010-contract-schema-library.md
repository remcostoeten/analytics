# 0010 Contract schema library

## Context

The API validates requests, the SDK needs the same types, and the OpenAPI document should come from the same source.

## Decision

Recommended default: TypeBox. The SDK imports only its types, so no validator ships in the browser bundle.

## Status

Open, default. Source: row 10 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- `packages/contract` defines TypeBox schemas and exports each schema with its static type.
- Elysia's OpenAPI plugin reads the same schemas, so the document cannot drift.
- Shared fixtures validate against the schemas in both SDK and API tests.
