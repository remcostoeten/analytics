import Type from "typebox";
import type { Static } from "typebox";

export const Visibility = Type.Enum(["public", "private"]);
export type Visibility = Static<typeof Visibility>;

export const DeviceType = Type.Enum(["desktop", "mobile", "tablet", "bot", "unknown"]);
export type DeviceType = Static<typeof DeviceType>;

export const TrafficFilter = Type.Enum(["human", "bots", "internal", "all"]);
export type TrafficFilter = Static<typeof TrafficFilter>;

export const Interval = Type.Enum(["hour", "day", "week", "month"]);
export type Interval = Static<typeof Interval>;

export const Period = Type.Enum(["24h", "7d", "30d", "90d", "12mo", "all"]);
export type Period = Static<typeof Period>;

export const Percentile = Type.Union([
  Type.Literal(50),
  Type.Literal(75),
  Type.Literal(90),
  Type.Literal(95),
  Type.Literal(99),
]);
export type Percentile = Static<typeof Percentile>;

export const VitalMetric = Type.Enum(["lcp", "inp", "cls", "fcp", "ttfb"]);
export type VitalMetric = Static<typeof VitalMetric>;

export const VitalRating = Type.Enum(["good", "needs-improvement", "poor"]);
export type VitalRating = Static<typeof VitalRating>;

export const NavigationType = Type.Enum([
  "navigate",
  "reload",
  "back-forward",
  "back-forward-cache",
  "prerender",
  "restore",
]);
export type NavigationType = Static<typeof NavigationType>;

export const IssueStatus = Type.Enum(["open", "resolved", "ignored"]);
export type IssueStatus = Static<typeof IssueStatus>;

export const IssueLevel = Type.Enum(["error", "warning"]);
export type IssueLevel = Static<typeof IssueLevel>;

export const TokenScope = Type.Enum(["read", "admin"]);
export type TokenScope = Static<typeof TokenScope>;

export const Channel = Type.Enum([
  "direct",
  "search",
  "social",
  "referral",
  "email",
  "paid",
  "internal",
]);
export type Channel = Static<typeof Channel>;

export const BotReason = Type.Enum([
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
  "experiment_exposure",
] as const;
export const BuiltInEvent = Type.Enum(builtInEvents);
export type BuiltInEvent = Static<typeof BuiltInEvent>;

export const EventName = Type.String({ minLength: 1, maxLength: 64 });
export type EventName = BuiltInEvent | (string & {});
