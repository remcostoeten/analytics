import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Compared, Filters, Range, ValueCount } from "./common";
import { ActiveVisitor } from "./widget";
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
import breakdownPages from "../fixtures/BreakdownResponse/valid/pages.json";
import heatmapAmsterdam from "../fixtures/HeatmapResponse/valid/amsterdam.json";
import liveDetail from "../fixtures/LiveEvents/valid/detail.json";
import mapCities from "../fixtures/MapResponse/valid/cities.json";
import pathsNext from "../fixtures/PathsResponse/valid/next.json";
import realtimeNow from "../fixtures/RealtimeResponse/valid/now.json";
import retentionWeekly from "../fixtures/RetentionResponse/valid/weekly.json";
import statsWeek from "../fixtures/StatsResponse/valid/week.json";
import timeseriesByDay from "../fixtures/TimeseriesResponse/valid/visitors-by-day.json";
import vitalsPages from "../fixtures/VitalsBreakdownResponse/valid/pages.json";

const Scope = {
  range: Range,
  traffic: TrafficFilter,
  environment: Environment,
  filters: Filters,
};

const PreviousRange = Type.Object(Range.properties, {
  description: "The range of the same length just before `range`, used for the comparison.",
});

const Total = Type.Integer({
  minimum: 0,
  description: "How many rows there are across all pages.",
});

const NextCursor = nullable(
  Type.String({
    description: "Pass as `cursor` for the next page; null on the last page.",
  }),
);

function described(description: string) {
  return Type.Object(Compared.properties, { description });
}

export const StatsResponse = Type.Object(
  {
    data: Type.Object({
      visitors: described("Unique visitors."),
      sessions: described("Sessions."),
      pageviews: described("Pageviews."),
      pagesPerSession: described("Pageviews in sessions divided by sessions, to two decimals."),
      bounceRate: described(
        "The share of sessions with one pageview, from 0 to 1, to three decimals.",
      ),
      sessionDurationMs: described(
        "Average time from a session's first to last event, in milliseconds.",
      ),
    }),
    previousRange: PreviousRange,
    ...Scope,
  },
  { examples: [statsWeek] },
);
export type StatsResponse = Static<typeof StatsResponse>;

export const TimeseriesQuery = Type.Object({
  metric: Type.String({
    minLength: 1,
    description:
      "Required. A built-in metric (`visitors`, `sessions`, `pageviews`, `events`, `bounce_rate`, `session_duration`, `pages_per_session`, `time_on_page`, `scroll_depth`, `conversion_rate`) or `sum:prop.<key>` and `avg:prop.<key>` over a numeric prop. `conversion_rate` needs `filter[event]`.",
  }),
  interval: Type.Optional(
    Type.Union(Interval.anyOf, {
      description:
        "Bucket size: `hour` by default for a range of 24 hours or less, `day` otherwise.",
    }),
  ),
  compare: Type.Optional(
    Type.Literal("previous", {
      description: "Adds the previous range's value to each bucket as `previous`.",
    }),
  ),
});
export type TimeseriesQuery = Static<typeof TimeseriesQuery>;

export const TimeseriesPoint = Type.Object({
  bucket: Type.String({ format: "date-time", description: "Start of the bucket, in UTC." }),
  value: Type.Number({ description: "The metric in the bucket; 0 for an empty bucket." }),
  previous: Type.Optional(
    Type.Number({
      description:
        "The metric in the matching bucket of the previous range; only with `compare=previous`.",
    }),
  ),
});
export type TimeseriesPoint = Static<typeof TimeseriesPoint>;

export const TimeseriesResponse = Type.Object(
  {
    data: Type.Array(TimeseriesPoint, { description: "One point per bucket, oldest first." }),
    metric: Type.String({ minLength: 1, description: "The metric as requested." }),
    interval: Interval,
    previousRange: Type.Optional(
      Type.Object(Range.properties, {
        description: "The range the `previous` values cover; only with `compare=previous`.",
      }),
    ),
    ...Scope,
  },
  { examples: [timeseriesByDay] },
);
export type TimeseriesResponse = Static<typeof TimeseriesResponse>;

export const BreakdownQuery = Type.Object({
  metrics: Type.Optional(
    Type.String({
      minLength: 1,
      description:
        "Comma-separated metrics, the same names as `timeseries` takes; default `visitors,pageviews`, and for `page` also `bounce_rate,time_on_page`. Rows sort by the first two.",
    }),
  ),
});
export type BreakdownQuery = Static<typeof BreakdownQuery>;

