"use client";

import { useActionState, useOptimistic } from "react";
import type { ReactNode } from "react";

import type { SqlOutcome, SqlShowcaseState } from "@/lib/sql-answer";
import type { SqlPresetId } from "@/lib/sql-presets";

import { runSqlShowcase } from "./sql-showcase-action";

export type SqlShowcaseTab = {
  id: SqlPresetId;
  title: string;
  question: string;
  code: ReactNode;
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
  const tab = tabs.find((candidate) => candidate.id === active) ?? tabs[0];

  return (
    <form
      action={(form) => {
        const next = tabs.find((candidate) => candidate.id === form.get("preset"));
        showActive(next?.id ?? state.id);
        dispatch(form);
      }}
      className="flex min-w-0 flex-col gap-5"
    >
      <div role="group" aria-label="Queries" className="flex flex-wrap gap-2">
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
              className={`rounded-full border px-3.5 py-1.5 font-serif text-[0.9rem] transition-colors duration-200 ${
                selected
                  ? "border-fg bg-fg text-surface"
                  : "border-line text-muted hover:border-fg/40 hover:text-fg"
              }`}
            >
              {candidate.title}
            </button>
          );
        })}
      </div>
      <p className="font-serif text-[1.05rem] text-fg">{tab.question}</p>
      <div className="min-w-0">{tab.code}</div>
      <p
        aria-live="polite"
        className={`font-mono text-[0.72rem] ${state.outcome.status === "failed" && !pending ? "text-err" : "text-muted"}`}
      >
        {describe(state.outcome, pending)}
      </p>
      {state.outcome.status === "done" ? (
        <Rows outcome={state.outcome} faded={pending || active !== state.id} />
      ) : null}
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
                  className={`px-3 py-1.5 ${asNumber(cell) !== null ? "text-right font-mono text-fg" : "text-fg/85"}`}
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
