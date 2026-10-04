---
"@spoar/contract": minor
"@spoar/sdk": minor
---

Alerts gain the opt-in `speed.drop` event: `AlertEventName` adds it, `IssueAlertName` holds the issue events, and `AlertEvent` is the union of `IssueAlert` and the new `SpeedAlert`. `alertRoute` and `verifyAlert` accept it, with `event.speed` typed in its handler.
