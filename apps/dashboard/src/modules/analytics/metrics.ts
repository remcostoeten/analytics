import type { StatsResponse } from "@spoar/contract";

export type MetricFormat = "count" | "percent" | "duration";

export type CountMetric = "visitors" | "pageviews" | "sessions";

export type MetricView = {
  slug: string;
  label: string;
  stat: keyof StatsResponse["data"];
  series: "visitors" | "pageviews" | "sessions" | "bounce_rate" | "session_duration";
  format: MetricFormat;
  lowerIsBetter: boolean;
  count: CountMetric;
  description: string;
};

export const metricViews = [
  {
    slug: "visitors",
    label: "Visitors",
    stat: "visitors",
    series: "visitors",
    format: "count",
    lowerIsBetter: false,
    count: "visitors",
    description: "Unique visitors in the range. One visitor can have several sessions.",
  },
  {
    slug: "pageviews",
    label: "Page views",
    stat: "pageviews",
    series: "pageviews",
    format: "count",
    lowerIsBetter: false,
    count: "pageviews",
    description: "Every page load and client-side navigation that sent a pageview.",
  },
  {
    slug: "sessions",
    label: "Sessions",
    stat: "sessions",
    series: "sessions",
    format: "count",
    lowerIsBetter: false,
    count: "sessions",
    description: "A session ends after 30 minutes without an event, or when the tab closes.",
  },
  {
    slug: "bounce-rate",
    label: "Bounce rate",
    stat: "bounceRate",
    series: "bounce_rate",
    format: "percent",
    lowerIsBetter: true,
    count: "sessions",
    description: "The share of sessions with a single pageview.",
  },
  {
    slug: "duration",
    label: "Visit duration",
    stat: "sessionDurationMs",
    series: "session_duration",
    format: "duration",
    lowerIsBetter: false,
    count: "sessions",
    description: "Average time from a session's first event to its last.",
  },
] as const satisfies readonly MetricView[];

/**
 * @name metricView
 * @description The metric a URL slug names, or the first metric for an unknown slug.
 *
 * @example
 * metricView("bounce-rate").series; // "bounce_rate"
 */
export function metricView(slug: string | undefined): MetricView {
  return metricViews.find((view) => view.slug === slug) ?? metricViews[0];
}
