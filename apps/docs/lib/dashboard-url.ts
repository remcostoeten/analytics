const fallback = "https://dashboard.analytics.remcostoeten.nl";

/**
 * @name dashboardUrl
 * @description A link into the dashboard app from `DASHBOARD_URL`, without a trailing slash,
 * falling back to production. Server only, since the variable has no public prefix.
 *
 * @example
 * dashboardUrl(`/admin/projects/${encodeURIComponent(project)}`);
 */
export function dashboardUrl(path = "") {
  return `${(process.env.DASHBOARD_URL ?? fallback).replace(/\/+$/, "")}${path}`;
}
