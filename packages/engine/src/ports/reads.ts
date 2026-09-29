import type { Result } from "@remcostoeten/analytics-shared/result";
import type { ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { Dimension } from "../define";
import type { EngineError } from "../errors";

export type Traffic = "human" | "bots" | "internal" | "all";
export type Interval = "hour" | "day" | "week" | "month";

export type ReadFilter = {
  dimension: Dimension;
  value: string;
  exclude: boolean;
};

export type ReadScope = {
  projectIds: ProjectID[];
  from: Date;
  to: Date;
  traffic: Traffic;
  filters: ReadFilter[];
};

export type BuiltInMetric =
  | "visitors"
  | "sessions"
  | "pageviews"
  | "events"
  | "bounce_rate"
  | "session_duration"
  | "pages_per_session"
  | "time_on_page"
  | "scroll_depth"
  | "conversion_rate";

export type Metric =
  | { kind: "built-in"; name: BuiltInMetric }
  | { kind: "sum" | "avg"; name: string; key: string };

export type Headline = {
  visitors: number;
  sessions: number;
  pageviews: number;
  pagesPerSession: number;
  bounceRate: number;
  sessionDurationMs: number;
};

export type Bucket = { bucket: Date; value: number };

export type BreakdownPage = {
  rows: { value: string; metrics: number[]; visitors: number }[];
  total: number;
  scopeVisitors: number;
};

export type Realtime = {
  visitors: number;
  pageviews: number;
  pages: { value: string; visitors: number }[];
  countries: { value: string; visitors: number }[];
};

export type PathDirection = "next" | "previous";

export type Paths = {
  views: number;
  dropOff: number;
  steps: { path: string; count: number }[];
};

export type Cohort = {
  cohort: Date;
  lastOffset: number;
  periods: { offset: number; visitors: number }[];
};

export type LifecycleInterval = "day" | "week" | "month";

export type LifecyclePeriod = {
  period: Date;
  new: number;
  returning: number;
  resurrected: number;
  dormant: number;
};

export type ActiveDays = { days: number; visitors: number };

export type HeatMetric = "visitors" | "pageviews";

export type HeatCell = { weekday: number; hour: number; value: number };

export type MapLevel = "country" | "region" | "city";

export type Place = {
  country: string;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  visitors: number;
};

export type PlacesPage = { rows: Place[]; total: number; scopeVisitors: number };

type Read<Value> = Promise<Result<Value, EngineError>>;

export type ReadStore = {
  headline: (scope: ReadScope) => Read<Headline>;
  timeseries: (scope: ReadScope, metric: Metric, interval: Interval) => Read<Bucket[]>;
  breakdown: (
    scope: ReadScope,
    dimension: Dimension,
    metrics: Metric[],
    page: { limit: number; offset: number },
  ) => Read<BreakdownPage>;
  realtime: (projectIds: ProjectID[], from: Date, to: Date) => Read<Realtime>;
  paths: (scope: ReadScope, page: string, direction: PathDirection) => Read<Paths>;
  retention: (scope: ReadScope, interval: "week" | "month") => Read<Cohort[]>;
  lifecycle: (scope: ReadScope, interval: LifecycleInterval) => Read<LifecyclePeriod[]>;
  stickiness: (scope: ReadScope) => Read<ActiveDays[]>;
  heatmap: (scope: ReadScope, metric: HeatMetric, timezone: string) => Read<HeatCell[]>;
  places: (
    scope: ReadScope,
    level: MapLevel,
    page: { limit: number; offset: number },
  ) => Read<PlacesPage>;
};
