import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import type { EngineError } from "../errors";
import { engineError } from "../errors";

export type QueryParams = { from?: string; to?: string; project?: string };

export type PreparedQuery = { text: string; params: string[] };

type Token =
  | { kind: "word"; text: string; start: number; end: number }
  | { kind: "param"; name: string; start: number; end: number }
  | { kind: "semicolon"; start: number; end: number }
  | { kind: "positional"; start: number; end: number }
  | { kind: "symbol"; text: string; start: number; end: number };

const blockedWords = new Set([
  "alter",
  "analyze",
  "call",
  "checkpoint",
  "cluster",
  "comment",
  "copy",
  "create",
  "deallocate",
  "delete",
  "discard",
  "do",
  "drop",
  "execute",
  "grant",
  "import",
  "insert",
  "into",
  "listen",
  "load",
  "lock",
  "merge",
  "notify",
  "prepare",
  "refresh",
  "reindex",
  "reset",
  "revoke",
  "security",
  "set",
  "truncate",
  "unlisten",
  "update",
  "vacuum",
]);

const blockedNames = new Set(["set_config", "ts_stat", "dblink"]);
const blockedPrefixes = ["pg_", "dblink_", "lo_"];
const paramTypes: { [name: string]: string } = {
  from: "timestamptz",
  to: "timestamptz",
  project: "text",
};

function invalid<Value>(message: string): Result<Value, EngineError> {
  return err(engineError("VALIDATION_FAILED", message));
}

function isWordStart(char: string) {
  return /[A-Za-z_]/.test(char);
}

function isWordPart(char: string) {
  return /[A-Za-z0-9_$]/.test(char);
}

function skipString(sql: string, start: number, backslashEscapes: boolean) {
  let index = start + 1;
  while (index < sql.length) {
    const char = sql.charAt(index);
    if (backslashEscapes && char === "\\") {
      index += 2;
    } else if (char === "'" && sql.charAt(index + 1) === "'") {
      index += 2;
    } else if (char === "'") {
      return index + 1;
    } else {
      index += 1;
    }
  }
  return -1;
}

function skipBlockComment(sql: string, start: number) {
  let depth = 0;
  let index = start;
  while (index < sql.length) {
    if (sql.startsWith("/*", index)) {
      depth += 1;
      index += 2;
    } else if (sql.startsWith("*/", index)) {
      depth -= 1;
      index += 2;
      if (depth === 0) return index;
    } else {
      index += 1;
    }
  }
  return -1;
}

function tokenize(sql: string): Result<Token[], EngineError> {
  const tokens: Token[] = [];
  let index = 0;
  while (index < sql.length) {
    const char = sql.charAt(index);
    const next = sql.charAt(index + 1);
    if (/\s/.test(char)) {
      index += 1;
    } else if (char === "-" && next === "-") {
      const end = sql.indexOf("\n", index);
      index = end === -1 ? sql.length : end + 1;
    } else if (char === "/" && next === "*") {
      const end = skipBlockComment(sql, index);
      if (end === -1) return invalid("The query has an unclosed comment");
      index = end;
    } else if (char === "'") {
      const previous = tokens.at(-1);
      const escaped =
        previous?.kind === "word" && previous.end === index && previous.text.toLowerCase() === "e";
      const end = skipString(sql, index, escaped);
      if (end === -1) return invalid("The query has an unclosed string");
      index = end;
    } else if (char === '"') {
      const end = sql.indexOf('"', index + 1);
      if (end === -1) return invalid("The query has an unclosed quoted name");
      let close = end;
      while (sql.charAt(close + 1) === '"') {
        const following = sql.indexOf('"', close + 2);
        if (following === -1) return invalid("The query has an unclosed quoted name");
        close = following;
      }
      tokens.push({
        kind: "word",
        text: sql.slice(index + 1, close).replaceAll('""', '"'),
        start: index,
        end: close + 1,
      });
      index = close + 1;
    } else if (char === "$") {
      // A dollar quote opener: $$ or $tag$.
      const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(index))?.[0];
      if (tag) {
        const end = sql.indexOf(tag, index + tag.length);
        if (end === -1) return invalid("The query has an unclosed dollar-quoted string");
        index = end + tag.length;
      } else if (/[0-9]/.test(next)) {
        let end = index + 1;
        while (/[0-9]/.test(sql.charAt(end))) end += 1;
        tokens.push({ kind: "positional", start: index, end });
        index = end;
      } else {
        tokens.push({ kind: "symbol", text: char, start: index, end: index + 1 });
        index += 1;
      }
    } else if (char === ":" && next === ":") {
      tokens.push({ kind: "symbol", text: "::", start: index, end: index + 2 });
      index += 2;
    } else if (char === ":" && isWordStart(next)) {
      let end = index + 1;
      while (isWordPart(sql.charAt(end))) end += 1;
      tokens.push({ kind: "param", name: sql.slice(index + 1, end), start: index, end });
      index = end;
    } else if (isWordStart(char)) {
      let end = index;
      while (isWordPart(sql.charAt(end))) end += 1;
      tokens.push({ kind: "word", text: sql.slice(index, end), start: index, end });
      index = end;
    } else if (char === ";") {
      tokens.push({ kind: "semicolon", start: index, end: index + 1 });
      index += 1;
    } else {
      tokens.push({ kind: "symbol", text: char, start: index, end: index + 1 });
      index += 1;
    }
  }
  return ok(tokens);
}

