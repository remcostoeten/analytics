"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { PlusCircleIcon } from "@/shared/ui/icons";
import { Select } from "@/shared/ui/select";

import { dimensions, viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";

type Props = { path: string; state: ViewState; dimensions?: readonly FilterDimension[] };

const operators = [
  { value: "is", label: "equals" },
  { value: "not", label: "does not equal" },
];

const allDimensions = dimensions.map((entry) => entry.value);

function isDimension(value: string): value is FilterDimension {
  return dimensions.some((dimension) => dimension.value === value);
}

export function AddFilter({ path, state, dimensions: offered = allDimensions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dimension, setDimension] = useState<FilterDimension>(offered[0] ?? "page");
  const [negate, setNegate] = useState(false);
  const [value, setValue] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="filter-button"
        onClick={() => setOpen((value) => !value)}
      >
        <PlusCircleIcon className="size-3.5" />
        Add filter
      </button>
      {open ? (
        <form
          id={id}
          className="popover absolute top-[calc(100%+6px)] left-0 z-20 grid w-72 gap-3 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = value.trim();
            if (!trimmed) return;
            const next = withFilter(state, dimension, negate ? `!${trimmed}` : trimmed);
            setOpen(false);
            setValue("");
            router.push(`${path}${viewQuery(next)}`);
          }}
        >
          <div className="grid gap-1 text-xs text-muted">
            Field
            <Select
              label="Field"
              value={dimension}
              options={dimensions.filter((entry) => offered.includes(entry.value))}
              onChange={(next) => {
                if (isDimension(next)) setDimension(next);
              }}
            />
          </div>
          <div className="grid gap-1 text-xs text-muted">
            Operator
            <Select
              label="Operator"
              value={negate ? "not" : "is"}
              options={operators}
              onChange={(next) => setNegate(next === "not")}
            />
          </div>
          <label className="grid gap-1 text-xs text-muted">
            Value
            <input
              className="control"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={dimension === "country" ? "NL" : dimension === "page" ? "/pricing" : ""}
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="solid-button">
              Apply
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
