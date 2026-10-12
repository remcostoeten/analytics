"use client";

import type { BreakdownRow, TimeseriesPoint } from "@spoar/contract";
import Link from "next/link";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { formatCount } from "@/lib/format";

import {
  consoleQueries,
  consoleViews,
  viewQuery,
  type ConsoleQuery,
  type QueryId,
  type Token,
} from "./console-data";
import { ArrowUpRightIcon, ChevronIcon, GridIcon, PinTopIcon, PlayIcon, StackIcon } from "./icons";

type Props = {
  pages: BreakdownRow[];
  sources: BreakdownRow[];
  series: TimeseriesPoint[];
  toolbarStart: ReactNode;
  toolbarEnd: ReactNode;
  search: ReactNode;
  aside: ReactNode;
};

type Selection = { kind: "query"; id: QueryId } | { kind: "view"; name: string };

type Indexed = CSSProperties & { "--i": number };

type Bar = Indexed & { "--w": string };

type Column = Indexed & { "--h": string };

type RowsProps = { rows: BreakdownRow[] };

type TrendProps = { series: TimeseriesPoint[] };

type FieldsProps = { view: string };

const tokenClass = {
  keyword: "text-[var(--console-keyword)]",
  string: "text-[var(--console-string)]",
  call: "text-[var(--console-fg)]",
};

const dayLabel = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function indexed(index: number): Indexed {
  return { "--i": index };
}

function fade(index: number, solid: number) {
  return { opacity: Math.max(0.12, 1 - Math.max(0, index - solid) * 0.16) };
}

function findQuery(id: QueryId): ConsoleQuery {
  return consoleQueries.find((query) => query.id === id) ?? consoleQueries[0];
}

function selectionLines(selection: Selection): Token[][] {
  return selection.kind === "query" ? findQuery(selection.id).lines : viewQuery(selection.name);
}

function selectionKey(selection: Selection) {
  return selection.kind === "query" ? selection.id : `view-${selection.name}`;
}

