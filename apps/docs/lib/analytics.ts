import { createAnalytics } from "@spoar/sdk";
import {
  botSignals,
  clicks,
  engagement,
  errors,
  scrollDepth,
  speedInsights,
} from "@spoar/sdk/plugins";

import { keepReadingOnBlog } from "./blog-tracking";

export const tracked = Boolean(
  process.env.NEXT_PUBLIC_SPOAR_CONFIG ?? process.env.NEXT_PUBLIC_RA_CONFIG,
);

/**
 * @name analytics
 * @description This site's own `@spoar/sdk` client, read from `NEXT_PUBLIC_SPOAR_CONFIG`. Pageviews
 * come from the Next adapter in `app/providers.tsx`. Time and scroll events are kept for blog posts
 * only. Without the variable the client stays in development mode and sends nothing.
 *
 * @example
 * analytics.track("copied_install_command");
 */
export const analytics = createAnalytics({
  pageviews: false,
  privacySignals: "ignore",
  mode: tracked ? "auto" : "development",
  plugins: [botSignals(), speedInsights(), errors(), clicks(), engagement(), scrollDepth()],
  beforeSend: keepReadingOnBlog,
});
