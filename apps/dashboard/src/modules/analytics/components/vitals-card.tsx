import type { MetricSummary, SpeedResponse } from "@spoar/contract";
import { Fragment } from "react";
import { Link } from "@/shared/ui/link";

import { formatMetric } from "../format";
import { rateScore, ratingLabels, vitalSummary, vitalViews } from "../speed";

type Props = { data: SpeedResponse["data"] | null; href: string };

type Shares = MetricSummary["shares"];

const shown = vitalViews.filter((view) => ["lcp", "inp", "cls"].includes(view.slug));
const tones = ["good", "needsImprovement", "poor"] as const satisfies readonly (keyof Shares)[];
const columns = 17;
const rows = 2;

function dotCounts(shares: Shares) {
  const total = tones.reduce((sum, tone) => sum + shares[tone], 0);
  if (total === 0) return null;
  const counts = tones.map((tone) => {
    const count = Math.round((shares[tone] / total) * columns);
    return shares[tone] > 0 ? Math.max(count, 1) : count;
  });
  const largest = counts.indexOf(Math.max(...counts));
  counts[largest] =
    (counts[largest] ?? 0) + columns - counts.reduce((sum, count) => sum + count, 0);
  return counts;
}

function columnPath(from: number, to: number) {
  let path = "";
  for (let column = from; column < to; column += 1) {
    for (let row = 0; row < rows; row += 1) path += `M${column + 0.5} ${row + 0.5}h0`;
  }
  return path;
}

function DotMeter({ shares }: { shares: Shares | null }) {
  const counts = shares ? dotCounts(shares) : null;
  let start = 0;
  return (
    <svg
      className="vital-dots"
      viewBox={`0 0 ${columns} ${rows}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {counts ? (
        tones.map((tone, index) => {
          const from = start;
          start += counts[index] ?? 0;
          return from < start ? (
            <path key={tone} d={columnPath(from, start)} className={`dots-${tone}`} />
          ) : null;
        })
      ) : (
        <path d={columnPath(0, columns)} className="dots-empty" />
      )}
    </svg>
  );
}

export function VitalsCard({ data, href }: Props) {
  const score = data?.score ?? null;
  const rating = score === null ? null : rateScore(score);
  return (
    <Link href={href} className="metric-card">
      <span className="metric-head">
        <span className="metric-label text-sm">Core Web Vitals</span>
        {score !== null && rating !== null ? (
          <span
            className={`rating rating-${rating}`}
            title={`Real Experience Score: ${ratingLabels[rating]}`}
          >
            Score {score}
          </span>
        ) : null}
      </span>
      <span className="vitals-meter">
        {shown.map((view) => {
          const summary = data ? vitalSummary(data, view.slug) : null;
          const value = summary?.value ?? null;
          return (
            <Fragment key={view.slug}>
              <span className="vitals-name" title={view.label}>
                {view.short}
              </span>
              <DotMeter shares={summary?.shares ?? null} />
              <span className="vitals-value">
                {value === null ? "–" : formatMetric(value, view.format)}
              </span>
            </Fragment>
          );
        })}
      </span>
    </Link>
  );
}
