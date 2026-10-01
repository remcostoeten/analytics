import type { BreakdownRow, ProjectBreakdownResponse } from "@remcostoeten/analytics-contract";
import { rawVitalsFrom } from "@remcostoeten/analytics-engine";
import type { EngineError, ProjectRecord } from "@remcostoeten/analytics-engine";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import type { ReadsOptions } from "../reads/guard";
import { previousRange } from "../reads/params";
import type { Range } from "../reads/params";
import { breakdown } from "../reads/service";
import type { Scoped } from "../reads/service";
import { speedSummary } from "../speed/service";

type ProjectStores = Pick<ReadsOptions, "store" | "speed" | "issues" | "clock">;

export type ProjectAccess = {
  records: ProjectRecord[];
  detail: Set<ProjectID>;
};

type Numbers = { [key: string]: number };

type Extras = { speedScore: Nullable<number>; openIssues: Nullable<number> };

const rowKeys = new Set(["value", "share"]);

function iso(range: Range) {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

function numbers(row: BreakdownRow): Numbers {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !rowKeys.has(key))
      .map(([key, value]) => [key, Number(value)]),
  );
}

function changes(current: Numbers, previous: Numbers | undefined) {
  return Object.fromEntries(
    Object.entries(current).map(([key, value]) => {
      const before = previous?.[key] ?? 0;
      return [key, before === 0 ? null : Math.round(((value - before) / before) * 1000) / 1000];
    }),
  );
}

async function previousRows(
  stores: ProjectStores,
  scoped: Scoped,
  params: URLSearchParams,
  ids: ProjectID[],
): Promise<Result<Map<string, Numbers>, EngineError>> {
  if (ids.length === 0) return ok(new Map());
  const before = previousRange(scoped.range);
  const rest = new URLSearchParams(params);
  rest.delete("cursor");
  rest.set("limit", String(ids.length));
  const found = await breakdown(
    stores.store,
    { ...scoped, range: before, scope: { ...scoped.scope, ...before, projectIds: ids } },
    "project",
    rest,
  );
  if (!found.ok) return found;
  return ok(new Map(found.value.data.map((row) => [row.value, numbers(row)])));
}

async function extras(
  stores: ProjectStores,
  id: ProjectID,
  range: Range,
  visible: boolean,
): Promise<Result<Extras, EngineError>> {
  const [speed, issues] = await Promise.all([
    speedSummary(stores.speed, {
      scope: {
        projectIds: [id],
        ...range,
        device: "all",
        environment: "production",
        route: null,
        path: null,
        country: null,
        rawFrom: rawVitalsFrom(stores.clock()),
      },
      range,
      percentile: 75,
    }),
    visible ? stores.issues.list([id], "open", { limit: 1, offset: 0 }) : ok(null),
  ]);
  if (!speed.ok) return speed;
  if (!issues.ok) return issues;
  return ok({ speedScore: speed.value.data.score, openIssues: issues.value?.total ?? null });
}

/**
 * @name projectBreakdown
 * @description One row per project with traffic in the range: the requested metrics, each
 * metric's change against the previous range of the same length (null when it was zero), the
 * project's name and visibility, its Real Experience Score over the range (all devices, p75,
 * null under 20 samples) and its open issue count, null when the caller may not see the
 * project's visitor-level data.
 *
 * @example
 * await projectBreakdown(stores, scoped, params, { records, detail: new Set(["alpha"]) });
 */
export async function projectBreakdown(
  stores: ProjectStores,
  scoped: Scoped,
  params: URLSearchParams,
  access: ProjectAccess,
): Promise<Result<ProjectBreakdownResponse, EngineError>> {
  const current = await breakdown(stores.store, scoped, "project", params);
  if (!current.ok) return current;
  const ids = current.value.data.map((row) => row.value);
  const [previous, ...found] = await Promise.all([
    previousRows(stores, scoped, params, ids),
    ...ids.map((id) => extras(stores, id, scoped.range, access.detail.has(id))),
  ]);
  if (!previous.ok) return previous;
  const records = new Map(access.records.map((record) => [record.id, record]));
  const data = [];
  for (const [index, row] of current.value.data.entries()) {
    const extra = found[index];
    if (!extra) continue;
    if (!extra.ok) return extra;
    const record = records.get(row.value);
    data.push({
      ...row,
      name: record?.name ?? row.value,
      visibility: record?.visibility ?? "private",
      change: changes(numbers(row), previous.value.get(row.value)),
      ...extra.value,
    });
  }
  return ok({
    ...current.value,
    data,
    dimension: "project",
    previousRange: iso(previousRange(scoped.range)),
  });
}