export const BreakdownRow = Type.Object(
  {
    value: Type.String({ description: "The dimension value, such as a path or country code." }),
    visitors: Type.Optional(
      Type.Integer({ minimum: 0, description: "Unique visitors with this value." }),
    ),
    sessions: Type.Optional(Type.Integer({ minimum: 0, description: "Sessions with this value." })),
    pageviews: Type.Optional(
      Type.Integer({ minimum: 0, description: "Pageviews with this value." }),
    ),
    events: Type.Optional(
      Type.Integer({ minimum: 0, description: "Events other than pageviews." }),
    ),
    bounceRate: Type.Optional(
      Type.Number({
        minimum: 0,
        maximum: 1,
        description:
          "The share of sessions that saw this value and had one pageview, to three decimals.",
      }),
    ),
    avgTimeMs: Type.Optional(
      Type.Number({
        minimum: 0,
        description:
          "Average time to the session's next pageview, in milliseconds; the `time_on_page` metric.",
      }),
    ),
    timeOnPageMs: Type.Optional(Type.Number({ minimum: 0 })),
    scrollDepth: Type.Optional(
      Type.Number({
        minimum: 0,
        maximum: 1,
        description: "Average `scroll_depth` event as a share of the page, to three decimals.",
      }),
    ),
    pagesPerSession: Type.Optional(
      Type.Number({
        minimum: 0,
        description: "Pageviews in sessions divided by sessions, to two decimals.",
      }),
    ),
    conversionRate: Type.Optional(
      Type.Number({
        minimum: 0,
        maximum: 1,
        description: "The share of sessions with the `filter[event]` event, to three decimals.",
      }),
    ),
    share: Type.Optional(
      Type.Number({
        minimum: 0,
        maximum: 1,
        description: "This value's visitors as a share of all visitors in the range.",
      }),
    ),
  },
  {
    additionalProperties: Type.Number(),
    description:
      "One value of the dimension with the requested metrics. Custom metrics appear under their own name, such as `sum:prop.revenue`.",
  },
);
export type BreakdownRow = Static<typeof BreakdownRow>;

export const BreakdownResponse = Type.Object(
  {
    data: Type.Array(BreakdownRow),
    dimension: Type.String({ minLength: 1, description: "The dimension as requested." }),
    total: Type.Integer({
      minimum: 0,
      description: "How many distinct values the dimension has in the range.",
    }),
    nextCursor: NextCursor,
    ...Scope,
  },
  { examples: [breakdownPages] },
);
export type BreakdownResponse = Static<typeof BreakdownResponse>;

export const ProjectBreakdownRow = Type.Object(
  {
    ...BreakdownRow.properties,
    name: Type.String({ minLength: 1, description: "The project's display name." }),
    visibility: Visibility,
    change: Type.Record(Type.String(), nullable(Type.Number()), {
      description:
        "Each metric's change against the previous range, `(value - previous) / previous` to three decimals; null when the previous value was 0.",
    }),
    speedScore: nullable(
      Type.Integer({
        minimum: 0,
        maximum: 100,
        description:
          "The Real Experience Score over the range at p75 on all devices; null under 20 samples.",
      }),
    ),
    openIssues: nullable(
      Type.Integer({
        minimum: 0,
        description: "Open issues; null when you may not see this project's visitor-level data.",
      }),
    ),
  },
  { additionalProperties: Type.Number() },
);
export type ProjectBreakdownRow = Static<typeof ProjectBreakdownRow>;

