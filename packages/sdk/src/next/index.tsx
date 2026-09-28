import { useParams, usePathname } from "next/navigation";

import { computeRoute } from "../react/route";
import { useRoutePageviews } from "../react/use-route-pageviews";

/**
 * @name Analytics
 * @description The Next.js adapter: sends a pageview on every navigation with the route template,
 * such as `/blog/[slug]`, computed from `usePathname` and `useParams`. Place it inside
 * `AnalyticsProvider` and create the client with `pageviews: false`.
 *
 * @example
 * <AnalyticsProvider client={analytics}><Analytics />{children}</AnalyticsProvider>
 */
export function Analytics() {
  const pathname = usePathname();
  const params = useParams();
  useRoutePageviews(pathname, pathname === null ? null : computeRoute(pathname, params));
  return null;
}
