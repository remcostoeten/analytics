"use client";

import { useActionState } from "react";

type Cell = string | number | boolean | null;

type Outcome =
  | { status: "idle" }
  | { status: "failed"; message: string }
  | {
      status: "done";
      columns: string[];
      rows: Cell[][];
      rowCount: number;
      truncated: boolean;
      durationMs: number;
    };

type Props = {
  endpoint: string;
};

type Failure = { error?: { message?: string } };

const idle: Outcome = { status: "idle" };
const sample =
  "SELECT path, count(*) AS views\nFROM events\nWHERE ts >= :from AND ts < :to\nGROUP BY path\nORDER BY views DESC\nLIMIT 20";

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

function display(cell: Cell) {
  return cell === null ? "null" : String(cell);
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
  const params = { from, to };
  try {
    const response = await fetch(`${endpoint}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ sql, params }),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const message = (body as Failure).error?.message;
      return { status: "failed", message: message ?? `The API answered ${response.status}.` };
    }
    return { status: "done", ...(body as Omit<Extract<Outcome, { status: "done" }>, "status">) };
  } catch {
    return { status: "failed", message: "The API could not be reached from this browser." };
  }
}

const input =
  "w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm text-fd-foreground outline-none focus:border-fd-primary";
const label = "flex flex-col gap-1.5 text-xs font-medium text-fd-muted-foreground";

export function QueryConsole({ endpoint }: Props) {
  const [outcome, action, pending] = useActionState(runQuery, idle);

  return (
    <div className="flex flex-col gap-6">
      <form
        action={action}
        className="flex flex-col gap-4 rounded-lg border border-fd-border bg-fd-card p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            API URL
            <input name="endpoint" defaultValue={endpoint} className={input} autoComplete="off" />
          </label>
          <label className={label}>
            Token (at_ with the sql scope)
            <input name="token" type="password" className={input} autoComplete="off" />
          </label>
          <label className={label}>
            Project (leave empty for every project you may query)
            <input
              name="project"
              className={input}
              placeholder="remcostoeten.nl"
              autoComplete="off"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={label}>
              From
              <input name="from" type="date" className={input} />
            </label>
            <label className={label}>
              To
              <input name="to" type="date" className={input} />
            </label>
          </div>
        </div>
        <label className={label}>
          SQL
          <textarea
            name="sql"
            defaultValue={sample}
            rows={8}
            spellCheck={false}
            className={`${input} font-mono`}
          />
        </label>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-fd-muted-foreground">
            The token stays in this page and goes only to the API URL above.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground disabled:opacity-60"
          >
            {pending ? "Running" : "Run query"}
          </button>
        </div>
      </form>
      <Result outcome={outcome} />
    </div>
  );
}

function Result({ outcome }: { outcome: Outcome }) {
  if (outcome.status === "idle") return null;
  if (outcome.status === "failed") {
    return (
      <p
        role="alert"
        className="rounded-md border border-fd-border bg-fd-card p-4 text-sm text-fd-foreground"
      >
        {outcome.message}
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs text-fd-muted-foreground">
        {outcome.rowCount} rows in {Math.round(outcome.durationMs)} ms
        {outcome.truncated ? ", cut at the row limit" : ""}
      </p>
      <div className="overflow-x-auto rounded-lg border border-fd-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-fd-muted text-fd-muted-foreground">
            <tr>
              {outcome.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {outcome.rows.map((row, index) => (
              <tr key={index} className="border-t border-fd-border">
                {row.map((cell, column) => (
                  <td key={column} className="px-3 py-2 font-mono text-xs text-fd-foreground">
                    {display(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
