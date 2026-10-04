---
"@spoar/contract": minor
---

Dev widget: `WidgetSession` for the bootstrap, `ActiveVisitor` and `ActiveVisitors`, `LogLine`, `LogList` and `LogsQuery` for the log stream with the `LineLevel`, `LineKind` and `LineSource` enums and `LogData`, `ClientLog`, `ClientLogBatch` and `ClientLogResult` for SDK client reports, and `Overview` with `IngestTotals` and `ReleaseInfo`. `BotLabel`, `BotSignals` and `BotDetail` describe a visitor's bot verdict and signal breakdown, which `VisitorDetail` now carries as `bot`. `RealtimeResponse` gains an optional `visitors` array, `Project`, `UpdateProject` and `UpdatedProject` gain `widgetReports`, `maxReportBytes` and `maxReportsPerBatch` join the limits, and the error catalog adds `AUTH_REQUIRED`, `ORIGIN_NOT_ALLOWED` and `WIDGET_REPORTS_DISABLED`.
