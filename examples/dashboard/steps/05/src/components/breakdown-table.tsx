import type { Dimension, Filters, ProjectScope, BreakdownRow } from "@spoar/client";

import { countryName, formatCount, formatPercent } from "../format";
import { useRead } from "../use-read";
import { ReadFrame } from "./read-frame";

type Props = {
  scope: ProjectScope;
  scopeKey: string;
  dimension: Dimension;
  title: string;
  onPick: (dimension: keyof Filters, value: string) => void;
};

function label(dimension: Dimension, row: BreakdownRow) {
  if (row.value === "") return "(none)";
  return dimension === "country" ? countryName(row.value) : row.value;
}

function Skeleton() {
  return (
    <ol className="breakdown">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="skeleton-row">
          <span className="skeleton">loading</span>
          <strong className="skeleton">0</strong>
        </li>
      ))}
    </ol>
  );
}

export function BreakdownTable({ scope, scopeKey, dimension, title, onPick }: Props) {
  const rows = useRead(
    () => scope.breakdown(dimension, { metrics: ["visitors", "pageviews"], limit: 10 }),
    [scopeKey, dimension],
  );
  return (
    <ReadFrame
      title={title}
      read={rows}
      isEmpty={(value) => value.data.length === 0}
      empty="Nothing in this range."
      skeleton={<Skeleton />}
    >
      {(value) => (
        <ol className="breakdown">
          {value.data.map((row) => (
            <li key={row.value}>
              <button
                type="button"
                className="breakdown-row"
                data-ra-click="breakdown"
                data-ra-prop-dimension={dimension}
                onClick={() => onPick(dimension, row.value)}
                title={`Filter on ${dimension} = ${row.value}`}
              >
                <span
                  className="bar"
                  style={{ width: formatPercent(row.share ?? 0) }}
                  aria-hidden="true"
                />
                <span className="label">{label(dimension, row)}</span>
                <span className="share">{formatPercent(row.share ?? 0)}</span>
                <strong>{formatCount(row.visitors ?? 0)}</strong>
              </button>
            </li>
          ))}
        </ol>
      )}
    </ReadFrame>
  );
}
