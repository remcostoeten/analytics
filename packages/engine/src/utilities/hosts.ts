import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

// Vercel preview hosts: a -git- branch segment or a hash segment of 8 or more characters before .vercel.app.
const vercelPreview = /(-git-|-[a-z0-9]{8,}-)[^.]*\.vercel\.app$/i;

/**
 * @name hostOf
 * @description The host of an origin such as `https://remcostoeten.nl`, or null when it does not
 * parse.
 *
 * @example
 * hostOf("http://localhost:3000"); // "localhost:3000"
 */
export function hostOf(origin: Nullable<string>): Nullable<string> {
  if (!origin) return null;
  try {
    return new URL(origin).host || null;
  } catch {
    return null;
  }
}

/**
 * @name isLocalhost
 * @description Whether a host is a local development host: localhost, loopback, `.local` or
 * `.localhost`.
 *
 * @example
 * isLocalhost("127.0.0.1:5173"); // true
 */
export function isLocalhost(host: Nullable<string>): boolean {
  if (!host) return false;
  const lower = host.toLowerCase();
  return (
    lower === "localhost" ||
    lower.startsWith("localhost:") ||
    lower === "127.0.0.1" ||
    lower.startsWith("127.0.0.1:") ||
    lower === "::1" ||
    lower.startsWith("[::1]") ||
    lower.endsWith(".local") ||
    lower.endsWith(".localhost")
  );
}

/**
 * @name isPreview
 * @description Whether a host is a preview or staging deployment.
 *
 * @example
 * isPreview("analytics-git-main-remco.vercel.app"); // true
 */
export function isPreview(host: Nullable<string>): boolean {
  if (!host) return false;
  if (vercelPreview.test(host)) return true;
  if (host.includes("-preview.") || host.includes(".preview.")) return true;
  return host.startsWith("preview-") || host.startsWith("staging-");
}
