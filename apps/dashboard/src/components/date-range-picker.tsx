"use client";

import { useQueryState } from "nuqs";

type Preset = "24h" | "7d" | "30d" | "90d";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function DateRangePicker() {
  const [range, setRange] = useQueryState("range", {
    defaultValue: "7d",
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Period:</span>
      <div className="flex gap-1 rounded-lg border bg-card p-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setRange(preset.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              range === preset.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