function ResultRows({ rows }: RowsProps) {
  const top = Math.max(1, ...rows.map((row) => row.visitors ?? 0));
  if (rows.length === 0) return <p className="px-4 py-2 text-[var(--console-muted)]">No rows</p>;
  return (
    <ul className="flex flex-col px-1.5">
      {rows.map((row, index) => {
        const style: Bar = { "--i": index, "--w": `${((row.visitors ?? 0) / top) * 100}%` };
        return (
          <li
            key={row.value}
            style={style}
            className="console-row relative flex items-center justify-between gap-3 px-2.5 py-1.5"
          >
            <span className="console-bar absolute inset-y-0.5 left-0 rounded bg-white/[0.05]" />
            <span className="relative truncate text-[var(--console-fg)]">{row.value}</span>
            <span className="relative text-[var(--console-dim)] tabular-nums">
              {formatCount(row.visitors ?? 0)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TrendColumns({ series }: TrendProps) {
  if (series.length === 0) return <p className="px-4 py-2 text-[var(--console-muted)]">No rows</p>;
  const top = Math.max(1, ...series.map((point) => point.value));
  const peak = series.reduce((best, point) => (point.value > best.value ? point : best));
  return (
    <div className="flex flex-col gap-2 px-4 pt-2">
      <div className="flex h-20 items-end gap-[2px]">
        {series.map((point, index) => {
          const style: Column = {
            "--i": index,
            "--h": `${Math.max(4, (point.value / top) * 100)}%`,
          };
          return (
            <span
              key={point.bucket}
              style={style}
              title={`${dayLabel.format(new Date(point.bucket))}: ${point.value}`}
              className={`console-column flex-1 rounded-[2px] ${point === peak ? "bg-[var(--console-string)]" : "bg-white/[0.14]"}`}
            />
          );
        })}
      </div>
      <p className="console-row text-[var(--console-dim)]" style={indexed(4)}>
        Peak {formatCount(peak.value)} on {dayLabel.format(new Date(peak.bucket))}
      </p>
    </div>
  );
}

function ViewFields({ view }: FieldsProps) {
  const fields = consoleViews.find((item) => item.name === view)?.fields ?? [];
  return (
    <ul className="flex flex-col px-1.5">
      {fields.map(([kind, name], index) => (
        <li
          key={name}
          style={indexed(index)}
          className="console-row flex items-center gap-2.5 px-2.5 py-1.5 text-[var(--console-dim)]"
        >
          <span className="flex size-4 items-center justify-center rounded bg-white/[0.06] text-[0.6rem] text-[var(--console-muted)]">
            {kind}
          </span>
          {name}
        </li>
      ))}
    </ul>
  );
}

export function ConsoleWorkbench({
  pages,
  sources,
  series,
  toolbarStart,
  toolbarEnd,
  search,
  aside,
}: Props) {
  const [selection, setSelection] = useState<Selection>({ kind: "query", id: "pages" });
  const [run, setRun] = useState(0);
  const lines = selectionLines(selection);
  const key = selectionKey(selection);
  const active = selection.kind === "query" ? consoleQueries.indexOf(findQuery(selection.id)) : -1;
  const animate = run > 0 ? "" : undefined;

  function select(next: Selection) {
    setSelection(next);
    setRun((count) => count + 1);
  }

  function meta() {
    if (selection.kind === "view") {
      const fields = consoleViews.find((item) => item.name === selection.name)?.fields ?? [];
      return `${fields.length} columns`;
    }
    if (selection.id === "trend") return `${series.length} rows`;
    return `${(selection.id === "pages" ? pages : sources).length} rows`;
  }

  function results() {
    if (selection.kind === "view") return <ViewFields view={selection.name} />;
    if (selection.id === "trend") return <TrendColumns series={series} />;
    return <ResultRows rows={selection.id === "pages" ? pages : sources} />;
  }

  return (
    <div data-animate={animate} className="console-workbench flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--console-line)] px-3 py-2 sm:px-4">
        {toolbarStart}
        <button
          type="button"
          onClick={() => setRun((count) => count + 1)}
          className="console-run flex h-7 items-center gap-1.5 rounded-md bg-[#f2f0ed] px-2.5 font-medium text-[#141312]"
        >
          <PlayIcon className="size-3" />
          Run
        </button>
        {toolbarEnd}
      </div>

      <div className="relative h-[118px] shrink-0 overflow-hidden py-3 font-mono sm:h-[150px] sm:py-4">
        <pre key={`${key}-${run}`} className="console-swap flex flex-col gap-1 sm:gap-1.5">
          {lines.map((tokens, row) => (
            <code key={row} className="flex items-center whitespace-pre text-[var(--console-dim)]">
              <span className="mr-4 w-8 shrink-0 text-right text-[var(--console-muted)] tabular-nums sm:w-10">
                {row + 1}
              </span>
              {tokens.map((token, index) => (
                <span key={index} className={token.kind ? tokenClass[token.kind] : undefined}>
                  {token.text}
                </span>
              ))}
              {row === lines.length - 1 ? (
                <span className="console-caret ml-px h-[1.1em] w-px bg-[var(--console-fg)]" />
              ) : null}
            </code>
          ))}
        </pre>
        <span className="absolute top-3 right-2 h-12 w-1 rounded-full bg-white/15" />
      </div>

      <div className="relative flex items-stretch border-y border-[var(--console-line)]">
        <span className="flex items-center border-r border-[var(--console-line)] px-3 text-[var(--console-muted)]">
          <GridIcon className="size-4" />
        </span>
        <span className="border-r border-[var(--console-line)] px-5 py-2.5 font-mono text-[var(--console-muted)]">
          Results
        </span>
        <PinTopIcon className="mr-3 ml-auto size-4 self-center text-[var(--console-muted)]" />
        <span
          key={run}
          aria-hidden="true"
          className="console-progress absolute inset-x-0 -bottom-px h-px bg-[var(--console-string)]"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[0.8fr_1fr_1.6fr]">
        <section className="flex min-h-0 flex-col border-[var(--console-line)] sm:border-r">
          {search}
          <ul className="flex flex-col gap-0.5 p-1.5 font-mono">
            <li className="px-2.5 py-1 text-[var(--console-muted)]">Views</li>
            {consoleViews.map((view, index) => {
              const picked = selection.kind === "view" && selection.name === view.name;
              return (
                <li key={view.name} style={picked ? undefined : fade(index, 3)}>
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() => select({ kind: "view", name: view.name })}
                    className={`console-item flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left ${picked ? "bg-white/[0.07] text-[var(--console-fg)]" : "text-[var(--console-dim)]"}`}
                  >
                    <StackIcon className="size-3.5 shrink-0 text-[var(--console-muted)]" />
                    <span className="truncate">{view.name}</span>
                    {picked ? <ChevronIcon className="ml-auto size-3 shrink-0 -rotate-90" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col border-[var(--console-line)] max-sm:hidden sm:border-r">
          <div className="border-b border-[var(--console-line)] p-1.5">
            <div
              role="group"
              aria-label="Quick queries"
              className="relative grid grid-cols-3 rounded-md bg-white/[0.03] p-0.5"
            >
              <span
                aria-hidden="true"
                data-hidden={active < 0 ? "" : undefined}
                style={{ transform: `translateX(${Math.max(0, active) * 100}%)` }}
                className="console-tab-indicator absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-[5px] bg-white/[0.09]"
              />
              {consoleQueries.map((query) => {
                const picked = selection.kind === "query" && selection.id === query.id;
                return (
                  <button
                    key={query.id}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => select({ kind: "query", id: query.id })}
                    className={`console-tab relative truncate rounded-[5px] px-1.5 py-1 ${picked ? "text-[var(--console-fg)]" : "text-[var(--console-muted)]"}`}
                  >
                    {query.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="flex items-center justify-between px-4 py-2 font-mono text-[var(--console-muted)]">
            <span key={`${key}-${run}`} className="console-meta">
              {meta()}
            </span>
            <Link
              href="/query"
              className="console-open flex items-center gap-1 text-[var(--console-dim)]"
            >
              Open
              <ArrowUpRightIcon className="size-3" />
            </Link>
          </p>
          <div key={`${key}-${run}`} className="console-results font-mono">
            {results()}
          </div>
        </section>

        {aside}
      </div>
    </div>
  );
}
