import { use } from "react";

import type { Analytics, EventMap } from "../core/types";
import { AnalyticsContext } from "./context";
import { noopClient } from "./noop-client";

/**
 * @name useAnalytics
 * @description The client from the nearest `AnalyticsProvider`, typed with the app's `Events`.
 * Outside a provider it returns a client that does nothing.
 *
 * @example
 * const analytics = useAnalytics<Events>();
 * analytics.track("signup", { plan: "pro" });
 */
export function useAnalytics<Events extends EventMap = EventMap>(): Analytics<Events> {
  return use(AnalyticsContext) ?? noopClient;
}
