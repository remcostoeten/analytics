import { useMemo } from "react";

import { applyFilter } from "../../../filter/parse";
import type { Runtime } from "../../../panel/runtime";
import { useStore } from "../../../store/create-store";
import { speedFields, speedText } from "../utils/fields";

export function useSpeed(runtime: Runtime) {
  const state = useStore(runtime.speed);
  const rows = useMemo(
    () => applyFilter(state.rows, state.filter, speedFields, speedText),
    [state.rows, state.filter],
  );
  return { state, rows };
}
