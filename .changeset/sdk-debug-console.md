---
"@spoar/sdk": minor
---

Add `debugConsole` to `<Analytics>` from `@spoar/sdk/next`. When set, it lazily loads a small gate that opens the debug console from `@spoar/debugtools` for project admins on Ctrl+Shift+K, through a popup on the API, on any domain. Visitors send no request for it. Pass `debugConsole={{ api }}` for a self-hosted API. `@spoar/debugtools` is now a dependency.
