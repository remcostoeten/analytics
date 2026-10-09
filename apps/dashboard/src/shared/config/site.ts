/**
 * @name basePath
 * @description The path the dashboard is served under. The landing site rewrites `/dashboard` to
 * this app, so the dashboard shares the landing domain and its session cookie.
 *
 * @example
 * window.location.assign(`${window.location.origin}${basePath}/sign-in`);
 */
export const basePath = "/dashboard";

/**
 * @name siteUrl
 * @description The landing and docs site the dashboard links back to, from `NEXT_PUBLIC_SITE_URL`,
 * falling back to production.
 *
 * @example
 * <a href={`${siteUrl()}/docs`}>Docs</a>
 */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://docs.analytics.remcostoeten.nl").replace(
    /\/+$/,
    "",
  );
}
