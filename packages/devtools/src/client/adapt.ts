import type {
  ActiveVisitor,
  BotDetail,
  ClientLog,
  LiveSession as ApiSession,
  LogLine,
  Overview as ApiOverview,
} from "@spoar/contract";
import type { Nullable, Path } from "@spoar/shared/semantic";

import type {
  ClientReport,
  LiveSession,
  LogEntry,
  LogOutcome,
  OnlineVisitor,
  Overview,
  Share,
  VisitorDetail,
} from "./types";

export type VisitorBot = { id: string; bot: BotDetail };

const outcomes = new Set<string>(["sent", "retry", "rejected", "dropped", "signal", "job", "info"]);
const maxMessage = 500;
const maxValue = 255;

function scale(score: number) {
  return score / 100;
}

function text(value: unknown): Nullable<string> {
  return typeof value === "string" ? value : null;
}

function isOutcome(value: Nullable<string>): value is LogOutcome {
  return value !== null && outcomes.has(value);
}

function outcomeOf(line: LogLine): LogOutcome {
  const named = text(line.data.outcome);
  if (isOutcome(named)) return named;
  if (line.level === "ok") return "sent";
  if (line.level === "error") return "rejected";
  if (line.kind === "jobs") return "job";
  if (line.kind === "signals") return "signal";
  return line.level === "warn" ? "retry" : "info";
}

/**
 * @name toVisitor
 * @description Turns an active visitor row into the panel's row, with the page trail of its
 * session when the live sessions are known, and the bot score from 0 to 1.
 *
 * @example
 * toVisitor(row, ["/", "/pricing"]).trail; // ["/", "/pricing"]
 */
export function toVisitor(row: ActiveVisitor, trail: Path[]): OnlineVisitor {
  return {
    id: row.visitor,
    session: row.session,
    seenAt: row.lastSeen,
    path: row.path ?? "/",
    referrer: row.referrer,
    country: row.country,
    city: row.city,
    device: row.device,
    botScore: scale(row.botScore),
    pages: row.pages,
    durationMs: row.duration * 1000,
    trail,
    client: { os: row.os, browser: row.browser },
    identified: row.identified,
  };
}

/**
 * @name toDetail
 * @description Reads the bot verdict from `GET /v2/projects/:project/visitors/:id`: the score
 * from 0 to 1, the label, and the client signals that fired.
 *
 * @example
 * toDetail({ id: "v1", bot }).signals; // ["headless", "datacenterAsn"]
 */
export function toDetail(visitor: VisitorBot): VisitorDetail {
  return {
    id: visitor.id,
    botScore: scale(visitor.bot.score),
    verdict: visitor.bot.verdict,
    signals: Object.entries(visitor.bot.signals)
      .filter(([, fired]) => fired === true)
      .map(([name]) => name),
  };
}

/**
 * @name toSession
 * @description Turns a live session row into the panel's row, with the bot score from 0 to 1.
 *
 * @example
 * toSession(row).signal; // "engaged"
 */
export function toSession(row: ApiSession): LiveSession {
  return {
    id: row.id,
    visitor: row.visitor,
    startedAt: row.startedAt,
    trail: row.trail,
    pages: row.pages,
    durationMs: row.durationMs,
    signal: row.signal,
    botScore: scale(row.botScore),
  };
}

/**
 * @name toLog
 * @description Turns a log line into the panel's entry. `ok` reads as `info` with the outcome
 * `sent`; otherwise the outcome comes from `data.outcome` or from the level and kind, and `code`
 * and `path` from `data`.
 *
 * @example
 * toLog(line).outcome; // "rejected"
 */
export function toLog(line: LogLine): LogEntry {
  return {
    id: line.id,
    at: line.ts,
    level: line.level === "ok" ? "info" : line.level,
    outcome: outcomeOf(line),
    kind: line.kind,
    source: line.source,
    message: line.message,
    code: text(line.data.code),
    visitor: line.visitor,
    path: text(line.data.path),
    data: line.data,
  };
}

function counts(rows: { label: string; value: number }[]): Share[] {
  return rows.map((row) => ({ ...row, unit: "count" }));
}

function ratios(rows: { label: string; value: number }[]): Share[] {
  return rows.map((row) => ({ ...row, unit: "ratio" }));
}

/**
 * @name toOverview
 * @description Turns `GET /v2/projects/:project/overview` into the statusline numbers: the
 * accepted ratio of the last day's ingest, the bot signals that fired, and the shares as labels.
 *
 * @example
 * toOverview(overview).ingest.ratio; // 0.996
 */
export function toOverview(overview: ApiOverview): Overview {
  const ingest = overview.ingest.last24h;
  const refused = ingest.rejected + ingest.rateLimited;
  const total = ingest.accepted + refused;
  const bots = [
    { label: "headless", value: overview.bots.headless },
    { label: "webdriver", value: overview.bots.webdriver },
    { label: "datacenter", value: overview.bots.datacenterAsn },
  ];
  return {
    online: overview.online,
    viewsPerMinute: overview.viewsPerMinute,
    today: {
      visitors: overview.today.visitors,
      pageviews: overview.today.pageviews,
      bounceRate: overview.today.bounceRate,
      sessionMs: Math.round(overview.today.avgSessionSeconds * 1000),
    },
    ingest: {
      accepted: ingest.accepted,
      rejected: refused,
      duplicates: ingest.duplicates,
      ratio: total === 0 ? 1 : ingest.accepted / total,
    },
    bots: {
      share: overview.bots.share,
      reasons: counts(bots.filter((reason) => reason.value > 0)),
    },
    topPages: counts(overview.topPages.map((row) => ({ label: row.path, value: row.views }))),
    referrers: ratios(overview.referrers.map((row) => ({ label: row.name, value: row.share }))),
    countries: ratios(overview.countries.map((row) => ({ label: row.code, value: row.share }))),
    release: overview.release
      ? {
          name: overview.release.current,
          deployedAt: overview.release.deployedAt,
          newIssues: overview.release.newIssuesSince,
        }
      : null,
    lcp: overview.speed.lcp,
    errors: overview.errors.last30m,
  };
}

/**
 * @name toClientLog
 * @description Turns an SDK `drop` or `error` outcome into the body row of
 * `POST /v2/projects/:project/logs/client`, keeping the outcome, code and path in `data` so the
 * line reads back the same way.
 *
 * @example
 * toClientLog({ at, outcome: "error", code: "RA_INGEST_FAILED", message, path: "/" }).kind; // "transport"
 */
export function toClientLog(report: ClientReport): ClientLog {
  const dropped = report.outcome === "dropped";
  return {
    kind: dropped ? "pipeline" : "transport",
    level: dropped ? "info" : "error",
    message: report.message.slice(0, maxMessage),
    data: {
      outcome: dropped ? "dropped" : "rejected",
      code: report.code.slice(0, maxValue),
      path: report.path.slice(0, maxValue),
    },
    ts: report.at,
  };
}
