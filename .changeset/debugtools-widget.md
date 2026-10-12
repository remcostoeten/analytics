---
"@spoar/debugtools": minor
---

First release of the debug console: a loader under 1 KB gzip that checks for an admin session with `GET /v2/widget/session` and only then loads the console into a Shadow DOM root, opened from a launcher pill or Ctrl+Shift+K. Entries for any page (`mount`), React (`Debugtools`) and Next (`Debugtools`), plus the `Console` component on its own from `@spoar/debugtools/console`. It runs on fixture data for now.
