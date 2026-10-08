import type { ClientError, ClientResult } from "@spoar/client";
import { useEffect, useState } from "react";

export type Read<Value> =
  | { status: "loading"; value: Value | null }
  | { status: "ready"; value: Value }
  | { status: "error"; error: ClientError; value: Value | null };

/**
 * @name useRead
 * @description Runs one read from `@spoar/client` whenever `key` changes and holds its `Result`
 * as loading, ready or error state. The previous value stays visible while a new read loads, a
 * stale response is dropped, and nothing here throws.
 *
 * @example
 * const stats = useRead(() => scope.stats(), [key]);
 * if (stats.status === "error") return <Failure error={stats.error} onRetry={stats.retry} />;
 */
export function useRead<Value>(read: () => ClientResult<Value>, key: readonly unknown[]) {
  const [state, setState] = useState<Read<Value>>({ status: "loading", value: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((previous) => ({ status: "loading", value: previous.value }));
    void read().then((result) => {
      if (!current) return;
      if (result.ok) setState({ status: "ready", value: result.value });
      else
        setState((previous) => ({ status: "error", error: result.error, value: previous.value }));
    });
    return () => {
      current = false;
    };
  }, [...key, attempt]);

  function retry() {
    setAttempt((count) => count + 1);
  }

  return { ...state, retry };
}
