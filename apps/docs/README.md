# apps/docs

The docs site on Fumadocs and Next: the SDK, the API guides, the API reference generated from `apps/api/openapi.json`, and a query page that runs read-only SQL with an API token.

| Command | Does |
| --- | --- |
| `bun run dev` | Generates the reference and serves on port 3200 |
| `bun run build` | Generates the reference, then `next build` |
| `bun run generate` | `scripts/generate-reference.ts` writes `content/docs/reference/**` from the OpenAPI document, then `fumadocs-mdx` writes `.source/` |

Hand-written pages live in `content/docs` (`index.mdx`, `sdk/`, `api/`). `content/docs/reference/` is generated and ignored by git; change a route in `apps/api`, run `bun run --cwd apps/api openapi`, and the next build picks it up.

| Variable | Default | Does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.analytics.remcostoeten.nl` | The API URL the query page starts with |
