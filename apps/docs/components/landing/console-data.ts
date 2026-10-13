export type Token = { text: string; kind?: "keyword" | "string" | "call" };

export type QueryId = "pages" | "sources" | "trend";

export type ConsoleQuery = { id: QueryId; label: string; lines: Token[][] };

export type FieldKind = "s" | "n" | "t" | "b" | "j";

export type ConsoleView = { name: string; fields: [kind: FieldKind, name: string][] };

function keyword(text: string): Token {
  return { text, kind: "keyword" };
}

function plain(text: string): Token {
  return { text };
}

const humanPageviews = [
  keyword("WHERE"),
  plain(" name = "),
  { text: "'pageview'", kind: "string" },
  plain(" "),
  keyword("AND"),
  plain(" is_human"),
] satisfies Token[];

export const consoleQueries: ConsoleQuery[] = [
  {
    id: "pages",
    label: "Pages",
    lines: [
      [
        keyword("SELECT"),
        plain(" path, "),
        { text: "count", kind: "call" },
        plain("("),
        keyword("DISTINCT"),
        plain(" visitor_id) "),
        keyword("AS"),
        plain(" visitors"),
      ],
      [keyword("FROM"), plain(" events")],
      humanPageviews,
      [
        keyword("GROUP BY"),
        plain(" path "),
        keyword("ORDER BY"),
        plain(" visitors "),
        keyword("DESC"),
      ],
    ],
  },
  {
    id: "sources",
    label: "Referrers",
    lines: [
      [
        keyword("SELECT"),
        plain(" referrer_domain, "),
        { text: "count", kind: "call" },
        plain("("),
        keyword("DISTINCT"),
        plain(" visitor_id) "),
        keyword("AS"),
        plain(" visitors"),
      ],
      [keyword("FROM"), plain(" sessions")],
      [
        keyword("WHERE"),
        plain(" is_human "),
        keyword("AND"),
        plain(" referrer_domain "),
        keyword("IS NOT NULL"),
      ],
      [
        keyword("GROUP BY"),
        plain(" referrer_domain "),
        keyword("ORDER BY"),
        plain(" visitors "),
        keyword("DESC"),
      ],
    ],
  },
  {
    id: "trend",
    label: "Trend",
    lines: [
      [
        keyword("SELECT"),
        plain(" "),
        { text: "date_trunc", kind: "call" },
        plain("("),
        { text: "'day'", kind: "string" },
        plain(", ts) "),
        keyword("AS"),
        plain(" day, "),
        { text: "count", kind: "call" },
        plain("("),
        keyword("DISTINCT"),
        plain(" visitor_id)"),
      ],
      [keyword("FROM"), plain(" events")],
      humanPageviews,
      [keyword("GROUP BY"), plain(" day "), keyword("ORDER BY"), plain(" day")],
    ],
  },
];

export const consoleViews: ConsoleView[] = [
  {
    name: "events",
    fields: [
      ["s", "event_id"],
      ["s", "name"],
      ["t", "ts"],
      ["s", "visitor_id"],
      ["s", "session_id"],
      ["s", "path"],
      ["s", "referrer_domain"],
      ["s", "channel"],
      ["s", "country"],
      ["s", "device"],
    ],
  },
  {
    name: "pageviews",
    fields: [
      ["s", "path"],
      ["s", "route"],
      ["n", "time_on_page_ms"],
      ["n", "scroll_depth"],
      ["b", "is_entry"],
      ["b", "is_exit"],
      ["s", "previous_path"],
      ["s", "next_path"],
      ["n", "page_number"],
      ["b", "is_human"],
    ],
  },
  {
    name: "sessions",
    fields: [
      ["s", "session_id"],
      ["s", "visitor_id"],
      ["n", "visit_number"],
      ["t", "started_at"],
      ["n", "duration_ms"],
      ["n", "pageviews"],
      ["b", "is_bounce"],
      ["s", "entry_path"],
      ["s", "exit_path"],
      ["s", "referrer_domain"],
    ],
  },
  {
    name: "visitors",
    fields: [
      ["s", "visitor_id"],
      ["t", "first_seen"],
      ["t", "last_seen"],
      ["n", "visits"],
      ["n", "pageviews"],
      ["b", "is_returning"],
      ["s", "user_id"],
      ["j", "traits"],
      ["s", "first_channel"],
      ["s", "country"],
    ],
  },
  {
    name: "people",
    fields: [
      ["s", "user_id"],
      ["t", "first_seen"],
      ["t", "last_seen"],
      ["s", "first_project"],
      ["s", "projects"],
      ["n", "visits"],
      ["j", "traits"],
    ],
  },
  {
    name: "web_vitals",
    fields: [
      ["s", "vital_id"],
      ["t", "ts"],
      ["s", "metric"],
      ["n", "value"],
      ["s", "rating"],
      ["s", "route"],
      ["s", "path"],
      ["s", "device"],
      ["s", "connection"],
      ["s", "selector"],
    ],
  },
  {
    name: "issues",
    fields: [
      ["n", "issue_id"],
      ["s", "fingerprint"],
      ["s", "title"],
      ["s", "culprit"],
      ["s", "level"],
      ["s", "status"],
      ["n", "count"],
      ["n", "visitors"],
      ["t", "first_seen"],
      ["t", "last_seen"],
    ],
  },
  {
    name: "daily",
    fields: [
      ["t", "day"],
      ["s", "dimension"],
      ["s", "value"],
      ["n", "visitors"],
      ["n", "sessions"],
      ["n", "pageviews"],
      ["n", "events"],
    ],
  },
  {
    name: "daily_vitals",
    fields: [
      ["t", "day"],
      ["s", "route"],
      ["s", "device"],
      ["s", "metric"],
      ["n", "samples"],
      ["n", "p50"],
      ["n", "p75"],
      ["n", "p95"],
      ["n", "good"],
      ["n", "poor"],
    ],
  },
];

/**
 * @name viewQuery
 * @description The query the hero console shows when a view is picked: every column of the
 * view, newest rows first by its first column.
 *
 * @example
 * viewQuery("sessions"); // SELECT * FROM sessions ...
 */
export function viewQuery(view: string): Token[][] {
  return [
    [keyword("SELECT"), plain(" *")],
    [keyword("FROM"), plain(` ${view}`)],
    [keyword("LIMIT"), plain(" 50")],
  ];
}
