import type { ClientError, ProjectScope } from "@spoar/client";
import type { VitalRating } from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { Milliseconds, Nullable, ProjectID } from "@spoar/shared/semantic";

import { spanOf } from "../source";
import type { ClientAccess, TimeRange } from "../source";

export type PageRead<Value> = Result<Value, string>;

export type PageStats = {
  visitors: number;
  pageviews: number;
  bounceRate: Nullable<number>;
  timeOnPageMs: Nullable<Milliseconds>;
};

export type ReferrerCount = { referrer: string; visitors: number };

export type VitalName = "lcp" | "inp" | "cls" | "fcp" | "ttfb";

export type Vital = { name: VitalName; value: Nullable<number>; rating: Nullable<VitalRating> };

export type PageVitals = {
  score: Nullable<number>;
  rating: Nullable<VitalRating>;
  samples: number;
  metrics: Vital[];
};

export type PageIssue = { id: string; title: Nullable<string>; count: number };

export type PageReport = {
  stats: PageRead<PageStats>;
  referrers: PageRead<ReferrerCount[]>;
  vitals: PageRead<PageVitals>;
  issues: PageRead<PageIssue[]>;
};

export type ClickCount = { label: string; count: number };

const vitalNames: VitalName[] = ["lcp", "inp", "cls", "fcp", "ttfb"];

function readFailure(error: ClientError): string {
  if (error.status === 401 || error.status === 403) return "This console may not read this.";
  if (error.code === "NETWORK" || error.code === "TIMEOUT") return "The API did not answer.";
  return error.message || "The read failed.";
}

/**
 * @name normalisePath
 * @description Turns what an admin typed into a page path: trimmed, with a leading slash, and
 * without a query string or hash. An empty input becomes `/`.
 *
 * @example
 * normalisePath(" pricing?plan=pro "); // "/pricing"
 */
export function normalisePath(input: string): string {
  const path = input.trim().split(/[?#]/)[0] ?? "";
  if (path === "") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

async function pageScope(
  client: ClientAccess,
  project: ProjectID,
  path: string,
  range: TimeRange,
  now: Date,
): Promise<ProjectScope> {
  const from = new Date(now.getTime() - spanOf(range));
  return (await client()).project(project).between(from, now).where({ page: path });
}

async function readStats(scope: ProjectScope, path: string): Promise<PageRead<PageStats>> {
  const result = await scope.breakdown("page", {
    metrics: ["visitors", "pageviews", "bounce_rate", "time_on_page"],
    limit: 1,
  });
  if (!result.ok) return { ok: false, error: readFailure(result.error) };
  const row = result.value.data.find((item) => item.value === path) ?? result.value.data[0];
  return {
    ok: true,
    value: {
      visitors: row?.visitors ?? 0,
      pageviews: row?.pageviews ?? 0,
      bounceRate: row?.bounceRate ?? null,
      timeOnPageMs: row?.timeOnPageMs ?? row?.avgTimeMs ?? null,
    },
  };
}

async function readReferrers(scope: ProjectScope): Promise<PageRead<ReferrerCount[]>> {
  const result = await scope.breakdown("referrer_domain", { metrics: ["visitors"], limit: 5 });
  if (!result.ok) return { ok: false, error: readFailure(result.error) };
  return {
    ok: true,
    value: result.value.data.map((row) => ({ referrer: row.value, visitors: row.visitors ?? 0 })),
  };
}

async function readVitals(scope: ProjectScope): Promise<PageRead<PageVitals>> {
  const result = await scope.speed({ device: "all" });
  if (!result.ok) return { ok: false, error: readFailure(result.error) };
  const { data } = result.value;
  return {
    ok: true,
    value: {
      score: data.score,
      rating: data.rating,
      samples: data.samples,
      metrics: vitalNames.map((name) => ({
        name,
        value: data.metrics[name].value,
        rating: data.metrics[name].rating,
      })),
    },
  };
}

async function readIssues(scope: ProjectScope): Promise<PageRead<PageIssue[]>> {
  const result = await scope.breakdown("issue", { metrics: ["events"], limit: 5 });
  if (!result.ok) return { ok: false, error: readFailure(result.error) };
  const rows = result.value.data.filter((row) => row.value.startsWith("iss_"));
  if (rows.length === 0) return { ok: true, value: [] };
  const listed = await scope.issues({ limit: 100 });
  const titles = new Map(
    listed.ok ? listed.value.data.map((issue) => [issue.id, issue.title]) : [],
  );
  return {
    ok: true,
    value: rows.map((row) => ({
      id: row.value,
      title: titles.get(row.value) ?? null,
      count: row.events ?? 0,
    })),
  };
}

/**
 * @name readPage
 * @description Reads everything the "This page" tab shows for one path over a time range, in
 * parallel: visitors, pageviews, bounce rate and time on page from the `page` breakdown, the top
 * referrer domains, the Web Vitals summary and the issues whose errors happened on the path. Each
 * part is its own result, so one forbidden read leaves the others in place.
 *
 * @example
 * const report = await readPage(client, "site", "/pricing", "24h");
 * if (report.stats.ok) console.log(report.stats.value.visitors);
 */
export async function readPage(
  client: ClientAccess,
  project: ProjectID,
  path: string,
  range: TimeRange,
  now: Date = new Date(),
): Promise<PageReport> {
  const scope = await pageScope(client, project, path, range, now);
  const [stats, referrers, vitals, issues] = await Promise.all([
    readStats(scope, path),
    readReferrers(scope),
    readVitals(scope),
    readIssues(scope),
  ]);
  return { stats, referrers, vitals, issues };
}

/**
 * @name readClicks
 * @description Counts the `click` events the SDK's `clicks` plugin sent on one path over a time
 * range, per `label`, which is the clicked element's `data-spoar-click` value. Most clicked first.
 *
 * @example
 * const clicks = await readClicks(client, "site", "/pricing", "7d");
 * if (clicks.ok) console.table(clicks.value);
 */
export async function readClicks(
  client: ClientAccess,
  project: ProjectID,
  path: string,
  range: TimeRange,
  now: Date = new Date(),
): Promise<PageRead<ClickCount[]>> {
  const scope = await pageScope(client, project, path, range, now);
  const result = await scope
    .where({ event: "click" })
    .breakdown("prop:label", { metrics: ["events"], limit: 100 });
  if (!result.ok) return { ok: false, error: readFailure(result.error) };
  return {
    ok: true,
    value: result.value.data
      .map((row) => ({ label: row.value, count: row.events ?? 0 }))
      .filter((row) => row.label !== "")
      .sort((left, right) => right.count - left.count),
  };
}
