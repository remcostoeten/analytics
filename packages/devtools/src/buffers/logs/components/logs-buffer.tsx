import { useMemo } from "react";

import type { LogEntry } from "../../../client/types";
import { toggleToken } from "../../../filter/parse";
import { linkFor } from "../../../json/tree";
import type { BufferProps } from "../../../panel/types";
import { useBuffer } from "../../../panel/use-buffer";
import { useStore } from "../../../store/create-store";
import { copyText } from "../../../ui/copy";
import { FilterPrompt } from "../../../ui/filter-prompt";
import { clock } from "../../../ui/format";
import { JsonTree } from "../../../ui/json-tree";
import { ActionBar, RowMenu } from "../../../ui/row-menu";
import type { Action } from "../../../ui/row-menu";
import { VirtualList } from "../../../ui/virtual-list";
import { useLogs } from "../hooks/use-logs";
import { logColumns, logHeader, outcomeTone } from "../utils/fields";

export function LogsBuffer({ runtime, filterRef, register, jump, follow }: BufferProps) {
  const { state, rows } = useLogs(runtime);
  const visitors = useStore(runtime.visitors);
  const sessions = useStore(runtime.sessions);
  const store = runtime.logs;
  const resolve = useMemo(
    () =>
      linkFor(
        new Set(visitors.rows.map((row) => row.id)),
        new Set(sessions.rows.map((row) => row.id)),
      ),
    [visitors.rows, sessions.rows],
  );

  function expand(row: LogEntry) {
    store.dispatch({ type: "toggle", id: row.id });
  }

  const buffer = useBuffer(store, rows, register, expand);

  function context(row: LogEntry): Action {
    const code = row.code;
    if (code)
      return { label: "open error catalog", run: () => follow({ type: "code", target: code }) };
    const visitor = row.visitor;
    if (visitor)
      return { label: "open visitor", run: () => jump({ tab: "visitors", open: visitor }) };
    const path = row.path;
    if (path) return { label: "open route", run: () => jump({ tab: "speed", filter: path }) };
    return { label: "filter source", run: () => filter("src", row.source) };
  }

  function filter(key: string, value: string) {
    store.dispatch({ type: "filter", text: toggleToken(state.filter, key, value) });
  }

  function actions(row: LogEntry): Action[] {
    return [
      { label: "copy json", run: () => copyText(JSON.stringify(row.data, null, 2)) },
      context(row),
      { label: `filter ${row.kind}`, run: () => filter("kind", row.kind) },
    ];
  }

  const selected = rows.find((row) => row.id === buffer.selected);

  return (
    <>
      <VirtualList
        label="Logs"
        columns={logColumns}
        header={logHeader}
        rows={rows}
        open={state.open}
        selected={buffer.selected}
        loaded={state.loaded}
        empty="no log rows yet"
        onToggle={(row) => {
          buffer.select(row.id);
          expand(row);
        }}
        renderCells={(row) => (
          <>
            <span className="t">{clock(row.at, true)}</span>
            <span className={`tag ${outcomeTone(row)}`}>{row.outcome}</span>
            <span className={`kind k-${row.kind}`}>{row.kind}</span>
            <span className="f">{row.message}</span>
            <span className={`src s-${row.source}`}>{row.source}</span>
          </>
        )}
        renderDetail={(row) => (
          <>
            <JsonTree value={row.data} resolve={resolve} onLink={follow} />
            <ActionBar actions={actions(row)} />
          </>
        )}
      />
      {buffer.menu && selected ? (
        <RowMenu actions={actions(selected)} onClose={buffer.closeMenu} />
      ) : null}
      <FilterPrompt
        label="Filter logs"
        inputRef={filterRef}
        value={state.filter}
        placeholder="filter  level:error  kind:ingest  src:sdk  RA_"
        onChange={(text) => store.dispatch({ type: "filter", text })}
      >
        <span className="legend hide-sm" aria-hidden="true">
          <i className="ok" />
          sent <i className="warn" />
          retry <i className="bad" />
          rejected <i className="none" />
          info
        </span>
        <button
          type="button"
          className={state.held ? "tb press" : "tb on press"}
          aria-pressed={!state.held}
          onClick={() => runtime.holdLogs(!state.held)}
        >
          {state.held ? "paused" : "live"}
        </button>
        <button
          type="button"
          className="tb press"
          onClick={() => store.dispatch({ type: "clear" })}
        >
          clear
        </button>
      </FilterPrompt>
    </>
  );
}
