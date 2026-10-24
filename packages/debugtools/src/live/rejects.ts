import type { LogLine } from "@spoar/contract";

export type Reject = {
  id: string;
  ts: string;
  reason: string;
  event: string | null;
  field: string | null;
  detail: string;
};

export const rejectQueries = [
  "RA_INGEST_REJECTED",
  "RA_RATE_LIMITED",
  "RA_ORIGIN_REFUSED",
] as const;

const rejectedCode = "RA_INGEST_REJECTED";
const rateLimitedCode = "RA_RATE_LIMITED";
const originRefusedCode = "RA_ORIGIN_REFUSED";
const limit = 50;

function text(value: LogLine["data"][string] | undefined) {
  return typeof value === "string" ? value : null;
}

function reject(line: LogLine): Reject | null {
  const { code, reason, event, field } = line.data;
  if (code === rejectedCode) {
    return {
      id: line.id,
      ts: line.ts,
      reason: text(reason) ?? "REJECTED",
      event: text(event),
      field: text(field),
      detail: line.message.replace(`${rejectedCode} `, ""),
    };
  }
  if (code === rateLimitedCode) {
    return {
      id: line.id,
      ts: line.ts,
      reason: "RATE_LIMITED",
      event: null,
      field: null,
      detail: line.message.replace(`${rateLimitedCode} `, ""),
    };
  }
  if (code === originRefusedCode) {
    return {
      id: line.id,
      ts: line.ts,
      reason: "FORBIDDEN_ORIGIN",
      event: null,
      field: null,
      detail: line.message.replace(`${originRefusedCode} `, ""),
    };
  }
  return null;
}

/**
 * @name rejectsFrom
 * @description The rejected events, rate limited requests and refused origins among log lines, newest first and at
 * most 50, each with its reason code, event name, field and the engine's message. Other lines are
 * dropped.
 *
 * @example
 * rejectsFrom(lines)[0]; // { reason: "VALIDATION_FAILED", event: "signup", field: "props", ... }
 */
export function rejectsFrom(lines: LogLine[]): Reject[] {
  return lines
    .map(reject)
    .filter((row) => row !== null)
    .sort((a, b) => Number(BigInt(b.id) - BigInt(a.id)))
    .slice(0, limit);
}
