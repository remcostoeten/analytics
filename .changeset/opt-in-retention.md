---
"@spoar/client": minor
"@spoar/sdk": minor
---

Projects gain `retentionEnabled`, a boolean that is off by default. Automatic deletion runs only when it is on, past `retentionDays`. Sending `retentionDays` alone never turns deletion on, and its type and default of 90 are unchanged.
