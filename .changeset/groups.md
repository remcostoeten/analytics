---
"@remcostoeten/analytics-contract": minor
"@remcostoeten/analytics-sdk": minor
---

Group analytics. The contract adds `WireGroups` (up to 5 `type: id` pairs), an optional `groups` field on `WireEvent`, `groups` on `EventRow` and the built-in `group` event. The SDK adds the `groups<Groups>()` plugin with typed `set(type, id, traits?)` and `leave(type)`, `group()` and a `groups` request option on the server client, and the `GroupMap`, `GroupType` and `GroupTraits` types.
