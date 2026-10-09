import Link from "next/link";

import { CloseIcon } from "@/shared/ui/icons";

import { formatDimensionValue } from "../format";
import { dimensionLabel, dimensions, viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";

type Props = {
  path: string;
  state: ViewState;
  inactive?: FilterDimension[];
  traffic?: boolean;
};

type ChipProps = {
  field: string;
  operator: string;
  value: string;
  href: string;
  inactive?: boolean;
};

function Chip({ field, operator, value, href, inactive = false }: ChipProps) {
  return (
    <span
      className={inactive ? "chip chip-inactive" : "chip"}
      title={inactive ? "Not applied to this view" : undefined}
    >
      <span>{field}</span>
      <span className="text-muted">{operator}</span>
      <span className="font-medium">{value}</span>
      <Link
        href={href}
        aria-label={`Remove ${field} filter`}
        className="chip-remove"
        prefetch={false}
      >
        <CloseIcon className="size-3" />
      </Link>
    </span>
  );
}

export function FilterChips({ path, state, inactive = [], traffic = true }: Props) {
  const active = dimensions.flatMap(({ value }) => {
    const filter = state.filters[value];
    return filter ? [{ dimension: value, filter }] : [];
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!traffic ? null : state.bots ? (
        <Chip
          field="Bots"
          operator="are"
          value="included"
          href={`${path}${viewQuery({ ...state, bots: false })}`}
        />
      ) : (
        <Chip
          field="Exclude bots"
          operator="equals"
          value="Yes"
          href={`${path}${viewQuery({ ...state, bots: true })}`}
        />
      )}
      {active.map(({ dimension, filter }) => {
        const negated = filter.startsWith("!");
        const value = negated ? filter.slice(1) : filter;
        return (
          <Chip
            key={dimension}
            field={dimensionLabel(dimension)}
            operator={negated ? "does not equal" : "equals"}
            value={formatDimensionValue(dimension, value)}
            href={`${path}${viewQuery(withFilter(state, dimension, null))}`}
            inactive={inactive.includes(dimension)}
          />
        );
      })}
    </div>
  );
}
