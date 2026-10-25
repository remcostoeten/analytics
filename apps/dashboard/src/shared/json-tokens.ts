export type JsonTokenKind =
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "punctuation"
  | "plain";

export type JsonToken = {
  kind: JsonTokenKind;
  text: string;
};

// A quoted string with escapes, a number, a literal, a structural character, or whitespace.
const tokenPattern =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],:])|(\s+|.)/g;

/**
 * @name tokenizeJson
 * @description Splits pretty-printed JSON into tokens for syntax colouring without a parser: a
 * quoted string followed by a colon is a key, other quoted text is a string, and numbers, booleans,
 * null and the structural characters each get their own kind. Anything else stays plain.
 *
 * @example
 * tokenizeJson('{"metric": "cls", "value": 0.0039}');
 * // [{ kind: "punctuation", text: "{" }, { kind: "key", text: '"metric"' }, { kind: "punctuation", text: ":" }, ...]
 */
export function tokenizeJson(json: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  for (const match of json.matchAll(tokenPattern)) {
    const [text, quoted, colon, number, boolean, literal, punctuation] = match;
    if (quoted) {
      tokens.push({ kind: colon ? "key" : "string", text: quoted });
      if (colon) tokens.push({ kind: "punctuation", text: colon });
    } else if (number) tokens.push({ kind: "number", text });
    else if (boolean) tokens.push({ kind: "boolean", text });
    else if (literal) tokens.push({ kind: "null", text });
    else if (punctuation) tokens.push({ kind: "punctuation", text });
    else tokens.push({ kind: "plain", text });
  }
  return tokens;
}
