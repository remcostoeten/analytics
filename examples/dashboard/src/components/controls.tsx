import type { Filters } from "@spoar/client";
import type { Period, TrafficFilter } from "@spoar/contract";

import { periods } from "../state";
import type { ViewState } from "../state";

type Props = {
  state: ViewState;
  onPeriod: (period: Period) => void;
  onTraffic: (traffic: TrafficFilter) => void;
  onRemoveFilter: (dimension: keyof Filters) => void;
};

const periodLabels: { [Key in Period]: string } = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12mo": "Last 12 months",
  all: "All time",
};

export function Controls({ state, onPeriod, onTraffic, onRemoveFilter }: Props) {
  const filters = Object.entries(state.filters).filter(
    (entry): entry is [keyof Filters, string] => entry[1] !== undefined,
  );
  return (
    <div className="controls">
      <div className="control-row">
        <label className="select" htmlFor="period">
          <span>Period</span>
          <select
            id="period"
            value={state.period}
            data-ra-click="period"
            onChange={(event) => {
              const next = periods.find((period) => period === event.target.value);
              if (next) onPeriod(next);
            }}
          >
            {periods.map((period) => (
              <option key={period} value={period}>
                {periodLabels[period]}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="Traffic">
          <button
            type="button"
            className={state.traffic === "human" ? "active" : ""}
            data-ra-click="traffic"
            data-ra-prop-traffic="human"
            onClick={() => onTraffic("human")}
          >
            Human
          </button>
          <button
            type="button"
            className={state.traffic === "all" ? "active" : ""}
            data-ra-click="traffic"
            data-ra-prop-traffic="all"
            onClick={() => onTraffic("all")}
          >
            All traffic
          </button>
        </div>
      </div>
      {filters.length > 0 ? (
        <ul className="chips" aria-label="Filters">
          {filters.map(([dimension, value]) => (
            <li key={dimension}>
              <button
                type="button"
                className="chip"
                onClick={() => onRemoveFilter(dimension)}
                aria-label={`Remove filter ${dimension} is ${value}`}
              >
                <span>{dimension}</span>
                <strong>{value}</strong>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
