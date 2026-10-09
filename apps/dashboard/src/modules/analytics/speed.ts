import type { SpeedDevice, SpeedResponse, VitalMetric, VitalRating } from "@spoar/contract";

import type { MetricFormat } from "./metrics";
import { dimensions } from "./view-state";
import type { FilterDimension, ViewFilters, ViewState } from "./view-state";

export type VitalView = {
  slug: VitalMetric;
  short: string;
  label: string;
  format: MetricFormat;
  good: number;
  poor: number;
  scored: boolean;
  description: string;
};

export type SpeedFilters = Pick<ViewFilters, "route" | "page" | "country">;

export const vitalViews = [
  {
    slug: "lcp",
    short: "LCP",
    label: "Largest Contentful Paint",
    format: "millis",
    good: 2500,
    poor: 4000,
    scored: true,
    description: "How long the largest image or text block takes to render after navigation.",
  },
  {
    slug: "inp",
    short: "INP",
    label: "Interaction to Next Paint",
    format: "millis",
    good: 200,
    poor: 500,
    scored: true,
    description: "The slowest response to a click, tap or key press over the whole page visit.",
  },
  {
    slug: "cls",
    short: "CLS",
    label: "Cumulative Layout Shift",
    format: "shift",
    good: 0.1,
    poor: 0.25,
    scored: true,
    description: "How much the layout moves without being asked to, summed over the visit.",
  },
  {
    slug: "fcp",
    short: "FCP",
    label: "First Contentful Paint",
    format: "millis",
    good: 1800,
    poor: 3000,
    scored: true,
    description: "How long until the first text or image renders after navigation.",
  },
  {
    slug: "ttfb",
    short: "TTFB",
    label: "Time to First Byte",
    format: "millis",
    good: 800,
    poor: 1800,
    scored: false,
    description: "How long the server takes to start answering. Shown but not scored.",
  },
] as const satisfies readonly VitalView[];

export const speedFilterDimensions = [
  "route",
  "page",
  "country",
  "device",
] as const satisfies readonly FilterDimension[];

export const ratingLabels: { [Rating in VitalRating]: string } = {
  good: "Good",
  "needs-improvement": "Needs improvement",
  poor: "Poor",
};

/**
 * @name vitalView
 * @description The Web Vital a URL slug names, or LCP for an unknown slug.
 *
 * @example
 * vitalView("inp").good; // 200
 */
export function vitalView(slug: string | undefined): VitalView {
  return vitalViews.find((view) => view.slug === slug) ?? vitalViews[0];
}

/**
 * @name rateVital
 * @description Google's Core Web Vitals rating of one value: `good` up to the good threshold,
 * `poor` above the poor threshold, `needs-improvement` in between.
 *
 * @example
 * rateVital(vitalView("lcp"), 2710); // "needs-improvement"
 */
export function rateVital(view: VitalView, value: number): VitalRating {
  if (value <= view.good) return "good";
  return value <= view.poor ? "needs-improvement" : "poor";
}

/**
 * @name rateScore
 * @description The band of a Real Experience Score: 90 and up good, 50 to 89 needs improvement,
 * under 50 poor.
 *
 * @example
 * rateScore(72); // "needs-improvement"
 */
export function rateScore(score: number): VitalRating {
  if (score >= 90) return "good";
  return score >= 50 ? "needs-improvement" : "poor";
}

/**
 * @name speedFilters
 * @description The filters of a view the speed routes accept as `filter[...]`: route, path and
 * country. The device filter becomes their `device` parameter, and the others answer 400 there,
 * so they are left out.
 *
 * @example
 * speedFilters({ route: "/blog/[slug]", browser: "Firefox" }); // { route: "/blog/[slug]" }
 */
export function speedFilters(filters: ViewFilters): SpeedFilters {
  const kept: SpeedFilters = {};
  for (const dimension of speedFilterDimensions) {
    const value = filters[dimension];
    if (value && dimension !== "device") kept[dimension] = value;
  }
  return kept;
}

/**
 * @name unsupportedSpeedFilters
 * @description The dimensions a view filters on that the speed routes ignore, so the chips can
 * say so.
 *
 * @example
 * unsupportedSpeedFilters(state); // ["browser"]
 */
export function unsupportedSpeedFilters(state: ViewState): FilterDimension[] {
  return dimensions
    .map((entry) => entry.value)
    .filter(
      (dimension) =>
        state.filters[dimension] !== undefined &&
        !speedFilterDimensions.some((kept) => kept === dimension),
    );
}

/**
 * @name speedInterval
 * @description The bucket size for a speed series: hours for the last 24 hours, days otherwise,
 * since hourly buckets cover at most 7 days.
 *
 * @example
 * speedInterval("24h"); // "hour"
 */
export function speedInterval(period: ViewState["period"]) {
  return period === "24h" ? "hour" : "day";
}

/**
 * @name vitalSummary
 * @description One metric's summary out of the speed response.
 *
 * @example
 * vitalSummary(speed.data, "lcp").value;
 */
export function vitalSummary(data: SpeedResponse["data"], metric: VitalMetric) {
  return data.metrics[metric];
}

export const speedDevices = [
  { value: "all", label: "All devices" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
] as const satisfies readonly { value: SpeedDevice; label: string }[];

/**
 * @name speedDevice
 * @description The speed routes' `device` for a view's device-type filter: desktop stays desktop,
 * mobile and tablet count as mobile (the API groups them), and no filter or an excluded value
 * means all.
 *
 * @example
 * speedDevice({ device: "tablet" }); // "mobile"
 */
export function speedDevice(filters: ViewFilters): SpeedDevice {
  const value = filters.device;
  if (value === "desktop") return "desktop";
  return value === "mobile" || value === "tablet" ? "mobile" : "all";
}
