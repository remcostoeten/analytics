import { useMemo } from "react";

import { applyFilter } from "../../../filter/parse";
import type { Runtime } from "../../../panel/runtime";
import { useStore } from "../../../store/create-store";
import { sessionFields, sessionText } from "../utils/fields";

export function useSessions(runtime: Runtime) {
  const state = useStore(runtime.sessions);
  const rows = useMemo(
    () => applyFilter(state.rows, state.filter, sessionFields, sessionText),
    [state.rows, state.filter],
  );
  return { state, rows };
}
