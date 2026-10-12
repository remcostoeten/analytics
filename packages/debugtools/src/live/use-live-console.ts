import type { QueryResult } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ConsoleSource, TimeRange } from "../source";
import type { Dataset } from "../types";
import { datasetsFromSchema, starterQuery } from "./schema";

export type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; result: QueryResult }
  | { status: "failed"; message: string };

const recentLimit = 20;

function recentFrom(statements: string[]): string[][] {
  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const statement of statements) {
    const sql = statement.trim();
    if (!sql || seen.has(sql)) continue;
    seen.add(sql);
    unique.push(sql.split("\n"));
    if (unique.length === recentLimit) break;
  }
  return unique;
}

/**
 * @name useLiveConsole
 * @description The live console's state over a data source: the editor's SQL, the time range, the
 * current run, the datasets from the view schema and the recent queries from the run history.
 * `run` sends the SQL; `cancel` drops the answer of the run in flight, which the server still
 * finishes and logs.
 *
 * @example
 * const live = useLiveConsole(source);
 * live.run();
 */
export function useLiveConsole(source: ConsoleSource) {
  const [sql, setSql] = useState(starterQuery);
  const [range, setRange] = useState<TimeRange>("24h");
  const [state, setState] = useState<RunState>({ status: "idle" });
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [schemaError, setSchemaError] = useState<Nullable<string>>(null);
  const [recent, setRecent] = useState<string[][]>([]);
  const latest = useRef(0);

  const loadHistory = useCallback(async () => {
    const history = await source.history();
    if (history.ok) setRecent(recentFrom(history.value.data.map((run) => run.sql)));
  }, [source]);

  useEffect(() => {
    let active = true;
    void source.schema().then((schema) => {
      if (!active) return;
      if (schema.ok) setDatasets(datasetsFromSchema(schema.value));
      else setSchemaError(schema.error.message);
    });
    void loadHistory();
    return () => {
      active = false;
    };
  }, [source, loadHistory]);

  const run = useCallback(
    async (statement: string = sql) => {
      const id = ++latest.current;
      setState({ status: "running" });
      const result = await source.run(statement, range);
      if (id !== latest.current) return;
      setState(
        result.ok
          ? { status: "done", result: result.value }
          : { status: "failed", message: result.error.message },
      );
      setRecent((current) => recentFrom([statement, ...current.map((lines) => lines.join("\n"))]));
    },
    [source, sql, range],
  );

  const cancel = useCallback(() => {
    latest.current++;
    setState({ status: "idle" });
  }, []);

  const clear = useCallback(() => {
    latest.current++;
    setSql("");
    setState({ status: "idle" });
  }, []);

  return { sql, setSql, range, setRange, state, datasets, schemaError, recent, run, cancel, clear };
}