export const ProjectBreakdownResponse = Type.Object({
  data: Type.Array(ProjectBreakdownRow, {
    description: "One row per readable project with traffic in the range.",
  }),
  dimension: Type.Literal("project"),
  total: Total,
  nextCursor: NextCursor,
  previousRange: PreviousRange,
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

export const VitalsBreakdownResponse = Type.Object(
  {
    data: Type.Array(VitalsRow),
    dimension: Type.Literal("web_vital"),
    percentile: Percentile,
    minSamples: Count,
    total: Total,
    nextCursor: NextCursor,
    ...Scope,
  },
  { examples: [vitalsPages] },
);
export type VitalsBreakdownResponse = Static<typeof VitalsBreakdownResponse>;

export const RealtimeResponse = Type.Object(
  {
    data: Type.Object({
      visitors: Type.Integer({
        minimum: 0,
        description: "Unique human visitors in the last five minutes.",
      }),
      pageviewsPerMinute: Type.Number({
        minimum: 0,
        description: "Pageviews in the last five minutes divided by five, to one decimal.",
      }),
      pages: Type.Array(ValueCount, { description: "The top 10 paths by visitors." }),
      countries: Type.Array(ValueCount, {
        description: "The top 10 country codes by visitors.",
      }),
    }),
    window: Type.Object(Range.properties, { description: "The five minutes counted." }),
    visitors: Type.Optional(
      Type.Array(ActiveVisitor, {
        description: "The active visitors; only with `include=visitors` and `detail` access.",
      }),
    ),
  },
  { examples: [realtimeNow] },
);
export type RealtimeResponse = Static<typeof RealtimeResponse>;

export const PathDirection = oneOf(["next", "previous"], {
  description:
    "`next` (the default) lists the pages viewed right after `page`, `previous` the ones right before it.",
});
export type PathDirection = Static<typeof PathDirection>;

export const PathStep = Type.Object({
  path: Type.String({ description: "The page viewed next to `page`." }),
  count: Type.Integer({
    minimum: 0,
    description:
      "How many views of `page` it came right after, or with `direction=previous` right before.",
  }),
  share: Type.Number({
    minimum: 0,
    maximum: 1,
    description: "`count` as a share of `views`, to three decimals.",
  }),
});
export type PathStep = Static<typeof PathStep>;

export const PathsResponse = Type.Object(
  {
    data: Type.Array(PathStep, { description: "Most frequent first." }),
    page: Type.String({ minLength: 1, description: "The page path as requested." }),
    direction: PathDirection,
    views: Type.Integer({ minimum: 0, description: "Views of `page` in sessions in the range." }),
    dropOff: Type.Object(
      {
        count: Type.Integer({ minimum: 0, description: "How many views ended or started there." }),
        share: Ratio,
      },
      {
        description:
          "Views of `page` that ended the session, or with `direction=previous` that started it.",
      },
    ),
    total: Type.Integer({ minimum: 0, description: "How many distinct pages there are." }),
    nextCursor: NextCursor,
    ...Scope,
  },
  { examples: [pathsNext] },
);
export type PathsResponse = Static<typeof PathsResponse>;

export const RetentionInterval = oneOf(["week", "month"], {
  description: "Cohort size: `week` (the default, starting Monday) or `month`, in UTC.",
});
export type RetentionInterval = Static<typeof RetentionInterval>;

export const RetentionCohort = Type.Object({
  cohort: Type.String({
    format: "date-time",
    description: "Start of the week or month of these visitors' first visit in the range.",
  }),
  visitors: Type.Integer({ minimum: 0, description: "Visitors in the cohort." }),
  periods: Type.Array(
    Type.Object({
      offset: Type.Integer({
        minimum: 0,
        description: "Periods after the cohort; 0 is the cohort's own period.",
      }),
      visitors: Type.Integer({ minimum: 0, description: "Cohort visitors active in it." }),
      share: Type.Number({
        minimum: 0,
        maximum: 1,
        description: "`visitors` as a share of the cohort, to three decimals; 1 at offset 0.",
      }),
    }),
    { description: "Each period from the cohort up to the end of the range." },
  ),
});
export type RetentionCohort = Static<typeof RetentionCohort>;

export const RetentionResponse = Type.Object(
  {
    data: Type.Array(RetentionCohort),
    interval: RetentionInterval,
    ...Scope,
  },
  { examples: [retentionWeekly] },
);
export type RetentionResponse = Static<typeof RetentionResponse>;

export const LifecycleInterval = oneOf(["day", "week", "month"], {
  description: "Period size in UTC: `day`, `week` (the default, starting Monday) or `month`.",
});
export type LifecycleInterval = Static<typeof LifecycleInterval>;

export const LifecyclePeriod = Type.Object({
  period: Type.String({ format: "date-time", description: "Start of the period." }),
  new: Type.Integer({ minimum: 0, description: "Visitors first seen in this period." }),
  returning: Type.Integer({
    minimum: 0,
    description: "Visitors active in this period and the one before.",
  }),
  resurrected: Type.Integer({
    minimum: 0,
    description: "Visitors seen before, not in the period before, and back in this one.",
  }),
  dormant: Type.Integer({
    minimum: 0,
    description: "Visitors active in the period before but not in this one.",
  }),
});
export type LifecyclePeriod = Static<typeof LifecyclePeriod>;

export const LifecycleResponse = Type.Object({
  data: Type.Array(LifecyclePeriod),
  interval: LifecycleInterval,
  ...Scope,
});
export type LifecycleResponse = Static<typeof LifecycleResponse>;

export const StickinessRow = Type.Object({
  days: Type.Integer({ minimum: 1, description: "Distinct UTC days active in the range." }),
  visitors: Type.Integer({ minimum: 0, description: "Visitors active on exactly that many days." }),
  share: Type.Number({
    minimum: 0,
    maximum: 1,
    description: "`visitors` as a share of all visitors, to three decimals.",
  }),
});
export type StickinessRow = Static<typeof StickinessRow>;

export const StickinessResponse = Type.Object({
  data: Type.Array(StickinessRow, {
    description: "One row per day count, from 1 to the most any visitor reached, zero-filled.",
  }),
  visitors: Type.Integer({ minimum: 0, description: "All visitors in the range." }),
  averageDays: Type.Number({
    minimum: 0,
    description: "Average active days per visitor, to two decimals.",
  }),
  ...Scope,
});
export type StickinessResponse = Static<typeof StickinessResponse>;

export const HeatmapMetric = oneOf(["visitors", "pageviews"], {
  description: "What each cell counts: `visitors` (the default) or `pageviews`.",
});
export type HeatmapMetric = Static<typeof HeatmapMetric>;

export const HeatmapCell = Type.Object({
  weekday: Type.Integer({ minimum: 1, maximum: 7, description: "1 is Monday, 7 is Sunday." }),
  hour: Type.Integer({ minimum: 0, maximum: 23, description: "Hour of the day in `timezone`." }),
  value: Type.Integer({
    minimum: 0,
    description: "Unique visitors or pageviews in that hour, by `metric`.",
  }),
});
export type HeatmapCell = Static<typeof HeatmapCell>;

export const HeatmapResponse = Type.Object(
  {
    data: Type.Array(HeatmapCell, {
      description: "All 168 cells, Monday 0:00 first; empty cells are 0.",
    }),
    metric: HeatmapMetric,
    timezone: Type.String({ minLength: 1, description: "The IANA time zone the hours are in." }),
    ...Scope,
  },
  { examples: [heatmapAmsterdam] },
);
export type HeatmapResponse = Static<typeof HeatmapResponse>;

export const MapLevel = oneOf(["country", "region", "city"], {
  description: "What a place is: `country` (the default), `region` or `city`.",
});
export type MapLevel = Static<typeof MapLevel>;

export const MapPlace = Type.Object({
  country: Type.String({
    minLength: 2,
    maxLength: 2,
    description: "ISO 3166-1 alpha-2 country code.",
  }),
  region: nullable(Type.String({ description: "Null at the `country` level." })),
  city: nullable(Type.String({ description: "Null unless the level is `city`." })),
  latitude: nullable(
    Type.Number({
      minimum: -90,
      maximum: 90,
      description: "Average latitude of the place's lookups, to two decimals.",
    }),
  ),
  longitude: nullable(
    Type.Number({
      minimum: -180,
      maximum: 180,
      description: "Average longitude of the place's lookups, to two decimals.",
    }),
  ),
  visitors: Type.Integer({ minimum: 0, description: "Unique visitors from the place." }),
  share: Type.Number({
    minimum: 0,
    maximum: 1,
    description: "`visitors` as a share of all visitors in the range, to three decimals.",
  }),
});
export type MapPlace = Static<typeof MapPlace>;

export const MapResponse = Type.Object(
  {
    data: Type.Array(MapPlace, { description: "Most visitors first." }),
    level: MapLevel,
    total: Type.Integer({ minimum: 0, description: "How many places there are." }),
    nextCursor: NextCursor,
    ...Scope,
  },
  { examples: [mapCities] },
);
export type MapResponse = Static<typeof MapResponse>;

export const LiveEvent = Type.Object({
  id: Id,
  project: Type.String({ minLength: 1, description: "The project id." }),
  name: EventName,
  ts: Timestamp,
  path: nullable(Type.String()),
  country: nullable(
    Type.String({ minLength: 2, maxLength: 2, description: "ISO 3166-1 alpha-2 country code." }),
  ),
  device: DeviceType,
  visitor: Type.Optional(Type.String({ ...Id, description: "Only with `detail` access." })),
  session: Type.Optional(Type.String({ ...Id, description: "Only with `detail` access." })),
});
export type LiveEvent = Static<typeof LiveEvent>;

export const LiveEvents = Type.Object(
  {
    data: Type.Array(LiveEvent),
    nextCursor: Type.String({
      minLength: 1,
      description: "Pass as `after` on the next poll to get only newer events.",
    }),
  },
  { examples: [liveDetail] },
);
export type LiveEvents = Static<typeof LiveEvents>;
