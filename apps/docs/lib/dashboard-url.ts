/**
 * @name dashboardUrl
 * @description A same-origin link into the dashboard, which this site serves under `/dashboard`
 * by rewriting to `DASHBOARD_URL`.
 *
 * @example
 * dashboardUrl(`/projects/${encodeURIComponent(project)}`);
 */
export function dashboardUrl(path = "") {
  return `/dashboard${path}`;
}
