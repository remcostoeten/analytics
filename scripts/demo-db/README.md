# Demo database

Local Postgres with ~90 days of realistic seeded analytics data, for developing
and demoing the dashboard without touching the production Neon database.

```sh
bun run demo:db              # start containers, apply migrations, seed
bun run demo:db -- --force   # reseed over existing data
bun run demo:db -- --use-demo  # point the dashboard at the demo DB (no prompt)
bun run demo:db -- --restore   # switch the dashboard back to your own DATABASE_URL
```

After setup the script asks whether to point the dashboard at the demo database.
Switching edits `apps/example-dashboard/.env.local` non-destructively: your own
`DATABASE_URL` is kept as a `# demo-db saved:` comment and restored byte-for-byte
on switch-back.

`db.localtest.me` resolves to `127.0.0.1`; the dashboard's `@neondatabase/serverless`
HTTP driver is routed to the bundled [local neon proxy](https://github.com/TimoWilhelm/local-neon-http-proxy)
on port 4444 (see `apps/example-dashboard/src/lib/db.ts`), so production code paths
are exercised unchanged.

Teardown: `docker compose -f scripts/demo-db/docker-compose.yml down` (add `-v` to
drop the data volume for a clean slate).

The seed (`seed.ts`) is deterministic (fixed PRNG seed) and emits plain SQL on
stdout, applied through `psql` inside the container — no database driver
dependencies. It generates weekday/weekend traffic rhythm with mild growth,
NL-heavy geo across real municipalities, returning visitors, sessions with
entry/exit paths, scroll/time-on-page/web-vitals events, UTM campaigns, errors,
and bot traffic.