function blockedName(name: string) {
  const lower = name.toLowerCase();
  return (
    blockedNames.has(lower) ||
    blockedPrefixes.some((prefix) => lower.startsWith(prefix)) ||
    lower.includes("_to_xml")
  );
}

/**
 * @name prepareQuery
 * @description Checks a console query before it reaches Postgres and binds its parameters: one
 * `SELECT` or `WITH` statement, no writing or session keywords, no `pg_*`, `set_config`,
 * `dblink`, large-object or `*_to_xml` functions, and no positional `$1` parameters. `:from` and
 * `:to` become bound timestamps and `:project` bound text, taken from `params`; any other
 * `:name` is rejected. Comments, strings and trailing semicolons are left to Postgres.
 *
 * @example
 * prepareQuery("select count(*) from events where ts >= :from", { from: "2026-09-01T00:00:00Z" });
 * // ok({ text: "select count(*) from events where ts >= $1::timestamptz", params: ["2026-09-01T00:00:00Z"] })
 */
export function prepareQuery(sql: string, params: QueryParams): Result<PreparedQuery, EngineError> {
  const scanned = tokenize(sql);
  if (!scanned.ok) return scanned;
  const tokens = scanned.value;
  const lastCode = tokens.reduce(
    (found, token, index) => (token.kind === "semicolon" ? found : index),
    -1,
  );
  if (lastCode === -1) return invalid("The query is empty");
  if (tokens.slice(0, lastCode).some((token) => token.kind === "semicolon")) {
    return invalid("Send one statement at a time");
  }
  const first = tokens.find((token) => !(token.kind === "symbol" && token.text === "("));
  const leading = first?.kind === "word" ? first.text.toLowerCase() : "";
  if (leading !== "select" && leading !== "with") {
    return invalid("Only SELECT and WITH queries can run");
  }
  const bound: string[] = [];
  const positions = new Map<string, number>();
  const parts: string[] = [];
  let cursor = 0;
  for (const token of tokens.slice(0, lastCode + 1)) {
    if (token.kind === "positional") {
      return invalid("Use :from, :to and :project instead of positional parameters");
    }
    if (token.kind === "word") {
      const lower = token.text.toLowerCase();
      if (blockedWords.has(lower)) return invalid(`${token.text.toUpperCase()} is not allowed`);
      if (blockedName(token.text)) return invalid(`${token.text} is not allowed`);
    }
    if (token.kind === "param") {
      const type = paramTypes[token.name];
      const value = Object.entries(params).find(([name]) => name === token.name)?.[1];
      if (!type) return invalid(`Unknown parameter :${token.name}; use :from, :to or :project`);
      if (value === undefined)
        return invalid(`:${token.name} is used but params.${token.name} is missing`);
      const position = positions.get(token.name) ?? bound.push(value);
      positions.set(token.name, position);
      parts.push(sql.slice(cursor, token.start), `$${position}::${type}`);
      cursor = token.end;
    }
  }
  const last = tokens[lastCode];
  parts.push(sql.slice(cursor, last?.end ?? sql.length));
  return ok({ text: parts.join("").trim(), params: bound });
}
