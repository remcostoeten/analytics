---
"@remcostoeten/analytics-contract": minor
"@spoar/sdk": patch
---

The contract adds a `./limits` entry with `maxEventsPerBatch`, `maxBodyBytes`, `maxGroups`, `maxGroupId` and `groupTypePattern`, still re-exported from the root. The SDK reads its group limits, server batch size and proxy body limit from it, so the proxy now refuses bodies over 60 KB, the same limit as `POST /v2/events`, instead of 64 KB.
