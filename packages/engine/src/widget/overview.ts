import type { Overview } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { Dimension } from "../define";
import { findDimension } from "../dimensions";
import { engineError } from "../errors";
import type { EngineError } from "../errors";
import type {
  BreakdownPage,
  IssueStore,
  LogStore,
  Metric,
  ReadScope,
  ReadStore,
  SpeedStore,
  Traffic,
  VitalStat,
  WidgetStore,
} from "../ports";
import { rawVitalsFrom } from "../speed/retention";

export type OverviewPorts = {
  reads: ReadStore;
  speed: SpeedStore;
  issues: IssueStore;
  logs: LogStore;
  widget: WidgetStore;
};

const minuteMs = 60_000;
const dayMs = 24 * 60 * minuteMs;
const realtimeMinutes = 5;
const sparkMinutes = 10;
const errorMinutes = 30;
const speedDays = 7;
const speedPercentile = 75;
const minSamples = 20;
const topCount = 5;
const reasonCount = 20;
const visitorsMetric: Metric = { kind: "built-in", name: "visitors" };
const pageviewsMetric: Metric = { kind: "built-in", name: "pageviews" };
const eventsMetric: Metric = { kind: "built-in", name: "events" };

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function share(part: number, whole: number) {
  return whole > 0 ? Math.min(1, round(part / whole, 3)) : 0;
}

function startOfDay(at: Date) {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

function scope(project: ProjectID, from: Date, to: Date, traffic: Traffic): ReadScope {
  return { projectIds: [project], from, to, traffic, environment: "production", filters: [] };
}

function dimension(name: string): Result<Dimension, EngineError> {
  const found = findDimension(name);
  return found ? ok(found) : err(engineError("INTERNAL", `The ${name} dimension is missing`));
}

function counted(page: BreakdownPage, value: string) {
  return page.rows.find((row) => row.value === value)?.metrics[0] ?? 0;
}

function vital(stats: VitalStat[], metric: VitalStat["metric"]): Nullable<number> {
  const stat = stats.find((entry) => entry.metric === metric);
  if (!stat || stat.samples < minSamples) return null;
  return metric === "cls" ? round(stat.value, 3) : Math.round(stat.value);
}

/**
 * @name composeOverview
 * @description The widget's status numbers for one project in one answer, from the existing
 * reads: visitors online in the last five minutes and human pageviews per minute for the last
 * ten; today's (UTC) visitors, pageviews, bounce rate and average session; the last day's ingest
 * totals from the log lines; the last day's bot share of visitors and visitors flagged headless,
 * webdriver or from a datacenter ASN; the p75 of LCP, INP, CLS and TTFB over seven days (null
 * under 20 samples); errors in the last 30 minutes and open issues; today's top five pages,
 * referrer domains and countries; and the newest release.
 *
 * @example
 * const overview = await composeOverview(ports, "docs", new Date());
 */
export async function composeOverview(
  ports: OverviewPorts,
  project: ProjectID,
  now: Date,
): Promise<Result<Overview, EngineError>> {
  const page = dimension("page");
  const referrer = dimension("referrer_domain");
  const country = dimension("country");
  const event = dimension("event");
  const reason = dimension("bot_reason");
  if (!page.ok) return page;
  if (!referrer.ok) return referrer;
  if (!country.ok) return country;
  if (!event.ok) return event;
  if (!reason.ok) return reason;
  const today = scope(project, startOfDay(now), now, "human");
  const day = new Date(now.getTime() - dayMs);
  const top = { limit: topCount, offset: 0 };
  const [
    realtime,
    perMinute,
    headline,
    ingest,
    everyone,
    bots,
    reasons,
    speed,
    errors,
    open,
    pages,
    referrers,
    countries,
    release,
  ] = await Promise.all([
    ports.reads.realtime([project], new Date(now.getTime() - realtimeMinutes * minuteMs), now),
    ports.widget.perMinute(project, now, sparkMinutes),
    ports.reads.headline(today),
    ports.logs.ingestTotals(project, day),
    ports.reads.headline(scope(project, day, now, "all")),
    ports.reads.headline(scope(project, day, now, "bots")),
    ports.reads.breakdown(scope(project, day, now, "all"), reason.value, [visitorsMetric], {
      limit: reasonCount,
      offset: 0,
    }),
    ports.speed.summary(
      {
        projectIds: [project],
        from: new Date(now.getTime() - speedDays * dayMs),
        to: now,
        device: "all",
        environment: "production",
        route: null,
        path: null,
        country: null,
        rawFrom: rawVitalsFrom(now),
      },
      speedPercentile,
    ),
    ports.reads.breakdown(
      scope(project, new Date(now.getTime() - errorMinutes * minuteMs), now, "human"),
      event.value,
      [eventsMetric],
      { limit: reasonCount, offset: 0 },
    ),
    ports.issues.list([project], "open", { limit: 1, offset: 0 }),
    ports.reads.breakdown(today, page.value, [pageviewsMetric], top),
    ports.reads.breakdown(today, referrer.value, [visitorsMetric], top),
    ports.reads.breakdown(today, country.value, [visitorsMetric], top),
    ports.widget.release(project),
  ]);
  if (!realtime.ok) return realtime;
  if (!perMinute.ok) return perMinute;
  if (!headline.ok) return headline;
  if (!ingest.ok) return ingest;
  if (!everyone.ok) return everyone;
  if (!bots.ok) return bots;
  if (!reasons.ok) return reasons;
  if (!speed.ok) return speed;
  if (!errors.ok) return errors;
  if (!open.ok) return open;
  if (!pages.ok) return pages;
  if (!referrers.ok) return referrers;
  if (!countries.ok) return countries;
  if (!release.ok) return release;
  return ok({
    online: realtime.value.visitors,
    viewsPerMinute: perMinute.value,
    today: {
      visitors: headline.value.visitors,
      pageviews: headline.value.pageviews,
      bounceRate: round(headline.value.bounceRate, 3),
      avgSessionSeconds: Math.round(headline.value.sessionDurationMs / 1000),
    },
    ingest: { last24h: ingest.value },
    bots: {
      share: share(bots.value.visitors, everyone.value.visitors),
      headless: counted(reasons.value, "client_headless"),
      webdriver: counted(reasons.value, "client_webdriver"),
      datacenterAsn: counted(reasons.value, "asn_datacenter"),
    },
    speed: {
      lcp: vital(speed.value, "lcp"),
      inp: vital(speed.value, "inp"),
      cls: vital(speed.value, "cls"),
      ttfb: vital(speed.value, "ttfb"),
    },
    errors: { last30m: counted(errors.value, "error"), openIssues: open.value.total },
    topPages: pages.value.rows.map((row) => ({ path: row.value, views: row.metrics[0] ?? 0 })),
    referrers: referrers.value.rows.map((row) => ({
      name: row.value,
      share: share(row.visitors, referrers.value.scopeVisitors),
    })),
    countries: countries.value.rows.map((row) => ({
      code: row.value,
      share: share(row.visitors, countries.value.scopeVisitors),
    })),
    release: release.value
      ? {
          current: release.value.current,
          deployedAt: release.value.deployedAt.toISOString(),
          newIssuesSince: release.value.newIssuesSince,
        }
      : null,
  });
}
