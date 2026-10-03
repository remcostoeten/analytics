import type { LogData, LogValue, RejectedEvent } from "@remcostoeten/analytics-contract";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EventDraft } from "../draft";
import type { NewLogLine } from "../ports";
import { botLabel } from "../signals/verdict";

export const batchCode = "RA_INGEST_BATCH";
const rejectedCode = "RA_INGEST_REJECTED";
const duplicateCode = "RA_INGEST_DUPLICATE";
export const rateLimitedCode = "RA_RATE_LIMITED";
const verdictCode = "RA_BOT_VERDICT";
const jobCode = "RA_JOB";

// An email address anywhere in a string.
const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// A dotted IPv4 address, or an IPv6 address with at least three colon groups.
const addressPattern = /\b\d{1,3}(?:\.\d{1,3}){3}\b|\b[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){3,7}\b/i;
// The field after `events[n]` in a parse error, such as `props` in `events[3].props.plan: ...`.
const fieldPattern = /^events\[\d+\]\.([A-Za-z]+)/;

type RawEvent = { name: Nullable<string>; visitor: Nullable<string>; session: Nullable<string> };

function scrubbed(value: string) {
  return emailPattern.test(value) || addressPattern.test(value) ? "[redacted]" : value;
}

function scrubValue(value: LogValue): LogValue {
  if (typeof value === "string") return scrubbed(value);
  if (Array.isArray(value)) return value.map(scrubbed);
  return value;
}

/**
 * @name scrubData
 * @description Replaces any string in log data that holds an email address or an IP address with
 * `[redacted]`, keeping the keys, so client reports cannot store personal data.
 *
 * @example
 * scrubData({ to: "a@b.nl", count: 2 }); // { to: "[redacted]", count: 2 }
 */
export function scrubData(data: LogData): LogData {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, scrubValue(value)]));
}

/**
 * @name scrubMessage
 * @description A log message with email and IP addresses replaced by `[redacted]`.
 *
 * @example
 * scrubMessage("sent to a@b.nl"); // "sent to [redacted]"
 */
export function scrubMessage(message: string): string {
  return message
    .split(/\s+/)
    .map((word) => scrubbed(word))
    .join(" ");
}

function text(value: unknown): Nullable<string> {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * @name rawEvent
 * @description The name, visitor and session of a raw batch entry when they are strings, read
 * without trusting the rest of it, so a rejected event can still be attributed.
 *
 * @example
 * rawEvent({ name: "signup", visitor: "v1" }); // { name: "signup", visitor: "v1", session: null }
 */
export function rawEvent(raw: unknown): RawEvent {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { name: null, visitor: null, session: null };
  }
  const entries = new Map(Object.entries(raw));
  return {
    name: text(entries.get("name")),
    visitor: text(entries.get("visitor")),
    session: text(entries.get("session")),
  };
}

function base(project: ProjectID, at: Date): Pick<NewLogLine, "project" | "ts" | "source"> {
  return { project, ts: at, source: "api" };
}

/**
 * @name rejectedLine
 * @description The error line for one rejected event: the reason code, its index, the event name
 * and the field the parse error names. Never the event's values.
 *
 * @example
 * rejectedLine("docs", at, rejected, rawEvent(body.events[3]));
 */
export function rejectedLine(
  project: ProjectID,
  at: Date,
  rejected: RejectedEvent,
  raw: RawEvent,
): NewLogLine {
  const field = fieldPattern.exec(rejected.message)?.[1] ?? null;
  return {
    ...base(project, at),
    level: "error",
    kind: "ingest",
    message: `${rejectedCode} ${rejected.message}${raw.name ? ` on ${raw.name}` : ""}`,
    data: {
      code: rejectedCode,
      reason: rejected.code,
      index: rejected.index,
      event: raw.name,
      field,
    },
    visitor: raw.visitor,
    session: raw.session,
  };
}

