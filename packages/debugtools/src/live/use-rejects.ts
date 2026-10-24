import { useCallback, useEffect, useState } from "react";

import type { ConsoleSource } from "../source";
import { rejectQueries, rejectsFrom } from "./rejects";
import type { Reject } from "./rejects";

export type RejectsState =
  | { status: "loading" }
  | { status: "ready"; rows: Reject[] }
  | { status: "failed"; message: string };

/**
 * @name useRejects
 * @description The recent rejected events and rate limited requests of the project, read from its
 * log. `reload` reads them again.
 *
 * @example
 * const { state, reload } = useRejects(source);
 */
export function useRejects(source: ConsoleSource) {
  const [state, setState] = useState<RejectsState>({ status: "loading" });

  const load = useCallback(async () => {
    const answers = await Promise.all(rejectQueries.map((q) => source.logs(q)));
    const failed = answers.find((answer) => !answer.ok);
    if (failed && !failed.ok) return { status: "failed", message: failed.error.message } as const;
    return {
      status: "ready",
      rows: rejectsFrom(answers.flatMap((answer) => (answer.ok ? answer.value.data : []))),
    } as const;
  }, [source]);

  useEffect(() => {
    let active = true;
    async function first() {
      const next = await load();
      if (active) setState(next);
    }
    void first();
    return () => {
      active = false;
    };
  }, [load]);

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    setState(await load());
  }, [load]);

  return { state, reload };
}
