"use client";

import type { Period } from "@spoar/contract";
import { useRouter } from "next/navigation";

import { periods, viewQuery } from "../view-state";
import type { ViewState } from "../view-state";

type Props = { path: string; state: ViewState };

function isPeriod(value: string): value is Period {
  return periods.some((period) => period.value === value);
}

export function PeriodSelect({ path, state }: Props) {
  const router = useRouter();
  return (
    <label className="control-box">
      <span className="sr-only">Time range</span>
      <select
        value={state.period}
        className="bg-transparent pr-1 text-sm outline-none"
        onChange={(event) => {
          const period = event.target.value;
          if (isPeriod(period)) router.push(`${path}${viewQuery({ ...state, period })}`);
        }}
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
      <span className="font-mono text-xs text-muted">UTC</span>
    </label>
  );
}
