"use server";

import type { SqlShowcaseState } from "@/lib/sql-answer";
import { findSqlPreset, sqlPresets } from "@/lib/sql-presets";
import { runSqlPreset } from "@/lib/sql-showcase";

/**
 * @name runSqlShowcase
 * @description The form action behind the landing page's query tabs: runs the chosen preset on
 * the server and answers with its id and outcome. Anything that is not a preset id is refused, so
 * a visitor never sends SQL of their own.
 *
 * @example
 * const [state, action] = useActionState(runSqlShowcase, initial);
 */
export async function runSqlShowcase(
  _: SqlShowcaseState,
  form: FormData,
): Promise<SqlShowcaseState> {
  const value = form.get("preset");
  const preset = typeof value === "string" ? findSqlPreset(value) : null;
  if (!preset) {
    return {
      id: sqlPresets[0].id,
      outcome: { status: "failed", message: "Pick one of the queries above." },
    };
  }
  return { id: preset.id, outcome: await runSqlPreset(preset.id) };
}
