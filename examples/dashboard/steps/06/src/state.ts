import type { Filters, Period, TrafficFilter } from "@spoar/client";

export type ViewState = {
  period: Period;
  traffic: TrafficFilter;
  filters: Filters;
};

export const periods: readonly Period[] = ["24h", "7d", "30d", "90d"];

export const defaultState: ViewState = { period: "7d", traffic: "human", filters: {} };

function isPeriod(value: string): value is Period {
  return (periods as readonly string[]).includes(value);
}

function isTraffic(value: string): value is TrafficFilter {
  return value === "human" || value === "all";
}

/**
 * @name toHash
 * @description Encodes the view state as a URL hash: `period`, `traffic` when not `human`, and
 * one `filter[<dimension>]` per filter, in the same spelling the API takes.
 *
 * @example
 * toHash({ period: "7d", traffic: "human", filters: { country: "NL" } });
 * // "period=7d&filter[country]=NL"
 */
export function toHash(state: ViewState) {
  const params = new URLSearchParams();
  params.set("period", state.period);
  if (state.traffic !== "human") params.set("traffic", state.traffic);
  for (const [dimension, value] of Object.entries(state.filters)) {
    if (value !== undefined) params.set(`filter[${dimension}]`, value);
  }
  return params.toString();
}

/**
 * @name fromHash
 * @description Reads the view state back from a URL hash, falling back to the defaults for
 * anything missing or unknown.
 *
 * @example
 * fromHash("#period=30d&filter[page]=/blog");
 * // { period: "30d", traffic: "human", filters: { page: "/blog" } }
 */
export function fromHash(hash: string): ViewState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const period = params.get("period") ?? "";
  const traffic = params.get("traffic") ?? "";
  const filters: Filters = {};
  for (const [key, value] of params) {
    // Matches filter[<dimension>] and captures the dimension name.
    const match = /^filter\[([a-z_:]+)\]$/.exec(key);
    if (match?.[1] && value) filters[match[1] as keyof Filters] = value;
  }
  return {
    period: isPeriod(period) ? period : defaultState.period,
    traffic: isTraffic(traffic) ? traffic : defaultState.traffic,
    filters,
  };
}

/**
 * @name withFilter
 * @description Returns the state with one filter added or replaced.
 *
 * @example
 * withFilter(state, "country", "NL");
 */
export function withFilter(state: ViewState, dimension: keyof Filters, value: string): ViewState {
  return { ...state, filters: { ...state.filters, [dimension]: value } };
}

/**
 * @name withoutFilter
 * @description Returns the state with one filter removed.
 *
 * @example
 * withoutFilter(state, "country");
 */
export function withoutFilter(state: ViewState, dimension: keyof Filters): ViewState {
  const filters = { ...state.filters };
  delete filters[dimension];
  return { ...state, filters };
}
