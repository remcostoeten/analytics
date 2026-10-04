<h1 align="center">Analytics</h1>

Self-hosted, privacy-first web analytics: a browser and server SDK, an API for ingest and reads, and a dashboard, on your own Postgres.

Version 2 is in prerelease. The API runs on [api.analytics.remcostoeten.nl](https://api.analytics.remcostoeten.nl) and its docs on [docs.analytics.remcostoeten.nl](https://docs.analytics.remcostoeten.nl). The v2 dashboard is not built yet; v1, which still serves production, lives in [`v1/`](v1/README.md).

- [`@spoar/sdk`](https://www.npmjs.com/package/@spoar/sdk) tracks pageviews, events, errors and speed from the browser and the server, with React and Next entries and a first-party proxy.
- [`@spoar/devtools`](https://www.npmjs.com/package/@spoar/devtools) is an overlay panel for admins that shows live visitors, sessions and the event log on their own site.

## Install

```bash
npm install @spoar/sdk@next
npm install @spoar/devtools@next
```

## Development

Requires Bun 1.3.

```bash
bun install          # install every workspace
bun run test         # run all tests
bun run typecheck    # typecheck every workspace
bun run dev          # start the v1 dashboard
```

How the repo is organised and how work is done is in [AGENTS.md](AGENTS.md).

<br/>

xxx,<br/>
[Remco Stoeten](https://remcostoeten.com)<br/>
<small>MIT</small>
