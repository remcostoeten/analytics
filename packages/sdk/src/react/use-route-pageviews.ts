import { useEffect } from "react";

import { useAnalytics } from "./use-analytics";

/**
 * @name useRoutePageviews
 * @description Sends a pageview with the route template whenever the path changes, for router
 * adapters. A null path or route means the router is not ready and holds the pageview. Once a
 * route is set, the default `pageviews` plugin stops sending, so create the client with
 * `pageviews: false` to skip its first pageview too.
 *
 * @example
 * useRoutePageviews(pathname, computeRoute(pathname, params));
 */
export function useRoutePageviews(path: string | null, route: string | null) {
  const analytics = useAnalytics();
  useEffect(() => {
    if (path === null || route === null) return;
    analytics.route(route);
    analytics.page();
  }, [analytics, path, route]);
}
