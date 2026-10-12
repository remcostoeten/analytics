# @spoar/debugtools

A SQL console for admins on their own site, docked to the bottom of the page: a toolbar with a time range, a SQL editor, the result rows, a dataset library with field search and the recent queries. It runs SQL against the project through `@spoar/client`.

It is a separate package from `@spoar/sdk` and replaces `@spoar/devtools` (decisions 30 to 33 in `docs/v2/plan.md`), so the SDK's size budgets do not change.

- **Visitors never download it.** Each entry renders a loader under 1 KB gzip that calls `GET /v2/widget/session` and imports the console only on a 200.
- The widget renders in a Shadow DOM root, so host CSS and console CSS never meet.
- Dark, light and system themes.
- On a customer site it sends the `wt_` widget token from that call and fetches a new one before it expires. With `auth: "session"` it skips the call and sends the session cookie, as the dashboard does.
- The panel resizes from its top edge, maximises, pops out as a floating window and docks back, and remembers its layout per browser.
- A launcher pill sits at the bottom left or right; Ctrl+Shift+K (or Cmd+Shift+K) toggles the console and Escape closes it.

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
| `@spoar/debugtools/console` | `<Console />`, `<LiveConsole />`, `clientSource` | The fixture console, or the live console over a source, without the loader or the admin check |
| `@spoar/debugtools/fixtures` | `consoleFixture` | Sample data for `<Console />` and the `data` option |

`options` takes `endpoint`, `project`, an optional `auth` (`"widget"` or `"session"`, default `"widget"`), an optional `launcher` (`"left"` or `"right"`), an optional `fetch`, an optional `data` to show fixture data instead of the project's, an optional `sections` to turn parts of the console on or off and an optional `theme` (`"dark"`, `"light"` or `"system"`, default `"dark"`).

## The Console component

```tsx
import { Console } from "@spoar/debugtools/console";
import "@spoar/debugtools/styles.css";

<Console theme="light" />;
```

| Prop | Default | Does |
| --- | --- | --- |
| `data` | `consoleFixture` | Tabs, query lines, keywords, datasets, recent queries and the agent script |
| `sections` | everything but `agent` | Turns sections on or off: `nav`, `toolbar`, `editor`, `results`, `library`, `recent` and `agent` |
| `autoplay` | `true` | Plays the typing sequence; `false` renders the finished frame |
| `loop` | `true` | Restarts the sequence after the hold |
| `pace` | `defaultPace` | Overrides any timing, in milliseconds |
| `theme` | `"dark"` | `"dark"`, `"light"`, or `"system"` to follow `prefers-color-scheme` |
| `logo` | a drop mark | Node shown at the left of the tab bar |
| `className`, `style` |  | Applied to the root |

The agent pane is off until `sections` turns it on. With the dataset library or the recent queries off, the remaining pane takes the full width; with both off, the editor fills the console.

Agent text marks highlighted values with `**double asterisks**`. Reduced motion shows the finished frame.

## Styles

The components use plain Tailwind v4 utilities. Colours, fonts and animations come from `console-*` theme tokens (`bg-console-bg`, `text-console-muted`, `font-console-mono`), which read `--spc-*` variables on `.spc-console`. The light palette applies on `data-theme="light"`, and on `data-theme="system"` when the system prefers light. Override any variable (`--spc-bg`, `--spc-accent` and the rest in `src/styles/theme.css`) on `.spc-console`; `--spc-height` sets the height.

The `<Console />` component injects no CSS. Pick one:

- **Your app runs Tailwind v4:** add `@import "@spoar/debugtools/tailwind.css";` to your stylesheet. It registers the tokens and the base styles and points `@source` at the package, so your build generates the utilities.
- **It does not:** import `@spoar/debugtools/styles.css`, the compiled stylesheet. Its theme variables are scoped to the console, so it leaves your page's `--spacing` and radii alone.

The widget entries need neither: they adopt the compiled stylesheet into their Shadow DOM root.

## Development

| Command | Does |
| --- | --- |
| `bun run build` | tsdown into `dist/`: the loaders, the lazy console chunk (with React bundled for `mount`), the console entry and the fixtures, then `styles.css` and `tailwind.css` |
| `bun run styles` | Recompiles `src/styles/console.css` into `src/styles/compiled.ts`, which the widget adopts; a test fails while it is stale |
| `bun test` | Highlighting, the playback timeline, the sections, the compiled styles and the console render |
| `bun run size` (repo root) | Fails when a loader is over 1 KB gzip |
