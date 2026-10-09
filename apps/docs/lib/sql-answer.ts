import type { QueryRequest, QueryResult } from "@spoar/contract";
import { z } from "zod";

import type { SqlPreset, SqlPresetId } from "./sql-presets";

export type SqlOutcome =
  | { status: "done"; result: QueryResult }
  | { status: "failed"; message: string };

export type SqlShowcaseState = {
  id: SqlPresetId;
  outcome: SqlOutcome;
};

const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const result = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(cell)),
  rowCount: z.number().int().min(0),
  truncated: z.boolean(),
  durationMs: z.number().min(0),
});
const failure = z.object({ error: z.object({ message: z.string() }).partial() }).partial();

/**
 * @name sqlShowcaseRequest
 * @description The body for `POST /v2/projects/:project/query`: the preset's SQL with the window
 * bound as `:from` and `:to`.
 *
 * @example
 * sqlShowcaseRequest(preset, showcaseWindow());
 */
export function sqlShowcaseRequest(
  preset: SqlPreset,
  window: { from: Date; to: Date },
): QueryRequest {
  return {
    sql: preset.sql,
    params: { from: window.from.toISOString(), to: window.to.toISOString() },
  };
}

/**
 * @name parseSqlAnswer
 * @description Turns the API's status and JSON body into an outcome the page can show: the result
 * when it has the documented shape, else a sentence that says what went wrong.
 *
 * @example
 * parseSqlAnswer(429, null).message; // "The query budget for this minute is used up."
 */
export function parseSqlAnswer(status: number, body: unknown): SqlOutcome {
  if (status >= 200 && status < 300) {
    const parsed = result.safeParse(body);
    return parsed.success
      ? { status: "done", result: parsed.data }
      : { status: "failed", message: "The API answered in an unexpected shape." };
  }
  if (status === 429) {
    return { status: "failed", message: "The query budget for this minute is used up." };
  }
  const parsed = failure.safeParse(body);
  const message = parsed.success ? parsed.data.error?.message : undefined;
  return { status: "failed", message: message ?? `The API answered ${status}.` };
}
