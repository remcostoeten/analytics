---
"@spoar/debugtools": minor
---

The debug console runs SQL against your project. The editor is editable and runs `POST /v2/projects/:project/query` over the toolbar's time range, bound as `:from` and `:to`; the results show the rows, the dataset library lists the views and columns, and the recent queries come from your run history. On a customer site it sends the `wt_` widget token and fetches a new one before it expires; `auth: "session"` sends the session cookie instead. The console opens as a panel docked to the bottom of the page that resizes, maximises, pops out as a floating window and remembers its layout. New options: `auth` and `launcher`. `@spoar/debugtools/console` also exports `LiveConsole` and `clientSource`.
