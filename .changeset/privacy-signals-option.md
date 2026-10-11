---
"@spoar/sdk": minor
---

New `privacySignals` option. `"ignore"` keeps sending when the browser has Do Not Track or Global Privacy Control on; the default `"respect"` drops those events as before. Brave turns Global Privacy Control on by default, so its visitors were never counted.
