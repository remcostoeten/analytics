import type { EngineError } from "@remcostoeten/analytics-engine";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { t } from "elysia";

import { csvLines } from "./csv";

export type ExportFormat = "csv" | "json" | "sql";

export type Listing = { data: unknown[]; nextCursor: string | null };

type Cell = string | number | boolean | null;

type Flat = { [column: string]: Cell };

export const exportPageSize = 1000;

const exportRowLimit = 1_000_000;

export const download = t.Unsafe<Response>(
  t.Any({ description: "text/csv, application/json or application/sql download" }),
);

const formats = new Set<string>(["csv", "json", "sql"]);
const contentTypes: { [format in ExportFormat]: string } = {
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  sql: "application/sql; charset=utf-8",
};
const insertBatch = 500;

/**
 * @name exportFormat
 * @description The download a list request asks for: `format=csv|json|sql`, or CSV for
 * `Accept: text/csv`; null for the normal paged answer.
 *
 * @example
 * exportFormat(new Request("https://api.example.test/v2/events?format=sql")); // "sql"
 */
export function exportFormat(request: Request): ExportFormat | null {
  const format = new URL(request.url).searchParams.get("format");
  if (format && formats.has(format)) return format as ExportFormat;
  return request.headers.get("accept")?.includes("text/csv") ? "csv" : null;
}

function flatten(value: unknown, prefix: string, into: Flat) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) {
      flatten(inner, prefix ? `${prefix}.${key}` : key, into);
    }
    return into;
  }
  if (value === undefined || value === null) into[prefix] = null;
  else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    into[prefix] = value;
  } else {
    into[prefix] = JSON.stringify(value);
  }
  return into;
}

function flat(row: unknown): Flat {
  return flatten(row, "", {});
}

function columnsOf(rows: Flat[]) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))];
}

function sqlType(rows: Flat[], column: string) {
  const values = rows
    .map((row) => row[column])
    .filter((value) => value !== null && value !== undefined);
  if (values.length === 0) return "text";
  if (values.every((value) => typeof value === "boolean")) return "boolean";
  if (values.every((value) => typeof value === "number" && Number.isInteger(value)))
    return "bigint";
  if (values.every((value) => typeof value === "number")) return "double precision";
  return "text";
}

function quoteName(name: string) {
  return `"${name.replaceAll('"', '""')}"`;
}

function literal(value: Cell | undefined) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function tableName(name: string) {
  return name.toLowerCase().replaceAll(/[^a-z0-9_]/g, "_");
}

type Writer = {
  start: (first: Listing, rows: Flat[]) => string;
  rows: (rows: Flat[], raw: unknown[], first: boolean) => string;
  end: (truncated: boolean, error: EngineError | null) => string;
};

function writer(format: ExportFormat, name: string): Writer {
  let columns: string[] = [];
  const table = quoteName(tableName(name));
  if (format === "csv") {
    return {
      start: (_, rows) => {
        columns = columnsOf(rows);
        return csvLines([columns]);
      },
      rows: (rows) => csvLines(rows.map((row) => columns.map((column) => row[column]))),
      end: () => "",
    };
  }
  if (format === "json") {
    return {
      start: (first) => {
        const meta = Object.entries(first).filter(
          ([key]) => key !== "data" && key !== "nextCursor",
        );
        const head = meta.map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`);
        return `{${[...head, '"data":['].join(",")}`;
      },
      rows: (_, raw, first) =>
        raw
          .map((row, index) => `${first && index === 0 ? "" : ","}${JSON.stringify(row)}`)
          .join(""),
      end: (truncated, error) =>
        `],"nextCursor":null${truncated ? ',"truncated":true' : ""}${error ? `,"error":${JSON.stringify({ code: error.code, message: error.message })}` : ""}}\n`,
    };
  }
  return {
    start: (_, rows) => {
      columns = columnsOf(rows);
      const definitions = columns.map(
        (column) => `  ${quoteName(column)} ${sqlType(rows, column)}`,
      );
      return `CREATE TABLE ${table} (\n${definitions.join(",\n")}\n);\n`;
    },
    rows: (rows) => {
      const statements: string[] = [];
      for (let start = 0; start < rows.length; start += insertBatch) {
        const values = rows
          .slice(start, start + insertBatch)
          .map((row) => `(${columns.map((column) => literal(row[column])).join(", ")})`);
        statements.push(
          `INSERT INTO ${table} (${columns.map(quoteName).join(", ")}) VALUES\n${values.join(",\n")};\n`,
        );
      }
      return statements.join("");
    },
    end: (truncated, error) =>
      `${truncated ? `-- stopped at ${exportRowLimit} rows\n` : ""}${error ? `-- error: ${error.message.replaceAll("\n", " ")}\n` : ""}`,
  };
}

function pageParams(params: URLSearchParams, format: ExportFormat, cursor: string | null) {
  const next = new URLSearchParams(params);
  next.set("format", format);
  next.set("limit", String(exportPageSize));
  if (cursor) next.set("cursor", cursor);
  else next.delete("cursor");
  return next;
}

/**
 * @name exportList
 * @description A list route as one download instead of pages: it reads every page through the
 * route's own `read`, 1,000 rows at a time, up to 1,000,000 rows, and streams them as CSV with a
 * header row, as the normal JSON response with all rows in `data`, or as a `CREATE TABLE` and
 * `INSERT` statements that load into Postgres or SQLite. Nested fields become dotted columns. An
 * error on the first page is returned as usual; a later one ends the file with a note.
 *
 * @example
 * await exportList("events", "csv", params, (page) => listEvents(store, page, ["remcostoeten.nl"], now));
 */
export async function exportList(
  name: string,
  format: ExportFormat,
  params: URLSearchParams,
  read: (params: URLSearchParams) => Promise<Result<Listing, EngineError>>,
): Promise<Result<Response, EngineError>> {
  const first = await read(pageParams(params, format, null));
  if (!first.ok) return first;
  const encoder = new TextEncoder();
  const output = writer(format, name);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(text: string) {
        if (text.length > 0) controller.enqueue(encoder.encode(text));
      }
      async function pump(page: Listing, written: number): Promise<void> {
        const room = exportRowLimit - written;
        const raw = page.data.slice(0, room);
        send(output.rows(raw.map(flat), raw, written === 0));
        const total = written + raw.length;
        if (total >= exportRowLimit && (page.nextCursor || raw.length < page.data.length)) {
          send(output.end(true, null));
          return;
        }
        if (!page.nextCursor) {
          send(output.end(false, null));
          return;
        }
        const next = await read(pageParams(params, format, page.nextCursor));
        if (!next.ok) {
          send(output.end(false, next.error));
          return;
        }
        return pump(next.value, total);
      }
      send(output.start(first.value, first.value.data.map(flat)));
      await pump(first.value, 0);
      controller.close();
    },
  });
  const extension = format === "sql" ? "sql" : format;
  return ok(
    new Response(stream, {
      headers: {
        "content-type": contentTypes[format],
        "content-disposition": `attachment; filename="${tableName(name)}.${extension}"`,
      },
    }),
  );
}
