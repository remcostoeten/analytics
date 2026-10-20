---
"@spoar/debugtools": minor
---

Add the `@spoar/debugtools/gate` entry with `startConsole`, which `@spoar/sdk` uses to open the console from the grant a `GET /v2/widget/connect` popup posts back, or from the grant the tab already holds. The console now picks up a newer grant from the tab before it asks for one, and `requestGrant` returns the grant's project. The API refuses the console with `403 DEBUG_CONSOLE_DISABLED` until the project's `debugConsole` switch is on.
