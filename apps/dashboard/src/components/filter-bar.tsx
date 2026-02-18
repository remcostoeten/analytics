"use client";

import { DateRangePicker } from "./date-range-picker";
import { useQueryState, parseAsBoolean } from "nuqs";

export function FilterBar() {
  const [showBots, setShowBots] = useQueryState(
    "bots",
    parseAsBoolean.withDefault(false)
  );

  const [showLocalhost, setShowLocalhost] = useQueryState(
    "localhost",
    parseAsBoolean.withDefault(false)
  );

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <DateRangePicker />

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={showBots ?? false}
                onChange={(e) => setShowBots(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Show bot traffic
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={showLocalhost ?? false}
                onChange={(e) => setShowLocalhost(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Show localhost
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
