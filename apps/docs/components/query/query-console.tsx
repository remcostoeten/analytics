"use client";

import { useActionState, useRef, useState } from "react";

import { CopyButton } from "@/components/landing/copy-button";
import { FileIcon } from "@/components/landing/icons";
import { parseSqlAnswer } from "@/lib/sql-answer";
import type { SqlOutcome } from "@/lib/sql-answer";

import { QueryEditor } from "./query-editor";
import { QueryResults } from "./query-results";

export type QueryPreset = {
  id: string;
  title: string;
  sql: string;
  prerenderedHTML: string;
};

type Props = {
  endpoint: string;
  presets: QueryPreset[];
};

type Outcome = { status: "idle" } | SqlOutcome;

const idle: Outcome = { status: "idle" };

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function withoutSlash(url: string): string {
  return url.endsWith("/") ? withoutSlash(url.slice(0, -1)) : url;
}

function timestamp(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function runQuery(_: Outcome, form: FormData): Promise<Outcome> {
  const endpoint = withoutSlash(field(form, "endpoint"));
  const token = field(form, "token");
  const project = field(form, "project");
  const sql = field(form, "sql");
  if (!endpoint || !token || !sql) {
    return { status: "failed", message: "The API URL, a token and a query are required." };
  }
  const from = timestamp(field(form, "from"));
  const to = timestamp(field(form, "to"));
  if (from === null || to === null) {
    return { status: "failed", message: "From and To must be valid dates." };
  }
  const path = project ? `/v2/projects/${encodeURIComponent(project)}/query` : "/v2/query";
  try {
    const response = await fetch(`${endpoint}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ sql, params: { from, to } }),
    });
    const body: unknown = await response.json().catch(() => null);
    return parseSqlAnswer(response.status, body);
  } catch {
    return { status: "failed", message: "The API could not be reached from this browser." };
  }
}

function describe(outcome: Outcome, pending: boolean) {
  if (pending) return "Running on the API";
  if (outcome.status === "idle") return "Ready. Press Run or Ctrl/Cmd + Enter.";
  if (outcome.status === "failed") return outcome.message;
  const { rowCount, durationMs, truncated } = outcome.result;
  const rows = rowCount === 1 ? "1 row" : `${rowCount.toLocaleString("en")} rows`;
  return `${rows} in ${Math.round(durationMs)} ms${truncated ? ", cut at the row limit" : ""}`;
}

const input =
  "h-9 w-full min-w-0 rounded-md border border-line bg-bg px-3 font-mono text-[0.8rem] text-fg outline-none transition-colors placeholder:text-muted/60 focus:border-fg/40";
const label = "flex min-w-0 flex-col gap-1.5";
const labelText = "caps text-[0.62rem] text-muted";

export function QueryConsole({ endpoint, presets }: Props) {
  const [outcome, action, pending] = useActionState(runQuery, idle);
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "");
  const preset = presets.find((candidate) => candidate.id === presetId) ?? presets[0];
  const [sql, setSql] = useState(preset?.sql ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const lines = sql.split("\n").length;

  function choose(next: QueryPreset) {
    setPresetId(next.id);
    setSql(next.sql);
  }

  return (
    <form
      ref={formRef}
      action={action}
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          event.stopPropagation();
          formRef.current?.requestSubmit();
        }
      }}
      className="flex min-w-0 flex-col gap-6"
    >
      <fieldset className="grid min-w-0 gap-4 rounded-[10px] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <legend className="sr-only">Connection</legend>
        <label className={label}>
          <span className={labelText}>API URL</span>
          <input name="endpoint" defaultValue={endpoint} className={input} autoComplete="off" />
        </label>
        <label className={label}>
          <span className={labelText}>Token, at_ with the sql scope</span>
          <input
            name="token"
            type="password"
            className={input}
            placeholder="at_live_…"
            autoComplete="off"
          />
        </label>
        <label className={label}>
          <span className={labelText}>Project, empty for all</span>
          <input
            name="project"
            className={input}
            placeholder="remcostoeten.nl"
            autoComplete="off"
          />
        </label>
        <div className="grid min-w-0 grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1">
          <label className={label}>
            <span className={labelText}>From</span>
            <input name="from" type="date" className={input} />
          </label>
          <label className={label}>
            <span className={labelText}>To</span>
            <input name="to" type="date" className={input} />
          </label>
        </div>
        <p className="self-end text-[0.75rem] leading-relaxed text-muted sm:col-span-2">
          The token stays in this page and goes only to the API URL. Empty dates use the API default
          window.
        </p>
      </fieldset>

      <div className="flex min-w-0 flex-col gap-3">
        <div role="group" aria-label="Start from a query" className="flex flex-wrap gap-2">
          {presets.map((candidate) => {
            const selected = candidate.id === preset?.id;
            return (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={selected}
                onClick={() => choose(candidate)}
                className={`rounded-full border px-3 py-1 text-[0.8rem] transition-colors duration-200 ${
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

        <section
          aria-label="SQL editor"
          className="min-w-0 overflow-clip rounded-[10px] border border-line bg-surface"
        >
          <header className="flex items-center justify-between gap-3 border-b border-dashed border-line py-2 pr-2 pl-4">
            <p className="m-0 flex min-w-0 items-center gap-2 font-mono text-[0.72rem]">
              <FileIcon className="size-3.5 shrink-0 text-accent" />
              <span className="truncate text-fg">query.sql</span>
              <span className="text-muted tabular-nums">{lines} lines</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <kbd className="hidden font-mono text-[0.62rem] text-muted sm:inline">
                Ctrl/Cmd + Enter
              </kbd>
              <CopyButton text={sql} label="Copy the query" />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-7 items-center justify-center rounded-md bg-fg px-3 text-[0.75rem] font-medium text-bg transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              >
                {pending ? "Running" : "Run"}
              </button>
            </div>
          </header>
          <div className="min-h-48">
            {preset ? (
              <QueryEditor
                id={preset.id}
                contents={preset.sql}
                prerenderedHTML={preset.prerenderedHTML}
                onChange={setSql}
              />
            ) : null}
          </div>
          <input type="hidden" name="sql" value={sql} />
        </section>
      </div>

      <section aria-label="Result" className="flex min-w-0 flex-col gap-3">
        <p
          aria-live="polite"
          className={`flex items-center gap-2 font-mono text-[0.72rem] ${
            outcome.status === "failed" && !pending ? "text-err" : "text-muted"
          }`}
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${
              pending
                ? "animate-pulse bg-accent"
                : outcome.status === "failed"
                  ? "bg-err"
                  : outcome.status === "done"
                    ? "bg-ok"
                    : "bg-muted/50"
            }`}
          />
          {describe(outcome, pending)}
        </p>
        {outcome.status === "done" ? <QueryResults outcome={outcome} faded={pending} /> : null}
      </section>
    </form>
  );
}
