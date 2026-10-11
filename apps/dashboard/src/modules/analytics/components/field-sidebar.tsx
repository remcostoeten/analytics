import type { ProjectScope } from "@spoar/client";
import Link from "next/link";

import { formatDimensionValue, formatMetric } from "../format";
import { fieldGroups } from "../logs";
import { readTopList } from "../reads";
import { dimensionLabel, viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";

type Props = { scope: ProjectScope; state: ViewState; path: string };

const fieldRows = 6;

export async function FieldSidebar({ scope, state, path }: Props) {
  const fields = fieldGroups.flatMap((group) => group.fields);
  const reads = new Map(
    await Promise.all(
      fields.map(
        async (field) => [field, await readTopList(scope, field, "pageviews", fieldRows)] as const,
      ),
    ),
  );

  function hrefFor(field: FilterDimension, value: string) {
    return `${path}${viewQuery(withFilter(state, field, value))}`;
  }

  return (
    <nav className="field-sidebar" aria-label="Fields">
      {fieldGroups.map((group) => (
        <div key={group.label} className="field-group">
          <p className="field-group-label">{group.label}</p>
          {group.fields.map((field) => {
            const read = reads.get(field);
            const rows = read?.ok ? read.value.data.filter((row) => row.value !== "") : [];
            const active = state.filters[field];
            return (
              <details key={field} className="field" open={active !== undefined}>
                <summary className="field-summary">
                  <span>{dimensionLabel(field)}</span>
                  {active ? <span className="field-active">1</span> : null}
                </summary>
                {read && !read.ok ? (
                  <p className="px-2 py-1 text-xs text-err">{read.error}</p>
                ) : rows.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted">No values</p>
                ) : (
                  <ul className="grid gap-px pb-1">
                    {rows.map((row) => (
                      <li key={row.value}>
                        <Link
                          href={hrefFor(field, row.value)}
                          aria-current={active === row.value ? "true" : undefined}
                          className="field-value"
                          prefetch={false}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {formatDimensionValue(field, row.value)}
                          </span>
                          <span className="tabular-nums text-muted">
                            {formatMetric(row.pageviews ?? 0, "count", true)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
