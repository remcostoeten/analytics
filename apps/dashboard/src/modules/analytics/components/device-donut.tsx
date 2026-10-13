import type { BreakdownRow } from "@spoar/contract";
import { Link } from "@/shared/ui/link";

import { formatDimensionValue, formatMetric } from "../format";

type Props = { rows: BreakdownRow[]; hrefFor: (value: string) => string };

const radius = 15.915;
const sliceLimit = 5;

export function DeviceDonut({ rows, hrefFor }: Props) {
  const slices = rows.slice(0, sliceLimit).map((row) => ({
    value: row.value,
    count: row.pageviews ?? 0,
  }));
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  let offset = 0;
  return (
    <div className="grid gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
        {slices.map((slice, order) => (
          <li key={slice.value}>
            <Link href={hrefFor(slice.value)} className="flex items-center gap-1.5 hover:underline">
              <span
                className="size-2 rounded-full"
                style={{ background: `var(--series-${order + 1})` }}
              />
              <span className="text-muted capitalize">
                {formatDimensionValue("device", slice.value)}
              </span>
              <span className="font-medium tabular-nums">
                {formatMetric(slice.count, "count", true)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <svg viewBox="0 0 42 42" className="donut" role="img" aria-label="Page views by device type">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--track)" strokeWidth={5} />
        {total > 0
          ? slices.map((slice, order) => {
              const share = (slice.count / total) * 100;
              const dash = `${share} ${100 - share}`;
              const start = 25 - offset;
              offset += share;
              return (
                <circle
                  key={slice.value}
                  cx="21"
                  cy="21"
                  r={radius}
                  fill="none"
                  stroke={`var(--series-${order + 1})`}
                  strokeWidth={5}
                  strokeDasharray={dash}
                  strokeDashoffset={start}
                >
                  <title>{`${formatDimensionValue("device", slice.value)}: ${formatMetric(slice.count, "count")}`}</title>
                </circle>
              );
            })
          : null}
        <text x="21" y="21" textAnchor="middle" dominantBaseline="central" className="donut-total">
          {formatMetric(total, "count", true)}
        </text>
      </svg>
    </div>
  );
}
