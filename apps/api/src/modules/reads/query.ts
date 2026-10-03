import {
  BreakdownQuery,
  FilterQuery,
  IssueStatus,
  LifecycleInterval,
  oneOf,
  RangeQuery,
  RetentionInterval,
  SpeedDevice,
  SpeedEnvironment,
  SpeedGroup,
  SpeedInterval,
  TimeseriesQuery,
  VitalMetric,
} from "@remcostoeten/analytics-contract";
import { Type } from "@sinclair/typebox";
import { t } from "elysia";

import { exportPageSize } from "./export";

const limit = t.Integer({
  minimum: 1,
  maximum: exportPageSize,
  description: `Rows per page, 1 to 100 (default 20), or up to ${exportPageSize} with \`format\`.`,
});
const cursor = Type.String({
  minLength: 1,
  description: "The opaque `nextCursor` of the previous page.",
});
const format = oneOf(["csv", "json", "sql"]);

const pageFields = { limit: Type.Optional(limit), cursor: Type.Optional(cursor) };
const listFields = { ...pageFields, format: Type.Optional(format) };

const speedFilters = Type.Object({
  filter: Type.Optional(
    Type.Record(Type.String(), Type.String(), {
      description:
        "`filter[route]`, `filter[page]` and `filter[country]`; a value, or `!value` to exclude.",
    }),
  ),
});

/**
 * @name scopeQuery
 * @description The query every aggregate read takes: the contract's `RangeQuery` and
 * `FilterQuery`, so `from`, `to`, `period`, `traffic` and `filter[<dimension>]` are in the OpenAPI
 * document. Parsing stays in `readScope`, which also reads each `filter[...]` key.
 *
 * @example
 * app.get("/projects/:project/stats", handler, { query: scopeQuery });
 */
export const scopeQuery = Type.Composite([RangeQuery, FilterQuery]);

/**
 * @name timeseriesQuery
 * @description `scopeQuery` plus the contract's `TimeseriesQuery`: `metric`, `interval` and
 * `compare`. `metric` is optional here so a missing one answers the API's own 400.
 *
 * @example
 * app.get("/projects/:project/timeseries", handler, { query: timeseriesQuery });
 */
export const timeseriesQuery = Type.Composite([scopeQuery, Type.Partial(TimeseriesQuery)]);

/**
 * @name breakdownQuery
 * @description `scopeQuery` plus the contract's `BreakdownQuery` (`metrics`), paging and the
 * `format` download.
 *
 * @example
 * app.get("/projects/:project/breakdown/:dimension", handler, { query: breakdownQuery });
 */
export const breakdownQuery = Type.Composite([scopeQuery, BreakdownQuery, Type.Object(listFields)]);

/**
 * @name pathsQuery
 * @description `scopeQuery` plus the `page` to start from, `direction`, paging and `format`.
 *
 * @example
 * app.get("/projects/:project/paths", handler, { query: pathsQuery });
 */
export const pathsQuery = Type.Composite([
  scopeQuery,
  Type.Object({
    page: Type.Optional(
      Type.String({ minLength: 1, description: "The page path to start from; required." }),
    ),
    direction: Type.Optional(oneOf(["next", "previous"])),
    ...listFields,
  }),
]);

/**
 * @name retentionQuery
 * @description `scopeQuery` plus the cohort `interval`, `week` or `month`.
 *
 * @example
 * app.get("/projects/:project/retention", handler, { query: retentionQuery });
 */
export const retentionQuery = Type.Composite([
  scopeQuery,
  Type.Object({ interval: Type.Optional(RetentionInterval) }),
]);

/**
 * @name lifecycleQuery
 * @description `scopeQuery` plus the period `interval`, `day`, `week` or `month`.
 *
 * @example
 * app.get("/projects/:project/lifecycle", handler, { query: lifecycleQuery });
 */
export const lifecycleQuery = Type.Composite([
  scopeQuery,
  Type.Object({ interval: Type.Optional(LifecycleInterval) }),
]);

/**
 * @name heatmapQuery
 * @description `scopeQuery` plus the heatmap `metric` and the IANA `timezone` to bucket in.
 *
 * @example
 * app.get("/projects/:project/heatmap", handler, { query: heatmapQuery });
 */
export const heatmapQuery = Type.Composite([
  scopeQuery,
  Type.Object({
    metric: Type.Optional(oneOf(["visitors", "pageviews"])),
    timezone: Type.Optional(
      Type.String({ minLength: 1, description: "An IANA timezone; default UTC." }),
    ),
  }),
]);

