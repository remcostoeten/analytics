import type { SpeedResponse } from "@spoar/contract";
import Link from "next/link";

import { formatMetric } from "../format";
import { rateScore, vitalSummary, vitalViews } from "../speed";
import type { VitalView } from "../speed";
import { RatingBadge } from "./rating-badge";
import { ShareBar } from "./share-bar";

type Props = {
  data: SpeedResponse["data"] | null;
  current: VitalView;
  hrefFor: (view: VitalView) => string;
};

export function VitalsRail({ data, current, hrefFor }: Props) {
  const score = data?.score ?? null;
  return (
    <nav aria-label="Web Vitals" className="rail">
      <div className="metric-card metric-static">
        <span className="metric-label text-sm">Real Experience Score</span>
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {score === null ? "–" : score}
          </span>
          {score !== null ? <RatingBadge rating={rateScore(score)} /> : null}
        </span>
        <span className="text-xs text-muted">
          {data ? `${formatMetric(data.samples, "count")} samples` : "No samples in this range"}
        </span>
      </div>
      {vitalViews.map((view) => {
        const summary = data ? vitalSummary(data, view.slug) : null;
        const selected = view.slug === current.slug;
        return (
          <Link
            key={view.slug}
            href={hrefFor(view)}
            aria-current={selected ? "page" : undefined}
            className="metric-card"
            prefetch={false}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="metric-label text-sm">{view.short}</span>
              <span className="text-xs text-muted">{view.label}</span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {summary?.value === null || summary === null
                  ? "–"
                  : formatMetric(summary.value, view.format)}
              </span>
              {summary ? <RatingBadge rating={summary.rating} /> : null}
            </span>
            {summary ? (
              <ShareBar shares={summary.shares} />
            ) : (
              <span className="share-bar" aria-hidden="true" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
