# apps/dashboard

The v2 dashboard on Next. Today it holds the admin module only: sign in through the API, list projects, create one, change its settings and rotate its keys, and create and revoke API tokens. The analytics views follow once the design is in.

| Command | Does |
| --- | --- |
| `bun run dev` | Serves on port 3300 |
| `bun run build` | `next build` |
| `bun run test` | Tests for the form helpers and the cookie forwarding |

| Variable | Default | Does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.analytics.remcostoeten.nl` | The API it reads from and signs in through |

The API must list this app's origin as `DASHBOARD_ORIGIN`, or sign-in and the session cookie are refused. Locally that means `DASHBOARD_ORIGIN=http://localhost:3300` in `apps/api/.env.playground`, next to the GitHub client id and secret.

Server components forward the browser's session cookie to the API through `@spoar/client`; the browser itself only calls the sign-in and sign-out routes. Every change goes through a server action in `src/modules/admin/actions.ts`.
