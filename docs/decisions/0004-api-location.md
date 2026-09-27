# 0004 Where the new API lives

## Context

v1 splits ingest (Hono) and reads (the Next dashboard querying Postgres directly). v2 needs one place for ingest, reads, sign-in and OpenAPI, built on a reusable engine.

## Decision

Recommended default: an Elysia service in `apps/api` for ingest, reads and sign-in, on the shared engine. Fallback if the Vercel spike in phase 1 fails: `/v2` routes on Hono with oRPC.

## Status

Open, default. Source: row 4 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Epic E1.1 has to prove Elysia on Vercel: runtime, cold start and bundling the MMDB files.
- The dashboard gets typed calls through Eden Treaty; with the fallback it would use oRPC's client instead.
- The engine stays framework-free either way, so the choice only affects the host.
