import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";
import { engineError } from "../errors";
import type { Cell, Hasher, QueryRunner } from "../ports";
import type { PreparedQuery } from "./guard";

export type Statement = { text: string; params: unknown[] };

export type Answer = { columns: string[]; rows: unknown[][] };

export type Transact = (statements: Statement[]) => Promise<Answer>;

export type QueryLimits = { timeoutMs: number; maxRows: number };

const userErrorClasses = ["21", "22", "2B", "42", "54", "0A"];

function arrayLiteral(values: string[]) {
  return `{${values.map((value) => `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(",")}}`;
}

function cell(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") {
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function failure(error: unknown, limits: QueryLimits): EngineError {
  const code = errorCode(error);
  if (code === "57014") {
    return engineError(
      "VALIDATION_FAILED",
      `The query ran longer than ${limits.timeoutMs / 1000} seconds`,
    );
  }
  if (code === "42501") {
    return engineError(
      "VALIDATION_FAILED",
      `Only the views in /v2/query/schema can be read (${errorMessage(error)})`,
    );
  }
  if (userErrorClasses.some((prefix) => code.startsWith(prefix))) {
    return engineError("VALIDATION_FAILED", errorMessage(error));
  }
  return {
    ...engineError("UNAVAILABLE", "Could not run the query"),
    cause: new Error(errorMessage(error)),
  };
}

function planOf(answer: Answer) {
  const [[raw] = []] = answer.rows;
  const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  const root: unknown = Array.isArray(parsed) ? parsed[0] : null;
  const plan: unknown =
    typeof root === "object" && root !== null && "Plan" in root ? root.Plan : null;
  if (typeof plan !== "object" || plan === null)
    return { totalCost: 0, estimatedRows: 0, plan: parsed };
  const cost = "Total Cost" in plan ? Number(plan["Total Cost"]) : 0;
  const rows = "Plan Rows" in plan ? Number(plan["Plan Rows"]) : 0;
  return { totalCost: cost, estimatedRows: rows, plan: parsed };
}

/**
 * @name queryRunner
 * @description Runs console queries through any driver's read-only transaction. Each run sets the
 * caller's project ids and their signature (a double SHA-256 over the database's `query_secret`),
 * switches to the `analytics_reader` role, which can read only the `query` views, and sets the
 * statement timeout; the views return rows only for signed project ids. Results stop at
 * `maxRows`, with `truncated` set when there were more. Errors in the query itself come back as
 * `VALIDATION_FAILED` with Postgres' message.
 *
 * @example
 * const runner = queryRunner(transact, readSecret, webCryptoHasher(), { timeoutMs: 10_000, maxRows: 10_000 });
 * await runner.run(prepared, ["remcostoeten.nl"]);
 */
export function queryRunner(
  transact: Transact,
  readSecret: () => Promise<string>,
  hasher: Hasher,
  limits: QueryLimits,
): QueryRunner {
  let secret: Promise<string> | null = null;

  async function scoped(projectIds: ProjectID[], final: Statement): Promise<Statement[]> {
    secret ??= readSecret().catch((error: unknown) => {
      secret = null;
      throw error;
    });
    const key = await secret;
    const ids = arrayLiteral(projectIds);
    const signature = await hasher.sha256(key + (await hasher.sha256(key + ids)));
    return [
      {
        text: "SELECT set_config('app.project_ids', $1, true), set_config('app.project_sig', $2, true)",
        params: [ids, signature],
      },
      { text: "SET LOCAL ROLE analytics_reader", params: [] },
      { text: "SET LOCAL search_path = query", params: [] },
      { text: `SET LOCAL statement_timeout = ${Math.round(limits.timeoutMs)}`, params: [] },
      final,
    ];
  }

  async function answer(projectIds: ProjectID[], final: Statement) {
    try {
      return ok(await transact(await scoped(projectIds, final)));
    } catch (error) {
      return err(failure(error, limits));
    }
  }

  return {
    run: async (query: PreparedQuery, projectIds) => {
      const found = await answer(projectIds, {
        text: `SELECT * FROM (${query.text}\n) AS result LIMIT ${limits.maxRows + 1}`,
        params: query.params,
      });
      if (!found.ok) return found;
      const rows = found.value.rows.slice(0, limits.maxRows).map((row) => row.map(cell));
      return ok({
        columns: found.value.columns,
        rows,
        truncated: found.value.rows.length > limits.maxRows,
      });
    },
    explain: async (query: PreparedQuery, projectIds) => {
      const found = await answer(projectIds, {
        text: `EXPLAIN (FORMAT JSON) ${query.text}`,
        params: query.params,
      });
      return found.ok ? ok(planOf(found.value)) : found;
    },
  };
}
