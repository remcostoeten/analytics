import type { StatsResponse, TimeseriesPoint } from "@spoar/contract";
import Link from "next/link";

import { TrendIcon } from "@/shared/ui/icons";

import { formatChange, formatMetric } from "../format";
import { metricViews } from "../metrics";
import type { MetricView } from "../metrics";
import { Sparkline } from "./sparkline";

type Props = {
  stats: StatsResponse["data"] | null;
  sparklines: Map<string, TimeseriesPoint[]>;
  current: MetricView;
  hrefFor: (view: MetricView) => string;
};

export function MetricRail({ stats, sparklines, current, hrefFor }: Props) {
  return (
    <nav aria-label="Metrics" className="grid gap-2">
      {metricViews.map((view) => {
        const stat = stats?.[view.stat];
        const change = stat ? formatChange(stat.change) : null;
        const rising = (stat?.change ?? 0) >= 0;
        const good = view.lowerIsBetter ? !rising : rising;
        const selected = view.slug === current.slug;
        return (
          <Link
            key={view.slug}
            href={hrefFor(view)}
            aria-current={selected ? "page" : undefined}
            className="metric-card"
            prefetch={false}
          >
            <span className="metric-label text-sm">{view.label}</span>
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {stat ? formatMetric(stat.value, view.format) : "–"}
              </span>
              {change ? (
                <span
                  className={`flex items-center gap-0.5 text-xs ${good ? "text-ok" : "text-err"}`}
                >
                  <TrendIcon down={!rising} className="size-3" />
                  {change}
                </span>
              ) : null}
            </span>
            <Sparkline points={sparklines.get(view.slug) ?? []} />
          </Link>
        );
      })}
    </nav>
  );
}
