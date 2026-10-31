"use client";

import type { ProjectScope } from "@spoar/client";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { Link } from "@/shared/ui/link";

import { useReadOf } from "@/shared/query/read";
import type { Prefetchable } from "@/shared/query/read";

import { metricPath, metricViews } from "../metrics";
import { statsQuery, timeseriesQuery } from "../queries";
import type { MetricView } from "../metrics";
import { viewQuery } from "../view-state";
import type { ViewState } from "../view-state";
import { AnimatedNumber } from "./animated-number";
import { ChangeBadge } from "./change-badge";
import { Sparkline } from "./sparkline";

type Props = {
  scope: ProjectScope;
  state: ViewState;
  base: string;
  current: MetricView;
};

const railIntervalMs = 30_000;

const polling = { refetchInterval: railIntervalMs, staleTime: railIntervalMs };

/**
 * @name railReads
 * @description The metric rail's reads on a scope: the stats and one sparkline series per metric,
 * for warming the cache before a navigation.
 *
 * @example
 * prefetchReads(queryClient, railReads(scope));
 */
export function railReads(scope: ProjectScope): Prefetchable[] {
  return [statsQuery(scope), ...metricViews.map((view) => timeseriesQuery(scope, view.series))];
}

function RailSkeleton() {
  return (
    <div className="rail" aria-hidden="true">
      {metricViews.map((view) => (
        <div key={view.slug} className="skeleton h-[116px]" />
      ))}
    </div>
  );
}

export function MetricRail({ scope, state, base, current }: Props) {
  const stats = useReadOf(statsQuery(scope), polling);
  const sparklines = useQueries({
    queries: metricViews.map((view) => ({
      ...timeseriesQuery(scope, view.series),
      placeholderData: keepPreviousData,
      ...polling,
    })),
  });
  if (stats.data === undefined) return <RailSkeleton />;
  const data = stats.data.ok ? stats.data.value.data : null;

  return (
    <nav aria-label="Metrics" className="rail">
      {metricViews.map((view, index) => {
        const stat = data?.[view.stat];
        const sparkline = sparklines[index]?.data;
        const selected = view.slug === current.slug;
        return (
          <Link
            key={view.slug}
            href={`${metricPath(base, view)}${viewQuery(state)}`}
            aria-current={selected ? "page" : undefined}
            className="metric-card"
          >
            <span className="metric-head">
              <span className="metric-label text-sm">{view.label}</span>
              <ChangeBadge change={stat?.change ?? null} lowerIsBetter={view.lowerIsBetter} />
            </span>
            {stat ? (
              <AnimatedNumber value={stat.value} format={view.format} className="metric-value" />
            ) : (
              <span className="metric-value">–</span>
            )}
            <Sparkline points={sparkline?.ok ? sparkline.value.data : []} />
          </Link>
        );
      })}
    </nav>
  );
}
