# 0016 Elysia on Vercel

## Context

Decision 4 puts the v2 API on Elysia in `apps/api`, but the plan left one open question: does Elysia run well on Vercel? Epic E1.1 is the spike that answers it: runtime, cold start, bundle size, MMDB bundling, streaming, and whether `cf-connecting-ip` arrives.

The spike is `apps/api`:

- `GET /v2/health` returns `{ ok, version, time }` plus the runtime, a cold-start flag and where the City database loaded from.
- `GET /v2/openapi` is served by `@elysiajs/openapi`.
- `POST /v2/events` parses a `text/plain` JSON body, validates it with the contract's `IngestEnvelope`, looks up the caller's IP in GeoLite2 City (`cf-connecting-ip`, then `x-real-ip`, then `x-forwarded-for`) and returns 202 with the lookup.

It deploys through Vercel's Elysia preset with `bunVersion: "1.x"`. The build downloads both MMDB files and `includeFiles` ships them with the function.

## Findings

Measured locally with Bun 1.3.11 and Elysia 1.4.30:

| Question | Answer |
| --- | --- |
| Runtime | Bun, through Vercel's Elysia preset (`bunVersion: "1.x"`). Node was not needed locally |
| Cold start (local, process start to first 200, 5 runs) | 260, 261, 264, 266 and 319 ms, including the City database load |
| MMDB load | 46 ms to read the 65 MB City file into `mmdb-lib` |
| Warm latency (local, 100 `POST /v2/events` with a City lookup) | p50 0.8 ms, p95 1.8 ms |
| Bundle | 10 KB of app code with dependencies external; 158 KB minified with contract and TypeBox bundled in. The MMDB files add 77 MB (City 65 MB, ASN 12 MB), under Vercel's 250 MB function limit |
| MMDB bundling | A build step downloads both files into `apps/api/data`, and `functions["src/index.ts"].includeFiles` ships them. The loader tries an explicit path, then paths relative to the source and the working directory, and `/v2/health` reports which one it used |
| Contract schemas in Elysia | **Blocker.** Elysia 1.4 and `@elysiajs/openapi` require `@sinclair/typebox` below 1.0. The contract uses `typebox` 1.x, whose schemas make Elysia return 500 on every request when used as a route `body`. Elysia's own `t` schemas return 200 and 422 as expected |

Not measured, because the Vercel connector in the agent session has no permission to create a project (403 on both project creation and a file deployment):

- Cold start on Vercel (5 cold hits) and warm p95 on Vercel (100 hits).
- Whether `cf-connecting-ip` arrives behind Cloudflare. `/v2/events` returns `ipHeader`, so one request through the proxied domain answers it.
- Streaming (SSE) on the Bun runtime.

## Decision

Go with Elysia on Vercel, on the Bun runtime, once the Vercel numbers are in. Nothing measured so far points to the Hono plus oRPC fallback.

Fix the contract blocker before phase 2 builds routes on it. Of these three options, the first is recommended:

1. Move `packages/contract` from `typebox` 1.x to `@sinclair/typebox` 0.34, the version Elysia supports. The builder API is almost the same. `Type.Enum` over string arrays becomes a union of literals, and the fixtures and tests stay. Decision 10 (TypeBox) holds; only the major version changes. When Elysia supports TypeBox 1.x, the contract moves back.
2. Keep TypeBox 1.x in the contract and validate by hand in each handler, as the spike's `/v2/events` does. This loses Elysia's typed handlers and makes the OpenAPI document hand-maintained, which breaks "generated from the same schemas".
3. Wait for an Elysia release built on TypeBox 1.x.

## Status

Open. The local spike is done and Elysia is recommended. The Vercel measurements and the contract fix are pending.

## Steps to finish the measurements

1. In the Vercel team `remcostoetens-projects`, create a project `analytics-api` linked to `remcostoeten/analytics`, with root directory `apps/api`, the Elysia framework preset and Vercel Authentication off for previews.
2. Push the E1.1 branch. Vercel reads `apps/api/vercel.json` (`bunVersion`, the build command and `includeFiles`).
3. Hit `/v2/health` five times with at least ten minutes between hits, and record `coldStart` and the response time of each.
4. Send 100 `POST /v2/events` requests with `packages/contract/fixtures/IngestEnvelope/valid/browser-batch.json` and record the p95.
5. Send one request through the Cloudflare-proxied domain and read `ipHeader`.

## Consequences

- `apps/api` stays as the base for E2.4 instead of being thrown away. The health, OpenAPI and IP helpers carry over.
- If option 1 is chosen, it is a small follow-up to E0.3 before E2.1.
