import { Icon } from "../icons";
import { hideScrollbarClass } from "../parts/pane";
import { buttonClass, dividerClass, quietClass, runClass } from "../parts/toolbar";
import { timeRanges } from "../source";
import type { TimeRange } from "../source";

type Props = {
  range: TimeRange;
  running: boolean;
  canClear: boolean;
  onRange: (range: TimeRange) => void;
  onRun: () => void;
  onCancel: () => void;
  onClear: () => void;
};

function isRange(value: string): value is TimeRange {
  return timeRanges.some((item) => item.value === value);
}

export function LiveToolbar({
  range,
  running,
  canClear,
  onRange,
  onRun,
  onCancel,
  onClear,
}: Props) {
  return (
    <div
      className={`group relative flex h-11 flex-none items-center gap-1.5 overflow-x-auto border-b border-console-divider px-2 ${hideScrollbarClass}`}
      data-running={running}
    >
      <span className="inline-flex h-6.5 items-center gap-1.5 px-2 text-console-fg">
        <Icon name="code" />
        SQL
      </span>
      <span className={dividerClass} />
      <label className={`${buttonClass} relative pr-1.5`}>
        <Icon name="clock" />
        <select
          className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
          value={range}
          aria-label="Time range"
          onChange={(event) => {
            if (isRange(event.target.value)) onRange(event.target.value);
          }}
        >
          {timeRanges.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={12} className="pointer-events-none absolute right-1.5" />
      </label>
      <button type="button" className={runClass} onClick={onRun} title="Run (Ctrl+Enter)">
        <Icon name="play" size={12} />
        {running ? "Running" : "Run"}
      </button>
      <button type="button" className={quietClass} disabled={!running} onClick={onCancel}>
        Cancel
      </button>
      <span className={dividerClass} />
      <button type="button" className={quietClass} disabled={!canClear} onClick={onClear}>
        Clear
      </button>
      <span className="spc-progress" aria-hidden="true" />
    </div>
  );
}
