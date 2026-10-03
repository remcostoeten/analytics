import { useMemo } from "react";

import { applyFilter } from "../../../filter/parse";
import type { Runtime } from "../../../panel/runtime";
import { useStore } from "../../../store/create-store";
import { visitorFields, visitorText } from "../utils/fields";

export function useVisitors(runtime: Runtime) {
  const state = useStore(runtime.visitors);
  const rows = useMemo(
    () => applyFilter(state.rows, state.filter, visitorFields, visitorText),
    [state.rows, state.filter],
  );
  return { state, rows };
}
