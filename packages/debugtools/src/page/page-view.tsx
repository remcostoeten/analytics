import type { Nullable } from "@spoar/shared/semantic";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "../icons";
import { buttonClass } from "../parts/toolbar";
import { timeRanges } from "../source";
import type { TimeRange } from "../source";
import type { ViewContext } from "../widget/view";
import { clickMarks, clickRows } from "./click-marks";
import type { ClickRow } from "./click-marks";
import { ClickOverlay } from "./click-overlay";
import { normalisePath, readClicks, readPage } from "./page-reads";
import type { ClickCount, PageRead, PageReport } from "./page-reads";
import {
  ClicksSection,
  IssuesSection,
  ReferrersSection,
  StatsRow,
  VitalsSection,
} from "./page-sections";
import { useHostPath } from "./use-host-path";

type Props = { context: ViewContext };

const toggleClass = `${buttonClass} aria-pressed:border-console-accent aria-pressed:text-console-fg`;

function isRange(value: string): value is TimeRange {
  return timeRanges.some((item) => item.value === value);
}

function withLabels(
  clicks: Nullable<PageRead<ClickCount[]>>,
  labels: string[],
): Nullable<PageRead<ClickRow[]>> {
  if (clicks === null || !clicks.ok) return clicks;
  return { ok: true, value: clickRows(clicks.value, labels) };
}

function markedLabels() {
  return clickMarks(document).map((mark) => mark.label);
}

export function PageView({ context }: Props) {
  const hostPath = useHostPath();
  const [typed, setTyped] = useState<Nullable<string>>(null);
  const [draft, setDraft] = useState(hostPath);
  const [range, setRange] = useState<TimeRange>("24h");
  const [report, setReport] = useState<Nullable<PageReport>>(null);
  const [showClicks, setShowClicks] = useState(false);
  const [clicks, setClicks] = useState<Nullable<PageRead<ClickCount[]>>>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const path = typed ?? hostPath;
  const following = path === hostPath;

  useEffect(() => {
    setTyped(null);
    setDraft(hostPath);
  }, [hostPath]);

  useEffect(() => {
    let current = true;
    setReport(null);
    async function load() {
      const next = await readPage(context.client, context.project, path, range);
      if (current) setReport(next);
    }
    void load();
    return () => {
      current = false;
    };
  }, [context.client, context.project, path, range]);

  useEffect(() => {
    if (!showClicks) return;
    let current = true;
    setClicks(null);
    setLabels(markedLabels());
    async function load() {
      const next = await readClicks(context.client, context.project, path, range);
      if (!current) return;
      setClicks(next);
      setLabels(markedLabels());
    }
    void load();
    return () => {
      current = false;
    };
  }, [context.client, context.project, path, range, showClicks]);

  const counts = useMemo(
    () => new Map(clicks?.ok ? clicks.value.map((row) => [row.label, row.count]) : []),
    [clicks],
  );
  const rows = withLabels(clicks, labels);

  return (
    <div className="flex flex-col gap-2 p-2 font-console-mono text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <form
          className="flex min-w-40 flex-1 items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            const next = normalisePath(draft);
            setDraft(next);
            setTyped(next === hostPath ? null : next);
          }}
        >
          <input
            className="h-6.5 min-w-0 flex-1 rounded-[5px] border border-console-line bg-console-surface px-2 text-console-fg outline-none placeholder:text-console-faint focus:border-console-edge-hover"
            value={draft}
            aria-label="Page path"
            placeholder="/pricing"
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
          />
          {following ? null : (
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setTyped(null);
                setDraft(hostPath);
              }}
            >
              Follow page
            </button>
          )}
        </form>
        <label className={`${buttonClass} relative pr-1.5`}>
          <Icon name="clock" />
          <select
            className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
            value={range}
            aria-label="Time range"
            onChange={(event) => {
              if (isRange(event.target.value)) setRange(event.target.value);
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
        <button
          type="button"
          className={toggleClass}
          aria-pressed={showClicks}
          onClick={() => setShowClicks((value) => !value)}
        >
          Show clicks
        </button>
      </div>
      <StatsRow read={report?.stats ?? null} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        {showClicks ? (
          <ClicksSection read={rows} marked={labels.length} following={following} />
        ) : null}
        <ReferrersSection read={report?.referrers ?? null} />
        <VitalsSection read={report?.vitals ?? null} />
        <IssuesSection read={report?.issues ?? null} />
      </div>
      {showClicks && following && clicks?.ok ? <ClickOverlay counts={counts} /> : null}
    </div>
  );
}
