"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { consoleFixture } from "./fixtures";
import { DefaultLogo, Icon } from "./icons";
import { Editor } from "./parts/editor";
import { Library } from "./parts/library";
import { Side } from "./parts/side";
import { Nav, Toolbar } from "./parts/toolbar";
import type { EditorMode } from "./parts/toolbar";
import { resolveSections } from "./sections";
import type { ConsoleSections } from "./sections";
import { cycleLength, defaultPace, frameAt, scriptLengths } from "./timeline";
import type { Pace } from "./timeline";
import type { ConsoleData, ConsoleTheme } from "./types";
import { usePlayback } from "./use-playback";

type Props = {
  data?: ConsoleData;
  sections?: ConsoleSections;
  autoplay?: boolean;
  loop?: boolean;
  pace?: Partial<Pace>;
  theme?: ConsoleTheme;
  logo?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const rootClass =
  "spc-console @container relative flex h-[var(--spc-height,640px)] flex-col overflow-hidden rounded-[10px] border border-console-line bg-console-bg text-left font-console-sans text-[13px] leading-[1.4] text-console-fg antialiased";

export function Console({
  data = consoleFixture,
  sections,
  autoplay = true,
  loop = true,
  pace,
  theme = "dark",
  logo = <DefaultLogo />,
  className,
  style,
}: Props) {
  const show = resolveSections(sections);
  const timing = useMemo(() => ({ ...defaultPace, ...pace }), [pace]);
  const lengths = useMemo(() => {
    const full = scriptLengths(data);
    return {
      query: show.editor ? full.query : 0,
      prompt: show.agent ? full.prompt : 0,
      steps: show.agent ? full.steps : 0,
      followUp: show.agent ? full.followUp : 0,
    };
  }, [data, show.editor, show.agent]);
  const keywords = useMemo(
    () => new Set(data.keywords.map((word) => word.toLowerCase())),
    [data.keywords],
  );
  const cycle = cycleLength(lengths, timing);
  const { elapsed, restart } = usePlayback(cycle, cycle - timing.hold, autoplay, loop);
  const frame = frameAt(lengths, elapsed, timing);
  const [tab, setTab] = useState(data.tabs[0] ?? "");
  const [mode, setMode] = useState<EditorMode>("editor");
  const side = show.recent || show.agent;
  const split = show.library && side;
  const panes = show.library || side;

  return (
    <div
      className={className ? `${rootClass} ${className}` : rootClass}
      style={style}
      data-theme={theme}
    >
      {show.nav ? <Nav logo={logo} tabs={data.tabs} active={tab} onPick={setTab} /> : null}
      {show.toolbar ? (
        <Toolbar
          mode={mode}
          timeRange={data.timeRange}
          running={frame.running}
          onMode={setMode}
          onRun={restart}
        />
      ) : null}
      {show.editor ? (
        <Editor query={data.query} keywords={keywords} typed={frame.queryChars} fill={!panes} />
      ) : null}
      {show.results ? (
        <div className="flex h-8.5 flex-none items-stretch border-b border-console-divider text-console-dim">
          <span
            className="grid w-10 place-items-center border-r border-console-divider text-console-muted"
            aria-hidden="true"
          >
            <Icon name="grid" />
          </span>
          <span className="flex items-center border-r border-console-divider px-4.5">Results</span>
          <span className="ml-auto grid w-8.5 place-items-center" aria-hidden="true">
            <Icon name="collapse" size={13} />
          </span>
        </div>
      ) : null}
      {panes ? (
        <div
          className={`grid min-h-0 flex-1 ${split ? "grid-cols-2 @max-[860px]:grid-cols-1" : "grid-cols-1"}`}
        >
          {show.library ? (
            <Library
              datasets={data.datasets}
              quickQueries={data.quickQueries}
              onQuickQuery={restart}
              className={split ? "border-r border-console-divider @max-[860px]:hidden" : undefined}
            />
          ) : null}
          {side ? (
            <Side
              recent={show.recent}
              agent={show.agent}
              script={data.agent}
              recentQueries={data.recentQueries}
              keywords={keywords}
              promptChars={frame.promptChars}
              submitted={frame.submitted}
              steps={frame.steps}
              followUpChars={frame.followUpChars}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
