"use client";

import { useQueryState } from "nuqs";
import { useTransition } from "react";

type Preset = "24h" | "7d" | "30d" | "90d";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

export function DateRangePicker() {
  const [isPending, startTransition] = useTransition();
  const [range, setRange] = useQueryState("range", {
    defaultValue: "7d",
    shallow: false,
    startTransition,
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Period:</span>
      <div className="flex gap-1 rounded-lg border bg-background/50 p-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            disabled={isPending}
            onClick={() => setRange(preset.value)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              range === preset.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            } ${isPending && range !== preset.value ? "opacity-50" : ""}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
