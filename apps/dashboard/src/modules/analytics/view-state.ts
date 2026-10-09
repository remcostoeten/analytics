import type { IssueStatus, Percentile, Period } from "@spoar/contract";

export type FilterDimension =
  | "page"
  | "route"
  | "referrer_domain"
  | "host"
  | "country"
  | "browser"
  | "os"
  | "device"
  | "channel";

export type ViewFilters = { [Name in FilterDimension]?: string };

export type ViewState = {
  period: Period;
  bots: boolean;
  split: FilterDimension | null;
  filters: ViewFilters;
  percentile: Percentile;
  status: IssueStatus;
};

export type SearchParams = { [key: string]: string | string[] | undefined };

export const periods = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12mo", label: "Last 12 months" },
] as const satisfies readonly { value: Period; label: string }[];

export const dimensions = [
  { value: "referrer_domain", label: "Referrer" },
  { value: "page", label: "Path" },
  { value: "route", label: "Route" },
  { value: "host", label: "Host" },
  { value: "country", label: "Country" },
  { value: "browser", label: "Browser" },
  { value: "os", label: "Operating system" },
  { value: "device", label: "Device type" },
  { value: "channel", label: "Channel" },
] as const satisfies readonly { value: FilterDimension; label: string }[];

export const percentiles = [50, 75, 90, 95, 99] as const satisfies readonly Percentile[];

export const issueStatuses = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "ignored", label: "Ignored" },
] as const satisfies readonly { value: IssueStatus; label: string }[];

const defaults = {
  period: "7d",
  percentile: 75,
  status: "open",
} as const satisfies Pick<ViewState, "period" | "percentile" | "status">;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPeriod(value: string | undefined): value is Period {
  return periods.some((period) => period.value === value);
}

function isDimension(value: string | undefined): value is FilterDimension {
  return dimensions.some((dimension) => dimension.value === value);
}

function isPercentile(value: number): value is Percentile {
  return percentiles.some((percentile) => percentile === value);
}

function isIssueStatus(value: string | undefined): value is IssueStatus {
  return issueStatuses.some((status) => status.value === value);
}

/**
 * @name readViewState
 * @description Reads the analytics view from the URL: `period`, `bots=include`, `split` for the
 * summary chart, one parameter per filtered dimension (a leading `!` excludes the value), and
 * `percentile` and `status` for the speed and issue views. Unknown or empty values fall
 * back to the defaults.
 *
 * @example
 * readViewState({ period: "30d", country: "!NL" }).filters; // { country: "!NL" }
 */
export function readViewState(params: SearchParams): ViewState {
  const period = single(params.period);
  const split = single(params.split);
  const percentile = Number(single(params.percentile));
  const status = single(params.status);
  const filters: ViewFilters = {};
  for (const { value } of dimensions) {
    const filter = single(params[value]);
    if (filter && filter !== "!") filters[value] = filter;
  }
  return {
    period: isPeriod(period) ? period : defaults.period,
    bots: single(params.bots) === "include",
    split: isDimension(split) ? split : null,
    filters,
    percentile: isPercentile(percentile) ? percentile : defaults.percentile,
    status: isIssueStatus(status) ? status : defaults.status,
  };
}

/**
 * @name viewQuery
 * @description Writes a view back to a query string, leaving defaults out so links stay short.
 * Returns an empty string or one starting with `?`.
 *
 * @example
 * viewQuery(readViewState({ page: "/" })); // "?page=%2F"
 */
export function viewQuery(state: ViewState) {
  const query = new URLSearchParams();
  if (state.period !== defaults.period) query.set("period", state.period);
  if (state.bots) query.set("bots", "include");
  if (state.split) query.set("split", state.split);
  for (const { value } of dimensions) {
    const filter = state.filters[value];
    if (filter) query.set(value, filter);
  }
  if (state.percentile !== defaults.percentile) query.set("percentile", String(state.percentile));
  if (state.status !== defaults.status) query.set("status", state.status);
  const text = query.toString();
  return text ? `?${text}` : "";
}

/**
 * @name withFilter
 * @description The same view with one dimension filtered to a value, or cleared with `null`.
 *
 * @example
 * withFilter(state, "country", "NL");
 * withFilter(state, "country", null);
 */
export function withFilter(
  state: ViewState,
  dimension: FilterDimension,
  value: string | null,
): ViewState {
  const filters = { ...state.filters };
  if (value === null) delete filters[dimension];
  else filters[dimension] = value;
  return { ...state, filters };
}

/**
 * @name dimensionLabel
 * @description The display name of a filterable dimension.
 *
 * @example
 * dimensionLabel("referrer_domain"); // "Referrer"
 */
export function dimensionLabel(dimension: FilterDimension) {
  return dimensions.find((entry) => entry.value === dimension)?.label ?? dimension;
}
