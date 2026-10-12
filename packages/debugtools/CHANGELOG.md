# @spoar/debugtools

## 0.1.0

### Minor Changes

- 8a5a151: The debug console runs SQL against your project. The editor is editable and runs `POST /v2/projects/:project/query` over the toolbar's time range, bound as `:from` and `:to`; the results show the rows, the dataset library lists the views and columns, and the recent queries come from your run history. On a customer site it sends the `wt_` widget token and fetches a new one before it expires; `auth: "session"` sends the session cookie instead. The console opens as a panel docked to the bottom of the page that resizes, maximises, pops out as a floating window and remembers its layout. New options: `auth` and `launcher`. `@spoar/debugtools/console` also exports `LiveConsole` and `clientSource`.
- 5ff956d: First release of the debug console: a loader under 1 KB gzip that checks for an admin session with `GET /v2/widget/session` and only then loads the console into a Shadow DOM root, opened from a launcher pill or Ctrl+Shift+K. Entries for any page (`mount`), React (`Debugtools`) and Next (`Debugtools`), plus the `Console` component on its own from `@spoar/debugtools/console`. It runs on fixture data for now.
