---
"@remcostoeten/analytics-sdk": patch
---

`speedInsights` asks web-vitals for every LCP, INP and CLS change and keeps the latest value per metric id, so those values are sent even when a page unloads without a visibility change.
