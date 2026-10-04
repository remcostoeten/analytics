# @spoar/devtools

An overlay panel for admins on their own site, showing what Spoar analytics sees right now: online visitors, sessions, a log stream with JSON detail, speed per route, error groups and an overview.

<p align="center">
  <img src="https://raw.githubusercontent.com/remcostoeten/analytics/master/apps/docs/public/images/dev-widget.png" width="100%" alt="The panel docked to the bottom of a page, logs buffer open, one rejected event expanded as JSON" />
</p>

It is a separate package from `@spoar/sdk`, so the SDK keeps its size budgets and the widget releases on its own.

- **Visitors never download it.** Each entry renders a loader under 1 KB gzip that calls `GET /v2/widget/session` and imports the panel only on a 200.
- Renders in a Shadow DOM root with Tailwind compiled at build time, so host CSS and widget CSS never meet.
- Six buffers on keys 1 to 6, a `key:value` filter prompt per buffer, j and k to move, Enter to expand.
- Docks to the bottom or floats, resizes, and remembers its layout per origin.
- Shows the SDK's dropped events and errors as they happen when you pass your SDK client.

The [dev widget page](https://docs.analytics.remcostoeten.nl/docs/sdk/devtools) covers the entries, options, `widgetReports` and the keyboard map.

## Install

```bash
npm install @spoar/devtools
```

```tsx
import { Devtools } from "@spoar/devtools/next";

<Devtools endpoint="https://api.analytics.remcostoeten.nl" project="remcostoeten.nl" />;
```

Prereleases publish under the `next` tag. For work without an API, `@spoar/devtools/fixtures` serves sample data for every route: pass `fetch: fixtureFetch()`.

## Development

| Command | Does |
| --- | --- |
| `bun run build` | tsdown into `dist/`: the loaders, the lazy panel chunk (with React bundled for `mount`), and the fixtures |
| `bun run styles` | Recompiles `src/styles/panel.css` with Tailwind into `src/styles/compiled.ts`; a test fails while it is stale |
| `bun test` | Filter parser, JSON tree, stores, client token refresh, streams and runtime against memory transports |
| `bun run size` (repo root) | Fails when a loader is over 1 KB gzip and reports the panel chunk |
| `bun run test:e2e` (repo root) | Opens the panel as an admin and checks a signed-out page loads nothing past the loader |