/**
 * @name mapQuery
 * @description `scopeQuery` plus the map `level`, paging and `format`.
 *
 * @example
 * app.get("/projects/:project/map", handler, { query: mapQuery });
 */
export const mapQuery = Type.Composite([
  scopeQuery,
  Type.Object({ level: Type.Optional(oneOf(["country", "region", "city"])), ...listFields }),
]);

/**
 * @name liveEventsQuery
 * @description The live feed's query: `traffic`, `filter[<dimension>]`, `limit` and `after`, the
 * id of the last event seen.
 *
 * @example
 * app.get("/projects/:project/realtime/events", handler, { query: liveEventsQuery });
 */
export const liveEventsQuery = Type.Composite([
  FilterQuery,
  Type.Object({
    limit: Type.Optional(
      t.Integer({ minimum: 1, maximum: 100, description: "Events per poll, 1 to 100." }),
    ),
    after: Type.Optional(
      Type.String({ minLength: 1, description: "The cursor of the last event seen." }),
    ),
  }),
]);

/**
 * @name eventsQuery
 * @description The raw events list: `scopeQuery`, one event `name`, paging and `format`.
 *
 * @example
 * app.get("/projects/:project/events", handler, { query: eventsQuery });
 */
export const eventsQuery = Type.Composite([
  scopeQuery,
  Type.Object({
    name: Type.Optional(Type.String({ minLength: 1, description: "Keep one event name." })),
    ...listFields,
  }),
]);

/**
 * @name listQuery
 * @description A visitor or session list: `scopeQuery`, paging and `format`.
 *
 * @example
 * app.get("/projects/:project/visitors", handler, { query: listQuery });
 */
export const listQuery = Type.Composite([scopeQuery, Type.Object(listFields)]);

/**
 * @name pageQuery
 * @description Paging and `format` alone, for lists of one visitor or session.
 *
 * @example
 * app.get("/projects/:project/sessions/:session/events", handler, { query: pageQuery });
 */
export const pageQuery = Type.Object(listFields);

/**
 * @name speedQuery
 * @description The speed reads' query: the date range, `device`, `environment`, `percentile`,
 * `metric` where the route needs one, `interval` for the series, `group` and `minShare` for the
 * routes, the route, page and country filters, and paging.
 *
 * @example
 * app.get("/projects/:project/speed", handler, { query: speedQuery });
 */
export const speedQuery = Type.Composite([
  RangeQuery,
  speedFilters,
  Type.Object({
    device: Type.Optional(SpeedDevice),
    environment: Type.Optional(SpeedEnvironment),
    interval: Type.Optional(SpeedInterval),
    group: Type.Optional(SpeedGroup),
    minShare: Type.Optional(Type.String({ pattern: "^(0(\\.\\d+)?|1(\\.0+)?)$" })),
    percentile: Type.Optional(oneOf(["50", "75", "90", "95", "99"])),
    metric: Type.Optional(VitalMetric),
    ...pageFields,
  }),
]);

/**
 * @name issuesQuery
 * @description The issue list's query: `status` and paging.
 *
 * @example
 * app.get("/projects/:project/issues", handler, { query: issuesQuery });
 */
export const issuesQuery = Type.Object({ status: Type.Optional(IssueStatus), ...pageFields });

/**
 * @name pagingQuery
 * @description `limit` and `cursor` alone, for paged answers without a download.
 *
 * @example
 * app.get("/projects/:project/issues/:issue/events", handler, { query: pagingQuery });
 */
export const pagingQuery = Type.Object(pageFields);

/**
 * @name annotationsQuery
 * @description The annotation list's query: the read range (`from` and `to`, or `period`) and
 * paging.
 *
 * @example
 * app.get("/projects/:project/annotations", handler, { query: annotationsQuery });
 */
export const annotationsQuery = Type.Composite([RangeQuery, Type.Object(pageFields)]);

/**
 * @name realtimeQuery
 * @description The realtime summary's query: `include=visitors` adds the active visitor rows, and
 * `limit` caps them (1 to 200, default 50).
 *
 * @example
 * app.get("/projects/:project/realtime", handler, { query: realtimeQuery });
 */
export const realtimeQuery = Type.Object({
  include: Type.Optional(Type.Literal("visitors")),
  limit: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
});
