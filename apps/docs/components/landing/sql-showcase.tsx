"use client";

import { useActionState, useOptimistic, useState } from "react";
import type { ReactNode } from "react";

import type { SqlOutcome, SqlShowcaseState } from "@/lib/sql-answer";
import type { SqlPresetId } from "@/lib/sql-presets";
import type { SqlVariant, SqlVariantId } from "@/lib/sql-variants";

import { CodeFrame } from "./code-frame";
import { runSqlShowcase } from "./sql-showcase-action";

export type SqlShowcaseTab = {
  id: SqlPresetId;
  title: string;
  question: string;
  variants: (SqlVariant & { rendered: ReactNode })[];
};

type Props = {
  tabs: SqlShowcaseTab[];
  initial: SqlShowcaseState;
};

type Cell = string | number | boolean | null;

const isoDay = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
// Postgres sends bigint and numeric columns as strings over the HTTP driver.
const numeric = /^-?\d+(\.\d+)?$/;

function asNumber(cell: Cell) {
  if (typeof cell === "number") return cell;
  if (typeof cell === "string" && numeric.test(cell)) return Number(cell);
  return null;
}

function display(cell: Cell) {
  if (cell === null) return "null";
  const number = asNumber(cell);
  if (number !== null) return number.toLocaleString("en");
  if (typeof cell === "string" && isoDay.test(cell)) return cell.slice(0, 10);
  return String(cell);
}

function describe(outcome: SqlOutcome, pending: boolean) {
  if (pending) return "Running on the API";
  if (outcome.status === "failed") return outcome.message;
  const { rowCount, durationMs, truncated } = outcome.result;
  const rows = rowCount === 1 ? "1 row" : `${rowCount} rows`;
  return `${rows} in ${Math.round(durationMs)} ms${truncated ? ", cut at the row limit" : ""}`;
}

export function SqlShowcase({ tabs, initial }: Props) {
  const [state, dispatch, pending] = useActionState(runSqlShowcase, initial);
  const [active, showActive] = useOptimistic(state.id);
  const [language, setLanguage] = useState<SqlVariantId>("sql");
  const tab = tabs.find((candidate) => candidate.id === active) ?? tabs[0];
  const variant = tab.variants.find((candidate) => candidate.id === language) ?? tab.variants[0];

  return (
    <form
      action={(form) => {
        const next = tabs.find((candidate) => candidate.id === form.get("preset"));
        showActive(next?.id ?? state.id);
        dispatch(form);
      }}
      className="flex min-w-0 flex-col gap-4"
    >
      <div
        role="group"
        aria-label="Queries"
        className="flex w-full max-w-full gap-0.5 self-start overflow-x-auto rounded-full border border-line bg-bg/40 p-1 [scrollbar-width:none] sm:w-fit"
      >
        {tabs.map((candidate) => {
          const selected = candidate.id === tab.id;
          return (
            <button
              key={candidate.id}
              type="submit"
              name="preset"
              value={candidate.id}
              aria-pressed={selected}
              disabled={pending && selected}
              className={`shrink-0 rounded-full px-3 py-1 font-serif text-[0.86rem] whitespace-nowrap transition-colors duration-200 ${
                selected ? "bg-fg text-surface" : "text-muted hover:text-fg"
              }`}
            >
              {candidate.title}
            </button>
          );
        })}
      </div>
      <p className="font-serif text-[1.05rem] text-fg">{tab.question}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
        <div className="min-w-0">
          <CodeFrame
            files={tab.variants.map((candidate) => ({ id: candidate.id, title: candidate.file }))}
            active={variant.id}
            lang={variant.lang}
            code={variant.source}
            wrap
            onSelect={(id) => {
              const next = tab.variants.find((candidate) => candidate.id === id);
              if (next) setLanguage(next.id);
            }}
          >
            {variant.rendered}
          </CodeFrame>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p
            aria-live="polite"
            className={`font-mono text-[0.72rem] ${state.outcome.status === "failed" && !pending ? "text-err" : "text-muted"}`}
          >
            {describe(state.outcome, pending)}
          </p>
          {state.outcome.status === "done" ? (
            <Rows outcome={state.outcome} faded={pending || active !== state.id} />
          ) : null}
        </div>
      </div>
    </form>
  );
}

function Rows({
  outcome,
  faded,
}: {
  outcome: Extract<SqlOutcome, { status: "done" }>;
  faded: boolean;
}) {
  const { columns, rows } = outcome.result;
  if (rows.length === 0) {
    return <p className="font-serif text-[0.95rem] text-muted">No rows in the last 30 days.</p>;
  }
  return (
    <div
      className={`min-w-0 overflow-x-auto rounded-[10px] border border-line transition-opacity duration-200 ${faded ? "opacity-50" : ""}`}
    >
      <table className="w-full text-left text-[0.8rem] tabular-nums">
        <thead className="border-b border-dashed border-line bg-bg/60 font-mono text-[0.68rem] text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-line first:border-t-0">
              {row.map((cell, column) => (
                <td
                  key={columns[column]}
                  className={`px-3 py-1 ${asNumber(cell) !== null ? "text-right font-mono text-fg" : "text-fg/85"}`}
                >
                  {display(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
