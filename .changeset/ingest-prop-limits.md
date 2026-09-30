---
"@remcostoeten/analytics-contract": minor
---

`WireEvent.props` is `WireProps`: at most 25 flat props with keys up to 255 characters and string values up to 2048. `maxProps`, `maxPropKeyLength`, `maxPropValueLength`, `maxLongPropValueLength`, `longPropKeys` and `propValueLimit` hold the limits the SDK applies, and ingest rejects an event whose string prop is over `propValueLimit` (255, or 2048 for `stack` and `breadcrumbs` on `error` events). The `FORBIDDEN` and `UNAVAILABLE` docs name every cause, and `RangeQuery`, `FilterQuery` and `BreakdownQuery` describe their fields for the OpenAPI document.
