# apps/api

The v2 API on Elysia, deployed to Vercel with the Bun runtime. See `docs/v2/api-reference.md` for the routes and `docs/decisions/0016-elysia-on-vercel.md` for why Elysia.

## Routes so far

| Route | Does |
| --- | --- |
| `GET /v2/health` | `{ ok, version, time }` plus the runtime, a cold-start flag, the header the caller's IP came from, and which MaxMind files loaded |
| `POST /v2/events` | Ingest through the engine: `text/plain` or `application/json`, at most 60 KB and 50 events, `X-Project-Key` from an allowed origin or `Authorization: Bearer sk_...` |
| `GET /v2/openapi`, `/v2/openapi/json` | Interactive docs and the OpenAPI 3 document |

Every response carries `x-request-id`, and every error uses the envelope `{ error: { code, message, details?, requestId, docs } }` with the status from the contract's error catalog.

## Environment

| Variable | Needed | Does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres, migrated with `bun run migrate` |
| `IP_HASH_SECRET` | Yes in production | At least 32 characters; production refuses to start without it (`openssl rand -hex 32`) |
| `DASHBOARD_ORIGIN` | No | The one origin that gets CORS with credentials |
| `DOCS_BASE` | No | Base of the `docs` link in errors; defaults to `https://api.remcostoeten.nl/v2/openapi` |
| `INGEST_RATE_LIMIT` | No | Browser requests per minute per project and IP hash; defaults to 100 |
| `GEOIP_CITY_PATH`, `GEOIP_ASN_PATH` | No | Explicit MaxMind paths; otherwise `data/` from the build |

## Commands

- `bun run dev` serves on port 3100.
- `bun run build` downloads the GeoLite2 City and ASN files into `data/`.
- `bun test` runs the integration tests through `app.handle` on PGlite.
