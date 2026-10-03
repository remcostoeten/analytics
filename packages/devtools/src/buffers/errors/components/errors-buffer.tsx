import type { Issue } from "../../../client/types";
import { toggleToken } from "../../../filter/parse";
import type { BufferProps } from "../../../panel/types";
import { useBuffer } from "../../../panel/use-buffer";
import { copyText } from "../../../ui/copy";
import { FilterPrompt } from "../../../ui/filter-prompt";
import { clock, count } from "../../../ui/format";
import { ActionBar, RowMenu } from "../../../ui/row-menu";
import type { Action } from "../../../ui/row-menu";
import { VirtualList } from "../../../ui/virtual-list";
import { useErrors } from "../hooks/use-errors";
import { browserCounts, issueColumns, issueHeader, stackText } from "../utils/fields";

export function ErrorsBuffer({ runtime, filterRef, register }: BufferProps) {
  const { state, rows } = useErrors(runtime);
  const store = runtime.errors;
  const dashboard = runtime.options.dashboardUrl;

  function expand(row: Issue) {
    store.dispatch({ type: "toggle", id: row.id });
    runtime.loadIssue(row.id);
  }

  const buffer = useBuffer(store, rows, register, expand);

  function actions(row: Issue): Action[] {
    const list: Action[] = [
      { label: "copy fingerprint", run: () => copyText(row.id) },
      {
        label: "filter release",
        run: () =>
          store.dispatch({
            type: "filter",
            text: toggleToken(state.filter, "release", row.lastRelease ?? "none"),
          }),
      },
    ];
    if (!dashboard) return list;
    const url = `${dashboard.replace(/\/+$/, "")}/issues/${encodeURIComponent(row.id)}`;
    return [
      { label: "open in dashboard", run: () => window.open(url, "_blank", "noopener") },
      ...list,
    ];
  }

  function detail(row: Issue) {
    const events = state.details[row.id]?.events;
    const latest = events?.[0];
    return (
      <>
        <div className="pre">{latest ? stackText(latest) : "loading stack"}</div>
        <dl className="kv">
          <dt>first seen</dt>
          <dd>
            {clock(row.firstSeen)}
            {row.firstRelease ? `, release ${row.firstRelease}` : ""}
            {row.isRegression ? ", regression" : ""}
          </dd>
          <dt>browsers</dt>
          <dd>{events ? browserCounts(events) || "unknown" : "loading"}</dd>
          <dt>breadcrumbs</dt>
          <dd>
            {latest && latest.breadcrumbs.length > 0
              ? latest.breadcrumbs.map((crumb) => crumb.message).join(" → ")
              : "none"}
          </dd>
        </dl>
        <ActionBar actions={actions(row)} />
      </>
    );
  }

  const selected = rows.find((row) => row.id === buffer.selected);

  return (
    <>
      <VirtualList
        label="Error groups"
        columns={issueColumns}
        header={issueHeader}
        rows={rows}
        open={state.open}
        selected={buffer.selected}
        loaded={state.loaded}
        empty="no open errors in the last 24 hours"
        onToggle={(row) => {
          buffer.select(row.id);
          expand(row);
        }}
        renderCells={(row) => (
          <>
            <span className="t">{clock(row.lastSeen)}</span>
            <span className={`tag ${row.level === "error" ? "bad" : "warn"}`}>
              {row.level === "error" ? "error" : "warn"}
            </span>
            <span className="f">{row.title}</span>
            <span className="m">{row.culprit ?? "unknown"}</span>
            <span className="f">{count(row.count)}</span>
            <span className="m">{count(row.visitors)}</span>
            <span className="badge">{row.lastRelease ?? "none"}</span>
          </>
        )}
        renderDetail={detail}
      />
      {buffer.menu && selected ? (
        <RowMenu actions={actions(selected)} onClose={buffer.closeMenu} />
      ) : null}
      <FilterPrompt
        label="Filter errors"
        inputRef={filterRef}
        value={state.filter}
        placeholder="filter  level:error  release:2026.10.03  TypeError  /cars"
        onChange={(text) => store.dispatch({ type: "filter", text })}
      />
    </>
  );
}
