import type { Environment, Period, TrafficFilter } from "@spoar/contract";
import type { Query, QueryValue } from "@spoar/shared/http";
import type { Nullable } from "@spoar/shared/semantic";

import type { DateInput, Filters, ReadOptions, ScopeState } from "./types";

export type RouteName<Extra> = {
  [Name in keyof Extra]: Extra[Name] extends (...args: never[]) => object ? Name : never;
}[keyof Extra] &
  string;

export type RouteArgs<Extra, Route extends keyof Extra> = Extra[Route] extends (
  ...args: infer Args
) => object
  ? Args
  : never;

export type QueryEntry = readonly [name: string, value: QueryValue | QueryValue[]];

export type ScopeKey<Route extends string, Args extends readonly unknown[]> = readonly [
  "spoar",
  Nullable<string>,
  Route,
  readonly QueryEntry[],
  ...Args,
];

export type Scope<Extra> = Extra & {
  period: (period: Period) => Scope<Extra>;
  between: (from: DateInput, to: DateInput) => Scope<Extra>;
  traffic: (traffic: TrafficFilter) => Scope<Extra>;
  human: () => Scope<Extra>;
  environment: (environment: Environment) => Scope<Extra>;
  where: (filters: Filters) => Scope<Extra>;
  exclude: (filters: Filters) => Scope<Extra>;
  apply: (options: ReadOptions) => Scope<Extra>;
  toQuery: () => Query;
  key: <Route extends RouteName<Extra>>(
    route: Route,
    ...args: RouteArgs<Extra, Route>
  ) => ScopeKey<Route, RouteArgs<Extra, Route>>;
};

function iso(value: DateInput) {
  return value instanceof Date ? value.toISOString() : value;
}

function negated(filters: Filters): Filters {
  return Object.fromEntries(
    Object.entries(filters)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([name, value]) => [name, value.startsWith("!") ? value : `!${value}`]),
  );
}

/**
 * @name basePath
 * @description The route prefix a scope reads from: `/v2/projects/<id>` for one project, `/v2`
 * for the combined routes across every project the caller may see.
 *
 * @example
 * basePath({ project: "skriuw", filter: {} }); // "/v2/projects/skriuw"
 */
export function basePath(state: ScopeState) {
  return state.project === null ? "/v2" : `/v2/projects/${encodeURIComponent(state.project)}`;
}

/**
 * @name toQuery
 * @description Turns a scope into the query string every aggregate read takes: `from` and `to`
 * or `period`, `traffic`, `environment`, and one `filter[<dimension>]` per filter, exactly as the
 * API documents them.
 *
 * @example
 * toQuery({ project: null, period: "7d", filter: { country: "NL" } });
 * // { period: "7d", "filter[country]": "NL" }
 */
export function toQuery(state: ScopeState): Query {
  const query: Query = {};
  if (state.from !== undefined) query.from = state.from;
  if (state.to !== undefined) query.to = state.to;
  if (state.period !== undefined) query.period = state.period;
  if (state.traffic !== undefined) query.traffic = state.traffic;
  if (state.environment !== undefined) query.environment = state.environment;
  for (const [dimension, value] of Object.entries(state.filter)) {
    if (value !== undefined) query[`filter[${dimension}]`] = value;
  }
  return query;
}

/**
 * @name scopeKey
 * @description A stable, serialisable key for one read: the project, the route, the scope's query
 * sorted by name with empty values dropped, and the route's own arguments. Two scopes that send the
 * same request get equal keys however their links were chained, so a cache such as TanStack Query
 * can dedupe and invalidate on it.
 *
 * @example
 * scopeKey({ project: "skriuw", period: "7d", filter: {} }, "breakdown", ["page"]);
 * // ["spoar", "skriuw", "breakdown", [["period", "7d"]], "page"]
 */
export function scopeKey<Route extends string, Args extends readonly unknown[]>(
  state: ScopeState,
  route: Route,
  args: Args,
): ScopeKey<Route, Args> {
  const entries = Object.entries(toQuery(state))
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return ["spoar", state.project, route, entries, ...args];
}

/**
 * @name scope
 * @description Builds a chainable, immutable scope: every link returns a new scope with one more
 * query parameter set, and `build` adds the route terminals for the state. Period and an explicit
 * range replace each other; filters merge, with the newest value per dimension winning.
 *
 * @example
 * const nl = scope({ project: "skriuw", filter: {} }, (state) => aggregateReads(send, state));
 * await nl.period("7d").where({ country: "NL" }).stats();
 */
export function scope<Extra>(state: ScopeState, build: (state: ScopeState) => Extra): Scope<Extra> {
  function next(patch: Partial<ScopeState>): Scope<Extra> {
    return scope({ ...state, ...patch }, build);
  }

  return {
    period: (period) => next({ period, from: undefined, to: undefined }),
    between: (from, to) => next({ from: iso(from), to: iso(to), period: undefined }),
    traffic: (traffic) => next({ traffic }),
    human: () => next({ traffic: "human" }),
    environment: (environment) => next({ environment }),
    where: (filters) => next({ filter: { ...state.filter, ...filters } }),
    exclude: (filters) => next({ filter: { ...state.filter, ...negated(filters) } }),
    apply: (options) => {
      const { filter, ...rest } = options;
      return next({ ...rest, filter: { ...state.filter, ...filter } });
    },
    toQuery: () => toQuery(state),
    key: (route, ...args) => scopeKey(state, route, args),
    ...build(state),
  };
}
