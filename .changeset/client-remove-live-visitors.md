---
"@spoar/client": minor
---

`projects.remove(id)` deletes a project through the new owner-only `DELETE /v2/projects/:project`, and a project scope gains `liveVisitors({ everyMs, limit, signal })`, an async iterable that reads `realtime/visitors` on an interval until the signal aborts or a call fails.
