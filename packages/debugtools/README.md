# @spoar/debugtools

A debug console for admins on their own site, in the layout of a query console: a tabbed header, a toolbar, a syntax-highlighted query editor, a dataset library with field search, and an agent pane that types and reveals itself from data. It runs on fixture data until real data is wired in.

It is a separate package from `@spoar/sdk` and `@spoar/devtools` (decision 28 in `docs/v2/plan.md`), so neither of their size budgets changes.

- **Visitors never download it.** Each entry renders a loader under 1 KB gzip that calls `GET /v2/widget/session` and imports the console only on a 200.
- Renders in a Shadow DOM root, so host CSS and console CSS never meet.
- A launcher pill sits at the bottom left; Ctrl+Shift+K (or Cmd+Shift+K) toggles the console and Escape closes it.

## Install

```bash
npm install @spoar/debugtools
```

```tsx
import { Debugtools } from "@spoar/debugtools/next";

<Debugtools endpoint="https://api.analytics.remcostoeten.nl" project="remcostoeten.nl" />;
```

| Entry | Exports | For |
| --- | --- | --- |
| `@spoar/debugtools` | `mount(options)` | Any page; the console brings its own React |
| `@spoar/debugtools/react` | `<Debugtools />` | React hosts |
| `@spoar/debugtools/next` | `<Debugtools />` | The Next.js App Router, loaded with `ssr: false` |
| `@spoar/debugtools/console` | `<Console />` | The console component alone, without the loader or the admin check |
| `@spoar/debugtools/fixtures` | `consoleFixture` | The sample data the console renders by default |

`options` takes `endpoint`, `project`, an optional `fetch` and an optional `data` to replace the fixture.

## The Console component

```tsx
import { Console } from "@spoar/debugtools/console";

<Console />;
```

| Prop | Default | Does |
| --- | --- | --- |
| `data` | `consoleFixture` | Tabs, query lines, keywords, datasets, recent queries and the agent script |
| `autoplay` | `true` | Plays the typing sequence; `false` renders the finished frame |
| `loop` | `true` | Restarts the sequence after the hold |
| `pace` | `defaultPace` | Overrides any timing, in milliseconds |
| `logo` | a drop mark | Node shown at the left of the tab bar |
| `className`, `style` |  | Applied to the root |

Agent text marks highlighted values with `**double asterisks**`. Colours, fonts, radius and height are CSS custom properties on `.spc-console` (`--spc-bg`, `--spc-accent`, `--spc-mono`, `--spc-height` and the rest in `src/styles.ts`). The stylesheet is injected through React 19 style hoisting, into the document or the Shadow DOM root it renders in, so there is nothing to import. Reduced motion shows the finished frame.

## Development

| Command | Does |
| --- | --- |
| `bun run build` | tsdown into `dist/`: the loaders, the lazy console chunk (with React bundled for `mount`), the console entry and the fixtures |
| `bun test` | Highlighting, the playback timeline and the console render |
| `bun run size` (repo root) | Fails when a loader is over 1 KB gzip |
