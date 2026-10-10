"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { consoleFixture } from "./fixtures";
import { DefaultLogo, Icon } from "./icons";
import { Agent } from "./parts/agent";
import { Editor } from "./parts/editor";
import { Library } from "./parts/library";
import { Nav, Toolbar } from "./parts/toolbar";
import type { EditorMode } from "./parts/toolbar";
import { css } from "./styles";
import { cycleLength, defaultPace, frameAt, scriptLengths } from "./timeline";
import type { Pace } from "./timeline";
import type { ConsoleData } from "./types";
import { usePlayback } from "./use-playback";

type Props = {
  data?: ConsoleData;
  autoplay?: boolean;
  loop?: boolean;
  pace?: Partial<Pace>;
  logo?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function Console({
  data = consoleFixture,
  autoplay = true,
  loop = true,
  pace,
  logo = <DefaultLogo />,
  className,
  style,
}: Props) {
  const timing = useMemo(() => ({ ...defaultPace, ...pace }), [pace]);
  const lengths = useMemo(() => scriptLengths(data), [data]);
  const keywords = useMemo(
    () => new Set(data.keywords.map((word) => word.toLowerCase())),
    [data.keywords],
  );
  const cycle = cycleLength(lengths, timing);
  const { elapsed, restart } = usePlayback(cycle, cycle - timing.hold, autoplay, loop);
  const frame = frameAt(lengths, elapsed, timing);
  const [tab, setTab] = useState(data.tabs[0] ?? "");
  const [mode, setMode] = useState<EditorMode>("editor");

  return (
    <div className={className ? `spc-console ${className}` : "spc-console"} style={style}>
      <style href="spoar-debugtools-console" precedence="default">
        {css}
      </style>
      <Nav logo={logo} tabs={data.tabs} active={tab} onPick={setTab} />
      <Toolbar
        mode={mode}
        timeRange={data.timeRange}
        running={frame.running}
        onMode={setMode}
        onRun={restart}
      />
      <Editor query={data.query} keywords={keywords} typed={frame.queryChars} />
      <div className="spc-results-bar">
        <span className="spc-results-grid" aria-hidden="true">
          <Icon name="grid" />
        </span>
        <span className="spc-results-tab">Results</span>
        <span className="spc-results-collapse" aria-hidden="true">
          <Icon name="collapse" size={13} />
        </span>
      </div>
      <div className="spc-panes">
        <Library datasets={data.datasets} quickQueries={data.quickQueries} onQuickQuery={restart} />
        <Agent
          script={data.agent}
          recentQueries={data.recentQueries}
          keywords={keywords}
          promptChars={frame.promptChars}
          submitted={frame.submitted}
          steps={frame.steps}
          followUpChars={frame.followUpChars}
        />
      </div>
    </div>
  );
}
