import type { Cell } from "@spoar/contract";

import type { RunState } from "./use-live-console";

type Props = {
  state: RunState;
};

const messageClass = "grid flex-1 place-items-center px-6 text-center text-console-dim";
const cellClass = "max-w-80 truncate border-b border-console-divider px-3 py-1.5 text-left";

function show(cell: Cell) {
  return cell === null ? "null" : String(cell);
}

export function Results({ state }: Props) {
  if (state.status === "idle") {
    return <p className={messageClass}>Run a query with Ctrl+Enter to see its rows.</p>;
  }
  if (state.status === "running") {
    return <p className={`${messageClass} spc-thinking`}>Running</p>;
  }
  if (state.status === "failed") {
    return (
      <p className={`${messageClass} text-console-accent`} role="alert">
        {state.message}
      </p>
    );
  }
  const { result } = state;
  if (result.rows.length === 0) return <p className={messageClass}>No rows.</p>;

  return (
    <div className="min-h-0 flex-1 overflow-auto font-console-mono text-xs">
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="sticky top-0 bg-console-surface text-console-muted">
          <tr>
            {result.columns.map((column, index) => (
              <th key={index} scope="col" className={`${cellClass} font-medium`}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-console-hover">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`${cellClass} ${cell === null ? "text-console-faint" : ""}`}
                  title={show(cell)}
                >
                  {show(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
