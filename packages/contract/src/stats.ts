import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Compared, Filters, Range, ValueCount } from "./common";
import {
  DeviceType,
  Environment,
  EventName,
  Interval,
  Percentile,
  TrafficFilter,
  Visibility,
  VitalRating,
} from "./enums";
import { Count, Id, nullable, oneOf, Ratio, Timestamp } from "./schema";

const Scope = {
  range: Range,
  traffic: TrafficFilter,
  environment: Environment,
  filters: Filters,
};

export const StatsResponse = Type.Object({
  data: Type.Object({
    visitors: Compared,
    sessions: Compared,
    pageviews: Compared,
    pagesPerSession: Compared,
    bounceRate: Compared,
    sessionDurationMs: Compared,
  }),
  previousRange: Range,
  ...Scope,
});
export type StatsResponse = Static<typeof StatsResponse>;

export const TimeseriesQuery = Type.Object({
  metric: Type.String({ minLength: 1 }),
  interval: Type.Optional(Interval),
  compare: Type.Optional(Type.Literal("previous")),
});
export type TimeseriesQuery = Static<typeof TimeseriesQuery>;

export const TimeseriesPoint = Type.Object({
  bucket: Timestamp,
  value: Type.Number(),
  previous: Type.Optional(Type.Number()),
});
export type TimeseriesPoint = Static<typeof TimeseriesPoint>;

export const TimeseriesResponse = Type.Object({
  data: Type.Array(TimeseriesPoint),
  metric: Type.String({ minLength: 1 }),
  interval: Interval,
  previousRange: Type.Optional(Range),
  ...Scope,
});
export type TimeseriesResponse = Static<typeof TimeseriesResponse>;

export const BreakdownQuery = Type.Object({
  metrics: Type.Optional(
    Type.String({
      minLength: 1,
      description: "Comma-separated metrics; default `visitors,pageviews`.",
    }),
  ),
});
export type BreakdownQuery = Static<typeof BreakdownQuery>;

export const BreakdownRow = Type.Object(
  {
    value: Type.String(),
    visitors: Type.Optional(Count),
    sessions: Type.Optional(Count),
    pageviews: Type.Optional(Count),
    events: Type.Optional(Count),
    bounceRate: Type.Optional(Ratio),
    avgTimeMs: Type.Optional(Type.Number({ minimum: 0 })),
    timeOnPageMs: Type.Optional(Type.Number({ minimum: 0 })),
    scrollDepth: Type.Optional(Ratio),
    pagesPerSession: Type.Optional(Type.Number({ minimum: 0 })),
    conversionRate: Type.Optional(Ratio),
    share: Type.Optional(Ratio),
  },
  { additionalProperties: Type.Number() },
);
export type BreakdownRow = Static<typeof BreakdownRow>;

export const BreakdownResponse = Type.Object({
  data: Type.Array(BreakdownRow),
  dimension: Type.String({ minLength: 1 }),
  total: Count,
  nextCursor: nullable(Type.String()),
  ...Scope,
});
export type BreakdownResponse = Static<typeof BreakdownResponse>;

export const ProjectBreakdownRow = Type.Object(
  {
    ...BreakdownRow.properties,
    name: Type.String({ minLength: 1 }),
    visibility: Visibility,
    change: Type.Record(Type.String(), nullable(Type.Number())),
    speedScore: nullable(Type.Integer({ minimum: 0, maximum: 100 })),
    openIssues: nullable(Count),
  },
  { additionalProperties: Type.Number() },
);
export type ProjectBreakdownRow = Static<typeof ProjectBreakdownRow>;

export const ProjectBreakdownResponse = Type.Object({
  data: Type.Array(ProjectBreakdownRow),
  dimension: Type.Literal("project"),
  total: Count,
  nextCursor: nullable(Type.String()),
  previousRange: Range,
  ...Scope,
});
export type ProjectBreakdownResponse = Static<typeof ProjectBreakdownResponse>;

export const VitalsRow = Type.Object({
  value: Type.String(),
  samples: Count,
  lcpMs: nullable(Type.Number({ minimum: 0 })),
  inpMs: nullable(Type.Number({ minimum: 0 })),
  cls: nullable(Type.Number({ minimum: 0 })),
  fcpMs: nullable(Type.Number({ minimum: 0 })),
  ttfbMs: nullable(Type.Number({ minimum: 0 })),
  rating: VitalRating,
});
export type VitalsRow = Static<typeof VitalsRow>;

export const VitalsBreakdownResponse = Type.Object({
  data: Type.Array(VitalsRow),
  dimension: Type.Literal("web_vital"),
  percentile: Percentile,
  minSamples: Count,
  total: Count,
  nextCursor: nullable(Type.String()),
  ...Scope,
});
export type VitalsBreakdownResponse = Static<typeof VitalsBreakdownResponse>;

