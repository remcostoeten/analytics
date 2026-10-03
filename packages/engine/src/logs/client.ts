import type { ClientLog, ClientLogResult } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import { authorize } from "../authorize";
import type { Credentials } from "../draft";
import { engineError } from "../errors";
import type { EngineError } from "../errors";
import type { Clock, Hasher, LogStore, NewLogLine, ProjectStore, RateLimiter } from "../ports";
import { scrubData, scrubMessage } from "./lines";

export type ReportPorts = {
  projects: ProjectStore;
  hasher: Hasher;
  limiter: RateLimiter;
  logs: LogStore;
  clock: Clock;
};

export type ClientReport = {
  project: ProjectID;
  credentials: Credentials;
  origin: Nullable<string>;
  logs: ClientLog[];
};

export type ReportLimit = { limit: number; windowSeconds: number };

function reportTime(ts: string, now: Date) {
  const parsed = new Date(ts);
  return Number.isNaN(parsed.getTime()) || parsed > now ? now : parsed;
}

function reportLine(project: ProjectID, log: ClientLog, now: Date): NewLogLine {
  return {
    project,
    ts: reportTime(log.ts, now),
    level: log.level,
    kind: log.kind,
    source: "sdk",
    message: scrubMessage(log.message),
    data: scrubData(log.data ?? {}),
    visitor: log.visitor ?? null,
    session: log.session ?? null,
  };
}

/**
 * @name storeClientReports
 * @description Stores the SDK's `drop` and `error` outcomes as `sdk` log lines. The key is checked
 * like ingest (a public key from an allowed origin, or the secret key) and must belong to the
 * project in the path; the project needs `widgetReports` on, else `WIDGET_REPORTS_DISABLED`; each
 * project gets `limit` requests per window, else `RATE_LIMITED`. Email and IP addresses in the
 * message and data are replaced with `[redacted]`.
 *
 * @example
 * await storeClientReports(ports, { project: "docs", credentials, origin, logs }, { limit: 60, windowSeconds: 60 });
 */
export async function storeClientReports(
  ports: ReportPorts,
  report: ClientReport,
  limit: ReportLimit,
): Promise<Result<ClientLogResult, EngineError>> {
  const access = await authorize(ports.projects, ports.hasher, report.credentials, report.origin);
  if (!access.ok) return access;
  if (access.value.projectId !== report.project) {
    return err(engineError("FORBIDDEN", "The key belongs to another project"));
  }
  if (!access.value.widgetReports) {
    return err(engineError("WIDGET_REPORTS_DISABLED", "Client reports are off for this project"));
  }
  const decision = await ports.limiter.hit(
    `client-logs:${report.project}`,
    limit.limit,
    limit.windowSeconds,
  );
  if (!decision.allowed) {
    return err({
      ...engineError("RATE_LIMITED", "Too many client reports"),
      details: { retryAfterSeconds: decision.retryAfterSeconds },
    });
  }
  const now = ports.clock.now();
  const written = await ports.logs.write(
    report.logs.map((log) => reportLine(report.project, log, now)),
  );
  return written.ok ? ok({ accepted: report.logs.length }) : written;
}
