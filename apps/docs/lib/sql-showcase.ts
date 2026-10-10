import { cacheLife } from "next/cache";

import { apiEndpoint } from "./api-endpoint";
import { showcaseProject } from "./showcase";
import { showcaseWindow } from "./showcase-period";
import { parseSqlAnswer, sqlShowcaseRequest } from "./sql-answer";
import type { SqlOutcome } from "./sql-answer";
import { findSqlPreset } from "./sql-presets";
import type { SqlPresetId } from "./sql-presets";

/**
 * @name sqlShowcaseEnabled
 * @description Whether the landing page may run SQL: true once `RA_SQL_TOKEN`, an API token with
 * the `sql` scope that lists this site's project, is set. Without it the section is left out.
 *
 * @example
 * if (!sqlShowcaseEnabled()) return null;
 */
export function sqlShowcaseEnabled() {
  return Boolean(process.env.RA_SQL_TOKEN);
}

/**
 * @name runSqlPreset
 * @description Runs one preset against this site's project over the showcase window, with the
 * token held on the server, and caches the answer for a minute so every visitor shares one run
 * per preset and the token's 30 queries a minute are never spent.
 *
 * @example
 * const outcome = await runSqlPreset("pages");
 */
export async function runSqlPreset(id: SqlPresetId): Promise<SqlOutcome> {
  "use cache";
  cacheLife("minutes");
  const preset = findSqlPreset(id);
  const token = process.env.RA_SQL_TOKEN;
  if (!preset || !token) return { status: "failed", message: "SQL on this page is not set up." };
  const url = `${apiEndpoint()}/v2/projects/${encodeURIComponent(showcaseProject())}/query`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(sqlShowcaseRequest(preset, showcaseWindow())),
    });
    const body: unknown = await response.json().catch(() => null);
    return parseSqlAnswer(response.status, body);
  } catch {
    return { status: "failed", message: "The API could not be reached." };
  }
}
