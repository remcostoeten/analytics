import { useEffect, useMemo } from "react";

import { applyFilter, parseFilter } from "../../../filter/parse";
import type { Runtime } from "../../../panel/runtime";
import { useStore } from "../../../store/create-store";
import { logFields, logText } from "../utils/fields";

const pathDelayMs = 400;

export function useLogs(runtime: Runtime) {
  const state = useStore(runtime.logs);
  const rows = useMemo(
    () => applyFilter(state.rows, state.filter, logFields, logText),
    [state.rows, state.filter],
  );
  const path = useMemo(() => parseFilter(state.filter).path, [state.filter]);

  useEffect(() => {
    const timer = setTimeout(() => runtime.setLogPath(path), pathDelayMs);
    return () => clearTimeout(timer);
  }, [path]);

  return { state, rows };
}
