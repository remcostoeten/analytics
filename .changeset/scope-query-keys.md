---
"@spoar/client": minor
---

Every scope has `key(route, ...args)`, and `scopeKey` is exported: a serialisable key holding the project, the route, the scope's query sorted by name and the route's arguments, so a cache such as TanStack Query can dedupe and invalidate reads.
