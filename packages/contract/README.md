# @remcostoeten/analytics-contract

TypeBox (`@sinclair/typebox` 0.34, the version Elysia supports) schemas and static types for every request and response of the v2 API, plus the error catalog. The API validates with the schemas; the SDK imports only the types, so no validator ships in the browser bundle.

| File | Covers |
| --- | --- |
| `events.ts` | The ingest envelope, wire events and the ingest result |
| `errors.ts` | The error catalog: status, retryable, log level and docs line per code, and the `ApiError` body |
| `projects.ts` | Projects, creation, updates and key rotation |
| `stats.ts` | Stats, timeseries, breakdowns and realtime |
| `visitors.ts` | Events, visitors, sessions, visits and people |
| `issues.ts` | Issues, issue events and status changes |
| `speed.ts` | Speed insights |
| `tokens.ts` | API tokens |
| `system.ts` | Health, the auth session, admin metrics and jobs |
| `query.ts` | The SQL console |

Finite sets are built with `oneOf([...])`, a union of literals. The package registers the `date-time`, `date`, `uuid` and `uri` formats on import, because TypeBox 0.34 checks no formats by default.

Each schema and its type share a name: `IngestEnvelope` is the schema and `Static<typeof IngestEnvelope>` is exported as the type `IngestEnvelope`.

`fixtures/<Schema>/valid` holds payloads the schema accepts, taken from the API reference; `fixtures/<Schema>/invalid` holds `{ expectedPath, value }` pairs it rejects at that path. The API and SDK tests use the same files.

`bun run build` writes ESM and declarations to `dist/` with tsdown. Inside the repo, `exports` point at `src/`.
