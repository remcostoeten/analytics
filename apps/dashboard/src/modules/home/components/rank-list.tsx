"use client";

import type { BreakdownRow } from "@spoar/contract";
import { useState } from "react";

import { formatDimensionValue, formatMetric } from "@/modules/analytics/format";
import type { FilterDimension } from "@/modules/analytics/view-state";

type Props = {
  dimension: FilterDimension;
  rows: BreakdownRow[];
  share?: boolean;
  collapsed?: number;
};

export function RankList({ dimension, rows, share = false, collapsed = rows.length }: Props) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return <p className="py-2 text-sm text-muted">No data in this range</p>;
  const max = Math.max(1, ...rows.map((row) => row.visitors ?? 0));
  const total = rows.reduce((sum, row) => sum + (row.visitors ?? 0), 0);
  const hidden = rows.length - collapsed;
  const shown = open ? rows : rows.slice(0, collapsed);
  return (
    <div className="grid gap-1">
      <ul className={open ? "rank-list rank-list-open" : "rank-list"}>
        {shown.map((row) => {
          const value = row.visitors ?? 0;
          const percent = total === 0 ? 0 : Math.round((value / total) * 100);
          return (
            <li key={row.value} className="rank-row">
              <span
                className="rank-fill"
                style={{ width: `${(value / max) * 100}%` }}
                aria-hidden="true"
              />
              <span className={dimension === "device" ? "rank-label capitalize" : "rank-label"}>
                {formatDimensionValue(dimension, row.value)}
              </span>
              <span className="rank-value">
                {share ? `${percent}%` : formatMetric(value, "count")}
              </span>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          className="rank-more"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Show less" : `View ${hidden} more`}
        </button>
      ) : null}
    </div>
  );
}
