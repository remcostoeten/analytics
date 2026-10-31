import type { Client } from "@spoar/client";
import type { QueryClient } from "@tanstack/react-query";

import { prefetchReads } from "@/shared/query/read";

import { breakdownReads } from "./components/breakdown-sections";
import { fieldReads } from "./components/field-sidebar";
import { railReads } from "./components/metric-rail";
import { overviewReads } from "./components/overview-sections";
import { prefetchSpeed } from "./components/speed-sections";
import { summaryReads } from "./components/summary-section";
import { visitorSummaryReads } from "./components/visitor-summary";
import { logTraffic } from "./logs";
import { metricView, metricViews } from "./metrics";
import {
  eventsQuery,
  issuesQuery,
  outcomesQuery,
  parseTarget,
  speedSummaryQuery,
  visitorsQuery,
} from "./queries";
import { speedViewScope, viewScope } from "./scope";
import { vitalView } from "./speed";

const projectPath = /^\/projects\/([^/]+)(\/.*)?$/;

function tail(rest: string, prefix: string) {
  if (rest === prefix) return "";
  return rest.startsWith(`${prefix}/`) ? rest.slice(prefix.length + 1) : null;
}

/**
 * @name prefetchHref
 * @description Warms the query cache for the analytics page a link points at, so a navigation to
 * it renders with data the moment it mounts. Reads the project and view from the href the way the
 * page will, and leaves pages without list reads, such as realtime and the detail pages, alone.
 *
 * @example
 * prefetchHref(queryClient, browserClient(), "/projects/skriuw/speed/inp?device=mobile");
 */
export function prefetchHref(client: QueryClient, api: Client<string>, href: string) {
  const target = parseTarget(href);
  const match = projectPath.exec(target.pathname);
  if (!match?.[1]) return;
  const project = decodeURIComponent(match[1]);
  const rest = match[2] ?? "";
  const state = target.state;
  const scope = viewScope(api, project, state);

  const speed = tail(rest, "/speed");
  if (speed !== null) {
    prefetchSpeed(
      client,
      speedViewScope(api, project, state),
      state,
      vitalView(speed || undefined),
    );
    return;
  }
  if (rest === "/overview") {
    prefetchReads(client, overviewReads(scope));
    return;
  }
  if (rest === "/issues") {
    prefetchReads(client, [issuesQuery(scope, state.status, target.cursor)]);
    return;
  }
  if (rest === "/visitors") {
    prefetchReads(client, [...visitorSummaryReads(scope), visitorsQuery(scope, target.cursor)]);
    return;
  }
  const logs = tail(rest, "/logs");
  if (logs !== null) {
    const logState = { ...state, bots: false };
    const logScope = viewScope(api, project, logState);
    const scoped = logScope.traffic(logTraffic(logs || undefined));
    prefetchReads(client, [
      ...fieldReads(scoped),
      outcomesQuery(logScope),
      eventsQuery(scoped, target.cursor),
    ]);
    return;
  }
  const slug = rest.slice(1);
  if (slug !== "" && !metricViews.some((entry) => entry.slug === slug)) return;
  const view = metricView(slug || undefined);
  prefetchReads(client, [
    ...railReads(scope),
    ...summaryReads(scope, view, state.split),
    ...breakdownReads(scope, view, state.items),
    speedSummaryQuery(speedViewScope(api, project, state), state),
  ]);
}
