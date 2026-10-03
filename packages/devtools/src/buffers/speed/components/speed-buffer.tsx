import type { BufferProps } from "../../../panel/types";
import { useBuffer } from "../../../panel/use-buffer";
import { FilterPrompt } from "../../../ui/filter-prompt";
import { count } from "../../../ui/format";
import { VirtualList } from "../../../ui/virtual-list";
import { useSpeed } from "../hooks/use-speed";
import { speedColumns, speedHeader } from "../utils/fields";
import { VitalBar } from "./vital-bar";

export function SpeedBuffer({ runtime, filterRef, register }: BufferProps) {
  const { state, rows } = useSpeed(runtime);
  const store = runtime.speed;
  const buffer = useBuffer(store, rows, register, (row) => buffer.select(row.id));

  return (
    <>
      <VirtualList
        label="Speed per route"
        columns={speedColumns}
        header={speedHeader}
        rows={rows}
        open={null}
        selected={buffer.selected}
        loaded={state.loaded}
        empty="no speed samples in the last 24 hours"
        onToggle={(row) => buffer.select(row.id)}
        renderCells={(row) => (
          <>
            <span className="f">{row.route}</span>
            <VitalBar vital="lcp" value={row.lcp} />
            <VitalBar vital="inp" value={row.inp} />
            <VitalBar vital="cls" value={row.cls} />
            <VitalBar vital="ttfb" value={row.ttfb} />
            <span className="t">{count(row.samples)}</span>
          </>
        )}
      />
      <FilterPrompt
        label="Filter routes"
        inputRef={filterRef}
        value={state.filter}
        placeholder="filter  lcp:>2.5s  inp:>200ms  /blog"
        onChange={(text) => store.dispatch({ type: "filter", text })}
      >
        <span className="tb on">p75</span>
        <span className="tb">24h</span>
      </FilterPrompt>
    </>
  );
}
