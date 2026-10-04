import { ok } from "@spoar/shared/result";
import type { SQL } from "drizzle-orm";

import type { Database } from "./drizzle";
import { unavailable } from "./drizzle";

export type Row = { [column: string]: unknown };

/**
 * @name selectRows
 * @description Runs a raw query and returns its rows, whichever shape the driver answers with.
 *
 * @example
 * const rows = await selectRows(db, sql`SELECT 1 AS one`);
 */
export async function selectRows(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  if (Array.isArray(result)) return result;
  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows;
  }
  return [];
}

/**
 * @name numeric
 * @description A column value as a finite number, zero when missing or not a number.
 *
 * @example
 * numeric("12"); // 12
 */
export function numeric(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @name textual
 * @description A column value as text, with dates as ISO timestamps.
 *
 * @example
 * textual(new Date(0)); // "1970-01-01T00:00:00.000Z"
 */
export function textual(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/**
 * @name rounded
 * @description Rounds to a number of decimal places.
 *
 * @example
 * rounded(0.12345, 3); // 0.123
 */
export function rounded(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * @name attempt
 * @description Runs a read and turns a thrown database error into an `UNAVAILABLE` result.
 *
 * @example
 * await attempt("Could not read the stats", () => selectRows(db, query));
 */
export async function attempt<Value>(message: string, run: () => Promise<Value>) {
  try {
    return ok(await run());
  } catch (error) {
    return unavailable(message, error);
  }
}
