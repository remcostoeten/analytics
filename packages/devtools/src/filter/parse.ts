import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

export type Operator = "=" | ">" | "<" | ">=" | "<=";

export type Token = {
  key: string;
  operator: Operator;
  value: string;
  negate: boolean;
};

export type Filter = {
  tokens: Token[];
  words: string[];
  path: Nullable<string>;
};

export type FieldValue = string | number | null;

export type Fields<Item> = { [key: string]: (row: Item) => FieldValue };

// key:value, optionally negated with a leading -, with an optional comparison after the colon.
const tokenPattern = /^(-?)([a-z][\w.]*):(>=|<=|>|<)?(.+)$/i;
// A number with an optional ms, s or % unit, such as 2.5s, 180ms, 41% or 0.5.
const numberPattern = /^(-?\d+(?:\.\d+)?)(ms|s|%)?$/i;

function readOperator(value: string): Operator {
  if (value === ">" || value === "<" || value === ">=" || value === "<=") return value;
  return "=";
}

/**
 * @name parseFilter
 * @description Parses the text of a buffer's filter prompt into `key:value` tokens, free words
 * and an optional path. `key:>0.5`, `key:<2.5s`, `key:>=3` compare numbers, `-key:value`
 * negates, a word starting with `/` is the path, and anything else is free text.
 *
 * @example
 * parseFilter("level:error bot:>0.5 /cars timeout");
 * // { tokens: [{ key: "level", ... }, { key: "bot", operator: ">", value: "0.5", ... }], words: ["timeout"], path: "/cars" }
 */
export function parseFilter(text: string): Filter {
  const tokens: Token[] = [];
  const words: string[] = [];
  let path: Nullable<string> = null;
  for (const part of text.trim().split(/\s+/)) {
    if (part.length === 0) continue;
    if (part.startsWith("/")) {
      path = part;
      continue;
    }
    const match = tokenPattern.exec(part);
    if (!match) {
      words.push(part.toLowerCase());
      continue;
    }
    const [, negate = "", key = "", operator = "", value = ""] = match;
    tokens.push({
      key: key.toLowerCase(),
      operator: readOperator(operator),
      value,
      negate: negate === "-",
    });
  }
  return { tokens, words, path };
}

/**
 * @name parseAmount
 * @description Reads a filter number with its unit: `2.5s` is 2500, `180ms` is 180, `41%` is
 * 0.41 and a bare number stays as it is. Returns `null` for anything else.
 *
 * @example
 * parseAmount("2.5s"); // 2500
 */
export function parseAmount(value: string): Nullable<number> {
  const match = numberPattern.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === "s") return amount * 1000;
  if (unit === "%") return amount / 100;
  return amount;
}

function compare(field: FieldValue, token: Token) {
  if (field === null) return false;
  if (token.operator === "=") {
    if (typeof field === "number") return parseAmount(token.value) === field;
    return field.toLowerCase() === token.value.toLowerCase();
  }
  const amount = parseAmount(token.value);
  const number = typeof field === "number" ? field : parseAmount(field);
  if (amount === null || number === null) return false;
  if (token.operator === ">") return number > amount;
  if (token.operator === "<") return number < amount;
  if (token.operator === ">=") return number >= amount;
  return number <= amount;
}

function matchesFilter<Item>(
  filter: Filter,
  fields: Fields<Item>,
  row: Item,
  text: (row: Item) => string,
): boolean {
  for (const token of filter.tokens) {
    const read = fields[token.key];
    const hit = read ? compare(read(row), token) : false;
    if (hit === token.negate) return false;
  }
  if (filter.path !== null) {
    const path = fields.path?.(row);
    if (typeof path !== "string" || !path.includes(filter.path)) return false;
  }
  if (filter.words.length === 0) return true;
  const haystack = text(row).toLowerCase();
  return filter.words.every((word) => haystack.includes(word));
}

/**
 * @name applyFilter
 * @description Filters loaded rows by the prompt text, or returns them unchanged when the
 * prompt is empty.
 *
 * @example
 * const visible = applyFilter(state.rows, state.filter, visitorFields, visitorText);
 */
export function applyFilter<Item>(
  rows: Item[],
  text: string,
  fields: Fields<Item>,
  haystack: (row: Item) => string,
): Item[] {
  if (text.trim().length === 0) return rows;
  const filter = parseFilter(text);
  return rows.filter((row) => matchesFilter(filter, fields, row, haystack));
}

/**
 * @name toggleToken
 * @description Adds `key:value` to the prompt text, or removes it when it is already there,
 * for the filter shortcuts on rows.
 *
 * @example
 * toggleToken("level:error", "kind", "ingest"); // "level:error kind:ingest"
 */
export function toggleToken(text: string, key: string, value: string): string {
  const token = `${key}:${value}`;
  const parts = text.split(/\s+/).filter((part) => part.length > 0);
  const kept = parts.filter((part) => part !== token);
  return (kept.length === parts.length ? [...parts, token] : kept).join(" ");
}
