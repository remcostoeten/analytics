import type { ReactNode } from "react";

import { Icon } from "../icons";
import { hideScrollbarClass } from "./pane";

export type EditorMode = "builder" | "editor";

type NavProps = {
  logo: ReactNode;
  tabs: string[];
  active: string;
  onPick: (tab: string) => void;
};

const tabClass =
  "relative px-3 whitespace-nowrap text-console-muted transition-colors duration-[120ms] hover:text-console-fg aria-selected:bg-console-surface aria-selected:text-console-fg aria-selected:before:absolute aria-selected:before:inset-x-0 aria-selected:before:top-0 aria-selected:before:h-px aria-selected:before:bg-console-fg";

export function Nav({ logo, tabs, active, onPick }: NavProps) {
  return (
    <header className="flex h-10 flex-none items-stretch border-b border-console-divider">
      <span className="grid w-10 place-items-center text-console-fg">{logo}</span>
      <div
        role="tablist"
        aria-label="Console sections"
        className={`flex overflow-x-auto ${hideScrollbarClass}`}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tab === active}
            className={tabClass}
            onClick={() => onPick(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    </header>
  );
}

type ToolbarProps = {
  mode: EditorMode;
  timeRange: string;
  running: boolean;
  onMode: (mode: EditorMode) => void;
  onRun: () => void;
};

const controlClass =
  "inline-flex h-6.5 items-center gap-1.5 rounded-[5px] px-2 whitespace-nowrap transition-[background-color,color] duration-[120ms]";
const segmentClass = `${controlClass} text-console-muted hover:bg-console-hover hover:text-console-fg aria-pressed:bg-console-raised aria-pressed:text-console-fg`;
const buttonClass = `${controlClass} border text-console-muted border-console-line enabled:hover:bg-console-hover enabled:hover:text-console-fg disabled:cursor-default disabled:text-console-faint`;
const quietClass = `${buttonClass} @max-[520px]:hidden`;
const runClass = `${controlClass} border border-console-fg bg-console-fg text-console-bg hover:bg-console-strong hover:text-console-bg active:scale-[0.97] group-data-[running=true]:border-console-muted group-data-[running=true]:bg-console-muted`;
const dividerClass = "mx-1 h-4.5 w-px flex-none bg-console-line @max-[520px]:hidden";

export function Toolbar({ mode, timeRange, running, onMode, onRun }: ToolbarProps) {
  return (
    <div
      className={`group relative flex h-11 flex-none items-center gap-1.5 overflow-x-auto border-b border-console-divider px-2 ${hideScrollbarClass}`}
      data-running={running}
    >
      <div className="flex gap-0.5 rounded-[5px] p-0.5" role="group" aria-label="Query mode">
        <button
          type="button"
          className={segmentClass}
          aria-pressed={mode === "builder"}
          onClick={() => onMode("builder")}
        >
          <Icon name="builder" />
          Builder
        </button>
        <button
          type="button"
          className={segmentClass}
          aria-pressed={mode === "editor"}
          onClick={() => onMode("editor")}
        >
          <Icon name="code" />
          Editor
        </button>
      </div>
      <span className={dividerClass} />
      <button type="button" className={buttonClass}>
        <Icon name="clock" />
        {timeRange}
        <Icon name="chevron-down" size={12} />
      </button>
      <button type="button" className={runClass} onClick={onRun}>
        <Icon name="play" size={12} />
        {running ? "Running" : "Run"}
      </button>
      <button type="button" className={quietClass} disabled={!running}>
        Cancel
      </button>
      <span className={dividerClass} />
      <button type="button" className={quietClass} disabled>
        Clear
      </button>
      <button type="button" className={quietClass} disabled>
        Save
      </button>
      <button
        type="button"
        className={`${quietClass} w-6.5 justify-center px-0`}
        aria-label="More actions"
      >
        <Icon name="more" />
      </button>
      <span className="spc-progress" aria-hidden="true" />
    </div>
  );
}
