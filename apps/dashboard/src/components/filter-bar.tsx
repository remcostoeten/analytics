"use client";

import { DateRangePicker } from "./date-range-picker";
import { useQueryState, parseAsBoolean, parseAsString } from "nuqs";
import { useTransition } from "react";

type FilterBarProps = {
  projects: string[];
};

export function FilterBar({ projects }: FilterBarProps) {
  const [isPending, startTransition] = useTransition();

  const [project, setProject] = useQueryState(
    "project",
    parseAsString.withDefault("localhost").withOptions({ shallow: false, startTransition })
  );

  const [showBots, setShowBots] = useQueryState(
    "bots",
    parseAsBoolean.withDefault(false).withOptions({ shallow: false, startTransition })
  );

  const [showLocalhost, setShowLocalhost] = useQueryState(
    "localhost",
    parseAsBoolean.withDefault(false).withOptions({ shallow: false, startTransition })
  );

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-8 py-3">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <DateRangePicker />
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Project:</span>
              <select
                disabled={isPending}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="bg-background border rounded px-3 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary min-w-[200px] disabled:opacity-50 transition-opacity"
              >
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className={`flex items-center gap-2 cursor-pointer group transition-opacity ${isPending ? "opacity-50" : ""}`}>
              <input
                type="checkbox"
                disabled={isPending}
                checked={showBots ?? false}
                onChange={(e) => setShowBots(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Show bots
              </span>
            </label>

            <label className={`flex items-center gap-2 cursor-pointer group transition-opacity ${isPending ? "opacity-50" : ""}`}>
              <input
                type="checkbox"
                disabled={isPending}
                checked={showLocalhost ?? false}
                onChange={(e) => setShowLocalhost(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Show localhost
              </span>
            </label>
            
            {isPending && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
