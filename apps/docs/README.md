# apps/docs

The docs site on Fumadocs and Next: the SDK, the API guides, the API reference generated from `apps/api/openapi.json`, and a query page that runs read-only SQL with an API token.

| Command | Does |
| --- | --- |
| `bun run dev` | Generates the reference and serves on port 3200 |
| `bun run build` | Generates the reference, then `next build` |
| `bun run generate` | `scripts/generate-reference.ts` writes `content/docs/reference/**` from the OpenAPI document, then `fumadocs-mdx` writes `.source/` |

Hand-written pages live in `content/docs` (`index.mdx`, `sdk/`, `api/`). `content/docs/reference/` is generated and ignored by git; change a route in `apps/api`, run `bun run --cwd apps/api openapi`, and the next build picks it up.

The site tracks itself through `@spoar/sdk`: `lib/analytics.ts` creates the client, `app/providers.tsx` mounts the Next adapter, and `app/%5Fra/route.ts` serves the `/_ra` proxy. The landing page reads that project's last 30 days and the public project list from the API through `@spoar/client` (`lib/showcase.ts`), cached for a minute, and polls the realtime routes from the browser.

| Variable | Default | Does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.analytics.remcostoeten.nl` | The API the landing page reads from and the query page starts with |
| `NEXT_PUBLIC_RA_CONFIG` | unset | The browser SDK options as JSON: `project`, `key` (`pk_`) and `endpoint` (`/_ra`). Unset, the site sends nothing and the landing page shows `docs.analytics.remcostoeten.nl` |
| `RA_SECRET` | unset | The project's `sk_` key, which the `/_ra` proxy adds before forwarding to the API |
