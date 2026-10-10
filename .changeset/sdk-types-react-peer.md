---
"@spoar/sdk": patch
---

Declare `@types/react` as an optional peer dependency, so the `./react` and `./next` declarations resolve to the app's own React types under isolated installs. Without it, a workspace with more than one `@types/react` version typed the provider's `children` with whichever copy was hoisted, and `<AnalyticsProvider>` failed to typecheck in apps on the other version.
