---
"@spoar/sdk": patch
---

Depend on `@spoar/debugtools` `^0.2.0`. 2.2.0 pinned 0.1.0, which has no `./gate` entry, so a Next build that loads `<Analytics>` from `@spoar/sdk/next` could not resolve the debug console gate.
