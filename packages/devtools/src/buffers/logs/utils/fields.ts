import type { LogEntry, LogOutcome } from "../../../client/types";
import type { Fields } from "../../../filter/parse";
import type { Tone } from "../../../ui/format";

export const logFields: Fields<LogEntry> = {
  level: (row) => row.level,
  outcome: (row) => row.outcome,
  kind: (row) => row.kind,
  src: (row) => row.source,
  source: (row) => row.source,
  code: (row) => row.code,
  visitor: (row) => row.visitor,
  path: (row) => row.path,
};

export function logText(row: LogEntry) {
  return [row.message, row.code, row.visitor, row.path, row.kind, row.source]
    .filter(Boolean)
    .join(" ");
}

const tones: { [Outcome in LogOutcome]: Tone } = {
  sent: "ok",
  retry: "warn",
  rejected: "bad",
  dropped: "none",
  signal: "bad",
  job: "info",
  info: "none",
};

export function outcomeTone(row: LogEntry): Tone {
  return tones[row.outcome];
}

export const logColumns = "92px 72px 84px minmax(0,1fr) 150px 16px";

export const logHeader = ["time", "level", "kind", "message", "source", ""];
