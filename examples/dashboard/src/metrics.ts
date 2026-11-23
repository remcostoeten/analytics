import type { StatsResponse } from "@spoar/client";

import { formatCount, formatDuration, formatPercent } from "./format";

export type MetricKey = "visitors" | "sessions" | "pageviews" | "bounce_rate" | "session_duration";

export type Metric = {
  key: MetricKey;
  label: string;
  stat: keyof StatsResponse["data"];
  format: (value: number) => string;
  invert?: boolean;
};

export const metrics: Metric[] = [
  { key: "visitors", label: "Visitors", stat: "visitors", format: formatCount },
  { key: "sessions", label: "Sessions", stat: "sessions", format: formatCount },
  { key: "pageviews", label: "Pageviews", stat: "pageviews", format: formatCount },
  {
    key: "bounce_rate",
    label: "Bounce rate",
    stat: "bounceRate",
    format: formatPercent,
    invert: true,
  },
  {
    key: "session_duration",
    label: "Session duration",
    stat: "sessionDurationMs",
    format: formatDuration,
  },
];
