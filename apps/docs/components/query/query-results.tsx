import type { SqlOutcome } from "@/lib/sql-answer";

type Props = {
  outcome: Extract<SqlOutcome, { status: "done" }>;
  faded: boolean;
};

type Cell = string | number | boolean | null;

// Postgres sends bigint and numeric columns as strings over the HTTP driver.
const numeric = /^-?\d+(\.\d+)?$/;

function asNumber(cell: Cell) {
  if (typeof cell === "number") return cell;
  if (typeof cell === "string" && numeric.test(cell)) return Number(cell);
  return null;
}

function display(cell: Cell) {
  if (cell === null) return "null";
  const number = asNumber(cell);
  return number === null ? String(cell) : number.toLocaleString("en");
}

export function QueryResults({ outcome, faded }: Props) {
  const { columns, rows } = outcome.result;
  if (rows.length === 0) {
    return (
      <p className="rounded-[10px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        The query ran and returned no rows for this range.
      </p>
    );
  }
  return (
    <div
      className={`max-h-[32rem] min-w-0 overflow-auto rounded-[10px] border border-line bg-surface transition-opacity duration-200 ${faded ? "opacity-50" : ""}`}
    >
      <table className="w-full text-left text-[0.8rem] tabular-nums">
        <thead className="sticky top-0 border-b border-dashed border-line bg-surface font-mono text-[0.68rem] text-muted">
          <tr>
            <th className="w-10 px-3 py-2 text-right font-normal opacity-60">#</th>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-line first:border-t-0 hover:bg-fg/[0.03]">
              <td className="px-3 py-1.5 text-right font-mono text-[0.68rem] text-muted opacity-60">
                {index + 1}
              </td>
              {row.map((cell, column) => (
                <td
                  key={columns[column]}
                  className={`px-3 py-1.5 ${
                    cell === null
                      ? "font-mono text-muted italic"
                      : asNumber(cell) !== null
                        ? "text-right font-mono text-fg"
                        : "text-fg/85"
                  }`}
                >
                  {display(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
