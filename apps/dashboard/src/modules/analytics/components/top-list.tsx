import type { BreakdownRow } from "@spoar/contract";
import Link from "next/link";

import { formatDimensionValue, formatMetric } from "../format";
import type { CountMetric } from "../metrics";
import type { FilterDimension } from "../view-state";

type Props = {
  title: string;
  dimension: FilterDimension;
  rows: BreakdownRow[];
  count: CountMetric;
  hrefFor: (value: string) => string;
  columns?: boolean;
};

const rowsPerColumn = 5;

export function TopList({ title, dimension, rows, count, hrefFor, columns = false }: Props) {
  const max = Math.max(1, ...rows.map((row) => row[count] ?? 0));
  const split = columns && rows.length > rowsPerColumn;
  return (
    <div className="grid content-start gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-muted">No data in this range</p>
      ) : (
        <ul
          className={`grid gap-0.5 ${split ? "md:grid-flow-col md:gap-x-10" : ""}`}
          style={split ? { gridTemplateRows: `repeat(${rowsPerColumn}, auto)` } : undefined}
        >
          {rows.map((row) => {
            const value = row[count] ?? 0;
            const label = formatDimensionValue(dimension, row.value);
            const cells = (
              <>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="tabular-nums">{formatMetric(value, "count")}</span>
                <span className="bar-track" aria-hidden="true">
                  <span className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
                </span>
              </>
            );
            return (
              <li key={row.value}>
                {row.value === "" ? (
                  <div className="top-row">{cells}</div>
                ) : (
                  <Link
                    href={hrefFor(row.value)}
                    title={`Filter by ${label}`}
                    className="top-row top-row-link"
                    prefetch={false}
                  >
                    {cells}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
