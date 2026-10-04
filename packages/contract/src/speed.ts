import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Range } from "./common";
import { Environment, Percentile, TrafficFilter, VitalMetric, VitalRating } from "./enums";
import { listOf, nullable, oneOf, Ratio } from "./schema";
import speedElementsLcp from "../fixtures/SpeedElementList/valid/lcp.json";
import speedMobile from "../fixtures/SpeedResponse/valid/mobile.json";
import speedRoutesTwo from "../fixtures/SpeedRouteList/valid/two.json";
import speedTwoDays from "../fixtures/SpeedTimeseries/valid/two-days.json";

export const SpeedDevice = oneOf(["mobile", "desktop", "all"], {
  description: "`mobile` (tablets included), `desktop` or `all` (the default).",
});
export type SpeedDevice = Static<typeof SpeedDevice>;

export const SpeedEnvironment = Environment;
export type SpeedEnvironment = Environment;

export const SpeedInterval = oneOf(["hour", "day"], {
  description:
    "Bucket size in UTC: `day` (the default) or `hour`, which covers at most 7 days and only the last 30 days of raw samples.",
});
export type SpeedInterval = Static<typeof SpeedInterval>;

export const SpeedGroup = oneOf(["route", "path"], {
  description:
    "`route` (the default) groups by the route the SDK reported, falling back to the path; `path` groups by the path.",
});
export type SpeedGroup = Static<typeof SpeedGroup>;

const NextCursor = nullable(
  Type.String({ description: "Pass as `cursor` for the next page; null on the last page." }),
);

const ChosenPercentile = Type.Union(Percentile.anyOf, {
  description: "The percentile the values show.",
});

const Metric = Type.Union(VitalMetric.anyOf, { description: "The Web Vital as requested." });

export const SpeedQuery = Type.Object({
  device: Type.Optional(SpeedDevice),
  environment: Type.Optional(SpeedEnvironment),
  interval: Type.Optional(SpeedInterval),
  group: Type.Optional(SpeedGroup),
  minShare: Type.Optional(
    Type.Number({
      minimum: 0,
      maximum: 1,
      description:
        "Leaves out routes with less than this share of the samples; default 0.005, `0` keeps them all.",
    }),
  ),
  percentile: Type.Optional(Percentile),
  metric: Type.Optional(VitalMetric),
});
export type SpeedQuery = Static<typeof SpeedQuery>;

const Score = Type.Integer({
  minimum: 0,
  maximum: 100,
  description:
    "0 to 100 on Lighthouse's log-normal curve: the good threshold scores 90, the poor threshold 50.",
});

const RealExperienceScore = Type.Integer({
  minimum: 0,
  maximum: 100,
  description:
    "The Real Experience Score: the weighted mean of the metric scores (LCP 30%, INP 30%, CLS 25%, FCP 15%; TTFB is not scored), with missing metrics' weights spread over the rest. Null when no scored metric has 20 samples.",
});

const Samples = Type.Integer({ minimum: 0, description: "Measurements counted." });

export const MetricSummary = Type.Object({
  value: nullable(
    Type.Number({
      minimum: 0,
      description:
        "The chosen percentile, in milliseconds (CLS unitless, to three decimals); null under 20 samples.",
    }),
  ),
  rating: nullable(VitalRating),
  score: nullable(Score),
  samples: Samples,
  shares: Type.Object(
    { good: Ratio, needsImprovement: Ratio, poor: Ratio },
    { description: "How the samples split across the ratings, to two decimals." },
  ),
});
export type MetricSummary = Static<typeof MetricSummary>;

export const SpeedResponse = Type.Object(
  {
    data: Type.Object({
      score: nullable(RealExperienceScore),
      rating: nullable(
        Type.Union(VitalRating.anyOf, {
          description:
            "The score's band: 90 and up good, 50 to 89 needs improvement, under 50 poor.",
        }),
      ),
      samples: Type.Integer({ minimum: 0, description: "Samples of the most measured metric." }),
      metrics: Type.Object({
        lcp: Type.Object(MetricSummary.properties, {
          description: "Largest Contentful Paint, in milliseconds.",
        }),
        inp: Type.Object(MetricSummary.properties, {
          description: "Interaction to Next Paint, in milliseconds.",
        }),
        cls: Type.Object(MetricSummary.properties, {
          description: "Cumulative Layout Shift, unitless.",
        }),
        fcp: Type.Object(MetricSummary.properties, {
          description: "First Contentful Paint, in milliseconds.",
        }),
        ttfb: Type.Object(MetricSummary.properties, {
          description: "Time to First Byte, in milliseconds; shown but not scored.",
        }),
      }),
    }),
    percentile: ChosenPercentile,
    device: SpeedDevice,
    environment: SpeedEnvironment,
    range: Range,
    traffic: Type.Union(TrafficFilter.anyOf, { description: "Always `human` for speed." }),
  },
  { examples: [speedMobile] },
);
export type SpeedResponse = Static<typeof SpeedResponse>;

const VitalValue = nullable(
  Type.Number({
    minimum: 0,
    description: "The chosen percentile, in milliseconds (CLS unitless); null under 20 samples.",
  }),
);

export const SpeedRoute = Type.Object({
  route: Type.String({
    description: "The route the SDK reported, or the path; the path with `group=path`.",
  }),
  score: nullable(RealExperienceScore),
  samples: Type.Integer({ minimum: 0, description: "Samples of the most measured metric." }),
  lcp: VitalValue,
  inp: VitalValue,
  cls: VitalValue,
  fcp: VitalValue,
  ttfb: VitalValue,
});
export type SpeedRoute = Static<typeof SpeedRoute>;

export const SpeedRouteList = Type.Object(
  { ...listOf(SpeedRoute).properties, nextCursor: NextCursor },
  {
    description: "Worst score first, routes without a score last.",
    examples: [speedRoutesTwo],
  },
);
export type SpeedRouteList = Static<typeof SpeedRouteList>;

export const SpeedElement = Type.Object({
  selector: Type.String({
    minLength: 1,
    description:
      "CSS selector of the element web-vitals blamed: the LCP element, the INP interaction target or the largest CLS shift.",
  }),
  route: Type.String({ description: "The route the SDK reported, or the path." }),
  samples: Type.Integer({
    minimum: 0,
    description: "Needs-improvement and poor samples for this element; at least 20.",
  }),
  value: Type.Number({
    minimum: 0,
    description: "The chosen percentile of those samples, in milliseconds (CLS unitless).",
  }),
});
export type SpeedElement = Static<typeof SpeedElement>;

export const SpeedElementList = Type.Object(
  {
    data: Type.Array(SpeedElement, { description: "Most samples first." }),
    metric: Metric,
    nextCursor: NextCursor,
  },
  { examples: [speedElementsLcp] },
);
export type SpeedElementList = Static<typeof SpeedElementList>;

export const SpeedPoint = Type.Object({
  bucket: Type.String({ format: "date-time", description: "Start of the bucket, in UTC." }),
  value: VitalValue,
  samples: Samples,
});
export type SpeedPoint = Static<typeof SpeedPoint>;

export const SpeedTimeseries = Type.Object(
  {
    data: Type.Array(SpeedPoint, { description: "One point per bucket, oldest first." }),
    metric: Metric,
    percentile: ChosenPercentile,
    device: SpeedDevice,
    environment: SpeedEnvironment,
    interval: SpeedInterval,
    range: Range,
  },
  { examples: [speedTwoDays] },
);
export type SpeedTimeseries = Static<typeof SpeedTimeseries>;
