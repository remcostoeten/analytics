import type { Filters, Period, TrafficFilter } from "@spoar/client";

export type ViewState = {
  period: Period;
  traffic: TrafficFilter;
  filters: Filters;
};

export const periods: readonly Period[] = ["24h", "7d", "30d", "90d"];

export const defaultState: ViewState = { period: "7d", traffic: "human", filters: {} };

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
