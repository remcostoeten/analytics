import type { DeviceType } from "@remcostoeten/analytics-contract";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

const mobileMarkers = ["mobile", "android", "iphone", "ipod", "blackberry", "windows phone"];
const desktopMarkers = ["windows", "macintosh", "linux", "x11"];

/**
 * @name deviceClass
 * @description Classifies a user agent as desktop, mobile, tablet or unknown. Bot classification
 * comes from the bot score, not from here.
 *
 * @example
 * deviceClass("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"); // "tablet"
 */
export function deviceClass(userAgent: Nullable<string>): DeviceType {
  if (!userAgent) return "unknown";
  const lower = userAgent.toLowerCase();
  if (lower.includes("ipad") || lower.includes("tablet")) return "tablet";
  if (lower.includes("android") && !lower.includes("mobile")) return "tablet";
  if (mobileMarkers.some((marker) => lower.includes(marker))) return "mobile";
  if (desktopMarkers.some((marker) => lower.includes(marker))) return "desktop";
  return "unknown";
}
