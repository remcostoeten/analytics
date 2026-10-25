import type { VisitorRow } from "@spoar/contract";

export type ActivityBucket = "now" | "today" | "yesterday" | "week" | "earlier";

export type VisitorGroup = {
  bucket: ActivityBucket;
  label: string;
  rows: VisitorRow[];
};

const bucketLabels: { [Bucket in ActivityBucket]: string } = {
  now: "Active in the last hour",
  today: "Today",
  yesterday: "Yesterday",
  week: "Earlier this week",
  earlier: "Earlier",
};

const hourMs = 3_600_000;
const dayMs = 86_400_000;

/**
 * @name countryFlag
 * @description The flag emoji for an ISO 3166-1 alpha-2 country code, built from regional
 * indicator symbols, or an empty string when the code is missing or malformed.
 *
 * @example
 * countryFlag("NL"); // "🇳🇱"
 * countryFlag(null); // ""
 */
export function countryFlag(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  const base = 0x1f1e6 - 65;
  return String.fromCodePoint(base + code.charCodeAt(0), base + code.charCodeAt(1));
}

/**
 * @name visitorHue
 * @description A stable hue from 0 to 359 for a visitor id, so the same visitor always gets the
 * same avatar colour across pages.
 *
 * @example
 * visitorHue("01a16fb6") === visitorHue("01a16fb6"); // true
 */
export function visitorHue(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/**
 * @name activityBucket
 * @description Which recency group a timestamp falls in relative to `now`: within the last hour,
 * the same UTC day, the UTC day before, the last seven days, or earlier.
 *
 * @example
 * activityBucket("2026-10-25T09:00:00Z", Date.parse("2026-10-25T09:30:00Z")); // "now"
 * activityBucket("2026-10-24T09:00:00Z", Date.parse("2026-10-25T09:30:00Z")); // "yesterday"
 */
export function activityBucket(timestamp: string, now: number): ActivityBucket {
  const at = Date.parse(timestamp);
  if (now - at < hourMs) return "now";
  const day = Math.floor(now / dayMs) - Math.floor(at / dayMs);
  if (day <= 0) return "today";
  if (day === 1) return "yesterday";
  if (day < 7) return "week";
  return "earlier";
}

/**
 * @name groupVisitors
 * @description Splits visitor rows, in the order given, into consecutive recency groups by when
 * each was last seen, keeping the order inside each group.
 *
 * @example
 * groupVisitors(rows, Date.now()); // [{ bucket: "today", label: "Today", rows: [...] }, ...]
 */
export function groupVisitors(rows: VisitorRow[], now: number): VisitorGroup[] {
  const groups: VisitorGroup[] = [];
  for (const row of rows) {
    const bucket = activityBucket(row.lastSeen, now);
    const last = groups.at(-1);
    if (last && last.bucket === bucket) last.rows.push(row);
    else groups.push({ bucket, label: bucketLabels[bucket], rows: [row] });
  }
  return groups;
}
