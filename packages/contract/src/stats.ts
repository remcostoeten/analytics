import Type from "typebox";
import type { Static } from "typebox";

import { Compared, Filters, Range, ValueCount } from "./common";
import { Interval, Percentile, TrafficFilter, VitalRating } from "./enums";
import { Count, nullable, Ratio, Timestamp } from "./schema";

const Scope = {
  range: Range,
  traffic: TrafficFilter,
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
  metrics: Type.Optional(Type.String({ minLength: 1 })),
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
