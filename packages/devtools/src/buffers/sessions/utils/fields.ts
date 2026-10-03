import type { LiveSession } from "../../../client/types";
import type { Fields } from "../../../filter/parse";
import type { Tone } from "../../../ui/format";

export const sessionFields: Fields<LiveSession> = {
  id: (row) => row.id,
  visitor: (row) => row.visitor,
  signal: (row) => row.signal,
  bot: (row) => row.botScore,
  pages: (row) => row.pages,
  duration: (row) => row.durationMs,
  path: (row) => row.trail.join(" "),
};

export function sessionText(row: LiveSession) {
  return [row.id, row.visitor, row.signal, ...row.trail].join(" ");
}

export function signalTone(row: LiveSession): Tone {
  if (row.signal === "bot") return "bad";
  return row.signal === "suspect" ? "warn" : "ok";
}

export function signalLabel(row: LiveSession) {
  return row.signal === "bot" ? `bot ${row.botScore.toFixed(2)}` : row.signal;
}

export const sessionColumns = "92px 112px minmax(0,1.6fr) 56px 72px 90px 16px";

export const sessionHeader = ["started", "session", "trail", "pages", "duration", "signal", ""];
