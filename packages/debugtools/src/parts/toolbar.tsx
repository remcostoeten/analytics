import type { ReactNode } from "react";

import { Icon } from "../icons";

export type EditorMode = "builder" | "editor";

type NavProps = {
  logo: ReactNode;
  tabs: string[];
  active: string;
  onPick: (tab: string) => void;
};

export function Nav({ logo, tabs, active, onPick }: NavProps) {
  return (
    <header className="spc-nav">
      <span className="spc-logo">{logo}</span>
      <div role="tablist" aria-label="Console sections" className="spc-nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tab === active}
            className="spc-nav-tab"
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

export function Toolbar({ mode, timeRange, running, onMode, onRun }: ToolbarProps) {
  return (
    <div className="spc-toolbar" data-running={running}>
      <div className="spc-segmented" role="group" aria-label="Query mode">
        <button type="button" aria-pressed={mode === "builder"} onClick={() => onMode("builder")}>
          <Icon name="builder" />
          Builder
        </button>
        <button type="button" aria-pressed={mode === "editor"} onClick={() => onMode("editor")}>
          <Icon name="code" />
          Editor
        </button>
      </div>
      <span className="spc-divider" />
      <button type="button" className="spc-button">
        <Icon name="clock" />
        {timeRange}
        <Icon name="chevron-down" size={12} />
      </button>
      <button type="button" className="spc-button spc-run" onClick={onRun}>
        <Icon name="play" size={12} />
        {running ? "Running" : "Run"}
      </button>
      <button type="button" className="spc-button spc-quiet" disabled={!running}>
        Cancel
      </button>
      <span className="spc-divider" />
      <button type="button" className="spc-button spc-quiet" disabled>
        Clear
      </button>
      <button type="button" className="spc-button spc-quiet" disabled>
        Save
      </button>
      <button type="button" className="spc-button spc-quiet spc-square" aria-label="More actions">
        <Icon name="more" />
      </button>
      <span className="spc-progress" aria-hidden="true" />
    </div>
  );
}
