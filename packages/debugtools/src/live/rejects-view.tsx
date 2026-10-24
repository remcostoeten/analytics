import type { ConsoleSource } from "../source";
import type { Reject } from "./rejects";
import { useRejects } from "./use-rejects";

type Props = {
  source: ConsoleSource;
};

const messageClass = "grid flex-1 place-items-center px-6 text-center text-console-dim";
const cellClass = "max-w-96 truncate border-b border-console-divider px-3 py-1.5 text-left";

function time(ts: string) {
  return new Date(ts).toLocaleTimeString("en", { hour12: false });
}

function Row({ row }: { row: Reject }) {
  return (
    <tr className="hover:bg-console-hover">
      <td className={cellClass}>{time(row.ts)}</td>
      <td className={`${cellClass} text-console-accent`}>{row.reason}</td>
      <td className={cellClass}>{row.event ?? "–"}</td>
      <td className={cellClass}>{row.field ?? "–"}</td>
      <td className={cellClass} title={row.detail}>
        {row.detail}
      </td>
    </tr>
  );
}

export function RejectsView({ source }: Props) {
  const { state, reload } = useRejects(source);
  if (state.status === "loading") {
    return <p className={`${messageClass} spc-thinking`}>Loading</p>;
  }
  if (state.status === "failed") {
    return (
      <p className={`${messageClass} text-console-accent`} role="alert">
        {state.message}
      </p>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 flex-none items-center justify-between border-b border-console-divider px-3 text-console-dim">
        <span>Rejected events and rate limited requests from the last 7 days</span>
        <button type="button" className="hover:text-console-fg" onClick={() => void reload()}>
          Refresh
        </button>
      </div>
      {state.rows.length === 0 ? (
        <p className={messageClass}>Nothing was rejected.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto font-console-mono text-xs">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 bg-console-surface text-console-muted">
              <tr>
                {["Time", "Reason", "Event", "Field", "Detail"].map((column) => (
                  <th key={column} scope="col" className={`${cellClass} font-medium`}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
