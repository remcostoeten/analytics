"use client";

import type { Period } from "@spoar/contract";
import { useRouter } from "next/navigation";

import { Select } from "@/shared/ui/select";

import { periods, viewQuery } from "../view-state";
import type { ViewState } from "../view-state";

type Props = { path: string; state: ViewState; query?: (state: ViewState) => string };

function isPeriod(value: string): value is Period {
  return periods.some((period) => period.value === value);
}

export function PeriodSelect({ path, state, query = viewQuery }: Props) {
  const router = useRouter();
  return (
    <div className="control-box">
      <Select
        variant="bare"
        label="Time range"
        value={state.period}
        options={periods}
        onChange={(period) => {
          if (isPeriod(period))
            router.push(`${path}${query({ ...state, period })}`, { scroll: false });
        }}
      />
      <span className="font-mono text-xs text-muted">UTC</span>
    </div>
  );
}
