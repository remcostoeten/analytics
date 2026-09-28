import { noop } from "@remcostoeten/analytics-shared/noop";

import type { Analytics } from "../core/types";

/**
 * @name noopClient
 * @description A client that does nothing, returned by `useAnalytics` outside an
 * `AnalyticsProvider` so a missing provider never breaks a page.
 *
 * @example
 * const analytics = context ?? noopClient;
 */
export const noopClient: Analytics = {
  track: noop,
  page: noop,
  identify: noop,
  register: noop,
  captureError: noop,
  captureMessage: noop,
  scope: () => noopClient,
  use: () => noop,
  consent: { grant: noop, revoke: noop, status: () => "unset" },
  optOut: noop,
  optIn: noop,
  isOptedOut: () => false,
  reset: noop,
  flush: async () => ({ accepted: 0, duplicates: 0, failed: 0 }),
  shutdown: async () => noop(),
  on: () => noop,
  status: () => ({
    queued: 0,
    consent: "unset",
    endpoint: "",
    route: null,
    lastError: null,
    lastSend: null,
  }),
  route: noop,
};
