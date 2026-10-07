import type { Environment, Period, TrafficFilter } from "@spoar/contract";
import type { Query } from "@spoar/shared/http";

import type { DateInput, Filters, ReadOptions, ScopeState } from "./types";

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
    ...build(state),
  };
}
