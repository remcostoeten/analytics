---
"@remcostoeten/analytics-sdk": minor
---

Alerts: a new `./admin` entry with `createAdmin`, whose `alerts` methods (`sync`, `list`, `set`, `remove`, `test`, `rotate`, `deliveries`, `status`) manage a project's alert targets and whose `stats`, `timeseries`, `breakdown`, `lifecycle` and `issues` methods call the read routes, each answering a `Result` that never throws; and the `mail`, `webhook` and `discord` target builders, typed so that an empty or malformed address list, a non-`https://` URL, an unknown event or two targets with the same name is a type error. `./server` adds `alertRoute`, a route handler that checks the signature and timestamp of an alert webhook and runs one typed handler per event, and `verifyAlert`, the same check without the routing.
