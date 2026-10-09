import { createAnalytics } from "@spoar/sdk";
import { errors, speedInsights } from "@spoar/sdk/plugins";

export const tracked = Boolean(process.env.NEXT_PUBLIC_RA_CONFIG);

/**
 * @name analytics
 * @description This site's own `@spoar/sdk` client, read from `NEXT_PUBLIC_RA_CONFIG`. Pageviews
 * come from the Next adapter in `app/providers.tsx`. Without the variable the client stays in
 * development mode and sends nothing.
 *
 * @example
 * analytics.track("copied_install_command");
 */
export const analytics = createAnalytics({
  pageviews: false,
  mode: tracked ? "auto" : "development",
  plugins: [speedInsights(), errors()],
});
