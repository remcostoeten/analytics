import type { Nullable } from "@spoar/shared/semantic";

import type { JsonValue } from "../client/types";

export type Tone = "string" | "number" | "boolean" | "null" | "punct";

export type Link = {
  type: "visitor" | "session" | "code";
  target: string;
};

export type Line = {
  path: string;
  depth: number;
  key: Nullable<string>;
  text: string;
  tone: Tone;
  comma: boolean;
  toggle: Nullable<{ collapsed: boolean; size: number }>;
  link: Nullable<Link>;
};

export type Resolve = (value: string) => Nullable<Link>;

type Frame = {
  path: string;
  depth: number;
  key: Nullable<string>;
  comma: boolean;
};

// Error codes from the SDK and the API catalog, such as RA_INGEST_REJECTED.
const codePattern = /^RA_[A-Z0-9_]+$/;

/**
 * @name linkFor
 * @description Turns a string value into a link when it is a known visitor or session id, or
 * an `RA_*` error code. `visitors` and `sessions` hold the ids currently loaded in the widget.
 *
 * @example
 * const resolve = linkFor(new Set(["v_1"]), new Set());
 * resolve("v_1"); // { type: "visitor", target: "v_1" }
 */
export function linkFor(visitors: Set<string>, sessions: Set<string>): Resolve {
  return (value) => {
    if (visitors.has(value)) return { type: "visitor", target: value };
    if (sessions.has(value)) return { type: "session", target: value };
    if (codePattern.test(value)) return { type: "code", target: value };
    return null;
  };
}

function scalar(value: string | number | boolean | null): { text: string; tone: Tone } {
  if (value === null) return { text: "null", tone: "null" };
  if (typeof value === "string") return { text: JSON.stringify(value), tone: "string" };
  if (typeof value === "number") return { text: String(value), tone: "number" };
  return { text: String(value), tone: "boolean" };
}

function walk(
  value: JsonValue,
  frame: Frame,
  collapsed: Set<string>,
  resolve: Resolve,
  lines: Line[],
) {
  const base = { path: frame.path, depth: frame.depth, key: frame.key };
  if (value === null || typeof value !== "object") {
    const { text, tone } = scalar(value);
    const link = typeof value === "string" ? resolve(value) : null;
    lines.push({ ...base, text, tone, comma: frame.comma, toggle: null, link });
    return;
  }
  const entries: [Nullable<string>, JsonValue][] = Array.isArray(value)
    ? value.map((item) => [null, item])
    : Object.entries(value);
  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  if (entries.length === 0) {
    lines.push({
      ...base,
      text: `${open}${close}`,
      tone: "punct",
      comma: frame.comma,
      toggle: null,
      link: null,
    });
    return;
  }
  const isCollapsed = collapsed.has(frame.path);
  if (isCollapsed) {
    lines.push({
      ...base,
      text: `${open} ${entries.length} ${close}`,
      tone: "punct",
      comma: frame.comma,
      toggle: { collapsed: true, size: entries.length },
      link: null,
    });
    return;
  }
  lines.push({
    ...base,
    text: open,
    tone: "punct",
    comma: false,
    toggle: { collapsed: false, size: entries.length },
    link: null,
  });
  entries.forEach(([key, item], index) => {
    const segment = key ?? String(index);
    walk(
      item,
      {
        path: `${frame.path}.${segment}`,
        depth: frame.depth + 1,
        key,
        comma: index < entries.length - 1,
      },
      collapsed,
      resolve,
      lines,
    );
  });
  lines.push({
    path: `${frame.path}#end`,
    depth: frame.depth,
    key: null,
    text: close,
    tone: "punct",
    comma: frame.comma,
    toggle: null,
    link: null,
  });
}

/**
 * @name buildLines
 * @description Flattens a JSON value into the lines the JSON tree renders, one per scalar and
 * one for each opening and closing bracket. Objects and arrays whose path is in `collapsed`
 * become one line with their size. String values that `resolve` recognises carry a link.
 *
 * @example
 * buildLines({ visitor: "v_1", ok: true }, new Set(), resolve);
 * // [ "{", visitor: "v_1", ok: true, "}" ] as lines with depth and tone
 */
export function buildLines(value: JsonValue, collapsed: Set<string>, resolve: Resolve): Line[] {
  const lines: Line[] = [];
  walk(value, { path: "$", depth: 0, key: null, comma: false }, collapsed, resolve, lines);
  return lines;
}

/**
 * @name toggleNode
 * @description Collapses an open node or opens a collapsed one, returning a new set.
 *
 * @example
 * setCollapsed((current) => toggleNode(current, "$.signals"));
 */
export function toggleNode(collapsed: Set<string>, path: string): Set<string> {
  const next = new Set(collapsed);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  return next;
}
