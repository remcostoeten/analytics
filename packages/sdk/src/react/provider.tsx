import type { ReactNode } from "react";

import type { Analytics } from "../core/types";
import { AnalyticsContext } from "./context";

type Props = {
  client: Analytics;
  children: ReactNode;
};

/**
 * @name AnalyticsProvider
 * @description Makes a client from `createAnalytics` available to `useAnalytics`, `TrackClick`,
 * `ErrorBoundary` and the Next `Analytics` component below it.
 *
 * @example
 * <AnalyticsProvider client={analytics}>{children}</AnalyticsProvider>
 */
export function AnalyticsProvider({ client, children }: Props) {
  return <AnalyticsContext value={client}>{children}</AnalyticsContext>;
}
