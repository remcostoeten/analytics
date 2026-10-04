import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { oneOf } from "./schema";

export const Visibility = oneOf(["public", "private"], {
  description: "`public` projects can be read without signing in; `private` ones need access.",
});
export type Visibility = Static<typeof Visibility>;

export const DeviceType = oneOf(["desktop", "mobile", "tablet", "bot", "unknown"], {
  description: "Device class from the user agent and client hints.",
});
export type DeviceType = Static<typeof DeviceType>;

export const TrafficFilter = oneOf(["human", "bots", "internal", "all"], {
  description:
    "Which traffic is counted. `human` (the default) leaves out bot scores of 50 and up, your own visits and localhost; `bots` keeps only scores of 50 and up; `internal` keeps only your own visits; `all` keeps everything.",
});
export type TrafficFilter = Static<typeof TrafficFilter>;

export const Environment = oneOf(["production", "preview", "all"], {
  description:
    "`production` (the default) leaves preview deployments out, `preview` keeps only them, `all` keeps both.",
});
export type Environment = Static<typeof Environment>;

export const Interval = oneOf(["hour", "day", "week", "month"], {
  description: "Bucket size for a series. Buckets start at UTC midnight; weeks start on Monday.",
});
export type Interval = Static<typeof Interval>;

export const Period = oneOf(["24h", "7d", "30d", "90d", "12mo", "all"], {
  description:
    "A range ending at the start of today in UTC (`24h` ends at the start of this hour). Ignored when `from` and `to` are sent; `30d` by default.",
});
export type Period = Static<typeof Period>;

export const Percentile = Type.Union([
  Type.Literal(50),
  Type.Literal(75),
  Type.Literal(90),
  Type.Literal(95),
  Type.Literal(99),
]);
export type Percentile = Static<typeof Percentile>;

export const VitalMetric = oneOf(["lcp", "inp", "cls", "fcp", "ttfb"]);
export type VitalMetric = Static<typeof VitalMetric>;

export const VitalRating = oneOf(["good", "needs-improvement", "poor"], {
  description: "The Core Web Vitals rating for the value, by Google's thresholds.",
});
export type VitalRating = Static<typeof VitalRating>;

export const NavigationType = oneOf([
  "navigate",
  "reload",
  "back-forward",
  "back-forward-cache",
  "prerender",
  "restore",
]);
export type NavigationType = Static<typeof NavigationType>;

export const IssueStatus = oneOf(["open", "resolved", "ignored"], {
  description:
    "`resolved` reopens as a regression on the next occurrence; `ignored` stays muted until its time or occurrence limit runs out, then reopens.",
});
export type IssueStatus = Static<typeof IssueStatus>;

export const IssueLevel = oneOf(["error", "warning"], {
  description: '`warning` when the error was sent with `level: "warning"`, otherwise `error`.',
});
export type IssueLevel = Static<typeof IssueLevel>;

export const TokenScope = oneOf(["read", "sql", "admin"], {
  description:
    "Every token reads the projects it lists. `sql` also runs SQL on them where the project allows it; `admin` also changes them and, with no project list, creates projects and tokens.",
});
export type TokenScope = Static<typeof TokenScope>;

export const Role = oneOf(["owner", "admin", "analyst", "viewer"], {
  description:
    "Organization role. `viewer` reads aggregates, `analyst` adds visitor-level data and SQL, `admin` also changes the projects it lists, `owner` can do everything.",
});
export type Role = Static<typeof Role>;

export const Channel = oneOf([
  "direct",
  "search",
  "social",
  "referral",
  "email",
  "paid",
  "internal",
]);
export type Channel = Static<typeof Channel>;

export const BotReason = oneOf([
  "ua_crawler",
  "ua_automation",
  "edge_verified_bot",
  "asn_datacenter",
  "headers_inconsistent",
  "headers_missing",
  "client_webdriver",
  "client_headless",
  "client_no_input",
  "session_velocity",
  "ip_fanout",
]);
export type BotReason = Static<typeof BotReason>;

export const builtInEvents = [
  "pageview",
  "web_vital",
  "scroll_depth",
  "engagement",
  "click",
  "outbound_click",
  "file_download",
  "form_submit",
  "error",
  "not_found",
  "identify",
  "group",
  "experiment_exposure",
] as const;
export const BuiltInEvent = oneOf(builtInEvents);
export type BuiltInEvent = Static<typeof BuiltInEvent>;

export const EventName = Type.String({ minLength: 1, maxLength: 64 });
export type EventName = BuiltInEvent | (string & {});