export const RealtimeResponse = Type.Object({
  data: Type.Object({
    visitors: Count,
    pageviewsPerMinute: Type.Number({ minimum: 0 }),
    pages: Type.Array(ValueCount),
    countries: Type.Array(ValueCount),
  }),
  window: Range,
});
export type RealtimeResponse = Static<typeof RealtimeResponse>;

export const PathDirection = oneOf(["next", "previous"]);
export type PathDirection = Static<typeof PathDirection>;

export const PathStep = Type.Object({ path: Type.String(), count: Count, share: Ratio });
export type PathStep = Static<typeof PathStep>;

export const PathsResponse = Type.Object({
  data: Type.Array(PathStep),
  page: Type.String({ minLength: 1 }),
  direction: PathDirection,
  views: Count,
  dropOff: Type.Object({ count: Count, share: Ratio }),
  total: Count,
  nextCursor: nullable(Type.String()),
  ...Scope,
});
export type PathsResponse = Static<typeof PathsResponse>;

export const RetentionInterval = oneOf(["week", "month"]);
export type RetentionInterval = Static<typeof RetentionInterval>;

export const RetentionCohort = Type.Object({
  cohort: Timestamp,
  visitors: Count,
  periods: Type.Array(Type.Object({ offset: Count, visitors: Count, share: Ratio })),
});
export type RetentionCohort = Static<typeof RetentionCohort>;

export const RetentionResponse = Type.Object({
  data: Type.Array(RetentionCohort),
  interval: RetentionInterval,
  ...Scope,
});
export type RetentionResponse = Static<typeof RetentionResponse>;

export const LifecycleInterval = oneOf(["day", "week", "month"]);
export type LifecycleInterval = Static<typeof LifecycleInterval>;

export const LifecyclePeriod = Type.Object({
  period: Timestamp,
  new: Count,
  returning: Count,
  resurrected: Count,
  dormant: Count,
});
export type LifecyclePeriod = Static<typeof LifecyclePeriod>;

export const LifecycleResponse = Type.Object({
  data: Type.Array(LifecyclePeriod),
  interval: LifecycleInterval,
  ...Scope,
});
export type LifecycleResponse = Static<typeof LifecycleResponse>;

export const StickinessRow = Type.Object({
  days: Type.Integer({ minimum: 1 }),
  visitors: Count,
  share: Ratio,
});
export type StickinessRow = Static<typeof StickinessRow>;

export const StickinessResponse = Type.Object({
  data: Type.Array(StickinessRow),
  visitors: Count,
  averageDays: Type.Number({ minimum: 0 }),
  ...Scope,
});
export type StickinessResponse = Static<typeof StickinessResponse>;

export const HeatmapMetric = oneOf(["visitors", "pageviews"]);
export type HeatmapMetric = Static<typeof HeatmapMetric>;

export const HeatmapCell = Type.Object({
  weekday: Type.Integer({ minimum: 1, maximum: 7 }),
  hour: Type.Integer({ minimum: 0, maximum: 23 }),
  value: Count,
});
export type HeatmapCell = Static<typeof HeatmapCell>;

export const HeatmapResponse = Type.Object({
  data: Type.Array(HeatmapCell),
  metric: HeatmapMetric,
  timezone: Type.String({ minLength: 1 }),
  ...Scope,
});
export type HeatmapResponse = Static<typeof HeatmapResponse>;

export const MapLevel = oneOf(["country", "region", "city"]);
export type MapLevel = Static<typeof MapLevel>;

export const MapPlace = Type.Object({
  country: Type.String({ minLength: 2, maxLength: 2 }),
  region: nullable(Type.String()),
  city: nullable(Type.String()),
  latitude: nullable(Type.Number({ minimum: -90, maximum: 90 })),
  longitude: nullable(Type.Number({ minimum: -180, maximum: 180 })),
  visitors: Count,
  share: Ratio,
});
export type MapPlace = Static<typeof MapPlace>;

export const MapResponse = Type.Object({
  data: Type.Array(MapPlace),
  level: MapLevel,
  total: Count,
  nextCursor: nullable(Type.String()),
  ...Scope,
});
export type MapResponse = Static<typeof MapResponse>;

export const LiveEvent = Type.Object({
  id: Id,
  project: Type.String({ minLength: 1 }),
  name: EventName,
  ts: Timestamp,
  path: nullable(Type.String()),
  country: nullable(Type.String({ minLength: 2, maxLength: 2 })),
  device: DeviceType,
  visitor: Type.Optional(Id),
  session: Type.Optional(Id),
});
export type LiveEvent = Static<typeof LiveEvent>;

export const LiveEvents = Type.Object({
  data: Type.Array(LiveEvent),
  nextCursor: Type.String({ minLength: 1 }),
});
export type LiveEvents = Static<typeof LiveEvents>;
