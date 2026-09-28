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
  const lines = [header, ...rows].map((row) => row.map(cell).join(","));
  return `${lines.join("\n")}\n`;
}
