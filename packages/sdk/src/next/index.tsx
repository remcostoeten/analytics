import { Suspense } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";

import { computeRoute } from "../react/route";
import { useRoutePageviews } from "../react/use-route-pageviews";

function Tracker() {
  const pathname = usePathname();
  const params = useParams();
  const search = useSearchParams();
  const ready = pathname !== null;
  useRoutePageviews(
    ready ? `${pathname}?${search}` : null,
    ready ? computeRoute(pathname, params) : null,
  );
  return null;
}

/**
 * @name Analytics
 * @description The Next.js adapter: sends a pageview on every navigation, including a change of
 * only the query string, with the route template, such as `/blog/[slug]`, computed from
 * `usePathname` and `useParams`. It wraps itself in `Suspense` because `useSearchParams` needs a
 * boundary, so static pages keep rendering on the server. Place it inside `AnalyticsProvider` and
 * create the client with `pageviews: false`.
 *
 * @example
 * <AnalyticsProvider client={analytics}><Analytics />{children}</AnalyticsProvider>
 */
export function Analytics() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
