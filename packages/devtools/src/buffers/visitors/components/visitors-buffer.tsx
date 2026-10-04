import type { OnlineVisitor } from "../../../client/types";
import { toggleToken } from "../../../filter/parse";
import type { BufferProps } from "../../../panel/types";
import { useBuffer } from "../../../panel/use-buffer";
import { copyText } from "../../../ui/copy";
import { FilterPrompt } from "../../../ui/filter-prompt";
import { botTone, clock, duration, shortId } from "../../../ui/format";
import { ActionBar, RowMenu } from "../../../ui/row-menu";
import type { Action } from "../../../ui/row-menu";
import { VirtualList } from "../../../ui/virtual-list";
import { useVisitors } from "../hooks/use-visitors";
import { clientLine, place, visitorColumns, visitorHeader } from "../utils/fields";

export function VisitorsBuffer({ runtime, filterRef, register, jump }: BufferProps) {
  const { state, rows } = useVisitors(runtime);
  const store = runtime.visitors;

  function expand(row: OnlineVisitor) {
    store.dispatch({ type: "toggle", id: row.id });
    runtime.loadVisitor(row.id);
  }

  const buffer = useBuffer(store, rows, register, expand);

  function actions(row: OnlineVisitor): Action[] {
    return [
      { label: "follow", run: () => jump({ tab: "logs", filter: `visitor:${row.id}` }) },
      { label: "copy id", run: () => copyText(row.id) },
      {
        label: "filter path",
        run: () =>
          store.dispatch({ type: "filter", text: toggleToken(state.filter, "path", row.path) }),
      },
    ];
  }

  function signals(row: OnlineVisitor) {
    const detail = state.details[row.id];
    if (!detail) return "loading";
    const score = `${detail.verdict}, score ${detail.botScore.toFixed(2)}`;
    return detail.signals.length === 0
      ? `${score}, no signals`
      : `${score}, ${detail.signals.join(", ")}`;
  }

  const selected = rows.find((row) => row.id === buffer.selected);

  return (
    <>
      <VirtualList
        label="Online visitors"
        columns={visitorColumns}
        header={visitorHeader}
        rows={rows}
        open={state.open}
        selected={buffer.selected}
        loaded={state.loaded}
        empty="no visitors in the last 5 minutes"
        onToggle={(row) => {
          buffer.select(row.id);
          expand(row);
        }}
        renderCells={(row) => (
          <>
            <span className="t">{clock(row.seenAt)}</span>
            <span className="f">{shortId(row.id)}</span>
            <span className="m">{row.path}</span>
            <span className="badge">{row.referrer ?? "direct"}</span>
            <span className="m">{place(row)}</span>
            <span className="m">{row.device}</span>
            <span className={`tag ${botTone(row.botScore)}`}>{row.botScore.toFixed(2)}</span>
          </>
        )}
        renderDetail={(row) => (
          <>
            <dl className="kv">
              <dt>session</dt>
              <dd>
                <button
                  type="button"
                  className="link"
                  onClick={() => jump({ tab: "sessions", open: row.session })}
                >
                  {shortId(row.session)}
                </button>{" "}
                · {row.pages} pages · {duration(row.durationMs)}
              </dd>
              <dt>trail</dt>
              <dd>{row.trail.join(" → ") || row.path}</dd>
              <dt>client</dt>
              <dd>{clientLine(row)}</dd>
              <dt>identity</dt>
              <dd>{row.identified ? "identified" : "anonymous"}</dd>
              <dt>signals</dt>
              <dd>{signals(row)}</dd>
            </dl>
            <ActionBar actions={actions(row)} />
          </>
        )}
      />
      {buffer.menu && selected ? (
        <RowMenu actions={actions(selected)} onClose={buffer.closeMenu} />
      ) : null}
      <FilterPrompt
        label="Filter visitors"
        inputRef={filterRef}
        value={state.filter}
        placeholder="filter  geo:NL  device:mobile  bot:>0.5  /lease"
        onChange={(text) => store.dispatch({ type: "filter", text })}
      />
    </>
  );
}
