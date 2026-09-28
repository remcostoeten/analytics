import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Range } from "./common";
import { Percentile, TrafficFilter, VitalMetric, VitalRating } from "./enums";
import { Count, listOf, nullable, oneOf, Ratio } from "./schema";

export const SpeedDevice = oneOf(["mobile", "desktop", "all"]);
export type SpeedDevice = Static<typeof SpeedDevice>;

export const SpeedQuery = Type.Object({
  device: Type.Optional(SpeedDevice),
  percentile: Type.Optional(Percentile),
  metric: Type.Optional(VitalMetric),
});
export type SpeedQuery = Static<typeof SpeedQuery>;

const Score = Type.Integer({ minimum: 0, maximum: 100 });

export const MetricSummary = Type.Object({
  value: Type.Number({ minimum: 0 }),
  rating: VitalRating,
  score: nullable(Score),
  shares: Type.Object({ good: Ratio, needsImprovement: Ratio, poor: Ratio }),
});
export type MetricSummary = Static<typeof MetricSummary>;

export const SpeedResponse = Type.Object({
  data: Type.Object({
    score: Score,
    rating: VitalRating,
    samples: Count,
    metrics: Type.Object({
      lcp: MetricSummary,
      inp: MetricSummary,
      cls: MetricSummary,
      fcp: MetricSummary,
      ttfb: MetricSummary,
    }),
  }),
  percentile: Percentile,
  device: SpeedDevice,
  range: Range,
  traffic: TrafficFilter,
});
export type SpeedResponse = Static<typeof SpeedResponse>;

const VitalValue = nullable(Type.Number({ minimum: 0 }));

export const SpeedRoute = Type.Object({
  route: Type.String(),
  score: Score,
  samples: Count,
  lcp: VitalValue,
  inp: VitalValue,
  cls: VitalValue,
  fcp: VitalValue,
  ttfb: VitalValue,
});
export type SpeedRoute = Static<typeof SpeedRoute>;

export const SpeedRouteList = listOf(SpeedRoute);
export type SpeedRouteList = Static<typeof SpeedRouteList>;

export const SpeedElement = Type.Object({
  selector: Type.String({ minLength: 1 }),
  route: Type.String(),
  samples: Count,
  value: Type.Number({ minimum: 0 }),
});
export type SpeedElement = Static<typeof SpeedElement>;

export const SpeedElementList = Type.Object({
  data: Type.Array(SpeedElement),
  metric: VitalMetric,
  nextCursor: nullable(Type.String()),
});
export type SpeedElementList = Static<typeof SpeedElementList>;
