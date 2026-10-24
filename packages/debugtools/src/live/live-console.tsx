"use client";

import { noop } from "@spoar/shared/noop";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { DefaultLogo, Icon } from "../icons";
import { Library } from "../parts/library";
import { paneClass, paneHeadClass, rootClass } from "../parts/pane";
import { RecentQueries } from "../parts/side";
import { Nav } from "../parts/toolbar";
import { resolveSections } from "../sections";
import type { ConsoleSections } from "../sections";
import type { ConsoleSource } from "../source";
import type { ConsoleTheme } from "../types";
import { LiveToolbar } from "./live-toolbar";
import { RejectsView } from "./rejects-view";
import { Results } from "./results";
import { quickQueries, quickQuerySql, sqlKeywords } from "./schema";
import { SqlEditor } from "./sql-editor";
import { useLiveConsole } from "./use-live-console";

type Props = {
  source: ConsoleSource;
  sections?: ConsoleSections;
  theme?: ConsoleTheme;
  logo?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type View = "results" | "library" | "rejects";

const keywords: ReadonlySet<string> = new Set(sqlKeywords);
const tabs = ["Query"];
const barButtonClass =
  "flex items-center gap-2 border-r border-console-divider px-4.5 text-console-dim hover:text-console-fg aria-pressed:text-console-fg";

function insertAt(input: HTMLTextAreaElement | null, value: string, text: string) {
  if (!input) return `${value}${text}`;
  const { selectionStart, selectionEnd } = input;
  const next = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
  const caret = selectionStart + text.length;
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(caret, caret);
  });
  return next;
}

export function LiveConsole({
  source,
  sections,
  theme = "dark",
  logo = <DefaultLogo />,
  className,
  style,
}: Props) {
  const show = resolveSections(sections);
  const live = useLiveConsole(source);
  const input = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<View>("library");
  const running = live.state.status === "running";
  const summary = useMemo(() => {
    if (live.state.status !== "done") return null;
    const { rowCount, durationMs, truncated } = live.state.result;
    const rows = `${rowCount.toLocaleString("en")} ${rowCount === 1 ? "row" : "rows"}`;
    return `${rows}${truncated ? " (truncated)" : ""} in ${Math.round(durationMs)} ms`;
  }, [live.state]);

  function run(statement?: string) {
    setView("results");
    void live.run(statement);
  }

  const showResults = show.results && view === "results";
  const showRejects = show.results && view === "rejects";
  const panes = !showResults && !showRejects && (show.library || show.recent);
  const split = show.library && show.recent;

  return (
    <div
      className={className ? `${rootClass} ${className}` : rootClass}
      style={style}
      data-theme={theme}
    >
      {show.nav ? <Nav logo={logo} tabs={tabs} active="Query" onPick={noop} /> : null}
      {show.toolbar ? (
        <LiveToolbar
          range={live.range}
          running={running}
          canClear={live.sql.length > 0 || live.state.status !== "idle"}
          onRange={live.setRange}
          onRun={() => run()}
          onCancel={live.cancel}
          onClear={live.clear}
        />
      ) : null}
      {show.editor ? (
        <SqlEditor
          value={live.sql}
          keywords={keywords}
          fill={!showResults && !showRejects && !panes}
          inputRef={input}
          onChange={live.setSql}
          onRun={() => run()}
        />
      ) : null}
      {show.results ? (
        <div className="flex h-8.5 flex-none items-stretch border-b border-console-divider">
          <span
            className="grid w-10 place-items-center border-r border-console-divider text-console-muted"
            aria-hidden="true"
          >
            <Icon name="grid" />
          </span>
          <button
            type="button"
            className={barButtonClass}
            aria-pressed={view === "results"}
            onClick={() => setView("results")}
          >
            Results
            {summary ? <span className="text-console-dim">{summary}</span> : null}
          </button>
          <button
            type="button"
            className={barButtonClass}
            aria-pressed={view === "rejects"}
            onClick={() => setView("rejects")}
          >
            Rejected
          </button>
          {show.library || show.recent ? (
            <button
              type="button"
              className={barButtonClass}
              aria-pressed={view === "library"}
              onClick={() => setView("library")}
            >
              Library
            </button>
          ) : null}
        </div>
      ) : null}
      {showResults ? <Results state={live.state} /> : null}
      {showRejects ? <RejectsView source={source} /> : null}
      {panes ? (
        <div
          className={`grid min-h-0 flex-1 ${split ? "grid-cols-2 @max-[860px]:grid-cols-1" : "grid-cols-1"}`}
        >
          {show.library ? (
            live.schemaError ? (
              <p className="grid place-items-center px-6 text-center text-console-accent">
                {live.schemaError}
              </p>
            ) : (
              <Library
                datasets={live.datasets}
                quickQueries={quickQueries}
                onQuickQuery={(query, dataset) => {
                  const sql = quickQuerySql(query.label, dataset);
                  live.setSql(sql);
                  run(sql);
                }}
                onField={(field) => live.setSql(insertAt(input.current, live.sql, field))}
                className={
                  split ? "border-r border-console-divider @max-[860px]:hidden" : undefined
                }
              />
            )
          ) : null}
          {show.recent ? (
            <section className={paneClass} aria-label="Recent queries">
              <header className={paneHeadClass}>
                <span className="text-console-muted">Recent queries</span>
              </header>
              {live.recent.length > 0 ? (
                <RecentQueries
                  queries={live.recent}
                  keywords={keywords}
                  behind={false}
                  onPick={(query) => live.setSql(query.join("\n"))}
                />
              ) : (
                <p className="px-3 py-2.5 text-console-dim">Queries you run show up here.</p>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
