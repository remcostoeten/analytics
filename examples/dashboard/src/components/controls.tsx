import type { Filters, Period, TrafficFilter } from "@spoar/client";

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

const periodShort: { [Key in Period]: string } = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  "12mo": "12mo",
  all: "All",
};

export function Controls({ state, onPeriod, onTraffic, onRemoveFilter }: Props) {
  const filters = Object.entries(state.filters).filter(
    (entry): entry is [keyof Filters, string] => entry[1] !== undefined,
  );
  return (
    <div className="controls">
      <div className="control-row">
        <div className="segmented" role="group" aria-label="Period">
          {periods.map((period) => (
            <button
              key={period}
              type="button"
              className={state.period === period ? "active" : ""}
              aria-pressed={state.period === period}
              aria-label={periodLabels[period]}
              title={periodLabels[period]}
              data-spoar-click="period"
              data-spoar-prop-period={period}
              onClick={() => onPeriod(period)}
            >
              {periodShort[period]}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Traffic">
          <button
            type="button"
            className={state.traffic === "human" ? "active" : ""}
            data-spoar-click="traffic"
            data-spoar-prop-traffic="human"
            onClick={() => onTraffic("human")}
          >
            Human
          </button>
          <button
            type="button"
            className={state.traffic === "all" ? "active" : ""}
            data-spoar-click="traffic"
            data-spoar-prop-traffic="all"
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
