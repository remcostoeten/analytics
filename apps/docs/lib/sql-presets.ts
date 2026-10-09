export type SqlPresetId = "pages" | "countries" | "sources" | "devices" | "vitals" | "days";

export type SqlPreset = {
  id: SqlPresetId;
  title: string;
  question: string;
  sql: string;
};

/**
 * @name sqlPresets
 * @description The read-only queries the landing page runs against this site's own project. Every
 * one aggregates over the console views between `:from` and `:to`, so no visitor-level row
 * reaches the page; the plan keeps SQL away from anonymous visitors for that reason.
 *
 * @example
 * sqlPresets[0].id; // "pages"
 */
export const sqlPresets: readonly SqlPreset[] = [
  {
    id: "pages",
    title: "Top pages",
    question: "Which pages did people read, and how many of them?",
    sql: `SELECT path, count(DISTINCT visitor_id) AS visitors, count(*) AS pageviews
FROM events
WHERE name = 'pageview' AND is_human AND ts >= :from AND ts < :to
GROUP BY path
ORDER BY visitors DESC, pageviews DESC
LIMIT 8`,
  },
  {
    id: "countries",
    title: "Countries",
    question: "Where do the visitors come from?",
    sql: `SELECT country, count(DISTINCT visitor_id) AS visitors
FROM events
WHERE is_human AND country IS NOT NULL AND ts >= :from AND ts < :to
GROUP BY country
ORDER BY visitors DESC
LIMIT 8`,
  },
  {
    id: "sources",
    title: "Sources",
    question: "Which sites send sessions here, and how many bounce?",
    sql: `SELECT coalesce(referrer_domain, 'direct') AS source, channel, count(*) AS sessions,
  cast(round(100.0 * count(*) FILTER (WHERE is_bounce) / count(*)) AS integer) AS bounce_pct
FROM sessions
WHERE is_human AND started_at >= :from AND started_at < :to
GROUP BY source, channel
ORDER BY sessions DESC
LIMIT 8`,
  },
  {
    id: "devices",
    title: "Devices",
    question: "Which devices and browsers read the docs?",
    sql: `SELECT device, browser, count(DISTINCT visitor_id) AS visitors
FROM events
WHERE is_human AND ts >= :from AND ts < :to
GROUP BY device, browser
ORDER BY visitors DESC
LIMIT 8`,
  },
  {
    id: "vitals",
    title: "Web Vitals",
    question: "How fast is this site at the 75th percentile?",
    sql: `SELECT metric,
  round(percentile_cont(0.75) WITHIN GROUP (ORDER BY value)) AS p75,
  count(*) AS samples,
  cast(round(100.0 * count(*) FILTER (WHERE rating = 'good') / count(*)) AS integer) AS good_pct
FROM web_vitals
WHERE is_human AND ts >= :from AND ts < :to
GROUP BY metric
ORDER BY metric`,
  },
  {
    id: "days",
    title: "Per day",
    question: "How did the last two weeks go, day by day?",
    sql: `SELECT date_trunc('day', ts) AS day,
  count(DISTINCT visitor_id) AS visitors,
  count(*) FILTER (WHERE name = 'pageview') AS pageviews
FROM events
WHERE is_human AND ts >= :from AND ts < :to
GROUP BY day
ORDER BY day DESC
LIMIT 14`,
  },
];

/**
 * @name findSqlPreset
 * @description The preset with this id, or null for anything a visitor made up.
 *
 * @example
 * findSqlPreset("pages")?.title; // "Top pages"
 */
export function findSqlPreset(id: string): SqlPreset | null {
  return sqlPresets.find((preset) => preset.id === id) ?? null;
}
