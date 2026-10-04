---
"@spoar/contract": minor
---

Alerts: `AlertEventName`, `ChannelName`, `TargetName`, `EmailAddress`, `HttpsUrl`, `TargetState` and `DeliveryStatus`; `TargetInput`, a union on `channel` of mail, webhook and Discord targets, with `SyncTargets`; `AlertTarget` and `AlertTargetList`; `TargetChangesResponse`, `RotatedSecret` and `TargetTest`; `IssueAlert`, `AlertEvent` and the signed `WebhookBody`; `AlertDelivery`, `AlertDeliveryList` and `DeliveriesQuery`; and `AlertsStatus`. The `email` string format is registered with the other formats.