/**
 * @name batchLines
 * @description The line every stored batch writes once, `ok` when nothing was rejected, with the
 * accepted, duplicate and rejected counts; plus a `warn` line when some events were already
 * stored.
 *
 * @example
 * batchLines("docs", at, { accepted: 12, duplicates: 0, rejected: [] });
 */
export function batchLines(
  project: ProjectID,
  at: Date,
  counts: { accepted: number; duplicates: number; rejected: number },
): NewLogLine[] {
  const batch: NewLogLine = {
    ...base(project, at),
    level: counts.rejected > 0 ? "warn" : "ok",
    kind: "ingest",
    message: `${batchCode} ${counts.accepted} accepted, ${counts.duplicates} duplicates, ${counts.rejected} rejected`,
    data: { code: batchCode, ...counts },
    visitor: null,
    session: null,
  };
  if (counts.duplicates === 0) return [batch];
  return [
    batch,
    {
      ...base(project, at),
      level: "warn",
      kind: "ingest",
      message: `${duplicateCode} ${counts.duplicates} events were already stored`,
      data: { code: duplicateCode, duplicates: counts.duplicates },
      visitor: null,
      session: null,
    },
  ];
}

/**
 * @name rateLimitedLine
 * @description The `warn` line for an ingest request refused by the rate limiter.
 *
 * @example
 * rateLimitedLine("docs", at, 12);
 */
export function rateLimitedLine(
  project: ProjectID,
  at: Date,
  retryAfterSeconds: number,
): NewLogLine {
  return {
    ...base(project, at),
    level: "warn",
    kind: "ingest",
    message: `${rateLimitedCode} retry after ${retryAfterSeconds}s`,
    data: { code: rateLimitedCode, retryAfterSeconds },
    visitor: null,
    session: null,
  };
}

/**
 * @name verdictLines
 * @description A `signals` line for each stored draft the bot score marks `suspect` or `bot`, with
 * the score, the verdict and the reasons.
 *
 * @example
 * verdictLines(drafts, at);
 */
export function verdictLines(drafts: EventDraft[], at: Date): NewLogLine[] {
  return drafts.flatMap((draft) => {
    const verdict = botLabel(draft.bot.score);
    if (verdict === "human") return [];
    return [
      {
        project: draft.projectId,
        ts: at,
        level: verdict === "bot" ? "warn" : "info",
        kind: "signals",
        source: "engine",
        message: `${verdictCode} ${verdict} score ${draft.bot.score} on ${draft.event.name}: ${draft.bot.reasons.join(", ")}`,
        data: {
          code: verdictCode,
          verdict,
          score: draft.bot.score,
          reasons: draft.bot.reasons,
          event: draft.event.name,
        },
        visitor: draft.event.visitor,
        session: draft.event.session,
      },
    ];
  });
}

/**
 * @name jobLine
 * @description The `jobs` line a cron run writes for a project: `ok` or `error`, the duration and
 * the rows it wrote and deleted.
 *
 * @example
 * jobLine("docs", at, { job: "cleanup", ok: true, durationMs: 120, rowsWritten: null, rowsDeleted: 4 });
 */
export function jobLine(
  project: ProjectID,
  at: Date,
  run: {
    job: string;
    ok: boolean;
    durationMs: number;
    rowsWritten: Nullable<number>;
    rowsDeleted: Nullable<number>;
  },
): NewLogLine {
  return {
    project,
    ts: at,
    level: run.ok ? "ok" : "error",
    kind: "jobs",
    source: "cron",
    message: `${jobCode} ${run.job} ${run.ok ? "ok" : "failed"} in ${run.durationMs} ms`,
    data: {
      code: jobCode,
      job: run.job,
      status: run.ok ? "ok" : "failed",
      durationMs: run.durationMs,
      rowsWritten: run.rowsWritten,
      rowsDeleted: run.rowsDeleted,
    },
    visitor: null,
    session: null,
  };
}
