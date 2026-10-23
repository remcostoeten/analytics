"use client";

import { Link } from "@/shared/ui/link";
import { useRouter } from "next/navigation";

import { Select } from "@/shared/ui/select";

import { speedDevice, speedDevices } from "../speed";
import { percentiles, viewQuery, withFilter } from "../view-state";
import type { ViewState } from "../view-state";

type Props = { path: string; state: ViewState };

export function PercentileSelect({ path, state }: Props) {
  const router = useRouter();
  return (
    <div className="control-box">
      <Select
        variant="bare"
        label="Percentile"
        value={String(state.percentile)}
        options={percentiles.map((percentile) => ({
          value: String(percentile),
          label: `p${percentile}`,
        }))}
        onChange={(value) => {
          const percentile = percentiles.find((entry) => String(entry) === value);
          if (percentile) router.push(`${path}${viewQuery({ ...state, percentile })}`);
        }}
      />
    </div>
  );
}

export function DeviceTabs({ path, state }: Props) {
  const current = speedDevice(state.filters);
  return (
    <nav aria-label="Device" className="tabs">
      {speedDevices.map((device) => (
        <Link
          key={device.value}
          href={`${path}${viewQuery(withFilter(state, "device", device.value === "all" ? null : device.value))}`}
          aria-current={current === device.value ? "page" : undefined}
          className="tab"
          scroll={false}
        >
          {device.label}
        </Link>
      ))}
    </nav>
  );
}
