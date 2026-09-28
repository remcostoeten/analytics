type Value = string | number | boolean | null | undefined;

function cell(value: Value) {
  const text = value === undefined || value === null ? "" : String(value);
  // Quotes, commas and newlines need the field wrapped in quotes.
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * @name toCsv
 * @description Rows as CSV with a header row, quoting the fields that need it; null and missing
 * values are empty fields.
 *
 * @example
 * toCsv(["route", "views"], [["/", 1011]]); // "route,views\n/,1011\n"
 */
export function toCsv(header: string[], rows: Value[][]): string {
  return csvLines([header, ...rows]);
}

/**
 * @name csvLines
 * @description Rows as CSV lines without a header, each ending in a newline.
 *
 * @example
 * csvLines([["/", 1011]]); // "/,1011\n"
 */
export function csvLines(rows: Value[][]): string {
  return rows.map((row) => `${row.map(cell).join(",")}\n`).join("");
}
