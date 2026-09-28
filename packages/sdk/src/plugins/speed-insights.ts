import { noop } from "@remcostoeten/analytics-shared/noop";
import type {
  CLSMetricWithAttribution,
  FCPMetricWithAttribution,
  INPMetricWithAttribution,
  LCPMetricWithAttribution,
  TTFBMetricWithAttribution,
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
} from "web-vitals/attribution";

import { definePlugin } from "../core/plugin-host";
import type { Props } from "../core/types";

type Measured =
  | CLSMetricWithAttribution
  | FCPMetricWithAttribution
  | INPMetricWithAttribution
  | LCPMetricWithAttribution
  | TTFBMetricWithAttribution;

type Connection = { effectiveType?: string };

type Vitals = {
  onCLS: typeof onCLS;
  onFCP: typeof onFCP;
  onINP: typeof onINP;
  onLCP: typeof onLCP;
  onTTFB: typeof onTTFB;
};

export type SpeedOptions = {
  sampleRate?: number;
  random?: () => number;
  load?: () => Promise<Vitals>;
};

const flushAt = 6;

function selector(metric: Measured): string | null {
  switch (metric.name) {
    case "LCP":
      return metric.attribution.target ?? null;
    case "INP":
      return metric.attribution.interactionTarget || null;
    case "CLS":
      return metric.attribution.largestShiftTarget ?? null;
    default:
      return null;
  }
}

/**
 * @name speedProps
 * @description Turns a web-vitals metric into `web_vital` props: the metric, its web-vitals `id`
 * (so updates to INP and CLS replace earlier reports), the value rounded (CLS to 4 decimals,
 * the rest to whole milliseconds), rating, navigation type, connection, the attribution selector
 * and the sample rate.
 *
 * @example
 * speedProps(metric, 0.5, "4g");
 */
export function speedProps(metric: Measured, sampleRate: number, connection: string | null): Props {
  const value =
    metric.name === "CLS" ? Math.round(metric.value * 10_000) / 10_000 : Math.round(metric.value);
  return {
    metric: metric.name.toLowerCase(),
    id: metric.id,
    value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    connection,
    selector: selector(metric),
    sampleRate,
  };
}

/**
 * @name speedInsights
 * @description Real-user Core Web Vitals: lazy-loads the `web-vitals` attribution build and
 * records LCP, INP, CLS, FCP and TTFB for the hard navigation. Sampling is decided once per page
 * load. Metrics are buffered and sent together, credited to the path the page loaded with, when
 * the tab is hidden, the route changes or 6 metrics are waiting.
 *
 * @example
 * createAnalytics({ ...config, plugins: [speedInsights({ sampleRate: 0.5 })] });
 */
export function speedInsights(options: SpeedOptions = {}) {
  return definePlugin({
    name: "speed-insights",
    setup: (client) => {
      const sampleRate = options.sampleRate ?? 1;
      if (typeof window === "undefined" || (options.random ?? Math.random)() >= sampleRate) {
        return noop;
      }
      const path = location.pathname;
      const route = client.status().route;
      const connection =
        (navigator as Navigator & { connection?: Connection }).connection?.effectiveType ?? null;
      let buffer: Props[] = [];
      let stopped = false;
      function send() {
        const pending = buffer;
        buffer = [];
        for (const props of pending)
          client.record(path, "web_vital", route ? { ...props, route } : props);
        return pending.length > 0;
      }
      function add(metric: Measured) {
        buffer.push(speedProps(metric, sampleRate, connection));
        if (buffer.length >= flushAt && send()) void client.flush();
      }
      void (options.load ?? (() => import("web-vitals/attribution")))().then((vitals) => {
        if (stopped) return;
        vitals.onLCP(add);
        vitals.onINP(add);
        vitals.onCLS(add);
        vitals.onFCP(add);
        vitals.onTTFB(add);
      });
      const removers = [
        client.onHidden(send),
        client.onPage(() => {
          if (send()) void client.flush();
        }),
      ];
      return () => {
        stopped = true;
        for (const remove of removers) remove();
      };
    },
  });
}
