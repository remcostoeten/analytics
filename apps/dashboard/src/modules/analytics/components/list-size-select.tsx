"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/shared/ui/select";

import { listSizes, viewQuery } from "../view-state";
import type { ListSize, ViewState } from "../view-state";

type Props = { path: string; state: ViewState };

function isListSize(value: number): value is ListSize {
  return listSizes.some((size) => size === value);
}

export function ListSizeSelect({ path, state }: Props) {
  const router = useRouter();
  return (
    <div className="control-box">
      <Select
        variant="bare"
        label="Rows per list"
        value={String(state.items)}
        options={listSizes.map((size) => ({ value: String(size), label: `${size} items` }))}
        onChange={(value) => {
          const items = Number(value);
          if (isListSize(items)) {
            router.push(`${path}${viewQuery({ ...state, items })}`, { scroll: false });
          }
        }}
      />
    </div>
  );
}
