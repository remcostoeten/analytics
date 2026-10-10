import { createAnalytics } from "@spoar/sdk";
import type { Analytics } from "@spoar/sdk";
import { clicks } from "@spoar/sdk/plugins";

import type { Events } from "./events";
import type { Settings } from "./settings";
import { trimEndpoint } from "./settings";

/**
 * @name createTracking
 * @description The dashboard's own `@spoar/sdk` client, so the example tracks itself into the
 * project it reads. Without a public key the SDK runs in development mode and logs instead.
 *
 * @example
 * const analytics = createTracking(settings);
 * analytics.track("period_changed", { period: "30d" });
 */
export function createTracking(settings: Settings): Analytics<Events> {
  return createAnalytics<Events>({
    project: settings.project,
    key: settings.publicKey,
    endpoint: `${trimEndpoint(settings.endpoint)}/v2/events`,
    mode: settings.publicKey ? "production" : "development",
    plugins: [clicks()],
  });
}
