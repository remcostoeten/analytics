"use client";

import type { ProjectScope } from "@spoar/client";
import { GhostList } from "@/modules/shell/components/ghost";
import { Link } from "@/shared/ui/link";

import { formatDimensionValue, formatMetric } from "../format";
import { fieldGroups } from "../logs";
import { dimensionLabel, viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { topListQuery } from "../queries";
import { useTopList } from "./breakdown-sections";
import type { Prefetchable } from "@/shared/query/read";

type Props = { scope: ProjectScope; state: ViewState; path: string };

type FieldProps = Props & { field: FilterDimension };

const fieldRows = 6;

const fields = fieldGroups.flatMap((group) => group.fields);

/**
 * @name fieldReads
 * @description The field sidebar's top values per field on a scope, for warming the cache before
 * a navigation to the log.
 *
 * @example
 * prefetchReads(queryClient, fieldReads(scoped));
 */
export function fieldReads(scope: ProjectScope): Prefetchable[] {
  return fields.map((field) => topListQuery(scope, field, "pageviews", fieldRows));
}

function Field({ scope, state, path, field }: FieldProps) {
  const list = useTopList(scope, field, "pageviews", fieldRows);
  const read = list.data;
  const rows = read?.ok ? read.value.data.filter((row) => row.value !== "") : [];
  const active = state.filters[field];
  return (
    <details className="field" open={active !== undefined}>
      <summary className="field-summary">
        <span>{dimensionLabel(field)}</span>
        {active ? <span className="field-active">1</span> : null}
      </summary>
      {read === undefined ? (
        <GhostList height={96} rows={3} />
      ) : !read.ok ? (
        <p className="px-2 py-1 text-xs text-err">{read.error}</p>
      ) : rows.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted">No values</p>
      ) : (
        <ul className="grid gap-px pb-1">
          {rows.map((row) => (
            <li key={row.value}>
              <Link
                href={`${path}${viewQuery(withFilter(state, field, row.value))}`}
                aria-current={active === row.value ? "true" : undefined}
                className="field-value"
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
}

export function FieldSidebar(props: Props) {
  return (
    <nav className="field-sidebar" aria-label="Fields">
      {fieldGroups.map((group) => (
        <div key={group.label} className="field-group">
          <p className="field-group-label">{group.label}</p>
          {group.fields.map((field) => (
            <Field key={field} {...props} field={field} />
          ))}
        </div>
      ))}
    </nav>
  );
}
