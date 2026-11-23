"use client";

import { useEffect, useState } from "react";

import {
  gamesPerDay,
  gameTotals,
  SAMPLE_GAMES,
  sampleQueries,
  type SampleCell,
  type SampleQuery,
} from "@/lib/blog-game-sample";

type Saved = {
  id: string;
  name: string;
  query: string;
};

const STORAGE_KEY = "spoar-blog-saved-queries";
const totals = gameTotals(SAMPLE_GAMES);
const days = gamesPerDay(SAMPLE_GAMES);
const busiest = Math.max(...days.map((entry) => entry.games));
const queries = sampleQueries(SAMPLE_GAMES);

function minutes(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function readSaved(): Saved[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Saved[]) : [];
  } catch {
    return [];
  }
}

function writeSaved(saved: Saved[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    return;
  }
}

function findQuery(id: string) {
  return queries.find((query) => query.id === id) ?? queries[0];
}

export function GameQuery() {
  return (
    <figure className="not-prose my-8 overflow-hidden rounded-[10px] border border-line bg-surface">
      <Overview />
      <QuerySection />
      <figcaption className="border-t border-line px-4 py-2.5 text-[0.7rem] text-muted">
        Sample numbers for a made-up month. The queries and the save request are the real ones.
      </figcaption>
    </figure>
  );
}

function Overview() {
  const tiles = [
    { label: "Finished games", value: totals.games.toLocaleString("en") },
    { label: "Average rounds", value: totals.rounds.toFixed(1) },
    { label: "Average length", value: minutes(totals.seconds) },
  ];
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[0.9rem] font-medium text-fg">remcosecondos</span>
          <code className="truncate font-mono text-[0.72rem] text-muted">game_completed</code>
        </span>
        <span className="caps shrink-0 text-[0.62rem] text-muted">Last 30 days</span>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-md border border-line px-3 py-2">
            <dt className="caps truncate text-[0.62rem] text-muted">{tile.label}</dt>
            <dd className="font-mono text-[1.1rem] font-medium text-fg tabular-nums">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-md border border-line px-3 pt-2 pb-3">
        <span className="caps text-[0.62rem] text-muted">Finished games per day</span>
        <ol aria-label="Finished games per day" className="mt-2 flex h-20 items-end gap-[3px]">
          {days.map((entry) => (
            <li
              key={entry.day}
              title={`${entry.day}: ${entry.games} games`}
              className="flex-1 rounded-t-[2px] bg-accent/70 transition-colors hover:bg-accent"
              style={{ height: `${Math.max(4, (entry.games / busiest) * 100)}%` }}
            >
              <span className="sr-only">
                {entry.day}: {entry.games} games
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function QuerySection() {
  const [active, setActive] = useState(queries[0].id);
  const [ran, setRan] = useState<string | null>(null);
  const [name, setName] = useState(queries[0].name);
  const [saved, setSaved] = useState<Saved[]>([]);
  const query = findQuery(active);

  useEffect(() => {
    setSaved(readSaved());
  }, []);

  function choose(id: string, label = findQuery(id).name) {
    setActive(id);
    setName(label);
    setRan(null);
  }

  function save() {
    const trimmed = name.trim() || query.name;
    const next = [
      { id: `${Date.now()}`, name: trimmed, query: query.id },
      ...saved.filter((entry) => entry.name !== trimmed),
    ];
    setSaved(next);
    writeSaved(next);
  }

  function remove(id: string) {
    const next = saved.filter((entry) => entry.id !== id);
    setSaved(next);
    writeSaved(next);
  }

  const body = {
    name: name.trim() || query.name,
    sql: query.sql,
    description: query.description,
    chart: query.chart,
  };

  return (
    <div className="border-t border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="caps text-[0.62rem] text-muted">Query</span>
        <div role="tablist" aria-label="Sample queries" className="flex flex-wrap gap-1">
          {queries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={entry.id === active}
              onClick={() => choose(entry.id)}
              className={`rounded-md px-2.5 py-1 text-[0.75rem] transition-colors ${
                entry.id === active ? "bg-fg/8 text-fg" : "text-muted hover:bg-fg/4 hover:text-fg"
              }`}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-fg/[0.02] p-3 font-mono text-[0.75rem] leading-5 text-fg">
        {query.sql}
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRan(query.id)}
          className="rounded-md bg-fg px-3 py-1.5 text-[0.78rem] font-medium text-bg transition-opacity hover:opacity-85"
        >
          Run query
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="sr-only">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            className="min-w-0 flex-1 rounded-md border border-line bg-transparent px-2.5 py-1.5 text-[0.78rem] text-fg outline-none focus:border-fg/30"
          />
        </label>
        <button
          type="button"
          onClick={save}
          className="rounded-md border border-line px-3 py-1.5 text-[0.78rem] text-fg transition-colors hover:bg-fg/4"
        >
          Save
        </button>
      </div>
      {ran === query.id ? <ResultTable query={query} /> : null}
      {saved.length > 0 ? (
        <SavedList saved={saved} active={name} onOpen={choose} onRemove={remove} />
      ) : null}
      <details className="group mt-3">
        <summary className="cursor-pointer text-[0.72rem] text-muted transition-colors hover:text-fg">
          The request Save sends to the API
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-fg/[0.02] p-3 font-mono text-[0.72rem] leading-5 text-fg">
          {`POST /v2/queries\nauthorization: Bearer <token with the sql scope>\n\n${JSON.stringify(body, null, 2)}`}
        </pre>
      </details>
    </div>
  );
}

function display(cell: SampleCell) {
  return cell === null ? "null" : String(cell);
}

function ResultTable({ query }: { query: SampleQuery }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[0.7rem] text-muted">{query.rows.length} rows</p>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-left text-[0.78rem]">
          <thead className="bg-fg/[0.03] text-muted">
            <tr>
              {query.columns.map((column) => (
                <th key={column} className="px-3 py-1.5 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.rows.map((row, index) => (
              <tr key={index} className="border-t border-line">
                {row.map((cell, column) => (
                  <td key={column} className="px-3 py-1.5 font-mono text-fg tabular-nums">
                    {display(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type SavedListProps = {
  saved: Saved[];
  active: string;
  onOpen: (query: string, name: string) => void;
  onRemove: (id: string) => void;
};

function SavedList({ saved, active, onOpen, onRemove }: SavedListProps) {
  return (
    <div className="mt-4">
      <span className="caps text-[0.62rem] text-muted">Saved in this browser</span>
      <ul className="mt-1.5 flex flex-col divide-y divide-line rounded-md border border-line">
        {saved.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 px-3 py-1.5">
            <button
              type="button"
              onClick={() => onOpen(entry.query, entry.name)}
              className={`min-w-0 flex-1 truncate text-left text-[0.78rem] transition-colors hover:text-fg ${
                entry.name === active ? "text-fg" : "text-muted"
              }`}
            >
              {entry.name}
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.id)}
              aria-label={`Remove ${entry.name}`}
              className="text-[0.72rem] text-muted transition-colors hover:text-fg"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
