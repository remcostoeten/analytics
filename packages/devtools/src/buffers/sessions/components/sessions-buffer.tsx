import type { LiveSession } from "../../../client/types";
import { toggleToken } from "../../../filter/parse";
import type { BufferProps } from "../../../panel/types";
import { useBuffer } from "../../../panel/use-buffer";
import { copyText } from "../../../ui/copy";
import { FilterPrompt } from "../../../ui/filter-prompt";
import { clock, duration, shortId } from "../../../ui/format";
import { ActionBar, RowMenu } from "../../../ui/row-menu";
import type { Action } from "../../../ui/row-menu";
import { VirtualList } from "../../../ui/virtual-list";
import { useSessions } from "../hooks/use-sessions";
import { sessionColumns, sessionHeader, signalLabel, signalTone } from "../utils/fields";

export function SessionsBuffer({ runtime, filterRef, register, jump }: BufferProps) {
  const { state, rows } = useSessions(runtime);
  const store = runtime.sessions;

  function expand(row: LiveSession) {
    store.dispatch({ type: "toggle", id: row.id });
  }

  const buffer = useBuffer(store, rows, register, expand);

  function actions(row: LiveSession): Action[] {
    return [
      { label: "open visitor", run: () => jump({ tab: "visitors", open: row.visitor }) },
      { label: "copy id", run: () => copyText(row.id) },
      {
        label: `filter ${row.signal}`,
        run: () =>
          store.dispatch({ type: "filter", text: toggleToken(state.filter, "signal", row.signal) }),
      },
    ];
  }

  const selected = rows.find((row) => row.id === buffer.selected);

  return (
    <>
      <VirtualList
        label="Sessions"
        columns={sessionColumns}
        header={sessionHeader}
        rows={rows}
        open={state.open}
        selected={buffer.selected}
        loaded={state.loaded}
        empty="no sessions in the last 5 minutes"
        onToggle={(row) => {
          buffer.select(row.id);
          expand(row);
        }}
        renderCells={(row) => (
          <>
            <span className="t">{clock(row.startedAt)}</span>
            <span className="f">{shortId(row.id)}</span>
            <span className="m">{row.trail.join(" → ")}</span>
            <span className="m">{row.pages}</span>
            <span className="m">{duration(row.durationMs)}</span>
            <span className={`tag ${signalTone(row)}`}>{signalLabel(row)}</span>
          </>
        )}
        renderDetail={(row) => (
          <>
            <dl className="kv">
              <dt>visitor</dt>
              <dd>
                <button
                  type="button"
                  className="link"
                  onClick={() => jump({ tab: "visitors", open: row.visitor })}
                >
                  {shortId(row.visitor)}
                </button>
              </dd>
              <dt>trail</dt>
              <dd>{row.trail.join(" → ")}</dd>
              <dt>bot score</dt>
              <dd>
                <b>{row.botScore.toFixed(2)}</b>
              </dd>
            </dl>
            <ActionBar actions={actions(row)} />
          </>
        )}
      />
      {buffer.menu && selected ? (
        <RowMenu actions={actions(selected)} onClose={buffer.closeMenu} />
      ) : null}
      <FilterPrompt
        label="Filter sessions"
        inputRef={filterRef}
        value={state.filter}
        placeholder="filter  signal:bot  pages:>3  /configure"
        onChange={(text) => store.dispatch({ type: "filter", text })}
      />
    </>
  );
}
