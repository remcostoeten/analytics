import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { oneOf } from "./schema";

export const Visibility = oneOf(["public", "private"]);
export type Visibility = Static<typeof Visibility>;

export const DeviceType = oneOf(["desktop", "mobile", "tablet", "bot", "unknown"]);
export type DeviceType = Static<typeof DeviceType>;

export const TrafficFilter = oneOf(["human", "bots", "internal", "all"]);
export type TrafficFilter = Static<typeof TrafficFilter>;

export const Interval = oneOf(["hour", "day", "week", "month"]);
export type Interval = Static<typeof Interval>;

export const Period = oneOf(["24h", "7d", "30d", "90d", "12mo", "all"]);
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

export const VitalRating = oneOf(["good", "needs-improvement", "poor"]);
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

export const IssueStatus = oneOf(["open", "resolved", "ignored"]);
export type IssueStatus = Static<typeof IssueStatus>;

export const IssueLevel = oneOf(["error", "warning"]);
export type IssueLevel = Static<typeof IssueLevel>;

export const TokenScope = oneOf(["read", "sql", "admin"]);
export type TokenScope = Static<typeof TokenScope>;

export const Role = oneOf(["owner", "admin", "analyst", "viewer"]);
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
