"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { speedDevice, speedDevices } from "../speed";
import { percentiles, viewQuery, withFilter } from "../view-state";
import type { ViewState } from "../view-state";

type Props = { path: string; state: ViewState };

export function PercentileSelect({ path, state }: Props) {
  const router = useRouter();
  return (
    <label className="control-box">
      <span className="sr-only">Percentile</span>
      <select
        value={state.percentile}
        className="bg-transparent pr-1 text-sm outline-none"
        onChange={(event) => {
          const percentile = percentiles.find((entry) => String(entry) === event.target.value);
          if (percentile) router.push(`${path}${viewQuery({ ...state, percentile })}`);
        }}
      >
        {percentiles.map((percentile) => (
          <option key={percentile} value={percentile}>
            p{percentile}
          </option>
        ))}
      </select>
    </label>
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
          prefetch={false}
        >
          {device.label}
        </Link>
      ))}
    </nav>
  );
}
