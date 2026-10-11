import type { ProjectScope } from "@spoar/client";
import type { EventRow, Interval, TimeseriesPoint, TrafficFilter } from "@spoar/contract";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import type { FilterDimension } from "./view-state";

export type Outcome = "human" | "bot" | "internal";

export type OutcomeSeries = { outcome: Outcome; label: string; points: TimeseriesPoint[] };

export type FieldGroup = { label: string; fields: readonly FilterDimension[] };

const outcomes = [
  { outcome: "human", label: "Human", traffic: "human" },
  { outcome: "bot", label: "Bot", traffic: "bots" },
  { outcome: "internal", label: "Internal", traffic: "internal" },
] as const satisfies readonly { outcome: Outcome; label: string; traffic: TrafficFilter }[];

export const trafficOptions = [
  { value: "all", label: "All traffic" },
  { value: "human", label: "Human" },
  { value: "bots", label: "Bots" },
  { value: "internal", label: "Internal" },
] as const satisfies readonly { value: TrafficFilter; label: string }[];

export const fieldGroups = [
  { label: "Request", fields: ["page", "route", "host"] },
  { label: "Source", fields: ["referrer_domain", "channel"] },
  { label: "Client", fields: ["country", "browser", "os", "device"] },
] as const satisfies readonly FieldGroup[];

export const logPageSize = 50;

const botScore = 50;

function isTraffic(value: string | undefined): value is TrafficFilter {
  return trafficOptions.some((option) => option.value === value);
}

/**
 * @name logTraffic
 * @description The traffic the log page shows, from the path segment after `/logs`. Unlike the
 * analytics views it defaults to all traffic, so bots and your own visits show up in the log.
 *
 * @example
 * logTraffic("bots"); // "bots"
 * logTraffic(undefined); // "all"
 */
export function logTraffic(segment: string | undefined): TrafficFilter {
  return isTraffic(segment) ? segment : "all";
}

/**
 * @name logPath
 * @description The URL of the log for one traffic choice; all traffic lives at `/logs` itself.
 *
 * @example
 * logPath("/projects/skriuw", "bots"); // "/projects/skriuw/logs/bots"
 */
export function logPath(base: string, traffic: TrafficFilter) {
  return traffic === "all" ? `${base}/logs` : `${base}/logs/${traffic}`;
}

/**
 * @name eventOutcome
 * @description How the log classifies one event: your own visits are internal, a bot score of
 * 50 and up is a bot, everything else is human. Matches the API's `traffic` filter.
 *
 * @example
 * eventOutcome({ isInternal: false, bot: { score: 72, reasons: [] } }); // "bot"
 */
export function eventOutcome(row: Pick<EventRow, "isInternal" | "bot">): Outcome {
  if (row.isInternal) return "internal";
  return row.bot.score >= botScore ? "bot" : "human";
}

/**
 * @name readOutcomes
 * @description Page views over time once per traffic outcome, for the log's outcome chart. The
 * scope's own traffic filter is replaced per series.
 *
 * @example
 * const read = await readOutcomes(scope);
 */
export async function readOutcomes(
  scope: ProjectScope,
): Promise<Result<{ series: OutcomeSeries[]; interval: Interval }, string>> {
  const reads = await Promise.all(
    outcomes.map(async (entry) => ({
      entry,
      read: await scope.traffic(entry.traffic).timeseries("pageviews"),
    })),
  );
  const failed = reads.find(({ read }) => !read.ok);
  if (failed && !failed.read.ok) return err(failed.read.error.message);
  const series = reads.flatMap(({ entry, read }) =>
    read.ok ? [{ outcome: entry.outcome, label: entry.label, points: read.value.data }] : [],
  );
  const first = reads[0]?.read;
  return ok({ series, interval: first?.ok ? first.value.interval : "day" });
}

/**
 * @name sumPoints
 * @description The total of a series, skipping empty buckets.
 *
 * @example
 * sumPoints([{ bucket: "2026-10-01", value: 3 }, { bucket: "2026-10-02", value: 4 }]); // 7
 */
export function sumPoints(points: readonly { value: number | null }[]) {
  return points.reduce((sum, point) => sum + (point.value ?? 0), 0);
}
