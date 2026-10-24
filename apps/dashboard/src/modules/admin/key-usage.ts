import type { Project } from "@spoar/contract";

type KeyUse = Project["keyUsage"]["public"];

/**
 * @name describeKeyUsage
 * @description A line saying when a key last authorized a batch and from which origin, or that it
 * has not been used since it was created or rotated.
 *
 * @example
 * describeKeyUsage({ lastUsedAt: "2026-10-24T11:55:00.000Z", lastUsedOrigin: "https://remcostoeten.nl" }, new Date("2026-10-24T12:00:00.000Z")); // "Last used 5 minutes ago from https://remcostoeten.nl"
 */
export function describeKeyUsage(use: KeyUse, now: Date): string {
  if (use.lastUsedAt === null) return "Not used yet";
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(use.lastUsedAt)) / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const ago =
    minutes < 1
      ? "just now"
      : minutes < 60
        ? `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`
        : hours < 24
          ? `${hours} ${hours === 1 ? "hour" : "hours"} ago`
          : `${days} ${days === 1 ? "day" : "days"} ago`;
  const from = use.lastUsedOrigin ?? "a server without an origin";
  return `Last used ${ago} from ${from}`;
}
