"use client";

import type { StatsResponse, TimeseriesPoint } from "@spoar/contract";
import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { browserClient } from "@/shared/api/browser-client";

import { metricPath, metricViews } from "../metrics";
import type { MetricView } from "../metrics";
import { viewScope } from "../scope";
import { viewQuery } from "../view-state";
import type { ViewState } from "../view-state";
import { AnimatedNumber } from "./animated-number";
import { ChangeBadge } from "./change-badge";
import { Sparkline } from "./sparkline";

export type RailData = {
  stats: StatsResponse["data"] | null;
  sparklines: { [slug: string]: TimeseriesPoint[] };
};

type Props = {
  project: string;
  state: ViewState;
  base: string;
  current: MetricView;
  initial: RailData;
  renderedAt: number;
};

const railIntervalMs = 30_000;

export function MetricRail({ project, state, base, current, initial, renderedAt }: Props) {
  const scope = viewScope(browserClient(), project, state);
  const polling = {
    refetchInterval: railIntervalMs,
    staleTime: railIntervalMs,
    initialDataUpdatedAt: renderedAt,
  };
  const stats = useQuery({
    queryKey: scope.key("stats"),
    queryFn: async () => {
      const read = await scope.stats();
      return read.ok ? read.value.data : null;
    },
    initialData: initial.stats,
    ...polling,
  });
  const sparklines = useQueries({
    queries: metricViews.map((view) => ({
      queryKey: scope.key("timeseries", view.series),
      queryFn: async () => {
        const read = await scope.timeseries(view.series);
        return read.ok ? read.value.data : null;
      },
      initialData: initial.sparklines[view.slug] ?? null,
      ...polling,
    })),
  });

  return (
    <nav aria-label="Metrics" className="rail">
      {metricViews.map((view, index) => {
        const stat = stats.data?.[view.stat];
        const selected = view.slug === current.slug;
        return (
          <Link
            key={view.slug}
            href={`${metricPath(base, view)}${viewQuery(state)}`}
            aria-current={selected ? "page" : undefined}
            className="metric-card"
            prefetch={false}
          >
            <span className="metric-label text-sm">{view.label}</span>
            <span className="flex items-baseline gap-2">
              {stat ? (
                <AnimatedNumber value={stat.value} format={view.format} className="metric-value" />
              ) : (
                <span className="metric-value">–</span>
              )}
              <ChangeBadge change={stat?.change ?? null} lowerIsBetter={view.lowerIsBetter} />
            </span>
            <Sparkline points={sparklines[index]?.data ?? []} />
          </Link>
        );
      })}
    </nav>
  );
}
