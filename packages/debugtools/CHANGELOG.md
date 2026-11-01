# @spoar/debugtools

## 0.3.0

### Minor Changes

- 0493f47: The debug console opens on the page you are looking at. **This page** shows the current path's visitors, pageviews, bounce rate, referrers, Web Vitals and issues, and can pin click counts on elements marked with `data-spoar-click`. **My events** lists every event this tab sent, with whether the API accepted it, rejected it or the SDK dropped it. **Count my visits** opts this browser out of tracking, and **Annotate** adds a chart annotation for a release or a post. SQL moves behind the new `tabs` option. `<Analytics debugConsole />` hands its client to the console, and `error` listeners receive the rejected event as a third argument.

## 0.2.0

### Minor Changes

- c8d6421: Add the `demo` option, which shows the console on fixture data when the admin check fails, and the `open` option, which opens the console as soon as it mounts.
- a53103b: Add the `@spoar/debugtools/gate` entry with `startConsole`, which `@spoar/sdk` uses to open the console from the grant a `GET /v2/widget/connect` popup posts back, or from the grant the tab already holds. The console now picks up a newer grant from the tab before it asks for one, and `requestGrant` returns the grant's project. The API refuses the console with `403 FORBIDDEN` until the project's `debugConsole` switch is on.
- 3b7eddf: First release of the debug console: a loader under 1 KB gzip that checks for an admin session with `GET /v2/widget/session` and only then loads the console into a Shadow DOM root, opened from a launcher pill or Ctrl+Shift+K. Entries for any page (`mount`), React (`Debugtools`) and Next (`Debugtools`), plus the `Console` component on its own from `@spoar/debugtools/console`. It runs on fixture data for now.

## 0.1.0

### Minor Changes

- 8a5a151: The debug console runs SQL against your project. The editor is editable and runs `POST /v2/projects/:project/query` over the toolbar's time range, bound as `:from` and `:to`; the results show the rows, the dataset library lists the views and columns, and the recent queries come from your run history. On a customer site it sends the `wt_` widget token and fetches a new one before it expires; `auth: "session"` sends the session cookie instead. The console opens as a panel docked to the bottom of the page that resizes, maximises, pops out as a floating window and remembers its layout. New options: `auth` and `launcher`. `@spoar/debugtools/console` also exports `LiveConsole` and `clientSource`.
- 5ff956d: First release of the debug console: a loader under 1 KB gzip that checks for an admin session with `GET /v2/widget/session` and only then loads the console into a Shadow DOM root, opened from a launcher pill or Ctrl+Shift+K. Entries for any page (`mount`), React (`Debugtools`) and Next (`Debugtools`), plus the `Console` component on its own from `@spoar/debugtools/console`. It runs on fixture data for now.
