import { useMemo } from "react";

import { applyFilter } from "../../../filter/parse";
import type { Runtime } from "../../../panel/runtime";
import { useStore } from "../../../store/create-store";
import { issueFields, issueText } from "../utils/fields";

export function useErrors(runtime: Runtime) {
  const state = useStore(runtime.errors);
  const rows = useMemo(
    () => applyFilter(state.rows, state.filter, issueFields, issueText),
    [state.rows, state.filter],
  );
  return { state, rows };
}
