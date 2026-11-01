"use client";

import type { Nullable } from "@spoar/shared/semantic";

import { CloseIcon } from "@/shared/ui/icons";

import { formatMetric } from "../format";

export type CountryStat = {
  code: string;
  name: string;
  value: number;
  share: number;
  rank: Nullable<number>;
};

type Props = {
  stat: CountryStat;
  unit: string;
  total: number;
  filtered: boolean;
  onFilter?: () => void;
  onClose: () => void;
  onHover: (code: string) => void;
};

export function percent(share: number) {
  if (share > 0 && share < 0.01) return "<1%";
  return `${Math.round(share * 100)}%`;
}

export function CountryCard({ stat, unit, total, filtered, onFilter, onClose, onHover }: Props) {
  return (
    <li
      className="country-card"
      onPointerEnter={() => onHover(stat.code)}
      onPointerLeave={() => onHover("")}
    >
      <div className="country-card-head">
        <p className="country-card-name">{stat.name}</p>
        <button
          type="button"
          className="chip-remove"
          aria-label={`Close ${stat.name}`}
          onClick={onClose}
        >
          <CloseIcon className="size-3" />
        </button>
      </div>
      <p className="heat-tooltip-value">
        <span className="tabular-nums">{formatMetric(stat.value, "count")}</span>
        <span className="heat-tooltip-unit">{unit}</span>
      </p>
      <p className="heat-tooltip-meta tabular-nums">
        {stat.rank === null
          ? "No visits in this period"
          : `${percent(stat.share)} of ${formatMetric(total, "count")}, #${stat.rank}`}
      </p>
      {onFilter && stat.value > 0 ? (
        <button type="button" className="country-card-filter" onClick={onFilter}>
          {filtered ? "Clear filter" : "Filter dashboard"}
        </button>
      ) : null}
    </li>
  );
}
