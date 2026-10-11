"use client";

import { useRouter } from "next/navigation";

import { listSizes, viewQuery } from "../view-state";
import type { ListSize, ViewState } from "../view-state";

type Props = { path: string; state: ViewState };

function isListSize(value: number): value is ListSize {
  return listSizes.some((size) => size === value);
}

export function ListSizeSelect({ path, state }: Props) {
  const router = useRouter();
  return (
    <label className="control-box">
      <span className="sr-only">Rows per list</span>
      <select
        value={state.items}
        className="bg-transparent pr-1 text-sm outline-none"
        onChange={(event) => {
          const items = Number(event.target.value);
          if (isListSize(items)) {
            router.push(`${path}${viewQuery({ ...state, items })}`, { scroll: false });
          }
        }}
      >
        {listSizes.map((size) => (
          <option key={size} value={size}>
            {size} items
          </option>
        ))}
      </select>
    </label>
  );
}
