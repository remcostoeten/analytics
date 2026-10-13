import type { QuerySchema } from "@spoar/contract";

import type { Dataset, FieldKind, QuickQuery } from "../types";

export const sqlKeywords = [
  "select",
  "from",
  "where",
  "and",
  "or",
  "not",
  "in",
  "is",
  "null",
  "as",
  "on",
  "join",
  "left",
  "inner",
  "group",
  "by",
  "order",
  "having",
  "limit",
  "offset",
  "asc",
  "desc",
  "distinct",
  "with",
  "case",
  "when",
  "then",
  "else",
  "end",
  "between",
  "like",
  "ilike",
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "date_trunc",
  "coalesce",
  "percentile_cont",
  "within",
  "filter",
  "over",
  "true",
  "false",
];

export const starterQuery = [
  "select name, count(*) as events",
  "from events",
  "where ts >= :from and ts < :to",
  "group by name",
  "order by events desc",
  "limit 20",
].join("\n");

export const quickQueries: QuickQuery[] = [
  { label: "Latest rows", icon: "list" },
  { label: "Rows over time", icon: "trend" },
];

// Postgres integer, floating point and numeric types.
const numericType = /^(smallint|integer|bigint|real|double precision|numeric)/;

function kindOf(type: string): FieldKind {
  if (type === "boolean") return "boolean";
  if (type.startsWith("timestamp") || type === "date") return "time";
  if (numericType.test(type)) return "number";
  return "string";
}

/**
 * @name datasetsFromSchema
 * @description Turns the views from `GET /v2/query/schema` into the dataset library's datasets,
 * with each column's Postgres type reduced to the library's four field kinds.
 *
 * @example
 * datasetsFromSchema(schema)[0];
 * // { name: "events", fields: [{ name: "event_id", kind: "string" }, ...] }
 */
export function datasetsFromSchema(schema: QuerySchema): Dataset[] {
  return schema.data.map((view) => ({
    name: view.name,
    fields: view.columns.map((column) => ({ name: column.name, kind: kindOf(column.type) })),
  }));
}

/**
 * @name quickQuerySql
 * @description The SQL behind a quick query on a dataset, filtered to the toolbar's time range on
 * the dataset's first time column. A dataset without a time column gets its first 100 rows.
 *
 * @example
 * quickQuerySql("Latest rows", { name: "events", fields: [{ name: "ts", kind: "time" }] });
 * // "select *\nfrom events\nwhere ts >= :from and ts < :to\norder by ts desc\nlimit 100"
 */
export function quickQuerySql(label: string, dataset: Dataset): string {
  const time = dataset.fields.find((field) => field.kind === "time")?.name;
  if (!time) return `select *\nfrom ${dataset.name}\nlimit 100`;
  const range = `where ${time} >= :from and ${time} < :to`;
  if (label === "Rows over time") {
    return [
      `select date_trunc('hour', ${time}) as hour, count(*) as rows`,
      `from ${dataset.name}`,
      range,
      "group by 1",
      "order by 1",
    ].join("\n");
  }
  return [`select *`, `from ${dataset.name}`, range, `order by ${time} desc`, "limit 100"].join(
    "\n",
  );
}
