import type { Result } from "@spoar/shared/result";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type ReadOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
};

export type Read<Value, Failure> = {
  queryKey: QueryKey;
  queryFn: () => Promise<Result<Value, Failure>>;
};

export type Prefetchable = { queryKey: QueryKey; queryFn: () => Promise<object> };

/**
 * @name useRead
 * @description One API read as a TanStack query on a scope key. The read's `Result` is the query
 * data, so a failed call is data too and never retries. While a new key loads, the previous key's
 * data stays on screen, so changing a filter or period never shows a skeleton once a view has
 * rendered.
 *
 * @example
 * const stats = useRead(scope.key("stats"), () => scope.stats());
 * if (stats.data?.ok) show(stats.data.value.data);
 */
export function useRead<Value, Failure>(
  queryKey: QueryKey,
  read: () => Promise<Result<Value, Failure>>,
  options: ReadOptions = {},
) {
  return useQuery({ queryKey, queryFn: read, placeholderData: keepPreviousData, ...options });
}

/**
 * @name useReadOf
 * @description `useRead` for a read built ahead of time, so a view's hooks and its hover prefetch
 * share one definition of each key.
 *
 * @example
 * const stats = useReadOf(statsQuery(scope));
 */
export function useReadOf<Value, Failure>(read: Read<Value, Failure>, options: ReadOptions = {}) {
  return useQuery({ ...read, placeholderData: keepPreviousData, ...options });
}

/**
 * @name prefetchReads
 * @description Warms the cache for the reads a navigation is about to need, skipping any that are
 * already fresh, so the next view renders with data the moment it mounts.
 *
 * @example
 * prefetchReads(queryClient, [statsQuery(scope), annotationsQuery(scope)]);
 */
export function prefetchReads(client: QueryClient, reads: readonly Prefetchable[]) {
  for (const read of reads) void client.prefetchQuery(read);
}

/**
 * @name invalidateRoute
 * @description Marks every cached read of one route stale and refetches the ones on screen, after
 * a change the route's answer depends on. Scope keys hold the route name at index 2.
 *
 * @example
 * await invalidateRoute(queryClient, "annotations");
 */
export function invalidateRoute(client: QueryClient, route: string) {
  return client.invalidateQueries({ predicate: (query) => query.queryKey[2] === route });
}
